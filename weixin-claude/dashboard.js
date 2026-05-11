import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(__dirname, ".weixin-claude");
const CREDS_PATH = join(STATE_DIR, "credentials.json");
const CONVOS_PATH = join(STATE_DIR, "conversations.json");
const ALLOWED_PATH = join(STATE_DIR, "allowed-users.json");

const PORT = 8899;

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------
function loadJSON(path, fallback = null) {
  try {
    if (existsSync(path)) return JSON.parse(readFileSync(path, "utf-8"));
  } catch {}
  return fallback;
}

function saveAllowedUsers(list) {
  writeFileSync(ALLOWED_PATH, JSON.stringify(list, null, 2), "utf-8");
}

function getCreds() {
  const creds = loadJSON(CREDS_PATH, {});
  return {
    accountId: creds.accountId || "未登录",
    baseUrl: creds.baseUrl || "N/A",
    userId: creds.userId || null,
  };
}

function getUserList() {
  const convos = loadJSON(CONVOS_PATH, {});
  const allowed = loadJSON(ALLOWED_PATH, []);
  const creds = getCreds();
  const adminId = creds.userId;

  return Object.entries(convos).map(([id, msgs]) => {
    const msgCount = Array.isArray(msgs) ? msgs.length : 0;
    const lastMsg = Array.isArray(msgs) && msgs.length > 0
      ? formatLastMessage(msgs[msgs.length - 1])
      : "";
    return {
      userId: id,
      isAdmin: id === adminId,
      isAllowed: allowed.length === 0 || allowed.includes(id),
      msgCount,
      lastMsg,
    };
  });
}

function formatLastMessage(msg) {
  if (!msg) return "";
  if (typeof msg.content === "string") return msg.content.slice(0, 60);
  if (Array.isArray(msg.content)) {
    const text = msg.content.find(c => c.type === "text");
    if (text) return text.text.slice(0, 60);
    const tool = msg.content.find(c => c.type === "tool_use");
    if (tool) return `[工具调用: ${tool.name}]`;
  }
  return "[复杂消息]";
}

function formatChatHistory(userId) {
  const convos = loadJSON(CONVOS_PATH, {});
  const msgs = convos[userId];
  if (!msgs) return [];

  return msgs.map((msg, i) => {
    let role, content;

    if (typeof msg.content === "string") {
      content = msg.content;
      role = msg.role;
    } else if (Array.isArray(msg.content)) {
      const parts = [];
      for (const block of msg.content) {
        if (block.type === "text") parts.push(block.text);
        else if (block.type === "tool_use") parts.push(`[🔧 ${block.name}(${JSON.stringify(block.input).slice(0, 100)})]`);
        else if (block.type === "tool_result") {
          const preview = typeof block.content === "string" ? block.content.slice(0, 200) : "";
          parts.push(`[📋 结果: ${preview}${block.is_error ? " ❌" : ""}]`);
        }
      }
      content = parts.join("\n");
      role = msg.role;
    } else {
      content = JSON.stringify(msg.content);
      role = msg.role;
    }

    return { index: i, role, content };
  });
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------
function renderPage() {
  const creds = getCreds();
  const users = getUserList();
  const allowed = loadJSON(ALLOWED_PATH, []);
  const allowMode = allowed.length === 0 ? "开放（所有人可用）" : "白名单模式";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>微信 Claude 桥接 — 控制台</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, "Microsoft YaHei", sans-serif; background:#f0f2f5; color:#333; min-height:100vh; }
.header { background:linear-gradient(135deg,#1a1a2e,#16213e); color:#fff; padding:20px 30px; }
.header h1 { font-size:22px; margin-bottom:4px; }
.header span { opacity:.7; font-size:13px; }
.cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:15px; padding:20px 30px; }
.card { background:#fff; border-radius:10px; padding:18px; box-shadow:0 1px 4px rgba(0,0,0,.06); }
.card h3 { font-size:12px; color:#999; text-transform:uppercase; margin-bottom:8px; }
.card .val { font-size:20px; font-weight:600; color:#1a1a2e; word-break:break-all; }
.main { padding:0 30px 30px; }
.section { background:#fff; border-radius:10px; padding:20px; box-shadow:0 1px 4px rgba(0,0,0,.06); margin-bottom:20px; }
.section h2 { font-size:16px; margin-bottom:15px; padding-bottom:10px; border-bottom:2px solid #f0f2f5; }
table { width:100%; border-collapse:collapse; }
th, td { text-align:left; padding:10px 12px; border-bottom:1px solid #f0f2f5; }
th { font-size:12px; color:#999; font-weight:600; }
td { font-size:14px; }
.badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; }
.badge-admin { background:#e8f0fe; color:#1a73e8; }
.badge-on { background:#e6f4ea; color:#137333; }
.badge-off { background:#fce8e6; color:#c5221f; }
.badge-open { background:#e6f4ea; color:#137333; }
.btn { padding:4px 12px; border:1px solid #dadce0; border-radius:6px; cursor:pointer; font-size:12px; background:#fff; }
.btn:hover { background:#f0f2f5; }
.btn-block { color:#c5221f; border-color:#c5221f; }
.btn-allow { color:#137333; border-color:#137333; }
.empty { color:#999; font-size:14px; padding:20px 0; text-align:center; }
.chat { max-height:500px; overflow-y:auto; padding:10px; background:#f8f9fa; border-radius:8px; font-size:13px; }
.chat .msg { margin-bottom:12px; border-radius:8px; padding:10px 14px; max-width:85%; white-space:pre-wrap; word-break:break-word; }
.chat .user { background:#e8f0fe; margin-right:auto; }
.chat .assistant { background:#e6f4ea; margin-left:auto; text-align:right; }
.chat .system { background:#fff3cd; text-align:center; margin:0 auto; font-size:11px; padding:6px; }
.chat .role { font-size:10px; opacity:.6; margin-bottom:4px; }
.action-bar { display:flex; gap:8px; align-items:center; margin-top:15px; }
input[type=text] { padding:6px 10px; border:1px solid #dadce0; border-radius:6px; font-size:13px; width:320px; }
.back-link { cursor:pointer; color:#1a73e8; font-size:13px; }
.tabs { display:flex; gap:0; margin-bottom:0; }
.tab { padding:8px 16px; cursor:pointer; border:1px solid #dadce0; background:#fff; font-size:13px; border-bottom:none; border-radius:8px 8px 0 0; margin-right:-1px; }
.tab.active { background:#1a1a2e; color:#fff; border-color:#1a1a2e; }
</style>
</head>
<body>
<div class="header">
  <h1>微信 ←→ Claude 桥接控制台</h1>
  <span>iLink Bot: ${escapeHtml(creds.accountId)} · 管理员: ${escapeHtml(creds.userId || "未绑定")}</span>
</div>

<div class="cards">
  <div class="card">
    <h3>API 模型</h3>
    <div class="val">Claude Sonnet 4</div>
  </div>
  <div class="card">
    <h3>API 端点</h3>
    <div class="val">ilinkai.weixin.qq.com</div>
  </div>
  <div class="card">
    <h3>用户数</h3>
    <div class="val">${users.length}</div>
  </div>
  <div class="card">
    <h3>权限模式</h3>
    <div class="val" style="font-size:16px"><span class="badge ${allowed.length===0?'badge-open':'badge-on'}">${allowMode}</span></div>
  </div>
</div>

<div class="main">
  <div class="section">
    <h2>用户列表</h2>
    <div class="action-bar" style="margin-bottom:15px">
      <input type="text" id="newUserId" placeholder="输入用户 ID (xxx@im.wechat)">
      <button class="btn btn-allow" onclick="allowUser()">+ 添加用户</button>
      <span style="font-size:12px;color:#999;margin-left:8px">添加后白名单生效，仅名单内用户可用</span>
    </div>
    <table id="userTable">
      <thead><tr><th>用户 ID</th><th>身份</th><th>消息数</th><th>状态</th><th>最后消息</th><th>操作</th></tr></thead>
      <tbody>
        ${users.length === 0
          ? '<tr><td colspan="6" class="empty">暂无用户数据</td></tr>'
          : users.map(u => `
            <tr>
              <td><a class="back-link" onclick="viewChat('${escapeHtml(u.userId)}')">${escapeHtml(u.userId)}</a></td>
              <td>${u.isAdmin ? '<span class="badge badge-admin">管理员</span>' : '用户'}</td>
              <td>${u.msgCount}</td>
              <td><span class="badge ${u.isAllowed ? 'badge-on' : 'badge-off'}">${u.isAllowed ? '已授权' : '已停用'}</span></td>
              <td style="font-size:12px;color:#999;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(u.lastMsg)}</td>
              <td>
                ${u.isAdmin
                  ? '<span style="color:#999;font-size:11px">—</span>'
                  : (u.isAllowed
                    ? `<button class="btn btn-block" onclick="blockUser('${escapeHtml(u.userId)}')">停用</button>`
                    : `<button class="btn btn-allow" onclick="allowUserDirect('${escapeHtml(u.userId)}')">启用</button>`)
                }
              </td>
            </tr>`).join("")
        }
      </tbody>
    </table>
  </div>

  <div class="section" id="chatSection" style="display:none">
    <h2><span class="back-link" onclick="hideChat()">← 返回列表</span> &nbsp; 对话历史 — <span id="chatUserId"></span></h2>
    <div class="chat" id="chatContent"></div>
  </div>
</div>

<script>
async function api(path, opts={}) {
  const res = await fetch(path, opts);
  return res.json();
}

function allowUser() {
  const input = document.getElementById("newUserId");
  const id = input.value.trim();
  if (!id) return;
  api("/api/allow", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({userId:id}) })
    .then(() => location.reload());
}

function allowUserDirect(id) {
  api("/api/allow", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({userId:id}) })
    .then(() => location.reload());
}

function blockUser(id) {
  if (!confirm("确定要停用 " + id + " 吗？\\\\n停用后该用户将无法发送消息或调用 API。")) return;
  api("/api/block", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({userId:id}) })
    .then(() => location.reload());
}

function viewChat(id) {
  api("/api/chat/" + encodeURIComponent(id)).then(data => {
    document.getElementById("chatSection").style.display = "block";
    document.getElementById("chatUserId").textContent = id;
    const container = document.getElementById("chatContent");
    if (data.length === 0) {
      container.innerHTML = '<div class="empty">暂无对话记录</div>';
      return;
    }
    container.innerHTML = data.map(m => {
      const cls = m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : "system";
      return '<div class="msg ' + cls + '"><div class="role">' + escapeHtml(m.role) + '</div>' + escapeHtml(m.content) + '</div>';
    }).join("");
    container.scrollTop = container.scrollHeight;
  });
}

function hideChat() {
  document.getElementById("chatSection").style.display = "none";
}

function escapeHtml(s) {
  if (!s) return "";
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
</script>
</body>
</html>`;
}

// Simple-ish escape for JSON embedding in HTML
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------
function jsonResponse(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST", "Access-Control-Allow-Headers": "Content-Type" });
    return res.end();
  }

  // API: allow user
  if (url.pathname === "/api/allow" && req.method === "POST") {
    const { userId } = await readBody(req);
    if (!userId) return jsonResponse(res, { error: "缺少 userId" }, 400);
    const list = loadJSON(ALLOWED_PATH, []);
    if (!list.includes(userId)) {
      list.push(userId);
      saveAllowedUsers(list);
    }
    return jsonResponse(res, { ok: true, list });
  }

  // API: block user
  if (url.pathname === "/api/block" && req.method === "POST") {
    const { userId } = await readBody(req);
    if (!userId) return jsonResponse(res, { error: "缺少 userId" }, 400);
    let list = loadJSON(ALLOWED_PATH, []);
    list = list.filter(id => id !== userId);
    saveAllowedUsers(list);
    return jsonResponse(res, { ok: true, list });
  }

  // API: chat history for a user
  if (url.pathname.startsWith("/api/chat/") && req.method === "GET") {
    const userId = decodeURIComponent(url.pathname.replace("/api/chat/", ""));
    const history = formatChatHistory(userId);
    return jsonResponse(res, history);
  }

  // API: stats
  if (url.pathname === "/api/stats" && req.method === "GET") {
    return jsonResponse(res, {
      users: getUserList(),
      creds: getCreds(),
      allowed: loadJSON(ALLOWED_PATH, []),
    });
  }

  // Default: serve dashboard page
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(renderPage());
});

server.listen(PORT, () => {
  console.log(`控制台已启动: http://localhost:${PORT}`);
  console.log("按 Ctrl+C 停止");
});
