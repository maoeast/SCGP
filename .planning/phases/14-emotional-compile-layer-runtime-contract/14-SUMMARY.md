---
phase: 14-emotional-compile-layer-runtime-contract
plan: 14-01
subsystem: ui
tags: [emotional, compile-layer, vue, typescript]
requires: []
provides:
  - compiled emotion-scene runtime config generation
  - compiled care-scene runtime config generation
  - normalized emotional engine step metadata contract
affects: [phase-15-unified-emotional-interaction-engine, phase-16-shell-migration]
tech-stack:
  added: []
  patterns: [compiled-session-dsl, normalized-step-metadata]
key-files:
  created:
    - src/features/emotional/engine/types.ts
    - src/features/emotional/adapters/compileEmotionScene.ts
    - src/features/emotional/adapters/compileCareScene.ts
    - src/features/emotional/adapters/index.ts
  modified:
    - src/views/emotional/EmotionSceneTraining.vue
    - src/views/emotional/CareExpressionTraining.vue
key-decisions:
  - "Kept EmotionSceneResourceMeta and CareSceneResourceMeta as the resource-layer source of truth and moved runtime translation into compile adapters."
  - "Moved care-scene summary derivation onto compiled option metadata so dominantChoiceType no longer depends on raw resource re-parsing in the runtime page."
patterns-established:
  - "Compile adapters own step ordering and correctness/acceptable mapping before runtime execution starts."
  - "Runtime pages consume normalized intro and option metadata from EmotionalSessionConfig instead of rebuilding business semantics from raw resource JSON."
requirements-completed: [CMPL-01, CMPL-02, CMPL-03]
duration: 2 min
completed: 2026-03-23
---

# Phase 14 Plan 14-01: Emotional Compile Layer & Runtime Contract Summary

**Compiled emotion-scene and care-scene resources into one emotional session DSL with normalized intro, reasoning, solution, and care-step metadata**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-23T14:07:51+09:00
- **Completed:** 2026-03-23T14:09:18+09:00
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added a dedicated compile-layer contract under `src/features/emotional/engine/types.ts` so future renderers can consume normalized intro, reasoning, solution, care-utterance, and receiver-preference metadata without touching raw resource schemas.
- Added `compileEmotionScene()` and `compileCareScene()` adapters that preserve the current runtime step order and correct/acceptable answer mapping for both emotional flows.
- Switched `EmotionSceneTraining.vue` and `CareExpressionTraining.vue` to build `sessionConfig` from adapter output while preserving existing routing, pacing, persistence, and summary entry behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the normalized compile-layer contract and adapter export surface** - `0806cdd` (feat)
2. **Task 2: Switch emotion-scene runtime page to compiled config** - `6d7a978` (feat)
3. **Task 3: Switch care-expression runtime page to compiled config** - `8b158d7` (feat)

## Files Created/Modified

- `src/features/emotional/engine/types.ts` - Engine-facing metadata and compiled session types for emotional compile output.
- `src/features/emotional/adapters/compileEmotionScene.ts` - Emotion-scene compile adapter preserving intro, emotion, reasoning, and solution step ordering.
- `src/features/emotional/adapters/compileCareScene.ts` - Care-scene compile adapter preserving sender/receiver flow and dominant choice summary inputs.
- `src/features/emotional/adapters/index.ts` - Compile-layer export surface for emotional submodule adapters.
- `src/views/emotional/EmotionSceneTraining.vue` - Runtime page now consumes compiled intro and option metadata instead of local step assembly.
- `src/views/emotional/CareExpressionTraining.vue` - Runtime page now consumes compiled care metadata and summary inputs from adapter output.

## Decisions Made

- Kept `src/types/emotional.ts` resource schema contracts unchanged; the new compile layer lives entirely under `src/features/emotional/`.
- Preserved the existing `scene_intro -> emotion_choice -> reasoning_question[] -> solution_choice` and `scene_intro -> care_utterance -> receiver_preference` orders exactly inside the adapters.
- Kept `useEmotionalSession` and `src/database/emotional-api.ts` untouched, and moved care-scene `dominantChoiceType` derivation into compiled option metadata so summary/report consumers stay compatible.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run type-check:emotional` passed after the compile layer and runtime-page migration.
- `npm run type-check` still fails due pre-existing repository-wide TypeScript errors outside the emotional scope, including files such as `src/components/AddStudentDialog.vue`, `src/components/games/audio/GameAudio.vue`, and `src/components/ResourceUpload.vue`. This blocker predates Phase 14 and was not modified in this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 14 now provides compile adapters and normalized runtime metadata that Phase 15 can consume when introducing the shared emotional interaction engine.
- Current emotional routes, persistence, session summary entry, and report data inputs remain compatible.
- Repository-wide full type-check remains blocked by unrelated historical TypeScript errors outside the emotional files touched in this plan.

## Self-Check

PASSED - summary file, emotional compile/runtime files, and task commits `0806cdd`, `6d7a978`, and `8b158d7` were all verified on disk and in git history.
