# PROJECT

## What This Is
SCGP (Stellar Competency Growth Platform, formerly SIC-ADS) is a local-first desktop platform for special education and rehabilitation workflows. It consolidates assessment, training, resource management, reporting, and intervention support into one offline-capable Electron + Vue + TypeScript + SQL.js system.

## Core Value
SCGP helps special education teachers and rehabilitation staff run structured assessment and intervention workflows in one offline system. The platform must stay local-first, zero-native-dependency, and compatible with the generalized `sys_training_resource` / `ScaleDriver` architecture already in production.

## Current State

### Latest Shipped Milestone

- **v1.6 Emotional Engine Refactoring** shipped on 2026-04-04
  - Archive: `.planning/milestones/v1.6-ROADMAP.md`
  - Delivered one shared emotional compile/runtime contract, a unified interaction engine, thin runtime shell pages, completed-only emotional report-pointer updates, and a live-db compatibility verifier

### Earlier Shipped Milestones

- **v1.5 Strict Modular Licensing** shipped on 2026-03-19
  - Archive: `.planning/milestones/v1.5-ROADMAP.md`
- **v1.4 Dashboard Special Ed Command Center** shipped on 2026-03-19
  - Archive: `.planning/milestones/v1.4-ROADMAP.md`
- **v1.3 Unified Assessment Word Export** shipped on 2026-03-18
  - Archive: `.planning/milestones/v1.3-ROADMAP.md`
- **v1.2 Emotional Resource Pack Import & Export** shipped on 2026-03-18
  - Archive: `.planning/milestones/v1.2-ROADMAP.md`
- **v1.1 Emotional Authoring & Scene Gallery** shipped on 2026-03-17
  - Archive: `.planning/milestones/v1.1-ROADMAP.md`
- **v1.0 Emotional MVP** shipped on 2026-03-17
  - Archive: `.planning/milestones/v1.0-ROADMAP.md`

## Current Milestone: v1.7 CNBS-R2016 Assessment Integration

**Goal:** Integrate the `0-6岁儿童发育行为评估量表（儿心量表Ⅱ / CNBS-R2016）` into the existing unified assessment system by reusing `AssessmentContainer + ScaleDriver + per-scale tables + report_record` instead of building a parallel assessment flow.

**Target features:**
- Structure the official CNBS-R2016 item bank into a typed SCGP seed with domain, month-group, and score-weight metadata.
- Add a `Cnbsr2016Driver` that implements month-group basal/ceiling, auto-fill metadata, MA calculation, DQ calculation, and PDF-standard DQ status mapping.
- Persist CNBS-R2016 assessments and details through new per-scale tables and expose reports through the existing report center and student detail flows.
- Deliver a CNBS-R2016 report page that presents chronological age, domain mental ages, total mental age, DQ, official status, age-bracket feedback, and IEP targets.

## Requirements

### Validated

- ✓ Emotional runtime compile adapters, shared engine, shell migration, and compatibility guardrails shipped in `v1.6`
- ✓ Strict module licensing and locked router/menu/dashboard entry enforcement shipped in `v1.5`
- ✓ Dashboard command-center aggregation and direct schedule launch shipped in `v1.4`
- ✓ Unified editable Word export for core assessment reports shipped in `v1.3`

### Active

- [ ] CNBS-R2016 question bank and feedback assets are standardized into code-ready structured data.
- [ ] CNBS-R2016 runs inside the existing unified assessment container with Pass/Fail-only interaction and official month-group testing rules.
- [ ] CNBS-R2016 persistence, report records, and report page are integrated into the current SCGP assessment/reporting chain.
- [ ] CNBS-R2016 scoring, DQ status mapping, and report text are verified against the official PDF standard and local dev database flow.

### Out of Scope

- Treating `emotional`, `social`, or other future modules as fully productized multi-module deliveries yet — current code reality is still mixed maturity
- Introducing native runtime dependencies such as `sqlite3` or `sharp` — the platform stays local-first and zero-native-dependency
- Replacing the shared `sys_training_resource` / `ScaleDriver` platform spine with module-specific one-off implementations — that would increase platform debt instead of reducing it
- Folding FMDA runtime QA, unified training-record closeout, resource-center redesign, and broader platform debt cleanup into v1.7 — these are recorded for later milestones, not this one

## Context

- `sensory` remains the most complete business mainline in the current product.
- `emotional` now has a cleaner shared runtime base after `v1.6`, but future expansion work is still follow-up scope rather than current delivered breadth.
- The repository is brownfield: current product documents, historical plans, archived milestones, and active code all coexist and must be distinguished carefully.
- CNBS-R2016 integration has a strong existing implementation template in the current codebase: `FineMotorDriver`, per-scale assessment tables, unified assessment routing, and report-record integration are already present.
- The normative algorithm source is the official PDF standard `WS/T 580—2017`, not older draft thresholds in prior PRD text.
- The current reference bundle already contains the official PDF, a CNBS-R2016 PRD, and a large feedback-config corpus, but it does not yet contain a structured SCGP-ready item bank file. Digitization is the first real prerequisite.

### Constraints

1. **No schema rewrite by default**: keep persistence on `sys_training_resource.meta_data`; do not introduce milestone-scoped schema changes.
2. **Platform architecture is real**: new assessment or resource work should continue to use `ScaleDriver`, `AssessmentContainer`, and the shared training-resource model rather than reviving older isolated patterns.
3. **No native deps**: do not introduce `sqlite3`, `sharp`, or other runtime native dependencies.
4. **Current code beats target-state docs**: planning must keep distinguishing shipped behavior from future-module PRD intent.
5. **Offline-first compatibility matters**: local persistence, atomic DB writes, and no-cloud-required flows remain baseline constraints.
6. **Official scoring wins**: CNBS-R2016 DQ status thresholds and testing rules must follow the official PDF standard, and code/config must be kept aligned to that source.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Reuse `AssessmentContainer + ScaleDriver + per-scale tables` for CNBS-R2016 | Matches current SCGP assessment reality and minimizes platform drift | — Pending |
| Treat the official PDF as the normative source for DQ thresholds and month-group testing rules | Earlier PRD/config text drifted from the published standard | — Pending |
| Make structured item-bank digitization the first phase of v1.7 | No SCGP-ready CNBS-R2016 question seed exists yet | — Pending |
| Model CNBS-R2016 around MA/DQ reporting instead of mastery-rate semantics | The scale is a developmental quotient instrument, not a mastery-rate scale | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-04 after starting milestone v1.7 CNBS-R2016 Assessment Integration*
