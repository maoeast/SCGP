---
wave: 1
depends_on: []
files_modified:
  - src/features/emotional/engine/types.ts
  - src/features/emotional/adapters/compileEmotionScene.ts
  - src/features/emotional/adapters/compileCareScene.ts
  - src/features/emotional/adapters/index.ts
  - src/views/emotional/EmotionSceneTraining.vue
  - src/views/emotional/CareExpressionTraining.vue
autonomous: true
---

# Plan 14.1: Emotional Compile Layer & Runtime Contract

## Goal

Extract the current `emotion_scene` and `care_scene` step-building logic into explicit compile adapters and a normalized runtime contract so both emotional flows can produce the same `EmotionalSessionConfig` shape without changing business behavior, persistence semantics, or route-level UX.

## Context

- Both runtime pages currently embed their own `buildSessionConfig()` logic, but they already target the same `useEmotionalSession` execution spine.
- The locked v1.6 blueprint requires compile-layer extraction first, while keeping the shared engine and shell-page migration for later phases.
- Phase 14 must preserve current step order, correct/acceptable mapping, option metadata, and summary-driving semantics so later engine work can plug in safely.

## Requirements Covered

- CMPL-01: `emotion_scene` resources compile from `EmotionSceneResourceMeta` into `EmotionalSessionConfig` with the current execution order `scene_intro -> emotion_choice -> reasoning_question[] -> solution_choice`.
- CMPL-02: `care_scene` resources compile from `CareSceneResourceMeta` into `EmotionalSessionConfig` with the current execution order `scene_intro -> care_utterance -> receiver_preference`.
- CMPL-03: Compile output preserves current correctness, acceptable-answer, feedback, explanation, reaction, and metadata semantics without adding runtime-only fields to resource JSON.

## Tasks

<tasks>
  <task id="14-01-01" requirement="CMPL-01">
    <summary>Define the normalized compile-layer contract and helper types that later engine renderers can consume without reading raw resource meta.</summary>
    <files>
      <file>src/features/emotional/engine/types.ts</file>
      <file>src/features/emotional/adapters/index.ts</file>
      <file>src/types/emotional.ts</file>
    </files>
    <deliverables>
      <item>Engine-facing metadata typing for intro, emotion-choice, reasoning, solution, care-utterance, and receiver-preference steps.</item>
      <item>Explicit compile-layer exports for the two emotional submodule adapters.</item>
      <item>A clear boundary between resource schema types and runtime metadata types without mutating stored resource JSON contracts.</item>
    </deliverables>
    <verify>
      <item>Normalized types can describe all metadata currently derived inside the two runtime pages.</item>
      <item>No new runtime-only fields are required in `EmotionSceneResourceMeta` or `CareSceneResourceMeta`.</item>
      <item>`npm run type-check:emotional` passes after the type and export layer is introduced.</item>
    </verify>
  </task>

  <task id="14-01-02" requirement="CMPL-01">
    <summary>Implement `compileEmotionScene()` and switch the current emotion-scene runtime page to consume adapter output while keeping the existing page UI and flow logic intact.</summary>
    <files>
      <file>src/features/emotional/adapters/compileEmotionScene.ts</file>
      <file>src/views/emotional/EmotionSceneTraining.vue</file>
    </files>
    <deliverables>
      <item>`compileEmotionScene(meta, context)` that emits `scene_intro -> emotion_choice -> reasoning_question[] -> solution_choice`.</item>
      <item>Correct and acceptable value mapping that matches the current page-local `buildSessionConfig()` behavior.</item>
      <item>Normalized intro/reasoning/solution metadata sufficient for the existing page to render without re-deriving business semantics from raw option structures.</item>
    </deliverables>
    <verify>
      <item>The emotion-scene page can build `sessionConfig` via the adapter without changing launch, progression, or completion routing.</item>
      <item>Compiled reasoning and solution steps preserve `feedbackText`, `explanation`, `questionType`, and emotion-color cues.</item>
      <item>`npm run type-check:emotional` passes and a manual compare against the pre-extraction step order shows parity.</item>
    </verify>
  </task>

  <task id="14-01-03" requirement="CMPL-02,CMPL-03">
    <summary>Implement `compileCareScene()` and switch the care-expression runtime page to adapter output while preserving current sender/receiver behavior and summary inputs.</summary>
    <files>
      <file>src/features/emotional/adapters/compileCareScene.ts</file>
      <file>src/views/emotional/CareExpressionTraining.vue</file>
    </files>
    <deliverables>
      <item>`compileCareScene(meta, context)` that emits `scene_intro -> care_utterance -> receiver_preference`.</item>
      <item>Normalized metadata carrying `effect`, `receiverReactionText`, `receiverReactionEmoji`, `reasonText`, and comforting-state semantics.</item>
      <item>Preserved acceptable-answer handling for `advice` utterances and stable summary inputs for `dominantChoiceType`.</item>
    </deliverables>
    <verify>
      <item>The care-expression page can build `sessionConfig` via the adapter without changing prompt escalation, continue-to-next-step behavior, or final summary routing.</item>
      <item>Compiled care steps preserve sender/receiver perspective semantics and all current reaction-copy fields.</item>
      <item>`npm run type-check` passes and manual parity review confirms summary/report inputs do not drift.</item>
    </verify>
  </task>
</tasks>

## Verification Criteria

- [ ] `compileEmotionScene()` emits the exact runtime order required by the current emotion-scene flow
- [ ] `compileCareScene()` emits the exact runtime order required by the current care-scene flow
- [ ] Correct and acceptable answer mapping stays behaviorally aligned with the current page implementations
- [ ] Normalized metadata is sufficient for current runtime presentation without adding new resource-schema fields
- [ ] `EmotionSceneTraining.vue` and `CareExpressionTraining.vue` consume adapters for `sessionConfig` generation while remaining full runtime pages
- [ ] `npm run type-check:emotional` and `npm run type-check` both pass or any pre-existing unrelated blockers are explicitly documented

<must_haves>
- [ ] Phase 14 remains compile-layer extraction only and does not introduce the shared engine component
- [ ] Resource-layer source-of-truth stays on `EmotionSceneResourceMeta` / `CareSceneResourceMeta`
- [ ] `useEmotionalSession` and `EmotionalTrainingAPI` remain untouched as the persistence spine unless a minimal type-only compatibility adjustment is unavoidable
- [ ] Summary-driving semantics such as `dominantChoiceType` remain derivable from adapter output
- [ ] Route paths, selector behavior, and session-summary/report entry points do not change in this phase
</must_haves>

## Summary

This plan makes the compile layer explicit while keeping the current runtime pages behaviorally stable. It creates the adapter boundary that Phase 15 can later plug into a shared engine without forcing a business-flow rewrite first.

---

*Plan Status: READY FOR EXECUTION*
*Wave: 1 | Autonomous: true*
