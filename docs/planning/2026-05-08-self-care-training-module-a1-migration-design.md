# 自理训练任务模块迁移设计（A1）

> 文档类型：现行迁移设计  
> 创建日期：2026-05-08  
> 适用范围：SCGP / 星愿能力发展训练系统  
> 设计目标：将 `Self-Care ATS` 中“生活自理适应综合训练”的任务训练链迁入 SCGP，并并入 `life_skills` 主线

## 1. 背景

当前 SCGP 已具备以下与本次迁移直接相关的底座能力：

- 顶层模块与授权体系，包含 `life_skills`
- 统一训练入口定义：`life-skills`
- 统一资源主模型：`sys_training_resource`
- 统一训练计划主模型：`sys_training_plan + sys_plan_resource_map`
- 统一训练记录主链：`training_records + training_session`
- 训练记录总入口：`/training-records/*`

同时，`Self-Care ATS` 中已有一套完整但独立的“任务训练”业务链，包含：

- 任务库：`task_category`、`task`、`task_step`
- 训练执行：按步骤播放图片、视频、音频并记录完成情况
- 训练计划：`train_plan`、`train_plan_detail`
- 训练记录：`train_log`

本次迁移的目标不是把旧项目整包复制进 SCGP，而是将其中最有价值、SCGP 当前仍缺失的“任务步骤训练能力”迁入现有平台主线。

## 2. 当前代码现实

### 2.1 `Self-Care ATS` 的真实主链

旧项目中的训练模块并非单页演示，而是一套完整业务链，核心页面与数据职责如下：

- 任务库：首页浏览任务、分类筛选、搜索、开始训练
- 任务编辑：维护任务基础信息、封面、步骤和步骤媒体
- 训练执行：选择学生后按步骤训练，记录完成等级、错误类型与备注
- 计划与记录：独立使用 `train_plan`、`train_plan_detail`、`train_log`

### 2.2 SCGP 的真实承接点

SCGP 当前并不存在同等能力的“任务步骤训练”入口，但已经具备以下承接条件：

- `life_skills` 为已定义模块代码
- `life-skills` 为已定义训练入口代码
- 训练计划使用 `sys_training_plan + sys_plan_resource_map`
- 训练记录使用 `training_records + training_session`
- `life_skills` 已存在 5 个小游戏资源，说明该模块已进入平台主链，但“任务训练”能力尚未建立

### 2.3 本次设计的现实判断

- 本次要新增的是 SCGP 的一个新顶层业务入口：`自理训练`
- 该入口不新建 `self_care` 模块代码，仍挂接现有 `life_skills` 授权
- 本次不延续旧项目独立的 `train_plan` / `train_log` 作为新主线
- 本次只迁入旧项目的“任务训练链”，不同时收口现有 `life_skills` 小游戏与器材训练入口

## 3. 目标与范围

## 3.1 目标

在 SCGP 中新增与 `情绪行为`、`游戏训练`、`器材训练` 同级的顶层入口 `自理训练`，完成以下闭环：

- 任务库管理
- 任务编辑
- 按步骤执行训练
- 训练结果写入 SCGP 现有训练记录主链
- 任务资源可被 SCGP 现有训练计划选中并启动

## 3.2 本期范围（A1）

本期只包含旧项目“任务训练链”的 SCGP 化迁移：

- 自理训练入口
- 任务列表
- 新建 / 编辑任务
- 选择学生开始训练
- 步骤训练执行页
- 训练完成后写入 SCGP 记录主链
- 接入 SCGP 现有训练计划与训练记录入口

## 3.3 明确不在本期范围内

- 不迁移旧项目历史 `train_plan` / `train_log` 数据
- 不保留旧项目独立计划页和独立记录页作为 SCGP 新主链
- 不在本期收口现有 `life_skills` 小游戏首页
- 不在本期收口 `life_skills` 器材训练首页
- 不进行平台级额外重构

## 4. 总体方案

本次迁移采用“分阶段 SCGP 化”方案：

1. 保留旧项目最有价值的“任务库 + 步骤执行”能力
2. 以 SCGP 现有模块、资源、计划、记录主链为落点
3. 不复制旧项目独立 `task/train_plan/train_log` 作为新平台主链
4. 新入口的 UI 和交互风格统一收口到 SCGP 当前后台风格

该方案优先保证：

- 导航层级一致
- 授权体系一致
- 训练计划口径一致
- 训练记录口径一致
- 后续可持续扩展到 `life_skills` 其他训练形式

## 5. 入口与页面结构

## 5.1 顶层入口

SCGP 左侧导航新增顶层入口：

- 名称：`自理训练`
- 授权：沿用 `life_skills`
- 层级：与 `情绪行为`、`游戏训练`、`器材训练`、`训练计划`、`训练记录` 同级

不新增新的模块代码，不引入 `self_care` 授权分支。

## 5.2 路由结构

建议新增以下路由：

- `/self-care`
- `/self-care/tasks`
- `/self-care/tasks/new`
- `/self-care/tasks/:id/edit`
- `/self-care/tasks/:taskId/select-student`
- `/self-care/execute/:taskId/:studentId`

### 5.2.1 页面职责

`/self-care/tasks`

- 任务库首页
- 分类筛选
- 关键词搜索
- 查看任务详情
- 进入编辑
- 进入选择学生开始训练

`/self-care/tasks/new`

- 新建任务
- 录入任务基础信息
- 维护步骤与步骤媒体

`/self-care/tasks/:id/edit`

- 编辑已有任务
- 完整回显任务与步骤配置

`/self-care/tasks/:taskId/select-student`

- 选择训练学生
- 生成训练启动上下文

`/self-care/execute/:taskId/:studentId`

- 运行步骤训练
- 记录步骤完成等级、错误类型与备注
- 完成后落库

## 5.3 UI 约束

本模块不沿用旧 ATS 的整页视觉结构，统一采用 SCGP 当前页面风格：

- `Layout` 壳层
- `page-header`
- `scgp-page-panel`
- Element Plus 组件体系

页面职责可以参考旧项目，但视觉结构必须按 SCGP 当前后台样式重做。

## 6. 数据落位策略

## 6.1 总原则

旧项目中的 `task` 体系不直接作为 SCGP 新主链保留，而是映射到 SCGP 现有资源主模型。

即：

- 任务本体进入 `sys_training_resource`
- 计划进入 `sys_training_plan + sys_plan_resource_map`
- 记录进入 `training_records + training_session`

## 6.2 任务资源映射

旧 `task` 在 SCGP 中映射为一类新资源，建议约定：

- `module_code = life_skills`
- `resource_type = task_training`
- `category = life-skills`

资源主表承载：

- `name`
- `description`
- `cover_image`
- `module_code`
- `resource_type`
- `category`

任务特有结构放入 `meta_data`。

## 6.3 任务元数据结构

建议的 `meta_data` 结构如下：

```json
{
  "trainingMode": "step_task",
  "legacyTaskCode": "EAT_SPOON_001",
  "mediaType": "image_video",
  "category": {
    "parentId": 1,
    "parentName": "饮食技能",
    "childId": 11,
    "childName": "使用勺子"
  },
  "abilityItem": {
    "id": "feed_01",
    "name": "独立进食"
  },
  "steps": [
    {
      "seq": 1,
      "text": "拿起勺子",
      "imagePath": "resource://...",
      "videoPath": null,
      "audioPath": null
    }
  ]
}
```

说明：

- 第一期不单独新增 `task_step` 明细表
- 步骤配置先作为资源元数据保存
- 后续如果任务训练需要更复杂的步骤统计，再考虑拆出独立明细表

## 6.4 计划映射

旧 `train_plan / train_plan_detail` 不作为新主链迁入。

自理训练任务直接接入 SCGP 现有：

- `sys_training_plan`
- `sys_plan_resource_map`

计划里关联的是“任务资源 id”，而不是旧 ATS 的 `task.id`。

结果是：

- 一个自理训练任务可以像其他训练资源一样被纳入现有训练计划
- 不会在 SCGP 内形成第二套独立计划体系

## 6.5 记录映射

旧 `train_log` 不作为新主链迁入。

任务训练结果写入：

- `training_records`
- `training_session`

建议写入约定如下：

- `module_code = life_skills`
- `entry_code = life-skills`
- `resource_id = 当前任务资源 id`
- `resource_type = task_training`
- `task_id = NULL`
- `session_type = task_training`

### 6.5.1 `training_records.raw_data`

步骤级详情、错误类型、备注等进入 `raw_data`，建议结构如下：

```json
{
  "trainingMode": "step_task",
  "stepCount": 4,
  "completedStepCount": 4,
  "errorType": 0,
  "teacherNotes": "可在口头提示下完成第 2 步",
  "stepResults": [
    {
      "seq": 1,
      "completionLevel": "independent"
    },
    {
      "seq": 2,
      "completionLevel": "prompt"
    }
  ]
}
```

### 6.5.2 `training_session.summary_payload`

统一会话摘要进入 `training_session.summary_payload`，用于训练记录总入口与后续统计。

## 7. 运行链路设计

## 7.1 任务维护链

教师在 `自理训练` 首页维护任务时，系统应完成以下流程：

1. 填写任务基础信息
2. 维护步骤配置
3. 上传封面与步骤媒体
4. 生成或更新一条 `task_training` 资源
5. 将步骤结构写入 `meta_data.steps[]`

## 7.2 训练执行链

任务训练执行流程如下：

1. 从任务库选择任务
2. 进入学生选择页
3. 进入步骤执行页
4. 按步骤展示图像 / 视频 / 音频 / 文本
5. 教师记录完成等级、错误类型、备注
6. 训练结束写入 `training_records`
7. 同步写入 `training_session`

## 7.3 与现有计划链的连接方式

自理训练任务作为资源进入 SCGP 现有计划系统后，应支持：

- 在 `训练计划` 中被选中
- 从计划页启动训练
- 训练完成后仍归入统一记录口径

计划页不新增旧 ATS 风格的任务排期页面。

## 8. 迁移阶段

本次 `A1` 按 4 个阶段推进，顺序固定，不交叉跳步。

## 8.1 阶段 1：底座接入

目标：让 `自理训练` 模块壳层在 SCGP 中站住。

包括：

- 新增导航与路由 `/self-care/*`
- 接入 `life_skills` 授权过滤
- 约定 `task_training` 资源类型
- 定义任务资源 `meta_data` 结构

本阶段不导入旧任务数据。

## 8.2 阶段 2：任务库迁入

目标：让教师能在 SCGP 内维护自理训练任务。

包括：

- 任务列表页
- 新建任务页
- 编辑任务页
- 步骤编辑
- 封面与步骤媒体管理

到本阶段结束，系统已具备“任务资源维护能力”。

## 8.3 阶段 3：训练执行闭环

目标：让任务训练真正可运行并可落记录。

包括：

- 选择学生开始训练
- 步骤训练执行页
- 步骤完成等级记录
- 错误类型记录
- 教师备注记录
- 训练结束写入 `training_records + training_session`

到本阶段结束，模块已不是静态任务库，而是可执行训练能力。

## 8.4 阶段 4：接入现有计划与记录入口

目标：让自理训练任务真正进入 SCGP 平台总链。

包括：

- 训练计划可选 `task_training` 资源
- 从训练计划中启动任务训练
- 训练记录总入口可看到 `life-skills` 下的任务训练记录

到本阶段结束，`A1` 完成平台级闭环。

## 9. 验收标准

## 9.1 入口层

- 左侧导航出现新的顶层入口 `自理训练`
- 未授权 `life_skills` 时入口不可见
- 已授权时可进入 `/self-care/tasks`

## 9.2 任务库层

- 教师可在 SCGP 内新建一个自理训练任务
- 可编辑任务基础信息、封面、步骤列表、步骤媒体
- 保存后任务以 `task_training` 资源身份存在于系统中
- 再次进入编辑页时，任务与步骤数据可完整回显

## 9.3 执行层

- 可从任务列表进入“选学生 → 开始训练 → 按步骤执行”
- 训练中可记录：
  - 当前步骤完成等级
  - 错误类型
  - 教师备注
- 训练结束后生成有效训练记录，并正确关联：
  - 学生
  - 资源
  - `life-skills` 入口

## 9.4 平台接入层

- 该任务资源可被 SCGP 现有训练计划选中
- 从训练计划中可启动该任务训练
- 训练记录总入口中可看到这类记录，且归到 `life-skills`
- 不新增第二套独立的计划页、记录页主链

## 9.5 边界约束

- 本期不要求迁入旧项目全部历史任务数据
- 本期不要求迁入旧项目独立 `train_plan/train_log` 历史记录
- 本期不要求同时收口现有 `life_skills` 小游戏入口
- 本期不要求同时收口 `life_skills` 器材训练入口
- 本期不做额外平台级重构

## 10. 风险与处理策略

## 10.1 旧任务步骤结构与 SCGP 资源模型的语义差异

风险：

- 旧项目以 `task_step` 为中心
- SCGP 当前以资源主表为中心

处理：

- 第一期用 `meta_data.steps[]` 承接
- 不在本期强行拆出新明细表

## 10.2 训练记录统计口径不一致

风险：

- 如果复活旧 `train_log` 主链，会导致平台统计分叉

处理：

- 明确只写入 `training_records + training_session`
- 不保留旧 ATS 计划 / 记录链作为新主线

## 10.3 旧页面直接迁入会破坏 SCGP 一致性

风险：

- 旧页面视觉、交互、数据写法均与 SCGP 当前主线不一致

处理：

- 仅迁页面职责，不迁视觉结构
- UI 全面收口到 SCGP 当前后台风格

## 11. 关键决策汇总

- `自理训练` 是新的顶层入口，但授权挂现有 `life_skills`
- 不新增 `self_care` 模块代码
- 旧 `task` 映射为 `sys_training_resource` 中的 `task_training` 资源
- 旧 `task_step` 先进入 `meta_data.steps[]`
- 旧 `train_plan / train_log` 不作为 SCGP 新主链迁入
- 自理训练记录统一进入 `training_records + training_session`
- `A1` 只迁“任务训练链”，不同时收口现有 `life_skills` 小游戏与器材训练

## 12. 结论

本设计的目标不是把 `Self-Care ATS` 复制进 SCGP，而是在 SCGP 现有平台主链内补上“自理任务步骤训练”这块缺口。

按照本设计推进后，SCGP 将新增一个与现有训练入口同等级的 `自理训练` 顶层入口，并具备：

- 可维护的任务库
- 可执行的步骤训练
- 可接入计划的任务资源
- 可进入统一记录主链的训练结果

同时，平台不会因此生成第二套独立的训练计划和训练记录体系。
