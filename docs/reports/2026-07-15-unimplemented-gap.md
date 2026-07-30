# 2026-07-15 SCGP 未实现项盘点与推进路线（Living Backlog）

> **文档类型**：差距盘点 + 推进 backlog（随推进回填状态）
> **基线**：`2026-03-13-scgp-prd-gap-analysis.md`（PRD 差距）+ `2026-07-07-scgp-spec-gap-remediation.md`（规格缺口）+ 当前代码主线 + `AGENTS.md` §3
> **日期**：2026-07-15（最后核实：2026-07-30）
> **目的**：把「PRD 承诺 vs 当前实现」的未完成项固化成可推进 backlog，避免把目标态误记为现状；每项推进时回填「状态」字段。

## 1. 总判断

业务功能主链已大幅铺开（评估 15 量表、~52 游戏含认知 10 个、IEP 闭环、推荐引擎、首页/导出/分类均已落地），缺的不是「功能」，而是 `AGENTS.md` §3 点名的「平台底座收口债」——注册表驱动路由（模块已全注册但路由仍是静态表）、Worker 主链、资源孤儿 GC。

一句话洞察：**entitlement 有 7 包、训练入口有 7 个、`ModuleRegistry` 已注册全部 6 个模块、认知 10 游戏全部交付（P0+P1+P2+IEP 闭环）**——但路由仍是静态表，模块注册表尚未成为导航与路由的驱动源。

## 2. 盘点方法与证据来源

- **代码盘点**：逐域扫 `src/`（评估驱动注册表、训练入口、游戏注册、`ModuleRegistry`、DB schema、路由、资源模型、entitlement、Worker）。
- **实施轨迹**：`git log` 关键词命中（验证「做了 / 没做」）。
- **规则源确认**：`AGENTS.md` §3「架构事实」+「当前优先技术债」。
- 优先级冲突时：当前代码 > `.continue-here.md` > `AGENTS.md` > 本文档。

## 3. A. 平台底座技术债（硬未完成）

| ID | 缺口 | 当前状态 | 依据 | 推进状态 |
|----|------|----------|------|----------|
| A1 | DB Worker 主链未接入 | 文件齐全（`db.worker.ts`/`db-bridge.ts`/`command-queue.ts`）但只在 dev 工具触发，生产仍**主线程跑 SQL.js** | `sqljs-loader.ts` 无 worker 引用；AGENTS §3 | ⬜ 未开始 |
| A2 | Image Worker 不存在 | 运行时无图像 Worker，图像处理走构建期脚本 | `src/workers/` 无 image worker | ⬜ 未开始 |
| A3 | 备份/恢复未覆盖全 schema | **已闭环**（2026-04-03 `8eb7e6e`）：`backup.ts` 动态全表枚举 `sqlite_master` + 排除 `_new` 临时表 + 班级链重算 + 外键校验；资源**物理文件**未含（属 A4） | gap 报告/AGENTS §3 **已过时** | ✅ 已闭环 |
| A4 | 资源文件生命周期未收口 | **Phase 1 已完成**：删/替即清物理文件（`hardDeleteResource`/`updateResource` 钩入 + 跨表引用计数）+ 托管路径工具 `resource-file-refs.ts`/`resource-file-service.ts` + AI 生图整体移除（链路 D 从根消除）+ 删 link A 死代码（`ResourceUpload.vue`/`SAVE_ASSET` IPC）。**Phase 2 代码完成**（2026-07-15）：备份纳入物理文件 zip 归档 v2.0→3.0 —— `crypto.ts` 加 `encryptBytes`/`decryptBytes`/`md5Bytes`（纯 crypto-js）+ fflate zip IPC（`pack-resource-archive`/`unpack-resource-archive`/`walk-dir`）+ `backup.ts` exportData/importData 资源归档（2.0/1.0 降级兼容）；type-check ✅ + crypto round-trip 单测 ✅ + fflate round-trip ✅，真机待验。Phase 3（孤儿 GC）待续 | 计划 `docs/plans/2026-07-15-a4-resource-file-lifecycle-plan.md` | 🔄 Phase1+2 代码完成待真机 |
| A5 | 注册表动态路由未完成 | **已修正**（C09，2026-07-19）：`ModuleRegistry` 已注册全部 6 模块（SENSORY/EMOTIONAL/SOCIAL/COGNITIVE/LIFE_SKILLS/RESOURCE），一致性测试锁定。但路由仍是 `router/index.ts` 静态表，模块注册表尚未驱动导航与路由装配 | `module-registry.ts:364-479`；`module-registry-consistency.test.mjs` | 🔄 模块已注册，动态路由仍缺 |
| A6 | 资源收藏查询未实现 | **已闭环**：查询激活 + `toggleFavorite`/`getFavoriteResourceIds` + ResourceSelector 星标/「仅看收藏」；type-check ✅，真机待验 | grep 命中 | 🔄 代码完成待真机 |
| A7 | 命名残留旧阶段名 | **部分修正**（C11，2026-07-18）：About 文案已统一为「SCGP / 星愿能力发展平台」、`better-sqlite3` 已移除。migration 注释/`module-registry.ts` 等文件仍有 `SIC-ADS` 头注释残留（共约 10 处） | AGENTS §3 技术债 | 🔄 用户可见已修，注释残留 |
| A8 | dev/迁移工具仍混在主路由树 | 已用 `devOnlyRouteNames` 生产屏蔽，但仍挂在路由表内（未收敛到独立开关） | `router/index.ts:143-154`；AGENTS §3 | ⬜ 未开始 |

## 4. B. 业务功能缺口

| ID | 缺口 | 当前状态 | 依据 | 推进状态 |
|----|------|----------|------|----------|
| B1 | 认知模块训练侧全部完成 ✅ | **10 游戏全部交付**：P0(K01/K03/K04/K05)、P1(K02/K09/K10)、P2(K06/K07/K08)。K 前缀 IEP 报告消费端已闭环（`35f8a07`：IEPReport K 分支 + iep-generator generateCognitiveReport + normalizer K01-K10） | `custom-game-registry.ts`；PRD `docs/planning/2026-07-19-cognitive-games-prd.md` | ✅ P0+P1+P2+IEP 全闭环 |
| B2 | 社交模块 registry 声明过期 | **已闭环**（`cb73017`）：SOCIAL status→active，features→active + training_records | `module-registry.ts:383-408` | ✅ 已闭环 |
| B3 | 生活技能模块已注册 | **已闭环**（C09）：`life_skills` 已进 ModuleRegistry、status `active`，含 games/equipment/training_records 三个 feature | `module-registry.ts:437-469` | ✅ 已闭环 |
| B4 | IEP 策略机制已退役 | **已退役**（C10）：IEP 策略接口整条删除 | `grep IEPStrategy src` → 0 | 🗑️ 已退役 |
| B5 | 完整多模块平台 | 模块全部注册（C09），认知 10 游戏 + IEP 已闭环。路由仍是静态表（A5），认知 registry 声明已同步 | AGENTS §3 | 🔄 仅缺 A5 动态路由 |

## 5. C. 内容完成度（功能在，内容是 DRAFT）

| ID | 缺口 | 当前状态 | 依据 |
|----|------|----------|------|
| C1 | BRIEF / CognitiveSelf 仍 DRAFT | scaleName 标「自编 DRAFT」，题目与常模为草稿。**CRT 已完整接入瑞文 60 题 + 授权图片 + crt-norms 常模 + IQ 计算，非 DRAFT** | `*Driver.ts` |
| C2 | FineMotor / GMFM-88 无外部常模 | 其余 4 量表（CSIRS/SDQ/TGMD-3/CNBSR2016）均有常模（T分/阈值/上海常模/DQ） | 评估数据目录 |
| C3 | raven60 已接入 ✅ | CRT 使用 `resource://images/raven60` 授权图片，60 题全，IQ 输出 | `CRTDriver.ts:190` |

> C 类多为**非纯代码任务**（需专业心理测量审核 + 本地常模采集），与代码推进解耦，单独排。

## 6. ✅ 已闭环澄清（避免误报为未做）

`2026-07-07-scgp-spec-gap-remediation.md` 的 5 项规格缺口**已全部实现并超预期**：

| 项 | 提交 |
|----|------|
| E 训练计划说明 UI | `ef1bdac` |
| B 训练记录导出 Excel | `a0ffc27` |
| C 教学资料音频/压缩包分类 | `aa7e892` |
| A 首页 3 项（已完成计划数/最近学生/7 天趋势） | `8446a5b` |
| D 社交游戏 IEP 闭环 | `f653284` → 扩展 Tier2/3（`974a69b`）+ 推荐引擎联动（`81c5913`） |

另：3 月 gap 报告的 **3.2 评估选择页硬编码**已解决——`AssessmentSelect.vue`/`SelectStudent.vue` 已 import `assessment-scale-catalog` 配置驱动。

2026-07-18/19 批次闭环（C09–C11 + 评估入口动态化）：

| 项 | 提交/依据 |
|----|------|
| C09 ModuleRegistry 6 模块全注册 | `module-registry.ts:364-479`；`module-registry-consistency.test.mjs` |
| C10 IEP 策略机制退役 | `PROJECT_CONTEXT §84`；`grep IEPStrategy src` → 0 |
| C11 旧命名清理 + `better-sqlite3` 移除 | `PROJECT_CONTEXT §85` |
| 评估入口动态化（catalog 单一真源，15 量表报告路由生成化） | `PROJECT_CONTEXT §88-89` |
| 报告中心 catalog 驱动（认知三量表自动覆盖） | `Reports.vue:249-255`；`assessment-report-center-catalog.test.mjs` |
| entitlement 测试修正（cognitive `active`） | `tests/entitlement-catalog.test.ts:31` |
| 认知 P0 四游戏（K01/K03/K04/K05） | `custom-game-registry.ts:885-1013`；`PROJECT_CONTEXT §90-91` |

## 7. 推进路线与优先级

**P1（内容交付，直接改善用户体验）**
- 认知 P1 游戏（K02 少了什么、K09 序列复现、K10 因果排序）：复用已有底座（cognitive-games-api + GameContainer dispatch + registry/Page/router），每个游戏只需加 registry 条目 + Game 组件 + Page + 路由。**DoD**：type-check + build:web + 实机 UAT。
- B2 社交模块 registry 声明更新：将 SOCIAL 模块 status 从 `experimental` → `active`，features 去 `coming_soon`——纯配置修正，面小、直接改善用户导航体验。

**P2（平台化收口，跨文件大改，必须先计划）**
- A5 动态路由：将模块注册表变为导航与路由的驱动源（当前模块已全注册，但路由仍是静态表）。
- B1 认知 P2 游戏（K06/K07/K08）+ K 前缀 IEP 报告消费端。

**P3（性能优化，非阻断，确认有瓶颈再上）**
- A1 DB Worker 主链接入、A2 Image Worker。

**顺手项（在相关改动时顺带，不单列专题）**
- A7 命名清理（migration 注释 SIC-ADS 残留）、A8 devtools 路由树排除。

**验收项（代码完成，需真机演练）**
- A4 Phase 3 孤儿 GC、A6 资源收藏真机验、R2 资源备份恢复 E2E、R3 AI 隐私收口。

**内容项（单独排，需专业资源）**
- C1/C2 量表常模与题库、C3 raven60 接入。

## 8. 推进约定

- 每项：读现状 → 给方案 → 实施 → `npm run type-check` → 回填本文档「推进状态」→ 独立 conventional commit。
- 每项状态记号：⬜ 未开始 / 🔄 进行中 / ✅ 已完成 / ⏸️ 阻塞。
- 完成项保留行（不删），便于追溯；状态改 ✅ 并补提交号。
