# Phase 16: Shell Migration & End-to-End Compatibility - Research

**Researched:** 2026-03-24
**Domain:** Emotional runtime shell deduplication, persistence compatibility, and database-backed regression closure
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMP-01 | `EmotionSceneTraining.vue` and `CareExpressionTraining.vue` become shell pages that only load resources, deserialize `meta_data`, compile `EmotionalSessionConfig`, and host the shared engine. | Current code already moved both pages into host-mode, but they still duplicate route-query parsing, DB lookup, resource fallback, exit routing, and engine host glue almost line-for-line. |
| COMP-02 | Existing emotional route paths, query parameters, selector entry flows, dashboard/training-plan returns, and session-summary navigation remain compatible after the refactor. | Current host pages still own the compatibility-sensitive route/query logic directly, so Phase 16 should centralize it instead of keeping two copies that can drift. |
| COMP-03 | `useEmotionalSession` and `EmotionalTrainingAPI` continue to persist compatible `training_records`, `emotional_training_session`, and `emotional_training_detail` data so `SessionSummary`, `Records`, and `Report` do not need engine-aware changes. | The current local database already contains post-refactor sessions on 2026-03-24, proving the persistence chain still runs, but the latest `report_record` pointer is overwritten by cancelled emotional sessions and needs explicit closure. |
| COMP-04 | The milestone includes regression verification proving that both current submodules complete end-to-end with no summary/report metric drift relative to the pre-refactor behavior model. | Repository test infrastructure is still script-first, not unit-test-first. The safest path is a database-backed compatibility verifier plus focused manual UI checks for pacing and route navigation. |
</phase_requirements>

## Summary

Phase 16 is no longer about introducing the shared engine. That happened in Phase 15. The real remaining work is to finish the shell boundary and make compatibility observable instead of inferred.

The current code already proves the broad architecture:

- `EmotionSceneTraining.vue` and `CareExpressionTraining.vue` now load a resource, normalize `meta_data`, compile `EmotionalCompiledSessionConfig`, and mount `EmotionalInteractionEngine`.
- `EmotionalInteractionEngine.vue` owns progress, feedback, continuation, completion, and cancel-on-leave persistence hooks.
- `SessionSummary.vue`, `Records.vue`, and `Report.vue` still consume persisted tables through `EmotionalTrainingAPI` without engine-specific branching.

What is still incomplete is the closure work around duplication and verification:

- the two runtime pages still duplicate shell-only responsibilities
- compatibility evidence is scattered across code review, old verification notes, and live database queries
- report linkage semantics for cancelled runs are not explicitly guarded

Phase 16 should therefore do three things and stop:

1. make the two runtime pages truly thin by extracting shared host-shell logic
2. lock report/persistence semantics so cancelled runs do not silently become the active emotional report pointer
3. add one repeatable compatibility verifier that checks real source files and a real SCGP database

## Current Code Reality

### What Is Already True

- `src/views/emotional/EmotionSceneTraining.vue` and `src/views/emotional/CareExpressionTraining.vue` are already much thinner than the pre-engine pages.
- Both pages call `EmotionalInteractionEngine` with:
  - `sessionConfig`
  - `studentLabel`
  - `resourceLabel`
  - `navigation`
- Both pages preserve the same compatibility-sensitive exits:
  - `from=dashboard` -> `/dashboard`
  - `from=plan` -> `/training-plan`
  - default -> selector page
- Both pages still route completion to `/emotional/session-summary` with:
  - `resourceId`
  - `trainingRecordId`
  - `sessionId`

### What Is Still Duplicated

- `route.query` parsing for `studentId`, `studentName`, `resourceId`, and `from`
- `studentLabel` derivation
- `getActiveDb()` host lookup
- SQL resource lookup and fallback to first active resource
- missing-resource error handling
- `engineNavigation` construction
- `handleExit()` and `onBeforeRouteLeave()` glue

That duplication is now pure shell logic, which means Phase 16 can remove it without touching engine internals or compile adapters.

## Local Database Evidence (Current User DB)

Using `C:/Users/maoea/AppData/Roaming/scgp/database.sqlite` on 2026-03-24:

- `sys_training_resource` currently contains:
  - `emotion_scene`: 80 active rows
  - `care_scene`: 60 active rows
- `emotional_training_session` contains fresh post-refactor runs on 2026-03-24 for both submodules:
  - completed `emotion_scene`
  - completed `care_scene`
  - cancelled `emotion_scene`
- joined rows across `training_records`, `emotional_training_session`, and `emotional_training_detail` show:
  - `resource_type` matches between `training_records` and `emotional_training_session`
  - `session_type` / `raw_data.subModule` still align with `sub_module`
  - detail rows still preserve `step_type`, `hint_level`, `retry_count`, and acceptable-answer attempts

### Compatibility Risk Found

`src/database/emotional-api.ts` currently upserts `report_record` for emotional sessions without guarding on `completionStatus`.

Observed effect in the current DB:

- a cancelled emotional session can become the `report_record.training_record_id` for that student
- the module report page itself still aggregates by student and keeps working
- but the report registry pointer and created-at timestamp can drift toward cancelled work

That is not a shared-engine architecture issue, but it is a Phase 16 compatibility issue because report consumers should stay anchored to completed work.

## Architecture Recommendations

### Pattern 1: Shared Host Shell Composable

Create one host-shell composable under `src/features/emotional/runtime/` that owns:

- query parsing
- selector/dashboard/plan exit routing
- active-db access
- resource lookup by `resource_type`
- resource normalization
- compile-to-session conversion
- engine handle bridge for `handleExit()` / `cancelIfNeeded()`

The runtime pages should become parameterized wrappers, not sibling reimplementations.

### Pattern 2: Completion-Only Report Pointer Updates

Keep persisting all emotional sessions, including cancelled ones, into:

- `training_records`
- `emotional_training_session`
- `emotional_training_detail`

But only create or update `report_record(report_type='emotional')` when `completionStatus === 'completed'`.

This preserves history while keeping the report center pointed at finished work.

### Pattern 3: Script-First Compatibility Verification

Because the repo still has no standard unit/E2E framework, Phase 16 should add a Node script that checks:

- shell pages still point at the expected route paths
- the current database contains active emotional resources
- the current database has compatible joins between `training_records`, `emotional_training_session`, and `emotional_training_detail`
- cancelled sessions do not replace the emotional `report_record` pointer after the compatibility fix

The script should default to the user DB path above, but accept `--db <path>` for repeatable checks.

## Recommended File Targets

```text
src/features/emotional/runtime/
  useEmotionalTrainingShell.ts

src/views/emotional/
  EmotionSceneTraining.vue
  CareExpressionTraining.vue

src/database/
  emotional-api.ts

scripts/
  verify-emotional-engine-compat.mjs
```

## Verification Strategy

- Fast safety:
  - `npm run type-check:emotional`
- Production compile:
  - `npm run build:web`
- Compatibility:
  - `node scripts/verify-emotional-engine-compat.mjs --db "C:/Users/maoea/AppData/Roaming/scgp/database.sqlite"`
- Remaining manual checks:
  - emotion-scene valid-answer pacing
  - care-scene reveal/continue pacing
  - route-leave cancellation UX
  - `/emotional/session-summary` navigation feel

## Bottom Line

Phase 16 should not reopen engine architecture. It should finish the shell boundary, harden report-pointer semantics, and turn today's live-database observations into a repeatable regression check.
