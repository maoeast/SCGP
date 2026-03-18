# PROJECT

## What This Is
SCGP (Stellar Competency Growth Platform, formerly SIC-ADS) is a local-first desktop platform for special education and rehabilitation workflows. It consolidates assessment, training, resource management, reporting, and IEP support into a single offline-capable system built on Electron, Vue, TypeScript, and SQL.js.

## Core Value
SCGP helps special education teachers and rehabilitation staff run structured assessment and intervention workflows in one offline system. The platform must stay local-first, zero-native-dependency, and compatible with the generalized `sys_training_resource` / `ScaleDriver` architecture already in production.

## Current State

### Shipped Milestones

- **v1.1 Emotional Authoring & Scene Gallery** shipped on 2026-03-17
  - Archive: `.planning/milestones/v1.1-ROADMAP.md`
- **v1.0 Emotional MVP** shipped on 2026-03-17
  - Archive: `.planning/milestones/v1.0-ROADMAP.md`

### What v1.1 Delivered

- Replaced emotional raw JSON authoring in Resource Center with visual editors
- Added typed normalization and validation for emotional resource metadata
- Added selector galleries so teachers choose a concrete emotional scene before launch
- Converted emotional training launch into explicit `resourceId` flow

## Current Milestone: v1.2 Emotional Resource Pack Import & Export

**Goal:** Build an admin-facing batch import/export tool for preset emotional resources that supports standard JSON and Excel, and converts imported content into the current `sys_training_resource.meta_data` contract.

**Target features:**
- Export one or more emotional resources as a standard JSON pack that preserves resource metadata, tags, and typed `meta_data`
- Import emotional resource packs from standard JSON first, then Excel workbook sheets, with preview and duplicate handling
- Reuse the existing emotional editor normalization / validation logic so imported resources stay compatible with current Resource Center editors, scene selectors, and training runtime

### Constraints

1. **No schema rewrite by default**: keep persistence on `sys_training_resource.meta_data`; do not introduce milestone-scoped schema changes.
2. **Typed contract is already real**: `src/types/emotional.ts` and `src/views/resource-center/editors/emotional-resource-contract.ts` stay the source of truth for normalization and validation.
3. **JSON first, Excel second**: milestone execution should land JSON pack import/export first, then Excel workbook parsing/export on the same intermediate contract.
4. **No native deps**: do not introduce `sqlite3`, `sharp`, or other runtime native dependencies.
5. **Current UI anchor**: the tool should extend the existing Resource Center emotional resource management flow instead of creating a parallel admin-only page.

---
*Last updated: 2026-03-18 after starting milestone v1.2 Emotional Resource Pack Import & Export*
