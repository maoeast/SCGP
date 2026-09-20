# CHANGELOG.md

项目功能变更历史记录

---

## [2026-09-20] 首页看板上半部分重构：上下分层 Hero Banner + 卡片组 + 每日语录
- `src/views/Dashboard.vue` 上半部分放弃左右分栏，改为上下分层：全宽 Hero Banner（白底 surface）+ 下方 5 张数据卡片平铺在页面底色上
- Banner 左：`您好，{登录用户姓名}！`主标题 + 每日暖心语录副标题；右：核心待办提示 + 主行动按钮，两者紧凑横排并保持原有的 `focusPanel` 优先级平滑滚动
- 新增 `src/data/quotes.json`（60 条特教语录）：`currentQuote` 在 `onMounted` 随机抽取一条，每次进入首页刷新
- 欢迎语称呼取 `authStore.user.name`，缺失时按角色兜底（teacher→老师，其余→系统管理员）
- 卡片组仍是真实聚合数据（`DashboardAPI.getSnapshot().overview`），仅栅格改为 `repeat(auto-fit, minmax(200px, 1fr))`
- `.dashboard-hero` 类名保留（用户手册截图脚本 `scripts/manual/capture-user-manual-screenshots.mjs` 按它等待首屏渲染）
- 修复：主行动按钮的 4 个滚动锚点原写成静态点路径 ref（`ref="panelRefs.x.value"`），Vue 运行时只把它登记为 `$refs` 的键、不会写回 `panelRefs`，点击是静默空操作；已改为动态绑定 `:ref="panelRefs.x"`（实测绑定成功）

## [2026-09-11] 资源中心-教学资料列表分页（12 个/页）
- `src/views/resource-center/TeachingMaterials.vue` 教学资料卡片列表从全量渲染改为前端切片分页：每页固定 12 个（用户约定），不再一次渲染全部视频/图片/文档卡片
- 分页栏与训练资源标签同款（`el-pagination`：总数/上下页/页码/跳页）；切维度、切资料类型、搜索、切收藏视图时自动回到第 1 页
- 删除资料或筛选收紧导致当前页越界时自动钳回最后一页，不会停在空页

## [2026-02-27] 最新归档条目（从 PROJECT_CONTEXT.md 迁移）

## [2026-03-27] training-entry hard-cut 收口与 clean DB 验证
- `src/views/equipment/Records.vue` 已改为 entry-aware：
  - 支持 `entry / module / recordId` 路由状态
  - 支持入口切换
  - 支持从训练记录模块按具体记录跳转并高亮定位
- `src/views/training-records/ModuleTrainingRecords.vue`、`GameRecordsPanel.vue`、`EquipmentRecordsPanel.vue` 已继续收口 entry-based 记录详情流
- clean local dev DB 已重建，并在重建库上验证：
  - 游戏记录可写入 `entry_code`
  - 器材记录可写入 `entry_code`
- `src/database/init.ts` 已修正 `equipment_training_records.equipment_id` 的当前 schema/init 口径：
  - 从旧 `equipment_catalog(id)` 回到当前资源主线 `sys_training_resource(id)`
- `src/database/sql-wrapper.ts` 已修复保存状态机问题：
  - 避免保存成功后因错误 dirty 状态再次自触发保存
  - 降低 `database.sqlite.tmp -> database.sqlite` 原子写入竞态导致的 `ENOENT` 风险

## [2026-03-26] physical-equipment CSV 导入方案落地
- 新增 `src/database/physical-equipment-parser.ts` 与 `src/database/physical-equipment-data.ts`
- 当前四份 physical-equipment CSV 草稿已可规范化为 `168` 条系统资源：
  - `45 emotional-regulation`
  - `50 social-communication`
  - `35 fine-motor`
  - `38 soothing-aids`
- `src/database/init.ts` 已支持在数据库启动时补齐缺失的 physical-equipment 系统资源
- 新增 `scripts/import-physical-equipment-resources.cjs` 与 `npm run import:physical-equipment`
- `ResourceSelector`、`TrainingResources`、`PlanList` 已支持按 physical-equipment metadata / `resourceCode` 解析新规则封面图
- 已明确“原始授权 code 层”和“展示大类层”拆分：
  - 许可证原始 `am` 载荷继续承载兼容 code，前端访问控制以解析后的能力包为准
  - 器材训练 / 资源中心新增大类推导：`感官训练 / 情绪调节 / 社交沟通 / 生活自理 / 精细动作 / 安抚教具`

## [2026-03-26] emotional 默认完整 seed 与物理器材目录规范
- emotional 默认资源初始化已从 8 条 demo 切换为完整 `80 emotion_scene + 60 care_scene`
- `src/database/init.ts` 已支持在无训练记录时自动清理旧 `emotional_demo_seed` 并替换为完整 seed
- 新增 `scripts/reset-sensory-equipment-resources.cjs` 与 `npm run reset:sensory-equipment`
- 新增 `docs/references/physical-equipment/` 与 `src/assets/images/physical-equipment/`
- 新物理器材图片与导入建议改用稳定 `resourceCode`，不再推荐继续绑定 `legacy_id`

### [2026-02-24] Phase 4.2 收官 - ConnersPSQDriver + ConnersTRSDriver 实现
- **目标**: 完成评估驱动器架构的最后两块拼图，实现 Conners 1978 版驱动器
- **ConnersPSQDriver 实现** (`src/strategies/assessment/ConnersPSQDriver.ts` ~350行):
  - Conners 父母用问卷驱动器（48题）
  - 6 个维度：品行问题、学习问题、心身障碍、冲动-多动、焦虑、多动指数
  - 4 点评分（0-3分）
  - T 分计算：使用 `conners-norms.ts` 性别×年龄常模
  - 等级判定：基于多动指数 T 分（<60 正常, 60-69 临界, ≥70 临床显著）
- **ConnersTRSDriver 实现** (`src/strategies/assessment/ConnersTRSDriver.ts` ~320行):
  - Conners 教师用问卷驱动器（28题）
  - 4 个维度：品行问题、多动、不注意-被动、多动指数
  - 4 点评分（0-3分）
  - T 分计算：使用 `conners-norms.ts` 性别×年龄常模
  - 学校指导建议生成
- **策略工厂注册**: 注册 'conners-psq' 和 'conners-trs' 驱动器
- **文件修改**:
  - `src/strategies/assessment/ConnersPSQDriver.ts` - 新增（~350行）
  - `src/strategies/assessment/ConnersTRSDriver.ts` - 新增（~320行）
  - 旧评估页面添加 @deprecated 注释

### [2026-02-24] Phase 4.1 BaseDriver + WeeFIMDriver + CSIRSDriver 实现
- **目标**: 完善评估驱动器架构，实现更多量表驱动器
- **BaseDriver 抽象基类** (`src/strategies/assessment/BaseDriver.ts` ~280行):
  - 抽象属性和方法定义
  - 通用实现：getNextQuestion（线性导航）、calculateProgress、getScaleInfo
  - 工具方法：serializeAnswers, calculateTiming, analyzeDimensionScores
- **WeeFIMDriver 实现** (`src/strategies/assessment/WeeFIMDriver.ts` ~380行):
  - WeeFIM 功能独立性量表驱动器（18题，7级评分）
  - 2 个维度：运动功能（13题）、认知功能（5题）
  - 等级映射：完全独立(126) 到 完全依赖(18-35)
- **CSIRSDriver 实现** (`src/strategies/assessment/CSIRSDriver.ts` ~560行):
  - CSIRS 感觉统合量表驱动器（58题，根据年龄动态调整）
  - 5 个维度，5 级评分（1-5分），反向计分
  - T 分转换：使用 csirs-conversion.ts 查表
- **文件修改**:
  - `src/strategies/assessment/BaseDriver.ts` - 新增（~280行）
  - `src/strategies/assessment/WeeFIMDriver.ts` - 新增（~380行）
  - `src/strategies/assessment/CSIRSDriver.ts` - 新增（~560行）

### [2026-02-24] Phase 4 评估基础设施重构 - ScaleDriver 策略模式
- **目标**: 使用"UI Container Reuse + Strategy Driver"架构重构评估模块
- **ScaleDriver 接口设计** (`src/types/assessment.ts` ~300行):
  - 定义评估驱动器通用接口
  - 核心方法：getQuestions, getStartIndex, getNextQuestion, calculateScore, generateFeedback
- **SMDriver 实现** (`src/strategies/assessment/SMDriver.ts` ~700行):
  - S-M 社会生活能力量表驱动器（132题，7个年龄阶段）
  - Basal/Ceiling 规则：连续10项通过/不通过
  - 粗分计算：基础分 + 通过数
- **AssessmentContainer 组件** (`src/views/assessment/AssessmentContainer.vue` ~630行):
  - 统一评估容器，支持多量表驱动
  - 三个阶段：welcome → assessing → complete
  - 子组件：WelcomeDialog, QuestionCard, CompleteDialog
  - 进度持久化（localStorage）
- **策略工厂** (`src/strategies/assessment/index.ts`):
  - `getDriverByScaleCode(scaleCode)`: 同步获取驱动器实例
  - 驱动器缓存机制
- **文件修改**:
  - `src/types/assessment.ts` - 新增（~300行）
  - `src/strategies/assessment/SMDriver.ts` - 新增（~700行）
  - `src/strategies/assessment/index.ts` - 新增（~107行）
  - `src/views/assessment/AssessmentContainer.vue` - 新增（~630行）

### [2026-02-22] Phase 3.11 资源中心统一入口 - ResourceCenter.vue
- **目标**: 将"资源管理"和"资料库"深度融合，构建统一的资源中心入口
- **架构设计**: 统一入口 + 双视图（Tab切换）
  - Tab 1: 训练资源 → 面向 `sys_training_resource` 表
  - Tab 2: 教学资料 → 面向 `resource_meta` 表
- **权限自适应**: admin完整CRUD，teacher只读模式
- **路由变更**: `/resources` 和 `/admin/resources` 重定向到 `/resource-center`
- **文件修改**:
  - `src/views/admin/ResourceCenter.vue` - 新增（~180行）
  - `src/views/resource-center/TrainingResources.vue` - 新增（~850行）
  - `src/views/resource-center/TeachingMaterials.vue` - 新增（~780行）

### [2026-02-22] Phase 3.10 资源管理模块 - ResourceManager.vue
- **目标**: 实现系统资源的顶级管理功能，支持多模块、多资源类型的统一管理
- **路由配置**: `/admin/resources`，仅管理员可访问
- **左侧筛选面板**: 业务模块、资源类型、状态筛选、搜索框（300ms防抖）
- **资源列表表格**: 缩略图、名称、分类、来源标签、状态开关、操作列
- **权限控制**: 系统资源只读，自定义资源可编辑
- **ResourceAPI 扩展**: `getAllResourcesForAdmin()` 查询所有资源（包括禁用的）
- **文件修改**:
  - `src/views/admin/ResourceManager.vue` - 新增（~800行）
  - `src/database/resource-api.ts` - 添加 getAllResourcesForAdmin 方法

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
- **技术栈**: electron-updater + generic provider
- **主进程 IPC 处理器** (`electron/handlers/update.js`):
  - 延迟加载 electron-updater（避免启动失败）
  - 默认配置：自有更新源 `generic provider`
  - 用户配置存储：`%APPDATA%\sic-ads\update-config.json`
  - IPC 处理器：check-for-updates, download-update, quit-and-install, get-current-version
- **前端更新服务** (`src/services/UpdateService.ts`):
  - 响应式状态管理（使用 Vue reactivity）
  - 检查更新、下载更新、安装更新、跳过版本
