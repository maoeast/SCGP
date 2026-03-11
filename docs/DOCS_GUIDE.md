# 文档治理说明

## 目标

这个仓库的文档分为两类：

- 现行文档：用于理解当前项目、当前架构、当前计划
- 参考/历史材料：用于追溯背景、参考原始资料、保留旧方案

本说明的目标是减少“入口失效、目录混乱、重复维护”。

## 目录规则

### 根目录

根目录只保留少量入口级文档：

- `README.md`
- `PROJECT_CONTEXT.md`
- `重构实施技术规范.md`

### `docs/`

- `docs/INDEX.md`
  - `docs` 主入口
- `docs/guides/`
  - 使用说明、运维说明、操作说明
- `docs/architecture/`
  - 架构、设计、审计、系统分析
- `docs/planning/`
  - 稳定的需求文档与专题方案
- `docs/plans/`
  - 阶段计划、实施计划、重构计划
- `docs/reports/`
  - 阶段工作报告、专项检查结果
- `docs/references/`
  - 原始量表资料、外部参考文件、脚本样例、导入源文件
- `docs/analysis/`
  - 专项分析文档

## 单一事实来源

默认优先级：

1. `重构实施技术规范.md`
2. `PROJECT_CONTEXT.md`
3. 当前仍在执行的 `docs/plans/*.md`
4. `docs/planning/*.md`

`docs/references/` 中的内容默认不是单一事实来源，除非文档中明确声明。

## 新增文档时的规则

- 如果文档是“当前怎么做”，优先放 `guides/`、`architecture/`、`planning/`、`plans/`
- 如果文档是“今天做了什么”，放 `reports/`
- 如果文档是“原始资料/脚本/外部文档/题库整理”，放 `references/`
- 不要把新文档直接堆在 `docs/` 根目录

## 维护规则

- 新增或移动文档后，更新 `docs/INDEX.md`
- 不再把失效路径写进 `docs/INDEX.md`
- 历史材料尽量归入 `docs/references/` 或 `.archive/`
- 如果某文档已废弃，优先在文档开头注明状态，而不是继续让它充当主入口

## 备注

- `.planning/` 主要是过程型协作材料
- `.archive/` 主要是历史归档
- 两者都不应替代 `docs/` 主文档体系
