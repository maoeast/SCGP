# PROJECT

## What This Is
SCGP (Stellar Competency Growth Platform, formerly SIC-ADS) is a local-first desktop platform for special education and rehabilitation workflows. It consolidates assessment, training, resource management, reporting, and IEP support into a single offline-capable system built on Electron, Vue, TypeScript, and SQL.js.

## Core Value
SCGP (Stellar Competency Growth Platform, formerly SIC-ADS) is a comprehensive competency development platform for special education. It supports Sensory Integration, Behavior, Daily Living Skills, and individualized education program (IEP) generation in a local-first environment without relying on external cloud infrastructure.

## Requirements
### V1 Scope
1. Validate and polish the refactored game training flow, including game browsing, launch, metadata display, record saving, and migration to `sys_training_resource`.
2. Expand business modules so users can conduct CBCL, SDQ, and related Emotional/Social workflows through the generalized `ScaleDriver` architecture.
3. Prepare for broader multi-module expansion, including Social resources, Cognitive assessments, and comprehensive reporting.

### Traceability Anchors
* `GAME-01` to `GAME-04`: Game training validation, migration, history, and cross-module game access.
* `MOD-01` to `MOD-04`: Emotional/Social assessments, Social resources, Cognitive assessments, and comprehensive reporting.

## Key Constraints
1. **Zero Native Dependencies**: Must run across Windows/macOS/Linux without `node-gyp` compiled libraries (e.g., no `sqlite3` native bindings, no `sharp`).
2. **Local-First Architecture**: All data resides locally in an in-browser SQLite database (`sql.js`), enabling fully offline usage.
3. **Data Integrity**: Uses a Debounced Atomic Save model on the main thread (intercepting write queries and syncing to disk every 2 seconds via IPC `fs.fsync` and `fs.rename`).
4. **Generalization**: All training assets (equipment, games, teaching materials) must be handled by the unified `sys_training_resource` Core Kernel.
5. **Strategy Driven**: Assessments must implement the `ScaleDriver` interface for uniform UI handling (Welcome -> Question Card -> Complete Dialog).
