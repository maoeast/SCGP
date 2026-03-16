# SCGP

星愿能力发展平台（Stellar Competency Growth Platform）。

这是一个面向特殊教育与康复场景的本地优先桌面应用，当前技术栈为 `Electron + Vue 3 + TypeScript + Vite + SQL.js`。系统覆盖学生档案、能力评估、训练计划、游戏训练、器材训练、资源中心、报告生成、激活与系统管理等模块。

## 命名说明

- 当前平台名称：`SCGP / 星愿能力发展平台`
- 历史阶段名称：`生活自理适应综合训练系统` → `感官能力发展系统 (SIC-ADS)` → `SCGP`
- 文档中如果出现 `SIC-ADS` 或“生活自理适应综合训练系统”，通常表示历史阶段、旧交付稿或早期规划，不默认代表当前平台正式名称

## 当前状态

- 项目处于持续开发和重构中
- 核心评估模块已完成统一容器 + `ScaleDriver` 架构改造
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
- `PROJECT_CONTEXT.md`：会话上下文和持续维护记录
- `重构实施技术规范.md`：当前重要技术规范

## 文档入口

- 文档总索引：[docs/INDEX.md](/home/DONG/Mycode/SCGP/docs/INDEX.md)
- 文档治理说明：[docs/DOCS_GUIDE.md](/home/DONG/Mycode/SCGP/docs/DOCS_GUIDE.md)
- 项目上下文：[PROJECT_CONTEXT.md](/home/DONG/Mycode/SCGP/PROJECT_CONTEXT.md)

## 当前最重要的文档

- [AGENTS.md](/home/DONG/Mycode/SCGP/AGENTS.md)
- [docs/planning/2026-03-13-scgp-current-prd.md](/home/DONG/Mycode/SCGP/docs/planning/2026-03-13-scgp-current-prd.md)
- [docs/plans/2026-03-13-scgp-executable-roadmap.md](/home/DONG/Mycode/SCGP/docs/plans/2026-03-13-scgp-executable-roadmap.md)
- [docs/reports/2026-03-13-scgp-prd-gap-analysis.md](/home/DONG/Mycode/SCGP/docs/reports/2026-03-13-scgp-prd-gap-analysis.md)
- [docs/reports/2026-03-11-assessment-cleanup.md](/home/DONG/Mycode/SCGP/docs/reports/2026-03-11-assessment-cleanup.md)
- [docs/plans/2025-02-05-refactor-implementation-plan.md（历史实施计划）](/home/DONG/Mycode/SCGP/docs/plans/2025-02-05-refactor-implementation-plan.md)
- [重构实施技术规范.md](/home/DONG/Mycode/SCGP/%E9%87%8D%E6%9E%84%E5%AE%9E%E6%96%BD%E6%8A%80%E6%9C%AF%E8%A7%84%E8%8C%83.md)
- [PROJECT_CONTEXT.md](/home/DONG/Mycode/SCGP/PROJECT_CONTEXT.md)

## 说明

- `.planning/`：过程型协作材料，包含阶段上下文、研究记录、任务拆解，不是正式需求文档入口。
- `.archive/`：历史归档，保留旧方案和旧过程文件，不代表当前实现。
- `.claude/`、`.gemini/`：代理协作与命令模板目录；其中 `gsd` 是给代理使用的工作流命令，不属于业务模块。
- `AGENTS.md`：仓库级代理启动说明，供 Codex 类代理在进入仓库时快速建立项目背景和执行规则。
- `docs/planning/prd.md`：原始需求基线，主要反映“生活自理适应综合训练系统”阶段，不等同于当前 SCGP 平台范围。
- `docs/guides/系统使用说明书.md`、`docs/guides/系统参数技术文档.md`：历史交付型文档，当前仅作为参考材料，不作为单一事实来源。
- 如果你要理解当前项目，优先看 `README.md`、`docs/INDEX.md`、`PROJECT_CONTEXT.md` 和核心实施计划。
