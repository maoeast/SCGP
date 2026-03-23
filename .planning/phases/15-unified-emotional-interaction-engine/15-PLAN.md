---
wave: 1
depends_on: []
files_modified:
  - src/components/emotional/engine/EmotionalInteractionEngine.vue
  - src/components/emotional/engine/renderers/SceneIntroRenderer.vue
  - src/components/emotional/engine/renderers/EmotionChoiceRenderer.vue
  - src/components/emotional/engine/renderers/ReasoningQuestionRenderer.vue
  - src/components/emotional/engine/renderers/SolutionChoiceRenderer.vue
  - src/components/emotional/engine/renderers/CareUtteranceRenderer.vue
  - src/components/emotional/engine/renderers/ReceiverPreferenceRenderer.vue
  - src/components/emotional/engine/runtime/rendererMap.ts
  - src/components/emotional/engine/runtime/feedback.ts
  - src/components/emotional/engine/runtime/visibility.ts
  - src/components/emotional/engine/runtime/navigation.ts
  - src/features/emotional/engine/types.ts
  - src/views/emotional/EmotionSceneTraining.vue
  - src/views/emotional/CareExpressionTraining.vue
autonomous: true
---

# Plan 15.1: Unified Emotional Interaction Engine

## Goal

Introduce one shared emotional runtime engine that hosts progress UI, feedback pacing, prompt escalation behavior, and step renderer dispatch for both current emotional submodules, while preserving the current compile-adapter contract, persistence spine, and route-level behavior.

## Context

- Phase 14 already extracted `compileEmotionScene()` and `compileCareScene()` so both submodules now compile into one `EmotionalCompiledSessionConfig`.
- `useEmotionalSession.ts` already centralizes correctness checks, acceptable-answer handling, retry counting, hint escalation, summary construction, and persistence payload generation.
- The current duplication is now concentrated in the two runtime pages, which still each own renderer branching, hint-level option visibility, feedback copy, advance pacing, intro progression, and completion/exit choreography.
- Phase 15 must unify runtime orchestration. Phase 16 remains responsible for reducing the pages to thin shells and locking end-to-end compatibility.

## Requirements Covered

- ENGN-01: A shared `EmotionalInteractionEngine` drives session startup, progress display, feedback panel, prompt escalation, completion, cancellation, and summary navigation for both existing emotional submodules.
- ENGN-02: Step rendering is dispatched through a `stepType -> renderer` mapping, and renderers consume normalized step props rather than directly depending on raw `EmotionSceneResourceMeta` or `CareSceneResourceMeta`.
- ENGN-03: The refactored runtime preserves the current `hintLevel 0 -> 1 -> 2 -> 3` escalation, retry handling, acceptable-answer advancement, and feedback pacing behavior across both submodules.

## Tasks

<tasks>
  <task id="15-01-01" requirement="ENGN-02">
    <summary>Define the shared engine contract, renderer registry, and engine-side renderer key mapping so compiled emotional steps can be rendered without page-specific branching.</summary>
    <files>
      <file>src/features/emotional/engine/types.ts</file>
      <file>src/components/emotional/engine/runtime/rendererMap.ts</file>
      <file>src/components/emotional/engine/runtime/navigation.ts</file>
    </files>
    <deliverables>
      <item>An engine-facing renderer key layer that resolves `scene_intro` explicitly while keeping persistence-facing `stepType` contracts unchanged.</item>
      <item>Typed engine props and callback contracts for step renderers, submit actions, continue actions, and completion actions.</item>
      <item>A small runtime navigation contract that lets host pages provide exit/summary destinations without leaking router logic into renderers.</item>
    </deliverables>
    <verify>
      <item>Both compiled session variants can be mapped to renderer IDs without reading raw resource meta.</item>
      <item>Intro rendering is no longer inferred from page-local `currentPhase` branching.</item>
      <item>`npm run type-check:emotional` passes after the engine contract layer is introduced.</item>
    </verify>
  </task>

  <task id="15-01-02" requirement="ENGN-01,ENGN-03">
    <summary>Extract shared runtime orchestration helpers and build `EmotionalInteractionEngine.vue` so progress, feedback, prompt escalation, and step advancement are owned by one engine instead of the two runtime pages.</summary>
    <files>
      <file>src/components/emotional/engine/EmotionalInteractionEngine.vue</file>
      <file>src/components/emotional/engine/runtime/feedback.ts</file>
      <file>src/components/emotional/engine/runtime/visibility.ts</file>
      <file>src/components/emotional/engine/runtime/navigation.ts</file>
      <file>src/composables/useEmotionalSession.ts</file>
    </files>
    <deliverables>
      <item>Shared progress strip, progress percentage, feedback panel state, and step-hosting flow inside one engine component.</item>
      <item>Shared hint-visibility policy implementing the current `0/1 -> all`, `2 -> narrow`, `3 -> correct/acceptable only` behavior.</item>
      <item>Engine-owned advance pacing that supports both timed auto-advance and explicit continue/complete checkpoints without changing acceptable-answer rules.</item>
    </deliverables>
    <verify>
      <item>Emotion-scene and care-scene can both run on the same engine component while still using `useEmotionalSession` as the execution spine.</item>
      <item>Retry escalation, acceptable-answer advancement, and current hint-level semantics remain unchanged for both submodules.</item>
      <item>`npm run type-check:emotional` passes and a manual parity check confirms feedback/advance pacing stays aligned with the current pages.</item>
    </verify>
  </task>

  <task id="15-01-03" requirement="ENGN-01,ENGN-02,ENGN-03">
    <summary>Implement normalized step renderers and migrate both runtime pages to host the shared engine while preserving current route, cancellation, and session-summary behavior.</summary>
    <files>
      <file>src/components/emotional/engine/renderers/SceneIntroRenderer.vue</file>
      <file>src/components/emotional/engine/renderers/EmotionChoiceRenderer.vue</file>
      <file>src/components/emotional/engine/renderers/ReasoningQuestionRenderer.vue</file>
      <file>src/components/emotional/engine/renderers/SolutionChoiceRenderer.vue</file>
      <file>src/components/emotional/engine/renderers/CareUtteranceRenderer.vue</file>
      <file>src/components/emotional/engine/renderers/ReceiverPreferenceRenderer.vue</file>
      <file>src/views/emotional/EmotionSceneTraining.vue</file>
      <file>src/views/emotional/CareExpressionTraining.vue</file>
    </files>
    <deliverables>
      <item>Renderer components that consume normalized step metadata and option metadata only.</item>
      <item>`EmotionSceneTraining.vue` and `CareExpressionTraining.vue` rewritten as engine hosts that still load resources and provide route-specific navigation callbacks.</item>
      <item>Behavioral parity for intro progression, emotion/reasoning/solution submission, care effect-card reveal, receiver reason-card reveal, session completion, and cancel-on-leave handling.</item>
    </deliverables>
    <verify>
      <item>No renderer reaches back into raw `EmotionSceneResourceMeta` or `CareSceneResourceMeta`.</item>
      <item>Both pages still route to `/emotional/session-summary` with persisted session IDs after completion.</item>
      <item>`npm run type-check` passes or any pre-existing unrelated blocker is explicitly documented, and manual regression confirms both submodules still behave the same.</item>
    </verify>
  </task>
</tasks>

## Verification Criteria

- [ ] One `EmotionalInteractionEngine` owns runtime orchestration for both emotional submodules
- [ ] Renderer selection is driven by engine-side mapping over compiled steps, including explicit intro rendering
- [ ] Hint-level visibility and retry escalation behavior match the current pages
- [ ] Emotion-scene still auto-advances after valid submissions with compatible pacing
- [ ] Care-scene still pauses on effect/reason reveal states and requires explicit continue/complete actions
- [ ] Host pages preserve current exit behavior, cancellation persistence, and session-summary navigation
- [ ] `npm run type-check:emotional` and `npm run type-check` are run, with any unrelated existing blockers documented

<must_haves>
- [ ] Phase 15 stays an engine-orchestration phase and does not rewrite the emotional resource schema
- [ ] Compile adapters remain the source of truth for `EmotionalCompiledSessionConfig`
- [ ] `useEmotionalSession` remains the persistence and scoring spine rather than being bypassed by page-local logic
- [ ] Renderers consume normalized step metadata only; raw resource-meta reverse lookups do not return
- [ ] Route paths, persisted record shape, summary payload compatibility, and downstream report consumers remain unchanged
- [ ] Phase 16 work is not pulled forward beyond the minimal host-page integration needed to run the new engine
</must_haves>

## Summary

This plan turns the shared engine into the single owner of emotional runtime behavior while keeping compile adapters, persistence, and route contracts stable. It removes the remaining duplicated runtime orchestration now, then leaves final shell slimming and end-to-end regression closure to Phase 16.

---

*Plan Status: READY FOR EXECUTION*
*Wave: 1 | Autonomous: true*
