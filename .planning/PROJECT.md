# PROJECT

## What This Is
SCGP (Stellar Competency Growth Platform, formerly SIC-ADS) is a local-first desktop platform for special education and rehabilitation workflows. It consolidates assessment, training, resource management, reporting, and IEP support into a single offline-capable system built on Electron, Vue, TypeScript, and SQL.js.

## Core Value
SCGP (Stellar Competency Growth Platform, formerly SIC-ADS) is a comprehensive competency development platform for special education. It supports Sensory Integration, Behavior, Daily Living Skills, and individualized education program (IEP) generation in a local-first environment without relying on external cloud infrastructure.

## Current State

### Shipped Milestone

- **v1.0 Emotional MVP** shipped on 2026-03-17
- Archived roadmap: [v1.0-ROADMAP.md](/E:/VSC/H5/SIC-ADS/.planning/milestones/v1.0-ROADMAP.md)
- Archived requirements: [v1.0-REQUIREMENTS.md](/E:/VSC/H5/SIC-ADS/.planning/milestones/v1.0-REQUIREMENTS.md)

### What v1.0 Delivered

- Refined game training flow and resource-backed game entry
- SDQ and CBCL integrated into the generalized assessment/runtime path
- Emotional module MVP delivered:
  - 情绪与场景
  - 表达关心
  - emotional records
  - emotional reports
  - local session persistence

### Next Milestone Candidates

- Cognitive assessment foundation
- Multi-module comprehensive reporting
- Additional platform hardening only after next milestone scope is explicitly defined

## Key Constraints
1. **Zero Native Dependencies**: Must run across Windows/macOS/Linux without `node-gyp` compiled libraries (e.g., no `sqlite3` native bindings, no `sharp`).
2. **Local-First Architecture**: All data resides locally in an in-browser SQLite database (`sql.js`), enabling fully offline usage.
3. **Data Integrity**: Uses a Debounced Atomic Save model on the main thread (intercepting write queries and syncing to disk every 2 seconds via IPC `fs.fsync` and `fs.rename`).
4. **Generalization**: All training assets (equipment, games, teaching materials) must be handled by the unified `sys_training_resource` Core Kernel.
5. **Strategy Driven**: Assessments must implement the `ScaleDriver` interface for uniform UI handling (Welcome -> Question Card -> Complete Dialog).

---
*Last updated: 2026-03-17 after v1.0 Emotional MVP milestone completion*
