# REQUIREMENTS

## Milestone v1.2: Emotional Resource Pack Import & Export

**Defined:** 2026-03-18
**Core Value:** Teachers and admins can exchange structured emotional training resources without breaking the current local-first resource architecture.

## v1 Requirements

### Pack Format & Export

- [ ] **PACK-01**: Admin can export one or more `emotion_scene` / `care_scene` resources as a standard JSON pack that preserves `resourceType`, base resource fields, tags, and normalized `meta_data`.
- [ ] **PACK-02**: Admin can download and export an Excel workbook format for emotional resource packs so schools can review or author packs offline without editing database records.

### Import Parsing & Validation

- [ ] **IMPT-01**: Admin can upload a JSON pack and preview per-resource validation results before any records are written.
- [ ] **IMPT-02**: Admin can upload an Excel workbook for `emotion_scene` and `care_scene`, and the system converts workbook sheets into the current `src/types/emotional.ts` metadata contract.
- [ ] **IMPT-03**: System blocks invalid resources from persistence and shows teacher-readable row/resource errors that point to the failing field or nested item.
- [ ] **IMPT-04**: Admin can choose a duplicate handling strategy for matching `resourceType + sceneCode` imports (`skip`, `update existing`, or `import as copy`).

### Integration & Compatibility

- [ ] **INTEG-01**: Imported emotional resources are persisted through the existing `ResourceAPI` / `sys_training_resource.meta_data` path with no schema migration.
- [ ] **INTEG-02**: Newly imported resources appear in current Resource Center editors, emotional scene selector pages, and training runtime without additional repair steps.
- [ ] **INTEG-03**: Exported demo/custom emotional resources can complete a JSON round-trip and an Excel round-trip without losing required metadata fields.

## v2 Requirements

### Emotional Resource Exchange Extensions

- **PACK-03**: Resource packs can bundle local image assets instead of only exchanging metadata and image URL references.
- **PACK-04**: Resource pack tooling expands from `emotional` into a generic cross-module import/export framework.
- **PACK-05**: Schools can merge packs with richer conflict resolution, change history, and audit logs.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Binary image/file packaging inside resource packs | Current milestone is scoped to metadata conversion into `sys_training_resource.meta_data`, not physical asset bundling |
| Cloud sync or online pack marketplace | Violates current local-first milestone boundary and adds unrelated infrastructure |
| New database tables for import jobs | Current architecture already has a suitable persistence path through `sys_training_resource` |
| Generic training-resource importer for every module | v1.2 is intentionally scoped to `emotional` to validate the pack contract first |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PACK-01 | Phase 9 | Pending |
| PACK-02 | Phase 9 | Pending |
| IMPT-01 | Phase 9 | Pending |
| IMPT-02 | Phase 9 | Pending |
| IMPT-03 | Phase 9 | Pending |
| IMPT-04 | Phase 9 | Pending |
| INTEG-01 | Phase 9 | Pending |
| INTEG-02 | Phase 9 | Pending |
| INTEG-03 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after milestone v1.2 definition*
