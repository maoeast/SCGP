# PROJECT

## What This Is
SCGP (Stellar Competency Growth Platform, formerly SIC-ADS) is a local-first desktop platform for special education and rehabilitation workflows. It consolidates assessment, training, resource management, reporting, and IEP support into a single offline-capable system built on Electron, Vue, TypeScript, and SQL.js.

## Core Value
SCGP helps special education teachers and rehabilitation staff run structured assessment and intervention workflows in one offline system. The platform must stay local-first, zero-native-dependency, and compatible with the generalized `sys_training_resource` / `ScaleDriver` architecture already in production.

## Current State

### Shipped Milestone

- **v1.0 Emotional MVP** shipped on 2026-03-17
- Archived roadmap: `.planning/milestones/v1.0-ROADMAP.md`
- Archived requirements: `.planning/milestones/v1.0-REQUIREMENTS.md`

### Current Milestone: v1.1 Emotional Authoring & Scene Gallery

**Goal:** Reduce special-education teacher operating friction in the Emotional module by replacing raw JSON authoring with visual editors and replacing implicit first-scene launch with explicit scene selection.

**Target features:**
- Visual resource editor for `emotion_scene` resources inside Resource Center
- Visual resource editor for `care_scene` resources inside Resource Center
- Shared normalization and validation against the current `src/types/emotional.ts` metadata contract
- Scene selector pages for both emotional training submodules, launching runtime with explicit `resourceId`

### Why This Milestone Now

- Emotional MVP mainline is already shipped, but Resource Center still exposes `meta_data` raw JSON for emotional resources.
- Emotional training entry still falls back to `LIMIT 1`, which conflicts with teacher-led scene choice during instruction.
- PRD section 9 defines special-education UX rules that are not yet reflected in resource authoring or scene selection.

### Constraints For v1.1

1. **No schema rewrite**: v1.1 keeps using `sys_training_resource.meta_data` as the persistence field for emotional resources.
2. **Current type contract wins**: editor serialization must match `EmotionSceneResourceMeta` and `CareSceneResourceMeta` in `src/types/emotional.ts`.
3. **Static routing reality**: v1.1 can add new static routes/pages, but it does not attempt registry-driven dynamic routing.
4. **No native deps**: do not introduce `sqlite3`, `sharp`, or any other runtime native dependency.

### Next Milestone Candidates

- Emotional report polish based on richer scene taxonomy and teacher-facing summaries
- Cross-module route/menu platformization after current static-route debt is prioritized
- Cognitive assessment foundation (`MOD-03`) and multi-module comprehensive reporting (`MOD-04`)

---
*Last updated: 2026-03-17 for milestone v1.1 Emotional Authoring & Scene Gallery*
