# Quick Plan — S05_ECHO_PARROT / 动物传声筒 registry start

## Objective

按 `gsd-quick` 启动 `Wave 3` 的 `S05_ECHO_PARROT / 动物传声筒`，先在 `src/data/custom-game-registry.ts` 新增正式 registry 定义并挂到 `social-communication`；本次只做入口注册，不扩到运行时页面、静态路由、记录摘要或 `S03_STORY_SEQ` bug 返修。

## Current Reality

- `docs/planning/2026-04-13-cross-entry-custom-games-expansion-plan.md` 已把 `S05_ECHO_PARROT` 列为 `Wave 3` 的 `social-communication` 游戏，但当前代码里还没有对应 registry 条目。
- `src/data/custom-game-registry.ts` 已收口 `S01`、`S02`、`S03`、`S04` 的 `social-communication` 自定义游戏定义，风格、字段和元数据格式都已明确。
- 规划文档已经明确 `S05_ECHO_PARROT` 依赖 `microphone` 且权限策略应为 `all_required`；当前平台路由仍是静态装配，因此本次 registry 落地后，`S05` 仍处于“已注册、运行时待补”的过渡态。

## Tasks

### Task 1 — Add `S05_ECHO_PARROT` registry definition under `social-communication`

- Files:
  - `src/data/custom-game-registry.ts`
- Action:
  - 在 `S04_GIFT_MATCH` 与 `C01_DANDELION` 之间新增 `S05_ECHO_PARROT`。
  - 维持现有 `CustomGameDefinition` 结构与文案风格，填写：
    - `moduleCode: ModuleCode.SOCIAL`
    - `trainingEntryCode: 'social-communication'`
    - `entryPath: '/emotional/games/echo-parrot'`
    - 单人、麦克风必需、`permissionPolicy: 'all_required'`
  - 为 `badge` 和 `metadata` 补齐最小正式信息，主题围绕倾听、仿说、动物传声筒与轮流回应。
  - 不顺手修改其他游戏定义，不触碰 `S03_STORY_SEQ`。
- Verify:
  - `npm run type-check:emotional`
  - 代码检查确认 `CUSTOM_GAME_REGISTRY` 中已存在 `S05_ECHO_PARROT` 且归属 `social-communication`
- Done:
  - `S05_ECHO_PARROT` 已在 registry 中可被统一查询到。
  - `social-communication` 自定义游戏列表包含 `S05_ECHO_PARROT`。

## Out Of Scope

- 不新增 `EchoParrotPage.vue` 或 `EchoParrotGame.vue`
- 不新增静态路由 `/emotional/games/echo-parrot`
- 不补 `emotional-games-api` 摘要逻辑
- 不处理 `S03_STORY_SEQ` 已知 bug

## Final Verification

- `npm run type-check:emotional`
- `rg -n "S05_ECHO_PARROT|动物传声筒|echo-parrot" src/data/custom-game-registry.ts`
