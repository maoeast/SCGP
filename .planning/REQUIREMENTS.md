# REQUIREMENTS

## Milestone v1.1: Emotional Authoring & Scene Gallery

**Goal:** Let teachers and admins manage emotional training scenes without touching raw JSON, and let teachers choose a concrete scene before starting training.

## In Scope

### Visual Resource Authoring

- [x] **EDITOR-01**: Admin can create and edit `emotion_scene` resources through a dedicated visual form in Resource Center without directly editing raw JSON.
- [x] **EDITOR-02**: Admin can create and edit `care_scene` resources through a dedicated visual form in Resource Center without directly editing raw JSON.
- [x] **EDITOR-03**: System validates and normalizes nested emotional resource metadata against the current `src/types/emotional.ts` contract before saving to `sys_training_resource.meta_data`.
- [x] **EDITOR-04**: Existing v1.0 emotional resources can be loaded back into the new visual editors without requiring manual data migration.

### Scene Selection & Launch

- [ ] **SCENE-01**: Teacher can open a scene selector page before entering `情绪与场景` training and browse all active `emotion_scene` resources for自主选题.
- [ ] **SCENE-02**: Teacher can open a scene selector page before entering `表达关心` training and browse all active `care_scene` resources for自主选题.
- [ ] **SCENE-03**: Scene selector cards present cover, title, difficulty, and emotion color cues in a touch-friendly layout aligned with PRD section 9 special-education UX rules.
- [ ] **SCENE-04**: Clicking a scene card launches the corresponding training page with explicit `resourceId`, replacing the current implicit `LIMIT 1` fallback path for normal entry.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EDITOR-03 | Phase 6 | Completed |
| EDITOR-04 | Phase 6 | Completed |
| EDITOR-01 | Phase 7 | Completed |
| EDITOR-02 | Phase 7 | Completed |
| SCENE-01 | Phase 8 | Planned |
| SCENE-02 | Phase 8 | Planned |
| SCENE-03 | Phase 8 | Planned |
| SCENE-04 | Phase 8 | Planned |

## Out Of Scope For v1.1

- Dynamic route generation from `ModuleRegistry`
- Emotional records/report redesign
- Bulk import/export for emotional scenes
- Cloud sync, online resource library, or AI-generated scene content
- Database field migration from `meta_data` to a new persistence column

## Deferred / Future Follow-ups

- **REPORT-01**: Teacher can view scene-type mastery and prompt-level patterns on emotional reports.
- **AUTHOR-01**: Admin can duplicate an existing emotional scene as a new draft template.
- **AUTHOR-02**: Admin can batch import/export emotional scene resources.

---
*Defined on 2026-03-17 for milestone v1.1*
