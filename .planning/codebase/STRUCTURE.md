# Codebase Structure

**Analysis Date:** 2026-02-28

## Directory Layout

```
[project-root]/
├── electron/                   # Electron main process code
│   ├── handlers/               # IPC handlers (e.g., update.js)
│   ├── main.mjs                # Electron entry point
│   └── preload.mjs             # Context bridge
├── scripts/                    # Build, dev, and utility scripts
├── src/                        # Vue 3 Frontend source
│   ├── assets/                 # CSS, Images
│   ├── components/             # Reusable Vue components
│   ├── config/                 # Static configuration files
│   ├── core/                   # Core kernel logic (Module Registry)
│   ├── database/               # SQL schema, API, and Migrations
│   ├── router/                 # Vue Router configuration
│   ├── services/               # Services (e.g. UpdateService.ts)
│   ├── stores/                 # Pinia state stores
│   ├── strategies/             # Strategy pattern implementations (Assessments/IEP)
│   ├── types/                  # TypeScript interface definitions
│   ├── utils/                  # Helper functions
│   ├── views/                  # Page-level Vue components
│   └── workers/                # Web Workers (DB/Image)
└── public/                     # Static assets, wasm files
```

## Directory Purposes

**`src/database/`:**
- Purpose: Manages all local-first SQLite operations.
- Contains: `sql-wrapper.ts` (persistence), `api.ts` (CRUD), `schema/` (SQL files), `migration/` (version upgrades).
- Key files: `src/database/init.ts` (bootstrap), `src/database/resource-api.ts`

**`src/strategies/`:**
- Purpose: Contains algorithmic strategies decoupled from UI.
- Contains: Assessment drivers, IEP generation strategies.
- Key files: `src/strategies/assessment/BaseDriver.ts`

**`src/views/devtools/`:**
- Purpose: Embedded developer tools for testing local DB, migrations, and performance.
- Contains: `BenchmarkRunner.vue`, `SchemaMigration.vue`.

**`src/views/_archived/`:**
- Purpose: Deprecated code retained for historical reference but excluded from builds/routing.

## Key File Locations

**Entry Points:**
- `electron/main.mjs`: Main process entry.
- `src/main.ts`: Renderer process entry.
- `index.html`: Web entry point.

**Configuration:**
- `package.json`: Build/deps.
- `vite.config.ts`: Vite bundling.
- `tsconfig.json`: TypeScript rules.

**Core Logic:**
- `src/core/module-registry.ts`: Entry point for adding new clinical modules.
- `src/database/sql-wrapper.ts`: Crucial atomic save logic.

## Naming Conventions

**Files:**
- Components & Views: PascalCase (e.g., `AssessmentContainer.vue`)
- Utils & Logic: kebab-case or camelCase (e.g., `iep-generator.ts`, `resource-api.ts`)
- Classes: PascalCase for exports (e.g., `SMDriver.ts`)

**Directories:**
- kebab-case: `training-records/`, `conners-psq/`

## Where to Add New Code

**New Assessment Scale:**
1. Types: `src/types/[scale].ts`
2. Driver: `src/strategies/assessment/[Scale]Driver.ts`
3. Register: `src/strategies/assessment/index.ts`
4. Use standard container: `/assessment/unified/[scale]/:id`

**New Business Module (e.g. Cognitive):**
1. Definitions: `src/config/modules.ts`
2. IEP Strategy: `src/strategies/CognitiveIEPStrategy.ts`
3. Resource Mapping: Update `ResourceSelector.vue` to fetch by new module code.

**New Database API:**
1. Method: Add to `src/database/api.ts` or create new file like `src/database/class-api.ts`.
2. Inherit from `DatabaseAPI`.

---

*Structure analysis: 2026-02-28*
