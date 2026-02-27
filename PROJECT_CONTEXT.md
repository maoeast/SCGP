# PROJECT_CONTEXT.md

> **🤖 CLAUDE AGENT PROTOCOL (v2.0)**
>
> 1. **自动维护**：任务结束时必须更新此文件。
> 2. **Git 同步**：修改需提交 (Commit: `docs: update context`)。
> 3. **新会话启动**：新会话优先读取此文件。
> 4. **诚实记录**：记录 Bug 和失败尝试。
> 5. **自动归档 (GC机制)**：
>    - 当 [2. 已完成功能] 列表超过 **10项** 时，请将最早的条目剪切并移动到 `docs/CHANGELOG.md` 文件中，仅在当前文件保留最近的 10 项。
>    - 当 [4. 遗留问题] 中的问题被标记为"已解决"后，请将其移动到 `docs/SOLVED_ISSUES.md` 或直接删除，不要保留在此文件中。

---

## 1. 项目概览 (Project Overview)

### 基本信息

| 项目信息       | 内容                                          |
| :------------- | :-------------------------------------------- |
| **项目名称**   | 星愿能力发展平台 (SCGP)                       |
| **英文名称**   | Stellar Competency Growth Platform            |
| **当前版本**   | 1.0.0                                         |
| **技术栈**     | Electron + Vue 3 + TypeScript + Vite + SQL.js |
| **数据库**     | SQLite (通过 sql.js 运行在浏览器端)           |
| **当前分支**   | `main`                                        |
| **最后更新**   | 2026-02-27 (项目初始化)                       |
| **系统健康度** | ✅ 可运行，所有核心功能正常                   |

### 项目简介

星愿能力发展平台（SCGP）是一款面向特殊教育的综合能力发展系统，支持感觉统合评估、行为评估、日常生活能力评估和个性化教育计划(IEP)生成。

---

## 2. 当前阶段 (Current Phase)

**🚀 Phase 2.0 架构重构** - 核心底座 + 业务模块平台化转型

> **状态**: ✅ Phase 4 评估基础设施重构完成 (2026-02-24)
> **技术规范**: `重构实施技术规范.md` (V1.1)
> **实施计划**: `docs/plans/2025-02-05-refactor-implementation-plan.md`
> **预计工期**: 6-8 周

### 重构目标
将现有 "感官能力发展系统 (SIC-ADS)" 从单一垂直应用转型为 **"多系统融合的综合康复平台"**：
- **核心底座 (Core Kernel)**: 资源管理、档案中心、系统服务、班级管理
- **业务模块 (Business Modules)**: Sensory, Emotional, Social, Cognitive, Life Skills
- **架构原则**: Local-First, No-Native-Deps, Worker-Driven

### 当前进度 (2026-02-17)

| 阶段 | 任务 | 状态 |
|:-----|:-----|:-----|
| Phase 0 | 代码审计与依赖分析 | ✅ 完成 |
| Phase 1.1 | Worker 环境搭建 | ✅ 完成（已废弃） |
| Phase 1.2 | Schema 迁移 | ✅ 核心完成 |
| Phase 1.4 | 原子写入与持久化 (Plan B) | ✅ **完成** |
| Phase 1.4.1 | PSQ/TRS 报告记录修复 | ✅ **完成** |
| Phase 1.4.2 | 旧表迁移清理 | ✅ **完成** |
| Phase 1.4.3 | 重构 init.ts 数据初始化 | ✅ **完成** |
| Phase 1.4.4 | 清理 api.ts 旧方法 | ✅ **完成** |
| Phase 1.5 | 数据迁移验证 | ✅ **完成** |
| Phase 2 | 资源管理与文件系统 | ✅ **完成** |
| Phase 3.1 | 模块化基础设施 | ✅ **完成** |
| Phase 3.2 | ModuleRegistry 实现 | ✅ **完成** |
| Phase 3.3 | IEP 策略模式 | ✅ **完成** |
| Phase 3.4 | UI 组件适配 | ✅ **完成** |
| Phase 3.X | 端到端业务验证 | ✅ **完成** |
| Phase 3.5 | 开发者工具 | ✅ **完成** |
| Phase 3.6 | 班级管理模块 | ✅ **完成** |
| Phase 3.6.7 | 班级快照混合模式验证 | ✅ **完成** |
| Phase 3.7 | 通用统计系统 | ✅ **完成** |
| Phase 3.8 | 器材训练工作流重构 | ✅ **完成** |
| Phase 3.9 | 技术债清偿 - Resource 泛化架构清理 | ✅ **刚完成** |
| Phase 3.10 | 资源管理模块 - ResourceManager.vue | ✅ **完成** |
| Phase 3.11 | 资源中心统一入口 - ResourceCenter.vue | ✅ **完成** |
| Phase 4 | 评估基础设施重构 - ScaleDriver 策略模式 | ✅ **完成** |
| Phase 4.1 | BaseDriver + WeeFIMDriver + CSIRSDriver | ✅ **完成** |
| Phase 4.2 | ConnersPSQDriver + ConnersTRSDriver | ✅ **完成** |
| Phase 4.3 | Conners 常模数据验证与修复 | ✅ **完成** |
| Phase 4.4 | 代码库瘦身与收官 - 废弃文件归档 | ✅ **刚完成** |
| Phase 4.5 | UI 标准化与交互优化 | ✅ **刚完成** |
| Phase 4.6 | 训练记录模块重构与Bug修复 | ✅ **刚完成** |

### 架构决策记录 (2026-02-05)
**Plan B: 主线程防抖原子写入**
- ❌ **放弃**: Worker 方案（Vite 打包与 sql.js CommonJS 兼容性问题）
- ✅ **采用**: 主线程防抖（2000ms）+ IPC 原子写入（fsync + rename）
- **文件**: `src/database/sql-wrapper.ts` (重写完成)

**数据库自动迁移**
- ✅ 应用启动时自动检测并执行 `report_record` 表约束迁移
- ✅ 使用原始 SQL.js Database 对象，绕过 SQLWrapper 防抖保存
- **文件**: `src/database/init.ts`, `src/database/migrate-report-constraints.ts`

---

**Phase 3.5 功能验证** - 器材训练与感官训练模块整合与优化（已归档）

### 已完成内容（2026-02-04）

#### 器材训练模块（6个阶段 - 已完成）
- **阶段1-2**：数据库与API实现
  - 3个核心表：equipment_catalog、equipment_training_records、equipment_training_batches
  - EquipmentAPI（6个方法）、EquipmentTrainingAPI（11个方法）
  - 62个器材数据覆盖7大感官系统
- **阶段3**：IEP模板与生成器
  - 统一 iep-templates.ts（游戏+器材）
  - DAO逻辑占位符系统
  - IEPGenerator 支持器材报告
- **阶段4**：UI组件与页面
  - QuickEntry.vue、Records.vue
  - EquipmentSelector.vue、DataEntryForm.vue
  - StudentDetail.vue 统计卡片
- **阶段5**：Word报告导出
  - docxExporter.ts 单条/批量导出
- **阶段6**：测试工具
  - equipment-test-data.ts 测试数据生成
  - SQLTest.vue 测试页面更新

#### 训练记录模块重构（最新完成）
- **导航页面重构**：TrainingRecords.vue 改为双入口导航页
- **感官训练记录**：SensoryTrainingRecords.vue 独立页面
- **器材训练记录**：Records.vue 优化并修复 ability_tags 解析问题
- **路由配置更新**：新增 /training-records/sensory 和 /training-records/equipment

### 2.1 视觉追踪游戏（暂时搁置）

> **状态**: ⏸️ 暂停开发，等待硬件环境优化验证

**已完成**:
- ✅ 校准系统坐标统一完成
- ✅ 视线稳定性检测机制实现
- ✅ WebGazer 集成与双模式支持（眼动/鼠标）
- ✅ 游戏化校准界面（蝴蝶主题9点校准）

**待解决问题**:
- ⚠️ 硬件环境优化待验证（摄像头角度/光照）
- ⚠️ 眼动追踪精度受环境光影响较大
- ⏳ 游戏数据持久化（training_records 表）待实现

**搁置原因**: 眼动追踪精度高度依赖硬件环境（摄像头位置、光照条件），需要专门测试环境验证。

### 2.2 其他感官训练游戏（已完成优化）

**已完成优化的6个游戏**:
1. ✅ 颜色配对 (GameGrid.vue - color)
2. ✅ 形状识别 (GameGrid.vue - shape)
3. ✅ 物品配对 (GameGrid.vue - icon)
4. ✅ 声音辨别 (GameAudio.vue - diff)
5. ✅ 听指令做动作 (GameAudio.vue - command)
6. ✅ 节奏模仿 (GameAudio.vue - rhythm)

**已修复的问题**:
- ✅ **4×4网格导致应用卡死** - 修复无限循环bug，添加安全限制和备用填充
- ✅ **形状识别重复答案问题** - 扩展为12种颜色+8种形状，确保4×4网格中只有一个正确答案
- ✅ **物品配对图标库扩展** - 从12种扩展到30种图标（水果、蔬菜、动物、植物、食物、运动等）
- ✅ **形状识别形状变形** - 改为固定像素尺寸，保持1:1比例
- ✅ **游戏音效反馈** - 添加正确/错误/超时音效，使用Web Audio API生成
- ✅ 形状识别目标显示空白 - 添加背景色样式
- ✅ 4×4网格样式显示异常 - 增大格子尺寸，优化间距
- ✅ 游戏时间间隔太短 - 延长每轮超时时间和反馈延迟
- ✅ 缺乏难度分级 - 优化默认值为"简单"难度
- ✅ 视觉反馈时间不足 - 延长反馈动画显示时间
- ✅ 默认配置针对特殊儿童优化（更少的轮次、更宽松的时间限制）

### 已完成的评估量表

- [x] S-M 社会生活能力量表 (132题)
- [x] WeeFIM 功能独立性量表 (18题)
- [x] CSIRS 感觉统合量表 (58题)
- [x] Conners PSQ 父母问卷 (48题)
- [x] Conners TRS 教师问卷 (28题)


### 2. 已完成功能

> **提示**: 更多历史功能请查看 [CHANGELOG.md](docs/CHANGELOG.md)

23. **[2026-02-27] Phase 5 - 项目重构与品牌升级**
   - **目标**: 将项目从 SIC-ADS 重构为 SCGP（星愿能力发展平台）
   - **Git 历史重置**:
     - 创建 orphan 分支（无历史记录）
     - 单一初始提交：2612 文件，646,125 行代码
   - **品牌升级**:
     - 中文名称：感官综合训练与评估系统 → 星愿能力发展平台
     - 英文名称：SIC-ADS → SCGP (Stellar Competency Growth Platform)
     - 版本：4.3.0 → 1.0.0
   - **仓库迁移**:
     - 旧仓库：https://github.com/maoeast/Self-Care-ATS.git
     - 新仓库：https://github.com/maoeast/SCGP.git
   - **数据库初始化修复**:
     - 问题：全新数据库启动时报错 `no such table: main.report_record`
     - 修复：`migrate-report-constraints.ts` 添加表存在性检查
   - **废弃 worktree 清理**: 删除 `equipment-training` worktree

22. **[2026-02-27] Phase 4.6 - 训练记录模块重构与Bug修复**
   - **目标**: 修复训练记录模块的关键Bug，确保多模块支持正常工作
   - **ResourceSelector 硬编码修复** (`src/components/resources/ResourceSelector.vue`):
     - 问题：`loadData` 函数中硬编码 `moduleCode: 'sensory' as any`
     - 修复：改为使用 `props.moduleCode`，支持多模块
   - **路由重定向循环修复** (`src/router/index.ts`):
     - 问题：访问训练记录时报错 `Maximum call stack size exceeded`
     - 原因：`training-records/sensory` 重定向到 `/training-records/sensory?type=game` 导致无限循环
     - 修复：移除有问题的重定向路由
   - **Records.vue 路由同步修复** (`src/views/equipment/Records.vue`):
     - 问题：选择学生后URL不更新，刷新后丢失状态
     - 修复：`router.replace({ name: 'EquipmentRecords', params: { studentId } })`
     - 新增：`watch` 监听路由参数变化自动加载记录
   - **EquipmentRecordsPanel 模块过滤问题**:
     - 问题：旧记录 `module_code` 为 NULL 被过滤
     - 处理：保持简单过滤逻辑，用户可通过 SQL 更新旧记录
   - **文件修改**:
     - `src/components/resources/ResourceSelector.vue` - 硬编码修复
     - `src/router/index.ts` - 移除循环重定向
     - `src/views/equipment/Records.vue` - 路由同步修复
     - `src/views/training-records/components/EquipmentRecordsPanel.vue` - 简化过滤逻辑

21. **[2026-02-27] Phase 4.5 - UI 标准化与交互优化**
   - **目标**: 统一训练记录模块的 UI 风格，优化器材训练记录的交互流程
   - **AssessmentSelect.vue 模板修复**:
     - 问题：Element Plus 中不存在 `School` 图标导致 500 错误
     - 修复：替换为 `OfficeBuilding` 图标
     - 修复：正确嵌套 `scale-cards` 和 `notice-card` 模板结构
   - **器材训练记录交互优化** (`src/views/equipment/Records.vue`):
     - 路由修改：`/training-records/equipment` 从重定向改为直接组件
     - 参数可选化：`:studentId?` 允许无参数访问
     - 页面内学生选择：添加学生下拉选择器，无需跳转
     - 空状态处理：未选择学生时显示友好提示
   - **训练记录 UI 标准化** (3个页面):
     - `TrainingRecords.vue` - 移除旧渐变卡片样式（~220行），使用 el-card
     - `SensoryTrainingRecords.vue` - 移除 el-page-header，使用标准 page-header
     - `Records.vue` - 移除重复 filter-section 样式，使用全局 layout.css
   - **文件修改**:
     - `src/views/assessment/AssessmentSelect.vue` - 模板语法修复
     - `src/router/index.ts` - 器材训练记录路由优化
     - `src/views/equipment/Records.vue` - 页面内学生选择 + UI 标准化
     - `src/views/games/TrainingRecords.vue` - UI 标准化重构
     - `src/views/games/SensoryTrainingRecords.vue` - UI 标准化重构

14. **[2026-02-22] Phase 3.10 资源管理模块 - ResourceManager.vue**
   - **目标**: 实现系统资源的顶级管理功能，支持多模块、多资源类型的统一管理
   - **路由配置**:
     - 路径: `/admin/resources`
     - 名称: `ResourceManager`
     - 图标: `folder-open`
     - 权限: `roles: ['admin']`（仅管理员可访问）
     - **文件**: `src/router/index.ts`
   - **左侧筛选面板**:
     - 业务模块筛选: 感官训练、情绪调节、社交沟通、生活自理、认知训练
     - 资源类型筛选: 器材、文档、视频、闪卡
     - 状态筛选: 启用中、已禁用
     - 搜索框: 支持关键词搜索（300ms 防抖）
     - 统计信息: 显示资源总数、系统资源数、自定义资源数
   - **资源列表表格**:
     - 缩略图列（64×64 紧凑型）:
       - 器材类: 显示实际图片（支持 el-image 大图预览）
       - 其他类型: 显示类型图标（不同底色区分）
       - 无封面: 显示默认占位符
     - 资源名称 + 描述
     - 分类标签
     - 来源标签: 系统（蓝灰色+锁图标）/ 自定义（绿色+星标）
     - 状态开关: 一键启用/禁用
     - 标签列表: 最多显示 3 个，超出显示 +N
     - 操作列: 编辑、删除（禁用时显示恢复）
   - **权限控制**:
     | 操作 | 系统资源 (is_custom=0) | 自定义资源 (is_custom=1) |
     |:-----|:----------------------|:------------------------|
     | 编辑名称 | ❌ 禁用 | ✅ 允许 |
     | 编辑分类 | ❌ 禁用 | ✅ 允许 |
     | 编辑描述 | ✅ 允许 | ✅ 允许 |
     | 编辑标签 | ✅ 允许 | ✅ 允许 |
     | 删除 | ❌ 禁用 + Tooltip | ✅ 允许 (软删除) |
     | 启用/禁用 | ✅ 允许 | ✅ 允许 |
   - **编辑弹窗**:
     - 封面预览（自定义资源可更换）
     - 名称输入（系统资源只读+锁图标）
     - 分类选择（系统资源禁用）
     - 详细描述
     - 标签编辑器: 已选标签、可选标签列表、常用标签快捷添加
   - **软删除与恢复**:
     - 删除操作: 调用 `ResourceAPI.deleteResource()` 设置 `is_active = 0`
     - 恢复入口: 筛选"已禁用"状态后显示恢复按钮
     - 状态驱动: 根据状态自动切换删除/恢复按钮
   - **ResourceAPI 扩展**:
     - 新增 `getAllResourcesForAdmin()` 方法: 查询所有资源（包括禁用的）
     - 排序: 启用资源优先，系统资源在前
     - **文件**: `src/database/resource-api.ts` (+80行)
   - **文件修改**:
     - `src/views/admin/ResourceManager.vue` - 新增（~800行）
     - `src/router/index.ts` - 添加路由配置
     - `src/views/Layout.vue` - 添加菜单顺序
     - `src/database/resource-api.ts` - 添加 getAllResourcesForAdmin 方法

15. **[2026-02-22] Phase 3.11 资源中心统一入口 - ResourceCenter.vue**
   - **目标**: 将"资源管理"（训练资源）和"资料库"（教学资料）深度融合，构建统一的资源中心入口
   - **架构设计**: 统一入口 + 双视图（Tab切换）
     - Tab 1: 训练资源 → 面向 `sys_training_resource` 表
     - Tab 2: 教学资料 → 面向 `resource_meta` 表
   - **权限自适应**:
     - admin: 完整 CRUD + 状态开关 + 批量导入
     - teacher: 只读模式（列表展示 + 筛选 + 搜索）
   - **路由变更**:
     - `/resources` → `/resource-center`（重定向）
     - `/admin/resources` → `/resource-center`（重定向）
     - 新增 `/resource-center` 统一入口（admin/teacher 均可访问）
   - **样式统一**: 250px 左侧栏宽度
   - **修复的问题**:
     - TeachingMaterials.vue: `ElMessageBox` 导入位置错误
     - ResourceCenter.vue: `@/stores/user` → `@/stores/auth`
   - **旧文件废弃标记**:
     - `src/views/Resources.vue` - 添加 DEPRECATED 注释
     - `src/views/admin/ResourceManager.vue` - 添加 DEPRECATED 注释
   - **文件修改**:
     - `src/views/admin/ResourceCenter.vue` - 新增（~180行）
     - `src/views/resource-center/TrainingResources.vue` - 新增（~850行）
     - `src/views/resource-center/TeachingMaterials.vue` - 新增（~780行）
     - `src/router/index.ts` - 添加路由配置和重定向
     - `src/views/Resources.vue` - 添加废弃注释
     - `src/views/admin/ResourceManager.vue` - 添加废弃注释

16. **[2026-02-24] Phase 4 评估基础设施重构 - ScaleDriver 策略模式**
   - **目标**: 使用"UI Container Reuse + Strategy Driver"架构重构评估模块
   - **ScaleDriver 接口设计** (`src/types/assessment.ts` ~300行):
     - `getScaleInfo()`: 量表基本信息
     - `getStartIndex(student)`: 根据年龄计算起始题目索引
     - `getQuestions(student)`: 获取题目列表
     - `getNextQuestion()`: 导航决策（NavigationDecision: next/jump/complete）
     - `calculateScore()`: 计算评分结果
     - `generateFeedback()`: 生成反馈文本
     - `calculateProgress()`: 进度计算（可选）
   - **SMDriver 实现** (`src/strategies/assessment/SMDriver.ts` ~700行):
     - S-M 社会生活能力量表驱动器（132题，7个年龄阶段）
     - Basal/Ceiling 规则：连续10项通过/不通过
     - `stageBaseScores`: 各阶段基础分 {1:0, 2:19, 3:41, 4:63, 5:80, 6:96, 7:113}
     - `calculateSMRawScore()`: 正确的粗分计算（基础分 + 通过题数）
     - `getQuestionsFromStart()`: 基于起始索引的题目总数计算
   - **AssessmentContainer 组件** (`src/views/assessment/AssessmentContainer.vue` ~630行):
     - 统一评估容器，支持多量表驱动
     - 三个阶段：welcome → assessing → complete
     - 子组件：WelcomeDialog, QuestionCard, CompleteDialog
     - 进度持久化（localStorage）
     - 评估结果保存到数据库
   - **策略工厂** (`src/strategies/assessment/index.ts`):
     - `getDriverByScaleCode(scaleCode)`: 同步获取驱动器实例
     - 驱动器缓存机制
     - 静态导入（Vite ESM 兼容）
   - **修复的问题**:
     - 移除无效 `@/stores/class` 导入（500错误）
     - `state.metadata.visitedStages` 空指针保护（运行时崩溃）
     - 粗分计算逻辑：添加阶段基础分（评分错误）
     - 报告路由：path参数改为query参数（404错误）
     - 进度显示：基于起始索引计算总题数（进度不准确）
     - 进度总数变化：初始化时保存startIndex（进度不稳定）
     - 报告分数不一致：使用metadata中的startStage（数据不一致）
     - 等级标签字体颜色：添加 color: #333（可读性问题）
   - **文件修改**:
     - `src/types/assessment.ts` - 新增（~300行）
     - `src/strategies/assessment/SMDriver.ts` - 新增（~700行）
     - `src/strategies/assessment/index.ts` - 新增（~107行）
     - `src/views/assessment/AssessmentContainer.vue` - 新增（~630行）
     - `src/views/assessment/components/WelcomeDialog.vue` - 新增（~80行）
     - `src/views/assessment/components/QuestionCard.vue` - 新增（~150行）
     - `src/views/assessment/components/CompleteDialog.vue` - 新增（~200行）
     - `src/views/assessment/sm/Report.vue` - 修改（分数优先级、字体颜色）
     - `src/router/index.ts` - 修改（路由配置）

17. **[2026-02-24] Phase 4.1 BaseDriver + WeeFIMDriver + CSIRSDriver 实现**
   - **目标**: 完善评估驱动器架构，实现更多量表驱动器
   - **BaseDriver 抽象基类** (`src/strategies/assessment/BaseDriver.ts` ~280行):
     - 抽象属性：scaleCode, scaleName, version, ageRange, totalQuestions, dimensions
     - 抽象方法：getQuestions, getStartIndex, calculateScore, generateFeedback
     - 通用实现：getNextQuestion（线性导航）、calculateProgress、getScaleInfo
     - 工具方法：serializeAnswers, calculateTiming, analyzeDimensionScores, analyzeDimensions
     - **关键修复**: getNextQuestion 使用 `state.metadata.totalQuestions` 而非调用 getQuestions
   - **WeeFIMDriver 实现** (`src/strategies/assessment/WeeFIMDriver.ts` ~380行):
     - WeeFIM 功能独立性量表驱动器（18题）
     - 7 级评分（1-7分）
     - 2 个维度：运动功能（13题）、认知功能（5题）
     - 等级映射：完全独立(126), 基本独立(108-125), 轻度依赖(91-107), 中度依赖(73-90), 重度依赖(54-72), 极重依赖(36-53), 完全依赖(18-35)
     - 欢迎对话框内容（评估说明）
   - **CSIRSDriver 实现** (`src/strategies/assessment/CSIRSDriver.ts` ~560行):
     - CSIRS 感觉统合量表驱动器（58题，根据年龄动态调整）
     - 5 个维度：前庭觉调节与运动规划、触觉调节与情绪行为、身体感知与动作协调、视听知觉与学业表现（6岁+）、执行功能与社会适应（10岁+）
     - 5 级评分（1-5分），反向计分
     - T 分转换：使用 csirs-conversion.ts 查表
     - 等级映射：非常优秀(71+), 优秀(61-70), 正常(40-60), 偏低(30-39), 严重偏低(0-29)
   - **SMDriver 重构**:
     - 继承 BaseDriver
     - 保留 S-M 特有的 Basal/Ceiling 跳题逻辑
   - **策略工厂注册** (`src/strategies/assessment/index.ts`):
     - 注册 'sm': SMDriver
     - 注册 'weefim': WeeFIMDriver
     - 注册 'csirs': CSIRSDriver
   - **AssessmentContainer 修复**:
     - 初始化时保存 `totalQuestions` 到 `state.metadata`
     - handleViewReport 使用路径参数
   - **修复的问题**:
     - getNextQuestion 返回 'next' 而非 'complete'（CSIRS 动态题目数问题）
     - CSIRS 保存失败 "table csirs_assess has no column named total_score"（Schema 不匹配）
   - **文件修改**:
     - `src/strategies/assessment/BaseDriver.ts` - 新增（~280行）
     - `src/strategies/assessment/WeeFIMDriver.ts` - 新增（~380行）
     - `src/strategies/assessment/CSIRSDriver.ts` - 新增（~560行）
     - `src/strategies/assessment/SMDriver.ts` - 重构（继承 BaseDriver）
     - `src/strategies/assessment/index.ts` - 修改（注册新驱动器）
     - `src/views/assessment/AssessmentContainer.vue` - 修改（metadata.totalQuestions, 路由修复）

18. **[2026-02-24] Phase 4.2 收官 - ConnersPSQDriver + ConnersTRSDriver 实现**
   - **目标**: 完成评估驱动器架构的最后两块拼图，实现 Conners 1978 版驱动器
   - **ConnersPSQDriver 实现** (`src/strategies/assessment/ConnersPSQDriver.ts` ~350行):
     - Conners 父母用问卷驱动器（48题）
     - 6 个维度：品行问题、学习问题、心身障碍、冲动-多动、焦虑、多动指数
     - 4 点评分（0-3分）
     - T 分计算：使用 `conners-norms.ts` 性别×年龄常模
     - 等级判定：基于多动指数 T 分（<60 正常, 60-69 临界, ≥70 临床显著）
     - 欢迎对话框内容（评估说明）
     - **注意**: 不包含 PI/NI 效度检查（1978版无此项）
   - **ConnersTRSDriver 实现** (`src/strategies/assessment/ConnersTRSDriver.ts` ~320行):
     - Conners 教师用问卷驱动器（28题）
     - 4 个维度：品行问题、多动、不注意-被动、多动指数
     - 4 点评分（0-3分）
     - T 分计算：使用 `conners-norms.ts` 性别×年龄常模
     - 学校指导建议生成
   - **策略工厂注册** (`src/strategies/assessment/index.ts`):
     - 注册 'conners-psq': ConnersPSQDriver
     - 注册 'conners-trs': ConnersTRSDriver
   - **AssessmentContainer 保存逻辑**:
     - 新增 `saveConnersPSQAssessment()` 方法
     - 新增 `saveConnersTRSAssessment()` 方法
     - 1978版不使用 PI/NI 字段，设为默认值
   - **旧评估页面废弃标记**:
     - `src/views/assessment/sm/Assessment.vue` - 添加 @deprecated 注释
     - `src/views/assessment/weefim/Assessment.vue` - 添加 @deprecated 注释
     - `src/views/assessment/csirs/Assessment.vue` - 添加 @deprecated 注释
     - `src/views/assessment/conners-psq/Assessment.vue` - 添加 @deprecated 注释
     - `src/views/assessment/conners-trs/Assessment.vue` - 添加 @deprecated 注释
   - **架构状态**:
     | 维度 | 重构前 | 重构后 |
     |:-----|:-------|:-------|
     | 量表驱动器 | 3个 | ✅ 5个（完整） |
     | 评估入口 | 5个独立页面 | ✅ 统一 AssessmentContainer |
     | 路由格式 | 各自独立 | ✅ `/assessment/unified/:scaleCode/:studentId` |
   - **文件修改**:
     - `src/strategies/assessment/ConnersPSQDriver.ts` - 新增（~350行）
     - `src/strategies/assessment/ConnersTRSDriver.ts` - 新增（~320行）
     - `src/strategies/assessment/index.ts` - 修改（注册新驱动器）
     - `src/views/assessment/AssessmentContainer.vue` - 修改（+110行，保存逻辑）
     - 5个旧评估页面 - 添加 @deprecated 注释

19. **[2026-02-26] Phase 4.3 - Conners 常模数据验证与修复**
   - **目标**: 对 Conners PSQ/TRS 量表的常模数据进行系统性交叉核对，确保 T 分计算精度
   - **PSQ 常模数据交叉核对** (`src/database/conners-norms.ts`):
     - 核对范围：5年龄段 × 2性别 × 6维度 = 60 个数据点
     - 数据源：Conners 父母用量表（1987）因子常模表
     - 发现并修复 5 处数据错误：
       | 年龄段 | 性别 | 维度 | 修复内容 |
       |--------|------|------|----------|
       | 3-5岁 | 男 | anxiety | mean: 0.60→0.61, sd: 0.61→0.40 |
       | 6-8岁 | 男 | anxiety.sd | 0.51→0.69 |
       | 6-8岁 | 男 | hyperactivity_index.mean | 0.69→0.51 |
       | 6-8岁 | 女 | anxiety.sd | 0.66→0.59 |
       | 6-8岁 | 女 | hyperactivity_index.mean | 0.59→0.66 |
   - **TRS 常模数据交叉核对**:
     - 核对范围：5年龄段 × 2性别 × 4维度 = 40 个数据点
     - 结果：✅ 所有数据正确，无需修复
   - **Electron EPIPE 错误修复** (`electron/main.mjs`):
     - 问题：console.log 高频调用时触发 EPIPE (broken pipe) 错误
     - 修复：新增 `safeLog()` 和 `safeError()` 函数，包装所有日志调用
     - 影响的处理器：db:load, write-database-file, read-database-file, delete-database-backup, save-database-atomic
   - **文件修改**:
     - `src/database/conners-norms.ts` - PSQ 常模数据修复（5处）
     - `electron/main.mjs` - EPIPE 错误修复（+25行）

20. **[2026-02-27] Phase 4.4 - 代码库瘦身与收官（技术债清偿）**
   - **目标**: 彻底清理废弃文件，完成架构重构的最后一步
   - **归档测试文件**:
     - `src/views/devtools/ConnersE2ETest.vue` → `src/views/_archived/devtools/`
     - 原因：Phase 4.3 常模验证完成，测试使命结束
   - **归档废弃评估页面** (5个):
     - `src/views/assessment/sm/Assessment.vue` → `_archived/assessment/sm_Assessment.vue`
     - `src/views/assessment/weefim/Assessment.vue` → `_archived/assessment/weefim_Assessment.vue`
     - `src/views/assessment/csirs/Assessment.vue` → `_archived/assessment/csirs_Assessment.vue`
     - `src/views/assessment/conners-psq/Assessment.vue` → `_archived/assessment/conners-psq_Assessment.vue`
     - `src/views/assessment/conners-trs/Assessment.vue` → `_archived/assessment/conners-trs_Assessment.vue`
     - 原因：Phase 4 ScaleDriver 策略模式重构，旧版硬编码页面已废弃
   - **清理 System.vue 临时入口**:
     - 移除 "Phase 4 Conners 端到端验证" 测试卡片
     - 移除 `goToConnersE2ETest()` 导航函数
   - **路由重定向配置**:
     - 旧评估路由自动重定向到统一评估容器
     - `/assessment/sm/assessment/:studentId` → `/assessment/unified/sm/:studentId`
     - `/assessment/weefim/assessment/:studentId` → `/assessment/unified/weefim/:studentId`
     - `/assessment/csirs/:studentId` → `/assessment/unified/csirs/:studentId`
     - `/assessment/conners-psq/:studentId` → `/assessment/unified/conners-psq/:studentId`
     - `/assessment/conners-trs/:studentId` → `/assessment/unified/conners-trs/:studentId`
   - **新建归档说明文件**:
     - `src/views/_archived/README.md` - 详细说明归档原因和替代方案
   - **架构状态**:
     | 维度 | 清理前 | 清理后 |
     |:-----|:-------|:-------|
     | 废弃评估页面 | 5个（带@deprecated） | ✅ 0个（已归档） |
     | 测试组件 | ConnersE2ETest.vue | ✅ 已归档 |
     | 临时测试入口 | System.vue 中 | ✅ 已移除 |
     | 旧路由 | 硬编码组件 | ✅ 重定向到统一容器 |
   - **文件修改**:
     - `src/router/index.ts` - 移除旧组件导入，添加重定向路由
     - `src/views/System.vue` - 移除临时测试入口
     - `src/views/_archived/` - 新建归档目录和README

---

## 3. 技术栈与依赖 (Tech Stack)

### 核心技术

| 技术         | 版本   | 用途            |
| :----------- | :----- | :-------------- |
| Vue          | 3.x    | 前端框架        |
| TypeScript   | 5.x    | 类型系统        |
| Element Plus | latest | UI 组件库       |
| ECharts      | latest | 图表可视化      |
| SQL.js       | latest | 浏览器端 SQLite |
| Pinia        | latest | 状态管理        |

### 依赖包管理

无新增依赖 - 使用现有技术栈实现所有功能

---

## 4. 关键问题追踪 (Issue Tracker)

### 当前待解决问题

| 优先级 | 问题描述                              | 失败尝试记录 | 建议下一步   |
| :----- | :------------------------------------ | :----------- | :----------- |
| Low    | WebGazer 眼动追踪精度受硬件环境影响   | 摄像头角度过高、逆光导致视线抖动 | 调整摄像头至与眼睛平齐，改善光照条件 |
| Low    | CSIRS/PSQ/TRS 报告 PDF 导出可优化样式 | -            | 后续迭代实现 |
| Low    | Conners 历史/趋势对比页面缺失         | -            | 后续迭代实现 |

### 已解决问题

1. **[2026-02-24] PDF 导出无限循环 Bug**
   - 问题：导出 PDF 时卡在"正在保存PDF..."一直转圈
   - 原因：`exportUtils.ts` 分页逻辑中 `position -= pageHeight` 使 position 变为负数，导致 `while (position < totalHeight)` 无限循环
   - 解决：重写分页逻辑，使用 `remainingHeight > 0` 作为循环条件，添加 100 页安全上限
   - 文件：`src/utils/exportUtils.ts`

2. **[2026-02-24] PDF 导出 style 属性异常**
   - 问题：导出 PDF 时报错 `"relative" is not a function`
   - 原因：`html2canvas` 克隆文档中某些元素的 `style` 属性可能只读或不可用
   - 解决：移除直接操作 style 的代码，改用 CSS 规则（`!important`）处理样式
   - 文件：`src/utils/exportUtils.ts`

3. **[2026-02-21] 数据丢失 Bug - 防抖保存导致刷新后数据丢失**
   - 问题：创建班级后立即刷新页面，数据会丢失
   - 原因：2000ms 防抖保存期间刷新页面导致内存数据丢失
   - 解决：ClassAPI 添加 `forceSave()` 方法，关键操作异步化并立即保存
   - 文件：`src/database/class-api.ts`, `src/database/sql-wrapper.ts`

2. **[2026-02-21] 并发保存丢失漏洞 - 连续创建班级时第二个丢失**
   - 问题：连续快速创建两个班级，第二个班级会丢失
   - 原因：`isSaving = true` 时直接 return，导致保存请求被丢弃
   - 解决：新增 `pendingSave` 标志，`finally` 块中检测并递归保存
   - 文件：`src/database/sql-wrapper.ts`

3. **[2026-02-21] Element Plus el-statistic prop 类型警告**
   - 问题：`[el-statistic] Invalid prop: type check failed for prop "value". Expected Number | Object, got String`
   - 原因：当 `averageScore` 为 null 时传入字符串 "—"
   - 解决：使用 v-if/v-else 条件渲染，空数据显示自定义组件
   - 文件：`src/views/admin/ClassManagement.vue`

4. **[2026-02-21] 跨模块统计分值一致性问题**
   - 问题：游戏训练（百分比 0-100）与器材训练（整数 1-5）混合平均分无意义
   - 解决：全部模式下 `average_score` 返回 NULL，UI 显示 "—" 并提示
   - 文件：`src/database/schema/class-schema.sql`, `docs/analysis/statistics-score-consistency.md`

5. **[2026-02-24] getNextQuestion 返回 'next' 而非 'complete'**
   - 问题：CSIRS 评估完成最后一题后按钮显示 `{action: 'next'}` 而非完成
   - 原因：BaseDriver.getNextQuestion 调用 `this.getQuestions({} as StudentContext)` 获取题目数，但 CSIRS 根据年龄过滤题目，空上下文导致题目数错误
   - 解决：AssessmentContainer 初始化时保存 `totalQuestions` 到 `state.metadata`，BaseDriver 优先使用该值
   - 文件：`src/strategies/assessment/BaseDriver.ts`, `src/views/assessment/AssessmentContainer.vue`

6. **[2026-02-24] CSIRS 评估保存失败 - Schema 不匹配**
   - 问题：评估完成后保存报错 "table csirs_assess has no column named total_score"
   - 原因：CSIRSAPI.createAssessment 使用的列名与实际表结构不匹配
   - 解决：重写 saveCSIRSAssessment 方法，使用正确的列名（age_months, raw_scores, t_scores, total_t_score, level）
   - 文件：`src/views/assessment/AssessmentContainer.vue`

7. **[2026-02-02] 数据库约束不包含 conners-psq 和 conners-trs**
   - 问题：report_record 表 CHECK 约束只包含 'sm', 'weefim', 'training', 'iep', 'csirs'
   - 解决：更新 schema 添加 'conners-psq' 和 'conners-trs'，实现自动迁移逻辑
   - 文件：`src/database/init.ts:289`, `src/database/api.ts`

2. **[2026-02-02] 迁移残留表导致失败**
   - 问题：上次迁移失败留下的 report_record_new 表阻碍新的迁移
   - 解决：添加 `DROP TABLE IF EXISTS report_record_new` 清理逻辑
   - 文件：`src/database/init.ts:754-758`

3. **[2026-02-02] 迁移事务内残留表清理问题**
   - 问题：`table report_record_new already exists` 错误导致迁移失败
   - 解决：在事务内添加清理逻辑，确保原子性 DROP TABLE 操作
   - 文件：`src/database/init.ts:788-789`, `502-504`

4. **[2026-02-02] 局域网 HTTP 访问时激活码验证失败**
   - 问题：Web Crypto API 的 `crypto.subtle` 只在安全上下文（HTTPS/localhost）中可用
   - 解决：配置 HTTPS 开发环境（自签名证书）+ 添加环境检测和友好错误提示
   - 文件：`vite.config.ts`, `src/utils/license-manager.ts`, `dev-cert.pem`, `dev-key.pem`

---

## 5. 关键架构决策 (Key Decisions)

### 数据库设计

- **[2026-01-29]** Conners PSQ/TRS 使用独立表结构，而非统一表
  - **原因**: PSQ (48题，5维度) 和 TRS (28题，4维度) 结构差异较大
  - **权衡**: 增加表数量但降低复杂度，便于维护

### 评分系统

- **[2026-01-29]** Conners 使用性别×年龄特异性常模
  - **原因**: 儿童行为表现存在显著的性别和年龄差异
  - **实现**: 5个年龄段(3-5, 6-8, 9-11, 12-14, 15-17岁) × 2种性别 = 10组常模数据

### 效度检查策略

- **[2026-01-29]** PI/NI 检查使用警告模式而非阻断模式
  - **原因**: 即使效度异常，临床专家仍需要看到具体维度分数
  - **实现**: 报告页面显示警告横幅，但完整展示评估结果

### T分计算公式

- **[2026-01-28]** CSIRS Executive 维度使用百分制而非T分
  - **原因**: 官方常模表中无 Executive 维度数据
  - **实现**: `(rawScore / 15) * 100`

### 反馈配置架构

- **[2026-01-29]** Conners 维度配置使用 levels 数组结构
  - **原因**: 支持多层级反馈（>2个等级），便于扩展
  - **结构**: `levels` 数组包含 `max` 阈值，根据 rawScore 匹配第一个满足条件等级
- **[2026-01-28]** 使用集中式 feedbackConfig.js 管理所有评估反馈
  - **原因**: 便于非技术人员修改评语，支持多量表扩展
  - **结构**: `ASSESSMENT_LIBRARY.sensory_integration`, `ASSESSMENT_LIBRARY.conners`

### 数据读取策略

- **[2026-01-29]** 报告"总分"优先从 t_scores JSON 读取
  - **原因**: 确保总分与分维度数据一致性，避免数据库字段不同步问题
  - **实现**: `tScores.hyperactivity_index ?? assessment.hyperactivity_index ?? 0`

### 开发环境配置

- **[2026-02-02]** 开发服务器支持局域网 HTTPS 访问
  - **原因**: 测试人员需要通过局域网访问开发环境，HTTP 访问会导致 Web Crypto API 不可用
  - **实现**:
    - Vite 配置 `host: '0.0.0.0'` 监听所有网络接口
    - OpenSSL 生成自签名证书（有效期 1 年）
    - Windows 防火墙规则允许端口 5173/5174
    - `license-manager.ts` 添加安全上下文检测和友好错误提示

---

## 6. 数据库 Schema (Database Schema)

### 核心表结构

#### Conners PSQ 评估表

```sql
CREATE TABLE conners_psq_assess (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL,
  gender TEXT NOT NULL,
  age_months INTEGER NOT NULL,
  raw_scores TEXT NOT NULL,           -- JSON: 各维度原始分
  dimension_scores TEXT NOT NULL,     -- JSON: 维度分数详情(含漏填信息)
  t_scores TEXT NOT NULL,             -- JSON: 各维度T分
  pi_score REAL,                      -- 正向指标得分
  ni_score REAL,                      -- 负向指标得分
  is_valid INTEGER DEFAULT 1,         -- 效度是否有效
  invalid_reason TEXT,                -- 无效原因
  hyperactivity_index REAL,           -- 多动指数T分
  level TEXT,                         -- 评定等级: normal/borderline/clinical
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### Conners TRS 评估表

结构同 PSQ，表名为 `conners_trs_assess`

### 索引

```sql
CREATE INDEX idx_conners_psq_student ON conners_psq_assess(student_id);
CREATE INDEX idx_conners_psq_created ON conners_psq_assess(created_at);
CREATE INDEX idx_conners_trs_student ON conners_trs_assess(student_id);
CREATE INDEX idx_conners_trs_created ON conners_trs_assess(created_at);
```

---

## 7. 文件结构速查 (File Structure)

```
src/
├── config/
│   └── feedbackConfig.js           # 评估反馈配置库
├── types/
│   ├── connors.ts                  # Conners 类型定义
│   ├── csirs.ts                    # CSIRS 类型定义
│   └── games.ts                    # 游戏类型定义
├── database/
│   ├── init.ts                     # 数据库初始化
│   ├── api.ts                      # 数据库 API
│   ├── connors-psq-questions.ts    # PSQ 48道题目
│   ├── connors-trs-questions.ts    # TRS 28道题目
│   ├── connors-norms.ts            # 性别×年龄常模
│   ├── connors-scoring.ts          # 评分逻辑
│   ├── csirs-questions.ts          # CSIRS 58道题目
│   └── csirs-conversion.ts         # CSIRS T分转换表
├── views/assessment/
│   ├── AssessmentSelect.vue        # 量表选择页面
│   ├── SelectStudent.vue           # 学生选择页面
│   ├── conners-psq/
│   │   ├── Assessment.vue          # PSQ 评估页面
│   │   └── Report.vue              # PSQ 报告页面
│   ├── conners-trs/
│   │   ├── Assessment.vue          # TRS 评估页面
│   │   └── Report.vue              # TRS 报告页面
│   └── csirs/
│       ├── Assessment.vue
│       ├── Report.vue
│       └── History.vue
└── router/index.ts                 # 路由配置
```

---

## 8. Conners 评估模块详解

### 功能概述

Conners 儿童行为问卷包含两个版本：

- **PSQ (Parent Rating Scale)**: 父母问卷，48题，评估儿童在家中的行为表现
- **TRS (Teacher Rating Scale)**: 教师问卷，28题，评估儿童在学校中的行为表现

### 技术特点

1. **性别和年龄特异性常模**
   - 区分男/女不同常模数据
   - 5个年龄段：3-5岁、6-8岁、9-11岁、12-14岁、15-17岁
   - T分计算：`T = 50 + 10 × Z`，其中 `Z = (原始分 - 均值) / 标准差`

2. **PI/NI 效度检查**
   - **PI (Positive Impression)**: 正向指标，分数过高(>2.5)表示"装好"
   - **NI (Negative Impression)**: 负向指标，分数过高(>2.2)表示夸大或危机
   - 使用**警告模式**而非阻断，即使效度异常也显示分数

3. **漏填处理**
   - 10%容忍度：漏填题目 ≤ 10% 时用平均分填补
   - 漏填 > 10% 时维度标记为无效

4. **评定等级**
   - **正常范围**: 多动指数 T分 < 60
   - **临界偏高**: 多动指数 T分 60-69
   - **临床显著**: 多动指数 T分 ≥ 70

### 维度配置

**PSQ (父母问卷) - 6个维度**:

- `conduct`: 品行问题 (11题)
- `learning`: 学习问题 (3题)
- `psychosomatic`: 心身障碍 (4题) ✨ 2026-01-29 新增
- `impulsivity_hyperactivity`: 冲动性 (4题)
- `anxiety`: 焦虑 (23题)
- `hyperactivity_index`: 多动指数 (6题)

**TRS (教师问卷) - 4个维度**:

- `conduct`: 品行问题 (10题)
- `hyperactivity`: 多动 (3题)
- `inattention_passivity`: 注意力-被动 (9题) ✨ 2026-01-29 重命名
- `hyperactivity_index`: 多动指数 (2题)

### 反馈配置结构

**2026-01-29 更新**：维度配置使用新的 `levels` 数组结构

```javascript
dimensions: {
  conduct: {
    label: "品行表现",
    description: "涉及规则遵守、情绪控制及与他人的互动模式。",
    levels: [
      {
        max: 1.5,
        title: "规则意识良好",
        content: "...",
        advice: "..."
      },
      {
        max: 999,
        title: "需要行为引导",
        content: "...",
        advice: "..."
      }
    ]
  }
}
```

### 评分选项

4点计分制：

- **A (0分)**: 无 - 完全没有这种情况
- **B (1分)**: 稍有 - 偶尔出现，程度轻微
- **C (2分)**: 相当多 - 经常出现，程度中等
- **D (3分)**: 很多 - 频繁出现，程度严重

---

## 9. 路由配置 (Routes)

### Conners 相关路由

| 路由                                       | 组件                 | 说明         |
| :----------------------------------------- | :------------------- | :----------- |
| `/assessment/conners-psq/:studentId`       | ConnersPSQAssessment | PSQ 评估页面 |
| `/assessment/conners-psq/report/:assessId` | ConnersPSQReport     | PSQ 报告页面 |
| `/assessment/conners-trs/:studentId`       | ConnersTRSAssessment | TRS 评估页面 |
| `/assessment/conners-trs/report/:assessId` | ConnersTRSReport     | TRS 报告页面 |

---

## 10. API 参考 (API Reference)

### ConnersPSQAPI

```typescript
class ConnersPSQAPI {
  createAssessment(data: {
    student_id: number
    gender: string
    age_months: number
    raw_scores: string
    dimension_scores: string
    t_scores: string
    pi_score: number
    ni_score: number
    is_valid: number
    invalid_reason?: string
    hyperactivity_index: number
    level: string
    start_time: string
    end_time: string
  }): number

  getAssessment(id: number): ConnersPSQAssessment | null
  getStudentAssessments(studentId: number): ConnersPSQAssessment[]
}
```

### 评分函数

```typescript
// 计算完整的 Conners 评分
function calculateConnersScores(
  answers: Record<number, number | null>,
  student: { gender: string; birthday: string },
  scaleType: 'psq' | 'trs',
): Promise<ConnersScoreResult>

// 计算单个维度的分数
function calculateDimensionScores(
  answers: Record<number, number | null>,
  scaleType: 'psq' | 'trs',
): Record<string, DimensionScoreResult>

// 效度检查
function checkConnersValidity(
  answers: Record<number, number | null>,
  scaleType: 'psq' | 'trs',
): ValidityCheckResult

// T分计算
function calculateConnersTScore(
  rawScore: number,
  gender: 'male' | 'female',
  ageMonths: number,
  dimension: string,
  scaleType: 'psq' | 'trs',
// T分计算
function calculateConnersTScore(
  rawScore: number,
  gender: 'male' | 'female',
  ageMonths: number,
  dimension: string,
  scaleType: 'psq' | 'trs'
): number
```

---

## 11. 下一步计划 (Next Steps)

### 🚀 Phase 2.0 架构重构实施计划 (2026-02-05 启动)

**参考文档**:
- 技术规范: `重构实施技术规范.md` (V1.1)
- 实施计划: `docs/plans/2025-02-05-refactor-implementation-plan.md`

#### 阶段概览 (6-8 周)

| 阶段 | 名称 | 工期 | 状态 |
|:-----|:-----|:-----|:-----|
| Phase 0 | 代码审计与依赖分析 | 3 天 | 📋 待启动 |
| Phase 1 | 数据库与持久化底座 | 2 周 | 📋 待启动 |
| Phase 1.5 | 数据迁移验证 | 1 周 | 📋 待启动 |
| Phase 2 | 资源管理与文件系统 | 1.5 周 | 📋 待启动 |
| Phase 3 | 业务逻辑适配 | 1.5 周 | 📋 待启动 |
| Phase 3.5 | 性能基准测试 | 3 天 | 📋 待启动 |

#### Phase 0: 代码审计与依赖分析 (Day 1-3)
- [ ] DatabaseAPI 调用审计（搜索 `db.exec`, `db.run`, `database.query`）
- [ ] ability_tags 使用模式分析
- [ ] 数据流图绘制（评估流程、训练记录写入）
- **交付物**: `docs/audit-report.md`

#### Phase 1: 数据库与持久化底座 (Day 4-18)
- [ ] Worker 环境搭建（`db.worker.ts`, `db-bridge.ts`）
- [ ] DatabaseCommandQueue 批量操作合并
- [ ] Schema 迁移（`sys_` 开头的新表）
- [ ] Equipment -> Resource 数据迁移
- [ ] FTS5 检测与降级逻辑
- [ ] 原子写入 IPC 接口实现

#### Phase 1.5: 数据迁移验证 (Day 19-25)
- [ ] 迁移验证脚本（`migration-verification.ts`）
- [ ] Rollback 脚本（`rollback-migration.sql`）
- [ ] 双写验证（`CompatibilityAdapter`）

#### Phase 2: 资源管理与文件系统 (Day 26-36)
- [ ] `resource://` 协议注册（安全路径校验）
- [ ] Image Worker 实现（`browser-image-compression`）
- [ ] 文件 IO IPC（`SAVE_ASSET`, `DELETE_ASSET`）
- [ ] `ResourceUpload.vue` 组件

#### Phase 3: 业务逻辑适配 (Day 37-47)
- [ ] ModuleInterface 定义
- [ ] ModuleRegistry 实现
- [ ] ResourceSelector 重构
- [ ] IEPGenerator 策略模式重构
- [ ] ModuleDevTools 面板

#### Phase 3.5: 性能基准测试 (Day 48-50)
- [x] 基准测试套件（批量查询、搜索响应）
- [x] 性能对比报告
- [x] 优化迭代

---

### 原 Phase 3.5 待办事项（已归档）

以下任务因架构重构启动而延后处理：

1. **训练记录模块功能验证** - 确认重构后的功能正常运行
2. **器材训练模块功能验证** - 确认所有功能正常运行
3. **器材训练模块与游戏训练整合** - 生成综合IEP报告

> **注**: 这些功能将在 Phase 2.0 重构完成后以新架构重新实现

---

### 短期计划 (1-2周)

- [x] 器材训练模块完整实现（Phase 3.5 已完成）
- [x] 训练记录模块重构与 ability_tags 解析修复
- [x] Phase 2.0 Worker 底座搭建（Phase 1.1 已完成）
- [x] Phase 2.0 Schema 迁移（Phase 1.2 已完成）
- [ ] **Phase 2.0 DatabaseAPI 迁移到 Worker**（Phase 1.1 剩余任务）
- [ ] **Phase 2.0 原子写入 IPC 实现**（Phase 1.3）

### 待办事项（下次会话优先）

根据 `docs/plans/2025-02-05-refactor-implementation-plan.md` 和本次会话分析，下一步优先行动：

1. **[P1 - 高] 资源中心功能验证与完善**
   - 验证训练资源 Tab 的 62 个系统预置器材正确渲染
   - 验证教学资料 Tab 的 FilePreview 组件正常工作
   - 测试批量 CSV 导入功能
   - 实现新建资源功能（当前为占位符）

2. **[P2 - 中] 旧文件清理与架构优化**
   - 考虑删除已废弃的 `Resources.vue` 和 `ResourceManager.vue`
   - 清理不再使用的路由重定向（如确认无外部链接依赖）
   - 添加资源中心的使用文档

3. **[P3 - 低] 业务模块功能完善**
   - 实现情绪行为模块基础功能
   - 实现社交沟通模块基础功能
   - 实现生活自理模块基础功能

---

- [x] Phase 2.0 核心底座完成（Worker + 资源管理）
- [x] Phase 3.0 模块化基础设施完成
- [x] Phase 3.6 班级管理模块完成
- [ ] Phase 3.X 业务模块功能完善

### 长期规划 (3个月+)

- [ ] 新增情绪调节模块（CBCL, SDQ）
- [ ] 新增社交沟通模块（社交剧本, 沟通板）
- [ ] 新增认知发展模块
- [ ] 多模块综合报告生成

---

**最后更新**: 2026-02-27
**更新人**: Claude Code Assistant (首席实施工程师)
**会话摘要**: Phase 5 完成 - 项目重构与品牌升级。项目从 SIC-ADS 重构为 SCGP（星愿能力发展平台），创建干净的 Git 历史，修复数据库初始化错误，清理废弃 worktree，执行文档归档。

### 下次会话优先事项

1. **[P1 - 高] 器材训练模块多模块支持重构**
   - **问题**: `QuickEntry.vue:26` 硬编码 `module-code="sensory"`，无法支持其他模块（情绪行为、社交沟通等）
   - **方案讨论**: 需要在 URL 参数、模块选择器页面、或 Tab 集成中选择一种方案
   - **相关文件**: `QuickEntry.vue`, `SelectStudent.vue`, `ResourceSelector.vue`

2. **[P2 - 中] 数据库旧记录 module_code 更新**
   - **问题**: 旧训练记录 `module_code` 字段为 NULL
   - **解决方案**: 执行 SQL 更新
   ```sql
   UPDATE equipment_training_records SET module_code = 'sensory' WHERE module_code IS NULL;
   UPDATE training_records SET module_code = 'sensory' WHERE module_code IS NULL;
   ```

3. **[P3 - 低] 评估模块端到端验证**
   - 使用修复后的常模数据测试 Conners PSQ/TRS 评估
   - 验证 T 分计算公式：T = 50 + 10 × (Raw - Mean) / SD
   - 验证报告生成和 PDF 导出功能
