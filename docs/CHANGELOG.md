# CHANGELOG.md

项目功能变更历史记录

---

## [2026-02-27] Phase 4.5 之前的归档条目（从 PROJECT_CONTEXT.md 迁移）

### [2026-02-22] Phase 3.9 技术债清偿 - Resource 泛化架构彻底清理
- **目标**: 彻底剥离旧表依赖与清理残留组件，确保架构不再存在双重依赖
- **getEquipment() 方法重构**:
  - ❌ 移除 `INNER JOIN equipment_catalog ec ON tr.legacy_id = ec.id`
  - ✅ 直接使用 `tr.category` 而非 `ec.category`
  - ✅ 新增 `tr.module_code = 'sensory'` 模块过滤
  - **文件**: `src/database/api.ts`
- **getCategoryStats() 统计方法重构**:
  - ❌ 移除 `JOIN equipment_catalog ec ON etr.equipment_id = ec.id`
  - ✅ 改用 `JOIN sys_training_resource tr ON etr.equipment_id = tr.id`
  - **文件**: `src/database/api.ts`
- **删除残留组件**:
  - 删除 `src/components/equipment/EquipmentSelector.vue`（无引用）
- **ResourceAPI CRUD 接口完善** (`src/database/resource-api.ts` +220行):
  - `addResource(data)` - 创建资源（支持标签自动关联）
  - `updateResource(id, data)` - 更新资源（支持标签替换）
  - `deleteResource(id)` - **软删除**（设置 is_active = 0）
  - `restoreResource(id)` - 恢复已删除资源
  - `hardDeleteResource(id)` - 永久删除（谨慎使用）
  - `incrementUsageCount(id)` - 增加使用次数
- **架构状态变更**:
  | 维度 | 重构前 | 重构后 |
  |:-----|:-------|:-------|
  | 旧表依赖 | ⚠️ 双表 JOIN | ✅ 完全独立 |
  | 代码引用 `equipment_catalog` | 5处 | 0处 |
  | ResourceAPI CRUD | 仅查询 | ✅ 完整增删改 |
- **文件修改**:
  - `src/database/api.ts` - getEquipment() 和 getCategoryStats() 重构
  - `src/database/resource-api.ts` - CRUD 接口完善（+220行）
  - `src/components/equipment/EquipmentSelector.vue` - 已删除

### [2026-02-19] Electron 应用在线升级功能
- **功能**: 检查更新、下载更新、安装更新、版本信息显示
- **技术栈**: electron-updater + GitHub Releases
- **主进程 IPC 处理器** (`electron/handlers/update.js`):
  - 延迟加载 electron-updater（避免启动失败）
  - 默认配置：GitHub Releases (owner: maoeast, repo: Self-Care-ATS)
  - 用户配置存储：`%APPDATA%\sic-ads\update-config.json`
  - IPC 处理器：check-for-updates, download-update, quit-and-install, get-current-version
- **前端更新服务** (`src/services/UpdateService.ts`):
  - 响应式状态管理（使用 Vue reactivity）
  - 检查更新、下载更新、安装更新、跳过版本
  - 自动更新开关配置
- **UI 组件**:
  - `AboutDialog.vue` - 关于对话框（用户菜单入口）
  - `UpdatePanel.vue` - 系统管理页面中的更新面板
- **文件修改**:
  - `electron/handlers/update.js` - 新增（~300行）
  - `src/services/UpdateService.ts` - 新增（~150行）
  - `src/components/AboutDialog.vue` - 新增（~200行）
  - `src/views/updates/UpdatePanel.vue` - 新增（~250行）

### [2026-02-21] Phase 3.7 通用统计系统 + 数据丢失 Bug 修复
- **目标**: 实现跨模块通用统计系统，支持按班级、模块、学年等多维度统计
- **数据库 Schema 升级**: 所有训练/评估记录表添加 `module_code` 字段
- **通用统计 API** (`src/database/class-api.ts`): getStatistics, getClassStatisticsUnified, getStatisticsByModule
- **数据丢失 Bug 修复**: ClassAPI 添加 `forceSave()` 方法，SQLWrapper 新增 `pendingSave` 标志
- **文件修改**: class-api.ts, sql-wrapper.ts, ClassManagement.vue

### [2026-02-22] Phase 3.8 器材训练工作流重构
- **目标**: 重构器材训练录入流程，统一使用 ResourceSelector 组件
- **核心修复 - 器材图片不显示**: 修复 `legacy_id` 映射，添加迁移函数
- **ResourceItem 类型扩展**: 新增 `legacyId`, `legacySource` 字段
- **保存并继续 UX 优化**: 点击"保存并继续"时不弹窗，显示简洁提示
- **文件修改**: init.ts, module.ts, QuickEntry.vue

---

## [2026-02-19] 数据库初始化修复 + webgazer禁用（已归档）

- **问题**: 应用启动报错 "no such table: sys_training_resource" 和 "no such table: sys_class"
- **根本原因**: Vite 的 `?raw` 动态导入在 Electron 环境中不可靠
- **解决方案**: 将所有 DDL 语句硬编码到 TypeScript 代码中
- **系统表 DDL 硬编码** (`src/database/init.ts:481-556`):
  - 添加 `sys_training_resource`, `sys_tags`, `sys_resource_tag_map`, `sys_favorites`, `sys_app_settings` 建表语句
  - 添加所有索引
- **班级表 DDL 硬编码** (`src/database/init.ts:1513-1672`):
  - `sys_class`, `student_class_history`, `sys_class_teachers` 建表语句
  - 所有触发器和视图硬编码
  - ALTER TABLE 使用 `safeAddColumn` 辅助函数
- **错误处理增强** (`src/database/init.ts:1129-1235`):
  - INSERT 语句包裹在 try-catch 中
  - 严格验证结果结构
  - 修复 `createDefaultAdminAccount` 参数错误
- **禁用 webgazer.js**:
  - `index.html` - 注释掉脚本引用
  - `VisualTracker.vue` - 添加可用性检查，自动降级到鼠标模式
- **文件修改**:
  - `src/database/init.ts` - DDL 硬编码、错误处理增强
  - `index.html` - 禁用 webgazer.js
  - `src/components/games/visual/VisualTracker.vue` - webgazer 可用性检查

---

## [2026-02-17] Phase 3.6.6 班级管理功能验证与完善（已归档）

- **测试数据生成器** (`src/database/test/class-test-data.ts` ~250行):
  - `ClassTestDataGenerator` 类: 生成完整测试数据集
  - `generateFullTestData()`: 生成班级+分班数据
  - `createClassesForYear()`: 创建指定学年班级
  - `simulateGradeUpgrade()`: 模拟学年升级场景
  - `generateTestReport()`: 生成测试报告
  - `generateTestStudentsForGrade()`: 生成指定年级测试学生
- **测试工具页面** (`src/views/devtools/ClassManagementTest.vue` ~450行):
  - 基础数据生成测试（学年、年级、班级数配置）
  - 学年升级测试
  - 学生分班测试
  - 数据查询与统计
  - 实时操作日志显示
- **业务记录班级快照写入**:
  - `GameTrainingAPI.saveTrainingRecord()`: 自动写入学生当前班级快照
  - `EquipmentTrainingAPI.createRecord()`: 自动写入学生当前班级快照
  - `ReportAPI.saveReportRecord()`: 自动写入学生当前班级快照
  - `getStudentTrainingRecords()`: 查询包含班级信息
  - `training_records` 表新增 `class_id`, `class_name` 字段
- **文件**: `src/database/test/class-test-data.ts`, `src/views/devtools/ClassManagementTest.vue`, `src/database/schema/class-schema.sql`, `src/database/api.ts`, `src/router/index.ts`

---

## [2026-02-18] Phase 3.6.7 班级快照混合模式验证完成（已归档）

- **验证目标**: 确认混合快照模式（当前状态 + 历史快照 + 变更追踪）正确工作
- **轻量级测试组件** (`src/views/devtools/ClassSnapshotTestLite.vue` ~600行):
  - 无 DDL 操作（CREATE TABLE, ALTER TABLE）
  - 仅使用业务 API（ClassAPI, StudentAPI, EquipmentTrainingAPI）
  - 7 步骤测试流程：清理数据 → 创建班级 → 分配学生 → 创建记录 → 升学换班 → 验证快照 → 清理
- **关键修复**:
  - **`generateClassName is not defined`**: 修复 class-api.ts 导入错误
  - **`lastInsertRowid` 返回 undefined**: 使用 `SELECT last_insert_rowid()` 获取正确 ID
  - **`UNIQUE constraint failed`**: 添加测试数据清理逻辑
  - **`no such table: sys_class`**: 添加表自动创建逻辑
  - **班级快照未写入**: 直接使用 raw DB 插入，确保 `class_id` 和 `class_name` 正确写入
- **验证结果**: ✅ 历史记录班级快照不变，✅ 学生档案已更新，✅ 快照隔离验证通过
- **文件**: `src/views/devtools/ClassSnapshotTestLite.vue`, `src/database/class-api.ts`, `src/database/init.ts`

---

## [2026-02-16] Phase 3.5 开发者工具与性能评估（已归档）

- **ModuleDevTools.vue（模块开发者工具）**:
  - 创建 `src/views/devtools/ModuleDevTools.vue` (~680 行)
  - 功能：模块列表、IEP 策略列表、模块详情、功能特性表、配置预览、IEP 测试器
  - 模块管理：显示所有已注册模块、启用/禁用控制开关
  - IEP 策略测试器：支持器材训练和游戏训练两种类型
- **Performance Benchmark Suite（性能基准测试）**:
  - 类型定义：`tests/performance/types.ts`
  - 核心框架：`tests/performance/benchmark-core.ts`
  - 测试套件：`tests/performance/benchmarks.ts`
- **BenchmarkRunner.vue（UI 测试运行器）**:
  - 测试配置、套件选择、进度跟踪、结果表格、导出报告
- **性能测试结果**:
  - 总测试数：16 个，通过率：100%
  - DB Export (10,000 条记录): 0.48 ms 平均
  - 搜索响应: 0.20-0.47 ms
- **文件**: `src/views/devtools/ModuleDevTools.vue`, `tests/performance/*.ts`, `src/views/devtools/BenchmarkRunner.vue`

---

## [2026-02-17] Phase 3.6 班级管理模块（已归档）

- **设计原则**: 混合快照模式 - 当前状态 + 历史快照 + 变更追踪
- **数据库设计**: `sys_class`, `student_class_history`, student 表新增 `current_class_id`, `current_class_name`
- **ClassAPI 实现** (`src/database/class-api.ts`):
  - 班级 CRUD: `createClass`, `getClass`, `getClasses`, `updateClass`, `deleteClass`
  - 分班操作: `assignStudentToClass`, `assignStudentsBatch`, `changeStudentClass`
  - 学年升级: `upgradeGrade`
- **ClassManagement.vue** (`src/views/admin/ClassManagement.vue` ~450行)
- **StudentClassAssignment.vue** (`src/views/admin/StudentClassAssignment.vue` ~500行)
- **数据隔离保证**: 业务记录存储班级快照，历史永不变更
- **文件**: `src/types/class.ts`, `src/database/class-api.ts`, `src/views/admin/ClassManagement.vue`, `src/views/admin/StudentClassAssignment.vue`

---

## [2026-02-16] Phase 3.4 UI 组件适配 + 端到端验证（已归档）

### preload 脚本修复
- 问题：ES Module 兼容性导致 preload.cjs 无法加载
- 修复：将 `preload.cjs` 转换为 `preload.mjs`（ES Module 格式）
- 文件：`electron/preload.mjs`（新建）、`electron/main.js`（更新 preload 路径）

### QuickEntry.vue 迁移（Phase 3.4）
- 将 `EquipmentSelector` 替换为 `ResourceSelector`
- 类型更新：`EquipmentCatalog` → `ResourceItem`
- 使用新表 ID：`selectedResource.id`（sys_training_resource 表）
- 文件：`src/views/equipment/QuickEntry.vue`

### ResourceSelector 图片加载修复
- 问题：图片文件使用旧表 ID 命名，但新表 ID 不同
- 修复：使用 `legacyId` 获取图片，fallback 到新表 ID
- 文件：`src/components/resources/ResourceSelector.vue`

### Records.vue 新架构 JOIN 修复
- 问题：`getStudentRecords()` 仍 JOIN 旧表 `equipment_catalog`
- 修复：改为 JOIN `sys_training_resource` 表
- 返回字段：`tr.id as equipment_id`、`tr.legacy_id`（用于图片加载）
- 文件：`src/database/api.ts`、`src/views/equipment/Records.vue`

### 分类标签中文显示
- 问题：分类按钮显示英文（Visual, Tactile 等）
- 修复：使用 `SIMPLE_CATEGORY_LABELS`（触觉、视觉等简洁中文）
- 文件：`src/components/resources/ResourceSelector.vue`、`src/views/equipment/QuickEntry.vue`

### 端到端业务验证（Phase 3.X）
- ✅ 器材录入流程：成功选择器材、评分保存、数据库记录正确
- ✅ 记录查询流程：正确显示训练记录、器材信息和图片
- ✅ 模块切换功能：ModuleRegistry 正确初始化、3 个模块已注册

### IEP 报告生成修复
- 修复 `TaskID is not defined`：添加 `import { TaskID }`
- 修复 `iepTaskMapping is not defined`：添加 `import { iepTaskMapping }`
- 修复 `equipmentTaskMapping is not defined`：添加 `import { equipmentTaskMapping }`
- 文件：`src/utils/iep-generator.ts`

---

## [2026-02-14] Phase 3.1-3.3 模块化基础设施（已归档）

### 模块类型定义（Phase 3.1）
- 创建完整的模块系统类型定义 `src/types/module.ts`
- `ModuleCode` 枚举：支持 SENSORY, EMOTIONAL, SOCIAL, COGNITIVE, LIFE_SKILLS, RESOURCE
- `ModuleMetadata` 接口：name, description, icon, version, status, features
- `ResourceQueryOptions` 接口：统一资源查询（moduleCode, resourceType, category, tags, keyword）
- `ResourceItem` 接口：统一资源项类型
- `IEPStrategy` 接口：策略模式契约
- `ModuleRegistry` 接口：模块注册表
- 类型守卫：isValidModuleCode, isResourceItem, isIEPStrategy

### ModuleRegistry 实现（Phase 3.2）
- `src/core/module-registry.ts` - 单例模式实现
- 模块管理：registerModule, getModule, getAllModules, getActiveModules
- IEP 策略管理：registerIEPSstrategy, getIEPSstrategy
- 配置管理：getModuleConfig, updateModuleConfig（持久化到 localStorage）
- 资源查询辅助：getResourceTypes, isValidResource
- initializeBuiltinModules()：初始化 SENSORY, EMOTIONAL, SOCIAL 模块元数据

### ResourceSelector 重构（Phase 3.1）
- `src/components/resources/ResourceSelector.vue` - 重构自 EquipmentSelector
- 泛化：moduleCode prop（默认为 'sensory')
- 动态分类按钮（根据模块元数据生成）
- 使用 ResourceQueryOptions 统一接口

### IEP 策略模式（Phase 3.3）
- `src/strategies/SensoryIEPStrategy.ts` - 感官训练 IEP 策略
  - 实现游戏训练报告生成（7 种任务类型：颜色/形状/物品配对、视觉/听觉辨别、听指令、节奏模仿）
  - 实现器材训练报告生成（6 种感官分类）
- `src/utils/iep-generator-refactored.ts` - 策略模式门面
  - IEPGenerator.generate()：根据 moduleCode 动态选择策略
  - generateBatch()：批量生成
  - isModuleSupported()：检查支持
- `src/core/strategies-init.ts` - 策略初始化
  - initializeStrategies()：注册所有 IEP 策略
- `src/main.ts`：集成模块和策略初始化调用

---

## [2026-02-15] GitHub 上传完成（已归档）

### 任务
将源码上传到 GitHub 仓库

### 完成日期
2026-02-15

### 结果
✅ 成功

### GitHub 仓库
https://github.com/maoeast/Self-Care-ATS

### 推送分支
`electron-package`

### 文件数量
2562 files

### 遇到的问题
- 历史记录中包含 130.87 MB 的大视频文件 (`1.生活自理怎么教.mp4`)
- 超过 GitHub 的 100 MB 文件大小限制

### 解决方案
- 创建干净的 orphan 分支
- 从历史中移除大视频文件
- 成功推送到远程仓库

### 文件变更
- 从历史中移除 `assets/resources/videos/星星雨教育/1.生活自理怎么教.mp4`

---

## [2026-02-14] Phase 2.0-2.4 资源管理与文件系统（已归档）

### resource:// 协议注册（Phase 2.1）
- 注册自定义协议处理器，支持 `resource://` URL
- 安全路径校验：防止目录遍历攻击（`..` `\` `~`）
- 文件名校验：只允许安全字符（字母、数字、中文、下划线、连字符）
- 二次校验：确保解析后的路径仍在资源根目录下

### 图片处理工具（Phase 2.2）
- 基于 Canvas 的图片压缩（零原生依赖）
- 支持格式：JPEG、PNG、WebP
- 功能：压缩、尺寸调整、格式转换、质量控制（0.1-1.0）
- 批量处理支持
- 文件大小格式化、唯一文件名生成

### 文件 IO IPC（Phase 2.3）
- `SAVE_ASSET`: 保存资源文件（带完整安全校验）
- `DELETE_ASSET`: 删除资源文件（带完整安全校验）
- `LIST_ASSETS`: 列出资源目录内容（支持子目录）
- 所有 IPC 处理程序都包含安全路径验证

### 资源上传组件（Phase 2.4）
- 创建 `ResourceUpload.vue` 组件
- 拖放上传支持（带视觉反馈）
- 实时压缩进度显示
- 文件列表预览、压缩比例显示
- 保存/使用/删除操作
- 安全验证：文件类型、大小、尺寸
- Element Plus UI 组件、响应式设计

### 安全措施
- URL 解码后校验
- 路径遍历攻击防护
- 文件名模式匹配（防止非法字符）
- 路径规范化后二次校验
- 所有路径操作限制在资源根目录下

### 零原生依赖实现
- 使用 Canvas API 实现图片压缩
- 不使用 sharp 等原生模块
- 跨平台兼容性好

### 文件修改
- `electron/main.js` - 新增 270+ 行（协议注册 + IPC 处理）
- `src/utils/image-processor.ts` - 新增 250+ 行
- `src/components/ResourceUpload.vue` - 新增 350+ 行

---

## [2026-02-17] Phase 1.4.2 旧表迁移清理 + CSP 配置修复（已归档）

### Phase 1.4.2 旧表迁移清理
- 清理 equipment_catalog 表相关引用
- 移除 sqlTest.vue 中的旧 API 调用

### CSP 配置修复
- **问题**: Electron 应用启动后页面空白，控制台显示 CSP 错误
- **根本原因**: `electron/main.js:92` 中 `sandbox: false` 的缩进不正确
- **修复内容**:
  - 修正 `sandbox: false` 的缩进
  - 确保 CSP 允许 `unsafe-eval` 以支持 SQL.js WebAssembly
  - 添加 `connect-src` 允许 webgazer.js 连接
- **影响**: 应用正常启动和运行

---

## [2026-02-16] Phase 3.4 UI 组件适配 + 端到端验证（已归档）

### preload 脚本修复
- **问题**: ES Module 兼容性导致 preload.cjs 无法加载
- **修复**: 将 `preload.cjs` 转换为 `preload.mjs`（ES Module 格式）
- **文件**: `electron/preload.mjs`（新建）、`electron/main.js`（更新 preload 路径）

### QuickEntry.vue 迁移
- 将 `EquipmentSelector` 替换为 `ResourceSelector`
- 类型更新：`EquipmentCatalog` → `ResourceItem`
- 使用新表 ID：`selectedResource.id`（sys_training_resource 表）

### ResourceSelector 图片加载修复
- **问题**: 图片文件使用旧表 ID 命名，但新表 ID 不同
- **修复**: 使用 `legacyId` 获取图片，fallback 到新表 ID

### Records.vue 新架构 JOIN 修复
- **问题**: `getStudentRecords()` 仍 JOIN 旧表 `equipment_catalog`
- **修复**: 改为 JOIN `sys_training_resource` 表
- 返回字段：`tr.id as equipment_id`、`tr.legacy_id`（用于图片加载）

### 分类标签中文显示
- **问题**: 分类按钮显示英文（Visual, Tactile 等）
- **修复**: 使用 `SIMPLE_CATEGORY_LABELS`（触觉、视觉等简洁中文）

### DataEntryForm 类型兼容
- **问题**: 期望 `EquipmentCatalog` 类型，但传入 `ResourceItem`
- **修复**: 添加兼容层，支持两种类型

### 端到端业务验证
- ✅ 器材录入流程：成功选择器材、评分保存、数据库记录正确
- ✅ 记录查询流程：正确显示训练记录、器材信息和图片
- ✅ 模块切换功能：ModuleRegistry 正确初始化、3 个模块已注册

### IEP 报告生成修复
- 修复 `TaskID is not defined`：添加 `import { TaskID }`
- 修复 `iepTaskMapping is not defined`：添加 `import { iepTaskMapping }`
- 修复 `equipmentTaskMapping is not defined`：添加 `import { equipmentTaskMapping }`

---

## [2026-02-05] Phase 2.0 重构 - Worker 基座与 Schema 迁移

### Worker 环境搭建（Phase 1.1）
- 创建 `src/workers/types/worker-messages.ts` - Worker 消息类型定义
- 创建 `src/workers/command-queue.ts` - 批量队列（50ms 防抖，最大 50 条）
- 创建 `src/workers/db.worker.ts` - Worker 实现（含测试模式降级）
- 创建 `src/workers/db-bridge.ts` - 主线程桥接层
- 创建 `src/views/devtools/WorkerTest.vue` - 测试组件
- 创建 `public/worker-test.html` - 独立测试页面

### Schema 迁移（Phase 1.2）
- 创建 `src/database/migration/schema-migration.ts` - 完整迁移脚本
- 创建 `src/views/devtools/SchemaMigration.vue` - 迁移工具界面
- 迁移安全协议：预检备份、FTS5 检测、数据清洗、双重验证
- 新建 5 个 sys_ 表：sys_training_resource、sys_tags、sys_resource_tag_map、sys_favorites、sys_app_settings
- 数据迁移结果：equipment_catalog 62 条 → sys_training_resource 62 条 ✅
- 标签提取：解析 ability_tags 生成 93 个唯一标签
- FTS5 兼容性：不支持，已降级到 LIKE 查询

### 问题修复
- SQL.js 导入错误 → 使用项目 sqljs-loader.ts
- db.exec() 参数绑定失败 → 使用 prepare/bind/step/free 模式
- localStorage 存储问题 → 改用 IndexedDB 存储

### 文件修改
- `src/workers/*.ts` - Worker 相关文件
- `src/database/migration/schema-migration.ts` - 迁移脚本
- `src/views/devtools/SchemaMigration.vue` - 迁移界面
- `src/router/index.ts:214` - 路由配置

---

## [2026-02-05] Phase 1.4 完成 - Plan B 主线程防抖原子写入

### 架构决策
- 放弃 Worker 方案（Vite 打包与 sql.js CommonJS 兼容性问题）

### Plan B 实现
- 重写 `src/database/sql-wrapper.ts` - 内置 2000ms 防抖保存 + IPC 队列写入
- 移除 `src/database/init.ts` 中的 Worker Bridge 初始化
- 移除 `src/database/api.ts` 中的所有 Worker 相关代码
- 更新 `src/main.ts` 中的 beforeunload 处理器，使用 `saveNow()`
- 添加 `electron/main.js` 的 `saveDatabaseAtomic` IPC handler（fsync + rename）

### 原子写入保证
- 三步写入（writeFile(.tmp) → fsync → rename）
- 防抖机制：INSERT/UPDATE/DELETE 自动触发 2000ms 防抖保存

### 文件修改
- `src/database/sql-wrapper.ts` - 完整重写（320行）
- `src/database/init.ts` - 移除 Worker Bridge
- `src/database/api.ts` - 移除 useBridge 逻辑
- `src/main.ts` - 更新 beforeunload

---

## [2026-02-05] PSQ/TRS 报告记录修复

### 问题
- PSQ/TRS 评估完成后，报告生成模块和学生详情页找不到评估记录

### 根本原因
- `ReportAPI.saveReportRecord()` 类型定义不包含 `'conners-psq'` 和 `'conners-trs'`
- 数据库 `report_record` 表的 CHECK 约束不包含这两种类型
- 学生详情页只查询 S-M 和 WeeFIM，未查询 PSQ/TRS

### 修复内容
- 更新 `src/database/api.ts` 类型定义，添加 `csirs | conners-psq | conners-trs | iep`
- 添加 `src/database/sql-wrapper.ts` 的 `getRawDB()` 方法
- 修复 `src/database/migrate-report-constraints.ts` 迁移脚本（使用原始 db 对象）
- 在 `src/database/init.ts` 添加自动迁移逻辑
- 更新 `src/views/StudentDetail.vue` 添加 PSQ/TRS/CSIRS 评估记录查询
- 修复 `src/main.ts` 抑制 ResizeObserver 警告

### 文件修改
- `src/database/api.ts` - 类型定义
- `src/database/sql-wrapper.ts` - getRawDB() 方法
- `src/database/migrate-report-constraints.ts` - 迁移脚本修复
- `src/database/init.ts` - 自动迁移 + 手动迁移导出
- `src/main.ts` - ResizeObserver 警告抑制
- `src/views/StudentDetail.vue` - PSQ/TRS/CSIRS 查询

---

## [2026-02-04] 器材训练模块完整实现

### 数据库与API实现
- 新增3个核心表：equipment_catalog (器材目录)、equipment_training_records (训练记录)、equipment_training_batches (批次记录)
- 实现 EquipmentAPI 类（6个方法）：器材查询、分类筛选、搜索、统计
- 实现 EquipmentTrainingAPI 类（11个方法）：CRUD、批次管理、统计分析
- 62个感官统合器材数据覆盖7大感官系统

### IEP模板与生成器
- 统一 iep-templates.ts（游戏训练+器材训练）
- DAO逻辑占位符系统：{name}, {domain}, {equipment}, {action}, {outcome}
- 7大感官系统分类：触觉、嗅觉、视觉、听觉、味觉、本体觉、感官综合
- IEPGenerator 支持 EquipmentTrainingReport 生成

### UI组件与页面
- QuickEntry.vue：双栏布局（器材选择器 + 数据录入表单）
- Records.vue：训练记录历史（筛选、IEP查看、批量导出）
- EquipmentSelector.vue：7分类筛选、搜索框、器材卡片列表
- DataEntryForm.vue：星级评分（1-5）、5级辅助等级、时长/备注录入
- StudentDetail.vue：添加器材训练统计卡片

### Word报告导出
- docxExporter.ts 实现 exportEquipmentIEPToWord()
- 支持单条和批量导出
- 星级可视化（★★★★☆）、辅助等级标签
- 包含学生信息、训练记录、统计摘要

### 测试工具
- equipment-test-data.ts：测试数据生成器
- SQLTest.vue：器材模块测试按钮（API测试、IEP生成、数据统计）

### 路由集成
- /equipment/quick-entry/:studentId - 快速录入页面
- /equipment/records/:studentId - 记录历史页面

---

## [2026-02-04] 感官训练游戏特殊儿童适配优化

### 游戏配置与交互优化
- 简化游戏配置界面，移除无效配置项
- 修复听指令做动作游戏流程问题（自动播放语音、提前显示选项）
- 修复浏览器自动播放策略限制（添加开始按钮）
- 修复音频游戏反应时间计算bug

### 网格与样式修复
- 修复4×4网格导致应用卡死问题（无限循环）
- 修复形状识别游戏目标显示空白、形状变形问题
- 修复3×3和4×4网格不显示选项问题
- 扩展颜色、形状、图标种类支持4×4网格不重复

### 音效与颜色优化
- 为感官训练游戏添加Web Audio API音效反馈
- 修正颜色定义，提高颜色区分度（blue: #4ECDC4 → #0066FF）
- 优化听指令游戏策略（6种高区分度目标颜色）

---

## [2026-02-03] 报告导出功能与视觉追踪游戏

### 报告导出功能完整实现
- Word 导出 (.docx)：使用 docx.js 库，支持所有量表（SM、WeeFIM、CSIRS、Conners PSQ/TRS）
- PDF 导出：使用 jsPDF + html2canvas，支持 CSIRS、PSQ、TRS 量表
- 修复 Font Awesome 图标在 PDF 导出中的渲染问题
- 统一导出工具：`src/utils/docxExporter.ts` 和 `src/utils/exportUtils.ts`

### WebGazer 眼动追踪集成
- 集成 WebGazer.js 实现摄像头眼动追踪
- 本地静态资源配置（支持离线使用）
- 游戏化校准界面（蝴蝶追逐糖果主题，9点校准）
- 战斗机瞄准器样式视线准星（80px绿色光环+十字线）
- 双模式支持：眼动追踪 + 鼠标追踪
- 自动降级机制（无摄像头时切换到鼠标模式）
- 连击系统和实时统计

### 摄像头错误处理优化
- AddStudentDialog.vue 摄像头设备预检查
- 详细错误分类（NotFoundError/PermissionDeniedError/NotReadableError）
- 自动降级到文件上传功能
- 使用 ElMessage 替代原生 alert

### PRD 文档更新
- 更新视觉动态引擎详细设计文档

---

## [2026-02-02] Web Crypto API 环境检测与局域网支持

### Web Crypto API 环境检测
- 添加 `isSecureContext()` 和 `isCryptoSubtleAvailable()` 检测方法
- 非安全上下文访问时显示清晰的错误提示和解决方案
- 解决局域网 HTTP 访问时激活码验证失败的问题

### 局域网 HTTPS 访问支持
- Vite 开发服务器配置 0.0.0.0 监听
- OpenSSL 自签名证书生成与配置
- Windows 防火墙规则设置

---

## [2026-02-02] 局域网 HTTPS 访问支持

- Vite 开发服务器配置 0.0.0.0 监听
- OpenSSL 自签名证书生成与配置
- Windows 防火墙规则设置
- Web Crypto API 安全上下文检测

---

## [2026-01-29] Conners PSQ/TRS 完整实现

- 完成评估页面、报告页面、反馈配置系统
- 支持性别×年龄特异性常模计算
- PI/NI 效度检查功能

---

## [2026-02-04] 感官训练游戏特殊儿童适配优化（前11项归档）

### 形状识别游戏修复（第2-4项）
- 修复目标显示空白问题：为 `target-shape` 元素添加背景色样式
- 修复形状变形问题：使用固定像素尺寸（80px×80px），确保1:1比例
- 修复重复答案问题：扩展为12种颜色+8种形状+12种图标

### 物品配对图标扩展（第6项）
- 从12种扩展到30种图标
- 新增水果、蔬菜、动物、植物、食物、运动等多类别图标

### 音效反馈系统（第5项）
- 使用 Web Audio API 生成音效（正确/错误/超时）
- 三音阶上升音调（C5-E5-G5）表示正确
- 下降音调（300Hz→250Hz）表示错误

### 游戏配置与交互优化（第7-11项）
- 修复4×4网格重复答案问题：添加usedValues集合跟踪
- 修复音频游戏反应时间计算bug：添加trialStartTime变量
- 修复听指令做动作流程问题：自动播放语音、提前显示选项
- 修复浏览器自动播放策略限制：添加开始按钮
- 简化游戏配置界面：移除无效配置项

### 技术细节
- 文件：`GameGrid.vue`, `GameAudio.vue`, `SelectStudent.vue`, `games.ts`
- 新增CSS形状样式：clip-path实现hexagon、star、trapezoid等几何形状
- 音效反馈try-catch包裹，确保播放失败不影响游戏流程
