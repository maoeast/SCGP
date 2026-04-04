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

### No Active Milestone

- `v1.6` is archived and no new milestone has been opened yet.
- Recent post-closeout repository work has already tightened unified training-record cleanup, removed old record-page flows, serialized main-process atomic DB writes, and analyzed resource-center redesign follow-up.

## Requirements

### Validated

- ✓ Emotional runtime compile adapters, shared engine, shell migration, and compatibility guardrails shipped in `v1.6`
- ✓ Strict module licensing and locked router/menu/dashboard entry enforcement shipped in `v1.5`
- ✓ Dashboard command-center aggregation and direct schedule launch shipped in `v1.4`
- ✓ Unified editable Word export for core assessment reports shipped in `v1.3`

### Active

- [ ] Define the next milestone around unified training-record closeout and resource-center redesign priorities
- [ ] Disable legacy teaching-material seed auto-injection before physically deleting old resource-center data
- [ ] Continue platform debt cleanup around route/menu static assembly, backup-and-restore coverage, and resource lifecycle closure

### Out of Scope

- Treating `emotional`, `social`, or other future modules as fully productized multi-module deliveries yet — current code reality is still mixed maturity
- Introducing native runtime dependencies such as `sqlite3` or `sharp` — the platform stays local-first and zero-native-dependency
- Replacing the shared `sys_training_resource` / `ScaleDriver` platform spine with module-specific one-off implementations — that would increase platform debt instead of reducing it

## Context

- `sensory` remains the most complete business mainline in the current product.
- `emotional` now has a cleaner shared runtime base after `v1.6`, but future expansion work is still follow-up scope rather than current delivered breadth.
- The repository is brownfield: current product documents, historical plans, archived milestones, and active code all coexist and must be distinguished carefully.
- Recent closeout analysis identified resource-center cleanup and unified training-record follow-through as the most immediate planning inputs for the next milestone.

### Constraints

1. **No schema rewrite by default**: keep persistence on `sys_training_resource.meta_data`; do not introduce milestone-scoped schema changes.
2. **Platform architecture is real**: new assessment or resource work should continue to use `ScaleDriver`, `AssessmentContainer`, and the shared training-resource model rather than reviving older isolated patterns.
3. **No native deps**: do not introduce `sqlite3`, `sharp`, or other runtime native dependencies.
4. **Current code beats target-state docs**: planning must keep distinguishing shipped behavior from future-module PRD intent.
5. **Offline-first compatibility matters**: local persistence, atomic DB writes, and no-cloud-required flows remain baseline constraints.

---
*Last updated: 2026-04-04 after archiving milestone v1.6*
