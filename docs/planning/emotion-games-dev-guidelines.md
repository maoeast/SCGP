# 情绪游戏开发通用范式与避坑指南

> 适用范围：`src/views/games/**`、`src/views/emotional/games/**`、`src/components/emotional/games/**`
> 当前基线：v1.6 / Top 1【深呼吸热气球】落地后总结
> 目标：后续开发【音量魔法森林】等情绪游戏时，统一入口、状态机、布局与特效实现方式，避免重复踩坑

## 1. 路由与入口规范

### 1.1 正式入口

情绪游戏不是从 `src/views/emotional/Menu.vue` 进入，而是统一从：

1. `src/views/games/GameModuleMenu.vue`
2. 选择模块 `情绪调节`
3. `src/views/games/SelectStudent.vue`
4. `src/views/games/GameLobby.vue`
5. 在情绪游戏目录中选择具体游戏

当前 Top 1【深呼吸热气球】的数据目录文件为：

- `src/views/games/emotional-game-catalog.ts`

其中每个游戏必须提供：

- `moduleCode: ModuleCode.EMOTIONAL`
- `resourceType: 'game'`
- `metadata.entryPath`
- `metadata.gameCode`

### 1.2 路由参数格式

从 `GameLobby.vue` 启动情绪游戏时，统一使用：

```ts
router.push({
  path: entryPath,
  query: {
    module: 'emotional',
    studentId: String(studentId),
    studentName: studentName || '',
    difficulty: String(selectedDifficulty),
  },
})
```

当前 Top 1 的路由为：

- `/emotional/games/balloon`

### 1.3 退出返回规范

情绪游戏页退出时，优先回到：

- `/games/lobby/:studentId?module=emotional`

不要退回 `emotional` 模块菜单，否则会形成两套入口。

## 2. 状态机与游戏循环

### 2.1 基本原则

情绪安抚类小游戏必须支持“同一页面无限次重玩”。

一轮完成后：

- 可以发放徽章
- 可以静默落库
- 不能把整页锁死
- 不能要求用户必须先退出再重新进入

错误做法：

- 在 `complete` 后把页面全局 `paused`
- 把本次页面会话标记为 terminal state，阻止后续点击
- 只支持 `安静退出 -> 重新进入` 才能再玩

正确做法：

- `completeGame(payload)` 只表示“完成一轮”
- 游戏组件自己在庆祝动画后调用 `resetForDifficulty()`
- 退出游戏由用户点击 `安静退出` 决定

### 2.2 容器职责

通用容器文件：

- `src/views/emotional/games/GameContainer.vue`

容器统一负责：

- 难度切换
- 设置面板
- 音频控制
- `completed` / `aborted` 落库
- 安静退出

插槽向子游戏暴露的能力至少包括：

- `difficulty`
- `settings`
- `isPaused`
- `completeGame`
- `markRoundDirty`
- `audio`

### 2.3 正确的轮次落库逻辑

必须区分：

- “一轮已开始但未完成”
- “一轮已完成并准备继续玩”

当前范式：

1. 子游戏在玩家真正开始操作时调用 `markRoundDirty()`
2. 一轮完成时调用 `completeGame(...)`
3. `completeGame(...)` 只落一条 `completed`，不会结束整个页面会话
4. 用户中途退出时，只有 `hasDirtyRound === true` 才落 `aborted`
5. 已完成一轮后如果页面已回到可重玩状态，不应再补一条无意义的 `aborted`

### 2.4 响应式状态重置清单

每次进入下一轮时，必须在 `resetForDifficulty()` 中显式重置：

- `showIsland`
- `showRabbits`
- `showBadge`
- `balloonAltitude`
- `holdMs`
- `successfulCycles`
- `perfectCycles`
- `failedReleases`
- `cloudContacts`
- `autoReleaseCount`
- `inhaleSamples`
- `longestInhaleMs`
- `assistanceLevel`
- `phase`
- `particles`

同时必须清理：

- `setTimeout`
- `setInterval`
- `requestAnimationFrame`
- 全局 `pointerup/pointercancel` 监听
- 语音与音效

否则极易出现：

- 通关后按钮不可点击
- 上一轮残影残留
- 粒子或场景错位
- 下一轮误判已完成

## 3. UI 层级与视觉规范

### 3.1 三层分区原则

情绪游戏画面必须强制拆成三层安全区：

1. 背景/收尾场景层
   - 例如天空、彩虹岛、地景
2. 游戏主体层
   - 例如热气球、主角色、目标物
3. 操作与说明层
   - 例如底部操作卡片、主按钮、顶部 HUD

不要把收尾场景和操作卡片放在同一个纵向中心带里。

### 3.2 当前 Top 1 的经验

【深呼吸热气球】已经验证过的结论：

- 彩虹岛不能贴底，也不能和操作卡片底部对齐
- 彩虹岛应放在“热气球和操作卡片之间”
- 顶部 HUD、主视觉、底部卡片要分区固定

### 3.3 Z-Index 规范

建议层级：

- 背景层：默认层
- 场景/游戏主体：`z-index: 2`
- 工具栏：`z-index: 20`
- 粒子特效画布：`z-index: 30`
- 不要让说明卡片压住本应被看见的收尾场景

### 3.4 极简交互规范

已验证的结论：

- 圆形“按住吸气”提示属于重复提示，应删除
- 底部只保留一个主操作按钮
- 对特教训练页，单一入口优于多个重复入口

原则：

- 一个操作，只保留一个主按钮
- 不要用第二个视觉组件重复表达同一动作

## 4. 特效定位与 Canvas 规范

### 4.1 根因总结

本轮踩坑表明：粒子特效出现在左上角，常见原因不是“中心公式不对”，而是 `canvas` 自己没有真正铺满游戏区域。

### 4.2 必须满足的画布规范

庆祝粒子画布至少要满足：

```css
.celebration-canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  z-index: 30;
  pointer-events: none;
}
```

并在运行前调用：

```ts
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
}
```

### 4.3 发射中心计算

当前 Top 1 推荐基线：

```ts
const originX = canvas.width * 0.5
const originY = canvas.height * 0.58
```

原则：

- `x` 取画布中点
- `y` 取页面中下区域，不要过高
- 如果庆祝对象在画面中部，粒子也应围绕中部扩散

### 4.4 粒子范围

为了避免“小小一团”的廉价效果，粒子至少要同时放大：

- 数量
- 横向散射
- 纵向散射
- 初始速度
- 尺寸波动

不要只改一个参数。

## 5. 收尾场景与重置规范

### 5.1 收尾元素

收尾元素包括：

- 彩虹岛
- 岛上彩虹弧线
- 兔子角色
- 徽章弹层
- 粒子特效

### 5.2 重置要求

进入下一轮时，上一轮收尾元素必须立即清场。

不要保留：

- 彩虹岛淡出残影
- 兔子残留
- 徽章短暂残留
- 粒子还在播放

对收尾场景的隐藏，必要时可关闭 `transition`，避免在下一轮开始前出现“只闪一下就消失”的幽灵残影。

## 6. 后续游戏复用建议

后续开发【音量魔法森林】等游戏时，必须复用以下模式：

1. 入口统一挂在 `GameLobby.vue`
2. 游戏页统一由 `GameContainer.vue` 托管
3. 一轮完成后落库，但页面保持可继续玩
4. 背景层、主体层、操作层强制分区
5. 粒子与特效统一走全屏 canvas
6. 收尾场景重置必须无残影

## 7. 开发自检清单

每开发一个新情绪游戏，提交前至少自检：

- [ ] 是否从 `游戏训练 -> 情绪调节 -> GameLobby` 进入
- [ ] 一轮完成后是否还能直接继续玩
- [ ] 是否只有一个主操作按钮，没有重复提示组件
- [ ] 背景/主体/卡片三层是否互不遮挡
- [ ] 粒子是否从正确区域炸开，而不是左上角
- [ ] 收尾场景进入下一轮时是否被立即清空
- [ ] `quiet exit` 是否只在脏轮次写入 `aborted`
- [ ] 是否记录了足够的 `performance_data`

---

如后续情绪游戏出现“只能玩一轮”“UI 互相遮挡”“特效跑偏”等问题，优先回看本文件，而不是直接继续堆补丁。
