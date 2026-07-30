# 2026-07-17 当前项目功能完成度调查与建议

> 文档类型：当前事实快照 + 未完成项盘点 + 推进建议  
> 调查日期：2026-07-17（最后核实：2026-07-30）  
> 适用范围：SCGP / 星愿能力发展平台当前 `main` 工作区  
> 目的：把本次 Codex 调查结论固化为后续人工与 Codex 均可续读的项目状态文档，避免把目标态误记为现状。
> **核实注**：2026-07-30 核对代码后，多项已闭环（标注 📌 已闭环）。详见底部「后续推进记录」。

## 1. 总判断

当前项目不是“功能很少”的状态，而是“业务能力扩展较快，入口闭环、状态源统一、测试与发布验收落后于功能增长”的状态。

已落地的能力已经覆盖感统、情绪、社交、生活技能、认知评估、资源、训练记录、IEP、AI 助手等多个方向。但当前仍处于过渡期：很多功能通过静态路由、局部 catalog、独立页面或硬编码入口接入，平台级注册表、报告中心、授权状态、备份恢复、资源文件生命周期、发布验证还没有完全收口。

推进策略应从“继续加页面/游戏”切换为“补入口、统一事实源、补验收闭环”。优先做小而确定的收口任务，再做跨模块平台化。

## 2. 调查口径

- 以当前代码为第一事实来源；旧文档仅作历史参照。
- 按 `AGENTS.md` 要求区分三态：已实现、过渡态、未实现。
- 本次只做调查与文档固化，不改变业务代码。
- 本次验证过的命令：
  - `npm run type-check`：通过。
  - `npm run build:web`：通过；存在大 chunk 与静态/动态混用 import 警告。
  - AI 合同类 node 测试：18/18 通过。
  - 训练/评估/资源/生活自理相关抽样测试：通过。
  - `npx jiti tests/entitlement-catalog.test.ts`：失败；当前 cognitive entitlement 为 `active`，测试仍预期 `placeholder`。

## 3. 已实现

以下能力已经有实质代码与业务闭环，不应再按“未开始”处理。

- 感统主链仍是当前最完整主线：评估、训练、资源、记录、报告、推荐链路相对完整。
- 评估体系已接入 `AssessmentContainer + ScaleDriver` 主链，当前注册了 15 个量表。
- 自定义训练游戏数量已经明显扩展：情绪 6 个、精细动作 5 个、社交 6 个、安抚 5 个、生活技能 5 个，另有经典感统游戏。
- 训练记录、资源收藏、资源备份/恢复代码、孤儿清理、生活技能任务训练均已有实现基础。
- 社交与生活技能不再是纯文档目标：已有游戏、IEP、推荐或任务训练能力，只是平台入口与模块注册还未完整收口。
- 资源备份恢复不再只是旧文档中的 schema 级方案；当前代码已推进到资源文件 zip 归档、动态 schema 与降级兼容方向，但仍需要完整桌面端验收。
- AI 助手已有较大规模未提交改动，包括预设、技能库、会话、附件、工具循环等，需要按真实 provider 和隐私边界做验收。

## 4. 过渡态

这些能力“有代码、能看见方向”，但还不能按完整平台能力对外交付。

- 社交模块：业务功能与 IEP 已有实质能力，但 `ModuleRegistry` 中仍偏实验态，社交故事、对话等入口仍有 coming soon 或占位性质。📌 **2026-07-30 注**：ModuleRegistry 已注册 SOCIAL（C09），但 status 仍为 `experimental`。
- 生活技能模块：已有 5 个游戏与自理任务训练。📌 **2026-07-30 注**：已进入 `ModuleRegistry`（C09），status `active`。
- 认知模块：已有 52 条器材资源和 BRIEF/CRT/CognitiveSelf 三个评估入口，量表内容是 DRAFT。📌 **2026-07-30 注**：P0 四游戏（K01/K03/K04/K05）已落地，有了训练闭环；P1/P2 六游戏待开发。
- IEP 抽象：生产页面仍走硬编码生成函数。📌 **2026-07-30 注**：策略接口 `IEPStrategy` 已在 C10 整条删除退役，方向已决策为硬编码 generator + 按需扩展。
- 路由体系：真实路由仍是 `src/router/index.ts` 静态表，`ModuleRegistry` 不是动态装配来源。
- AI：当前属于快速扩展中的工作区状态，必须做真实 token、历史会话、附件清理、隐私提示与失败路径验收后再定为稳定能力。

## 5. 未实现或未收口项

### 5.1 报告中心认知三量表入口 📌 已闭环（评估入口动态化，2026-07-19）

Reports.vue 已改为 catalog 驱动：`REPORT_TYPE_OPTIONS` 从 `ASSESSMENT_REPORT_CATALOG.map` 展开，15 量表全自动覆盖（含 brief/crt/cognitive_self）。统计、筛选、跳转均通过 `isAssessmentReportScaleType`/`buildAssessmentReportRoute` 统一处理。一致性测试 `assessment-report-center-catalog.test.mjs` 已覆盖。

### 5.2 认知量表内容仍是 DRAFT

`BRIEFDriver.ts`、`CRTDriver.ts`、`CognitiveSelfDriver.ts` 均带有自编或 DRAFT 属性。CRT 只有少量演示题，CognitiveSelf 为 12 题草案。

影响：可以内部试用，但不应对外宣称为标准化认知测评。

建议：继续保留“内部筛查 / 非标准化”提示。正式交付前需要专业审核、授权题库或本地常模策略。

### 5.3 ModuleRegistry 部分陈旧 📌 已闭环（C09，2026-07-19）

`ModuleRegistry` 已注册全部 6 模块（SENSORY/EMOTIONAL/SOCIAL/COGNITIVE/LIFE_SKILLS/RESOURCE），一致性测试 `module-registry-consistency.test.mjs` 锁定。功能路由引用已收敛为通用入口。**仍欠**：路由表本身未改为注册表驱动装配。

### 5.4 IEP 策略主链已退役 📌（C10，2026-07-18）

IEP 策略接口 `IEPStrategy`/`registerIEPSstrategy`/`initializeStrategies()` 已在 C10 整条删除。`src` 下 `IEPStrategy` 零命中。方向已决策为硬编码 generator + 按需扩展，不再保留策略架构。

### 5.5 DB Worker / Image Worker 不是生产主链

当前数据库主线仍是渲染进程 `sql.js + SQLWrapper + IPC 原子持久化`。DB Worker 相关代码主要偏 devtools 或实验路径；Image Worker 尚未形成运行时主链。

影响：这不是当前功能阻断项，但大数据量或重图像处理时可能成为性能瓶颈。

建议：先做性能 profile，再决定是否推进 Worker。没有测量数据前，不建议把 Worker 作为 P0。

### 5.6 资源文件生命周期仍需端到端验收

代码层面已经包含收藏、备份 zip、动态 schema、孤儿清理等能力，但桌面端“备份 -> 删除/清库 -> 恢复 -> 校验资源文件可用”的完整验收仍应补齐。

影响：资源文件是本地优先产品的数据安全底线，不能只凭 type-check 判断可交付。

建议：补一条 Electron 真机验收脚本或手工验收记录，覆盖数据库记录、物理文件、resource:// 访问、收藏状态、孤儿清理。

### 5.7 AI 隐私与生命周期未收口

当前 AI 能力处于活跃开发状态。需要重点关注：

- `src/utils/crypto.ts` 存在硬编码 AES secret，安全性质更接近混淆，不应描述为强安全。
- AI 附件进入托管上传目录后，删除会话主要删除 DB 记录，物理附件清理依赖后续孤儿清理或补充引用检查。
- 真实 provider 请求前缺少足够清晰的隐私提示、可选脱敏、保留策略和边界配置。

建议：AI 交付前必须补“发送前隐私提示 + 附件引用检查清理 + provider 边界说明 + 失败路径验收”。

### 5.8 开发/迁移工具仍在生产路由树

当前部分 dev/migration 页面通过生产环境 guard 阻止访问，但仍存在于静态路由表。

影响：打包产物仍会携带不应进入生产的页面与依赖，增加误暴露和体积风险。

建议：用 DEV-only route construction 从源头排除生产构建，而不只是访问时拦截。

### 5.9 更新源 📌 已闭环（C12，2026-07-19）

`electron/handlers/update.js` 默认源已切到 HTTPS（`https://maohedong.top/scgp/win`），旧 http 地址收纳到 `LEGACY_UPDATE_URLS`。Windows 安装包不签名（SmartScreen 蓝屏已知取舍）。`release-deploy` skill + `scripts/release-verify.mjs` 固化发布流程。安装/升级/回滚烟测清单仍缺。

### 5.10 历史命名与零原生依赖边界 📌 已闭环（C11，2026-07-18）

About 文案已统一为「SCGP / 星愿能力发展平台」。`better-sqlite3` 已从 devDependencies 移除，`scripts/export-resources.cjs` 引擎切到 `sql.js`。migration 注释等仍有 SIC-ADS 头注释残留（约 10 处），不影响功能。

## 6. 优先级建议

### P0：低风险收口，其中多项已完成 ✅

- ✅ ~~补齐报告中心认知三量表入口~~（评估入口动态化已完成，catalog 驱动）
- ✅ ~~加 assessment catalog 到 report route / Reports 页一致性测试~~（`assessment-report-center-catalog.test.mjs` 已覆盖）
- ✅ ~~修正 `tests/entitlement-catalog.test.ts` cognitive 状态预期~~（已修正为 `active`）
- 对当前 AI 改动做真实 provider、历史会话、附件、隐私提示的最小验收

### P1：交付前必须做

- 做一次 Electron 桌面端资源备份/删除/恢复演练，覆盖资源文件与收藏
- 补资源孤儿清理、AI 附件清理的验收路径
- ✅ 聚合验证脚本（`test:core` / `verify:release`）已落地
- ✅ ~~发布前 HTTPS 更新源~~（C12 已完成）；安装升级烟测仍缺

### P2：平台化收口

- ✅ ~~统一模块 catalog 事实源~~（C09 模块全注册 + 评估入口动态化）
- ✅ ~~修复陈旧的 `ModuleRegistry` 声明~~（C09 6 模块 + C10 IEP 策略退役）
- 将 dev/migration 路由从生产构建中排除
- ✅ ~~IEP 策略机制~~（C10 已退役，方向转为硬编码 generator 按需扩展）

### P3：内容与性能增强

- 做一个完整认知闭环：可信评估 -> 推荐/任务 -> 训练记录 -> 报告（📌 P0 训练侧已有 4 游戏，P1/P2 六游戏待开发）
- 认知量表进入专业审核与常模策略，不把 DRAFT 包装成标准量表
- 基于实际 profile 决定 DB Worker / Image Worker 是否进入主链

## 7. 建议的下一步执行顺序（2026-07-30 更新）

1. ✅ ~~报告中心认知三量表入口~~（已闭环）
2. ✅ ~~entitlement 测试修正~~（已闭环）
3. 给 AI 当前改动补最小验收清单
4. 做资源备份恢复真机演练
5. ✅ ~~ModuleRegistry / catalog 统一~~（C09 已闭环，模块全注册 + 评估入口动态化）
6. 认知 P1 游戏（K02/K09/K10）—— 复用已有底座，每个游戏只需加 registry + 组件 + Page + 路由

## 8. 后续维护规则

- 本文是 2026-07-17 的快照，不替代 living backlog。
- 推进某项后，应优先更新对应专题文档或 `.continue-here.md`；本文只在状态判断发生实质变化时更新。
- 若本文与代码冲突，以当前代码为准，并在更新时标注“历史判断已失效”。

## 9. 后续推进记录（2026-07-30 核实）

以下按 C09–C12 批次核实 7-17 调查报告的 P0–P2 项：

| 原条目 | 状态 | 核实结论 |
|--------|------|----------|
| 5.1 报告中心缺认知入口 | ✅ 已闭环 | Reports.vue 已 catalog 驱动，15 量表全覆盖 |
| 5.3 ModuleRegistry 只注册 3 模块 | ✅ 已闭环 | C09 全 6 模块注册 + 一致性测试锁定 |
| 5.4 IEP 策略未完成 | 🗑️ 已退役 | C10 整条删除 IEPStrategy，方向转为硬编码 generator |
| 5.9 更新源 HTTP | ✅ 已闭环 | C12 HTTPS 切换 + 旧地址 LEGACY_UPDATE_URLS 收纳 |
| 5.10 better-sqlite3 | ✅ 已闭环 | C11 移除依赖 + export-resources.cjs 切 sql.js |
| 6.P0 entitlement 测试 | ✅ 已闭环 | `tests/entitlement-catalog.test.ts` 已修正为 `active` |
| 6.P0 catalog 一致性测试 | ✅ 已闭环 | `assessment-report-center-catalog.test.mjs` 已覆盖 |
| 6.P1 聚合验证脚本 | ✅ 已闭环 | `test:core` / `verify:release` 已落地 |
| 6.P2 模块 catalog 统一 | ✅ 已闭环 | C09 模块全注册 + 评估入口动态化 |
| 认知训练游戏 | 🔄 P0 4/4，P1 0/3 | K01/K03/K04/K05 已落地；K02/K09/K10 待开发 |

**仍真实未完成**：A1 DB Worker 主链、A2 Image Worker、A4-Phase3 孤儿 GC、A7 注释残留、A8 devtools 路由排除、B2 社交 registry 声明过期、认知 P1/P2 六游戏、K 前缀 IEP 报告消费端、C1/C2/C3 内容质量、R2/R3 真机验收。
