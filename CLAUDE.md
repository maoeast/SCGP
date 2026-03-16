# CLAUDE.md - SCGP Claude Working Guide

本文件用于帮助 Claude 在 SCGP 仓库中快速建立正确上下文，并按当前代码现实开展开发工作。

## 1. 启动先读

进入仓库后，优先按以下顺序建立上下文：

1. `README.md`
2. `PROJECT_CONTEXT.md`
3. `重构实施技术规范.md`
4. `docs/planning/2026-03-13-scgp-current-prd.md`
5. `docs/reports/2026-03-13-scgp-prd-gap-analysis.md`
6. `docs/INDEX.md`

如果任务与历史方案有关，再按需查看：

- `docs/plans/2025-02-05-refactor-implementation-plan.md`
- `docs/plans/2025-02-17-assessment-module-refactor-design.md`
- `docs/planning/prd.md`

`.planning/PROJECT.md`、`.planning/ROADMAP.md`、`.planning/REQUIREMENTS.md`、`.planning/STATE.md` 主要是 GSD 过程状态文件。只有在任务已经明确进入 GSD 规划或执行流程时，才把它们作为工作流入口；它们不是当前产品事实的最高来源。

## 2. 项目身份

- 当前正式产品名称：`SCGP / 星愿能力发展平台`
- 历史阶段名称：
  - `生活自理适应综合训练系统`
  - `感官能力发展系统 (SIC-ADS)`
- 当前实现、当前产品、当前平台，统一使用 `SCGP`
- 旧名称仅用于历史文档、旧计划、兼容代码和演进追溯

## 3. 当前产品现实

SCGP 当前主线已经具备以下可运行能力：

- 学生管理
- 能力评估
- 游戏训练
- 器材训练
- 训练记录
- 训练计划
- 报告生成
- 资源中心
- 系统管理
- 班级管理与学生分班
- 本地账号登录、激活、更新接入、备份恢复

截至 2026-03-13，应明确以下现实：

- `sensory` 是当前最完整的业务主链
- `emotional`、`social` 等未来模块仍主要是占位、实验或部分结构准备
- 不要把未来模块写成已经完整交付

## 4. 当前架构事实

- 技术栈：`Electron + Vue 3 + TypeScript + Vite + SQL.js`
- 数据库主线：渲染进程内 `sql.js` + `SQLWrapper` 防抖保存
- 持久化主线：渲染进程导出数据库，经 IPC 交给 Electron Main 做原子写入
- 资源协议：`resource://`
- 资源主模型：`sys_training_resource + sys_tags + sys_resource_tag_map`
- 评估主链：`AssessmentContainer + ScaleDriver`
- 模块系统：已有 `ModuleRegistry`
- 当前路由现状：仍以静态路由表为主，不是注册表动态装配

不要误判为当前已完成的事项：

- 数据库 Worker 主链
- Image Worker 主链
- 注册表驱动的动态路由
- 完整可交付的多模块平台

## 5. 实现约束

- 默认保持本地优先、零原生依赖路线
- 不要新增 `sqlite3`、`sharp` 等需要原生编译的运行时依赖
- 新评估能力优先接入统一评估容器和 `ScaleDriver`
- 新资源能力优先接入统一资源模型，不要继续扩散旧表模式
- 新模块扩展优先沿用平台底座，不要回到单体垂直页面堆叠
- 如果文档与当前代码实现冲突，以代码为准判断“当前现实”，并按需修正文档口径
- 当前导航与路由仍是静态装配；除非任务明确要求推进注册表驱动，否则优先修改现有静态路由和菜单

## 6. 代码风格与改动策略

- 新 Vue 组件优先使用 `<script setup lang="ts">`
- 现有稳定代码不因风格偏好做无关重写
- Pinia 在当前仓库中同时存在 options-style 和 setup-style store；新增或修改 store 时优先跟随所在模块既有风格，不做顺手统一重构
- 样式优先沿用现有 `scoped` CSS 模式，避免无必要引入 Tailwind、UnoCSS、CSS Modules、SCSS 体系切换
- 路径引用优先使用 `@/` 指向 `src/`
- 异步流程、IPC 通信、数据库写入、资源文件操作必须有明确错误处理

## 7. 当前优先技术债

如任务没有明确指定方向，优先关注这些平台债：

- 备份/恢复未完全覆盖当前主线 schema
- 资源文件生命周期管理未完全收口
- 资源收藏能力未完成
- 评估入口仍是硬编码，不是配置驱动
- 模块注册已存在，但导航与路由仍是静态装配
- 系统命名仍残留旧阶段名称
- 开发/迁移工具仍混在主路由树中

## 8. 工作方式

- 先确认当前代码真实状态，再写文档、计划或结论
- 如果发现“文档写已完成，但代码仍是过渡态”，以代码为准，并修正文档口径
- 如果任务是规划类，优先给出：
  - 当前状态
  - 差距
  - 可执行阶段
  - 验收标准
- 如果任务已经放入 GSD 流程或 `.planning/phases/*`，遵循对应计划执行；但对产品现状的判断，仍优先依据现行文档和代码
- 修改文档入口时，同步检查：
  - `README.md`
  - `docs/INDEX.md`
  - `PROJECT_CONTEXT.md`
- 引用历史文档时，必须明确标注“历史 / 草案 / 原始需求 / 旧交付稿”

## 9. 常用命令

### 开发

- 安装依赖：`npm install`
- Web 开发：`npm run dev`
- Electron 联调：`npm run electron:dev`
- 强制重启 Vite：`npm run dev:force`

### 校验

- 类型检查：`npm run type-check`
- 代码格式化：`npm run format`
- Lint：`npm run lint`

### 构建

- Web 构建：`npm run build:web`
- Electron 构建：`npm run build:electron`
- Electron Windows：`npm run build:electron:win`
- Electron macOS：`npm run build:electron:mac`
- Electron Linux：`npm run build:electron:linux`

## 10. 验证基线

- 改动 TypeScript、Vue、路由、Store、数据库 API 后，至少运行一次 `npm run type-check`
- 涉及 Electron IPC、激活、备份恢复、资源导入导出、评估报告生成时，补充说明手工验证路径或当前阻塞
- 优先给出最小但真实的验证结果，不要只写“理论上可行”

## 11. 输出要求

- 简洁、直接、少空话
- 优先说清“当前已实现 / 当前未实现 / 当前过渡态”
- 避免把目标态当现状
- 除非任务要求，不要做与目标无关的大规模风格重构
