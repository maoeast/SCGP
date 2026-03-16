# Codebase Structure

**Analysis Date:** 2026-03-16

## 1. Repository Layout

当前仓库不是纯前端项目，也不是纯 Electron 主进程项目，而是一个把桌面壳、渲染层、本地数据库、业务页面、历史归档和代理协作材料混在同一仓库中的单体桌面应用。

顶层目录可以按职责分为几组：

- Electron 壳与打包相关：
  - `electron/`
  - `build/`
  - `public/`
- 主应用源码：
  - `src/`
- 当前正式文档：
  - `docs/`
  - `README.md`
  - `PROJECT_CONTEXT.md`
  - `重构实施技术规范.md`
- 测试、脚本、工具：
  - `tests/`
  - `scripts/`
- 非产品主线目录：
  - `.planning/`
  - `.archive/`
  - `.claude/`
  - `.gemini/`
  - `.codex/`

其中 `.planning/` 是协作过程材料，不是产品运行目录；`docs/` 才是现行文档入口。

## 2. Key Entry Points

### 2.1 Desktop Entry

- `electron/main.mjs`
  - Electron 主进程入口。
  - 负责窗口、IPC、`resource://` 协议、数据库原子写入、资源文件保存删除、更新处理加载。
- `electron/preload.mjs`
  - 渲染进程和主进程之间的安全桥。
  - 暴露 `electronAPI`，包括数据库、资源、文件、更新、机器码等方法。

### 2.2 Renderer Entry

- `src/main.ts`
  - Vue 应用真正入口。
  - 调用 `initDatabase()`、`initializeBuiltinModules()`、`initializeStrategies()`。
- `src/App.vue`
  - 根组件。
- `src/router/index.ts`
  - 当前产品路由总表。
- `src/views/Layout.vue`
  - 顶层布局和菜单装配点。

### 2.3 Static Config Entry

- `package.json`
  - 依赖、脚本、Electron/Vite 构建入口。
- `vite.config.ts`
  - 前端构建和开发服务器配置。
- `tsconfig*.json`
  - TypeScript 配置。

## 3. `src/` Directory Breakdown

`src/` 是当前产品主线代码，目录职责相对清晰，但新旧结构并存。

### 3.1 `src/views/`

这是最大的业务目录，按“页面级组件”组织。

当前主要子目录有：

- `src/views/admin/`
  - 后台/平台管理页面。
  - 关键文件：
    - `src/views/admin/ClassManagement.vue`
    - `src/views/admin/StudentClassAssignment.vue`
    - `src/views/admin/ResourceCenter.vue`
    - `src/views/admin/ResourceManager.vue`
- `src/views/assessment/`
  - 评估主链。
  - 关键文件：
    - `src/views/assessment/AssessmentSelect.vue`
    - `src/views/assessment/SelectStudent.vue`
    - `src/views/assessment/AssessmentContainer.vue`
    - `src/views/assessment/components/QuestionCard.vue`
    - `src/views/assessment/*/Report.vue`
- `src/views/games/`
  - 游戏训练主链。
  - 关键文件：
    - `src/views/games/GameModuleMenu.vue`
    - `src/views/games/SelectStudent.vue`
    - `src/views/games/GameLobby.vue`
    - `src/views/games/GamePlay.vue`
    - `src/views/games/IEPReport.vue`
- `src/views/equipment/`
  - 器材训练主链。
  - 关键文件：
    - `src/views/equipment/EquipmentMenu.vue`
    - `src/views/equipment/SelectStudent.vue`
    - `src/views/equipment/QuickEntry.vue`
    - `src/views/equipment/Records.vue`
- `src/views/training-records/`
  - 重构后的训练记录模块。
  - 关键文件：
    - `src/views/training-records/TrainingRecordsMenu.vue`
    - `src/views/training-records/ModuleTrainingRecords.vue`
    - `src/views/training-records/components/GameRecordsPanel.vue`
    - `src/views/training-records/components/EquipmentRecordsPanel.vue`
- `src/views/plan/`
  - 训练计划。
  - 关键文件：
    - `src/views/plan/PlanList.vue`
- `src/views/resource-center/`
  - 资源中心两个实际内容页。
  - 关键文件：
    - `src/views/resource-center/TrainingResources.vue`
    - `src/views/resource-center/TeachingMaterials.vue`
- `src/views/system/`
  - 系统管理细页。
  - 关键文件：
    - `src/views/system/UserManagement.vue`
    - `src/views/system/SystemSettings.vue`
- `src/views/devtools/`
  - 迁移、性能、Worker、模块等调试工具页。
- `src/views/_archived/`
  - 归档页面，不应当作当前扩展入口。

视图层的一个重要现实是：新模块入口通常放在子目录里，但也仍保留若干老式扁平页面，如 `src/views/Students.vue`、`src/views/System.vue`、`src/views/Reports.vue`。

### 3.2 `src/database/`

这是当前代码库最核心、也最重的基础目录。

它同时承载：

- 启动与迁移：
  - `src/database/init.ts`
  - `src/database/database-loader.ts`
  - `src/database/sql-wrapper.ts`
  - `src/database/migrate-report-constraints.ts`
- 统一或半统一的数据访问：
  - `src/database/api.ts`
  - `src/database/resource-api.ts`
  - `src/database/plan-api.ts`
  - `src/database/class-api.ts`
- 题库、常模、换算表：
  - `src/database/*-questions.ts`
  - `src/database/*-norms.ts`
  - `src/database/csirs-conversion.ts`
  - `src/database/conners-scoring.ts`
- schema 与迁移脚本：
  - `src/database/schema/`
  - `src/database/migration/`
- 测试/验证材料：
  - `src/database/test/`
  - `src/database/verification/`

当前目录内部存在两条并行风格：

- 老式“一体化超大 `api.ts`”
- 新式“主题化独立 API 文件”，例如 `resource-api.ts`、`plan-api.ts`、`class-api.ts`

### 3.3 `src/core/`

当前只有两个真正关键文件：

- `src/core/module-registry.ts`
  - 模块注册、模块配置、IEP 策略映射。
- `src/core/strategies-init.ts`
  - 注册 IEP 策略。

这个目录规模不大，但承担了“平台底座”的名义入口。

### 3.4 `src/strategies/`

策略层当前主要用于评估和 IEP。

- `src/strategies/assessment/`
  - 量表驱动器目录。
  - 命名模式统一为 `*Driver.ts`。
  - 关键文件：
    - `src/strategies/assessment/BaseDriver.ts`
    - `src/strategies/assessment/index.ts`
    - `src/strategies/assessment/SMDriver.ts`
    - `src/strategies/assessment/CBCLDriver.ts`
- `src/strategies/SensoryIEPStrategy.ts`
  - 当前唯一实际注册的 IEP 策略。

### 3.5 `src/components/`

这里放可复用组件，但复用范围从“纯 UI”到“强业务组件”都有。

值得注意的子区域：

- `src/components/resources/ResourceSelector.vue`
  - 资源选择主组件，直接调用 `ResourceAPI`。
- `src/components/games/**`
  - 游戏具体渲染组件。
- `src/components/equipment/DataEntryForm.vue`
  - 器材录入表单。
- `src/components/common/StudentSelector.vue`
  - 通用学生选择器。
- `src/components/ResourceUpload.vue`
  - 资源上传组件，连接 `SAVE_ASSET` IPC。

### 3.6 `src/stores/`

Pinia store 比较轻量，主要承载会话和配置，而不是完整领域状态机。

关键文件：

- `src/stores/auth.ts`
- `src/stores/systemConfig.ts`
- `src/stores/student.ts`
- `src/stores/resource.ts`
- `src/stores/assessment.ts`

### 3.7 `src/utils/`

工具层比较杂，既有稳定工具，也有历史遗留。

比较关键的有：

- `src/utils/resource-manager.ts`
  - 资源路径、资源文件访问、系统打开文件。
- `src/utils/iep-generator.ts`
- `src/utils/iep-generator-refactored.ts`
  - IEP 门面层，接 `ModuleRegistry` 策略。
- `src/utils/backup.ts`
  - 旧式表级备份逻辑。
- `src/utils/activation-manager.ts`
  - 激活流程主工具。
- `src/utils/license-manager.ts`
  - 授权相关工具。

这里一个很重要的现实是：`backup.ts` 仍基于旧表列表，不代表已经覆盖新主线 schema。

### 3.8 `src/types/`

`src/types/` 是项目中相对可靠的契约层，按业务主题拆分。

关键文件：

- `src/types/module.ts`
- `src/types/assessment.ts`
- `src/types/class.ts`
- `src/types/electron.d.ts`
- `src/types/conners.ts`
- `src/types/cbcl.ts`
- `src/types/srs2.ts`
- `src/types/sdq.ts`

### 3.9 `src/workers/`

这里的存在不等于当前主链已启用 Worker。

主要文件：

- `src/workers/db.worker.ts`
- `src/workers/db-bridge.ts`
- `src/workers/command-queue.ts`
- `src/workers/bridge-sql-wrapper.ts`

当前它们更接近保留中的实验/验证实现，而不是默认运行路径。

## 4. `electron/` Directory Breakdown

`electron/` 目录结构不复杂，但职责集中。

- `electron/main.mjs`
  - 绝对核心文件。
  - 当前几乎所有桌面能力都从这里发散。
- `electron/preload.mjs`
  - 当前渲染层访问桌面能力的标准入口。
- `electron/preload.cjs`
  - 兼容文件。
- `electron/handlers/update.js`
  - 更新功能单独拆出的处理器。

如果要追踪“哪些能力必须跑在主进程”，先看 `electron/main.mjs`。

## 5. Current Module Boundaries

当前模块边界不是靠目录自动推导，而是靠三件东西共同决定：

1. `src/core/module-registry.ts` 中是否注册
2. `src/router/index.ts` 中是否存在真实可达页面
3. `src/database/**` 和 `src/views/**` 中是否存在完整数据链和 UI 链

按这个标准，当前模块状态可以概括为：

- `sensory`
  - 当前最完整。
  - 评估、游戏、器材、训练记录、资源使用、IEP 都有真实实现。
- `emotional`
  - 在 `ModuleRegistry`、计划筛选、模块菜单中可见。
  - 当前仍偏实验/占位。
- `social`
  - 同样在注册表和部分页面筛选中可见。
  - 当前仍偏实验/占位。
- `cognitive`
  - 只在 `ModuleCode` 枚举中出现，未见内置注册。
- `life_skills`
  - 在枚举和统计语境里出现，但当前没有对应模块首页和完整 UI 链。

## 6. Naming And Layout Conventions

当前代码库的命名风格总体可读，但不是完全统一。

### 6.1 Mostly Stable Conventions

- Vue 页面和组件常用 PascalCase：
  - `AssessmentContainer.vue`
  - `GameModuleMenu.vue`
  - `ClassManagement.vue`
- 目录多用 kebab-case：
  - `training-records/`
  - `resource-center/`
- 策略类用 `*Driver.ts` 或 `*Strategy.ts`
- API 类用 `*API`

### 6.2 Mixed Or Transitional Conventions

- 顶层还保留很多扁平页面：
  - `src/views/Students.vue`
  - `src/views/System.vue`
  - `src/views/Reports.vue`
- 新结构倾向于主题目录：
  - `src/views/assessment/`
  - `src/views/games/`
  - `src/views/equipment/`
- 数据访问层同时存在：
  - `src/database/api.ts` 这种超大聚合文件
  - `src/database/resource-api.ts` 这种主题型文件

因此新增代码时，优先沿用“主题目录 + 独立 API/策略文件”的新方向，不要继续加重扁平大文件。

## 7. Important Extension Points

### 7.1 Add A New Assessment Safely

当前新增量表的安全扩展点是：

1. 在 `src/types/` 增加量表类型定义。
2. 在 `src/strategies/assessment/` 新增 `*Driver.ts`。
3. 在 `src/strategies/assessment/index.ts` 注册驱动。
4. 在 `src/views/assessment/AssessmentSelect.vue` 增加入口卡片。
5. 在 `src/views/assessment/<scale>/Report.vue` 增加报告页。
6. 在 `src/database/init.ts` 和相关 API 中接入新表或保存逻辑。

注意：当前不会因为注册了 Driver 就自动出现在评估首页。

### 7.2 Add A New Module Safely

当前新增模块不能只改 `ModuleRegistry`。

至少需要同步考虑：

1. `src/types/module.ts` 是否已有模块代码。
2. `src/core/module-registry.ts` 是否注册元数据。
3. `src/router/index.ts` 是否增加真实路由。
4. `src/views/games/**`、`src/views/equipment/**`、`src/views/training-records/**` 是否能处理该 `module_code`。
5. `src/database/resource-api.ts` 和资源数据是否有该模块资源。

也就是说，当前 `ModuleRegistry` 更像“模块元数据中心”，不是“模块自动装配系统”。

### 7.3 Add Resource-Backed Features Safely

资源相关的新能力应优先接到：

- `src/database/resource-api.ts`
- `src/components/resources/ResourceSelector.vue`
- `src/views/admin/ResourceCenter.vue`

不要再回到旧的：

- `resource_meta`
- `teacher_fav`
- 旧式分散资源页

### 7.4 Add Class-Aware Statistics Safely

如果新业务要进入班级统计，当前应沿用的字段和入口是：

- 记录表中的 `class_id` / `class_name`
- 记录表中的 `module_code`
- `src/database/class-api.ts`
- `v_class_statistics_unified` 相关视图定义，当前在 `src/database/init.ts` 与 `src/database/schema/class-schema.sql` 中维护

## 8. Files And Directories To Treat Carefully

### 8.1 Current Mainline Files

这些文件虽然大，但属于当前主线：

- `src/database/init.ts`
- `src/database/api.ts`
- `src/router/index.ts`
- `src/views/Layout.vue`
- `electron/main.mjs`

### 8.2 Historical / Transitional Areas

以下区域不要默认当成主链扩展点：

- `src/views/_archived/`
- `src/workers/`
- `src/utils/backup.ts` 的旧备份表清单
- `src/views/SQLTest.vue`
- `src/views/devtools/**`

### 8.3 Current Reality Vs Target State

仓库里能看到一些“已经为未来模块做准备”的结构，但不应误判为已交付：

- `ModuleRegistry` 已存在，不代表路由动态装配已完成。
- `src/workers/` 已存在，不代表数据库 Worker 已是主链。
- `module_code` 已进入很多表，不代表 `emotional`、`social` 已有完整训练闭环。
- `sys_*` 表已存在，不代表备份恢复已经完整覆盖。

## 9. Practical Map For New Contributors

如果要快速定位功能入口，当前最实用的映射是：

- 想看应用怎么启动：`src/main.ts`
- 想看页面怎么进来：`src/router/index.ts`
- 想看菜单怎么拼：`src/views/Layout.vue`
- 想看数据库怎么初始化：`src/database/init.ts`
- 想看怎么保存到磁盘：`src/database/sql-wrapper.ts` + `electron/main.mjs`
- 想看统一评估怎么跑：`src/views/assessment/AssessmentContainer.vue`
- 想看量表驱动怎么注册：`src/strategies/assessment/index.ts`
- 想看模块信息从哪里来：`src/core/module-registry.ts`
- 想看统一资源模型：`src/database/resource-api.ts`
- 想看计划如何编排资源：`src/database/plan-api.ts` + `src/views/plan/PlanList.vue`

## 10. Summary

当前目录结构已经能看出平台化方向，但仓库仍然明显处于“旧单体页面 + 新主题目录 + 平台底座抽象并存”的过渡阶段。

最安全的扩展路径是：

- 复用 `src/views/<domain>/` 的主题目录组织
- 复用 `src/database/<domain>-api.ts` 的独立数据访问文件
- 复用 `src/strategies/assessment/*Driver.ts` 的策略接入方式
- 继续围绕 `sys_training_resource`、`module_code`、`AssessmentContainer` 扩展

最不安全的扩展路径是：

- 假设 `ModuleRegistry` 已经自动接管路由和导航
- 假设 `src/workers/**` 是当前数据库主链
- 在 `_archived` 或旧表体系上继续叠加新功能
