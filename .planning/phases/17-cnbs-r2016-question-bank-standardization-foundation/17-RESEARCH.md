# Phase 17: CNBS-R2016 Question Bank & Standardization Foundation - Research

**Researched:** 2026-04-04
**Domain:** CNBS-R2016 item-bank digitization, official scoring standardization, and code-ready feedback normalization
**Confidence:** HIGH

<user_constraints>
## User Constraints / Locked Decisions

- Integrate `0-6岁儿童发育行为评估量表（儿心量表Ⅱ / CNBS-R2016）` into the existing SCGP unified assessment system.
- Reuse `AssessmentContainer + ScaleDriver + per-scale tables + report_record`; do not build a separate assessment subsystem.
- DQ status thresholds must follow the official PDF standard `WS/T 580—2017`, not older draft PRD/config values.
- FMDA runtime QA, unified training-record closeout, resource-center redesign, and broader platform debt are deferred and must not be pulled into v1.7.

### Locked Source-of-Truth Order

1. Official PDF: `docs/references/儿心量表Ⅱ/0-6岁儿童发育行为评估量表（儿心量表Ⅱ）.pdf`
2. Local implementation PRD: `docs/references/儿心量表Ⅱ/SCGP-CNBS-R2016-PRD.txt`
3. Feedback corpus draft: `docs/references/儿心量表Ⅱ/CNBSR2016FeedbackConfig.js`

### Claude's Discretion

- Exact file split for typed CNBS-R2016 question data and verifier scripts.
- Whether to keep the CNBS-R2016 feedback asset inside `src/config/feedbackConfig.js` or factor part of it into a dedicated helper while preserving current report-page consumption patterns.
- Whether to keep source-audit metadata on every item (`sourcePage`, `sourceOrder`, `sourceStatus`) or only on the generated dataset/module headers.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BANK-01 | Teacher can launch CNBS-R2016 from SCGP using a structured typed question bank that covers all official items with correct domain, month-group, and score-weight metadata. | Phase 17 must produce a typed item-bank module and item-bank verifier before any driver work starts. |
| BANK-02 | CNBS-R2016 feedback and status mapping use the official PDF DQ thresholds and age-bracket rules consistently across driver logic and report rendering. | Research identifies the threshold drift between the official PDF and the current local feedback-config draft; phase output must standardize this now. |
| BANK-03 | CNBS-R2016 item metadata preserves the five official domains `gm`, `fm`, `ad`, `la`, and `sb`, plus the month-group values needed for standard forward/backward testing. | Research maps the official scale structure, required metadata fields, and weight derivation model needed for later basal/ceiling and MA/DQ logic. |
</phase_requirements>

## Summary

Phase 17 is a data-foundation phase, not a runtime phase. The current repo already proves the architecture for new scales:

- driver registration in `src/strategies/assessment/index.ts`
- unified runtime in `src/views/assessment/AssessmentContainer.vue`
- per-scale tables in `src/database/init.ts`
- per-scale persistence APIs in `src/database/api.ts`
- report routing and student-detail record aggregation in `src/router/index.ts` and `src/views/student-detail/assessment-records.ts`

The gap is not framework support. The gap is source data quality. The reference folder has the official PDF, a PRD, and a large feedback corpus, but there is no structured SCGP-ready CNBS-R2016 item bank file in code. Until that typed item bank exists, every downstream phase would be planning against unstable manual interpretation.

The second risk is standards drift. The local PRD and feedback draft previously used non-official DQ thresholds (`130/115/85/70` style cutoffs), while the official PDF standard uses:

- `> 130` → 优秀
- `110 ~ 129` → 良好
- `80 ~ 109` → 中等
- `70 ~ 79` → 临界偏低
- `< 70` → 智力发育障碍 / 发育迟缓

If Phase 17 does not normalize the feedback asset to these thresholds now, then later `Cnbsr2016Driver` scoring and the report page will drift even if the code is otherwise correct.

**Primary recommendation:** Phase 17 should first establish a typed CNBS-R2016 data contract and two verifier scripts, then populate the full 261-item bank and normalize the feedback/config asset against the official PDF so later implementation phases can be largely mechanical.

## Existing SCGP Patterns To Reuse

### Pattern 1: Typed Item Bank Module

The nearest precedent is `src/database/fine-motor-questions.ts`, which combines:
- domain definitions
- typed question shape
- exported question list
- exported `ScaleQuestion[]` adapter helpers

**Recommendation for CNBS-R2016:**

Create a dedicated typed module, preferably split into:
- `src/types/cnbsr2016.ts`
- `src/database/cnbsr2016-questions.ts`

The dedicated type module avoids forcing later driver/report code to import a 261-item dataset just to reuse type definitions.

### Pattern 2: Per-Scale Persistence Reality

`src/database/init.ts` and `src/database/api.ts` already show the current product pattern:
- every assessment scale gets its own main table
- every scale needing item-level truth gets its own detail table
- `report_record` routes reports by explicit `report_type`

Phase 17 should not try to redesign this. It only needs to prepare the data contract that later phases will persist.

### Pattern 3: Heavy CNBS-R2016 Feedback Should Stay Separate

Current report pages read from `src/config/feedbackConfig.js` via `ASSESSMENT_LIBRARY`, but CNBS-R2016 is already much larger than the existing shared assessment config corpus.

Phase 17 should therefore split CNBS-R2016 config into two layers:

- `src/config/cnbsr2016-thresholds.ts`
  - lightweight runtime constants for DQ bands, age brackets, and domain labels
- `src/config/CNBSR2016FeedbackConfig.js`
  - heavy narrative corpus for overall summaries, domain commentary, IEP suggestions, and expert advice

This keeps future driver logic on a small static import while leaving the large feedback narrative on the CNBS-R2016 report path only. It also avoids turning `src/config/feedbackConfig.js` into a monolithic 300 KB config blob that unrelated scales would parse.

## Canonical CNBS-R2016 Data Contract

### Recommended Type Split

```text
src/types/cnbsr2016.ts
src/database/cnbsr2016-questions.ts
src/config/cnbsr2016-thresholds.ts
src/config/CNBSR2016FeedbackConfig.js
scripts/verify-cnbsr2016-item-bank.mjs
scripts/verify-cnbsr2016-feedback.mjs
```

### Recommended Domain Model

```typescript
export type Cnbsr2016DomainCode = 'gm' | 'fm' | 'ad' | 'la' | 'sb'

export interface Cnbsr2016QuestionData {
  id: number
  itemCode: string
  domain: Cnbsr2016DomainCode
  domainName: string
  ageGroupMonths: number
  ageBand: '1_12' | '15_36' | '42_84'
  scoreWeight: number
  title: string
  prompt: string
  passCriteria: string | null
  sourcePage: string | null
  sourceOrder: number
  sourceStatus: 'digitized'
}
```

### Required Allowed Month Groups

The PDF standard and local PRD together imply these month-group anchors must be representable:

`1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 21, 24, 27, 30, 33, 36, 42, 48, 54, 60, 66, 72, 78, 84`

The verifier script should fail if any item uses a non-standard month group.

### Weight Rules

Weight is derived from age band, not hand-written ad hoc:

- month groups `1 ~ 12`: domain total per month group = `1.0`
- month groups `15 ~ 36`: domain total per month group = `3.0`
- month groups `42 ~ 84`: domain total per month group = `6.0`

If a domain has:
- `1` item in a month group → full weight
- `2` items → half weight each

The verifier should compute these weights from grouping counts rather than trusting manual transcription blindly.

## Recommended Validation Architecture

### Validation Architecture

Phase 17 should create two lightweight Node verifiers, not a runtime OCR path:

1. `scripts/verify-cnbsr2016-item-bank.mjs`
   - imports the typed question bank
   - asserts total item count = `261`
   - asserts all domains are in `gm/fm/ad/la/sb`
   - asserts all `ageGroupMonths` are from the allowed list
   - asserts `scoreWeight` values match band/group cardinality rules
   - prints explicit passes like:
     - `PASS total-items`
     - `PASS domains`
     - `PASS month-groups`
     - `PASS score-weights`

2. `scripts/verify-cnbsr2016-feedback.mjs`
   - reads `src/config/cnbsr2016-thresholds.ts` and `src/config/CNBSR2016FeedbackConfig.js`
   - asserts DQ bands reflect the official PDF standard
   - asserts all required age brackets `a1/a2/a3/a4` exist
   - asserts five domains exist in dimension commentary / intervention sections
   - prints explicit passes like:
     - `PASS dq-thresholds`
     - `PASS age-brackets`
     - `PASS domain-feedback`

These scripts are better than tests-only planning because Phase 17 is largely data integrity work, not algorithm execution yet.

### Recommended Quick / Full Feedback Loop

- Quick: `node scripts/verify-cnbsr2016-item-bank.mjs && node scripts/verify-cnbsr2016-feedback.mjs`
- Structural type safety: `npm run type-check`
- Full: `npm run type-check && npm run build:web`

## Recommended Task Shape For Phase 17

### Task A: Create the typed CNBS-R2016 schema and verifiers first

Do not start with a giant 261-item paste. Create the types and validation scaffolding first so data entry has guardrails.

### Task B: Digitize the full item bank into code

Populate the full seed after the verifier exists. This reduces silent mistakes in month groups and weight distribution.

### Task C: Normalize the lightweight thresholds and heavy feedback asset together

Do this in the same phase so later driver/report work cannot reintroduce threshold drift while also keeping the heavy narrative asset out of the shared `feedbackConfig.js` path.

## Common Pitfalls

### Pitfall 1: Copying PRD thresholds instead of PDF thresholds

**What goes wrong:** runtime DQ status and report text disagree with the official standard.
**How to avoid:** treat the PDF as normative and make the feedback verifier enforce exact threshold bands.

### Pitfall 2: Hand-entering score weights without a verifier

**What goes wrong:** one or two incorrect half-weight values make MA/DQ wrong but hard to notice later.
**How to avoid:** compute expected weights from grouped item counts and fail verification on any mismatch.

### Pitfall 3: Treating CNBS-R2016 like a mastery-rate scale

**What goes wrong:** data fields and report copy start mirroring `fine_motor` instead of MA/DQ semantics.
**How to avoid:** keep the Phase 17 data contract grounded in month groups, mental-age points, and DQ language only.

### Pitfall 4: Trying to solve runtime UI in the foundation phase

**What goes wrong:** planning scope expands into `AssessmentContainer` UI, routing, or report implementation too early.
**How to avoid:** Phase 17 should only prepare stable structured inputs for phases 18 and 19.

### Pitfall 5: Editing only the docs reference copy of the feedback config

**What goes wrong:** docs say one thing, runtime config says another.
**How to avoid:** normalize the app-consumed config path in Phase 17 and use a verifier script against the app-facing source.

## Specific Recommendations

- Use integer `question_id` values `1..261` to match existing per-scale detail-table conventions.
- Keep `itemCode` human-readable, e.g. `cnbsr2016_001`.
- Store both `title` and `prompt` if the digitized item wording benefits from a short label plus full observation text.
- Keep `passCriteria` nullable because some Appendix A rows may need Appendix B wording later.
- Preserve audit metadata (`sourcePage`, `sourceOrder`) while digitizing; it will help resolve disputes during Phase 20 QA.
- Do not add OCR or native PDF parsing dependencies to the app runtime. Any extraction helper must stay as an offline script or manual process artifact.

## Recommended File Targets

### Primary files Phase 17 should modify

- `src/types/cnbsr2016.ts`
- `src/database/cnbsr2016-questions.ts`
- `src/config/cnbsr2016-thresholds.ts`
- `src/config/CNBSR2016FeedbackConfig.js`
- `scripts/verify-cnbsr2016-item-bank.mjs`
- `scripts/verify-cnbsr2016-feedback.mjs`

### Files Phase 17 should read but not modify

- `docs/references/儿心量表Ⅱ/0-6岁儿童发育行为评估量表（儿心量表Ⅱ）.pdf`
- `docs/references/儿心量表Ⅱ/SCGP-CNBS-R2016-PRD.txt`
- `docs/references/儿心量表Ⅱ/CNBSR2016FeedbackConfig.js`
- `src/database/fine-motor-questions.ts`
- `src/config/feedbackConfig.js`
- `src/config/CNBSR2016FeedbackConfig.js`

## Bottom Line

Phase 17 succeeds if it turns CNBS-R2016 from “reference materials sitting in `docs/`” into “typed, verified, code-ready assets.” If that foundation is solid, Phase 18 and Phase 19 become normal integration work. If it is weak, every downstream phase will carry silent scoring and reporting risk.
