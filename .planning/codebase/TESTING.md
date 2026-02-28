# Testing Patterns

**Analysis Date:** 2026-02-28

## Test Framework

**Runner:**
- No automated unit testing framework (Jest/Vitest) is currently configured or enforced in `package.json`.
- Testing relies heavily on **In-App DevTools & Diagnostic Views**.

## Custom Test Infrastructure

**Location:**
- `src/views/devtools/`
- `src/database/test/`
- `tests/performance/` (Manual execution scripts/views)

**Core Tools:**
- `WorkerTest.vue` - Tests Web Worker DB bridges.
- `SchemaMigration.vue` - Validates DB migrations safely.
- `BenchmarkRunner.vue` - UI to execute performance tests (`tests/performance/benchmarks.ts`).
- `ClassSnapshotTestLite.vue` - Validates business logic (e.g., snapshotting class history upon graduation).

**Run Commands:**
No CLI test commands exist. Tests are run by navigating to:
`系统管理` -> `开发者调试` in the running application (protected by `VITE_DEV_TOOLS=true`).

## Test Data Generation

**Fixtures and Factories:**
- Mock data generators are manually scripted.
- Examples: `src/database/equipment-test-data.ts`, `src/database/mock-data.ts`, `src/database/test/class-test-data.ts`.

**Patterns:**
```typescript
// Pattern: Dedicated test generator class
export class ClassTestDataGenerator {
  static async generateFullTestData() {
    // Generate entities
    // Assign relationships
    // Return report
  }
}
```

## Performance Testing

**Framework:** Custom script (`tests/performance/benchmark-core.ts`).
**Metrics Collected:** Average Time, P95 Time, Throughput (ops/s).
**Execution:**
- Wrapped in a UI runner (`BenchmarkRunner.vue`).
- Logs output to UI table rather than stdout.

## QA Strategies & Verification

- **Dual-Write Verification:** Used during database migration (`CompatibilityAdapter`) to write to old and new schemas simultaneously, triggered via `VITE_DUAL_WRITE=true`.
- **Pre-flight Checks:** Migration scripts contain `verifyBeforeMigrate` and `verifyMigration` steps that count rows to ensure 100% data retention.

## What to Write When Adding Code

Since there are no unit tests:
1. Provide a "Lite Test" view in `devtools/` if building complex logic (like state machines or data migrations).
2. Generate mock data helpers in `src/database/test/`.
3. Verify manually through UI using Edge Cases (e.g. blank DB initialization, large datasets).

---

*Testing analysis: 2026-02-28*
