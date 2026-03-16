# 情绪行为调节模块数据设计

## 1. 设计目标

本设计文档用于明确情绪行为调节模块在 SCGP 中的数据落地方式，包括资源内容建模、训练会话记录、明细追踪、统计汇总和报告支撑结构。

设计目标：

1. 尽量复用现有资源与记录体系。
2. 保证情绪模块数据可统计、可扩展、可离线保存。
3. 避免把全部业务语义塞进 `raw_data` 导致后续查询困难。
4. 为首期 MVP 和后续 80+/60+ 场景扩展预留空间。

## 2. 当前可复用的数据基础

当前项目已有：

1. `sys_training_resource`
   - 适合存放模块资源
   - 已支持 `module_code`、`resource_type`、`meta_data`
2. `training_records`
   - 适合存放训练会话级别记录
   - 已支持 `module_code` 和 `raw_data`
3. `report_record`
   - 适合挂接模块级报告入口
4. 现有 `ResourceAPI` / `GameTrainingAPI`
   - 可作为扩展基础

## 3. 设计结论

推荐采用“资源表复用 + 会话主表复用 + 情绪模块明细表新增”的混合方案。

原因：

1. 资源内容本身和现有 `sys_training_resource` 模型天然匹配。
2. 会话层可以继续复用 `training_records`，便于纳入现有训练统计和模块计数。
3. 题目级、提示级、视角级明细不适合只放在 `raw_data` 中，否则后续趋势图和筛选查询会非常痛苦。

## 4. 资源内容模型

## 4.1 资源主表复用

继续使用 `sys_training_resource`，推荐：

- `module_code = 'emotional'`
- `resource_type = 'emotion_scene' | 'care_scene'`

公共字段建议：

- `name`
- `category`
- `description`
- `cover_image`
- `is_custom`
- `is_active`
- `meta_data`

## 4.2 `emotion_scene` 元数据结构

建议 `meta_data` 示例：

```json
{
  "sceneCode": "scene_birthday_001",
  "targetEmotion": "happy",
  "emotionOptions": ["happy", "sad", "embarrassed", "angry", "afraid"],
  "emotionClues": [
    "人物在笑",
    "周围有蛋糕和礼物"
  ],
  "prompts": [
    {
      "id": "p1",
      "type": "cause",
      "question": "他为什么会开心？",
      "options": ["因为今天过生日", "因为东西丢了", "因为被批评了"],
      "correctOption": 0,
      "acceptableOptions": []
    }
  ],
  "solutions": [
    {
      "id": "s1",
      "label": "对他说生日快乐",
      "rank": "best",
      "explanation": "这样会让对方感到被祝福和被关注。"
    }
  ],
  "difficultyLevel": 1,
  "ageRange": "6-9",
  "abilityLevel": "primary",
  "tags": ["生日", "开心", "社交回应"]
}
```

## 4.3 `care_scene` 元数据结构

建议 `meta_data` 示例：

```json
{
  "sceneCode": "care_exam_fail_001",
  "speakerPerspectiveText": "朋友考试没考好，看起来很难过。",
  "receiverPerspectiveText": "如果你考差了，你更希望别人怎么对你说？",
  "utterances": [
    {
      "id": "u1",
      "type": "empathy",
      "text": "我知道你现在很难过。",
      "effect": "这句话先接住了对方的情绪，容易让人觉得被理解。"
    },
    {
      "id": "u2",
      "type": "suggestion",
      "text": "我们一起整理错题吧。",
      "effect": "这句话提供了帮助方向，但最好先确认对方愿不愿意。"
    },
    {
      "id": "u3",
      "type": "action",
      "text": "我陪你坐一会儿。",
      "effect": "这是一种陪伴型支持，适合对方暂时不想说太多的时候。"
    }
  ],
  "preferredUtteranceIds": ["u1", "u3"],
  "difficultyLevel": 2,
  "ageRange": "8-12",
  "abilityLevel": "middle",
  "tags": ["考试失利", "安慰", "共情"]
}
```

## 5. 训练记录设计

## 5.1 会话主记录

继续复用 `training_records`。

建议映射：

- `student_id`: 学生 ID
- `task_id`: 对应资源的 `legacy_id` 或资源映射 ID
- `timestamp`: 会话开始时间
- `duration`: 本次训练总时长
- `accuracy_rate`: 会话正确率
- `avg_response_time`: 平均响应时间
- `module_code`: 固定为 `emotional`
- `raw_data`: 存放会话摘要 JSON

建议 `raw_data` 只存摘要，而不是所有细节：

```json
{
  "subModule": "emotion_scene",
  "resourceId": 101,
  "resourceType": "emotion_scene",
  "correctCount": 4,
  "questionCount": 6,
  "hintCount": 2,
  "retryCount": 1,
  "dominantChoiceType": null,
  "preferredPerspective": null
}
```

## 5.2 明细表设计

建议新增两张表。

### 表一：`emotional_training_session`

用途：

- 记录情绪模块会话摘要
- 与 `training_records` 一一对应

建议字段：

- `id`
- `training_record_id`
- `student_id`
- `module_code`
- `sub_module`：`emotion_scene` / `care_expression`
- `resource_id`
- `resource_type`
- `start_time`
- `end_time`
- `duration_ms`
- `question_count`
- `correct_count`
- `accuracy_rate`
- `hint_count`
- `retry_count`
- `completion_status`
- `created_at`

### 表二：`emotional_training_detail`

用途：

- 记录逐题行为数据
- 支撑精细化报表和问题复盘

建议字段：

- `id`
- `session_id`
- `student_id`
- `resource_id`
- `step_type`
  - `emotion_choice`
  - `reasoning_question`
  - `solution_choice`
  - `care_utterance`
  - `receiver_preference`
- `step_index`
- `prompt_id`
- `selected_value`
- `selected_label`
- `is_correct`
- `is_acceptable`
- `hint_level`
- `retry_count`
- `response_time_ms`
- `feedback_code`
- `perspective`
- `created_at`

## 6. 统计口径设计

## 6.1 基础统计指标

建议支持：

1. 情绪识别正确率
2. 社交推理正确率
3. 问题解决最佳方案命中率
4. 关心话术偏好分布
5. 表达者视角表现
6. 接收者视角表现
7. 平均用时
8. 平均提示次数
9. 场景类别掌握情况

## 6.2 报告查询建议

报告页应优先基于结构化明细表查询，而不是在前端遍历 `raw_data`。

建议为以下维度设计 SQL 查询：

1. 按学生统计最近 7 天 / 30 天正确率趋势
2. 按子模块统计正确率
3. 按情绪类型统计识别效果
4. 按场景分类统计掌握度
5. 按话术类型统计选择偏好
6. 按视角统计表现差异

## 7. 与现有表的关系

建议关系：

```text
sys_training_resource
  -> emotional scenes / care scenes

training_records
  -> 会话级总记录

emotional_training_session
  -> 情绪模块会话摘要

emotional_training_detail
  -> 情绪模块逐题明细

report_record
  -> 情绪模块报告入口记录
```

## 8. 方案对比

### 8.1 方案 A：全部复用 `training_records.raw_data`

优点：

1. 开发改动最小
2. 首期上线速度快

缺点：

1. 报表统计困难
2. 按提示等级、题型、视角分析成本高
3. 未来数据迁移成本更高

### 8.2 方案 B：新增结构化明细表

优点：

1. 统计查询稳定
2. 报告能力更强
3. 更适合 80+/60+ 场景扩展

缺点：

1. 初期建模和迁移工作量更大

### 8.3 推荐方案

推荐方案：

1. 会话总览继续写入 `training_records`
2. 细节同时写入 `emotional_training_session` 和 `emotional_training_detail`
3. 报表优先读结构化表

这是当前项目里兼顾兼容性和后续可维护性的方案。

## 9. 报告数据模型建议

为了让 `report_record` 能挂接情绪模块报告，建议扩展：

- `report_type` 新增 `emotional`
- `module_code` 写入 `emotional`
- `title` 规则示例：`张三 - 情绪行为调节训练报告`

同时情绪模块报告页面应支持按学生动态生成，而不是依赖单次训练导出后才可查看。

## 10. 首期落地建议

首期建议最少做以下数据工作：

1. 在 `sys_training_resource` 中定义 `emotion_scene` 和 `care_scene`
2. 扩展 `training_records` 写入 `module_code = 'emotional'`
3. 新增 `emotional_training_session`
4. 新增 `emotional_training_detail`
5. 新增对应 API
6. 新增情绪模块报告查询接口
