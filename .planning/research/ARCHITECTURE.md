# Architecture Patterns

**Domain:** Special Education Platform
**Researched:** Current Date

## Recommended Architecture

The system uses a **Core Kernel + Business Modules** pattern within an Electron application.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Core Kernel | Resource Management, Profile Center, System Services, File IO | Business Modules, Database Layer, Electron IPC |
| Business Modules | Specific domain logic (Sensory, Emotional, Social, etc.) | Core Kernel |
| ModuleRegistry | Dynamically registers and provides metadata/routes for modules | Vue Router, UI Components |
| ScaleDriver | Strategy interface for Assessment logic (jumping rules, scoring) | AssessmentContainer UI |

## Patterns to Follow

### Pattern 1: Debounced Atomic Writes (Database)
**What:** Writing in-memory SQLite (`sql.js`) to disk.
**Why:** Directly writing on every query blocks the main thread; doing nothing risks data loss on crash.
**Implementation:**
- Intercept INSERT/UPDATE/DELETE.
- Set a 2000ms debounce timer.
- On trigger, export DB to Buffer and send via IPC `saveDatabaseAtomic`.
- Main process uses `fs.fsync` and `fs.rename` to guarantee atomic disk write.

### Pattern 2: ScaleDriver Strategy (Assessments)
**What:** Encapsulating specific assessment scale logic.
**Why:** Scales vary wildly (Conners uses T-scores from age/gender matrices; S-M uses basal/ceiling jump logic).
**Implementation:**
- `BaseDriver` provides linear questions.
- `SMDriver` / `ConnersPSQDriver` implement `getNextQuestion`, `calculateScore`.
- UI uses a dumb `AssessmentContainer.vue` that just renders what the driver tells it.

### Pattern 3: Generalized Resource Management
**What:** All items (games, equipment, documents, flashcards) are entries in `sys_training_resource`.
**Why:** Avoids `equipment_catalog`, `game_catalog` table fragmentation.
**Implementation:**
- Soft deletes (`is_active = 0`).
- FTS5 for search (fallback to `LIKE`).
- Tags handled via standard relationship (`sys_resource_tag_map`).

## Anti-Patterns to Avoid

### Anti-Pattern 1: Web Workers for `sql.js` (In this specific project)
**What:** Attempting to offload `sql.js` to a Vite Web Worker.
**Why bad:** Severe compatibility issues with Vite bundling CommonJS `sql.js`. Caused refactoring failures (Phase 1.1 abandoned).
**Instead:** Keep SQL execution on the main thread, but aggressively optimize queries and debounce disk I/O.

### Anti-Pattern 2: Hardcoding Module References
**What:** Importing `sensory` specific logic in generic components.
**Why bad:** Breaks the `Core Kernel + Business Modules` paradigm.
**Instead:** Rely on `ModuleRegistry.getModule(moduleCode)` and standard `ResourceAPI`.

## Sources

- `重构实施技术规范.md` (HIGH)
- `PROJECT_CONTEXT.md` (HIGH)