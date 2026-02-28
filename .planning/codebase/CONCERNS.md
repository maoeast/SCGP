# Codebase Concerns

**Analysis Date:** 2026-02-28

## Tech Debt

**Main Thread SQLite Bottleneck:**
- Issue: Web Worker implementation (`db.worker.ts`) was abandoned due to Vite CommonJS module incompatibilities with `sql.js`. All SQL queries run on the main UI thread.
- Files: `src/database/sql-wrapper.ts`, `src/database/init.ts`
- Impact: Large queries or FTS searches will block the UI, causing jank during typing or rendering.
- Fix approach: Re-investigate Worker instantiation natively using URL imports in Vite, or use `better-sqlite3` strictly in Electron Main process and communicate over IPC.

**Resource Protocol Security:**
- Issue: `resource://` custom protocol allows reading from disk.
- Files: `electron/protocols/resource.ts` (or main.ts)
- Impact: Potential Directory Traversal attacks if path resolution logic (`safeResolveResource`) is flawed or altered.
- Current mitigation: Path normalization. Must strictly ensure paths do not resolve outside `userData/resource_assets/`.

**JSON Parsing in DB:**
- Issue: `ability_tags` and `raw_scores` are stored as JSON strings in the database instead of related tables (in older schemas).
- Files: `src/database/api.ts`
- Impact: Cannot easily query or index by specific tags/scores without application-level filtering or complex string matching.
- Fix approach: Continue the Phase 1.2 Schema Migration to migrate all JSON-stored relationships to junction tables (like `sys_resource_tag_map`).

## Known Bugs

**Data Loss on Crash (Debounce Window):**
- Symptoms: If the app forcefully crashes or loses power within 2000ms of a write, data is lost.
- Files: `src/database/sql-wrapper.ts`
- Trigger: Rapidly inputting data and closing the app non-gracefully.
- Workaround: Some critical actions call `await classApi.forceSave()` to bypass the debounce.

**WebGazer Incompatibility:**
- Symptoms: Eye tracking for games fails.
- Files: `src/components/games/visual/VisualTracker.vue`, `index.html`
- Trigger: Running visual tracking games in current build.
- Workaround: Disabled via HTML comment. Defaults to mouse-tracking. Needs a hardware validation lab.

## Fragile Areas

**PDF Export:**
- Files: `src/utils/exportUtils.ts`
- Why fragile: Uses `html2canvas`. Very susceptible to CSS changes, flexbox, and scrolling issues. Previous bug caused infinite loops in pagination.
- Safe modification: Only use explicit pixel widths/heights and `!important` tags for export templates. Test multi-page exports rigorously.

**Assessment Scoring Formulas:**
- Files: `src/database/conners-norms.ts`, `src/strategies/assessment/ConnersPSQDriver.ts`
- Why fragile: Norm tables are hardcoded arrays. Any misalignment in index causes incorrect T-score calculation.
- Safe modification: Check against official clinical manuals.

## Scaling Limits

**Local SQLite:**
- Current capacity: Works perfectly for local single-school installations.
- Limit: No capability for multi-device sync or cloud backup beyond file zipping.
- Scaling path: Export/Import flows or syncing SQLite file via an external cloud agent.

## Test Coverage Gaps

**Automated Testing:**
- What's not tested: The entire application has NO automated CLI-based unit tests or CI pipelines.
- Files: Everywhere.
- Risk: High regression risk during refactors.
- Priority: High. Introduce Vitest for at least the `src/strategies/` (scoring logic) and `src/database/` (data mappers).

---

*Concerns audit: 2026-02-28*
