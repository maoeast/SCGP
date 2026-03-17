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

### No Active Milestone

There is currently no active milestone. The planning state has been reset after v1.1 archive.

### Next Milestone Candidates

- Emotional resource pack import/export for teacher-to-teacher resource exchange
- Emotional report polish based on richer scene taxonomy
- Cross-module route/menu platformization after current static-route debt is prioritized
- Cognitive assessment foundation (`MOD-03`)
- Multi-module comprehensive reporting (`MOD-04`)

### Constraints

1. **No schema rewrite by default**: prefer extending current `sys_training_resource.meta_data` and current runtime contracts unless a later milestone explicitly approves schema changes.
2. **Static-route reality still applies**: the emotional selector flow is now cleaner, but the platform is still not registry-driven.
3. **No native deps**: do not introduce `sqlite3`, `sharp`, or other runtime native dependencies.

---
*Last updated: 2026-03-17 after v1.1 milestone archive*
