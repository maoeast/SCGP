# 情绪调节资源包 Excel 模板填写说明

> **文档类型**: 使用说明  
> **适用对象**: 教师、教研人员、资源整理人员  
> **适用范围**: SCGP `emotional` 模块资源包 Excel 导入模板  
> **对应能力**: `emotion_scene` / `care_scene` 资源批量导入  
> **最后更新**: 2026-03-18

## 1. 这份模板是做什么的

这份 Excel 模板用于批量整理并导入 SCGP 情绪调节模块资源。

支持两类资源：

- `emotion_scene`：情绪与场景
- `care_scene`：表达关心

导入时，系统会把 Excel 多个 Sheet 的内容重新组装成系统内部的结构化 JSON，并写入 `sys_training_resource.meta_data`。

## 2. 填写前先记住这几条

### 2.1 主关联键

Excel 模板中最重要的关联字段是：

- `sceneCode`
- `questionId`
- `optionId`
- `solutionId`
- `utteranceId`

其中：

- `sceneCode` 是整套场景资源的主键
- 其他 ID 用于把子表中的题目、选项、方案、话术重新挂回对应场景

如果这些编号填写错误，系统会无法正确组装资源。

### 2.2 多值字段分隔符

以下字段如果要填写多个值，请使用：

```text
值1 | 值2 | 值3
```

不要使用中文顿号 `、` 或分号。

当前模板中常见的多值字段：

- `tags`
- `emotionOptions`
- `emotionClues`
- `preferredUtteranceIds`

### 2.3 自动补默认值 ≠ 建议留空

有些字段系统支持自动补默认值，但这只是为了避免导入程序崩溃，不代表留空后内容一定符合教学语义。

建议原则：

- 能明确填写的字段尽量填写
- 只有明确标注“可自动生成/自动补默认”的字段才可考虑留空
- `sceneCode`、题目文字、选项文字、反馈说明、话术文字等关键业务字段不要依赖自动补全

## 3. Sheet 总览

模板包含以下 Sheet：

1. `resources`
2. `emotion_prompts`
3. `emotion_prompt_options`
4. `emotion_solutions`
5. `care_utterances`
6. `care_receiver_options`
7. `README`

其中：

- `resources` 是主表，所有资源都必须先在这里有一行
- 其他表是子表，用来补充嵌套结构
- `README` 仅用于说明，不参与导入

## 4. resources 主表说明

`resources` 是必须填写的主表，每一行代表一个情绪资源。

### 4.1 通用字段

| 字段 | 含义 | 是否必填 | 可否为空 | 是否支持自动生成/默认 | 填写建议 |
|---------|---------|---------|---------|---------|---------|
| `resourceType` | 资源类型 | 必填 | 不可为空 | 不支持 | 只能填 `emotion_scene` 或 `care_scene` |
| `sceneCode` | 场景唯一编码 | 必填 | 不可为空 | 不支持 | 建议英文小写+下划线，如 `emotion_scene_birthday_001` |
| `name` | 资源名称 | 必填 | 不可为空 | 不支持 | 资源中心列表显示名称 |
| `title` | 场景标题 | 建议必填 | 可为空 | 可自动回退为 `name` | 建议与 `name` 一致或更口语化 |
| `category` | 资源分类 | 必填 | 不可为空 | 不支持 | 如 `peer_interaction`、`daily_life`、`peer_support` |
| `description` | 资源描述 | 选填 | 可为空 | 无 | 用一句话说明教学目标 |
| `coverImage` | 封面图/封面符号 | 选填 | 可为空 | 无 | 可以填 emoji、图片路径或留空 |
| `imageUrl` | 场景图片 URL | 选填 | 可为空 | 默认空字符串 | 当前可填 `resource://...`、相对路径或空 |
| `difficultyLevel` | 难度等级 | 建议必填 | 可为空 | 留空默认 `1` | 只能填 `1`、`2`、`3` |
| `recommendedHintCeiling` | 最大提示层级 | 选填 | 可为空 | 留空为无上限说明 | 只能填 `0`、`1`、`2`、`3` |
| `ageRange` | 适用年龄 | 选填 | 可为空 | 无 | 如 `6-9`、`8-12` |
| `abilityLevel` | 能力层级 | 选填 | 可为空 | 无 | 只能填 `primary`、`middle`、`advanced` |
| `tags` | 标签列表 | 选填 | 可为空 | 留空则为空数组 | 多个标签用 ` | ` 分隔 |

### 4.2 emotion_scene 专用字段

仅当 `resourceType = emotion_scene` 时填写：

| 字段 | 含义 | 是否必填 | 可否为空 | 是否支持自动生成/默认 | 填写建议 |
|---------|---------|---------|---------|---------|---------|
| `targetEmotion` | 目标情绪 | 强烈建议填写 | 可为空 | 留空默认 `happy` | 建议明确填写，避免语义错误 |
| `emotionOptions` | 可选情绪列表 | 选填 | 可为空 | 留空时系统会自动补 5 个基础情绪 | 多个值用 ` | ` 分隔 |
| `emotionClues` | 情绪线索列表 | 必填 | 不可为空 | 不支持 | 至少填写 1 条，建议 2-4 条 |

`targetEmotion` 允许值：

- `happy`
- `sad`
- `embarrassed`
- `angry`
- `scared`

### 4.3 care_scene 专用字段

仅当 `resourceType = care_scene` 时填写：

| 字段 | 含义 | 是否必填 | 可否为空 | 是否支持自动生成/默认 | 填写建议 |
|---------|---------|---------|---------|---------|---------|
| `careType` | 主导关心类型 | 建议填写 | 可为空 | 留空默认 `empathy` | 推荐明确填写 |
| `receiverEmotion` | 接收者情绪 | 建议填写 | 可为空 | 留空默认 `sad` | 推荐明确填写 |
| `speakerPerspectiveText` | 表达者视角提示语 | 必填 | 不可为空 | 不支持 | 写成老师/学生能直接读懂的话 |
| `receiverPerspectiveText` | 接收者视角提示语 | 必填 | 不可为空 | 不支持 | 写成“如果你是对方，你更希望……”这类引导语 |
| `preferredUtteranceIds` | 推荐话术 ID 列表 | 选填 | 可为空 | 留空时自动取前两条话术 ID | 多个值用 ` | ` 分隔 |

`careType` 允许值：

- `empathy`
- `advice`
- `action`

## 5. emotion_prompts 表说明

这个表只服务于 `emotion_scene`。

每一行代表一个社交推理问题。

| 字段 | 含义 | 是否必填 | 可否为空 | 是否支持自动生成/默认 | 填写建议 |
|---------|---------|---------|---------|---------|---------|
| `sceneCode` | 所属场景编码 | 必填 | 不可为空 | 不支持 | 必须和 `resources` 表中的 `sceneCode` 完全一致 |
| `questionId` | 问题编号 | 必填 | 不可为空 | 不支持 | 如 `prompt_1`、`birthday_cause_1` |
| `questionType` | 问题类型 | 建议填写 | 可为空 | 留空默认 `cause` | 推荐明确填写 |
| `questionText` | 问题文本 | 必填 | 不可为空 | 不支持 | 如“他为什么会这么开心？” |

`questionType` 允许值：

- `cause`
- `need`
- `empathy`

注意：

- 一个 `emotion_scene` 至少要有 1 个推理问题
- 只有在 `emotion_prompts` 和 `emotion_prompt_options` 配合完整时，该问题才会被正确导入

## 6. emotion_prompt_options 表说明

这个表只服务于 `emotion_scene`。

每一行代表某个推理问题的一个选项。

| 字段 | 含义 | 是否必填 | 可否为空 | 是否支持自动生成/默认 | 填写建议 |
|---------|---------|---------|---------|---------|---------|
| `sceneCode` | 所属场景编码 | 必填 | 不可为空 | 不支持 | 必须和主表一致 |
| `questionId` | 所属问题编号 | 必填 | 不可为空 | 不支持 | 必须和 `emotion_prompts.questionId` 对应 |
| `optionId` | 选项编号 | 必填 | 不可为空 | 不支持 | 如 `a1`、`n2` |
| `text` | 选项文字 | 必填 | 不可为空 | 不支持 | 写学生看到的选项内容 |
| `imageUrl` | 选项图片 | 选填 | 可为空 | 无 | 当前可不填 |
| `isCorrect` | 是否正确答案 | 必填 | 不建议为空 | 留空按 `false` 处理 | 每个问题必须且只能有 1 个 `true` |
| `isAcceptable` | 是否可接受答案 | 选填 | 可为空 | 留空按 `false` 处理 | 可用于温和接受的次优答案 |
| `feedbackText` | 反馈说明 | 必填 | 不可为空 | 不支持 | 写温和反馈，不要只写“错了” |

注意：

- 每个问题至少要有 2 个选项
- 每个问题必须且只能有 1 个 `isCorrect = 1/true`
- `isCorrect` 支持填写：
  - `1`
  - `0`
  - `true`
  - `false`
  - `yes`
  - `no`

实际使用时，建议统一填 `1` 或 `0`

## 7. emotion_solutions 表说明

这个表只服务于 `emotion_scene`。

每一行代表一个问题解决方案/回应方案。

| 字段 | 含义 | 是否必填 | 可否为空 | 是否支持自动生成/默认 | 填写建议 |
|---------|---------|---------|---------|---------|---------|
| `sceneCode` | 所属场景编码 | 必填 | 不可为空 | 不支持 | 必须和主表一致 |
| `solutionId` | 方案编号 | 必填 | 不可为空 | 不支持 | 如 `s1`、`s2` |
| `text` | 方案文字 | 必填 | 不可为空 | 不支持 | 学生要选择的应对方式 |
| `imageUrl` | 方案图片 | 选填 | 可为空 | 无 | 当前可不填 |
| `suitability` | 适宜性 | 建议填写 | 可为空 | 留空默认 `acceptable` | 建议明确填写 |
| `explanation` | 结果解释 | 必填 | 不可为空 | 不支持 | 说明这个回应为什么合适/不合适 |

`suitability` 允许值：

- `optimal`
- `acceptable`
- `inappropriate`

注意：

- 一个 `emotion_scene` 至少要有 1 个方案
- 最好至少有 1 个 `optimal`

## 8. care_utterances 表说明

这个表只服务于 `care_scene`。

每一行代表一条表达者视角的话术。

| 字段 | 含义 | 是否必填 | 可否为空 | 是否支持自动生成/默认 | 填写建议 |
|---------|---------|---------|---------|---------|---------|
| `sceneCode` | 所属场景编码 | 必填 | 不可为空 | 不支持 | 必须和主表一致 |
| `utteranceId` | 话术编号 | 必填 | 不可为空 | 不支持 | 如 `u1`、`u2` |
| `type` | 话术类型 | 建议填写 | 可为空 | 留空默认 `empathy` | 建议明确填写 |
| `text` | 话术文字 | 必填 | 不可为空 | 不支持 | 直接写教师希望学生练习的话 |
| `effect` | 效果说明 | 必填 | 不可为空 | 不支持 | 解释这句话会带来什么感受或效果 |
| `receiverReactionText` | 对方反应文字 | 选填 | 可为空 | 无 | 如“听到后会觉得被理解” |
| `receiverReactionEmoji` | 对方反应 emoji | 选填 | 可为空 | 无 | 如 `🙂`、`😌` |

`type` 允许值：

- `empathy`
- `advice`
- `action`

注意：

- 一个 `care_scene` 至少要有 1 条话术
- 如果 `preferredUtteranceIds` 有填写，必须引用这里真实存在的 `utteranceId`

## 9. care_receiver_options 表说明

这个表只服务于 `care_scene`。

每一行代表一条接收者视角选项。

| 字段 | 含义 | 是否必填 | 可否为空 | 是否支持自动生成/默认 | 填写建议 |
|---------|---------|---------|---------|---------|---------|
| `sceneCode` | 所属场景编码 | 必填 | 不可为空 | 不支持 | 必须和主表一致 |
| `optionId` | 选项编号 | 必填 | 不可为空 | 不支持 | 如 `r1`、`r2` |
| `text` | 选项文字 | 必填 | 不可为空 | 不支持 | 从“听起来最舒服的话”角度编写 |
| `isComforting` | 是否舒服/安慰性较强 | 建议填写 | 可为空 | 留空按 `false` 处理 | 建议统一用 `1` 或 `0` |
| `reasonText` | 原因说明 | 必填 | 不可为空 | 不支持 | 解释为什么这句话更舒服或不舒服 |

注意：

- 一个 `care_scene` 至少要有 1 条接收者选项
- 推荐至少有 1 条 `isComforting = 1`

## 10. README 表说明

`README` 表不会参与导入。

它只是模板内置说明页，用来提示：

- 当前 schemaVersion
- 可用 sheet 名称
- 多值字段分隔方式
- 冲突处理逻辑

老师填写资源时不需要修改这个 Sheet。

## 11. 哪些字段支持自动生成或自动补默认

以下字段在导入时支持自动补默认值：

| 字段 | 自动行为 |
|---------|---------|
| `title` | 留空时回退为 `name` |
| `difficultyLevel` | 留空时默认 `1` |
| `targetEmotion` | 留空时默认 `happy` |
| `emotionOptions` | 留空时自动补 5 个基础情绪，并确保包含目标情绪 |
| `careType` | 留空时默认 `empathy` |
| `receiverEmotion` | 留空时默认 `sad` |
| `preferredUtteranceIds` | 留空时默认取前 2 条话术 ID |
| `recommendedHintCeiling` | 留空时表示不额外限制 |
| `imageUrl`、`coverImage`、`ageRange`、`abilityLevel`、`receiverReactionText`、`receiverReactionEmoji` | 留空按空值处理 |

以下字段虽然系统内部能生成占位值，但**导入校验会把它们当作必须补齐的真实业务字段**：

- `sceneCode`
- `name`
- `category`
- `emotionClues`
- `questionId`
- `questionText`
- `optionId`
- `option text`
- `feedbackText`
- `solutionId`
- `solution text`
- `solution explanation`
- `speakerPerspectiveText`
- `receiverPerspectiveText`
- `utteranceId`
- `utterance text`
- `utterance effect`
- `receiver optionId`
- `receiver option text`
- `reasonText`

## 12. 常见填写错误

### 12.1 `sceneCode` 不一致

错误示例：

- `resources` 表里写 `emotion_scene_birthday_001`
- `emotion_prompts` 表里写成 `emotion_scene_birthday_01`

结果：

- 子表内容不会被正确挂到主资源上

### 12.2 一个问题没有且仅有一个正确答案

错误示例：

- 某个 `questionId` 下 2 个选项都填了 `isCorrect = 1`
- 或所有选项都填 `0`

结果：

- 导入会被阻塞

### 12.3 多值字段没有使用 ` | `

错误示例：

- `happy, sad, angry`
- `共情、安慰、陪伴`

建议：

- 统一写为 `happy | sad | angry`

### 12.4 把 `README` 当成数据表填写

结果：

- 不会报错，但也不会被导入

## 13. 推荐填写顺序

建议老师按以下顺序整理：

1. 先填写 `resources`
2. 如果是 `emotion_scene`，再填写：
   - `emotion_prompts`
   - `emotion_prompt_options`
   - `emotion_solutions`
3. 如果是 `care_scene`，再填写：
   - `care_utterances`
   - `care_receiver_options`
4. 最后检查：
   - `sceneCode` 是否一致
   - 所有 ID 是否唯一
   - 必填字段是否完整

## 14. 推荐命名示例

### emotion_scene

```text
resourceType: emotion_scene
sceneCode: emotion_scene_hospital_001
questionId: hospital_cause_1
optionId: h1
solutionId: s1
```

### care_scene

```text
resourceType: care_scene
sceneCode: care_scene_exam_fail_001
utteranceId: u1
optionId: r1
```

## 15. 导入前最终检查清单

- `resources` 表中每行都有 `resourceType / sceneCode / name / category`
- `emotion_scene` 资源都有：
  - `emotionClues`
  - 至少 1 个 `emotion_prompts`
  - 至少 2 个选项
  - 每题恰好 1 个正确答案
  - 至少 1 个 `emotion_solutions`
- `care_scene` 资源都有：
  - `speakerPerspectiveText`
  - `receiverPerspectiveText`
  - 至少 1 条 `care_utterances`
  - 至少 1 条 `care_receiver_options`
- 所有子表 `sceneCode` 都和主表一致
- 多值字段统一用 ` | ` 分隔

如果以上都满足，导入时通常就能顺利通过预检。
