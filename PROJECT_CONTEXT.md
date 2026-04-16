# PROJECT_CONTEXT.md

> 职责：当前有效的全局上下文摘要，补充项目事实、主线进展和当前决策。
> 何时阅读：读完 `AGENTS.md` 与 `.continue-here.md` 后，仍需要补全全局背景时。
> 不负责：承担历史流水日志；历史内容应转入 `docs/logs/`、`docs/CHANGELOG.md` 或 git history。
>
> 用途：当前有效协作上下文摘要。
> 读取策略：不再作为每次新会话默认首读文件。默认先读 `AGENTS.md`、`docs/planning/2026-03-23-scgp-context-bootstrap.md`、`README.md`；只有在需要延续工作背景时再读本文件。
> 历史说明：旧版长篇工作日志与阶段流水已从高频入口移出，历史摘要见 `docs/logs/2026-03-26-project-context-archive.md`，更细节的完成项见 `docs/CHANGELOG.md` 或 git history。

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

### 3.0 里程碑状态更新

- `v1.6 Emotional Engine Refactoring` 已于 `2026-04-04` 完成归档
- 当前活动里程碑已切换为：
  - `v1.7 CNBS-R2016 Assessment Integration`
- 当前 v1.7 主线目标：
  - 将 `0-6岁儿童发育行为评估量表（儿心量表Ⅱ / CNBS-R2016）` 接入现有 `AssessmentContainer + ScaleDriver + per-scale table + report_record` 评估主链
- 当前 v1.7 明确不纳入范围：
  - FMDA runtime QA
  - unified training-record closeout
  - resource-center redesign
  - broader platform debt cleanup

### 3.0.1 CNBS-R2016 当前重要约束

- CNBS-R2016 的 DQ 阈值必须以官方 PDF `WS/T 580—2017` 为准，不以旧 PRD / 草稿配置为准
- CNBS-R2016 当前配置策略已明确拆分为两层：
  - 轻量运行时配置：`src/config/cnbsr2016-thresholds.ts`
  - 重量级解释/建议文案：`src/config/CNBSR2016FeedbackConfig.js`
- 不要把 CNBS-R2016 大体量文案并入 `src/config/feedbackConfig.js`
  - 原因：会让共享配置文件过大，并让无关量表页面承担额外解析/加载成本
  - 后续 `Driver` 应只依赖轻量阈值配置，报告页再消费重文案配置
- `2026-04-04` 当前仓库 UI 中的 CNBS-R2016 公共评估入口已按用户明确指令放开
  - 这只是为了让用户直接在运行时应用里完成人工 live UAT
  - 不应把“入口已打开”误写成“Phase 20 live runtime UAT 已完成”或“已具备正式发布结论”

### 3.1 器材训练入口与 `physical-equipment`

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

### 3.3 training-entry hard-cut 当前进度

- `training_records` 与 `equipment_training_records` 已补齐 `entry_code`
- 游戏训练新写入已写入 `entry_code`
- 器材训练新写入已写入 `entry_code`
- 训练记录菜单 / 统计 / 面板已按 `entry_code` 统计与筛选
- `src/views/equipment/Records.vue` 已改为 entry-aware 记录页
- `ModuleTrainingRecords -> EquipmentRecords` 已能携带 `recordId` 进入对应记录
- clean local dev DB 已重建并完成最小写入验证：
  - 1 条游戏记录验证 `entry_code = emotional-regulation`
  - 1 条器材记录验证 `entry_code = fine-motor`
- `SQLWrapper` 已修复“保存后错误重复再触发保存”的状态机问题
- `equipment_training_records` 的当前 schema/init 口径已改回正确资源主线：
  - `equipment_id -> sys_training_resource(id)`

### 3.3.1 2026-04-13 cross-entry custom games planning update

- 已新增当前专题计划入口：
  - `docs/planning/2026-04-13-cross-entry-custom-games-expansion-plan.md`
- 已新增 `Phase 0` 实施规格：
  - `docs/planning/2026-04-13-cross-entry-custom-games-phase0-implementation-spec.md`
- 当前已确认的代码现实：
  - 自定义小游戏仍是 `emotional-only` 专线
  - 当前只有 5 个情绪小游戏接入正式小游戏链路
  - `GameLobby`、路由、落库、详情页都还没有完成跨入口收口
  - 权限申请仍由子游戏自行发起，不是容器 preflight
- 当前已锁定的 `Phase 0` 约束：
  - 统一小游戏注册表
  - 双人共享场次
  - 组事务写入
  - `game_session_participants` 关联表
  - `completion_status + exit_trigger`
  - `user_exit / teacher_exit` 细分
  - 容器统一权限 preflight
  - Electron 系统权限恢复页
  - 本地构建前置与 CI 注册表校验
- 当前明确下一步：
  - 不先写 `Wave 1` 新游戏
  - 先执行 implementation spec 中的 `注册表与类型基线`、`Schema 正式迁移`、`持久化事务补齐`

### 3.4 Emotional immersive rework planning update

- `2026-04-06` 已新增情绪模块沉浸式训练改造规划：
  - `docs/planning/2026-04-06-emotional-immersive-training-rework-plan.md`
- 当前已锁定的情绪模块改造方向：
  - `care_scene` 目标是固定 3 个沉浸式全屏阶段
  - `emotion_scene` 不限制屏数，按场景推理链决定 stage 数量
  - 多图场景支持必须作为一级结构约束提前设计
  - 新资源字段、鼓励反馈与引导文案必须符合中国儿童/青少年的真实语境
- 当前重要边界：
  - 本次先完成规划和文档沉淀，不在一个会话内直接铺开全部实现
  - 后续应先补 `stage` 层流程模型，再进入具体 UI 与资源编辑器改造

### 3.4.1 2026-04-10 care_scene schema alignment update

- `care_scene` 已完成一轮代码级 schema 对齐：
  - 根目录 `care_scenes_database.json` 现在被视为 `care_scene` 作者态唯一真源
  - 新字段 `name` / `description` / `specificEmotionToken` / `specificEmotionLabel` / `emotionOptions[]` 已接入：
    - 类型定义
    - emotional seed 标准化
    - `sys_training_resource.meta_data` 回填链
    - 资源中心编辑器
    - emotional pack 导入导出
    - `care_scene` 沉浸式 runtime
    - 场景选择页展示
- 当前已确认的重要约束：
  - `receiverName` / `emotionChips` / `comfortTip` 仍保留，但已降级为兼容 / 推导字段，不再是作者态源字段
  - `care_scene` Step 1 情绪识别必须直接消费 JSON 中配置的 `emotionOptions[]`，不应再由 runtime 随机生成基础情绪选项
  - 资源中心保存 `care_scene` 时，资源主表 `description` 与 `meta_data.description` 必须同步，避免形成两套口径
- `2026-04-10` 当前已完成的阻塞清理：
  - 仓库级 `npm run type-check` 已恢复通过
    - 历史阻塞点 `src/components/emotional/games/EnergyBallGame.vue`
    - 历史阻塞点 `src/components/emotional/games/VisualSupportOverlay.vue`
    - 历史阻塞点 `src/composables/useEmotionDetector.ts`
  - 本地 DB `/home/DONG/.config/scgp/database.sqlite` 已完成 `care_scene` metadata 实机核对
    - `care_scenes_database.json` 源条数 = 64
    - 本地 `sys_training_resource` 中 `care_scene` 条数 = 64
    - 未发现 `sceneCode / name / description / specificEmotionToken / specificEmotionLabel / emotionOptions[4] / legacy_source` 缺口
    - 未发现资源主表 `description` 与 `meta_data.description` 不一致
- 当前仍未完成：
  - `care_scene` 正式训练记录闭环尚未接入

### 3.4.2 2026-04-12 care_scene immersive cutover reality check

- `main` 当前已恢复 `care_scene` 正式沉浸式入口：
  - `SceneSelector` 不再提供 `immersivePreview` / 模式切换
  - `/emotional/care-expression` 现在直接指向沉浸式训练页面
  - `/emotional/care-expression/immersive` 仅保留兼容重定向，不再是独立产品路径
- 当前已确认的重要约束：
  - `care_scene` 训练进入前必须具备有效 `studentId` 与 `resourceId`
  - 旧左右双栏训练链路已从活跃代码中删除，不应再保留“旧模式 fallback”心智模型
  - 当前代码仍不能把“正式训练记录已完成闭环”写成事实
- 当前记录持久化现实：
  - `compileCareSceneImmersive` 当前仍使用 `persistence_mode: 'deferred'`
  - `ResultStep` 会因 `supportsRecordPersistence = false` 跳过训练记录保存
  - `src/database/api.ts` 新增 `EmotionalTrainingRecordAPI`
  - 但该 API **尚未真正接入当前 `care_scene` runtime**
- 当前代码级清理已完成：
  - 旧 `CareExpressionTraining.vue`
  - 旧 `useEmotionalTrainingShell.ts`
  - 旧 `compileCareScene.ts`
- 当前仍未完成：
  - 尚未做 Electron 实机 smoke（已列为 2026-04-13 首要任务）
  - 尚未完成 `care_scene` 正式训练记录闭环接线与本地 DB 实写核验
  - 已完成“评估中心”页面布局重构计划（2026-04-13），详见 `docs/planning/2026-04-13-assessment-layout-refactor-plan.md`
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

- 旧历史记录 hard-cut 的最终收口方案还未完全明确：
  - 直接物理删除，或
  - 提供一次明确 reset 路径
- 仍需继续排查是否还有 remaining old module-based record/detail flow
- 游戏资源真实覆盖仍不完整：
  - 当前真实可用仍以 sensory games + emotional scenes / care scenes 为主
  - `social-communication / fine-motor / soothing-aids / life-skills` 还不是完整游戏内容交付态
- 如后续仍复现原子写入竞态日志，再继续收口 Electron Main 的 `save-database-atomic` 串行化

## 5. 当前明确决策

- 顶层收费 / 授权继续按真实业务模块：
  - `sensory`
  - `emotional`
  - `social`
  - `life_skills`
  - `cognitive`
- `fine-motor`、`soothing-aids` 等属于内部训练入口，不是顶层授权模块
- 新资源匹配与图片解析优先按 `meta_data.resourceCode`
- 旧记录不做“旧 `module_code` 推断到新 `entry_code`”兼容层
- 文档与结论必须以当前代码现实为准，不以旧规划或目标态替代现状

## 6. 当前推荐读取顺序

默认新会话：

1. `HANDOFF.md`
2. `AGENTS.md`
3. `docs/planning/2026-03-23-scgp-context-bootstrap.md`
4. `README.md`
5. `.continue-here.md`

按需再读：

6. `PROJECT_CONTEXT.md`
7. `docs/planning/2026-03-13-scgp-current-prd.md`
8. `docs/reports/2026-03-13-scgp-prd-gap-analysis.md`
9. `重构实施技术规范.md`

### 3.3.2 2026-04-13 cross-entry custom games Phase 0 execution update

- `Phase 0 Step 1-4` 已落代码，但当前运行现实仍是 `emotional-only`。
- `src/data/custom-game-registry.ts` 已成为当前 5 个情绪小游戏的统一真源，旧 emotional catalog 已退化为 adapter。
- `game_emotion_records` / `student_badges` 已完成 Phase 0 正式迁移，并新增 `game_session_participants`。
- `EmotionalGamesAPI` 已具备 `persistSessionGroup()` 组事务写入，`training_session.summary_payload` 会保留共享场次摘要。
- `GameContainer` 已切到 `launchContext` 契约，并区分 `user_exit / teacher_exit / system_interrupt`。
- 下一步固定为 `Step 5`：容器统一权限 preflight 与 Electron 权限恢复链，不进入 `Wave 1` 新游戏。

### 3.3.3 2026-04-14 cross-entry custom games Phase 0 closeout and Wave 1 prep

- `Phase 0` 已完成手动验证收口：
  - `G03_FOREST` 麦克风 `blocked_system` 恢复链路已通过
  - `G08_ENERGY_BALL` 摄像头 `blocked_system` 恢复链路已通过
  - 跨入口启动与返回链路已通过
- 主进程 broken pipe 弹窗已修复：
  - commit `8f47ed1`
- 当前新增 `Wave 1` 前期准备入口：
  - `docs/planning/2026-04-14-cross-entry-custom-games-wave1-prep-checklist.md`
- 当前明确边界：
  - `Phase 0` 已关闭
  - 当前真实链路仍是 `emotional-only`
  - 下一步不是直接铺开 `Wave 1` 实现，而是先按 prep checklist 锁定单一目标并核对底座

## 7. 维护规则

- 本文件只保留当前有效上下文，不再积累长流水日志
- 已完成历史事项优先进入：
  - `docs/CHANGELOG.md`
  - `docs/logs/2026-03-26-project-context-archive.md`
  - git history
- `HANDOFF.md` is now the single top-level routing doc for new sessions and should stay short
- 如果本文件再次明显膨胀，应继续把历史内容迁出，而不是在这里堆积

## 8. 2026-04-04 CNBS-R2016 Planning Update

- `.planning/` 已创建 v1.7 的正式规划材料：
  - `.planning/PROJECT.md`
  - `.planning/REQUIREMENTS.md`
  - `.planning/ROADMAP.md`
  - `.planning/phases/17-cnbs-r2016-question-bank-standardization-foundation/17-RESEARCH.md`
  - `.planning/phases/17-cnbs-r2016-question-bank-standardization-foundation/17-VALIDATION.md`
  - `.planning/phases/17-cnbs-r2016-question-bank-standardization-foundation/17-PLAN.md`
- 当前下一步已明确：
  - 执行 Phase 17
  - 第一个动作是先落 `src/types/cnbsr2016.ts`、`src/database/cnbsr2016-questions.ts` 和两个 verifier 脚本，再录入完整 261 项题库

## 8.1 2026-04-04 CNBS-R2016 Phase 17 Execution Update

- Phase 17 已从“规划完成”推进到“代码落地完成”：
  - `src/types/cnbsr2016.ts`
  - `src/database/cnbsr2016-questions.ts`
  - `scripts/verify-cnbsr2016-item-bank.mjs`
  - `scripts/verify-cnbsr2016-feedback.mjs`
- 当前代码里已具备 CNBS-R2016 的三块基础资产：
  - 完整 261 项结构化题库
  - 轻量 DQ/年龄段运行时阈值配置
  - 重量级反馈配置与对应 verifier
- 当前验证状态：
  - `node scripts/verify-cnbsr2016-item-bank.mjs` 通过
  - `node scripts/verify-cnbsr2016-feedback.mjs` 通过
  - `npm run type-check` 通过
- 当前 Phase 18 的第一个动作已明确：
  - 基于现有 `AssessmentContainer + ScaleDriver` 主链实现 `Cnbsr2016Driver`

## 8.2 2026-04-04 CNBS-R2016 Phase 18 Core Driver Update

- `Cnbsr2016Driver` 已落地并注册到共享 assessment driver factory：
  - `src/strategies/assessment/Cnbsr2016Driver.ts`
  - `src/strategies/assessment/index.ts`
- 当前 Phase 18 已实现的核心能力：
  - 每个能区独立选择起测月龄组
  - 每个能区独立执行 basal / ceiling 搜索
  - 自动补齐 `is_auto_filled` / `auto_fill_reason`
  - 基于 261 项题库计算能区智龄、总智龄 `MA`、发育商 `DQ`
  - 基于 `src/config/cnbsr2016-thresholds.ts` + `src/config/CNBSR2016FeedbackConfig.js` 生成结构化反馈
- 当前重要边界：
  - 虽然 driver core 已可运行，但 `cnbsr2016` 还没有 Phase 19 的 persistence / report_record / report 路由闭环
  - 在 Phase 19 落地前，不应把 CNBS-R2016 从占位态切成正式开放入口，避免暴露半成品评估流程

## 8.3 2026-04-04 CNBS-R2016 Phase 19 Update

- Phase 19 已从“persistence 主链落地”推进到“报告页与路由闭环完成”：
  - `src/views/assessment/cnbsr2016/Report.vue` 已落地
  - `/assessment/cnbsr2016/report/:assessId` 已接入静态路由表
  - `src/views/Reports.vue` 已可从报告中心直达 CNBS-R2016 报告
  - `src/views/student-detail/assessment-records.ts` 已可从学生详情评估记录直达 CNBS-R2016 报告
  - `src/views/assessment/AssessmentContainer.vue` 完成页“查看报告”已可直接打开 CNBS-R2016 报告页
- 当前 CNBS-R2016 报告语义已明确：
  - 必须按 `CA / MA / DQ` 展示，不得套用 FMDA 的 mastery-rate 语义
  - IEP 提取必须继续区分“手动失败项”与 `auto-filled` 项
  - `auto-filled` 失败项可展示，但不能混入手动 IEP 目标
- 当前验证现实：
  - `npm run type-check` 通过
  - 直接以 Node 24 调用 Vite 的构建验证通过
  - `npm run build:web` 仍被仓库脚本层的 `cross-env: Permission denied` 阻塞

## 8.4 2026-04-04 CNBS-R2016 Phase 20 Update

- Phase 20 已完成代码级 runtime QA / standard verification：
  - 三条报告入口已统一复用共享路由构造器，不再各自硬编码
  - CNBS-R2016 报告页已改为消费共享 report view-model，不再在页面内散落重复投影逻辑
  - `scripts/verify-cnbsr2016-phase20-runtime.mjs` 已落地，用于验证三入口一致性与报告关键结果一致性
  - `.planning/phases/20-cnbs-r2016-runtime-qa-standard-verification/20-VERIFICATION.md` 已记录本阶段验证结论
- 当前 Phase 20 已验证通过的结果范围：
  - `CA / 总 MA / 总 DQ`
  - 五能区 `MA / DQ / 结论`
  - age bracket commentary
  - domain feedback
  - 手动失败 IEP 目标
  - auto-filled 失败项未混入 IEP
- 当前新增的重要边界：
  - 虽然代码级 Phase 20 已通过，但本机运行时数据库中尚无现成 CNBS-R2016 真实记录
  - 因此仍未完成真实记录的三入口 live click-through UAT
  - 在该 live UAT 完成前，不得把 CNBS-R2016 从占位态切成正式开放入口
- 当前验证现实补充：
  - `/home/DONG/.config/nvm/versions/node/v24.14.0/bin/node node_modules/vue-tsc/bin/vue-tsc --build` 通过
  - `/home/DONG/.config/nvm/versions/node/v24.14.0/bin/node scripts/verify-cnbsr2016-phase20-runtime.mjs` 通过
  - `env ELECTRON=true /home/DONG/.config/nvm/versions/node/v24.14.0/bin/node node_modules/vite/bin/vite.js build` 通过
- 当前下一步已切换为：
  - `Phase 20 runtime QA + standard verification`
  - 第一动作是对同一份 CNBS-R2016 报告做 completion dialog / report center / student-detail 三入口一致性验证

## 9. 2026-03-30 Working Update

- A unified training-resource copy workflow is now part of current code reality.
- Source of truth for pre-release training-resource copy is:
  - `docs/references/resource-copy/2026-03-30-training-resource-copy.csv`
- Generated runtime override map is:
  - `src/data/generated-training-resource-copy.ts`
  - do not edit the generated file directly
- Current covered resource families:
  - sensory equipment
  - sensory games
  - emotional games
  - `emotion_scene`
  - `care_scene`
  - physical-equipment resources
- Existing local DBs can be synced by stable key through:
  - `npm run resource-copy:sync -- --dry-run`
  - `npm run resource-copy:sync -- --yes`
- Stable keys now matter more than names for copy sync:
  - `legacyId`
  - `taskId`
  - `gameCode`
  - `sceneCode`
  - `resourceCode`
- Important constraint:
  - do not casually reorder `src/database/equipment-data.ts`, because current sensory-equipment copy keys still depend on the legacy array order

## 10. 2026-03-31 Resource-Center Follow-up

- resource-center smoke verification is now confirmed against the live local dev DB:
  - after app relaunch and `Ctrl+R`, `emotion_scene = 80`
  - after app relaunch and `Ctrl+R`, `care_scene = 60`
  - sensory `equipment_data` resources checked for ability-tag coverage: `63 / 63`
- teaching materials now have a second-layer UI filter in addition to business dimension:
  - `video`
  - `image`
  - `document`
  - `other`
- important implementation boundary:
  - second-layer teaching-material categories are derived from existing `file_type`
  - do not add a separate persisted category field unless future runtime verification proves `file_type` is insufficient
- important zero-state constraint:
  - the teaching-material file-category filter should remain visible even when `teaching_material` is empty
  - current local dev DB still has `0` teaching-material rows, so non-zero category counts still need runtime verification with imported files

## 11. 2026-03-31 Training Workspace Layout Fix

- equipment quick-entry and game lobby now share a split-workspace scroll pattern:
  - page root: `workspace-page`
  - split container: `workspace-split`
  - left/right panes: `workspace-pane`
  - top-aligned content cards: `workspace-pane-card`
- implementation landed in:
  - `src/assets/layout.css`
  - `src/views/equipment/QuickEntry.vue`
  - `src/views/games/GameLobby.vue`
- behavior target:
  - left resource lists scroll independently
  - right data-entry / preview pane stays in the visible workspace instead of being pushed off-screen by outer-page scrolling
  - wheel scrolling should stop at the pane boundary via `overscroll-behavior: contain`
- reference doc:
  - `docs/reports/2026-03-31-training-workspace-layout-scroll-guideline.md`

## 12. 2026-03-31 Class Management Academic-Year Source

- class management now has an independent academic-year source:
  - table: `sys_academic_year`
  - init path: `src/database/init.ts`
  - API surface: `src/database/class-api.ts`
- important boundary:
  - academic years are no longer inferred only from existing classes
  - admins can create academic years before any class exists
  - editing an academic year now propagates to:
    - `sys_class.academic_year`
    - `student_class_history.academic_year`
- current class-management grade taxonomy now spans 12 levels:
  - preschool: `小班 / 中班 / 大班`
  - school age: `一年级 ~ 六年级`
  - post-school age: `七年级（初一）~ 九年级（初三）`

## 12. 2026-03-31 Date-Picker Standardization and Training-Plan Module Ownership

- Element Plus global locale is now configured to `zh-cn` in:
  - `src/main.ts`
- shared date-picker defaults now live in:
  - `src/utils/date-picker.ts`
- important UI constraint:
  - new or updated active business pages should reuse:
    - `STANDARD_DATE_PICKER_PROPS`
    - `STANDARD_DATE_RANGE_PICKER_PROPS`
  - avoid adding new ad-hoc date-picker props unless behavior genuinely needs to differ
- active business pages aligned this round include:
  - `src/views/plan/PlanList.vue`
  - `src/views/Reports.vue`
  - `src/components/AddStudentDialog.vue`
  - `src/views/equipment/Records.vue`
  - `src/views/admin/StudentClassAssignment.vue`
  - `src/views/training-records/components/EquipmentRecordsPanel.vue`
  - `src/views/training-records/components/GameRecordsPanel.vue`
- training-plan ownership is no longer treated as only `all / sensory / emotional / social`
- normalized training-plan module values now live in:
  - `src/utils/training-plan-module.ts`
- important compatibility boundary:
  - preserve old stored values through normalization instead of destructive migration
  - supported legacy aliases include:

## 13. 2026-04-03 FMDA End-to-End First Runnable Chain

- `fine_motor` FMDA is now wired through the current assessment mainline:
  - unified assessment entry
  - `FineMotorDriver`
  - per-scale persistence tables
  - `report_record`
  - report route + report page
- persistence now lands in:
  - `fine_motor_assess`
  - `fine_motor_assess_detail`
- important FMDA persistence boundary:
  - `fine_motor_assess_detail` must retain `is_auto_filled`
  - `auto_fill_reason` is also persisted to preserve basal/ceiling provenance
- current FMDA report page now reads persisted data and config interpretation from:
  - `src/views/assessment/fine-motor/Report.vue`
  - `src/config/feedbackConfig.js -> ASSESSMENT_LIBRARY.fine_motor_preschool`
- important current-state boundary:
  - FMDA code chain is now closed in repo reality
  - but runtime QA is still pending, so do not describe FMDA as runtime-verified until a real assessment flow has been completed and checked end to end

    - `sensory`
    - `emotional`
    - `social`
    - `life_skills`

## 13. 2026-03-31 Student Management UI Alignment and Data Boundaries

- `src/views/Students.vue` is now aligned to the same admin-page visual language used by:
  - `src/views/admin/ClassManagement.vue`
  - `src/views/admin/StudentClassAssignment.vue`
- student-management now relies on current class snapshot fields already stored on `student`:
  - `current_class_id`
  - `current_class_name`
  - these fields are now included in the student list query path through:
    - `src/database/api.ts`
    - `src/stores/student.ts`
- important avatar boundary:
  - active student-management UI only allows two display states:
    - real uploaded photo
    - gender-colored initial avatar fallback
  - do not reintroduce a third grey generic avatar state in new student-list UI work
- important data-entry boundary:
  - `src/components/AddStudentDialog.vue` no longer auto-generates and persists placeholder avatar images into `avatar_path`
  - newly saved or edited diagnosis values are normalized to the current nine canonical diagnosis categories used by the student-management filters and color pills
- important compatibility boundary:
  - historical rows may still contain older long-form diagnosis strings or previously generated fallback avatar data URLs
  - current page/dialog behavior normalizes these at display/edit time; no destructive migration has been run

## 14. 2026-03-31 Shared Student Display Components

- shared student presentation primitives now live in:
  - `src/components/student/StudentAvatar.vue`
  - `src/components/student/DiagnosisTag.vue`
  - `src/components/student/StudentId.vue`
  - shared normalization / formatting logic: `src/utils/student-display.ts`
- important display boundary:
  - student avatar presentation in the shared layer only allows:
    - real uploaded photo
    - gender-toned initial avatar fallback
  - do not reintroduce green default avatars, grey generic placeholders, or legacy cartoon-style student avatars in pages that have moved to the shared layer
- current landed consumers include:
  - `src/components/AddStudentDialog.vue`
  - `src/views/StudentDetail.vue`
  - `src/views/games/SelectStudent.vue`
  - `src/components/common/StudentSelector.vue`
  - `src/views/Students.vue`
- important scope constraint:
  - this round only unified the targeted student-management/detail/selector flows
  - other student-bearing pages may still use older local rendering until they are explicitly migrated

## 15. 2026-04-01 Reports Center Simplification and Assessment Placeholder Boundary

- `src/views/Reports.vue` was simplified again after direct UI review:
  - remove the top hero / overview summary block
  - remove redundant filter-section heading copy
  - remove small section kicker pills such as `统一报告中心 / 类型分布 / 结果列表`
- important current-product boundary:
  - the assessment distribution area in `Reports.vue` must reflect current code reality, not target scope
  - current implemented report-producing scales are only:
    - `sm`
    - `weefim`
    - `csirs`
    - `conners-psq`
    - `conners-trs`
    - `sdq`
    - `srs2`
    - `cbcl`
  - the remaining assessment cards currently shown in the assessment entry page are still placeholders only:
    - `儿心量表-II`
    - `TGMD-3`
    - `GMFM`
    - `FMDA`
- important presentation constraint:
  - do not present those 4 placeholder scales as already implemented report chains
  - zero-count placeholder cards in the reports page are only a current-state reminder, not evidence of delivered reporting capability
- `src/views/admin/ResourceCenter.vue` top-level shell should remain lightweight:
  - keep the page title / description and tab strip
  - avoid reintroducing hero / overview blocks unless the user explicitly asks for them

## 16. 2026-04-01 Emotional Mini-Game Record Bridge and Unified Training-Record Boundary

- emotional mini-game records from `game_emotion_records` are now surfaced in the existing training-record UI through:
  - `src/database/emotional-games-api.ts`
  - `src/views/training-records/components/GameRecordsPanel.vue`
- training-record counts that should now include emotional mini-game records:
  - `src/views/training-records/TrainingRecordsMenu.vue`
  - `src/views/training-records/ModuleTrainingRecords.vue`
  - `src/views/StudentDetail.vue`
- a lightweight emotional mini-game record detail page now exists:
  - `src/views/emotional/GameRecordDetail.vue`
  - route: `/emotional/game-record`
- important current-product boundary:
  - emotional mini-games are now visible in user-facing training-record lists and counts
  - but they are still not part of a fully unified write architecture
  - current code reality remains split across:
    - `training_records`
    - `equipment_training_records`
    - `emotional_training_session`
    - `game_emotion_records`
- important next-step planning boundary:
  - the current implementation plan for the long-term fix is:
    - `docs/planning/2026-04-01-unified-training-record-schema-plan.md`
  - that document describes the target direction:
    - unified `training_session` main table
    - family detail tables
    - staged dual-write migration
  - it is a current plan, not current implementation reality

## 17. 2026-04-02 Unified Training-Session Phase A and Full Legacy Write Dual-Write Coverage

- `training_session` unified summary main table is now part of current code reality:
  - schema + indexes landed in `src/database/init.ts`
  - init-time schema ensure path also lives in `src/database/init.ts`
- a shared unified summary writer now exists:
  - `src/database/training-session-writer.ts`
- important migration identity boundary:
  - `source_table + source_record_id` is now the idempotent source key for unified summary upsert
  - new staged dual-write paths should reuse the shared writer instead of hand-rolling inserts
- current dual-write coverage now includes:
  - emotional scene writes in `src/database/emotional-api.ts`
    - old write remains in `training_records`
    - unified summary now also writes to `training_session`
  - emotional mini-game writes in `src/database/emotional-games-api.ts`
    - old write remains in `game_emotion_records`
    - unified summary now also writes to `training_session`
  - sensory game writes in `GameTrainingAPI.saveTrainingRecord()` within `src/database/api.ts`
    - old write remains in `training_records`
    - unified summary now also writes to `training_session`
  - equipment writes in `EquipmentTrainingAPI.createRecord()` within `src/database/api.ts`
    - old write remains in `equipment_training_records`
    - unified summary now also writes to `training_session`
- important sensory-game runtime boundary:
  - sensory game persistence now triggers at the actual `endGame()` completion path in:
    - `src/components/games/visual/GameGrid.vue`
    - `src/components/games/audio/GameAudio.vue`
    - `src/components/games/visual/VisualTracker.vue`
  - it no longer depends on the user clicking a second result-page “查看详细报告” button to persist the training record
- a lightweight unified query scaffold now exists:
  - `TrainingSessionAPI` in `src/database/api.ts`
- important write-path safety boundary:
  - sensory game and equipment dual-write are now wrapped in the same transaction scope as the legacy insert
  - this avoids leaving a new legacy row behind when `training_session` upsert fails
- important current-schema boundary:
  - current local DB reality still allows sensory game records while `task` table is empty
  - so `training_session.task_id` for sensory games must only be written when the referenced `task` row truly exists
- runtime verification status now confirmed in the live local DB:
  - one real sensory game run now produces the expected `training_records` + `training_session` rows
  - one real equipment quick-entry now produces the expected `equipment_training_records` + `training_session` rows
- important current-product boundary:
  - `training_session` is not yet the sole summary fact source
  - no user-facing read chain has switched to `training_session` yet
    - training-record list / menu
    - student detail counts / lists
    - dashboard aggregates
    - reports
- current next action:
  - start switching the first safe user-facing read chain onto `training_session`
  - candidate first consumers remain:
    - training-record list / menu
    - student detail counts / lists

## 18. 2026-04-02 Page-Style Unification Planning Boundary

- a page-style unification execution TODO now exists:
  - `docs/planning/2026-04-02-page-style-unification-todo.md`
- important current-code boundary:
  - shared page-style foundation already exists in current code reality through:
    - `src/assets/layout.css`
    - `src/assets/main.css`
    - `src/assets/base.css`
    - `src/utils/date-picker.ts`
  - but full-site page-style unification is not yet landed
- first-wave execution boundary:
  - prioritize backend business pages first
  - start from shared layout/style primitives before page-by-page migration
  - initial target chain is:
    - `training-records`
    - `equipment/Records`
    - then `resource-center`
- important exclusion boundary:
  - do not force the admin-page shell onto:
    - login / activation / not-found pages
    - gameplay and immersive emotional mini-games
    - `AssessmentContainer`
    - report pages

## 19. 2026-04-02 Page-Style Unification Execution Progress

- page-style unification is no longer only a planning boundary; partial execution is now landed in current code reality
- shared layout/style primitives in current active use now include additional page-shell support in:
  - `src/assets/layout.css`
- current landed execution slices include:
  - training-record chain:
    - `src/views/training-records/TrainingRecordsMenu.vue`
    - `src/views/training-records/ModuleTrainingRecords.vue`
    - `src/views/training-records/components/GameRecordsPanel.vue`
    - `src/views/training-records/components/EquipmentRecordsPanel.vue`
    - `src/views/equipment/Records.vue`
  - resource-center chain:
    - `src/views/admin/ResourceCenter.vue`
    - `src/views/resource-center/TrainingResources.vue`
    - `src/views/resource-center/TeachingMaterials.vue`
  - training entry / selector / assessment entry chain:
    - `src/views/games/GameModuleMenu.vue`
    - `src/views/equipment/EquipmentMenu.vue`
    - `src/views/emotional/Menu.vue`
    - `src/components/common/StudentSelector.vue`
    - `src/views/games/SelectStudent.vue`
    - `src/views/equipment/SelectStudent.vue`
    - `src/views/emotional/SceneSelector.vue`
    - `src/views/assessment/AssessmentSelect.vue`
  - system management chain:
    - `src/views/System.vue`
    - `src/views/system/UserManagement.vue`
    - `src/views/system/SystemSettings.vue`
- important current-product boundary:
  - this is still not full-site style unification
  - the previous pending backend business-page slice on system management pages is now landed in current code reality
  - immersive gameplay, report pages, and `AssessmentContainer` remain excluded from the admin-page shell target
- important system-management execution boundary:
  - `System.vue` is now the only page-level shell for the system-management route
  - `system/UserManagement.vue` and `system/SystemSettings.vue` should stay as embedded tab panels, not reintroduce their own page headers
  - user-management destructive actions are intentionally visually downgraded behind a dropdown
  - backup restore warnings should continue to use the shared warning-block direction instead of reverting to bare red helper text
- important shared-component boundary:
  - `src/components/common/StudentSelector.vue` is now the active shell for:
    - assessment student selection
    - game training student selection
    - equipment training student selection
  - future changes there affect all three chains and must preserve route-specific handoff logic
- verification status for the current UI-execution slices:
  - `npm run type-check` passed in the current shell after the system-management slice landed
  - the current conversation did not rerun `vite build`
  - historical note: earlier page-style slices were verified with Node 24 because some environments still resolved `/usr/bin/node` (`v18.19.1`)

## 20. 2026-04-02 Login Entry Redesign and Config-Driven Theme Controls

- the login entry redesign requested in this conversation is now part of current code reality:
  - `src/views/Login.vue`
- the login entry is now componentized into:
  - `src/components/login/SchoolPanel.vue`
  - `src/components/login/LoginCard.vue`
  - `src/components/login/InputField.vue`
  - `src/components/login/PrimaryButton.vue`
- current login layout direction is now:
  - left brand panel + right login form
  - desktop target ratio around `40 / 60`
  - narrow-width fallback to stacked layout
- important visual boundary:
  - current login page direction is a clean blue education-system entry
  - do not reintroduce purple-heavy palettes or animated AI-style login backgrounds
- a reusable login theme variable helper now exists:
  - `src/utils/login-theme.ts`
- system config now owns login-entry theme and brand fields through:
  - `src/stores/systemConfig.ts`
- app bootstrap now applies login-entry theme variables through:
  - `src/main.ts`
- system settings can now edit login-entry theme / brand content in:
  - `src/views/system/SystemSettings.vue`
- current persisted keys added to `system_config` include:
  - `login_theme_variant`
  - `theme_primary_color`
  - `brand_panel_title`
  - `brand_panel_subtitle`
  - `brand_panel_description`
- important scope boundary:
  - this is a login-entry theme system, not a full-site theming engine
  - do not describe current code reality as global platform theme switching
- important follow-up boundary:
  - `Activation.vue` was not aligned in this conversation
  - any future entry-flow visual convergence should be a deliberate follow-up slice after runtime verification
- verification status:
  - `npm run type-check` passed
  - this conversation did not rerun `vite build`
  - this conversation did not complete manual Electron runtime QA

## 21. 2026-04-03 Login Entry UI Refinement and Login-Logo Config Split

- the login entry UI was further refined in current code reality:
  - `src/views/Login.vue`
  - `src/components/login/SchoolPanel.vue`
  - `src/components/login/LoginCard.vue`
  - `src/components/login/InputField.vue`
  - `src/components/login/PrimaryButton.vue`
- important current visual boundary:
  - the left brand panel is now tuned by explicit positioned stages instead of one flow-layout brand stack:
    - top-left logo stage
    - mid title stage
    - lower school / description stage
  - future adjustments there should treat those stages as independent layout anchors, not merge them back into a single flex flow by default
- important current config boundary:
  - system logo and login-page logo are now separate settings
  - persisted keys now distinguish:
    - global system logo: `logo_path`
    - login-entry logo: `login_logo_path`
  - the active login page reads the login-specific asset through:
    - `src/stores/systemConfig.ts`
    - `src/views/Login.vue`
- important simplification boundary:
  - login-page branding settings no longer expose configurable `brand_panel_title` or `brand_panel_subtitle`
  - current login brand text should resolve from:
    - system name
    - school name
    - `brand_panel_description`
  - old historical `system_config` rows may still contain the removed keys, but current code intentionally ignores them instead of running a destructive cleanup migration
- current system-settings execution boundary:
  - global system logo remains under `基本设置`
  - login-page logo now lives under `登录页品牌与主题`
  - landed in:
    - `src/views/system/SystemSettings.vue`
- verification status:
  - `npm run type-check` passed
  - login-entry actual render has now been manually verified
  - independent system-logo / login-logo persistence after relaunch has now been manually verified
  - this conversation still did not rerun `vite build`

## 22. 2026-04-03 Backup/Restore Coverage Closure for Current Live Schema

- `src/utils/backup.ts` no longer backs up a stale hard-coded table whitelist
- backup export now discovers current sqlite user tables from `sqlite_master`, with only explicit transient migration tables excluded
- important current-product effect:
  - backup coverage should now include current live business data such as:
    - `sys_academic_year`
    - `sys_class`
    - `student_class_history`
    - `sys_class_teachers`
    - `report_record`
    - `training_records`
    - `equipment_training_records`
    - `training_session`
    - `sys_training_plan`
    - `sys_plan_resource_map`
    - emotional training tables already present in current schema
- restore behavior was tightened in current code reality:
  - overwrite restore now clears target tables even when the backup copy for that table is empty
  - restore temporarily disables foreign-key enforcement for bulk replay, then runs `PRAGMA foreign_key_check`
  - restore now fails fast if the backup contains tables unknown to the current client schema
- important class-data boundary:
  - post-restore reconciliation now recalculates:
    - `student.current_class_id`
    - `student.current_class_name`
    - `sys_class.current_enrollment`
  - reason: class-history replay and enrollment triggers can otherwise leave derived class state inconsistent
- backup payload compatibility boundary:
  - new exports now write version `2.0`
  - current restore still accepts legacy backup payload version `1.0`
- current verification status:
  - `npm run type-check` passed after the backup changes landed
  - a fresh manual end-to-end backup/restore round-trip for the patched implementation has now been verified by the user

## 23. 2026-04-03 Admin UI Consistency Cleanup for Filters and Entry Menus

- class-management shell layering was adjusted to align with student-management:
  - `src/views/admin/ClassManagement.vue`
  - important current UI boundary:
    - do not wrap class-management filter + stats + list content in one extra outer white panel again
    - keep the page background layering consistent with student-management, while the actual list area stays in its own `main-content` panel
- filter-pill hover clipping was fixed in the currently affected pages:
  - `src/views/Students.vue`
  - `src/views/admin/ClassManagement.vue`
  - `src/views/admin/StudentClassAssignment.vue`
  - `src/views/plan/PlanList.vue`
- important shared UI constraint:
  - any pill-strip that combines `overflow-x: auto` with hover lift / active outline should keep small vertical safe padding in the scroll container
  - otherwise the hover border and shadow will be clipped by the filter surface
- redundant breadcrumb helper text was removed from the current entry-selection pages:
  - `src/views/games/GameModuleMenu.vue`
  - `src/views/equipment/EquipmentMenu.vue`
  - `src/views/training-records/TrainingRecordsMenu.vue`
- important page-header boundary:
  - those pages should rely on the main page title + subtitle for orientation
  - do not reintroduce `模块名 / 选择入口` breadcrumb copy above the header unless a real navigation need appears
- verification status:
  - `npm run type-check` passed after the cleanup landed
  - this conversation did not complete a fresh manual visual QA pass for all affected pages

## 24. 2026-04-03 FMDA Fine-Motor Integration Boundary Snapshot

- this section records the integration boundary established before the first FMDA code slice landed; current implementation reality is tracked in section 25
- important architecture boundary:
  - do not assume the repo already has generic `items`, `assessments`, and `assessment_records` tables described in the external FMDA PRD
  - current assessment mainline remains:
    - `AssessmentContainer + ScaleDriver + per-scale persistence tables + report_record`
- planned safe integration path:
  - register new scale key `fine_motor` in the unified assessment entry chain and driver registry
  - reuse `AssessmentContainer` and `QuestionCard`
  - add `FineMotorDriver`
  - add `fine_motor_assess` and `fine_motor_assess_detail`
  - persist `is_auto_filled` in FMDA detail records
  - add `fine_motor` to `report_record.report_type` and explicit report routing
- important UI boundary:
  - FMDA `2 / 1 / 0` scoring should be rendered through the current option-driven question UI, not a brand-new standalone assessment page unless runtime verification proves reuse is insufficient
- important current-product boundary:
  - even after the first code slice landed, FMDA still should not be described as fully delivered until persistence and report-record wiring land

## 25. 2026-04-03 FMDA Assessment First Slice

- `fine_motor` is now a real assessment scale code in the current UI chain:
  - assessment select
  - select student
  - strategy registry
  - report center mappings
  - student-detail report jump mappings
- the generated FMDA question bank now lives in:
  - `src/database/fine-motor-questions.ts`
- current FMDA driver reality:
  - `src/strategies/assessment/FineMotorDriver.ts` is no longer a placeholder
  - it now implements per-domain start-point selection, basal/ceiling auto-fill, mastery-rate status mapping, and IEP target extraction
- important boundary:
  - this is not yet the full FMDA delivery chain
  - `fine_motor_assess` / `fine_motor_assess_detail` persistence and `report_record.report_type = 'fine_motor'` wiring are still pending
- important persistence constraint:
  - FMDA detail persistence must preserve `metadata.is_auto_filled`
  - otherwise manual `0` and ceiling auto-filled `0` will collapse into the same meaning and break IEP target extraction

## 26. 2026-04-03 FMDA First End-to-End Runnable Chain

- `fine_motor` FMDA now has a closed code chain in current repo reality:
  - unified assessment entry
  - `FineMotorDriver`
  - `fine_motor_assess`
  - `fine_motor_assess_detail`
  - `report_record.report_type = 'fine_motor'`
  - report route + report page
- FMDA persistence now lands through:
  - `src/database/init.ts`
  - `src/database/api.ts -> FineMotorAssessmentAPI`
  - `src/views/assessment/AssessmentContainer.vue`
- important persistence boundary:
  - `fine_motor_assess_detail` must retain:
    - `is_auto_filled`
    - `auto_fill_reason`
  - reason: basal/ceiling auto-fill provenance must survive persistence so report interpretation and IEP target extraction remain correct
- FMDA report rendering now reads persisted data and config interpretation from:
  - `src/views/assessment/fine-motor/Report.vue`
  - `src/config/feedbackConfig.js -> ASSESSMENT_LIBRARY.fine_motor_preschool`
- important current-state boundary:
  - FMDA code wiring is now closed
  - but runtime QA is still pending, so do not describe FMDA as runtime-verified until a real assessment flow has been completed and checked end to end

## 27. 2026-04-08 Emotion-Scene Seed Canonicalization and Preset Image Path Strategy

- `emotion_scene` 当前唯一 canonical seed 已切到：
  - `docs/references/current-emotion-scenes-export.json`
- 仓库中重复旧副本：
  - `docs/references/emotion-scene/current-emotion-scenes-export.json`
  - 已从当前主线移除，避免继续形成双事实源
- `emotion_scene` 当前 seed 数据边界已明确：
  - 80 条顶层场景图保留
  - `prompts.options[].imageUrl` 与 `solutions[].imageUrl` 已从 canonical seed 去除
  - 原因：当前训练 runtime 不消费这两类嵌套图片，继续保留只会制造大量无效静态资源债
- 当前顶层场景图路径策略已统一为逻辑预置资源路径：
  - `images/emotional-scenes/<file>`
- 当前情绪场景图运行时解析已通过共享层收口到：
  - `src/utils/preset-resource.ts`
  - `src/utils/resource-cover.ts`
- 当前打包边界已更新：
  - `electron-builder` 会通过 `build.extraResources` 打包 `assets/resources`
  - 这意味着 `docs/references/current-emotion-scenes-export.json` 只是构建期 seed 来源，不是安装包运行时对 `docs/` 目录的直接依赖
- 当前重要现实边界：
  - `emotion_scene` 已完成 preset-image 路径收口（80/60 顶层场景图已验证通过）
  - `care_scene` 已追平到同一套顶层图片策略（见 section 28）

## 28. 2026-04-08 Care-Scene Seed Normalization and Preset Image Path Strategy

- `care_scenes_database.json` 已修复为合法 60 条 JSON 数组：
  - 原文件为多个 JSON 数组/对象拼接的残损结构，60 条虽全部存在但无法被标准 `JSON.parse` 解析
  - 已通过状态机提取所有顶层对象并重建为合法数组
- `care_scene` 60 条 imageUrl 已从旧路径切换到逻辑预置资源路径：
  - 旧路径：`/assets/care_scenes/careN_xxx.jpg`
  - 新路径：`images/care-scenes/care-scene-N_xxx.png`
  - 60/60 全部命中本地文件，缺失数为 0
- 60 张顶层场景图已复制到预置资源目录：
  - `assets/resources/images/care-scenes/`
- `preset-resource.ts` 已新增旧路径兼容映射：
  - `/assets/care_scenes/` → `images/care-scenes/`
  - 原因：已持久化到 DB 的旧路径记录仍需在运行时正确解析
- 运行时验证已通过：
  - `care_scene` 训练页场景图可正常显示
- 当前重要现实边界：
  - `emotion_scene` 和 `care_scene` 两条资源链已统一到同一套预置资源策略
  - `assets/care_scenes/` 原始素材目录未提交到主线，运行时只消费 `assets/resources/images/care-scenes/` 中的规范化副本
  - `care_scene` AI 配图端到端联调仍然未跑完

## 29. 2026-04-08 Emotion-Scene Fullscreen Refactor Phase 1 Prototype Boundary

- 针对 `docs/planning/情绪场景训练全屏沉浸式重构PRD.md` 的 Phase 1，仓库中已新增一套**独立原型数据层**：
  - `src/db/schema.sql`
  - `src/db/migrateLegacyData.ts`
  - `src/db/useDatabase.ts`
- 当前重要边界：
  - 这是为全屏沉浸式重构准备的 Phase 1 原型链
  - **不是**当前产品主线 `src/database/` 的替代品
  - 当前情绪模块运行时主线仍然是现有 `sys_training_resource + metadata JSON + emotional engine`
- 当前真实 80 条 `emotion_scene` 已可通过迁移脚本投影到新关系表：
  - source of truth:
    - `docs/references/current-emotion-scenes-export.json`
  - generated support file:
    - `docs/references/emotion-scene-character-names.json`
- 当前 Phase 1 迁移策略已明确：
  - 历史真实数据只原生提供 `cause / need` 两类 prompt
  - Step 1 `emotion` 与 Step 4 `response` 在迁移时动态补齐
  - 历史题干在迁移层统一收口为 `{name}` 占位符
  - `character_name` 通过 `scene_code -> character_name` 映射补齐；缺失时默认 `小朋友`
- 当前 `hints` 的重要边界：
  - `hints` 表在 Phase 1 仅保留结构
  - 当前真实 80 场景没有 prompt 级 hint 文本
  - 前端后续应使用 `recommended_hint_ceiling` + 通用 hint 话术兜底，而不是假设 DB 已有具体 hint 内容
- 当前验证现实：
  - `scripts/verify-emotion-scene-phase1.mjs` 已通过
  - 迁移结果为：
    - `80` scenes
    - `240` clues
    - `320` steps
    - `1040` options
- 当前下一步已明确：
  - 等待用户确认 Phase 1 数据结构
  - Phase 2 第一个动作将是起 `Pinia Store` 骨架，而不是继续修改 Schema

## 30. 2026-04-08 Emotion-Scene Fullscreen Refactor Phase 2-3 State and Media Foundation

- 针对 `docs/planning/情绪场景训练全屏沉浸式重构PRD.md` 的 Phase 2，仓库中已新增核心状态机：
  - `src/stores/useTrainingStore.ts`
- 当前 `useTrainingStore` 已落地的核心能力：
  - `currentStepIndex` 采用 PRD 明确口径：
    - `0 = 引导`
    - `1-4 = 四个答题步骤`
    - `5 = 结算`
  - 已接入：
    - `scene`
    - `steps`
    - `hintLevelPerStep`
    - `answers`
    - `inputLocked`
    - `isTransitioning`
    - `isExitModalVisible`
    - `availableTTSEngine`
  - 已实现：
    - `currentStepData`
    - `parsedQuestionText`
    - `loadScene(sceneCode)`
    - `nextStep()`
    - `recordError()`
    - `recordAnswer()`
    - `calculateStars()`
    - `saveRecord()`
    - `toggleExitModal()`
    - `exitTraining()`
    - `forceNext()`
    - `forceReset()`
    - `forceEnd()`
- 当前重要状态边界：
  - `forceReset()` 只重置当前步骤错误计数，不重置整个训练流程
  - `parsedQuestionText` 是 `{name}` 占位符替换后的唯一题干出口，后续 UI 与 TTS 都应消费它，而不是消费原始 DB 文本
  - Store 内已预留 `watch(currentStepIndex, ...)` 的 TTS 中断占位；真正 TTS 接线尚未开始
- 针对 PRD 的 Phase 3，仓库中已新增媒体抽象层：
  - `src/services/tts/ITTSService.ts`
  - `src/services/tts/EdgeTTSService.ts`
  - `src/services/tts/index.ts`
  - `src/composables/useSound.ts`
- 当前 Phase 3 已落地的技术事实：
  - 已引入 `Howler` 作为全局 SFX 基础依赖
  - `ITTSService` 已支持：
    - `play(text, signal?)`
    - `stop()`
    - `pause()`
    - `resume()`
    - `isAvailable(signal?)`
  - `EdgeTTSService` 已支持：
    - `AbortSignal` 中断
    - 播放前自动停止旧实例
    - `audioUrl` 和 `audioBase64` 双返回形态兼容
    - `ObjectURL` 生命周期释放
  - `useSound` 已提供：
    - 惰性创建 `Howl`
    - `play / stop / pause / resume`
    - `fade / mute / setVolume`
    - `stopAll / muteAll / setGlobalVolume`
- 当前重要媒体边界：
  - Phase 3 只完成前端抽象层，并未完成 `EdgeTTS -> Electron / 本地服务` 的真实接口对接
  - 当前没有 `CosyVoice` 或 `WebSpeech` fallback 实现；只是为后续扩展预留了 `availableTTSEngine` 状态位
  - 当前也还没有把 `useSound` 接入情绪场景训练的新页面触发点
- 当前验证现实：
  - 本轮新增代码相关的 TypeScript 报错已收敛
  - 仓库级 `npm run type-check` 仍被历史旧错误阻塞，主要位置：
    - `src/components/emotional/games/EnergyBallGame.vue`
    - `src/components/emotional/games/VisualSupportOverlay.vue`
    - `src/composables/useEmotionDetector.ts`
- 当前下一步已明确：
  - 开始 Phase 4
  - 第一个动作是先创建 `TrainingSession.vue` 和 `TrainingLayout.vue`，把 `useTrainingStore` 接到 intro 壳子与退出弹窗

## 31. 2026-04-08 Emotion-Scene Fullscreen Refactor Phase 4 UI Shell Landed

- 针对 `docs/planning/情绪场景训练全屏沉浸式重构PRD.md` 的 Phase 4，仓库中已新增全屏 UI 壳子：
  - `src/components/training/ExitConfirmDialog.vue`
  - `src/components/training/TrainingLayout.vue`
  - `src/components/training/SceneIntroStep.vue`
  - `src/components/training/TrainingSession.vue`
- 当前 Phase 4 已落地的入口改动：
  - `src/views/emotional/EmotionSceneTraining.vue` 当前已直接渲染 `TrainingSession`
  - `src/views/emotional/SceneSelector.vue` 进入训练时会额外透传 `sceneCode`
- 当前已验证通过的运行时闭环：
  - 新训练页可初始化 `src/db/` 原型库
  - 可按 `sceneCode` 成功加载真实 80 条 `emotion_scene` 中的任一场景
  - `TrainingLayout` 可显示场景背景图、进度占位与退出按钮
  - `SceneIntroStep` 可显示角色名、引导文案与 mock clues，并通过 `store.nextStep()` 进入 Step 1
  - Step 1 页面已能显示来自原型库的 `parsedQuestionText`
- 当前重要边界：
  - Phase 4 只交付了全屏壳子与引导页，**没有**交付 Step 1~4 的正式答题组件
  - 当前 `currentStepIndex = 1..4` 仍渲染“答题区占位”，不要误写成完整训练流程已交付
  - 当前 `/emotional/emotion-scene` 已被原型链暂时接管；这是一种过渡态，不是旧主线完全退场的正式结论
- 当前新增的重要兼容约束：
  - `src/db/useDatabase.ts` 当前不能直接依赖 `sql.js` 包入口的默认导出
  - 原因：在当前 Vite 浏览器运行时中，`sql-wasm-browser.js` 的默认导出与 `import('sql.js')` 返回形态都已实际复现不稳定
  - 当前处理：运行时加载 `sql.js/dist/sql-wasm.js` 脚本文本，并手动执行 CommonJS 包装后解析 initializer
  - 这属于原型链兼容层；后续若升级 `sql.js` / Vite 或引入更稳定封装，应优先收口
- 当前验证现实：
  - 新训练页已可进入，不再因 `sql.js` 默认导出错误而白屏
  - 页面截图已确认：点击 intro 后可进入 Step 1，但当前只显示“答题区占位”
  - 仓库级 `npm run type-check` 仍被历史旧错误阻塞，位置不变：
    - `src/components/emotional/games/EnergyBallGame.vue`
    - `src/components/emotional/games/VisualSupportOverlay.vue`
    - `src/composables/useEmotionDetector.ts`
- 当前下一步已明确：
  - 开始 Phase 5
  - 第一个动作是创建 Step 1~4 共用的动态答题组件，渲染 `store.currentStepData.options` 并接上 `recordAnswer()` / `nextStep()` 最小闭环

## 32. 2026-04-08 Emotion-Scene Fullscreen Refactor Phase 5 Dynamic Question Flow Landed

- 针对 `docs/planning/情绪场景训练全屏沉浸式重构PRD.md` 的 Phase 5，仓库中已新增真实答题组件：
  - `src/components/training/QuestionPresenter.vue`
  - `src/components/training/ImageOptionCard.vue`
  - `src/components/training/TextOptionBlock.vue`
  - `src/components/training/OptionBoard.vue`
  - `src/components/training/QuestionStep.vue`
  - `src/components/training/training-feedback-sfx.ts`
- 当前 Phase 5 已落地的运行时闭环：
  - `src/components/training/TrainingSession.vue` 已用 `QuestionStep` 替换 Step 1~4 占位
  - `emotion` 题会渲染图片 / 表情卡
  - `reason / need / response` 会渲染文字选项块
  - 点击错误选项会执行：
    - `store.inputLocked = true`
    - 错误音效
    - 红框 + `shake`
    - `store.recordError(...)`
    - 动画结束后恢复当前题点击
  - 点击正确选项会执行：
    - `store.inputLocked = true`
    - 正确音效
    - 绿框 + 勾选态
    - `store.recordAnswer(...)`
    - 延时 `store.nextStep()`
  - `QuestionPresenter.vue` 已接入 `store.parsedQuestionText`
    - 当前存在 `VITE_EDGE_TTS_ENDPOINT` 时会尝试自动播报
    - 无 endpoint 时会降级为不可播报态，不阻塞训练
- 当前新增的重要 UI / 交互边界：
  - `options.feedback_text` 现在必须被视为当前训练流程的一等反馈信息
  - 每次点击选项后，页面中央都会显示高对比度反馈气泡
  - 当前气泡已按用户实测要求改为**常驻显示**
    - 只会在“再次点击其他选项”或“切换到下一题”时消失 / 被覆盖
  - 当前背景遮罩策略已收口：
    - `TrainingLayout.vue` 与 `SceneIntroStep.vue` 已移除 `backdrop-blur`
    - 优先保证儿童能清晰看到完整场景照片
    - 文本可读性主要靠轻量顶部透明 + 底部加深渐变维持
- 当前新增的重要实现边界：
  - 由于仓库里当前没有现成的答题反馈音频资源，`training-feedback-sfx.ts` 先使用内置 data URI 短提示音驱动 `useSound`
  - 这属于原型级过渡实现，不应误写成“正式音频资产体系已完成”
- 当前验证现实：
  - 用户已完成实际交互测试
  - 当前用户明确确认：
    - 背景遮罩问题已修正
    - `feedback_text` 常驻提示行为已正常
  - 仓库级 `npm run type-check` 仍被历史旧错误阻塞，位置不变：
    - `src/components/emotional/games/EnergyBallGame.vue`
    - `src/components/emotional/games/VisualSupportOverlay.vue`
    - `src/composables/useEmotionDetector.ts`
- 当前下一步已明确：
  - 开始补 Step 5 结算页
  - 第一个动作是创建真正的结果页组件，把 `calculateStars()`、`saveRecord()` 和返回 / 重玩动作接到当前训练链

## 33. 2026-04-08 Care-Scene Immersive Refactor Planning Boundary

- 当前 `care_scene` 的现实仍然是：
  - 入口：`src/views/emotional/CareExpressionTraining.vue`
  - 运行时主链：`src/components/emotional/engine/EmotionalInteractionEngine.vue`
  - 当前尚未接入新的 `src/components/training/*` 沉浸式链路
- 本轮已新增两份当前有效的实施文档：
  - `docs/planning/2026-04-08-care-scene-immersive-refactor-plan.md`
  - `docs/plans/2026-04-08-care-scene-immersive-execution-plan.md`
- 当前已明确的重要边界：
  - `care_scene` 可以改造成与 `emotion_scene` 一致的沉浸式全屏体验
  - 但**不应**把 `care_scene` 生硬塞进当前 `emotion_scene` 四步原型表
  - 正确路线应是：
    - 先完成并验收 `emotion_scene` 沉浸式链路
    - 再抽通用沉浸式运行时
    - 再启动 `care_scene` 代码改造
- 当前下一步优先级保持不变：
  - 先补 `emotion_scene` Step 5 结算页
  - `care_scene` 暂不进入实现阶段

## 34. 2026-04-09 Emotion-Scene Phase 6 Result Page and Immersive Shell Update

- 针对 `emotion_scene` 沉浸式训练链，Phase 6 已完成代码落地：
  - `src/components/training/ResultStep.vue`
  - `src/components/training/FeedbackOverlay.vue`
  - `src/components/training/TeacherControlPanel.vue`
  - `src/components/training/TrainingSession.vue`
  - `src/stores/useTrainingStore.ts`
- 当前已确认的运行时能力：
  - Step 5 不再是占位，而是真正的结果页
  - 结果页 `onMounted` 会自动调用 `store.saveRecord()`
  - 结果页当前具备写库防重，不会因重复挂载重复插入记录
  - 正确作答时会触发全屏奖励层
  - `Ctrl + Alt + S` 可切出教师控制台，支持跳题 / 重置本题 / 强制结算
- 当前新增的重要壳层边界：
  - `src/router/index.ts` 已给 `EmotionSceneTraining` 标记 `meta.immersiveShell = true`
  - `src/views/Layout.vue` 在该标记下会隐藏侧边栏、顶部栏和内容区默认 padding
  - 这意味着 `emotion_scene` 当前是“吃满整个应用窗口”的沉浸式训练页，而不是嵌在后台管理壳中的普通业务页
  - 但这**不等于**训练页已单独接管系统级窗口全屏；当前仍依赖 Electron 主窗口既有的 `fullscreen: true`
- 当前新增的重要交互边界：
  - `QuestionPresenter.vue` 当前优先尝试 `EdgeTTS`，无 endpoint 时会回退到 `Web Speech`
  - 这是当前可用性兜底，不应写成正式 TTS 后端方案已验收
  - `QuestionStep.vue` 的 `feedback_text` 当前采用机器人伴学助手式提示气泡
  - 奖励主文案卡片已放到页面中央，避免与提示气泡叠压
  - `2026-04-09` 针对 Step 1 视觉打磨引发的 Step 2~4 回归，当前答题链已明确拆分为两条：
    - `emotion` 题继续通过 `OptionBoard.vue` 渲染情绪卡片
    - `reason / need / response` 当前改由 `TextStepBoard.vue` 专门渲染文本选项
- 当前 Step 1 的最新 UI 现实：
  - 顶部 `Step 1~4` 已改为圆点式进度
  - 场景名称当前常驻在顶部中央
  - 情绪题卡片区正在按 `3 × 2` 规整触摸布局打磨
  - 颜色标签文字已从情绪卡片内移除，改为选中态整卡高亮
  - 一个关键最新决策是：
    - **Step 1 不允许增加“确认选择”按钮**
    - 当前已回退为“单击卡片即作答”，原因是额外确认会增加孩子的认知负担
- 当前重要现实边界：
  - Step 1 页面结构仍处于用户截图驱动的 live preview 微调阶段，尚未形成最终视觉验收结论
  - 后续 Step 1 卡片布局继续调整时，不应再把 Step 2~4 文本题重新并回同一选项板链路；当前分离是为防止“题干还在但文本选项消失”的回归
  - `care_scene` 仍未接入上述 `immersiveShell + Phase 6` 新链路

## 35. 2026-04-10 Care-Scene Immersive First Preview Slice

- `care_scene` 当前已经**不再是“只有文档、尚未开始代码实施”**：
  - 当前仍保留旧默认入口：
    - `src/views/emotional/CareExpressionTraining.vue`
    - `src/components/emotional/engine/EmotionalInteractionEngine.vue`
  - 但当前仓库中已新增一条**非默认沉浸式预览链**：
    - `src/views/emotional/CareExpressionImmersiveTraining.vue`
    - `src/features/emotional/immersive/compileCareSceneImmersive.ts`
    - `/emotional/care-expression/immersive`
- 当前 `useTrainingStore` 已从 `emotion_scene` 固定 4 步假设扩展为：
  - 按步骤数组驱动训练流程
  - 动态计算结果页索引
  - 可承载 `care_scene` 的 3 步流程
- 当前 `care_scene` 预览链已能编译出：
  - Step 1 感受判断
  - Step 2 关心表达选择
  - Step 3 接收者视角判断
  - Result 结算页
- 当前 `care_scene` 重要语义边界已在新链中保留：
  - `preferred`
  - `acceptable`
  - `retry`
- 当前入口边界已明确：
  - 旧默认入口仍保留，**不能**误写成 `care_scene` 已切换到沉浸式主链
  - `src/views/emotional/SceneSelector.vue` 已新增 “沉浸式预览” 开关
  - 开关打开时，`care-expression/select` 点击卡片会进入 `/emotional/care-expression/immersive`
  - 开关关闭时，仍进入旧 `care_scene` 训练页
- 当前记录边界：
  - `care_scene` 预览链的结果页只做总结展示
  - 正式训练记录尚未接入当前产品主线 persistence
  - 因此当前只能描述为“第一段预览链已落地”，不能描述为“完整交付”

## 36. 2026-04-10 Electron Dev Startup Stabilization Boundary

- 当前开发联调链已新增专用启动脚本：
  - `scripts/electron-dev-start.js`
- 当前 `package.json` 中：
  - `electron:dev` 已从并行 `concurrently + wait-on` 改为顺序启动器
- 当前开发环境主进程已新增两条稳定性边界：
  - `electron/main.mjs` 会在开发环境主动等待 dev server 可访问后再 `loadURL`
  - `electron/main.mjs` 已将 `console.log / warn / error` 包装为安全输出，避免资源协议等高频日志因 `EPIPE` 直接打崩主进程
- 当前重要现实边界：
  - 上述修复已落地到代码
  - 但用户还未在修复后完成一次新的 Electron live rerun 验证
  - 因此当前只能描述为“联调稳定性修复已提交，待运行时复验”，不能写成“白屏问题已完全关闭”
- 当前独立已知问题：
  - 本地 `msedge-tts` 依赖仍缺失
  - 这会让 TTS IPC 功能不可用，但当前不应与首页白屏根因混为一谈

## 37. 2026-04-15 Cross-Entry Custom Game Display Baseline

- `cross-entry custom games` 当前新增一条全局实现约束：
  - 新小游戏默认按 `27` 寸触摸大屏、横向优先布局制作，不以手机竖屏为首要基线
  - 进入游戏后默认启用 `immersiveShell`，隐藏平台侧边栏、顶部栏和内容区默认 padding
- 当前该约束已落到：
  - `docs/planning/2026-04-13-cross-entry-custom-games-expansion-plan.md`
  - `docs/planning/2026-04-14-cross-entry-custom-games-wave1-prep-checklist.md`
- 当前已先应用到 `/emotional/games/*` 与 `/games/play` 路由

## 38. 2026-04-15 Cross-Entry Custom Game UI Constraint Update

- `cross-entry custom game` 当前新增两条全局实现约束：
  - 用户可见文案不得直出字段名、状态码、事件名或 `completed + timer_end` 一类实现术语
  - 沉浸式游戏壳必须完整覆盖可视区，不得露出 `Layout` 黑底、底部黑边或未接管背景的外层容器
- `C04_HOURGLASS` 当前已完成最小代码闭环；下一步以手工验收结果为准，不要把未验收状态写成已收口

## 39. 2026-04-15 Custom Game Record Detail Display Constraint

- 跨入口自定义小游戏当前仍共用 `src/views/emotional/GameRecordDetail.vue`
- 任何新增小游戏如果定义了专属 `performance_data`，必须同步补齐 `metricCards / rawRows` 的中文映射
- 教师可见训练记录详情不允许直接暴露 `completed_rounds`、`scenario_ids`、`accuracy_ratio` 等程序字段名
- 数组与枚举字段必须转成业务语言展示，不能直接 `JSON.stringify(...)`

## 40. 2026-04-16 Cross-Entry Custom Games Wave Transition Update

- `S04_GIFT_MATCH` 已完成最小运行链路并通过人工验证
- 当前现实：`Wave 1` 的 6 个目标都已进入正式运行链路
- 新的全局约束：剩余小游戏先完成功能闭环，跨游戏 UI 细节统一延后到所有目标完成后再集中收口
- 下一步固定为 `S01_BURGER`，作为首个验证共享场次 / 组事务写入的 `Wave 2` 目标
