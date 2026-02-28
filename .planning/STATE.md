# STATE

## Project Reference
**Core Value**: SCGP (Stellar Competency Growth Platform) provides special education teachers and clinicians with a comprehensive, offline, local-first assessment and intervention tool.
**Current Focus**: Completing the transition to a multi-system platform by validating the refactored Game Training module and expanding into Emotional and Social modules.

## Current Position
- **Phase**: 1. Game Training Module Polish
- **Plan**: None
- **Status**: Planning

### Progress
![0%](https://progress-bar.dev/0/?scale=100&title=Project%20Completion&width=500&color=blue&suffix=%)

## Accumulated Context
- **Decisions**: 
  - Using Debounced Atomic Save on the Main Thread instead of Web Workers for SQLite due to Vite compatibility issues.
  - ScaleDriver Strategy is used for all assessments (S-M, WeeFIM, CSIRS, Conners) to generalize UI flows.
  - All resources (games, equipment, documents) are generalized into `sys_training_resource`.
- **Blockers**: 
  - Visual tracking games are deferred due to hardware/lighting dependencies making testing unreliable.

## Session Continuity
- Last Session: Phase 5.2 Game Training Module Refactoring was completed (resource-ified game data, created GameModuleMenu/GameLobby/GamePlay).
- Next Action: Begin Phase 1 planning to validate GameLobby, GamePlay, and Emoji rendering, and test database migration logic.

### Quick Tasks Completed (2026-02-28)
| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 1 | 游戏训练配置加载及配置对话框修复 | 2026-02-28 | 06ca952 | ✅ | direct fix |
| 2 | 器材训练记录为空修复 | 2026-02-28 | 7d8fa62 | ✅ Verified | [debug/resolved](./debug/resolved/equipment-training-records-empty.md) |

### Last Activity
**2026-02-28** - Completed 2 bug fixes:
1. **游戏训练配置**: 修复 `resource.legacy_id` → `resource.legacyId`, `resource.meta_data` → `resource.metadata` 的 camelCase 问题，添加训练配置对话框
2. **器材训练记录**: 修复 `getStudentRecords` 查询缺少 `module_code` 字段导致前端过滤失效