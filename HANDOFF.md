# HANDOFF.md

> last_updated: 2026-03-30

> 职责：新会话总入口，只负责把你导向正确文档。
> 何时阅读：每次进入仓库、准备续接工作或需要快速建立上下文时。
> 不负责：替代 `AGENTS.md`、`.continue-here.md` 或 `PROJECT_CONTEXT.md` 承担事实摘要。

## 快速启动（< 2 分钟）

按顺序读：

1. `AGENTS.md`
2. `.continue-here.md`
3. `PROJECT_CONTEXT.md`

通常读完这三个，就可以开始干活。

## 需要深挖时再读

- `README.md`
  - 项目概述、目录结构、常用命令
- `docs/planning/2026-03-23-scgp-context-bootstrap.md`
  - 最低成本启动参考
- `.planning/phases/<当前阶段>/*-PLAN.md`
  - 当前阶段详细计划
- `.planning/phases/<当前阶段>/*-SUMMARY.md`
  - 当前阶段完成情况与关键决策
- `.planning/phases/<当前阶段>/*-VERIFICATION.md`
  - 当前阶段验收与验证结果

## 历史归档（一般不需要读）

- `docs/logs/`
  - 过往阶段记录与历史归档
- `.planning/phases/`
  - 已完成阶段的局部计划、总结、验证文档
- `docs/plans/`
  - 历史计划与旧阶段设计稿

## 当前活跃工作

- 当前唯一有效续接入口：`.continue-here.md`
- 当前续接范围：`training-resource copy workflow landed, final copy pass pending, and resource-center runtime verification`
- 如果 `.continue-here.md` 与其他文档冲突：
  - 当前任务以 `.continue-here.md` 为准
  - 边界与规则以 `AGENTS.md` 为准
  - 最终实现状态以代码为准

## 当前阶段文档

- 当前活跃工作不一定严格对应单一 phase。
- 如本轮工作属于阶段执行，再去看对应 `.planning/phases/*/PLAN.md`。
- 最近活跃阶段：`Phase 16 — shell migration and end-to-end compatibility`
- 阶段文件前缀：`.planning/phases/16-*/`

## 维护规则

- 每次关闭一轮对话前，检查：
  - `.continue-here.md` 是否仍是当前唯一有效交接
  - `PROJECT_CONTEXT.md` 是否只保留当前有效全局摘要
  - `HANDOFF.md` 的“当前活跃工作 / 当前阶段文档 / 最后更新”是否需要刷新
- 调整入口文档时，同步更新：
  - `README.md`
  - `docs/INDEX.md`
  - `AGENTS.md`

## 最后更新

- 2026-03-30
