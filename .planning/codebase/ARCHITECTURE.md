# Architecture

**Analysis Date:** 2026-03-16

## 1. Current Architectural Style

当前主线是一个本地优先的桌面应用，不是前后端分离系统，也不是已经完成动态模块装配的平台。

- 桌面壳由 `electron/main.mjs` 承担，负责窗口、IPC、`resource://` 协议、数据库原子写入、更新处理接入。
- 渲染层由 `src/main.ts` 启动 Vue 3 + Pinia + Vue Router + Element Plus。
- 数据主线运行在渲染进程内的 `sql.js` 内存数据库上，初始化和迁移入口在 `src/database/init.ts`。
- 持久化主线是 `src/database/sql-wrapper.ts` 的防抖导出 + `electron/main.mjs` 的 `.tmp + fsync + rename` 原子写入。
- 业务代码整体呈现“平台底座 + 若干业务链路”的过渡态，但当前真正完整的主链仍然以 `sensory` 相关评估、游戏、器材和训练记录为主。

可以把当前实现理解为四层：

1. Electron 宿主层：`electron/main.mjs`、`electron/preload.mjs`
2. 应用装配层：`src/main.ts`、`src/router/index.ts`、`src/views/Layout.vue`
3. 本地数据与策略层：`src/database/**`、`src/core/**`、`src/strategies/**`
4. 业务页面与组件层：`src/views/**`、`src/components/**`

## 2. Runtime Composition

### 2.1 Electron Main / Preload

当前 Electron 主进程不是薄壳，承担了几个关键基础设施职责：

- 在 `electron/main.mjs` 中创建 `BrowserWindow`，开发环境加载 `https://localhost:5173`，生产环境加载打包后的 `dist/index.html`。
- 在 `electron/main.mjs` 中通过 `protocol.registerFileProtocol('resource', ...)` 注册 `resource://` 协议。
- `resource://` 的解析优先级是：
  - `userData/resources/`
  - `assets/resources/` 或打包后的 `process.resourcesPath/assets/resources/`
- 在 `electron/main.mjs` 中暴露数据库文件读写、资源文件保存/删除、选择文件、打开文件、机器码、更新等 IPC。
- `electron/preload.mjs` 通过 `contextBridge.exposeInMainWorld('electronAPI', ...)` 向渲染进程暴露白名单能力。

这意味着当前架构的本地文件访问主线是：

`Vue / utils / database` -> `window.electronAPI` -> `ipcRenderer.invoke(...)` -> `electron/main.mjs`

### 2.2 Renderer Bootstrap

`src/main.ts` 是当前渲染进程总装配点，启动顺序非常明确：

1. 检查是否要清空本地数据。
2. 调用 `initDatabase()` 初始化数据库。
3. 调用 `initializeBuiltinModules()` 注册模块元数据。
4. 调用 `initializeStrategies()` 注册 IEP 策略。
5. 挂载 Pinia、Router、Element Plus。
6. `app.mount('#app')` 后恢复登录状态。
7. 检查激活状态。
8. 监听 `beforeunload`，在退出前强制 `db.saveNow()`。

因此数据库和模块注册都在 UI 挂载前完成，当前没有单独的应用容器或依赖注入框架。

## 3. Routing Composition

### 3.1 Static Router Is Still The Source Of Truth

当前路由真相在 `src/router/index.ts`，不是 `ModuleRegistry`。

- 顶层业务入口全部在 `src/router/index.ts` 静态声明。
- `src/views/Layout.vue` 通过 `router.getRoutes()` + `menuOrder` 构建侧边菜单。
- 菜单顺序、显示隐藏、角色要求仍然依赖路由 `meta`，不是模块注册表。
- 路由守卫同时处理登录、角色和激活状态。

这和文档中的平台化目标有明显区别：注册表存在，但没有接管路由树生成。

### 3.2 Current Route Patterns

当前主路由树可以分成几类：

- 通用入口：
  - `'/login'`
  - `'/activation'`
  - `'/dashboard'`
- 主业务入口：
  - `'/students'`
  - `'/assessment'`
  - `'/games/**'`
  - `'/equipment/**'`
  - `'/training-records/**'`
  - `'/reports'`
  - `'/resource-center'`
  - `'/training-plan'`
  - `'/system'`
  - `'/class-management'`
  - `'/student-class-assignment'`
- 隐藏的工具/迁移页面：
  - `'/sql-test'`
  - `'/worker-test'`
  - `'/schema-migration'`
  - `'/migration-verification'`
  - `'/module-devtools'`
  - `'/benchmark-runner'`

### 3.3 Assessment Routing Is Partially Unified

评估模块是当前最明显的“统一执行 + 分散入口”结构。

- 统一执行容器是 `src/views/assessment/AssessmentContainer.vue`。
- 驱动工厂是 `src/strategies/assessment/index.ts` 中的 `getDriverByScaleCode(...)`。
- 统一执行路由是 ``src/router/index.ts`` 中的 `'/assessment/unified/:scaleCode/:studentId'`。
- 历史评估入口会重定向到统一容器，例如：
  - `'/assessment/sm/assessment/:studentId'`
  - `'/assessment/conners-psq/:studentId'`
  - `'/assessment/cbcl/:studentId'`
- 报告页仍然是分量表页面，例如：
  - `src/views/assessment/sm/Report.vue`
  - `src/views/assessment/csirs/Report.vue`
  - `src/views/assessment/cbcl/Report.vue`

所以当前已经完成的是“执行链统一”，还没有完成“入口和报告骨架统一”。

## 4. State And Data Flow

### 4.1 Auth / Activation Flow

当前鉴权和激活是轻量本地模型：

- `src/stores/auth.ts` 保存登录态和激活态。
- 登录调用 `UserAPI.login()`，数据来自本地 `user` 表。
- token 只是本地 `btoa(...)` 编码，不是强安全会话体系。
- 激活状态通过 `src/utils/activation-manager.ts` 在本地检查，`authStore.checkActivation()` 在启动和路由守卫中调用。

### 4.2 Assessment Flow

评估主链当前是：

1. `src/views/assessment/AssessmentSelect.vue` 中硬编码量表卡片。
2. `src/views/assessment/SelectStudent.vue` 选学生。
3. 进入 `src/views/assessment/AssessmentContainer.vue`。
4. `AssessmentContainer` 根据 `scaleCode` 调用 `getDriverByScaleCode(...)`。
5. 各 `*Driver.ts` 提供题目、跳题、评分、反馈逻辑。
6. 容器按量表类型写入对应表，如：
   - `sm_assess`
   - `weefim_assess`
   - `csirs_assess`
   - `conners_psq_assess`
   - `sdq_assess`
   - `srs2_assess`
   - `cbcl_assess`
7. 同时写入 `report_record` 形成统一报告索引。
8. 跳转到量表专用报告页。

这里的关键抽象是：

- `src/types/assessment.ts`：评估契约
- `src/strategies/assessment/BaseDriver.ts`：通用模板
- `src/strategies/assessment/*.ts`：量表具体实现
- `src/views/assessment/components/*.vue`：通用 UI 组件

### 4.3 Game / Equipment / Training Records Flow

训练主链已经开始围绕 `module_code` 组织，但现实上大多仍是 `sensory`。

游戏训练：

1. `src/views/games/GameModuleMenu.vue` 从 `ModuleRegistry` 读模块卡片。
2. 只有 `active` 模块可进入后续学生选择和大厅。
3. `src/views/games/GamePlay.vue` 从路由 query 取 `studentId`、`resourceId`、`module`。
4. `GameTrainingAPI.saveTrainingRecord(...)` 写入 `training_records`，携带 `module_code`。
5. 同时写入 `report_record`，当前报告类型仍使用 `iep`。

器材训练：

1. `src/views/equipment/EquipmentMenu.vue` 同样通过 `ModuleRegistry` 展示模块。
2. `src/views/equipment/QuickEntry.vue` 录入单次训练。
3. `EquipmentTrainingAPI.createRecord(...)` 写入 `equipment_training_records`，同样保留 `module_code`。

训练记录：

- `src/views/training-records/ModuleTrainingRecords.vue` 按模块切换。
- 子面板 `src/views/training-records/components/GameRecordsPanel.vue` 和 `src/views/training-records/components/EquipmentRecordsPanel.vue` 都按 `module_code` 过滤。

这说明训练记录层已经接受“多模块统计”的数据模型，但上游真实产出仍以感官模块为主。

### 4.4 Resource Flow

资源中心使用的是新旧并存、主线已切到 `sys_*` 的状态。

当前主模型在 `src/database/resource-api.ts`：

- `sys_training_resource`
- `sys_tags`
- `sys_resource_tag_map`

资源查询主线是：

1. 页面或组件调用 `ResourceAPI.getResources(...)`。
2. 按 `module_code`、`resource_type`、`category`、`keyword`、`tags` 组装 SQL。
3. 把数据库行映射成统一的 `ResourceItem`。
4. 前端通过 `resource://` 或资源工具函数显示封面。

资源文件保存链是：

1. 前端上传组件如 `src/components/ResourceUpload.vue` 读取文件。
2. 调用 `SAVE_ASSET` IPC。
3. `electron/main.mjs` 把文件写入 `userData/resources/`。
4. 页面使用 `resource://` URL 展示。

资源收藏链当前未闭环：

- `ResourceQueryOptions` 有 `favoritesOnly`
- `ResourceAPI.getResources(...)` 中该分支仍是 `TODO`
- `sys_favorites` 已在 schema 中出现，但产品主链未完成

### 4.5 Plan Flow

训练计划是当前最接近“平台化资源编排”的功能之一。

- 页面入口在 `src/views/plan/PlanList.vue`。
- 数据访问在 `src/database/plan-api.ts`。
- 数据表使用 `sys_training_plan` 和 `sys_plan_resource_map`。
- 一个计划可以跨资源类型关联器材、游戏、文档等资源。
- `PlanList.vue` 会根据资源类型跳转到不同执行入口：
  - 器材跳 `'/equipment/quick-entry/:studentId'`
  - 游戏跳 `'/games/play'`

但要注意当前“全部模块”实际上仍是手工组合：

- `PlanList.vue` 在资源选择器里对 `['sensory', 'emotional', 'social']` 逐个调用 `ResourceAPI`
- 这不是注册表驱动的自动聚合

## 5. Module System

### 5.1 Current Reality

模块系统的当前真实边界在 `src/core/module-registry.ts` 和 `src/types/module.ts`。

- `ModuleCode` 枚举中有：
  - `sensory`
  - `emotional`
  - `social`
  - `cognitive`
  - `life_skills`
  - `resource`
- 但 `initializeBuiltinModules()` 当前只注册了：
  - `sensory`
  - `emotional`
  - `social`
- 其中真正 `active` 的只有 `sensory`
- `emotional`、`social` 状态是 `experimental`
- `cognitive`、`life_skills` 目前只有类型枚举，没有内置模块注册

### 5.2 What ModuleRegistry Actually Does

当前 `ModuleRegistry` 的职责主要是：

- 保存模块元数据
- 管理模块配置
- 从 `localStorage` 读写模块配置
- 注册和分发 IEP 策略
- 为模块菜单和模块选择页提供列表

当前没有完成的事情：

- 没有动态生成 Vue Router 路由
- 没有动态生成侧边导航
- 没有作为全平台单一配置源取代静态页面装配

### 5.3 IEP Strategy Chain

IEP 相关的策略化已经落地，但范围有限。

- 初始化入口在 `src/core/strategies-init.ts`
- 当前只注册了 `src/strategies/SensoryIEPStrategy.ts`
- `src/utils/iep-generator-refactored.ts` 根据 `moduleCode` 从 `ModuleRegistry` 取策略

因此“模块化 IEP”是已实现的基础设施，但目前只有感官模块真正有可用策略。

## 6. Persistence Chain

### 6.1 Current Mainline

当前数据库主链是明确的 Plan B：

1. `src/database/init.ts` 通过 `window.electronAPI.loadDatabaseFile()` 调用 `db:load`
2. `electron/main.mjs` 从 `userData/database.sqlite` 读取 Buffer
3. `src/database/database-loader.ts` 用 Buffer 初始化 `sql.js`
4. `src/database/init.ts` 用 `SQLWrapper` 包装原始数据库
5. 所有 `DatabaseAPI` / `ClassAPI` / `ResourceAPI` 等都直接在渲染进程操作这个包装后的实例
6. 写操作触发 `SQLWrapper` 的 2000ms 防抖保存
7. `SQLWrapper` 调用 `electronAPI.saveDatabaseAtomic(...)`
8. `electron/main.mjs` 把数据写到 `.tmp`，`fsync` 后 `rename` 到 `database.sqlite`

### 6.2 Initialization And Migration

`src/database/init.ts` 还同时承担了多项启动期职责：

- 执行内联 `schemaSQL`
- 初始化 `sys_*` 系统表
- 初始化班级相关表、索引、触发器、视图
- 检查并执行 `module_code` 迁移
- 在新数据库时插入预置器材资源和默认管理员

这使得 `init.ts` 成为当前数据库层的单个超大入口文件。

### 6.3 Worker Status

`src/workers/db.worker.ts`、`src/workers/db-bridge.ts`、`src/workers/command-queue.ts` 仍然存在，但当前不是生产主链。

从代码和现行文档综合判断：

- Worker 数据库方案保留为实验/验证/历史过渡资产
- Devtools 中仍能看到相关测试入口
- 主应用实际运行仍然依赖渲染进程 `SQLWrapper`

这点必须和目标态区分开。

## 7. Key Abstractions

当前最关键的架构抽象有五类：

### 7.1 `SQLWrapper`

文件：`src/database/sql-wrapper.ts`

作用：

- 把 `sql.js` 包装成项目统一数据库对象
- 提供 `run / all / get / export / saveNow`
- 把写入操作统一接入防抖保存和原子写盘

### 7.2 `DatabaseAPI` And Specialized APIs

文件：

- `src/database/api.ts`
- `src/database/resource-api.ts`
- `src/database/plan-api.ts`
- `src/database/class-api.ts`

作用：

- 把 SQL 访问按业务主题分层
- 同时保留大量历史 API 和新 `sys_*` API 并存

### 7.3 `ScaleDriver`

文件：

- `src/types/assessment.ts`
- `src/strategies/assessment/BaseDriver.ts`
- `src/strategies/assessment/index.ts`

作用：

- 抽象题目来源、起始题、跳题逻辑、评分逻辑、反馈逻辑
- 使 `AssessmentContainer` 可以复用

### 7.4 `ModuleRegistry`

文件：`src/core/module-registry.ts`

作用：

- 承接模块元数据和模块配置
- 提供模块卡片页面所需的模块列表
- 连接 IEP 策略层

### 7.5 Unified Resource Model

文件：

- `src/database/resource-api.ts`
- `src/components/resources/ResourceSelector.vue`

作用：

- 用统一资源表承接器材、游戏、闪卡、文档等资源
- 让计划、资源中心、游戏大厅等复用同一数据模型

## 8. Current Implementation Vs Future Modules

### 8.1 Current Implementation

当前已形成主链的能力主要集中在：

- 学生管理：`src/views/Students.vue`、`src/views/StudentDetail.vue`
- 统一评估执行：`src/views/assessment/AssessmentContainer.vue`
- 感官游戏训练：`src/views/games/**`
- 感官器材训练：`src/views/equipment/**`
- 训练记录汇总：`src/views/training-records/**`
- 资源中心：`src/views/admin/ResourceCenter.vue`、`src/views/resource-center/**`
- 训练计划：`src/views/plan/PlanList.vue`
- 班级管理：`src/views/admin/ClassManagement.vue`、`src/views/admin/StudentClassAssignment.vue`

### 8.2 Future / Partial Modules

当前仍应视为未来模块或部分结构准备的内容：

- `emotional`
- `social`
- `cognitive`
- `life_skills`

现实表现是：

- 它们可能出现在 `ModuleRegistry`、计划筛选、模块菜单或统计字段里
- 但没有和 `sensory` 同等完整的页面链、资源链、执行链、报告链

## 9. Architectural Constraints And Debts

基于当前代码，最重要的结构性约束和债务是：

- `src/router/index.ts` 仍是静态装配中心，注册表没有接管路由。
- `src/views/Layout.vue` 用静态菜单顺序，不是模块注册表驱动导航。
- `src/views/assessment/AssessmentSelect.vue` 仍硬编码量表入口。
- `src/database/init.ts` 过大，混合 schema、迁移、初始化、预置数据、班级表和资源迁移。
- `src/utils/backup.ts` 仍按旧表导出，未覆盖新主线 `sys_*` 和班级扩展 schema。
- `src/database/resource-api.ts` 中收藏筛选仍未接通。
- `src/workers/**` 存在，但不是当前默认运行链。

## 10. Practical Summary

如果只用一句话描述当前架构：

`SCGP` 当前是一个以 `Electron + Vue 3 + SQL.js` 为底座、用静态路由装配业务页面、用 `AssessmentContainer + ScaleDriver` 和 `ModuleRegistry + ResourceAPI` 提供平台化雏形、但仍处于“主链已跑通、装配尚未完全平台化”的本地优先桌面应用。
