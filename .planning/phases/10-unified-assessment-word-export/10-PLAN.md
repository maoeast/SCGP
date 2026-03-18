# PLAN: Unified Assessment Word Export

**Milestone:** v1.3  
**Phase:** 10  
**Status:** Completed  
**Date:** 2026-03-18

## Goal

Unify assessment report export on a true `docx` pipeline so all targeted scale reports download clean editable Word documents instead of relying on broken PDF buttons or fragmented legacy exporters.

## Deliverables

1. A generic payload-driven Word export renderer based on the existing `docx` stack.
2. Scale-specific payload builders for SDQ, CBCL, SRS2, CSIRS, Conners PSQ/TRS, S-M, and WeeFIM.
3. Assessment report page migration so each target report exposes only `导出Word`.
4. Targeted type-check validation across all touched builder and report files.

## Locked Constraints

- Reuse existing `docx` and `file-saver`; do not add new libraries.
- Preserve Chinese-friendly typography and printable table layout.
- Remove obsolete PDF export entry points from migrated report pages.
- Keep business-specific data shaping in builders, not the generic renderer.

## Execution Order

1. Build `src/utils/export-word.ts`.
2. Add payload builders in `src/utils/assessment-word-builders.ts`.
3. Migrate SDQ and CBCL.
4. Migrate SRS2, CSIRS, Conners PSQ/TRS, S-M, and WeeFIM.
5. Run targeted `vue-tsc` filtering for all touched exporter and report files.

## Acceptance Targets

1. Teachers can export `.docx` reports from all targeted assessment report pages.
2. No migrated report page still exposes the old PDF export button.
3. Exported Word documents preserve the report’s core text and tabular results in readable Chinese formatting.
