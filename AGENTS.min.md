# AGENTS.min.md

> 职责：SCGP 高频续接最小入口，帮助代理在最短路径内恢复当前任务现场。  
> 何时阅读：用户说“继续”“续接”“接着做”“看 `.continue-here.md`”时。  
> 不负责：替代完整 `AGENTS.md` 提供全部项目背景。

如果你是来续接当前工作，而不是重新理解整个仓库，先读这个文件。

---

## 1. 续接默认顺序

按这个顺序执行：

1. `AGENTS.md`
2. `.continue-here.md`
3. `PROJECT_CONTEXT.md`
4. `git stash list`
5. `git status --short --branch`
6. `git log --oneline -5`
7. 当前分支名

目的：

- 先确认规则
- 再确认当前 handoff
- 再确认 Git 现场
- 避免把旧交接内容误当成当前真实工作区状态

---

## 2. 续接时先说清 4 件事

在真正动手前，先用 4 点给出当前判断：

1. 当前状态
2. 已完成内容
3. 剩余工作
4. 下一步最小动作

不要一上来直接改代码。

---

## 3. dirty worktree 规则

这个仓库经常不是干净工作区。续接时默认遵守：

- 只改当前任务相关文件
- 不顺手处理无关图片、打包产物、更新配置或历史噪音
- 如果同一文件里已有未说明改动，先读清上下文再继续
- 如果发现与你任务直接冲突的现有改动，暂停并说明冲突点

---

## 4. 当前项目口径

- 当前正式产品名称统一使用 `SCGP`
- `sensory` 是当前最完整业务主链
- `emotional` 已有可运行链路，但仍在持续补全
- 不要把未来模块目标态写成当前已实现现状
- 授权相关当前以前端 `effectiveEntitlements` 为事实来源
- 不要再把 `allowedModules` 当成最终访问判权事实来源

---

## 5. 默认执行方式

续接任务默认流程：

1. 读上下文
2. 看 Git 现场
3. 给计划
4. 以最小影响面实施
5. 运行最相关验证
6. 检查 diff
7. 更新 `.continue-here.md`（如果需要停下）

---

## 6. 常用验证入口

优先使用：

- `npm run type-check`
- `npm run type-check:emotional`
- `npm run build:web`

按专题补充：

- `npx jiti tests/entitlement-catalog.test.ts`
- `node --test scripts/tests/training-route-access.test.mjs`
- 其他 `tests/` 或 `scripts/tests/` 下的专题验证

没有验证，不得声称“已完成”或“已修复”。

---

## 7. 交接规则

如果这轮不能做完，优先留下紧凑交接，而不是长总结。

默认更新：

1. `.continue-here.md`
2. 必要时补 `HANDOFF.md`

交接内容尽量压缩为：

- Current State
- Next Action
- Blockers
- Key Decisions
- Relevant Files

---

## 8. 高风险主题提醒

以下主题续接时不要直接沿用旧心智模型，先回代码确认当前实现：

- 授权链
- 激活
- 更新源
- 打包发布
- 训练记录主表
- 跨入口统一训练链

---

## 9. 一句话规则

> 续接时先读 `AGENTS.md`、`.continue-here.md`、`PROJECT_CONTEXT.md`，再看 Git 现场；只做窄范围改动，先计划后执行，做完必须验证，停下要留紧凑交接。
