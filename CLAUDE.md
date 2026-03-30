> 职责：Claude Code 工作入口，仓库级规则、边界、默认读法
> 何时阅读：Claude Code 启动时自动加载
> 不负责：当前任务进度细节（见 .continue-here.md）

# CLAUDE.md — SCGP Claude Code Working Guide

status: active
last_updated: 2026-03-30
encoding: UTF-8

---

## 1. 启动顺序

Claude Code 自动加载本文件后，按以下顺序继续建立上下文：

**必读层（每次都读）：**

1. `HANDOFF.md` — 路由入口，确认当前应读哪些文件
2. `.continue-here.md` — 当前唯一有效交接状态、下一步动作
3. `PROJECT_CONTEXT.md` — 当前全局有效上下文摘要

**然后检查工作区：**

```
git stash list
```

- 如果存在 stash，列出所有条目
- 如果有 `wip(resource-center)` 或其他 wip stash，执行 `git stash pop`，告知恢复了哪些文件
- 输出 `git status` 和 `git log --oneline -5`

**按需深读（任务需要时再读）：**

| 需求 | 读这个 |
|------|--------|
| 项目概述、目录结构 | `README.md` |
| 技术实现细节 | `重构实施技术规范.md` |
| 当前产品需求 | `docs/planning/2026-03-13-scgp-current-prd.md` |
| 产品差距分析 | `docs/reports/2026-03-13-scgp-prd-gap-analysis.md` |
| 文档导航 | `docs/INDEX.md` |
| emotional 模块 | `docs/planning/2026-03-16-emotional-module-prd.md` |
| 当前阶段计划 | `.continue-here.md` 指向的 `.planning/phases/*/PLAN.md` |

**历史参考（追溯用，不是当前事实来源）：**

- `docs/plans/2025-02-05-refactor-implementation-plan.md`
- `docs/plans/2025-02-17-assessment-module-refactor-design.md`
- `docs/planning/prd.md`
- `docs/logs/2026-03-26-project-context-archive.md`

`.planning/PROJECT.md`、`.planning/ROADMAP.md`、`.planning/REQUIREMENTS.md`、`.planning/STATE.md`
仅在任务明确进入 GSD 规划或执行流程时使用，不是当前产品事实的最高来源。

---

## 2. 冲突裁定规则

文档之间如有冲突，按以下优先级判断：

1. **代码现实** 高于所有文档
2. **`.continue-here.md`** — 当前任务状态以此为准
3. **本文件 / `AGENTS.md`** — 产品边界与规则以此为准
4. **`PROJECT_CONTEXT.md`** — 全局背景补充
5. 历史文档引用时必须标注"历史 / 草案 / 原始需求 / 旧交付稿"

如果发现"文档写已完成，但代码仍是过渡态"，以代码为准，并修正文档口径。

---

## 3. 项目身份

- 当前正式产品名称：`SCGP / 星愿能力发展平台`
- 历史阶段名称：`生活自理适应综合训练系统` / `感官能力发展系统 (SIC-ADS)`
- 当前实现、当前产品、当前平台，统一使用 `SCGP`
- 旧名称仅用于历史文档、旧计划、兼容代码和演进追溯

---

## 4. 当前产品现实

SCGP 当前主线已具备以下可运行能力：

- 学生管理 / 能力评估 / 游戏训练 / 器材训练
- 训练记录 / 训练计划 / 报告生成
- 资源中心 / 系统管理 / 班级管理与学生分班
- 本地账号登录、激活、更新接入、备份恢复

截至 2026-03-13：

- `sensory` 是当前最完整的业务主链
- `emotional`、`social` 等未来模块仍主要是占位、实验或部分结构准备
- 不要把未来模块写成已经完整交付

---

## 5. 当前架构事实

- 技术栈：`Electron + Vue 3 + TypeScript + Vite + SQL.js`
- 数据库主线：渲染进程内 `sql.js` + `SQLWrapper` 防抖保存
- 持久化主线：渲染进程导出数据库，经 IPC 交给 Electron Main 做原子写入
- 资源协议：`resource://`
- 资源主模型：`sys_training_resource + sys_tags + sys_resource_tag_map`
- 评估主链：`AssessmentContainer + ScaleDriver`
- 模块系统：已有 `ModuleRegistry`
- 当前路由现状：仍以静态路由表为主，不是注册表动态装配

**不要误判为已完成：**

- 数据库 Worker 主链
- Image Worker 主链
- 注册表驱动的动态路由
- 完整可交付的多模块平台

---

## 6. 实现约束

- 默认保持本地优先、零原生依赖路线
- 不要新增 `sqlite3`、`sharp` 等需要原生编译的运行时依赖
- 新评估能力优先接入统一评估容器和 `ScaleDriver`
- 新资源能力优先接入统一资源模型，不要继续扩散旧表模式
- 新模块扩展优先沿用平台底座，不要回到单体垂直页面堆叠
- 当前导航与路由仍是静态装配；除非任务明确要求推进注册表驱动，否则优先修改现有静态路由和菜单
- 如果任务来自 `emotional` 模块 PRD，先把它视为目标需求输入，再单独确认当前代码缺口，不要把 PRD 直接当成现状

---

## 7. 代码风格与改动策略

- 新 Vue 组件优先使用 `<script setup lang="ts">`
- 现有稳定代码不因风格偏好做无关重写
- Pinia store 新增或修改时跟随所在模块既有风格，不做顺手统一重构
- 样式优先沿用现有 `scoped` CSS 模式，避免无必要引入体系切换
- 路径引用优先使用 `@/` 指向 `src/`
- 异步流程、IPC 通信、数据库写入、资源文件操作必须有明确错误处理

---

## 8. 当前优先技术债

任务没有明确方向时，优先关注：

- 备份/恢复未完全覆盖当前主线 schema
- 资源文件生命周期管理未完全收口
- 资源收藏能力未完成
- 评估入口仍是硬编码，不是配置驱动
- 模块注册已存在，但导航与路由仍是静态装配
- 系统命名仍残留旧阶段名称
- 开发/迁移工具仍混在主路由树中

---

## 9. 常用命令

### 开发

```bash
npm install          # 安装依赖
npm run dev          # Web 开发
npm run electron:dev # Electron 联调
npm run dev:force    # 强制重启 Vite
```

### 校验

```bash
npm run type-check   # 类型检查
npm run format       # 代码格式化
npm run lint         # Lint
```

### 构建

```bash
npm run build:web
npm run build:electron
npm run build:electron:win
npm run build:electron:mac
npm run build:electron:linux
```

---

## 10. 验证基线

- 改动 TypeScript、Vue、路由、Store、数据库 API 后，至少运行一次 `npm run type-check`
- 涉及 Electron IPC、激活、备份恢复、资源导入导出、评估报告生成时，补充说明手工验证路径或当前阻塞
- 优先给出最小但真实的验证结果，不要只写"理论上可行"

---

## 11. 文档维护规则

修改入口文档时，同步检查：

- `HANDOFF.md`（更新 last_updated 日期）
- `README.md`
- `docs/INDEX.md`
- `PROJECT_CONTEXT.md`（仅在全局背景有实质变化时）

引用历史文档时，必须明确标注"历史 / 草案 / 原始需求 / 旧交付稿"。

---

## 12. 输出要求

- 简洁、直接、少空话
- 优先说清"当前已实现 / 当前未实现 / 当前过渡态"
- 避免把目标态当现状
- 除非任务要求，不要做与目标无关的大规模风格重构
