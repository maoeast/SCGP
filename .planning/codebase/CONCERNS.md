# Codebase Concerns

**Analysis Date:** 2026-03-16
**Scope:** current repository state, with conclusions grounded in current code and current project docs rather than historical plans alone.

## Basis Reviewed

- Repo entry and product boundary docs: `AGENTS.md`, `README.md`, `PROJECT_CONTEXT.md`, `重构实施技术规范.md`, `docs/planning/2026-03-13-scgp-current-prd.md`, `docs/reports/2026-03-13-scgp-prd-gap-analysis.md`, `docs/INDEX.md`
- Core runtime and platform files: `src/main.ts`, `src/router/index.ts`, `src/core/module-registry.ts`, `src/core/strategies-init.ts`, `src/database/init.ts`, `src/database/sql-wrapper.ts`, `src/database/api.ts`, `src/database/resource-api.ts`, `electron/main.mjs`, `electron/preload.mjs`
- Product entry surfaces: `src/views/Layout.vue`, `src/views/Login.vue`, `src/views/Activation.vue`, `src/views/System.vue`, `src/views/system/SystemSettings.vue`, `src/views/assessment/AssessmentSelect.vue`, `src/views/resource-center/TrainingResources.vue`, `src/views/resource-center/TeachingMaterials.vue`
- Test and diagnostic surfaces: `tests/performance/benchmarks.ts`, `src/views/devtools/WorkerTest.vue`, `src/workers/db.worker.ts`, `src/workers/db-bridge.ts`

## Confirmed Issues

### 1. Main persistence path re-arms itself after a successful save

- `src/database/sql-wrapper.ts` marks `isDirty = true` in `triggerDebouncedSave()`, but `performAtomicSave()` never clears that dirty bit before a successful save completes.
- In `finally`, `performAtomicSave()` sees `isDirty`, clears it, then immediately calls `triggerDebouncedSave()` again, which sets `isDirty = true` and schedules another save.
- The same save-loop shape also exists in the unused Worker path in `src/workers/db.worker.ts`.
- This is not just architectural debt; it is a current runtime defect in the active `SQLWrapper` path used by `src/database/api.ts` and initialized from `src/main.ts`.
- Likely impact: repeated IPC writes to `save-database-atomic`, avoidable disk churn, noisy logs, harder-to-reason-about shutdown/save timing.

### 2. Trial-mode product flow is internally inconsistent and likely unusable

- `src/stores/auth.ts` models trial correctly with `isActivated = false` and `isInTrial = true`.
- `src/router/index.ts` also correctly allows login/use during trial by checking `!isActivated && !isInTrial`.
- But `src/views/Login.vue` redirects to `/activation` whenever `!authStore.isActivated`, ignoring `isInTrial`.
- `src/views/Layout.vue` also redirects authenticated users to `/activation` whenever `!authStore.isActivated`, again ignoring `isInTrial`.
- `src/views/Activation.vue` only leaves the activation page when `isActivated` is true, so trial users remain trapped on activation-oriented UI.
- `src/router/index.ts` additionally redirects `/` to `/activation`, which amplifies the mismatch.
- This conflicts with the current PRD description in `docs/planning/2026-03-13-scgp-current-prd.md`, which states that trial users can continue to log in and use the product.

### 3. Backup/restore still targets an old schema subset while UI copy claims full-system coverage

- `src/utils/backup.ts` backs up a hardcoded list of old/legacy tables such as `resource_meta`, `teacher_fav`, `system_config`, and early assessment/training tables.
- It does not include current platform tables such as `sys_training_resource`, `sys_tags`, `sys_resource_tag_map`, `sys_class`, `student_class_history`, `sys_class_teachers`, `csirs_assess`, `conners_psq_assess`, `conners_trs_assess`, `sdq_assess`, `srs2_assess`, `cbcl_assess`, `equipment_training_records`, `equipment_training_batches`, or current report/index tables.
- It also does not package physical resource files under `userData/resources`, even though current runtime resource serving is based on `resource://` in `electron/main.mjs`.
- `src/views/System.vue` still tells the user that backup contains all student, assessment, and training data.
- This directly matches the gap called out in `docs/reports/2026-03-13-scgp-prd-gap-analysis.md`: the code confirms the gap is real, not just a planning note.

### 4. The repo is still running two different resource systems in parallel

- New training-resource path:
  - `src/database/resource-api.ts`
  - `src/views/resource-center/TrainingResources.vue`
  - storage model: `sys_training_resource` + `sys_tags` + `sys_resource_tag_map`
- Old teaching-material/resource-library path:
  - `src/database/api.ts` `ResourceAPI`
  - `src/stores/resource.ts`
  - `src/views/resource-center/TeachingMaterials.vue`
  - storage model: `resource_meta` + `teacher_fav`
- This means the current "资源中心" is not actually on one model. The training tab and teaching tab are backed by different tables, different store code, different upload/import paths, and different favorite implementations.
- `src/views/Resources.vue` and `src/views/admin/ResourceManager.vue` are marked deprecated, but the old `TeachingMaterials.vue` path is still active inside `src/views/admin/ResourceCenter.vue`.
- This is confirmed product/architecture drift relative to `重构实施技术规范.md` and `docs/planning/2026-03-13-scgp-current-prd.md`, both of which describe the unified `sys_*` resource model as the preferred current direction.

### 5. Resource file lifecycle is not actually closed on the active code paths

- `electron/main.mjs` exposes `SAVE_ASSET`, `DELETE_ASSET`, and `resource://`, but repository-wide usage is incomplete.
- `src/database/resource-api.ts` soft-deletes rows with `is_active = 0`; it does not delete files.
- `src/database/resource-api.ts` `hardDeleteResource()` deletes DB rows and tag/favorite relations, but still does not delete physical files.
- Old `src/database/api.ts` `ResourceAPI.deleteResource()` removes rows from `resource_meta` and `teacher_fav`, again with no physical file cleanup.
- Repository search shows `DELETE_ASSET` is registered in `electron/main.mjs` but not wired into the actual resource deletion flows.
- Current resource metadata and current files can therefore drift apart indefinitely.

### 6. Old upload/import flows write to installation resources, not the new `userData/resources` path

- `src/utils/resource-manager.ts` resolves its writable base via `window.electronAPI.getAppPath()`.
- `electron/main.mjs` `get-app-path` returns the installation `resources` directory in production, not `userData/resources`.
- Old upload screens (`src/views/resource-center/TeachingMaterials.vue`, `src/views/Resources.vue`) call `resourceManager.saveFile()`, which writes via `save-file` into that installation path.
- New runtime serving and new secure asset IPC are built around `userData/resources` and `resource://` in `electron/main.mjs`.
- Result: old teaching-material upload/import flows and the new resource protocol are targeting different physical storage roots.
- Operationally, this is risky on installed builds where application resource directories may be read-only or managed by installer/update tooling.

### 7. Favorites are implemented only on the old resource path; the new path is still a stub

- `src/database/resource-api.ts` accepts `favoritesOnly` but leaves it as a `TODO`.
- `src/components/resources/ResourceSelector.vue` and the module resource flows can pass `favoritesOnly`, but the new `sys_*` query path does nothing with it.
- Old favorites still exist only in `src/database/api.ts` via `teacher_fav` and in `src/stores/resource.ts`.
- This is a confirmed partial migration, not just a missing enhancement.

### 8. `ModuleRegistry` is not the platform source of truth; router and entry UIs still are

- `src/core/module-registry.ts` registers module metadata and experimental modules.
- `src/core/strategies-init.ts` only registers one concrete IEP strategy (`SensoryIEPStrategy`).
- `src/router/index.ts` still statically defines the route tree and menu-bearing entries.
- `src/views/Layout.vue` derives menu items from `router.getRoutes()`, not from `ModuleRegistry`.
- `src/views/assessment/AssessmentSelect.vue` hardcodes scale cards instead of driving them from registry/config.
- This confirms the current architecture described in `AGENTS.md` and `重构实施技术规范.md`: registry exists, but routing/navigation are still static and split-brain.

### 9. Future modules are visible in active UI surfaces even though delivery is incomplete

- `src/core/module-registry.ts` registers `emotional` and `social` as `experimental`.
- `src/views/games/GameModuleMenu.vue`, `src/views/equipment/EquipmentMenu.vue`, and `src/views/training-records/TrainingRecordsMenu.vue` display those modules as real selectable cards with counts/status overlays.
- The top-level router in `src/router/index.ts` still exposes only the current core product routes, and there is no complete end-to-end business chain for those future modules.
- This matches the docs' warning that future modules are mostly placeholder/preparatory, but the code still exposes them inside running product flows, which risks user confusion.

### 10. Product naming is still materially inconsistent across runtime, packaging, and defaults

- Current docs define the product as `SCGP / 星愿能力发展平台`.
- Packaging still uses old naming:
  - `package.json` `productName`: `感官能力发展系统`
  - `package.json` `appId`: `com.sic.ads`
- Runtime/default naming is also mixed:
  - `src/router/index.ts` fallback title: `生活自理适应综合训练`
  - `src/database/init.ts` seeds `system_name` as `生活自理适应综合训练`
  - `src/views/System.vue`, `src/views/Login.vue`, `src/views/Layout.vue`, `src/views/system/SystemSettings.vue`, `src/stores/systemConfig.ts` default to `感官综合训练与评估`
  - `src/components/AboutDialog.vue` still shows `感官能力发展系统`
- This is confirmed runtime/documentation drift, not only historical residue in archive docs.

### 11. There are stale or broken integration surfaces still living in active source

- `electron/preload.mjs` exposes `window.electronAPI`, but not `readFile`.
- `src/views/resource-center/TeachingMaterials.vue`, `src/views/Resources.vue`, and `src/utils/resource-importer.ts` still call `window.electronAPI.readFile`.
- `src/components/ResourceUpload.vue` calls `window.api.invoke('SAVE_ASSET', ...)`, but the preload exposes `window.electronAPI`, not `window.api`.
- These are concrete API mismatches inside current source. Even if some paths are deprecated or low-traffic, they increase regression risk and make it harder to tell which integration contract is real.

### 12. Auth and local security are intentionally lightweight, but some current surfaces are weaker than the surrounding UX suggests

- Password hashing in `src/database/api.ts` and `src/database/init.ts` is still `btoa(password + salt)`, which is only obfuscation-level protection.
- Session token generation in `src/stores/auth.ts` is just `btoa(\`\${user.id}:\${Date.now()}\`)` stored in `localStorage`.
- `src/views/Login.vue` exposes an on-screen "重置管理员密码" flow that resets account `1` to `admin123` after a confirm dialog.
- `src/database/init.ts` also seeds default admin credentials as `admin/admin123`.
- For a local-first offline desktop product this may be an accepted tradeoff, but it remains a confirmed operational/security risk and should not be described externally as strong access control.

### 13. Test coverage is still manual/devtools-driven; there is no automated regression gate

- `package.json` has no `test` script and no unit/integration test runner dependency such as Vitest or Jest.
- There is no `.github` workflow or other visible CI gate in the repo.
- Existing verification relies on manual pages and scripts:
  - `src/views/devtools/WorkerTest.vue`
  - `src/views/devtools/SchemaMigration.vue`
  - `src/views/devtools/BenchmarkRunner.vue`
  - `tests/performance/benchmarks.ts`
- This is consistent with the older `TESTING.md` map, but it remains a confirmed maintainability and release risk for a repo with heavy schema, scoring, and report logic.

### 14. Assessment progress persistence is only half-implemented

- `src/views/assessment/AssessmentContainer.vue` saves progress to `localStorage` on teardown.
- `restoreProgress()` only logs that saved progress exists; it does not rehydrate state or ask the user to resume.
- `AssessmentSelect.vue` tells the user that progress will be auto-saved if they exit midway.
- Current behavior therefore saves state without a real recovery experience, which is confirmed product-behavior drift rather than a documentation-only problem.

### 15. Database/bootstrap logic is heavily centralized and duplicates defaults in multiple places

- `src/database/init.ts` is a large, mixed-responsibility file that includes inlined schema, bootstrap logic, migration helpers, seed data, class-table initialization, backup hooks, default admin creation, and legacy compatibility paths.
- The file contains multiple seed/default creation paths for admin credentials and `system_config` defaults, including repeated old product names.
- This increases the chance that future fixes land in one bootstrap path but not another.
- The current naming drift in `system_name` seeding is already evidence that this duplication is causing divergence.

## Confirmed Fragile Areas

### PDF/report export remains DOM-capture heavy and CSS-sensitive

- `src/utils/exportUtils.ts` mutates live DOM styles, hides transient UI elements, captures full DOM with `html2canvas`, then rasterizes into PDF.
- This is inherently brittle against layout/CSS changes, large pages, and browser/Electron rendering differences.
- Risk is especially high because report pages are numerous and separate, while export relies on generic DOM snapshotting rather than document-specific renderers.

### Eye-tracking game implementation is large, stateful, and hardware-dependent

- `src/components/games/visual/VisualTracker.vue` is a large component mixing calibration flow, debug tooling, runtime gaze tracking, game mechanics, and result rendering.
- This area has many moving parts and little automated verification.
- Given the current manual-test posture, regressions here are likely to surface late and only under specific hardware/environment conditions.

### Worker path is preserved but already diverging from the real runtime path

- Current app startup in `src/main.ts` and `src/database/init.ts` uses the main-thread `SQLWrapper` path.
- `src/workers/db.worker.ts`, `src/workers/db-bridge.ts`, and `src/views/devtools/WorkerTest.vue` remain in-repo but are not the product mainline.
- This makes the worker code both useful as a future option and dangerous as a stale alternative that can silently rot.

## Inferred Risks

### 1. `resource://` security posture is acceptable for now, but still depends on custom path hygiene rather than a stricter privileged scheme

- `electron/main.mjs` uses `protocol.registerFileProtocol` plus custom path validation.
- `重构实施技术规范.md` already records that this has not yet been upgraded to a privileged scheme.
- Current checks are reasonable, but the repo should treat future protocol edits as security-sensitive.

### 2. `better-sqlite3` remaining in `package.json` keeps native-dependency pressure around even though the runtime path is `sql.js`

- This is currently only a dev dependency.
- It still weakens the repo's "zero native dependency" discipline and can complicate local setup or future tooling if it starts leaking into scripts/build assumptions.

### 3. Local caches outside the DB will continue to undermine backup/restore completeness until consolidated

- Current local-only state includes:
  - auth/session cache in `src/stores/auth.ts`
  - activation cache in `src/utils/activation-manager.ts`
  - module config in `src/core/module-registry.ts`
  - assessment progress in `src/views/assessment/AssessmentContainer.vue`
- Even after table coverage is fixed, backup/restore behavior will still be surprising unless the team decides which of these caches are disposable and which should move into durable DB-backed config/state.

### 4. Release/update UI surfaces may keep carrying old branding if naming cleanup is done only in docs

- `src/components/AboutDialog.vue`, `src/views/System.vue`, `package.json`, and DB default seeds all carry different product names.
- Any partial cleanup will likely leave installers, about dialogs, window titles, and backup metadata inconsistent unless handled as one coordinated pass.

## Suggested Watchpoints

- Watch persistence after any DB write-path change:
  - verify one mutation burst results in one save cycle, not an endless 2-second loop
  - re-test `beforeunload` and immediate-save flows in `src/main.ts`

- Watch trial-mode behavior as an end-to-end journey:
  - launch with no activation
  - enter trial
  - log in during trial
  - navigate through `Layout.vue`
  - confirm no page forces the user back to `/activation`

- Watch resource work by model, not by page:
  - explicitly decide whether a change belongs to old `resource_meta`/`teacher_fav` or new `sys_training_resource`/`sys_tags`
  - avoid adding more features to both

- Watch physical file ownership:
  - if a flow creates or deletes resources, confirm whether it writes to installation resources or `userData/resources`
  - prefer converging all writable runtime assets on the `resource://` / `userData/resources` path

- Watch naming updates as a coordinated product-surface pass:
  - installer metadata in `package.json`
  - DB defaults in `src/database/init.ts`
  - UI fallbacks in `src/views/*`, `src/stores/systemConfig.ts`, and `src/router/index.ts`
  - about/update dialogs in `src/components/AboutDialog.vue`

- Watch module expansion work for hidden static coupling:
  - adding a module currently requires touching `src/core/module-registry.ts`, `src/router/index.ts`, menu assumptions in `src/views/Layout.vue`, and often hardcoded feature-entry UIs

- Watch test debt before further schema/report expansion:
  - the repo already contains enough scoring logic, migration logic, and report branching that manual devtools-only verification is no longer a safe default
