# PROJECT

## What This Is
SCGP (Stellar Competency Growth Platform, formerly SIC-ADS) is a local-first desktop platform for special education and rehabilitation workflows. It consolidates assessment, training, resource management, reporting, and IEP support into a single offline-capable system built on Electron, Vue, TypeScript, and SQL.js.

## Core Value
SCGP helps special education teachers and rehabilitation staff run structured assessment and intervention workflows in one offline system. The platform must stay local-first, zero-native-dependency, and compatible with the generalized `sys_training_resource` / `ScaleDriver` architecture already in production.

## Current State

### Shipped Milestones

- **v1.2 Emotional Resource Pack Import & Export** shipped on 2026-03-18
  - Archive: `.planning/milestones/v1.2-ROADMAP.md`
- **v1.1 Emotional Authoring & Scene Gallery** shipped on 2026-03-17
  - Archive: `.planning/milestones/v1.1-ROADMAP.md`
- **v1.0 Emotional MVP** shipped on 2026-03-17
  - Archive: `.planning/milestones/v1.0-ROADMAP.md`

### What v1.2 Delivered

- Added Resource Center emotional resource pack import/export controls inside the existing management flow
- Added versioned JSON pack export/import for `emotion_scene` and `care_scene` resources
- Added relational Excel workbook export/import plus downloadable Excel template
- Added duplicate preview and `skip / update / copy` handling keyed by `resourceType + sceneCode`
- Preserved compatibility with the existing typed emotional editors, selectors, and runtime by staying on `sys_training_resource.meta_data`

## Next Milestone Goals

The next milestone is not defined yet. Candidate directions already visible in backlog:

- Emotional report polish based on richer scene taxonomy and teacher-facing summaries
- Resource pack bundling for local image assets after metadata exchange proves stable
- Cross-module route/menu platformization and future generic resource-pack infrastructure
- Cognitive assessment foundation and multi-module comprehensive reporting backlog

### Constraints

1. **No schema rewrite by default**: keep persistence on `sys_training_resource.meta_data`; do not introduce milestone-scoped schema changes.
2. **Typed contract is already real**: `src/types/emotional.ts` and `src/views/resource-center/editors/emotional-resource-contract.ts` stay the source of truth for normalization and validation.
3. **Structured exchange is now proven**: future pack work should extend the existing JSON/Excel DTO pipeline instead of rebuilding it from scratch.
4. **No native deps**: do not introduce `sqlite3`, `sharp`, or other runtime native dependencies.
5. **Current UI anchor**: resource-management enhancements should continue extending the existing Resource Center flow instead of creating detached admin-only pages.

---
*Last updated: 2026-03-18 after archiving v1.2 milestone*
