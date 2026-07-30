# HANDOFF.md

> last_updated: 2026-07-30
> Responsibility: new-session handoff entry.
> Read when: entering the repo or resuming work and needing the fastest route to current truth.
> Not responsible for: replacing `AGENTS.md`, `.continue-here.md`, or `PROJECT_CONTEXT.md`.

## Quick Start

Read in this order:

1. `AGENTS.md`
2. `docs/planning/2026-03-23-scgp-context-bootstrap.md`
3. `README.md`
4. `.continue-here.md`

If those four files are not enough, then read `PROJECT_CONTEXT.md`.

## Current Authorization Chain

- SCGP 当前已落地 `entitlement-first` 授权链，不再停留在方案或影子映射阶段。
- 前端授权事实来源是 `authStore.effectiveEntitlements`。
- 许可证 `am` 载荷中的 `allowedModules` 当前只表示“原始授权 code”，可能同时包含旧模块 code 和新能力包 code，用于兼容与调试，不再作为用户可见授权事实来源。
- 旧 code `sensory / emotional / social / life_skills / cognitive` 仍会被兼容展开为新的授权能力包。
- 路由拦截、菜单可见性、训练入口判权与模块访问当前都已切到 `entitlement-first`；`hasModuleAccess()` 也由 `effectiveEntitlements` 反推，不再直接依赖原始 `allowedModules`。
- 用户可见口径统一使用“能力包授权”；仅开发态诊断区域保留“原始授权 code”展示。

## Current Resume Rule

- 当前活动任务和下一步实现以 `.continue-here.md` 为准。
- 仓库规则、事实来源优先级和边界以 `AGENTS.md` 为准。
- 如果文档与代码冲突，以当前代码实现为准，再回修文档口径。

## Current Focus

- AI 批次已提交为 `5dce049 feat(ai): expand assistant presets and report tools`，核心 Node 契约测试 100/100 通过。
- 学生批量导入闭环已完成：Excel 读取、字段和学号预检、逐行实际写入、逐项成功/失败反馈、结束后的学生列表刷新均已接入；`npx jiti tests/student-import.test.ts` 和 `npm run type-check` 已通过。
- 用户手册 Markdown、DOCX、S024 重新实拍、截图审批和采集工具已按当前代码修订；`node scripts/manual/validate-user-manual.mjs` 和审批截图校验均已通过。
- 之后按既定顺序提交手册工具、学生导入、实拍修复，不清理或混入未归属文件。
