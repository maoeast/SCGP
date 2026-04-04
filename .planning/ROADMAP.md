# Roadmap

## Archived Milestones

- ✅ `v1.6 Emotional Engine Refactoring` — shipped 2026-04-04
  - Archive: `.planning/milestones/v1.6-ROADMAP.md`
- ✅ `v1.5 Strict Modular Licensing` — shipped 2026-03-19
  - Archive: `.planning/milestones/v1.5-ROADMAP.md`
- ✅ `v1.4 Dashboard Special Ed Command Center` — shipped 2026-03-19
  - Archive: `.planning/milestones/v1.4-ROADMAP.md`
- ✅ `v1.3 Unified Assessment Word Export` — shipped 2026-03-18
  - Archive: `.planning/milestones/v1.3-ROADMAP.md`
- ✅ `v1.2 Emotional Resource Pack Import & Export` — shipped 2026-03-18
  - Archive: `.planning/milestones/v1.2-ROADMAP.md`
- ✅ `v1.1 Emotional Authoring & Scene Gallery` — shipped 2026-03-17
  - Archive: `.planning/milestones/v1.1-ROADMAP.md`
- ✅ `v1.0 Emotional MVP` — shipped 2026-03-17
  - Archive: `.planning/milestones/v1.0-ROADMAP.md`

## Current Milestone

### Milestone v1.7: CNBS-R2016 Assessment Integration

**Status:** In planning  
**Phases:** 17-20  
**Total Plans:** 4

## Overview

v1.7 integrates the `0-6岁儿童发育行为评估量表（儿心量表Ⅱ / CNBS-R2016）` into the existing SCGP assessment mainline. The milestone reuses `AssessmentContainer`, `ScaleDriver`, per-scale assessment tables, and `report_record` while adding the CNBS-R2016 item bank, month-group basal/ceiling logic, MA/DQ scoring, report rendering, and runtime verification based on the official PDF standard.

## Phases

### Phase 17: CNBS-R2016 Question Bank & Standardization Foundation

**Goal**: Convert the official CNBS-R2016 materials into SCGP-ready structured data and align feedback assets with the official PDF scoring standard before any runtime logic is implemented.  
**Depends on**: —  
**Plans**: 1 plan
**Status:** Not started

Plans:

- [ ] 17-01: Digitize CNBS-R2016 item bank and normalize score / feedback assets

**Requirements:** `BANK-01`, `BANK-02`, `BANK-03`

**Success criteria:**
1. A typed CNBS-R2016 seed file exists in code and covers the official item bank with domain, month-group, and score-weight metadata.
2. Domain codes, month-group values, and item IDs are stable enough for driver logic, persistence, and report cross-reference.
3. CNBS-R2016 feedback config and status mapping use the official PDF DQ thresholds instead of older drifted draft values.
4. Any remaining ambiguities between PDF, PRD, and config assets are resolved into one implementation-ready source of truth.

### Phase 18: Unified CNBS-R2016 Driver & Scoring Logic

**Goal**: Implement CNBS-R2016 inside the existing unified assessment runtime, including Pass/Fail interaction, month-group basal/ceiling logic, auto-fill metadata, and MA/DQ scoring.  
**Depends on**: Phase 17  
**Plans**: 1 plan
**Status:** Not started

Plans:

- [ ] 18-01: Build `Cnbsr2016Driver` with official testing and scoring rules

**Requirements:** `FLOW-02`, `FLOW-03`, `FLOW-04`, `SCORE-01`, `SCORE-02`, `SCORE-03`, `SCORE-04`

**Success criteria:**
1. CNBS-R2016 runs inside the current `AssessmentContainer` without introducing a separate assessment subsystem.
2. The driver chooses start points from chronological age in months and navigates by official month-group forward/backward testing rules.
3. Auto-filled pass/fail items are persisted in runtime answers with explicit `is_auto_filled` and `auto_fill_reason` metadata.
4. The score result exposes five domain MAs, total MA, DQ, and PDF-standard DQ status instead of mastery-rate semantics.

### Phase 19: Persistence, Entry Wiring, and Report Integration

**Goal**: Add CNBS-R2016 database tables, API methods, entry wiring, report records, and a dedicated report page that fits the current SCGP reporting chain.  
**Depends on**: Phase 18  
**Plans**: 1 plan
**Status:** Not started

Plans:

- [ ] 19-01: Wire CNBS-R2016 persistence, routing, report records, and report page

**Requirements:** `FLOW-01`, `PERS-01`, `PERS-02`, `PERS-03`, `RPT-01`, `RPT-02`

**Success criteria:**
1. `cnbsr2016_assess` and `cnbsr2016_assess_detail` exist and are written through the current database/API conventions.
2. CNBS-R2016 can be launched from unified assessment entry and report routes resolve through the existing router/report center/student-detail patterns.
3. Report records use `report_type = 'cnbsr2016'` and open the correct report directly.
4. The CNBS-R2016 report page presents CA, domain MAs, total MA, DQ, official status, age-bracket commentary, and IEP targets without reusing mastery-rate language.

### Phase 20: Runtime QA & Standard Verification

**Goal**: Validate the CNBS-R2016 implementation against the local dev database and the official standard so runtime behavior, persistence, and report output are clinically consistent.  
**Depends on**: Phase 19  
**Plans**: 1 plan
**Status:** Not started

Plans:

- [ ] 20-01: Verify CNBS-R2016 runtime flow, stored data, and standard alignment end to end

**Requirements:** `SCORE-05`, `QA-01`, `QA-02`

**Success criteria:**
1. At least one real CNBS-R2016 assessment is completed against the local dev DB and produces valid main/detail/report records.
2. Manual and targeted automated checks confirm basal/ceiling behavior, auto-fill metadata, score-weight sums, total MA, DQ, and status mapping.
3. Report commentary and intervention suggestions are selected from the corrected feedback config using the same thresholds implemented in code.
4. Any remaining drift between source documents, config, and runtime output is documented and resolved before milestone closeout.

## Milestone Summary

**Key Decisions:**

- Reuse the current `AssessmentContainer + ScaleDriver + per-scale table + report_record` assessment architecture for CNBS-R2016.
- Treat the official `WS/T 580—2017` PDF as the normative source for DQ thresholds and month-group testing rules.
- Make structured item-bank digitization the first milestone phase because no SCGP-ready CNBS-R2016 question seed exists yet.
- Keep FMDA runtime QA, training-record closeout, resource-center redesign, and broader platform debt outside v1.7 scope.

**Issues To Resolve:**

- No structured CNBS-R2016 item bank exists in code yet.
- Existing CNBSR2016 feedback-config material must stay synchronized with the official PDF thresholds.
- MA/DQ reporting semantics differ materially from the mastery-rate scales already in SCGP and must not be mixed.

**Issues Deferred:**

- FMDA runtime QA and real-flow validation.
- Unified training-record hard-cut closeout and resource-center redesign.
- Route/menu static assembly cleanup and other broader platform debt.

## Future Backlog

- FMDA runtime QA, local DB inspection, and report-chain verification.
- Unified training-record hard-cut closeout and residual old-record cleanup.
- Resource-center redesign and legacy teaching-material seed cleanup.
- Platform debt cleanup around static route/menu assembly, backup/restore coverage, and resource lifecycle closure.
- CNBS-R2016 export payload support after the core integration is stable.
