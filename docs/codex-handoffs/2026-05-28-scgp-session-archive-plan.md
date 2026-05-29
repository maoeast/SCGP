# SCGP Session Archive Plan

**Purpose:** Theme-based archive plan for older `SIC-ADS / SCGP` Codex sessions after the first `codex-fluent` cleanup.
**Date:** 2026-05-28

## Why This Exists

`E:\VSC\H5\SIC-ADS` still has many active Codex sessions older than 14 days. They should not be bulk-archived blindly because this is still the main live project. This file groups the older sessions into archive batches so future maintenance can move them safely after handoff coverage is good enough.

## Current Size Snapshot

- Older-than-14-days active `SIC-ADS` sessions: `161`
- Combined size: about `211.58 MB`
- Largest single old SCGP session: about `9.35 MB`

## Theme Batches

### Batch A — Emotional Games And UI Iteration

Typical signals:
- `emotion-games-prd`
- `GameContainer.vue`
- `深呼吸热气球`
- `音量魔法森林`
- `情绪调节类小游戏`
- visual/UI iteration on game screens

Representative session ids:
- `019d08dd-68c6-7c31-bb49-92419994f7f5`
- `019d0983-8f5a-7fa0-b4a5-f53457605e9e`
- likely adjacent `2026-03` / `2026-04` emotional game threads

Archive rule:
- Archive only after a dedicated emotional-games handoff exists.

### Batch B — Physical Equipment / Resource Model / Entry-Code Refactor

Typical signals:
- `80 emotion_scene + 60 care_scene`
- `physical-equipment`
- `entry_code`
- `Equipment Quick Entry`
- `Records.vue`
- `sys_training_resource`
- `catalog-group / entry-group`

Representative session ids:
- `019d2829-01f1-7002-b91f-ab08bb55934f`
- `019d28cc-17e6-7de1-8e2d-88831e7a6c4b`
- `019d2db0-37cd-7571-a033-1969568f278b`
- `019d2e45-3f46-7962-a219-e4b905ea5883`

Archive rule:
- Archive only after a dedicated equipment/resources handoff exists.
- This batch is higher value than generic UI threads because it touches persistent schema and business grouping rules.

### Batch C — Cross-Entry Custom Games

Typical signals:
- `cross-entry custom games`
- `Wave 1`
- `F01_CLOUD_ERASE`
- `custom-game-registry`
- `registry-backed custom game`

Representative session ids:
- `019d8b3d-3eef-7c92-acce-c01e13722968`
- nearby custom-game wave sessions from mid-April 2026

Archive rule:
- Good archive candidate after a compact custom-games handoff is written.

### Batch D — Authorization / Entitlement Refactor

Typical signals:
- `entitlement`
- `moduleCode`
- `effectiveEntitlements`
- `auth.ts`
- `assessment-scale-catalog`
- license / activation package refactor

Representative sessions:
- late April to late May entitlement-related threads
- archive only after a specific authorization handoff exists

Archive rule:
- Keep active longer than other old batches if entitlement work is still likely to resume soon.

### Batch E — One-Off UI Redesign Threads

Typical signals:
- isolated view redesign
- layout-only tuning
- single screen polish

Representative session ids:
- `019dae71-ea22-7191-a26e-ec39f6e1ce6f`
- `019d70e4-cc90-75f2-8a0a-e68951755524`
- `019d6fd6-4a8b-7c82-b2e2-bd1957bf0ad2`

Archive rule:
- Lower risk than schema/business threads.
- Can move earlier if repo state and commit history already capture the result.

## Safe Archive Order

1. Batch E — one-off UI redesign threads
2. Batch C — cross-entry custom games
3. Batch A — emotional games
4. Batch B — equipment/resources/entry-code
5. Batch D — entitlement/auth refactor

## Required Handoffs Before Any Move

- Emotional games handoff
- Equipment/resources handoff
- Custom games handoff
- Entitlement handoff

Without these, bulk-moving old SCGP sessions is too risky.

## Log Rotation Plan

The main non-session drag source is:
- `C:\Users\maoea\.codex\logs_2.sqlite` about `561.56 MB`

Safe strategy:
1. Backup `logs_2.sqlite`, `logs_2.sqlite-wal`, `logs_2.sqlite-shm`
2. Move backed-up copies into a timestamped codex-fluent backup directory
3. Rotate the active log database only while Codex is fully closed
4. Reopen Codex and verify a fresh small `logs_2.sqlite` is recreated cleanly

## Important Constraint

Do not combine log rotation and large SCGP session archiving into the same first apply unless:
- Codex is fully closed
- backups are confirmed
- archive targets are already handoff-protected
