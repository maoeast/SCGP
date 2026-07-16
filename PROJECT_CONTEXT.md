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

- 新增子系统：管理员预设「提示词+技能」打包成角色（预设「特教老师」种子），普通老师经全局悬浮入口（`App.vue` 挂 `AiAssistant.vue`）流式提问；模型接 DeepSeek，每校（=每个本地客户端）单独配 API Key 与月度额度。
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
