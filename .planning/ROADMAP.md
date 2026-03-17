# Roadmap

## Archived Milestones

- ✅ `v1.0 Emotional MVP` — shipped 2026-03-17
  - Archive: `.planning/milestones/v1.0-ROADMAP.md`

## Current Milestone

### v1.1 Emotional Authoring & Scene Gallery

**Goal**: Lower emotional-module authoring threshold for special-education teachers and make scene choice explicit before runtime starts.

**Phases**: 3  
**Requirements mapped**: 8  
**Starting phase number**: 6

## Phases

### Phase 6: Emotional Resource Contract & Editor Infrastructure
**Goal**: Lock the current emotional metadata contract and prepare reusable parsing, normalization, and validation utilities for visual editing.
**Requirements**: EDITOR-03, EDITOR-04
**Status**: Completed

**Success Criteria**:
1. Existing `emotion_scene` and `care_scene` resources can be loaded into typed editor state without exposing raw JSON to users.
2. Save-time normalization outputs metadata compatible with `EmotionSceneTraining.vue` and `CareExpressionTraining.vue`.
3. Validation covers nested prompts, options, solutions, utterances, and receiver options with teacher-readable error messaging.
4. No database schema migration is required to keep v1.0 demo/custom emotional resources usable.

### Phase 7: Visual Emotional Resource Editors
**Goal**: Replace emotional resource JSON textareas in Resource Center with dedicated visual editors.
**Depends on**: Phase 6
**Requirements**: EDITOR-01, EDITOR-02
**Status**: Completed

**Success Criteria**:
1. Admin can create and edit `emotion_scene` resources through a dedicated form component.
2. Admin can create and edit `care_scene` resources through a dedicated form component.
3. Emotional resource authoring no longer exposes raw `meta_data` textareas in normal create/edit flows.
4. Editor UI supports dynamic add/remove flows for nested options and feedback fields using Element Plus form controls.

### Phase 8: Emotional Scene Gallery & Launch Flow
**Goal**: Add selector pages so teachers choose a concrete scene before entering emotional training runtime.
**Depends on**: Phase 7
**Requirements**: SCENE-01, SCENE-02, SCENE-03, SCENE-04
**Status**: Planned

**Success Criteria**:
1. `情绪与场景` and `表达关心` menu cards route to dedicated selector pages instead of entering runtime directly.
2. Selector pages list all active scenes in a card grid rather than auto-loading the first available record.
3. Scene cards display cover, title, difficulty, and emotion color cues in a touch-friendly layout that matches PRD section 9.
4. Clicking a card navigates into the existing training runtime with explicit `resourceId` while preserving student context.
5. Empty states clearly guide teachers back to Resource Center when no valid scenes are available.

## Execution Order

1. **Phase 6** first, because editor/runtime compatibility must be stabilized before the UI stops exposing JSON.
2. **Phase 7** second, because visual authoring is the main usability blocker for teachers and admins.
3. **Phase 8** third, because scene gallery depends on stable metadata presentation and should launch already normalized resources.

## Risks To Track

- PRD section 10 schema examples and current `src/types/emotional.ts` names are not identical; v1.1 must follow current code contract while preserving PRD intent.
- Existing emotional resources are stored in `meta_data`, and runtime pages parse them directly; editor changes cannot silently drift the serialized shape.
- Emotional routes are still static in `src/router/index.ts`; selector pages should fit the current static route architecture instead of reopening platform-routing scope.

## Next Step

Start implementation planning for `Phase 8`.

---
*Created on 2026-03-17 for milestone v1.1 Emotional Authoring & Scene Gallery*
