---
wave: 1
depends_on: []
files_modified:
  - src/features/emotional/runtime/useEmotionalTrainingShell.ts
  - src/views/emotional/EmotionSceneTraining.vue
  - src/views/emotional/CareExpressionTraining.vue
  - src/database/emotional-api.ts
  - scripts/verify-emotional-engine-compat.mjs
autonomous: true
---

# Plan 16.1: Shell Migration & End-to-End Compatibility

## Goal

Finish milestone v1.6 by turning the two emotional runtime pages into true host shells, closing the remaining report/persistence compatibility gap found in the current local database, and adding a repeatable verifier for the current SCGP database.

## Context

- Phase 14 already moved resource-to-runtime translation into `compileEmotionScene()` / `compileCareScene()`.
- Phase 15 already introduced `EmotionalInteractionEngine.vue` and moved runtime orchestration out of the two pages.
- The current runtime pages are host-mode, but they still duplicate shell-only responsibilities such as route-query parsing, active-resource lookup, fallback handling, and exit navigation.
- The current user database at `C:/Users/maoea/AppData/Roaming/scgp/database.sqlite` proves that post-refactor sessions are already being persisted through `training_records`, `emotional_training_session`, and `emotional_training_detail`.
- The same DB audit also shows a compatibility risk: cancelled emotional sessions currently update the student-level `report_record` pointer, which can make the report registry drift toward unfinished work.

## Requirements Covered

- COMP-01: `EmotionSceneTraining.vue` and `CareExpressionTraining.vue` become shell pages that only load resources, deserialize `meta_data`, compile `EmotionalSessionConfig`, and host the shared engine.
- COMP-02: Existing emotional route paths, query parameters, selector entry flows, dashboard/training-plan returns, and session-summary navigation remain compatible after the refactor.
- COMP-03: `useEmotionalSession` and `EmotionalTrainingAPI` continue to persist compatible `training_records`, `emotional_training_session`, and `emotional_training_detail` data so `SessionSummary`, `Records`, and `Report` do not need engine-aware changes.
- COMP-04: The milestone includes regression verification proving that both current submodules complete end-to-end with no summary/report metric drift relative to the pre-refactor behavior model.

## Tasks

<tasks>
  <task id="16-01-01" requirement="COMP-01,COMP-02">
    <summary>Extract one shared emotional training-shell composable so both runtime pages only declare submodule-specific labels, selector path, normalizer, and compile function.</summary>
    <read_first>
      <file>src/views/emotional/EmotionSceneTraining.vue</file>
      <file>src/views/emotional/CareExpressionTraining.vue</file>
      <file>src/components/emotional/engine/EmotionalInteractionEngine.vue</file>
      <file>src/features/emotional/adapters/compileEmotionScene.ts</file>
      <file>src/features/emotional/adapters/compileCareScene.ts</file>
    </read_first>
    <files>
      <file>src/features/emotional/runtime/useEmotionalTrainingShell.ts</file>
      <file>src/views/emotional/EmotionSceneTraining.vue</file>
      <file>src/views/emotional/CareExpressionTraining.vue</file>
    </files>
    <action>Create `src/features/emotional/runtime/useEmotionalTrainingShell.ts` and move the duplicated host-page logic into it: parse `route.query.studentId`, `studentName`, `resourceId`, and `from`; derive `studentLabel`; read `window.db`; query `sys_training_resource` with `module_code = 'emotional'`, the caller-provided `resource_type`, and `is_active = 1`; fall back to `ORDER BY id ASC LIMIT 1`; normalize `meta_data`; compile `EmotionalCompiledSessionConfig`; build completion navigation to `/emotional/session-summary`; preserve exit returns to `/dashboard`, `/training-plan`, or the caller-provided selector path; and expose `engineRef`, `resource`, `sessionConfig`, `loadError`, `studentLabel`, `inheritedQuery`, `handleExit`, and `cancelIfNeeded`. Update both training pages to call `useEmotionalTrainingShell({ resourceType: 'emotion_scene' | 'care_scene', selectorPath: '/emotional/emotion-scene/select' | '/emotional/care-expression/select', introActionLabel: '开始识别情绪' | '开始选择关心表达', normalizeResource, compileSession })` and remove their inline `getActiveDb()`, SQL strings, query parsing, and navigation builders.</action>
    <acceptance_criteria>
      <item>`src/features/emotional/runtime/useEmotionalTrainingShell.ts` contains `export function useEmotionalTrainingShell(`.</item>
      <item>`src/views/emotional/EmotionSceneTraining.vue` contains `useEmotionalTrainingShell({` and does not contain `function getActiveDb(`.</item>
      <item>`src/views/emotional/CareExpressionTraining.vue` contains `useEmotionalTrainingShell({` and does not contain `function getActiveDb(`.</item>
      <item>`rg -n "const sql =|function getActiveDb\\(" src/views/emotional/EmotionSceneTraining.vue src/views/emotional/CareExpressionTraining.vue` returns no matches.</item>
      <item>`npm run type-check:emotional` exits 0 after the shell extraction.</item>
    </acceptance_criteria>
  </task>

  <task id="16-01-02" requirement="COMP-03">
    <summary>Guard emotional report-pointer updates so cancelled or interrupted runs keep persistence history without replacing the student's active completed emotional report.</summary>
    <read_first>
      <file>src/database/emotional-api.ts</file>
      <file>src/views/Reports.vue</file>
      <file>src/views/emotional/Report.vue</file>
      <file>.planning/phases/15-unified-emotional-interaction-engine/15-VERIFICATION.md</file>
    </read_first>
    <files>
      <file>src/database/emotional-api.ts</file>
    </files>
    <action>Update `EmotionalTrainingAPI.persistSession()` so it always inserts `training_records`, `emotional_training_session`, and `emotional_training_detail` for `completed`, `cancelled`, and `interrupted` runs, but only executes the `report_record` select/update/insert branch when `input.completionStatus === 'completed'`. For `cancelled` and `interrupted`, leave any existing `report_record(report_type='emotional')` untouched and do not create a new one. Keep the emotional report title format as `${studentName} - 情绪行为调节训练报告` for completed runs.</action>
    <acceptance_criteria>
      <item>`src/database/emotional-api.ts` contains `if (input.completionStatus === 'completed')` guarding the `report_record` branch.</item>
      <item>`src/database/emotional-api.ts` still contains `INSERT INTO emotional_training_session` and `INSERT INTO emotional_training_detail` outside the completion-only report guard.</item>
      <item>`rg -n "completionStatus === 'completed'" src/database/emotional-api.ts` returns a match.</item>
      <item>`npm run type-check:emotional` exits 0 after the persistence/report guard change.</item>
    </acceptance_criteria>
  </task>

  <task id="16-01-03" requirement="COMP-02,COMP-03,COMP-04">
    <summary>Add a database-backed compatibility verifier for the current SCGP emotional runtime and use it to lock route literals, persistence joins, and completed-report pointer semantics.</summary>
    <read_first>
      <file>src/views/emotional/EmotionSceneTraining.vue</file>
      <file>src/views/emotional/CareExpressionTraining.vue</file>
      <file>src/database/emotional-api.ts</file>
      <file>.planning/phases/16-shell-migration-and-end-to-end-compatibility/16-RESEARCH.md</file>
      <file>.planning/phases/16-shell-migration-and-end-to-end-compatibility/16-VALIDATION.md</file>
    </read_first>
    <files>
      <file>scripts/verify-emotional-engine-compat.mjs</file>
    </files>
    <action>Create `scripts/verify-emotional-engine-compat.mjs` as a Node ESM script using `sql.js` that accepts `--db <path>` and defaults to `C:/Users/maoea/AppData/Roaming/scgp/database.sqlite`. Make it read the two emotional training view files and the database, then print explicit checks for: `PASS shell-route-literals` when `/emotional/session-summary`, `/dashboard`, `/training-plan`, `/emotional/emotion-scene/select`, and `/emotional/care-expression/select` are still present; `PASS resource-count` when active emotional resources exist for both `emotion_scene` and `care_scene`; `PASS persistence-chain` when recent `training_records`, `emotional_training_session`, and `emotional_training_detail` rows agree on `resource_type`, `session_type`, and detail presence; and `PASS completed-report-pointer` when the newest emotional `report_record.training_record_id` for each student points to the newest completed emotional training record rather than a cancelled one. Exit with code 1 on hard failures and 0 on all-pass.</action>
    <acceptance_criteria>
      <item>`scripts/verify-emotional-engine-compat.mjs` contains `PASS shell-route-literals`, `PASS persistence-chain`, and `PASS completed-report-pointer`.</item>
      <item>`node scripts/verify-emotional-engine-compat.mjs --db "C:/Users/maoea/AppData/Roaming/scgp/database.sqlite"` exits 0.</item>
      <item>The verifier output contains `PASS persistence-chain`.</item>
      <item>The verifier output contains `PASS completed-report-pointer`.</item>
      <item>`npm run build:web` exits 0 after the verifier and compatibility guard changes.</item>
    </acceptance_criteria>
  </task>
</tasks>

## Verification Criteria

- [ ] Runtime pages only declare submodule-specific labels and adapters; shared shell logic lives in `useEmotionalTrainingShell`
- [ ] Emotional completion still routes to `/emotional/session-summary` with persisted IDs
- [ ] Dashboard / training-plan / selector exit routes remain unchanged
- [ ] Cancelled emotional sessions still persist session history without overwriting the active completed report pointer
- [ ] A repeatable DB-backed verifier exists and passes against `C:/Users/maoea/AppData/Roaming/scgp/database.sqlite`
- [ ] `npm run type-check:emotional` and `npm run build:web` pass after the Phase 16 changes

<must_haves>
- [ ] Phase 16 does not reopen compile-adapter or shared-engine architecture
- [ ] `useEmotionalSession` remains the scoring and persistence spine
- [ ] `SessionSummary.vue`, `Records.vue`, and `Report.vue` remain engine-agnostic consumers
- [ ] Route paths and query names stay identical to the current emotional launch flow
- [ ] Compatibility is proven against the current user database, not only by source inspection
</must_haves>

## Summary

Phase 16 should finish v1.6 with one shell-extraction pass, one report-pointer compatibility fix, and one real-database verifier. That keeps the milestone bounded to compatibility closure instead of reopening behavior design.
