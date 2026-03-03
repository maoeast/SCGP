# STATE

## Project Reference
**Core Value**: SCGP (Stellar Competency Growth Platform) provides special education teachers and clinicians with a comprehensive, offline, local-first assessment and intervention tool.
**Current Focus**: Phase 2 MVP - Integrating SDQ (长处和困难问卷) assessment into the Emotional module.

## Current Position
- **Phase**: 2. Emotional & Social Expansion
- **Plan**: SDQ Assessment Integration
- **Status**: Executing

### Progress
![15%](https://progress-bar.dev/15/?scale=100&title=Project%20Completion&width=500&color=green&suffix=%)

## Accumulated Context
- **Decisions**:
  - Using Debounced Atomic Save on the Main Thread instead of Web Workers for SQLite due to Vite compatibility issues.
  - ScaleDriver Strategy is used for all assessments (S-M, WeeFIM, CSIRS, Conners, SDQ) to generalize UI flows.
  - All resources (games, equipment, documents) are generalized into `sys_training_resource`.
  - SDQ feedback configuration integrated into feedbackConfig.js (expert-generated content).
- **Blockers**:
  - Visual tracking games are deferred due to hardware/lighting dependencies making testing unreliable.

## Session Continuity
- Last Session: SDQ assessment integration completed with bug fixes
- Next Action: Test SDQ assessment end-to-end flow and verify report generation

### Quick Tasks Completed
| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 1 | 游戏训练配置加载及配置对话框修复 | 2026-02-28 | 06ca952 | ✅ | direct fix |
| 2 | 器材训练记录为空修复 | 2026-02-28 | 7d8fa62 | ✅ Verified | [debug/resolved](./debug/resolved/equipment-training-records-empty.md) |
| 3 | 调整左侧菜单栏模块顺序 | 2026-03-02 | 48881f4 | ✅ | direct fix |
| 4 | 游戏训练记录列表页面多个问题修复 | 2026-03-02 | fd771f6 | ✅ Verified | direct fix |
| 5 | SDQ 评估保存功能修复 | 2026-03-03 | - | ✅ | direct fix |

### Last Activity
**2026-03-03** - Completed quick task 5: SDQ 评估保存功能修复
- 修复 AssessmentContainer.vue 中缺少 getDatabase 导入的问题 (import path: `'./init'` → `'@/database/init'`)
- 修复 ReportAPI.saveReportRecord 方法中 report_type 不支持 'sdq' 的问题
- 更新 feedbackConfig.js 合并新的专家评语配置
- 修复 SDQDriver.ts 中的导入和引用问题
- TypeScript 编译通过，开发服务器正常运行
- Vite HMR 热重载成功，页面正常加载