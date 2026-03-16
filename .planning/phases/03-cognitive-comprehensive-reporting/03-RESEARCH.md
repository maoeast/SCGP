# Phase 3: Cognitive & Comprehensive Reporting - Research Document

**Research Date:** 2026-03-12
**Phase:** 03-cognitive-comprehensive-reporting
**Status:** Research Complete - Ready for Planning

---

## 1. Executive Summary

Phase 3 has two coupled deliverables:

1. Add a V1 cognitive assessment to the existing `ScaleDriver` flow.
2. Add a teacher-facing comprehensive report that aggregates already-existing assessment results across Sensory, Emotional/Social, and Cognitive domains.

The codebase already has a strong shared assessment runtime for question flow, scoring, feedback, and report navigation. It does **not** yet have a driver-agnostic system for:

- registering new report types end-to-end
- persisting cross-scale report snapshots
- converting per-scale results into a shared module-summary contract

That means Phase 3 should be planned as **two parallel foundations plus two integration plans**:

- cognitive assessment foundation
- comprehensive report aggregation foundation
- cognitive runtime/report integration
- comprehensive report UI/generation integration

---

## 2. Current Codebase Truths

### 2.1 ScaleDriver already solves the assessment core

The current architecture is centered on:

- `src/types/assessment.ts`
- `src/strategies/assessment/BaseDriver.ts`
- `src/strategies/assessment/index.ts`
- `src/views/assessment/AssessmentContainer.vue`

What is already reusable:

- `ScaleDriver` contract for question supply, scoring, feedback, progress, and navigation
- `BaseDriver` shared behavior
- `QuestionCard.vue` generic rendering
- `WelcomeDialog.vue` generic intro
- unified assessment runtime in `AssessmentContainer.vue`

Implication:

- A V1 cognitive assessment should follow the same driver path as SDQ, SRS-2, and CBCL unless the chosen scale requires a custom pre-form.

### 2.2 Entry points are still explicit, not automatic

New scales are not discovered automatically. They must be wired in multiple places:

- `src/strategies/assessment/index.ts` driver registry
- `src/views/assessment/AssessmentSelect.vue` scale card
- `src/views/assessment/SelectStudent.vue` valid scale mapping
- `src/views/assessment/AssessmentContainer.vue` save branch
- `src/router/index.ts` report route
- `src/views/Reports.vue` filter label, route map, and report-type handling

Implication:

- MOD-03 cannot be completed by adding only one driver file.

### 2.3 Report indexing is centralized, but report types are hardcoded

`ReportAPI` in `src/database/api.ts` provides:

- `saveReportRecord`
- `getReportList`
- `getReportStatistics`

But the following are hardcoded:

- `report_type` TypeScript union
- statistics buckets
- route mapping in `Reports.vue`
- SQLite `CHECK(report_type IN (...))` in database init/migration files

Implication:

- the comprehensive report must be treated as a first-class report type, not only a computed page with no record.

### 2.4 Existing reports are per-scale Vue pages

Current report pages are explicit views such as:

- `src/views/assessment/sdq/Report.vue`
- `src/views/assessment/srs2/Report.vue`
- `src/views/assessment/cbcl/Report.vue`
- `src/views/assessment/csirs/Report.vue`

Patterns observed:

- card-based Element Plus layouts
- small amounts of high-value charting
- direct print or existing export helpers
- report pages load persisted assessment data, then present interpretation

Implication:

- the comprehensive report should also be a persisted report page with its own route and report record.

### 2.5 No production-ready cognitive scale exists in the repo yet

There is no implemented cognitive driver, question bank, table, or report page.

There is also no clear production-ready source document in `docs/references/` for a single named cognitive scale comparable to SDQ/SRS-2/CBCL. The strongest historical product hint is the older assessment refactor design, which describes cognitive assessment in terms of:

- attention
- memory
- executive function

This is an inference from `docs/plans/2025-02-17-assessment-module-refactor-design.md`, not an already-shipped contract.

Implication:

- Phase 3 must explicitly establish a V1 cognitive assessment definition before driver/runtime integration.

---

## 3. Recommended Technical Direction

### 3.1 MOD-03: Build a V1 cognitive screen, not an over-ambitious clinical system

Recommended V1 shape:

- scale code: `cognitive`
- audience: teachers / intervention staff
- format: standard question-driven scale compatible with `QuestionCard.vue`
- core dimensions: attention, memory, executive function
- output: concise strengths / difficulties / suggestions rather than deep norm-heavy psychometrics

Why this direction fits the codebase:

- lowest-risk fit for the current `ScaleDriver` architecture
- no custom wizard is required unless later evidence demands it
- matches the repo's recent practical, teacher-facing reporting style
- provides a clean cognitive section for the comprehensive report

### 3.2 MOD-04: Aggregate through adapters, not by copying whole reports

The user explicitly chose:

- summary-first + module-by-module
- module conclusion level aggregation
- no forced cross-scale normalization
- generate with whatever module data exists

The best fit is an **adapter-based aggregation layer**:

1. Each supported scale exposes a compact `ComprehensiveModuleSummary`.
2. A generator groups summaries into report sections:
   - Sensory
   - Emotional/Social
   - Cognitive
3. The generator writes a persisted snapshot for stable viewing/printing.

Recommended adapter inputs:

- `csirs`
- `sdq`
- `srs2`
- `cbcl`
- `conners-psq`
- `conners-trs`
- `cognitive` (new in this phase)

Recommended output contract per card:

- module code
- source scale code / title
- assessment date
- one-paragraph conclusion
- strengths list
- difficulties list
- suggestion list
- optional chart payload
- missing-data / unavailable-state metadata

This keeps the comprehensive report unified in reading experience without pretending all scales share a single numeric model.

### 3.3 Persist a comprehensive report snapshot

Do not make the comprehensive report a purely live-computed page from latest assessments.

Recommended persistence:

- new snapshot table for comprehensive reports
- store source assessment IDs and generated summary JSON
- create a `report_record` row with `report_type = 'comprehensive'`

Why:

- viewing is stable even if underlying assessments later change
- report center can list, filter, delete, and reopen it consistently
- print/export becomes deterministic

### 3.4 Generate from the Reports center first

Recommended V1 user entry:

- add a "生成综合报告" action inside `src/views/Reports.vue`
- require selecting a student first
- run generator
- save snapshot + report record
- route to the comprehensive report page

This is the smallest change that matches the current product structure because the report center already owns report discovery and access.

---

## 4. Implementation Decomposition

### 4.1 Cognitive V1 foundation

Deliver:

- cognitive scale contract and question bank
- feedback / interpretation config
- database schema + API support

Files likely involved:

- `src/types/cognitive.ts`
- `src/database/cognitive-questions.ts`
- `src/config/feedbackConfig.js`
- `src/database/init.ts`
- `src/database/api.ts`

### 4.2 Cognitive runtime and report integration

Deliver:

- `CognitiveDriver`
- assessment entry wiring
- save logic
- cognitive report page
- router/report-center registration

Files likely involved:

- `src/strategies/assessment/CognitiveDriver.ts`
- `src/strategies/assessment/index.ts`
- `src/views/assessment/AssessmentContainer.vue`
- `src/views/assessment/AssessmentSelect.vue`
- `src/views/assessment/SelectStudent.vue`
- `src/views/assessment/cognitive/Report.vue`
- `src/router/index.ts`
- `src/views/Reports.vue`

### 4.3 Comprehensive aggregation foundation

Deliver:

- shared summary types
- per-scale adapter registry
- snapshot generator
- persistence / API

Files likely involved:

- `src/types/comprehensive-report.ts`
- `src/services/reports/comprehensive/*`
- `src/database/init.ts`
- `src/database/api.ts`

### 4.4 Comprehensive report UI integration

Deliver:

- generation action in report center
- teacher-facing comprehensive report page
- print/export behavior tuned for 2-4 pages

Files likely involved:

- `src/views/Reports.vue`
- `src/views/assessment/comprehensive/Report.vue`
- `src/router/index.ts`
- existing print/export helpers if needed

---

## 5. Risks And Mitigations

### Risk 1: Cognitive scope balloons before implementation starts

Reason:

- there is no already-implemented cognitive scale in the repo
- external reference material is weaker than for CBCL/SDQ/SRS-2

Mitigation:

- lock V1 to one teacher-facing cognitive screen
- keep dimensions limited to attention / memory / executive function
- defer deep norms, longitudinal trend, and multi-version outputs

### Risk 2: Comprehensive report becomes a report-of-reports

Reason:

- existing per-scale reports are verbose and heterogeneous

Mitigation:

- adapter layer must emit concise module conclusions
- prohibit copying full raw narratives into the comprehensive page

### Risk 3: Multi-module data availability is uneven

Reason:

- user explicitly wants generation even when some modules are missing

Mitigation:

- snapshot generator must support partial data
- missing modules render honest empty-state cards
- generation should fail only when **no** eligible assessment exists for the student

### Risk 4: Print output becomes too long

Reason:

- combining many scales can easily exceed teacher-friendly length

Mitigation:

- top summary stays lightweight
- only a small number of charts
- module cards use short conclusion/suggestion blocks
- print-specific layout targets 2-4 pages

---

## 6. Validation Architecture

Phase 3 should use a mixed validation strategy:

- automated compile/build safety for every code slice
- targeted manual flow verification for assessment completion, report generation, and print layout

Recommended validation mapping:

- structural changes: `npm run type-check`
- integration/regression safety: `npm run build:web`
- manual flows:
  - start and complete cognitive assessment
  - save and reopen cognitive report
  - generate comprehensive report with partial module data
  - generate comprehensive report with multi-module data
  - verify print output stays readable and within 2-4 pages

Because the repo does not currently include a formal unit/E2E test framework, Phase 3 validation should treat type-check + production build as the automated baseline and record the remaining UI/report checks in `03-VALIDATION.md`.

---

## 7. Planning Recommendation

Recommended plan set:

1. `03.1-cognitive-v1-foundation-PLAN.md`
2. `03.2-cognitive-v1-runtime-PLAN.md`
3. `03.3-comprehensive-report-aggregation-PLAN.md`
4. `03.4-comprehensive-report-ui-PLAN.md`

Recommended waves:

- Wave 1: `03.1`, `03.3`
- Wave 2: `03.2`, `03.4`

This gives the execution phase a clean path: build both foundations first, then integrate both user-facing features.

---

*Research complete: 2026-03-12*
