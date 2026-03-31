# HANDOFF.md

> last_updated: 2026-03-31

> 职责：新会话总入口，只负责把你导向当前有效文档。
> 何时阅读：每次进入仓库、准备续接工作、或需要快速建立当前上下文时。
> 不负责：替代 `AGENTS.md`、`.continue-here.md` 或 `PROJECT_CONTEXT.md` 承担事实细节。

## 快速启动

按顺序阅读：

1. `AGENTS.md`
2. `.continue-here.md`
3. `PROJECT_CONTEXT.md`

通常读完这三个文件，就可以开始当前工作。

## 当前活跃工作

- 当前唯一有效续接入口：`.continue-here.md`
- 当前续接范围：`ClassManagement UI refactor is landed and type-checked; runtime visual verification is pending`
- 如果 `.continue-here.md` 与其他文档冲突：
  - 当前任务以 `.continue-here.md` 为准
  - 规则边界以 `AGENTS.md` 为准
  - 最终实现状态以代码为准

## 需要深挖时再读

- `README.md`
  - 项目概览、目录结构、常用命令
- `docs/planning/2026-03-23-scgp-context-bootstrap.md`
  - 最小上下文启动材料
- `.planning/phases/<current>/*-PLAN.md`
  - 当前阶段详细计划
- `.planning/phases/<current>/*-SUMMARY.md`
  - 当前阶段完成摘要
- `.planning/phases/<current>/*-VERIFICATION.md`
  - 当前阶段验证结果

## 历史材料

- `docs/logs/`
- `.planning/phases/`
- `docs/plans/`

这些默认只在需要追溯历史决策时再读。
