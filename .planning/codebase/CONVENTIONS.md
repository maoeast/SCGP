# Coding Conventions

**Analysis Date:** 2026-02-28

## Naming Patterns

**Files:**
- Vue Components: `PascalCase.vue` (e.g. `ResourceSelector.vue`)
- TypeScript Logic: `kebab-case.ts` (e.g. `iep-generator.ts`)
- Strategy Classes: `PascalCaseDriver.ts` (e.g. `SMDriver.ts`, `SensoryIEPStrategy.ts`)
- Archives/Deprecated: Prefix with `_archived/` or add `_` to name.

**Functions:**
- General: `camelCase`
- Data Fetches: Prefix with `get`, `fetch`, or `load` (e.g. `getStudentAssessments`)
- Event Handlers: Prefix with `handle` (e.g. `handleSave`, `handleViewReport`)

**Variables:**
- General: `camelCase`
- Constants: `UPPER_SNAKE_CASE` (e.g. `DUAL_WRITE_ENABLED`)

**Types/Interfaces:**
- General: `PascalCase` without `I` prefix (e.g. `ScaleDriver`, `StudentContext`)

## Code Style

**Formatting:**
- Tool: `prettier`
- Key settings: Used via `eslint-plugin-prettier` and `eslint.config.ts`. Strict adherence enforced by `npm run format`.

**Linting:**
- Tool: `eslint` (v9 flat config `eslint.config.ts`)
- Plugins: `@vue/eslint-config-typescript`, `eslint-plugin-vue`

## Import Organization

**Path Aliases:**
- Use `@/` to refer to the `src/` directory.
- Example: `import { getDatabase } from '@/database/init'`

## Error Handling

**Patterns:**
- DB Calls: Wrapping `db.run` in `try/catch` and logging `console.error` before re-throwing, allowing UI to catch and display `ElMessage.error`.
- Legacy/Missing Data: Fallback variables or `?.` operators are common (e.g. using `legacy_id` when `sys_training_resource.id` is unlinked).

## Logging

**Framework:**
- `console.log`, `console.warn`, `console.error` in Renderer.
- `safeLog()` and `safeError()` wrappers in `electron/main.mjs` to prevent `EPIPE` exceptions during high-frequency writes.

## Comments

**When to Comment:**
- Use JSDoc/TSDoc for Classes and APIs to define input/output and behavior (e.g., `/** * 根据查询选项获取资源列表 */`).
- Use `// TODO:` for pending features (e.g., `// TODO: 实现游戏记录详情查看`).
- Use `/** @deprecated */` for archived components.

## Function Design

**Parameters:**
- Complex filters use destructured Options interfaces (e.g. `getResources(options: ResourceQueryOptions)`).

## Module Design

**Vue SFC Structure:**
- Use `<script setup lang="ts">` pattern exclusively.
- Template typically follows script, style at the bottom.
- Prefer `ref` over `reactive` for primitive and simple object states.

**OOP Abstractions:**
- Database APIs extend base `DatabaseAPI` class to access `this.db.all()`.
- Strategy classes implement specific interfaces (`ScaleDriver`).

---

*Convention analysis: 2026-02-28*
