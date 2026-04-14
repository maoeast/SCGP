# cross-entry custom games Wave 1 最小目标收口

> 文档类型：Wave 1 前期准备结论
> 状态：当前有效
> 最后更新：2026-04-14

## 1. 当前代码现实

- `Phase 0` 已收口，权限 preflight、`launchContext`、单人/双人持久化、`teacher_exit` / `system_interrupt` 语义已落地。
- 当前真实可运行链路仍是 `emotional-only`，不能把跨训练入口目标态写成现状。
- `custom-game-registry` 已是自定义小游戏定义真源，但当前 UI 消费层仍只对 `emotional-regulation` 做了专门接线：
  - [custom-game-registry.ts](/E:/VSC/H5/SIC-ADS/src/data/custom-game-registry.ts#L16)
  - [emotional-game-catalog.ts](/E:/VSC/H5/SIC-ADS/src/data/emotional-game-catalog.ts#L41)
  - [GameLobby.vue](/E:/VSC/H5/SIC-ADS/src/views/games/GameLobby.vue#L231)
- `GameContainer` 已能按 registry 的 `requiredPermissions` 做 gate，并能处理 `participantStudentIds`、完成/中断持久化和返程 query 继承：
  - [GameContainer.vue](/E:/VSC/H5/SIC-ADS/src/views/emotional/games/GameContainer.vue#L358)
  - [GameContainer.vue](/E:/VSC/H5/SIC-ADS/src/views/emotional/games/GameContainer.vue#L452)
  - [GameContainer.vue](/E:/VSC/H5/SIC-ADS/src/views/emotional/games/GameContainer.vue#L897)
- 但 `GameContainer` 当前返程仍按模块做硬编码分流；非 emotional 模块会落回 `/emotional/menu`，这不能直接承载真正的跨入口首个目标：
  - [GameContainer.vue](/E:/VSC/H5/SIC-ADS/src/views/emotional/games/GameContainer.vue#L824)

## 2. Wave 1 单一最小目标

本轮只锁定一个目标，不并行展开多个 Wave 1 项：

- 目标：`F01_CLOUD_ERASE / 云朵擦擦乐`
- 类型：新增 1 个小游戏
- 页面路由：`/emotional/games/cloud-erase`
- 所属模块：`ModuleCode.SENSORY`
- 所属训练入口：`fine-motor`
- 人数：单人
- 媒体权限：无

选择这个目标的原因：

- 它是 Wave 1 里最低风险的非 emotional 训练入口目标之一，能真实验证“跨入口”而不是只在 `emotional-regulation` 内横向扩充。
- 它不引入麦克风/摄像头变量，避免把 Wave 1 前期准备重新拉回 Phase 0 权限议题。
- 它可最大化复用现有 `G04_WIPE_ICE` 的 Canvas 刮擦交互经验，但本轮不进入具体实现。

## 3. 最小目标定义

对 `F01_CLOUD_ERASE`，进入实现前至少固定以下最小定义：

- `gameCode`: `F01_CLOUD_ERASE`
- `entryPath`: `/emotional/games/cloud-erase`
- `moduleCode`: `ModuleCode.SENSORY`
- `trainingEntryCode`: `fine-motor`
- `requiredPermissions`: `[]`
- `permissionPolicy`: `all_required`
- `maxPlayers`: `1`
- 返回页：应返回 `[GameLobby.vue](/E:/VSC/H5/SIC-ADS/src/views/games/GameLobby.vue)`，且保留 `entry=fine-motor`
- 完成态记录：`completed + game_complete`
- 中断态记录：
  - 主退出：`aborted + user_exit`
  - 教师结束：`aborted + teacher_exit`
  - 页面离开/系统打断：`aborted + system_interrupt`
- 徽章：需要，但仅要求占位定义，不在本轮展开视觉系统设计

## 4. 对 3 个关键承载点的核对

### 4.1 `custom-game-registry`

结论：字段层面足够承载该目标。

- 已具备 `gameCode / moduleCode / trainingEntryCode / entryPath / maxPlayers / requiredPermissions`：
  - [custom-game-registry.ts](/E:/VSC/H5/SIC-ADS/src/data/custom-game-registry.ts#L16)
- 对于 `F01_CLOUD_ERASE` 这种单人、无权限小游戏，不需要新增 schema 或新增 registry 字段。

### 4.2 `custom-game-launch`

结论：`launchContext` 组装能力足够承载该目标。

- 已能稳定解析：
  - `studentId`
  - `participantStudentIds`
  - `participantStudentNames`
  - `launchEntryCode`
  - `launchModuleCode`
  - `initialDifficulty`
  - `difficultyLocked`
  - `maxPlayers`
- 对应代码：
  - [custom-game-launch.ts](/E:/VSC/H5/SIC-ADS/src/utils/custom-game-launch.ts#L108)

### 4.3 `GameContainer`

结论：运行态容器本身基本够用，但返程定位还不够。

- 已足够：
  - 单人上下文消费
  - 无权限游戏直接进入
  - 统一完成/中断写记录
  - `teacher_exit` / `system_interrupt` 统一语义
- 仍不够：
  - 返程目标按模块硬编码，不按真实来源入口回落
  - 非 emotional 模块当前会落回 `/emotional/menu`
- 对应代码：
  - [GameContainer.vue](/E:/VSC/H5/SIC-ADS/src/views/emotional/games/GameContainer.vue#L480)
  - [GameContainer.vue](/E:/VSC/H5/SIC-ADS/src/views/emotional/games/GameContainer.vue#L824)

## 5. 底座结论

结论不是“现有底座完全够用即可直接开做”，而是：

- `custom-game-registry`、`custom-game-launch`、`GameContainer` 三者对 `F01_CLOUD_ERASE` 的运行时承载已基本够用。
- 进入 Wave 1 真正实现前，只差 1 个最小底座缺口：`cross-entry custom game 入口适配层`。

这个最小底座缺口只包含两件同一层问题，不扩散成平台级重构：

- 非 `emotional-regulation` 训练入口当前还没有 registry-backed 的 custom game 选择/启动接线，`GameLobby` 仍走旧的 `ResourceSelector -> GamePreviewCard -> /games/play` 链路：
  - [GameLobby.vue](/E:/VSC/H5/SIC-ADS/src/views/games/GameLobby.vue#L83)
  - [GamePreviewCard.vue](/E:/VSC/H5/SIC-ADS/src/components/games/GamePreviewCard.vue#L179)
- custom game 运行结束后的返程还没有按真实训练入口回到正确的 `/games/lobby/:studentId?entry=...`：
  - [GameContainer.vue](/E:/VSC/H5/SIC-ADS/src/views/emotional/games/GameContainer.vue#L824)

因此，Wave 1 第一手不应直接写完整 `F01_CLOUD_ERASE` 业务，而应先补这个最小入口适配缺口。

## 6. 最小验收清单

进入 `F01_CLOUD_ERASE` 真正实现前，先把验收线固定如下：

- 能从 `fine-motor` 入口进入目标小游戏，而不是落到旧的 `/games/play`。
- 启动 query 能稳定形成 `launchContext`，并保留 `entry=fine-motor`、学生信息和难度信息。
- `GameContainer` 对无权限单人游戏可直接进入，不出现额外 gate 阻塞。
- 完成后能写入 `completed + game_complete` 记录。
- 主退出能写入 `aborted + user_exit` 记录。
- 教师结束能写入 `aborted + teacher_exit` 记录。
- 页面离开或系统打断能写入 `aborted + system_interrupt` 记录。
- 返回后能回到正确的 `fine-motor` 游戏大厅，而不是 `/emotional/menu`。
- 旧库不会因当前 custom game schema 差异触发新增报错。
- 不引入新的主进程异常弹窗。

## 7. 既有非本轮问题

以下风险继续标注，但不是本轮新增问题，也不计入 Wave 1 前期准备阻塞项：

- `type-check:emotional` 仍受仓库既有 TS7016 影响
- [CNBSR2016FeedbackConfig.js](/E:/VSC/H5/SIC-ADS/src/config/CNBSR2016FeedbackConfig.js)
- `crypto-js` 类型缺失

## 8. 下一步建议

下一步只做一件事：

- 先补 `cross-entry custom game 入口适配层` 这个最小底座缺口，再进入 `F01_CLOUD_ERASE` 的具体业务实现。

本轮到此为止，不重做 `Phase 0`，也不直接进入 Wave 1 完整实现。
