# 感统游戏全屏沉浸式改造计划

> 日期：2026-04-19
> 范围：仅覆盖 `games` 模块下的 `sensory-integration` 早期 7 个感统游戏。
> 当前阶段：Phase 1 执行中

## 1. 当前代码现实

- 感统游戏当前共由 3 个运行组件承载：
  - `src/components/games/visual/GameGrid.vue`
  - `src/components/games/audio/GameAudio.vue`
  - `src/components/games/visual/VisualTracker.vue`
- Electron 窗口默认全屏，但感统游戏运行态仍是桌面后台式布局，不是触摸优先的沉浸式训练态。
- 启动链路 `GameLobby -> GamePreviewCard -> GamePlay` 仍有大量后台页面元素与固定宽度弹窗，不适合 27 英寸触摸屏现场操作。

## 2. 目标

- 将感统游戏改造成“全屏沉浸式 shell + 触摸优先运行态”。
- 第一阶段只收口启动链路与共享 shell，不在同一阶段深入重写 `VisualTracker` 的算法和校准逻辑。

## 3. 执行策略

采用“复用现有沉浸式模式，先改底座，再逐个运行组件收口”的路线：

1. 先重构启动链路，降低运行前后台信息密度。
2. 引入感统共享沉浸式壳，统一 HUD、退出、学生信息、游戏信息与安全区。
3. 让 `GamePlay` 接管感统运行态布局，不再把旧组件直接裸渲染在空白页面上。
4. 第二阶段再分别处理：
   - `GameGrid`
   - `GameAudio`
   - `VisualTracker`

## 4. Phase 1 范围

### 涉及文件

- 新增：`src/components/games/SensoryGameShell.vue`
- 修改：`src/views/games/GameLobby.vue`
- 修改：`src/components/games/GamePreviewCard.vue`
- 修改：`src/views/games/GamePlay.vue`

### 不在本阶段内

- 不改 `src/components/games/visual/VisualTracker.vue` 的眼动算法
- 不改训练记录 schema
- 不改 `IEPReport`
- 不改 emotional 小游戏链路

## 5. Phase 1 目标状态

### 5.1 启动链路

- `GameLobby` 在感统入口下切换为更聚焦的训练准备页：
  - 弱化后台式面包屑和信息噪音
  - 保留学生与入口切换
  - 明确“即将进入全屏训练”

- `GamePreviewCard` 对感统游戏切换为触摸友好的启动面板：
  - 训练说明与参数设置以大按钮分组呈现
  - 不再依赖 480px 小弹窗作为主要配置入口
  - 直接输出统一的启动参数给 `GamePlay`

### 5.2 运行态

- `GamePlay` 用共享壳包裹感统游戏：
  - 顶部保留最小必要 HUD
  - 提供显式返回入口
  - 提供游戏名称 / 学生名称 / 当前模式
  - 提供加载态 / 错误态 / 运行态统一视觉基线

## 6. 验收口径

- 感统入口从“选择游戏”到“进入训练”常规路径不超过 3 次主要点击。
- 运行态进入后不再出现后台式空白留白和普通卡片页观感。
- 共享壳不影响现有训练记录保存和报告跳转链路。
- `npm run type-check -- --pretty false` 通过。

## 7. 当前已知验证限制

- 仓库当前没有现成的感统游戏组件级自动化测试入口。
- Phase 1 先以类型检查 + 代码路径核验作为开发验证。
- 27 英寸触摸屏 Electron 实机验证放到后续阶段单独执行。
