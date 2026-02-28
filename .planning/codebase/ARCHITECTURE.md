# Architecture

**Analysis Date:** 2026-02-28

## Pattern Overview

**Overall:** Core Kernel + Business Modules (Plugin-like Architecture)
- UI Container Reuse + Strategy Driver (For Assessments)
- Local-First, No-Native-Deps

**Key Characteristics:**
- **Zero Native Dependencies:** Uses `sql.js` (WASM) instead of `sqlite3` to ensure cross-platform consistency.
- **Main Thread DB Execution:** Initially aimed for Web Worker but rolled back to Main Thread due to Vite/Vite-Worker compatibility issues (Plan B).
- **Atomic Writes:** IPC from Renderer to Main process doing `fsync` + `rename` with debouncing.
- **Strategy Pattern:** Heavily used for Assessments (`ScaleDriver`) and IEP generation (`IEPStrategy`).

## Layers

**Database Layer:**
- Purpose: Execute SQL, manage schema, and persist data.
- Location: `src/database/`
- Contains: `api.ts`, `sql-wrapper.ts`, `schema/`
- Depends on: `sql.js`, Electron IPC (`electron/main.js`)
- Used by: State Stores (Pinia), Business Views

**Module Registry Layer:**
- Purpose: Register and manage decoupled business modules (Sensory, Emotional, Social, Life Skills).
- Location: `src/core/module-registry.ts`
- Contains: Module definitions, strategy routing.
- Depends on: Module interface `src/types/module.ts`.
- Used by: UI Routing, `ResourceSelector.vue`.

**Assessment Strategy Layer:**
- Purpose: Execute scale-specific logic (scoring, jumping, feedback).
- Location: `src/strategies/assessment/`
- Contains: `BaseDriver.ts`, `SMDriver.ts`, `ConnersPSQDriver.ts`, etc.
- Depends on: Norms data (`src/database/conners-norms.ts`), Schema.
- Used by: `src/views/assessment/AssessmentContainer.vue`

## Data Flow

**Database Persistence Flow (Plan B):**

1. UI calls `DatabaseAPI` (e.g., `execute()`) -> updates `sql.js` in-memory DB.
2. `SQLWrapper` intercepts write operations, sets `isDirty = true`, and starts a 2000ms debounce timer.
3. Timer fires, Renderer calls `db.export()` and sends Buffer via `ipcRenderer.invoke('saveDatabaseAtomic')`.
4. Main process writes to `.tmp` file, calls `fs.fsync`, then `fs.rename` to replace the actual DB file.

**State Management:**
- Vue components use Pinia stores (`src/stores/`) to cache frequently accessed data or manage session state.

## Key Abstractions

**ScaleDriver:**
- Purpose: Encapsulates different clinical assessment forms (WeeFIM, S-M, Conners).
- Examples: `src/strategies/assessment/ConnersPSQDriver.ts`, `src/types/assessment.ts`
- Pattern: Strategy Pattern + Template Method (`BaseDriver.ts`).

**Resource:**
- Purpose: Generalized representation of teaching materials, games, and equipment to allow decoupled scaling.
- Examples: `src/database/resource-api.ts`, `src/views/admin/ResourceManager.vue`
- Pattern: Unified schema (`sys_training_resource`) with module code tags.

## Entry Points

**Electron Main Process:**
- Location: `electron/main.mjs`
- Triggers: OS App Launch
- Responsibilities: Window management, custom protocol (`resource://`), atomic DB writes, auto-updater.

**Frontend App:**
- Location: `src/main.ts`
- Triggers: Electron BrowserWindow load
- Responsibilities: Setup Vue, initialize `sql.js`, run migrations, mount app.

## Error Handling

**Strategy:** Defensive Programming + Fail-Safes

**Patterns:**
- DB Migrations: Run automatically on boot (`src/database/init.ts`), fallback to legacy IDs if missing.
- Validity Checks: "Warning Mode" over Blocking Mode for clinical assessment validity (PI/NI checks in Conners).
- Safe Logging: Main process uses `safeLog()` to avoid `EPIPE` crashes.

## Cross-Cutting Concerns

**Logging:** Main process custom safe logger. No telemetry.
**Validation:** Custom logic inside Vue components and `ScaleDriver`s.
**Authentication:** License key validation on startup (`src/views/Activation.vue`).

---

*Architecture analysis: 2026-02-28*
