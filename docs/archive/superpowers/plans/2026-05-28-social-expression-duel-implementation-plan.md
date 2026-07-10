# 双人表情擂台实现计划

> **面向 AI 代理的工作说明：** 优先按小步提交实现本计划；每个阶段先补测试，再补最小实现，再验证。
> **目标：** 在“游戏训练 -> 社交沟通力”下新增一个接入现有小游戏主链的双人小游戏“表情擂台”，支持双人共享场次、摄像头表情模仿对战、训练记录落库和记录详情展示。
> **架构：** 复用现有 `custom-game-registry -> GameLobby -> GameContainer -> EmotionalGamesAPI -> GameRecordDetail` 主链；新增一个双人页面壳和一个独立运行时逻辑模块，用共享镜头双人检测驱动回合制表情模仿。
> **技术栈：** Vue 3、TypeScript、Element Plus、MediaPipe FaceLandmarker、现有 EmotionalGamesAPI 记录链。

---

## 文件结构

- 新建 `scripts/tests/social-expression-duel.test.mjs`
  - 覆盖注册表、路由接入、运行时纯逻辑、记录详情映射。
- 新建 `src/components/emotional/games/expression-duel.ts`
  - 纯逻辑层，负责双人轮次配置、脸位分配、表情相似度计算、结果汇总。
- 新建 `src/components/emotional/games/ExpressionDuelGame.vue`
  - 双人表情擂台运行时组件。
- 新建 `src/views/emotional/games/ExpressionDuelPage.vue`
  - 接入 `GameContainer` 的页面壳。
- 修改 `src/data/custom-game-registry.ts`
  - 注册 `S06_EXPRESSION_DUEL` 到 `social-communication`。
- 修改 `src/router/index.ts`
  - 增加 `ExpressionDuelPage` 动态导入与路由。
- 修改 `src/database/emotional-games-api.ts`
  - 为新游戏补齐 `accuracy_rate` 与 `avg_response_time` 派生规则。
- 修改 `src/views/emotional/GameRecordDetail.vue`
  - 新增 `S06_EXPRESSION_DUEL` 指标卡与补充记录映射。

## 任务 1：注册与接入测试

**文件：**
- 创建：`scripts/tests/social-expression-duel.test.mjs`

- [ ] 写失败测试，断言注册表存在 `S06_EXPRESSION_DUEL`，且位于 `social-communication`，支持 2 人、需要摄像头。
- [ ] 写失败测试，断言路由存在 `/emotional/games/expression-duel` 且页面组件已接入。
- [ ] 写失败测试，断言记录详情页与落库派生逻辑包含 `S06_EXPRESSION_DUEL` 分支。
- [ ] 运行：`node --test scripts/tests/social-expression-duel.test.mjs`
- [ ] 预期：测试失败，提示缺少注册/路由/实现分支。

## 任务 2：纯逻辑运行时

**文件：**
- 创建：`src/components/emotional/games/expression-duel.ts`
- 修改：`scripts/tests/social-expression-duel.test.mjs`

- [ ] 先补失败测试，覆盖双人脸位按左右排序、相似度计算、对局汇总输出。
- [ ] 实现最小纯函数：
  - `assignDuelFacesByHorizontalOrder(...)`
  - `computeExpressionDuelSimilarity(...)`
  - `getExpressionDuelDifficultyConfig(...)`
  - `buildExpressionDuelPerformanceData(...)`
- [ ] 运行：`node --test scripts/tests/social-expression-duel.test.mjs`
- [ ] 预期：纯逻辑相关断言转绿，其余接入断言仍失败。

## 任务 3：接入主链

**文件：**
- 修改：`src/data/custom-game-registry.ts`
- 创建：`src/views/emotional/games/ExpressionDuelPage.vue`
- 修改：`src/router/index.ts`

- [ ] 在注册表新增 `S06_EXPRESSION_DUEL`，归属 `ModuleCode.SOCIAL` + `social-communication`。
- [ ] 新增页面壳，按现有页面模式接入 `GameContainer`。
- [ ] 新增路由导入与 `immersiveShell` 路由节点。
- [ ] 运行：`node --test scripts/tests/social-expression-duel.test.mjs`
- [ ] 预期：注册/路由断言通过，运行时与记录展示断言如未完成则继续失败。

## 任务 4：实现双人表情擂台组件

**文件：**
- 创建：`src/components/emotional/games/ExpressionDuelGame.vue`

- [ ] 实现共享镜头双人模式：
  - 启动选定摄像头
  - 每帧检测最多 2 张脸
  - 按水平位置分配左/右玩家
  - 轮流“出题/模仿”
  - 计时、得分、暂停、跳过、教师加分
- [ ] 完成回合结束后通过 `emit('complete', payload)` 走现有共享场次落库链。
- [ ] 确保组件卸载时停止媒体流、动画帧和 MediaPipe 实例。

## 任务 5：记录派生与详情展示

**文件：**
- 修改：`src/database/emotional-games-api.ts`
- 修改：`src/views/emotional/GameRecordDetail.vue`

- [ ] 为 `S06_EXPRESSION_DUEL` 增加 `accuracy_rate` 规则，优先读取 `average_similarity_ratio`。
- [ ] 为 `S06_EXPRESSION_DUEL` 增加 `avg_response_time` 规则，优先读取 `average_mimic_duration_ms`。
- [ ] 在记录详情页新增关键指标卡与补充记录映射，避免直接暴露原始 JSON 字段名。

## 任务 6：验证

**文件：**
- 测试：`scripts/tests/social-expression-duel.test.mjs`

- [ ] 运行：`node --test scripts/tests/social-expression-duel.test.mjs`
- [ ] 运行：`npm run type-check`
- [ ] 如类型检查被历史问题阻塞，记录阻塞点并确认本次新增文件无新增报错。
