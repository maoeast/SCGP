# Domain Pitfalls

**Domain:** SCGP Electron Application
**Researched:** Current Date

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Worker Compatibility with Legacy Libraries
**What goes wrong:** Attempting to move `sql.js` into a Web Worker fails during build or runtime.
**Why it happens:** Vite's worker bundling struggles with certain CommonJS implementations or WASM initializations required by `sql.js`.
**Consequences:** Blocking architecture refactor; wasted sprints.
**Prevention:** Stick to the proven "Main Thread Debounced Atomic Write" (Plan B) established in Phase 1.4.

### Pitfall 2: Concurrent Saving Data Loss
**What goes wrong:** Rapid consecutive saves (e.g., creating multiple classes quickly) result in the second save being dropped.
**Why it happens:** The debounce lock (`isSaving = true`) simply discarded incoming save requests instead of queuing them.
**Consequences:** Silent data loss for users.
**Prevention:** Implement a `pendingSave` flag in the `finally` block of the save function to recursively trigger missed saves.

### Pitfall 3: Database Schema Migration Residue
**What goes wrong:** Failed database migrations leave temporary tables (e.g., `report_record_new`), which block subsequent startup attempts (`table already exists`).
**Why it happens:** Non-atomic schema migrations or lack of cleanup on catch.
**Prevention:** Add `DROP TABLE IF EXISTS table_new` before starting migration transactions and wrap creations in strict try-catch blocks.

## Moderate Pitfalls

### Pitfall 1: Electron EPIPE Errors
**What goes wrong:** Frequent `console.log` from the render process via IPC causes the pipe to break (`EPIPE`).
**Prevention:** Wrap all high-frequency logging in a `safeLog()` helper that catches write errors.

### Pitfall 2: Local Network Web Crypto Security Context
**What goes wrong:** Features like license verification using `crypto.subtle` fail when accessed via LAN (HTTP).
**Prevention:** Configure Vite to serve HTTPS with self-signed certificates (`dev-cert.pem`) and provide fallback error UI for insecure contexts.

### Pitfall 3: PDF Export Infinite Loops
**What goes wrong:** Application hangs while generating PDFs.
**Why it happens:** Calculation for page height drops below zero, causing a `while (position < totalHeight)` loop to run infinitely.
**Prevention:** Use strictly positive decrement bounds (`remainingHeight > 0`) and cap pagination with a hard limit (e.g., 100 pages).

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 5.2 Game Validation | Legacy game properties mapping to generic `metadata` JSON schema. | Carefully audit `migrate-games-to-resources.ts` logic and ensure `GamePlay.vue` extracts params safely. |
| Eye Tracking Integration | Hardware variance destroying accuracy. | Keep VisualTracker in paused state until strict environmental lighting and positioning constraints are established. |

## Sources

- `PROJECT_CONTEXT.md` Issue Tracker & Architecture Records
- `docs/CHANGELOG.md`