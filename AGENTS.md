# AGENTS.md

本文件是 SCGP 仓库的代理工作入口，供 Codex 类代码代理在进入仓库时快速建立项目背景、技术边界和协作规则。

## 1. 项目身份

- 当前正式产品名称：`SCGP / 星愿能力发展平台`
- 历史阶段名称：
  - `生活自理适应综合训练系统`
  - `感官能力发展系统 (SIC-ADS)`
- 解释规则：
  - 当前实现、当前产品、当前平台，统一使用 `SCGP`
  - 历史名称仅用于旧文档、旧计划、兼容代码和演进追溯

## 2. 启动先读

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

## 3. 当前产品边界

SCGP 当前代码主线已经具备以下可运行能力：

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

## 5. 代码与实现约束

- 默认保持本地优先、零原生依赖路线
- 不要引入 `sqlite3`、`sharp` 等需要原生编译的运行时依赖
- 新评估能力优先接入统一评估容器和 `ScaleDriver`
- 新资源能力优先接入统一资源模型，不要继续扩散旧表模式
- 新模块扩展优先沿用平台底座，不要回到单体垂直页面堆叠

## 6. 文档事实来源

当前文档优先级：

1. `README.md` + `重构实施技术规范.md`
2. `PROJECT_CONTEXT.md`
3. `docs/planning/2026-03-13-scgp-current-prd.md`
4. `docs/reports/2026-03-13-scgp-prd-gap-analysis.md`
5. 当前仍在执行的 `docs/plans/*.md`

以下文档默认不是当前事实来源，只能作为背景参考：

- `docs/planning/prd.md`
- `docs/guides/系统使用说明书.md`
- `docs/guides/系统参数技术文档.md`
- 历史实施计划、历史设计稿、历史审计和历史数据流图

## 7. 当前技术债重点

如任务没有明确指定方向，优先考虑这些平台债：

- 备份/恢复未完全覆盖当前主线 schema
- 资源文件生命周期管理未完全收口
- 资源收藏能力未完成
- 评估入口仍是硬编码，不是配置驱动
- 模块注册已存在，但导航与路由仍是静态装配
- 系统命名仍残留旧阶段名称
- 开发/迁移工具仍混在主路由树中

## 8. 协作规则

- 任何涉及当前产品定义、模块范围、实施状态的描述，都要以当前代码和现行文档为准
- 历史文档如果被引用，必须明确标注“历史 / 草案 / 原始需求 / 旧交付稿”
- 修改文档入口时，同步检查：
  - `README.md`
  - `docs/INDEX.md`
  - `PROJECT_CONTEXT.md`
- 如果新增现行产品文档，优先放到 `docs/planning/` 或 `docs/reports/`

## 9. 任务执行偏好

- 先确认当前代码真实状态，再写文档、计划或结论
- 如果发现“文档写已完成，但代码仍是过渡态”，以代码为准，并修正文档口径
- 如果任务是规划类，优先给出：
  - 当前状态
  - 差距
  - 可执行阶段
  - 验收标准

## 10. 输出风格

- 简洁、直接、少空话
- 优先说清“当前已实现 / 当前未实现 / 当前过渡态”
- 避免把目标态当现状
