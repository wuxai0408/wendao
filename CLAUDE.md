# 青云项目

## 工作目录
- 始终在 `C:\Users\liyou\Downloads\无敌了\青云` 下操作
- 仓库地址: https://github.com/wuxai0408/wendao (wendao/问道)

## 项目内容
- 爱心代码.html — 爱心动画网页
- 经验库.md — 错误/成功经验记录
- weixin-claude/ — 微信←→Claude桥接系统

## 触发词：记录 / 记忆
当用户说"记录"或"记忆"时，自动执行以下流程，不需要等详细指令：

1. **读取经验库** — 先读 `经验库.md`，了解当前状态
2. **总结本次教训** — 从当前对话中提炼出简短条目（场景→根因→教训，格式对齐经验库）
3. **追加到经验库** — 添加新条目，永远追加不覆盖不删除
4. **更新记忆文件** — 同步到 `C:\Users\liyou\.claude\projects\C--Users-liyou-Downloads-------\memory\`
5. **更新 MEMORY.md 索引** — 如有新文件
6. **Git 提交推送** — commit message 写清楚加了什么
