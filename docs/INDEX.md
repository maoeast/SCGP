# 文档索引（docs/INDEX.md）

本索引是 SCGP 文档导航中枢。代理规则与执行边界见根目录 `AGENTS.md`（`CLAUDE.md` 只是它的引用）；本文件只负责"去哪找文档"。

路径约定：根目录文件用 `../`，`docs/` 内文件用 `./`。

## 先读这些

### 启动入口

- [../AGENTS.md](../AGENTS.md) — 代理规则源（唯一）
- [../HANDOFF.md](../HANDOFF.md) — 阶段切换 / 主题切换入口
- [./planning/2026-03-23-scgp-context-bootstrap.md](./planning/2026-03-23-scgp-context-bootstrap.md) — 上下文自举
- [../README.md](../README.md)
- [../.continue-here.md](../.continue-here.md) — 当前唯一下一步

### 当前上下文

- [../PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)
- [../重构实施技术规范.md](../重构实施技术规范.md)

### 文档治理

- [./DOCS_GUIDE.md](./DOCS_GUIDE.md)
- [./CHANGELOG.md](./CHANGELOG.md)
- [./SOLVED_ISSUES.md](./SOLVED_ISSUES.md)

## 目录结构

### `docs/planning` — 当前需求、启动上下文与专题方案

当前有效：

- [2026-03-23-scgp-context-bootstrap.md](./planning/2026-03-23-scgp-context-bootstrap.md)
- [2026-03-13-scgp-current-prd.md](./planning/2026-03-13-scgp-current-prd.md)
- [2026-03-16-emotional-module-prd.md](./planning/2026-03-16-emotional-module-prd.md)
- [2026-03-20-emotion-games-prd.md](./planning/2026-03-20-emotion-games-prd.md)
- [emotion-games-dev-guidelines.md](./planning/emotion-games-dev-guidelines.md)
- [mvp-games-playtest-tuning-guide.md](./planning/mvp-games-playtest-tuning-guide.md)
- [2026-07-19-cognitive-games-prd.md](./planning/2026-07-19-cognitive-games-prd.md) — 认知发展 10 个新游戏立项 PRD（玩法/三级难度/训练目标/素材来源，草案待评审，未动代码）

专题方案（按需读，`docs/planning/` 目录另有更多中文命名 PRD 与 MediaPipe / 表情 / 生活自理等专题稿）：

- [2026-04-01-unified-training-record-schema-plan.md](./planning/2026-04-01-unified-training-record-schema-plan.md)
- [2026-04-02-page-style-unification-todo.md](./planning/2026-04-02-page-style-unification-todo.md)
- [2026-04-08-care-scene-immersive-refactor-plan.md](./planning/2026-04-08-care-scene-immersive-refactor-plan.md)
- [2026-04-13-cross-entry-custom-games-expansion-plan.md](./planning/2026-04-13-cross-entry-custom-games-expansion-plan.md)
- [2026-04-19-wave1-auth-activation-hardening-plan.md](./planning/2026-04-19-wave1-auth-activation-hardening-plan.md)
- [2026-05-08-self-care-training-module-implementation-plan.md](./planning/2026-05-08-self-care-training-module-implementation-plan.md)
- [2026-05-20-entitlement-module-refactor-review-proposal.md](./planning/2026-05-20-entitlement-module-refactor-review-proposal.md)
- [2026-05-28-air-conductor-implementation-plan.md](./planning/2026-05-28-air-conductor-implementation-plan.md)
- [2026-07-17-resource-room-training-assistant-pilot.md](./planning/2026-07-17-resource-room-training-assistant-pilot.md) — 教师端 AI 资源教室训练助理 P0 试点问答与验收标准
- [2026-07-19-assessment-entry-dynamicization-plan.md](./planning/2026-07-19-assessment-entry-dynamicization-plan.md) — 评估入口动态化（catalog 单一真源 + 报告路由派生）+ AGENTS §3 技术债清单校正，已批准待执行

历史 / 基线：

- [prd.md（原始需求基线，历史）](./planning/prd.md)

### `docs/plans` — 阶段实施计划与执行路线

- [2026-07-18-project-closeout-execution-plan.md](./plans/2026-07-18-project-closeout-execution-plan.md) — 基于当前代码事实的未完成项收口顺序、批次边界与验收门禁
- [2026-03-13-scgp-executable-roadmap.md](./plans/2026-03-13-scgp-executable-roadmap.md)
- [2026-03-12-emotional-module-implementation-plan.md](./plans/2026-03-12-emotional-module-implementation-plan.md)
- [2026-04-08-care-scene-immersive-execution-plan.md](./plans/2026-04-08-care-scene-immersive-execution-plan.md)
- [2026-07-09-assessment-recommendation-engine-plan.md](./plans/2026-07-09-assessment-recommendation-engine-plan.md)
- [2026-07-08-cognitive-development-intake-plan.md](./plans/2026-07-08-cognitive-development-intake-plan.md)
- [2026-07-07-game-iep-extension-plan.md](./plans/2026-07-07-game-iep-extension-plan.md)
- [2026-07-07-scgp-spec-gap-remediation.md](./plans/2026-07-07-scgp-spec-gap-remediation.md)
- [2026-02-04-equipment-training-module.md](./plans/2026-02-04-equipment-training-module.md)

历史设计稿（参考）：

- [2025-02-05-refactor-implementation-plan.md（历史）](./plans/2025-02-05-refactor-implementation-plan.md)
- [2025-02-17-assessment-module-refactor-design.md（历史）](./plans/2025-02-17-assessment-module-refactor-design.md)
- [SCGP-CNBS-R2016_todo.md（早期 TODO，历史）](./plans/SCGP-CNBS-R2016_todo.md)

### `docs/reports` — 工作报告、差距分析与复盘

- [2026-07-17-current-project-gap-and-recommendations.md](./reports/2026-07-17-current-project-gap-and-recommendations.md) — 当前项目功能完成度调查、未收口项与推进建议
- [2026-03-13-scgp-prd-gap-analysis.md](./reports/2026-03-13-scgp-prd-gap-analysis.md)
- [2026-03-11-assessment-cleanup.md](./reports/2026-03-11-assessment-cleanup.md)
- [2026-03-20-emotion-games-layout-debug-lessons.md](./reports/2026-03-20-emotion-games-layout-debug-lessons.md)
- [2026-03-31-training-workspace-layout-scroll-guideline.md](./reports/2026-03-31-training-workspace-layout-scroll-guideline.md)
- [2026-04-19-code-review-comprehensive.md](./reports/2026-04-19-code-review-comprehensive.md)

### `docs/references` — 量表、评分引擎、导入源与资源规范

临床量表与评分引擎（CBCL、Conners、FMDA、GMFM、SRS-2、TGMD-3、SDQ、儿心量表、CABR 等）及导入数据，**整体保留，按子目录组织**：

- `./references/care-scene/`、`./references/emotion-scene/`、`./references/physical-equipment/`
- [physical-equipment/README.md](./references/physical-equipment/README.md)
- [care-scene/care_scenes_schema.md](./references/care-scene/care_scenes_schema.md)
- [weefim-assessment-guide.md](./references/weefim-assessment-guide.md)

### `docs/guides` — 使用说明、模板与运维辅助

- [activation-system-guide.md](./guides/activation-system-guide.md)
- [activation-code-generator.md](./guides/activation-code-generator.md)
- [2026-03-30-training-resource-copy-workflow.md](./guides/2026-03-30-training-resource-copy-workflow.md)
- [2026-03-18-emotional-resource-pack-excel-template-guide.md](./guides/2026-03-18-emotional-resource-pack-excel-template-guide.md)
- [2026-04-10-repo-document-catalog.html](./guides/2026-04-10-repo-document-catalog.html)
- [系统使用说明书.md（历史交付稿）](./guides/系统使用说明书.md)
- [系统参数技术文档.md（历史交付稿）](./guides/系统参数技术文档.md)

### `docs/user-manual` — 当前用户手册

- [SCGP / 星愿能力发展平台用户使用手册（Markdown）](./user-manual/SCGP-星愿能力发展平台用户使用手册.md) — 教师与管理员合并版；以当前代码、路由和有效文档为准，截图采用 `S001`–`S212` 单一可复现状态编号占位
- `./user-manual/SCGP-星愿能力发展平台用户使用手册.docx` — 对应 Word 交付稿
- [SCGP 用户手册截图执行清单](./user-manual/SCGP-用户手册截图执行清单.md) — 212 项逐项列明真实路由模板、角色、数据配置、操作、断言、裁切、采集模式、安全级别与正文锚点
- `./user-manual/diagrams/` — 4 幅架构图与流程图的可编辑 SVG 源文件及 Word 嵌入用 PNG

### `docs/tech-design` — 底层技术方案

- [sql_js_持久化模块标准实现方案_V1.1.md](./tech-design/sql_js_持久化模块标准实现方案_V1.1.md)
- [激活系统.md](./tech-design/激活系统.md)

### `docs/architecture` — 架构与数据设计

- [2026-03-12-emotional-module-data-design.md](./architecture/2026-03-12-emotional-module-data-design.md)
- [2026-03-12-emotional-module-page-and-route-design.md](./architecture/2026-03-12-emotional-module-page-and-route-design.md)
- [audit-report.md（历史审计）](./architecture/audit-report.md)
- [data-flow-diagram.md（历史数据流图）](./architecture/data-flow-diagram.md)

### `docs/analysis`

- [statistics-score-consistency.md](./analysis/statistics-score-consistency.md)

### `docs/logs` — 历史归档摘要与专题日志（非默认首读）

- [2026-03-26-project-context-archive.md](./logs/2026-03-26-project-context-archive.md)
- [2026-02-27-phase4.4-archived-files.md](./logs/2026-02-27-phase4.4-archived-files.md)
- [font-awesome-6-upgrade-summary.md](./logs/font-awesome-6-upgrade-summary.md)
- [font-awesome-root-cause-analysis.md](./logs/font-awesome-root-cause-analysis.md)

### `docs/archive` — 已完成 / 历史文档（不进主索引，不作当前事实来源）

- `./archive/codex-handoffs/` — 2026-05-28 批次交接稿（已完成工作）
- `./archive/superpowers/` — 已实现游戏功能的设计 plan / spec（cloud-erase、wipe-sadness、air-conductor、visual-tracker 等）

## 推荐阅读顺序

新会话：

1. [../AGENTS.md](../AGENTS.md)
2. [./planning/2026-03-23-scgp-context-bootstrap.md](./planning/2026-03-23-scgp-context-bootstrap.md)
3. [../README.md](../README.md)
4. [../.continue-here.md](../.continue-here.md)

按需补读：

5. [../PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)
6. [./planning/2026-03-13-scgp-current-prd.md](./planning/2026-03-13-scgp-current-prd.md)
7. [./reports/2026-03-13-scgp-prd-gap-analysis.md](./reports/2026-03-13-scgp-prd-gap-analysis.md)
8. [../重构实施技术规范.md](../重构实施技术规范.md)

## 说明

- `.continue-here.md` 只保留当前有效续接任务，不堆积历史提示词。
- `PROJECT_CONTEXT.md` 只保留当前有效协作上下文，不保存长流水。
- `docs/archive/` 内文档为历史记录，需要时再查，不作当前事实来源。
- 历史框架残留（GSD、superpowers 插件、`.planning/`）已清除；本索引不再收录相关入口。
