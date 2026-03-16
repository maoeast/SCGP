# SCGP Testing Map

## Scope And Evidence

This document is based on the current repository state on 2026-03-16, using `package.json`, `tsconfig.node.json`, `docs/reports/2026-03-11-assessment-cleanup.md`, `docs/reports/2026-03-13-scgp-prd-gap-analysis.md`, `tests/performance/benchmark-core.ts`, `tests/performance/benchmarks.ts`, `tests/performance/types.ts`, `test-sdq-e2e.py`, `src/database/migration/migration-verification.ts`, `src/database/migration/compatibility-adapter.ts`, `src/database/migration/migration-test-data.ts`, `src/database/test/class-snapshot-verification.ts`, `src/database/test/class-test-data.ts`, `src/database/equipment-test-data.ts`, `src/database/mock-data.ts`, `src/database/mock-db.ts`, `src/views/devtools/BenchmarkRunner.vue`, `src/views/devtools/MigrationVerification.vue`, `src/views/devtools/ClassSnapshotVerification.vue`, `src/views/devtools/ClassSnapshotTestLite.vue`, `src/views/devtools/WorkerTest.vue`, `src/views/devtools\SchemaMigration.vue`, `src/views/SQLTest.vue`, `src/views/WeeFIMTest.vue`, `src/router/index.ts`, plus direct command checks of `npm run type-check` and `python -m py_compile test-sdq-e2e.py`.

## Rule Levels

### Tooling that actually exists

- The repo has verification scripts for `type-check`, `build`, and `build:web` in `package.json`.
- There is no `npm test` script and no configured JS unit-test runner in `package.json`.
- `tsconfig.node.json` allows future config files like `vitest.config.*`, `cypress.config.*`, and `playwright.config.*`, but those configs do not currently exist in the repo.

### Informal and manual practice

- A large part of the repo’s practical testing happens through hidden in-app devtools pages and purpose-built verification utilities.
- Several “tests” are really diagnostic flows, migration validators, or performance harnesses rather than hermetic automated tests.

## Current Test Commands

### Available CLI verification commands

- `npm run type-check`
  - Runs `vue-tsc --build`.
  - This is the closest thing to a repo-wide automated gate.
- `npm run build`
  - Runs `type-check` and then `vite build` through `run-p`.
- `npm run build:web`
  - Builds the renderer for Electron mode.

### Commands that are not pure verification

- `npm run lint`
  - Runs `eslint . --fix --cache`.
  - Because it uses `--fix`, it is a mutating command, not a read-only test command.
- `npm run dev`
  - Starts the app and is the entry point for most manual checks.

## Actual Frameworks And Test Surfaces

### 1. Type checking

- TypeScript checking is handled by `vue-tsc` via `npm run type-check`.
- This check currently covers application code and also reaches `tests/performance/*`.
- It does not represent a clean baseline yet.

### 2. No JS unit/integration framework

- There is no `vitest`, `jest`, `mocha`, `ava`, `@vue/test-utils`, `playwright` npm dependency, or browser E2E config wired into the Node toolchain.
- There are no active `__tests__` suites under `src/`.
- ESLint ignoring `coverage/**` does not imply real coverage generation; it only shows the repo anticipated that directory format.

### 3. Custom performance harness

- Performance testing is implemented in `tests/performance/benchmark-core.ts`, `tests/performance/benchmarks.ts`, and `tests/performance/types.ts`.
- This is a custom benchmark framework, not a standard benchmark runner.
- It measures duration, percentile metrics, throughput, and optional memory deltas.
- The UI wrapper is `src/views/devtools/BenchmarkRunner.vue`, which imports and runs the benchmark suite inside the app.

### 4. In-app verification pages

- The router exposes hidden diagnostic routes in `src/router/index.ts`:
- `/sql-test` via `src/views/SQLTest.vue`
- `/weefim-test` via `src/views/WeeFIMTest.vue`
- `/worker-test` via `src/views/devtools/WorkerTest.vue`
- `/schema-migration` via `src/views/devtools/SchemaMigration.vue`
- `/migration-verification` via `src/views/devtools/MigrationVerification.vue`
- `/benchmark-runner` via `src/views/devtools/BenchmarkRunner.vue`
- `/class-snapshot-verification` via `src/views/devtools/ClassSnapshotVerification.vue`
- `/class-test-lite` via `src/views/devtools/ClassSnapshotTestLite.vue`
- These routes are hidden from menus with `meta.hideInMenu`, but they are still part of the main app router.

### 5. Verification utilities embedded in source

- Migration validation logic lives in `src/database/migration/migration-verification.ts`.
- Migration double-write/fallback validation lives in `src/database/migration/compatibility-adapter.ts`.
- Class snapshot scenario validation lives in `src/database/test/class-snapshot-verification.ts`.
- Generated or mock data helpers live in files such as `src/database/migration/migration-test-data.ts`, `src/database/test/class-test-data.ts`, `src/database/equipment-test-data.ts`, `src/database/mock-data.ts`, and `src/database/mock-db.ts`.

### 6. Standalone Python E2E artifact

- A standalone Python Playwright file exists at `test-sdq-e2e.py`.
- It is not wired into `package.json`, not supported by a repo-level Python dependency manifest, and not part of a repeatable CI path.
- On 2026-03-16, `python -m py_compile test-sdq-e2e.py` fails with `SyntaxError: invalid syntax` at line 79, so this script is currently not runnable as-is.

## Current Verification Results

### `npm run type-check`

- Directly verified on 2026-03-16.
- Result: failing.
- Failures are widespread, not isolated to one subsystem.
- Current error clusters include:
- renderer component typing in files like `src/components/AddStudentDialog.vue`, `src/components/ResourceUpload.vue`, `src/views/Layout.vue`
- games and media flows such as `src/components/games/audio/GameAudio.vue`, `src/components/games/visual/GameGrid.vue`, `src/components/games/visual/VisualTracker.vue`
- database helpers such as `src/database/database.ts`, `src/database/mock-db.ts`, `src/database/equipment-test-data.ts`
- resource and plan UIs such as `src/views/resource-center/TrainingResources.vue`, `src/views/Resources.vue`, `src/views/plan/PlanList.vue`
- devtools and performance code such as `src/views/devtools/MigrationVerification.vue` and `tests/performance/benchmark-core.ts`
- This aligns with `docs/reports/2026-03-11-assessment-cleanup.md`, which already noted that targeted areas were cleaned up earlier while full-repo `type-check` remained incomplete.

### `python -m py_compile test-sdq-e2e.py`

- Directly verified on 2026-03-16.
- Result: failing.
- The script currently contains invalid Python control flow and cannot serve as a usable smoke test until repaired.

## Coverage Shape

### Areas with the strongest current verification story

- Assessment refactor work often gets targeted type-check passes and report-specific manual validation, as documented in `docs/reports/2026-03-11-assessment-cleanup.md`.
- Schema/resource migration work has explicit verification utilities in `src/database/migration/migration-verification.ts` and related UI tooling in `src/views/devtools/MigrationVerification.vue`.
- Class-management snapshot behavior has dedicated scenario verification in `src/database/test/class-snapshot-verification.ts` and UI wrappers in `src/views/devtools/ClassSnapshotVerification.vue` and `src/views/devtools/ClassSnapshotTestLite.vue`.
- Performance regression checks are better defined than unit coverage, thanks to `tests/performance/*` and `src/views/devtools/BenchmarkRunner.vue`.

### Areas with weak or missing coverage

- No standardized unit tests for components, stores, or composables.
- No established JS integration test runner for router guards, Pinia interactions, or IPC boundaries.
- No stable end-to-end harness for assessment flows, login flows, resource management, or backup/restore.
- No code-coverage reporting pipeline.
- No CI-visible pass/fail contract beyond ad hoc local command execution.
- Hidden devtools pages are helpful for humans but do not replace automated regression protection.

## Fixtures, Mocks, And Utilities

### Data generators and scenario helpers

- `src/database/equipment-test-data.ts`
  - Generates equipment/training test data and synthetic records.
- `src/database/test/class-test-data.ts`
  - Builds class-management scenario data.
- `src/database/migration/migration-test-data.ts`
  - Supplies migration test cases and edge cases.

### Mocking utilities

- `src/database/mock-data.ts`
  - Provides fake row sets for database-like operations.
- `src/database/mock-db.ts`
  - Implements a lightweight mock database layer for local validation or isolated logic testing.

### Verification engines

- `src/database/migration/migration-verification.ts`
  - Performs count matching, tag/legacy integrity, orphan checks, duplicate checks, and summary reporting.
- `src/database/migration/compatibility-adapter.ts`
  - Encodes dual-write and fallback-read validation ideas for transition safety.
- `src/database/test/class-snapshot-verification.ts`
  - Encodes a multi-phase scenario test with setup, mutation, and final assertions.

## Manual Verification Patterns In This Repo

### Common current workflow

- Start the app with `npm run dev`.
- Navigate directly to the hidden route for the feature under test.
- Use real or generated local database data instead of an isolated ephemeral test database.
- Confirm correctness from UI messages, generated reports, table rows, or console logs.

### Examples

- Performance checks:
  - Open `/benchmark-runner`.
  - Choose suites and export the generated report from `src/views/devtools/BenchmarkRunner.vue`.
- Migration checks:
  - Open `/migration-verification`.
  - Run full verification or focused count/integrity checks against the current local DB.
- Class snapshot checks:
  - Open `/class-snapshot-verification` or `/class-test-lite`.
  - Execute the scenario that creates classes, records history, simulates upgrade, then checks snapshot isolation.
- Assessment smoke checks:
  - Use the real app flow through `/assessment`, student selection, `AssessmentContainer`, and the report pages.
  - This is consistent with the targeted validation style described in `docs/reports/2026-03-11-assessment-cleanup.md`.

## Important Gaps And Risks

### Enforced gaps

- There is no automated repo-standard `npm test` path.
- There is no green repo-wide `npm run type-check` baseline.
- There is no working JS E2E runner currently wired into the project.

### Observed testing risks

- `npm run lint` auto-fixes files, so it is unsafe as a passive verification step in a dirty or shared worktree.
- The performance suite writes and deletes real rows in tables like `train_log` inside `tests/performance/benchmarks.ts`, so it is not hermetic.
- Migration and snapshot verification tools often bypass `SQLWrapper` and use raw SQL.js handles for determinism, which is valid for tooling but means they do not exercise the exact production persistence path end-to-end.
- Hidden verification routes live in the same router as production pages, which matches the platform-debt note in `docs/reports/2026-03-13-scgp-prd-gap-analysis.md`.
- The standalone Python E2E script is broken and unsupported by project-level Python setup.

## Practical Read On The Current Testing Strategy

The repo’s real testing strategy is “targeted static checking plus scenario-specific manual or semi-manual verification,” not automated unit or E2E coverage. The strongest current assets are migration validators, class snapshot scenario checks, assessment-focused targeted type work, and the custom performance harness. The weakest areas are repeatability, automation, CI-style gating, and broad regression coverage across the main product flows.
