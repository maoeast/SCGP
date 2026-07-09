# 评估→IEP→器材推荐→训练计划 四者联动（推荐引擎叠加）

> 落库日期：2026-07-09
> 状态：计划已批准，待执行（Phase 1 起步）
> 来源：`C:\Users\maoea\.claude\plans\cosmic-forging-puffin.md`（权威原稿）

## Context

SCGP 当前评估、IEP/训练计划、器材资源三个子系统数据底座已就绪，但彼此**零数据流**：
- 评估结束只跳报告页，`ScoreResult.dimensions` 和 4 个富信息量表的 `iep_targets`/`domain_feedback`/`iep_interventions` 写完后**只用于展示，从不喂给计划**。
- `sys_training_plan` 100% 手工建，`PlanList.vue` 的"今日训练推荐"只是命名误导（列已挂载资源，无推荐引擎）。
- 评估侧 12 量表各有自己的 dimensions，**无跨量表统一"障碍领域"本体**，也不给学生打领域标签；评估维度 ↔ 器材域/ability_tags **完全未对齐**。

目标：叠加一个推荐引擎，打通 `评估结果 → 障碍领域标签 → 器材推荐（受授权能力包约束）→ 训练计划`，让老师评估完一眼看到该用哪些器材，并可一键生成训练计划草稿。全部新增在 `src/features/recommendation/`，不动既有业务逻辑。

## 已锁定决策

1. **匹配粒度**：混合 — 障碍领域→训练域粗筛（category）+ 领域→能力标签关键词 OR 命中打分排序。
2. **量表覆盖**：全部 12 个量表建维度→障碍领域映射。
3. **计划生成**：推荐面板（透明、可增删、含命中理由+entitlement 可见）+ 一键生成 `status=draft` 计划，跳 PlanList 审阅激活。
4. **entitlement 硬过滤**：7 个授权能力包独立过滤。每件器材按 domain/旧感官 category 映射到**唯一** entitlement，要求 `hasEntitlementAccess(entitlement)` 为真。**不可用**模块级 `canAccessModuleByEntitlements`（太粗：sensory 模块含 sensory_integration+fine_motor，会误放精细动作）。
5. **障碍领域标签**：MVP 瞬态计算（每次评估现算、嵌入计划目标），不新建学生能力画像持久化表（留作后续）。

## 关键复用点（不新造）

| 用途 | 复用 | 位置 |
|---|---|---|
| 输入契约 | `ScoreResult` / `DimensionScore`（`severity:'warning'\|'danger'` = 弱势信号） | `src/types/assessment.ts:170,220` |
| 富信息输入 | `extraData.domainFeedback` / `.iepInterventions` / `.iepTargets` | `Cnbsr2016Driver.ts:270,281,839`（+gmfm_88/tgmd_3/fine_motor 同构） |
| 授权事实来源 | `authStore.effectiveEntitlements` / `hasEntitlementAccess(code)` | `src/stores/auth.ts:74,89` |
| 器材查询 | `ResourceAPI.getResources({resourceType:'equipment',tags,category})`（tags 是 AND，需自写 OR 打分）+ `getAbilityTags()` | `src/database/resource-api.ts:82,375` |
| 计划落库 | `PlanAPI.createPlan` + `batchAddResources`（接受 frequency/duration/notes） | `src/database/plan-api.ts:121,461` |
| 计划↔器材 | `sys_plan_resource_map.resource_id` → `sys_training_resource.id` | `init.ts:904-916` |
| domain→module | `DOMAIN_MODULE_MAP` | `physical-equipment-parser.ts:48-55` |

## 新增文件结构（`src/features/recommendation/`）

```
src/features/recommendation/
├── types.ts                      # RecommendationInput/Result, WeakDomain, RecommendedEquipment
├── ability-taxonomy.ts           # 统一障碍领域本体（7 个器材可覆盖域）
├── scale-dimension-mapping.ts    # 12 量表 dimension.code/name → 统一领域（核心映射表）
├── equipment-entitlement.ts      # 器材 domain/旧感官 category → entitlement 解析
├── domain-tag-keywords.ts        # 统一领域 → ability_tag 关键词（打分层）
├── recommendation-engine.ts      # 评估结果→弱势领域→粗筛+entitlement+打分器材
├── plan-generator.ts             # 推荐结果+选中器材 → CreatePlanParams + 资源挂载
└── components/
    └── RecommendationDrawer.vue  # 推荐面板（弱势领域+器材清单+理由+一键生成草稿）
src/stores/recommendation.ts      # 轻量 store：generate/createDraftPlan + loading/result 状态
```

## 统一障碍领域本体（`ability-taxonomy.ts`）

对齐 7 个 entitlement（器材可覆盖域），评估维度映射到最近域；无配套器材的域（大运动/纯语言）标记 `equipmentSupported:false`，面板显示"暂无配套器材"：

| 统一领域 | 名称 | 映射到的 entitlement | 器材域 |
|---|---|---|---|
| `cognitive` | 认知 | cognitive | cognitive |
| `language` | 语言 | (无独立包→归 cognitive) | cognitive |
| `gross_motor` | 大运动 | (无器材包) | — |
| `fine_motor` | 精细动作 | fine_motor | fine-motor |
| `social` | 社交 | social_communication | social-communication |
| `emotional` | 情绪行为 | emotional | emotional-regulation |
| `sensory_integration` | 感觉统合 | sensory_integration | 旧 7 感官 category |
| `life_skills` | 生活自理 | life_skills | daily-living |
| `soothing` | 安抚调节 | soothing_aids | soothing-aids |

> 注：`emotional` 弱势维度中若含"自我调节/安坐/情绪降温"类信号，额外推 `soothing_aids` 包器材（独立授权，需单独 hasEntitlementAccess）。

## 核心映射表（`scale-dimension-mapping.ts`，12 量表）

结构：`Record<scaleCode, Record<dimensionCode, UnifiedDomain>>`（部分量表用 name 兜底）。代表样例（实现时按各 Driver `dimensions`/常模定义补全）：

- **cnbsr2016**：gm→gross_motor, fm→fine_motor, ad→life_skills, la→cognitive, sb→social
- **CSIRS**：vestibular/tactile/proprioception→sensory_integration, learning→cognitive, executive→cognitive
- **SDQ**：emotional/conduct→emotional, hyperactivity→emotional(+soothing), peer/prosocial→social
- **SRS2**：awareness/cognition/communication/motivation→social, repetitive→emotional
- **Conners PSQ/TRS**：conduct→emotional, learning→cognitive, hyperactivity/inattention→emotional(+soothing), psychosomatic→emotional
- **CBCL**：social→social, behavior→emotional
- **SM**：交往/集体活动→social, 作业→cognitive, 运动能力→gross_motor, 独立生活→life_skills, 自我管理→emotional
- **WeeFIM**：运动功能→fine_motor(+gross_motor), 认知功能→cognitive
- **fine_motor / gmfm_88 / tgmd_3**：→fine_motor / gross_motor / gross_motor

实现必带：jiti 一次性断言脚本（照认知接入先例），加载每个 Driver 的 `dimensions`，断言**每个 dimension 都有映射、无遗漏**，跑完即删。

## 推荐引擎算法（`recommendation-engine.ts`，纯函数）

输入：`{ scaleCode, studentId, dimensions, extraData?, assessmentId? }` + `effectiveEntitlements`（store 注入）。

1. **提取弱势领域**：取 `severity==='warning'||'danger'` 的 dimension（兜底：`percentile<阈值` 或 levelCode 异常）；按 `scale-dimension-mapping` 映射到统一领域，同域取最高 severity 聚合。富信息量表叠加 `extraData.domainFeedback` 的领域级 severity 与 `iepTargets` 聚合强化。产出 `WeakDomain[]`。
2. **粗筛器材池**：每个弱势领域→器材训练域，`ResourceAPI.getResources({resourceType:'equipment', category:域})`；感觉统合域另取旧 7 感官 category 集合。
3. **entitlement 预筛**：`equipment.filter(r => hasEntitlementAccess(resolveEquipmentEntitlement(r)))`。这一步硬卡 7 包。
4. **标签打分排序**：每件候选 `score = 命中 domain-tag-keywords ∩ resource.tags 的数量`（OR，按命中数；可按弱势 severity 加权）。域内降序，取 top-N（默认每域 8）。
5. **产出**：`RecommendedEquipment[]`（resource / matchedTags 作为命中理由 / score / domain / entitlement 名）。无器材域标记 `equipmentSupported:false`。

## 计划生成器（`plan-generator.ts`）

输入：`RecommendationResult` + 面板内教师增删后的选中器材。
- `name`：`{学生名}-{量表名}评估推荐计划-{date}`
- `module_code`：主弱势领域对应 module，否则 `'all'`
- `long_term_goals`：弱势领域名 + 富信息量表 `iepInterventions.intervention.long`
- `short_term_goals`：弱势领域 + `iepTargets`（题目级未通过项聚合）+ `iepInterventions.intervention.short`
- `status:'draft'`，`source:'assessment'`，`source_assessment_id:<id>`
- 资源：`PlanAPI.createPlan(...)` → `batchAddResources(planId, selected.map(r=>({resource_id, frequency:3, duration_minutes:15, notes})))`
- 错误处理：createPlan/batchAddResources 均 try/catch，失败回显。

## Schema 改动（唯一一处，加列迁移）

`sys_training_plan` 加 `source TEXT` + `source_assessment_id INTEGER`（均 nullable），记录"由评估生成"。用既有表重建 idiom（照 `migrateTeachingMaterialCognitiveConstraint`：`tableSqlContains` 守卫 + PRAGMA foreign_keys 开关 + 显式列拷贝 + rename back），`init.ts` 内新增 `migrateTrainingPlanSourceColumns`，老库与新库（CREATE TABLE 同步加列）都覆盖。PlanList 详情读 `source` 显示"由评估生成"徽标并回链评估报告。

## UI 接入

- **`RecommendationDrawer.vue`**：弱势领域卡（含 severity）+ 推荐器材列表（缩略图/名称/命中标签/entitlement 徽标/勾选）+ "生成训练计划(草稿)"按钮。空态：无配套器材域提示。
- **入口**：各量表 `Report.vue` 加"器材推荐 / 生成训练计划"按钮（优先复用共享报告头组件，若有则一处接入；否则 12 个 Report.vue 各加一行按钮+import，纯叠加）。输入直接用 Report.vue 已在内存的 dimensions/scoreResult，不重载。
- **PlanList.vue**：详情抽屉读 `source`/`source_assessment_id`，显示"由 XX 评估生成"徽标 + "查看评估报告"回链。
- **store**：`useRecommendationStore` — `generate(input)` / `createDraftPlan(selection)` + loading/result 状态。

## 分阶段实施顺序

1. **Foundation**：`ability-taxonomy.ts`、`equipment-entitlement.ts`（复用 hasEntitlementAccess）、`domain-tag-keywords.ts`、`types.ts`。type-check。
2. **映射表**：`scale-dimension-mapping.ts`（12 量表）+ jiti 断言脚本（全 dimension 有映射）。跑完删脚本。
3. **引擎**：`recommendation-engine.ts`（纯函数）。type-check。
4. **计划生成器 + Schema**：`plan-generator.ts` + `migrateTrainingPlanSourceColumns`（init.ts）+ CREATE TABLE 加列。type-check。
5. **UI**：`RecommendationDrawer.vue` + store + Report.vue 入口 + PlanList 徽标。
6. **验证**（见下）。

## 验证

- `npm run type-check` exit 0（每阶段后跑）。
- jiti 一次性断言：12 量表所有 dimension 均有领域映射、无遗漏（脚本跑完即删，照 IEP/认知接入先例）。
- 真机 `npm run electron:dev` E2E：
  1. 跑一次 cnbsr2016（或 CSIRS）评估到报告页 → 点"器材推荐" → 面板显示弱势领域 + 推荐器材（含命中标签理由）。
  2. entitlement 过滤：dev-mock 全授权下 7 包器材可见；手动构造受限授权验证只出已开通包器材（至少抽查 cognitive/emotional/fine_motor 三个独立包不串）。
  3. 增删器材 → "生成训练计划(草稿)" → PlanList 出现新 draft 计划，挂载选中器材、长短期目标来自弱势领域/iep_targets、带"由评估生成"徽标。
  4. 回链：PlanList 徽标点击能跳回评估报告。
- 不声称完成直到真机 E2E 通过。

## 风险与边界

- **CBCL/Conners 等量表**维度偏临床行为，映射到器材语义弱 → 这些量表推荐可能稀疏或"暂无配套器材"，属预期，面板正常空态处理。
- **ability_tags 自由文本**：打分用子串/等值匹配，跨域同名词（如"手眼协调"）可能误配 → 由粗筛先域内收窄，打分只在正确域内排序，风险可控。
- **大运动/纯语言**无器材包 → 标记 `equipmentSupported:false`，面板提示，不阻塞链路。
- **报告页接入**：若无共享报告头，需触 12 个 Report.vue（每个加按钮+import，纯叠加，不改正文逻辑）。
- 零原生依赖：全程不引入 sharp 等原生运行时依赖。

## 执行规则（追加）

- 纯叠加：新逻辑放 `src/features/recommendation/`，不改既有业务逻辑。复用 ScoreResult/effectiveEntitlements/ResourceAPI/PlanAPI。
- 零原生依赖：不引入 sharp/sqlite3 等原生运行时依赖。
- 每阶段后跑 `npm run type-check`，exit 0 才进下一阶段。
- Phase 2 必带 jiti 一次性断言脚本：createJiti(alias @→src) 加载每个 Driver 的 dimensions，断言每个 dimension 都有领域映射、无遗漏，跑完即删。
- 唯一 schema 改动：`sys_training_plan` 加 `source TEXT` + `source_assessment_id INTEGER` 两列，用表重建 idiom 迁移，新库 CREATE TABLE 同步加列。
- 异步/IPC/DB/资源操作必须有明确错误处理（try/catch + 回显）。
- 不声称完成直到真机 `npm run electron:dev` E2E 通过。
