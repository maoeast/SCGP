# 2026-04-08 Care Scene Immersive Execution Plan

> 文档类型：可执行阶段计划
> 适用范围：`emotional / care_scene`
> 前置条件：`emotion_scene` 沉浸式重构完成并通过运行时验收

## 1. 目标

在不破坏当前 `care_scene` 旧链路可回退能力的前提下，将“表达关心训练”迁移到新的沉浸式全屏训练体验，形成：

1. 全屏引导观察
2. 对方感受判断
3. 关心表达选择
4. 接收者舒适度判断
5. 结算页与记录闭环

## 2. 实施原则

1. 先复用沉浸式运行时，再接 `care_scene`
2. 不把 `care_scene` 硬塞进 `emotion_scene` 当前四步表结构
3. 迁移期间允许旧 `EmotionalInteractionEngine` 与新沉浸式链路并存
4. `acceptable` 必须作为正式反馈层次保留

## 3. 阶段拆分

## 阶段一：沉浸式运行时抽象收口

目标：

- 让当前沉浸式训练底座不再只服务 `emotion_scene`

工作项：

1. 审视 `src/stores/useTrainingStore.ts` 当前对 `emotion | reason | need | response` 的硬编码
2. 提炼通用 step 模型，支持 `care_emotion` / `care_utterance` / `receiver_preference`
3. 扩展选项结果状态，正式支持：
   - `correct`
   - `acceptable`
   - `retry`
4. 明确通用结算输入结构，避免后续 `care_scene` 再单独打补丁

产出：

- 通用沉浸式训练 store / types

验收：

- `emotion_scene` 现有沉浸式链路不回归
- 运行时类型不再假设所有训练都等于固定四步

## 阶段二：`care_scene` 数据适配器

目标：

- 把 `CareSceneResourceMeta` 编译为沉浸式训练步骤数据

工作项：

1. 新增 `compileCareSceneImmersive.ts`
2. 将下列字段映射为沉浸式步骤：
   - `receiverEmotion`
   - `emotionChips`
   - `utterances`
   - `preferredUtteranceIds`
   - `receiverOptions`
3. 明确每一步的反馈策略和结果等级
4. 补齐适配层默认反馈文案，避免资源缺字段时页面失真

产出：

- `care_scene -> immersive steps` 编译器

验收：

- 任意一条 `care_scene` 资源都能被成功编译成 intro + 3 步训练数据

## 阶段三：沉浸式页面与组件接线

目标：

- 新建 `care_scene` 沉浸式运行页面

工作项：

1. 在新页面中复用：
   - `TrainingLayout.vue`
   - `SceneIntroStep.vue`
   - `QuestionPresenter.vue`
   - `QuestionStep.vue`
2. 为 `care_scene` 增补必要选项组件能力：
   - 情绪 chip 选择
   - 话术类型标签
   - 接收者反应摘要
   - `acceptable` 中间态视觉反馈
3. 接上 `feedback_text` / 等价反馈文案气泡
4. 保持触屏友好与低认知负荷

产出：

- 新的沉浸式 `CareExpressionTraining` 页面

验收：

- 可从训练入口进入新页并完成完整交互

## 阶段四：结算与记录闭环

目标：

- 把 `care_scene` 新链路从“能玩”推进到“能保存、能复盘”

工作项：

1. 新增结算页组件
2. 接入：
   - 星级 / 完成度
   - 偏好话术类型
   - 关键偏差步骤
3. 写入训练记录
4. 验证保留：
   - `correct`
   - `acceptable`
   - 提示层级
   - 重试次数
   - 接收者视角结果

产出：

- `care_scene` 结算页
- `care_scene` 新链路记录闭环

验收：

- 训练完成后可看到结果页
- 重启后仍能读到记录

## 阶段五：入口切换与旧链路收口

目标：

- 在验证通过后再决定是否切换默认入口

工作项：

1. 保留旧 `EmotionalInteractionEngine` 作为回退路径
2. 完成沉浸式链路的实际交互验收
3. 评估是否：
   - 切换默认入口
   - 保留双入口
   - 延后替换

产出：

- 入口切换结论

验收：

- 默认入口切换不会破坏现有教学可用性

## 4. 推荐执行顺序

推荐顺序：

1. `emotion_scene` 补完 Step 5 结算页并完成验收
2. 阶段一：沉浸式运行时抽象收口
3. 阶段二：`care_scene` 数据适配器
4. 阶段三：沉浸式页面与组件接线
5. 阶段四：结算与记录闭环
6. 阶段五：入口切换与旧链路收口

## 5. 第一动作

当 `emotion_scene` 验收通过后，启动 `care_scene` 改造时的**第一个动作**应是：

**先重构 `src/stores/useTrainingStore.ts` 及其配套类型，让沉浸式训练运行时不再绑定固定四步模型。**

原因：

- 如果底座仍然写死 `emotion_scene` 四步语义，后续 `care_scene` 接入时只会不断堆 if/else
- 先收口底座，后续每一步都更稳

## 6. 验收口径

只有满足下面这些条件，才应视为 `care_scene` 沉浸式改造完成：

1. 60 条 `care_scene` 资源可进入沉浸式训练页
2. 新链路不依赖旧 `EmotionalInteractionEngine`
3. 能完整跑通 intro -> 3 步训练 -> summary
4. `acceptable` 与 `correct` 有清晰区分
5. 反馈文案稳定展示
6. 训练记录可持久化
7. 至少完成一轮真实手工验收后，再考虑切换默认入口
