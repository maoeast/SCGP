# PROJECT_CONTEXT.md

> 职责：当前有效的全局上下文摘要，补充项目事实、主线进展和当前决策。
> 何时阅读：读完 `AGENTS.md` 与 `.continue-here.md` 后，仍需要补全全局背景时。
> 不负责：承担历史流水日志；历史内容应转入 `docs/logs/`、`docs/CHANGELOG.md` 或 git history。
>
> 用途：当前有效协作上下文摘要。
> 读取策略：不再作为每次新会话默认首读文件。默认先读 `AGENTS.md`、`docs/planning/2026-03-23-scgp-context-bootstrap.md`、`README.md`；只有在需要延续工作背景时再读本文件。
> 历史说明：旧版长篇工作日志与阶段流水已从高频入口移出，历史摘要见 `docs/logs/2026-03-26-project-context-archive.md`，更细节的完成项见 `docs/CHANGELOG.md` 或 git history。

## 1. 当前项目事实

- 当前正式产品名称：`SCGP / 星愿能力发展平台`
- 历史阶段名称：
  - `生活自理适应综合训练系统`
  - `感官能力发展系统 (SIC-ADS)`
- 技术栈：`Electron + Vue 3 + TypeScript + Vite + SQL.js`
- 当前数据库主线：渲染进程内 `sql.js` + `SQLWrapper` 防抖保存
- 当前持久化主线：渲染进程导出数据库，经 IPC 交给 Electron Main 原子写入
- 当前资源主模型：`sys_training_resource + sys_tags + sys_resource_tag_map`
- 当前评估主链：`AssessmentContainer + ScaleDriver`
- 当前模块系统：已有 `ModuleRegistry`
- 当前路由现实：仍以静态路由表为主，不是注册表动态装配

## 2. 当前产品现实

当前代码主线已经具备以下可运行能力：

- 学生管理
- 能力评估
- 游戏训练
- 器材训练
- 训练记录
- 训练计划
- 报告生成
- 资源中心
- 系统管理
- 班级管理与学生分班
- 本地账号登录、激活、更新接入、备份恢复

必须持续记住的现实：

- `sensory` 仍是当前最完整的业务主链
- `emotional` 已有可运行链路，但仍处于持续补全中
- `social`、`life_skills` 等仍不是完整可交付模块
- 不要把未来模块目标态写成当前已实现现状

## 3. 当前已确认的重要变更

### 3.1 器材训练入口与 `physical-equipment`

- physical-equipment CSV 导入链路已落地
- 当前四份 physical-equipment 草稿 CSV 已规范化入库
- 器材训练内部入口已固定为 6 个：
  - `sensory-integration`
  - `emotional-regulation`
  - `social-communication`
  - `fine-motor`
  - `soothing-aids`
  - `life-skills`
- 顶层授权模型保持不变：
  - 仍按真实业务 `moduleCode`
  - `fine-motor` / `soothing-aids` 没有被提升为顶层授权模块
- 器材训练快速录入左侧分类已改为真实源分类口径，不再显示 `catalog-group / entry-group` 标签

### 3.2 首页

- 首页用户可见标题已改为：`首页看板`
- 首页副标题已改为：`聚焦今天要做的评估、训练与干预提醒，用真实业务数据支持一线决策。`

### 3.3 training-entry hard-cut 当前进度

- `training_records` 与 `equipment_training_records` 已补齐 `entry_code`
- 游戏训练新写入已写入 `entry_code`
- 器材训练新写入已写入 `entry_code`
- 训练记录菜单 / 统计 / 面板已按 `entry_code` 统计与筛选
- `src/views/equipment/Records.vue` 已改为 entry-aware 记录页
- `ModuleTrainingRecords -> EquipmentRecords` 已能携带 `recordId` 进入对应记录
- clean local dev DB 已重建并完成最小写入验证：
  - 1 条游戏记录验证 `entry_code = emotional-regulation`
  - 1 条器材记录验证 `entry_code = fine-motor`
- `SQLWrapper` 已修复“保存后错误重复再触发保存”的状态机问题
- `equipment_training_records` 的当前 schema/init 口径已改回正确资源主线：
  - `equipment_id -> sys_training_resource(id)`

## 4. 当前活跃未完成主线

当前下一条真正的大改动，不是单页修补，而是：

- 统一 `游戏训练 / 器材训练 / 训练记录`
- 收口为同一套 6 个 internal training entries

当前已确认的实施边界：

- 不考虑旧训练记录兼容
- 旧训练 / 游戏 / 器材记录允许物理删除
- 不做“旧 `module_code` 推断到新 entry”兼容层
- 保持顶层 `moduleCode` 授权模型不变

当前已做的准备：

- 已新增共享入口模型起点：`src/utils/training-entry.ts`
- `src/utils/equipment-training-entry.ts` 已被收敛为兼容包装层

当前尚未完成的关键点：

- 旧历史记录 hard-cut 的最终收口方案还未完全明确：
  - 直接物理删除，或
  - 提供一次明确 reset 路径
- 仍需继续排查是否还有 remaining old module-based record/detail flow
- 游戏资源真实覆盖仍不完整：
  - 当前真实可用仍以 sensory games + emotional scenes / care scenes 为主
  - `social-communication / fine-motor / soothing-aids / life-skills` 还不是完整游戏内容交付态
- 如后续仍复现原子写入竞态日志，再继续收口 Electron Main 的 `save-database-atomic` 串行化

## 5. 当前明确决策

- 顶层收费 / 授权继续按真实业务模块：
  - `sensory`
  - `emotional`
  - `social`
  - `life_skills`
  - `cognitive`
- `fine-motor`、`soothing-aids` 等属于内部训练入口，不是顶层授权模块
- 新资源匹配与图片解析优先按 `meta_data.resourceCode`
- 旧记录不做“旧 `module_code` 推断到新 `entry_code`”兼容层
- 文档与结论必须以当前代码现实为准，不以旧规划或目标态替代现状

## 6. 当前推荐读取顺序

默认新会话：

1. `HANDOFF.md`
2. `AGENTS.md`
3. `docs/planning/2026-03-23-scgp-context-bootstrap.md`
4. `README.md`
5. `.continue-here.md`

按需再读：

6. `PROJECT_CONTEXT.md`
7. `docs/planning/2026-03-13-scgp-current-prd.md`
8. `docs/reports/2026-03-13-scgp-prd-gap-analysis.md`
9. `重构实施技术规范.md`

## 7. 维护规则

- 本文件只保留当前有效上下文，不再积累长流水日志
- 已完成历史事项优先进入：
  - `docs/CHANGELOG.md`
  - `docs/logs/2026-03-26-project-context-archive.md`
  - git history
- `HANDOFF.md` is now the single top-level routing doc for new sessions and should stay short
- 如果本文件再次明显膨胀，应继续把历史内容迁出，而不是在这里堆积

## 8. 2026-03-30 Working Update

- A unified training-resource copy workflow is now part of current code reality.
- Source of truth for pre-release training-resource copy is:
  - `docs/references/resource-copy/2026-03-30-training-resource-copy.csv`
- Generated runtime override map is:
  - `src/data/generated-training-resource-copy.ts`
  - do not edit the generated file directly
- Current covered resource families:
  - sensory equipment
  - sensory games
  - emotional games
  - `emotion_scene`
  - `care_scene`
  - physical-equipment resources
- Existing local DBs can be synced by stable key through:
  - `npm run resource-copy:sync -- --dry-run`
  - `npm run resource-copy:sync -- --yes`
- Stable keys now matter more than names for copy sync:
  - `legacyId`
  - `taskId`
  - `gameCode`
  - `sceneCode`
  - `resourceCode`
- Important constraint:
  - do not casually reorder `src/database/equipment-data.ts`, because current sensory-equipment copy keys still depend on the legacy array order

## 9. 2026-03-31 Resource-Center Follow-up

- resource-center smoke verification is now confirmed against the live local dev DB:
  - after app relaunch and `Ctrl+R`, `emotion_scene = 80`
  - after app relaunch and `Ctrl+R`, `care_scene = 60`
  - sensory `equipment_data` resources checked for ability-tag coverage: `63 / 63`
- teaching materials now have a second-layer UI filter in addition to business dimension:
  - `video`
  - `image`
  - `document`
  - `other`
- important implementation boundary:
  - second-layer teaching-material categories are derived from existing `file_type`
  - do not add a separate persisted category field unless future runtime verification proves `file_type` is insufficient
- important zero-state constraint:
  - the teaching-material file-category filter should remain visible even when `teaching_material` is empty
  - current local dev DB still has `0` teaching-material rows, so non-zero category counts still need runtime verification with imported files

## 10. 2026-03-31 Training Workspace Layout Fix

- equipment quick-entry and game lobby now share a split-workspace scroll pattern:
  - page root: `workspace-page`
  - split container: `workspace-split`
  - left/right panes: `workspace-pane`
  - top-aligned content cards: `workspace-pane-card`
- implementation landed in:
  - `src/assets/layout.css`
  - `src/views/equipment/QuickEntry.vue`
  - `src/views/games/GameLobby.vue`
- behavior target:
  - left resource lists scroll independently
  - right data-entry / preview pane stays in the visible workspace instead of being pushed off-screen by outer-page scrolling
  - wheel scrolling should stop at the pane boundary via `overscroll-behavior: contain`
- reference doc:
  - `docs/reports/2026-03-31-training-workspace-layout-scroll-guideline.md`

## 11. 2026-03-31 Class Management Academic-Year Source

- class management now has an independent academic-year source:
  - table: `sys_academic_year`
  - init path: `src/database/init.ts`
  - API surface: `src/database/class-api.ts`
- important boundary:
  - academic years are no longer inferred only from existing classes
  - admins can create academic years before any class exists
  - editing an academic year now propagates to:
    - `sys_class.academic_year`
    - `student_class_history.academic_year`
- current class-management grade taxonomy now spans 12 levels:
  - preschool: `小班 / 中班 / 大班`
  - school age: `一年级 ~ 六年级`
  - post-school age: `七年级（初一）~ 九年级（初三）`

## 12. 2026-03-31 Date-Picker Standardization and Training-Plan Module Ownership

- Element Plus global locale is now configured to `zh-cn` in:
  - `src/main.ts`
- shared date-picker defaults now live in:
  - `src/utils/date-picker.ts`
- important UI constraint:
  - new or updated active business pages should reuse:
    - `STANDARD_DATE_PICKER_PROPS`
    - `STANDARD_DATE_RANGE_PICKER_PROPS`
  - avoid adding new ad-hoc date-picker props unless behavior genuinely needs to differ
- active business pages aligned this round include:
  - `src/views/plan/PlanList.vue`
  - `src/views/Reports.vue`
  - `src/components/AddStudentDialog.vue`
  - `src/views/equipment/Records.vue`
  - `src/views/admin/StudentClassAssignment.vue`
  - `src/views/training-records/components/EquipmentRecordsPanel.vue`
  - `src/views/training-records/components/GameRecordsPanel.vue`
- training-plan ownership is no longer treated as only `all / sensory / emotional / social`
- normalized training-plan module values now live in:
  - `src/utils/training-plan-module.ts`
- important compatibility boundary:
  - preserve old stored values through normalization instead of destructive migration
  - supported legacy aliases include:
    - `sensory`
    - `emotional`
    - `social`
    - `life_skills`

## 13. 2026-03-31 Student Management UI Alignment and Data Boundaries

- `src/views/Students.vue` is now aligned to the same admin-page visual language used by:
  - `src/views/admin/ClassManagement.vue`
  - `src/views/admin/StudentClassAssignment.vue`
- student-management now relies on current class snapshot fields already stored on `student`:
  - `current_class_id`
  - `current_class_name`
  - these fields are now included in the student list query path through:
    - `src/database/api.ts`
    - `src/stores/student.ts`
- important avatar boundary:
  - active student-management UI only allows two display states:
    - real uploaded photo
    - gender-colored initial avatar fallback
  - do not reintroduce a third grey generic avatar state in new student-list UI work
- important data-entry boundary:
  - `src/components/AddStudentDialog.vue` no longer auto-generates and persists placeholder avatar images into `avatar_path`
  - newly saved or edited diagnosis values are normalized to the current nine canonical diagnosis categories used by the student-management filters and color pills
- important compatibility boundary:
  - historical rows may still contain older long-form diagnosis strings or previously generated fallback avatar data URLs
  - current page/dialog behavior normalizes these at display/edit time; no destructive migration has been run

## 14. 2026-03-31 Shared Student Display Components

- shared student presentation primitives now live in:
  - `src/components/student/StudentAvatar.vue`
  - `src/components/student/DiagnosisTag.vue`
  - `src/components/student/StudentId.vue`
  - shared normalization / formatting logic: `src/utils/student-display.ts`
- important display boundary:
  - student avatar presentation in the shared layer only allows:
    - real uploaded photo
    - gender-toned initial avatar fallback
  - do not reintroduce green default avatars, grey generic placeholders, or legacy cartoon-style student avatars in pages that have moved to the shared layer
- current landed consumers include:
  - `src/components/AddStudentDialog.vue`
  - `src/views/StudentDetail.vue`
  - `src/views/games/SelectStudent.vue`
  - `src/components/common/StudentSelector.vue`
  - `src/views/Students.vue`
- important scope constraint:
  - this round only unified the targeted student-management/detail/selector flows
  - other student-bearing pages may still use older local rendering until they are explicitly migrated

## 15. 2026-04-01 Reports Center Simplification and Assessment Placeholder Boundary

- `src/views/Reports.vue` was simplified again after direct UI review:
  - remove the top hero / overview summary block
  - remove redundant filter-section heading copy
  - remove small section kicker pills such as `统一报告中心 / 类型分布 / 结果列表`
- important current-product boundary:
  - the assessment distribution area in `Reports.vue` must reflect current code reality, not target scope
  - current implemented report-producing scales are only:
    - `sm`
    - `weefim`
    - `csirs`
    - `conners-psq`
    - `conners-trs`
    - `sdq`
    - `srs2`
    - `cbcl`
  - the remaining assessment cards currently shown in the assessment entry page are still placeholders only:
    - `儿心量表-II`
    - `TGMD-3`
    - `GMFM`
    - `FMDA`
- important presentation constraint:
  - do not present those 4 placeholder scales as already implemented report chains
  - zero-count placeholder cards in the reports page are only a current-state reminder, not evidence of delivered reporting capability
- `src/views/admin/ResourceCenter.vue` top-level shell should remain lightweight:
  - keep the page title / description and tab strip
  - avoid reintroducing hero / overview blocks unless the user explicitly asks for them

## 16. 2026-04-01 Emotional Mini-Game Record Bridge and Unified Training-Record Boundary

- emotional mini-game records from `game_emotion_records` are now surfaced in the existing training-record UI through:
  - `src/database/emotional-games-api.ts`
  - `src/views/training-records/components/GameRecordsPanel.vue`
- training-record counts that should now include emotional mini-game records:
  - `src/views/training-records/TrainingRecordsMenu.vue`
  - `src/views/training-records/ModuleTrainingRecords.vue`
  - `src/views/StudentDetail.vue`
- a lightweight emotional mini-game record detail page now exists:
  - `src/views/emotional/GameRecordDetail.vue`
  - route: `/emotional/game-record`
- important current-product boundary:
  - emotional mini-games are now visible in user-facing training-record lists and counts
  - but they are still not part of a fully unified write architecture
  - current code reality remains split across:
    - `training_records`
    - `equipment_training_records`
    - `emotional_training_session`
    - `game_emotion_records`
- important next-step planning boundary:
  - the current implementation plan for the long-term fix is:
    - `docs/planning/2026-04-01-unified-training-record-schema-plan.md`
  - that document describes the target direction:
    - unified `training_session` main table
    - family detail tables
    - staged dual-write migration
  - it is a current plan, not current implementation reality

## 17. 2026-04-02 Unified Training-Session Phase A and Full Legacy Write Dual-Write Coverage

- `training_session` unified summary main table is now part of current code reality:
  - schema + indexes landed in `src/database/init.ts`
  - init-time schema ensure path also lives in `src/database/init.ts`
- a shared unified summary writer now exists:
  - `src/database/training-session-writer.ts`
- important migration identity boundary:
  - `source_table + source_record_id` is now the idempotent source key for unified summary upsert
  - new staged dual-write paths should reuse the shared writer instead of hand-rolling inserts
- current dual-write coverage now includes:
  - emotional scene writes in `src/database/emotional-api.ts`
    - old write remains in `training_records`
    - unified summary now also writes to `training_session`
  - emotional mini-game writes in `src/database/emotional-games-api.ts`
    - old write remains in `game_emotion_records`
    - unified summary now also writes to `training_session`
  - sensory game writes in `GameTrainingAPI.saveTrainingRecord()` within `src/database/api.ts`
    - old write remains in `training_records`
    - unified summary now also writes to `training_session`
  - equipment writes in `EquipmentTrainingAPI.createRecord()` within `src/database/api.ts`
    - old write remains in `equipment_training_records`
    - unified summary now also writes to `training_session`
- important sensory-game runtime boundary:
  - sensory game persistence now triggers at the actual `endGame()` completion path in:
    - `src/components/games/visual/GameGrid.vue`
    - `src/components/games/audio/GameAudio.vue`
    - `src/components/games/visual/VisualTracker.vue`
  - it no longer depends on the user clicking a second result-page “查看详细报告” button to persist the training record
- a lightweight unified query scaffold now exists:
  - `TrainingSessionAPI` in `src/database/api.ts`
- important write-path safety boundary:
  - sensory game and equipment dual-write are now wrapped in the same transaction scope as the legacy insert
  - this avoids leaving a new legacy row behind when `training_session` upsert fails
- important current-schema boundary:
  - current local DB reality still allows sensory game records while `task` table is empty
  - so `training_session.task_id` for sensory games must only be written when the referenced `task` row truly exists
- runtime verification status now confirmed in the live local DB:
  - one real sensory game run now produces the expected `training_records` + `training_session` rows
  - one real equipment quick-entry now produces the expected `equipment_training_records` + `training_session` rows
- important current-product boundary:
  - `training_session` is not yet the sole summary fact source
  - no user-facing read chain has switched to `training_session` yet
    - training-record list / menu
    - student detail counts / lists
    - dashboard aggregates
    - reports
- current next action:
  - start switching the first safe user-facing read chain onto `training_session`
  - candidate first consumers remain:
    - training-record list / menu
    - student detail counts / lists

## 18. 2026-04-02 Page-Style Unification Planning Boundary

- a page-style unification execution TODO now exists:
  - `docs/planning/2026-04-02-page-style-unification-todo.md`
- important current-code boundary:
  - shared page-style foundation already exists in current code reality through:
    - `src/assets/layout.css`
    - `src/assets/main.css`
    - `src/assets/base.css`
    - `src/utils/date-picker.ts`
  - but full-site page-style unification is not yet landed
- first-wave execution boundary:
  - prioritize backend business pages first
  - start from shared layout/style primitives before page-by-page migration
  - initial target chain is:
    - `training-records`
    - `equipment/Records`
    - then `resource-center`
- important exclusion boundary:
  - do not force the admin-page shell onto:
    - login / activation / not-found pages
    - gameplay and immersive emotional mini-games
    - `AssessmentContainer`
    - report pages

## 19. 2026-04-02 Page-Style Unification Execution Progress

- page-style unification is no longer only a planning boundary; partial execution is now landed in current code reality
- shared layout/style primitives in current active use now include additional page-shell support in:
  - `src/assets/layout.css`
- current landed execution slices include:
  - training-record chain:
    - `src/views/training-records/TrainingRecordsMenu.vue`
    - `src/views/training-records/ModuleTrainingRecords.vue`
    - `src/views/training-records/components/GameRecordsPanel.vue`
    - `src/views/training-records/components/EquipmentRecordsPanel.vue`
    - `src/views/equipment/Records.vue`
  - resource-center chain:
    - `src/views/admin/ResourceCenter.vue`
    - `src/views/resource-center/TrainingResources.vue`
    - `src/views/resource-center/TeachingMaterials.vue`
  - training entry / selector / assessment entry chain:
    - `src/views/games/GameModuleMenu.vue`
    - `src/views/equipment/EquipmentMenu.vue`
    - `src/views/emotional/Menu.vue`
    - `src/components/common/StudentSelector.vue`
    - `src/views/games/SelectStudent.vue`
    - `src/views/equipment/SelectStudent.vue`
    - `src/views/emotional/SceneSelector.vue`
    - `src/views/assessment/AssessmentSelect.vue`
  - system management chain:
    - `src/views/System.vue`
    - `src/views/system/UserManagement.vue`
    - `src/views/system/SystemSettings.vue`
- important current-product boundary:
  - this is still not full-site style unification
  - the previous pending backend business-page slice on system management pages is now landed in current code reality
  - immersive gameplay, report pages, and `AssessmentContainer` remain excluded from the admin-page shell target
- important system-management execution boundary:
  - `System.vue` is now the only page-level shell for the system-management route
  - `system/UserManagement.vue` and `system/SystemSettings.vue` should stay as embedded tab panels, not reintroduce their own page headers
  - user-management destructive actions are intentionally visually downgraded behind a dropdown
  - backup restore warnings should continue to use the shared warning-block direction instead of reverting to bare red helper text
- important shared-component boundary:
  - `src/components/common/StudentSelector.vue` is now the active shell for:
    - assessment student selection
    - game training student selection
    - equipment training student selection
  - future changes there affect all three chains and must preserve route-specific handoff logic
- verification status for the current UI-execution slices:
  - `npm run type-check` passed in the current shell after the system-management slice landed
  - the current conversation did not rerun `vite build`
  - historical note: earlier page-style slices were verified with Node 24 because some environments still resolved `/usr/bin/node` (`v18.19.1`)

## 20. 2026-04-02 Login Entry Redesign and Config-Driven Theme Controls

- the login entry redesign requested in this conversation is now part of current code reality:
  - `src/views/Login.vue`
- the login entry is now componentized into:
  - `src/components/login/SchoolPanel.vue`
  - `src/components/login/LoginCard.vue`
  - `src/components/login/InputField.vue`
  - `src/components/login/PrimaryButton.vue`
- current login layout direction is now:
  - left brand panel + right login form
  - desktop target ratio around `40 / 60`
  - narrow-width fallback to stacked layout
- important visual boundary:
  - current login page direction is a clean blue education-system entry
  - do not reintroduce purple-heavy palettes or animated AI-style login backgrounds
- a reusable login theme variable helper now exists:
  - `src/utils/login-theme.ts`
- system config now owns login-entry theme and brand fields through:
  - `src/stores/systemConfig.ts`
- app bootstrap now applies login-entry theme variables through:
  - `src/main.ts`
- system settings can now edit login-entry theme / brand content in:
  - `src/views/system/SystemSettings.vue`
- current persisted keys added to `system_config` include:
  - `login_theme_variant`
  - `theme_primary_color`
  - `brand_panel_title`
  - `brand_panel_subtitle`
  - `brand_panel_description`
- important scope boundary:
  - this is a login-entry theme system, not a full-site theming engine
  - do not describe current code reality as global platform theme switching
- important follow-up boundary:
  - `Activation.vue` was not aligned in this conversation
  - any future entry-flow visual convergence should be a deliberate follow-up slice after runtime verification
- verification status:
  - `npm run type-check` passed
  - this conversation did not rerun `vite build`
  - this conversation did not complete manual Electron runtime QA

## 21. 2026-04-03 Login Entry UI Refinement and Login-Logo Config Split

- the login entry UI was further refined in current code reality:
  - `src/views/Login.vue`
  - `src/components/login/SchoolPanel.vue`
  - `src/components/login/LoginCard.vue`
  - `src/components/login/InputField.vue`
  - `src/components/login/PrimaryButton.vue`
- important current visual boundary:
  - the left brand panel is now tuned by explicit positioned stages instead of one flow-layout brand stack:
    - top-left logo stage
    - mid title stage
    - lower school / description stage
  - future adjustments there should treat those stages as independent layout anchors, not merge them back into a single flex flow by default
- important current config boundary:
  - system logo and login-page logo are now separate settings
  - persisted keys now distinguish:
    - global system logo: `logo_path`
    - login-entry logo: `login_logo_path`
  - the active login page reads the login-specific asset through:
    - `src/stores/systemConfig.ts`
    - `src/views/Login.vue`
- important simplification boundary:
  - login-page branding settings no longer expose configurable `brand_panel_title` or `brand_panel_subtitle`
  - current login brand text should resolve from:
    - system name
    - school name
    - `brand_panel_description`
  - old historical `system_config` rows may still contain the removed keys, but current code intentionally ignores them instead of running a destructive cleanup migration
- current system-settings execution boundary:
  - global system logo remains under `基本设置`
  - login-page logo now lives under `登录页品牌与主题`
  - landed in:
    - `src/views/system/SystemSettings.vue`
- verification status:
  - `npm run type-check` passed
  - this conversation still did not rerun `vite build`
  - this conversation still did not complete manual Electron runtime QA for:
    - independent system-logo / login-logo persistence after relaunch
    - screenshot-level positioning of login left-panel title / school / description blocks
