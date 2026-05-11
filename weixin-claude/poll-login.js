import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(__dirname, ".weixin-claude");
const CREDS_PATH = join(STATE_DIR, "credentials.json");
const QR_STATE_PATH = join(__dirname, ".weixin-claude-qr.json");

const ILINK_APP_ID = "bot";
const CLIENT_VERSION = String(((2 & 0xff) << 16) | ((4 & 0xff) << 8) | (3 & 0xff));
const FIXED_BASE_URL = "https://ilinkai.weixin.qq.com";

function randomWechatUin() {
  const uint32 = crypto.randomBytes(4).readUInt32BE(0);
  return Buffer.from(String(uint32), "utf-8").toString("base64");
}

// Read saved QR code
const qrData = JSON.parse(readFileSync(QR_STATE_PATH, "utf-8"));
const qrcode = qrData.qrcode;

console.log("等待扫码确认... (二维码图片在桌面)");
console.log("qrcode token:", qrcode);

const deadline = Date.now() + 300_000; // 5 min

while (Date.now() < deadline) {
  try {
    const res = await fetch(
      `https://ilinkai.weixin.qq.com/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`,
      {
        method: "GET",
        headers: {
          "iLink-App-Id": ILINK_APP_ID,
          "iLink-App-ClientVersion": CLIENT_VERSION,
        },
        signal: AbortSignal.timeout(35_000),
      }
    );
    const status = await res.json();
    const now = new Date().toLocaleTimeString("zh-CN");

    switch (status.status) {
      case "wait":
        process.stdout.write(".");
        break;
      case "scaned":
        console.log(`\n[${now}] 已扫码，请在手机上点「确认」...`);
        break;
      case "confirmed":
        console.log(`\n\n✅ 登录成功!`);
        console.log(`   ilink_bot_id: ${status.ilink_bot_id}`);
        console.log(`   baseurl: ${status.baseurl || FIXED_BASE_URL}`);

        // Save credentials
        if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
        writeFileSync(CREDS_PATH, JSON.stringify({
          token: status.bot_token,
          accountId: status.ilink_bot_id,
          baseUrl: status.baseurl || FIXED_BASE_URL,
          userId: status.ilink_user_id,
        }, null, 2), "utf-8");
        console.log("   凭据已保存\n");

        // Show next step
        console.log("现在设置 API Key 后启动桥接:");
        console.log('  $env:ANTHROPIC_API_KEY = "sk-ant-..."');
        console.log("  node bridge.js");
        process.exit(0);
        break;
      case "expired":
        console.log(`\n❌ 二维码已过期，请重新运行 gen-qr.js`);
        process.exit(1);
        break;
      case "need_verifycode":
        console.log(`\n⚠️  需要验证码（输入手机微信显示的数字）:`);
        // Read from stdin
        const code = await new Promise((resolve) => {
          let input = "";
          process.stdin.resume();
          process.stdin.setEncoding("utf-8");
          process.stdin.on("data", (chunk) => {
            input += chunk.toString();
            if (input.includes("\n")) {
              process.stdin.pause();
              resolve(input.trim());
            }
          });
        });
        // Retry poll with verify code
        const vfyUrl = `https://ilinkai.weixin.qq.com/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}&verify_code=${encodeURIComponent(code)}`;
        const vfyRes = await fetch(vfyUrl, {
          headers: { "iLink-App-Id": ILINK_APP_ID, "iLink-App-ClientVersion": CLIENT_VERSION },
        });
        const vfyStatus = await vfyRes.json();
        if (vfyStatus.status === "scaned") {
          console.log("验证码正确，继续等待确认...");
        } else {
          console.log("状态:", vfyStatus.status);
        }
        break;
      case "binded_redirect":
        console.log(`\n✅ 该 Bot 已绑定此 OpenClaw，无需重复连接。`);
        process.exit(0);
        break;
      default:
        console.log(`\n未知状态: ${status.status}`, JSON.stringify(status));
        break;
    }
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      // Long-poll timeout, normal
    } else {
      console.log(`\n轮询错误: ${err.message}`);
    }
  }
  await new Promise((r) => setTimeout(r, 1000));
}

console.log("\n登录超时。");
process.exit(1);
