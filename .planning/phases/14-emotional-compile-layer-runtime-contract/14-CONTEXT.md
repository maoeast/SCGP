# Phase 14: Emotional Compile Layer & Runtime Contract - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning
**Source:** Internal emotional engine blueprint (`docs/planning/情绪交互引擎统一 V1.6.md`)

<domain>
## Phase Boundary

Phase 14 only covers the compile layer and the normalized runtime contract for the emotional engine refactor.

This phase delivers:

- A compile path from `EmotionSceneResourceMeta` to `EmotionalSessionConfig`
- A compile path from `CareSceneResourceMeta` to `EmotionalSessionConfig`
- A normalized metadata contract that future renderers and the shared engine can consume without directly reading raw resource meta structures
- Locked compatibility boundaries so the refactor does not change route paths, resource persistence schema, downstream session persistence, or report consumers

This phase does not deliver the shared engine component itself or the final shell-page migration. Those belong to later roadmap phases.

</domain>

<decisions>
## Implementation Decisions

### Locked Architecture

- v1.6 is a refactor of the runtime execution layer, not a business-model redesign.
- Resource-layer JSON remains on `EmotionSceneResourceMeta` and `CareSceneResourceMeta`.
- Resource JSON must not embed runtime-only fields such as `phase` or `stepType`.
- The compile layer owns translation from resource meta into `EmotionalSessionConfig`.

### Locked Compile Targets

- `compileEmotionScene(meta, ctx)` must output steps in the order `scene_intro -> emotion_choice -> reasoning_question[] -> solution_choice`.
- `compileCareScene(meta, ctx)` must output steps in the order `scene_intro -> care_utterance -> receiver_preference`.
- `targetEmotion` maps to `correctValues`.
- `prompts[].options[].isCorrect` maps to `correctValues`.
- `prompts[].options[].isAcceptable` maps to `acceptableValues`.
- `solutions[].suitability === 'optimal'` maps to `correctValues`.
- `solutions[].suitability === 'acceptable'` maps to `acceptableValues`.
- `preferredUtteranceIds` maps to `correctValues`.
- `utterances[].type === 'advice'` remains acceptable in the current implementation.
- `receiverOptions[].isComforting === true` maps to `correctValues`.
- `feedbackText`, `explanation`, `effect`, `receiverReactionText`, `receiverReactionEmoji`, and `reasonText` must survive in normalized option metadata.

### Locked Runtime Contract

- The runtime layer only consumes `EmotionalSessionConfig`.
- Normalized metadata must let renderers work without re-parsing raw `EmotionSceneResourceMeta` or `CareSceneResourceMeta`.
- `scene_intro.metadata` must support variant, title, description, clues, perspective texts, and scene visual information.
- `emotion_choice.metadata` must carry target emotion and emotion color cues.
- `reasoning_question.metadata` must carry question type and gentle feedback mode when needed.
- `solution_choice.metadata` must carry display intent for solution rendering.
- `care_utterance.metadata` must carry utterance type and receiver-reaction feedback fields.
- `receiver_preference.metadata` must carry reason text and comforting-state semantics.

### Locked Compatibility Boundaries

- Route paths remain unchanged.
- Resource storage remains on `sys_training_resource.meta_data`.
- Persistence remains on `useEmotionalSession` plus `src/database/emotional-api.ts`.
- `SessionSummary`, `Records`, and `Report` must not need engine-aware changes in this phase.
- Emotional resource pack import/export remains compatible with the current schema.

### Claude's Discretion

- Exact file splits under `src/features/emotional/` and `src/components/emotional/engine/` as long as they preserve the locked compile/runtime boundary.
- Whether to introduce shared helper types/utilities beside adapters to reduce duplication and keep plan execution clear.
- How much compile-layer test or verification scaffolding is needed inside this phase before Phase 15 begins, as long as it proves compile outputs match current runtime behavior.

</decisions>

<specifics>
## Specific Ideas

- Suggested engine-facing compile files:
  - `src/features/emotional/adapters/compileEmotionScene.ts`
  - `src/features/emotional/adapters/compileCareScene.ts`
- Suggested runtime support files:
  - `src/features/emotional/engine/types.ts`
  - `src/features/emotional/engine/summary.ts`
  - `src/features/emotional/engine/feedback.ts`
- Existing source-of-truth schema is already present in `src/types/emotional.ts`.
- Current runtime behavior to preserve is implemented in:
  - `src/views/emotional/EmotionSceneTraining.vue`
  - `src/views/emotional/CareExpressionTraining.vue`
  - `src/composables/useEmotionalSession.ts`

</specifics>

<deferred>
## Deferred Ideas

- Shared `EmotionalInteractionEngine.vue` rendering and renderer-map wiring
- Shell-page migration for the two emotional runtime pages
- End-to-end regression lock for summary/report parity after the shared engine lands

</deferred>

---

*Phase: 14-emotional-compile-layer-runtime-contract*
*Context gathered: 2026-03-23 via internal emotional engine blueprint*
