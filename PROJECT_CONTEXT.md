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

## 7. 当前新增全局约束

- `2026-04-19` 起，在继续新的功能开发或运行进一步代码验证前，必须先对现有脏工作区做分桶基线与抽样审计。
- 当前已知脏工作区规模为 `4061` 个文件；后续会话默认先参考 `docs/reports/2026-04-19-dirty-worktree-baseline.md` 再决定恢复、保留或归档策略。

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

- `.planning/` 曾创建 v1.7 的正式规划材料（已于 2026-07-08 GSD 残留清理中整体移除，以下路径仅作历史记录）：
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
  - `.planning/phases/20-cnbs-r2016-runtime-qa-standard-verification/20-VERIFICATION.md`（已于 2026-07-08 GSD 残留清理中移除）曾记录本阶段验证结论
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

## 41. 2026-04-20 Auth Hardening and Activation Delivery Gap

- `Wave 1 / W1-01` 已完成第一段代码落地：`src/utils/password-security.ts` 已成为当前密码哈希真源，统一使用 `Web Crypto API + PBKDF2-SHA256`
- `src/database/api.ts`、`src/database/init.ts`、`src/database/sqljs-init.ts` 已切到新哈希口径；登录页管理员紧急恢复入口当前仅限 `DEV` 环境显示，并重置为 `admin123`
- 当前交付态新增全局约束：模块授权不能只停留在 runtime 消费层；`license-generator-dist/generate-license.js` 必须输出许可证 `am` 授权模块数组，否则不可对外承诺“按模块授权”

## 42. 2026-04-20 Activation Delivery Hardening Follow-up

- `license-generator-dist/generate-license.js` 当前已成为交付态模块授权真源，默认输出 5 个顶层模块的 `am`
- 生产构建新增硬约束：登录页 DEV 管理员重置入口必须被构建裁剪，不能只靠运行时 `import.meta.env.DEV` 隐藏
- 下一步固定为：让发码工具支持从 `sensory / emotional / social / cognitive / life_skills` 中选择子集授权

## 43. 2026-04-22 Packaged SQL.js Loading Constraint

- 打包版 Electron 当前新增全局约束：`sql.js` runtime 与 wasm 必须通过 Vite `?url` 产物地址加载，不能再写死 `/sql-wasm.js` 或 `/sql-wasm.wasm`
- 生产环境数据库初始化当前新增全局约束：`src/database/init.ts` 失败时必须直接抛错，不能静默降级到 `MockDatabase`
- 原因：静默降级会把初始化故障伪装成登录失败，并导致新机器首次启动时不生成真实 `database.sqlite`

## 44. 2026-04-23 Assessment Welcome Content Contract Update

- 统一评估入口当前新增全局契约：`ScaleDriver.getWelcomeContent()` 应返回结构化 `WelcomeContent`，支持 `sections[].items[]` 与 `reminder`
- 评估开始前弹窗文案当前以 `docs/references/评估量表温馨提示.md` 为事实来源；后续调整先改参考文档，再改对应 driver
- `FMDA` 目录展示题量当前已修正为 `88项`；评分链路的题量真源仍为 `FINE_MOTOR_QUESTIONS.length`

## 45. 2026-04-30 Authorization Visibility Contract Update

- 首页快捷区、侧边栏、游戏训练/器材训练/训练记录菜单当前新增统一授权可见性约束
- 全局入口继续可见可点：`能力评估`、`游戏训练`、`器材训练`、`训练记录`
- 模块入口未授权时直接隐藏，不再显示“未授权 / 锁定态”占位
- 首页快捷区当前口径固定为：
  - 全局：`快速发起评估`、`录入训练记录`
  - 模块：`启动感官游戏`（`sensory`）、`情绪场景训练`（`emotional`）
- 后续新增同类入口时，应复用 `src/utils/access-visibility.ts`，避免首页与导航再次分叉

## 46. 2026-04-30 Self-Hosted Update Source Contract Update

- 桌面端自动更新默认源已从 GitHub Releases 切到 `generic provider`
- 当前默认更新地址固定为 `http://124.220.104.199/scgp/win`
- 旧默认地址 `https://upadate.hzxckj308.com/scgp/win` 会在读取本地更新配置时自动迁移到当前地址
- Windows 更新安装包文件名当前固定为 `scgp-setup-${version}.exe`，用于保证 `latest.yml`、安装包与 `.blockmap` 命名一致
- `release/` 目录中的部署说明与更新三件套属于发布交付物，不作为仓库常规提交内容

## 47. 2026-05-11 Self-Care task_training Platform Mainline Update

- `task_training` 当前已进入平台共用训练资源主链：资源中心可见，训练计划可选，首页今日计划可启动。
- 统一启动器 `src/utils/training-launch.ts` 已将 `task_training` 接到 `/self-care/tasks` 壳入口。
- `自理训练` 顶层入口和 `task_training` 资源继续使用 `life_skills` 授权口径。
- 当前仍只是阶段 1 平台底座补链；任务 CRUD、执行页、记录详情页尚未实现。

## 48. 2026-05-11 Self-Care Phase 2 Internal Task Library Update

- src/database/self-care-task-api.ts �ѳ�Ϊ 	ask_training �� self-care �ڲ������� CRUD ��װ���̶�ʹ�� module_code = life_skills �� esource_type = task_training��
- /self-care/tasks �Ѵ�·�ɿ�����Ϊ��ʵ�����б���TaskList / TaskEditor �ѽ�ͨ�½����༭�����á��ָ���С�ջ���
- src/views/resource-center/editors/TaskTrainingEditor.vue ��ǰ�� 	ask_training ��ͬ metadata �༭����Դ����Դ������ /self-care/tasks �༭������ͬһ��Լ��
- ��ǰ��δ����׶� 3��ѡѧ��ҳ��ִ��ҳ���Լ� 	raining_records + training_session �־û���·��δ���롣

## 49. 2026-05-11 Self-Care Execution Mainline Update

- /self-care/execute/:taskId/:studentId �ѳ�Ϊ 	ask_training �ĵ�ǰִ������ڣ�ѡѧ��ҳ��ͳһ��������ֱ�ӽ����·�ɡ�
- src/database/self-care-training-api.ts �ѳ�Ϊ����ѵ��ר��д����ͳһд�� 	raining_records + training_session��
- ��ǰд����Լ�̶�Ϊ��	ask_id = NULL��esource_id = sys_training_resource.id��session_family = task_training��entry_code = life-skills��
- src/views/self-care/TaskExecution.vue ��ǰֻ��ȡ sys_training_resource.meta_data.steps[]�����ض��� 	ask_step / train_log��

## 50. 2026-05-13 Plan Resource Selector Contract Update

- ѵ���ƻ�����Դ���� > ������Դ��������ǰֻ����������ɸѡ��ģ�� + ���ͣ������²�����ʾ�����㡰ȫ������ / �й�ѵ�� / ��������ɸѡ����
- �õ�����ǰģ��ھ��̶�Ϊ 9 �����ѵ�� / �������� / �������� / ������� / �й�ѵ�� / �������� / �����̾� / �罻��ͨ / ��ϸ������
- �õ������Ϳھ���ǰ�̶�Ϊ��ȫ������ / ��Ϸ / ���ġ�
- custom game ��Դͬ����ǰ���븲��ȫ�� 25 ����emotional-regulation / fine-motor / social-communication / soothing-aids / life-skills �� 5 ������������ֻͬ���������� 5 ����
## 51. 2026-05-20 Entitlement Shadow Mapping and Entry Gating Update

- 当前新增独立 entitlement 层：`src/features/entitlements/entitlement-catalog.ts`，旧 `sensory / emotional / social / life_skills / cognitive` 已与新授权能力包解耦。
- `src/stores/auth.ts` 当前以 `effectiveEntitlements` 作为前端授权事实来源；`hasEntitlementAccess()` 不再在调用时临时展开旧模块。
- `src/utils/training-entry.ts` / `src/utils/equipment-training-entry.ts` 当前新增 `requiredEntitlement`，训练入口已与 `moduleCode` 数据归属分离。
- 游戏训练 / 器材训练 / 训练记录入口列表、首页快捷入口、侧边栏与相关路由守卫当前已优先按 entitlement 判权。

## 52. 2026-05-27 Emotion Detection Capability Expansion

- `useEmotionDetector` 表情检测能力已从 4 种扩展为 6 种：`Happy | Surprised | Angry | Sad | Fearful | Neutral`
- 新增 `Sad = mouthFrown × 0.6 + browInnerUp × 0.4`，`Fearful = eyeWide × 0.3 + browInnerUp × 0.4 + jawOpen × 0.3 − happy × 0.5`
- `EmotionType` / `EmotionScores` 类型已同步扩展，所有消费 `useEmotionDetector` 的游戏（表情能量球、表情侦探等）自动受益
- 新增 `G09_EXPRESSION_DETECTIVE` 表情侦探游戏已接入情绪调节游戏大厅完整注册链

## 53. 2026-06-26 Emotional Immersive Training Record Closeout

- `emotion_scene` 与 `care_scene` 沉浸式训练结束页已统一接入 `EmotionalTrainingRecordAPI.persistSession()`。
- 正式写入范围：`training_records`、`training_session`、`emotional_training_session`、`emotional_training_detail`、`report_record`。
- `emotion_scene` 从选择页进入时必须携带 `studentId + resourceId + sceneCode` 才写正式记录；缺上下文时保留旧 prototype 兼容保存路径。
- 逐步明细会记录错误点击与最终答案，不只保存最终正确结果。

## 54. 2026-07-07 游戏 IEP 闭环扩展至精细动作/生活自理（Phase 1，代码级落地，运行时待验）

- 游戏训练 IEP 报告闭环已从「感官经典 + 社交沟通」扩展到「精细动作(F03) + 生活自理(L03/L05)」三类 Tier1 游戏，完整路径：完成 → 写 `training_records` + `report_record` → 自动跳 `IEPReport` → 可导 Word。
- 新增全局约束：`src/utils/game-performance-normalizer.ts` 的 `normalizeGameMetrics()` 是游戏 performanceData → 标准指标（accuracy/avgResponseTimeMs/durationSec/hasRealData）的**唯一提取真源**；落库链路 `runModuleIepChain`、`IEPGenerator`、`IEPReport.vue` 三处必须只调它，禁止各自重复提取。
- 内部维护 `GAME_EXTRACTION_RULES`（gameCode → 提取规则）表，集中字段命名差异/单位换算/量纲归一；Phase 2/3 扩展新游戏只在此表加行，不改 `normalizeGameMetrics` 主体。
- 触发守卫口径：按 `trainingEntryCode ∈ {social-communication, fine-motor, life-skills}` 放行，**不是** `moduleCode`。原因是 EMOTIONAL 模块同时含 G(情绪调节) 与 C(安抚教具)，二者都不应出 IEP。
- `IEPReport.vue` 按 `raw_data.gameCode` 前缀（S/F/L）路由分支，因为 `getTrainingRecord` 的 SELECT 不含 `module_code` 列，且 fine-motor 的 `module_code` 实为 `'sensory'`（与经典感官同列），无法用 module_code 区分；经典感官记录无 gameCode，走原 `generateReport` 路径不变。
- 当前重要现实边界（不得写成已收口）：
  - 代码级已落地，`npm run type-check` exit 0，归一化层 25 条断言（含 L05 的 0-100 ÷100、L03 字段名 `duration_seconds` 陷阱、`{event}` 空壳降级）全过。
  - 但 F03/L03/L05 三游戏 + 社交 S01/S06 + G09 的真机 E2E 尚未跑，不得写成运行时已验证。
  - Phase 0 的 G09 emit 缺陷已独立修复并提交（`448d292`），与本 Phase 分离。
- 不扩展项（产品口径）：C 类（安抚教具整组）+ G01/G03/G04/G08/G09 不出 IEP，保留徽章 + `game_emotion_records`。
- 规格来源：`docs/plans/2026-07-07-game-iep-extension-plan.md`（当前为 untracked 草案，未随任务提交）。

## 55. 2026-07-08 游戏 IEP 闭环扩展 Phase 2（Tier2 F04/L01/L02/L04，代码级落地，运行时待验）

- 游戏训练 IEP 报告闭环已从 Tier1（F03/L03/L05）扩展到 Tier2 四游戏（F04 轨道修补匠 / L01 洗手小能手 / L02 我会穿衣服 / L04 摆桌子帮帮忙），复用 Phase 1 的归一化层 + `runModuleIepChain` + 生成器框架 + IEPReport 前缀路由，守卫 / 路由 / 统计卡可用性无需改动。
- 新增能力：归一化层 `GAME_EXTRACTION_RULES` 支持「派生正确率」`accuracyDerived = correct/(correct+wrong)`（优先于 `accuracyFields`），用于 Tier2 这类没有单一正确率字段、只能由正确/错误计数派生的游戏。派生要求 correct+wrong 都有效且分母>0，否则记 null（渲染层隐藏准确率卡）。
- 字段已逐一对照真实 emit：F04 `correct_placements`+`wrong_placements`+`average_placement_ms`；L01 `correct_action_count`+`wrong_action_count`+`average_action_ms`；L02 `completed_item_count`+`wrong_placements`+`average_selection_ms`；L04 `completed_places`+`wrong_placements`+`average_placement_ms`；L01/L02/L04 时长均为 `total_duration_seconds`(秒)。
- F04 时长用会话兜底（`{kind:'session'}`，与 F03 一致）：`TrackBuildGame.vue` 的 `average_layout_ms` 是「每个关卡布局的平均耗时」而非总训练时长，不能当 `durationSec`（方案文档原列 average_layout_ms 系误读）。
- `iep-generator.ts` 的 `generateFineMotorSections` 加 F04 分支、`generateLifeSkillsSections` 加 L01/L02/L04 三分支（各 2 段：准确率域 + 步骤/顺序/空间定位域），缺指标一律降级不编造数值；F/L 中文名映射与通用 summary 均已在 Phase 1 就位。
- 当前重要现实边界（不得写成已收口）：
  - 代码级已落地，`npm run type-check` exit 0；一次性 jiti 断言（15 条，含派生正确率、wrong=0 完美局、缺 wrong 降级、0/0→null、{event} 空壳、Tier1/社交无回归）全过后即删除，未留测试文件。
  - F03/L03/L05 + F04/L01/L02/L04 + 社交 S01–S06 + G09 的真机 E2E 仍未跑，不得写成运行时已验证。
  - Phase 3（Tier3 F02/F01/F05/G07，可选）待用户决定。
- 不扩展项不变：C 类（安抚教具整组）+ G01/G03/G04/G08/G09 不出 IEP，保留徽章 + `game_emotion_records`。
- 规格来源：`docs/plans/2026-07-07-game-iep-extension-plan.md`。

## 56. 2026-07-08 游戏 IEP 闭环扩展 Phase 3（Tier3 F02/F01/F05，近似指标口径，G07 延后，代码级落地运行时待验）

- 游戏训练 IEP 报告闭环已扩到 Tier3 三个近似指标精细动作游戏（F02 连线小星座 / F01 云朵擦擦擦 / F05 刺破慢气球），三者 moduleCode=sensory、trainingEntryCode=fine-motor（已在 IEP 放行集合内），复用 Phase 1 的归一化层 + `runModuleIepChain` + 生成器框架 + IEPReport 前缀路由，守卫 / 路由 / 统计卡可用性无需改动。
- 新增能力：归一化层 `GAME_EXTRACTION_RULES` 支持「数组型反应时」`reactionArrayField`（取数组元素 ms 的平均，优先于 `reactionFields`），用于只产出反应时数组、无标量均值的游戏（F05 的 `window_response_ms`）。保持归一化层为唯一提取入口。
- Tier3 近似指标口径（非经典正确率）：F02 accuracy=`path_precision_ratio`(ratio，可能 null) + reaction=`average_constellation_ms`；F01 accuracy=`cleared_ratio_peak`(ratio)，无反应时指标；F05 无 accuracy（核心是抑制控制 `early_taps`），reaction 由 `window_response_ms` 数组取均值。F01 无反应时卡、F05 无正确率卡，对应统计卡自动隐藏。
- 字段已对照真实 emit：F02 `path_precision_ratio`/`completed_constellations`/`average_constellation_ms`；F01 `cleared_ratio_peak`/`total_strokes`；F05 `successful_pops`/`early_taps`/`window_response_ms`(数组)/`max_streak`。三者均无总时长字段，duration 走会话兜底。
- `iep-generator.ts` 的 `generateFineMotorSections` 加 F02（轨迹精度+路径跟随）、F01（擦拭覆盖率+手眼协调持续控制）、F05（抑制控制与出手时机+反应稳定）三分支；F05 的抑制控制评估读 `metrics.extra.early_taps`（extra 透传是 Phase 1 既定用法，未在生成器里重复提取标准三列）。
- G07_MONSTER 经决定**延后**为独立任务：属 emotional-regulation 入口（不在 IEP 放行集合），启用需改守卫 + G07 专属白名单（否则 Tier4 的 G01/G03/G04/G08/G09 会被一起放进 IEP）+ IEPReport 情绪匹配分支 + 新生成器，风险更高，与方案文档「二期再议」一致。
- 当前重要现实边界（不得写成已收口）：
  - 代码级已落地，`npm run type-check` exit 0；一次性 jiti 断言（Phase 3 共 19 条，含 F02 精度+null 降级、F01 无反应时、F05 数组均值+early_taps 经 extra+空数组/空壳降级、Tier1/2/社交无回归）全过后即删除，未留测试文件。
  - 全部已接入游戏（经典感官 + 社交 S01–S06 + Tier1 F03/L03/L05 + Tier2 F04/L01/L02/L04 + Tier3 F02/F01/F05）的真机 E2E 仍未跑，不得写成运行时已验证。
  - G07 独立后续任务待启动。
- 不扩展项不变：C 类（安抚教具整组）+ G01/G03/G04/G08/G09 不出 IEP，保留徽章 + `game_emotion_records`。
- 规格来源：`docs/plans/2026-07-07-game-iep-extension-plan.md`。

## 57. 2026-07-08 Sensory 手势游戏（hand-games）现状盘点

- 当前 sensory 手势游戏集中在 `src/components/games/hand/`，清单：
  - `AirXylophoneGame.vue`（空气木琴）
  - `BubblePopGame.vue` + `bubble-pop-game.ts`（打泡泡）
  - `WoodBlockPuzzleGame.vue` + `wood-block-puzzle.ts`（木块拼图 / 形状匹配）
  - `HandCameraLayer.vue`（手势摄像头共享层）
- 形状匹配类游戏当前以**独立组件**结构落地：共享视觉件 `WoodenShapeBlock.vue`（`src/components/games/shared/`）由 `WoodBlockPuzzleGame.vue` 与 `GameGrid.vue` 复用，不再把形状/木块逻辑内联回 `GameGrid.vue`。
- 专题测试：`scripts/tests/sensory-hand-games.test.mjs`、`scripts/tests/sensory-hand-gestures.test.mjs`。
- 重要实现边界：后续新增形状匹配/手势类感官游戏，应沿用「`hand/` 下独立组件 + `shared/` 复用视觉件」结构，不要把逻辑塞回 `GameGrid.vue` 造成膨胀。

## 58. 2026-07-09 推荐引擎「能力巩固」模式 + usage_count 死代码接通

- 器材推荐引擎已从「单一弱势驱动」扩展为双模式（`recommendation-engine.ts`）：
  - `mode='weakness'`：原逻辑，评估有弱势时按弱势领域 + 标签打分推荐（行为不变，仅补 `mode` 字段）。
  - `mode='consolidation'`：评估正常/优秀（无弱势）时，按全部 equipmentSupported 域 + entitlement 硬过滤 + `usageCount` 降序，每域取 top-3 / 默认勾选 1，产出「能力巩固精选」。由 `RecommendationResult.mode` 区分，UI（`RecommendationDrawer`）按模式切「发展概况」卡片与标题。
- 评估完成弹窗入口文案动态化：`scoreResult.level ∈ [优秀,高常,正常]` → 「能力巩固推荐」，否则「器材推荐」（`CompleteDialog`）。
- `usage_count` **不再是死字段**：`stores/recommendation.ts` 的 `createDraftPlan()` 在计划挂载成功后对选中器材调 `ResourceAPI.incrementUsageCount(id)`。初期全 0 时巩固精选退化为 `created_at` 顺序，随使用累积真实化。训练记录写入路径计 +1 仍为后续可选增强（碰训练记录主表，独立任务）。
- 巩固模式计划目标兜底：无弱势维度时从选中器材所属域派生 `${label}能力巩固与泛化`（`plan-generator.ts`）。

## 59. 2026-07-10 认知发展模块（BRIEF + 瑞文 CRT）接入 + 评估通用图片选项能力

- 能力评估新增「认知发展」tab（`cognitive` entitlement 已 active），挂 Cnbsr2016（复用）、BRIEF 执行功能问卷、瑞文 CRT 图形推理三个量表。BRIEF/CRT 均走「自编题目/原创矩阵 + 占位常模」DRAFT 路线，规避版权（BRIEF 非 PAR 原题、CRT 非 Pearson 原图），仅筛查/监测用。
- 评估渲染层新增**通用图片选项能力**：`ScaleOption`/`ScaleQuestion` 加 `imagePath?`，`QuestionCard.vue` 通用分支新增题干图 + 2×3 图片选项网格。CRT 矩阵/选项图由 `src/utils/crt-matrix.ts` 按 SPM 五组规律程序化生成 SVG→data-URI，经 `resolvePresetResourceUrl` 透传。后续图形绩效题（Phase 3 综合认知自测）复用此通路，无需新建专用分支。
- 持久化范式：每量表专属 `_assess` 表 + `report_record.report_type` 白名单（init.ts 新库 CHECK + migrate-report-constraints.ts 重建表 CHECK + needsMigration 判定）。新量表接入照此复刻（BRIEF/CRT 均如此）。
- ✅ 版权/合规（2026-07-15 修订）：`assets/resources/images/raven60/`（420 张瑞文 SPM 图）**已取得授权**，当前仅本地保留（已加入 .gitignore），暂不纳入版本库；认知模块 CRT 正式版仍用代码生成原创矩阵。如需接入 raven60 可直接纳入，无版权障碍（§59 末尾「不纳入/接入须先确认版权」的旧约束已解除）。
- 现实边界：BRIEF+CRT 代码级 type-check + training-route-access 4/4 通过，均未提交；真机 E2E 未跑；题目/常模 DRAFT 待专业心理测量审核。

## 60. 2026-07-15 认知模块 Phase 3（cognitive_self）完成 + raven60 授权状态澄清 + 文档对齐

- Phase 3「综合认知自测·视空间图形匹配绩效题」(cognitive_self) 已实现并提交推送：拆 2 提交 `7dd6516`（数据层 + CognitiveSelfDriver + useTrialTimer 计时引擎 + PerformanceTrialBoard）+ `b735071`（cognitive_self_assess 表 + 注册 + 目录 + 维度映射 + 路由 + Report.vue）。main = origin/main（0/0），type-check ✅、training-route-access 4/4 ✅。
- 评估主链首个试次级真反应时绩效题：`ScaleDriver.isPerformanceTask` flag 分流，`PerformanceTrialBoard` 自包含 `useTrialTimer`（刺激呈现锚定的真 RT），经 emit→handleAnswer 覆盖既有「伪 RT」写入 `ScaleAnswer.responseTime`，既有 14 量表零回归。
- ⚠️ 现实边界：真机 E2E 未跑；题库（2 维度 match_basic/match_detail 各 6 题，4 选 1）与常模均为 DRAFT，需专业心理测量审核 + 本地常模采集；MVP 无强制时限（推迟 Phase 3.1）。
- raven60 版权状态反转：420 张瑞文 SPM 图**已取得授权**，当前仅本地保留（加入 .gitignore），暂不纳入版本库；§59 末尾「不纳入/接入须先确认版权」的旧约束已解除，如需接入可直接纳入。
- 清理：`AGENTS.min.md`（被 `AGENTS.md` 统一规则源取代）正式删除；交接文档（`.continue-here.md` / `会话启动.md` 本次交接区块）刷新为 Phase 3 已提交推送状态，修正此前「未提交/方向待定」的滞后表述。

## 61. 2026-07-15 A4 资源文件生命周期 Phase 1：托管路径规则 + 删/替即清物理文件

- 资源物理文件判定规则（**全局约束**，备份 / GC / 新资源功能共用，见 `src/utils/resource-file-refs.ts`）：
  - 托管（可删 / 进备份）前缀 = `uploaded/`、`teaching-materials/`
  - 预置（永不删 / 不进备份）前缀 = `docs/`、`images/`、`videos/`、`audio/`（随包 `assets/resources`）
  - 唯一正确可写根 = `userData/resources`（协议 `resource://` 读序：userData/resources → assets/resources，未命中 -6）
- `sys_training_resource` 删/替现在清物理文件（`hardDeleteResource` / `updateResource` 钩入 `src/database/resource-api.ts`）：删前抽 `cover_image` + `meta_data` 托管引用 → **跨表计数**（sys_training_resource cover/meta LIKE + teaching_material.file_path 全等）== 0 才删，防误删共享；软删 `deleteResource` 仍不动文件（可恢复语义）。
- 公共文件服务 `src/utils/resource-file-service.ts`（`resolveAbsolutePath` / `deleteManagedFile` / `getManagedRoot`）；`teaching-material-file-manager.ts` 已改为复用（对外 API 不变）。Phase 2 备份 / Phase 3 GC 复用此服务。
- ⚠️ 残留技术债：`src/utils/resource-manager.ts`（link B，用废弃 `getAppPath()` = 安装目录/resources，生产路径 bug）有 1 处活引用（`PlanList.vue handlePreviewResource → openWithSystem`）未删，迁移到新服务另起子任务；link A（`ResourceUpload.vue` + `SAVE_ASSET` IPC）已删。
- 现实边界：Phase 1 type-check ✅ + 单测 ✅，真机验证待跑；Phase 2（备份纳入物理文件 zip 归档 v3.0）/ Phase 3（孤儿 GC）未启动。计划 `docs/plans/2026-07-15-a4-resource-file-lifecycle-plan.md`。
- AI 生图功能整体移除（2026-07-15）：链路 D（情绪场景 / 表达关心编辑器的 Gemini 场景图生成）确认为忘删的未用功能，整体删除 `src/services/scene-image-generation.ts` + `main.mjs` Gemini 生图基建（GEMINI_IMAGE_MODEL / getGeminiApiKey / generateGeminiSceneImage / sanitizeFileSegment / mimeTypeToExtension + `ai:generate-scene-images` IPC）+ 两 editor AI 按钮/候选网格/handlers + §3.5 候选图清理 helper（`purgeAbandonedSceneCandidates` / `ManagedFileRef`）；保留 `imageUrl` 手动输入。type-check ✅，diff 5 文件 +3/-515。link D 孤儿源从根消除（比 §3.5 regenerate 清理更干净）。

## 62. 2026-07-15 A4 资源文件生命周期 Phase 2：备份纳入物理文件 zip 归档（v2.0→3.0）

- 备份格式升级 `BACKUP_VERSION` 2.0→3.0，`SUPPORTED_BACKUP_VERSIONS` 保留 1.0/2.0（降级兼容）；恢复 v1.0/2.0 备份时仅提示「不含资源文件」不报错。
- `BackupData` 增 `resourceArchive?: { version, fileCount, totalBytes, checksum, payload }`（payload = zip 归档加密串）；`metadata.resourceArchive` 存摘要供 `getBackupInfo` 不解密展示。载体仍单 `.dat`。
- 加密二进制能力 `src/utils/crypto.ts` 新增 `encryptBytes` / `decryptBytes`（Uint8Array↔WordArray↔AES，纯 crypto-js）/ `md5Bytes`（完整性 checksum）；round-trip 单测 `tests/crypto-bytes.test.ts` ✅。
- 新增运行时依赖 **`fflate`**（纯 JS zip，无原生编译，符合 AGENTS §5 禁止清单）；`main.mjs` 加 `pack-resource-archive`（仅 `uploaded/` + `teaching-materials/` 子树）/ `unpack-resource-archive`（防遍历）/ `walk-dir`（递归列目录，Phase 3 GC 复用）IPC + `walkDirRecursive`。
- `backup.ts` `exportData(includeResources=true)` 打包→加密→入 BackupData；`importData` 在 DB 事务提交后 `restoreResourceArchive` 解包写回，失败不阻断数据恢复。
- ⚠️ **类型陷阱**：`env.d.ts` 是 `window.electronAPI` 实际生效声明（内联对象类型）；`src/types/electron.d.ts` 的 `declare global` 未进编译，但其 `ElectronAPI` 接口仍被 `src/workers/db-bridge.ts:20` import。改 `window.electronAPI` 类型须改 `env.d.ts`；两处重复声明是既有债。
- 现实边界：Phase 2 type-check ✅ + crypto/fflate round-trip ✅，**真机验证待做**（导出→清库清 `userData/resources`→恢复→资源图片/教具恢复可显；2.0 旧备份不报错）；建议与 Phase 3 真机合并。commit `809257d`。

## 63. 2026-07-16 AI 聊天智能体子系统（DeepSeek 接入，代码级落地，运行时待验）

- 新增子系统：管理员预设「提示词+技能」打包成角色（当时仅有「特教老师」初始种子，现已按 §71 升级为 5 个内置场景智能体），普通老师经全局悬浮入口（`App.vue` 挂 `AiAssistant.vue`）流式提问；模型接 DeepSeek，每校（=每个本地客户端）单独配 API Key 与月度额度。
- 架构：DeepSeek 调用在 **Electron Main 进程**（`electron/handlers/ai.mjs`，绕 CORS），渲染进程只经 IPC 传 API Key【密文】，明文 Key 仅存 Main 内存；流式经 `event.sender.send('ai:chunk/done/error')` 回推（用 handler 自带 sender，无需 mainWindow 引用）。
- 数据：新建 3 表 `ai_agent`/`ai_chat_session`/`ai_chat_message`（`init.ts` 的 `initializeAITables`，模块化建表范式，幂等）；provider 配置（API Key 密文/base_url/模型/预算/截断/总开关）复用 `system_config` KV 表。数据门面 `AIApi extends DatabaseAPI`（`src/database/ai-api.ts`）。
- 安全/加密：API Key 用 `crypto.ts` 的 `encryptData`/`decryptData`（AES_SECRET 源码常量）加密，密文存 `system_config`，随 `database.sqlite` 备份**跨机迁移**。威胁模型=防明文落盘（用户选定，非高安全）；Main 进程复刻 `decryptData` 解密。
- 授权/额度：独立开关（配有效 Key 即用，**不**耦合训练 entitlement、不改激活码签发端）；软额度按 DeepSeek `usage` 本地记账估费（`ai_chat_message` 明细 + 本月聚合），超预算可选截断。
- DeepSeek 事实（已核对官网 `api-docs.deepseek.com`，2026-07）：默认模型 `deepseek-v4-flash`（`deepseek-chat`/`deepseek-reasoner` 2026-07-24 弃用）；端点 `${baseUrl}/chat/completions`（baseUrl 默认 `https://api.deepseek.com`，勿硬编码 `/v1`，否则 baseUrl 带 /v1 时双拼 404）；估费 1/0.02/2 元·百万token（cache miss/hit/output，v4-flash）；默认非思考 `thinking.type=disabled`（避免 reasoning_tokens 计费）；流式 `stream_options.include_usage` 末块带 usage；`prompt_tokens = prompt_cache_hit + prompt_cache_miss`。
- 现实边界：4 Phase type-check ✅，**真机端到端验证待做**（配真实 Key 跑通测试连接+流式问答+备份迁移）；**未提交**。plan：`.claude/plans/velvety-foraging-perlis.md`。
- **更新（2026-07-16 #2）**：真机验证全绿并提交本地 main；增会话按 `user_id` 隔离（每人只看自己，admin 有「全部会话」管理视图，全局预算+全局 Key，旧 NULL 会话迁移归 admin=1）；`setConfig`/`saveAgent` 改 `ON CONFLICT … DO UPDATE` 原子 upsert，修 sql.js read-then-write 撞 `system_config.key`/`ai_agent.code` UNIQUE 的隐患。

## 64. 2026-07-16 AI 智能体细化一期 Phase 1：多 provider 抽象（豆包接入 + 能力位，代码级落地，DeepSeek 侧真机绿）

- 多 provider：新建 `ai_provider` 表（code/base_url/api_key_enc/default_model/能力位 `supports_vision/tool_calls/thinking`/enabled/sort），能力位 Phase 1 以 **provider 为粒度**；老库 `system_config.deepseek_*` 迁入 `ai_provider.deepseek` 行（幂等不覆盖已配置），全局（active/budget/block/总开关）留 `system_config` KV；`getProviderConfig` = active provider 行 + 全局 KV 组合视图；旧 `deepseek_*` KV 迁移后保留（新版只读 provider 行，旧 KV 作孤儿不参与判权）。
- 豆包（火山方舟，已核对官方文档 2026-07）：种子 doubao 行（`https://ark.cn-beijing.volces.com/api/v3`，vision=1/tool_calls=1/thinking=0/enabled=0），走 OpenAI **Chat Completions** 兼容（`${baseUrl}/chat/completions`，Bearer 鉴权），**model 填推理接入点 ID `ep-xxx`**（用户特有，种子留空不可预填）；未用 `/responses`。
- thinking 条件化：`ai.mjs` 的 `thinking:{type:'disabled'}` 改按 `supportsThinking` 条件展开（DeepSeek 加、豆包不加，规避 OpenAI 兼容接口对未知字段拒收）；`describeHttpError` 文案去 DeepSeek 硬编码（传 `providerName`）；IPC payload 加 `supportsThinking`/`providerName`（生效类型在 `env.d.ts`，非 `src/types/electron.d.ts`）。
- 现实边界：type-check ✅；真机 DeepSeek 侧绿（老库 Key 迁移 + 流式不回归）；**豆包连接/流式待火山方舟 Key + 接入点 ID 后补验**。已提交本地 main（`1548186`）。plan：`.claude/plans/purring-riding-pie.md`（Phase 1–5，Phase 1 完成，Phase 2 待开）。

## 65. 2026-07-16 AI 智能体 Phase 2（function calling）+ Phase 3（图片 vision）完成

- Phase 2（`affb747`）：渲染端 tool 循环（`src/services/ai-tool-loop.ts` + `ai-tools.ts` 7 工具，含 list_equipment），Main 仅透传 tools + 解析 tool_calls（零数据层改造，不破「明文 Key 只在 Main」）；非流式 MAX 5 轮，纯问答保留流式零回归；tool 过程不入库。
- Phase 3（`074431e`）：多模态 content 全链路（`buildMessages` 数组分支 + 双声明 aiChat content 联合类型 + tool-loop messages + sendChat 出站拼「最近1轮带图」）；新建 `src/utils/ai-attachment-manager.ts`（图片落 `uploaded/ai-attachments/{sessionId}/` + FileReader→dataUrl + resource:// 展示）；按 `supportsVision` 能力位开关，DeepSeek 无 vision 时 UI 禁用图片按钮。主链真机已验（豆包 `doubao-seed-2-1-turbo-260628` + Chat Completions + `image_url` 看图回答）。
- ⚠️ 全局约束（影响后续）：任何新附件/文件引用源必须纳入 `src/utils/resource-reconcile.ts` 的 `collectReferencedPaths`，否则 A4 孤儿 GC 会当孤儿删（Phase 3 已加 `ai_chat_message.attachments`；Phase 4 文档附件同理）。附件落 `uploaded/` 自动进 A4 备份 + GC。
- 现实边界：type-check ✅，Phase 3 主链真机已验；防御项（多轮重发 / GC 回归 / deleteSession 清文件 / vision+FC 同请求）待补验；canvas 图片压缩留后。剩 Phase 4（文档 PDF/Word，需新依赖 `pdf-parse`+`mammoth` 待确认）+ Phase 5（技能包 `ai_skill`/`ai_agent_skill` 两表）。

## 66. 2026-07-16 AI 智能体 Phase 4（文档上传 PDF/Word/Excel 抽文本，代码级落地，真机待验）

- Phase 4（`045aada`）：聊天面板上传 PDF/Word/Excel → Main 抽纯文本（非多模态/非 RAG）拼进 user 消息 content 上送模型；DeepSeek 与豆包都能用，**无需能力位**（文本通用，文档按钮始终可用）。
- 新增 Main IPC `extract-document-text`（`ai.mjs`，懒加载三库按扩展名分发）：`.pdf`→pdfjs-dist、`.docx`→mammoth、`.xlsx`→exceljs；截断 2 万字 + `truncated` 标记；扫描件/不支持格式返回失败提示。preload + 双 d.ts（`env.d.ts`/`src/types/electron.d.ts`）暴露 `extractDocumentText`。
- 复用 Phase 3 附件生命周期：文档落同款 `uploaded/ai-attachments/{sessionId}/` 前缀 + `attachments` JSON 列 → **零 DB 迁移**，A4 备份/GC 自动覆盖（GC 扫描不区分文件类型）。抽取文本持久化进 content，跨轮重发天然带上（比 Phase 3 图片重读 dataUrl 更简单）。
- 多模态过滤修正：sendChat 把「最近1轮带图」逻辑改为只对**图片**附件（`isImageFileExt`）做 image_url，文档附件文本已进 content（text part），混发图+文不串扰。
- ⚠️ 技术选型（影响后续）：文档抽取锁定 `pdfjs-dist`+`mammoth`+`exceljs`（纯 JS 零原生依赖，符合 AGENTS §5）。**勿再用 `pdf-parse`**：当前 latest（2.x）依赖原生 `@napi-rs/canvas`，已否决；旧版 1.1.1 停更且有 CVE。pdfjs-dist v6 在 Node 三坑：必须 `legacy/build/` 入口（避 `DOMMatrix`）、`pathToFileURL` 处理 Windows 裸盘符路径（避 `protocol 'e:'`）、`loadingTask.destroy()`（v6 移除 `doc.destroy`）。
- 现实边界：type-check ✅ + 抽取逻辑用真实文档 Node 冒烟验证（SCQ PDF 11页/9049字、感统 docx 3798字、TGMD-3 xlsx 14行）；**真机（渲染端→IPC→Main 接线）待验**。剩 Phase 5（技能包）。

## 67. 2026-07-16 AI 智能体插入两专题（结构化报告生成 + 聊天 UI 美化，真机已验）

- 结构化报告生成（`b6c5dd6`）：新增 `generate_report` tool——AI 在 function calling 循环内采数据（学生/评估/训练）后把结构化内容填进 tool 参数，渲染端复用 `exportWordDocument`（`src/utils/export-word.ts`）生成 `.docx` 下载。新增 `src/utils/ai-report-word-builder.ts`（AI 友好扁平 schema → `WordExportPayload` + 全量兜底截断）。**首个有副作用 tool**：tool result 只回小状态 JSON（`{ok,fileName,sectionCount}`）不塞 blob（`serialize` 有 6000 字符截断）。`MAX_TOOL_ROUNDS` 5→7。
- 聊天 UI 美化（`74deb11`）：assistant 回复用 `markdown-it`+`DOMPurify`（纯 JS 零原生，新增 `src/utils/render-markdown.ts`）渲染（表格/列表/标题/代码块）+ CSS 流式呼吸光标；输入框重构为统一圆角容器（曲别针合并图片+文档入口按类型自动分流、textarea minRows2/maxRows8、生成报告、发送圆形按钮同处一容器）；抽屉宽度固定 480px → 窗口 33%。不加 highlight.js（省体积）。
- ⚠️ 影响 Phase 5：tool 列表仍**全局写死**（`AI_TOOLS`，`src/services/ai-tools.ts`），`runToolLoop`（`ai-tool-loop.ts`）永远传完整列表不按 agent 过滤；`ai_agent.skills_config`/`model_params` 列已建未消费。Phase 5（`ai_skill`/`ai_agent_skill` 两表）应实现「按 agent 挂载 skill」，`generate_report` 即首个生成类技能、`report_type` 字段为其预留扩展点。
- 现实边界：两专题 type-check ✅ + 真机验证 ✅（报告生成全链路；UI 渲染/光标/输入框/合并入口；暗色未测但走 Element Plus CSS 变量自适应）。本地 main ahead origin/main 9 未 push。

## 68. 2026-07-17 AI 智能体 Phase 5 技能包（按 agent 挂载工具 + 知识技能注入 systemPrompt，真机已验）

- Phase 5 落地「按 agent 挂载技能」替代全局硬编码 `AI_TOOLS`（`src/services/ai-tools.ts`）。新增 `ai_skill`(kind CHECK 'tool'/'knowledge') + `ai_agent_skill`(M:N 绑定，Phase 5 唯一绑定源) 两表；`ai_agent.skills_config` 退役为遗留列（不删免迁移）。
- 5A 工具维度：`filterTools(toolCodes|null)` 按 agent 绑定的 tool_code 过滤 `AI_TOOLS`（null/[]→全量兜底防回归）；`dispatchTool` 加 `allowed` 白名单越权防御；`runToolLoop` 收 `tools?` 参数。向后兼容回填（CROSS JOIN + NOT EXISTS）给零绑定旧 agent 补全部工具型技能。
- 5B 知识维度：内置专业角色知识包放 `src/data/skills/<名>/SKILL.md`+`references/`，`src/data/skills/index.ts` 用 `import.meta.glob('...?raw',eager)` build 时读取 + 极简 frontmatter 解析（不引依赖），导出 `BUILTIN_KNOWLEDGE_SKILLS`。`init.ts` 用 **INSERT OR IGNORE + UPDATE 保留 id 的 upsert**（非 OR REPLACE——后者改 id 致绑定 orphan；sql.js FK 默认 OFF 不 CASCADE）入 `ai_skill`(kind='knowledge')，`knowledge_payload={content}`。`AIApi.getAgentKnowledgePrompt(agentId)` join 绑定拼接正文，120k 字符截断；`sendChat` 单点注入 systemPrompt（`ai.ts:492` try 内首行，tool_calls/流式两路径共用）。
- glob 覆盖非标准结构（`52dbfa8`）：`developmental-screening-assessment` 把参考 md 散放技能根目录（非 `references/`），加 `rootRefModules`(`./*/*.md` 过滤 SKILL.md/README) 并入注入。
- 知识技能**默认不挂**（新建 agent 只默认工具；知识手动按需挂控 token）。UI「挂载技能」用 `el-option-group` 分「工具」「知识」两组，单 `skillIds` 数组（绑定不分 kind）。
- 现实边界：type-check ✅ + 真机 ✅（工具过滤、知识注入、不回归均验）。3 commit 已 push origin/main：`96a2d18`(feat)/`792ab4f`(handoff)/`52dbfa8`(glob fix)。Phase 5C（技能库整页 CRUD / references 按需勾选 / 自定义知识技能）留后续。

## 69. 2026-07-17 AI 智能体 Phase 5C（技能库治理 + references 按需注入，本轮代码级完成）

- `ai_skill` 新增 `source_type/source_url/license/evidence_level/risk_level/audience` 治理字段；`ai_agent_skill` 新增 `config`，存每个 agent 对知识技能的 `referenceIds`。迁移均通过 `safeAddColumn` 幂等补列。
- 内置知识 payload 从 Phase 5B 的 `{content}` 演进为 `{body,references,metadata}`。`referenceIds=null/缺失` 保持旧绑定的全量 references；`[]` 只注入主体；有 id 时只注入勾选资料。`getAgentKnowledgePrompt` 继续执行总 120k 字符护栏。
- 系统设置 AI 页新增知识技能库：内置技能正文只读、可启停；本地知识技能可创建/编辑/删除；编辑 agent 时可按技能选择“全部 / 指定 / 不选”references。内置源文件每次启动 upsert 刷新，不允许被 DB UI 覆盖。
- 新增本地原创教师端知识包：`child-adolescent-mental-health-support`（学校支持、非诊断、危机转介边界）与 `inclusive-training-adaptation`（融合训练适配、保留目标、通用调整优先）。前者不提供量表评分、诊断或危机替代；两者均未直接复制外部 GitHub 技能内容。
- 代码验证：契约测试 4/4、`npm run type-check`、`npm run build:web` 均通过；桌面真机 UI/DB 迁移/模型端到端尚未跑。本轮本地开发服务器在浏览器验收中响应中断，详见 `.learnings/ERRORS.md` `ERR-20260717-002`。

## 70. 2026-07-17 内置知识技能中国学校场景本土化

- 7 个内置知识技能统一补齐 `license/evidence_level/risk_level/audience=教师端` 治理字段；保留既有 skill code，避免启动 upsert 改 id 或破坏 agent 绑定。
- 高风险三包整包重写：
  - `special-education-teacher`：从美国 IDEIA/FAPE/LRE 法定流程改为国内随班就读、资源教室、一人一案、课堂支持与校内协作。
  - `speech-therapist`：从美国持证治疗师、英文音位与临床量表方案改为普通话/方言/双语差异识别、功能性沟通、课堂支持和听力/医疗转介边界。
  - `developmental-screening-assessment`：从自由描述生成 DQ/ASD 风险与模拟量表，收口为自然情境发展观察、教育支持与正式评估转介；明确禁止聊天评分。
- 旧美国制度/临床处方 references 与三份体量过大的发展筛查整合稿已从可注入源删除，替换为每包 2–3 份 SCGP 本地原创、可按需勾选的中文 reference。
- 其余四包同步本土化：蒙台梭利改为适配中国园校的“理念启发”；家校沟通默认化名/去标识且不再作虚假“不上传第三方”承诺；心理支持与融合活动补齐国内学校角色分工、一人一案和属地流程边界。
- 新增 `scripts/tests/ai-skill-localization-contract.test.mjs`：验证禁用美国制度/资质/量表术语、教师端治理字段、国内场景关键词、隐私与非诊断边界及本地 reference 完整性。验证结果 8/8；既有技能库契约 4/4；`npm run type-check`、`npm run build:web` 通过。生产构建仅有既有动态导入/大 chunk 警告；桌面真机与真实模型问答仍按用户决定暂停。

## 71. 2026-07-17 五个教师端内置场景智能体（代码级完成）

- 7 个知识技能不按“一技能一智能体”拆成 7 个入口，而是按教师工作意图组合为 5 个内置预设：`一人一策`、`沟通有方`、`成长看得见`、`家校好好说`、`心晴陪伴`。
- `src/data/ai-agent-presets.ts` 是内置预设单一事实源，统一定义名称、简介、系统提示词、4 个快捷提问、工具白名单、知识技能和指定 reference。五个提示词均锁定教师端、最小必要信息、记录与推测分离、非诊断及学校危机流程边界。
- 旧 `special_ed_teacher` 编号原位升级为「一人一策」，因此已有聊天会话无需改 `agent_code`；其余四个使用稳定新 code。启动时保留管理员的启停状态，同步名称/提示词/排序，并在事务内精确重建内置技能绑定；任一技能缺失时回滚，避免留下半套配置。
- 系统设置中内置智能体可启停、不可编辑或删除；数据 API 同样阻止删除。自定义智能体继续允许新增、编辑和删除。聊天空状态显示当前内置智能体简介与快捷提问，报告按钮只在该预设挂载 `generate_report` 时展示。
- 新增 `scripts/tests/ai-builtin-agent-presets-contract.test.mjs`，覆盖 5 个预设、7 个技能、默认 reference 存在性、启动同步、快捷提问和内置保护。代码级验证已通过；桌面启动迁移、实际下拉选择、快捷提问和真实模型输出仍待后续真机验收。

## 72. 2026-07-17 AI 智能体教师入口与管理界面完成真机验收

- 系统管理中的 5 个内置智能体改为卡片式展示，面向学校管理员保留角色支持说明和启停能力；知识技能库移至仅开发态可见的“开发者调试”。
- 系统首页原快捷操作区改为 AI 助手入口，展示已启用的内置智能体；详情弹窗的“开始聊天”会选择对应角色、新建对话并打开全局 AI 助手抽屉。
- `npm run type-check`、内置智能体契约测试 6/6、`git diff --check` 与用户桌面真机验收均通过；当前专题改动仍在未提交工作区。

## 73. 2026-07-17 AI 智能体 Token 额度口径与账单对账约束

- AI 助手月度额度展示已从人民币切到 Token；默认免费额度上限为 `10,000,000 Tokens`，会话列表与管理员审计页也已展示每会话 `total_tokens`。
- 当前应用内 token 账本来自 provider 响应 usage 与本地 `ai_chat_message.tokens_prompt / tokens_completion` 聚合，只能视为应用侧统计。
- 学校交付后的账单必须有 provider 官方依据；后续必须补查火山方舟 / DeepSeek 是否提供官方 token 明细接口、账单查询接口或控制台导出能力，再决定最终对账方案。

## 74. 2026-07-17 AI 个人会话历史分层

- 聊天抽屉仅查询最近 6 条会话；完整的「我的 AI 会话」由个人资料入口进入，支持智能体、日期范围、关键词筛选及分页。
- 个人历史的读取、查看消息、继续对话、删除均经 `user_id` 约束；管理员全局会话审计仍在系统管理页，不能复用个人历史查询。

## 75. 2026-07-18 收口 C01-C04：报告中心、验证门禁、备份加密与恢复语义

- C01-C02 已完成：15 个评估量表报告中心 catalog 与核心验证门禁已落地，`verify:core` / `verify:release` 成为当前回归入口。
- C03-C04 已完成并通过桌面 UAT：新备份为 v4 口令信封（PBKDF2-SHA-256 + AES-256-GCM），资源归档在外层口令信封内；旧 v1-v3 备份只读兼容。
- 备份恢复当前语义：`importData()` 返回结构化结果，DB 恢复成功后资源文件失败不回滚 DB，但 UI 必须显示部分成功 / 资源失败并引导资源健康检查。
- 下一批固定为 C05：AI provider API Key 改为 Electron Main `safeStorage` 保护，备份保留 provider 配置但不得携带可跨机解密的 Key。

## 76. 2026-07-18 收口 C05：AI provider Key safeStorage 迁移

- C05 已完成并通过桌面 UAT：AI provider API Key 新密文格式为 `safe:v1:<base64>`，由 Electron Main `safeStorage` 加解密；renderer 不再生成 provider Key 密文。
- 旧 AES provider Key 只允许在 `electron/handlers/ai-secrets.mjs` 迁移入口只读兼容，后续 `1.0.8` 清理；正常聊天发送链不再使用旧固定 secret。
- v4 备份导出会清空副本中的 `ai_provider.api_key_enc` 并写入 `providerSecretsIncluded: false`；恢复后必须提示重新配置模型服务 Key。

## 77. 2026-07-18 收口 C06 与短期 AI provider Key 交付治理

- C06 已完成：删除 AI 会话时先在 DB 事务内删除消息与会话，事务失败不碰物理附件；DB 提交后只删除剩余引用数为 0 的附件文件，文件删除失败不回滚 DB。
- `ai_provider` 新增学校归属、后台 Key 备注、轮换提醒日期；系统设置页可维护这些元信息，便于每校独立 Key 的账单核对、泄露停用和轮换。
- API Key 分发短期策略：每所学校在 provider 后台创建独立 Key 并设置官方额度；SCGP 本地仍只用 Electron Main `safeStorage` 保存真实 Key，不做可离线自动解密的短加密码。

## 78. 2026-07-18 C07 AI 外发面审计

- 已确认 AI provider 外发面：`sendChat` 会发送用户输入、会话历史、智能体 system prompt、挂载知识技能正文；图片以最近一轮 data URL 外发；PDF/DOCX/XLSX 会先在 Main 抽取最多 20,000 字文本再拼入 user content。
- tool loop 会把本地工具查询结果作为 `role: tool` JSON 回传 provider；当前涉及学生基础字段、单学生完整 student 行、报告记录摘要、训练场次摘要、器材名称/描述/能力标签。
- 发送前隐私告知门禁已实现（见 79）；尚未实现自动脱敏、tool result 字段级最小化与系统设置重置入口。

## 79. 2026-07-18 C07 首次发送前隐私告知门禁

- `sendChat` 入口已加首次发送前隐私告知门禁：确认按「每个登录用户首次」触发，记忆存 DB `system_config`（key=`ai:privacy_ack:user:<userId>`，值=ISO 时间戳），随备份走。
- 落地：`AIApi.isPrivacyAcked/acknowledgePrivacy`（ai-api.ts，复用 getConfig/setConfig）；`sendChat` 在校验链通过、createSession 副作用前弹 `ElMessageBox.confirm`（HTML 静态文案 `AI_PRIVACY_NOTICE_HTML`，无用户输入注入风险），确认=记忆并继续，取消=静默 return {ok:false}。
- 告知文案枚举 5 类外发内容：输入文本 / 图片 vision / 文档抽取文本 / 智能体挂载的专业知识技能 / AI 工具查询结果（学生·评估·训练·资源数据）。
- `AiAssistant.vue` 的 send/generateReport/sendStarterPrompt 3 入口经 sendChat 统一覆盖，组件层无需改。
- 本批不做：字段级脱敏、tool result 最小化（重置入口见 §80）。
- 验证：`npm run type-check` EXIT=0。

## 80. 2026-07-18 C07 隐私告知重置入口

- 系统设置「AI 智能体 → 模型服务配置」card 新增「重置全部教师的告知确认」入口：二次确认后清除所有 `ai:privacy_ack:user:*` KV，返回清除条数；用于更新告知文案或合规复查后让全员下次发送重新确认。
- 落地：`AIApi.resetAllPrivacyAck`（`DELETE FROM system_config WHERE key LIKE 'ai:privacy_ack:user:%'`）；ai store 导出 `resetAllPrivacyAck`；`AiAgentConfig.vue` 加 `resetPrivacyAck` handler + form-item。
- 语义为「全局重置」（非单用户），与系统设置管理定位一致；门禁本身仍按「每个登录用户首次」触发。
- 验证：`npm run type-check` EXIT=0。
- C07 至此门禁 + 重置闭环完成；字段脱敏与 tool result 最小化仍未做（下一步优先 tool result 学生敏感字段裁剪）。

## 81. 2026-07-18 C07 tool result 外发面盘点与字段口径

- 盘点 8 个工具回传 provider 的字段：`list_students` / `search_students` / `get_assessment` / `list_training_sessions` 均已在 dispatcher 层显式字段映射（裁过）；`list_equipment` / `get_ai_usage` 无学生 PII；`generate_report` 仅回传 `{ok,fileName,sectionCount}` 小状态。唯一未裁剪的是 `get_student`——原走 `StudentAPI.getStudentById` 的 `SELECT *` 整行 serialize。
- 学生敏感字段分级：高敏 PII（`name`/`birthday`/`student_no`/`avatar_path`）、高敏医疗（`disorder`）、低价值噪音（`avatar_path` 本地路径 / `created_at` / `updated_at` / `current_class_id` / 内部 `assess_id`）。
- 口径决策（用户拍板「显式映射，保留全字段」）：`get_student` 改 `SELECT *` 为 dispatcher 层显式字段映射，保留现有全字段（`name`/`disorder`/`avatar_path` 等），仅防止 `student` 表未来加列被 `SELECT *` 自动外发；外发面与现状一致。不做脱敏——`name`/`disorder` 是 AI 给建议的必要输入，知情同意由 C07 首次发送门禁层（§79）兜底。其余 7 个工具维持现状。
- 注意：`.claude/skills/sqlite-db-manager/references/database-schema.md` 的 student schema（diagnosis/notes/admission_date）为历史文档，与运行时 `init.ts`/`schema.sql`（字段为 `disorder`，无 notes/admission_date）冲突，以代码为准。
- 验证：`npm run type-check`。

## 82. 2026-07-18 C08 开发路由生产隔离

- 11 个开发专用路由（`SQLTest`/`WeeFIMTest`/`WorkerTest`/`SchemaMigration`/`MigrationVerification`/`ModuleDevTools`/`BenchmarkRunner`/`ClassManagementTest`/`ClassSnapshotVerification`/`ClassSnapshotTestLite`/`ActivationAdmin`）从 `src/router/index.ts` 的 Layout children 移出，集中到新增 `src/router/dev-routes.ts`。
- 隔离机制：route record 与组件动态 import 工厂**一并内联**在 `devRoutes = import.meta.env.DEV ? [...] : []` 三元内。Vite 生产构建把 `import.meta.env.DEV` 静态替换为 `false` 后，整块进入 dead 分支被 Rollup tree-shake，对应 chunk 不再生成——而非仅靠全局守卫拦截访问。
- `DEV_ROUTE_NAMES`（守卫纵深保护 + 边界测试事实源）**故意做成独立字符串字面量集合**，不通过 `.map()` 从 `devRoutes` 派生：否则生产态（`devRoutes` 已折叠为 `[]`）该映射仍会让组件 import 工厂可达，破坏 tree-shaking。集合只含字符串、不引用组件，可安全常驻生产 bundle。
- `ActivationAdmin` 一并纳入 dev 隔离（原 `devOnlyRouteNames` 不含它）；`router/index.ts` 全局守卫现统一用 `DEV_ROUTE_NAMES`，纵深保护覆盖全部 11 个 name。
- `ClassManagement` / `StudentClassAssignment` / `ResourceManager` 是正式管理能力，**保留生产路由不动**。
- 边界验证双层：`scripts/tests/dev-route-production-boundary.test.mjs`（源码契约层——断言 DEV 三元包裹、`index.ts` 不再静态引用 dev 组件、`devRoutes` 声明与 `DEV_ROUTE_NAMES` 一致、正式管理路由未被误移）；`build:web` 后 `grep` 扫 `dist/assets`（构建产物层——dev 页面 title 与 dev 组件 chunk 文件名均无命中）。
- 验证：`npm run type-check` EXIT=0；`node --test scripts/tests/dev-route-production-boundary.test.mjs scripts/tests/training-route-access.test.mjs` 11/11；`npm run build:web` 39s 成功；`dist/assets` 内容与 chunk 文件名扫描均 exit=1（无命中）。
- 桌面 UAT（生产包访问 `/sql-test`、`/module-devtools`、`/activation-admin` 等确认无 route record）留待 C13 终验矩阵「生产边界」行。

## 83. 2026-07-18 C09 ModuleRegistry 事实修正

- `initializeBuiltinModules()`（`src/core/module-registry.ts`）从注册 3 模块补齐到 **6 模块全覆盖**（补 `cognitive`/`life_skills`/`resource`，对齐 `ModuleCode` enum 全集）；`status` 口径 sensory/emotional/life_skills/resource=active、social/cognitive=experimental。
- feature route 从 7 条不存在的模块专属旧路径（`/sensory/training-records`、`/sensory/assessment`、`/sensory/iep`、`/emotional/relaxation`、`/emotional/recognition`、`/social/conversation`、`/social/stories`）改为 5 个真实通用入口（`/games/menu`、`/equipment/menu`、`/training-records/menu`、`/assessment`、`/resource-center`，均已在 `router/index.ts` 核实存在）。
- feature 用**精细口径**：每模块只声明当前真实接入的通用入口（sensory/emotional/life_skills 三大训练入口 active，social/cognitive coming_soon，resource 仅 resource-center）；`fine-motor`/`soothing-aids` 是训练入口（`training-entry.ts`）不进 registry feature——registry 只到模块层。
- registry 收敛为「模块元数据 + 开发诊断」单一职责：模块元数据**生产消费方=0**（`iep-generator.ts` 仅 import、其策略链属 C10），唯一消费方是 dev-only 的 `ModuleDevTools.vue`（C08 已隔离出生产构建，`features` 在其中只作 `el-table` 纯文本诊断展示，不导航）。授权继续读 entitlement，导航/路由继续读现有 catalog 与静态路由——C09 对生产路由/授权/catalog 零影响。
- 源码审计账本 `docs/archive/tendering/source-audit-v1.0/03_源码证据账本.md` E-066 失真点由此闭合。
- 边界测试：新增 `scripts/tests/module-registry-consistency.test.mjs`（源码契约层——4 断言：6 模块全覆盖无重复、route ∈ 5 通用入口白名单、旧路径黑名单零回归、social·cognitive experimental），沿用 C08 源码解析范式（`readFileSync` 正则，不 jiti 运行时加载以避开单例构造调 `localStorage`），挂进 `test:core:node`。
- 验证：`npm run type-check` EXIT=0；`npm run verify:core`（test:core:node 58/58 含新测试 4 项 + test:core:ts 3/3）；`npm run build:web` 39.42s。
- 范围外：`ModuleRegistryImpl` 的 strategy Map/API 未动（C10 清理 IEP 策略试验链）；C08 遗留的 `dev-route-production-boundary.test.mjs` 仍未挂进 `verify:core`（用户确认不做）。

## 84. 2026-07-18 C10 IEP 双主链清理

- 删除未进生产页面、仅由开发工具调用的 IEP 策略试验链，消除「两个同名 `IEPGenerator`」双主链：生产主链 `src/utils/iep-generator.ts`（静态类，`IEPReport.vue`/`Records.vue` 消费）保留为唯一生成器；策略试验链整体删除。
- 删除整文件：`src/core/strategies-init.ts`、`src/strategies/SensoryIEPStrategy.ts`、`src/utils/iep-generator-refactored.ts`（refactored 生成器仅被 dev-only `ModuleDevTools.vue` 调用）。
- 收口：`main.ts` 去 `initializeStrategies()` 启动调用；`module-registry.ts` 删 strategy Map + `registerIEPSstrategy`/`getIEPSstrategy`/`getAllIEPSstrategies` 三方法（registry 收敛为「模块元数据 + 开发诊断」单一职责）；`types/module.ts` 删 `IEPStrategy`/`IEPResult` 接口 + registry 接口内两条 strategy 方法 + `isIEPSstrategy` 守卫；`ModuleDevTools.vue` 删「IEP 策略列表」卡 + 「IEP 策略测试器」卡 + 相关 script/style，保留模块元数据诊断。
- 连带清理（删类型的强制副作用，非生产生成器内部重构）：`iep-generator.ts` 去 vestigial `type IEPResult` import（正文未用）+ 失效 `@deprecated 使用 IEPResult 替代` 注释。
- 边界：生产 IEP 静态 API 与内部实现零改动；授权/路由/catalog/DB 零影响。
- 验证：`npm run type-check` EXIT=0；`npm run verify:core`（test:core:node 58/58 + test:core:ts 3/3）；`npm run build:web` 39.03s；`grep` 断言 src 内 `initializeStrategies|registerIEPSstrategy|getIEPSstrategy|getAllIEPSstrategies|iep-generator-refactored|SensoryIEPStrategy|IEPStrategy|IEPResult` 零命中。
- 桌面 UAT（感官器材/感官游戏/社交游戏/生活自理 L03·L05/Tier3 低样本报告）留待 C13 终验矩阵「IEP」行，本轮只到「代码已实现 / 待桌面 UAT」。

## 85. 2026-07-18 C11 旧命名与原生开发依赖清理

- About 文案统一：`AboutDialog.vue` `<h2>` 从旧阶段名「感官能力发展系统」改为「SCGP / 星愿能力发展平台」（与 `package.json` description 一致）；版本仍读 `useUpdateService().updateState.currentVersion`，不新增硬编码。「感官能力发展系统」在 src 下仅此一处用户可见残留。
- 原生依赖清除：`npm uninstall --save-dev better-sqlite3` 移除 17 包（含原生编译树），devDependencies 与 lockfile 均无残留，符合「零额外原生依赖」红线（AGENTS.md 禁止清单）。
- `scripts/export-resources.cjs` 引擎从 `better-sqlite3` 切到 `sql.js`，沿用运行时主线 `export-current-emotion-scenes.mjs` 的 `initSqlJs({ locateFile: node_modules/sql.js/dist })` + `fs.readFileSync` → `new SQL.Database(buffer)` + `.exec()` 范式；CLI 输入输出契约不变（同样定位 `self-care-ats/database_backup.db`、同样查 `resource_meta`、同样写 `exported-resources.ts`）。
- 脚本补 `--help`/`-h` 只读分支（先于 DB 读取返回，禁止用真实 DB 验证导出）；修正头注释错误扩展名示例 `.js`→`.cjs`、输出文件 `.sql`→`.ts`；注释里去掉 `better-sqlite3` 字面量以通过 grep 零命中门禁。
- 边界：不改 `appId: com.sic.ads`、localStorage key、历史 migration 日志与兼容注释。
- 验证：`node scripts/export-resources.cjs --help` 正常；`grep -rn "better-sqlite3" package.json package-lock.json scripts src electron` 零命中（exit 1）；`npm run verify:release`（type-check + test:core:node + test:core:ts + build:web 40.06s）全绿；`git diff --check` 干净。
- 桌面 UAT（About 文案真机显示）留待 C13 终验，本轮记「代码已实现 / 待桌面 UAT」。
- 下一批次 C12（更新/签名/升级发布门禁）被外部输入阻塞：需正式 HTTPS 更新目录 URL + Windows 代码签名证书 + Windows 验收机，三样齐备前不开工。

## 86. 2026-07-18 生产调试信息清理门禁

- `build:web` 现在固定在 Vite 构建后执行 `sanitize:production`，对 `dist` 下 HTML/CSS/JS/MJS 做调试标记块清理与残留扫描；`console.*`、`debugger`、devtools/vconsole/eruda 等生产残留会让构建后门禁失败。
- 生产 Vite 构建不加载 `vite-plugin-vue-devtools`；Electron 生产态默认抑制主进程运行时日志并屏蔽常见 DevTools 快捷键。
- 该批为 C12/C13 阻塞期间独立技术债，已通过 `npm run verify:release`，但仍未提交。

## 87. 2026-07-19 C12 自动更新链 HTTPS 切换闭环

- 桌面端自动更新默认源从 `http://124.220.104.199/scgp/win` 切到 `https://maohedong.top/scgp/win`（用户自有域名 + DigiCert/Let's Encrypt DV 证书，nginx 自托管 generic provider）。
- `electron/handlers/update.js` 的 `LEGACY_UPDATE_URLS` 现收纳两条旧地址（hzxckj + 旧 http IP），老 1.0.x 用户升级时无感迁移到当前 HTTPS 默认地址。
- 旧 http IP 源保留（与 HTTPS 主源同物理目录 `/home/lighthouse/scgp/win/`），作为老用户升级跳板；两源 `latest.yml` 均指向当前版本。
- Windows 安装包不签名（`cscInfo=null`），安装触发 SmartScreen 蓝屏为已知取舍，不购买代码签名证书。
- 服务器部署走 tailscale + `openclaw.pem`（登 `ubuntu` 用户，免密 sudo）；开发机代理 fake-ip 污染外部 HTTPS/DNS 探测，外部服务验证必须在服务器或干净设备做。
- 新增 `release-deploy` skill（`.claude/skills/release-deploy/`）固化打包→校验→上传→部署→验证两源流程；`scripts/release-verify.mjs` + `npm run release:verify` 校验 latest.yml 完整性（防 latest.yml 被 exe 内容覆盖，曾实际发生）。
- 1.0.7 已打包部署，真机 1.0.6→1.0.7 自动升级验证通过；commit `d4b86fd` + `64f6604` + `27ebeeb` 已 push。

## 88. 2026-07-19 §3 技术债核实结论 + 评估入口动态化计划

- 对 AGENTS §3「当前优先技术债」6 条做只读核实：备份/恢复全 schema（已闭环，§22，`backup.ts` 动态全表 v4.0）、资源文件生命周期（已收口，§61-62 Phase1/2/3）、开发/迁移工具路由隔离（已隔离，§82 C08 四层）三条实际已完成，仅 §3 文案滞后。
- 真实欠账 3 条：资源收藏半成品（资源中心「训练资源」Tab 未接收藏 UI + `teaching_material_favorite` 与 `sys_favorites` 两套并行表）、评估入口仍硬编码（catalog / driverRegistry / report-center catalog / report-route switch / 报告路由表 / legacy redirects / student-detail 聚合器 7 处并行枚举，其中 student-detail 聚合器漏 brief/crt/cognitive_self 是真 bug）、命名残留部分清理（产品名「训练系统 vs 平台」口径分叉 + `Layout.vue` ATS 折叠标题等）。
- 评估入口动态化实施计划已立并批准（中等 scope）：catalog 作单一真源，B/C/D/E/G 五处派生 + F 生成化，顺带修 student-detail bug；不动作答主链 `AssessmentContainer` 硬分支、不动 ScaleDriver 接口、不补报告路由 entitlement 守卫（单独列债）。
- 执行蓝图：`docs/planning/2026-07-19-assessment-entry-dynamicization-plan.md`；认知校正——「儿心-II/TGMD-3/GMFM/FMDA 占位」是 §15 旧状态已过时，当前 15 个量表全部完整实现，仅 brief/crt/cognitive_self 标 DRAFT。

## 89. 2026-07-19 评估入口动态化闭环（A 九步 + D）

- 按计划蓝图执行完毕：AGENTS §3 文案校正（D，移除 3 条已闭环、保留 3 条真实欠账 + 已闭环脚注）；A1-A9 catalog 单一真源落地。
- A 真源 `assessment-scale-catalog.ts` 扩 11+1 字段（urlSlug/reportRouteName/reportPathParamStyle/reportComponentFolder/reportTone/reportTagType/reportSelectLabel/reportCardLabel/recordsLabel/isDraft + `reportMetaTitle`[plan 字段表未列但生成路由 meta.title 必需]），15 条数据从下游真实值填齐。
- 派生/生成化：D `report-routes.ts` switch→catalog 派生（5 调用方零改动）；C `report-center-catalog.ts` 退化为 `ASSESSMENT_SCALE_CATALOG.map`；新建 `assessment-report-routes.ts` 双导出（records 纯元数据 + components 动态 import + routes 合成 + legacy redirects 生成化）；E `router/index.ts` 删 15 手写报告路由 + 14 const 懒加载，`...assessmentReportRoutes`，CSIRSHistory 保留原位；B `driverRegistry` `as const satisfies Record<AssessmentScaleCode,...>`；G 补 brief/crt/cognitive_self 3 builder 修漏量表 bug + 合并改 catalog flatMap + SCALE_LABEL_MAP 改 recordsLabel 派生 + AssessmentScaleType 别名到 AssessmentScaleCode。
- 验证：`npm run type-check` clean；`npm run build:web` 成功（Vite 模板字面量 `@/views/assessment/${folder}/Report.vue` 动态 import 正确切 chunk）；现有 `assessment-report-center-catalog.test.mjs` 3/3、`dev-route-production-boundary.test.mjs` 7/7、新增 `assessment-entry-dynamicization.test.mjs` 7 断言全绿。
- 未做（单独列债）：报告路由 entitlement 守卫——`assessmentReportRoutes` 未挂 `beforeEnter`（与作答主链 `createAssessmentScaleAccessGuard` 不同源）；`getDriverAsync`/`getRegisteredScales`/`isScaleRegistered`/`clearDriverCache` 死代码未清。两者均不在本 scope。
- driver 类不进 catalog（避 bundle 回归 + catalog↔driver 循环依赖），仅 type-only 依赖 `AssessmentScaleCode`；SM/WeeFIM 报告保 query 参数形态，sm/weefim legacy redirect 保 `/assessment/` 中缀特例（书签兼容）。

## 90. 2026-07-19 认知发展游戏包 P0 首样板 K03 接入

- cognitive 训练入口首个游戏 `K03_PATTERN_NEXT`（模式补全，纯 SVG）已落地：registry 条目 + `PatternNextGame.vue` / `PatternNextPage.vue` 组件 + 路由；认知发展模块游戏数 0→1。
- **认知游戏落库模式（K01/K04/K05 后续直接复用）**：cognitive 游戏不经 `EmotionalGamesAPI`（那会写 `game_emotion_records` 串台），走新建 `src/database/cognitive-games-api.ts` → `TrainingSessionWriter.upsertSession`，`source_table='cognitive_game_inline'` 合成源（不新建表，符合 unified schema §3.2），`session_family='cognitive_game'`；`actual_params` 显式透传 summary_payload 顶层（绕过 `pickScalarSummaryMetrics` 嵌套过滤）支撑 IEP 级纵向追踪。
- **GameContainer moduleCode dispatch**：`src/views/emotional/games/GameContainer.vue` 的 `persistTerminalState` 单人分支按 `gameDefinition.moduleCode === ModuleCode.COGNITIVE` 分发到 `CognitiveGamesAPI`，否则走 `EmotionalGamesAPI`。新认知游戏只需加 registry 条目 + 组件 + Page + 路由，**无需再改容器/API**。
- PRD §7 第 0 条定位已决策 = B（IEP 级可追踪）：每个认知游戏 `performanceData` 必须含 `actual_params`（本局实际生成参数）。PRD：`docs/planning/2026-07-19-cognitive-games-prd.md`。
- IEP 报告消费端（`generateCognitiveReport` 等 4 处：GameContainer 白名单加 cognitive + IEPReport K 前缀路由 + iep-generator 新方法 + normalizer K03 规则）留后续专题，actual_params 已留好零迁移接入。
- 验证：type-check + build:web + 实机 UAT 通过；commit `424724c`（feat）+ `fbeab72`（docs）已 push origin/main。

## 91. 2026-07-19 认知发展游戏包 P0 第二个游戏 K01 接入

- cognitive 训练入口第二个游戏 `K01_MEMORY_MATCH`（记忆翻牌 / Concentration，视觉工作记忆，纯 SVG）已落地：registry 条目 + `MemoryMatchGame.vue` / `MemoryMatchPage.vue` + 路由；认知发展模块游戏数 1→2。完全复用 §90 底座（cognitive-games-api + GameContainer moduleCode dispatch + registry/Page/router），**未改容器/API**。
- **玩法**：三档难度对齐 PRD §4——L1 `2×2 / 2 对 / 翻错不翻回`、L2 `4×3 / 6 对 / 翻错 1.2s 翻回`、L3 `4×4 / 8 对 / 相似干扰`（同形近色造近似干扰）。统一状态机：`flipBackOnMismatch=false` 让 L1 revealed 卡累积、任意同 pairId 两张自动点亮，无需为 L1 单写规则；L2/L3 两张未配则锁定 + 延迟翻回。
- **actual_params（IEP 级纵向追踪）**：顶层保留与 cognitive-games-api 强耦合的键 `accuracy_ratio`（首配命中 / 目标对数）+ `average_response_ms`；`actual_params` 含 `session_type='K01_MEMORY_MATCH'`、`grid_size`、`pair_count`、`flip_back_on_mismatch`、`use_similar_distractors`、`card_front_mode='svg'`（预留 `'webp'` 物品认知模式后续接入）+ 每对 `trials`（`first_try_correct` = 配对步紧接该对首次翻开、`flip_attempts`、`response_ms`）。
- **卡面素材决策（用户选定）**：v1 纯程序化 SVG + 预留 `CARD_FRONT_MODE` 字段；卡背 CSS/SVG 生成统一花纹，零图片素材。
- 验证：type-check + build:web + 实机 UAT 通过。

## 92. 2026-07-23 预置视频资源路径收口

- 389 条预置教学视频元数据由 `src/data/preset-teaching-materials.json` 维护；原始视频约 5.1GB，不纳入 Git 或主安装包。
- `assets/` 前缀资源通过 `get-app-resources-path` IPC 解析到 `{installDir}/resources`，并作为只读资源拒绝进入托管文件删除链；其他相对路径仍解析到 `{userData}/resources`。
- `package.json` 的 `build.extraResources.filter` 显式排除 `videos/**/*`；验证脚本支持 life-skills 子目录并已核对 389 条源文件。提交：`243965c`。

## 93. 2026-07-27 登录页主题背景媒体与托管资源扩展

- `system_config.login_theme_backgrounds` 按 `warm-glow` / `calm-blue` / `lush-green` / `custom` 分别保存 `{ image, video }`；登录页固定按视频、图片、程序化星空降级。
- 登录背景写入 `userData/resources/login-backgrounds/`，配置保存 `resource://` 引用；全局托管前缀扩为 `uploaded/`、`teaching-materials/`、`login-backgrounds/`，备份、恢复与孤儿 GC 必须同步覆盖。
- 暖黄、静蓝与润绿是生产固定完整预置，只有自定义主题接受主色配置；开发构建额外支持预设主色临时调试；真实 Electron 媒体与重启持久化仍待用户手测。

## 94. 2026-07-28 用户头像存储与显示约束

- `student.avatar_path` 与 `user.avatar_path` 同时支持预置 canonical 路径 `images/user-avatars/...` 或 Canvas 压缩 Data URL；显示必须经 `resolvePresetResourceUrl()`，不得将构建环境 URL 持久化。
- 预置头像按界面隔离为学生 6 张与当前账号 6 张；上传/拍照不进入 `uploaded/` 托管文件生命周期。

## 95. 2026-08-05 激活文件（.lic）与 HTML 离线激活码生成器

- 激活码格式：`[4B 大端 JSON 长度][JSON 载荷 {t,v,m,c,e,am,p}][RSA-2048 签名]` → base64 → 5 字符分组 → `SPED-` 前缀；验证端 `src/utils/license-manager.ts` 内嵌公钥（RSASSA-PKCS1-v1_5 + SHA-256），主程序不再依赖独立 public-key.pem。
- 激活文件：`.lic` = 纯激活码一行；主程序激活页与「系统管理 → 关于 → 重新激活/更新授权」均可导入（`.lic`/`.txt`，解析只做格式校验，签名验证走原链）；生成端（CLI/GUI/HTML）生成后可一键导出 .lic。
- HTML 离线生成器：`license-generator-dist/generator.template.html`（模板，入库）+ `scripts/build-license-generator-html.mjs` 注入 `.keys/private.pem` 产出 `scgp-license-generator.html`（双击即用，Web Crypto 签名与 Node/验证端同算法）；**产物内嵌私钥不入库**（.gitignore），私钥轮换后重跑构建脚本。

## 96. 2026-08-05 视知觉图形匹配筛查（cognitive_self）v4 重构落地
- 原「综合认知自测」重构为 4 级难度题库（2 练习 + 16 正式题）、色盲安全色板（HEX）、渲染器扩展（手性 flag/缺口圆环/内部标记点/镜像/双图元布局，crt-matrix.ts 固定变换顺序）。
- 输出改为描述性结果（不输出 IQ/百分位，cognitive-self-norms.ts 已废弃标注）；判读与报告全部口语化（教师可读）。
- 选项每次施测随机洗牌：value 保留题库原始下标，判分与显示顺序解耦（utils/cognitive-shuffle.ts）。
- 答题板 UI 约束：目标与选项统一 160×160 可见刺激框（图元 88px），点击热区与可见框解耦（PerformanceTrialBoard.vue）。
- 设计稿 docs/planning/2026-08-05-cognitive-self-difficulty-curve-design.md（v4.1）；门禁测试 tests/cognitive-self-gate.test.ts（12 项）。

## 97. 2026-08-05 AI 对话内嵌富产物机制（ToolArtifact）+ 跨量表学生画像（路线 C/D）
- AI 工具结果新增「富产物」通道：`ToolResult.artifact`（类型化联合 `ToolArtifact`），只回传 UI 层渲染、不进模型上下文；`ai_chat_message` 新增 `tool_artifacts` JSON 列（safeAddColumn），`saveMessage`/`listMessages` 往返持久化，历史会话回看图表仍在。
- 现有两种富产物：`assessment_trend`（get_assessment_trend，单量表纵向，快照≥2 才产，AiTrendChart.vue 线图）与 `profile_radar`（get_student_profile，跨量表横向画像，领域≥3 才产，AiProfileRadar.vue 雷达图）；AiChatTranscript 按 kind 分发渲染。
- 画像聚合层 `src/services/assessment-profile.ts`（纯函数，可 jiti 单测）：SCALE_DOMAIN_MAP 把 13 个支持量表映射到 5 大发展领域（sensory/emotional/social/cognitive/life_skills），取各量表最近一次评估，buildScaleConclusion 统一口径结论（scoreNote+level+分数），领域强弱聚合取最差值（weak 优先）；crt/cognitive_self 不参与。
- 授权差异处理：工具只聚合有评估记录的量表（未授权量表前端测不了→DB 无记录→自动跳过），未测项在 `untestedScales` 透明列出，不引入工具层授权参数。
- get_student_profile 已挂载到 3 个 agent（一人一策/成长看得见/稳健训练）；营销文档 docs/marketing/2026-08-05-scgp-ai-agent-marketing.md（正式版+口语版+短篇文案）已落库。

## 98. 2026-08-06 学生级长期记忆 M1-M5 全部落地（v4.1 设计，四轮 ChatGPT 审核）
- 完整闭环：会话绑定学生（AiAssistant 抽屉选择器，已有消息库级锁定不可改绑）→ 对话自动总结（脱敏姓名/手机号→[STUDENT]/[REDACTED]，≤4000 字符）→ pending 候选（AI 生成，指纹去重 + 3-gram 仅提示 possible_duplicate_of）→ 教师确认（学生详情左侧信息区「AI 记忆」卡片，compact 确认流）→ 注入下轮对话（守卫层后，非指令声明）。
- 数据层：三表 `ai_student_memory` / `ai_memory_summary_batch` / `ai_student_memory_audit` + 消息表 `delivery_status`/`message_kind` + 会话表 `student_id`/`memory_watermark`；批次两段式短事务（createSummaryBatch → 模型调用 → CAS commitSummaryBatch 推进水位）；迁移防回灌（历史会话水位=最大消息 id）。
- 权限 = 服务团队共享：`canAccessStudentMemory` admin 全量 / teacher 仅同班（student.current_class_id JOIN sys_class_teachers），**每次现算不存快照**；确认不撤销（confirmed_by_user_id/confirmed_at 留痕）。
- 治理随补偿任务运行（runMemoryCompensation → runMemoryGovernance）：pending 30 天归档、confirmed 分类配额淘汰（100/50/50/50，关键项保护）、非有效状态 365 天/每生 500、批次保留（cancelled 30/failed 90/done 180+20）。
- 学校级开关 `ai:memory_enabled`（system_config KV）：**默认开启**（`!== '0'`），管理员在系统设置→AI 智能体可关。
- 评估记录列表中文化：cognitive_self 正确率 0~1→×100、反应时 ms→s；CRT/BRIEF/TGMD-3 level_code 英文键（high_average/typical/emerging_skills 等）→ 中文（局部映射，CRT delayed 用"明显落后"避免与 CNBSR 的"智力发育障碍"串扰）。
- 提交：fb93040（M1）/ c67109c（M2）/ f60c7f6（M3+M4）/ 1da7ffd（M5+修复）；契约测试 AI+评估共 112 条全过。
- 路线C（AI 对话内嵌评估趋势图）富产物机制已在 §97 落地；剩余可选：趋势图持久化到独立 DB 表（当前存消息表 tool_artifacts JSON）。

## 99. 2026-08-06 路线C 调研结论：趋势图独立 DB 表不做（路线C 关闭）
## 100. 2026-08-06 AI 会话记录独立 tab + AI 配置页 UI 重构 + 告警修复
- AI 会话记录独立 tab：System.vue 新增「AI 会话记录」（AiSessionsPanel：标题/用户名搜索 + 服务端分页 20/页 + 查看对话框 + 删除）；ai-api `listAllSessions(limit, offset, keyword)` 加 offset 与 LIKE 过滤 + 新增 `countAllSessions`；store 删 `allSessions` 全量刷新（6 处）改 `sessionPage`/`loadSessionPage`；修复旧版 limit 200 无翻页的审计盲区。
- AI 智能体配置页多轮重构：3 卡拆分（模型服务配置 / 全局用量与风控 / 业务与合规，后两卡 grid 两列并排 auto-fit 折叠）+ 每卡就近保存按钮（全局 sticky footer 方案被否决）+ `testConnection(override)` 表单未保存 Key/地址直测（protectAiApiKey 现场加密）+「每月额度」千分位 el-input-number + 隐私告知两栏布局（固定 120px label）与新文案 + 模型清单卡片表格（表头浅底、模型 ID 代码块、能力胶囊开启/未支持对比、操作列居中）+「新增」按钮统一规格。
- 卡片风格统一：AiAgentConfig / AiSkillLibrary / UpdatePanel 对齐 scgp-surface（--scgp-radius-xl 22px + --scgp-shadow-soft）。
- 告警修复：TOOL_SKILL_SEED 补 `tool_get_student_profile`（§97 新增工具时漏同步，AI_TOOLS 10 工具已全覆盖）；electron main dev 分支屏蔽 CSP 警告（ELECTRON_DISABLE_SECURITY_WARNINGS，unsafe-eval 为 Vite HMR 必需）。
- 验证：type-check / AI 契约 21-29 条 / build:web 全过；提交已推送。

- 调研结论：趋势图持久化到独立 DB 表**不做**。理由：① 趋势快照是评估记录的派生视图（`getLongitudinalScores` 纯函数实时计算，评估记录表即持久化源头），独立表=双写双源+漂移风险；② 唯一新增价值（按 student/scale 可查询的 AI 产物历史）当前无消费方——对话回看走 `tool_artifacts` JSON 列已覆盖，独立趋势页 `AssessmentTrendPage.vue` 直接走评估记录；③ 双写一致/删除级联/表膨胀治理的代价无收益。
- 未来触发条件：出现「AI 产物历史中心」页面需求 → 届时做**登记表**（`ai_artifact`：message_id 外键 + kind + student_id + scale_code + payload JSON 镜像，写入时镜像、删除消息级联），不做快照归一化表。
- 路线C 全链路闭环确认：工具（get_assessment_trend）→ 富产物（ToolArtifact）→ 对话内嵌渲染（AiTrendChart.vue）→ 消息表持久化（tool_artifacts，历史回看可用）→ 独立趋势页（AssessmentTrendPage.vue，评估记录实时算），无未完成遗留。



## 101. 2026-08-07 登录页重构 + 背景修复 + 图片 WebP 化 + L12 移除 + 仓库清理
- 登录页：主卡片去双层嵌套（LoginCard 降级为纯内容区，.login-layout 统一毛玻璃 blur 20px）、slogan 提亮、输入框 focus 光环、按钮科技感（颜色仍走 --login-* 主题变量，四套主题兼容）。
- 登录背景 bug 根因：electron/main.mjs 未在 app.ready 前调 protocol.registerSchemesAsPrivileged 声明 resource:// 为 standard+secure，Electron dev（https 页面）下 <img>/<video> 跨协议加载被 Chromium 拦截。已声明（standard/secure/supportFetchAPI/corsEnabled）+ Login.vue 调 getLoginBackgroundUrl 环境适配 + vite dev-only middleware 服务 /assets/resources/。
- 图片优化：736 张预置图 PNG/JPG->WebP（cwebp -q85，250MB->25MB）。采用「协议层兜底」不改后缀：resource:// 与 vite middleware 在 .png/.jpg/.jpeg 找不到时回退同名 .webp——源码/seed/DB 路径不变，已部署客户端零迁移。cwebp 工具在 C:/Users/maoea/scgp-tools（项目外）。
- L12_POUR_WATER 倒水小帮手已移除（组件/注册表/路由/指标提取/IEP/图标/演示数据 16 文件，14ae94f）。
- 清理：.archive/gsd-agents/test-sdq-e2e.py 删除；tendering 审计文档归档至 docs/archive/tendering/。
- 已知遗留：module-registry-consistency.test.mjs 断言 SOCIAL=experimental 失败（module-registry.ts:401 实为 active，0d0716d 菜单重排后遗留），下一会话处理。

## 102. 2026-08-07 SOCIAL 断言修复 + 悬浮球动效 + v1.1.1 部署 + release-deploy skill 固化

- SOCIAL 断言修复（§101 已知遗留已闭环）：SOCIAL/COGNITIVE 升 active 是 cb73017（commit message 明示）的显式决策，测试为源码契约层应跟随代码事实——**改测试不改 registry**，断言同步为「全部 6 模块 active」（3faa345）；悬浮球动效（地面反相阴影+双层投影，0381feb）。
- 部署通道变更（§87 的 tailscale 路径已过时）：tailscale（100.114.108.86）relay 异常 + 打洞失败实测不可用；**当前部署主路径 = 公网直连 `124.220.104.199`**；SSH/SCP **必须用 Git Bash**（`C:/Program Files/Git/usr/bin/ssh.exe` / `scp.exe`）——Windows OpenSSH 因 `openclaw.pem` 权限含 Authenticated Users 读权限拒载（icacls 修复需管理员，开发机无）。上传分文件传（exe 单独传，中断删残缺重传并核对字节数）。
- v1.1.1 已打包部署（版本号不变，覆盖 1.1.0 前的源）：`/home/lighthouse/scgp/win/` 两源 curl 验证 `version: 1.1.1` 通过。**同版本覆盖不触发老客户端自动升级**（electron-updater 同版本视为最新），仅新装/手动更新生效。
- release-deploy 流程已固化为项目 skill：`.thincoder/skills/release-deploy/SKILL.md` + `.claude/skills/release-deploy/SKILL.md` 双处同步（04d7124）；`.gitignore` 放行 `.thincoder/skills/`（其余 `.thincoder/` 仍忽略）。

## 103. 2026-08-07 报告中心授权过滤 + 登录页重构 + 教学视频播放修复 + 两次 v1.1.1 覆盖部署

- 报告中心授权过滤闭环：评估报告卡片/类型下拉/总数口径按激活授权过滤（`getAuthorizedAssessmentReportCatalog` 复用 `isAssessmentScaleAuthorized`，entitlement-first，与评估入口/路由守卫同源）；仅感官授权 → 4 个量表卡片（csirs/tgmd_3/gmfm_88/cnbsr2016），真实感官能力包 +FMDA 共 5 个（299bea4，含 tests/report-center-catalog.test.ts）。
- 登录页重构：卡片总宽 1200→1000px，左右比例 1.1:1（grid `minmax(0,1.1fr) minmax(400px,470px)`）；表单区 464→360px；新增桌面 Footer（●系统就绪·数据加密存储于本地设备 + 版本号经 `update:get-current-version` IPC）；按钮三段渐变+hover 流光（全部走 --login-* 变量，四主题兼容）（e937056）。
- 教学视频内嵌播放器修复（根因是协议层事实，后续开发资源路径时必读）：**resource:// 协议 presetRoot 已是 `assets/resources`，凡 filePath 带 `assets/resources/` 前缀的路径必须剥离前缀再拼 URL**，否则双重拼接 → 404 静默黑屏（系统播放器路径 resolveAbsolutePath 无此问题，故两入口行为不一致）。修复：`getFileUrl` 剥离前缀（9767ac4，含 tests/teaching-material-file-manager.test.ts）；视频加载失败弹窗提示 + 「改用系统播放器打开」兜底；openMaterial 加 1.5s 同资料防连点。
- 部署：v1.1.1 同版本覆盖两次部署（10:08 登录+报告中心、11:27 教学视频修复），两源 curl `version: 1.1.1` 通过。**已装 1.1.1 客户端不会自动升级**，本次修复需等下次升 1.1.2 才到达老用户。
- 打包坑：electron-builder 偶发 `release/win-unpacked/resources/app.asar` 被进程瞬时锁定（非 scgp 进程，疑似 Defender 扫描），重试即过，无需杀进程。

## 104. 2026-08-09 入门视频自动生成工具链首支样片

- 新增开发工具链 `scripts/video/`：分镜驱动，采用 Playwright Electron 录制真实界面、`msedge-tts` 生成旁白、ffmpeg 烧录字幕并合成 MP4；不新增产品运行时依赖。首支样片为 `output/videos/管理员：班级与学生管理.mp4`（1280×800、H.264 + AAC、50.96s），流程验收通过；下一会话仅需分流“清晰度不足”与“试听无声”是编码问题还是播放器/系统音频输出问题。

## 105. 2026-09-01 评估质量追踪（Phase 1-3）+ ATEC 真机三连修 + 全局约束补充

- 17 张 `*_assess` 表新增 `total_duration` / `avg_response_time` / `quality_note`（宽松质控：只记录不打扰；`cognitive_self_assess` 的 avg_response_time 是"真反应时 ms"语义特例，只补另两列）。管理看板 `/system/quality`（admin-only）+ 随机作答检测（仅 crt/cognitive_self，三信号，检出追加 `+suspicious` 入库不弹窗）。commit `84cb587` / `39ecde4`。
- **全局约束（影响后续所有写查询代码）**：`getDatabase()` 返回 SQLWrapper，其 `exec(sql)` 是 DDL 专用——无参数、无返回值；查询一律 `db.all(sql, params)`（对象数组）/ `db.get`。需要 sql.js 原生形态时显式 `(db as any).getRawDB()`。视图层 `db.exec` 读返回值 = 崩溃（ABC/ATEC Report.vue 同款坑）。
- **全局约束（新增量表必修）**：`report_record` 的 report_type CHECK 约束必须在 3 处同步（init.ts 建表、migrate-report-constraints.ts 重建表 + needsMigration 检测），漏了旧库启动时靠约束迁移自动重建（commit `ac687ae`）。新增量表完整 7 处同步清单已存长期记忆。
- AI 工具 `get_assessment_trend` 现支持 15 量表（abc/atec 适配器已注册，commit `ab70953`）；新增模型对话框改为顶部快捷拉取工具栏 + 自动派生编号（commit `3e98981`）。


