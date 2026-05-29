# 空中魔法指挥棒实施计划
> 文档类型：现行实施计划
> 前置输入：
> - `docs/planning/空中魔法指挥棒_PRD_v2.md`
> - `.continue-here.md`
> 适用范围：`SCGP / 星愿能力发展平台`
> 状态：当前有效
> 创建日期：2026-05-28

## 1. 计划目标

在 SCGP 现有感官统合游戏主链上，规划并落地新的摄像头动作训练游戏“空中魔法指挥棒”，实现以下闭环：

- 从 `GameLobby -> GamePreviewCard -> GamePlay` 现有链路进入训练
- 复用 `SensoryGameShell` 的沉浸式运行容器与共享背景音乐控制
- 以“摄像头姿态识别 + 双臂音频映射 + 训练数据落库”为主线完成游戏运行态
- 训练结果继续落入 `training_records + training_session + report_record` 现有平台主链

本计划只负责实施拆解，不直接进入代码实现。

## 2. 当前代码事实

### 2.1 感统游戏入口与运行态主链

截至 2026-05-28，感统游戏的真实启动链路如下：

- `src/views/games/GameLobby.vue`
  - 选择资源
  - 通过 `GamePreviewCard` 收集训练参数
  - 把参数拼到 `/games/play` query
- `src/views/games/GamePlay.vue`
  - 从 `resourceId + taskId + mode + duration...` 读取启动参数
  - 用静态 `TaskID` 分支选择具体游戏组件
  - 统一保存训练记录并生成报告记录
- `src/components/games/SensoryGameShell.vue`
  - 负责感统训练的沉浸式壳、返回入口、共享音乐设置入口、舞台容器

结论：

- 当前感统游戏仍是 `TaskID + SENSORY_GAME_SEED + GamePlay 静态分支` 主链
- 不是注册表驱动的动态装配链

### 2.2 当前可复用的摄像头游戏链

当前已经落地的摄像头感统游戏只有 3 个：

- `TaskID.HAND_XYLOPHONE`
- `TaskID.HAND_WOOD_BLOCKS`
- `TaskID.HAND_BUBBLE_POP`

它们的真实共性是：

- 通过 `GamePreviewCard` 配置少量参数
- 在 `GamePlay` 中按 `TaskID` 分支挂载
- 用 `SensoryGameShell` 进入全屏沉浸式运行态
- 游戏组件内部自行维护 HUD、动画、交互和完成态
- 完成后统一 `emit('finish', GameSessionData)`

### 2.3 `HandCameraLayer` 的真实边界

`src/components/games/hand/HandCameraLayer.vue` 当前只服务“手部关键点”链路：

- 内部依赖 `useHandLandmarker`
- 只输出：
  - `hands`
  - `primaryPoint`
  - `stageSize`
  - `usingPointerFallback`
- 自带鼠标/触摸备用操作
- 没有姿态骨架、肩肘腕关键点、离框统计或 Pose 专用 Canvas 管线

结论：

- `HandCameraLayer` 的布局、生命周期和相机舞台模式可以复用
- 但不能把它误写成“已经支持 Pose”

### 2.4 当前数据与报告主链

当前感统游戏训练结果的真实写链如下：

- `GamePlay.handleGameFinish()`
- `GameTrainingAPI.saveTrainingRecord()`
- `training_records`
- `TrainingSessionWriter.upsertSession()`
- `training_session`
- `createReportRecord() -> report_record`

当前还存在两个与本次需求直接相关的现实：

- `GameTrainingAPI` 固定把 `training_session.session_family` 写成 `game`
- `buildGameTrainingSummaryPayload()` 当前只收口：
  - `totalTrials`
  - `correctTrials`
  - `errors`
  - `behavior`
  - `rhythmStats`
  - `trackingStats`

也就是说：

- 新游戏的丰富体感指标如果不额外补齐，只会留在 `raw_data`
- 不会自动进入 `training_session.summary_payload`

### 2.5 当前依赖与技术现实

仓库当前已存在并可复用的依赖与模式：

- `@mediapipe/tasks-vision`
- `tone`
- `useHandLandmarker`
- `useExpressionAudio`
- `game-music-controller`

仓库当前**没有**以下现成主链：

- `@mediapipe/pose` 现成接入
- Pose 专用 composable
- Pose 专用 camera layer
- 专门的 `air_conductor_sessions` 读写链

## 3. PRD 与当前平台现实的落地口径

| PRD 写法 | 当前平台现实 | 本期落地口径 |
| --- | --- | --- |
| `AirConductor.vue` 放在 `src/views/games/` | 当前感统摄像头游戏都以组件形式挂在 `GamePlay.vue` 下 | 本期改为 `src/components/games/pose/AirConductorGame.vue`，继续走 `GamePlay` 主链 |
| 用“游戏注册表”接入 SCGP | 当前 sensory 不是注册表动态装配，而是 `TaskID + seed + GamePlay` | 本期把“注册”翻译为：新增 `TaskID`、补 `SENSORY_GAME_SEED`、补迁移、补 `GamePlay` 分支 |
| 新建 `air_conductor_sessions` + `trainingDatabase.ts` 作为主写链 | 当前平台主写链是 `training_records + training_session + report_record` | 本期以平台主链为主；独立 session 表只作为后续增强候选，不作为首期主线 |
| `studentId` 从 Pinia / ipcRenderer 兜底读取 | 当前感统游戏统一从 `GamePlay` props / query 传入 `studentId` | 本期继续沿用当前启动链，不新增新的 student 真源 |
| 直接使用 `@mediapipe/pose` | 当前仓库已有 `@mediapipe/tasks-vision` 资源装载与 WASM 路径模式 | 本期先抽象 Pose 跟踪接口，优先复用现有 MediaPipe 资源装载方式，内部实现可按打包兼容性落地 |
| 难度 `easy / normal / hard` 已是交付项 | 当前 PRD 已注明“本期可不实现难度差异” | 本期默认只落实时长配置；难度行为差异延期，避免出现“UI 可选但运行态无差异” |

## 4. 固定实现约束

以下约束在本计划中视为锁定：

- 新游戏优先复用：
  - `GamePlay.vue`
  - `SensoryGameShell.vue`
  - `GamePreviewCard.vue`
  - `GameLobby.vue`
  - `AirXylophoneGame.vue` 的组件组织模式
- 不在本期把 sensory 游戏链重构成 custom-game registry
- 不在本期重写现有 3 个手势游戏
- 不在本期把 `HandCameraLayer.vue` 强行泛化成“一切摄像头游戏底座”
- 不新增原生运行时依赖
- 背景音乐继续接入共享 `game-music-controller`
- 首期训练记录以 `training_records` 为唯一事实主记录

## 5. 文件落点建议

| 文件 | 职责 |
| --- | --- |
| `src/types/games.ts` | 新增 `TaskID.AIR_CONDUCTOR`，并补充动作类游戏的类型兼容字段 |
| `src/data/sensory-game-seed.ts` | 新增“空中魔法指挥棒”资源 seed |
| `src/database/migration/migrate-games-to-resources.ts` | 让新 seed 正式进入资源迁移主链 |
| `src/components/games/GamePreviewCard.vue` | 新游戏启动参数配置，首期只补训练时长 |
| `src/views/games/GameLobby.vue` | 透传新 query 参数到 `/games/play` |
| `src/views/games/GamePlay.vue` | 增加 `TaskID.AIR_CONDUCTOR` 分支、标题、模式文案、时长文案、默认参数 |
| `src/components/games/SensoryGameShell.vue` | 新增 `air-conductor` 主题或等效沉浸式样式分支 |
| `src/components/games/pose/PoseCameraLayer.vue` | 复用 `HandCameraLayer` 的舞台模式，承载 Pose 视频、Canvas、状态提示 |
| `src/composables/usePoseTracker.ts` | 提供原始 Pose 帧、可见性、fps 与降级状态 |
| `src/composables/usePoseAudio.ts` | 实现平滑、抬臂判定、协同计时、音频映射、阶段状态机 |
| `src/types/air-conductor.ts` | 收口 `ArmPose / GamePhase / SessionStats / CalibrationResult` 等专用类型 |
| `src/components/games/pose/air-conductor-runtime.ts` | 放纯计算逻辑：平滑、冷却、协同判定、reach score、粒子数据等 |
| `src/components/games/pose/AirConductorGame.vue` | 新游戏主组件，负责布局、HUD、Canvas、phase 控制和 finish emit |
| `src/audio/game-music-profiles.ts` | 为新 TaskID 绑定 `music-minimal` 与默认状态 |
| `src/database/api.ts` | 补齐 `summary_payload` 对动作类统计摘要的收口 |
| `src/utils/iep-generator.ts` | 为新 TaskID 增加名称映射与动作类报告文案 |
| `scripts/tests/sensory-hand-games.test.mjs` | 扩展接线类断言 |
| `scripts/tests/air-conductor-runtime.test.mjs` | 新增纯逻辑测试 |

## 6. 数据契约建议

### 6.1 启动参数契约

首期沿用当前 `GamePreviewCard -> GameLobby -> GamePlay` query 契约，只新增：

- `taskId = TaskID.AIR_CONDUCTOR`
- `mode = 'air-conductor'`
- `duration = 60 | 90 | 120`

首期不强制暴露真实难度选项，避免形成无效配置。

### 6.2 运行态输出契约

`AirConductorGame.vue` 最终仍应 `emit('finish', GameSessionData)`，但 `raw_data` 和动作摘要需要补充专用字段。

建议在 `GameSessionData` 兼容口径下追加：

```ts
handGameStats: {
  handTrackingUsed: boolean
  pointerFallbackUsed: false
  gestureEvents: number
  completionScore: number
  leftArmExtensions?: number
  rightArmExtensions?: number
  bilateralCoordSec?: number
  maxReachScore?: number
  offFrameCount?: number
}
```

说明：

- 本期继续沿用 `handGameStats` 作为“摄像头动作类小游戏”兼容摘要字段
- 这样可以最小化对 `GameTrainingAPI`、`IEPGenerator` 和现有记录页的冲击
- 后续如果动作类游戏继续扩张，再统一收口成 `cameraGameStats`

### 6.3 `summary_payload` 收口建议

本期应补齐 `buildGameTrainingSummaryPayload()`，至少把以下内容带入 `training_session.summary_payload`：

- `handGameStats`
- `phaseSummary` 或 `airConductorStats`

这样做的原因很直接：

- `training_records.raw_data` 适合完整回放
- `training_session.summary_payload` 适合列表、统计和轻量详情

## 7. 分阶段实施计划

### 阶段 1：入口接入与资源注册

#### 7.1 目标

让“空中魔法指挥棒”成为当前 sensory 游戏主链中的一个合法任务。

#### 7.2 主要工作

- 在 `src/types/games.ts` 中新增 `TaskID.AIR_CONDUCTOR = 11`
- 视兼容需要补 `GameHandMode` 或新增更宽松的动作类 mode 字段
- 在 `src/data/sensory-game-seed.ts` 新增 seed：
  - 名称
  - 描述
  - `category = 'motor'`
  - `mode = 'air-conductor'`
- 在 `src/database/migration/migrate-games-to-resources.ts` 让资源迁移识别新 seed
- 在 `GamePreviewCard.vue` 增加新任务的启动配置 UI：
  - 首期只做时长
- 在 `GameLobby.vue` 透传 query
- 在 `GamePlay.vue` 补：
  - 分支渲染
  - 标题映射
  - 模式映射
  - 建议时长映射
  - 默认参数

#### 7.3 完成标准

- 资源迁移后可在感统大厅看到新游戏
- 可从大厅启动并进入 `/games/play`
- 启动参数口径与现有 3 个摄像头游戏一致

### 阶段 2：Pose 相机层与跟踪底座

#### 7.1 目标

在不破坏 `HandCameraLayer` 的前提下，补一条 Pose 专用的摄像头舞台链。

#### 7.2 主要工作

- 新增 `src/composables/usePoseTracker.ts`
  - 输出肩、肘、腕关键点
  - 输出可见性
  - 输出 fps
  - 输出降级状态
- 新增 `src/components/games/pose/PoseCameraLayer.vue`
  - 复用 `HandCameraLayer` 的：
    - 视频启动方式
    - `ResizeObserver`
    - 状态提示位置
    - 舞台尺寸同步
  - 新增 Pose 专用：
    - video + canvas 叠层
    - 姿态骨架绘制输入
    - 离框覆盖提示

#### 7.3 关键约束

- 本期不改写 `HandCameraLayer.vue` 的 detector 语义
- 本期不提供“单指模拟双臂”的教师可见 fallback
- 如需开发态模拟，只能放在调试开关或测试 helper，不进入正式教师界面

#### 7.4 完成标准

- Pose 跟踪链能独立输出肩肘腕数据
- `PoseCameraLayer` 能提供全屏舞台、视频、Canvas 和状态提示
- 不影响现有 `AirXylophone / WoodBlock / BubblePop`

### 阶段 3：游戏运行态与音频状态机

#### 7.1 目标

完成“空中魔法指挥棒”核心玩法运行态。

#### 7.2 主要工作

- 新增 `src/types/air-conductor.ts`
- 新增 `src/composables/usePoseAudio.ts`
  - 校准阶段
  - 倒计时
  - `playing / paused / finishing / done`
  - 指数平滑
  - 抬臂边沿计数
  - 双侧协同时长累加
  - `maxReachScore`
  - 离框降级
  - Tone 双 Synth 控制
- 新增 `src/components/games/pose/air-conductor-runtime.ts`
  - 纯函数逻辑拆出，便于 node 测试
- 新增 `src/components/games/pose/AirConductorGame.vue`
  - 负责 PRD 要求的 100vh 运行布局
  - 左侧视频舞台 + 右侧训练面板
  - topbar / pause / finish / recalibrate
  - 调用 `usePoseAudio()`
  - 最终生成 `GameSessionData`

#### 7.3 音乐接入策略

- 在 `src/audio/game-music-profiles.ts` 中为新 TaskID 绑定：
  - `profile = 'music-minimal'`
  - `default state = 'paused'`
- `AirConductorGame.vue` 内部按 phase 切换：
  - `idle / calibrating / countdown -> paused`
  - `playing -> playing`
  - `done -> finish`
  - `unmounted -> stopMusic()`

这样可以避免一进入页面就播放背景音乐，和 PRD 的校准/倒计时节奏更一致。

#### 7.4 完成标准

- 能完成校准、倒计时、训练、暂停、结束、结算
- 左右手音高、滤波、delay 和双臂高举触发逻辑能按 PRD 运行
- 离框时暂停统计与音频衰减，恢复后继续

### 阶段 4：训练记录、摘要与报告接入

#### 7.1 目标

让新游戏数据进入当前平台记录与报告主链，而不是形成旁路。

#### 7.2 主要工作

- 在 `GamePlay.vue` 中把新任务纳入 finish 流程
- 在 `src/database/api.ts` 中增强 `buildGameTrainingSummaryPayload()`
  - 补 `handGameStats`
  - 补动作类摘要
- 在 `src/utils/iep-generator.ts` 中：
  - 增加 `TaskID.AIR_CONDUCTOR` 名称映射
  - 为动作类报告增加更贴近“上肢伸展 / 双侧协调”的文案
- 确认 `report_record` 仍由 `GamePlay` 统一创建，不新开旁链

#### 7.3 首期不做

- 不把 `air_conductor_sessions` 作为首要持久化表
- 不单独做新记录详情页
- 不做跨场次历史对比页

#### 7.4 完成标准

- 新游戏完成后可生成训练记录
- `training_session.summary_payload` 可直接读取核心动作指标
- IEP 基本文案不再只显示通用“手势事件数”

### 阶段 5：测试与回归

#### 7.1 目标

给下一轮真正实现留下可验证基线。

#### 7.2 主要工作

- 扩展 `scripts/tests/sensory-hand-games.test.mjs`
  - 校验新 `TaskID`
  - 校验新 seed
  - 校验 `GamePreviewCard / GameLobby / GamePlay` 接线
  - 校验音乐 profile 映射
- 新增 `scripts/tests/air-conductor-runtime.test.mjs`
  - 平滑器
  - 抬臂冷却
  - 协同计时
  - 离框阈值
  - reach score
  - 统计摘要映射

#### 7.3 验证命令

至少执行：

```bash
npm run type-check
node --test scripts/tests/sensory-hand-games.test.mjs scripts/tests/air-conductor-runtime.test.mjs
```

如实现阶段涉及构建资源路径，再补：

```bash
npm run build:web
```

## 8. 风险与控制策略

### 8.1 风险：Pose 方案与当前 MediaPipe 打包方式不兼容

控制：

- 先把 Pose 跟踪抽象在 `usePoseTracker.ts`
- 游戏组件不直接绑定某个 MediaPipe API 细节

### 8.2 风险：强行复用 `HandCameraLayer` 导致现有手势游戏回归

控制：

- 首期新增 `PoseCameraLayer.vue`
- 不对现有 hand layer 做大改

### 8.3 风险：统计数据只落 `raw_data`，列表摘要拿不到

控制：

- 阶段 4 必须同步补 `buildGameTrainingSummaryPayload()`

### 8.4 风险：PRD 的独立 session 表与平台主链冲突

控制：

- 首期明确以 `training_records + training_session` 为主
- 独立 session 表延后为增强专题

### 8.5 风险：UI 暴露难度选择但没有真实差异

控制：

- 首期不开放无效难度配置
- 等运行态确实有阈值差异后再补难度入口

## 9. 验收清单

- [ ] 感统大厅可看到“空中魔法指挥棒”
- [ ] `GamePreviewCard -> GameLobby -> GamePlay` 参数链可用
- [ ] 新游戏运行于 `SensoryGameShell` 沉浸式舞台
- [ ] Pose 跟踪能提供肩肘腕数据并支持离框判定
- [ ] 校准、倒计时、训练、暂停、结束状态机完整
- [ ] 双 Synth 音频映射与 `music-minimal` 共存
- [ ] 训练结果进入 `training_records + training_session + report_record`
- [ ] `training_session.summary_payload` 含核心动作指标
- [ ] `type-check` 与 node 测试通过

## 10. 实施顺序建议

建议下一轮真正进入实现时，严格按以下顺序推进：

1. 先做“阶段 1：入口接入与资源注册”
2. 再做“阶段 2：Pose 相机层与跟踪底座”
3. 再做“阶段 3：游戏运行态与音频状态机”
4. 再做“阶段 4：训练记录、摘要与报告接入”
5. 最后做“阶段 5：测试与回归”

这样安排的原因很明确：

- 先让新游戏成为平台可见资源，再写运行态，避免做完组件却无法从主链启动
- 先补 Pose 底座，再写游戏逻辑，避免把 detector 代码塞进单个 SFC
- 先沿用平台记录主链，再考虑独立 session 增强，避免首期形成双写链
