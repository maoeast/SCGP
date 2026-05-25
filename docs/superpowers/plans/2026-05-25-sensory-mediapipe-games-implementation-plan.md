# 感官统合 MediaPipe 手势游戏实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在“游戏训练 > 感官统合训练”中新增 3 个适合特殊儿童训练的摄像头手势游戏：空气木琴、木块磁贴、森林手势魔法屋。

**架构：** 沿用感官游戏主链，扩展 `SENSORY_GAME_SEED`、`TaskID` 和 `GamePlay`，避免替换现有 7 个感官游戏。手势数学判定放在纯工具模块，MediaPipe Hands 初始化放在 composable，游戏组件只消费稳定的手部点位状态。

**技术栈：** Vue 3、TypeScript、Vite、`@mediapipe/tasks-vision`、现有 `GameTrainingAPI` 训练记录链。

---

## 文件结构

- 创建：`src/utils/hand-game-gestures.ts`，纯函数手势判定、坐标映射和击打检测。
- 创建：`src/composables/useHandLandmarker.ts`，封装 MediaPipe Hands 初始化、视频帧检测和资源释放。
- 创建：`src/components/games/hand/HandCameraLayer.vue`，摄像头视频与手部光标覆盖层。
- 创建：`src/components/games/hand/AirXylophoneGame.vue`，空气木琴游戏。
- 创建：`src/components/games/hand/WoodBlockPuzzleGame.vue`，木块磁贴拼图游戏。
- 创建：`src/components/games/hand/GestureGardenGame.vue`，森林手势魔法屋游戏。
- 修改：`src/types/games.ts`，新增 3 个 `TaskID` 与手势游戏会话数据类型。
- 修改：`src/data/sensory-game-seed.ts`，新增 3 个感官统合游戏 seed。
- 修改：`src/components/games/GamePreviewCard.vue`，给新游戏提供摄像头训练配置入口。
- 修改：`src/views/games/GamePlay.vue`，渲染新游戏并保存训练记录。
- 测试：`scripts/tests/sensory-hand-gestures.test.mjs`，验证手势判定规则。
- 测试：`scripts/tests/sensory-hand-games.test.mjs`，验证 seed、类型和播放页接线。

## 任务

### 任务 1：红灯测试

- [x] **步骤 1：新增失败测试**

运行：

```bash
node scripts/tests/sensory-hand-gestures.test.mjs
node scripts/tests/sensory-hand-games.test.mjs
```

预期：因 `src/utils/hand-game-gestures.ts` 不存在、`TaskID` 未包含 8/9/10、seed 未包含新游戏而失败。

### 任务 2：手势工具与 MediaPipe composable

- [x] **步骤 1：实现 `src/utils/hand-game-gestures.ts`**

提供 `isPinching()`、`classifyHandPose()`、`detectDownwardStrike()`、`mapLandmarkToStagePoint()`、`findRectHit()`。

- [x] **步骤 2：实现 `src/composables/useHandLandmarker.ts`**

使用 `FilesetResolver.forVisionTasks()` 与 `HandLandmarker.createFromOptions()`，输出双手 landmarks 与错误状态。

- [x] **步骤 3：运行手势测试**

运行：`node scripts/tests/sensory-hand-gestures.test.mjs`

预期：通过。

### 任务 3：感官主链接线

- [x] **步骤 1：扩展 `TaskID`、seed 和预览卡**

新增：

```ts
HAND_XYLOPHONE = 8
HAND_WOOD_BLOCKS = 9
HAND_GESTURE_GARDEN = 10
```

- [x] **步骤 2：修改 `GamePlay` 识别新任务**

新增 3 个分支渲染手势游戏组件，并在训练页显示体感节奏、抓放配对、手势计划等模式标签。

- [x] **步骤 3：运行主链接线测试**

运行：`node scripts/tests/sensory-hand-games.test.mjs`

预期：通过。

### 任务 4：三个游戏组件

- [x] **步骤 1：创建 `HandCameraLayer.vue`**

负责摄像头画面、手部光标、权限失败提示和 pointer fallback。

- [x] **步骤 2：创建 `AirXylophoneGame.vue`**

检测向下击打，记录 `notesPlayed`、`streak`、`strikeCount`。

- [x] **步骤 3：创建 `WoodBlockPuzzleGame.vue`**

检测 pinch 抓放，记录 `placedBlocks`、`attempts`、`pinchCount`。

- [x] **步骤 4：创建 `GestureGardenGame.vue`**

检测 open/fist 状态切换，记录 `growthStage`、`gestureChanges`、`stableGestureMs`。

### 任务 5：验证

- [x] **步骤 1：运行 targeted tests**

```bash
node scripts/tests/sensory-hand-gestures.test.mjs
node scripts/tests/sensory-hand-games.test.mjs
```

- [x] **步骤 2：运行类型检查**

```bash
npm run type-check
```

- [ ] **步骤 3：如能启动，运行本地前端检查**

```bash
npm run dev:simple
```

打开 `/games/menu` 后进入感官统合训练，确认新增游戏可见并能进入训练页。
