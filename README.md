# SCGP

> 职责：项目总览，提供产品概述、目录结构、常用命令和主要文档入口。
> 何时阅读：需要快速理解项目整体形态、开发命令和文档导航时。
> 不负责：替代 `.continue-here.md` 提供当前任务交接，或替代 `AGENTS.md` 提供仓库规则。

星愿能力发展平台（Stellar Competency Growth Platform）。

这是一个面向特殊教育与康复场景的本地优先桌面应用，当前技术栈为 `Electron + Vue 3 + TypeScript + Vite + SQL.js`。系统覆盖学生档案、能力评估、训练计划、游戏训练、器材训练、资源中心、报告生成、激活与系统管理等模块。

## 命名说明

- 当前平台名称：`SCGP / 星愿能力发展平台`
- 历史阶段名称：`生活自理适应综合训练系统` → `感官能力发展系统 (SIC-ADS)` → `SCGP`
- 文档中如果出现 `SIC-ADS` 或“生活自理适应综合训练系统”，通常表示历史阶段、旧交付稿或早期规划，不默认代表当前平台正式名称

## 当前状态

- 项目处于持续开发和重构中
- 核心评估模块已完成统一容器 + `ScaleDriver` 架构改造
- 首页已重构为“首页看板”，使用本地 SQLite 的真实聚合数据展示日程、异常预警与待评估预警
- 首页支持从今日日程直接带上下文启动训练，不再依赖中间选择页
- 系统已实现按模块授权（Modular Licensing）基础架构，前端具备路由拦截与带锁菜单能力
- 开发环境下支持免真实激活码的授权注入，用于本地主线开发
- 仓库中同时存在现行文档、历史规划文档、归档材料和参考资料

## 快速开始

### 环境要求

- Node.js `^20.19.0 || >=22.12.0`
- npm

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 类型检查

```bash
npm run type-check
```

### 导入物理器材资源草稿

```bash
npm run import:physical-equipment -- --yes
```

### 训练资源文案主表导出

```bash
npm run resource-copy:export -- --out .tmp/training-resource-copy.csv
```

### 训练资源文案映射生成

```bash
npm run resource-copy:build
```

### 同步当前本地数据库中的训练资源文案

```bash
npm run resource-copy:sync -- --dry-run
```

### 构建前端

```bash
npm run build:web
```

### 打包 Electron

```bash
npm run build:electron
```

## Git 协作

- 仓库推荐使用 GitHub SSH 方式进行 `pull` 和 `push`
- 可用 `git remote -v` 检查远端是否为 `git@github.com:...`
- 可用 `ssh -T git@github.com` 检查本机 SSH 认证是否正常
- 默认 SSH 密钥位置通常为 `~/.ssh/id_rsa` 和 `~/.ssh/id_rsa.pub`

## 主要目录

- `src/`：前端业务代码
- `electron/`：Electron 主进程与预加载
- `docs/`：现行项目文档、规划、报告与参考资料
- `tests/`：性能测试与验证代码
- `.continue-here.md`：当前唯一有效续接入口
- `PROJECT_CONTEXT.md`：当前有效协作上下文摘要
- `重构实施技术规范.md`：当前重要技术规范

## 文档入口

- 交接入口：[HANDOFF.md](./HANDOFF.md)
- 文档总索引：[docs/INDEX.md](./docs/INDEX.md)
- 文档治理说明：[docs/DOCS_GUIDE.md](./docs/DOCS_GUIDE.md)
- 文档目录总览 HTML：[docs/guides/2026-04-10-repo-document-catalog.html](./docs/guides/2026-04-10-repo-document-catalog.html)
- 轻量启动上下文：[docs/planning/2026-03-23-scgp-context-bootstrap.md](./docs/planning/2026-03-23-scgp-context-bootstrap.md)
- 页面风格统一改造 TODO：[docs/planning/2026-04-02-page-style-unification-todo.md](./docs/planning/2026-04-02-page-style-unification-todo.md)
- 统一训练记录主表方案计划：[docs/planning/2026-04-01-unified-training-record-schema-plan.md](./docs/planning/2026-04-01-unified-training-record-schema-plan.md)
- 跨训练入口自定义小游戏扩展计划：[docs/planning/2026-04-13-cross-entry-custom-games-expansion-plan.md](./docs/planning/2026-04-13-cross-entry-custom-games-expansion-plan.md)
- 跨训练入口自定义小游戏 `Phase 0` 实施规格：[docs/planning/2026-04-13-cross-entry-custom-games-phase0-implementation-spec.md](./docs/planning/2026-04-13-cross-entry-custom-games-phase0-implementation-spec.md)
- 跨训练入口自定义小游戏 `Wave 1` 前期准备清单：[docs/planning/2026-04-14-cross-entry-custom-games-wave1-prep-checklist.md](./docs/planning/2026-04-14-cross-entry-custom-games-wave1-prep-checklist.md)
- 训练资源统一文案操作说明：[docs/guides/2026-03-30-training-resource-copy-workflow.md](./docs/guides/2026-03-30-training-resource-copy-workflow.md)
- care_scene 数据结构说明：[docs/references/care-scene/care_scenes_schema.md](./docs/references/care-scene/care_scenes_schema.md)
- care_scene 描述辅表：[docs/references/care-scene/care-scene-description.csv](./docs/references/care-scene/care-scene-description.csv)
- SQL.js 持久化专题方案：[docs/tech-design/sql_js_持久化模块标准实现方案_V1.1.md](./docs/tech-design/sql_js_%E6%8C%81%E4%B9%85%E5%8C%96%E6%A8%A1%E5%9D%97%E6%A0%87%E5%87%86%E5%AE%9E%E7%8E%B0%E6%96%B9%E6%A1%88_V1.1.md)
- 训练工作台双栏滚动布局规范：[docs/reports/2026-03-31-training-workspace-layout-scroll-guideline.md](./docs/reports/2026-03-31-training-workspace-layout-scroll-guideline.md)
- 当前续接入口：[.continue-here.md](./.continue-here.md)
- 当前项目上下文：[PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)
- 历史上下文归档：[docs/logs/2026-03-26-project-context-archive.md](./docs/logs/2026-03-26-project-context-archive.md)

## 当前最重要的文档

- [HANDOFF.md](./HANDOFF.md)
- [AGENTS.md](./AGENTS.md)
- [docs/planning/2026-03-23-scgp-context-bootstrap.md](./docs/planning/2026-03-23-scgp-context-bootstrap.md)
- [docs/planning/2026-03-13-scgp-current-prd.md](./docs/planning/2026-03-13-scgp-current-prd.md)
- [docs/planning/2026-04-01-unified-training-record-schema-plan.md](./docs/planning/2026-04-01-unified-training-record-schema-plan.md)
- [docs/planning/2026-04-13-cross-entry-custom-games-phase0-implementation-spec.md](./docs/planning/2026-04-13-cross-entry-custom-games-phase0-implementation-spec.md)
- [docs/planning/2026-04-14-cross-entry-custom-games-wave1-prep-checklist.md](./docs/planning/2026-04-14-cross-entry-custom-games-wave1-prep-checklist.md)
- [docs/plans/2026-03-13-scgp-executable-roadmap.md](./docs/plans/2026-03-13-scgp-executable-roadmap.md)
- [docs/reports/2026-03-13-scgp-prd-gap-analysis.md](./docs/reports/2026-03-13-scgp-prd-gap-analysis.md)
- [docs/reports/2026-03-11-assessment-cleanup.md](./docs/reports/2026-03-11-assessment-cleanup.md)
- [docs/plans/2025-02-05-refactor-implementation-plan.md（历史实施计划）](./docs/plans/2025-02-05-refactor-implementation-plan.md)
- [重构实施技术规范.md](./%E9%87%8D%E6%9E%84%E5%AE%9E%E6%96%BD%E6%8A%80%E6%9C%AF%E8%A7%84%E8%8C%83.md)
- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)

## 说明

- `.planning/`：过程型协作材料，包含阶段上下文、研究记录、任务拆解，不是正式需求文档入口。
- `.archive/`：历史归档，保留旧方案和旧过程文件，不代表当前实现。
- `.claude/`、`.gemini/`：代理协作与命令模板目录；其中 `gsd` 是给代理使用的工作流命令，不属于业务模块。
- `AGENTS.md`：仓库级代理启动说明，供 Codex 类代理在进入仓库时快速建立项目背景和执行规则。
- `docs/planning/2026-03-23-scgp-context-bootstrap.md`：轻量启动上下文，适合作为新会话默认首读入口，用于控制启动阶段上下文体积。
- `.continue-here.md`：当前唯一有效续接任务说明，适合新会话继续未完成工作时优先读取。
- `PROJECT_CONTEXT.md`：当前有效协作上下文摘要，不再保存长篇阶段流水。
- `docs/logs/2026-03-26-project-context-archive.md`：从旧 `PROJECT_CONTEXT.md` 迁出的历史归档摘要，不作为默认首读入口。
- `docs/guides/2026-04-10-repo-document-catalog.html`：可直接在浏览器打开的文档总览页，适合快速浏览每份入口/专题文档的大概内容、作用和位置。
- `docs/planning/prd.md`：原始需求基线，主要反映“生活自理适应综合训练系统”阶段，不等同于当前 SCGP 平台范围。
- `docs/guides/系统使用说明书.md`、`docs/guides/系统参数技术文档.md`：历史交付型文档，当前仅作为参考材料，不作为单一事实来源。
- 如果你要快速理解当前项目，优先看 `HANDOFF.md`、`AGENTS.md`、`docs/planning/2026-03-23-scgp-context-bootstrap.md`、`README.md` 和 `.continue-here.md`，再按任务补读其他大文档。
