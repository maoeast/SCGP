# 评估入口动态化实施计划（A）+ AGENTS §3 技术债清单校正（D）

> 状态：已调研 + 已批准（中等 scope），待执行。
> 来源：2026-07-19 会话对 AGENTS §3 技术债的只读核实 + Plan mode 设计。
> 执行入口：新会话直接照本文件执行，D 先做（独立），A 按 9 步增量推进。

## Context（为什么做）

对 AGENTS §3「当前优先技术债」6 条做只读核实，结论：**6 条里 3 条已闭环/收口/隔离，只是 §3 文案没同步**——备份全 schema（`backup.ts:77-103` 动态全表，v4.0）、资源文件生命周期（Phase1/2/3 全落地）、开发迁移路由隔离（C08 四层 + 契约测试）。继续当活跃债会误导后续会话重做已完成项，违反 AGENTS「不要把目标态当现状」。

剩余 3 条真实欠账里，**评估入口仍硬编码**最重：不是 3 处而是 **7 处并行枚举**——catalog(A) / driverRegistry(B) / report-center catalog(C) / report-route switch(D) / 报告路由表(E,15条) / legacy redirects(F,11条) / student-detail 聚合器(G,12条，**漏 brief/crt/cognitive_self 是真 bug**)。每加一个量表要手改多处且易漏。授权链与作答路由已完全动态（`createAssessmentScaleAccessGuard` + `assessment/unified/:scaleCode/:studentId`），本批次把报告/枚举侧收口到同一真源。

**已定 scope**：中等——catalog 单一真源，B/C/D/E/G 派生 + 修 G bug，不动作答主链、不动 ScaleDriver 接口；**不补报告路由 entitlement 守卫**（单独列债）。

**认知校正**：此前「儿心-II/TGMD-3/GMFM/FMDA 占位」是引 PROJECT_CONTEXT §15 的 2026-04-01 旧状态，已过时。代码事实是 **15 个量表全部完整实现**（含 Report.vue），仅 `brief/crt/cognitive_self` 三个标 DRAFT。

---

## D：AGENTS §3 文案校正（先做，低风险，独立）

**当前 §3 措辞**：
> 当前优先技术债：备份 / 恢复未覆盖全 schema、资源文件生命周期未收口、资源收藏未完成、评估入口仍硬编码、命名残留旧阶段名、开发 / 迁移工具仍混在主路由树。

**核实映射**：

| 条目 | 真实状态 | 处理 |
|---|---|---|
| 备份/恢复未覆盖全 schema | ✅ 已闭环（`backup.ts` 动态全表 v4.0） | 移除 |
| 资源文件生命周期未收口 | ✅ 已收口（Phase1/2/3；遗留 `hardDeleteResource` 无 UI 入口） | 移除 |
| 资源收藏未完成 | 🟡 半成品（训练资源 Tab 未接 UI + 两套并行表） | **保留** |
| 评估入口仍硬编码 | 🔴 仍硬编码（本计划 A 处理） | **保留**（A 完成后再移除） |
| 命名残留旧阶段名 | 🟡 部分清理（产品名口径分叉 + ATS 标题等） | **保留** |
| 开发/迁移工具混入主路由 | ✅ 已隔离（C08 四层 + 契约测试） | 移除 |

**定稿文案**（替换原句）：
> 当前优先技术债：资源收藏未完成（资源中心「训练资源」Tab 未接收藏 UI + `teaching_material_favorite` 与 `sys_favorites` 两套并行表）、评估入口仍硬编码（catalog / driverRegistry / 报告路由多处并行枚举）、命名残留旧阶段名（产品名「训练系统 vs 平台」口径分叉 + `Layout.vue` ATS 折叠标题等 UI 旧名）。
> 已闭环不再列入（细节见 PROJECT_CONTEXT）：备份全 schema（§22，`backup.ts` 动态全表 v4.0）、资源文件生命周期（§61-62，Phase1/2/3 收口）、开发/迁移工具路由隔离（§82，C08 四层隔离 + 契约测试）。

---

## A：评估入口动态化（catalog 单一真源）

### 设计要点
1. **catalog(A) 为唯一真源**：扩字段，承载所有量表枚举事实。
2. **driver 类不进 catalog**：避免把 15 个 driver（含题库/评分/DB 依赖）拖进所有 catalog 消费者 chunk（bundle 回归），并规避 catalog↔driver 循环依赖。driver 侧改用 `satisfies Record<AssessmentScaleCode, new()=>ScaleDriver>` **类型对齐** key 集合（加量表时 TS 报错防漏）。
3. **B/C/D/E/G 五处从 catalog 派生**；F 顺带生成化。
4. **作答主链不动**：`AssessmentContainer.vue` 的 `getDriverByScaleCode`、CBCL 两阶段、cnbsr2016 年龄校验硬分支均不碰（A3 才动）。
5. **SM/WeeFIM 异形保留**：`reportPathParamStyle` 标志位，不改 Report.vue，保外链/书签兼容。
6. **新建 catalog 派生的路由模块**，仿 `selfCareRoutes`/`devRoutes` 构建期 `.map()` 静态展开，不引入运行时 `router.addRoute`（全项目 0 先例）。

### 关键事实（调研已确认）
- 依赖方向：`src/strategies/assessment/**` 不导入 catalog → **catalog→driver 单向安全**，反向成环。
- Report.vue 文件夹统一 kebab-case（`fine-motor/gmfm-88/tgmd-3/cognitive-self`），= `code.replace(/_/g,'-')`。
- urlSlug **不可由 code 机械派生**（`cognitive_self`→`cognitive-self` 特例），必须显式存。
- route name 历史大小写不均（`WeeFIMReport`/`Gmfm88Report`/`CognitiveSelfReport`），必须显式存。
- `isAssessmentReportScaleType`（`report-center-catalog.ts:41-44`）已是 catalog 派生；`PlanList.vue:1389` 是裸 cast（bug 苗子）。
- 5 处 `buildAssessmentReportRoute` 调用：`AssessmentContainer.vue:694` / `Reports.vue:471` / `AssessmentRecordsPanel.vue:116`→`assessment-records.ts:292` / `PlanList.vue:1389`。
- 生产仅 `AssessmentContainer.vue:384` 消费 `getDriverByScaleCode`；`getRegisteredScales/isScaleRegistered/clearDriverCache` 是死代码（本批次不删）。
- jiti 不能模拟 Vite glob → 报告路由用「双导出」结构（records 纯元数据 + components 动态 import）让契约测试可加载。

### catalog 字段扩展（`src/features/assessment/assessment-scale-catalog.ts`）
在 `AssessmentScaleCatalogItem`（:64-80）**追加**（不删旧字段）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `urlSlug` | `string` | 报告 URL 段，**显式存**（`cognitive_self`→`cognitive-self`，其余同 code） |
| `reportRouteName` | `string` | Vue Router name，**显式存**（历史大小写不均） |
| `reportPathParamStyle` | `'params'\|'query'` | sm/weefim=`query`，其余=`params` |
| `reportComponentFolder` | `string` | Report.vue 文件夹（kebab，= `code.replace(/_/g,'-')`） |
| `reportTone` / `reportTagType` | 报告中心 tone/tagType | 吸收 C |
| `reportSelectLabel` / `reportCardLabel` | `string` | 吸收 C |
| `recordsLabel` | `string` | 学生详情简短标签（如「S-M量表」，与 `studentSelectorTag.label` 不同，**新增**） |
| `isDraft` | `boolean` | 结构化 DRAFT（替代 subtitle 文本约定；subtitle 文本保留供 UI） |

`accessModulesAnyOf` 死 fallback **保留**（删属授权链重构单独 scope），仅加注释标明过渡态。

### 五处派生（+F）
- **B** `strategies/assessment/index.ts:32-48`：`driverRegistry` 改 `as const satisfies Record<AssessmentScaleCode, new()=>ScaleDriver>`（保字面量类型，TS 强制 key 全集对齐）。死代码本批次不删。
- **C** `features/assessment/report-center-catalog.ts:14-30`：退化为 `ASSESSMENT_SCALE_CATALOG.map(...)` 派生层；保留 `AssessmentReportTone/TagType` 类型与所有导出函数（`isAssessmentReportScaleType` 等已基于此，自动跟随）。
- **D** `features/assessment/report-routes.ts:24-69`：switch 改为 `getAssessmentScaleCatalogItem(scaleType)` + `urlSlug` + `reportPathParamStyle` 分支；签名/输入类型不变，**5 处调用方零改动**；fallback `/assessment` 保留。
- **E** `router/index.ts:912-1071`：**新建** `features/assessment/assessment-report-routes.ts`，**双导出**结构：
  - `assessmentReportRouteRecords`（纯元数据 path/name/meta，jiti 可加载，供契约测试）
  - `assessmentReportRouteComponents`（`Record<name, () => import(...)>`，Vite 模板字面量动态 import 切 chunk）
  - 合成 `assessmentReportRoutes: RouteRecordRaw[]`
  - `router/index.ts` 删 15 条手写报告路由 + :99-123 的 15 个 const 懒加载，替换为 `...assessmentReportRoutes`；**`CSIRSHistory`（非报告，:942-951）保留原位**。
- **G** `views/student-detail/assessment-records.ts:96-290`：**补 3 个 builder（brief/crt/cognitive_self）修 bug**（先 Grep 确认 persistence 表名）；合并数组改 `ASSESSMENT_SCALE_CATALOG.flatMap`；`scaleLabel` 改用 `recordsLabel`；`AssessmentScaleType`（:19-32）保守保留别名不替换（避免第 7 处枚举蔓延）。
- **F** `router/index.ts:867-910`：legacy redirect 生成化为 15 条（path 用 code，与现有 11 条一致；新增 4 条无副作用，统一指向 `assessment/unified/<code>/:studentId`）。

### 可选顺带项（已采纳推荐默认，执行时可调）
- **`recordsLabel` 新增**：✅（SCALE_LABEL_MAP 简短标签与现有 label 不同，必须新字段）。
- **legacy redirect 生成化**：✅（枚举一致性）。
- **`PlanList.vue:1389` 裸 cast 加 `isAssessmentReportScaleType` 守卫**：✅（5 行，防 DB 脏值路由到 fallback，§7 高风险相邻）。
- **`getDriverAsync` 死代码删除**：❌（单独 PR，避免噪声）。

### 分步实施（每步 type-check；标★跑 build:web）
1. catalog 字段扩展 + 15 条数据填齐（urlSlug/routeName/paramStyle/folder/tone/tagType/labels/isDraft/recordsLabel）
2. D `report-routes.ts` 改 catalog 派生 → 现有 `assessment-report-center-catalog.test.mjs` 必须全绿（urlSlug 黄金样本保 URL 不变）
3. C `report-center-catalog.ts` 退化派生
4. ★ PoC 新建 `assessment-report-routes.ts` 双导出，`build:web` 验 Vite 动态 import 正确切 chunk（**先验证再替换**）
5. ★ E 替换 `router/index.ts` 15 条手写 + 删 15 const + `...assessmentReportRoutes`，保留 CSIRSHistory
6. B `driverRegistry` `satisfies` 对齐
7. G 补 3 builder 修 bug + 合并改 flatMap + scaleLabel 用 recordsLabel
8. ★ F legacy redirect 生成化（移入 `assessment-report-routes.ts`）
9. 契约测试落地

### 契约测试（新增 `scripts/tests/assessment-entry-dynamicization.test.mjs`，7 断言）
1. catalog 字段完备性（15 条都含新字段）
2. `urlSlug` 唯一性 + `cognitive_self→cognitive-self` 特例
3. `reportRouteName` 唯一性 + 与历史名一致（防回归）
4. `Object.keys(driverRegistry)` === `ASSESSMENT_SCALE_CODES`（registry 与 catalog 对齐）
5. `buildAssessmentReportRoute` 黄金样本逐字锁 URL（含 sm/weefim query 形态）
6. G 源覆盖所有 catalog 量表（源码正则匹配 builder，含新补 3 个）
7. 报告路由 name 集合 === catalog `reportRouteName` 集合，且 `CSIRSHistory` 不在内

### 风险点
| 风险 | 缓解 |
|---|---|
| Vite 动态 import 拼接 | 双导出 + step 4 PoC 先验；模板字面量 `${folder}` 而非字符串拼接 |
| urlSlug 错填致外链失效 | 黄金样本测试逐字锁 URL |
| catalog↔driver 循环依赖 | driver 不进 catalog，走 `satisfies` 类型对齐 |
| CSIRSHistory 误卷入报告集合 | step 5 显式保留 + 断言 7 |
| G 新补 builder SQL 表名 | step 7 先 Grep `brief/crt/cognitive_self` persistence 表 |
| selfCareRoutes name 冲突 | 报告路由 name 全保留历史值，无新增冲突 |

### 验证
- 自动：`npm run type-check`（每步）/ `npm run build:web`（step 4/5/8）/ 现有 `node --test scripts/tests/assessment-report-center-catalog.test.mjs`（step 3 后绿）/ 新增 7 断言测试（step 9）/ `scripts/tests/dev-route-production-boundary.test.mjs`（回归不破）
- 人工 smoke：评估入口卡片（7 tab）→ 选 4 代表量表（S-M/WeeFIM/CSIRS/BRIEF）作答落库 → **4 处报告跳转逐一**（完成页/报告中心/学生详情评估记录[重点验 brief/crt/cognitive_self 能展示+跳]/计划徽标）→ `/assessment/sm/report?assessId=X&studentId=Y` query 形态 → legacy redirect `/assessment/csirs/123` → 报告中心 tone/tagType/label 显示

### 关键文件
- `src/features/assessment/assessment-scale-catalog.ts`（A 真源，字段扩展）
- `src/features/assessment/report-routes.ts`（D 派生）
- `src/features/assessment/report-center-catalog.ts`（C 退化派生）
- `src/router/index.ts`（E 替换 + F 生成化）
- `src/views/student-detail/assessment-records.ts`（G 修 bug + 派生）
- `src/strategies/assessment/index.ts`（B satisfies 对齐）
- `src/views/plan/PlanList.vue:1389`（顺带加 type guard）
- 新增：`src/features/assessment/assessment-report-routes.ts`、`scripts/tests/assessment-entry-dynamicization.test.mjs`

---

## 执行边界
- D 先做（独立文档动作）；A 按 9 步增量推进，每步可独立验证。
- 不碰：作答主链 `AssessmentContainer.vue` 硬分支、ScaleDriver 接口、报告路由 entitlement 守卫、死代码批量清理。
- 遵守 AGENTS 禁止清单（不引入原生依赖/新状态库）；不跑 lint/prettier。
- 完成后更新 `.continue-here.md`（Current State / Next Action），PROJECT_CONTEXT 追加新 §记录评估入口动态化闭环 + 报告路由 entitlement 守卫欠账。
