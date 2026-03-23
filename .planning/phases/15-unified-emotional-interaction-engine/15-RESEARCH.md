# Phase 15: Unified Emotional Interaction Engine - Research

**Researched:** 2026-03-23
**Domain:** Shared emotional runtime orchestration, renderer dispatch, and behavior-preserving engine extraction
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENGN-01 | A shared `EmotionalInteractionEngine` drives session startup, progress display, feedback panel, prompt escalation, completion, cancellation, and summary navigation for both existing emotional submodules. | Current runtime orchestration is still duplicated across `EmotionSceneTraining.vue` and `CareExpressionTraining.vue`, while `useEmotionalSession.ts` already provides the common state machine spine. |
| ENGN-02 | Step rendering is dispatched through a `stepType -> renderer` mapping, and renderers consume normalized step props rather than directly depending on raw `EmotionSceneResourceMeta` or `CareSceneResourceMeta`. | Phase 14 compile adapters already normalize both submodules into one `EmotionalCompiledSessionConfig`, but intro steps are still disguised as module-specific step types and pages still branch on `currentPhase`. |
| ENGN-03 | The refactored runtime preserves the current `hintLevel 0 -> 1 -> 2 -> 3` escalation, retry handling, acceptable-answer advancement, and feedback pacing behavior across both submodules. | `useEmotionalSession.ts` owns correctness and escalation state; both pages still implement separate hint-visibility, feedback-copy, advance timing, and completion choreography that Phase 15 must centralize without drift. |
</phase_requirements>

## Summary

Phase 15 is not a greenfield engine build. It is a behavior-preserving extraction over code that already shares compile adapters and `useEmotionalSession`, but still duplicates the runtime shell. The real work is to move page-owned orchestration into a shared component boundary without breaking route contracts, persistence, or the subtle interaction timing differences the current pages rely on.

The strongest existing foundation is Phase 14's normalized compile output. Both submodules now start from `compileEmotionScene()` / `compileCareScene()` and produce `EmotionalCompiledSessionConfig`. That means the engine does not need to understand raw resource JSON. It only needs to understand normalized steps, option metadata, and a renderer registry.

The highest-risk boundary is orchestration drift, not typing. `EmotionSceneTraining.vue` and `CareExpressionTraining.vue` still each own:

- intro-step advancement
- progress strip and progress percentage
- feedback message copy and visibility
- hint-level option filtering and highlighting
- step-to-component branching
- completion timing and summary navigation
- cancel-on-leave semantics

If Phase 15 only introduces a presentational wrapper without moving these behaviors into a shared engine contract, the milestone will keep the duplicate logic and fail `ENGN-01` / `ENGN-03`.

## Current Code Reality

### Already Unified

- `compileEmotionScene.ts` and `compileCareScene.ts` both output `EmotionalCompiledSessionConfig`.
- `useEmotionalSession.ts` already centralizes:
  - step result evaluation
  - acceptable-answer advancement rules
  - retry counting
  - `hintLevel 0 -> 1 -> 2 -> 3` escalation
  - summary assembly and persistence payload preparation
- Both runtime pages already call `session.startSession()`, `session.submitStep()`, `session.advanceStep()`, `session.completeSession()`, and `session.cancelSession()`.

### Still Duplicated

- stage shell layout and progress UI
- `currentPhase` branching in page templates
- option visibility rules for hint levels 1/2/3
- feedback copy selection after `submitStep()`
- intro-to-first-step advancement
- success pacing before advancing or completing
- route exit handling and session-summary redirection

### Still Asymmetric

- Emotion-scene advances automatically after a `700ms` delay once an answer can advance.
- Care-scene shows intermediate effect/reason cards and waits for an explicit click before continuing/completing.
- Intro steps are encoded as `phase: 'scene_intro'` but still use module-specific `stepType` values (`emotion_choice` / `care_utterance`) rather than a dedicated intro renderer key.

## Architecture Recommendations

### Pattern 1: Engine Owns Runtime Orchestration, Not Data Compilation

**What:** Keep compile adapters untouched as the source of normalized runtime data. The new engine should accept compiled config plus small shell callbacks for navigation.

**Why:** Phase 14 already established the compile/runtime boundary. Reopening that boundary in Phase 15 would mix concerns and create regression risk.

**Recommended split:**

```text
src/components/emotional/engine/
  EmotionalInteractionEngine.vue
  renderers/
    SceneIntroRenderer.vue
    EmotionChoiceRenderer.vue
    ReasoningQuestionRenderer.vue
    SolutionChoiceRenderer.vue
    CareUtteranceRenderer.vue
    ReceiverPreferenceRenderer.vue
  runtime/
    rendererMap.ts
    visibility.ts
    feedback.ts
    navigation.ts
```

### Pattern 2: Dispatch Renderers by Explicit Renderer Key

**What:** Introduce an engine-level renderer selection helper that maps compiled steps to renderer IDs.

**Why:** `stepType` alone is not enough for intro steps today because Phase 14 kept intro steps legacy-compatible. Phase 15 should resolve that mismatch in engine space rather than forcing a schema rewrite.

**Recommendation:** Use a helper like:

```ts
function getRendererKey(step: EmotionalCompiledStep): EmotionalRendererKey {
  if (step.phase === 'scene_intro') return 'scene_intro'
  return step.stepType
}
```

This preserves persistence-facing `stepType` values while still enabling true renderer dispatch.

### Pattern 3: Move Hint-Visibility Policy Into Shared Engine Helpers

**What:** Extract the duplicated option-filtering logic from both pages into shared runtime helpers.

**Current duplicated policy:**

- hint levels 0/1: show all options
- hint level 2: show all correct/acceptable options plus half of wrong options
- hint level 3: show only correct/acceptable options

**Why:** This is a core part of `ENGN-03`. If left in pages, the new engine is not actually behavior-defining.

### Pattern 4: Separate Engine Events From Renderer Presentation

**What:** Renderers should emit semantic events such as `submit`, `continue`, and `complete`, while the engine owns when those actions advance, pause, or navigate.

**Why:** Care-scene needs a post-submit reveal state before advancing. Emotion-scene advances after a timed delay. Those are orchestration concerns layered on top of renderer output.

**Recommendation:** The engine should manage transient UI state such as:

- `feedbackMessage`
- `pendingAdvance`
- `selectedOptionMetadata`
- `requiresExplicitContinue`

This lets renderers stay step-focused instead of page-flow-focused.

### Pattern 5: Keep Pages as Route Shells Only

**What:** `EmotionSceneTraining.vue` and `CareExpressionTraining.vue` should remain responsible only for:

- loading the resource row
- compiling the config
- passing config and route-derived callbacks into the engine
- defining route-specific completion / exit destinations

**Why:** Full shell reduction is Phase 16, but Phase 15 should already make the shared engine the owner of session behavior.

## Recommended Plan Cut

Phase 15 should stay one plan, but the execution tasks should follow this order:

1. Define engine contracts and renderer-dispatch utilities.
2. Extract shared orchestration helpers for feedback pacing and hint visibility.
3. Build `EmotionalInteractionEngine.vue` with common progress, feedback, and step hosting.
4. Add renderer components for intro, emotion choice, reasoning/solution choice, care utterance, and receiver preference.
5. Migrate both runtime pages to host the engine while keeping current route and persistence behavior.
6. Verify behavioral parity for hint escalation, acceptable answers, intermediate continue steps, and summary navigation.

## Pitfalls

### Pitfall 1: Collapsing Care-Scene's Two-Step Reveal Flow

If the engine treats every correct/acceptable submission as immediate advance, the care scene will lose its effect-card and receiver-reason confirmation pacing.

### Pitfall 2: Forcing Intro Into Raw `stepType`

Changing persisted `stepType` contracts just to support intro rendering would create unnecessary downstream risk. Renderer dispatch should layer over the existing contract instead.

### Pitfall 3: Leaving Feedback Copy in Host Pages

The pages currently choose their own success/retry copy. If that stays page-owned, Phase 15 will not actually unify runtime behavior.

### Pitfall 4: Mixing Route Navigation Into Renderers

Renderers should not know about `/dashboard`, `/training-plan`, or `/emotional/session-summary`. Those remain shell- or engine-owned navigation callbacks.

### Pitfall 5: Reaching Into Raw Resource Meta Again

Phase 14 already paid the cost to normalize renderer metadata. Phase 15 should consume compiled step metadata only.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | No dedicated emotional unit-test runner detected; use focused type-check plus manual regression gates in this phase |
| Config file | `tsconfig.emotional.json` |
| Quick run command | `npm run type-check:emotional` |
| Full suite command | `npm run type-check` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENGN-01 | Shared engine owns session startup, progress, feedback, advance, cancel, and completion orchestration for both submodules | focused type-check + manual runtime regression | `npm run type-check:emotional` | YES |
| ENGN-02 | Renderer dispatch is driven by engine-side mapping over compiled steps rather than page-specific branching over raw resource data | focused type-check + code review | `npm run type-check:emotional` | YES |
| ENGN-03 | Hint escalation, retry handling, acceptable-answer advancement, and pacing stay consistent after engine extraction | manual behavioral regression + full type-check | `npm run type-check` | YES |

### Manual Regression Checks Required

- Emotion scene: intro -> emotion choice -> reasoning -> solution completes and routes to session summary.
- Emotion scene: wrong answer escalates visibility from level 0 to 1 to 2 to 3 without drift.
- Care scene: utterance selection reveals effect card before advancing.
- Care scene: receiver selection reveals reason card before completion.
- Both pages: exit mid-session still persists cancellation when attempts exist.

## Sources

### Primary

- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/REQUIREMENTS.md`
- `.planning/phases/14-emotional-compile-layer-runtime-contract/14-CONTEXT.md`
- `.planning/phases/14-emotional-compile-layer-runtime-contract/14-RESEARCH.md`
- `src/composables/useEmotionalSession.ts`
- `src/features/emotional/engine/types.ts`
- `src/features/emotional/adapters/compileEmotionScene.ts`
- `src/features/emotional/adapters/compileCareScene.ts`
- `src/views/emotional/EmotionSceneTraining.vue`
- `src/views/emotional/CareExpressionTraining.vue`
- `src/types/emotional.ts`

### Secondary

- `docs/planning/2026-03-16-emotional-module-prd.md`

## Metadata

- This research treats the PRD as target-scope context only. Current implementation truth comes from the codebase and Phase 14 artifacts.
- The repo currently has focused emotional type-check coverage but no dedicated emotional runtime test harness.
- Phase 15 planning should preserve current persistence and route behavior; broader shell slimming belongs to Phase 16.
