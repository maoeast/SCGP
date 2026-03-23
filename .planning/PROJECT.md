# PROJECT

## What This Is
SCGP (Stellar Competency Growth Platform, formerly SIC-ADS) is a local-first desktop platform for special education and rehabilitation workflows. It consolidates assessment, training, resource management, reporting, and IEP support into a single offline-capable system built on Electron, Vue, TypeScript, and SQL.js.

## Core Value
SCGP helps special education teachers and rehabilitation staff run structured assessment and intervention workflows in one offline system. The platform must stay local-first, zero-native-dependency, and compatible with the generalized `sys_training_resource` / `ScaleDriver` architecture already in production.

## Current State

### Shipped Milestones

- **v1.5 Strict Modular Licensing** shipped on 2026-03-19
  - Archive: `.planning/milestones/v1.5-ROADMAP.md`
- **v1.4 Dashboard Special Ed Command Center** shipped on 2026-03-19
  - Archive: `.planning/milestones/v1.4-ROADMAP.md`
- **v1.3 Unified Assessment Word Export** shipped on 2026-03-18
  - Archive: `.planning/milestones/v1.3-ROADMAP.md`
- **v1.2 Emotional Resource Pack Import & Export** shipped on 2026-03-18
  - Archive: `.planning/milestones/v1.2-ROADMAP.md`
- **v1.1 Emotional Authoring & Scene Gallery** shipped on 2026-03-17
  - Archive: `.planning/milestones/v1.1-ROADMAP.md`
- **v1.0 Emotional MVP** shipped on 2026-03-17
  - Archive: `.planning/milestones/v1.0-ROADMAP.md`

### What v1.5 Delivered

- Added strict `am` / `allowedModules` handling to the signed activation payload and local activation persistence
- Added explicit entitlement state plus `hasModuleAccess()` in the auth store
- Added a DEV-only activation bypass so local development can continue without real production codes
- Enforced module authorization at router, sidebar, dashboard quick actions, and direct runtime launch entry points
- Kept unauthorized modules visible as locked commercial surfaces instead of silently hiding them

## Current Milestone: v1.6 Emotional Engine Refactoring

**Goal:** Refactor the existing emotional training runtime into a shared engine architecture that restores current `emotion_scene` and `care_scene` behavior exactly, while moving page-level orchestration into compile adapters and a unified interaction engine.

**Target features:**
- Extract compile adapters so `EmotionSceneResourceMeta` and `CareSceneResourceMeta` are translated into `EmotionalSessionConfig` without changing the resource-layer schema.
- Introduce one `EmotionalInteractionEngine` plus `stepType -> renderer` dispatch so both current submodules run on the same execution layer.
- Reduce `EmotionSceneTraining.vue` and `CareExpressionTraining.vue` to shell pages that load resources, compile config, and host the shared engine.
- Preserve current persistence, summary, records, report, route paths, and launch/exit behavior so the refactor is behaviorally transparent outside the engine internals.

## Requirements

### Active

- [ ] Resource-layer emotional schemas stay unchanged while compile adapters generate the runtime step DSL.
- [ ] A shared emotional interaction engine replaces duplicated page-level session orchestration.
- [ ] Step rendering is standardized on normalized step definitions rather than page-specific resource interpretation.
- [ ] Current routes, persistence outputs, summaries, records, and reports remain compatible after the refactor.

### Out of Scope

- Introducing new emotional business concepts, new submodules, or external interaction patterns beyond the current codebase.
- Rewriting emotional persistence away from the current local SQL.js, `training_records`, and emotional session/detail tables.
- Changing route paths, selector semantics, report surfaces, or resource-pack schema contracts unless required to preserve current behavior under the new engine.

### Constraints

1. **No schema rewrite by default**: keep persistence on `sys_training_resource.meta_data`; do not introduce milestone-scoped schema changes.
2. **Typed contract is already real**: `src/types/emotional.ts` and `src/views/resource-center/editors/emotional-resource-contract.ts` stay the source of truth for normalization and validation.
3. **Structured exchange is now proven**: future export work should extend the normalized payload approach instead of rebuilding per-page document trees.
4. **No native deps**: do not introduce `sqlite3`, `sharp`, or other runtime native dependencies.
5. **Word-first export**: assessment reports should standardize on editable Word delivery before revisiting PDF quality work.
6. **Refactor only**: this milestone uses the existing internal architecture blueprint and current TypeScript schema; do not import new business models or external workflow patterns.

---
*Last updated: 2026-03-23 after starting milestone v1.6 Emotional Engine Refactoring*
