# CPEP-3（PEP-3 心理教育量表·中文修订版）评估模块集成计划

> 日期：2026-09-09
> 状态：已批准（用户确认：挂载/命名/DQ口径/病理区处理均按推荐方案）
> 数据源：`export/CPEP-3/`（题库 139 题 + pg/gn 常模 + 修复审计）；参照源库 `export/QDDBUser.db`（CPEP3Subject / UserPGDetail 真实施测记录）
> 定位约束：面向学校资源教室、特殊学校、一般康复干预机构使用，**不构成医疗建议**；所有结果为教育参考呈现。

## 1. 数据事实（已验证）

### 1.1 题库（cpep3_items.json，139 题，codeNo 无重复）

- 发展能区 7 个（95 道施测题，`itemType='administered'`）：
  - A 模仿 10 / B 知觉 11 / C 精细动作 10 / D 粗大动作 11 / E 手眼协调 14（含 1 条「手言协调」错别字，见 1.4）/ F 认知表现 20 / G 口语认知 19
- 病理能区 5 个（44 道观察题，`itemType='rated'`）：
  - H 情感 6 / I 人际关系 7 / J 物品喜好 6 / K 感觉 14 / L 语言 11
- 评分档位：
  - 施测题 91 题标准 P/E/F 三级；**4 题非标准**：`6B` 仅 P（二分）、`17C`/`*22B`/`55` 仅 P,E——UI 与计分必须按题动态给档
  - 观察题 44 题统一 A/M/S 三级
- 字段：`id / codeNo / domainCode / domainName / itemType / taskName / materialDesc / procedureDesc / standardDesc / scoreLevels[]`
- 带 `*` 前缀的 codeNo 共 20 个（PEP-3 手册「学能测试项目」标记，保留原样，仅展示时去除前缀）

### 1.2 常模

- `cpep3_pg_month_norms.json`（102 行）：分能区「通过项目数 → 发展当量月龄区间」。
  - 各能区档位数 = 施测题数 + 1（A 10→11 档 … F 20→21 档），全覆盖 0..N，验证通过。
- `cpep3_gn_fz_month_norms.json`（96 行）：**总通过项目数（0-95）→ 总发展当量月龄区间**。
  - ⚠️ 字段名 `developmentalQuotient` 是源数据误称，实为总通过数（0-95 连续递增）。入库时语义纠正为 `totalPassCount`。
- 区间形态（如 B 知觉通过 11 → 58-61 月）：重叠属设计（不同通过数映射的月龄区间相互搭接），取用方式见 §3.3。

### 1.3 源库实证（QDDBUser.db）

- `UserPGDetail` 有 2 次真实 CPEP-3 施测记录，确认源软件计分编码：
  - **施测题：P=3 / E=2 / F=0；观察题：A=3 / M=2 / S=1**（PGValue 值域 0/1/2/3）
  - `CPEP3Subject.Codetype`：1=施测（95）/ 2=观察（44）；`LYCode`=能区 code
- **E 的计分规则实证结论**：pg/gn 常模为严格整数档，E 计 0.5 无法查表；源库无有效反推记录。定案：**E（萌发中技能）在发展当量计算中计 0 分，单独统计「萌发技能数」在能区剖面展示**——PEP-3 官方设计意图即 E 是教育信息而非通过计数，此口径保守、自洽、可解释。
- 源库 37 条评分描述文本截断（录入时即截断，如 code 55 的 E 档"…但心时"括号未闭合）：转换脚本输出截断清单备人工对照纸质手册，**不阻塞计分**（计分靠编码不靠文本）。

### 1.4 数据修正项（转换脚本内处理，verifier 门禁）

1. `id=139（11A-2）` domainName「手言协调」→「手眼协调」（源库录入错别字，同 LYCode=E）
2. 4 道非标准档题已人工补录恢复标准 P/E/F 三级（2026-09-09 更新：最初按"保留原始档位"处理，真机验收发现单档题导致计分失真，用户确认补录——6B 三档判据由用户提供，其余 F 档参照同组题官方句式；见转换脚本 MANUAL_SCORE_LEVEL_SUPPLEMENTS）
3. gn 表字段名语义纠正（`developmentalQuotient` → `totalPassCount`）

## 2. DQ 换算口径（用户提供的 `export/CPEP-3/DQ换算口径.md`，已评估采纳）

双层架构，防止「软件派生 DQ」被误认为官方规范分数：

- **官方层**：Raw Score → 发展当量月龄区间（pg/gn 常模查表）/ 发展剖面。报告页主位呈现。
- **系统扩展层**：`DQ_domain = DA_domain / CA × 100`（派生 DQ）。数值旁**固定标注**「派生指标，非 CPEP-3 官方规范分数」。
  - CA（实际月龄）按「年月日借位、月按 30 天」精确计算，存 `CA_year / CA_month / CA_day / CA_months_decimal`；**不采用「≥15 天进 1 个月」**。
  - DA 取该通过数对应月龄区间的**中值**（报告页同时展示区间原文）。
  - 综合发展商数（Overall DQ，7 能区发展当量中值平均 ÷ CA ×100）列名明确为「综合发展商数（派生）」。
- **不引入任何 DQ 分级**（Gesell 85/70/55/40 或残疾分级口径均不采用）——DQ 数值 + 发展当量月龄直接呈现，语义判读交给专业使用者，与产品「不构成医疗建议」定位一致。
- **天花板/超龄警示**：CA > 90 月（7.5 岁）或任一 DA 达该能区量表上限时，报告自动显示：「对实际年龄明显超出常模范围或发展当量接近量表上限的被评者，DA/CA 比率型指标存在年龄及天花板效应，宜优先解读发展当量月龄与技能剖面」。

## 3. 产品与数据设计

### 3.1 命名与挂载（用户已确认）

- `code = 'cpep_3'`（下划线口径，同 abc/atec/gmfm_88）；`reportComponentFolder = 'cpep-3'`；`urlSlug = 'cpep_3'`；`reportRouteName = 'Cpep3Report'`；`trendRouteName = 'Cpep3Trend'`
- 名称：「PEP-3 心理教育量表（中文修订版）」；副标题「(CPEP-3)」
- entryTabs：`social-communication` / `emotional-regulation` / `sensory-integration` 三 tab（与 ABC/ATEC 同款）
- entitlement：`accessEntitlementsAnyOf = ['social_communication','emotional','sensory_integration']`；`accessModulesAnyOf = ['social','emotional','sensory']`（兼容 fallback）
- 适用年龄：PEP-3 官方常模约 2-7.5 岁；`ageRange` 文案「2-7岁（常模覆盖 2-7.5 岁）」。超龄不作硬拦截，触发 §2 警示。

### 3.2 施测形态

- 无 basal/ceiling（与 CNBS-R2016 不同）：**全量表 139 题顺序施测**；`getStartIndex` 返回 0。
- 每题选项 = 该题 scoreLevels 动态渲染（91 题 P/E/F、1 题 P、3 题 P/E、44 题 A/M/S）。
- 施测题分值：P=1 / E=0（萌发，另计数）/ F=0；观察题：A/M/S 计数与严重度分（A=0/M=1/S=2）。
- 题干呈现：taskName + materialDesc（教具）+ procedureDesc（施测过程）+ 按档评分标准。

### 3.3 计分引擎（Cpep3Driver）

1. 分能区统计施测题 P 数（= 通过数）与 E 数（萌发数）
2. 能区通过数 → pg 表查发展当量月龄区间（中值为 DA）
3. 总通过数（ΣP，0-95）→ gn 表查总发展当量月龄区间
4. 派生 DQ：能区级（7 个）+ 综合级（7 能区 DA 平均），均 `DA/CA×100`
5. 病理区：A/M/S 计数 + 严重度分（Σ 0/1/2），仅描述性呈现，无分级解读
6. 通过数超出 pg 表档位（理论上不可能，防御性）→ verifier + runtime 双断言

### 3.4 持久化

- `cpep3_assess`（主表）：student_id、CA 四列（year/month/day/months_decimal）、各区通过数/萌发数/发展当量区间/DA 中值/DQ（7×4 JSON 于 domain_results + 关键标量列）、总通过数、总发展当量区间/中值、综合 DQ、病理区计数 JSON（A/M/S 计数 + 严重度分）、quality 三列
  - 列形态对齐 `cnbsr2016_assess` 先例（age_months/total_mental_age/dq/dq_status/domain_results JSON），但**无 dq_status 分级列**（§2 不引入 DQ 分级）；dq 保留为标量列供趋势/排序
- `cpep3_assess_detail`：每题一行（question_id/code_no/domain/item_type/level/score/answer_time），`CHECK(score IN (0,1,2))`（严重度分 0/1/2 与施测 P=1 统一为 0-2 值域；P=1/E=0/F=0，A=0/M=1/S=2）
- `report_record`：report_type `'cpep_3'`；moduleCode `resolveModuleCode` → `'social'`（与 ABC/ATEC 同族；Driver persist 实参同步写 'social'，避免快照口径分裂）

## 4. 实施阶段

> 实施记录（2026-09-09 全部完成）：Phase 0-3 代码级交付并全量验证通过（type-check / build:web / verifier 26 断言 / 契约测试 11 项 / CPEP-3 单测 6 组 / report-center·adapter·profile 测试）。真机 UAT 待用户执行。实施中的口径微调：advisor 评审后 overallDq 定为「7 能区 DA 平均」（§3.3 原文即此），gn 查表值（total_mental_age）作为展示口径并存——两者语义已在 Cpep3Driver.ts 注释。e2e 测试因 jiti 无法加载 Driver→api→init→.sql 链，改走「计分纯函数模块 + 纯数据题库」路线（src/services/cpep3-scoring.ts + tests/cpep3-scoring.test.ts）。

### Phase 0 — 修复 abc/atec 遗留债（先行，独立可交付）

- `src/views/student-detail/assessment-records.ts:371-372`：abc/atec 空数组 TODO → 实现记录查询 builder（仿 brief/crt/cognitive_self builder 形态，查询各自 _assess 表）
- `scripts/tests/assessment-entry-dynamicization.test.mjs` 4 处硬编码同步 17/17/15 现状：catalog 数（:40）、EXPECTED_REPORT_ROUTE_NAMES 补 ABCReport/ATECReport（:26-30）、builder 断言名单（:98-106）、trendSupported 数（:161）
- 验证：`node --test scripts/tests/assessment-entry-dynamicization.test.mjs` 11/11 绿 + `npm run type-check`

### Phase 1 — CPEP-3 数据层

- 新建 `scripts/convert-cpep3-data.mjs`：读 `export/CPEP-3/cpep3_items.json` + 两个常模 JSON → 生成 `src/database/cpep3-questions.ts`（题库+常模常量，仿 cnbsr2016-questions.ts）；同时输出 §1.4 三项修正 + 37 条截断清单（打印）
- 新建 `src/types/cpep_3.ts`：能区常量/题型/评分档/计分结果类型（仿 types/cnbsr2016.ts）
- 新建 `scripts/verify-cpep3-item-bank.mjs`：139 题、能区题数=pg 档位-1、总通过数 0-95 全覆盖、非标准档 4 题清单、修正项断言（「手眼协调」零「手言协调」）
- 修改 `src/database/init.ts`：建 `cpep3_assess` + `cpep3_assess_detail` + 索引（形态抄 cnbsr2016 段 :184-223/:788-790）；`ensureAssessmentQualityColumns` 清单加 `cpep3_assess`（:3206-3223）；report_record CHECK 加 `'cpep_3'`（:475）
- 修改 `src/database/migrate-report-constraints.ts`：重建表 CHECK（:62）+ `needsMigration` 检测（:182-197）加 `'cpep_3'`
- 验证：verifier 全绿 + `npm run type-check` + 手动跑一次 `migrateReportRecordConstraints` 幂等（本地 dev 库）

### Phase 2 — Driver + API + 视图 + catalog

- 新建 `src/database/cpep3-api.ts`：`Cpep3AssessmentAPI extends DatabaseAPI`，事务 `saveAssessment`（仿 api.ts:1309 Cnbsr2016AssessmentAPI）
- 新建 `src/strategies/assessment/Cpep3Driver.ts`：§3.2 施测 + §3.3 计分 + persistAssessment（API 事务 + createReportRecord('cpep_3','social') + saveQualityMetrics）
- 修改 `src/strategies/assessment/index.ts`：import + driverRegistry + 尾部导出三处
- 修改 `src/database/api.ts`：saveReportRecord 联合类型（:2970）+ resolveModuleCode 加 cpep_3→social（:2934-2963）
- 修改 `src/features/assessment/assessment-scale-catalog.ts`：ASSESSMENT_SCALE_CODES + 完整 catalog 条目
- 新建 `src/views/assessment/cpep-3/Report.vue`：官方常模层（能区发展当量区间+萌发技能数+病理区 A/M/S 计数）/派生层（分区呈现 DQ，固定标注）+ 天花板警示 + 逐题明细
- 验证：type-check + build:web + 手动 dev 起服跑通一次完整施测→报告

### Phase 3 — AI 链 + 测试同步 + 全量验证

- `src/services/assessment-score-adapters.ts`：object 模式适配器（`totalScoreField:'dq'`、`dimensionScoresField:'domain_results'`、scoreNote 写明「派生 DQ=DA/CA×100，非官方规范分数；E 萌发技能不计入通过数」）+ SCORE_ADAPTERS 注册
- `src/services/ai-tools.ts:151`：description 文案 15→16 并补 cpep_3
- `src/services/assessment-profile.ts`：SCALE_DOMAIN_MAP 加 `cpep_3:'social'`（:38-59）
- `src/views/student-detail/assessment-records.ts`：recordsByScale 加 cpep_3 builder
- 测试同步：
  - `scripts/tests/assessment-entry-dynamicization.test.mjs`：18/18/16 + Cpep3Report + cpep_3 builder
  - `tests/report-center-catalog.test.ts`：场景 deepEqual 白名单补 cpep_3
  - `scripts/tests/assessment-scale-catalog.test.mjs`：视 tab 挂载更新集合
  - `tests/assessment-score-adapter.test.ts`：补 cpep_3 注册断言 + 归一化用例
  - 新增 `tests/cpep3-scoring.test.ts`：计分引擎单测（pg/gn 查表、E=0 计数、DQ 派生、非标准档、天花板警示触发）
- 全量验证：`npm run type-check` + `npm run build:web` + 全部相关 test 命令（§E 清单）+ 真机 UAT（入口→施测→报告→报告中心→学生详情→AI 趋势/画像）

## 5. 明确不做（本 scope 外）

- 不做 DQ 分级/残疾分级映射（§2）
- 不做 basal/ceiling 自适应施测（数据结构不支持）
- 不做病理区常模对比（导出数据无病理区常模）
- 不动 `getReportStats`/Reports.vue 旧硬编码白名单（既有现状，报告中心走 catalog 派生不受影响）
- PEP-3 官方 Communication/Motor Composite 副测验结构：本数据是协康会 12 能区修订结构，与 WPS 官方 10 副测验不同名不同构，**不映射**，报告按 12 能区原文呈现

## 7. 报告链路 v1.0 变更记录（2026-09-09 下午，任务书驱动的第二轮）

> 输入：`export/CPEP-3/C-PEP-3 自动评估报告系统实施 Prompt v1.0.md`。审计/设计/裁决见 `docs/cpep3-report-data-audit.md`、`docs/maladaptive-score-direction-audit.md`、`docs/legacy-dq-audit.md`、`docs/cpep3-report-schema-plan.md`、`docs/cpep3-report-design-v1.0.md`（本节仅记差异，不复制设计内容）。

- **P/E/F 计分映射 1/0/0 → 2/1/0**（任务书 §2.2）：转换脚本 + 题库再生成 + verifier 7a；事实层 level+score 双存不变。旧 UAT 明细行（旧语义）建议重测，未写迁移。
- **总 DQ 移除**（任务书 §23）：Driver 不再计算 overallDq；`cpep3_assess` 建表去 `dq` 列（旧 dev 库残列不写不读）；AI 适配器代表性分数改 `total_pass_count`；报告页主位 DQ 卡移除；能区派生 DQ 仅存 JSON 不在报告主位展示。
- **术语**：UI/报告「病理能区」→「适应不良行为能区」（题库原文不动）。
- **报告引擎**（新 `src/services/cpep3-report-engine.ts`）：getNormativeResult（百分位/标准分恒 null）/getEmergingSkills（唯一来源 E）/getStrengths/getSupportNeeds（相邻 F 优先）/generateIepRecommendations（三级，可测量句式）/buildProfileView（完成度百分比，非百分位）/validateCpep3Report（G1-G8）/buildCpep3Report 快照组装（校验失败抛错不落库）。
- **报告快照**：`cpep3_assess` 新增 `report_snapshot/report_version/scoring_version` 三列（建表已含 + `ensureCpep3ReportColumns` 幂等补列）；persist 时冻结，报告页快照优先、旧行降级只读重算并提示。
- **报告页重构**（任务书 §十七 14 段结构）：基本信息/评估说明/整体概况/能区明细（含「当前系统未配置该指标的标准化常模换算数据。」）/发展剖面（echarts 柱状，标注完成度≠百分位）/适应不良行为观察（单独卡，方向审计核实语）/照顾者报告占位（明示未配置）/相对优势/Emerging Skills/需要支持的技能/IEP 优先+次级/家庭泛化/说明与限制/逐题明细；家长档位文案 F→「未表现」。
- **测试**：新 `tests/cpep3-report-engine.test.ts`（Test1-6 + G1-G8 + IEP 边界 + 快照版本，15 组）；`tests/cpep3-scoring.test.ts` 7 段同步 2/1/0；verifier 9a-9c 新增快照列断言；相关消费方测试（adapter 13 场景 / report-center / profile / entry-dynamicization 11 项 / scale-catalog）全绿。

## 6. 风险与边界

- E=0 计分口径若日后需改为 0.5 或查表插值，涉及 pg/gn 常模重制——本次以「萌发技能数单独展示」缓解，教师可自行加权判读
- 截断的 37 条评分描述影响施测时教师读到的评分标准完整性——转换清单输出后建议对照纸质手册人工补录（可后续 patch，不阻塞）
- `ageRange` 上限外的儿童施测：不拦截、出警示（§2），由专业使用者判断适用性
