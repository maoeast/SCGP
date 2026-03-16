# Phase 3: Cognitive & Comprehensive Reporting - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers two connected capabilities:

1. Cognitive assessments should enter the existing `ScaleDriver`-based assessment flow.
2. The system should generate a unified comprehensive report that helps teachers understand a student's development across Sensory, Emotional, Social, and Cognitive domains.

This phase clarifies how the comprehensive report should be structured and how cross-module results should be aggregated.
It does **not** expand scope into training-record fusion, IEP fusion, or new business modules.

</domain>

<decisions>
## Implementation Decisions

### Comprehensive report structure
- The comprehensive report should use a **summary-first + module-by-module** structure.
- It should **enter content directly**, not open with a separate formal cover page.
- The default reading order should be:
  - Sensory
  - Emotional/Social
  - Cognitive
- The primary audience is **teachers and intervention staff**, so the tone should be practical rather than heavily clinical.
- The report should emphasize **strengths, difficulties, and next-step suggestions** instead of score-heavy comparison.

### Summary and module presentation
- The homepage/top section should stay **lightweight**, showing only key conclusions and core takeaways.
- Each module section should primarily use **conclusion cards + suggestion cards**.
- Cross-module guidance should **not** be extracted into a single global advice block at the top or bottom.
- Advice should live **inside each module section**, close to the evidence and conclusions of that module.
- The report should use **a small number of high-value charts**, not a chart-heavy layout.
- The printable version should aim for **2-4 pages** rather than a long formal dossier.

### Aggregation rules
- Version 1 of the comprehensive report should aggregate **whatever assessment results already exist** for the student.
- The report should **not require all four domains** to be present before generation.
- Different modules should be shown **side by side in one report**, but the system should **not force a single cross-scale numeric comparison model**.
- Aggregation should happen at the **module conclusion level**, not by copying full per-scale narrative content into the comprehensive report.
- Version 1 should **exclude training-record integration and IEP integration** from the comprehensive report body.

### Claude's Discretion
- Which cognitive assessment(s) should be connected first, as long as they fit the existing `ScaleDriver` path and Phase 3 scope.
- The exact visual hierarchy, spacing, iconography, and chart style.
- The specific wording used for missing or not-yet-assessed modules, provided it stays honest and easy for teachers to understand.
- Whether Sensory and Emotional/Social should be rendered as separate cards or grouped under higher-level visual sections, as long as the reading order remains consistent.

</decisions>

<specifics>
## Specific Ideas

- The report should feel like a **teacher-facing student portrait**, not a hospital-style document.
- It should help a teacher answer:
  - What is this student's current overall picture?
  - Which module needs attention most?
  - What can I do next?
- "Unified report" here means **unified reading experience**, not a mathematically forced unified score.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/views/Reports.vue`: Existing report center and report entry pattern.
- Existing per-scale report pages (for example SDQ, SRS-2, CBCL, S-M, WeeFIM): Reusable card-based report language and export/print expectations.
- Existing `ScaleDriver` architecture: Cognitive assessment entry should follow the same assessment-container pattern already used by other scales.

### Established Patterns
- Report pages currently lean on Element Plus card layouts plus selective chart usage.
- The system already supports report viewing from the central Reports page rather than inventing a parallel report入口.
- Recent phases favored practical interpretation content over raw data dumps.

### Integration Points
- `src/views/Reports.vue` for report listing and access.
- Existing assessment report components and export helpers for print/PDF behavior.
- `ScaleDriver` + unified assessment container for any new cognitive assessment workflow.

</code_context>

<deferred>
## Deferred Ideas

- Integrating training record summaries into the comprehensive report.
- Integrating IEP generation results directly into the comprehensive report.
- Building a single cross-module normalized score model.
- Adding multi-version output modes such as separate concise and detailed comprehensive report editions.

</deferred>

---

*Phase: 03-cognitive-comprehensive-reporting*
*Context gathered: 2026-03-12*
