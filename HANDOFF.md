# HANDOFF.md

> last_updated: 2026-05-20

2026-05-20
- 已完成授权能力包拆分方案评审稿，并吸收首轮架构评审意见：授权能力包与 `module_code` 解耦，旧激活码兼容展开，`effectiveEntitlements` 作为验签后的前端授权事实来源。
- 当前状态：方案文档和阶段 1 影子映射层实施计划已落到 `docs/planning/`，`docs/INDEX.md` 已加入入口；尚未开始改实现代码。
- 下一步：先读 `.continue-here.md`，再读 `docs/planning/2026-05-20-entitlement-phase1-shadow-mapping-implementation-plan.md`，第一步新增 `src/features/entitlements/entitlement-catalog.ts`，只实现授权目录、兼容展开和类型定义，不改 UI 行为。

2026-05-11
- 已完成自理训练迁移启动前分析，明确旧 `Self-Care ATS` 在本项目中只作为“任务内容种子源”，不迁学生、历史计划、历史记录等业务包袱。
- 当前状态：阶段 3 的“当前训练任务”工作区占位与 `meta_data.steps[]` 展示代码已完成；新增了 ATS 种子导入分析文档，锁定了“先做执行与写链、后做种子导入”的顺序。
- 下一步：先读 `.continue-here.md`，然后先新建 `src/database/self-care-training-api.ts`，收口 `TaskTrainingExecutionResult -> training_records + training_session` 的保存契约。

2026-04-29
- 已完成统一评估容器断点续评主链收口，并通过用户验收。
- 当前状态：12 个接入统一评估容器的量表现在共享真实的保存/恢复链路；代码级验证已通过，剩余仅是可选的 Electron 人工 UAT。
- 下一步：先读 `.continue-here.md`，如果继续本专题，优先做 `weefim / sm / cbcl / fine_motor / cnbsr2016` 这 5 组代表性人工验收。

2026-04-16
- 已完成 `S04_GIFT_MATCH` 最小运行链路、训练记录详情中文化与人工验收。
- 当前状态：`Wave 1` 6 个目标已进入正式运行链路，`type-check:emotional` 通过，`礼物分享派对` 实机通过。
- 下一步：先修改 `src/data/custom-game-registry.ts`，新增 `S01_BURGER` 定义并挂到 `social-communication`。

2026-04-15
- 已完成 `S02_EMOTION_MIRROR` 最小运行链路、路由接线与训练记录详情中文化映射。
- 当前状态：`表情猜猜乐` 可启动、可落库，详情页不再暴露程序字段名，`npm run type-check:emotional` 与 UI 验证已通过。
- 下一步：先修改 `src/data/custom-game-registry.ts`，新增 `S04_GIFT_MATCH` 定义并挂到 `social-communication`。

2026-04-15
- 已完成 `C04_HOURGLASS` 详情页收口：无响应不再显示 `0ms`，开始/落库时间解析口径已统一。
- 当前状态：`src/views/emotional/GameRecordDetail.vue` 已通过 `npm run type-check:emotional`，本轮无剩余展示遗留项。
- 下一步：先修改 `src/data/custom-game-registry.ts`，新增 `S02_EMOTION_MIRROR` 定义并挂到 `social-communication`。

2026-04-15
- 已完成 `C04_HOURGLASS` 手工验收，并修掉情绪小游戏详情页暴露内部 `game_code` 的用户文案。
- 当前状态：`recordId=21` 已验证自然结束落库；剩余未收口的是详情页 `平均响应 = 0ms` 与时间显示时区不一致。
- 下一步：先修改 `src/views/emotional/GameRecordDetail.vue`，让无响应小游戏不再显示 `0ms`。

2026-04-15
- 已完成 `C04_HOURGLASS` 最小运行链路、`timer_end` 落库、详情页中文化与相关约束文档补充。
- 当前状态：代码已闭环，`npm run type-check:emotional` 通过，尚未做手工验收。
- 下一步：先手工验证 `soothing-aids -> 魔法沙漏 -> 自然结束 -> 详情页指标 / 文案`。

2026-04-15
- 已完成 `C01_DANDELION` 人工验收，整链通过：`soothing-aids -> 吹蒲公英 -> 完成落库 -> 详情页指标`。
- 当前状态：`C01_DANDELION` 已收口，下一轮进入下一个 Wave 1 单目标。
- 下一步：先修改 `src/data/custom-game-registry.ts`，新增 `C04_HOURGLASS` 定义并挂到 `soothing-aids`。

2026-04-15
- 已完成 `C01_DANDELION` 最小运行链路、呼吸玩法变体、大屏横向布局与小游戏沉浸式壳接线。
- 当前状态：`soothing-aids -> 游戏 -> 吹蒲公英` 代码链已闭环，`npm run type-check` 通过；人工验收未做。
- 下一步：先手工验证 `C01_DANDELION` 启动、完成态记录与详情页指标。

2026-04-15
- 已完成 `F05_BALLOONS` 最小运行链路、记录指标接线与人工验收。
- 当前状态：`fine-motor -> 游戏 -> 完成态记录 -> 详情页指标` 已通过。
- 下一步：下一轮直接实现下一个 Wave 1 游戏，默认先从 `C01_DANDELION` 开始。

2026-04-14
- 完成 `F01_CLOUD_ERASE` 最小运行链路、训练记录接线与详情页入口归属修正。
- 当前状态：代码已闭环，`npm run type-check` 通过，且已人工确认详情页左侧仅高亮“训练记录”。
- 下一步：与用户确认下一个 Wave 1 目标。

2026-04-14
- 已完成 cross-entry custom game 最小入口适配层：`GameLobby` 启动接线 + `GameContainer` 返程。
- 当前状态：registry-backed custom game 已能按真实 `entry / module` 启动并返回游戏大厅；`F01_CLOUD_ERASE` 尚未实现。
- 下一步：先修改 `src/data/custom-game-registry.ts`，新增 `F01_CLOUD_ERASE` 的 registry 定义。

2026-04-14
- 已完成 cross-entry custom games 的 Wave 1 前期准备收口，锁定最小目标 `F01_CLOUD_ERASE`，并补齐最小定义文档。
- 当前状态：运行时底座基本够用，但非 emotional 入口仍未接上 registry-backed custom games，返程仍会落回 `/emotional/menu`。
- 下一步：先改 `src/views/games/GameLobby.vue` 和 `src/views/emotional/games/GameContainer.vue`，补跨入口启动与返程接线。

2026-04-14
- 已完成 cross-entry custom games `Phase 0` 收口与验证。
- 当前状态：权限 preflight / Electron 媒体权限 IPC / emotional-only 运行链已落地，`G03_FOREST`（麦克风）与 `G08_ENERGY_BALL`（摄像头）的 `blocked_system` 恢复链路已手动验证通过；运行时 `session_group_id` 缺列报错未再出现。
- 补充修复：主进程日志 broken pipe 弹窗已修复并推送到 `main`（commit `8f47ed1`）。
- 下一步：先决定是否进入 `Wave 1`，不要回头重做 `Phase 0` 规划。

> Responsibility: top-level handoff entry for new sessions.
> Read when: entering the repo or resuming work and needing the fastest route to current context.
> Not responsible for: replacing `AGENTS.md`, `.continue-here.md`, or `PROJECT_CONTEXT.md`.

## Quick Start

Read in this order:

1. `AGENTS.md`
2. `.continue-here.md`
3. `PROJECT_CONTEXT.md`

Usually those three files are enough to resume work safely.

Environment note:

- for Node-based commands in this repo, prefer `/home/DONG/.config/nvm/versions/node/v24.14.0/bin/node`
- do not fall back to the system default Node 18 unless the user explicitly asks for it

## Current Status

**v1.7 CNBS-R2016 Assessment Integration milestone is COMPLETE.**

All four phases (17-20) have landed and passed verification:
- Phase 17: Question bank digitization + feedback-asset standardization
- Phase 18: `Cnbsr2016Driver` + basal/ceiling + MA/DQ scoring
- Phase 19: Persistence + unified entry + report integration
- Phase 20: Runtime QA + standard verification + **manual live UAT passed (2026-04-04)**

CNBS-R2016 public entry is now **OPEN** and verified.

**Active follow-up work is now in `.continue-here.md`: 自理训练模块已进入正式迁移启动准备态，下一步先做执行页与写链主线，再做 ATS 种子导入。**

## Next Session

- active handoff source: `.continue-here.md`
- current active task is self-care migration kickoff for the task-training mainline
- first action should be reading `.continue-here.md`, then opening:
  - `docs/planning/2026-05-08-self-care-training-module-implementation-plan.md`
  - `docs/planning/2026-05-11-self-care-ats-seed-import-analysis.md`
- the first implementation move should be defining the save contract in `src/database/self-care-training-api.ts`, not writing the ATS importer first
- if `.continue-here.md` conflicts with other docs:
  - current task state follows `.continue-here.md`
  - repo rules and boundaries follow `AGENTS.md`
  - final implementation truth follows current code

## Read More Only If Needed

- `README.md`
  - project overview, repo structure, common commands
- `docs/planning/2026-03-23-scgp-context-bootstrap.md`
  - minimal bootstrap context
- `.planning/phases/<current>/*-PLAN.md`
  - detailed current phase execution plan
- `.planning/phases/<current>/*-SUMMARY.md`
  - current phase completion summary
- `.planning/phases/<current>/*-VERIFICATION.md`
  - current phase verification result

## Historical Materials

- `docs/logs/`
- `.planning/phases/`
- `docs/plans/`

Use those only when you need historical decision tracing.
