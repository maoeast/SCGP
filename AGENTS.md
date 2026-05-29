# AGENTS.md

> 职责：仓库级规则入口，定义事实来源优先级、阅读顺序、边界和约束。
> 何时阅读：每次进入仓库时；在续接工作前也应至少扫一遍。
> 不负责：替代 `.continue-here.md` 提供当前任务进度细节。

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

如果你只想先读一个总入口，先看 `HANDOFF.md`；但它只负责调度，不替代本文的规则约束。

进入仓库后，默认先用最小上下文建立项目事实，避免会话启动阶段读取过多大文档：

1. `docs/planning/2026-03-23-scgp-context-bootstrap.md`
2. `README.md`

如果是在续接上一轮未完成工作，再补充读取：

3. `.continue-here.md`

只有在任务确实需要更多细节时，再按需补充读取：

- `docs/planning/2026-03-13-scgp-current-prd.md`
- `docs/reports/2026-03-13-scgp-prd-gap-analysis.md`
- `docs/INDEX.md`
- `重构实施技术规范.md`
- `PROJECT_CONTEXT.md`

补充读取规则：

- `.continue-here.md` 只保留当前有效续接信息，优先级高于历史工作日志
- `PROJECT_CONTEXT.md` 已收敛为当前有效上下文摘要，不再作为每次新会话默认首读文件
- `docs/logs/2026-03-26-project-context-archive.md` 是历史归档摘要，不作为默认首读文件
- `重构实施技术规范.md` 同时包含当前落地态与目标态，只有涉及技术细节时再展开读取
- 进入具体开发前，仍必须回到当前代码确认真实实现状态

如果任务与历史方案有关，再按需查看：

- `docs/plans/2025-02-05-refactor-implementation-plan.md`
- `docs/plans/2025-02-17-assessment-module-refactor-design.md`
- `docs/planning/prd.md`

如果任务与 `emotional` 模块有关，再额外优先查看：

- `docs/planning/2026-03-16-emotional-module-prd.md`

使用规则：

- 该文档是 `emotional` 模块的现行需求入口
- 但它描述的是模块目标范围与实现要求，不等同于当前代码已实现状态
- 在进入开发前，必须先回到当前代码确认 `emotional` 仍处于未开发/占位/部分结构准备中的哪一种现实状态

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

1. `docs/planning/2026-03-23-scgp-context-bootstrap.md`
2. `README.md` + `docs/planning/2026-03-13-scgp-current-prd.md`
3. `.continue-here.md`（仅在续接未完成工作时）
4. `docs/reports/2026-03-13-scgp-prd-gap-analysis.md`
5. `重构实施技术规范.md`
6. `PROJECT_CONTEXT.md`
7. 当前仍在执行的 `docs/plans/*.md`

以下文档默认不是当前事实来源，只能作为背景参考：

- `docs/planning/prd.md`
- `docs/guides/系统使用说明书.md`
- `docs/guides/系统参数技术文档.md`
- `docs/logs/2026-03-26-project-context-archive.md`
- 历史实施计划、历史设计稿、历史审计和历史数据流图

模块专用补充规则：

- 如果任务明确指向 `emotional` 模块，除上述基础文档外，补充阅读 `docs/planning/2026-03-16-emotional-module-prd.md`
- 读取该文档时，必须区分“模块目标要求”和“当前代码现实”，不要把 PRD 目标态写成已实现现状

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
- 如果用户说“继续执行 / 续接 / 读取 `.continue-here.md`”，默认先按最小上下文顺序读取 `AGENTS.md`、`docs/planning/2026-03-23-scgp-context-bootstrap.md`、`README.md`，再读取 `.continue-here.md`；随后先用 4 点给出“当前状态 / 已完成 / 剩余工作 / 下一步”，再进入编码
- 如果任务属于跨文件重构、阶段性实施，或用户明确提到“多 agent / 多agent”，默认优先采用多代理拆分实施；若不采用，需要先说明原因

## 10. 输出风格

- 简洁、直接、少空话
- 优先说清“当前已实现 / 当前未实现 / 当前过渡态”
- 避免把目标态当现状
