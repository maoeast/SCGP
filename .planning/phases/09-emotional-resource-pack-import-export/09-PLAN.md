# PLAN: Emotional Resource Pack Import & Export

**Milestone:** v1.2  
**Phase:** 09  
**Status:** Planned - awaiting confirmation  
**Date:** 2026-03-18

## Goal

Build an admin-facing batch import/export tool for preset emotional resources that supports standard JSON and Excel workbook formats, then writes imported content back into the existing `sys_training_resource.meta_data` flow without reopening schema scope.

## Deliverables

1. A versioned JSON pack schema for `emotion_scene` and `care_scene` resources.
2. An Excel workbook format that can represent nested emotional metadata through multi-sheet tabular data.
3. A shared parser / normalizer pipeline that converts JSON or Excel input into typed emotional resource DTOs.
4. A Resource Center admin workflow for import preview, duplicate handling, execution, and export/template download.
5. Round-trip verification proving exported resources can be re-imported without losing required emotional metadata.

## Locked Constraints

- Keep persistence on `sys_training_resource.meta_data`; no new milestone-scoped schema changes.
- Reuse `src/types/emotional.ts` as the runtime contract source of truth.
- Reuse `normalizeEmotionSceneEditorModel`, `validateEmotionSceneEditorModel`, `normalizeCareSceneEditorModel`, and `validateCareSceneEditorModel` for import normalization/validation.
- Implement JSON import/export first, then Excel workbook import/export on the same intermediate DTO.
- Stay inside current dependencies; `xlsx` already exists and is sufficient.
- Entry point should be the current Resource Center training-resource management flow.

## Proposed Data Contract

### JSON Pack

Use a versioned envelope so future workbook/asset extensions do not break current imports:

```json
{
  "schemaVersion": "scgp.emotional-pack.v1",
  "moduleCode": "emotional",
  "exportedAt": "2026-03-18T10:30:00+08:00",
  "resources": [
    {
      "resourceType": "emotion_scene",
      "name": "生日派对上的开心",
      "category": "peer_interaction",
      "description": "识别生日场景中的开心情绪，并完成原因推理与回应选择。",
      "coverImage": "🎂",
      "tags": ["情绪识别", "开心"],
      "metadata": {
        "...": "EmotionSceneResourceMeta or CareSceneResourceMeta"
      }
    }
  ]
}
```

### Excel Workbook

Use a multi-sheet workbook instead of raw JSON-in-cell:

1. `resources`
   - one row per resource
   - includes `resourceType`, `sceneCode`, `name`, `category`, `description`, `coverImage`, `difficultyLevel`, `targetEmotion` / `careType` / `receiverEmotion`, `ageRange`, `abilityLevel`, `recommendedHintCeiling`, `tags`, and simple list fields such as `emotionOptions` / `emotionClues`
2. `emotion_prompts`
   - one row per prompt
   - keyed by `sceneCode + questionId`
3. `emotion_prompt_options`
   - one row per prompt option
   - keyed by `sceneCode + questionId + optionId`
4. `emotion_solutions`
   - one row per solution
   - keyed by `sceneCode + solutionId`
5. `care_utterances`
   - one row per utterance
   - keyed by `sceneCode + utteranceId`
6. `care_receiver_options`
   - one row per receiver option
   - keyed by `sceneCode + optionId`
7. `README`
   - human-readable instructions, enum values, and duplicate-handling notes

This shape keeps workbook editing realistic while still allowing deterministic reconstruction of nested `meta_data`.

## Frontend Plan

### 1. Resource Center Entry

Touchpoints:
- `src/views/resource-center/TrainingResources.vue`
- optional new component such as `src/views/resource-center/components/EmotionalResourcePackDialog.vue`

Planned UI changes:
- show `批量导入/导出` controls when current module is `emotional` and the user is not in read-only mode
- support two actions:
  - `导出资源包`
  - `导入资源包`
- reuse existing Element Plus dialog patterns already used by create/edit flows

### 2. Import Dialog Flow

The dialog should implement:

1. file selection for `.json`, `.xlsx`, `.xls`
2. file-type detection and parser dispatch
3. preview table with:
   - resource name
   - resource type
   - scene code
   - validation status
   - duplicate status
   - create/update/copy/skip outcome
4. duplicate strategy selector:
   - `skip`
   - `update existing`
   - `import as copy`
5. execution summary after confirmation:
   - created count
   - updated count
   - copied count
   - skipped count
   - failed count

### 3. Export UX

The export path should support:
- exporting the currently filtered emotional resources, or explicit row selection if selection UX is added during implementation
- choosing `JSON` or `Excel`
- downloading a blank/sample Excel template even before the first import

## Data / Persistence Plan

### 1. Intermediate DTO Layer

Add a dedicated importer/exporter utility, for example:
- `src/utils/emotional-resource-pack.ts`
- or `src/utils/emotional-resource-pack-importer.ts`

Responsibilities:
- define pack-level types
- parse JSON packs into a normalized intermediate DTO
- parse Excel sheets into the same DTO
- convert DTOs into `ResourceAPI.addResource` / `updateResource` payloads

The DTO should include:
- `resourceType`
- base resource fields (`name`, `category`, `description`, `coverImage`, `tags`)
- `sceneCode`
- normalized `metadata`
- validation errors
- duplicate match metadata

### 2. Normalization & Validation

Per imported record:

1. parse raw input into draft DTO
2. route by `resourceType`
3. run:
   - `normalizeEmotionSceneEditorModel` + `validateEmotionSceneEditorModel`
   - or `normalizeCareSceneEditorModel` + `validateCareSceneEditorModel`
4. attach validation errors before persistence

Important detail:
- do not use SQL JSON expressions as the primary duplicate detection mechanism
- instead, load current emotional resources through existing APIs, parse `meta_data` in application code, and match on `resourceType + metadata.sceneCode`

### 3. Batch Persistence

Prefer a milestone-local service layered on top of current `ResourceAPI` CRUD rather than a large schema/API refactor.

Execution rules:
- `skip`: leave existing row untouched
- `update existing`: call `updateResource` on the matched row
- `import as copy`: create a new row with a suffixed `name` and a generated copy-safe `sceneCode`

Persistence invariants:
- `moduleCode` is always `emotional`
- `resourceType` remains `emotion_scene` or `care_scene`
- `metadata` is written only after normalization succeeds
- invalid rows never write partial records

### 4. Export Serialization

Export should read current emotional resources through the same query path the UI already uses, then serialize:
- base resource fields
- tags
- parsed `meta_data`
- pack-level schema version / exported timestamp

The export pipeline should normalize again before writing files so malformed historical rows do not leak unstable output formats.

## Verification Plan

### Functional Checks

1. Export existing emotional demo resources to JSON and re-import them into a clean emotional filter view.
2. Export the same dataset to Excel, then re-import and compare required metadata fields.
3. Confirm imported resources appear in:
   - Resource Center edit dialog
   - `SceneSelector.vue`
   - `EmotionSceneTraining.vue`
   - `CareExpressionTraining.vue`
4. Confirm duplicate strategies behave correctly against matching `sceneCode`.
5. Confirm invalid workbook rows are blocked with readable error messages.

### Technical Checks

1. Run milestone-scoped type-check coverage on touched files.
2. Verify no schema migration files are required.
3. Verify no new runtime native dependency is introduced.
4. Verify JSON-first path can ship independently before Excel path if late-stage scope pressure appears.

## Execution Order

1. Define pack-level TypeScript types and JSON schema envelope.
2. Implement JSON export + JSON import parsing on the intermediate DTO.
3. Reuse emotional contract normalization/validation for import preview and errors.
4. Add duplicate detection and batch persistence service.
5. Add Resource Center import/export UI for JSON path end-to-end.
6. Implement Excel workbook serializer/parser using the same DTO.
7. Add template download and Excel import/export actions to the same dialog.
8. Run round-trip verification and update planning state.

## Acceptance Targets

1. Admin can export emotional resources as JSON or Excel from Resource Center.
2. Admin can preview and import JSON or Excel packs without touching raw SQL or raw `meta_data`.
3. Imported resources persist through the current `ResourceAPI` path and remain editable in existing emotional editors.
4. Invalid rows are blocked with specific teacher-readable guidance.
5. Round-trip import/export preserves the required emotional metadata contract.

## Risks To Watch

- Excel workbook design can become fragile if nested structures are collapsed into a single sheet; keep the sheet model relational.
- Historical emotional rows may contain partially normalized metadata; export should normalize before serialization.
- `import as copy` needs deterministic `sceneCode` suffixing so copied resources remain launchable and editable.
- Scope creep into binary asset packaging must be rejected during v1.2 execution.
