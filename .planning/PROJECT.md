# PROJECT

## Core Value
SCGP (Stellar Competency Growth Platform, formerly SIC-ADS) is a comprehensive competency development platform for special education. It supports Sensory Integration, Behavior, Daily Living Skills, and individualized education program (IEP) generation in a local-first environment without relying on external cloud infrastructure.

## Key Constraints
1. **Zero Native Dependencies**: Must run across Windows/macOS/Linux without `node-gyp` compiled libraries (e.g., no `sqlite3` native bindings, no `sharp`).
2. **Local-First Architecture**: All data resides locally in an in-browser SQLite database (`sql.js`), enabling fully offline usage.
3. **Data Integrity**: Uses a Debounced Atomic Save model on the main thread (intercepting write queries and syncing to disk every 2 seconds via IPC `fs.fsync` and `fs.rename`).
4. **Generalization**: All training assets (equipment, games, teaching materials) must be handled by the unified `sys_training_resource` Core Kernel.
5. **Strategy Driven**: Assessments must implement the `ScaleDriver` interface for uniform UI handling (Welcome -> Question Card -> Complete Dialog).