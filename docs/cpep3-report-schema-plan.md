# CPEP-3 报告链路 schema 方案（2026-09-09）

> 任务书 §十九。原则：不破坏当前 schema；确认缺失才设计 migration；实施前经数据兼容性检查。
> 现状：CPEP-3 模块为未提交代码，`cpep3_assess` 建表语句可直接修正（无兼容负担）。

## 1. 既有表核查（任务书清单）

| 期望表 | 现状 | 本轮处置 |
|---|---|---|
| assessment_session | 无（各量表自带 `*_assess` 主表） | 沿用 `cpep3_assess` |
| assessment_item_result | `cpep3_assess_detail`（每题一行，level+score） | 已有，**改 score 语义**为 2/1/0 |
| assessment_subtest_result | 无独立表 | **不建表**：能区结果以 JSON 存 `domain_results`（cnbsr2016 先例）+ 新增 `report_snapshot` 承载冻结版 |
| caregiver_report | 无 | 不建表（无数据源，见 data-audit §3）；合同保留 `caregiver` category |
| assessment_report | `report_record`（索引/跳转用） | 已有，不动 |
| iep_recommendation | 无独立表 | 不建表：IEP 候选目标随 snapshot 冻结存 JSON（IEP 目标本身需教师确认后入 IEP 计划，暂无独立存储需求） |

## 2. `cpep3_assess` 修正（init.ts 建表语句，未提交特性内修正）

```sql
CREATE TABLE IF NOT EXISTS cpep3_assess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  age_months INTEGER NOT NULL,
  ca_year INTEGER NOT NULL,
  ca_month INTEGER NOT NULL,
  ca_day INTEGER NOT NULL,
  ca_months_decimal REAL NOT NULL,
  total_pass_count INTEGER NOT NULL,       -- ΣP（常模换算输入，0-95）
  total_emerging_count INTEGER NOT NULL,   -- ΣE（萌发技能数）
  total_mental_age REAL NOT NULL,          -- 总发展当量月中值（gn 区间中值，派生）
  total_month_range TEXT NOT NULL,         -- 总发展当量月龄区间原文
  -- dq 列移除（任务书 §23 禁总 DQ）
  domain_results TEXT NOT NULL,            -- JSON: Cpep3DomainResult[]（12 能区）
  report_snapshot TEXT,                    -- JSON: Cpep3ReportSnapshot（不可变快照，见 §4）
  report_version TEXT,                     -- 如 cpep3-report-v1.0（无快照时 NULL）
  scoring_version TEXT,                    -- 如 cpep3-scoring-v1.0
  start_time TEXT NOT NULL,
  end_time TEXT,
  total_duration INTEGER, avg_response_time REAL, quality_note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);
```

- 既有 dev 库的 `cpep3_assess` 带 `dq` 列且无快照列 → 新增 `migrateCpep3ReportColumns()`（init.ts 启动迁移段，safeAddColumn 先例），幂等 `ALTER TABLE ADD COLUMN report_snapshot/report_version/scoring_version`。
- 旧列 `dq` **必须 DROP**（2026-09-09 真机 bug 修正）：任务书 §23 禁总 DQ 后新 INSERT 不写 dq，而旧表 `dq REAL NOT NULL` 约束导致插入失败（`NOT NULL constraint failed: cpep3_assess.dq`）。迁移在补列后执行 `ALTER TABLE cpep3_assess DROP COLUMN dq`（sql.js 1.14 支持已验证；旧数据行保留，历史不可变不受影响）。dev 库旧 UAT 行 score 为旧语义（P=1）且无快照 → 报告页对无快照旧行显示「旧版记录，请重测后生成完整报告」并按明细表重算展示层（只读重算，不改库）。

## 3. `cpep3_assess_detail` 修正

- `score` CHECK(0,1,2) 不变；**语义变更**：施测 P=2/E=1/F=0（任务书 §2.2）；观察 A=0/M=1/S=2（严重度分，方向审计已核实）。
- `level` 列已是 P/E/F/A/M/S 字符串档位——满足任务书 §2.2「禁止只存数值丢语义」的双存要求。

## 4. Cpep3ReportSnapshot 数据合同（TS 定义，冻结存 JSON）

```ts
interface Cpep3ReportSnapshot {
  reportVersion: string          // 'cpep3-report-v1.0'
  scoringVersion: string         // 'cpep3-scoring-v1.0'
  generatedAt: string            // ISO
  itemResults: Array<{ questionId, codeNo, itemType, domainCode, scoreLevel: 'P'|'E'|'F'|'A'|'M'|'S', scoreValue: 2|1|0 }>
  subtestResults: Cpep3DomainResult[]   // 12 能区原始统计（含 DA 区间与中值、ratedCounts、severityScore）
  total: { passCount, emergingCount, monthRange, daMidpointMonths }
  normative: { source: 'authorized_norm_table'|'not_available', percentile: null, standardScore: null, daByDomain: Record<code, {range, midpoint}|null> }
  emergingSkills: Cpep3EmergingSkill[]
  iepRecommendations: Cpep3IepPlan
  profile: Cpep3ProfileView      // 发展剖面视图数据（完成度百分比 + DA 区间）
}
```

- 快照在 **persistAssessment 时**由报告引擎一次生成并冻结（任务书 §二十）；报告页优先读快照，无快照旧行降级重算展示。
- 快照内不存总 DQ（§23）；`normative.percentile/standardScore` 恒 `null` 直至有合法常模表。

## 5. 无新表、无破坏性 migration 清单

- init.ts：`cpep3_assess` 建表语句修正 + `migrateCpep3ReportColumns` 幂等补列（新装库无感，旧 dev 库补三列）。
- 不动 `report_record`（report_type `'cpep_3'` 已在 CHECK 白名单）。
- verifier（`verify-cpep3-item-bank.mjs`）断言同步：7a 改 P=2/E=1/F=0；新增快照列存在性断言（对生成的建表 SQL 字符串断言，不连库）。
