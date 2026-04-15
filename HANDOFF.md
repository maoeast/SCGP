# HANDOFF.md

> last_updated: 2026-04-15

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

**Active follow-up work is now in `.continue-here.md`: `C01_DANDELION` 代码链已闭环，下一步先做人工验收。**

## Next Session

- active handoff source: `.continue-here.md`
- current active task is validating the `C01_DANDELION` Wave 1 game that has just landed
- first action should be manually verifying the `soothing-aids -> 游戏 -> 吹蒲公英 -> 记录详情` chain
- `Phase 0` should be treated as closed unless a new regression is discovered
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
