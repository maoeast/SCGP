# CPEP-3 报告链路设计 v1.0（2026-09-09）

> 上游：任务书 `export/CPEP-3/C-PEP-3 自动评估报告系统实施 Prompt v1.0.md`；审计三件套（data-audit / maladaptive-direction / legacy-dq）；schema-plan。
> 核心原则：**原始评分是事实层，量表计算是规则层，AI 是解释与教学建议层**——三层彻底分离，AI 永不反向修改评分或生成常模。

## 0. 与既有未提交实现的三处裁决（用户任务书为准）

| 冲突 | 既有实现 | 本轮定案 |
|---|---|---|
| P/E/F 分值 | P=1/E=0/F=0 | **P=2/E=1/F=0**（§2.2；规则层常模输入仍为 P 计数，E 不计通过——与已批准 E 计 0 口径不冲突，分值与通过计数是两层） |
| 综合 DQ | 7 能区 DA 平均派生 overallDq，报告主位展示 | **移除**（§23 禁总 DQ；legacy-dq-audit 已记录；能区派生 DQ 保留于专业数据区并固定标注） |
| 术语「病理」 | UI/报告用「病理能区」 | **UI/报告统一「适应不良行为」**；题库原始文本不动（§2.1） |

## 1. 三层架构与模块落位

```
事实层（不可变）: cpep3_assess_detail（level+score 双存）+ cpep3_assess 主表标量
规则层（纯函数）: src/services/cpep3-report-engine.ts
  ├─ buildCpep3Report(input) → Cpep3ReportSnapshot（报告合同全量）
  │    内部调用: getNormativeResult / getEmergingSkills / getStrengths / getSupportNeeds /
  │             buildProfileView / generateIepRecommendations / validateCpep3Report (G1-G8)
  ├─ getNormativeResult: 百分位/标准分恒 null（not_available）；DA 仅发展能区查 pg 表
  ├─ getEmergingSkills: 唯一来源 scoreLevel==='E'（AI 不参与判断）
  ├─ getStrengths: 相对优势 = 能区通过率排序 + 措辞约束（「相对优势/当前较稳定掌握」）
  ├─ getSupportNeeds: F 项按「与 E 相邻优先」排序（IEP 优先级 E > 相邻 F > 其他 F）
  ├─ buildProfileView: 发展剖面（7 能区完成度百分比，标注「完成度/得分比例」）
  └─ generateIepRecommendations: 三级结构（优先 3-5 / 次级 5-8 / 家庭泛化）
校验层: validateCpep3Report（G1-G8 硬校验，快照保存前强制通过）
AI 解释层: 现有 AI 链（adapters/ai-tools/profile）只消费快照标量，不回写评分
```

## 2. 评分数据合同（types/cpep_3.ts 新增）

```ts
type Cpep3ScoreLevel = 'P' | 'E' | 'F'                       // 施测
const CPEP3_ADMINISTERED_SCORE: Record<level, 2|1|0> = { P:2, E:1, F:0 }
// 观察题 A/M/S 沿用严重度分 0/1/2（方向审计已核实：越高越需关注）
interface Cpep3SubtestResult { domainCode, name, category: 'developmental'|'maladaptive'|'caregiver',
  rawScore, maxRawScore, pCount, eCount, fCount, percentile: null, developmentalAgeMonths: number|null,
  developmentalAgeRange: string|null, standardScore: null, classification: null }
interface Cpep3EmergingSkill { questionId, codeNo, taskName, domainCode, domainName, scoreLevel:'E',
  teachingDomain, suggestedGoal }
interface Cpep3IepPlan { priority: Cpep3IepGoal[3..5]; secondary: Cpep3IepGoal[5..8]; familyGeneralization: string[] }
interface Cpep3IepGoal { goalText /* 可测量句式 */, domainName, currentPerformance, sourceQuestionIds, criteria, promptLevel, setting }
```

（完整字段见 `src/types/cpep_3.ts` 实现；snapshot 合同见 schema-plan §4。）

## 3. 关键规则定义

### 3.1 常模（任务书 §六）
- `getNormativeResult(domain, passCount)`: 发展能区 → pg 查表 `{percentile:null, developmentalAgeMonths:中值|null, standardScore:null, source:'authorized_norm_table'}`；适应不良/照顾者 → 全 null + `source:'not_available'`。
- 报告主展示优先级：原始分 → P/E/F 分布 → 发展当量区间（原文）→ 完成度百分比（标注「完成度」）→ 百分位/标准分区显示「当前系统未配置该指标的标准化常模换算数据。」
- 禁止：插值、拟合、AI 补常模、把完成度百分比冒充百分位。

### 3.2 Emerging Skills（任务书 §八）
- `getEmergingSkills(itemResults)`: filter `scoreLevel==='E'`，逐题携带 taskName/能区；`teachingDomain` = 能区名映射；`suggestedGoal` = 模板生成（纯规则文案，不调 AI）。
- G6 校验：快照内 emerging 全部为 E；出现 P/F 即 FAIL。

### 3.3 优势 / 支持需求（任务书 §十/九）
- 相对优势：能区通过率（P/题数）降序，top 2 且通过率 ≥50%；措辞白名单（「相对优势」「当前较稳定掌握」「表现较成熟」），禁「正常/达到正常儿童水平」。
- 需要支持：F 项排序 = 与 E 同能区相邻的 F（同能区存在 E 即视为「相邻」）> 其他 F；上限 12 条展示。

### 3.4 IEP 生成（任务书 §十四/十五）
- 输入：emerging + supportNeeds + maladaptive findings（H-L 各区 A/M/S 计数）；照顾者报告缺席时家庭泛化退化为「生活情境泛化建议」模板并明示「照顾者报告未配置」。
- 三级：priority（3-5，全部源自 E 项）、secondary（5-8，相邻 F 为主）、familyGeneralization（≤4 条，源自 E 项生活化改写）。
- 目标句式固定可测量：「在{场景}活动中，在{提示等级}下，儿童能够{taskName 行为描述}，连续 3 次活动达到 80% 正确率。」（提示等级按能区模板：口语提示/手势+示范/全程肢体辅助——规则文案，非 AI 生成）

### 3.5 报告快照（任务书 §二十）
- persistAssessment 时 `buildCpep3Report` 一次生成 → G1-G8 校验通过才入快照列；失败则持久化整体失败（宁可不存不存错）。
- G1 含全量覆盖校验（139 题全施测：漏答/重复/不存在均 FAIL；传入题库集合 <139 时视为局部作答场景，跳过漏答检查）。
- 读取：报告页有快照 → 纯快照渲染（历史不可变）；`reportVersion` 按 `cpep3-report-v` 前缀族接受（旧小版本快照原样呈现，不静默丢弃）；无快照旧行 → 按明细只读重算 + 顶部提示「旧版记录」。
- 版本号：`cpep3-report-v1.0` / `cpep3-scoring-v1.0` 常量出 `src/services/cpep3-report-engine.ts`。
- rawScore 语义（任务书 §四/G8 汇总口径）：发展能区 = Σ score_value（P=2/E=1 计入），maxRawScore = 题数×2；适应不良行为能区 = 严重度分 Σ(0/1/2)；完成度剖面仍按通过数/已答数计算并在 UI 标注。

### 3.6 发展剖面（任务书 §十一）
- 视图一：7 发展能区柱状图（echarts，纵轴=完成度百分比 通过数/已答数×100，标题标注「完成度（得分比例）」）+ 每能区标注发展当量区间原文。
- 适应不良行为 4→5 区（H-L）**单独卡片**表格呈现（A/M/S 计数 + 严重度分 + 「分值越高表示观察到的适应不良行为越多」——方向审计核实语）。
- 百分位永不出现在图上（无合法常模）。

## 4. 报告页结构（Report.vue 重构，任务书 §十七）

基本信息 → 评估说明（非诊断声明）→ 整体概况（规则生成 150-300 字摘要）→ 发展能区明细（原始分/分布/发展当量区间/解释）→ 发展剖面图 → 适应不良行为观察（5 区单独卡）→ 照顾者报告占位（「未配置」声明）→ 相对优势 → Emerging Skills（领域/技能/当前表现/教学意义）→ 当前需要支持的技能（相邻 F 优先）→ IEP 优先教学目标 → 教学建议 → 家庭泛化建议 → 评估说明与限制（环境/情绪/注意状态影响声明）。

## 5. AI 链与同步面

- 适配器 `cpep3Adapter`：totalScore 改 `total_pass_count`（总通过数），dimensionScores 保留能区 DQ+通过+萌发（DQ 已带 scoreNote 标注）；scoreNote 增补「总分=总通过数(0-95)，跨次可比；总 DQ 为系统禁用指标」。
- 学生详情 scoreText：`通过 X/95 · 总发展当量 Y月`（去 DQ）。
- `getWelcomeContent` 术语：病理→适应不良行为（driver 内文案）。
- catalog dimensions 文案同步「适应不良行为能区」。

## 6. 测试计划（tests/cpep3-report-engine.test.ts，jiti 纯函数路线）

- 任务书 Test1-6 全覆盖；G1-G8 逐条正反用例；快照版本字段断言；IEP 数量边界（priority 3-5/secondary 5-8）；措辞禁词断言（Test6 词表 +「正常/失败/智商」）；完成度≠百分位标注断言。
- 既有 `tests/cpep3-scoring.test.ts` 同步：7a 计分编码断言 1/0/0 → 2/1/0。
- verifier：7a 同步 + snapshot 列断言。

## 7. 明确不做

- 不建 caregiver_report / iep_recommendation 独立表；不做官方 Composite 映射；不动题库文本；不引入百分位/标准分常模；不做 DQ 分级；报告不出现「诊断/确诊/智商/总DQ」（Test6 门禁）。
