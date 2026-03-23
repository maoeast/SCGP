---
phase: 15-unified-emotional-interaction-engine
plan: 15-01
subsystem: ui
tags: [emotional, runtime-engine, vue, typescript]
requires:
  - phase: 14-emotional-compile-layer-runtime-contract
    provides: compiled emotional session config and normalized step metadata
provides:
  - shared emotional interaction engine
  - renderer registry for emotional step dispatch
  - host-mode emotion and care runtime pages
affects: [phase-16-shell-migration-and-end-to-end-compatibility, emotional-runtime, session-summary]
tech-stack:
  added: []
  patterns: [shared-runtime-engine, renderer-map-dispatch, host-page-shell]
key-files:
  created:
    - src/components/emotional/engine/EmotionalInteractionEngine.vue
    - src/components/emotional/engine/runtime/rendererMap.ts
    - src/components/emotional/engine/runtime/feedback.ts
    - src/components/emotional/engine/runtime/visibility.ts
    - src/components/emotional/engine/runtime/navigation.ts
    - src/components/emotional/engine/renderers/SceneIntroRenderer.vue
    - src/components/emotional/engine/renderers/EmotionChoiceRenderer.vue
    - src/components/emotional/engine/renderers/ReasoningQuestionRenderer.vue
    - src/components/emotional/engine/renderers/SolutionChoiceRenderer.vue
    - src/components/emotional/engine/renderers/CareUtteranceRenderer.vue
    - src/components/emotional/engine/renderers/ReceiverPreferenceRenderer.vue
  modified:
    - src/features/emotional/engine/types.ts
    - src/components/emotional/EmotionSelector.vue
    - src/components/emotional/ReasoningCard.vue
    - src/views/emotional/EmotionSceneTraining.vue
    - src/views/emotional/CareExpressionTraining.vue
key-decisions:
  - "Kept compile adapters as the source of runtime data and layered the shared engine above useEmotionalSession instead of replacing the persistence spine."
  - "Resolved intro rendering through an engine-side renderer key of scene_intro without changing persistence-facing stepType contracts."
  - "Preserved care-scene's reveal-then-continue pacing inside the engine by storing selection state instead of forcing immediate step advancement."
patterns-established:
  - "Runtime pages now act as hosts that load resources, compile session config, and delegate orchestration to EmotionalInteractionEngine."
  - "Hint visibility, feedback copy, and post-submit behavior are centralized in engine runtime helpers instead of page-local branching."
requirements-completed: [ENGN-01, ENGN-02, ENGN-03]
duration: 1 min
completed: 2026-03-23
---

# Phase 15 Plan 15-01: Unified Emotional Interaction Engine Summary

**Shared emotional interaction engine with renderer-map dispatch, centralized feedback/hint orchestration, and host-mode runtime pages for both emotional submodules**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-23T15:11:44+09:00
- **Completed:** 2026-03-23T15:12:41.9657433+09:00
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments

- Added one `EmotionalInteractionEngine.vue` that owns session startup, progress display, feedback messaging, post-submit behavior, and completion/exit orchestration for both `emotion_scene` and `care_scene`.
- Added a renderer registry and six renderer components so runtime step UI is dispatched from normalized compiled steps instead of page-specific `currentPhase` branching.
- Reduced `EmotionSceneTraining.vue` and `CareExpressionTraining.vue` to host pages that load resources, compile config, and provide route-aware navigation callbacks to the shared engine.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the shared engine contract, renderer registry, and navigation helpers** - `7a93e05` (feat)
2. **Task 2: Build the shared interaction engine core and generic renderers** - `fbaaed0` (feat)
3. **Task 3: Migrate runtime pages and care-specific renderers onto the shared engine** - `a801fd8` (refactor)

## Files Created/Modified

- `src/components/emotional/engine/EmotionalInteractionEngine.vue` - Shared runtime host that owns progress, feedback, transition timing, completion, and exit orchestration.
- `src/components/emotional/engine/runtime/rendererMap.ts` - Maps normalized runtime steps to renderer components and resolves explicit `scene_intro`.
- `src/components/emotional/engine/runtime/feedback.ts` - Centralized feedback-copy rules for emotion-scene and care-scene submissions.
- `src/components/emotional/engine/runtime/visibility.ts` - Shared hint-level visibility and highlighting helpers for renderer option lists.
- `src/components/emotional/engine/runtime/navigation.ts` - Shared post-submit behavior rules and intro-action defaults.
- `src/components/emotional/engine/renderers/*.vue` - Renderer components for intro, emotion choice, reasoning, solution, care utterance, and receiver preference steps.
- `src/features/emotional/engine/types.ts` - Added renderer keys, feedback message shape, navigation contract, and reveal-state types on top of the Phase 14 compiled-session types.
- `src/components/emotional/EmotionSelector.vue` - Converted to a presentational selector that accepts engine-computed visibility/highlight state.
- `src/components/emotional/ReasoningCard.vue` - Converted to a presentational card list that accepts engine-computed visibility/highlight state.
- `src/views/emotional/EmotionSceneTraining.vue` - Now loads resources, compiles config, and hosts the shared engine.
- `src/views/emotional/CareExpressionTraining.vue` - Now loads resources, compiles config, and hosts the shared engine.

## Decisions Made

- Kept `useEmotionalSession` untouched as the scoring and persistence spine so behavior-preserving refactor risk stays localized to the runtime layer.
- Preserved the legacy persisted `stepType` contract and added `scene_intro` only as an engine-side renderer key.
- Kept care-scene's effect/reason reveal cards as renderer-level UI driven by engine-managed selection state rather than collapsing them into immediate auto-advance.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run type-check:emotional` passed after the shared engine extraction.
- `npm run build:web` passed, confirming the new engine/renderers compile in a production build.
- `npm run type-check` still fails because of pre-existing repository-wide TypeScript issues outside the emotional scope, matching the blocker already documented in `.planning/STATE.md`. Examples include `src/components/AddStudentDialog.vue`, `src/components/games/audio/GameAudio.vue`, and `src/components/ResourceUpload.vue`.
- Full manual UI regression was not run in this environment, so Phase 15 still needs human verification for runtime pacing and route-level parity.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 16 can now focus on shell migration cleanup and end-to-end compatibility verification on top of a shared runtime engine instead of duplicated page orchestration.
- Current emotional routes, compile adapters, persistence, and session-summary navigation remain compatible from the code/build perspective.
- Human UI verification is still needed before Phase 15 should be marked fully complete in the roadmap.

## Self-Check

PASSED - the engine files exist on disk, commits `7a93e05`, `fbaaed0`, and `a801fd8` are present in git history, `npm run type-check:emotional` passed, and `npm run build:web` passed.
