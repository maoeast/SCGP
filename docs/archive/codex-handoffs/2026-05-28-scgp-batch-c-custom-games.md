# SCGP Batch C Custom Games Handoff

**Project / Ticket:** SCGP - cross-entry custom games Wave 1 minimal path
**Date of Handoff:** 2026-05-28
**Previous Session Context:** Older SCGP custom-games threads from mid-April 2026
**Handoff Author:** Codex

## Executive Summary

This batch covers the early `cross-entry custom games` work where SCGP moved from emotional-only custom game routing toward a registry-backed structure that could eventually support other training entries. The key minimal goal in this phase was `F01_CLOUD_ERASE`, but the more important architectural outcome was clarifying that the first real bottleneck was not game logic itself, but the launch/return path between `GameLobby`, registry definitions, and `GameContainer`.

These threads are good archive candidates once this handoff exists because the strategic intent, constraints, and minimal acceptance criteria are now captured here and in the planning docs.

## Key Decisions & Rationale

- Decision: Do not reopen or redo `Phase 0`; only continue from the already-accepted Wave 1 minimal path.
  - Rationale: The user explicitly asked to avoid redoing `Phase 0` and to keep the work tightly scoped.

- Decision: Lock `F01_CLOUD_ERASE` as the single Wave 1 minimum target.
  - Rationale: It was chosen as the lowest-risk non-emotional cross-entry custom game candidate.

- Decision: Treat launch/return adaptation as the first real implementation gap.
  - Rationale: Registry structure and container semantics were mostly ready, but `GameLobby` and return routing still encoded emotional-only assumptions.

## Current Codebase State

- `src/data/custom-game-registry.ts`
  - Registry-backed custom game definitions are the core source of truth.
  - Includes `G04_WIPE_ICE` and other emotional custom games.

- `src/views/games/GameLobby.vue`
  - Was adapted so relevant entries can go through registry-backed custom-game launching instead of only the old `/games/play` path.

- `src/views/emotional/games/GameContainer.vue`
  - Was updated so custom games return back to the shared game lobby rather than falling into emotional-only return assumptions.

- Related planning docs:
  - `docs/planning/2026-04-13-cross-entry-custom-games-phase0-implementation-spec.md`
  - `docs/planning/2026-04-14-cross-entry-custom-games-wave1-prep-checklist.md`
  - `docs/planning/2026-04-14-cross-entry-custom-games-wave1-min-target.md`
  - `docs/planning/2026-04-13-cross-entry-custom-games-expansion-plan.md`

## What Has Been Completed

- [x] Wave 1 was deliberately narrowed to a single minimal target: `F01_CLOUD_ERASE`.
- [x] The project explicitly distinguished current reality from target-state marketing language.
- [x] A registry-backed launch path was established as the right direction for cross-entry custom games.
- [x] `GameLobby` and `GameContainer` were identified and partially adapted as the minimal bridge layer.
- [x] Acceptance criteria were framed around launch path, return path, and persistence semantics, not just visuals or gameplay.

## Open Questions & Next Steps (Prioritized)

1. **High** — Verify the current `custom-game-registry.ts` state in the live repo and confirm whether `F01_CLOUD_ERASE` still needs any registry or metadata cleanup.
2. **High** — Confirm whether any remaining emotional-only assumptions still survive in the current launch or return path.
3. **Medium** — If continuation is needed, continue from the minimal acceptance checklist rather than reopening broad Wave 1 scope.
4. **Medium** — Decide whether the custom-games registry now deserves a dedicated validation/handoff cycle of its own before more titles are added.

## Constraints & Preferences (Very Important)

- Do not expand back into full Wave 1 scope prematurely.
- Do not rewrite current-state docs into target-state claims.
- Prefer minimal bridge-layer changes over broad platform refactors.
- Keep custom-game work grounded in actual entry codes and real return routing, not emotional-only shortcuts.

## Reactivation Prompt (Copy-Paste Ready)

```text
We are continuing SCGP cross-entry custom games work from older Codex sessions.

Read these first:
- E:\VSC\H5\SIC-ADS\docs\planning\2026-04-13-cross-entry-custom-games-phase0-implementation-spec.md
- E:\VSC\H5\SIC-ADS\docs\planning\2026-04-14-cross-entry-custom-games-wave1-min-target.md
- E:\VSC\H5\SIC-ADS\docs\codex-handoffs\2026-05-28-scgp-batch-c-custom-games.md

Then inspect the current code:
- `src/data/custom-game-registry.ts`
- `src/views/games/GameLobby.vue`
- `src/views/emotional/games/GameContainer.vue`

Do not restart broad Wave 1 planning. Start by confirming whether `F01_CLOUD_ERASE` still has any unresolved launch/registry/return-path gap.
```

## Archive Safety Note

This batch is safer to archive than schema or entitlement threads because the main value lies in the transition strategy and minimal target definition, both of which are now captured in code and docs.
