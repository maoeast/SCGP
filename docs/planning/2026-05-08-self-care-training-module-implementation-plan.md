# 自理训练任务模块详细实现计划（A2）
> 文档类型：现行实施计划
> 前置输入：`docs/planning/2026-05-08-self-care-training-module-a1-migration-design.md`
> 适用范围：`SCGP / 星愿能力发展训练系统`
> 状态：当前有效
> 创建日期：2026-05-08

## 1. 计划目标

基于 `A1` 迁移设计，将旧 `Self-Care ATS` 的“任务库 + 步骤执行 + 结果记录”能力接入 SCGP 现有平台主链，完成以下闭环：

- 新增 `自理训练` 顶层入口，但授权继续挂接 `life_skills`
- 任务本体统一落到 `sys_training_resource`
- 训练计划统一落到 `sys_training_plan + sys_plan_resource_map`
- 训练记录统一落到 `training_records + training_session`
- 从任务库、训练计划、首页推荐都能启动同一条自理训练执行链

本计划只负责“详细实施拆解”，不重复 `A1` 的需求论证。

## 2. 当前代码事实

截至 2026-05-08，和本次实施直接相关的真实代码状态如下：

### 2.1 导航与授权

- 左侧菜单和顶层入口仍是静态路由驱动，主文件为 `src/router/index.ts` 与 `src/views/Layout.vue`
- 模块授权判断走 `src/stores/auth.ts` 的 `hasModuleAccess()`
- `life_skills` 已是现行业务模块代码，可直接用于新入口授权

### 2.2 资源主链

- 统一资源主表已经是 `sys_training_resource`
- `src/database/resource-api.ts` 对 `resource_type` 没有硬编码限制，新增 `task_training` 不需要改表结构
- 但资源中心和训练资源业务分组目前只显式识别 `equipment / game / flashcard / emotion_scene / care_scene`
- 也就是说，`task_training` 虽然可以写入数据库，但当前不会自动进入资源中心展示与训练资源筛选主链

### 2.3 训练计划主链

- 训练计划已经统一使用 `sys_training_plan + sys_plan_resource_map`
- `src/views/plan/PlanList.vue` 当前可以从资源中选取训练内容，但存在两个限制：
  - 资源类型筛选与显示标签还不认识 `task_training`
  - “全部模块”查询时只遍历 `sensory / emotional / social`，没有把 `life_skills` 纳入

### 2.4 训练启动主链

- `src/utils/training-launch.ts` 是训练计划、首页等入口复用的统一启动器
- 当前只识别 `equipment / game / flashcard / emotion_scene / care_scene`
- 还没有 `task_training -> /self-care/*` 的启动映射

### 2.5 训练记录主链

- `training_session` 已经落地，统一写入器为 `src/database/training-session-writer.ts`
- `GameTrainingAPI.saveTrainingRecord()` 当前会写 `training_records`，并同步写 `training_session`
- 但该写链默认把 `sessionFamily` 固定成 `game`，不适合直接承载自理任务训练
- `GameRecordsPanel` 当前会读取 `training_records` 中的记录，只要 `entry_code = life-skills` 就能在生活自理入口下看到记录
- 但记录详情跳转仍按“情绪记录 / 普通游戏记录”二分，自理任务记录如果直接复用现状，会被误导到 `/games/report`

### 2.6 首页推荐与今日计划

- `src/database/dashboard-api.ts` 当前对“可启动训练资源”的白名单仍是：
  - `equipment`
  - `game`
  - `flashcard`
  - `emotion_scene`
  - `care_scene`
- 如果不补 `task_training`，即使计划已关联自理任务，首页推荐与今日计划也不会把它当成可启动训练资源

### 2.7 旧任务表现状

- 仓库里仍保留旧 `task / task_step / task_category / train_plan / train_log` 表
- 当前感官游戏链路仍有部分代码通过 `task_id` 兼容旧结构
- 本次实施不能把这些旧表重新拉回平台主链，否则会和 `A1` 的资源化方案冲突

## 3. 固定实现约束

以下约束在本计划中视为已锁定，不再反复讨论：

- `自理训练` 是新顶层入口，不新增新的模块代码
- 顶层入口授权固定挂 `life_skills`
- 自理任务资源统一使用：
  - `module_code = life_skills`
  - `resource_type = task_training`
  - `entry_code = life-skills`
- 自理训练执行结果统一写入：
  - `training_records`
  - `training_session`
- 新记录不复用旧 `task.id` 作为主键来源：
  - `training_records.task_id = NULL`
  - 任务真实主键使用 `sys_training_resource.id`
- `training_session.session_family` 应新增使用 `task_training`
- 不迁入旧 `train_plan / train_log` 历史数据
- 不在本期收口现有 `life_skills` 小游戏首页与器材训练首页

## 4. 范围定义

### 4.1 本期纳入

- 自理训练顶层入口与路由壳
- 自理任务资源的增删改查
- 步骤型任务编辑器
- 选择学生并开始训练
- 训练过程逐步执行与结果采集
- 写入 `training_records + training_session`
- 接入训练计划选择、计划启动、首页启动
- 接入训练记录总入口与学生详情入口

### 4.2 本期不纳入

- 旧 ATS 全量任务数据导入
- 旧 `train_plan / train_log` 历史迁移
- 旧 `task_step` 明细表平台化复活
- `life_skills` 小游戏与器材训练首页收口
- 平台级动态路由改造

## 5. 文件落点建议

本次实施建议按“功能边界”而不是“技术层级”拆文件，减少后续耦合。

| 文件 / 目录 | 职责 |
| --- | --- |
| `src/features/self-care/task-training-contract.ts` | 统一定义自理任务资源元数据、步骤结构、执行结果结构、校验与归一化逻辑 |
| `src/database/self-care-task-api.ts` | 面向 `sys_training_resource` 的自理任务 CRUD，屏蔽 `meta_data` 解析细节 |
| `src/database/self-care-training-api.ts` | 面向训练执行的持久化 API，事务性写入 `training_records + training_session` |
| `src/views/self-care/TaskList.vue` | 自理任务列表页 |
| `src/views/self-care/TaskEditor.vue` | 新建 / 编辑任务页 |
| `src/views/self-care/SelectStudent.vue` | 选择学生后启动任务训练 |
| `src/views/self-care/TaskExecution.vue` | 步骤型训练执行页 |
| `src/views/self-care/RecordDetail.vue` | 自理训练记录详情页 |
| `src/views/self-care/components/*` | 任务卡片、步骤编辑器、媒体预览、执行结果面板等细粒度组件 |
| `src/router/index.ts` | 新增 `/self-care/*` 路由与详情页路由 |
| `src/views/Layout.vue` | 把 `自理训练` 加入静态菜单顺序 |
| `src/utils/training-launch.ts` | 新增 `task_training` 的统一启动映射 |
| `src/utils/resource-center-business.ts` | 让 `task_training` 成为资源中心可见训练资源，并归到 `life-skills` 业务组 |
| `src/views/resource-center/TrainingResources.vue` | 资源类型标签、创建入口、显示图标、筛选逻辑支持 `task_training` |
| `src/views/plan/PlanList.vue` | 训练计划资源选择、类型标签、启动动作支持 `task_training` |
| `src/database/dashboard-api.ts` | 首页今日计划 / 推荐资源白名单加入 `task_training` |
| `src/views/training-records/ModuleTrainingRecords.vue` | 自理任务记录详情跳转分支 |
| `src/views/training-records/components/GameRecordsPanel.vue` | 自理任务记录标题、状态、详情按钮兼容 |
| `src/views/StudentDetail.vue` | 学生详情页的自理任务记录详情跳转兼容 |

## 6. 数据结构定稿

### 6.1 任务资源元数据

建议在 `sys_training_resource.meta_data` 中固定以下结构：

```json
{
  "trainingMode": "step_task",
  "trainingEntryCode": "life-skills",
  "legacyTaskCode": "EAT_SPOON_001",
  "category": {
    "parentId": 1,
    "parentName": "进食技能",
    "childId": 11,
    "childName": "使用勺子"
  },
  "abilityItem": {
    "id": "feed_01",
    "name": "独立进食"
  },
  "steps": [
    {
      "id": "step-1",
      "seq": 1,
      "text": "拿起勺子",
      "imagePath": "resource://images/self-care/spoon-step-1.png",
      "videoPath": null,
      "audioPath": null
    }
  ]
}
```

实现要求：

- `steps[]` 是一期唯一事实源，不新增独立 `task_step` 表
- 媒体路径统一走现有 `resource://` 口径
- 资源中心、自理任务编辑器、训练执行页都共用同一份 contract

### 6.2 训练记录写入

`training_records` 写入约定：

```json
{
  "student_id": 12,
  "task_id": null,
  "resource_id": 203,
  "resource_type": "task_training",
  "session_type": "task_training",
  "entry_code": "life-skills",
  "module_code": "life_skills",
  "raw_data": {
    "trainingMode": "step_task",
    "stepCount": 4,
    "completedStepCount": 4,
    "errorType": 0,
    "teacherNotes": "第 2 步需要口头提示",
    "stepResults": [
      { "seq": 1, "completionLevel": "independent" },
      { "seq": 2, "completionLevel": "prompt" }
    ]
  }
}
```

`training_session` 写入约定：

- `session_family = task_training`
- `resource_id = 当前自理任务资源 id`
- `resource_type = task_training`
- `task_id = NULL`
- `task_name_snapshot = 任务资源名称`
- `summary_payload` 保存步骤统计、错误类型、备注摘要

### 6.3 路由参数约定

为避免把旧 `task.id` 带回主链，建议采用以下规则：

- 页面 URL 可以继续使用“任务”命名，保持语义可读
- 但 `/self-care/tasks/:taskId/*` 中的 `taskId` 实际承载 `sys_training_resource.id`
- 所有 API 层与类型层使用 `resourceId` 作为真实字段名

## 7. 分阶段实施计划

### 阶段 1：底座与类型收口

#### 7.1 目标

让 `task_training` 在平台共用底座里成为“可见、可选、可启动”的合法训练资源类型。

#### 7.2 主要工作

- 在 `src/features/self-care/task-training-contract.ts` 中定稿：
  - 任务元数据结构
  - 步骤结构
  - 执行结果结构
  - 归一化与校验函数
- 在 `src/router/index.ts` 中新增：
  - `/self-care`
  - `/self-care/tasks`
  - `/self-care/tasks/new`
  - `/self-care/tasks/:taskId/edit`
  - `/self-care/tasks/:taskId/select-student`
  - `/self-care/execute/:taskId/:studentId`
  - `/self-care/records/:sessionId`
- 顶层路由 `meta.moduleCode` 固定为 `life_skills`
- 在 `src/views/Layout.vue` 的静态菜单顺序中加入 `SelfCareTraining`
- 在以下共用文件中加入 `task_training` 识别：
  - `src/utils/resource-center-business.ts`
  - `src/views/resource-center/TrainingResources.vue`
  - `src/views/plan/PlanList.vue`
  - `src/utils/training-launch.ts`
  - `src/database/dashboard-api.ts`

#### 7.3 完成标准

- 已授权 `life_skills` 时，左侧菜单出现 `自理训练`
- 未授权 `life_skills` 时，入口不可见且路由不可进入
- `task_training` 不再是“数据库可写但界面不可见”的孤立资源类型

### 阶段 2：任务资源 CRUD

#### 7.1 目标

让教师可以在 SCGP 内部维护自理任务，不依赖旧 ATS 后台。

#### 7.2 主要工作

- 新建 `src/database/self-care-task-api.ts`
- 用 `sys_training_resource` 承载任务新增、查询、更新、软删除
- 资源筛选口径固定为：
  - `module_code = life_skills`
  - `resource_type = task_training`
- 新建 `src/views/self-care/TaskList.vue`
- 新建 `src/views/self-care/TaskEditor.vue`
- 将任务编辑拆成可复用组件：
  - `TaskBasicForm.vue`
  - `TaskStepEditor.vue`
  - `TaskStepMediaPicker.vue`
- 接入现有资源文件路径规范：
  - 封面图复用 `cover_image`
  - 步骤媒体写入 `meta_data.steps[]`

#### 7.3 关键实现要求

- 不能把旧 `task / task_step` 表重新作为保存目标
- 编辑器保存前必须做本地校验：
  - 至少 1 个步骤
  - `seq` 连续
  - 每步至少有文本
  - 媒体路径统一归一化
- 列表页必须支持：
  - 关键字搜索
  - 分类筛选
  - 查看详情
  - 编辑
  - 选择学生开始训练

#### 7.4 完成标准

- 可新建一条 `task_training` 资源
- 可再次进入编辑页完整回显
- 删除后走现有资源软删除口径，不破坏历史记录引用

### 阶段 3：训练执行链路

#### 7.1 目标

让自理任务真正从“静态资源”变成可执行训练。

#### 7.2 主要工作

- 新建 `src/views/self-care/SelectStudent.vue`
- 新建 `src/views/self-care/TaskExecution.vue`
- 执行页按 `steps[]` 顺序展示：
  - 文本
  - 图片
  - 视频
  - 音频
- 教师对每一步记录：
  - 完成等级
  - 错误类型
  - 备注
- 提供执行态控制：
  - 上一步
  - 下一步
  - 中断
  - 完成

#### 7.3 关键实现要求

- 页面状态机要区分：
  - `idle`
  - `in_progress`
  - `interrupted`
  - `completed`
- 执行页真实读取的是 `sys_training_resource + meta_data.steps[]`
- 不能再去查询旧 `task_step`
- 页面退出时要区分：
  - 教师主动结束
  - 中途取消
  - 正常完成

#### 7.4 完成标准

- 从 `/self-care/tasks` 可以走通“选学生 -> 开始训练 -> 完成训练”
- 步骤执行结果在前端状态中完整可见

### 阶段 4：训练记录事务写入

#### 7.1 目标

把自理任务执行结果按 SCGP 主链口径落入 `training_records + training_session`。

#### 7.2 主要工作

- 新建 `src/database/self-care-training-api.ts`
- 封装自理任务训练保存方法，事务性写入：
  - `training_records`
  - `training_session`
- 不直接复用 `GameTrainingAPI.saveTrainingRecord()`

#### 7.3 为什么不能直接复用现有 `GameTrainingAPI`

当前 `GameTrainingAPI` 有两个与本次冲突的现实：

- 会把 `sessionFamily` 固定写成 `game`
- 会尝试按旧 `task` 表语义处理 `task_id`

因此本期应新建自理任务专用写入器，但继续复用：

- `TrainingSessionWriter`
- 事务包裹模式
- 现有 `training_records` 字段口径

#### 7.4 完成标准

- 每次训练完成后：
  - `training_records` 新增 1 条
  - `training_session` 新增 1 条
- 两张表写入要么都成功，要么都回滚
- `session_family = task_training`
- `entry_code = life-skills`

### 阶段 5：训练计划、首页与统一启动器接入

#### 7.1 目标

让自理任务资源进入 SCGP 现有训练计划与首页推荐主链。

#### 7.2 主要工作

- `src/views/plan/PlanList.vue`
  - 资源类型筛选加入 `task_training`
  - 资源类型标签加入 `自理任务`
  - “全部模块”查询加入 `life_skills`
  - 计划资源动作标签加入 `开始训练`
- `src/utils/training-launch.ts`
  - 新增 `task_training` 分支
  - 统一跳转到 `/self-care/execute/:taskId/:studentId`
- `src/database/dashboard-api.ts`
  - 首页今日计划白名单加入 `task_training`
- 如首页使用 `launchResourceType` 判定按钮文案，也同步补齐 `task_training`

#### 7.3 完成标准

- 自理任务资源可加入训练计划
- 从训练计划可启动自理训练
- 首页今日计划 / 推荐资源能识别自理任务为可启动训练

### 阶段 6：训练记录与详情页接入

#### 7.1 目标

让自理训练记录进入现有统一记录入口，并具备正确详情页。

#### 7.2 主要工作

- 新建 `src/views/self-care/RecordDetail.vue`
- `src/views/training-records/components/GameRecordsPanel.vue`
  - 允许 `task_training` 记录在游戏训练记录面板中展示
  - 任务名优先取资源名
  - 状态列支持 `task_training`
- `src/views/training-records/ModuleTrainingRecords.vue`
  - 遇到 `resource_type = task_training` 时跳转到自理训练详情页
- `src/views/StudentDetail.vue`
  - 同步补自理训练详情跳转

#### 7.3 完成标准

- `life-skills` 入口下能看到自理训练记录
- 学生详情页能看到自理训练记录
- 点击详情不会再误跳到 `/games/report`

### 阶段 7：资源中心支撑与录入体验补全

#### 7.1 目标

让 `task_training` 在资源中心具备基本管理能力，而不是只能在自理训练页内部维护。

#### 7.2 主要工作

- `src/views/resource-center/TrainingResources.vue`
  - 资源类型列表加入 `task_training`
  - 图标与标签样式加入 `自理任务`
  - 创建 / 编辑时接入自理任务 metadata 编辑器
- 如资源中心仍只区分 `equipment / game` 显示类型，需新增第三类显示类型 `task`
  - 若不新增 `task`，至少也要保证 `task_training` 可见且文案不被误标成“游戏”

#### 7.3 完成标准

- 管理员能在资源中心找到 `task_training`
- 不会出现“资源已创建，但在资源中心看不到”的断链

## 8. 高风险点与控制策略

### 8.1 风险：`task_training` 只入库，不入可见主链

触发点：

- 资源中心未识别
- 训练计划未识别
- 首页未识别

控制：

- 阶段 1 先统一补类型识别
- 所有白名单文件一次性补齐，不分散后补

### 8.2 风险：错误复用旧 `task` 表

触发点：

- 直接套用旧 `task_id` 语义
- 直接读写 `task_step`

控制：

- contract 和 API 层统一用 `resourceId`
- 新写链 `task_id = NULL`
- 任何步骤读取都只来自 `meta_data.steps[]`

### 8.3 风险：训练记录能显示，但详情误跳

触发点：

- 当前非情绪记录默认跳 `/games/report`

控制：

- 阶段 6 必须新增自理训练详情页
- `ModuleTrainingRecords` 和 `StudentDetail` 同步补分支

### 8.4 风险：计划选择器遗漏 `life_skills`

触发点：

- `PlanList.vue` 当前 “all modules” 只查 `sensory / emotional / social`

控制：

- 阶段 5 必须把 `life_skills` 纳入
- 同时检查筛选项、显示项、资源计数是否一致

### 8.5 风险：记录写链语义不正确

触发点：

- 直接复用 `GameTrainingAPI` 导致 `session_family = game`

控制：

- 新建 `self-care-training-api.ts`
- 仅复用 `TrainingSessionWriter`，不复用游戏写链外层语义

## 9. 验收清单

实施完成后，至少满足以下验收项：

### 9.1 入口与授权

- 左侧菜单出现 `自理训练`
- 未授权 `life_skills` 时入口不可见
- 已授权时可进入 `/self-care/tasks`

### 9.2 任务维护

- 可新建任务
- 可编辑任务
- 任务以 `task_training` 资源身份存在于 `sys_training_resource`
- 步骤媒体可正确回显

### 9.3 训练执行

- 可选择学生开始训练
- 可逐步记录完成等级、错误类型、备注
- 可正常完成或中断

### 9.4 训练记录

- 完成训练后：
  - `training_records` 有记录
  - `training_session` 有记录
- 统一训练记录入口能看到该记录
- 学生详情页能看到该记录

### 9.5 训练计划与首页

- 训练计划可选自理任务资源
- 训练计划可启动自理任务
- 首页今日计划能启动自理任务

## 10. 实施顺序建议

建议严格按以下顺序推进，不要跳步：

1. 阶段 1：底座与类型收口
2. 阶段 2：任务资源 CRUD
3. 阶段 3：训练执行链路
4. 阶段 4：训练记录事务写入
5. 阶段 5：训练计划、首页与统一启动器接入
6. 阶段 6：训练记录与详情页接入
7. 阶段 7：资源中心支撑与录入体验补全

这样安排的原因是：

- 先解决平台识别 `task_training` 的底座问题，避免后续出现“做了功能但主链看不见”
- 再完成任务维护与执行，保证功能闭环先跑通
- 最后再把计划、首页、记录详情这些外围入口补齐

## 11. 验证命令

每一阶段完成后，至少执行：

```bash
npm run type-check
```

在阶段 5 和阶段 6 完成后，再执行：

```bash
npm run build:web
```

同时做以下手工回归：

1. 使用仅 `life_skills` 授权账号验证菜单、路由和记录入口。
2. 新建 1 条 `task_training` 任务并加入训练计划。
3. 从任务列表、训练计划、首页今日计划分别各启动 1 次训练。
4. 到训练记录入口与学生详情页核对记录和详情跳转。

## 12. 下一步建议

本计划完成后，建议直接进入“阶段 1：底座与类型收口”实施，不要先做执行页。

原因很明确：

- 当前最大的风险不是页面没写，而是 `task_training` 还没有进入平台共用白名单
- 如果先写自理训练页面，后面仍会返工资源中心、计划、首页和记录入口

因此下一轮实现应先完成：

- `task_training` 类型收口
- `self-care` 路由壳
- 统一启动器分支
- 首页 / 计划 / 资源中心白名单补齐
