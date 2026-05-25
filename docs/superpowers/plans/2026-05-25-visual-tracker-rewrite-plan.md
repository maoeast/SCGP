# 视觉追踪游戏重写实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将现有半成品视觉追踪游戏重写为默认可玩的触摸/鼠标追踪训练，优先满足特殊儿童现场训练的稳定性、低挫败和可记录数据。

**架构：** 不继续把 WebGazer 眼动校准作为核心玩法。新增纯函数追踪引擎负责轨迹、命中判定和统计汇总；`VisualTracker.vue` 只负责交互、动画和训练记录输出。保留现有 `GamePlay -> VisualTracker -> GameSessionData` 链路，避免改训练记录 schema。

**技术栈：** Vue 3、TypeScript、Vite、现有 `TaskID.VISUAL_TRACK`、现有 `GameSessionData.trackingData/trackingStats`、Node 定向测试。

---

## 文件结构

- 创建：`src/utils/visual-tracking-engine.ts`，负责目标轨迹、命中判定、样本统计。
- 创建：`scripts/tests/visual-tracking-engine.test.mjs`，验证轨迹边界、命中判定、统计汇总。
- 修改：`src/components/games/visual/VisualTracker.vue`，重写为星光巡航训练界面。
- 修改：`src/types/games.ts`，扩展 `trackingStats` 的非破坏性可选统计字段。
- 修改：`src/utils/iep-generator.ts`，在视觉追踪报告里补充稳定性、断开次数等行为描述。

## 任务

### 任务 1：追踪引擎红灯测试

- [x] **步骤 1：新增失败测试**

创建 `scripts/tests/visual-tracking-engine.test.mjs`，断言：
- `resolveTrackingTarget()` 生成的位置始终留在安全边界内。
- `createTrackingSample()` 能按像素半径判断是否跟上目标。
- `summarizeTrackingSamples()` 能计算在靶率、断开次数、最长连续跟随时间和稳定度。

- [x] **步骤 2：运行测试确认失败**

运行：`node scripts/tests/visual-tracking-engine.test.mjs`

预期：失败，报错找不到 `src/utils/visual-tracking-engine.ts`。

### 任务 2：实现追踪引擎

- [x] **步骤 1：创建 `src/utils/visual-tracking-engine.ts`**

提供：
- `resolveTrackingTarget(options)`
- `createTrackingSample(input)`
- `summarizeTrackingSamples(samples, options)`

- [x] **步骤 2：运行追踪引擎测试**

运行：`node scripts/tests/visual-tracking-engine.test.mjs`

预期：通过。

### 任务 3：重写视觉追踪运行组件

- [x] **步骤 1：重写 `VisualTracker.vue`**

移除核心路径中的 WebGazer 校准、摄像头预览和调试面板。默认使用 pointer/touch 输入。训练流程为：
- 准备页：说明“按住星光并跟随移动”。
- 训练页：发光目标沿平滑轨迹移动，显示时间、跟随率、最长连续跟随。
- 结果页：输出鼓励反馈，随后仍由 `GamePlay` 保存记录并跳转报告。

- [x] **步骤 2：保证输出 `GameSessionData` 兼容现有链路**

保留：
- `trackingData.timeOnTarget`
- `trackingData.totalTime`
- `trackingData.timeOnTargetPercent`
- `trackingData.samplePoints`
- `trackingStats.timeOnTargetPercent`

新增可选：
- `trackingStats.followStability`
- `trackingStats.breakCount`
- `trackingStats.longestStreakMs`
- `trackingStats.inputMode`

### 任务 4：报告与验证

- [x] **步骤 1：补充视觉追踪报告行为描述**

`src/utils/iep-generator.ts` 在视觉追踪段落中读取可选统计字段，补充断开次数、最长连续跟随和稳定性描述。

- [x] **步骤 2：运行验证**

运行：
```bash
node scripts/tests/visual-tracking-engine.test.mjs
npm run type-check
```

预期：全部通过。
