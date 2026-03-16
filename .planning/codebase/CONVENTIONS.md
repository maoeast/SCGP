# SCGP Conventions

## Scope And Evidence

This document is based on the current repository state on 2026-03-16, using current docs plus implementation in `README.md`, `AGENTS.md`, `PROJECT_CONTEXT.md`, `重构实施技术规范.md`, `docs/planning/2026-03-13-scgp-current-prd.md`, `docs/reports/2026-03-13-scgp-prd-gap-analysis.md`, `docs/DOCS_GUIDE.md`, `package.json`, `eslint.config.ts`, `.prettierrc.json`, `.editorconfig`, `tsconfig.app.json`, `src/main.ts`, `src/router/index.ts`, `src/core/module-registry.ts`, `src/core/strategies-init.ts`, `src/types/assessment.ts`, `src/database/init.ts`, `src/database/api.ts`, `src/database/sql-wrapper.ts`, `src/database/resource-api.ts`, `src/database/class-api.ts`, `src/stores/auth.ts`, `src/stores/student.ts`, `src/stores/systemConfig.ts`, `src/views/Layout.vue`, `src/views/assessment/AssessmentContainer.vue`, `src/components/ResourceUpload.vue`, `electron/preload.mjs`, and `electron/main.mjs`.

## Rule Levels

### Tool-enforced or repo-config-enforced

- Formatting baseline is UTF-8, LF, 2 spaces, trailing-whitespace trimming, and final newline, from `.editorconfig`.
- Prettier defaults are `semi: false`, `singleQuote: true`, `printWidth: 100` in `.prettierrc.json`.
- ESLint is flat-config based and applies `eslint-plugin-vue` essential rules plus Vue TypeScript recommended rules from `eslint.config.ts`.
- `dist`, `dist-ssr`, and `coverage` are ignored by ESLint in `eslint.config.ts`.
- `@/*` path aliases are configured in `tsconfig.app.json`.

### Informal or widely-followed conventions

- Most conventions below are habits of the current codebase, not hard gates.
- The codebase is partially legacy. Older files do not fully match current formatting or typing expectations, even if touched files often do.
- `npm run type-check` is not green as of 2026-03-16, so “strict TypeScript everywhere” is not a factual convention yet.

## Naming

### Product and documentation naming

- Current product-facing name is `SCGP / 星愿能力发展平台`, per `AGENTS.md`, `README.md`, and `docs/DOCS_GUIDE.md`.
- `SIC-ADS` and older names are retained only for history, compatibility, or refactor context. Current-state docs should not present them as the current product name.

### File naming

- Vue single-file components are usually `PascalCase.vue`, for example `src/views/Layout.vue`, `src/components/ResourceUpload.vue`, and `src/views/assessment/AssessmentContainer.vue`.
- TypeScript logic and utility files are usually `kebab-case.ts`, for example `src/database/sql-wrapper.ts`, `src/database/resource-api.ts`, and `src/utils/image-processor.ts`.
- Strategy classes use semantic PascalCase names ending in `Driver` or `Strategy`, for example `src/strategies/assessment/SDQDriver.ts` and `src/strategies/SensoryIEPStrategy.ts`.
- Archived or historical UI code is isolated under folders like `src/views/_archived/` rather than renamed in place.

### Symbol naming

- Types, interfaces, classes, and stores use `PascalCase` without an `I` prefix, for example `ScaleDriver`, `StudentContext`, `ModuleRegistryImpl`, and `BackupManager`.
- Functions and variables use `camelCase`, with recurring prefixes such as `get`, `load`, `save`, `update`, `create`, `delete`, `restore`, and `handle`.
- Event handlers in components are consistently `handleXxx`, for example `handleStartAssessment`, `handleAnswer`, `handleLogout`, and `handleDrop`.
- Constants are usually `UPPER_SNAKE_CASE` when genuinely constant, for example `DEFAULT_LOGO`, `PROGRESS_KEY`, and `SAVE_DEBOUNCE_MS`.

### Cross-layer naming pattern

- Database schema and raw row fields stay in `snake_case`, for example `module_code`, `resource_type`, `cover_image`, and `avatar_path` in `src/database/init.ts` and SQL strings throughout `src/database/api.ts`.
- App-layer mapped objects often convert to `camelCase`, for example `ResourceAPI.mapToResourceItem()` in `src/database/resource-api.ts` returns `moduleCode`, `resourceType`, and `coverImage`.
- This translation is not universal. Some frontend/store types intentionally keep DB names such as `avatar_path` in `src/stores/student.ts`, so naming normalization is selective rather than global.

## Vue, Pinia, And Composition Patterns

### Vue SFC structure

- Current Vue code is overwhelmingly `\<script setup lang="ts">`, including `src/views/Layout.vue`, `src/views/assessment/AssessmentContainer.vue`, and `src/components/ResourceUpload.vue`.
- SFC layout is normally template first, then script, then scoped styles.
- Components rely on Composition API primitives such as `ref`, `computed`, `watch`, `onMounted`, and `onBeforeUnmount`.

### UI interaction patterns

- Element Plus is the default UI library, registered centrally in `src/main.ts`.
- User feedback is usually handled with `ElMessage` and sometimes `ElMessageBox`, for example in `src/views/assessment/AssessmentContainer.vue`.
- Some older views still use browser-native `confirm` or direct DOM manipulation, for example `handleLogout()` in `src/views/Layout.vue` and the initialization failure fallback in `src/main.ts`.

### Pinia patterns

- Both Pinia styles coexist.
- Options-style stores are used in files like `src/stores/auth.ts` and `src/stores/student.ts`.
- Setup-style stores are also used, for example `src/stores/systemConfig.ts`.
- Store naming is domain-based rather than heavily abstracted: `auth`, `student`, `assessment`, `resource`, `systemConfig`.

### Router and page composition

- The app uses static route declarations in `src/router/index.ts`, not registry-driven routing.
- Route components are lazy-loaded with inline import factories in `src/router/index.ts`.
- Menu display is derived from router metadata plus a manual order list in `src/views/Layout.vue`.
- Hidden devtools and migration pages remain in the main router tree and are marked by `meta.hideInMenu`, which is a current fact and a documented platform debt.

### Strategy and registry composition

- Assessment is the cleanest reusable platform pattern in the repo: `AssessmentContainer` plus `ScaleDriver` contracts in `src/types/assessment.ts`.
- Drivers are instantiated through a registry/factory with instance caching in `src/strategies/assessment/index.ts`.
- Module metadata uses a singleton registry in `src/core/module-registry.ts`, but this registry currently drives metadata/config/IEP lookup more than routing.
- Module config is currently persisted to `localStorage` in `src/core/module-registry.ts`, matching the current-state docs that call out config persistence as transitional.

## TypeScript Style And API Shape

### Strongly-typed where the architecture matters

- Shared contracts are centralized under `src/types/`, especially `src/types/assessment.ts`, `src/types/module.ts`, and `src/types/class.ts`.
- Infra and strategy files often include descriptive JSDoc/TSDoc blocks, especially in `src/types/assessment.ts`, `src/strategies/assessment/BaseDriver.ts`, and `src/database/resource-api.ts`.
- Interfaces and result objects are favored over loosely typed positional returns, for example `NavigationDecision`, `ScoreResult`, and `AssessmentFeedback`.

### Pragmatic typing at boundaries

- The database layer still uses `any` heavily at SQL.js boundaries, for example `protected db: any` in `src/database/api.ts` and wrapper signatures in `src/database/sql-wrapper.ts`.
- Renderer-to-main and raw SQL.js boundaries also rely on casts like `(window as any).electronAPI` and raw DB escape hatches such as `getRawDB()` in `src/database/sql-wrapper.ts`.
- “Async” API methods in `src/database/api.ts` often wrap synchronous SQL.js operations. The async name expresses call-site ergonomics, not actual async database IO.

### Important current inconsistency

- Type discipline is a desired direction, not a repo-wide invariant yet.
- `npm run type-check` currently fails across components, games, resource pages, database helpers, and even `tests/performance/*`, so new work should not assume “type-check clean means the repo convention is already fully enforced.”

## Database And Persistence Patterns

### Mainline persistence model

- The current mainline database is render-process `sql.js` wrapped by `SQLWrapper`, as documented in `AGENTS.md` and implemented in `src/database/init.ts` and `src/database/sql-wrapper.ts`.
- `initDatabase()` in `src/database/init.ts` is the central initializer and `getDatabase()` is the shared accessor.
- Database files are loaded from Electron via IPC when available, or from IndexedDB fallback in web mode.
- Writes are debounced for 2000 ms in `src/database/sql-wrapper.ts`, then exported and sent to `save-database-atomic` in the main process.
- Immediate flushes exist for critical operations via `saveNow()` and domain-specific `forceSave()` helpers, for example in `src/database/class-api.ts`.

### SQL authoring style

- SQL is authored inline as multi-line template literals in API classes and migration utilities.
- The repo does not use an ORM or query builder.
- Base access patterns are `db.run`, `db.get`, `db.all`, and `db.prepare`, wrapped in `DatabaseAPI` for most business APIs.
- Complex features stay close to SQL, for example `GROUP_CONCAT`, `EXISTS`, and inline aggregation in `src/database/resource-api.ts`.

### Resource model conventions

- New resource work is expected to go through the unified `sys_training_resource`, `sys_tags`, and `sys_resource_tag_map` model, matching both docs and `src/database/resource-api.ts`.
- Legacy compatibility is still present through fields like `legacy_id` and `legacy_source`.
- Resource metadata is stored as JSON text in `meta_data` and parsed at the edge, for example in `ResourceAPI.mapToResourceItem()`.

### Migration and verification conventions

- Migration and verification code often bypasses the debounced wrapper and uses raw SQL.js objects for deterministic checks, for example in `src/database/migration/migration-verification.ts`, `src/database/migrate-report-constraints.ts`, and `src/database/test/class-snapshot-verification.ts`.
- This raw-DB bypass is an accepted local convention for maintenance tooling, not the normal app path.

## Error Handling And Logging

### Common renderer pattern

- Most service/store/component operations use `try/catch`, log via `console.error` or `console.warn`, and then either rethrow or convert to UI feedback.
- Business APIs often return `boolean` or `null` for recoverable cases and throw only for misuse or hard failures.
- Example patterns appear in `src/stores/auth.ts`, `src/stores/student.ts`, `src/database/api.ts`, `src/database/resource-api.ts`, and `src/views/assessment/AssessmentContainer.vue`.

### Main-process pattern

- `electron/main.mjs` adds `safeLog()` and `safeError()` wrappers to reduce broken-pipe crashes during logging.
- Main-process file and protocol handlers validate inputs aggressively, especially for `resource://` and asset-save/delete IPCs in `electron/main.mjs`.

### Defensive fallbacks

- Current code frequently favors resilience over strict failure propagation.
- Examples include IndexedDB fallback in `src/database/init.ts`, optional Electron feature fallback in `electron/preload.mjs`, and metadata parse fallback in `src/database/resource-api.ts`.
- The tradeoff is that some failures degrade quietly, so debugging still depends heavily on console output and manual verification.

## Documentation And Update Conventions

### Current-state documentation rules

- Current facts come first from `README.md`, `重构实施技术规范.md`, `PROJECT_CONTEXT.md`, current PRD/report docs, then active plans, per `AGENTS.md` and `docs/DOCS_GUIDE.md`.
- Historical planning and reference material must be treated as history, not as current implementation truth.
- Current product/state descriptions must explicitly distinguish shipped behavior from target-state architecture.

### Required documentation hygiene

- When current document entry points change, the repo expects synchronized updates to `README.md`, `docs/INDEX.md`, and `PROJECT_CONTEXT.md`, per `AGENTS.md`.
- New current-state docs should usually live in `docs/planning/` or `docs/reports/`, not in the root of `docs/`.
- `docs/references/`, `.planning/`, `.archive/`, `.claude/`, and `.gemini/` are not treated as primary current-state product documentation.

## Practical Quality Expectations

### What is clearly preferred

- Local-first behavior over online dependencies.
- Zero native runtime dependencies for new work, called out in `AGENTS.md` and `重构实施技术规范.md`.
- Reuse of platform abstractions instead of adding one-off vertical implementations.
- For assessment work, extend `AssessmentContainer` and `ScaleDriver`.
- For resource work, prefer `ResourceAPI` and the `sys_*` model over old tables.

### What is still transitional

- Static routing and menu assembly instead of registry-driven composition.
- LocalStorage-backed module/system settings in some paths.
- Mixed naming remnants from historical product stages.
- Hidden devtools and migration pages inside the main application router.
- Mixed API surfaces such as `window.electronAPI` being standard while `src/components/ResourceUpload.vue` still uses `window.api.invoke(...)`.

## Bottom Line

The repo’s strongest current conventions are architectural, not stylistic: local-first Electron + Vue, SQL.js wrapped by `SQLWrapper`, static router composition, container-plus-driver assessment flows, and unified `sys_*` resource modeling. Formatting and typing standards exist, but they are only partially enforced in practice because legacy code and current `type-check` debt still coexist with the newer patterns.
