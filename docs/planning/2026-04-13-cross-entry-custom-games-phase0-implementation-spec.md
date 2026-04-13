# 跨训练入口自定义小游戏扩展 Phase 0 实施规格

## 1. 文档定位

本文件是 [2026-04-13-cross-entry-custom-games-expansion-plan.md](/home/DONG/Mycode/SCGP/docs/planning/2026-04-13-cross-entry-custom-games-expansion-plan.md) 的执行规格补充，用于指导新会话里的 Codex 按统一约束实施 `Phase 0`。

本文件只描述 `Phase 0` 的真实代码改造任务，不代表这些能力已经落地。

## 2. 当前代码现实

截至 `2026-04-13`，当前仓库中与自定义小游戏相关的真实状态如下：

- 已落地的自定义小游戏只有 5 个情绪小游戏：
  - `G01_BALLOON`
  - `G03_FOREST`
  - `G04_WIPE_ICE`
  - `G07_MONSTER`
  - `G08_ENERGY_BALL`
- 当前小游戏链路仍是 `emotional-only`：
  - 路由只注册在 `/emotional/games/*`
  - `GameLobby` 对 `emotional-regulation` 走独立特判
  - `game_emotion_records` 与 `student_badges` 的 `game_code` 约束仍只覆盖上述 5 个游戏
  - `EmotionalGamesAPI` 当前把 `entry_code` 写死为 `emotional-regulation`
- 当前启动上下文仍是单学生模式：
  - `GameContainer` 只接 `studentId`
  - 5 个 `Page.vue` 只解析 `studentId / studentName / difficulty`
  - 还没有 `participantStudentIds`、共享场次、教师结束、权限 preflight 的统一契约
- 当前权限申请仍由子游戏自己触发：
  - `EnergyBallGame` 在组件内部直接申请摄像头
  - `VoiceVolumeForestGame` 在组件内部直接申请麦克风
  - Electron 当前没有媒体权限恢复页专用 IPC
- 当前记录详情仍是情绪小游戏专页：
  - `GameRecordsPanel` 只把 standalone 情绪小游戏拼到 `emotional-regulation`
  - `GameRecordDetail.vue` 仍是 emotional-only

结论：

- 当前代码现实还不是“跨训练入口可复用的自定义小游戏底座”
- 当前仍不能把 `social-communication / fine-motor / soothing-aids` 写成已具备正式小游戏交付链路

## 3. 本阶段固定约束

以下约束已经锁定，实施时不得回退：

- 建统一小游戏注册表，不再继续扩散 `emotional-only` 特判
- 双人游戏采用共享场次，不是两名学生各自独立完成
- 多人记录必须通过单事务组写入，失败整组回滚
- 新增 `game_session_participants` 关联表，不依赖 JSON 做主查询
- 结束语义拆成 `completion_status + exit_trigger`
- 必须区分 `user_exit` 和 `teacher_exit`
- 权限由容器统一 preflight，不由子游戏自行首轮申请
- Electron 下系统权限被拒时要有恢复页和平台化指引
- 注册表校验要接入本地构建前置和 CI
- 徽章视觉语义校验规则是 `visualThemeTag + iconToken` 唯一，`paletteToken` 允许复用

## 4. 非目标

- 本阶段不直接实现 `Wave 1` 新游戏玩法
- 本阶段不把所有游戏重构回旧 `GamePlay.vue + TaskID` 通用链
- 本阶段不启动“训练记录统一大迁移”专题，只补足 custom game 底座所需字段与读写路径
- 本阶段不引入 3 人及以上同屏小游戏
- 本阶段不把 `C05_MOOD_METER` 做成全局悬浮入口

## 5. 文件级实施清单

### 5.1 注册表与类型

- 新增 [custom-game-registry.ts](/home/DONG/Mycode/SCGP/src/data/custom-game-registry.ts)
  - 定义 `CustomGameDefinition`
  - 收录当前 5 个情绪小游戏
  - 字段必须包含：
    - `gameCode`
    - `name`
    - `moduleCode`
    - `trainingEntryCode`
    - `entryPath`
    - `maxPlayers`
    - `requiredPermissions`
    - `permissionPolicy`
    - `difficultyLocked`
    - `badge.badgeCode`
    - `badge.badgeName`
    - `badge.visualThemeTag`
    - `badge.iconToken`
    - `badge.paletteToken`
    - `metadata`
- 修改 [games.ts](/home/DONG/Mycode/SCGP/src/types/emotional/games.ts)
  - 增 `CustomGameLaunchContext`
  - 增 `CustomGameExitTrigger`
  - 增 `CustomGameCompletionPayload`
  - 增 `GroupGameCompletionPayload`
  - 保留旧 emotional payload 兼容层，避免一次性打爆现有 5 个游戏页面
- 修改 [emotional-game-catalog.ts](/home/DONG/Mycode/SCGP/src/data/emotional-game-catalog.ts)
  - 降级为 registry 的情绪入口资源 adapter
- 修改 [emotional-game-catalog.ts](/home/DONG/Mycode/SCGP/src/views/games/emotional-game-catalog.ts)
  - 改为从 registry adapter 生成大厅数据

### 5.2 启动入口与容器

- 修改 [GameContainer.vue](/home/DONG/Mycode/SCGP/src/views/emotional/games/GameContainer.vue)
  - props 从单 `studentId` 升级到 `launchContext`
  - 支持 `difficultyLocked`
  - 接入 permission preflight 状态机
  - 接入 `teacher_exit`
  - 接入 `completeGroupGame / abortGroupGame`
- 修改当前 5 个 `src/views/emotional/games/*Page.vue`
  - 不再各自散落解析 badge 和启动字段真源
  - 统一组装 `launchContext`
- 修改 [GameLobby.vue](/home/DONG/Mycode/SCGP/src/views/games/GameLobby.vue)
  - 去除 `emotional-regulation` 业务专线心智模型
  - 保留“custom game”与“legacy TaskID game”双分流
- 修改 [SelectStudent.vue](/home/DONG/Mycode/SCGP/src/views/games/SelectStudent.vue)
  - 去掉小游戏路径硬编码白名单
  - 为未来双人学生选择预留上下文入口
- 修改 [router/index.ts](/home/DONG/Mycode/SCGP/src/router/index.ts)
  - 保留旧 `/emotional/games/*` 兼容路由
  - 新增统一 custom game 路由或兼容重定向策略

### 5.3 数据与迁移

- 修改 [emotional-schema.sql](/home/DONG/Mycode/SCGP/src/database/schema/emotional-schema.sql)
  - `game_emotion_records` 新增：
    - `session_group_id TEXT`
    - `exit_trigger TEXT`
    - `session_participants TEXT`
  - 新增 `game_session_participants`
  - 更新 `student_badges.game_code` 约束范围
- 修改 [init.ts](/home/DONG/Mycode/SCGP/src/database/init.ts)
  - 用 registry 驱动小游戏资源 seed
  - 正式实现 Phase 0 schema 迁移
  - 删除或替换当前只服务 `G08` 的 ad-hoc rebuild 逻辑
- 修改 [emotional-games-api.ts](/home/DONG/Mycode/SCGP/src/database/emotional-games-api.ts)
  - 去掉 `EMOTIONAL_GAME_ENTRY_CODE` 写死
  - registry-aware 的单人持久化
  - 新增 `persistSessionGroup()`
- 修改 [training-session-writer.ts](/home/DONG/Mycode/SCGP/src/database/training-session-writer.ts)
  - 至少在 `summary_payload` 中保留共享场次关键摘要

### 5.4 权限与 Electron

- 修改 [EnergyBallGame.vue](/home/DONG/Mycode/SCGP/src/components/emotional/games/EnergyBallGame.vue)
  - 移除 mounted 首轮自行申请摄像头
- 修改 [VoiceVolumeForestGame.vue](/home/DONG/Mycode/SCGP/src/components/emotional/games/VoiceVolumeForestGame.vue)
  - 移除内部首轮自行申请麦克风
- 修改 [preload.mjs](/home/DONG/Mycode/SCGP/electron/preload.mjs)
- 修改 `electron/preload.cjs`
- 修改 `electron/main.mjs`
- 修改 [electron.d.ts](/home/DONG/Mycode/SCGP/src/types/electron.d.ts)
  - 新增媒体权限查询与恢复页所需 IPC

### 5.5 训练记录读取与详情

- 修改 [GameRecordsPanel.vue](/home/DONG/Mycode/SCGP/src/views/training-records/components/GameRecordsPanel.vue)
  - 按 registry entry 读取 standalone custom game 记录
  - 展示 `exit_trigger` 与参与者摘要
- 建议新增 `src/views/games/CustomGameRecordDetail.vue`
  - 作为跨入口 custom game 通用详情页
- 修改 [GameRecordDetail.vue](/home/DONG/Mycode/SCGP/src/views/emotional/GameRecordDetail.vue)
  - 降级为兼容包装层或跳转层，而不是继续作为唯一详情页
- 修改 [ModuleTrainingRecords.vue](/home/DONG/Mycode/SCGP/src/views/training-records/ModuleTrainingRecords.vue)
- 修改 [StudentDetail.vue](/home/DONG/Mycode/SCGP/src/views/StudentDetail.vue)
  - 把 standalone custom game 详情统一导向通用详情页

### 5.6 校验脚本与门禁

- 新增 `scripts/validate-custom-games.mjs`
- 修改 [package.json](/home/DONG/Mycode/SCGP/package.json)
  - 新增 `validate:custom-games`
  - 接入 `type-check`
  - 接入 `build:web`
- 如仓库后续补本地 workflow，再把以下命令链设为必过：
  - `npm run validate:custom-games`
  - `npm run type-check`
  - `npm run build:web`

## 6. 执行顺序

### Step 1. 注册表与类型基线

先完成：

- `custom-game-registry.ts`
- `src/types/emotional/games.ts`
- `src/data/emotional-game-catalog.ts`
- `src/views/games/emotional-game-catalog.ts`

验收：

- 当前 5 个情绪小游戏都能从 registry 生成
- 大厅卡片、资源 seed、默认 badge 不再各有真源

### Step 2. Schema 正式迁移

再完成：

- `src/database/schema/emotional-schema.sql`
- `src/database/init.ts`
- `src/database/emotional-games-api.ts` 中旧 rebuild 清理

验收：

- 不再保留只支持 `G08` 的临时迁移逻辑
- 旧库升级后不会回退成旧表结构
- `student_badges` 约束迁移也已补齐

### Step 3. 持久化事务补齐

再完成：

- `persistSession()`
- `persistSessionGroup()`
- `training_session` 摘要写入

验收：

- 单人记录按真实 entry 写入
- 双人共享场次具备整组事务回滚能力

### Step 4. 容器状态机

再完成：

- `launchContext`
- `difficultyLocked`
- `user_exit / teacher_exit / system_interrupt`
- `completeGroupGame / abortGroupGame`

验收：

- 主退出不再混淆教师结束
- 双人共享场次不再依赖两个独立完成事件

### Step 5. 权限 preflight

再完成：

- 容器统一权限探测
- 子游戏移除首轮媒体申请
- Electron 恢复页与 IPC

验收：

- 首轮权限窗来自容器而不是子游戏
- Electron 系统拒绝能明确进入恢复页

### Step 6. 启动路径与路由

再完成：

- `GameLobby`
- `SelectStudent`
- `GamePreviewCard`
- `router`

验收：

- `social-communication / fine-motor / soothing-aids` 的 custom game 资源可走 custom game 链路
- legacy `TaskID` 游戏仍维持原链路

### Step 7. 训练记录与详情

最后完成：

- `GameRecordsPanel`
- `CustomGameRecordDetail`
- `ModuleTrainingRecords`
- `StudentDetail`

验收：

- custom game 记录能在对应训练入口下看到
- 详情页可展示 `completion_status + exit_trigger + participants`

## 7. 状态机设计

### 7.1 权限 preflight 状态机

容器层状态：

- `idle`
- `probing`
- `ready`
- `degraded_ready`
- `blocked_retryable`
- `blocked_system`
- `active`
- `terminal`

转移规则：

- `idle -> probing`
  - 进入页面并读取 registry 后触发
- `probing -> ready`
  - 所有必需权限通过
- `probing -> degraded_ready`
  - `permissionPolicy = degradable` 且 registry 明确支持降级
- `probing -> blocked_retryable`
  - 浏览器级拒绝、设备暂不可用、被占用
- `probing -> blocked_system`
  - Electron 系统级权限被拒
- `ready / degraded_ready -> active`
  - 容器挂载子游戏
- `active -> terminal`
  - `game_complete`
  - `user_exit`
  - `teacher_exit`
  - `timer_end`
  - `system_interrupt`

要求：

- `all_required` 游戏任何必需权限未通过都不能进入运行态
- `degradable` 仅允许进入明确定义过的降级模式，不能进入未定义状态

### 7.2 双人共享场次状态机

共享场次状态：

- `draft`
- `preflight_ready`
- `active`
- `completed_pending_persist`
- `aborted_pending_persist`
- `persisting`
- `closed`
- `persist_failed`

规则：

- 双人游戏只存在 1 个共享场次，不存在两个独立完成流
- 任一孩子主动退出：
  - `active -> aborted_pending_persist`
  - 记录 `aborted + user_exit`
- 教师结束：
  - `active -> aborted_pending_persist`
  - 记录 `aborted + teacher_exit`
- 权限丢失、硬件中断、窗口异常离开：
  - `active -> aborted_pending_persist`
  - 记录 `aborted + system_interrupt`
- 正常完成：
  - `active -> completed_pending_persist`
  - 记录 `completed + game_complete`
- `persisting` 必须单事务完成所有写入
- 任一步失败：
  - `persisting -> persist_failed`
  - 整组回滚，不留下半成功场次

## 8. 迁移与兼容风险

- 当前存在两段 ad-hoc rebuild 逻辑，只覆盖 `G08_ENERGY_BALL`
  - 如果不先替换，会与 Phase 0 新列直接冲突
- `student_badges` 当前只有 schema 约束，没有匹配的正式运行时迁移
  - 新 game code 最容易在 badge upsert 时失败
- 当前运行态不携带稳定 `resourceId`
  - 旧记录不能假设都能完整回溯到资源表
- 旧记录的 `exit_trigger` 无法可靠回推
  - 迁移时允许历史数据为 `NULL`
  - 新写入再强制收口
- 当前记录读取只在 `emotional-regulation` 下拼 standalone 情绪小游戏
  - 如果先写新 entry、后改 UI，会出现“写得进去但看不见”

## 9. 校验脚本设计

`validate:custom-games` 至少校验：

- `gameCode` 唯一
- `entryPath` 唯一
- `badgeCode` 唯一
- `visualThemeTag + iconToken` 唯一
- `paletteToken` 可复用
- `requiredPermissions` 只允许：
  - `microphone`
  - `camera`
- `maxPlayers` 只允许：
  - `1`
  - `2`
- `maxPlayers > 1` 时必须启用共享场次持久化配置
- `trainingEntryCode -> moduleCode` 映射必须与现有 training entry 体系一致

## 10. 可执行验收标准

### 10.1 注册表与入口

- 现有 5 个情绪小游戏已迁入统一 registry 视角
- `GameLobby` 不再只对 `emotional-regulation` 做 custom game 特判
- 至少可以为 `social-communication / fine-motor / soothing-aids` 正确解析 custom game 资源

### 10.2 数据与事务

- 新增 `session_group_id`、`exit_trigger`、`game_session_participants` 后，现有读取不被破坏
- 单人 custom game 新写入时，记录能带真实 `entry_code`
- 双人共享场次通过单事务组写入，不会出现半成功数据

### 10.3 结束语义

- `user_exit` 与 `teacher_exit` 在详情页可明确区分
- `timer_end` 可被记录为 `completed + timer_end`
- 任一参与者退出，共享场次立即整组 `aborted`

### 10.4 权限与运行时

- 麦克风/摄像头权限由容器统一 preflight
- `EnergyBallGame` 与 `VoiceVolumeForestGame` 首轮不再各自弹权限窗
- Electron 系统级权限拒绝时，能进入恢复页并给出平台化指引

### 10.5 校验与门禁

- `validate:custom-games` 能拦截注册表关键冲突
- 本地 `type-check` 与 `build:web` 已串联注册表校验
- 如果仓库接入 workflow，CI 也必须经过同一命令链

## 11. 新会话实施建议

如果下一轮由新会话 Codex 直接开始实施，建议只按以下顺序推进，不要跳步：

1. 先做 `注册表与类型基线`
2. 再做 `Schema 正式迁移`
3. 再做 `持久化事务补齐`
4. 再做 `容器状态机`
5. 再做 `权限 preflight`
6. 再做 `启动路径与路由`
7. 最后做 `训练记录与详情`

在 `Phase 0` 完成前，不进入任何 `Wave 1` 新游戏实现。
