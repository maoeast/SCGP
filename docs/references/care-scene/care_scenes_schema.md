# Care Scenes Database (care_scenes_database.json) 数据结构说明文档

**致 AI 编程助手：**
本文档旨在为你解析 `care_scenes_database.json` 的内部数据结构与业务逻辑。这是一套专为儿童（特别是患有 ASD、ADHD 等特殊需求儿童）设计的“社会情绪学习 (SEL)”与“同理心关怀训练”数据库。在进行前端 UI 渲染、组件开发和交互逻辑编写时，请严格参考本数据字典。

---

## 1. 顶层数据结构 (Scene Object)
JSON 文件是一个数组，每个元素代表一个独立的“社交关怀训练场景”。

| 字段名 | 类型 | 说明 (用途/业务逻辑) |
| :--- | :--- | :--- |
| `sceneCode` | String | **场景唯一标识符**。可用于路由传参、组件 Key 或数据库主键 (例: `"care-scene-1"`)。 |
| `name` | String | **当事人名字**。场景中需要被关怀的主角的称呼（如 `"小明"`, `"妈妈"`），可用于在 UI 中进行个性化的动态文本渲染。 |
| `title` | String | **场景标题**。简明扼要的事件描述，适合作为前端页面的 Header。 |
| `description` | String | **教育大纲指引**。遵循“识别...理解...通过...”的特教行动公式。**前端用途**：适合作为给家长或老师看的“辅导提示(Tips)”或“本关训练目标”渲染在页面边缘或提示框中。 |
| `imageUrl` | String | **场景插图路径**。对应前端的静态资源目录，用于情境导入。 |
| `difficultyLevel` | Number | **难度评级 (1-3)**。1=基础生理/安全需求，2=复杂社交羞耻，3=抽象道德与创伤。可用于前端的关卡锁解锁逻辑。 |
| `careType` | String | **关怀类型**。如 `"action"`(行动), `"empathy"`(共情), `"advice"`(建议)。表示该场景最佳的干预策略倾向。 |
| `ageRange` | String | **适宜年龄段**。例如 `"7-12"`，可用于前端课程筛选。 |
| `abilityLevel` | String | **能力要求评级**。例如 `"primary"`, `"middle"`, `"advanced"`。 |
| `tags` | Array<String> | **业务标签**。包含场景特征（如 `"感官超载"`, `"化解尴尬"`），可用于前端的分类检索。 |

---

## 2. 情绪属性体系 (Emotion Matrix)
这一块是特教训练的核心，采用了“情绪分区 (Zones of Regulation)” 和 “细颗粒度标签” 结合的设计。

| 字段名 | 类型 | 说明 (用途/业务逻辑) |
| :--- | :--- | :--- |
| `receiverEmotion` | String | **底层基本情绪**。仅包含 `sad`, `scared`, `embarrassed`, `angry`。用于系统大类划分。 |
| `emotionColorToken` | String | **情绪色彩区标识**。`blue`(低能量), `red`(高能量警报), `yellow`(社交焦虑)。**前端用途**：可直接用于绑定 UI 主题色（如：红区背景变红、警告音效）。 |
| `emotionColorLabel` | String | **色彩区中文名**。如 `"红区"`, `"蓝区"`。 |
| `specificEmotionToken` | String | **细分情绪英文字段**。例如 `"exhausted"`, `"sensory_overload"`，供程序作为枚举值调用。 |
| `specificEmotionLabel` | String | **细分情绪中文名**。例如 `"极度疲惫"`, `"感官超载/生理痛苦"`。代表当事人当下最精准的心理状态。 |

---

## 3. 情境视角 (Perspectives)
用于引导儿童代入角色的文案。

| 字段名 | 类型 | 说明 (用途/业务逻辑) |
| :--- | :--- | :--- |
| `speakerPerspectiveText` | String | **施救者视角（旁观者）**。向孩子描述客观发生了什么，以及抛出问题：“你应该怎么做？”。用于场景导入。 |
| `receiverPerspectiveText` | String | **受难者视角（同理心引导）**。引导孩子进行角色互换思考（“想象一下如果是你...”）。非常关键的特教共情训练语料。 |

---

## 4. 互动题型一：情绪识别 (Emotion Identification)
针对孩子辨别他人情绪能力的互动测试。

| 字段名 | 类型 | 说明 (用途/业务逻辑) |
| :--- | :--- | :--- |
| `emotionOptions` | Array<Object> | **包含 4 个情绪选项的数组**。已经过混淆(Shuffle)和特教算法处理（必定包含1正确、1绿区干扰、2其他负面区干扰）。**前端用途**：直接渲染为 4 个单选按钮。 |
| `emotionOptions[].text` | String | 选项显示的文本（如 `"开心/喜悦"` 或 `"极度疲惫"`）。 |
| `emotionOptions[].isCorrect` | Boolean | `true` 为正确答案，`false` 为干扰项。用于前端校验。 |
| `emotionOptions[].feedbackText` | String | **纠偏反馈文案**。**前端交互逻辑**：当孩子点击选项后，无论对错，都应通过弹窗、Toast或提示框展示这句话。如果选错，文案会温柔地引导他们继续思考。 |

---

## 5. 互动题型二：话术与行动选择 (Action & Utterance Choices)
模拟真实的应对策略，让孩子选择怎么“说”或怎么“做”。

| 字段名 | 类型 | 说明 (用途/业务逻辑) |
| :--- | :--- | :--- |
| `utterances` | Array<Object> | **包含 3 种应对方式的数组**。通常包含一句好话、一句坏话（或风凉话）、一个好行动。 |
| `utterances[].id` | String | 话术的唯一 ID（如 `"u1"`）。 |
| `utterances[].type` | String | 话术类型：`"action"`, `"empathy"`, `"advice"`。 |
| `utterances[].text` | String | **应对文案**。即孩子可以选择“对朋友说的话”或“做的事”。 |
| `utterances[].effect` | String | **特教解析（行为功能分析）**。解释这句话为什么好，或者为什么会带来伤害。**前端用途**：选定后展示给孩子看的“原理讲解”。 |
| `utterances[].receiverReactionText` | String | **对方的反应文案**。模拟真实的社交反馈（如感动、大哭、发火）。 |
| `utterances[].receiverReactionEmoji` | String | **对方反应的表情包**。配合反应文案使用。 |
| `preferredUtteranceIds` | Array<String> | **优选答案的 ID 列表**。例如 `["u2", "u3"]`。在 `utterances` 数组中，只有 `id` 包含在此数组内的，才是正确的关怀方式。用于前端的答题判分。 |

---

## 6. 互动题型三：接收者体验反馈 (Receiver Options)
评估孩子是否知道“什么样的行为能真正带来安慰”。

| 字段名 | 类型 | 说明 (用途/业务逻辑) |
| :--- | :--- | :--- |
| `receiverOptions` | Array<Object> | **包含 2 个选项的数组**。一个带来安慰，一个造成二次伤害。 |
| `receiverOptions[].id` | String | 选项 ID。 |
| `receiverOptions[].text` | String | **行为描述**（如“同学跑过来嘲笑我”）。 |
| `receiverOptions[].isComforting` | Boolean | `true` 代表这是令人感到安慰的好行为。用于前端判断正确与否。 |
| `receiverOptions[].reasonText` | String | **解析文本**。解释为什么这个行为能带来安全感，或者为什么会让人更绝望。 |

---

### 💡 AI 助手前端开发建议：
1. **防爆框设计**：文本字段（如 `effect`, `description`）字数较多，在设计卡片或气泡组件时，请务必预留足够的弹性空间或使用滚动条。
2. **色彩映射 (Color Mapping)**：强烈建议在代码中建立全局的颜色映射表，读取 `emotionColorToken`，为不同情绪场景动态替换背景主色调，增强儿童的“情绪色彩感知”能力。
3. **分步交互**：鉴于特需儿童可能存在“注意力缺陷”，不要将所有题目一次性平铺。建议采用**分步式的向导设计 (Wizard Pattern)**：
   * Step 1: 场景导入 -> Step 2: 选情绪选项 -> Step 3: 选怎么说 (Utterances) -> Step 4: 结果反馈。