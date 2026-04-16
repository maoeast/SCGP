# Quick Plan — C03_XYLOPHONE / 星空八音盒

## Objective

在现有 cross-entry custom game 底座上，把 `C03_XYLOPHONE` 做成可启动、可敲击、可录制回放、可手动完成、可落库、可在记录详情查看关键指标的一条最小可用闭环；保持当前静态路由 + `Page.vue + Game.vue + GameContainer` 模式，不做额外重构，也不处理 `S03_STORY_SEQ` 现有 bug。

## Current Reality

- `src/data/custom-game-registry.ts` 里已经存在 `C03_XYLOPHONE` 注册表定义，归属 `soothing-aids`，`entryPath` 已是 `/emotional/games/xylophone`。
- 当前缺口在于：没有 `XylophonePage.vue`、没有 `XylophoneGame.vue`、路由未接入、`src/database/emotional-games-api.ts` 没有 `C03_XYLOPHONE` 的摘要推导、`src/views/emotional/GameRecordDetail.vue` 没有对应详情分支。
- 当前代码现实仍是静态路由表，不是注册表动态装配；本次按现有静态路由模式补齐。
- 规划对 `C03_XYLOPHONE` 的要求重点是“五声音阶 + 录制回放”，但本次不能扩共享音频底座或新 schema，只能在现有游戏组件契约内实现最小正式玩法。

## Tasks

### Task 1 — Implement `C03_XYLOPHONE` runtime shell, gameplay, and route

- Files:
  - `src/views/emotional/games/XylophonePage.vue`
  - `src/components/emotional/games/XylophoneGame.vue`
  - `src/router/index.ts`
- Action:
  - 新建 `XylophonePage.vue`，沿用现有 `GameContainer` 包装模式：`getRequiredCustomGameDefinition('C03_XYLOPHONE')` + `buildCustomGameLaunchContext(route.query, gameDefinition)`。
  - 在 `src/router/index.ts` 增加懒加载 import 和静态沉浸式路由 `/emotional/games/xylophone`，标题用“星空八音盒”；不要改路由系统结构。
  - 新建 `XylophoneGame.vue`，提供五声音阶音条、夜空主题轮换、点击发声、录制短旋律、回放已录旋律，以及现有容器体系下的“手动完成本轮”。
  - 难度只在组件内做轻量递进：
    - `1`：自由敲击 + 简短录制；
    - `2`：加入 3 音引导序列，统计跟弹命中；
    - `3`：加入 4 音引导序列，统计更长节奏跟弹。
  - 不做自动结束；教师在积累足够交互后手动完成。
  - `@complete` payload 只走现有 `performanceData` JSON；至少稳定产出这些字段：
    - `note_tap_count`
    - `unique_note_count`
    - `recorded_phrase_count`
    - `playback_count`
    - `guided_prompt_count`
    - `prompt_hits`
    - `prompt_misses`
    - `tap_intervals_ms`
    - `prompt_response_times_ms`
    - `recorded_note_labels`
    - `session_theme_key`
    - `session_theme_title`
    - `manual_complete`
- Verify:
  - `npm run type-check:emotional`
  - 手工烟测：打开 `/emotional/games/xylophone?studentId=1&entry=soothing-aids&difficulty=1`，能进入游戏、敲出音条、录制并回放一段旋律、点击“完成本轮”后进入既有完成链路。
- Done:
  - `C03_XYLOPHONE` 页面、组件、路由全部存在并可编译。
  - 游戏可在不依赖新底座的前提下完成一轮并触发既有落库链路。
  - 本任务不修改 `S03_STORY_SEQ` 相关代码。

### Task 2 — Add `C03_XYLOPHONE` persistence summaries and record-detail rendering

- Files:
  - `src/database/emotional-games-api.ts`
  - `src/views/emotional/GameRecordDetail.vue`
- Action:
  - 在 `src/database/emotional-games-api.ts` 为 `C03_XYLOPHONE` 增加摘要推导分支：
    - `deriveAccuracyRate()` 使用 `prompt_hits / guided_prompt_count`，缺失时回退到 `prompt_hits / (prompt_hits + prompt_misses)`；
    - `deriveAvgResponseTime()` 优先从 `prompt_response_times_ms` 求均值，再回退到 `tap_intervals_ms`。
  - 在 `src/views/emotional/GameRecordDetail.vue` 增加 `C03_XYLOPHONE` 的 `metricCards` / `rawRows` 分支，让详情卡片能解释这次音乐安抚互动：
    - 关键表现优先展示：总敲击、引导命中、录制次数、回放次数；
    - 补充记录展示：不同音条数、平均提示应答、敲击间隔、已录旋律、主题和是否手动完成。
  - 复用现有格式化 helper；只在确有必要时新增最小 helper，不整理其他游戏分支，不顺手修 `S03_STORY_SEQ`。
- Verify:
  - `npm run type-check:emotional`
  - 手工烟测：完成一局 `C03_XYLOPHONE` 后进入训练记录详情，摘要卡和详情卡不为空，并能看到 `C03_XYLOPHONE` 专属指标。
- Done:
  - `C03_XYLOPHONE` 记录在列表摘要里不再只剩默认值。
  - `GameRecordDetail.vue` 能稳定展示该游戏的关键指标和原始补充信息。

## Out Of Scope

- 不做注册表/路由系统重构。
- 不改数据库 schema。
- 不处理 `S03_STORY_SEQ` 拖拽识别 bug。
- 不顺手扩展 `C05_MOOD_METER` 或其他后续 Wave 任务。

## Final Verification

- `npm run type-check:emotional`
- 从 `soothing-aids` 入口或直接路由进入 `C03_XYLOPHONE`，完成一轮后确认：
  - 游戏可交互；
  - 录制与回放可用；
  - 完成按钮能走既有 closeout / persistence；
  - 训练记录详情可看到 `C03_XYLOPHONE` 的专属摘要与原始字段。
