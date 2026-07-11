import crypto from "node:crypto";
import QRCode from "qrcode";

const ILINK_APP_ID = "bot";
const CLIENT_VERSION = String(((2 & 0xff) << 16) | ((4 & 0xff) << 8) | (3 & 0xff));

function randomWechatUin() {
  const uint32 = crypto.randomBytes(4).readUInt32BE(0);
  return Buffer.from(String(uint32), "utf-8").toString("base64");
}

// Fetch QR code URL from iLink
const res = await fetch("https://ilinkai.weixin.qq.com/ilink/bot/get_bot_qrcode?bot_type=3", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "iLink-App-Id": ILINK_APP_ID,
    "iLink-App-ClientVersion": CLIENT_VERSION,
    "AuthorizationType": "ilink_bot_token",
    "X-WECHAT-UIN": randomWechatUin(),
  },
  body: JSON.stringify({ local_token_list: [] }),
});

const data = await res.json();
const qrUrl = data.qrcode_img_content;
const qrcode = data.qrcode;

console.log("QR URL:", qrUrl);
console.log("qrcode token:", qrcode);

// Write the QR URL to a temp file for the bridge to use
import { writeFileSync } from "node:fs";
writeFileSync(".weixin-claude-qr.json", JSON.stringify({ qrcode, qrUrl }), "utf-8");

// Generate QR image to desktop
const desktop = process.env.USERPROFILE + "\\Desktop";
const pngPath = desktop + "\\微信扫码登录.png";
await QRCode.toFile(pngPath, qrUrl, { type: "png", width: 400, margin: 2 });
console.log("QR 图片已保存到桌面:", pngPath);
