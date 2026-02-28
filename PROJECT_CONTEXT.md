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
| Phase 5.2 | 游戏训练模块重构（资源化） | ✅ **刚完成** |

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

25. **[2026-02-28] Phase 5.2 - 游戏训练模块重构（资源化）**
    - **目标**: 将"感官训练"模块升级为泛化的"游戏训练"模块，支持跨模块（感官、情绪、社交等）
    - **路由重构**:
      - `/games` → 重定向到 `/games/menu`
      - `/games/menu` → `GameModuleMenu.vue` (模块选择)
      - `/games/select-student` → `SelectStudent.vue` (选择学生)
      - `/games/lobby/:studentId` → `GameLobby.vue` (游戏大厅) ← **新增**
      - `/games/play` → `GamePlay.vue` (游戏播放器)
    - **游戏数据资源化**:
      - 迁移 7 个游戏到 `sys_training_resource` 表（`resource_type='game'`）
      - 元数据包含：taskId, mode, difficulty, duration, emoji, color
      - 迁移脚本：`src/database/migration/migrate-games-to-resources.ts`
    - **ResourceSelector 组件扩展**:
      - 支持 Emoji 渲染（游戏资源）
      - 支持 WebP 图片（器材资源）
      - 自动检测资源类型并渲染对应样式
    - **GamePlay.vue 改造**:
      - 从 `resourceId` 参数加载游戏配置
      - 解析 `metadata` 获取 taskId 和 mode
      - 动态挂载对应游戏引擎（GameGrid/GameAudio/VisualTracker）
      - 训练记录保存时包含 `module_code`
    - **新文件**:
      - `src/views/games/GameModuleMenu.vue` - 模块选择页
      - `src/views/games/GameLobby.vue` - 游戏大厅
      - `src/components/games/GamePreviewCard.vue` - 游戏预览卡片
      - `src/database/migration/migrate-games-to-resources.ts` - 迁移脚本
    - **归档文件**:
      - `src/views/games/GamesMenu.vue` → `src/views/_archived/games/`
    - **Bug修复**:
      - 修复 `metadata` 属性名不一致导致游戏无法启动的问题

24. **[2026-02-27] Phase 5.1 - Bug修复与功能优化**
    - **WeeFIM评估提交失败修复**: 修复字段名不匹配问题（`motor_score` → `adl_score`）
    - **SM/WeeFIM量表报告404修复**: 分别处理query参数和路径参数的路由格式
    - **节奏模仿游戏全面优化**:
      - 看-做模式：系统演示→用户模仿
      - 3种难度级别（简单/中等/困难）
      - 实时准确度评估（基于时间间隔偏差）
      - 视觉节拍条和鼓面交互优化
    - **IEP报告数据修正**: 显示真实准确率和平均节奏误差（而非100%/0ms）
    - **WeeFIM量表UI优化**: 选项整齐排列，标签固定宽度，视觉层次更清晰

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

> **注意**: 条目 14-22 已归档到 [CHANGELOG.md](docs/CHANGELOG.md)

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

**最后更新**: 2026-02-28
**更新人**: Claude Code Assistant (首席实施工程师)
**会话摘要**: Phase 5.2 完成 - 游戏训练模块重构（资源化）。将"感官训练"升级为泛化的"游戏训练"模块，支持跨模块。创建 GameModuleMenu/GameLobby/GamePreviewCard 组件，游戏数据迁移到 sys_training_resource 表，ResourceSelector 支持 Emoji 渲染，GamePlay.vue 改造为通用游戏播放器壳。修复首次启动报错（report_record 表迁移）和 metadata 属性名不一致 Bug。

### 下次会话优先事项

根据本次会话进度和 `docs/plans/2025-02-05-refactor-implementation-plan.md`，下一步优先行动：

1. **[P1 - 高] 游戏训练模块端到端验证**
   - **验证**: 启动应用验证游戏大厅 Emoji 显示正常
   - **验证**: 测试游戏选择和启动流程完整可用
   - **验证**: 确认训练记录正确保存 module_code
   - **相关文件**: `src/views/games/GameLobby.vue`, `src/views/games/GamePlay.vue`, `src/components/games/GamePreviewCard.vue`

2. **[P2 - 中] 游戏资源迁移验证**
   - **检查**: 确认 7 个游戏正确迁移到 sys_training_resource 表
   - **验证**: metadata 字段中的 taskId、mode、emoji、color 正确存储
   - **测试**: 删除数据库后首次启动能自动迁移
   - **相关文件**: `src/database/migration/migrate-games-to-resources.ts`

3. **[P3 - 低] 游戏训练模块功能完善**
   - **扩展**: 为其他模块（情绪、社交）添加游戏资源
   - **优化**: GamePreviewCard 添加更多游戏信息（历史成绩、最佳记录）
   - **优化**: 游戏难度配置 UI（当前使用默认值）
   - **相关文件**: `src/views/games/GameLobby.vue`, `src/components/games/GamePreviewCard.vue`
