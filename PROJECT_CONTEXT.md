# PROJECT_CONTEXT.md

> 用途：当前有效协作上下文摘要。
> 读取策略：不再作为每次新会话默认首读文件。默认先读 `AGENTS.md`、`docs/planning/2026-03-23-scgp-context-bootstrap.md`、`README.md`；只有在需要延续工作背景时再读本文件。
> 历史说明：旧版长篇工作日志与阶段流水已从高频入口移出，历史摘要见 `docs/logs/2026-03-26-project-context-archive.md`，更细节的完成项见 `docs/CHANGELOG.md` 与 git history。

## 1. 当前项目事实

- 当前正式产品名称：`SCGP / 星愿能力发展平台`
- 历史阶段名称：
  - `生活自理适应综合训练系统`
  - `感官能力发展系统 (SIC-ADS)`
- 技术栈：`Electron + Vue 3 + TypeScript + Vite + SQL.js`
- 当前数据库主线：渲染进程内 `sql.js` + `SQLWrapper` 防抖保存
- 当前持久化主线：渲染进程导出数据库，经 IPC 交给 Electron Main 原子写入
- 当前资源主模型：`sys_training_resource + sys_tags + sys_resource_tag_map`
- 当前评估主链：`AssessmentContainer + ScaleDriver`
- 当前模块系统：已有 `ModuleRegistry`
- 当前路由现实：仍以静态路由表为主，不是注册表动态装配

## 2. 当前产品现实

当前代码主线已经具备以下可运行能力：

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

必须持续记住的现实：

- `sensory` 仍是当前最完整的业务主链
- `emotional` 已有可运行链路，但仍处于持续补全中
- `social`、`life_skills` 等仍不是完整可交付模块
- 不要把未来模块目标态写成当前已实现现状

## 3. 当前已确认的重要变更

### 3.1 器材训练入口与 physical-equipment

- physical-equipment CSV 导入链路已落地
- 当前四份 physical-equipment 草稿 CSV 已规范化入库
- 器材训练内部入口已固定为 6 个：
  - `sensory-integration`
  - `emotional-regulation`
  - `social-communication`
  - `fine-motor`
  - `soothing-aids`
  - `life-skills`
- 顶层授权模型保持不变：
  - 仍按真实业务 `moduleCode`
  - `fine-motor` / `soothing-aids` 没有被提升为顶层授权模块
- 器材训练快速录入左侧分类已改为真实源分类口径，不再显示 `catalog-group / entry-group` 标签

### 3.2 首页

- 首页用户可见标题已改为：`首页看板`
- 首页副标题已改为：`聚焦今天要做的评估、训练与干预提醒，用真实业务数据支持一线决策。`

## 4. 当前活跃未完成主线

当前下一条真正的大改动，不是单页修补，而是：

- 统一 `游戏训练 / 器材训练 / 训练记录`
- 收口为同一套 6 个 internal training entries

当前已确认的实施边界：

- 不考虑旧训练记录兼容
- 旧训练 / 游戏 / 器材记录允许物理删除
- 不做“旧 `module_code` 推断到新 entry”兼容层
- 保持顶层 `moduleCode` 授权模型不变

当前已做的准备：

- 已新增共享入口模型起点：`src/utils/training-entry.ts`
- `src/utils/equipment-training-entry.ts` 已被收敛为兼容包装层

当前尚未完成的关键点：

- `training_records` 仍没有 `entry_code`
- `equipment_training_records` 仍没有 `entry_code`
- 游戏训练链仍主要按顶层 `module` 工作
- 训练记录页面仍主要按顶层 `moduleCode` 工作

## 5. 当前明确决策

- 顶层收费 / 授权继续按真实业务模块：
  - `sensory`
  - `emotional`
  - `social`
  - `life_skills`
  - `cognitive`
- `fine-motor`、`soothing-aids` 等属于内部训练入口，不是顶层授权模块
- 新资源匹配与图片解析优先按 `meta_data.resourceCode`
- 文档与结论必须以当前代码现实为准，不以旧规划或目标态替代现状

## 6. 当前推荐读取顺序

默认新会话：

1. `AGENTS.md`
2. `docs/planning/2026-03-23-scgp-context-bootstrap.md`
3. `README.md`
4. `.continue-here.md`

按需再读：

5. `PROJECT_CONTEXT.md`
6. `docs/planning/2026-03-13-scgp-current-prd.md`
7. `docs/reports/2026-03-13-scgp-prd-gap-analysis.md`
8. `重构实施技术规范.md`

## 7. 维护规则

- 本文件只保留当前有效上下文，不再积累长流水日志
- 已完成历史事项优先进入：
  - `docs/CHANGELOG.md`
  - `docs/logs/2026-03-26-project-context-archive.md`
  - git history
- 如果本文件再次明显膨胀，应继续把历史内容迁出，而不是在这里堆积
