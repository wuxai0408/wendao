import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(__dirname, ".weixin-claude");
const CREDS_PATH = join(STATE_DIR, "credentials.json");
const SYNC_PATH = join(STATE_DIR, "sync-buf.json");
const CONVOS_PATH = join(STATE_DIR, "conversations.json");
const ALLOWED_PATH = join(STATE_DIR, "allowed-users.json");

function loadEnv() {
  try {
    const envPath = join(__dirname, ".env");
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const eq = trimmed.indexOf("=");
          if (eq > 0) process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
        }
      }
    }
  } catch { /* ignore */ }
}
loadEnv();
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6-20250514";

// Conversation history: userId -> messages[]
const conversations = new Map();
const MAX_HISTORY = 30;

// ---------------------------------------------------------------------------
// iLink protocol constants (from @tencent-weixin/openclaw-weixin)
// ---------------------------------------------------------------------------
const ILINK_APP_ID = "bot";
const FIXED_BASE_URL = "https://ilinkai.weixin.qq.com";
const CHANNEL_VERSION = "2.4.3";
const BOT_TYPE = "3";

const LONG_POLL_TIMEOUT_MS = 35_000;
const RETRY_DELAY_MS = 2_000;

// Build 0x00MMNNPP version header
function buildClientVersion(ver) {
  const [major, minor, patch] = ver.split(".").map(Number);
  return ((major & 0xff) << 16) | ((minor & 0xff) << 8) | (patch & 0xff);
}
const CLIENT_VERSION = buildClientVersion(CHANNEL_VERSION);

// Per-request: random uint32 -> decimal string -> base64
function randomWechatUin() {
  const uint32 = crypto.randomBytes(4).readUInt32BE(0);
  return Buffer.from(String(uint32), "utf-8").toString("base64");
}

// ---------------------------------------------------------------------------
// State persistence
// ---------------------------------------------------------------------------
function ensureStateDir() {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
}

function loadCredentials() {
  try { return JSON.parse(readFileSync(CREDS_PATH, "utf-8")); } catch { return null; }
}

function saveCredentials(data) {
  ensureStateDir();
  writeFileSync(CREDS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function loadSyncBuf() {
  try { return JSON.parse(readFileSync(SYNC_PATH, "utf-8")).buf || ""; } catch { return ""; }
}

function saveSyncBuf(buf) {
  ensureStateDir();
  writeFileSync(SYNC_PATH, JSON.stringify({ buf }), "utf-8");
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
function buildHeaders(token) {
  const h = {
    "Content-Type": "application/json",
    "iLink-App-Id": ILINK_APP_ID,
    "iLink-App-ClientVersion": String(CLIENT_VERSION),
    "AuthorizationType": "ilink_bot_token",
    "X-WECHAT-UIN": randomWechatUin(),
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function apiPost(baseUrl, endpoint, body, token, timeoutMs) {
  const url = new URL(endpoint, baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");
  const controller = timeoutMs ? new AbortController() : undefined;
  const timer = controller && timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: buildHeaders(token),
      body: JSON.stringify(body),
      signal: controller?.signal,
    });
    if (timer) clearTimeout(timer);
    const text = await res.text();
    if (!res.ok) throw new Error(`${endpoint} ${res.status}: ${text}`);
    return JSON.parse(text);
  } catch (err) {
    if (timer) clearTimeout(timer);
    if (err.name === "AbortError") return { ret: 0, msgs: [] };
    throw err;
  }
}

async function apiGet(baseUrl, endpoint, timeoutMs) {
  const url = new URL(endpoint, baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");
  const controller = timeoutMs ? new AbortController() : undefined;
  const timer = controller && timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "iLink-App-Id": ILINK_APP_ID,
        "iLink-App-ClientVersion": String(CLIENT_VERSION),
      },
      signal: controller?.signal,
    });
    if (timer) clearTimeout(timer);
    const text = await res.text();
    if (!res.ok) throw new Error(`${endpoint} ${res.status}: ${text}`);
    return JSON.parse(text);
  } catch (err) {
    if (timer) clearTimeout(timer);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// QR login
// ---------------------------------------------------------------------------
async function getQRCode() {
  const resp = await apiPost(
    FIXED_BASE_URL,
    `ilink/bot/get_bot_qrcode?bot_type=${encodeURIComponent(BOT_TYPE)}`,
    { local_token_list: [] },
  );
  return { qrcode: resp.qrcode, qrcodeUrl: resp.qrcode_img_content };
}

async function pollQRStatus(qrcode) {
  try {
    return await apiGet(
      FIXED_BASE_URL,
      `ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`,
      LONG_POLL_TIMEOUT_MS,
    );
  } catch {
    return { status: "wait" };
  }
}

async function displayQR(qrcodeUrl) {
  try {
    const qrterm = await import("qrcode-terminal");
    qrterm.default.generate(qrcodeUrl, { small: true });
  } catch {
    // ignore, show URL instead
  }
  process.stdout.write(`\n若二维码未能显示，请访问: ${qrcodeUrl}\n`);
}

async function login() {
  process.stdout.write("正在获取登录二维码...\n");
  let { qrcode, qrcodeUrl } = await getQRCode();
  process.stdout.write("请用手机微信扫描以下二维码:\n\n");
  await displayQR(qrcodeUrl);

  const deadline = Date.now() + 480_000; // 8 min timeout
  let refreshCount = 0;
  const MAX_REFRESH = 3;

  while (Date.now() < deadline) {
    const status = await pollQRStatus(qrcode);

    switch (status.status) {
      case "wait":
        process.stdout.write(".");
        break;
      case "scaned":
        process.stdout.write("\n已扫码，请在手机上确认...\n");
        break;
      case "confirmed":
        process.stdout.write("\n登录成功!\n");
        return {
          token: status.bot_token,
          accountId: status.ilink_bot_id,
          baseUrl: status.baseurl || FIXED_BASE_URL,
          userId: status.ilink_user_id,
        };
      case "expired":
        refreshCount++;
        if (refreshCount > MAX_REFRESH) {
          process.stdout.write(`\n二维码已过期 ${MAX_REFRESH} 次，请重新运行。\n`);
          return null;
        }
        process.stdout.write(`\n二维码过期，正在刷新 (${refreshCount}/${MAX_REFRESH})...\n`);
        try {
          const fresh = await getQRCode();
          qrcode = fresh.qrcode;
          qrcodeUrl = fresh.qrcodeUrl;
          process.stdout.write("请扫描新的二维码:\n\n");
          await displayQR(qrcodeUrl);
        } catch {
          process.stdout.write("刷新失败，请重新运行。\n");
          return null;
        }
        break;
      case "need_verifycode":
        process.stdout.write("\n需要验证码（不支持非交互模式），请重新运行。\n");
        return null;
      case "binded_redirect":
        process.stdout.write("\n该 Bot 已绑定此 OpenClaw，无需重复连接。\n");
        return null;
      default:
        break;
    }
    await sleep(1000);
  }
  process.stdout.write("\n登录超时。\n");
  return null;
}

// ---------------------------------------------------------------------------
// iLink messaging
// ---------------------------------------------------------------------------
async function getUpdates(baseUrl, token, buf, timeoutMs) {
  return apiPost(
    baseUrl,
    "ilink/bot/getupdates",
    {
      get_updates_buf: buf || "",
      base_info: { channel_version: CHANNEL_VERSION, bot_agent: "Claude/4" },
    },
    token,
    timeoutMs,
  );
}

async function sendMessage(baseUrl, token, toUserId, text, contextToken) {
  const clientId = "claude-weixin-" + crypto.randomUUID().slice(0, 8);
  return apiPost(
    baseUrl,
    "ilink/bot/sendmessage",
    {
      msg: {
        from_user_id: "",
        to_user_id: toUserId,
        client_id: clientId,
        message_type: 2,    // BOT
        message_state: 2,   // FINISH
        item_list: text ? [{ type: 1, text_item: { text } }] : [],
        context_token: contextToken || undefined,
      },
      base_info: { channel_version: CHANNEL_VERSION, bot_agent: "Claude/4" },
    },
    token,
    15_000,
  );
}

async function sendTyping(baseUrl, token, ilinkUserId, typingTicket, status) {
  try {
    await apiPost(
      baseUrl,
      "ilink/bot/sendtyping",
      {
        ilink_user_id: ilinkUserId,
        typing_ticket: typingTicket,
        status,
        base_info: { channel_version: CHANNEL_VERSION },
      },
      token,
      10_000,
    );
  } catch { /* best-effort */ }
}

async function getConfig(baseUrl, token, ilinkUserId, contextToken) {
  try {
    return await apiPost(
      baseUrl,
      "ilink/bot/getconfig",
      { ilink_user_id: ilinkUserId, context_token: contextToken, base_info: { channel_version: CHANNEL_VERSION } },
      token,
      10_000,
    );
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Markdown filter (make Claude output WeChat-friendly)
// ---------------------------------------------------------------------------
function filterMarkdown(text) {
  let out = text;

  // Bold: **text** -> text
  out = out.replace(/\*\*(.+?)\*\*/g, "$1");
  // Italic: *text* -> text
  out = out.replace(/\*(.+?)\*/g, "$1");
  // Inline code: `text` -> text
  out = out.replace(/`(.+?)`/g, "$1");
  // Code blocks: ```...``` -> content (strip language tag)
  out = out.replace(/```[\s\S]*?```/g, (m) => {
    const lines = m.split("\n");
    lines.shift(); // remove opening ```
    lines.pop();   // remove closing ```
    return lines.join("\n").trim();
  });
  // Links: [text](url) -> text (url)
  out = out.replace(/\[(.+?)\]\((.+?)\)/g, "$1 ($2)");
  // Headers: ### text -> text
  out = out.replace(/^#{1,6}\s+/gm, "");
  // Horizontal rules
  out = out.replace(/^[-*_]{3,}\s*$/gm, "━━━━━━");
  // Blockquotes
  out = out.replace(/^>\s?/gm, "  ");
  // List markers: keep as-is
  // Extra blank lines
  out = out.replace(/\n{3,}/g, "\n\n");

  return out.trim();
}

// ---------------------------------------------------------------------------
// Tools (same capabilities as Claude Code CLI)
// ---------------------------------------------------------------------------
const TOOLS = [
  {
    name: "read_file",
    description: "读取文件内容",
    input_schema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "文件的绝对路径" },
      },
      required: ["file_path"],
    },
  },
  {
    name: "write_file",
    description: "写入或创建文件",
    input_schema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "文件的绝对路径" },
        content: { type: "string", description: "要写入的内容" },
      },
      required: ["file_path", "content"],
    },
  },
  {
    name: "run_command",
    description: "执行 PowerShell 命令（Windows），返回 stdout/stderr。工作目录: C:\\Users\\liyou\\Downloads\\无敌了\\青云",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "要执行的 PowerShell 命令" },
        timeout_ms: { type: "integer", description: "超时毫秒（默认 30000）", default: 30000 },
      },
      required: ["command"],
    },
  },
  {
    name: "search_code",
    description: "在项目中搜索代码：grep 正则匹配文件内容",
    input_schema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "正则搜索模式（ripgrep 语法）" },
        file_glob: { type: "string", description: "可选的文件过滤 glob，如 *.js, *.ts" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "list_files",
    description: "列出目录中的文件",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "目录的绝对路径" },
      },
      required: ["path"],
    },
  },
  {
    name: "web_search",
    description: "在网络搜索信息",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词" },
      },
      required: ["query"],
    },
  },
];

const MAX_TOOL_ROUNDS = 8;

async function executeTool(name, input) {
  const { execSync } = await import("node:child_process");
  const fs = await import("node:fs");
  const path = await import("node:path");

  switch (name) {
    case "read_file": {
      const p = input.file_path;
      if (!fs.existsSync(p)) return `文件不存在: ${p}`;
      try {
        const content = fs.readFileSync(p, "utf-8");
        if (content.length > 20000) return content.slice(0, 20000) + `\n... (截断，共 ${content.length} 字符)`;
        return content;
      } catch (err) {
        return `读取失败: ${err.message}`;
      }
    }

    case "write_file": {
      const p = input.file_path;
      try {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, input.content, "utf-8");
        return `✅ 已写入: ${p} (${input.content.length} 字符)`;
      } catch (err) {
        return `写入失败: ${err.message}`;
      }
    }

    case "run_command": {
      try {
        const timeout = Math.min(input.timeout_ms || 30000, 120000);
        const result = execSync(input.command, {
          encoding: "utf-8",
          timeout,
          maxBuffer: 500 * 1024,
          cwd: "C:\\Users\\liyou\\Downloads\\无敌了\\青云",
          shell: "powershell.exe",
        });
        const out = result.trim() || "(命令执行成功，无输出)";
        return out.length > 8000 ? out.slice(0, 8000) + "\n... (截断)" : out;
      } catch (err) {
        return `命令执行失败: ${err.stderr || err.message}`;
      }
    }

    case "search_code": {
      try {
        const globPart = input.file_glob ? ` -Include "${input.file_glob}"` : "";
        const cmd = `Get-ChildItem -Path "C:\\Users\\liyou\\Downloads\\无敌了\\青云" -Recurse -File${globPart} -ErrorAction SilentlyContinue | Select-String -Pattern '${input.pattern.replace(/'/g, "''")}' | Select-Object -First 100`;
        const result = execSync(cmd, { encoding: "utf-8", timeout: 30000, maxBuffer: 200 * 1024, shell: "powershell.exe" });
        const out = result.trim() || "未找到匹配结果";
        return out.length > 8000 ? out.slice(0, 8000) + "\n... (截断)" : out;
      } catch (err) {
        return `搜索失败: ${err.stderr || err.message}`;
      }
    }

    case "list_files": {
      const p = input.path;
      try {
        if (!fs.existsSync(p)) return `目录不存在: ${p}`;
        const entries = fs.readdirSync(p, { withFileTypes: true }).slice(0, 200);
        const lines = entries.map(e => `${e.isDirectory() ? "📁" : "📄"} ${e.name}`);
        return lines.join("\n") || "空目录";
      } catch (err) {
        return `列出失败: ${err.message}`;
      }
    }

    case "web_search": {
      try {
        const encoded = encodeURIComponent(input.query);
        const res = await fetch(`https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1`, {
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return `搜索请求失败: ${res.status}`;
        const data = await res.json();
        const results = (data.Results || []).slice(0, 5);
        if (!results.length) return `未找到 "${input.query}" 的相关结果`;
        return results.map(r => `- ${r.Text} (${r.FirstURL})`).join("\n");
      } catch (err) {
        return `搜索失败: ${err.message}`;
      }
    }

    default:
      return `未知工具: ${name}`;
  }
}

// ---------------------------------------------------------------------------
// Claude API (with tool use)
// ---------------------------------------------------------------------------
async function callClaude(userId, userMessage, notifyStatus) {
  if (!ANTHROPIC_KEY) throw new Error("请设置 ANTHROPIC_API_KEY 环境变量");

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

  let history = conversations.get(userId) || [];
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history = history.slice(history.length - MAX_HISTORY);
  }

  const systemPrompt = `你是 Claude，现在通过微信与用户对话。你拥有和 Claude Code CLI 相同的工具能力。

<tools>
- read_file: 读取本地文件
- write_file: 创建/写入文件（路径用绝对路径，工作目录 C:\\Users\\liyou\\Downloads\\无敌了\\青云）
- run_command: 执行 PowerShell 命令（可操作 git、npm、文件系统等）
- search_code: 搜索代码（Select-String 搜索）
- list_files: 列出目录内容
- web_search: 网络搜索
</tools>

<mandatory_lessons>
以下错误绝不再犯：

1. 用户问"能不能做X" → 如果第一反应是"不能"，必须先问自己：核心功能是什么？我有什么工具？有没有绕过限制的第三条路？禁止直接说"不能"。
2. 出现异常 → 先写最小 debug 脚本查裸返回数据，定位根因后再改代码。禁止在业务逻辑层直接打补丁。
3. 代码在膨胀 → 停下来问"最简单版本是什么样？"禁止为单一场景建抽象层。
4. 用户要产出物 → 先确认格式再动手。禁止默认猜用户要什么格式。
</mandatory_lessons>

<rules>
- 用户通过微信发消息，回复显示在微信聊天窗口
- 微信不支持 Markdown，不要用加粗/斜体/代码块标记。代码直接缩进展示
- 当用户让你做具体操作（写代码、查文件、运行命令等），直接调用工具完成，再告诉用户结果
- 文件操作统一在 C:\\Users\\liyou\\Downloads\\无敌了\\青云 下
- 工具调用结果可能被截断，关键信息优先返回
- 用中文回复
</rules>`;

  const messages = [...history];
  let toolRounds = 0;

  while (toolRounds < MAX_TOOL_ROUNDS) {
    const resp = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      tools: TOOLS,
    });

    const textBlocks = resp.content.filter(c => c.type === "text");
    const toolUses = resp.content.filter(c => c.type === "tool_use");

    // Save assistant message to history
    messages.push({ role: "assistant", content: resp.content });

    if (toolUses.length === 0) {
      // Done — save updated history and return text
      history.push({ role: "assistant", content: resp.content });
      conversations.set(userId, history);
      saveConversations();
      return textBlocks.map(c => c.text).join("");
    }

    // Execute tools
    if (notifyStatus) notifyStatus(`🔧 调用 ${toolUses.length} 个工具...`);

    const toolResults = [];
    for (const tu of toolUses) {
      process.stdout.write(`  [tool] ${tu.name}(${JSON.stringify(tu.input).slice(0, 80)})\n`);
      try {
        const result = await executeTool(tu.name, tu.input);
        toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: result });
        process.stdout.write(`    → ${result.length} 字符\n`);
      } catch (err) {
        toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: `工具执行出错: ${err.message}`, is_error: true });
        process.stdout.write(`    → 错误: ${err.message}\n`);
      }
    }

    messages.push({ role: "user", content: toolResults });
    toolRounds++;
  }

  // Max rounds reached — force final response
  const resp = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
    tools: [{ name: "done", description: "完成", input_schema: { type: "object", properties: {} } }],
  });
  const text = resp.content.filter(c => c.type === "text").map(c => c.text).join("");

  history.push({ role: "assistant", content: text });
  conversations.set(userId, history);
  saveConversations();
  return text || "操作完成（已达工具调用上限）";
}

// ---------------------------------------------------------------------------
// Conversation persistence
// ---------------------------------------------------------------------------
function saveConversations() {
  try {
    const obj = {};
    for (const [userId, msgs] of conversations) {
      obj[userId] = msgs;
    }
    writeFileSync(CONVOS_PATH, JSON.stringify(obj, null, 2), "utf-8");
  } catch { /* best-effort */ }
}

function loadConversations() {
  try {
    if (existsSync(CONVOS_PATH)) {
      const raw = JSON.parse(readFileSync(CONVOS_PATH, "utf-8"));
      for (const [userId, msgs] of Object.entries(raw)) {
        conversations.set(userId, msgs);
      }
      return Object.keys(raw).length;
    }
  } catch { /* ignore */ }
  return 0;
}

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------
function loadAllowedUsers() {
  try {
    if (existsSync(ALLOWED_PATH)) {
      const data = JSON.parse(readFileSync(ALLOWED_PATH, "utf-8"));
      return Array.isArray(data) ? data : [];
    }
  } catch { /* ignore */ }
  return [];
}

function saveAllowedUsers(list) {
  try {
    writeFileSync(ALLOWED_PATH, JSON.stringify(list, null, 2), "utf-8");
  } catch { /* best-effort */ }
}

function isAllowed(userId, adminUserId) {
  const list = loadAllowedUsers();
  if (list.length === 0) return true;                    // 空列表 = 允许所有人
  return list.includes(userId) || userId === adminUserId; // 管理员永远允许
}

function handleAccessCommand(text, userId, adminUserId) {
  const parts = text.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const target = parts[1];

  if (cmd === "/allow" && target && userId === adminUserId) {
    const list = loadAllowedUsers();
    if (!list.includes(target)) {
      list.push(target);
      saveAllowedUsers(list);
    }
    return `✅ 已允许 ${target}`;
  }
  if (cmd === "/block" && target && userId === adminUserId) {
    let list = loadAllowedUsers();
    list = list.filter(id => id !== target);
    saveAllowedUsers(list);
    return `🚫 已停用 ${target}`;
  }
  if (cmd === "/list" && userId === adminUserId) {
    const list = loadAllowedUsers();
    if (list.length === 0) return "当前无限制，所有人均可使用。";
    return `当前允许的用户:\n${list.join("\n")}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Message processing
// ---------------------------------------------------------------------------
function extractText(msg) {
  if (!msg.item_list?.length) return "";
  for (const item of msg.item_list) {
    if (item.type === 1 && item.text_item?.text) return item.text_item.text;
  }
  return "";
}

async function processMessage(msg, creds, typingTicket) {
  const userId = msg.from_user_id;
  const text = extractText(msg);
  const contextToken = msg.context_token;
  const adminUserId = creds.userId;

  if (!text.trim()) return;

  // Admin commands: /allow, /block, /list
  const cmdResult = handleAccessCommand(text, userId, adminUserId);
  if (cmdResult) {
    process.stdout.write(`[admin] ${userId}: ${text} -> ${cmdResult}\n`);
    await sendMessage(creds.baseUrl, creds.token, userId, cmdResult, contextToken);
    return;
  }

  // Access check
  if (!isAllowed(userId, adminUserId)) {
    process.stdout.write(`[blocked] ${userId}\n`);
    await sendMessage(creds.baseUrl, creds.token, userId, "抱歉，您没有访问权限。", contextToken).catch(() => {});
    return;
  }

  const now = new Date().toLocaleTimeString("zh-CN");
  process.stdout.write(`[${now}] ${userId}: ${text.slice(0, 80)}${text.length > 80 ? "..." : ""}\n`);

  if (typingTicket) {
    sendTyping(creds.baseUrl, creds.token, userId, typingTicket, 1);
  }

  try {
    const reply = await callClaude(userId, text, (status) => {
      sendMessage(creds.baseUrl, creds.token, userId, status, contextToken).catch(() => {});
    });
    const filtered = filterMarkdown(reply);

    const chunks = splitText(filtered, 3800);
    for (let i = 0; i < chunks.length; i++) {
      await sendMessage(creds.baseUrl, creds.token, userId, chunks[i], contextToken);
      if (chunks.length > 1 && i < chunks.length - 1) await sleep(500);
    }

    process.stdout.write(`  → 已回复 (${filtered.length} 字符${chunks.length > 1 ? `, ${chunks.length} 条` : ""})\n`);
  } catch (err) {
    process.stdout.write(`  → 回复失败: ${err.message}\n`);
    await sendMessage(creds.baseUrl, creds.token, userId, `抱歉，出错了: ${err.message}`, contextToken).catch(() => {});
  } finally {
    if (typingTicket) {
      sendTyping(creds.baseUrl, creds.token, userId, typingTicket, 2);
    }
  }
}

function splitText(text, maxLen) {
  const chunks = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    // Try to split at newline or space
    let cut = maxLen;
    const nl = remaining.lastIndexOf("\n", maxLen);
    const sp = remaining.lastIndexOf(" ", maxLen);
    if (nl > maxLen * 0.6) cut = nl;
    else if (sp > maxLen * 0.6) cut = sp;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  process.stdout.write("╔══════════════════════════════════╗\n");
  process.stdout.write("║  微信 ←→ Claude 桥接 (v2 工具)  ║\n");
  process.stdout.write("╚══════════════════════════════════╝\n\n");

  // Check credentials
  let creds = loadCredentials();

  if (!creds?.token) {
    process.stdout.write("未找到登录凭据，开始扫码登录...\n\n");
    creds = await login();
    if (!creds) {
      process.stdout.write("登录失败，退出。\n");
      process.exit(1);
    }
    saveCredentials(creds);
    process.stdout.write(`已保存凭据: ${creds.accountId}\n\n`);
  } else {
    process.stdout.write(`使用已保存的凭据: ${creds.accountId}\n`);
    process.stdout.write(`API 地址: ${creds.baseUrl}\n\n`);
  }

  if (!ANTHROPIC_KEY) {
    process.stdout.write("⚠️  未设置 ANTHROPIC_API_KEY 环境变量\n");
    process.stdout.write("请运行: $env:ANTHROPIC_API_KEY='your-key'; node bridge.js\n");
    process.exit(1);
  }

  // Fetch typing ticket
  const configResp = await getConfig(creds.baseUrl, creds.token, creds.userId || "");
  const typingTicket = configResp.typing_ticket || null;
  if (typingTicket) process.stdout.write("已获取 typing ticket\n");

  // Load conversation history
  const convCount = loadConversations();
  if (convCount > 0) process.stdout.write(`已恢复 ${convCount} 个用户的对话历史\n`);

  // Resume sync buf
  let syncBuf = loadSyncBuf();
  if (syncBuf) process.stdout.write(`恢复同步状态 (${syncBuf.length} 字节)\n`);

  let nextTimeoutMs = LONG_POLL_TIMEOUT_MS;
  let failures = 0;

  process.stdout.write("\n开始监听微信消息... (Ctrl+C 停止)\n\n");

  // Main long-poll loop
  while (true) {
    try {
      const resp = await getUpdates(creds.baseUrl, creds.token, syncBuf, nextTimeoutMs);

      // Handle server-suggested timeout
      if (resp.longpolling_timeout_ms) {
        nextTimeoutMs = resp.longpolling_timeout_ms;
      }

      // Handle errors (ret != 0 or errcode != 0)
      const isError = (resp.ret != null && resp.ret !== 0) || (resp.errcode != null && resp.errcode !== 0);
      if (isError) {
        failures++;
        process.stdout.write(`getUpdates error: ret=${resp.ret} errcode=${resp.errcode} (${failures}/3)\n`);
        if (resp.errcode === -14) {
          process.stdout.write("会话过期，清除同步状态后重试...\n");
          saveSyncBuf("");
          syncBuf = "";
          await sleep(60_000);
        } else {
          await sleep(failures >= 3 ? 30_000 : RETRY_DELAY_MS);
        }
        continue;
      }
      failures = 0;

      // Save sync buf for next poll
      if (resp.get_updates_buf) {
        saveSyncBuf(resp.get_updates_buf);
        syncBuf = resp.get_updates_buf;
      }

      // Process messages
      const msgs = resp.msgs || [];
      for (const msg of msgs) {
        await processMessage(msg, creds, typingTicket);
      }
    } catch (err) {
      failures++;
      process.stdout.write(`轮询异常 (${failures}/3): ${err.message}\n`);
      await sleep(failures >= 3 ? 30_000 : RETRY_DELAY_MS);
    }
  }
}

main().catch((err) => {
  process.stderr.write(`致命错误: ${err.message}\n`);
  process.exit(1);
});
