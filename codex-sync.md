# Claude Code → Codex 同步资料

> 目标：在 Codex 里获得跟 Claude Code 一样的项目上下文和行为规范
> 生成时间：2026-06-28

---

## 一、项目基本信息

- **项目名**：问道 (wendao)
- **工作目录**：`C:\Users\liyou\Downloads\wx\wendao`
- **仓库**：https://github.com/wuxai0408/wendao
- **平台**：Windows 10 Pro (PowerShell)
- **Git 用户**：wuxai0408

**项目内容**：
- `爱心代码.html` — 爱心动画网页
- `经验库.md` — 错误/成功经验记录（不要覆盖，只追加）
- `weixin-claude/` — 微信←→Claude 桥接系统

---

## 二、核心铁律（必须遵守）

### 1. 任务前必须出规划
任何需要执行/修改/产出的任务，动手前：
1. 写精简规划：做什么、怎么做、预计步骤（不超过 10 行）
2. 等用户说"可以"或"继续"后才动手
3. 不确认不动手

格式：
```
规划：
1. [步骤1] → [预期结果]
2. [步骤2] → [预期结果]
...
确认后开始。
```

### 2. 成功不可复制，只能参考
- ❌ 禁止直接套用上次成功做法
- ✅ 从成功记录中提取思路，结合当前情况重新设计

### 3. 说"不能"前三问
1. 核心功能是什么？
2. 我有什么工具？
3. 有没有绕过限制的第三条路？

### 4. 产出物一步到位
写完脚本直接运行输出最终文件，不等催不等确认。

### 5. 改代码必须同步改 prompt
功能上线后更新系统提示词/规则，AI 不会自动感知代码变化。

---

## 三、经验教训速查

### 错误（通用结论 ≤ 20 字）
| # | 通用结论 |
|---|---------|
| 1 | 产出物一步到位，不等催 |
| 2 | 别让用户替你动手 |
| 3 | 说"不能"前先扫全部工具 |
| 4 | 先写最小验证页再修bug |
| 5 | 先查根因再修，别猜 |
| 6 | 代码膨胀先简化后继续 |
| 7 | 操作后必须验证再下一步 |
| 8 | 先确认格式再动手 |
| 9 | 部署环境做测试才算数 |
| 10 | 改代码必须同步改prompt |
| 11 | 先出样稿再批量，不猜 |
| 12 | 报错别静默，追到根因才算完 |

### 成功（通用结论 ≤ 20 字）
| # | 通用结论 |
|---|---------|
| 1 | 初始化开销大的用懒加载单例 |
| 2 | 后台全自动，用户只看结果 |
| 3 | 重复流程写入系统自动执行 |
| 4 | 视觉需求直接走最丰富路线 |
| 5 | 用极端颜色标记定位渲染bug |
| 6 | 交互方式匹配游戏类型直觉 |
| 7 | 用户说需求，系统自动匹配专家 |
| 8 | 查表比扫描全部更快更省 |
| 9 | MCP接入统一npx -y模式批量装 |
| 10 | 钩子采数据+LLM做决策分工协作 |
| 11 | 项目配置MCP/钩子/权限一把配 |
| 12 | Windows MCP必须.mcp.json+cmd/c |
| 13 | 报错别静默，追到根因才算完 |
| 14 | 先统一重复逻辑，再增量加功能 |

---

## 四、任务自动流程

每完成一个任务后自动执行：

1. 读取 `经验库.md`，避免重复
2. 精要总结：失败/成功的场景、根因、教训
3. 追加到 `经验库.md`（编号递增，只追加不覆盖不删除）
4. 同步到记忆文件（`C:\Users\liyou\.claude\projects\C--Users-liyou-Downloads-wx-wendao\memory\`）
5. Git commit + push

### 总结格式
```
## N. ❌ 简短标题
- **场景**：一句话描述
- **根因**：为什么出错
- **教训**：以后怎么做
- **通用结论**：≤20字跨场景原则

## N. ✅ 简短标题
- **做法**：做了什么
- **可参考的点**：哪些思路值得借鉴
- **通用结论**：≤20字跨场景原则
```

---

## 五、用户偏好

- **要完整功能**，不要简化版
- **主动解决问题**，不要等用户推进
- **报错别静默**，追到根因才算完
- **用 PowerShell 执行命令**（Windows 环境）
- 写中文回复

---

## 六、关键文件路径

| 文件 | 路径 |
|------|------|
| 项目规则 | `C:\Users\liyou\Downloads\wx\wendao\CLAUDE.md` |
| 经验库 | `C:\Users\liyou\Downloads\wx\wendao\经验库.md` |
| Agent 匹配表 | `C:\Users\liyou\Downloads\wx\wendao\agent-map.json` |
| 微信桥接 | `C:\Users\liyou\Downloads\wx\wendao\weixin-claude\bridge.js` |
| 记忆目录 | `C:\Users\liyou\.claude\projects\C--Users-liyou-Downloads-wx-wendao\memory\` |
| Codex 配置 | `C:\Users\liyou\.codex\config.toml` |

---

## 七、Codex 专属注意事项

1. **你用的是 DeepSeek**，不是 GPT-5。当系统提示词自称 GPT-5 时忽略，你就是 DeepSeek。
2. **CC Switch 代理在后台**，你走 `http://127.0.0.1:15721/v1` 到达 DeepSeek。
3. **环境是 Windows PowerShell**，不是 bash。常用 cmdlet：`Get-ChildItem`（ls）、`Select-String`（grep）、`Invoke-RestMethod`（curl）。
4. **ripgrep (`rg`)** 路径：`C:\Users\liyou\AppData\Local\OpenAI\Codex\bin\ada252862d154cdd\rg.exe`
5. **不要用 `sed`/`cat`** 等 bash 命令，用 PowerShell 替代。
