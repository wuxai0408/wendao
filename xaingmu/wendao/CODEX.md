 # 问道 (wendao) · 项目规则

 ## 项目信息

 - **项目名**: 问道 (wendao)
 - **仓库地址**: https://github.com/wuxai0408/wendao
 - **本地路径**: `C:\Users\liyou\Downloads\ai\wx\wendao\`
 - **项目描述**: 微信桥接、文档/PPT 生成、自动化办公工具集

 ## 项目核心模块

 - `weixin-claude/` — 微信 ↔ AI 桥接系统（核心）
 - `爱心代码.html` — 爱心动画网页
 - 文档生成：PPT / Word / Markdown 批量产出

 ## 项目专属规则

 1. 微信相关操作通过 `weixin-claude/bridge.js` 桥接
 2. 产出物直接生成最终文件，不等催不等确认
 3. 操作后必须验证再下一步（如杀进程→netstat确认、部署→curl验证）
 4. Windows PowerShell 执行所有命令（非 bash）
 5. ripgrep 路径：`C:\Users\liyou\AppData\Local\OpenAI\Codex\bin\ada252862d154cdd\rg.exe`

 ## 项目依赖

 - Node.js / npm
 - pptxgenjs (PPT 生成)
 - docx (Word 生成)
 - weixin-claude 桥接系统

 ## 已知坑位

 1. Windows MCP 配置必须用 `.mcp.json` + `cmd /c` 前缀
 2. 微信桥接的 HTTP server 需在操作前确认端口未被占用
 3. 文件路径含空格时必须用双引号包裹

 ---

 > 全局规则见 `C:\Users\liyou\Downloads\ai\codex\CODEX.md`
 > 全局经验见 `C:\Users\liyou\Downloads\ai\codex\wenjian\经验库.md`
