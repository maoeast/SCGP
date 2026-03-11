# 2026-03-11 Assessment Cleanup

## 背景

今天的工作目标分为两部分：

1. 梳理 SCGP 当前项目的模块结构，明确平台底座、业务模块和评估主链。
2. 检查并修复当前最重要的业务模块“能力评估”中的关键问题，优先处理会影响评估结果保存、报告索引和后续维护稳定性的问题。

---

## 项目结构结论

当前 SCGP 可以按以下结构理解：

- Desktop Shell
  - Electron 主进程、预加载、文件系统、`resource://` 协议、自动更新
- App Shell
  - Vue 3 + Router + Pinia，负责应用启动、认证恢复、激活检查、主布局与导航
- Core Kernel
  - SQL.js/SQLite 数据层
  - `SQLWrapper` 防抖原子保存
  - `DatabaseAPI`
  - `ModuleRegistry` 与 IEP 策略注册
- Business Modules
  - 能力评估
  - 游戏训练
  - 器材训练
  - 训练计划/训练记录
  - 资源中心
  - 班级管理/系统管理

能力评估目前已经采用“统一容器 + ScaleDriver”的平台化结构，是当前仓库里最关键的一条业务链。

---

## 今日主要发现

### 1. 报告记录快照存在真实运行时 bug

`ReportAPI`、游戏训练记录、器材训练记录在读取学生班级快照时，把 `SELECT` 查询错误地写成了 `execute(...)`。

影响：

- 读取结果不是记录对象，而是受影响行数
- `class_id` / `class_name` 快照可能为空
- 报告记录、训练记录的班级快照不可靠

### 2. 评估类型契约与运行时实现已经漂移

`src/types/assessment.ts` 中缺失多项运行时已经在使用的字段，例如：

- `ScaleAnswer.metadata`
- `DimensionScore.level`
- `DimensionScore.levelName`
- `ScoreResult.extraData`

影响：

- `AssessmentContainer`、各量表 Driver、报告页之间接口不一致
- 后续修复成本升高
- 类型系统无法有效保护评估主链

### 3. 新量表报告能力接入不完整

`SDQ`、`SRS-2`、`CBCL` 的评估保存和报告路由已经存在，但报告统计、报告类型定义、历史迁移支持不完整。

影响：

- 新量表报告可部分使用，但系统级统计和索引不完整
- 报告管理页与底层数据能力不一致

### 4. 评估驱动层存在较多类型债

`SDQDriver`、`SRS2Driver`、`CBCLDriver`、`CSIRSDriver`、`SMDriver`、`WeeFIMDriver` 中存在：

- 错误或过期的类型导入
- 空值保护不足
- Driver 返回结构与基础类型不匹配
- 私有方法命名与基类方法冲突

影响：

- Driver 注册表稳定性下降
- `type-check` 中评估驱动层持续报错
- 后续新增量表/报告时风险变高

---

## 今日完成的修复

### 第一批：报告索引与评估类型收紧

已修改：

- `src/database/api.ts`
- `src/types/assessment.ts`
- `src/views/Reports.vue`
- `src/views/assessment/AssessmentContainer.vue`
- `src/config/feedbackConfig.d.ts`

修复内容：

- 修正 `SELECT` 被误用为 `execute` 的查询错误
- 为报告记录补齐 `srs2` / `cbcl` 类型支持
- 为报告统计补齐 `sdq_count` / `srs2_count` / `cbcl_count`
- 为历史迁移逻辑补齐 `SDQ` / `SRS-2` / `CBCL`
- 为报告页新增 `SDQ` / `SRS-2` / `CBCL` 统计卡片
- 补齐评估通用类型中的运行时真实字段
- 修正 `AssessmentContainer` 中几处直接影响主链的类型问题

### 第二批：驱动层清理

已修改：

- `src/strategies/assessment/CBCLDriver.ts`
- `src/strategies/assessment/CSIRSDriver.ts`
- `src/strategies/assessment/SDQDriver.ts`
- `src/strategies/assessment/SMDriver.ts`
- `src/strategies/assessment/SRS2Driver.ts`
- `src/strategies/assessment/WeeFIMDriver.ts`

修复内容：

- 清理错误或过期的类型导入
- 修复 `SDQDriver` 中与基类方法冲突的私有方法命名
- 为 `SRS2` / `SDQ` 的 level 类型做明确收口
- 为 `CBCLDriver` 增加缺失配置的防御性兜底
- 为 `CSIRSDriver` 对齐实际导出的类型来源
- 为 `SMDriver` 增加数组项空值保护
- 为 `WeeFIMDriver` 增加 recommendation 兜底

---

## Git 提交

今日已生成 2 个提交：

- `b4699c1` `fix(assessment): tighten report indexing and typing`
- `b5c9fe0` `fix(assessment): align scale drivers with runtime types`

---

## 验证结果

### 已完成验证

1. 对评估/报告相关文件进行了定向 `type-check`
2. 对评估驱动目录进行了单独定向 `type-check`

结果：

- 评估驱动层的定向类型检查已清空
- `Reports.vue`、`AssessmentContainer.vue`、本次修改涉及的 `database/api.ts` 相关错误已下降并对齐

### 未完成验证

未完成全仓 `type-check` 清零。

原因：

- 仓库仍存在大量与本次任务无关的历史类型债
- 这些问题主要分布在各报告页、导出类型、资源中心、游戏模块等区域

---

## 当前剩余问题

目前评估模块剩余问题主要集中在“报告页层”，而不是“驱动层”：

- `Conners` 报告页中的 `student_name` 类型与导出参数不一致
- `SDQ` / `SRS-2` / `CBCL` 报告页在重建 `ScoreResult` 时仍有类型偏差
- `WeeFIM` 报告页仍有 `ReportType` 类型不匹配

这些问题不影响今天已经完成的报告索引修复和驱动层收口，但会继续阻碍评估模块达到完整的全量类型通过状态。

---

## 建议的下一步

建议按下面顺序继续：

1. 清理 `Conners` 报告页类型
2. 清理 `SDQ` / `SRS-2` / `CBCL` 报告页中 `ScoreResult` 重建逻辑
3. 修正 `WeeFIM` 报告页导出类型
4. 再次执行评估模块范围的定向 `type-check`
5. 最后再考虑是否继续扩展到全仓类型债治理

---

## 结论

今天已经完成了评估模块中最关键的一层治理：

- 修复了报告记录快照的真实运行时 bug
- 收紧了评估主链的通用类型契约
- 补齐了新量表的报告统计/迁移支持
- 清理了评估驱动层的主要类型问题

现在评估模块的“驱动层 + 报告索引层”已经比开始时稳定得多，后续工作重点应转到“各报告页类型收口”。
