# Roadmap

## Archived Milestones

- ✅ `v1.1 Emotional Authoring & Scene Gallery` — shipped 2026-03-17
  - Archive: `.planning/milestones/v1.1-ROADMAP.md`
- ✅ `v1.0 Emotional MVP` — shipped 2026-03-17
  - Archive: `.planning/milestones/v1.0-ROADMAP.md`

## Current Milestone

### v1.2 Emotional Resource Pack Import & Export

**Goal:** Let admins batch import/export preset emotional resources through standard JSON and Excel workbook formats, then persist them into the existing `sys_training_resource.meta_data` pipeline without changing schema.

**Status:** Execution complete, ready for audit/archive  
**Phases:** 09  
**Total Plans:** 1

## Phases

### Phase 9: Emotional Resource Pack Import & Export

**Goal:** Define a stable emotional resource pack contract, connect batch import/export tooling to Resource Center, and verify round-trip compatibility with the current emotional runtime.  
**Depends on:** Phase 8  
**Plans:** 1 plan  
**Requirements:** PACK-01, PACK-02, IMPT-01, IMPT-02, IMPT-03, IMPT-04, INTEG-01, INTEG-02, INTEG-03

**Success Criteria:**
1. Admin can export selected emotional resources into a JSON pack that preserves typed metadata and pack-level version info.
2. Admin can import JSON packs and Excel workbooks through Resource Center with a preview that shows valid rows, invalid rows, and duplicate resolution outcomes before persistence.
3. The import pipeline normalizes and validates `emotion_scene` / `care_scene` metadata through the existing emotional editor contract before writing into `sys_training_resource.meta_data`.
4. Imported resources immediately appear in Resource Center, scene selector pages, and emotional training runtime without schema migration or manual repair.
5. Demo/custom resources can complete JSON and Excel round-trip verification with required metadata fields preserved.

## Milestone Summary

**Key Decisions:**

- Keep v1.2 inside the current emotional module surface area instead of expanding into a generic cross-module importer.
- Use `src/types/emotional.ts` plus `emotional-resource-contract.ts` as the canonical schema boundary for both JSON and Excel conversion.
- Implement JSON pack handling first, then layer Excel workbook parsing/export on the same intermediate resource DTO.
- Detect duplicates in application logic using `resourceType + sceneCode`, not by adding new schema constraints.

**Issues Deferred:**

- Resource pack bundling of local binary image assets
- Emotional report polish based on richer scene taxonomy
- Cross-module route/menu platformization after current static-route debt is prioritized
- Cognitive assessment foundation (`MOD-03`)
- Multi-module comprehensive reporting (`MOD-04`)

## Future Backlog

- Emotional report polish based on richer scene taxonomy and teacher-facing summaries.
- Resource pack bundling for local cover images / scene illustrations after metadata exchange proves stable.
- Cross-module route/menu platformization after current static-route debt is prioritized.
- Cognitive assessment foundation (`MOD-03`).
- Multi-module comprehensive reporting (`MOD-04`).

Use `$gsd-audit-milestone` when you want to audit/archive the completed v1.2 plan.
