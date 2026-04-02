# 2026-04-02 页面风格统一改造 TODO

> 职责：整理当前页面样式统一现状、改造范围、优先级和验收标准。
> 何时阅读：准备统一后台业务页视觉风格时；进入具体页面改造前。
> 不负责：替代当前代码确认真实实现，或把目标态描述成已落地事实。

## 1. 当前现实

当前代码已经存在一套共享页面样式基础，但还没有完成全站统一。

当前已存在的共享基础主要包括：

- 全局样式入口：
  - `src/main.ts`
  - `src/assets/main.css`
  - `src/assets/base.css`
  - `src/assets/layout.css`
- 当前已经存在的共享样式语义：
  - `page-container`
  - `page-header`
  - `filter-section`
  - `main-content`
  - `workspace-page`
  - `workspace-split`
  - `workspace-pane`
  - `scgp-admin-page`
  - `scgp-surface`
  - `scgp-page-panel`
  - `scgp-summary-card`
- 当前已存在的控件层统一起点：
  - `src/utils/date-picker.ts`

需要明确的现实：

- 当前不是“没有统一样式基础”
- 也不是“所有业务页已经统一”
- 更准确的表述是：
  - 已有共享视觉语言和布局骨架
  - 但仍有不少页面只是接了基础容器，或仍主要依赖页面内局部 `scoped` 样式

## 2. 改造目标

本轮目标不是做一套全新的设计系统，而是把当前后台业务页逐步收口到同一套可复用的视觉语言和布局规则。

本轮目标包括：

- 统一业务页外壳
- 统一页头
- 统一筛选区
- 统一统计卡片
- 统一主内容面板
- 统一资源工作台双栏布局
- 统一常用日期控件默认行为

本轮不追求：

- 一次性重做所有页面
- 重做沉浸式训练页或小游戏页
- 把所有特殊交互页强行套成后台管理页
- 引入全新 UI 框架或大规模设计重构

## 3. 非本轮范围

以下页面不应在第一轮被硬套后台业务页壳层：

- 登录 / 激活 / 404：
  - `src/views/Login.vue`
  - `src/views/Activation.vue`
  - `src/views/NotFound.vue`
- 训练进行中或沉浸式训练页：
  - `src/views/games/GamePlay.vue`
  - `src/views/emotional/games/*`
- 评估进行中页：
  - `src/views/assessment/AssessmentContainer.vue`
- 各量表报告页：
  - `src/views/assessment/*/Report.vue`

这些页面后续可以做“风格协调”，但不应作为后台业务页统一改造的第一波目标。

## 4. 当前页面盘点

### 4.1 已明显接入统一视觉语言

这些页面已经使用 `scgp-admin-page` 或相近的共享视觉语义，可以作为后续页面的参考样板：

- `src/views/Dashboard.vue`
- `src/views/Students.vue`
- `src/views/StudentDetail.vue`
- `src/views/Reports.vue`
- `src/views/plan/PlanList.vue`
- `src/views/admin/ClassManagement.vue`
- `src/views/admin/StudentClassAssignment.vue`
- `src/views/emotional/GameRecordDetail.vue`

### 4.2 已统一布局骨架，但视觉仍未完全收口

- `src/views/games/GameLobby.vue`
- `src/views/equipment/QuickEntry.vue`
- `src/views/admin/ResourceCenter.vue`
- `src/views/resource-center/TrainingResources.vue`
- `src/views/resource-center/TeachingMaterials.vue`
- `src/views/training-records/TrainingRecordsMenu.vue`
- `src/views/training-records/ModuleTrainingRecords.vue`
- `src/views/equipment/Records.vue`
- `src/views/assessment/AssessmentSelect.vue`
- `src/views/games/GameModuleMenu.vue`
- `src/views/equipment/EquipmentMenu.vue`
- `src/views/games/SelectStudent.vue`
- `src/views/equipment/SelectStudent.vue`
- `src/views/emotional/Menu.vue`
- `src/views/emotional/SceneSelector.vue`
- `src/views/emotional/EmotionSceneTraining.vue`
- `src/views/emotional/CareExpressionTraining.vue`
- `src/views/emotional/SessionSummary.vue`
- `src/views/emotional/Report.vue`
- `src/views/System.vue`
- `src/views/system/UserManagement.vue`
- `src/views/system/SystemSettings.vue`

### 4.3 当前仍以页面局部样式为主

以下页面或子页面仍明显保留各自的局部实现方式，后续如果继续扩展，应优先向共享样式靠拢：

- `src/views/resource-center/*`
- `src/views/system/*`
- `src/views/training-records/components/*`
- 各选择器页面中的卡片、筛选条和列表容器

## 5. 改造优先级

### P0 共享样式补齐

先完善 `src/assets/layout.css` 的共享类，避免每页改造时继续复制局部样式。

需要补齐或确认的共享能力：

- 业务页标准外壳
- 统一页头
- 统一筛选区
- 统一主内容面板
- 统一统计卡片
- 统一 tabs 容器
- 统一表格/列表面板
- 统一空状态区
- 统一双栏工作台容器

完成标准：

- 页面主要结构类可以稳定复用
- 新页面不需要再手写一套背景、圆角、阴影、边框规则

### P1 训练记录链路

优先统一高频使用、且与 `training_session` 读链迁移相邻的页面：

- `src/views/training-records/TrainingRecordsMenu.vue`
- `src/views/training-records/ModuleTrainingRecords.vue`
- `src/views/training-records/components/GameRecordsPanel.vue`
- `src/views/training-records/components/EquipmentRecordsPanel.vue`
- `src/views/equipment/Records.vue`

目标：

- 菜单页、记录页、记录面板使用同一套页头 / 筛选 / 卡片 / 面板语义
- 不再呈现为三套风格割裂的页面

### P2 资源中心链路

- `src/views/admin/ResourceCenter.vue`
- `src/views/resource-center/TrainingResources.vue`
- `src/views/resource-center/TeachingMaterials.vue`

目标：

- 统一资源中心的外壳、tab 区、面板层级和工具栏风格
- 保持“轻量页头 + tabs + 内容区”，不要重新加 hero 区

### P3 训练入口链路

- `src/views/games/GameModuleMenu.vue`
- `src/views/equipment/EquipmentMenu.vue`
- `src/views/emotional/Menu.vue`
- `src/views/games/SelectStudent.vue`
- `src/views/equipment/SelectStudent.vue`
- `src/views/emotional/SceneSelector.vue`

目标：

- 训练入口、选学生、选场景形成一致的入口页体验
- 卡片、筛选条、状态标签和主操作按钮保持统一语言

### P4 系统管理链路

- `src/views/System.vue`
- `src/views/system/UserManagement.vue`
- `src/views/system/SystemSettings.vue`

目标：

- 把明显残留的旧后台风格收回到当前 SCGP 统一业务页语言

### P5 评估入口链路

- `src/views/assessment/AssessmentSelect.vue`
- `src/views/assessment/SelectStudent.vue`

目标：

- 让评估入口与训练入口在平台视觉上对齐
- 但不要影响评估进行中页的专用交互结构

## 6. 实施约束

- 只把“后台业务页”统一到共享壳层
- 不要把沉浸式训练页和报告页强行改成后台管理页
- 优先复用已有共享类，不优先新增大批页面专属类
- 新增共享类时，命名要明确表达语义，而不是绑定单个页面
- 页面已经使用共享学生展示组件的，不要回退到旧头像、旧标签、旧学号展示方式
- 日期控件优先复用 `src/utils/date-picker.ts`
- 资源工作台页继续沿用：
  - `workspace-page`
  - `workspace-split`
  - `workspace-pane`
  - `workspace-pane-card`

## 7. 页面改造时的检查清单

每改造一个页面，至少检查：

- 顶层是否使用统一页面容器
- 页头是否使用统一标题、副标题、右侧操作区结构
- 筛选区是否使用统一卡片语义
- 主内容区是否落到统一面板语义
- 统计区是否复用统一 summary card 语言
- 表格 / 列表 / 空状态是否与已有统一页面一致
- 是否误把沉浸式内容套成后台管理页
- 是否把大量颜色、阴影、圆角重新写回页面局部样式

## 8. 推荐执行顺序

1. 先做 `P0`，补齐共享样式基础
2. 再做 `P1`，统一训练记录链路
3. 然后做 `P2`，统一资源中心链路
4. 再做 `P3`，统一训练入口链路
5. 最后做 `P4` 和 `P5`

## 9. 完成标准

当以下条件同时成立时，才算这一轮页面统一改造真正完成：

- 主要后台业务页都能落到同一套外壳类名体系
- 页头、筛选区、主内容面板、统计卡片具备稳定一致的视觉层级
- 常见业务页不再各自定义不同的背景、圆角、阴影和边框语言
- 工作台型页面继续保持统一双栏滚动模式
- 特殊流程页、训练进行中页、小游戏页、报告页没有被误套统一后台壳层

## 10. 备注

本文件是当前页面风格统一改造的执行 TODO，不代表这些改造已经完成。

进入具体开发前，仍应回到对应页面代码确认：

- 当前页面是否已经在其他会话中被改过
- 当前页面是否已有共享组件可直接复用
- 当前页面是否存在与本 TODO 不一致但更符合代码现实的新约束
