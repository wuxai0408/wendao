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
// Claude API
// ---------------------------------------------------------------------------
async function callClaude(userId, userMessage) {
  if (!ANTHROPIC_KEY) throw new Error("请设置 ANTHROPIC_API_KEY 环境变量");

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

  let history = conversations.get(userId) || [];
  history.push({ role: "user", content: userMessage });

  // Keep history manageable
  if (history.length > MAX_HISTORY) {
    history = history.slice(history.length - MAX_HISTORY);
  }

  const systemPrompt = `你是一个通过微信与用户对话的AI助手。注意：
- 用户通过微信发消息给你，回复会直接显示在微信聊天窗口
- 微信不支持 Markdown 渲染，避免使用加粗、代码块等格式
- 回复简洁直接，控制在微信消息长度内（过长会自动分段）
- 使用中文回复（除非用户用其他语言）`;

  const stream = client.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: history,
  });

  let fullText = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta?.text) {
      fullText += event.delta.text;
    }
  }

  history.push({ role: "assistant", content: fullText });
  conversations.set(userId, history);

  return fullText;
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

  if (!text.trim()) return; // skip empty / media-only messages

  const now = new Date().toLocaleTimeString("zh-CN");
  process.stdout.write(`[${now}] ${userId}: ${text.slice(0, 80)}${text.length > 80 ? "..." : ""}\n`);

  // Start typing indicator
  if (typingTicket) {
    sendTyping(creds.baseUrl, creds.token, userId, typingTicket, 1);
  }

  try {
    const reply = await callClaude(userId, text);
    const filtered = filterMarkdown(reply);

    // Split long messages (WeChat has ~4000 char limit per message)
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
  process.stdout.write("║  微信 ←→ Claude 桥接 (iLink)    ║\n");
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
