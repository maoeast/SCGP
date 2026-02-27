# 数据库表关系文档

本文档描述感官综合训练与评估系统数据库中各表之间的关系和外键约束。

## 关系图概览

```
student (学生)
  ├─ sm_assess (S-M评估)
  │   └─ sm_assess_detail (S-M评估详情)
  ├─ weefim_assess (WeeFIM评估)
  │   └─ weefim_assess_detail (WeeFIM评估详情)
  └─ train_plan (训练计划)
      └─ train_plan_detail (训练计划详情)
          └─ train_log (训练记录)

user (用户)
  ├─ sm_assess (评估人)
  ├─ weefim_assess (评估人)
  └─ train_plan (创建人)
      └─ train_log (训练师)
```

## 核心关系详解

### 1. 学生相关关系

#### student → sm_assess (一对多)

```
student.id (1) ───< sm_assess.student_id (*)
```

- **关系类型**: 一个学生可以有多条 S-M 评估记录
- **外键**: `sm_assess.student_id` → `student.id`
- **约束**: `ON DELETE CASCADE` - 删除学生时级联删除所有相关评估
- **业务含义**: 跟踪学生历次 S-M 评估记录

#### student → weefim_assess (一对多)

```
student.id (1) ───< weefim_assess.student_id (*)
```

- **关系类型**: 一个学生可以有多条 WeeFIM 评估记录
- **外键**: `weefim_assess.student_id` → `student.id`
- **约束**: `ON DELETE CASCADE` - 删除学生时级联删除所有相关评估
- **业务含义**: 跟踪学生历次 WeeFIM 评估记录

#### student → train_plan (一对多)

```
student.id (1) ───< train_plan.student_id (*)
```

- **关系类型**: 一个学生可以有多个训练计划
- **外键**: `train_plan.student_id` → `student.id`
- **约束**: `ON DELETE CASCADE` - 删除学生时级联删除所有相关计划
- **业务含义**: 学生可以有不同阶段的训练计划

### 2. 评估相关关系

#### sm_assess → sm_assess_detail (一对多)

```
sm_assess.id (1) ───< sm_assess_detail.assess_id (*)
```

- **关系类型**: 一次评估包含多个题目的得分
- **外键**: `sm_assess_detail.assess_id` → `sm_assess.id`
- **约束**: `ON DELETE CASCADE` - 删除评估时级联删除所有详情
- **业务含义**: 每条评估记录对应多个题目的具体得分

#### sm_assess → sm_age_stage (多对一)

```
sm_assess.age_stage_id (*) ───> sm_age_stage.id (1)
```

- **关系类型**: 一次评估对应一个年龄阶段
- **外键**: `sm_assess.age_stage_id` → `sm_age_stage.id`
- **约束**: 无级联删除
- **业务含义**: 根据评估结果确定学生对应的年龄阶段

#### sm_assess → user (多对一)

```
sm_assess.assessor_id (*) ───> user.id (1)
```

- **关系类型**: 一次评估由一个评估人完成
- **外键**: `sm_assess.assessor_id` → `user.id`
- **约束**: `ON DELETE SET NULL` - 删除评估人时评估记录保留，但评估人字段置空
- **业务含义**: 记录评估操作的责任人

#### sm_assess_detail → sm_question (多对一)

```
sm_assess_detail.question_id (*) ───> sm_question.id (1)
```

- **关系类型**: 每个详情记录对应一个题目
- **外键**: `sm_assess_detail.question_id` → `sm_question.id`
- **约束**: 无级联删除
- **业务含义**: 关联题目的内容和序号

#### sm_question → sm_age_stage (多对一)

```
sm_question.age_stage_id (*) ───> sm_age_stage.id (1)
```

- **关系类型**: 题目属于特定年龄阶段
- **外键**: `sm_question.age_stage_id` → `sm_age_stage.id`
- **约束**: 无级联删除
- **业务含义**: 不同年龄阶段的题目不同

#### weefim_assess → weefim_assess_detail (一对多)

```
weefim_assess.id (1) ───< weefim_assess_detail.assess_id (*)
```

- **关系类型**: 一次评估包含多个题目的得分
- **外键**: `weefim_assess_detail.assess_id` → `weefim_assess.id`
- **约束**: `ON DELETE CASCADE` - 删除评估时级联删除所有详情
- **业务含义**: 每条评估记录对应多个题目的具体得分

#### weefim_assess → user (多对一)

```
weefim_assess.assessor_id (*) ───> user.id (1)
```

- **关系类型**: 一次评估由一个评估人完成
- **外键**: `weefim_assess.assessor_id` → `user.id`
- **约束**: `ON DELETE SET NULL` - 删除评估人时评估记录保留，但评估人字段置空
- **业务含义**: 记录评估操作的责任人

#### weefim_assess_detail → weefim_question (多对一)

```
weefim_assess_detail.question_id (*) ───> weefim_question.id (1)
```

- **关系类型**: 每个详情记录对应一个题目
- **外键**: `weefim_assess_detail.question_id` → `weefim_question.id`
- **约束**: 无级联删除
- **业务含义**: 关联题目的内容和序号

#### weefim_question → weefim_category (多对一)

```
weefim_question.category_id (*) ───> weefim_category.id (1)
```

- **关系类型**: 题目属于特定分类
- **外键**: `weefim_question.category_id` → `weefim_category.id`
- **约束**: 无级联删除
- **业务含义**: 题目按运动功能和认知功能分类

### 3. 训练相关关系

#### train_plan → train_plan_detail (一对多)

```
train_plan.id (1) ───< train_plan_detail.plan_id (*)
```

- **关系类型**: 一个训练计划包含多个训练任务
- **外键**: `train_plan_detail.plan_id` → `train_plan.id`
- **约束**: `ON DELETE CASCADE` - 删除计划时级联删除所有详情
- **业务含义**: 训划由多个任务组成，按顺序执行

#### train_plan → user (多对一)

```
train_plan.creator_id (*) ───> user.id (1)
```

- **关系类型**: 一个训练计划由一个创建人创建
- **外键**: `train_plan.creator_id` → `user.id`
- **约束**: 无级联删除
- **业务含义**: 记录计划的创建责任人

#### train_plan_detail → task (多对一)

```
train_plan_detail.task_id (*) ───> task.id (1)
```

- **关系类型**: 每个详情项对应一个训练任务
- **外键**: `train_plan_detail.task_id` → `task.id`
- **约束**: 无级联删除
- **业务含义**: 计划中包含具体的训练任务

#### train_plan_detail → task_level (多对一，可选)

```
train_plan_detail.target_level_id (*) ───> task_level.id (1)
```

- **关系类型**: 每个详情项可以指定目标难度等级
- **外键**: `train_plan_detail.target_level_id` → `task_level.id`
- **约束**: 无级联删除
- **业务含义**: 可以为每个任务设置目标难度

#### train_log → train_plan_detail (多对一)

```
train_log.plan_detail_id (*) ───> train_plan_detail.id (1)
```

- **关系类型**: 一条训练记录对应计划中的一个任务
- **外键**: `train_log.plan_detail_id` → `train_plan_detail.id`
- **约束**: 无级联删除
- **业务含义**: 记录每次任务的实际执行情况

#### train_log → student (多对一)

```
train_log.student_id (*) ───> student.id (1)
```

- **关系类型**: 一条训练记录属于一个学生
- **外键**: `train_log.student_id` → `student.id`
- **约束**: `ON DELETE CASCADE` - 删除学生时级联删除所有训练记录
- **业务含义**: 记录冗余存储，方便直接查询学生训练记录

#### train_log → user (多对一，可选)

```
train_log.trainer_id (*) ───> user.id (1)
```

- **关系类型**: 一条训练记录可以有一个训练师
- **外键**: `train_log.trainer_id` → `user.id`
- **约束**: 无级联删除
- **业务含义**: 记录训练指导老师（可为空）

### 4. 任务相关关系

#### task → task_category (多对一，可选)

```
task.category_id (*) ───> task_category.id (1)
```

- **关系类型**: 任务属于某个分类
- **外键**: `task.category_id` → `task_category.id`
- **约束**: 无级联删除
- **业务含义**: 任务按功能或类型分类

#### task_level → task (多对一)

```
task_level.task_id (*) ───> task.id (1)
```

- **关系类型**: 一个任务可以有不同的难度等级
- **外键**: `task_level.task_id` → `task.id`
- **约束**: `ON DELETE CASCADE` - 删除任务时级联删除所有难度等级
- **业务含义**: 同一任务有多个难度版本

#### task_step → task (多对一)

```
task_step.task_id (*) ───> task.id (1)
```

- **关系类型**: 一个任务包含多个步骤
- **外键**: `task_step.task_id` → `task.id`
- **约束**: `ON DELETE CASCADE` - 删除任务时级联删除所有步骤
- **业务含义**: 任务执行的具体步骤说明

#### task_step → task_level (多对一，可选)

```
task_step.level_id (*) ───> task_level.id (1)
```

- **关系类型**: 步骤可以关联特定难度等级
- **外键**: `task_step.level_id` → `task_level.id`
- **约束**: 无级联删除
- **业务含义**: 不同难度等级可能有不同的步骤说明

## 常用查询路径

### 查询学生完整信息路径

```
student → sm_assess → sm_assess_detail → sm_question → sm_age_stage
student → weefim_assess → weefim_assess_detail → weefim_question → weefim_category
student → train_plan → train_plan_detail → task → task_category
student → train_plan → train_plan_detail → train_log → user
```

### 查询任务完整信息路径

```
task → task_category
task → task_level → task_step
task → train_plan_detail → train_plan → student
task → train_plan_detail → train_log
```

## 数据完整性约束

### 级联删除（CASCADE）

- `student` 被删除时，删除其所有：
  - S-M 评估记录
  - WeeFIM 评估记录
  - 训练计划（及所有详情和训练记录）

- `sm_assess` 被删除时，删除其所有详情记录

- `weefim_assess` 被删除时，删除其所有详情记录

- `train_plan` 被删除时，删除其所有详情记录

- `task` 被删除时，删除其所有难度等级和步骤

### 置空删除（SET NULL）

- `user` 被删除时：
  - `sm_assess.assessor_id` 置空
  - `weefim_assess.assessor_id` 置空

这些设计确保删除用户不会删除重要的业务数据，但评估记录会保留。

### 检查约束（CHECK）

以关联特定难度等级

- **外键**: `task_step.level_id` → `task_level.id`
- **约束**: 无级联删除
- **业务含义**: 不同难度等级可能有不同的步骤说明

## 常用查询路径

### 查询学生完整信息路径

```
student → sm_assess → sm_assess_detail → sm_question → sm_age_stage
student → weefim_assess → weefim_assess_detail → weefim_question → weefim_category
student → train_plan → train_plan_detail → task → task_category
student → train_plan → train_plan_detail → train_log → user
```

### 查询任务完整信息路径

```
task → task_category
task → task_level → task_step
task → train_plan_detail → train_plan → student
task → train_plan_detail → train_log
```

## 数据完整性约束

### 级联删除（CASCADE）

- `student` 被删除时，删除其所有：
  - S-M 评估记录
  - WeeFIM 评估记录
  - 训练计划（及所有详情和训练记录）

- `sm_assess` 被删除时，删除其所有详情记录

- `weefim_assess` 被删除时，删除其所有详情记录

- `train_plan` 被删除时，删除其所有详情记录

- `task` 被删除时，删除其所有难度等级和步骤

### 置空删除（SET NULL）

- `user` 被删除时：
  - `sm_assess.assessor_id` 置空
  - `weefim_assess.assessor_id` 置空

这些设计确保删除用户不会删除重要的业务数据，但评估记录会保留。

### 检查约束（CHECK）

- `user.role` 必须是 'admin' 或 'teacher'
- `student.gender` 必须是 '男' 或 '女'
- `train_plan.status` 默认为 'active'，可以是 'completed' 或 'paused'
- `weefim_category.category_type` 必须是 'motor' 或 'cognitive'
