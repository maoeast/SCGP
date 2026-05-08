# Self-Care ATS 到 SCGP 的实现映射清单
> 文档类型：现行对照清单
> 适用范围：`SCGP / 星愿能力发展训练系统`
> 参考来源：`E:\VSC\H5\Self-Care ATS\self-care-ats`
> 状态：当前有效
> 创建日期：2026-05-08

## 1. 文档目的

本清单用于回答一个具体问题：

> 旧 `Self-Care ATS` 的“自理训练任务模块”里，哪些实现值得迁入 SCGP，哪些只能作为参考，哪些必须明确废弃？

它不是新的需求文档，也不是实施计划的替代品，而是：

- 为 `A1` 迁移设计补齐旧系统真实实现依据
- 为 `A2` 详细实施计划提供旧系统对照事实
- 防止后续实现时把“旧 ATS 的表结构”误当成“SCGP 应复用的主链”

## 2. 读取范围

本次已实际读取的旧 ATS 关键文件包括：

- [src/router/index.ts](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/router/index.ts:1>)
- [src/views/training/TrainingModule.vue](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/views/training/TrainingModule.vue:1>)
- [src/views/training/TaskEdit.vue](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/views/training/TaskEdit.vue:1>)
- [src/views/training/TrainingExecute.vue](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/views/training/TrainingExecute.vue:1>)
- [src/views/training/TrainingPlans.vue](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/views/training/TrainingPlans.vue:1>)
- [src/views/training/TrainingRecords.vue](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/views/training/TrainingRecords.vue:1>)
- [src/stores/task.ts](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/stores/task.ts:1>)
- [src/database/api.ts](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/database/api.ts:1>)
- [src/database/schema.sql](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/database/schema.sql:1>)
- [src/utils/media-url.ts](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/utils/media-url.ts:1>)

## 3. 总体结论

先给结论，避免后续误判：

### 3.1 旧 ATS 最值得迁的是“行为链”，不是“表结构”

旧 ATS 最成熟、最有价值的部分，是这条完整闭环：

1. 任务列表浏览
2. 任务编辑
3. 选学生开始训练
4. 按步骤执行
5. 记录完成等级 / 错误类型 / 备注
6. 保存训练记录
7. 在记录页回看训练结果

这条链路值得迁。

### 3.2 旧 ATS 的数据主链不能直接迁入 SCGP

旧 ATS 的训练任务主链是：

- `task_category`
- `task`
- `task_step`
- `train_plan`
- `train_plan_detail`
- `train_log`

而 SCGP 的目标主链必须是：

- `sys_training_resource`
- `sys_training_plan`
- `sys_plan_resource_map`
- `training_records`
- `training_session`

因此，迁的是字段语义和页面职责，不是旧表名。

### 3.3 旧 ATS 可作为“交互参考源”，不可作为“当前事实源”

旧 ATS 可以回答：

- 任务编辑器应该长什么样
- 执行页应该记录什么数据
- 教师在训练时会需要哪些操作

但它不能回答：

- SCGP 当前已经实现了什么
- SCGP 现在应该把数据写到哪里
- SCGP 当前的统一训练计划与训练记录主链是什么

## 4. 映射总表

| 主题 | 旧 ATS 真实实现 | SCGP 对应落点 | 迁移结论 |
| --- | --- | --- | --- |
| 顶层入口 | 独立 `/training` 模块 | 新增 `/self-care/*`，授权挂 `life_skills` | 迁职责，不迁入口代码 |
| 任务主表 | `task` | `sys_training_resource` | 迁字段，不迁表 |
| 分类体系 | `task_category` 父子树 | `meta_data.category` | 一期不迁旧分类表主链 |
| 步骤结构 | `task_step` | `meta_data.steps[]` | 迁结构，不迁表 |
| 任务编辑 | `TaskEdit.vue` | `TaskEditor.vue + components/*` | 可直接参考页面职责 |
| 执行闭环 | `TrainingExecute.vue` | `TaskExecution.vue` | 强参考 |
| 完成等级 | `independent / prompt / assist / unable` | `raw_data.stepResults[]` | 直接保留语义 |
| 错误类型 | `0/1/2/3` | `raw_data.errorType` | 可直接沿用 |
| 训练计划 | `train_plan + train_plan_detail` 直绑 `task_id` | `sys_training_plan + sys_plan_resource_map` 绑定 `resource_id` | 不迁旧计划模型 |
| 训练记录 | `train_log` | `training_records + training_session` | 迁统计语义，不迁表 |
| 媒体路径 | `tasks/...`、`file://`、`base64` 混用 | `resource://` | 必须重做 |
| 状态管理 | 单一 `taskStore` 串起任务、步骤、计划、记录 | 分拆 `self-care-task-api` / `self-care-training-api` | 不建议照搬 |
| 难度等级 | `task_level` | 暂不落地 | 可延后 |
| 教学资源 | `resource_meta` | SCGP 现有统一资源主链 | 不复用旧资源模型 |

## 5. 旧 ATS 真实实现拆解

### 5.1 入口与路由

旧 ATS 在 [src/router/index.ts](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/router/index.ts:1>) 中，把自理训练作为独立顶层模块暴露，核心路由包括：

- `/training`
- `/training/tasks/new`
- `/training/tasks/:id/edit`
- `/training/:taskId/select-student`
- `/training/execute/:taskId/:studentId/:planId?`
- `/training/plans`
- `/training/plans/:id`
- `/training/records`

对应页面职责分别是：

- `TrainingModule.vue`
  任务库首页
- `TaskEdit.vue`
  新建 / 编辑任务
- `TrainingStudentSelect.vue`
  选学生启动训练
- `TrainingExecute.vue`
  步骤执行页
- `TrainingPlans.vue`
  训练计划列表
- `TrainingPlanDetail.vue`
  训练计划详情
- `TrainingRecords.vue`
  训练记录列表

对 SCGP 的启示：

- 旧 ATS 在页面职责拆分上是合理的
- 但 SCGP 中这些页面应放到 `/self-care/*`
- 权限口径不能照搬旧系统，必须走 `life_skills`

### 5.2 任务模型

旧 ATS 在 [src/database/schema.sql](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/database/schema.sql:1>) 中定义：

#### `task`

核心字段：

- `id`
- `code`
- `name`
- `category_id`
- `ability_item`
- `media_type`
- `cover_img`
- `description`

#### `task_step`

核心字段：

- `task_id`
- `seq`
- `img_path`
- `video_path`
- `audio_path`
- `text`

#### `task_level`

核心字段：

- `task_id`
- `level`
- `total_step`
- `score`
- `description`

对 SCGP 的启示：

- `task` 字段结构本身是有用的
- 其中“任务基础信息 + 封面图”适合映射到 `sys_training_resource`
- “步骤明细”适合映射到 `meta_data.steps[]`
- `task_level` 虽然存在，但旧执行链并没有强依赖它，当前优先级不高

### 5.3 任务编辑器

[TaskEdit.vue](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/views/training/TaskEdit.vue:1>) 的职责非常清晰：

- 编辑任务编码、名称、分类、能力项、媒体类型、封面图、描述
- 支持步骤列表维护
- 每步可以附加：
  - 图片
  - 视频
  - 音频
- 支持步骤增删与顺序维护

旧页面的真实特点：

- 编辑器不是“复杂表单平台”，而是一个任务本体 + 步骤编辑器
- 媒体是直接绑在步骤上的，而不是外部资源引用表
- 保存时先保存任务，再保存步骤

对 SCGP 的启示：

- `TaskEditor.vue` 应保留这种结构
- 不需要在一期引入复杂的“步骤模板系统”
- 一期足够做成：
  - 任务基础信息区
  - 步骤列表区
  - 每步媒体区

### 5.4 执行页

[TrainingExecute.vue](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/views/training/TrainingExecute.vue:1>) 是旧 ATS 最值得保留的部分。

它当前已经具备完整执行闭环：

- 读取任务与步骤
- 展示当前步骤文本
- 展示当前步骤图片 / 视频 / 音频
- 显示步骤进度
- 上一步 / 下一步 / 完成
- 教师记录完成等级
- 教师记录错误类型
- 教师填写备注
- 中途退出确认
- 完成后显示完成弹窗

旧执行页里最关键的教师输入有两类：

#### 完成等级

- `independent`
- `prompt`
- `assist`
- `unable`

#### 错误类型

- `0` 正常
- `1` 跳过
- `2` 顺序错误
- `3` 超时

对 SCGP 的启示：

- 这些字段可以直接成为 SCGP 自理训练的 `raw_data` 结构
- 交互上不需要重新发明一套训练执行模式
- 可以直接沿着旧执行页的心智模型实现新执行页

### 5.5 训练计划

旧 ATS 在 [schema.sql](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/database/schema.sql:1>) 中定义：

- `train_plan`
- `train_plan_detail`

其中 `train_plan_detail` 直接绑定：

- `plan_id`
- `task_id`
- `scheduled_date`
- `status`
- `score`
- `notes`

[TrainingPlans.vue](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/views/training/TrainingPlans.vue:1>) 也明确体现出旧系统的计划模型是：

- 计划下面挂多个任务
- 执行时默认从计划里取第一个任务
- 启动时仍走 `taskId + studentId + planId`

对 SCGP 的启示：

- 旧 ATS 计划模型是“任务直绑”
- 但 SCGP 不能继续走这条线
- 在 SCGP 里，训练计划必须改成“资源直绑”
- 也就是把旧 `task.id` 的角色，改由 `sys_training_resource.id` 承担

### 5.6 训练记录

旧 ATS 在 [schema.sql](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/database/schema.sql:1>) 中定义：

#### `train_log`

核心字段：

- `student_id`
- `task_id`
- `start_time`
- `end_time`
- `total_step`
- `finish_step`
- `score`
- `error_type`
- `completion_details`
- `notes`

[src/database/api.ts](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/database/api.ts:1>) 中 `saveTrainingLog()` 的写法说明了它的真实语义：

- `score` 是训练结果分数
- `finish_step / total_step` 是进度信息
- `completion_details` 保存步骤完成等级
- `error_type` 保存整体错误类型
- `notes` 保存教师备注

[TrainingRecords.vue](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/views/training/TrainingRecords.vue:1>) 则说明旧记录页是围绕 `train_log` 单表来做的：

- 总训练次数
- 平均得分
- 完成率
- 各分类训练次数
- 列表筛选与导出

对 SCGP 的启示：

- 旧 `train_log` 的字段语义是有价值的
- 但应写进：
  - `training_records.raw_data`
  - `training_session.summary_payload`
- 不能再新建一张旧式 `train_log`

### 5.7 状态管理

[src/stores/task.ts](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/stores/task.ts:1>) 把这些内容都挂在一个 store 里：

- 分类
- 任务
- 步骤
- 计划
- 记录

再通过同一个 `TaskAPI` 串起来。

对 SCGP 的启示：

- 旧 ATS 规模较小时，这种集中式 store 可以工作
- 但放到 SCGP 会直接把旧模型带回主链
- 更合适的拆法是：
  - `self-care-task-api`
  - `self-care-training-api`
  - 页面内部组合使用

### 5.8 媒体路径处理

[src/utils/media-url.ts](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/utils/media-url.ts:1>) 说明旧系统实际兼容了多种路径：

- `data:` base64
- `file://`
- `http(s)://`
- `tasks/...`
- `/tasks/...`
- `assets/...`

[TaskEdit.vue](</E:/VSC/H5/Self-Care ATS/self-care-ats/src/views/training/TaskEdit.vue:1>) 也说明旧页面上传时会：

- 在 Electron 下尝试直接保存本地文件
- 保存失败时退回 base64

对 SCGP 的启示：

- 旧路径策略是典型“项目内自洽”，不适合平台化继承
- SCGP 应统一走 `resource://`
- 旧媒体“文件类型与挂接位置”可参考，旧媒体“URL 口径”必须废弃

## 6. 明确“可迁”“参考”“废弃”

### 6.1 可直接迁语义

- 任务基础字段
- 步骤字段
- 完成等级四档
- 错误类型四档
- 执行页主流程
- 任务编辑页职责拆分

### 6.2 只作为参考，不直接迁

- 旧页面样式与布局
- 旧 `taskStore` 组织方式
- 旧计划页的交互文案
- 旧记录页的统计展示样式

### 6.3 必须明确废弃

- `task` 作为 SCGP 新主表
- `task_step` 作为 SCGP 一期新明细表
- `train_plan / train_plan_detail` 作为 SCGP 计划主链
- `train_log` 作为 SCGP 记录主链
- `tasks/...` / `file://` / `base64` 混合媒体路径策略

## 7. 对当前 SCGP 实施的直接指导

结合已完成的 `A1` 和 `A2`，这份旧 ATS 对照清单对 SCGP 当前实现有 5 条直接指导意义：

### 7.1 迁“任务资源化”，不要迁“任务表化”

旧 ATS 的 `task` 只是载体，SCGP 的载体应换成 `sys_training_resource`。

### 7.2 迁“步骤结构”，不要迁“步骤表”

旧 ATS 的 `task_step` 结构适合进入 `meta_data.steps[]`，而不是在 SCGP 里恢复独立表。

### 7.3 迁“执行交互”，不要迁“保存 API”

旧 `TrainingExecute.vue` 的交互很成熟，但它最后写的是 `train_log`，SCGP 必须改写为 `training_records + training_session`。

### 7.4 迁“从计划启动任务”的能力，不迁“任务计划表”

SCGP 要保留“计划可以启动自理任务”，但计划绑定对象必须改成资源。

### 7.5 迁“记录语义”，不要迁“记录主链”

旧 `train_log` 是一个很好的字段语义来源，但不能在 SCGP 里形成第二套记录事实源。

## 8. 和 `A2` 实施计划的关系

本清单与以下文档形成顺序关系：

1. [2026-05-08-self-care-training-module-a1-migration-design.md](/E:/VSC/H5/SIC-ADS/docs/planning/2026-05-08-self-care-training-module-a1-migration-design.md)
   定义“迁什么、不迁什么”
2. [2026-05-08-self-care-ats-to-scgp-mapping-checklist.md](/E:/VSC/H5/SIC-ADS/docs/planning/2026-05-08-self-care-ats-to-scgp-mapping-checklist.md)
   定义“旧系统真实是怎么做的”
3. [2026-05-08-self-care-training-module-implementation-plan.md](/E:/VSC/H5/SIC-ADS/docs/planning/2026-05-08-self-care-training-module-implementation-plan.md)
   定义“在 SCGP 里下一步具体怎么做”

因此，本清单的作用是：

- 给实现计划补旧系统事实
- 给后续开发提供“哪些代码可以参考、哪些结构不能照搬”的边界

## 9. 结论

旧 `Self-Care ATS` 已经证明了一件事：

> “步骤型自理任务训练”这件事本身是成熟可用的，问题不在业务模型，而在它当前仍被旧项目的数据主链包裹着。

SCGP 下一步应该做的，不是复制旧 ATS，而是把旧 ATS 中最成熟的那条“任务编辑 + 步骤执行 + 结果采集”行为链，拆出来并放进 SCGP 已经存在的资源、计划和记录主链里。

一句话总结：

- 旧 ATS 提供的是“训练行为模板”
- SCGP 要做的是“平台主链重承载”
