# Phase 09: Emotional Resource Pack Import & Export - Context

**Gathered:** 2026-03-18
**Status:** Ready for execution
**Source:** v1.2 milestone kickoff + `.planning/ROADMAP.md` backlog promotion

<domain>
## Phase Boundary

Phase 09 delivers the full v1.2 milestone for emotional resource pack exchange.

The phase must:
- support batch import/export of preset emotional resources
- accept standard JSON packs first, then Excel workbook imports/exports
- convert both formats into the existing emotional metadata contract
- persist through `sys_training_resource.meta_data`
- land inside the current Resource Center emotional management flow

The phase must not:
- add new schema tables
- introduce native dependencies
- bundle binary local assets
- expand into a generic all-module importer

</domain>

<decisions>
## Implementation Decisions

### Locked Decisions

- `src/types/emotional.ts` is the canonical runtime contract.
- `src/views/resource-center/editors/emotional-resource-contract.ts` is the canonical normalization / validation boundary.
- Duplicate detection uses `resourceType + sceneCode`.
- JSON pack handling lands before Excel workbook handling.
- Excel workbook parsing must reuse the existing `xlsx` dependency.
- Resource Center remains the user-facing entry point; do not create a detached admin tool page.

### Claude's Discretion

- Exact component/file names for the import/export dialog and parser utilities.
- Exact Excel workbook sheet names, as long as nested emotional structures can be round-tripped deterministically.
- Whether batch persistence is implemented as new `ResourceAPI` methods or as an import service layered on top of current CRUD methods.

</decisions>

<specifics>
## Specific Ideas

- JSON pack should include schema version metadata and a resource list with base fields plus typed emotional metadata.
- Excel workbook should flatten nested structures into multi-sheet tables rather than storing raw JSON inside cells.
- Import UI should provide preview, validation summary, duplicate strategy selection, and success/failure counts.
- Export flow should support current emotional resources already managed through visual editors and scene selectors.

</specifics>

<deferred>
## Deferred Ideas

- Binary image / cover packaging
- Online marketplace or cloud sync
- Cross-module generic resource pack framework
- Advanced audit history for import jobs

</deferred>

---

*Phase: 09-emotional-resource-pack-import-export*
*Context gathered: 2026-03-18 via milestone kickoff*
