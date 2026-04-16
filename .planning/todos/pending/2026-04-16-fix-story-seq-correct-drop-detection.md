---
created: 2026-04-16T07:40:23.088Z
title: Fix story-seq correct drop detection
area: ui
files:
  - src/components/emotional/games/StorySequenceGame.vue
  - src/views/emotional/games/StorySequencePage.vue
  - src/data/custom-game-registry.ts
  - src/views/emotional/GameRecordDetail.vue
---

## Problem

`S03_STORY_SEQ / 故事接龙板` 当前已经接入正式链路并通过 `npm run type-check:emotional`，但人工验收发现一个关键交互 bug：

- 当用户把正确的故事卡拖到托盘/目标槽位时，系统没有按预期识别为正确放置
- 结果表现为当前步骤没有推进，界面也没有进入正确吸附和成功反馈

这说明 `StorySequenceGame.vue` 里的拖拽落点识别或“当前目标槽位 / 正确卡片”判定仍有问题。该问题会直接阻断游戏完成，因此不能视为已通过完整人工验收。

## Solution

优先回查 `src/components/emotional/games/StorySequenceGame.vue` 中以下链路：

- `resolveSlotIndexFromPoint(...)` 的命中元素是否稳定命中目标槽位
- `attemptPlaceCard(...)` 对 `currentSlotIndex` 和 `card.orderIndex` 的判定是否与真实 UI 落点一致
- `layoutStoryCards()` 与槽位 anchor 计算是否导致卡片看起来落在槽位里，但实际 pointerup 时命中的不是槽位元素
- 必要时给时间轴槽位增加更稳定的命中区域，或改为基于 card center 与 slot rect 的几何判定，而不是只依赖 `elementFromPoint`

修复后需要重新人工验收：

- 正确卡拖到当前目标槽位时应立即吸附并进入下一步
- 错误卡或错误槽位仍应保持弹回和计错
- 完成一局后仍应自动重开并正确写入记录
