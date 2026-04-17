# Quick Plan — F04_TRACK_BUILD / 轨道修补匠 registry start

## Objective

按 `gsd-quick` 启动 `Wave 3` 的 `F04_TRACK_BUILD / 轨道修补匠`，先在 `src/data/custom-game-registry.ts` 新增正式 registry 定义并挂到 `fine-motor`；本次只做入口注册，不扩到运行时页面、静态路由、记录摘要或 `S03_STORY_SEQ` bug 返修。

## Current Reality

- `docs/planning/2026-04-13-cross-entry-custom-games-expansion-plan.md` 已把 `F04_TRACK_BUILD` 列为 `Wave 3` 的 `fine-motor` 游戏，但当前代码里还没有对应 registry 条目。
- `src/data/custom-game-registry.ts` 已收口 `F01`、`F02`、`F03`、`F05` 的 `fine-motor` 自定义游戏定义，风格、字段和元数据格式都已明确。
- 当前平台路由仍以静态路由表为主，不是注册表驱动动态装配；因此本次 registry 落地后，`F04` 仍处于“已注册、运行时待补”的过渡态。

## Tasks

### Task 1 — Add `F04_TRACK_BUILD` registry definition under `fine-motor`

- Files:
  - `src/data/custom-game-registry.ts`
- Action:
  - 在 `F03_RECYCLING` 与 `F05_BALLOONS` 之间新增 `F04_TRACK_BUILD`。
  - 维持现有 `CustomGameDefinition` 结构与文案风格，填写：
    - `moduleCode: ModuleCode.SENSORY`
    - `trainingEntryCode: 'fine-motor'`
    - `entryPath: '/emotional/games/track-build'`
    - 单人、无权限、非锁难度
  - 为 `badge` 和 `metadata` 补齐最小正式信息，主题围绕轨道拼接、旋转控制和手眼协调。
  - 不顺手修改其他游戏定义，不触碰 `S03_STORY_SEQ`。
- Verify:
  - `npm run type-check:emotional`
  - 代码检查确认 `CUSTOM_GAME_REGISTRY` 中已存在 `F04_TRACK_BUILD` 且归属 `fine-motor`
- Done:
  - `F04_TRACK_BUILD` 已在 registry 中可被统一查询到。
  - `fine-motor` 自定义游戏列表包含 `F04_TRACK_BUILD`。

## Out Of Scope

- 不新增 `TrackBuildPage.vue` 或 `TrackBuildGame.vue`
- 不新增静态路由 `/emotional/games/track-build`
- 不补 `emotional-games-api` 摘要逻辑
- 不处理 `S03_STORY_SEQ` 已知 bug

## Final Verification

- `npm run type-check:emotional`
- `rg -n "F04_TRACK_BUILD" src/data/custom-game-registry.ts`
