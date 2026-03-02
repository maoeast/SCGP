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

### Quick Tasks Completed
| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 1 | 游戏训练配置加载及配置对话框修复 | 2026-02-28 | 06ca952 | ✅ | direct fix |
| 2 | 器材训练记录为空修复 | 2026-02-28 | 7d8fa62 | ✅ Verified | [debug/resolved](./debug/resolved/equipment-training-records-empty.md) |
| 3 | 调整左侧菜单栏模块顺序 | 2026-03-02 | 48881f4 | ✅ | direct fix |
| 4 | 游戏训练记录列表页面多个问题修复 | 2026-03-02 | 71bcbec | ✅ Verified | direct fix |

### Last Activity
**2026-03-02** - Completed quick task 4: 游戏训练记录列表页面多个问题修复
- 修复 ModuleTrainingRecords.vue 语法错误（缺少闭合括号）
- 修复 GameRecordsPanel.vue 语法错误（未定义的变量和函数)
- 优化平均响应时间显示逻辑
- 实现详情按钮跳转功能
- 添加游戏名称显示（JOIN sys_training_resource)

### Last Activity
**2026-03-02** - Completed quick task 3: 调整左侧菜单栏模块顺序
- 按用户要求重新排列菜单：系统首页、学生管理、班级管理、学生分班、能力评估、训练计划、游戏训练、器材训练、训练记录、报告生成、资源中心、系统管理
- 修正路由名称映射 (GamesMenu→GameTraining, TrainingRecords→TrainingRecordsModule, Resources→ResourceCenter)