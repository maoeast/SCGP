# 情绪场景 JSON 导入规范

适用文件：
- [emotion_scene_import_template.json](/E:/VSC/H5/SIC-ADS/docs/references/emotion_scene_import_template.json)

## 1. 当前正式支持的 8 类情绪

`targetEmotion` 与 `emotionOptions` 现在正式支持以下 8 个枚举值：

- `calm`
- `happy`
- `sad`
- `angry`
- `scared`
- `embarrassed`
- `shy`
- `proud`

对应分类如下：

- `calm` = 平静 / Calm
- `happy` = 开心 / Happy
- `sad` = 难过 / Sad
- `angry` = 生气 / Angry
- `scared` = 害怕 / Scared
- `embarrassed` = 尴尬 / Embarrassed
- `shy` = 害羞 / Shy
- `proud` = 自豪 / Proud

兼容说明：

- 历史误写 `anger` 在导入和运行时会被兼容归一化为 `angry`
- 新模板与新增资源应统一使用正式值 `angry`

## 2. 顶层结构

文件必须是一个 JSON 数组：

```json
[
  {
    "sceneCode": "emotion_scene_demo_001",
    "title": "场景名称"
  }
]
```

每个对象代表 1 条 `emotion_scene` 资源。

## 3. 必填字段

每条场景至少需要完整填写：

- `sceneCode`
- `title`
- `imageUrl`
- `difficultyLevel`
- `targetEmotion`
- `emotionOptions`
- `emotionClues`
- `prompts`
- `solutions`

## 4. 字段规则

### 4.1 `sceneCode`

- 必须唯一
- 建议格式：`emotion_scene_xxx_001`
- 后续导入更新依赖 `sceneCode`

### 4.2 `title`

- 用作资源标题
- 也会写入 `meta_data.title`

### 4.3 `imageUrl`

- 可填资源路径、相对路径或 `resource://` 路径
- 暂时没有图片时可填空字符串 `""`

### 4.4 `difficultyLevel`

只能是：

- `1`
- `2`
- `3`

### 4.5 `targetEmotion`

只能填写 8 类正式枚举之一：

- `calm`
- `happy`
- `sad`
- `angry`
- `scared`
- `embarrassed`
- `shy`
- `proud`

### 4.6 `emotionOptions`

- 必须是数组
- 每个值都必须来自上述 8 个正式枚举
- 必须包含 `targetEmotion`

推荐写法：

```json
["calm", "happy", "sad", "angry", "scared", "embarrassed", "shy", "proud"]
```

### 4.7 `emotionClues`

- 建议至少 2 条
- 每条都是字符串
- 优先写“看得见”的线索，不写抽象诊断

### 4.8 `prompts`

至少 1 题，建议 2 题以上，可使用：

- `cause`
- `need`
- `empathy`

每个 `prompt` 必须包含：

- `questionId`
- `questionType`
- `questionText`
- `options`

### 4.9 `prompts[].options`

每个选项必须包含：

- `id`
- `text`
- `isCorrect`
- `feedbackText`

可选：

- `imageUrl`
- `isAcceptable`

规则：

- 每题必须且只能有 1 个 `isCorrect: true`
- `isAcceptable` 可选

### 4.10 `solutions`

至少 2 个，建议 3 个：

- 1 个 `optimal`
- 1 个 `acceptable`
- 1 个 `inappropriate`

每个方案必须包含：

- `id`
- `text`
- `suitability`
- `explanation`

可选：

- `imageUrl`

## 5. 可选字段

以下字段可选：

- `recommendedHintCeiling`
- `ageRange`
- `abilityLevel`
- `tags`

其中：

- `recommendedHintCeiling` 只能是 `0/1/2/3`
- `abilityLevel` 只能是 `primary` / `middle` / `advanced`

## 6. 导入校验口径

当前导入链路会校验：

- `targetEmotion` 是否属于正式 8 类枚举
- `emotionOptions` 是否全部合法
- `emotionOptions` 是否包含 `targetEmotion`
- 推理题与解决方案结构是否完整

如果提供非法情绪值，导入预览会直接阻断，不再默默降级成默认值。
