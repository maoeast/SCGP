# 统一训练记录主表与家族明细表落地计划

> 文档类型：现行专题实施计划
> 状态：当前有效
> 最后更新：2026-04-01

## 1. 背景与目标

SCGP 当前已经具备统一训练记录入口，但底层训练记录数据仍处于分叉状态：

- `training_records`
  - 当前承接主流游戏训练摘要
  - 已被训练记录菜单、学生详情、报表、首页等页面直接消费
- `equipment_training_records`
  - 当前承接器材训练摘要
  - 与 `training_records` 平行存在
- `emotional_training_session + emotional_training_detail`
  - 当前承接情绪场景 / 表达关心的会话与明细
  - 通过 `training_record_id` 挂到 `training_records`
- `game_emotion_records`
  - 当前承接情绪小游戏记录
  - 初始设计未并入统一训练记录主链，导致列表、计数、详情、报表天然分叉
- `student_badges`
  - 当前承接情绪小游戏徽章

当前真实问题不是“功能缺表”，而是“用户可见训练记录主链没有统一”。

本计划目标：

1. 建立一张统一的训练记录主表，承接所有用户可见的训练摘要。
2. 保留少量按训练家族拆分的明细表，不走“一游戏一张表”。
3. 让模块授权继续由 `module_code / entry_code / 权限控制` 解决，而不是由物理分表解决。
4. 通过双写和读路径切换渐进迁移，避免一次性硬切导致历史记录不可读。

## 2. 当前状态确认

### 2.1 当前已实现现实

- 游戏训练主链目前默认从 `training_records` 读取。
- 器材训练主链目前默认从 `equipment_training_records` 读取。
- 情绪场景 / 表达关心已接入主训练记录链，但小游戏最初没有接入。
- 2026-04-01 当前会话已补上：
  - `game_emotion_records` 进入 `src/views/training-records/components/GameRecordsPanel.vue`
  - 训练记录菜单计数与学生详情计数已纳入情绪小游戏记录
  - 情绪小游戏记录详情页已补齐

### 2.2 当前结构问题

- 同样属于“游戏训练”，却分散在 `training_records` 与 `game_emotion_records` 两条读链。
- 同样属于“训练摘要”，却分散在 `training_records` 与 `equipment_training_records` 两张平级主表。
- 学生详情、训练记录菜单、首页、报表、详情跳转都需要知道每条记录来自哪张表，造成前端判断膨胀。
- 后续如果社交沟通、生活自理、精细动作、安抚教具小游戏继续复制“独立表 + 独立列表逻辑”，平台会进入不可维护状态。

## 3. 设计原则

### 3.1 必须坚持

- 用户可见训练记录摘要必须统一落在一张主表。
- 训练过程强相关、结构差异大的明细允许拆为少量家族明细表。
- 模块授权不依赖分表。
- 新旧链路切换必须支持双写和回滚。
- 文档、统计、报表、学生详情、训练记录菜单必须最终共用同一摘要事实来源。

### 3.2 明确禁止

- 不采用“一游戏一张表”。
- 不为了采购授权把 `sensory / emotional / social / life_skills` 物理拆成多张平行主表。
- 不继续新增新的“用户可见主记录表”。
- 不在迁移初期直接删除 `training_records / equipment_training_records / game_emotion_records` 旧数据。

## 4. 目标结构

## 4.1 统一训练记录主表

建议新增：

- `training_session`

建议字段：

- `id`
- `student_id`
- `module_code`
- `entry_code`
- `session_family`
  - 例如：`game` / `equipment` / `emotional_scene` / `emotional_game`
- `resource_id`
- `resource_type`
- `task_id`
- `task_name_snapshot`
- `class_id`
- `class_name`
- `started_at`
- `ended_at`
- `duration_ms`
- `completion_status`
- `accuracy_rate`
- `avg_response_time_ms`
- `summary_payload`
- `source_table`
- `source_record_id`
- `created_at`
- `updated_at`

说明：

- `training_session` 是最终唯一的“用户可见训练记录摘要事实源”。
- `summary_payload` 只承载摘要级、可跨家族复用的信息，不承载大体量过程明细。
- `source_table + source_record_id` 用于迁移期追踪旧表来源与回滚。

## 4.2 家族明细表

建议最终保留为“少量家族明细”，而不是按单个游戏拆表：

- `training_session_game_detail`
  - 承接通用游戏训练详情
- `training_session_equipment_detail`
  - 承接器材训练详情
- `training_session_emotional_scene`
  - 由当前 `emotional_training_session` 演进
- `training_session_emotional_scene_step`
  - 由当前 `emotional_training_detail` 演进
- `training_session_emotional_game_detail`
  - 由当前 `game_emotion_records` 演进

说明：

- 情绪小游戏虽然目前只有 4 个游戏，但应共享一张家族明细表。
- 未来社交沟通 / 生活自理 / 精细动作 / 安抚教具小游戏，如果仍属于“小游戏家族”，原则上应复用 `training_session_game_detail`，只有在结构差异过大时才新增新的家族明细表。

## 4.3 现有表到目标结构的映射

- `training_records`
  - 角色：旧版摘要表
  - 去向：迁移到 `training_session`
- `equipment_training_records`
  - 角色：器材摘要 + 局部详情混合表
  - 去向：拆为 `training_session` + `training_session_equipment_detail`
- `emotional_training_session`
  - 角色：情绪场景家族明细表
  - 去向：重挂到 `training_session.id`
- `emotional_training_detail`
  - 角色：情绪场景步骤明细表
  - 去向：继续保留，但上层会话键切换为新的家族明细主键
- `game_emotion_records`
  - 角色：情绪小游戏家族明细表
  - 去向：演进为 `training_session_emotional_game_detail`
- `student_badges`
  - 角色：情绪小游戏荣誉系统
  - 去向：保持独立，不并入训练记录主表

## 5. 分阶段实施计划

### Phase A：建立统一主表，不切读链

目标：

- 新增 `training_session`
- 新增必要索引
- 新增迁移辅助脚本与校验脚本
- 不改现有页面读路径

实施要点：

- 在 `src/database/init.ts` 中创建新表与索引
- 增加 `source_table / source_record_id`
- 增加统一查询 API 雏形，但不切消费者

验收标准：

- 新库初始化时可创建 `training_session`
- 老库升级时可安全迁移 schema
- 不影响当前所有页面读写

### Phase B：所有训练写入链改为双写

目标：

- 感官游戏写入 `training_records` 的同时写入 `training_session`
- 器材训练写入 `equipment_training_records` 的同时写入 `training_session`
- 情绪场景写入 `training_records + emotional_training_session` 的同时写入 `training_session`
- 情绪小游戏写入 `game_emotion_records` 的同时写入 `training_session`

实施要点：

- 为统一主表建立 `TrainingSessionWriter`
- 每条写链都必须带上：
  - `module_code`
  - `entry_code`
  - `session_family`
  - `completion_status`
  - 统一摘要指标

验收标准：

- 任意训练完成后，旧表与 `training_session` 同时有记录
- 双写失败时有明确日志与回滚策略
- 首页、学生详情、训练记录页暂不改读链，但可以人工核对新表已持续增长

### Phase C：统一读链切换到 `training_session`

目标：

- 训练记录菜单
- 入口训练记录页
- 学生详情游戏/器材统计
- 首页训练摘要
- 报表训练记录统计

全部改读 `training_session`

实施要点：

- 保留家族明细页读取细节表
- 列表层只认 `training_session`
- 详情跳转根据 `session_family` 决定进入哪个家族详情页

验收标准：

- 训练记录主列表不再依赖“来自哪张旧表”的前端分支判断
- 计数、筛选、排序、日期过滤在统一主表层完成
- 情绪小游戏、情绪场景、感官游戏、器材训练可在统一入口内一致显示

### Phase D：家族明细重挂与老表收口

目标：

- 家族明细表全部通过 `training_session_id` 关联统一主表
- 旧摘要表仅保留迁移兼容用途

实施要点：

- `emotional_training_session.training_record_id` 改造为 `training_session_id`
- `game_emotion_records` 演进为 `training_session_emotional_game_detail`
- 为通用游戏和器材训练补齐明确家族明细表

验收标准：

- 家族详情页全部由“统一主表 + 家族明细表”组合查询
- 新代码不再直接把旧摘要表当事实来源

### Phase E：历史数据回填与旧读链下线

目标：

- 将历史 `training_records / equipment_training_records / game_emotion_records` 回填进 `training_session`
- 旧读 API 下线或降级为兼容层

实施要点：

- 编写回填脚本
- 编写核对脚本
- 提供回填前后条数、学生维度、入口维度、日期维度对账报告

验收标准：

- `training_session` 的历史覆盖率达到目标阈值
- 主列表、学生详情、报表、统计不再依赖旧摘要表
- 旧表仍可保留，但不再是默认读源

## 6. 查询与授权策略

统一主表上线后：

- 页面授权仍按当前业务模块控制：
  - `sensory`
  - `emotional`
  - `social`
  - `life_skills`
  - `cognitive`
- 训练入口筛选按 `entry_code`
- 页面列表筛选按：
  - `module_code`
  - `entry_code`
  - `session_family`
  - `completion_status`
  - `started_at / created_at`

这意味着：

- 用户只采购情绪模块时，可以只开放 `module_code = emotional` 的页面与导航
- 数据库无需为授权而拆分主表
- 单机授权与本地备份恢复也更简单

## 7. 风险与控制

### 7.1 主要风险

- 双写阶段如果没有统一 writer，极易产生字段口径漂移
- 老记录中部分字段并不完整，历史回填会出现空值或推导值
- 情绪场景与小游戏的“完成状态”枚举不完全一致
- 旧报表逻辑可能直接绑定旧表

### 7.2 控制策略

- 所有新写入统一经由单一 writer
- 为统一主表定义固定字段口径，不允许页面自行猜测
- 明确 `completion_status` 统一枚举映射
  - 例如：`completed / cancelled / interrupted / aborted`
- 在回填阶段保留 `source_table / source_record_id`
- 每切一层读链，都必须配对校验脚本

## 8. 下一步建议执行顺序

建议下一轮直接按以下顺序开工：

1. 定稿 `training_session` 字段与索引
2. 在 `src/database/init.ts` 落 `training_session`
3. 新建统一 writer
4. 先改情绪小游戏和情绪场景写链做双写
5. 再改感官游戏写链
6. 再改器材训练写链
7. 最后切训练记录页、学生详情、首页和报表读链

## 9. 本文档的定位

本文档是下一步实施“统一训练记录主表 + 家族明细表”的现行计划入口。

它描述的是下一步落地方向，不代表当前代码已经完成这些结构。
