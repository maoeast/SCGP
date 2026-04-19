# SCGP 综合代码审查报告

**审查日期**: 2026-04-19
**基准提交**: 7f9159a (main)
**知识图**: 10,450 节点 / 52,695 边 / 459 文件 / 31 社区
**审查维度**: 安全 + 代码质量 + 架构风险
**审查范围**: 4 个核心社区（games-handle、assessment-generate、views-handle、database-assessment）

---

## 风险总览

| 等级 | 数量 | 说明 |
|------|------|------|
| **高** | 10 | 必须修复，存在安全漏洞或严重架构缺陷 |
| **中** | 16 | 应尽快修复，影响可维护性或存在中等风险 |
| **低** | 7 | 可纳入技术债计划逐步清理 |

---

## 一、高风险发现（10 项）

### SEC-01: 密码哈希使用 Base64 编码，非真正哈希

**维度**: 安全 | **OWASP**: A02:2021 Cryptographic Failures
**文件**: `src/database/api.ts:418-428`
**影响**: 攻击者获取数据库后可 `atob()` 直接还原明文密码

```typescript
// 当前实现
private hashPassword(password: string, salt: string): string {
    return btoa(password + salt);  // Base64 是编码，不是哈希
}
```

**修复**: 使用 Web Crypto API 的 PBKDF2（600,000 迭代 + SHA-256），适配异步调用链。

---

### SEC-02: 会话状态可本地伪造，路由守卫直接信任 `localStorage`

**维度**: 安全 | **OWASP**: A07:2021 Auth Failures
**文件**: `src/stores/auth.ts:83-88,147-167` + `src/router/index.ts:1251-1269`
**影响**: 攻击者只需篡改 `localStorage.auth_token` 和 `localStorage.user_info`，即可伪造任意身份与角色；当前风险不只是 Token 可逆，而是登录恢复链路没有做任何来源校验

```typescript
// 当前实现
this.token = btoa(`${user.id}:${Date.now()}`)  // 可逆编码
localStorage.setItem('user_info', JSON.stringify(user))

// 恢复时仅检查字段是否存在
if (user && user.id && user.username && user.role) {
  this.user = user
  this.token = token
}
```

**修复**: 不要只把 Token 从 `btoa()` 改成 HMAC。应同时重构会话恢复链路，至少做到：
- Token 具备签名或不可伪造随机性
- 启动时重新从数据库或受信任存储校验用户身份
- 路由守卫不直接信任 `localStorage` 中的角色字段

---

### SEC-03: preload 暴露通用 invoke 绕过 channel 白名单

**维度**: 安全 | **OWASP**: A01:2021 Broken Access Control
**文件**: `electron/preload.mjs:10-75`
**影响**: 渲染进程被 XSS 攻击时，不仅可通过通用 `invoke` 调用所有 IPC handler，还能直接使用多个高权限文件 / 数据库相关方法，导致白名单保护形同虚设

**修复**: 删除通用 `invoke` 暴露只是第一步。应同时收紧 `preload` 暴露面，把 `saveFile`、`readFileAsBase64`、`deleteFile`、`writeDatabaseFile`、`openFile` 等高权限接口改成能力受限的专用 API。

---

### SEC-04: 文件操作 IPC 无路径安全校验

**维度**: 安全 | **OWASP**: A01:2021 Broken Access Control
**文件**: `electron/main.mjs:580-631`（save-file、read-file-as-base64、delete-file）
**影响**: 结合 SEC-03，可读写删除系统任意文件

**修复**: 参考 `SAVE_ASSET` 的安全模式，增加路径白名单校验（`path.normalize` + `startsWith` 双重校验）。

---

### SEC-05: 激活缓存可本地伪造，模块授权可被提升

**维度**: 安全 | **OWASP**: A01:2021 Broken Access Control
**文件**: `src/utils/activation-manager.ts:79-116,128-140,209-226`
**影响**: 当前激活信息和 `allowedModules` 直接缓存到 `localStorage`，读取时只校验版本、机器码和时间，不校验签名；攻击者可本地伪造正式激活状态、扩大模块授权范围

```typescript
const cached = localStorage.getItem(CACHE_KEY)
const data: ActivationCache = JSON.parse(cached)

if (cache && cache.machineCode === machineCode && this.verifyCache(cache)) {
  return {
    isActivated: cache.isActivated,
    allowedModules: this.normalizeAllowedModules(cache.allowedModules)
  }
}
```

**修复**: 缓存只能作为性能优化层，不能作为授权事实来源。建议移除前端可写缓存中的授权决定字段，或至少为缓存增加签名校验，并在启动阶段回源数据库 / 许可证校验逻辑做最终确认。

---

### ARCH-01: 视图层直接操作数据库 API（45 个文件）

**维度**: 架构
**文件**: 45 个 .vue 文件内共 97 处 `new XxxAPI()` 调用
**影响**: 数据库 schema 变更直接波及视图层，无法通过中间层隔离

**关键案例**:
- `GamePlay.vue` 直接执行裸 SQL（`db.query('SELECT * FROM student WHERE id = ?')`）
- `Login.vue` 直接 `new UserAPI()`
- `Dashboard.vue` 直接 `new DashboardAPI()`

**补充**: 当前问题不只在视图层，Store 和系统设置页也存在直接 `db.all/db.get/db.run`，说明边界已经扩散到“页面 / Store / 数据层混用”。

**修复**: 逐模块将数据库调用统一收口到 Service / Repository 边界，严禁视图层和 Store 层继续直接运行裸 SQL。

---

### ARCH-02: api.ts 巨型文件（4445 行 / 22 个 API 类）

**维度**: 架构 + 质量
**文件**: `src/database/api.ts`
**影响**: 全项目最大耦合点，修改频率高，合并冲突频繁

| 类 | 起始行 | 职责 |
|----|--------|------|
| DatabaseAPI | 17 | 基类 |
| UserAPI | 347 | 用户认证 |
| StudentAPI | 667 | 学生 CRUD |
| SMAssessmentAPI ~ EquipmentTrainingAPI | 756-4445 | 20 个业务 API |

**修复**: 按业务域拆分为独立文件（`user-api.ts`、`student-api.ts`、`assessment/sm-api.ts` 等）。

---

### ARCH-03: 路由文件膨胀（1313 行），游戏路由占主导

**维度**: 架构
**文件**: `src/router/index.ts`
**影响**: emotional 模块 26 个游戏页面路由占约 700 行，新增游戏必须修改此文件

**修复**: 采用参数化路由 `/emotional/games/:gameCode`，通过 `GameContainer` 动态匹配游戏组件，配合游戏注册表配置。

---

### ARCH-04: 游戏扩展模式不可持续

**维度**: 架构
**影响**: 每增加一个游戏需：创建 Vue 组件 + 添加路由 + 修改 Menu 页面，三处同步修改

**修复**: 建立游戏组件注册表（JSON/TS 配置），Menu 和路由从注册表动态生成。

---

### QUAL-01: any 类型滥用 774 处

**维度**: 质量
**影响**: 137 个文件，`database/api.ts` 单文件 102 处

**核心问题**:
- `DatabaseAPI.db: any` → 应为 `SQLWrapper` 类型
- `query/execute` 参数和返回值均为 `any` → 应定义泛型 `query<T>`
- `addStudent(student: any)` → 应定义 `StudentRow` interface

---

## 二、中风险发现（16 项）

### SEC-06: 无暴力破解防护
**文件**: `src/views/Login.vue:88-110` | 登录无尝试次数限制

### SEC-07: 紧急密码重置无二次验证
**文件**: `src/views/Login.vue:112-132` | 任何人可重置管理员密码为 `admin123`

### SEC-08: 硬编码弱密码
**文件**: `src/views/Login.vue:115` | `admin123` 明文硬编码

### SEC-09: 开发环境完全绕过激活校验
**文件**: `src/stores/auth.ts:171-192` | `DEV` 环境直接 `isActivated = true`

### SEC-10: shell.openPath 可执行任意文件
**文件**: `electron/main.mjs:897-912` | Windows 上可执行 .bat/.exe

### SEC-11: 数据库文件操作 IPC 无路径限制
**文件**: `electron/main.mjs:977-1041` | write-database-file、delete-database-backup

### SEC-12: 资源上传后端无文件类型校验
**文件**: `electron/main.mjs:640-700` | 仅前端校验，可绕过

### SEC-13: 机器码生成可预测
**文件**: `electron/main.mjs:1147-1156` | 基于 hostname + platform + arch

### SEC-14: 启动参数可触发全量清库，缺少确认与权限保护
**文件**: `src/main.ts:31-89` | `?clear=true` 或 `sessionStorage.__CLEAR_ALL_DATA__ = 'true'` 可在应用启动时清空 IndexedDB、`localStorage`、`sessionStorage` 并尝试删除本地数据库文件

### SEC-15: SQL.js 启动降级链路信任 `localStorage` 数据库快照
**文件**: `src/database/sqljs-loader.ts:182-237` | 启动时会直接加载 `selfcare_ats_db`，并迁移回 IndexedDB / 本地文件，存在本地篡改后持久化污染风险

### ARCH-05: database 层反向依赖 stores 层
**文件**: `src/database/class-api.ts` | `import { useAuthStore }` 打破分层方向

### ARCH-06: formatDate 重复定义 30+ 处
**文件**: 16+ 个视图文件 | 功能重叠但实现不一致（null 处理、格式差异）

### ARCH-07: 视图文件过大，composable 不足
**关键文件**: `PlanList.vue:2413行`、`TrainingResources.vue:1961行`、`Reports.vue:980行`
**现状**: `src/composables/` 仅 3 个文件（全部在 emotional 模块）

### ARCH-08: devtools 混在生产路由中
**文件**: `src/router/index.ts:1044-1060+` | SQLTest 等开发页面生产环境可访问

### ARCH-09: schema 管理碎片化
**现状**: `src/database/schema.sql` + `src/db/schema.sql` 两个入口，可能不同步

### QUAL-02: console.log 残留 1309 处
**影响**: 147 个文件，含 SQL 语句、密码哈希相关信息、激活状态等敏感信息

---

## 三、低风险发现（7 项）

| 编号 | 维度 | 问题 | 文件 |
|------|------|------|------|
| SEC-16 | 安全 | exec() 不支持参数化（仅静态 SQL） | `database/api.ts:100` |
| SEC-17 | 安全 | 登录日志区分失败原因（信息泄露） | `stores/auth.ts:108` |
| SEC-18 | 安全 | contextIsolation 禁用时 fallback | `preload.mjs:120` |
| ARCH-10 | 架构 | Store getter 内实例化 API | `stores/assessment.ts` |
| QUAL-03 | 质量 | 死代码（脚手架/备份/_archived） | 15+ 文件 |
| QUAL-04 | 质量 | 策略模式导出过宽 | `strategies/assessment/index.ts` |
| QUAL-05 | 质量 | BaseDriver 使用 require() | `BaseDriver.ts:313` |

---

## 四、正面发现

| 编号 | 说明 | 文件 |
|------|------|------|
| POS-01 | resource:// 协议路径安全校验完善 | `electron/main.mjs:236-258` |
| POS-02 | RSA-2048 + SHA-256 许可证签名验证 | `license-manager.ts` |
| POS-03 | Electron 基础安全配置基本正确 | `contextIsolation:true, nodeIntegration:false` |
| POS-04 | SQL 参数化整体良好 | 全局 |
| POS-05 | Store 层内无循环依赖 | stores/ |
| POS-06 | components 层未直接引用 database | components/ |

---

## 五、优先修复路线图

### 第一阶段：安全加固（1-2 周）

| 优先级 | 任务 | 预估工时 |
|--------|------|----------|
| P0 | 替换 btoa 密码哈希为 PBKDF2 | 4h |
| P0 | 重构登录态恢复链路，禁止直接信任 `localStorage` 会话 | 6h |
| P0 | 收紧 preload 暴露面，删除通用 `invoke` 并收口高权限文件 API | 8h |
| P0 | 文件操作 IPC 增加路径白名单校验 | 4h |
| P0 | 激活缓存降级为非授权事实来源，补签名或回源校验 | 4h |
| P1 | 登录失败次数限制 | 2h |
| P1 | 移除硬编码弱密码，改为随机临时密码 | 2h |
| P1 | shell.openPath 文件后缀白名单 | 2h |
| P1 | 资源上传后端增加 Magic bytes 校验 | 3h |
| P1 | 为清库入口增加显式确认和仅开发态可用限制 | 2h |
| P1 | 移除或校验 `localStorage` 数据库快照降级加载 | 4h |

### 第二阶段：架构改善（2-4 周）

| 优先级 | 任务 | 预估工时 |
|--------|------|----------|
| P1 | 提取 formatDate 到 `utils/date-format.ts` | 3h |
| P1 | 游戏路由参数化 + 注册表 | 8h |
| P1 | api.ts 按业务域拆分 | 6h |
| P2 | devtools 路由 DEV 环境守卫 | 2h |
| P2 | 消除 database → stores 反向依赖 | 2h |
| P2 | 大视图提取 composable | 12h |

### 第三阶段：质量提升（持续）

| 优先级 | 任务 | 预估工时 |
|--------|------|----------|
| P2 | 引入 logger 替代 console.log | 4h |
| P2 | DatabaseAPI 基类类型化（泛型 query） | 8h |
| P3 | 清理死代码（脚手架/备份/_archived） | 2h |
| P3 | 策略模式收口导出 | 3h |
| P3 | 统一 schema 管理 | 4h |

---

## 六、社区健康度评分

| 社区 | 节点 | 内聚度 | 健康度 | 主要问题 |
|------|------|--------|--------|----------|
| assessment-generate | 364 | 0.42 | ★★★☆ | 策略导出过宽、require() 残留 |
| database-assessment | 721 | 0.29 | ★★☆☆ | 巨型文件、any 滥用、反向依赖 |
| games-handle | 787 | 0.23 | ★★☆☆ | 组件过大、公共模式未提取 |
| views-handle | 1070 | 0.15 | ★☆☆☆ | 重复代码、直接 DB 调用、composable 不足 |

**views-handle 内聚度仅 0.15，是全项目最需要重构的区域。**

---

## 七、二次复核补充说明

### 1. 关于 SEC-02 的口径修正

初版报告把问题描述为「Token 可逆伪造」，结论方向正确，但风险描述偏窄。二次复核后确认，真正的问题是：

- 登录后把 `token` 和 `user_info` 直接写入 `localStorage`
- 启动恢复时只检查 `id / username / role` 字段是否存在
- 路由守卫后续直接使用恢复出的角色做权限判断

因此该项应理解为「前端会话状态可本地伪造」，而不只是「Token 算法不够强」。

### 2. 关于 SEC-03 的修复范围补充

删除通用 `invoke` 是必要动作，但不是全部。当前 `preload` 还直接暴露了：

- `saveFile`
- `readFileAsBase64`
- `deleteFile`
- `writeDatabaseFile`
- `openFile`

因此整改目标应是 capability-based API，而不是只删除一个总入口。

### 3. 关于数量级结论的去噪说明

二次抽样排除 `_archived`、`devtools`、`test` 等目录后，主线代码中仍保留大量 `console.*`、`any`、以及页面层直接调用数据库 API 的情况，说明报告中的问题密度并非主要由归档目录抬高，主线代码本身的安全与分层债仍然显著。

---

## 八、可执行整改清单

### 执行规则

- 每完成 1 个任务，至少运行一次 `npm run type-check`。
- 任何涉及 `preload`、路由、构建入口、Vite 注入变量的任务，额外运行 `npm run build:web`。
- 任何涉及登录、激活、数据库启动恢复、资源上传的任务，额外执行对应手工回归。
- 如遇“现有数据兼容”问题，优先采用兼容读 + 渐进迁移，而不是直接破坏旧数据。

### Wave 0：基线与回归护栏

- [ ] `W0-01` 固化整改基线与回归矩阵
  文件：`docs/reports/2026-04-19-code-review-comprehensive.md`
  操作：记录本轮整改默认验证命令（`npm run type-check`、`npm run build:web`），并补充 4 条固定手工回归路径：登录恢复、激活校验、资源上传、数据库冷启动恢复。
  验收：后续每个整改任务都能明确引用统一验证基线，不再临时决定“测什么”。
  依赖：无。

### Wave 1：认证与授权链路封堵

详细实施计划：`docs/planning/2026-04-19-wave1-auth-activation-hardening-plan.md`

- [ ] `W1-01` 替换弱密码哈希，并保留旧数据兼容升级路径
  文件：`src/database/api.ts`、`src/database/init.ts`、`src/database/sqljs-init.ts`、`src/utils/crypto.ts`
  操作：引入基于 Web Crypto API 的 PBKDF2 哈希；统一默认管理员创建、用户新增、密码修改、密码重置逻辑；登录时兼容旧哈希并在验证成功后自动升级为新哈希。
  验收：新写入密码不再使用 `btoa(password + salt)`；旧账号可正常登录；成功登录后数据库中的弱哈希会被升级。
  依赖：`W0-01`。

- [ ] `W1-02` 重构登录态恢复链路，移除对 `localStorage.user_info` 的信任
  文件：`src/stores/auth.ts`、`src/router/index.ts`、`src/main.ts`
  操作：停止直接使用 `localStorage` 中的完整用户对象恢复身份；仅保留最小会话标记；启动时通过数据库或受信任存储重新查询当前用户；恢复失败时强制登出并清空缓存。
  验收：手工篡改 `localStorage.user_info.role = 'admin'` 后，重新启动应用不能提升权限；路由守卫只信任重新校验后的用户对象。
  依赖：`W0-01`。

- [ ] `W1-03` 激活缓存降权，禁止本地缓存直接决定授权结果
  文件：`src/utils/activation-manager.ts`、`src/stores/auth.ts`
  操作：把 `isActivated`、`allowedModules` 等授权字段从“本地可写缓存事实来源”改为“性能优化缓存”；优先回源数据库 / 许可证校验逻辑；必要时为缓存增加签名校验。
  验收：手工修改 `sic_ads_activation_cache` 后，不能直接解锁模块；模块授权结果与真实许可证状态保持一致。
  依赖：`W0-01`。

- [ ] `W1-04` 收口紧急密码重置入口，去除硬编码 `admin123`
  文件：`src/views/Login.vue`、`src/database/api.ts`
  操作：移除登录页直接把管理员密码重置为 `admin123` 的流程；改为禁用该入口、仅开发态可用，或改成一次性临时密码 / 二次确认恢复流程。
  验收：生产主线不存在“任意用户一键恢复 admin123”的路径；登录页不再展示明文默认密码。
  依赖：`W1-01`。

### Wave 2：IPC 与文件系统边界收紧

- [ ] `W2-01` 收紧 `preload` 暴露面，去掉通用 `invoke`
  文件：`electron/preload.mjs`、`electron/preload.cjs`、`src/types/electron.d.ts`
  操作：删除 `window.electronAPI.invoke`；梳理当前所有调用方，为更新、资源上传、数据库加载、TTS 等场景提供显式专用方法；同步更新类型声明。
  验收：主线业务代码中不再出现 `window.electronAPI.invoke(...)`；渲染进程无法自由拼接 channel 名称调用主进程接口。
  依赖：`W0-01`。

- [ ] `W2-02` 为主进程文件 / 数据库 IPC 增加统一路径白名单
  文件：`electron/main.mjs`
  操作：抽取统一路径守卫；把 `save-file`、`read-file-as-base64`、`delete-file`、`write-database-file`、`read-database-file`、`delete-database-backup`、`open-file` 全部纳入受控目录校验；数据库类接口限定在 `userData`，资源类接口限定在资源根目录。
  验收：任意越权绝对路径、`..`、跨目录路径都被拒绝；合法受管目录内路径仍可正常使用。
  依赖：`W2-01`。

- [ ] `W2-03` 资源上传后端增加类型与内容校验
  文件：`electron/main.mjs`、`src/components/ResourceUpload.vue`
  操作：在 `SAVE_ASSET` 中补充扩展名、MIME、magic bytes、大小上限校验；前端把后端拒绝原因映射成可读提示。
  验收：伪装扩展名的非图片文件不能入库；正常 JPG / PNG / WebP 上传不回归。
  依赖：`W2-02`。

- [ ] `W2-04` 收口 `shell.openPath` 与高权限文件能力
  文件：`electron/main.mjs`、`src/utils/resource-manager.ts`、`src/utils/teaching-material-file-manager.ts`、`src/components/FilePreview.vue`
  操作：给 `open-file` 增加受控目录与后缀白名单；把“打开任意路径文件”改为“打开受管资源文件”；同步改造调用方。
  验收：不能通过渲染层传入任意系统文件路径触发打开；受管资源预览和打开流程保持可用。
  依赖：`W2-02`。

### Wave 3：启动链路与数据完整性治理

- [ ] `W3-01` 为清库入口增加显式保护，只允许受控场景触发
  文件：`src/main.ts`
  操作：限制 `?clear=true` 和 `sessionStorage.__CLEAR_ALL_DATA__` 仅在开发态 / 专用维护入口生效；增加明显确认步骤和操作日志；生产环境直接忽略该入口。
  验收：生产构建下携带 `?clear=true` 启动不会清空本地数据；开发态仍可在明确确认后执行重置。
  依赖：`W0-01`。

- [ ] `W3-02` 移除或隔离 `localStorage` 数据库快照降级加载
  文件：`src/database/sqljs-loader.ts`、`src/database/init.ts`、`src/database/sqljs-init.ts`
  操作：评估是否可直接废弃 `selfcare_ats_db` 降级链路；如不能移除，则至少在 Electron 主线禁用该入口，并把旧数据迁移变成一次性维护动作，而不是启动自动加载。
  验收：本地篡改 `selfcare_ats_db` 后，生产主线不会把该快照重新导入并写回 IndexedDB / 文件系统。
  依赖：`W0-01`。

- [ ] `W3-03` 收口数据库备份写入接口，避免任意路径写入
  文件：`electron/main.mjs`、`electron/preload.mjs`、`electron/preload.cjs`、`src/database/sqljs-loader.ts`、`src/views/devtools/SchemaMigration.vue`
  操作：将 `writeDatabaseFile` 改成只接受白名单内文件名或固定备份槽位；开发诊断页面使用独立 devtools 接口，不复用生产写入能力。
  验收：备份能力仍可用，但渲染层不能指定任意磁盘路径。
  依赖：`W2-02`、`W3-02`。

### Wave 4：架构收口与主线减债

- [ ] `W4-01` 先做一轮试点，收口高风险页面的直接数据库访问
  文件：`src/views/Login.vue`、`src/views/Dashboard.vue`、`src/stores/systemConfig.ts`、`src/views/system/SystemSettings.vue`、`src/database/class-api.ts`
  操作：为认证、系统配置、首页等高耦合入口建立明确的 Service / Repository 边界；移除页面和 Store 中的 `new XxxAPI()` 与裸 `db.*` 调用。
  验收：试点页面不再直接访问数据库；后续可按同样模式继续外推到其他页面。
  依赖：`W1-02`、`W1-03`。

- [ ] `W4-02` 拆分 `src/database/api.ts` 巨型文件
  文件：`src/database/api.ts` 及新建的业务域文件（如 `src/database/user-api.ts`、`src/database/student-api.ts`、`src/database/assessment/*`）
  操作：先按认证、学生、资源、报告、训练等业务域拆出独立文件；保留兼容导出层，逐步迁移调用方。
  验收：`api.ts` 不再承担 20+ 个业务类；后续模块修改可在局部文件完成。
  依赖：`W4-01`。

- [ ] `W4-03` 收口生产路由中的 devtools 与实验页
  文件：`src/router/index.ts`
  操作：把 `SQLTest`、`SchemaMigration`、`WorkerTest`、`ClassManagementTest` 等页面改为仅开发态注册，或迁移到独立 devtools 入口。
  验收：生产环境构建下不能访问 devtools 页面；开发环境调试能力保留。
  依赖：`W0-01`。

- [ ] `W4-04` 统一日志出口并开始清理敏感 `console.*`
  文件：`src/stores/auth.ts`、`src/database/sql-wrapper.ts`、`src/database/init.ts`、`electron/main.mjs` 及后续高频输出文件
  操作：引入统一 logger，区分 `dev` / `prod` 输出级别；优先去掉认证、激活、SQL、文件路径相关敏感日志。
  验收：认证与数据库关键路径不再直接输出敏感信息；开发调试日志仍可按环境开关启用。
  依赖：`W1-02`、`W2-02`。

- [ ] `W4-05` 按主线优先级推进 `any` 与重复工具函数治理
  文件：`src/database/api.ts`、`src/database/sql-wrapper.ts`、`src/stores/*`、`src/views/*`
  操作：先处理认证、数据库包装层、系统配置等高频路径的 `any`；提取统一 `date-format` 工具，避免页面内重复实现。
  验收：认证 / 数据库核心路径的类型信息明显收敛；日期格式化不再在多个页面重复定义。
  依赖：`W4-02`。

### 建议执行顺序

- 第一周：`W0-01`、`W1-01`、`W1-02`、`W1-03`
- 第二周：`W1-04`、`W2-01`、`W2-02`、`W2-03`、`W2-04`
- 第三周：`W3-01`、`W3-02`、`W3-03`
- 第四周及以后：`W4-01` 至 `W4-05`

### 完成定义（Definition of Done）

- `P0 / P1` 项全部完成后，手工篡改 `localStorage` 无法提权、解锁模块或污染数据库启动链路。
- 渲染进程无法再通过通用 IPC 或任意路径文件接口直接触达高权限主进程能力。
- 登录、激活、资源上传、数据库启动恢复四条主线手工回归全部通过。
- `npm run type-check` 与 `npm run build:web` 在整改完成后保持通过。

---

*报告基于 code-review-graph 知识图自动分析，结合安全/质量/架构三维度人工审查生成。*
*知识图统计：10,450 nodes / 52,695 edges / 459 files / 31 communities*
