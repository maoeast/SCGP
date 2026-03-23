# Roadmap

## Archived Milestones

- ✅ `v1.5 Strict Modular Licensing` — shipped 2026-03-19
  - Archive: `.planning/milestones/v1.5-ROADMAP.md`
- ✅ `v1.4 Dashboard Special Ed Command Center` — shipped 2026-03-19
  - Archive: `.planning/milestones/v1.4-ROADMAP.md`
- ✅ `v1.3 Unified Assessment Word Export` — shipped 2026-03-18
  - Archive: `.planning/milestones/v1.3-ROADMAP.md`
- ✅ `v1.2 Emotional Resource Pack Import & Export` — shipped 2026-03-18
  - Archive: `.planning/milestones/v1.2-ROADMAP.md`
- ✅ `v1.1 Emotional Authoring & Scene Gallery` — shipped 2026-03-17
  - Archive: `.planning/milestones/v1.1-ROADMAP.md`
- ✅ `v1.0 Emotional MVP` — shipped 2026-03-17
  - Archive: `.planning/milestones/v1.0-ROADMAP.md`

## Current Milestone

### Milestone v1.6: Emotional Engine Refactoring

**Status:** In progress  
**Phases:** 14-16  
**Total Plans:** 3

## Overview

v1.6 refactors the emotional runtime into a shared execution layer without changing the existing business model. The milestone keeps `EmotionSceneResourceMeta`, `CareSceneResourceMeta`, current routes, and current persistence/report consumers intact while extracting compile adapters, a unified interaction engine, and shell-only training pages.

## Phases

### Phase 14: Emotional Compile Layer & Runtime Contract

**Goal**: Extract compile adapters and normalized engine-facing metadata so current emotional resources compile into one shared `EmotionalSessionConfig` DSL without changing resource schema.  
**Depends on**: —  
**Plans**: 1 plan
**Status:** Complete (2026-03-23)

Plans:

- [x] 14-01: Compile EmotionScene / CareScene into the unified runtime DSL

**Requirements:** `CMPL-01`, `CMPL-02`, `CMPL-03`

**Success criteria:**
1. `EmotionSceneResourceMeta` compiles into the current runtime order `scene_intro -> emotion_choice -> reasoning_question[] -> solution_choice`.
2. `CareSceneResourceMeta` compiles into the current runtime order `scene_intro -> care_utterance -> receiver_preference`.
3. Correct/acceptable answer sets plus feedback/explanation/reaction metadata are preserved in normalized step definitions.
4. No runtime-only fields are pushed back into `sys_training_resource.meta_data` or resource-pack schema contracts.

### Phase 15: Unified Emotional Interaction Engine

**Goal**: Replace duplicated runtime orchestration with a shared engine and renderer map that preserves current prompt escalation, feedback pacing, and step advancement behavior.  
**Depends on**: Phase 14  
**Plans**: 1 plan

Plans:

- [ ] 15-01: Build shared engine shell, renderer dispatch, and legacy-compatible runtime behavior

**Requirements:** `ENGN-01`, `ENGN-02`, `ENGN-03`

**Success criteria:**
1. One `EmotionalInteractionEngine` drives progress, feedback, completion, cancellation, and summary navigation for both current emotional submodules.
2. Step UI is selected by `stepType -> renderer` mapping instead of page-specific branching over raw resource structures.
3. Renderers consume normalized step props and only use metadata needed for presentation differences.
4. Retry handling, acceptable-answer advancement, and `hintLevel 0 -> 1 -> 2 -> 3` escalation remain behaviorally consistent with the current implementation.

### Phase 16: Shell Migration & End-to-End Compatibility

**Goal**: Reduce the two runtime pages to thin shells and verify that current launch, persistence, summary, records, and report flows behave the same after the engine refactor.  
**Depends on**: Phase 15  
**Plans**: 1 plan

Plans:

- [ ] 16-01: Migrate runtime pages to shell wrappers and lock regression compatibility

**Requirements:** `COMP-01`, `COMP-02`, `COMP-03`, `COMP-04`

**Success criteria:**
1. `EmotionSceneTraining.vue` and `CareExpressionTraining.vue` only load resource data, compile config, and host the shared engine.
2. Existing route/query contracts and selector/dashboard/training-plan/session-summary navigation remain stable.
3. `useEmotionalSession` and `EmotionalTrainingAPI` continue to produce compatible persisted records and downstream summary payloads.
4. Manual or automated regression verifies both submodules complete end-to-end with no report/summary metric drift against the pre-refactor behavior model.

## Milestone Summary

**Key Decisions:**

- Keep the resource layer on `EmotionSceneResourceMeta` / `CareSceneResourceMeta`; compile adapters own runtime translation.
- Keep `useEmotionalSession` and `EmotionalTrainingAPI` as the persistence spine; the new engine must sit above them, not replace them.
- Treat runtime pages as shell pages only; business-specific step assembly belongs to compile adapters and normalized metadata.
- Define v1.6 strictly as refactor-and-extract work; no new business concepts are introduced in this milestone.

**Issues Resolved:**

- Emotional runtime orchestration no longer needs to be duplicated across `EmotionSceneTraining.vue` and `CareExpressionTraining.vue`.
- Runtime step rendering gains a single engine-facing contract instead of ad hoc page-level resource interpretation.
- Future engine extension work can build on the normalized compile/runtime split without changing current emotional resource schema.

**Issues Deferred:**

- New emotional training types or engine-powered interaction concepts.
- Emotional report polish beyond compatibility preservation.
- Broader platform route/menu/licensing cleanup outside the emotional refactor path.

## Future Backlog

- Emotional report polish based on richer scene taxonomy and teacher-facing summaries.
- New emotional interaction types layered on top of the shared engine once v1.6 stabilizes.
- Refine authorization semantics for cross-module pages such as `Reports`, `ResourceCenter`, and `TrainingPlan` instead of treating them as single-module surfaces.
- Replace first-resource direct launch with plan-priority or teacher-guided recommended resource selection once the current dashboard launch flow proves stable.
- Resource pack bundling for local cover images / scene illustrations after metadata exchange proves stable.
- Cross-module route/menu platformization after current static-route debt is prioritized.
- Cognitive assessment foundation (`MOD-03`).
- Multi-module comprehensive reporting (`MOD-04`).
