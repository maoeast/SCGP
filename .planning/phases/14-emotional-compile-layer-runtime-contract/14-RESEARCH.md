# Phase 14: Emotional Compile Layer & Runtime Contract - Research

**Researched:** 2026-03-23
**Domain:** Emotional compile adapters, normalized session contract, and runtime-semantic preservation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Locked Architecture

- v1.6 is a refactor of the runtime execution layer, not a business-model redesign.
- Resource-layer JSON remains on `EmotionSceneResourceMeta` and `CareSceneResourceMeta`.
- Resource JSON must not embed runtime-only fields such as `phase` or `stepType`.
- The compile layer owns translation from resource meta into `EmotionalSessionConfig`.

#### Locked Compile Targets

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

#### Locked Runtime Contract

- The runtime layer only consumes `EmotionalSessionConfig`.
- Normalized metadata must let renderers work without re-parsing raw `EmotionSceneResourceMeta` or `CareSceneResourceMeta`.
- `scene_intro.metadata` must support variant, title, description, clues, perspective texts, and scene visual information.
- `emotion_choice.metadata` must carry target emotion and emotion color cues.
- `reasoning_question.metadata` must carry question type and gentle feedback mode when needed.
- `solution_choice.metadata` must carry display intent for solution rendering.
- `care_utterance.metadata` must carry utterance type and receiver-reaction feedback fields.
- `receiver_preference.metadata` must carry reason text and comforting-state semantics.

#### Locked Compatibility Boundaries

- Route paths remain unchanged.
- Resource storage remains on `sys_training_resource.meta_data`.
- Persistence remains on `useEmotionalSession` plus `src/database/emotional-api.ts`.
- `SessionSummary`, `Records`, and `Report` must not need engine-aware changes in this phase.
- Emotional resource pack import/export remains compatible with the current schema.

### Claude's Discretion

- Exact file splits under `src/features/emotional/` and `src/components/emotional/engine/` as long as they preserve the locked compile/runtime boundary.
- Whether to introduce shared helper types/utilities beside adapters to reduce duplication and keep plan execution clear.
- How much compile-layer test or verification scaffolding is needed inside this phase before Phase 15 begins, as long as it proves compile outputs match current runtime behavior.

### Deferred Ideas (OUT OF SCOPE)

- Shared `EmotionalInteractionEngine.vue` rendering and renderer-map wiring
- Shell-page migration for the two emotional runtime pages
- End-to-end regression lock for summary/report parity after the shared engine lands
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CMPL-01 | `emotion_scene` resources compile from `EmotionSceneResourceMeta` into `EmotionalSessionConfig` with the current execution order `scene_intro -> emotion_choice -> reasoning_question[] -> solution_choice`. | Current `buildSessionConfig` order, correctness mapping, acceptable-answer mapping, question metadata, and intro semantics are documented from `EmotionSceneTraining.vue`. |
| CMPL-02 | `care_scene` resources compile from `CareSceneResourceMeta` into `EmotionalSessionConfig` with the current execution order `scene_intro -> care_utterance -> receiver_preference`. | Current `buildSessionConfig` order, sender/receiver perspective semantics, acceptable `advice` handling, and feedback metadata dependencies are documented from `CareExpressionTraining.vue`. |
| CMPL-03 | Compile output preserves current correctness, acceptable-answer, feedback, explanation, reaction, and metadata semantics without adding runtime-only fields to resource JSON. | `useEmotionalSession.ts`, `emotional-api.ts`, and both runtime pages establish the preserved contract: `correctValues`, `acceptableValues`, `perspective`, `promptId`, `buildSummary`, and option metadata must remain behaviorally equivalent. |
</phase_requirements>

## Summary

Phase 14 is a contract-extraction phase, not a renderer phase. The current behavior lives in two pages that both deserialize `sys_training_resource.meta_data`, build `EmotionalSessionConfig` inline, and then rely on `useEmotionalSession` for correctness, acceptable-answer advancement, hint escalation, summary generation, and persistence. Planning must preserve that existing runtime semantics exactly while moving the resource-to-session translation into standalone adapters.

The highest-risk boundary is not step order. It is metadata leakage. `EmotionSceneTraining.vue` still reads raw scene clues and color cues from resource meta, while `CareExpressionTraining.vue` repeatedly reverse-looks up raw `utterances` and `receiverOptions` to render effect panels, receiver reactions, and summary fields. If Phase 14 only extracts the step array but does not normalize those metadata fields into the compiled contract, Phase 15 will still be forced to read raw resource JSON in renderers and the boundary will remain broken.

The second planning risk is contract shape. The blueprint wants future runtime dispatch by `stepType -> renderer`, including `scene_intro`, but current `EmotionalStepType` does not include `scene_intro`; both pages currently encode intro steps with interactive step types (`emotion_choice` or `care_utterance`) and rely on `phase === 'scene_intro'` plus `interactive: false`. Phase 14 needs to resolve that typing boundary now, otherwise the shared engine phase will have to redesign the compile output retroactively.

**Primary recommendation:** Plan Phase 14 around pure compile adapters plus normalized intro and option metadata, and validate them by replaying compiled configs through `useEmotionalSession` semantics before any shared-engine work begins.

## Standard Stack

### Core
| Library / Module | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | `~5.9.0` | Defines the compile/runtime contract | Current repo baseline; compile adapters are pure type-heavy logic. |
| Vue | `3.5.25` | Hosts the current runtime pages and composable runtime | Existing emotional runtime already depends on Vue reactivity and composables. |
| `src/types/emotional.ts` | repo-local | Source-of-truth resource and session types | Already drives resources, session config, persistence, and report typing. |
| `src/composables/useEmotionalSession.ts` | repo-local | Canonical correctness, acceptable-answer, hint, retry, and summary semantics | Compile output must target this behavior exactly. |

### Supporting
| Library / Module | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/database/emotional-api.ts` | repo-local | Persistence and report compatibility baseline | Use to verify `stepType`, `promptId`, summary fields, and detail rows do not drift. |
| `tsconfig.emotional.json` + `npm run type-check:emotional` | `vue-tsc 3.1.5` | Focused emotional-module contract validation | Run on every Phase 14 task commit. |
| Vitest | not installed | Pure adapter and runtime-contract regression tests | Add in Wave 0 if automated semantic verification is required. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline `buildSessionConfig` in each page | Dedicated `compileEmotionScene` / `compileCareScene` adapters | Adapter extraction removes duplication without changing resource schema. |
| Raw resource meta reads inside renderers | Normalized `step.metadata` and `option.metadata` | Normalization is required to preserve the locked compile/runtime boundary. |
| Runtime step JSON embedded in resource data | Keep resources as authoring schema only | Locked blueprint explicitly forbids runtime-only fields in resource JSON. |

**Installation:**
```bash
npm install -D vitest
```

This install is only needed if Phase 14 includes automated adapter tests. No new runtime dependency is required for the compile layer itself.

## Architecture Patterns

### Recommended Project Structure
```text
src/
+-- features/
|   +-- emotional/
|       +-- adapters/              # compileEmotionScene / compileCareScene
|       +-- engine/                # contract types, summary helpers, feedback helpers
+-- views/
|   +-- emotional/                 # existing runtime pages remain the current behavior source
+-- composables/
    +-- useEmotionalSession.ts     # preserved execution semantics
```

### Pattern 1: Adapter Owns Resource-to-Session Translation
**What:** Move all `buildSessionConfig(...)` logic out of the pages into pure compile functions.
**When to use:** For every emotional resource type compiled into `EmotionalSessionConfig`.
**Example:**
```typescript
// Source: src/views/emotional/EmotionSceneTraining.vue + docs/planning/情绪交互引擎统一 V1.6.md
function compileEmotionScene(meta: EmotionSceneResourceMeta, ctx: CompileContext): EmotionalSessionConfig {
  return {
    studentId: ctx.studentId,
    resourceId: ctx.resourceId,
    resourceType: 'emotion_scene',
    subModule: 'emotion_scene',
    steps: [
      compileSceneIntro(meta, ctx),
      compileEmotionChoice(meta),
      ...meta.prompts.map(compileReasoningQuestion),
      compileSolutionChoice(meta),
    ],
  }
}
```

### Pattern 2: Normalize Metadata at Compile Time, Not in Renderers
**What:** Every field a future renderer needs from raw resource meta must be copied into `step.metadata` or `option.metadata`.
**When to use:** Intro display, reasoning prompts, solution explanations, care effect panels, receiver-reaction panels, and summary helpers.
**Example:**
```typescript
// Source: src/views/emotional/CareExpressionTraining.vue
const option = {
  value: utterance.id,
  label: utterance.text,
  isCorrect: meta.preferredUtteranceIds.includes(utterance.id),
  isAcceptable: utterance.type === 'advice',
  metadata: {
    utteranceType: utterance.type,
    effect: utterance.effect,
    receiverReactionText: utterance.receiverReactionText,
    receiverReactionEmoji: utterance.receiverReactionEmoji,
  },
}
```

### Pattern 3: Summary Hooks Must Be Derived From the Compiled Contract
**What:** Any `buildSummary` callback must read from compiled step data or compiled metadata, not from page-local raw meta lookups.
**When to use:** `care_scene` currently needs `dominantChoiceType` without changing downstream report consumers.
**Example:**
```typescript
// Source: src/views/emotional/CareExpressionTraining.vue + src/composables/useEmotionalSession.ts
buildSummary: ({ latestResults, config }) => {
  const selected = latestResults.find((item) => item.stepType === 'care_utterance')
  const step = config.steps.find((item) => item.key === 'care_utterance_choice')
  const option = step?.options?.find((item) => item.value === selected?.selectedValue)
  return {
    dominantChoiceType: option?.metadata?.utteranceType ?? null,
  }
}
```

### Pattern 4: Compile Context Must Carry the Resource Envelope
**What:** `meta` alone is not enough because current intro UIs depend on resource-row fields such as `name`, `description`, and `coverImage`.
**When to use:** `scene_intro.metadata` compilation.
**Example:**
```typescript
interface CompileContext {
  studentId: number
  resourceId: number
  resourceName: string
  resourceDescription?: string
  resourceCoverImage?: string
}
```

### Anti-Patterns to Avoid
- **Page-owned step assembly:** Keeping `buildSessionConfig(...)` inside `EmotionSceneTraining.vue` or `CareExpressionTraining.vue` defeats the phase goal and preserves duplication.
- **Renderer raw-meta reverse lookup:** Future renderers should not search `careMeta.utterances.find(...)` or `receiverOptions.find(...)` by ID.
- **Runtime-only resource fields:** Do not write `phase`, `stepType`, or prebuilt step JSON back into `meta_data`.
- **Changing interactive step semantics:** `emotion_choice`, `reasoning_question`, `solution_choice`, `care_utterance`, and `receiver_preference` remain the behavior-bearing step types used by persistence and reporting.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Step correctness and acceptable-answer evaluation | Per-page answer judging logic | `useEmotionalSession` with `correctValues` / `acceptableValues` | Current hint escalation, advancement, retries, and summaries already depend on this contract. |
| Care-effect and receiver-reason reverse lookup in renderers | `careMeta.utterances.find(...)` / `receiverOptions.find(...)` during rendering | Normalized `option.metadata` from compile adapters | Later engine renderers must not depend on raw resource meta. |
| Summary/report compatibility logic in pages | Page-local `buildSummary` closures tied to raw meta | Shared compile/summary helper that reads compiled config | Keeps `dominantChoiceType` compatible without leaking raw schema upward. |
| Runtime step authoring in resources | Serialized runtime step arrays in `meta_data` | Authoring schema + compile adapters | Locked blueprint forbids runtime-only fields in resource JSON. |

**Key insight:** Phase 14 succeeds only if the compile output is rich enough that Phase 15 can build a shared engine without touching raw emotional resource meta again.

## Common Pitfalls

### Pitfall 1: Treating `phase` Order as the Whole Contract
**What goes wrong:** The adapter preserves step order but loses hidden semantics such as `promptId`, `perspective`, `acceptableValues`, or option metadata.
**Why it happens:** The current runtime pages mix UI code and compilation code, so semantic requirements are easy to miss.
**How to avoid:** Audit every field used by `useEmotionalSession`, `CareExpressionTraining.vue`, and `emotional-api.ts`, not just the step list.
**Warning signs:** Compiled steps render, but hint filtering, summaries, or report aggregation change.

### Pitfall 2: Leaving Intro Semantics Ambiguous
**What goes wrong:** Future renderer dispatch expects a `scene_intro` renderer, but current typing only supports interactive step types.
**Why it happens:** Current pages branch on `phase === 'scene_intro'` and hide the type mismatch.
**How to avoid:** Decide the intro contract in Phase 14, not in the shared-engine phase.
**Warning signs:** Compile output still encodes intro as `emotion_choice` or `care_utterance` without an explicit normalization strategy.

### Pitfall 3: Failing to Normalize Care Option Metadata
**What goes wrong:** The future care renderer still needs raw `utterances` or `receiverOptions` arrays for effect text, reaction emoji, and reason text.
**Why it happens:** Current page code reconstructs cards by reverse lookup into `careMeta`.
**How to avoid:** Normalize `utteranceType`, `effect`, `receiverReactionText`, `receiverReactionEmoji`, `reasonText`, and `isComforting` into compiled option metadata.
**Warning signs:** Compiled care steps still require a separate raw meta argument for rendering or summary generation.

### Pitfall 4: Breaking Perspective-Based Summaries
**What goes wrong:** `preferredPerspective` or `dominantChoiceType` changes even when step order looks correct.
**Why it happens:** `useEmotionalSession` derives `preferredPerspective` from `payload.perspective` / `step.perspective`, and care summary currently derives `dominantChoiceType` from the selected utterance.
**How to avoid:** Preserve `perspective: 'sender' | 'receiver'` on care steps and keep a compatible `buildSummary` hook.
**Warning signs:** Same answers produce different summary/report results after compilation.

### Pitfall 5: Assuming Phase 14 Should Deliver the Engine
**What goes wrong:** Planning expands into renderer components, route rewiring, or shell-page migration, increasing scope and risking regression.
**Why it happens:** The blueprint discusses the future engine in the same document as the compile layer.
**How to avoid:** Treat Phase 14 as contract extraction only; shared engine and shell pages remain deferred.
**Warning signs:** Planned tasks start editing router files, page templates, or selector flows.

## Code Examples

Verified patterns from the current codebase:

### Current Emotion Compile Pattern
```typescript
// Source: src/views/emotional/EmotionSceneTraining.vue
const reasoningStep = {
  key: prompt.questionId,
  phase: 'reasoning',
  stepType: 'reasoning_question',
  promptId: prompt.questionId,
  promptText: prompt.questionText,
  metadata: {
    questionType: prompt.questionType,
  },
  options: prompt.options.map((option) => ({
    value: option.id,
    label: option.text,
    isCorrect: option.isCorrect,
    isAcceptable: option.isAcceptable,
    metadata: {
      feedbackText: option.feedbackText,
    },
  })),
  correctValues: prompt.options.filter((option) => option.isCorrect).map((option) => option.id),
  acceptableValues: prompt.options.filter((option) => option.isAcceptable).map((option) => option.id),
}
```

### Current Care Compile Pattern
```typescript
// Source: src/views/emotional/CareExpressionTraining.vue
const careUtteranceStep = {
  key: 'care_utterance_choice',
  phase: 'solution',
  stepType: 'care_utterance',
  promptText: meta.speakerPerspectiveText,
  perspective: 'sender',
  options: meta.utterances.map((utterance) => ({
    value: utterance.id,
    label: utterance.text,
    isCorrect: meta.preferredUtteranceIds.includes(utterance.id),
    isAcceptable: utterance.type === 'advice',
    metadata: {
      type: utterance.type,
      effect: utterance.effect,
      receiverReactionText: utterance.receiverReactionText,
      receiverReactionEmoji: utterance.receiverReactionEmoji,
    },
  })),
}
```

### Runtime Semantics the Compile Output Must Preserve
```typescript
// Source: src/composables/useEmotionalSession.ts
const correctValues = new Set(step.correctValues || step.options?.filter((option) => option.isCorrect).map((option) => option.value) || [])
const acceptableValues = new Set(step.acceptableValues || step.options?.filter((option) => option.isAcceptable).map((option) => option.value) || [])
const isCorrect = correctValues.has(payload.selectedValue)
const isAcceptable = isCorrect || acceptableValues.has(payload.selectedValue)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Each runtime page builds its own `EmotionalSessionConfig` inline | Extract page logic into dedicated compile adapters | Locked by 2026-03-23 Phase 14 blueprint | Removes duplication and prepares the shared engine without changing resource schema. |
| Render-time raw meta lookups (`sceneMeta`, `careMeta`) | Compile-time metadata normalization | Locked by 2026-03-23 blueprint | Makes future renderers engine-facing instead of resource-schema-facing. |
| Intro steps disguised as interactive step types | Explicit intro contract still needs Phase 14 resolution | Not resolved yet | This is the main contract gap before renderer-map work can start. |

**Deprecated/outdated:**
- Inline `buildSessionConfig(...)` inside the two runtime pages: this is now the legacy pattern targeted by Phase 14.
- Any assumption that `emotional` is already a unified engine module: current code is still page-specific and partially duplicated.

## Open Questions

1. **How should intro steps be typed in the normalized contract?**
   - What we know: The blueprint wants a `scene_intro` renderer, but `EmotionalStepType` currently excludes `scene_intro`, and both pages encode intro with `interactive: false` plus a non-intro `stepType`.
   - What's unclear: Whether Phase 14 should add `scene_intro` to `EmotionalStepType` now or keep intro dispatch keyed by `phase`.
   - Recommendation: Resolve this in Phase 14 as a contract decision. Do not defer it to the shared-engine phase.

2. **What exactly belongs in `CompileContext` versus `meta`?**
   - What we know: Current intro UI uses `resource.name`, `resource.description`, and `cover_image`, while resource JSON only guarantees `meta_data`.
   - What's unclear: The final source of truth for intro `title`, `description`, and `sceneVisual` when row-level and meta-level values both exist.
   - Recommendation: Define a small compile context carrying resource envelope fields and document fallback precedence.

3. **How much automated verification should Phase 14 include?**
   - What we know: The repo has no existing unit-test framework for the emotional module, but the phase explicitly needs proof that compile output preserves current runtime semantics.
   - What's unclear: Whether the milestone accepts type-check plus manual replay only, or requires proper adapter-level automated tests before Phase 15.
   - Recommendation: Plan a Wave 0 validation scaffold using Vitest for pure adapter tests and `useEmotionalSession` parity tests.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | none detected in repo for emotional unit tests; recommend `Vitest` in Wave 0 |
| Config file | none - see Wave 0 |
| Quick run command | `npm run type-check:emotional` |
| Full suite command | `npm run type-check` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CMPL-01 | `compileEmotionScene(meta, ctx)` emits `scene_intro -> emotion_choice -> reasoning_question[] -> solution_choice` and preserves `correctValues`, `acceptableValues`, `promptId`, and option feedback metadata | unit | `vitest run src/features/emotional/adapters/__tests__/compileEmotionScene.spec.ts` | NO - Wave 0 |
| CMPL-02 | `compileCareScene(meta, ctx)` emits `scene_intro -> care_utterance -> receiver_preference` and preserves sender/receiver perspective, acceptable `advice`, reaction metadata, and reason metadata | unit | `vitest run src/features/emotional/adapters/__tests__/compileCareScene.spec.ts` | NO - Wave 0 |
| CMPL-03 | Compiled configs replay through `useEmotionalSession` with unchanged correctness, acceptable-answer advancement, hint escalation, summary fields, and no runtime-only resource fields | integration | `vitest run src/features/emotional/adapters/__tests__/compileRuntimeParity.spec.ts` | NO - Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run type-check:emotional`
- **Per wave merge:** `npm run type-check`
- **Phase gate:** `npm run type-check` plus focused Vitest adapter/parity suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest` install and config file for repo-local TypeScript unit tests
- [ ] `src/features/emotional/adapters/__tests__/compileEmotionScene.spec.ts` - covers REQ-CMPL-01
- [ ] `src/features/emotional/adapters/__tests__/compileCareScene.spec.ts` - covers REQ-CMPL-02
- [ ] `src/features/emotional/adapters/__tests__/compileRuntimeParity.spec.ts` - covers REQ-CMPL-03 via `useEmotionalSession`
- [ ] Fixture strategy using real emotional resource examples from current repo data, so tests compare against actual current page semantics rather than invented samples

## Sources

### Primary (HIGH confidence)
- `.planning/phases/14-emotional-compile-layer-runtime-contract/14-CONTEXT.md` - locked compile/runtime boundary, compile targets, deferred scope
- `docs/planning/情绪交互引擎统一 V1.6.md` - internal engine blueprint and normalized metadata contract
- `src/views/emotional/EmotionSceneTraining.vue` - current emotion-scene runtime behavior and inline compile logic
- `src/views/emotional/CareExpressionTraining.vue` - current care-scene runtime behavior, raw-meta dependencies, and custom summary logic
- `src/composables/useEmotionalSession.ts` - answer evaluation, hint escalation, summary generation, and persistence contract
- `src/types/emotional.ts` - current resource/session/detail typings and current `stepType` gap
- `src/database/emotional-api.ts` - downstream persistence/report coupling to `step_type`, summary raw data, and resource metadata
- `.planning/REQUIREMENTS.md` - CMPL-01/02/03 requirement text
- `.planning/STATE.md` - current milestone state and phase intent

### Secondary (MEDIUM confidence)
- `package.json` - current toolchain versions and available validation scripts
- `tsconfig.emotional.json` - focused emotional type-check scope
- `docs/planning/2026-03-16-emotional-module-prd.md` - module target-state context; used only as background, not current implementation truth

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - derived from current repo files and scripts
- Architecture: HIGH - locked by the internal blueprint and confirmed against current duplicated page logic
- Pitfalls: HIGH - identified directly from current code paths, typing gaps, and persistence/report coupling
- Validation architecture: MEDIUM - current repo lacks emotional unit-test infrastructure, so the framework recommendation is a planning choice rather than an existing fact

**Research date:** 2026-03-23
**Valid until:** 2026-04-22
