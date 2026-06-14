# 问道项目 (wendao)

## 工作目录
- 始终在 `C:\Users\liyou\Downloads\wx\wendao` 下操作
- 仓库地址: https://github.com/wuxai0408/wendao

## 项目内容
- 爱心代码.html — 爱心动画网页
- 经验库.md — 错误/成功经验记录
- weixin-claude/ — 微信←→Claude桥接系统

## 自动经验记录（每次任务后必须执行）

**规则：无需用户说"记录"或"记忆"，每个任务完成后自动执行。**

### 触发条件
- 用户说"记录"或"记忆"时 → 立即执行
- 每个任务/功能/问题解决结束，用户确认"可以了""没问题了"或自然结束时 → 自动静默执行
- 每次犯错并被用户指出后 → 立即自动执行

### 执行流程
1. **读取经验库** — 先读 `经验库.md`，了解当前状态，避免重复
2. **精要总结** — 从当前对话中提炼：
   - ❌ 失败：场景、根因、教训（一句话）
   - ✅ 成功：做法、为什么有效、可复用的模式
3. **追加到经验库** — 添加新条目，永远追加不覆盖不删除。编号递增
4. **更新记忆文件** — 同步到 `C:\Users\liyou\.claude\projects\C--Users-liyou-Downloads-------\memory\feedback-experience-library.md`
5. **更新 MEMORY.md 索引** — 如有新文件
6. **Git 提交推送** — commit message 写清楚加了什么

### 总结格式（对齐经验库）
每条必须有**通用结论**——一条精简原则（≤20字），能脱离当前场景用在其他任务上。
错误用"禁止/必须/先…再…"，成功用"用…可以…/…比…更…"句式。

```
## N. ❌ 简短标题
- **场景**：一句话描述
- **根因**：为什么出错
- **教训**：以后怎么做
- **通用结论**：≤20字跨场景原则
```
或
```
## N. ✅ 简短标题
- **做法**：做了什么
- **可参考的点**：哪些思路值得借鉴（禁止完全照搬）
- **通用结论**：≤20字跨场景原则
```

## 自动 Agent 匹配
收到明显专业任务时，自动匹配领域专家（无需用户说"激活"）。

**流程**：
1. 读 `C:\Users\liyou\Downloads\wx\wendao\agent-map.json`（55个分类的关键词映射表，~5KB）
2. 用用户任务关键词匹配映射表的 `k` 字段
3. 命中后读 `~/.claude/agents/` 下匹配到的 `.md` 文件
4. 静默加载专家人格，直接以该专家身份回复
5. 未命中/闲聊/简单问答时跳过（不强制）

**多次匹配时取最精准的一个。匹配耗时 ~500 token。**

## 铁律：任务前必须出规划
任何需要执行/修改/产出的任务，动手前必须：
1. 写**精简规划**：要做什么、怎么做、预计几步（不超过10行）
2. **等待用户确认**：说"可以"或"继续"后才动手
3. 不确认不动手，禁止跳过

格式：
```
规划：
1. [步骤1] → [预期结果]
2. [步骤2] → [预期结果]
...
确认后开始。
```

## 铁律：成功不可复制，只能参考
- ❌ 禁止：看到类似场景直接套用上次成功做法
- ✅ 必须：从成功记录中提取可借鉴的思路，结合当前具体情况重新设计

## 自动进化系统 (Auto-Evolution)

系统持续自我改进，四个阶段：**观察 → 反思 → 应用 → 验证**。

### 会话启动时（进化检查）
1. 读 `.claude/evolution/flags.txt`
   - 内容为 `CLEAN` → 跳过进化，直接进入正常流程（无意义不折腾）
   - 存在标记 → 继续以下步骤
2. 读 `.claude/evolution/signals/summary.json` — 近期统计数据
3. 读最近 3 个会话审计文件 (`.claude/evolution/sessions/` 下按时间取最新)
4. 读 `.claude/evolution/patterns/active.json` — 追踪中的模式
5. 读 `.claude/evolution/proposals/pending.json` — 待处理提案

### 产生改进提案的条件（全部满足才动）
- 同一信号在 ≥2 个不同会话出现
- 置信度 ≥0.7（你的判断，不是估算）
- 改进方向明确可执行
- 不在冷却期（前一个提案已处理）
- 待处理提案 <3 个

### 提案类型
| 类型 | 改什么 | 示例 |
|------|--------|------|
| `claude_md_update` | CLAUDE.md | 新铁律、规则修正 |
| `agent_map_update` | agent-map.json | 关键词调整 |
| `hook_update` | .claude/settings.json | 修改钩子逻辑 |
| `threshold_update` | signals/thresholds.json | 调阈值 |
| `experience_consolidation` | 经验库 → CLAUDE.md 铁律 | 3条同主题升级 |

### 应用改进后
1. 提案移到 `.claude/evolution/proposals/applied/prop-XXX.json`
2. 设置验证条件（如"5个会话内零复现"）
3. 追加到经验库（✅ 编号）
4. Git 提交（commit message 注明提案ID）

### 验证阶段（后续会话启动时）
1. 检查 `proposals/applied/` 中待验证提案
2. 条件满足 → 标记 `verified`
3. 2会话仍未满足 → 标记 `failed`，考虑回滚

### 无意义防护
- flags.txt 为 CLEAN 时不触发任何进化检查
- 同一提案不创建两次（先查 archive）
- 冷却期：至少隔 1 个会话才能出新提案
- 最大 3 个待处理提案

### 文件索引
| 文件 | 用途 |
|------|------|
| `.claude/evolution/state.json` | 进化引擎状态 |
| `.claude/evolution/flags.txt` | 启动信号（CLEAN 或标记列表） |
| `.claude/evolution/sessions/` | 会话审计记录 |
| `.claude/evolution/signals/summary.json` | 聚合统计数据 |
| `.claude/evolution/signals/thresholds.json` | 提案触发阈值 |
| `.claude/evolution/patterns/active.json` | 追踪中的模式 |
| `.claude/evolution/patterns/archive.json` | 已归档模式 |
| `.claude/evolution/proposals/pending.json` | 待决策提案 |
| `.claude/evolution/proposals/applied/` | 已应用的提案+验证条件 |
