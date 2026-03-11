# 文档索引

本索引只收录当前仓库中仍然存在且建议继续使用的文档入口。

## 先看这些

### 项目入口

- [README.md](/home/DONG/Mycode/SCGP/README.md)
- [PROJECT_CONTEXT.md](/home/DONG/Mycode/SCGP/PROJECT_CONTEXT.md)
- [重构实施技术规范.md](/home/DONG/Mycode/SCGP/%E9%87%8D%E6%9E%84%E5%AE%9E%E6%96%BD%E6%8A%80%E6%9C%AF%E8%A7%84%E8%8C%83.md)

### 文档治理

- [DOCS_GUIDE.md](/home/DONG/Mycode/SCGP/docs/DOCS_GUIDE.md)
- [CHANGELOG.md](/home/DONG/Mycode/SCGP/docs/CHANGELOG.md)
- [SOLVED_ISSUES.md](/home/DONG/Mycode/SCGP/docs/SOLVED_ISSUES.md)

## 目录结构

### `docs/guides`

面向使用、运维或具体操作的说明文档。

- [activation-code-generator.md](/home/DONG/Mycode/SCGP/docs/guides/activation-code-generator.md)
- [activation-system-guide.md](/home/DONG/Mycode/SCGP/docs/guides/activation-system-guide.md)
- [系统使用说明书.md](/home/DONG/Mycode/SCGP/docs/guides/%E7%B3%BB%E7%BB%9F%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E%E4%B9%A6.md)
- [系统参数技术文档.md](/home/DONG/Mycode/SCGP/docs/guides/%E7%B3%BB%E7%BB%9F%E5%8F%82%E6%95%B0%E6%8A%80%E6%9C%AF%E6%96%87%E6%A1%A3.md)

### `docs/architecture`

架构、审计、系统设计相关文档。

- [audit-report.md](/home/DONG/Mycode/SCGP/docs/architecture/audit-report.md)
- [data-flow-diagram.md](/home/DONG/Mycode/SCGP/docs/architecture/data-flow-diagram.md)
- [源码加密混淆技术方案.md](/home/DONG/Mycode/SCGP/docs/architecture/%E6%BA%90%E7%A0%81%E5%8A%A0%E5%AF%86%E6%B7%B7%E6%B7%86%E6%8A%80%E6%9C%AF%E6%96%B9%E6%A1%88.md)

### `docs/planning`

较稳定的需求与专题方案。

- [prd.md](/home/DONG/Mycode/SCGP/docs/planning/prd.md)
- [感官训练PRD.md](/home/DONG/Mycode/SCGP/docs/planning/%E6%84%9F%E5%AE%98%E8%AE%AD%E7%BB%83PRD.md)
- [报告生成模块技术方案.md](/home/DONG/Mycode/SCGP/docs/planning/%E6%8A%A5%E5%91%8A%E7%94%9F%E6%88%90%E6%A8%A1%E5%9D%97%E6%8A%80%E6%9C%AF%E6%96%B9%E6%A1%88.md)

### `docs/plans`

阶段性实施计划和详细执行方案。

- [2025-01-28-csirs-assessment-module.md](/home/DONG/Mycode/SCGP/docs/plans/2025-01-28-csirs-assessment-module.md)
- [2025-01-29-conners-psq-trs-assessment.md](/home/DONG/Mycode/SCGP/docs/plans/2025-01-29-conners-psq-trs-assessment.md)
- [2025-02-05-refactor-implementation-plan.md](/home/DONG/Mycode/SCGP/docs/plans/2025-02-05-refactor-implementation-plan.md)
- [2025-02-17-assessment-module-refactor-design.md](/home/DONG/Mycode/SCGP/docs/plans/2025-02-17-assessment-module-refactor-design.md)
- [2026-02-04-equipment-training-module.md](/home/DONG/Mycode/SCGP/docs/plans/2026-02-04-equipment-training-module.md)

### `docs/reports`

阶段工作报告、专项检查结果。

- [2026-03-11-assessment-cleanup.md](/home/DONG/Mycode/SCGP/docs/reports/2026-03-11-assessment-cleanup.md)

### `docs/references`

原始量表资料、题目整理稿、评分脚本、外部参考文档和资料文件。

说明：
- 这里的文件很多是 PDF、DOCX、XLSX、TXT、JS、JSON。
- 它们主要作为参考资料存在，不应默认视为当前实现的单一事实来源。

### 其他保留目录

- `docs/analysis`：专项分析
- `docs/tech-design`：历史技术设计文档，当前仅保留少量旧文档

### 仓库中的非主文档目录

- `.planning`：过程型协作材料，记录阶段上下文、研究过程和任务拆解
- `.archive`：历史归档，不应默认视为当前方案
- `.claude`、`.gemini`：代理协作目录，`gsd` 属于代理工作流命令集，不是产品功能目录

## 当前推荐阅读顺序

1. [README.md](/home/DONG/Mycode/SCGP/README.md)
2. [PROJECT_CONTEXT.md](/home/DONG/Mycode/SCGP/PROJECT_CONTEXT.md)
3. [重构实施技术规范.md](/home/DONG/Mycode/SCGP/%E9%87%8D%E6%9E%84%E5%AE%9E%E6%96%BD%E6%8A%80%E6%9C%AF%E8%A7%84%E8%8C%83.md)
4. [docs/planning/prd.md](/home/DONG/Mycode/SCGP/docs/planning/prd.md)
5. [docs/plans/2025-02-05-refactor-implementation-plan.md](/home/DONG/Mycode/SCGP/docs/plans/2025-02-05-refactor-implementation-plan.md)

## 说明

- `PROJECT_CONTEXT.md` 是持续更新的协作上下文，不等同于用户手册。
- `.planning/`、`.archive/`、`.claude/`、`.gemini/` 都不属于 `docs/` 主文档体系。
- 如果新增文档，请先看 [DOCS_GUIDE.md](/home/DONG/Mycode/SCGP/docs/DOCS_GUIDE.md)。
