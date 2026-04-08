# 2026-04-08 Care Scene Immersive Refactor Plan

> 文档类型：专题改造方案
> 适用范围：`emotional / care_scene`
> 目标：将“表达关心训练”改造成与“情绪与场景训练”一致的沉浸式全屏体验，但不误把两者的数据结构强行做成同一种题库

## 1. 结论先行

**建议在“情绪与场景训练”沉浸式改造完成、通过运行时验收后，再启动“表达关心训练”的沉浸式改造。这个顺序是合理的。**

原因：

- `emotion_scene` 新链路已经跑通了原型数据层、状态机、全屏 UI 和动态答题交互，适合作为沉浸式训练底座的第一条验证链
- `care_scene` 当前仍运行在旧 `EmotionalInteractionEngine` 上，交互语义、数据结构和反馈层次与 `emotion_scene` 并不完全同构
- 如果两条链同时推进，会把“底座问题”和“模块专属问题”混在一起，增加回归范围和调试成本
- 先把 `emotion_scene` 验收通过，可以沉淀一套更稳定的沉浸式运行时边界；之后改 `care_scene` 时，重点就能落在“如何适配表达关心语义”，而不是继续反复修训练底座

## 2. 当前代码现实

截至 2026-04-08，仓库中的两条训练链状态不同：

### 2.1 `emotion_scene`

- 已切入新的沉浸式原型链
- 当前主入口：
  - `src/views/emotional/EmotionSceneTraining.vue`
- 当前核心实现：
  - `src/components/training/*`
  - `src/stores/useTrainingStore.ts`
  - `src/db/*`
- 已具备：
  - 全屏场景页
  - 引导页
  - Step 1~4 动态答题
  - 正误反馈
  - `feedback_text` 中央提示
- 当前仍缺：
  - Step 5 结算页
  - 正式 TTS 后端接线
  - 正式 SFX 资产
  - 主线记录闭环

### 2.2 `care_scene`

- 仍在旧情绪交互引擎链路中
- 当前主入口：
  - `src/views/emotional/CareExpressionTraining.vue`
- 当前核心实现：
  - `src/components/emotional/engine/EmotionalInteractionEngine.vue`
  - `src/features/emotional/adapters/compileCareScene.ts`
  - `src/components/emotional/engine/renderers/CareUtteranceRenderer.vue`
- 当前数据主模型仍是：
  - `CareSceneResourceMeta`
- 当前训练语义包含：
  - 表达者视角的话术选择
  - 接收者视角的舒适度判断
  - `acceptable` 与 `correct` 的层次

**因此，当前真实状态不是“两个子模块已经共享同一套沉浸式底座”，而是“`emotion_scene` 已进入新链路，`care_scene` 仍在旧链路”。**

## 3. 设计原则

本次 `care_scene` 改造应遵循以下原则：

1. **统一体验，不强行统一题库结构**
   - 目标是把 `care_scene` 做成与 `emotion_scene` 一样的沉浸式训练体验
   - 不是把 `care_scene` 生硬塞进 `emotion / reason / need / response` 四步模型

2. **优先抽象“沉浸式训练运行时”，再接 `care_scene`**
   - 沉浸式页面壳、题干展示、选项交互、反馈提示、结算页应尽量成为模块无关的运行时能力
   - `care_scene` 通过适配器把自身数据编译成运行时步骤

3. **保留 `care_scene` 的训练语义层次**
   - 不能因为迁移到沉浸式 UI，就把“最佳表达 / 可接受表达 / 不合适表达”压扁成简单二元正误

4. **迁移期允许双链并存**
   - 在沉浸式 `care_scene` 链路未验证通过前，不应过早删掉旧 `EmotionalInteractionEngine` 版本

## 4. 目标形态

改造完成后，`care_scene` 应具备以下用户可见体验：

1. 进入全屏沉浸式训练页
2. 显示完整场景图、角色关系和引导信息
3. 用大字号题干和大卡片选项完成单屏单任务训练
4. 每步选择后展示高对比度反馈文案
5. 支持正向鼓励、可接受反馈、重试引导
6. 答完后进入真正的结算页

## 5. 推荐的训练步骤模型

不建议把 `care_scene` 强行塞进当前 `emotion_scene` 的 4 步表结构。

推荐把 `care_scene` 沉浸式流程定义为：

### Step 0 引导观察

- 展示场景图
- 说明“现在这位小朋友/家人怎么了”
- 给出进入训练按钮

### Step 1 对方现在更像什么感受

- 数据来源：
  - `receiverEmotion`
  - `emotionChips`
- 目标：
  - 把旧链路中“先选 emotion chip”的辅助手段升级为正式训练步骤

### Step 2 我应该怎么表达关心

- 数据来源：
  - `utterances`
  - `preferredUtteranceIds`
- 反馈分层：
  - `preferred` -> 最佳
  - `advice` / 特定非最佳项 -> 可接受
  - 其余 -> 需要重试

### Step 3 对方听起来最舒服的是哪句

- 数据来源：
  - `receiverOptions`
- 目标：
  - 保留 `care_scene` 最重要的换位思考训练

### Step 4 结算页

- 展示：
  - 本次星级 / 完成情况
  - 话术偏好结果
  - 是否更偏向“共情 / 建议 / 行动”
  - 再来一次 / 返回选择页

## 6. 技术改造方案

### 6.1 先抽“通用沉浸式训练运行时”

当前 `src/stores/useTrainingStore.ts` 明显偏 `emotion_scene` 专用，主要问题：

- `step_type` 被硬编码为 `emotion | reason | need | response`
- 结果判定默认按单一 `is_correct`
- 没有正式承载 `acceptable` 的状态

建议改造为更通用的运行时模型，例如：

- `variant: 'emotion_scene' | 'care_scene'`
- `stepType` 扩展支持：
  - `emotion`
  - `reason`
  - `need`
  - `response`
  - `care_emotion`
  - `care_utterance`
  - `receiver_preference`
- `optionOutcome` 支持：
  - `correct`
  - `acceptable`
  - `retry`

### 6.2 不建议为 `care_scene` 复制一套新的 SQL 原型库

对 `care_scene`，更合适的是增加一层适配器：

- 新增：
  - `src/features/emotional/immersive/compileCareSceneImmersive.ts`

职责：

- 输入 `CareSceneResourceMeta`
- 输出沉浸式运行时可消费的统一步骤数据

这样可以避免：

- 再造一套 `src/db/` 平行 schema
- 把旧资源模型复制成第二套结构
- 将 `care_scene` 原有的 `acceptable / preferred / receiver reaction` 语义在迁移中丢掉

### 6.3 组件层复用策略

可以直接复用的部分：

- `TrainingLayout.vue`
- `SceneIntroStep.vue`
- `QuestionPresenter.vue`
- `QuestionStep.vue`
- `feedback_text` 中央提示气泡
- 结算页框架（待 `emotion_scene` 先补完）

需要按 `care_scene` 增补或扩展的部分：

- 新增一个更适合“情绪 chip”的选项组件，或轻量改造 `ImageOptionCard`
- 让 `TextOptionBlock` 支持展示：
  - 话术类型标签（共情 / 建议 / 行动）
  - 接收者反应摘要
  - `acceptable` 的中间态反馈样式

### 6.4 结果反馈策略

`care_scene` 不建议只保留“红/绿两态”，推荐三态：

- `correct`
  - 最舒服 / 最贴心 / 最适合当下对方状态
- `acceptable`
  - 不是最优，但仍可接受
- `retry`
  - 不够体贴 / 不合适 / 没接住对方感受

UI 层建议：

- `correct`：绿色
- `acceptable`：黄色 / 橙黄色
- `retry`：橙红或柔和红

### 6.5 记录与结算

在沉浸式 `care_scene` 改造时，记录层至少要保住：

- 场景 ID
- 每一步选了什么
- 是否 `correct` / `acceptable`
- 提示层级
- 重试次数
- 偏好话术类型
- 接收者视角判断结果

结算页建议额外输出：

- 本次更偏向：
  - 共情式
  - 建议式
  - 行动式
- 哪一步容易偏差：
  - 感受判断
  - 说什么
  - 从对方角度理解

## 7. 推荐实施顺序

### 阶段 A：先完成 `emotion_scene` 当前收尾

前置完成条件：

- Step 5 结算页落地
- 关键训练流程可完整跑通
- 用户完成一次完整的实际训练验收

### 阶段 B：抽通用沉浸式运行时

第一个动作：

- 把 `useTrainingStore.ts` 从 `emotion_scene` 专用改为可承载多变体 step 模型

目标：

- 让底座不再假设所有训练都等于固定四步

### 阶段 C：实现 `care_scene -> immersive steps` 适配器

第一个动作：

- 新增 `compileCareSceneImmersive.ts`

目标：

- 不改旧页面，先把 `CareSceneResourceMeta` 成功编译成沉浸式步骤数据

### 阶段 D：新建沉浸式 `CareExpressionTraining` 页面

第一个动作：

- 在新页面中复用 `TrainingLayout` / `QuestionStep` 跑通 intro + 3 步训练

目标：

- 让 `care_scene` 新链路可以脱离 `EmotionalInteractionEngine` 单独运行

### 阶段 E：补记录、结算与入口切换

第一个动作：

- 接入结算页与训练完成动作

目标：

- 形成从 intro 到 summary 的完整闭环
- 通过验收后再替换默认入口

## 8. 验收标准

改造完成后，应至少满足以下标准：

1. 能从 `care-expression/select` 进入全屏沉浸式训练页
2. 能正确显示 `care_scene` 场景图和角色信息
3. 能跑通：
   - 引导页
   - 感受判断
   - 关心表达选择
   - 接收者舒适度判断
   - 结算页
4. `preferred` 与 `acceptable` 在反馈和统计层面可区分
5. `feedback_text` 或等价反馈文案可稳定展示
6. 改造完成前，旧 `EmotionalInteractionEngine` 版本可回退
7. 验收通过后，才考虑替换默认入口

## 9. 风险与注意事项

1. **不要把 `care_scene` 硬塞进现有四步原型表**
   - 否则后续会不断出现“字段对不上但 UI 先硬凑”的技术债

2. **不要在 `emotion_scene` 尚未验收时并行大改 `care_scene`**
   - 否则训练底座缺陷和模块语义缺陷会混在一起

3. **不要丢掉 `acceptable` 这一层**
   - 这是表达关心训练区别于普通正误题的关键教学价值

4. **不要过早替换默认入口**
   - 沉浸式 `care_scene` 未通过真实交互验收前，应保留旧链路兜底

## 10. 本文档对应的下一步

当前建议执行顺序：

1. 先完成 `emotion_scene` 沉浸式改造收尾并完成验收
2. 验收通过后，再以本文档为实施蓝图启动 `care_scene` 沉浸式改造

**结论：你提出的顺序是合理的，而且是当前代码状态下更稳的做法。**
