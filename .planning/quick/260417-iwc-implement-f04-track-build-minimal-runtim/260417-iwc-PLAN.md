# Quick Plan — F04_TRACK_BUILD / 轨道修补匠 minimal runtime

## Objective

在已完成 registry 接入的基础上，把 `F04_TRACK_BUILD / 轨道修补匠` 补成可启动、可完成、可落库、可在记录详情查看关键指标的一条最小 runtime 闭环；继续保持当前静态路由 + `Page.vue + Game.vue + GameContainer` 模式，不处理 `S03_STORY_SEQ` 已知 bug。

## Current Reality

- `src/data/custom-game-registry.ts` 已存在 `F04_TRACK_BUILD`，归属 `fine-motor`，`entryPath` 为 `/emotional/games/track-build`。
- 当前缺口在于：没有 `TrackBuildPage.vue`、没有 `TrackBuildGame.vue`、路由未接入、`src/database/emotional-games-api.ts` 没有 `F04_TRACK_BUILD` 的摘要推导、`src/views/emotional/GameRecordDetail.vue` 没有对应详情分支。
- `Wave 3` 规划提示 `F04_TRACK_BUILD` 风险在旋转、多指或替代控制设计，因此本次最小 runtime 采用“选轨道件 → 旋转 → 点缺口放置”的替代控制，不直接引入复杂多指交互。

## Tasks

### Task 1 — Implement `F04_TRACK_BUILD` runtime shell, gameplay, and route

- Files:
  - `src/views/emotional/games/TrackBuildPage.vue`
  - `src/components/emotional/games/TrackBuildGame.vue`
  - `src/router/index.ts`
- Action:
  - 新建 `TrackBuildPage.vue`，沿用现有 `GameContainer` 包装模式：`getRequiredCustomGameDefinition('F04_TRACK_BUILD')` + `buildCustomGameLaunchContext(route.query, gameDefinition)`。
  - 在 `src/router/index.ts` 增加懒加载 import 和静态沉浸式路由 `/emotional/games/track-build`，标题用“轨道修补匠”。
  - 新建 `TrackBuildGame.vue`，实现最小正式玩法：
    - 开局后生成若干条“轨道修补任务”；
    - 从轨道件托盘选择轨道件；
    - 使用旋转按钮调整方向；
    - 点击缺口放置，正确则锁定，全部修好后自动完成本轮。
  - 难度只在组件内做轻量递进：
    - `1`：2 条线路、每条 2 个缺口；
    - `2`：3 条线路、每条 2 个缺口；
    - `3`：3 条线路、每条 3 个缺口。
  - `@complete` payload 只走现有 `performanceData` JSON；至少稳定产出这些字段：
    - `correct_placements`
    - `target_gap_count`
    - `completed_layout_count`
    - `target_layout_count`
    - `wrong_placements`
    - `rotation_adjustments`
    - `piece_selections`
    - `placement_times_ms`
    - `average_placement_ms`
    - `layout_durations_ms`
    - `average_layout_ms`
    - `layout_titles`
    - `completed_layout_titles`
    - `placed_piece_labels`
    - `session_theme_key`
    - `session_theme_title`
    - `control_mode`
- Verify:
  - `npm run type-check:emotional`
  - 手工烟测：打开 `/emotional/games/track-build?studentId=1&entry=fine-motor&difficulty=1`，能开始游戏、选择轨道件、旋转、放进缺口、修完整条线路并进入既有完成链路。
- Done:
  - `F04_TRACK_BUILD` 页面、组件、路由全部存在并可编译。
  - 游戏可在不依赖新底座的前提下完成一轮并触发既有落库链路。

### Task 2 — Add `F04_TRACK_BUILD` persistence summaries and record-detail rendering

- Files:
  - `src/database/emotional-games-api.ts`
  - `src/views/emotional/GameRecordDetail.vue`
- Action:
  - 在 `src/database/emotional-games-api.ts` 为 `F04_TRACK_BUILD` 增加摘要推导分支：
    - `deriveAccuracyRate()` 使用 `correct_placements / (correct_placements + wrong_placements)`，缺失时回退到 `correct_placements / target_gap_count`；
    - `deriveAvgResponseTime()` 优先从 `placement_times_ms` 求均值，再回退到 `average_placement_ms`。
  - 在 `src/views/emotional/GameRecordDetail.vue` 增加 `F04_TRACK_BUILD` 的 `metricCards` / `rawRows` 分支，让详情卡片能解释这次轨道修补互动：
    - 关键表现优先展示：修补轨道、完成线路、旋转调整、平均修补；
    - 补充记录展示：错误放置、选取次数、各段耗时、各线路耗时、已完成线路、已放轨道件、主题和控制模式。
- Verify:
  - `npm run type-check:emotional`
  - 手工烟测：完成一局 `F04_TRACK_BUILD` 后进入训练记录详情，摘要卡和详情卡不为空，并能看到 `F04_TRACK_BUILD` 专属指标。
- Done:
  - `F04_TRACK_BUILD` 记录在列表摘要里不再只剩默认值。
  - `GameRecordDetail.vue` 能稳定展示该游戏的关键指标和原始补充信息。

## Out Of Scope

- 不改注册表/路由系统结构。
- 不引入多指或复杂拖拽底座。
- 不改数据库 schema。
- 不处理 `S03_STORY_SEQ` 拖拽识别 bug。

## Final Verification

- `npm run type-check:emotional`
- 从 `fine-motor` 入口或直接路由进入 `F04_TRACK_BUILD`，完成一轮后确认：
  - 游戏可交互；
  - 轨道选择、旋转、放置可用；
  - 完成后能走既有 closeout / persistence；
  - 训练记录详情可看到 `F04_TRACK_BUILD` 的专属摘要与原始字段。
