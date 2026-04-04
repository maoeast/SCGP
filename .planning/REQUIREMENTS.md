# Requirements: SCGP v1.7 CNBS-R2016 Assessment Integration

**Defined:** 2026-04-04
**Core Value:** SCGP helps special education teachers and rehabilitation staff run structured assessment and intervention workflows in one offline system.

## v1 Requirements

### Question Bank & Standards

- [ ] **BANK-01**: Teacher can launch CNBS-R2016 from SCGP using a structured typed question bank that covers all official items with correct domain, month-group, and score-weight metadata.
- [ ] **BANK-02**: CNBS-R2016 feedback and status mapping use the official PDF DQ thresholds and age-bracket rules consistently across driver logic and report rendering.
- [ ] **BANK-03**: CNBS-R2016 item metadata preserves the five official domains `gm`, `fm`, `ad`, `la`, and `sb`, plus the month-group values needed for standard forward/backward testing.

### Unified Assessment Flow

- [ ] **FLOW-01**: Teacher can start CNBS-R2016 from the existing unified assessment entry and student-selection flow without a separate assessment subsystem.
- [ ] **FLOW-02**: During CNBS-R2016, the question card presents only `通过 / 不通过` actions and remains compatible with the existing unified assessment container.
- [ ] **FLOW-03**: The system selects the starting month-group from the child's chronological age in months according to the standard's main-test-month rule.
- [ ] **FLOW-04**: The system performs forward/backward testing by domain until basal and ceiling are established through consecutive month-group rules defined by the standard.

### Scoring & Intervention Logic

- [ ] **SCORE-01**: When basal is established, the system auto-fills easier CNBS-R2016 items in the same domain as passed and marks them as auto-filled.
- [ ] **SCORE-02**: When ceiling is established, the system auto-fills harder CNBS-R2016 items in the same domain as failed and marks them as auto-filled.
- [ ] **SCORE-03**: The system calculates domain mental ages using the official weight model for 1-12, 15-36, and 42-84 month bands.
- [ ] **SCORE-04**: The system calculates total mental age and developmental quotient from chronological age in months and maps DQ to the official PDF status bands.
- [ ] **SCORE-05**: The system extracts CNBS-R2016 IEP targets from manual failed items only (`score = 0` and `is_auto_filled = false`).

### Persistence & Reporting

- [ ] **PERS-01**: SCGP persists CNBS-R2016 main assessment records and per-item detail records through dedicated per-scale tables.
- [ ] **PERS-02**: CNBS-R2016 detail records preserve `is_auto_filled` and `auto_fill_reason` so report logic can distinguish real failures from rule-driven fills.
- [ ] **PERS-03**: CNBS-R2016 writes `report_record.report_type = 'cnbsr2016'` so report center and student detail flows can open the correct report directly.
- [ ] **RPT-01**: Teacher can open a CNBS-R2016 report page that displays chronological age, five domain mental ages, total mental age, DQ, official status, and structured feedback.
- [ ] **RPT-02**: CNBS-R2016 reports present official age-bracket commentary and intervention suggestions without reusing mastery-rate semantics from other scales.

### Verification

- [ ] **QA-01**: Team can complete at least one real CNBS-R2016 assessment against the local dev database and verify saved main/detail/report records end to end.
- [ ] **QA-02**: Team can verify sample cases for basal/ceiling behavior, MA calculation, DQ status mapping, and report text selection against the official standard.

## v2 Requirements

### Deferred

- **NEXT-01**: Add CNBS-R2016 Word/export payload support after the core runtime, persistence, and report page are stable.
- **NEXT-02**: Revisit FMDA runtime QA, unified training-record closeout, resource-center redesign, and platform debt cleanup in later milestones instead of mixing them into v1.7.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rebuilding SCGP around a generic multi-scale assessment schema before integrating CNBS-R2016 | The current product already uses per-scale tables successfully and this milestone should reuse that reality |
| Introducing a separate CNBS-R2016 workflow outside `AssessmentContainer` | Would duplicate existing assessment infrastructure and increase platform debt |
| Native OCR / PDF parsing as a runtime dependency | The platform must remain local-first and zero-native-dependency |
| Bundling FMDA runtime QA, training-record cleanup, or resource-center redesign into v1.7 | These are explicitly deferred to later milestones |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BANK-01 | Phase 17 | Pending |
| BANK-02 | Phase 17 | Pending |
| BANK-03 | Phase 17 | Pending |
| FLOW-01 | Phase 19 | Pending |
| FLOW-02 | Phase 18 | Pending |
| FLOW-03 | Phase 18 | Pending |
| FLOW-04 | Phase 18 | Pending |
| SCORE-01 | Phase 18 | Pending |
| SCORE-02 | Phase 18 | Pending |
| SCORE-03 | Phase 18 | Pending |
| SCORE-04 | Phase 18 | Pending |
| SCORE-05 | Phase 20 | Pending |
| PERS-01 | Phase 19 | Pending |
| PERS-02 | Phase 19 | Pending |
| PERS-03 | Phase 19 | Pending |
| RPT-01 | Phase 19 | Pending |
| RPT-02 | Phase 19 | Pending |
| QA-01 | Phase 20 | Pending |
| QA-02 | Phase 20 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 after defining milestone v1.7 CNBS-R2016 Assessment Integration*
