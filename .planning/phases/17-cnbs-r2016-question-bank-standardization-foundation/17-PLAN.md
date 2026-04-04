---
wave: 1
depends_on: []
requirements_addressed:
  - BANK-01
  - BANK-02
  - BANK-03
files_modified:
  - src/types/cnbsr2016.ts
  - src/database/cnbsr2016-questions.ts
  - src/config/cnbsr2016-thresholds.ts
  - src/config/CNBSR2016FeedbackConfig.js
  - scripts/verify-cnbsr2016-item-bank.mjs
  - scripts/verify-cnbsr2016-feedback.mjs
autonomous: true
---

# Plan 17.1: CNBS-R2016 Question Bank & Standardization Foundation

## Goal

Turn CNBS-R2016 from a bundle of reference materials in `docs/references/儿心量表Ⅱ/` into typed, verified, code-ready SCGP assets so later driver, persistence, and report integration work can proceed without scoring-rule drift.

## Context

- The current repo already supports adding scales through `AssessmentContainer`, driver registration, per-scale tables, per-scale APIs, and report routing.
- There is no structured CNBS-R2016 item bank in code yet; only the official PDF, a local PRD, and a draft feedback-config corpus exist.
- The official PDF standard is the normative source for DQ status thresholds, while current draft config text still reflects older non-official cutoffs.
- `src/database/fine-motor-questions.ts` is the best in-repo precedent for a typed, assessment-specific seed module, but CNBS-R2016 differs materially because later scoring will be MA/DQ-based rather than mastery-rate-based.

## Requirements Covered

- BANK-01: Teacher can launch CNBS-R2016 from SCGP using a structured typed question bank that covers all official items with correct domain, month-group, and score-weight metadata.
- BANK-02: CNBS-R2016 feedback and status mapping use the official PDF DQ thresholds and age-bracket rules consistently across driver logic and report rendering.
- BANK-03: CNBS-R2016 item metadata preserves the five official domains `gm`, `fm`, `ad`, `la`, and `sb`, plus the month-group values needed for standard forward/backward testing.

## Tasks

<tasks>
  <task id="17-01-01" requirement="BANK-01,BANK-03">
    <summary>Define the typed CNBS-R2016 data contract and phase-local verifier scaffolding before entering the 261-item bank.</summary>
    <read_first>
      <file>docs/references/儿心量表Ⅱ/SCGP-CNBS-R2016-PRD.txt</file>
      <file>docs/references/儿心量表Ⅱ/0-6岁儿童发育行为评估量表（儿心量表Ⅱ）.pdf</file>
      <file>src/database/fine-motor-questions.ts</file>
      <file>src/types/assessment.ts</file>
      <file>src/config/cnbsr2016-thresholds.ts</file>
      <file>src/config/CNBSR2016FeedbackConfig.js</file>
    </read_first>
    <files>
      <file>src/types/cnbsr2016.ts</file>
      <file>src/database/cnbsr2016-questions.ts</file>
      <file>src/config/cnbsr2016-thresholds.ts</file>
      <file>scripts/verify-cnbsr2016-item-bank.mjs</file>
    </files>
    <action>Create `src/types/cnbsr2016.ts` with the canonical CNBS-R2016 domain codes `gm | fm | ad | la | sb`, the allowed month-group union covering `1,2,3,4,5,6,7,8,9,10,11,12,15,18,21,24,27,30,33,36,42,48,54,60,66,72,78,84`, and a `Cnbsr2016QuestionData` interface containing at least `id`, `itemCode`, `domain`, `domainName`, `ageGroupMonths`, `ageBand`, `scoreWeight`, `title`, `prompt`, `passCriteria`, `sourcePage`, `sourceOrder`, and `sourceStatus`. Create `src/database/cnbsr2016-questions.ts` with exported empty or stubbed `CNBSR2016_DOMAIN_DEFINITIONS`, `CNBSR2016_PASS_FAIL_OPTIONS`, and `CNBSR2016_QUESTIONS` declarations typed against those interfaces. Create `src/config/cnbsr2016-thresholds.ts` as the lightweight CNBS-R2016 runtime config containing official DQ bands, age-bracket definitions, and domain-code mappings so later driver logic does not need to import the heavy narrative corpus. Create `scripts/verify-cnbsr2016-item-bank.mjs` that imports the question-bank module and prints explicit pass/fail checks for total item count, domain code validity, allowed month-group validity, and score-weight validity; implement the score-weight check so later data entry is validated against the official band rules (`1.0`, `3.0`, `6.0`, or their half splits) instead of trusting handwritten values.</action>
    <acceptance_criteria>
      <item>`src/types/cnbsr2016.ts` contains `export type Cnbsr2016DomainCode = 'gm' | 'fm' | 'ad' | 'la' | 'sb'`.</item>
      <item>`src/database/cnbsr2016-questions.ts` contains `export const CNBSR2016_QUESTIONS` and `export const CNBSR2016_PASS_FAIL_OPTIONS`.</item>
      <item>`src/config/cnbsr2016-thresholds.ts` contains `export const CNBSR2016_DQ_BANDS`.</item>
      <item>`scripts/verify-cnbsr2016-item-bank.mjs` contains `PASS total-items`, `PASS domains`, `PASS month-groups`, and `PASS score-weights`.</item>
      <item>`node scripts/verify-cnbsr2016-item-bank.mjs` exits 0 when the stubbed bank satisfies the declared structural rules.</item>
      <item>`npm run type-check` exits 0 after the new types, seed module, and verifier script are introduced.</item>
    </acceptance_criteria>
  </task>

  <task id="17-01-02" requirement="BANK-01,BANK-03">
    <summary>Digitize the full official CNBS-R2016 item bank into the typed seed and lock the month-group / weight model with automated checks.</summary>
    <read_first>
      <file>docs/references/儿心量表Ⅱ/0-6岁儿童发育行为评估量表（儿心量表Ⅱ）.pdf</file>
      <file>docs/references/儿心量表Ⅱ/SCGP-CNBS-R2016-PRD.txt</file>
      <file>src/types/cnbsr2016.ts</file>
      <file>src/database/cnbsr2016-questions.ts</file>
      <file>scripts/verify-cnbsr2016-item-bank.mjs</file>
    </read_first>
    <files>
      <file>src/database/cnbsr2016-questions.ts</file>
      <file>scripts/verify-cnbsr2016-item-bank.mjs</file>
    </files>
    <action>Populate `src/database/cnbsr2016-questions.ts` with the full official CNBS-R2016 item bank from Appendix A/B so `CNBSR2016_QUESTIONS.length === 261`. Use integer `id` values `1..261`, stable `itemCode` values such as `cnbsr2016_001`, official domain codes/names, official month-group anchors, and score weights derived from the month-band grouping rule. For month groups with one item in a domain, assign full weight (`1.0`, `3.0`, or `6.0`); for groups with two items in a domain, assign half weights (`0.5`, `1.5`, or `3.0`). Keep source-audit fields populated enough to trace each digitized row back to the PDF grouping. Update the verifier script to fail on any item-count mismatch, invalid month group, invalid domain code, or score-weight discrepancy against grouped expectations.</action>
    <acceptance_criteria>
      <item>`src/database/cnbsr2016-questions.ts` contains `CNBSR2016_QUESTIONS.length` equivalent data for 261 items.</item>
      <item>`src/database/cnbsr2016-questions.ts` contains `itemCode: 'cnbsr2016_001'` and `itemCode: 'cnbsr2016_261'`.</item>
      <item>`node scripts/verify-cnbsr2016-item-bank.mjs` exits 0 and prints `PASS total-items`.</item>
      <item>`node scripts/verify-cnbsr2016-item-bank.mjs` exits 0 and prints `PASS score-weights`.</item>
      <item>`npm run type-check` exits 0 after the full CNBS-R2016 dataset is populated.</item>
    </acceptance_criteria>
  </task>

  <task id="17-01-03" requirement="BANK-02">
    <summary>Normalize the app-facing CNBS-R2016 feedback asset to the official PDF DQ thresholds and add a verifier so later scoring and reports cannot drift.</summary>
    <read_first>
      <file>docs/references/儿心量表Ⅱ/0-6岁儿童发育行为评估量表（儿心量表Ⅱ）.pdf</file>
      <file>docs/references/儿心量表Ⅱ/CNBSR2016FeedbackConfig.js</file>
      <file>docs/references/儿心量表Ⅱ/SCGP-CNBS-R2016-PRD.txt</file>
      <file>src/config/cnbsr2016-thresholds.ts</file>
      <file>src/config/CNBSR2016FeedbackConfig.js</file>
    </read_first>
    <files>
      <file>src/config/cnbsr2016-thresholds.ts</file>
      <file>src/config/CNBSR2016FeedbackConfig.js</file>
      <file>scripts/verify-cnbsr2016-feedback.mjs</file>
    </files>
    <action>Normalize the light/heavy CNBS-R2016 feedback assets without merging them into the shared `feedbackConfig.js` blob. Keep the narrative corpus in `src/config/CNBSR2016FeedbackConfig.js` and update it so the DQ status labels and ranges match the official PDF standard exactly: `>130` for excellent, `110-129` for good, `80-109` for normal/中等, `70-79` for borderline/临界偏低, and `<70` for delayed/智力发育障碍. In parallel, update `src/config/cnbsr2016-thresholds.ts` so its DQ bands, age-bracket definitions, and domain map match the same official values. Preserve age brackets `a1`, `a2`, `a3`, and `a4`, plus five-domain commentary/intervention structures in `src/config/CNBSR2016FeedbackConfig.js` for the later report page. Create `scripts/verify-cnbsr2016-feedback.mjs` that imports both the lightweight threshold file and the heavy narrative config and prints explicit pass/fail checks for official DQ thresholds, required age-bracket keys, and five-domain feedback coverage so runtime logic and report text cannot silently drift apart.</action>
    <acceptance_criteria>
      <item>`src/config/cnbsr2016-thresholds.ts` contains `CNBSR2016_DQ_BANDS` with the official PDF thresholds.</item>
      <item>`src/config/CNBSR2016FeedbackConfig.js` contains `dq: 'DQ 110~129'`, `dq: 'DQ 80~109'`, and `dq: 'DQ 70~79'` where applicable, and does not contain the old `DQ 115~129` or `DQ 85~114` ranges.</item>
      <item>`scripts/verify-cnbsr2016-feedback.mjs` contains `PASS dq-thresholds`, `PASS age-brackets`, and `PASS domain-feedback`.</item>
      <item>`node scripts/verify-cnbsr2016-feedback.mjs` exits 0 and prints `PASS dq-thresholds`.</item>
      <item>`node scripts/verify-cnbsr2016-feedback.mjs` exits 0 and prints `PASS domain-feedback`.</item>
      <item>`npm run type-check && npm run build:web` exits 0 after the CNBS-R2016 light/heavy feedback assets are normalized.</item>
    </acceptance_criteria>
  </task>
</tasks>

## Verification Criteria

- [ ] A dedicated typed CNBS-R2016 item-bank module exists in code
- [ ] The full CNBS-R2016 item bank is present and verifier-checked for count, domain codes, month groups, and score weights
- [ ] The lightweight CNBS-R2016 threshold config and the heavy CNBS-R2016 narrative config both use official PDF DQ thresholds
- [ ] CNBS-R2016 age brackets and five-domain feedback coverage are verifier-checked
- [ ] `npm run type-check` passes for the new typed data/config modules
- [ ] `npm run build:web` passes after the CNBS-R2016 light/heavy config split is normalized

<must_haves>
- [ ] Phase 17 does not touch runtime routing, driver navigation logic, persistence tables, or report pages yet
- [ ] CNBS-R2016 remains aligned to the existing SCGP assessment architecture rather than creating a parallel subsystem
- [ ] Official PDF thresholds override older draft values wherever there is conflict
- [ ] The heavy CNBS-R2016 narrative corpus stays out of `src/config/feedbackConfig.js`
- [ ] Score weights are mechanically verified from month-group structure rather than manually trusted
- [ ] The output of Phase 17 is code-ready data that Phase 18 and Phase 19 can consume directly
</must_haves>

## Summary

Phase 17 should finish with three stable assets: a typed CNBS-R2016 question bank, a lightweight official-threshold runtime config, and a heavy narrative feedback corpus kept separate from the shared assessment config blob. With verifier scripts guarding both light and heavy assets, later phases can focus on integration rather than continuing to debate the source data.

---

*Plan Status: READY FOR EXECUTION*
*Wave: 1 | Autonomous: true*
