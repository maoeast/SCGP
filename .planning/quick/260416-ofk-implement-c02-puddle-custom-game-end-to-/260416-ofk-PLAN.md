# Quick Plan — C02_PUDDLE / 水塘波纹

## Objective

在现有 cross-entry custom game 底座上，把 `C02_PUDDLE` 做成可启动、可完成、可落库、可在记录详情查看关键指标的一条可用闭环；保持当前静态路由 + `Page.vue + Game.vue + GameContainer` 模式，不做额外重构，也不处理 `S03_STORY_SEQ` 现有 bug。

## Current Reality

- `src/data/custom-game-registry.ts` 里已经存在 `C02_PUDDLE` 注册表定义，归属 `soothing-aids`，`entryPath` 已是 `/emotional/games/puddle`。
- 当前缺口在于：没有 `PuddlePage.vue`、没有 `PuddleGame.vue`、路由未接入、`src/database/emotional-games-api.ts` 没有 `C02_PUDDLE` 的摘要推导、`src/views/emotional/GameRecordDetail.vue` 没有对应详情分支。
- 当前代码现实仍是静态路由表，不是注册表动态装配；本次按现有静态路由模式补齐。
- `C02_PUDDLE` 在规划里属于“多点触控 + 永不自动结束模型”，但本次不能为它新增共享输入底座或新 schema，只能在现有游戏组件契约内实现。

## Tasks

### Task 1 — Implement `C02_PUDDLE` runtime shell, gameplay, and route

- Files:
  - `src/views/emotional/games/PuddlePage.vue`
  - `src/components/emotional/games/PuddleGame.vue`
  - `src/router/index.ts`
- Action:
  - 新建 `PuddlePage.vue`，完全沿用 `DandelionPage.vue` / `BalloonTapPage.vue` 的包装模式：`getRequiredCustomGameDefinition('C02_PUDDLE')` + `buildCustomGameLaunchContext(route.query, gameDefinition)` + `GameContainer` slot。
  - 在 `src/router/index.ts` 增加懒加载 import 和静态沉浸式路由 `/emotional/games/puddle`，标题用“水塘波纹”；不要改路由系统结构。
  - 新建 `PuddleGame.vue`，做大屏横向安抚场景：平静水面、轻点生成单次波纹、长按生成持续扩散波纹，并在组件内部用 `pointerId` 做 best-effort 的双触点/多触点波纹，不改共享输入层。
  - 难度只在当前组件内做轻量递进，不引入新底座：
    - `1`：自由轻点/长按，重点是稳定触碰；
    - `2`：加入慢节奏提示，统计节奏内命中；
    - `3`：允许双手轮流或同时触碰，统计双触点时刻与最长平稳连续时长。
  - 遵守“永不自动结束”现实约束：不要加自动完成条件、不要加倒计时完成；改为在游戏内提供明确的“完成本轮”按钮，由它触发 `completeGame`。容器已有的退出入口继续保留 `user_exit` / `teacher_exit` 语义。
  - `@complete` payload 只走现有 `performanceData` JSON，不碰 schema；至少稳定产出这些字段，供后续摘要和详情复用：
    - `ripple_count`
    - `hold_ripple_count`
    - `dual_touch_moments`
    - `rhythm_hit_count`
    - `target_pulse_count`
    - `calm_ripple_ratio`
    - `calm_streak_peak_ms`
    - `interaction_intervals_ms`
    - `hold_durations_ms`
    - `session_theme_key`
    - `session_theme_title`
    - `manual_complete`
- Verify:
  - `npm run type-check:emotional`
  - 手工烟测：打开 `/emotional/games/puddle?studentId=1&entry=soothing-aids&difficulty=1`，能进入游戏、产生波纹、点击“完成本轮”后进入现有完成链路。
- Done:
  - `C02_PUDDLE` 页面、组件、路由全部存在并可编译。
  - 游戏可在不依赖新底座的前提下完成一轮并触发既有落库链路。
  - 本任务不修改 `S03_STORY_SEQ` 相关代码。

### Task 2 — Add `C02_PUDDLE` persistence summaries and record-detail rendering

- Files:
  - `src/database/emotional-games-api.ts`
  - `src/views/emotional/GameRecordDetail.vue`
- Action:
  - 在 `src/database/emotional-games-api.ts` 为 `C02_PUDDLE` 增加摘要推导分支，但不要把“安抚类”误写成硬性的对错题：
    - `deriveAccuracyRate()` 优先使用 `calm_ripple_ratio`；
    - 如果缺少该字段，则回退到 `rhythm_hit_count / target_pulse_count`；
    - 再不满足时，仅在 `completion_status === 'completed'` 时回退到 `1`，避免把中断会话伪装成高分。
    - `deriveAvgResponseTime()` 从 `interaction_intervals_ms` 求均值；如果该数组为空，再回退到 `hold_durations_ms`。
  - 在 `src/views/emotional/GameRecordDetail.vue` 增加 `C02_PUDDLE` 的 `metricCards` / `rawRows` 分支，让详情卡片能解释本次安抚互动，而不是空白：
    - 关键表现优先展示：总波纹、长按波纹、双触点时刻、平稳节奏比率或最长平稳时长；
    - 补充记录展示：节奏命中、提示脉冲数、平均触碰间隔、平均长按时长、各次触碰间隔、场景主题、是否手动完成。
  - 复用现有格式化 helper；只在确有必要时新增最小 helper，不整理其他游戏分支，不顺手修 `S03_STORY_SEQ`。
- Verify:
  - `npm run type-check:emotional`
  - 手工烟测：完成一局 `C02_PUDDLE` 后进入训练记录详情，摘要卡和详情卡不为空，并能看到 `C02_PUDDLE` 专属指标。
- Done:
  - `C02_PUDDLE` 记录在列表摘要里不再只剩默认值。
  - `GameRecordDetail.vue` 能稳定展示该游戏的关键指标和原始补充信息。

## Out Of Scope

- 不做注册表/路由系统重构。
- 不改数据库 schema。
- 不处理 `S03_STORY_SEQ` 拖拽识别 bug。
- 不顺手扩展 `C03_XYLOPHONE` 或其他 Wave 2 游戏。

## Final Verification

- `npm run type-check:emotional`
- 从 `soothing-aids` 入口或直接路由进入 `C02_PUDDLE`，完成一轮后确认：
  - 游戏可交互；
  - 完成按钮能走既有 closeout / persistence；
  - 训练记录详情可看到 `C02_PUDDLE` 的专属摘要与原始字段。
