# DB Worker 处理执行计划（2026-08-05）

> 主题：DB Worker 验证路径已打通后的处理方式——先 profile 决策，再按证据渐进接入。
> 适用：新会话按本文档执行；执行前先读 `AGENTS.md` → `.continue-here.md` → 本文档。
> 状态：已批准执行（用户 2026-08-05 指令"落地为文档，放新会话执行"）。

---

## 1. 目标与决策原则

**总目标**：让 DB Worker 从"可验证的实验路径"变成有证据支撑的工程决策，而不是盲目投入。

**决策原则**：
1. 没有性能痛点数据，不投入主链接入（2-3 周量级的大工程，需要数据背书）。
2. 每一步都有可复现的验证方式，不信口头保证。
3. 全程保留回退开关（`VITE_USE_DB_WORKER`），主线程 `SQLWrapper` Plan B 始终可用。
4. 遵守 AGENTS.md 禁止清单：不引入原生依赖、不改变授权链 / 训练记录主表语义。

## 2. 现状事实（代码证据，2026-08-05 核对）

### 已完成（本次三个 commit）

| Commit | 内容 |
|---|---|
| `b235d1f` | 登录背景 Three.js 星空清理（与本主题无关的顺带项） |
| `3976298` | **dev 下 DB Worker 加载失败修复**：根因是 `optimizeDeps.exclude: ['sql.js']` 阻止依赖预构建，worker 裸导入被转成带 `?v=` URL，Vite 返回 200 空响应（Outdated Optimize Dep 机制），worker 不经 Vite 客户端拿到空模块整体失败。修复 = 移除 exclude，worker 走预构建 ESM 包装；主线程经 `?url` + `<script>` 标签加载（`sqljs-loader.ts`）不受影响 |
| `b705405` | **防抖保存自激循环修复**：`performAtomicSave` 未在开始时接管 `isDirty`，finally 总读到遗留标记并重新触发，形成每 2 秒一次的无尽导出循环。修复 = 保存开始 `isDirty = false`（对齐 `SQLWrapper` 语义）。验证：dev 下 15 秒窗口仅 1 次保存 |

### 当前状态（验证后）

- ✅ dev 下 Worker 全链路可用：模块加载 → `initSqlJs` → SQL.js 初始化（~15ms）→ schema 建表 → 防抖保存 → `save_database` 消息；`Worker 未就绪` 警告消失；devtools `WorkerTest` 页可跑。
- ✅ 生产构建正常（`build:web` 40s，db.worker chunk 42KB）。
- ⚠️ **主链零消费**：`getWorkerBridge()`（`init.ts:2865` re-export）无调用方；`BridgeSQLWrapper`（`src/workers/bridge-sql-wrapper.ts`）零消费者；业务 API（`api.ts` 125KB）全部走主线程同步 `SQLWrapper`。
- ⚠️ **生产不启动**：`init.ts:1626` 仅 `import.meta.env.DEV || VITE_USE_DB_WORKER` 时并行初始化 Worker。
- ⚠️ **双轨 DB 副本**：主线程 SQLWrapper 与 Worker 各持一份独立 sql.js 实例，各自防抖保存都会落盘——**后写覆盖先写**。这是接入前必须解决的硬问题。

### 相关文档立场

- `AGENTS.md` §3：DB Worker 主链 = 未完成（现状仍准确，勿误判）。
- `重构实施技术规范.md` §4.2：主线程 `database-loader.ts` + `SQLWrapper` 是稳定 Plan B；`db.worker.ts` / `db-bridge.ts` 是保留分支。
- `docs/reports/2026-07-17-current-project-gap-and-recommendations.md` §5.5：先 profile 再决定推进 Worker。

## 3. 阶段 0：性能 profile（决策门，约半天）

**目标**：产出主线程 SQLWrapper 的性能基线，回答"Worker 化是否值得"。

**方法**（现有工具优先）：
1. devtools 的 `BenchmarkRunner` 页（`src/views/devtools/BenchmarkRunner.vue`，套件在 `tests/performance/benchmarks`）：跑 `db-export` / `read` / `write` / `batch-query` 全套，记录基线。
2. 补一个**大数据量**测量（现成套件数据量可能偏小）：临时脚本向训练记录主表（`sys_training_record` 或等价主表）批量插入 1k / 5k / 10k 行，测量：
   - 全量/分页查询耗时（`SQLWrapper.all`）
   - 批量插入耗时与 `lastInsertId` 开销
   - `db.export()` 耗时与结果体量（决定防抖保存成本）
   - 初始化（`initDatabase`）耗时
3. 观察点：UI 层可感知卡顿（主线程同步查询阻塞渲染）。

**决策门（写入报告并回填本文档）**：
- 10k 行量级单查询 > 100ms，或初始化 > 1s，或 export > 100ms → **有痛点** → 进阶段 1。
- 无痛点 → **维持现状**，Worker 保持实验路径；把 profile 数据存档，下次遇到性能问题再评估。

**成功标准**：一份含数据、结论与决策的记录（建议落 `docs/reports/2026-08-05-db-worker-profile.md`）；`type-check` 通过；profile 脚本不留在 src（临时脚本用完删或放 `scripts/` 不入主链）。

## 4. 阶段 1：渐进式接入（仅当阶段 0 有痛点，约 2-3 周）

**顺序固定，不可跳步：**

### 4.1 先解决双轨持久化冲突（前置，不可省略）

问题：主线程 SQLWrapper 与 Worker 是两份独立 DB，各自防抖保存 → 后写覆盖先写，数据丢失风险。

方案（三选一，推荐 a）：
- **a. 单写者**：主线程仍负责持久化（防抖 + IPC 原子写），Worker 只读（`PRAGMA query_only = ON` 或主线程定期把最新 DB 快照同步给 Worker）。
- **b. 主线程代理写**：Worker 执行写操作，但落盘仍由主线程执行（Worker 把变更后的完整 DB 传给主线程保存）——即当前 `save_database` 消息链路，但需主线程不再自持写副本。
- **c. 单一权威 + 版本仲裁**：双副本都落盘但带版本号，启动时取新。复杂度最高，不推荐。

### 4.2 同步/异步鸿沟决策（最大工程量）

事实：主链 API 是同步调用面（`api.ts` 125KB + 多个 `*-api.ts`）；`DatabaseBridge` / `BridgeSQLWrapper` 全部异步。

- **方案 A（推荐先评估）：同步桥**——Electron 渲染主线程用 `SharedArrayBuffer + Atomics.wait` 实现同步等待 Worker 响应，保持现有调用面零改动。风险：需要 `crossOriginIsolated` 或 Electron 允许 SAB；死锁防护（超时 + 错误传播）；`postMessage` 的 transferable 处理。
- **方案 B：异步化改造**——调用面全改 async（波及面大，需逐模块迁移，回归成本高）。
- **方案 C：渐进式模块化**——选高频低风险模块（如训练记录写入）先走 Worker，其余仍主线程；双轨并存期间数据一致性由 4.1 方案兜底。

### 4.3 试点模块与回退

- 试点建议：训练记录写入（高频、事务简单、可量化）。
- 开关：`VITE_USE_DB_WORKER=true` 启用；关闭即回主线程 SQLWrapper（默认关闭，直到全量验证通过）。
- 试点验收：与主线程路径做**数据一致性对拍**（同输入 → 同落盘结果）；现有测试全过（`test:core:node`、`test:core:ts`、`type-check`、`build:web`）。

## 5. 阶段 2：低成本清理项（可随时做，与阶段 0/1 无依赖）

| 项 | 内容 | 工作量 |
|---|---|---|
| 2-1 | `db.worker.ts` / `db-bridge.ts` / `command-queue.ts` 的调试 `console.log` 加 `DEBUG` 门控（生产已被 terser `drop_console` 清掉，dev 噪音大） | 0.5h |
| 2-2 | `worker-init.ts` 直建 `DatabaseBridge` 实例与 `db-bridge.ts` 单例 `getDatabaseBridge()` 双管理并存——统一为单例或明确职责 | 0.5-1h |
| 2-3 | `init.ts` DEV 下每次启动都并行初始化一份 Worker（白跑一份 DB）——若暂不接入，改为仅显式开关或 WorkerTest 触发 | 1h |
| 2-4 | WorkerTest 页（`src/views/devtools/WorkerTest.vue`）补充 schema 建表后的真实查询用例（现在只测 `SELECT 1`） | 1h |

## 6. 风险与边界

- **禁止引入**：原生编译依赖（sqlite3 等）、新状态管理库；Worker 方案必须仍基于 `sql.js`。
- **不改变**：授权链 / 训练记录主表 schema / `resource://` 协议语义。
- **双轨数据一致性**是最大风险点，任何接入方案必须先解决 4.1，否则禁止合并。
- 回退开关任何时候都不得移除，直到 Worker 全量验收通过并运行一段时间。
- 本主题不包含 Image Worker（另立专题，同样需要先 profile）。

## 7. 相关文件

- Worker 实现：`src/workers/db.worker.ts`（564 行）、`db-bridge.ts`、`command-queue.ts`、`bridge-sql-wrapper.ts`、`types/worker-messages.ts`
- 初始化链路：`src/database/init.ts`（`initWorkerPath` ~1624-1678、re-export ~2865）、`src/database/worker-init.ts`
- 主线程对照：`src/database/sql-wrapper.ts`（同步 Plan B）、`src/database/sqljs-loader.ts`（script 标签加载）、`src/database/database-loader.ts`
- 测试页：`src/views/devtools/WorkerTest.vue`；性能套件：`tests/performance/benchmarks`、`src/views/devtools/BenchmarkRunner.vue`
- 配置：`vite.config.ts`（`optimizeDeps` 已移除 sql.js exclude；`worker.format: 'es'`）
- 文档：`重构实施技术规范.md` §4.2、`docs/reports/2026-07-17-current-project-gap-and-recommendations.md` §5.5
