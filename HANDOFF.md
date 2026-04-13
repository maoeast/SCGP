# HANDOFF.md

> last_updated: 2026-04-13

2026-04-13
- 已完成 cross-entry custom games `Phase 0 Step 1-4` 落代码。
- 当前状态：registry / schema migration / session-group persistence / launchContext container 已到位，但仍是 `emotional-only` 运行链。
- 下一步：执行 `Step 5`，先让 `GameContainer` 接管权限 preflight，再下沉 Electron 恢复页 IPC。

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

**Active follow-up work is now in `.continue-here.md`: 当前活跃主线是 cross-entry custom games `Phase 0`，已完成 `Step 1-4`，下一步是 `Step 5` 权限 preflight。**

## Next Session

- active handoff source: `.continue-here.md`
- current active task is cross-entry custom games `Phase 0 Step 5`
- first action should be adding permission preflight state to `src/views/emotional/games/GameContainer.vue`
- do not start `Wave 1` new games before `Phase 0` is closed
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
