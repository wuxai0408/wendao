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
      role = msg.role === "user" ? "用户" : "Claude";
    } else if (Array.isArray(msg.content)) {
      const parts = [];
      for (const block of msg.content) {
        if (block.type === "text") {
          parts.push(block.text);
        } else if (block.type === "tool_use") {
          parts.push(`\n🔧 调用工具: ${block.name}(${JSON.stringify(block.input).slice(0, 200)})\n`);
        } else if (block.type === "tool_result") {
          const preview = typeof block.content === "string" ? block.content.slice(0, 500) : "";
          parts.push(`\n📋 工具返回${block.is_error ? " ❌" : ""}:\n${preview}\n`);
        }
      }
      content = parts.join("");
      role = msg.role === "user" ? "用户" : "Claude";
    } else {
      content = JSON.stringify(msg.content);
      role = msg.role === "user" ? "用户" : "Claude";
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
.chat { max-height:600px; overflow-y:auto; padding:16px; background:#f8f9fa; border-radius:8px; font-size:13px; line-height:1.6; display:flex; flex-direction:column; gap:12px; }
.chat .msg { border-radius:8px; padding:12px 16px; max-width:85%; white-space:pre-wrap; word-break:break-word; }
.chat .user { background:#e8f0fe; margin-right:auto; }
.chat .assistant { background:#fff; border:1px solid #e0e0e0; margin-right:auto; }
.chat .system { background:#fff3cd; text-align:center; margin:0 auto; font-size:11px; padding:6px; }
.chat .role { font-size:11px; font-weight:600; margin-bottom:6px; color:#555; display:flex; align-items:center; gap:4px; }
.chat .role::before { content:''; width:8px; height:8px; border-radius:50%; display:inline-block; }
.chat .user .role::before { background:#1a73e8; }
.chat .assistant .role::before { background:#137333; }
.chat .tool-use { background:#e3f2fd; border:1px dashed #90caf9; margin:4px 0; padding:8px 12px; border-radius:6px; font-size:12px; }
.chat .tool-result { background:#e8f5e9; border:1px dashed #a5d6a7; margin:4px 0; padding:8px 12px; border-radius:6px; font-size:11px; max-height:200px; overflow-y:auto; }
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
      <thead><tr><th>用户 ID</th><th>身份</th><th>消息数</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>
        ${users.length === 0
          ? '<tr><td colspan="5" class="empty">暂无用户数据</td></tr>'
          : users.map(u => `
            <tr>
              <td><span style="font-weight:500">${escapeHtml(u.userId)}</span></td>
              <td>${u.isAdmin ? '<span class="badge badge-admin">管理员</span>' : '用户'}</td>
              <td>${u.msgCount}</td>
              <td><span class="badge ${u.isAllowed ? 'badge-on' : 'badge-off'}">${u.isAllowed ? '已授权' : '已停用'}</span></td>
              <td>
                <button class="btn" onclick="viewChat('${escapeHtml(u.userId)}')" style="margin-right:4px">📋 查看对话</button>
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

  <div class="section" id="chatSection">
    <h2>
      对话记录 —
      <select id="chatUserSelect" onchange="switchChatUser()" style="font-size:14px;padding:4px 8px;margin-left:8px">
        <option value="">— 选择用户 —</option>
        ${users.map(u => `<option value="${escapeHtml(u.userId)}">${escapeHtml(u.userId)} (${u.msgCount}条)</option>`).join("")}
      </select>
    </h2>
    <div class="chat" id="chatContent">
      <div class="empty">请选择一个用户查看对话记录</div>
    </div>
  </div>
</div>

<script>
console.log("控制台脚本 v3 已加载");

async function api(path, opts={}) {
  try {
    const res = await fetch(path, opts);
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    return res.json();
  } catch (err) {
    console.error("API error:", path, err);
    return null;
  }
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
  if (!confirm("确定要停用 " + id + " 吗？\\n停用后该用户将无法发送消息或调用 API。")) return;
  api("/api/block", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({userId:id}) })
    .then(() => location.reload());
}

function switchChatUser() {
  var sel = document.getElementById("chatUserSelect");
  if (!sel) return;
  var id = sel.value;
  if (!id) { document.getElementById("chatContent").innerHTML = '<div class="empty">请选择一个用户查看对话记录</div>'; return; }
  window.location.hash = encodeURIComponent(id);
  viewChat(id);
}

function viewChat(id) {
  console.log("viewChat called with id:", id);
  const sel = document.getElementById("chatUserSelect");
  if (sel) sel.value = id;
  const container = document.getElementById("chatContent");
  if (!container) { console.error("chatContent not found"); return; }
  container.innerHTML = '<div class="empty">加载中...</div>';
  api("/api/chat/" + encodeURIComponent(id)).then(data => {
    if (!data) {
      container.innerHTML = '<div class="empty">加载失败，请检查控制台是否运行</div>';
      return;
    }
    if (data.length === 0) {
      container.innerHTML = '<div class="empty">暂无对话记录</div>';
      return;
    }
    container.innerHTML = data.map(m => {
      let cls = m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : "system";
      // Format tool calls/ results visually
      let content = escapeHtml(m.content);
      content = content.replace(/\[🔧 (\w+)\((.*?)\)\]/g, '<span style="color:#1a73e8;font-weight:600">🔧 $1</span> <span style="color:#666">$2</span>');
      content = content.replace(/\[📋 结果:/g, '<span style="color:#137333">📋 结果:</span>');
      return '<div class="msg ' + cls + '"><div class="role">' + m.role + '</div>' + content + '</div>';
    }).join("");
    container.scrollTop = container.scrollHeight;
  });
}

// Auto-load first user's chat on page load
document.addEventListener("DOMContentLoaded", function() {
  const hash = window.location.hash.slice(1);
  if (hash) {
    const id = decodeURIComponent(hash);
    viewChat(id);
  } else {
    var sel = document.getElementById("chatUserSelect");
    if (sel && sel.options.length > 1) {
      sel.selectedIndex = 1;
      switchChatUser();
    }
  }
});

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
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache, no-store, must-revalidate" });
  res.end(renderPage());
});

server.listen(PORT, () => {
  console.log(`控制台已启动: http://localhost:${PORT}`);
  console.log("按 Ctrl+C 停止");
});
