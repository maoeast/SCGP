# AI 智能体学生级长期记忆设计 v4.1（AI Student Memory）

> 日期：2026-08-05
> 版本：v4.1（定稿——已通过 ChatGPT 四轮审核；修订记录见 §15）
> 状态：**可进入实现**（M1 开工合同见 §14）
> 目标读者：产品 / 开发 / 审核（ChatGPT）
> 关联：AGENTS.md（本地优先、教师端边界）、src/stores/ai.ts（守卫层）、src/database/ai-api.ts、src/services/ai-tools.ts

---

## 1. 背景与目标

AI 智能体目前只有对话级记忆（ai_chat_session + ai_chat_message），跨会话无上下文。目标：为智能体提供**学生级长期记忆**——记住每个学生的关键事实（观察/偏好/已给建议/待跟进），跨会话自动注入，教师可查可删可确认。数据本地存储，模型调用遵循「数据不出校」授权边界。

## 2. 设计决策（v4 终版）

| 决策点 | 选择 | 历轮修订 |
| --- | --- | --- |
| 记忆粒度 | 跟学生绑定（student_id） | 不变 |
| 记忆来源 | AI 自动总结 → **pending 候选制**（教师确认后 confirmed） | v2 引入 |
| 记忆可见性 | 可查、可删、可确认/拒绝 | 不变 |
| 共享范围 | **学生服务团队实时最小权限** | v2 服务团队 → v3 实时计算 → v4 补确认来源标注 |
| 会话绑定 | 创建时可绑，**存在任一消息即锁定**（数据库级防竞态） | v3 修正条件 → v4 补库级约束 |
| 总结触发 | **消息水位增量 + 消息状态机门控 + 取消补偿** | v3 引入补偿 → v4 明确状态机 |
| 总结事务 | **两段式短事务（租约批次 → 模型调用 → CAS 原子提交）** | v4 修正：模型调用期间不持锁 |
| 去重策略 | **仅规范化文本完全相同自动去重；3-gram 只提示不自动 supersede** | v4 收敛（v3 的 3-gram 自动 supersede 被否） |
| 功能开关 | 学校级总开关**默认关闭**，管理员主动启用 | v3 修正 |

## 3. 架构总览

```
教师对话 ──▶ sendChat（stores/ai.ts，消息状态机见 §6.3）
                │
                ├─ 1. 会话-学生绑定：创建/切换时绑定；存在任一消息后库级锁定
                │
                ├─ 2. 记忆注入：读取该生【confirmed + 未过期】记忆
                │      → priority 排序（safety_critical ≤5 / pinned ≤10 优先）→ ≤20 条转义注入
                │
                ├─ 3. AI 回答（tool 循环 / 流式）
                │
                └─ 4. finalizeAssistantTurn()：assistant 消息【completed】后
                       → 两段式总结（§6.2）→ pending 候选 → 教师确认 promoted
                       → user-only 取消轮次由补偿任务补总结（§6.4）
```

## 4. 数据模型（v4）

### 4.1 新表 `ai_student_memory`

```sql
CREATE TABLE IF NOT EXISTS ai_student_memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,             -- 创建者（教师/系统）
  created_by_type TEXT NOT NULL DEFAULT 'teacher'
    CHECK (created_by_type IN ('teacher', 'ai', 'system')),
  agent_code TEXT NOT NULL DEFAULT '',
  session_id INTEGER,
  source_message_id INTEGER,
  source_type TEXT NOT NULL DEFAULT 'chat'
    CHECK (source_type IN ('chat', 'assessment', 'manual', 'migration')),
  category TEXT NOT NULL DEFAULT 'observation'
    CHECK (category IN ('observation', 'preference', 'advice_given', 'follow_up')),
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 200),
  confidence TEXT NOT NULL DEFAULT 'observed'
    CHECK (confidence IN ('observed', 'assumed')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected', 'superseded', 'archived')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'pinned', 'safety_critical')),
  priority_note TEXT NOT NULL DEFAULT '',     -- v4：标记为关键记忆的依据（必填）
  fingerprint TEXT NOT NULL DEFAULT '',       -- 规范化文本哈希（完全相同检测）
  possible_duplicate_of INTEGER,              -- v4：3-gram 相似提示（不自动 supersede）
  supersedes_id INTEGER,                      -- 教师确认后的替代链
  batch_id TEXT NOT NULL DEFAULT '',
  confirmed_by_user_id INTEGER,               -- v4：确认教师（权限历史）
  confirmed_at TEXT,                          -- v4
  effective_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  deleted_at TEXT,                            -- v4：软删除（审计保留）
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'verified', 'disputed')),
  model_provider TEXT NOT NULL DEFAULT '',
  model_name TEXT NOT NULL DEFAULT '',
  prompt_version TEXT NOT NULL DEFAULT '',
  generation_id TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES ai_chat_session(id) ON DELETE SET NULL,
  FOREIGN KEY (source_message_id) REFERENCES ai_chat_message(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (confirmed_by_user_id) REFERENCES user(id) ON DELETE SET NULL,
  FOREIGN KEY (possible_duplicate_of) REFERENCES ai_student_memory(id) ON DELETE SET NULL,
  FOREIGN KEY (supersedes_id) REFERENCES ai_student_memory(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_mem_student ON ai_student_memory(student_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_mem_cat ON ai_student_memory(student_id, category, status);
CREATE INDEX IF NOT EXISTS idx_ai_mem_fp ON ai_student_memory(student_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_ai_mem_dup ON ai_student_memory(possible_duplicate_of);
```

### 4.2 消息表扩展（v4.1：状态机 + 消息类型）

```sql
safeAddColumn(rawDb, 'ai_chat_message', 'delivery_status TEXT NOT NULL DEFAULT '''')
safeAddColumn(rawDb, 'ai_chat_message', 'completed_at TEXT')
safeAddColumn(rawDb, 'ai_chat_message', 'message_kind TEXT NOT NULL DEFAULT ''')
-- message_kind: ''（历史/用户消息）/ 'final'（最终回复）/ 'tool_call' / 'tool_result'（tool 中间轮次）
```

- `delivery_status` 取值与流转见 §6.3；
- `message_kind='final'` 区分最终回复与 tool 中间消息——**总结只读取 user + completed final**，tool_call/tool_result 不参与总结输入；
- 历史消息（无列之前）`delivery_status=''` 视为 **legacy completed**（可读，不自动补总结），`message_kind=''` 视为 final。

### 4.3 会话表扩展（v4.1：水位=扫描游标）

```sql
safeAddColumn(rawDb, 'ai_chat_session', 'student_id INTEGER')
safeAddColumn(rawDb, 'ai_chat_session', 'memory_watermark INTEGER NOT NULL DEFAULT 0')
-- 批次/租约/重试/状态全部移到 ai_memory_summary_batch（4.4），会话表不再承担
```

**水位语义（v4.1 明确）**：`memory_watermark` 是**扫描游标**（已检查到的最大消息 id），不是"已成功总结"的位置。user-only 取消轮次总结后，水位推进到 cancelled assistant 行 id（避免反复扫描）；cancelled 正文不进入输入。

**库级防竞态（v4 新增）**：绑定锁定的判断在**事务内**完成（`SELECT ... FOR UPDATE` 语义不可用，SQL.js 单线程——用"写前先读 + 事务内 UPDATE 条件化"实现）：

```sql
-- 绑定/改绑操作统一走一条事务 SQL：
UPDATE ai_chat_session SET student_id = ?
WHERE id = ?
  AND NOT EXISTS (SELECT 1 FROM ai_chat_message WHERE session_id = ?)
-- 受影响行数 = 0 表示已有消息，绑定被拒绝（事务级原子，无应用层竞态）
```

### 4.4 新表 `ai_memory_summary_batch`（v4：总结批次状态机）

```sql
CREATE TABLE IF NOT EXISTS ai_memory_summary_batch (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  batch_id TEXT NOT NULL UNIQUE,        -- 调用前持久化生成的稳定批次 id
  student_id INTEGER NOT NULL,
  from_message_id INTEGER NOT NULL,     -- 本批起始消息（watermark+1）
  to_message_id INTEGER NOT NULL,       -- 本批截止消息（调用前确定）
  input_hash TEXT NOT NULL,             -- 输入片段哈希（幂等校验）
  state TEXT NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'summarizing', 'done', 'failed', 'cancelled')),
  lease_until TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES ai_chat_session(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ai_batch_session ON ai_memory_summary_batch(session_id, state);
CREATE INDEX IF NOT EXISTS idx_ai_batch_lease ON ai_memory_summary_batch(state, lease_until);
-- v4.1：活动批次唯一索引（每会话单飞：同一会话最多一个 pending/summarizing 批次）
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_batch_active
  ON ai_memory_summary_batch(session_id) WHERE state IN ('pending', 'summarizing');
```

### 4.5 审计表 `ai_student_memory_audit`（v4：不级联删除）

```sql
CREATE TABLE IF NOT EXISTS ai_student_memory_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'confirm', 'reject', 'update', 'delete', 'expire', 'promote', 'mark_priority')),
  user_id INTEGER,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
-- v4 修订：不设 FK ON DELETE CASCADE（防止删除记忆时连审计证据一起删）；
-- 记忆删除为软删除（deleted_at），审计记录永久保留，需清理时由管理员显式操作并脱敏。
```

## 5. 去重与冲突（v4 收敛）

- **自动去重仅限**：规范化文本（去空白/全角转半角/小写）**完全相同** → 自动合并（UPDATE 保留最新时间，不新增行）；
- **3-gram 相似（≥0.8）**：只写 `possible_duplicate_of` 提示字段，**不自动 supersede**；
- **supersede 仅在教师确认时发生**：教师看到 `possible_duplicate_of` 提示后选择"确认合并"，才将旧条目标记 superseded 指向新条目；
- 旧 confirmed **不得**在新 pending 确认前失效（pending 只是候选，不影响已确认记忆）。

## 6. 总结与写入链路（v4）

### 6.1 统一提交点 finalizeAssistantTurn

仅 **assistant 消息 `delivery_status='completed'`** 后调用；取消/失败由补偿任务处理（§6.4）。

### 6.2 两段式事务（v4 P0 核心修订：模型调用期间不持锁）

```
阶段 A（短事务①）：
  1. 条件更新批次租约：INSERT ai_memory_summary_batch
     (batch_id = uuid, from = watermark+1, to = 当前最新消息 id, input_hash)
     WHERE 该会话无 pending/summarizing 批次；COMMIT（短）
  2. 组装输入片段（to-from 消息，≤4000 字符，脱敏）
阶段 B（模型调用，无锁）：
  3. 调专用总结接口（超时/失败 → 批次置 failed，attempt_count+1，指数退避）
阶段 C（短事务②，CAS 提交）：
  4. 校验：批次 still pending 且 watermark < to
  5. 同一事务：写 pending 候选（带 batch_id）→ CAS 推进水位
     `UPDATE ai_chat_session SET memory_watermark = ? WHERE id = ? AND memory_watermark = ?`
     （检查 changes()==1，失败即并发推进）→ 批次 state='done' → attempt_count=0；COMMIT
  6. CAS 失败（水位被并发推进）→ 批次置 cancelled，丢弃本次结果
```

- `batch_id` 在调用前持久化（阶段 A），重试命中同一批次，天然幂等；
- **每会话单飞（v4.1）**：活动批次唯一索引（§4.4）保证同一会话同时最多一个活动批次；不同会话的模型调用可并行，DB 操作由 SQL.js 单线程天然串行；
- 失败重试：`attempt_count` 达 3 次 → 批次 `failed`，由补偿任务或下次会话重试；
- **批次保留策略（v4.1）**：`cancelled` 保留 30 天、`failed` 保留 90 天、`done` 保留 180 天或每会话最近 20 批，到期物理清理（记忆与审计记录不受影响）。

### 6.3 消息状态机（v4.1：非流式/流式/tool 统一协议）

```
发送 user 消息 ──▶ 持久化 user（delivery_status=''，用户消息无状态）
assistant 开始 ──▶ INSERT assistant 行（delivery_status='streaming'，message_kind='final'）
分块更新       ──▶ UPDATE content（streaming 态）
正常完成       ──▶ 事务：delivery_status='completed' + completed_at=now
取消/异常      ──▶ 事务：delivery_status='cancelled'（工具路径）
               ──▶ 事务：delivery_status='failed'（异常路径，保留已写正文）
tool 中间轮次  ──▶ 独立消息行：message_kind='tool_call'/'tool_result'（无 streaming 状态）
```

- **非流式路径（tool 循环）**：先 INSERT `streaming` 占位行 → 完整内容返回后一次 UPDATE 正文并置 `completed`（两跳，无分块）；
- **流式路径**：新增三个 ai-api 方法 `createAssistantMessage()` / `updateAssistantChunk()` / `finalizeAssistantMessage()`（先插行 → 分块更新 → 事务置 completed）；
- **tool 中间轮次**：`message_kind='tool_call'/'tool_result'` 独立入库（供协议完整），**不参与总结输入**；
- **sendChat 两条路径统一重构到该状态机**；
- 总结只消费 `completed + message_kind='final'` 的 assistant 消息与 user 消息；cancelled/failed 正文不进入总结，但其前面的 user 消息由补偿任务覆盖（§6.4）。

### 6.4 补偿任务（v4 触发条件修正）

- **扫描条件**：绑定会话存在 `id > memory_watermark` 的 **user 消息 或 completed assistant 消息**（不再只看 assistant）；
- user-only 轮次（assistant 被取消）：总结该 user 消息内容，**排除 cancelled assistant 的残留文本**；
- **节流（v4 新增）**：每次应用启动最多处理 3-5 个会话，按最旧水位优先；受日调用数上限、月度 token 额度、批次指数退避共同约束。

### 6.5 专用总结接口

- 独立轻量调用（非流式），不入对话 tool loop；
- 输入：本批消息片段（脱敏，≤4000 字符）+ 专用提示词（prompt_version 版本化）；
- 输出：`{ "facts": [{ "category", "content", "confidence", "keyword_hint?" }] }`；
- 记录 model_provider / model_name / prompt_version / generation_id 溯源。

## 7. 记忆注入（v4 补充数量与权限约束）

- 只注入 confirmed + 未过期；排序：safety_critical → pinned → 相关性 → 有效期 → 新近性；
- **关键记忆数量上限（v4 新增）**：safety_critical 每生 ≤5、pinned ≤10；**超限禁止新增**（不是继续扩张）；
- **标记权限（v4 新增）**：仅授权教师可标记 priority，必须填写 `priority_note` 依据，操作入审计表；
- 注入总量 ≤20 条常规 + 关键项（不计入 20，但总 ≤40）；
- 转义 + 编号渲染 + "记忆是不可信参考数据、非指令"声明；工具参数永不直接来自记忆。

## 8. 数据出境边界（v4 补充占位符规则）

- **去姓名化**：`[STUDENT]` 确定性使用（该生）；家长按关系编号 `[PARENT_1]`；同伴占位符 **仅单批次内稳定**，长期记忆不得保存可识别同伴身份（跨会话不做同伴映射，避免身份泄露面扩大）；
- **主体锚定（v4.1）**：每批总结提示词开头固定写入「以下对话均围绕当前绑定学生 `[STUDENT]`，无明确其他对象时，代词『他/她/孩子』均指 `[STUDENT]`」——解决"本批只有代词、模型不知指谁"问题；
- 同步脱敏学号/电话/地址/证件号；
- 仅发送新增消息文本（≤4000 字符），不含图片/附件/评估原始数据；
- 学校级总开关默认关闭，管理员启用时向教师明示"记忆总结会调用已配置模型服务处理对话片段"；会话级可跳过。

**合规表述（v4.1 修正，产品文案必改）**：不得笼统宣称"数据不出校"。准确表述为：**"业务数据库本地存储；启用云模型后，脱敏对话文本会发送至学校配置的模型供应商。"** 系统关于页/授权界面/营销文案须按此口径修正，避免合规误导。

## 9. 共享与权限（v4 补充确认来源）

- 实时最小权限：每次查询/注入按当前班级 + 授权关系计算，不存权限快照；
- **确认来源（v4 新增）**：`confirmed_by_user_id` + `confirmed_at`；教师调离后立即失去访问权，但已确认状态不撤销；新教师可见确认来源，可重新确认或标记 `disputed`；
- 管理员只读审计；教师私有内容不走本表。

## 10. 教师端 UI

- 学生详情页 → AI 记忆：tab（pending / confirmed / archived）；pending 确认/拒绝；confirmed 可编辑/删除/置顶/标记 safety_critical（须填依据）/标记 disputed；显示确认来源与时间；
- pending 独立配额 + 30 天超期归档（§11）；
- AI 对话抽屉：绑定学生选择器、列表显示绑定、存在消息后锁定（库级拒绝）、"记忆"按钮。

## 11. 数量治理（v4 修正配额矛盾）

| 范围 | 配额 | 淘汰规则 |
| --- | --- | --- |
| **confirmed 有效记忆**（v4.1：仅计未删除、未过期） | observation 100 / preference 50 / advice_given 50 / follow_up 50（每生每类） | archived → superseded → rejected 优先清，再按 effective_at 旧到新 |
| **pending 独立配额** | 每生每类 ≤50，**独立于 confirmed，不挤占** | 30 天未处理自动归档 |
| **关键项** | safety_critical ≤5 / pinned ≤10（全局保护） | 不参与自动淘汰，仅教师手动操作 |

- **非有效状态不计配额，但设清理期（v4.1）**：rejected / superseded / archived 不占配额，但保留 365 天或每生历史 ≤500 条后物理清理（审计记录保留）；
- `follow_up` 教师标记"已完成" → archived（可回溯）；
- 自动归档任务随补偿任务运行。

## 12. 成本与开关

- 触发：新增消息累计 ≥3 条 或 会话空闲 5 分钟（补偿场景为增量补总结）；
- 三级开关：学校级总开关（默认关，管理员启用）+ 会话级跳过 + 月度额度截断；
- 补偿节流：每次启动 3-5 会话 + 日调用上限 + 额度限制；
- 单条成本：约 2k 输入 + 200 输出 token。

## 13. 治理与备份（v4.1 补迁移规则）

- **软删除**：记忆删除写 `deleted_at`，不物理删除；审计表永久保留；
- **备份保留期**：备份文件最大保留 N 份（默认 10 份）或 M 天（默认 180 天），超期由备份管理器清理；
- **恢复后墓碑清除**：恢复备份后，对被删记忆（deleted_at 非空）执行二次软删除状态确认；`ai_student_memory_audit` 中的快照脱敏后保留（不含证件号等敏感字段）；
- **迁移防回灌（v4.1，M1 必做）**：
  - 历史消息 `delivery_status=''` 视为 legacy completed（可读），**默认不自动补总结**；
  - 历史会话 `memory_watermark` 初始化为**现有最大消息 id**（跳过历史，只总结未来新消息）；
  - 迁移用版本化事务 + `PRAGMA table_info` 判列 + `IF NOT EXISTS` 建表建索引，幂等可重跑；
- 管理员清理审计记录需显式操作并记录到系统操作日志。

## 14. 里程碑（v4.1 顺序 + M1 开工合同）

| 里程碑 | 内容 | 门禁 |
| --- | --- | --- |
| M1 数据层 + 消息状态机 | 新表（memory/batch/audit）+ 消息状态机列（delivery_status/completed_at/message_kind）+ 会话绑定 + ai-api CRUD + 状态机协议重构 + 迁移防回灌 | 迁移幂等 + 状态机契约测试 |
| M2 总结链路 | 两段式事务 + 批次表 + 补偿任务 + 脱敏 + 去重 | **M2 起同步编写故障测试**（取消/崩溃/重复触发/CAS 失败） |
| M3 权限与注入 | 实时权限 + 确认来源 + 转义排序注入 + 守卫协同 | 权限边界契约测试 |
| M4 审核 UI | pending 确认流 + 绑定/锁定 + 审计入口 + 开关 + 合规文案修正 | UI 验收 |
| M5 测试 | 全链路契约 + 生命周期/配额/过期/补偿/恢复 | 全量回归 |

**M1 开工前五项合同（v4.1 终审确认）**：
1. 消息表新增 `message_kind`（final/tool_call/tool_result），区分最终回复与 tool 中间轮次；
2. `memory_watermark` 语义 = 扫描游标（已检查到的最大消息 id），非"已总结位置"；
3. 批次表活动批次唯一索引 `UNIQUE(session_id) WHERE state IN ('pending','summarizing')`（每会话单飞）；
4. 历史会话水位初始化为现有最大消息 id，默认不自动补总结（防回灌）；
5. 关键优先级（safety_critical/pinned）增加数据库约束（数量上限）+ 授权校验（仅授权教师 + priority_note 必填）。

## 15. 审核修订记录

### v1 → v2（第一轮：9 P0 + 7 P1）→ 见 v2 版本文档 §14（16 条）
### v2 → v3（第二轮：5 新 P0 + 9 未闭合）→ 见 v3 版本文档 §15（12 条）

### v3 → v4（第三轮：4 新 P0 + 5 P1 + M1 建议）

| # | 级别 | 意见 | v4 处理 |
| --- | --- | --- | --- |
| 1 | P0 | 模型调用期间不能持 SQL 事务；batch_id 须调用前持久化 | §6.2 两段式短事务（租约批次 → 模型调用 → CAS 原子提交）；batch_id 阶段 A 持久化 |
| 2 | P0 | 补偿扫描抓不到 user-only 轮次 | §6.4 扫描条件改为"id>watermark 的 user 或 completed assistant" |
| 3 | P0 | 流式持久化协议未定义 | §6.3 消息状态机（streaming→completed/cancelled/failed），sendChat 两路径统一重构 |
| 4 | P0 | 3-gram 不应自动改变生命周期 | §5 仅完全相同自动去重；3-gram 只写 possible_duplicate_of 提示，supersede 须教师确认 |
| 5 | P1 | 关键记忆失控 | §7 safety_critical ≤5 / pinned ≤10，超限禁止新增；授权教师标记 + 依据 + 审计 |
| 6 | P1 | 审计表 CASCADE 删证据 | §4.5 不级联删除；记忆软删除 + 审计保留 |
| 7 | P1 | 占位符跨会话映射未定义 | §8 同伴占位符仅批次内稳定，长期记忆不保存可识别同伴身份 |
| 8 | P1 | 补偿调用需节流 | §6.4 每次启动 3-5 会话 + 日上限 + 额度 + 退避 |
| 9 | P1 | 确认来源缺失 | §9 confirmed_by_user_id/confirmed_at；调离不撤销，可 disputed |
| 10 | P1 | pending 配额矛盾 | §11 pending 独立配额不挤占 confirmed |
| 11 | P1 | §15 声称备份规则正文没有 | §13 补软删除/备份保留期/恢复后墓碑清除正文 |
| 12 | P1 | 绑定竞态 | §4.3 库级事务条件更新（EXISTS 检查在同一 UPDATE 内） |
| 13 | P1 | M1 表结构建议 | §4 全部采纳：session 瘦身、batch 表、completed_at、confirmed_by_user_id、possible_duplicate_of、deleted_at、审计不级联 |

### v4 → v4.1（第四轮终审：可进入实现；0 P0 + 8 P1/P2 + 1 合规修正）

| # | 级别 | 意见 | v4.1 处理 |
| --- | --- | --- | --- |
| 1 | P1 | tool 中间消息是否入库/参与总结未说明；缺区分字段 | §4.2/§6.3 message_kind（final/tool_call/tool_result），总结只读 user + completed final |
| 2 | P1 | priority_note 未设 DB 约束 | M1 合同⑤：关键优先级数量上限 + 授权校验 + priority_note 必填 |
| 3 | P1 | 缺每批对话主体锚定 | §8 主体锚定提示（代词均指 [STUDENT]） |
| 4 | P1 | 轻量 CAS 具体写法 | §6.2 阶段 C：CAS UPDATE + changes()==1；活动批次唯一索引（每会话单飞） |
| 5 | P1 | 水位语义模糊 | §4.3 明确 = 扫描游标；user-only 总结后推进到 cancelled 行 id 防反复扫描 |
| 6 | P1 | 批次保留策略 | §6.2 cancelled 30 天 / failed 90 天 / done 180 天或每会话最近 20 批 |
| 7 | P1 | 配额统计口径 | §11 只计未删除未过期 confirmed；rejected/superseded/archived 不占配额但 365 天清理期 |
| 8 | P1 | 迁移历史回灌 | §13 历史 delivery_status='' = legacy completed；历史会话水位=现有最大消息 id，不自动补总结 |
| 9 | P1 | 合规表述"数据不出校"误导 | §8 修正为"业务数据库本地存储；启用云模型后脱敏对话文本发送至学校配置的模型供应商"（产品文案/授权界面必改） |

## 16. 参考

- 技能机制：`src/data/skills/`；工具机制：`src/services/ai-tools.ts`；守卫层：`src/stores/ai.ts`；会话持久化：`ai_chat_session` / `ai_chat_message`
- 审核意见来源：ChatGPT 审查意见 v1 / v2 / v3（2026-08-05）
