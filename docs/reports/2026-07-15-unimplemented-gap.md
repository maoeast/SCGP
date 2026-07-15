# 2026-07-15 SCGP 未实现项盘点与推进路线（Living Backlog）

> **文档类型**：差距盘点 + 推进 backlog（随推进回填状态）
> **基线**：`2026-03-13-scgp-prd-gap-analysis.md`（PRD 差距）+ `2026-07-07-scgp-spec-gap-remediation.md`（规格缺口）+ 当前代码主线 + `AGENTS.md` §3
> **日期**：2026-07-15
> **目的**：把「PRD 承诺 vs 当前实现」的未完成项固化成可推进 backlog，避免把目标态误记为现状；每项推进时回填「状态」字段。

## 1. 总判断

业务功能主链已大幅铺开（评估 15 量表、~38 游戏、IEP 闭环、推荐引擎、首页/导出/分类均已落地），缺的不是「功能」，而是 `AGENTS.md` §3 点名的「平台底座收口债」——注册表驱动、备份覆盖、资源生命周期、Worker 主链——外加认知/生活技能的「训练侧」空白与量表内容完成度。

一句话洞察：**entitlement 有 7 包、训练入口有 7 个、功能已铺到 cognitive/life_skills，但 `ModuleRegistry` 只注册 3 个模块**——功能是「散装」接的，注册表这个平台化收口没做完。

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
| A4 | 资源文件生命周期未收口 | `resource://` 可用，但物理文件新增/替换/删除/清理无统一主链，易出孤儿文件 | AGENTS §3 技术债 | 🔄 计划就绪（`docs/plans/2026-07-15-a4-resource-file-lifecycle-plan.md`，Phase1+2+3） |
| A5 | 注册表动态路由未完成 | 路由仍是 `router/index.ts` 静态表；`ModuleRegistry` 只注册 **3 模块**（sensory/emotional/social），cognitive/life_skills/resource 未注册 | `module-registry.ts:364-454`；AGENTS §3 | ⬜ 未开始 |
| A6 | 资源收藏查询未实现 | **已闭环**：查询激活 + `toggleFavorite`/`getFavoriteResourceIds` + ResourceSelector 星标/「仅看收藏」；type-check ✅，真机待验 | grep 命中 | 🔄 代码完成待真机 |
| A7 | 命名残留旧阶段名 | 代码默认值/缓存 key/备份 metadata 仍有旧名 | AGENTS §3 技术债 | ⬜ 未开始 |
| A8 | dev/迁移工具仍混在主路由树 | 已用 `devOnlyRouteNames` 生产屏蔽，但仍挂在路由表内（未收敛到独立开关） | `router/index.ts:143-154`；AGENTS §3 | ⬜ 未开始 |

## 4. B. 业务功能缺口

| ID | 缺口 | 当前状态 | 依据 | 推进状态 |
|----|------|----------|------|----------|
| B1 | 认知模块只有「评估」没有「训练」 | `cognitive` 训练入口 **0 游戏**，仅 BRIEF/CRT/CognitiveSelf 三量表；模块未注册 | `training-entry.ts`；`module-registry.ts` | ⬜ 未开始 |
| B2 | 社交模块首页是占位 | 社交**游戏**（S01–S06）+ IEP 闭环已打通（`f653284`），但模块 = `experimental`，对话/社交故事 `coming_soon` 桩 | `module-registry.ts:427-451` | ⬜ 未开始 |
| B3 | 生活技能模块未注册 | 有 5 游戏 + `self-care-task-seed` + IEP 扩展，但 `life_skills` 未进 ModuleRegistry | `module-registry.ts` | ⬜ 未开始 |
| B4 | IEP 策略零注册 | ModuleRegistry 有 IEP 策略接口，无策略被注册调用 | `module-registry.ts` | ⬜ 未开始 |
| B5 | 完整多模块平台 | A5 + B1/B3 同一根因 | AGENTS §3 | ⬜ 未开始 |

## 5. C. 内容完成度（功能在，内容是 DRAFT）

| ID | 缺口 | 当前状态 | 依据 |
|----|------|----------|------|
| C1 | 认知三量表 DRAFT | BRIEF/CRT/CognitiveSelf scaleName 标「自编 DRAFT」，CRT 仅 7 示例题、CognitiveSelf 12 题；常模占位 | `*Driver.ts`；`.continue-here.md` Blockers |
| C2 | 6 量表无独立常模 | csirs/sdq/fine_motor/gmfm_88/tgmd_3/cnbsr2016 仅 questions/data | 评估数据目录 |
| C3 | raven60 未接入 | 420 张瑞文图已授权，仅本地保留（.gitignore） | `.gitignore` line 58 |

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

## 7. 推进路线与优先级

**P1（小、低风险、解锁体验/数据安全，先做）**
- A6 资源收藏查询：表已建，补查询 + 收藏入口/筛选交互。**DoD**：资源中心可收藏、可按收藏筛选、`resource-api.ts` TODO 消除。
- A3 备份/恢复 schema 覆盖：补齐 `sys_*` + 班级扩展表。**DoD**：备份→清库→恢复后，资源/标签/班级数据完整回。

**P2（平台化关键收口，跨文件大改，必须先计划）**
- A5 注册表驱动路由 + B1/B3（认知/生活技能模块注册与训练侧补全）。这是从「过渡版本」到「平台正式版」的核心，但工作量大、风险高，单列专题计划，必要时隔离 worktree。
- B2 社交模块首页、B4 IEP 策略注册随 A5 一并收。

**P3（性能优化，非阻断，确认有瓶颈再上）**
- A1 DB Worker 主链接入、A2 Image Worker。

**顺手项（在相关改动时顺带，不单列专题）**
- A7 命名清理、A8 devtools 收敛。

**内容项（单独排，需专业资源）**
- C1/C2 量表常模与题库、C3 raven60 接入。

## 8. 推进约定

- 每项：读现状 → 给方案 → 实施 → `npm run type-check` → 回填本文档「推进状态」→ 独立 conventional commit。
- 每项状态记号：⬜ 未开始 / 🔄 进行中 / ✅ 已完成 / ⏸️ 阻塞。
- 完成项保留行（不删），便于追溯；状态改 ✅ 并补提交号。
