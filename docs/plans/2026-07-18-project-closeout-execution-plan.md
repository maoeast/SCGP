# SCGP 未完成项收口执行方案

> 状态：待执行
> 基线日期：2026-07-18
> 上游调查：`docs/reports/2026-07-17-current-project-gap-and-recommendations.md`
> 使用方式：后续会话一次只执行一个批次；每批独立验证、独立复查，不跨批顺手重构。
> 执行进度：C01 代码已实现，`type-check`、定向契约测试与 `build:web` 已通过；已激活 Electron 环境下的真实记录跳转和页面布局待 UAT。C02-C13 未实施。

## 1. 目标与完成定义

本方案不是继续扩功能，而是把已有能力从“代码存在”推进到“入口一致、状态真实、失败可见、可回归、可发布”。

收口完成必须同时满足：

1. 15 个评估量表在评估入口、报告中心、报告路由和授权测试中的集合一致。
2. 仓库有稳定的 `verify:core` 与 `verify:release` 命令，失败项不能靠口头说明绕过。
3. 新备份使用用户口令派生密钥，不再依赖仓库固定 secret；恢复能区分“完整成功 / DB 成功但资源部分失败 / 失败”，并完成隔离数据目录下的桌面端演练。
4. AI API Key 不再由固定仓库密钥保护，备份不携带可跨机解密的 provider 密钥；外发前有隐私告知和默认脱敏。
5. 测试页、迁移页、性能页、激活管理页不进入生产路由记录和生产构建产物。
6. `ModuleRegistry` 只描述当前真实模块，不再暴露不存在的路径或“coming soon”假功能。
7. 更新源、签名、升级安装均有可复现发布证据；外部基础设施未提供前明确标记为阻塞，不伪称可发布。
8. 认知量表草案、认知训练、Worker、动态路由等目标态保持真实标签，不混入本轮代码收口。

## 2. 当前事实校正

以下结论以当前代码为准，用于防止后续模型照搬旧计划：

| 项目 | 当前三态 | 本方案处理 |
| --- | --- | --- |
| 备份全 schema | 已实现 | 不重做；补恢复结果语义和桌面演练 |
| 资源上传、引用扫描、备份归档、GC、收藏 | 已实现 / 待验收 | 补隔离环境端到端证据 |
| 推荐引擎和报告回链 | 已实现 | 只进最终回归，不再按旧计划重写 |
| `emotion_scene` / `care_scene` 正式持久化 | 已实现 | 只进最终回归 |
| 游戏 IEP 扩展 | 已实现 / 待桌面 UAT | 保留生产主链，清理未使用的第二套策略试验层 |
| 认知三量表 | 过渡态 | Driver 和报告路由已存在；报告中心缺入口；内容仍是 `draft` |
| 社交模块 | 过渡态 | 游戏链已有，但 `ModuleRegistry` 仍是旧占位元数据 |
| 生活自理 | 过渡态 | 训练入口和游戏已有，未进入 `ModuleRegistry` |
| DB Worker | 未进入主链 | 本轮不切换；先用性能门槛决定是否另立专题 |
| Image Worker | 未实现 | 本轮不实现 |
| 动态注册表路由 | 未实现 | 本轮明确不做，继续使用静态路由表 |

## 3. 范围与技术决策

### 3.1 本轮范围

- 评估报告入口和 catalog 一致性。
- 核心测试、构建与发布验证入口。
- 资源备份恢复、AI 密钥/隐私/附件生命周期。
- 开发路由生产隔离、模块元数据修正。
- 用户可见旧命名和 `better-sqlite3` 开发依赖清理。
- Windows 更新、签名、升级安装门禁。

### 3.2 明确不做

- 不新增认知游戏、社交故事页或新的评估内容。
- 不把草案量表改名为正式量表，不编造常模、信效度或授权结论。
- 不把路由改为 `ModuleRegistry` 动态生成。
- 不将 DB 主链迁到 Worker，不新增 Image Worker。
- 不改 `appId: com.sic.ads`、`sic-ads-database`、历史迁移标识等兼容 ID。
- 不在本轮大拆 `src/utils/iep-generator.ts`。

### 3.3 已选方案

- **报告入口**：新增报告中心 catalog，`Reports.vue` 从 catalog 派生选项、统计、卡片和允许跳转集合，禁止再维护四份手写清单。
- **授权事实**：继续以 `authStore.effectiveEntitlements` 为准；同步过期测试，不改回模块级判权。
- **IEP**：以当前 `iep-generator.ts + game-performance-normalizer.ts` 为唯一生产主链；删除只被开发工具使用的第二套策略试验层。现在扩建它会长期形成双主链。
- **备份加密**：新备份使用 Web Crypto `PBKDF2-SHA-256 + AES-256-GCM` 口令信封；固定 secret 只保留在旧 v1-v3 备份的只读迁移入口，不再生成新密文。
- **AI 密钥**：使用 Electron Main 的 `safeStorage`，密文绑定当前操作系统用户；备份保留 provider 配置但清空 API Key，恢复后必须重新录入。
- **发布更新**：只接受 HTTPS 更新源；没有真实 URL 和签名证书时失败关闭，不保留 HTTP IP 兜底。

## 4. 总体顺序

| 批次 | 优先级 | 依赖 | 风险 | 结果 |
| --- | --- | --- | --- | --- |
| C01 报告中心 catalog 收口 | P0 | 无 | 低 | 15 量表报告入口一致 |
| C02 核心验证门禁 | P0 | C01 | 低 | 单命令回归基线 |
| C03 备份口令加密迁移 | P1 | C02 | 高 | 新备份不再使用固定 secret |
| C04 资源恢复结果与桌面演练 | P1 | C03 | 中 | 备份恢复可证明、部分失败可见 |
| C05 AI 密钥安全迁移 | P1 | C03 | 高 | 固定密钥退出 provider 密钥链 |
| C06 AI 附件删除一致性 | P1 | C02 | 中 | DB 与物理文件删除顺序正确 |
| C07 AI 隐私告知与外发脱敏 | P1 | C05、C06 | 高 | 外发边界可见、可测试 |
| C08 开发路由生产隔离 | P1 | C02 | 中 | 生产包无测试/迁移页面 |
| C09 ModuleRegistry 事实修正 | P2 | C02 | 中 | 模块元数据不再失真 |
| C10 IEP 双主链清理 | P2 | C09 | 中高 | 只保留已使用的生产生成器 |
| C11 旧命名与原生开发依赖 | P2 | C02 | 中 | 用户文案统一、零额外原生依赖 |
| C12 更新/签名/升级发布门禁 | P1 阻塞项 | 外部输入、C02、C08 | 高 | 可验证的 Windows 发布链 |
| C13 全链桌面验收 | 终验 | C01-C12 可执行项 | 高 | 形成发布结论和剩余阻塞清单 |

依赖关系：`C01 -> C02 -> {C03,C06,C08,C09,C11}`，`C03 -> {C04,C05}`，`C05+C06 -> C07`，`C09 -> C10`，最后进入 `C13`。后续模型仍应串行执行，一次只取一个批次。

## 5. 执行协议

每个批次开工前执行：

```powershell
git status --short --branch
git stash list
git log --oneline -5
```

执行约束：

1. 先读本批列出的文件，再用 `rg` 确认调用面；不得只根据本文猜接口。
2. 只修改本批文件。遇到同文件未说明改动，先理解并协作，不能覆盖。
3. 新增失败分支必须有用户可见提示或结构化返回值，不能只 `console.warn`。
4. TS/Vue/路由/DB/IPC 改动至少跑 `npm run type-check`。
5. 每批结束执行 `git diff --check`、查看 `git diff --stat` 和关键 diff。
6. 未完成手工验收时只能写“代码已实现 / 待桌面 UAT”，不得写“已完成”。
7. 未经用户明确要求，不提交、不推送。

## 6. 批次细则

### C01：报告中心 catalog 收口

**目标**：补齐 `brief`、`crt`、`cognitive_self`，并消除 `Reports.vue` 内多份量表清单漂移。

**主要文件**：

- 新增 `src/features/assessment/report-center-catalog.ts`
- `src/features/assessment/report-routes.ts`
- `src/views/Reports.vue`
- 新增 `scripts/tests/assessment-report-center-catalog.test.mjs`

**实施步骤**：

1. catalog 为 15 个 `AssessmentScaleCode` 定义 `value`、显示名、短名、`tone`、tag 类型；统计使用 `Record<AssessmentScaleCode, number>`，不再新增 `brief_count` 一类手写字段。
2. `AssessmentReportScaleType` 直接复用 `AssessmentScaleCode`，路由构建函数继续保持现有 URL。
3. `REPORT_TYPE_OPTIONS`、评估卡片、评估总数、统计累加、标签和跳转集合全部由 catalog 派生；干预类报告保持独立。
4. 测试断言报告 catalog 与 `ASSESSMENT_SCALE_CODES` 双向集合相等、键唯一，且每种量表都能生成非兜底报告路由。

**验证**：

```powershell
npm run type-check
node --test scripts/tests/assessment-scale-catalog.test.mjs scripts/tests/assessment-report-center-catalog.test.mjs
git diff --check
```

**手工验收**：报告中心能筛选并显示三种认知报告；分别打开已有记录，进入对应报告页而不是 `/assessment`。

**回滚点**：只回退上述四个文件；不改量表 Driver、DB 表或授权 catalog。

### C02：核心验证门禁

**目标**：消除 cognitive 状态测试漂移，并建立后续批次统一验证入口。

**主要文件**：`tests/entitlement-catalog.test.ts`、`package.json`、`README.md`。

**实施步骤**：

1. 将 cognitive 预期同步为当前产品事实 `active + hide`；仍由 entitlement 控制可见性，不改实现迎合旧测试。
2. 新增以下脚本：
   - `test:core:node`：显式列出评估 catalog/报告、授权可见性、训练路由、资源中心、更新配置、AI 内置智能体与技能库契约测试。
   - `test:core:ts`：用本地 `jiti` 依次执行 entitlement、resource-file-refs、crypto-bytes 测试。
   - `verify:core`：`type-check + test:core:node + test:core:ts`。
   - `verify:release`：`verify:core + build:web`。
3. README 只补验证命令和使用场景，不复制测试清单。

**验证**：

```powershell
npm run verify:core
npm run verify:release
git diff --check
```

**完成标准**：两个命令均退出 0；任何已有失败必须修复或缩小为有书面依据的独立阻塞项，不能从脚本中静默删除。

### C03：备份口令加密迁移

**目标**：新备份不再由仓库固定 AES secret 保护；保留旧备份只读兼容，不破坏跨机恢复。

**主要文件**：新增 `src/utils/backup-crypto.ts`、`src/utils/backup.ts`、`src/utils/crypto.ts`、`src/views/System.vue`、`tests/crypto-bytes.test.ts`、新增 `scripts/tests/backup-crypto-envelope.test.mjs` 和脱敏的 `scripts/tests/fixtures/backup-v3-minimal.scgp`。

**实施步骤**：

1. 定义 JSON 信封 `format: 'scgp-backup'`、`cryptoVersion: 1`，记录随机 salt、随机 iv、PBKDF2 迭代数和 ciphertext；使用 Web Crypto `PBKDF2-SHA-256` 派生 256 位密钥，再用 `AES-GCM` 加解密。
2. PBKDF2 迭代数固定为 310000，salt 16 bytes、iv 12 bytes；新备份口令至少 12 个字符，导出时输入两次确认，口令不入库、不写日志。
3. 备份数据版本升为 `4.0`。资源 zip 作为 base64 放入外层 AES-GCM 信封，不再单独用固定 secret 加密；v1-v3 保持现有格式只读导入。
4. 将固定 `AES_SECRET` 及旧 `encryptData/decryptData/encryptBytes/decryptBytes` 收敛为 `legacy-backup-crypto` 私有兼容路径；正常导出不得调用。旧备份成功导入后提示立即导出 v4。
5. `getBackupInfo()` 改为异步并要求口令；错误必须区分“口令错误/文件损坏”和“不支持的版本”，不在日志打印口令或明文备份。
6. 测试覆盖：同口令往返、错口令、篡改 ciphertext、随机 salt/iv、旧 v3 fixture 导入、新导出不含固定 secret 生成路径。

**验证**：

```powershell
npm run type-check
npx jiti tests/crypto-bytes.test.ts
node --test scripts/tests/backup-crypto-envelope.test.mjs
npm run build:web
git diff --check
```

**手工验收**：导出 v4、关闭应用、重新打开后用正确口令查看摘要并恢复；错口令不修改 DB；导入一份脱敏的 v3 fixture 后出现升级提示。

**回滚点**：若 v4 导出失败，回退 C03 全批；不得以恢复固定 secret 新导出作为降级方案。

### C04：资源恢复结果与桌面演练

**目标**：把“DB 已恢复但资源文件失败”从日志告警提升为明确结果，并生成安全的端到端证据。

**主要文件**：`src/utils/backup.ts`、`src/views/System.vue`、`electron/main.mjs`、`scripts/electron-dev-start.js`，以及新增恢复结果测试。

**实施步骤**：

1. `importData()` 返回结构化结果：`database: 'restored'`，`resources.status: 'restored' | 'partial' | 'skipped' | 'failed'`，并含成功数、失败项和原因。
2. `restoreResourceArchive()` 不再吞掉所有错误；DB 成功后资源失败仍不回滚 DB，但必须进入返回值。
3. `System.vue` 分别显示完整成功、部分成功和仅 DB 成功；部分成功消息必须引导进入“资源健康检查”。
4. 开发模式支持 `SCGP_TEST_USER_DATA_DIR`，只在 `!app.isPackaged` 时于 `app.whenReady()` 前设置 `app.setPath('userData', absolutePath)`；生产包忽略该变量。
5. 增加测试覆盖结果分类和 UI 消息分支；不得用真实用户数据目录做破坏性测试。

**验证**：

```powershell
npm run verify:core
npm run build:web
git diff --check
```

**桌面演练**：使用 `.tmp/scgp-e2e-profile`，导入含上传资源、预置资源、收藏、评估、训练、AI 非密钥配置的样本；导出后清空该隔离目录，再恢复并逐项核对 DB 行、`resource://` 显示、收藏、资源健康检查和孤儿 GC。另制造一个损坏资源归档，确认 UI 显示“数据已恢复、资源恢复失败/部分失败”。

### C05：AI 密钥安全迁移

**目标**：provider API Key 只在 Electron Main 中解密，不再使用仓库固定 AES 常量作为长期保护。

**主要文件**：`electron/handlers/ai.mjs`、新增 `electron/handlers/ai-secrets.mjs`、`electron/preload.mjs`、`src/types/electron.d.ts`、`src/stores/ai.ts`、`src/utils/backup.ts`，以及契约测试。

**实施步骤**：

1. Main 进程封装 Electron 34 可用的同步 `safeStorage.encryptString/decryptString`，新密文格式固定为 `safe:v1:<base64>`。
2. 新增最小 IPC：保护明文密钥、将旧 AES 密文迁移为 `safe:v1`。迁移 IPC 只返回新密文，绝不把明文返回 renderer。
3. 保存 provider 时由 Main 加密；发送聊天时 Main 解密。`safeStorage` 不可用或解密失败必须失败关闭并要求重新录入。
4. 兼容读取旧 AES 密文到 `1.0.7`：首次加载即迁移；迁移成功后覆盖旧值，`1.0.8` 删除该兼容函数。固定 AES 逻辑仅留在 Main 的迁移函数，renderer 删除 provider 密钥加解密能力。
5. 备份导出时只在导出副本中将 `ai_provider.api_key_enc` 清空，不修改当前 DB；在备份元数据写 `providerSecretsIncluded: false`，恢复 UI 明确提示重新配置密钥。
6. 单元测试注入假的 safeStorage 适配器，覆盖新加密、旧密文迁移、不可用、损坏密文和备份脱敏。

**验证**：

```powershell
npm run verify:core
npm run build:web
rg -n "encryptData\(input\.apiKeyPlain|decryptData\(encKey" src/stores/ai.ts electron/handlers/ai.mjs
rg -n "SPED-PASSWORD-SECURITY-KEY-2025" electron/handlers
git diff --check
```

第一条预期无命中；第二条只允许命中有删除期限说明的旧 provider 密钥迁移函数，不得进入正常发送链。备份旧格式 secret 已由 C03 限制在只读兼容路径。

参考边界：[Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)、[Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)。

### C06：AI 附件删除一致性

**目标**：删除会话时不再出现“文件先删、DB 删除失败后留下断链引用”。

**主要文件**：`src/stores/ai.ts`、`src/database/ai-api.ts`、`src/utils/ai-attachment-manager.ts`，以及测试。

**实施步骤**：

1. 删除前收集附件引用；先在 DB 事务中删除会话及消息，事务失败则不碰文件。
2. DB 提交后逐个检查是否仍被其他消息引用，引用数为 0 才删除物理文件。
3. 文件删除失败不回滚已提交 DB，但返回失败列表并交由现有 GC 后续清理。
4. 普通用户删除必须继续校验 session owner；管理员删除继续走独立 API。

**验证**：`npm run verify:core`、新增附件生命周期测试、`npm run type-check`。

**手工验收**：分别覆盖个人会话删除、管理员删除、DB 删除模拟失败、文件删除模拟失败和共享引用保护。

### C07：AI 隐私告知与外发脱敏

**目标**：用户明确知道哪些数据将发往哪个 provider，默认降低学生身份信息外发风险。

**主要文件**：`src/database/init.ts`、`src/database/ai-api.ts`、`src/stores/ai.ts`、`src/features/ai/components/AiAssistant.vue`、AI tool loop 文件、新增 `src/features/ai/outbound-redaction.ts`。

**实施步骤**：

1. 新表 `ai_user_privacy_consent`，主键为 `(user_id, provider_code)`，保存 `policy_version`、`redaction_enabled`、`consented_at`；首版 policy 固定为 `2026-07-18-v1`。
2. 每个用户首次使用某 provider 或 policy 版本变化时弹出告知，列明：输入文本、主动选择的本地记录、附件文本/图片、provider 名称与 base URL host、会话本地保存和删除规则。
3. 默认开启脱敏；用户可关闭，但必须二次确认。设置按用户/provider 持久化。
4. 本地脱敏器对学生姓名、学号、手机号和 18 位身份证模式做稳定替换；同一请求内同一学生保持同一化名。
5. 普通消息、历史消息、图片/文档附带文本和工具返回消息必须经过同一外发转换层；本地 DB 和 UI 保留原文。
6. 默认脱敏会影响包含真实姓名的 AI 报告，界面需在发送前提示；需要真实姓名时由用户显式关闭，不做隐式回填。

**验证**：脱敏纯函数单测、consent 版本测试、tool loop 外发快照测试、`npm run verify:core`、`npm run build:web`。

**桌面验收**：DeepSeek 文本、火山方舟文本/视觉/文档各执行一次；抓取 Main 侧测试日志或 mock 请求体，确认默认无真实姓名/学号/手机号/身份证号，且日志本身不打印 API Key 或完整敏感请求体。

### C08：开发路由生产隔离

**目标**：生产路由树和构建产物都不包含测试、迁移、基准、ModuleDevTools 和 ActivationAdmin 页面。

**主要文件**：`src/router/index.ts`、新增 `src/router/dev-routes.ts`、新增 `scripts/tests/dev-route-production-boundary.test.mjs`。

**实施步骤**：

1. 将 10 个现有 `devOnlyRouteNames` 对应 route record 与 `ActivationAdmin` 集中为 `import.meta.env.DEV ? [...] : []`，再展开到 children。
2. 组件动态 import 也放进 DEV 分支，使 Rollup 可删除生产 chunk；不能只靠全局守卫拦访问。
3. 保留生产守卫作为纵深保护，但测试应证明生产模式根本没有这些 route record。
4. `ClassManagement` 与 `StudentClassAssignment` 是正式管理能力，不移出生产。

**验证**：

```powershell
npm run type-check
node --test scripts/tests/dev-route-production-boundary.test.mjs scripts/tests/training-route-access.test.mjs
npm run build:web
rg -n "SQL\.js测试|模块开发者工具|Database Worker测试|激活管理" dist/assets
```

最后一条预期退出 1；若命中，继续查静态 import，不能仅改文案绕过检查。

### C09：ModuleRegistry 事实修正

**目标**：注册表覆盖 `ModuleCode` 全集，并只声明当前真实存在的能力。

**主要文件**：`src/core/module-registry.ts`、`src/types/module.ts`、`src/utils/training-entry.ts`、评估 catalog，以及新增一致性测试。

**实施步骤**：

1. 注册 sensory、emotional、social、cognitive、life_skills、resource 六个模块；social 和 cognitive 保持 `experimental`，其余按当前代码设置 `active`。
2. 删除 `/sensory/training-records`、`/sensory/assessment`、`/sensory/iep` 和 social coming-soon 路径；功能入口只引用当前通用路径 `/games/menu`、`/equipment/menu`、`/training-records/menu`、`/assessment`、`/resource-center`。
3. 注册表只用于模块元数据和开发诊断；授权继续读取 entitlement，导航/路由继续读取现有 catalog 与静态路由。
4. 测试断言 `ModuleCode` 全覆盖、无重复、feature 路径属于当前 route path 集合，且训练/评估使用的业务模块都已注册。

**验证**：`npm run verify:core`、新增 registry 一致性测试、`npm run build:web`。

### C10：IEP 双主链清理

**目标**：删除未进入生产页面、仅由开发工具调用的策略试验链，避免后续模型误判其为正式架构。

**主要文件**：`src/main.ts`、`src/core/strategies-init.ts`、`src/core/module-registry.ts`、`src/types/module.ts`、`src/strategies/SensoryIEPStrategy.ts`、`src/utils/iep-generator-refactored.ts`、`src/views/devtools/ModuleDevTools.vue`。

**实施步骤**：

1. 先用 `rg` 再次证明生产调用均指向 `src/utils/iep-generator.ts`，策略链只剩初始化和开发工具。
2. 移除 `initializeStrategies()` 启动调用、ModuleRegistry 的 strategy Map/API、对应类型、策略实现和 refactored 生成器。
3. ModuleDevTools 删除策略测试区，保留模块元数据诊断。
4. 不改现有 `IEPGenerator` 静态 API，不顺手拆分其内部实现。

**验证**：

```powershell
rg -n "initializeStrategies|registerIEPSstrategy|getIEPSstrategy|getAllIEPSstrategies|iep-generator-refactored|SensoryIEPStrategy" src
npm run verify:core
npm run build:web
```

第一条预期无命中。桌面验证至少覆盖感官器材报告、感官游戏报告、社交游戏报告、生活自理 L03/L05 和一个 Tier 3 低样本报告。

### C11：旧命名与原生开发依赖

**目标**：清除用户可见旧产品名，并让安装依赖符合“零额外原生依赖”。

**主要文件**：`src/components/AboutDialog.vue`、`scripts/export-resources.cjs`、`package.json`、`package-lock.json`。

**实施步骤**：

1. About 文案统一为“SCGP / 星愿能力发展平台”，版本从应用现有版本来源读取，不新增硬编码。
2. `export-resources.cjs` 保持现有 CLI 输入输出契约，改用 `sql.js` 加载数据库；修正脚本头部的错误扩展名示例。
3. 执行 `npm uninstall --save-dev better-sqlite3`，确认 lockfile 无残留。
4. 不改 `appId`、localStorage key、历史 migration 日志和兼容注释。

**验证**：

```powershell
node scripts/export-resources.cjs --help
npm run verify:release
rg -n "better-sqlite3" package.json package-lock.json scripts src electron
git diff --check
```

最后一条预期无命中；若脚本没有 `--help`，先为其补只读帮助分支，禁止用真实 DB 验证导出。

### C12：更新、签名与升级发布门禁

**状态**：被外部输入阻塞，但不阻塞 C01-C11。

**必须先取得的输入**：

- 可从目标客户网络访问的正式 HTTPS 更新目录 URL，且证书链有效。
- 更新目录写入凭据和 `latest.yml`/安装包发布方式。
- Windows 代码签名证书，通过 CI/本机安全环境提供 `CSC_LINK`、`CSC_KEY_PASSWORD`；秘密不得写入仓库。
- 一台安装旧版本的 Windows 验收机或隔离虚拟机。

**取得输入后的实施步骤**：

1. `package.json` 和 `electron/handlers/update.js` 删除 HTTP IP 默认值，统一使用已确认的 HTTPS URL；缺配置时保持现有清晰错误并禁止检查更新。
2. 旧 URL 迁移只迁到已确认 HTTPS URL；不得猜域名。
3. 更新配置测试断言 provider 为 generic、URL 为 HTTPS、无 GitHub 历史配置、缺 URL 时失败关闭。
4. 用签名环境执行 `npm run build:electron:win`，校验安装包和可执行文件签名。
5. 发布 N 版本，再安装 N-1 签名版本执行“检查 -> 下载 -> 安装 -> 重启 -> 数据保留 -> 版本变化”完整演练。

**完成证据**：构建日志、签名校验输出、更新目录文件清单、升级前后版本与数据截图/记录。缺任何一项只能标记“发布链未收口”。

### C13：全链桌面验收

在隔离数据目录执行以下最小矩阵：

| 链路 | 必验用例 |
| --- | --- |
| 评估 | 15 量表入口可见性；三种认知报告打开；无权 entitlement 隐藏 |
| 训练 | sensory、emotional、social、life_skills 各完成一条记录并回看 |
| IEP | Tier 1/2/3；社交、生活自理、感官器材至少各一份 |
| 资源 | 上传、收藏、引用、禁用/恢复、备份恢复、孤儿扫描与 GC |
| 推荐 | 学生页生成推荐、写入计划、完成训练、报告回链 |
| AI | provider 配置迁移、隐私告知、默认脱敏、文本/视觉/文档、删除会话和附件 |
| 生产边界 | 生产包无法访问开发路由，构建产物无对应页面文本 |
| 更新 | C12 输入齐备时完成 N-1 -> N；否则明确记录外部阻塞 |

终验命令：

```powershell
npm run verify:release
npm run build:electron:win
git diff --check
git status --short --branch
```

只有命令通过且桌面矩阵留有证据，才可将相关项从“代码已实现 / 待 UAT”改为“已完成”。

## 7. 非代码收口轨道

### 7.1 认知量表内容

`BRIEF`、`CRT`、`cognitive_self` 继续显示草案和非诊断声明。正式化前必须由具备相应资质的内容负责人提供：题项授权或自研声明、适龄范围、评分规则、常模/阈值依据、信效度材料、报告免责声明。输入不齐时，后续模型不得扩题、改阈值或去掉 `draft`。

### 7.2 认知训练与社交内容

认知游戏是新产品能力，不是本轮技术收尾。需另立 PRD，至少定义训练目标、任务闭环、数据结构、授权 entitlement、IEP 映射和验收样本。社交模块同理，不以补两个占位页面作为“完整交付”。

### 7.3 Worker 与动态路由

先在隔离 profile 导入代表性数据，记录训练记录查询、报告列表和资源列表的 p95。只有出现主线程长任务超过 100 ms，或列表交互 p95 超过 200 ms，且 profiling 证明瓶颈来自 SQL/图片处理时，才新建 Worker 专题；否则维持 renderer `sql.js` 主链。动态路由只有在新增模块仍需重复修改三处以上路由/菜单代码时再立专题。

## 8. 交接模板

每批结束只更新 `.continue-here.md`，内容压缩为：

```markdown
# Current State
- 批次：Cxx
- 三态：代码已实现 / 待桌面 UAT / 已完成
- 已验证：具体命令及结果

# Next Action
- 唯一下一步，指向下一个批次或当前失败项

# Blockers
- 外部输入、复现条件或 None

# Key Decisions
- 本批新增且会影响后续的决策

# Relevant Files
- 仅列继续工作需要的文件
```

## 9. 方案失效条件

出现以下任一情况时先暂停并修订本方案，不直接继续编码：

- 当前代码与本文列出的主链不同，例如报告/IEP/AI 已被新的生产入口替换。
- `main` 出现影响同批文件的未解释改动。
- 用户决定让 API Key 随备份跨机迁移，或 ActivationAdmin 必须进入正式生产管理入口。
- 认知量表已取得正式授权和审校结论，状态不再是草案。
- 更新基础设施改为非 generic provider，或发布目标不再是 Windows NSIS。
