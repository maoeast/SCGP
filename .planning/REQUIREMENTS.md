# Requirements: SCGP v1.6 Emotional Engine Refactoring

**Defined:** 2026-03-23
**Core Value:** SCGP helps special education teachers and rehabilitation staff run structured assessment and intervention workflows in one offline system.

## v1 Requirements

### Compile Layer

- [x] **CMPL-01**: `emotion_scene` resources compile from `EmotionSceneResourceMeta` into `EmotionalSessionConfig` with the current execution order `scene_intro -> emotion_choice -> reasoning_question[] -> solution_choice`.
- [x] **CMPL-02**: `care_scene` resources compile from `CareSceneResourceMeta` into `EmotionalSessionConfig` with the current execution order `scene_intro -> care_utterance -> receiver_preference`.
- [x] **CMPL-03**: Compile output preserves current correctness, acceptable-answer, feedback, explanation, reaction, and metadata semantics without adding runtime-only fields to resource JSON.

### Unified Engine

- [ ] **ENGN-01**: A shared `EmotionalInteractionEngine` drives session startup, progress display, feedback panel, prompt escalation, completion, cancellation, and summary navigation for both existing emotional submodules.
- [ ] **ENGN-02**: Step rendering is dispatched through a `stepType -> renderer` mapping, and renderers consume normalized step props rather than directly depending on raw `EmotionSceneResourceMeta` or `CareSceneResourceMeta`.
- [ ] **ENGN-03**: The refactored runtime preserves the current `hintLevel 0 -> 1 -> 2 -> 3` escalation, retry handling, acceptable-answer advancement, and feedback pacing behavior across both submodules.

### Shell Migration & Compatibility

- [ ] **COMP-01**: `EmotionSceneTraining.vue` and `CareExpressionTraining.vue` become shell pages that only load resources, deserialize `meta_data`, compile `EmotionalSessionConfig`, and host the shared engine.
- [ ] **COMP-02**: Existing emotional route paths, query parameters, selector entry flows, dashboard/training-plan returns, and session-summary navigation remain compatible after the refactor.
- [ ] **COMP-03**: `useEmotionalSession` and `EmotionalTrainingAPI` continue to persist compatible `training_records`, `emotional_training_session`, and `emotional_training_detail` data so `SessionSummary`, `Records`, and `Report` do not need engine-aware changes.
- [ ] **COMP-04**: The milestone includes regression verification proving that both current submodules complete end-to-end with no summary/report metric drift relative to the pre-refactor behavior model.

## v2 Requirements

### Deferred

- **NEXT-01**: Add new emotional interaction submodules or games on top of the unified engine after v1.6 refactor stability is proven.
- **NEXT-02**: Revisit emotional report polish, richer taxonomy, or broader engine-driven authoring improvements after behavior-preserving refactor work lands.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New emotional business flows or training types | v1.6 is strictly a refactor-and-extract milestone |
| Resource schema redesign | Existing `EmotionSceneResourceMeta` and `CareSceneResourceMeta` are already the source of truth |
| Engine-aware report or record redesign | Summary/report surfaces must stay compatible with current downstream consumers |
| Broad platform routing or licensing cleanup | Separate debt track, not required to restore emotional runtime under the new engine |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CMPL-01 | Phase 14 | Complete |
| CMPL-02 | Phase 14 | Complete |
| CMPL-03 | Phase 14 | Complete |
| ENGN-01 | Phase 15 | Pending |
| ENGN-02 | Phase 15 | Pending |
| ENGN-03 | Phase 15 | Pending |
| COMP-01 | Phase 16 | Pending |
| COMP-02 | Phase 16 | Pending |
| COMP-03 | Phase 16 | Pending |
| COMP-04 | Phase 16 | Pending |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 after defining milestone v1.6 requirements from the emotional engine blueprint*
