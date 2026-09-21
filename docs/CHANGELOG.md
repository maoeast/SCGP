# CHANGELOG.md

项目功能变更历史记录

---

## [2026-09-21] 首页看板「本周异常预警」口径重做：扫描切到统一训练主表 + 修死规则 + 补信号
- 问题①（漏扫）：旧实现直扫 `training_records` + `emotional_training_session` 两张旧表 → 只写统一主表 `training_session` 的入口（实测 `cognitive_game_inline` 20 条）完全不进扫描；近 7 天另有 217 条 emotional 训练被「排除 emotional」的分支与情绪分支同时漏掉
- 问题②（死规则）：「提示依赖」取 `emotional_training_detail.hint_level` 均值 > 2，而该明细表在演示库 0 行 → 恒不触发（真库近 7 天命中 0 条，面板必然空态）
- 问题③（错误归因）：`equipment_training_records` / `game_emotion_records` 源表没有 `accuracy_rate` 列，统一行里的值是得分率；旧口径若扩到全家族会把 55 条器材行误标为「正确率低于 50%」
- 新增 `src/database/training-anomaly-rules.ts`（纯函数 + 常量，零依赖）：`evaluateTrainingAnomaly()` 判定四类信号——低正确率（仅答对率语义家族白名单）、提示依赖（`hint_count/question_count > 0.5`）、器材高辅助（`promptLevel >= 4`，等级语义取自器材记录页的 1 独立…5 身体辅助）、训练中断（`completion_status ∈ {interrupted,aborted,cancelled}`）
- `src/database/dashboard-api.ts`：`getWeeklyAnomalies` 改为单查 `training_session`（+ 情绪会话 LEFT JOIN + `json_valid/json_extract` 取器材提示层级），SQL 只取数、异常判定交给纯函数；`DashboardAnomalyItem` 字段 `averageHintLevel` → `hintRatio` 并新增 `promptLevel`，`accuracyRate` 仅在答对率家族透出
- `src/views/Dashboard.vue`：异常面板条目可点击进学生详情（Enter/Space）+ 超 4 条时「查看全部」弹窗；元信息按家族显示（正确率 / 平均每题提示 / 提示层级）；共用样式类名 `assessment-insight-*` → `dashboard-insight-*`（两个面板共用）
- 新增 `scripts/tests/dashboard-anomaly-rules.test.mjs`（`test:core:node`，4 条契约）+ `tests/training-anomaly-rules.test.ts`（`test:core:ts`，7 场景）
- 真库只读复算：覆盖对账四张 legacy 表 0 缺失；窗口内 1019 行 → 86 条异常（旧实现 0 条）：器材高辅助 76、提示依赖 10
- 已知取舍：器材高辅助按该群体是常态（186 条器材会话里 76 条 ≥4 档）→ 本轮不动阈值，改为**严重度排序**（`ANOMALY_SEVERITY_RANK`：中断 > 低正确率 > 提示依赖 > 器材高辅助，同级按时间倒序），避免前 4 条全是器材；更聚焦的两条路（阈值升到 5 / 相对基线）记在专题档 §5，未排期
- 明确不做：趋势与基线偏离判定（需独立设计）、器材与情绪游戏的得分率阈值（口径需产品定）、演示数据修订（`session_family` 口径不一致等，属演示包重建）


## [2026-09-21] 首页看板「智能特教助理」面板做实：评估缺口与优先建议（含 18 量表覆盖修复）
- 问题①（覆盖缺口）：面板数据源 `DashboardAPI.getAssessmentAlerts` 的 UNION 只列 8 张量表主表（2026-03-19 写入），此后新增的 ABC/ATEC/PEP-3 等 10 个量表从未同步；真库实测：只在 ABC/ATEC/CRT/认知自我建过基线的学生被误报「尚无评估记录」（43 名学生中 1 例）
- 问题②（名不副实）：原文案「根据真实评估缺口提供优先干预建议」实际只有一条「超过 6 个月未评估」阈值 + 两条模板句，不读任何分数、维度或缺口
- `src/database/assessment-quality-api.ts`：`QUALITY_TABLES` 导出为单一真源（18 张量表主表 = catalog 全量）
- `src/services/assessment-score-adapters.ts`：`ScoreAdapter` 新增 `normalizeRow(row)`（与 `getLongitudinalScores` 同一归一化口径），16 个适配器全部实现（配置式抽 `xxxNormalizeRow`、内联式抽具名函数）——看板与 AI 纵向趋势从此不可能口径漂移
- 新增 `src/services/assessment-gap-analysis.ts`（纯函数、零 DB 依赖）：四条信号 ①明显偏弱/偏弱需关注（按 5 大发展领域聚合各量表最近一次等级，复用画像口径后再按 danger/warning 分级）②评估缺口（缺 ≥3 个领域才算基线明显不完整）③从未评估 ④超期未复评（6 个月）；排序：明显偏弱 > 从未评估 > 偏弱需关注 > 评估缺口 > 超期；建议句由真实量表名 + 日期 + 等级拼装；crt/cognitive_self/cpep_3 只计覆盖不下强弱结论
- `src/services/assessment-profile.ts`：导出 `strengthFromLevel`、新增 `aggregateStrengthFromLevels`（`aggregateDomainStrength` 改为调用它，行为不变）——跨量表画像与首页看板共用同一强弱判定
- `src/database/dashboard-api.ts`：`getAssessmentAlerts` → `getAssessmentInsights`（逐表「每生最新一行」→ `SCORE_ADAPTERS[code].normalizeRow` → 纯函数）；`DashboardSnapshot.assessmentAlerts` → `assessmentInsights`；`overview.pendingAssessmentCount` 与面板同源
- `src/views/Dashboard.vue`：面板渲染依据标签（明显偏弱/偏弱/未评估/尚无评估/超期）+ 建议句；条目可点击进学生详情（键盘 Enter/Space 可达）；超 4 条时新增「查看全部」弹窗列全量；副标题、指标卡 hint、hero 提醒文案改为与实际口径一致
- 溯源与判定同源（评审 H1 修复）：建议句引用的「量表 + 日期 + 等级」必须是触发该判定的那条等级（`resolveDomainSeverity`），不再出现「明显偏弱（某量表 · 等级「正常」）」这类自相矛盾引用（真库复算 0 条）；危险词单独命中即判定明显偏弱，不再被聚合强弱门拦掉
- 边界加固：超期截止点改为「先归一 1 号再减月 + clamp 目标月天数」（避免 JS 日期溢出）；从未评估学生不再重复追加缺口句（与「尚无任何评估记录」重复）
- 新增 `scripts/tests/dashboard-assessment-coverage.test.mjs`（挂 `test:core:node`）：① 覆盖 catalog 全部 18 量表 ② 表清单必须由 `QUALITY_TABLES` 派生、dashboard-api 不得出现裸表名 ③ 每个量表要么注册适配器、要么显式声明仅计覆盖（防静默漏判）④ 表名白名单
- 新增 `tests/assessment-gap-analysis.test.ts`（挂 `test:core:ts`）：10 组断言覆盖四级信号、cpep_3 仅计覆盖、同域多量表溯源归属、危险词单独命中、优先档拆分、优先级次序、无信号学生不入列
- 真库复算（只读，`C:/Users/maoea/AppData/Roaming/scgp/database.sqlite`）：43 名学生 → 43 条待办，其中明显偏弱档 11、偏弱需关注档 32（特教群体「轻度/中度/边缘」是常态，故按严重度分级而不是一刀切）；学生 1 由「误报尚无评估记录」变为「社交沟通 明显偏弱 + 4 个领域未评估」（真实记录 ABC severe / ATEC moderate）
- 已知取舍：本库 43 名学生全部被标为待办（人人有评估缺口或轻度偏弱）→ 指标卡显示 43（总数口径不变）；为让数字有信息量，新增拆分口径：`isPriorityInsight`（明显偏弱 or 尚无评估记录）+ `DashboardOverview.pendingPriorityCount` / `pendingBaselineCount`，面板角标改为「优先 11 · 共 43」、hero 文案带「（其中 11 条需优先处理）」；面板前 4 条为明显偏弱档，全量在「查看全部」中按优先级排序
- 明确不做：器材推荐 / 一键生成计划（`severity` 未落库，推荐引擎无法从历史数据复现）；LLM 参与本面板（未配模型时必须照常工作）


## [2026-09-20] 修复 ABC 报告「维度分数详情」维度分渲染成 JSON、占比 NaN
- 现象：ABC 报告页维度表「得分」列显示 `{"name":"感觉","rawScore":17}`、「占比」列 NaN%（用户 2026-09-20 截图报告）
- 根因①（数据形状）：演示数据把维度分写成对象 `{ name, rawScore }`（真实写入端 `ABCDriver.persistAssessment` 写的是数字 `{ 维度code: 原始分 }`，`init.ts` schema 注释与 `assessment-score-adapters.ts` 同此契约），报告页 `scores[dim.code]` 直接当数字用 → 对象进 `{{ }}` 渲染成 JSON、`对象/数字` 得 NaN；Word 导出与 AI 纵向趋势（`assessment-score-normalize.ts` flat-number 模式）同样受累
- 根因②（满分错误）：报告页硬编码满分 60/48/72/52 实为 GMFM-88 表的值，与 ABC 题库权重真值不符 —— 真值为 感觉 38 / 交往 34 / 躯体运动 52 / 语言 34 = 158（与页面「满分 158」一致；库中真实评估行各维分数恰好顶到 38/34/34 反证）；占比分母被放大，真实评估也算错，「重点关注」判定（阈值 50%）随之中招
- 根因③（虚维度）：演示数据生成题库里没有题目的「生活自理」维度并计入总分，导致表内四维之和 ≠ 报告总分
- `src/database/abc-questions.ts`：新增 `ABC_SUBSCALE_MAX_SCORES`（由题库权重派生，勿手写）、`ABC_TOTAL_MAX_SCORE`、`normalizeABCDimensionScores`（数字直用；历史对象形状取 `rawScore`/`score`；脏数据记 0）
- `src/views/assessment/abc/Report.vue`：满分改题库派生常量、维度分走归一化（历史对象形状兼容 → 已入库旧数据无需重导）、总分满分与 Word `totalMaxScore` 同源（`(满分 158)` 文案同步）；删除未使用的 `getABCLevel` 导入
- `scripts/seed-demo-data/data.mjs`：ABC 维度分改存数字（契约形状）+ 按各维真实满分钳制 + 去除「生活自理」维度及其 `DIAGNOSIS_PROFILES` 偏移；新增导出 `ABC_SUBSCALE_MAXES`
- 新增 `tests/abc-dimension-rows.test.ts`（已接入 `npm run test:core:ts`）：满分派生正确性、两种历史形状归一化、脏数据兜底、占比复算（真实库行）、演示生成器与题库满分一致（防两处漂移）、生成结果为数字/不超满分/总分等于各维之和
- `src/services/assessment-score-normalize.ts`：flat-number 模式新增单值兜底 `toFlatDimensionScore`（数字直用；历史对象形状取 `rawScore`/`score`；无法解析记 `null` 而非 `NaN`）——同根因的 AI 纵向趋势（`get_assessment_trend`）不再把老演示行的维度分显示成缺失
- `tests/assessment-score-adapter.test.ts`：第 12 组补历史对象形状与脏值兜底断言（断言不产 NaN），覆盖清单同步至 13 组
- 新增 `scripts/fix-legacy-abc-dimension-scores.ts`：存量演示行一次性修正（默认 dry-run；`--apply` 前自动备份且要求应用已关闭；幂等，真实评估行不动）；dry-run 实测 18 行扫描 / **15 行待修**（10013：88→71、moderate→mild），真实行（#1/#2/#3）零改动
- 验证：`npm run verify:core` 全绿（type-check 0 error；`test:core:node` 132/132；`test:core:ts` 6/6）；以真实库行复算——学生 1 → 38/34/48/34（100%/100%/92.3%/100%，四维和 = 总分 154）；学生 10013 袁梓睿 → 17/21/15/18（44.7%/61.8%/28.8%/52.9%）
- 存量数据：**已于 2026-09-20 18:25 落库**（应用关闭后 `--apply`：15 行改写、备份 `database.sqlite.bak-20260920102500`；复验 18/18 行「纯数字 + 各维之和 == 总分」，再跑 dry-run = 0 行待修）；脚本时间戳截断已修（毫秒小数点不再混入备份名）；`output/SCGP演示数据包-20260920.zip` 仍是旧数据，重打时用修好的生成器

## [2026-09-20] 手册首页族截图重拍 + 自动刷新文案同步（首页看板重构收尾）
- `docs/user-manual/screenshots/`：重拍 8 张受 `0866c42`（移除页头 + 静默自动刷新 + 主标题品牌色）影响的图——S001/S002/S007/S008/S009/S010/S011/S168；旧图画面中仍带已删除的「首页看板」页头与「刷新数据」按钮，已作废
- 采集：run `dashboard-refresh-20260920`（S001/S007/S168）与 `dashboard-refresh-2-20260920`（S002/S008/S009/S010/S011）；后者为拆分重跑——同会话先采 S007（用户菜单浮层）会把浮层留在后续场景画面里（首批 S008 即被污染）
- 落盘：`promote-user-manual-screenshots.mjs --ids … --allow-formal-output`（重拍前需先删同名旧图：promote 对「同名但哈希不同」会拒绝覆盖）；approvals 8 条 sha256/runId 已更新，全量 217 条校验通过
- `SCGP-星愿能力发展平台用户使用手册.md:143`：「手动刷新当前首页数据」改为自动刷新语义（切回本页立即刷新 + 停留期间每 3 分钟静默更新）

## [2026-09-20] 技术债：verify:core 陈旧契约断言对齐源码语义（含 2 条被短路隐藏的断言）
- `scripts/tests/ai-message-edit-contract.test.mjs`：「生成报告入口位于附件按钮上方」的 `<div class="ai-composer">` 改为 `/<div\s+class="ai-composer"/`（class 现已与 `:class`/`@drag*`/`@paste` 同处一个多行标签）；同测试 `composer-utility-actions` 改为 `ai-composer-tools`——92a22e2（输入区两行布局重构）后旧 class 已不存在，此前被同测试前一条断言短路掩盖
- `scripts/tests/login-theme-background.test.mjs`：
  - 静蓝主色期望 `#4FB3BF` → `#3C9BA6`（3 处，含 `DEFAULT_LOGIN_PRIMARY_COLOR`），对齐 65eee05「静蓝默认主色」变更
  - `valuesForKey` 从「行内第二个单引号串」收紧为「紧跟 key 的那一个值」（兼容 INSERT 元组 `('key', 'value'` 与对象字面量 `key: 'x', value: 'y'` 两种写法）：不再被 `init.ts` 的主色迁移 SQL（`WHERE key = '…' AND value = '#4FB3BF'`）污染出 key 名/旧色假值；`>=4` 数量断言与「4 处默认值一致」语义不变
  - `Login.vue` 背景断言放行 `getLoginBackgroundUrl(...)` 包裹（fb1b683 起登录页经 URL 解析器传值），核心仍是 `activeLoginBackground` 的 image/video 传入背景组件
- `scripts/tests/production-debug-boundary.test.mjs`：`devTools:\s*isDev` 改为 `let devToolsEnabled = isDev` + `pkg.scgpDebugDevtools === true` + `devTools:\s*devToolsEnabled`；`devtools-opened` 断言改为「F12 切换监听整体包在 `devToolsEnabled` 内」——0381d47 已用 webPreferences 层禁用取代运行时自动关闭监听，旧断言此前被同测试前一条断言短路掩盖
- 定性：4 处源码重构（65eee05 主色、fb1b683 背景 URL 解析、0381d47 DevTools 开关、92a22e2 输入区布局）均有独立提交且语义正确，属**断言滞后**而非回归，故一律改测试、未动业务源码
- 验证：`npm run verify:core` 全绿——type-check 0 error；`test:core:node` 132 tests / 132 pass / 0 fail（修前 6 fail）；`test:core:ts` 5/5 passed
- 独立评审加固（advisor 单轮 pass，3 条 🔵 全部采纳）：①「生成报告/附件」顺序断言补存在性前置检查（原 `indexOf` 比较在锚点缺失时返回 -1，断言会空洞通过）；②`Login.vue` 背景断言在仍要求「`getLoginBackgroundUrl(...)` 包裹 + `activeLoginBackground.image/video` 作为实参」的前提下允许接收者表达式变化，避免良性重构误红；③`valuesForKey` 注释补「key 与 value 必须同行」的边界说明

## [2026-09-20] 修复康复训练支持专家头像契约断言（PNG→WebP 兜底）
- `scripts/tests/ai-builtin-agent-presets-contract.test.mjs`：头像断言由「`康复训练支持专家.png` 必须存在」改为「`.png` 或同名 `.webp` 存在其一」
- 背景：该批头像已在 4a6468b（预置图片 PNG→WebP 优化）转为 `.webp`，运行时由 `electron/main.mjs:564-609` 与 `vite.config.ts:47-67` 的 .png→.webp 兜底解析，源码/DB 路径仍写 `.png`；断言未同步，自 4a6468b 起长期红并导致 `npm run verify:core` 无法全绿

## [2026-09-20] 首页看板移除页头 + 静默自动刷新（替代手动刷新）
- `src/views/Dashboard.vue`：删除页头（`首页看板` 标题、副标题、右上「刷新数据」按钮）及随之失效的 `RefreshRight` 图标导入与 `.dashboard-header` 样式，首屏直接是 Hero Banner
- 新增静默自动刷新：`onMounted` 起 3 分钟 `setInterval` 定时刷新，回调内 `document.visibilityState === 'hidden'` 时跳过（开关页不空跑请求）；`visibilitychange` 监听在窗口重新可见时立即刷新
- `loadDashboard({ silent })`：静默模式不触发全屏加载遮罩（否则每 3 分钟闪一次），失败仍只记日志不打扰
- `onUnmounted` 严格清理：`clearInterval` + `removeEventListener`（新引入 `onUnmounted`；已确认布局层无 keep-alive，卸载钩子正常触发）
- 依赖同步：`scripts/manual/capture-user-manual-screenshots.mjs` 登录就绪闸门（`.dashboard-hero` 可见）＋ 5 处 dashboard 断言（S001/S002/S007/prepareDashboard/S012）由「首页看板」文本改为「学生总数」
- `docs/planning/2026-08-16-教师-系统首页看板录制包.md` 标注为**已作废（历史）**：镜头 2/5 依赖已删除的页头与刷新按钮
- Banner 主标题 `您好，{姓名}！` 改用品牌主色 `var(--scgp-primary)`（#5f89d9，字号/字重不变），与下方柔和蓝灰语录拉开视觉层级

## [2026-09-20] 首页看板上半部分重构：上下分层 Hero Banner + 卡片组 + 每日语录
- `src/views/Dashboard.vue` 上半部分放弃左右分栏，改为上下分层：全宽 Hero Banner（白底 surface）+ 下方 5 张数据卡片平铺在页面底色上
- Banner 左：`您好，{登录用户姓名}！`主标题 + 每日暖心语录副标题；右：核心待办提示 + 主行动按钮，两者紧凑横排并保持原有的 `focusPanel` 优先级平滑滚动
- 新增 `src/data/quotes.json`（60 条特教语录）：`currentQuote` 在 `onMounted` 随机抽取一条，每次进入首页刷新
- 欢迎语称呼取 `authStore.user.name`，缺失时按角色兜底（teacher→老师，其余→系统管理员）
- 卡片组仍是真实聚合数据（`DashboardAPI.getSnapshot().overview`），仅栅格改为 `repeat(auto-fit, minmax(200px, 1fr))`
- `.dashboard-hero` 类名保留（用户手册截图脚本 `scripts/manual/capture-user-manual-screenshots.mjs` 按它等待首屏渲染）
- 修复：主行动按钮的 4 个滚动锚点原写成静态点路径 ref（`ref="panelRefs.x.value"`），Vue 运行时只把它登记为 `$refs` 的键、不会写回 `panelRefs`，点击是静默空操作；已改为动态绑定 `:ref="panelRefs.x"`（实测绑定成功）

## [2026-09-11] 资源中心-教学资料列表分页（12 个/页）
- `src/views/resource-center/TeachingMaterials.vue` 教学资料卡片列表从全量渲染改为前端切片分页：每页固定 12 个（用户约定），不再一次渲染全部视频/图片/文档卡片
- 分页栏与训练资源标签同款（`el-pagination`：总数/上下页/页码/跳页）；切维度、切资料类型、搜索、切收藏视图时自动回到第 1 页
- 删除资料或筛选收紧导致当前页越界时自动钳回最后一页，不会停在空页

## [2026-02-27] 最新归档条目（从 PROJECT_CONTEXT.md 迁移）

## [2026-03-27] training-entry hard-cut 收口与 clean DB 验证
- `src/views/equipment/Records.vue` 已改为 entry-aware：
  - 支持 `entry / module / recordId` 路由状态
  - 支持入口切换
  - 支持从训练记录模块按具体记录跳转并高亮定位
- `src/views/training-records/ModuleTrainingRecords.vue`、`GameRecordsPanel.vue`、`EquipmentRecordsPanel.vue` 已继续收口 entry-based 记录详情流
- clean local dev DB 已重建，并在重建库上验证：
  - 游戏记录可写入 `entry_code`
  - 器材记录可写入 `entry_code`
- `src/database/init.ts` 已修正 `equipment_training_records.equipment_id` 的当前 schema/init 口径：
  - 从旧 `equipment_catalog(id)` 回到当前资源主线 `sys_training_resource(id)`
- `src/database/sql-wrapper.ts` 已修复保存状态机问题：
  - 避免保存成功后因错误 dirty 状态再次自触发保存
  - 降低 `database.sqlite.tmp -> database.sqlite` 原子写入竞态导致的 `ENOENT` 风险

## [2026-03-26] physical-equipment CSV 导入方案落地
- 新增 `src/database/physical-equipment-parser.ts` 与 `src/database/physical-equipment-data.ts`
- 当前四份 physical-equipment CSV 草稿已可规范化为 `168` 条系统资源：
  - `45 emotional-regulation`
  - `50 social-communication`
  - `35 fine-motor`
  - `38 soothing-aids`
- `src/database/init.ts` 已支持在数据库启动时补齐缺失的 physical-equipment 系统资源
- 新增 `scripts/import-physical-equipment-resources.cjs` 与 `npm run import:physical-equipment`
- `ResourceSelector`、`TrainingResources`、`PlanList` 已支持按 physical-equipment metadata / `resourceCode` 解析新规则封面图
- 已明确“原始授权 code 层”和“展示大类层”拆分：
  - 许可证原始 `am` 载荷继续承载兼容 code，前端访问控制以解析后的能力包为准
  - 器材训练 / 资源中心新增大类推导：`感官训练 / 情绪调节 / 社交沟通 / 生活自理 / 精细动作 / 安抚教具`

## [2026-03-26] emotional 默认完整 seed 与物理器材目录规范
- emotional 默认资源初始化已从 8 条 demo 切换为完整 `80 emotion_scene + 60 care_scene`
- `src/database/init.ts` 已支持在无训练记录时自动清理旧 `emotional_demo_seed` 并替换为完整 seed
- 新增 `scripts/reset-sensory-equipment-resources.cjs` 与 `npm run reset:sensory-equipment`
- 新增 `docs/references/physical-equipment/` 与 `src/assets/images/physical-equipment/`
- 新物理器材图片与导入建议改用稳定 `resourceCode`，不再推荐继续绑定 `legacy_id`

### [2026-02-24] Phase 4.2 收官 - ConnersPSQDriver + ConnersTRSDriver 实现
- **目标**: 完成评估驱动器架构的最后两块拼图，实现 Conners 1978 版驱动器
- **ConnersPSQDriver 实现** (`src/strategies/assessment/ConnersPSQDriver.ts` ~350行):
  - Conners 父母用问卷驱动器（48题）
  - 6 个维度：品行问题、学习问题、心身障碍、冲动-多动、焦虑、多动指数
  - 4 点评分（0-3分）
  - T 分计算：使用 `conners-norms.ts` 性别×年龄常模
  - 等级判定：基于多动指数 T 分（<60 正常, 60-69 临界, ≥70 临床显著）
- **ConnersTRSDriver 实现** (`src/strategies/assessment/ConnersTRSDriver.ts` ~320行):
  - Conners 教师用问卷驱动器（28题）
  - 4 个维度：品行问题、多动、不注意-被动、多动指数
  - 4 点评分（0-3分）
  - T 分计算：使用 `conners-norms.ts` 性别×年龄常模
  - 学校指导建议生成
- **策略工厂注册**: 注册 'conners-psq' 和 'conners-trs' 驱动器
- **文件修改**:
  - `src/strategies/assessment/ConnersPSQDriver.ts` - 新增（~350行）
  - `src/strategies/assessment/ConnersTRSDriver.ts` - 新增（~320行）
  - 旧评估页面添加 @deprecated 注释

### [2026-02-24] Phase 4.1 BaseDriver + WeeFIMDriver + CSIRSDriver 实现
- **目标**: 完善评估驱动器架构，实现更多量表驱动器
- **BaseDriver 抽象基类** (`src/strategies/assessment/BaseDriver.ts` ~280行):
  - 抽象属性和方法定义
  - 通用实现：getNextQuestion（线性导航）、calculateProgress、getScaleInfo
  - 工具方法：serializeAnswers, calculateTiming, analyzeDimensionScores
- **WeeFIMDriver 实现** (`src/strategies/assessment/WeeFIMDriver.ts` ~380行):
  - WeeFIM 功能独立性量表驱动器（18题，7级评分）
  - 2 个维度：运动功能（13题）、认知功能（5题）
  - 等级映射：完全独立(126) 到 完全依赖(18-35)
- **CSIRSDriver 实现** (`src/strategies/assessment/CSIRSDriver.ts` ~560行):
  - CSIRS 感觉统合量表驱动器（58题，根据年龄动态调整）
  - 5 个维度，5 级评分（1-5分），反向计分
  - T 分转换：使用 csirs-conversion.ts 查表
- **文件修改**:
  - `src/strategies/assessment/BaseDriver.ts` - 新增（~280行）
  - `src/strategies/assessment/WeeFIMDriver.ts` - 新增（~380行）
  - `src/strategies/assessment/CSIRSDriver.ts` - 新增（~560行）

### [2026-02-24] Phase 4 评估基础设施重构 - ScaleDriver 策略模式
- **目标**: 使用"UI Container Reuse + Strategy Driver"架构重构评估模块
- **ScaleDriver 接口设计** (`src/types/assessment.ts` ~300行):
  - 定义评估驱动器通用接口
  - 核心方法：getQuestions, getStartIndex, getNextQuestion, calculateScore, generateFeedback
- **SMDriver 实现** (`src/strategies/assessment/SMDriver.ts` ~700行):
  - S-M 社会生活能力量表驱动器（132题，7个年龄阶段）
  - Basal/Ceiling 规则：连续10项通过/不通过
  - 粗分计算：基础分 + 通过数
- **AssessmentContainer 组件** (`src/views/assessment/AssessmentContainer.vue` ~630行):
  - 统一评估容器，支持多量表驱动
  - 三个阶段：welcome → assessing → complete
  - 子组件：WelcomeDialog, QuestionCard, CompleteDialog
  - 进度持久化（localStorage）
- **策略工厂** (`src/strategies/assessment/index.ts`):
  - `getDriverByScaleCode(scaleCode)`: 同步获取驱动器实例
  - 驱动器缓存机制
- **文件修改**:
  - `src/types/assessment.ts` - 新增（~300行）
  - `src/strategies/assessment/SMDriver.ts` - 新增（~700行）
  - `src/strategies/assessment/index.ts` - 新增（~107行）
  - `src/views/assessment/AssessmentContainer.vue` - 新增（~630行）

### [2026-02-22] Phase 3.11 资源中心统一入口 - ResourceCenter.vue
- **目标**: 将"资源管理"和"资料库"深度融合，构建统一的资源中心入口
- **架构设计**: 统一入口 + 双视图（Tab切换）
  - Tab 1: 训练资源 → 面向 `sys_training_resource` 表
  - Tab 2: 教学资料 → 面向 `resource_meta` 表
- **权限自适应**: admin完整CRUD，teacher只读模式
- **路由变更**: `/resources` 和 `/admin/resources` 重定向到 `/resource-center`
- **文件修改**:
  - `src/views/admin/ResourceCenter.vue` - 新增（~180行）
  - `src/views/resource-center/TrainingResources.vue` - 新增（~850行）
  - `src/views/resource-center/TeachingMaterials.vue` - 新增（~780行）

### [2026-02-22] Phase 3.10 资源管理模块 - ResourceManager.vue
- **目标**: 实现系统资源的顶级管理功能，支持多模块、多资源类型的统一管理
- **路由配置**: `/admin/resources`，仅管理员可访问
- **左侧筛选面板**: 业务模块、资源类型、状态筛选、搜索框（300ms防抖）
- **资源列表表格**: 缩略图、名称、分类、来源标签、状态开关、操作列
- **权限控制**: 系统资源只读，自定义资源可编辑
- **ResourceAPI 扩展**: `getAllResourcesForAdmin()` 查询所有资源（包括禁用的）
- **文件修改**:
  - `src/views/admin/ResourceManager.vue` - 新增（~800行）
  - `src/database/resource-api.ts` - 添加 getAllResourcesForAdmin 方法

---

## [2026-02-27] Phase 4.5 之前的归档条目（从 PROJECT_CONTEXT.md 迁移）

### [2026-02-22] Phase 3.9 技术债清偿 - Resource 泛化架构彻底清理
- **目标**: 彻底剥离旧表依赖与清理残留组件，确保架构不再存在双重依赖
- **getEquipment() 方法重构**:
  - ❌ 移除 `INNER JOIN equipment_catalog ec ON tr.legacy_id = ec.id`
  - ✅ 直接使用 `tr.category` 而非 `ec.category`
  - ✅ 新增 `tr.module_code = 'sensory'` 模块过滤
  - **文件**: `src/database/api.ts`
- **getCategoryStats() 统计方法重构**:
  - ❌ 移除 `JOIN equipment_catalog ec ON etr.equipment_id = ec.id`
  - ✅ 改用 `JOIN sys_training_resource tr ON etr.equipment_id = tr.id`
  - **文件**: `src/database/api.ts`
- **删除残留组件**:
  - 删除 `src/components/equipment/EquipmentSelector.vue`（无引用）
- **ResourceAPI CRUD 接口完善** (`src/database/resource-api.ts` +220行):
  - `addResource(data)` - 创建资源（支持标签自动关联）
  - `updateResource(id, data)` - 更新资源（支持标签替换）
  - `deleteResource(id)` - **软删除**（设置 is_active = 0）
  - `restoreResource(id)` - 恢复已删除资源
  - `hardDeleteResource(id)` - 永久删除（谨慎使用）
  - `incrementUsageCount(id)` - 增加使用次数
- **架构状态变更**:
  | 维度 | 重构前 | 重构后 |
  |:-----|:-------|:-------|
  | 旧表依赖 | ⚠️ 双表 JOIN | ✅ 完全独立 |
  | 代码引用 `equipment_catalog` | 5处 | 0处 |
  | ResourceAPI CRUD | 仅查询 | ✅ 完整增删改 |
- **文件修改**:
  - `src/database/api.ts` - getEquipment() 和 getCategoryStats() 重构
  - `src/database/resource-api.ts` - CRUD 接口完善（+220行）
  - `src/components/equipment/EquipmentSelector.vue` - 已删除

### [2026-02-19] Electron 应用在线升级功能
- **功能**: 检查更新、下载更新、安装更新、版本信息显示
- **技术栈**: electron-updater + generic provider
- **主进程 IPC 处理器** (`electron/handlers/update.js`):
  - 延迟加载 electron-updater（避免启动失败）
  - 默认配置：自有更新源 `generic provider`
  - 用户配置存储：`%APPDATA%\sic-ads\update-config.json`
  - IPC 处理器：check-for-updates, download-update, quit-and-install, get-current-version
- **前端更新服务** (`src/services/UpdateService.ts`):
  - 响应式状态管理（使用 Vue reactivity）
  - 检查更新、下载更新、安装更新、跳过版本
