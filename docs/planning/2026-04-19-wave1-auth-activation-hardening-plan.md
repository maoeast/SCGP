# Wave 1 认证与激活加固实施计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 完成 `Wave 1` 的 4 个高优先级安全整改项：弱密码哈希升级、登录态恢复去本地信任、激活缓存降权、移除登录页明文密码重置入口。

**架构：** 本轮不引入原生依赖，不改变“本地优先 + SQL.js + Electron IPC”主线。密码链路采用 `Web Crypto API + 兼容旧哈希渐进升级`；登录态恢复改为“本地最小会话标记 + 数据库会话校验”；激活缓存降级为非授权事实来源；紧急密码恢复入口改为开发态限定的临时密码流程。

**技术栈：** Vue 3、Pinia、TypeScript、SQL.js、Electron、Web Crypto API

---

## 相关文档

- 风险来源：`docs/reports/2026-04-19-code-review-comprehensive.md`
- 当前仓库规则：`AGENTS.md`
- 启动上下文：`docs/planning/2026-03-23-scgp-context-bootstrap.md`

## 文件结构

### 新建文件

- `src/utils/password-security.ts`
  责任：统一管理密码哈希、校验、旧哈希识别、是否需要升级。
- `src/utils/auth-session.ts`
  责任：统一管理会话 token 生成、摘要、存储载荷序列化。

### 修改文件

- `src/database/api.ts`
  责任：接入新密码校验、登录自动升级、会话创建 / 恢复 / 注销、临时密码重置。
- `src/database/init.ts`
  责任：更新默认管理员初始化逻辑，补齐 `auth_session` 表和相关索引。
- `src/database/sqljs-init.ts`
  责任：保持备用初始化链路与主初始化口径一致。
- `src/database/schema.sql`
  责任：补齐 `auth_session` 表定义，避免 schema 入口继续漂移。
- `src/stores/auth.ts`
  责任：改为最小会话标记持久化，异步恢复登录态，收口本地缓存信任边界。
- `src/main.ts`
  责任：调整应用启动顺序，确保路由守卫执行前完成会话恢复与激活校验。
- `src/router/index.ts`
  责任：仅消费已校验的登录态，不再假设 `localStorage` 恢复结果可信。
- `src/utils/activation-manager.ts`
  责任：移除 `localStorage` 激活缓存快速授权路径，改为数据库 / 许可证回源。
- `src/views/Login.vue`
  责任：收口紧急密码恢复流程，只允许开发态生成临时密码。
- `src/components/login/LoginCard.vue`
  责任：支持按条件展示 / 隐藏紧急恢复入口。

### 验证命令

- `npm run type-check`
- `npm run build:web`

### 手工回归矩阵

1. 旧管理员账号登录成功，数据库密码哈希自动升级。
2. 篡改 `localStorage` 后重启，无法通过伪造 `user_info` 提权。
3. 篡改 `sic_ads_activation_cache` 后，模块授权状态不被改变。
4. 生产构建中登录页不再存在 `admin123` 恢复入口；开发态可生成一次性临时密码。

---

### 任务 1：密码哈希升级与旧数据兼容迁移

**文件：**

- 创建：`src/utils/password-security.ts`
- 修改：`src/database/api.ts`
- 修改：`src/database/init.ts`
- 修改：`src/database/sqljs-init.ts`
- 修改：`src/database/schema.sql`

- [ ] **步骤 1：创建版本化密码安全工具**

```ts
// src/utils/password-security.ts
export const PASSWORD_HASH_VERSION = 'pbkdf2-sha256-v1'
export const PASSWORD_PBKDF2_ITERATIONS = 600_000

export interface PasswordVerificationResult {
  valid: boolean
  needsUpgrade: boolean
  nextHash?: string
  nextSalt?: string
}

export function generatePasswordSalt(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashPasswordV1(password: string, salt = generatePasswordSalt()): Promise<{
  passwordHash: string
  salt: string
}> {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: PASSWORD_PBKDF2_ITERATIONS },
    keyMaterial,
    256,
  )
  const hashHex = Array.from(new Uint8Array(derivedBits), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return { passwordHash: `${PASSWORD_HASH_VERSION}$${PASSWORD_PBKDF2_ITERATIONS}$${hashHex}`, salt }
}

export function isLegacyPasswordHash(passwordHash: string): boolean {
  return !passwordHash.startsWith(`${PASSWORD_HASH_VERSION}$`)
}
```

- [ ] **步骤 2：在 `UserAPI` 中接入兼容验证与自动升级**

```ts
// src/database/api.ts
import {
  generatePasswordSalt,
  hashPasswordV1,
  isLegacyPasswordHash,
  verifyPasswordRecord,
} from '@/utils/password-security'

async login(username: string, password: string): Promise<any | null> {
  const user = await this.queryOneAsync('SELECT * FROM user WHERE username = ? AND is_active = 1', [username])
  if (!user) return null

  const passwordResult = await verifyPasswordRecord(password, user.password_hash, user.salt)
  if (!passwordResult.valid) return null

  if (passwordResult.needsUpgrade && passwordResult.nextHash && passwordResult.nextSalt) {
    await this.executeAsync(
      'UPDATE user SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordResult.nextHash, passwordResult.nextSalt, user.id],
    )
  }

  const { password_hash, salt, ...userInfo } = user
  return userInfo
}
```

- [ ] **步骤 3：统一默认管理员、用户创建、改密、重置密码使用新哈希**

```ts
// src/database/init.ts / sqljs-init.ts
const { passwordHash, salt } = await hashPasswordV1('admin123')
database.run(
  `INSERT INTO user (username, password_hash, salt, role, name) VALUES ('admin', ?, ?, 'admin', '系统管理员')`,
  [passwordHash, salt],
)

// src/database/api.ts
const { passwordHash, salt } = await hashPasswordV1(newPassword)
await this.executeAsync(
  'UPDATE user SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
  [passwordHash, salt, id],
)
```

- [ ] **步骤 4：运行编译验证**

运行：`npm run type-check`
预期：PASS，无新的类型错误

运行：`npm run build:web`
预期：PASS，`dist/` 构建成功

- [ ] **步骤 5：执行手工回归**

手工验证：

1. 使用已有 `admin` 账号登录。
2. 确认登录成功后数据库中的 `password_hash` 不再是简单 `btoa(password + salt)` 形式。
3. 新建用户、修改密码、重置密码均可继续成功。

- [ ] **步骤 6：Commit**

```bash
git add src/utils/password-security.ts src/database/api.ts src/database/init.ts src/database/sqljs-init.ts src/database/schema.sql
git commit -m "fix(auth): harden password hashing and legacy upgrade"
```

---

### 任务 2：重构登录态恢复链路，移除对 `localStorage.user_info` 的信任

**文件：**

- 创建：`src/utils/auth-session.ts`
- 修改：`src/database/api.ts`
- 修改：`src/database/init.ts`
- 修改：`src/database/sqljs-init.ts`
- 修改：`src/database/schema.sql`
- 修改：`src/stores/auth.ts`
- 修改：`src/main.ts`
- 修改：`src/router/index.ts`

- [ ] **步骤 1：补齐 `auth_session` 表结构**

```sql
-- src/database/schema.sql / init.ts / sqljs-init.ts
CREATE TABLE IF NOT EXISTS auth_session (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  session_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  last_used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES user(id)
);

CREATE INDEX IF NOT EXISTS idx_auth_session_user_id ON auth_session(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_session_session_id ON auth_session(session_id);
```

- [ ] **步骤 2：创建会话工具与 `UserAPI` 会话接口**

```ts
// src/utils/auth-session.ts
export interface PersistedSessionPayload {
  sessionId: string
  token: string
  userId: number
  version: 1
}

export function createSessionToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
```

```ts
// src/database/api.ts
async createAuthSession(userId: number): Promise<PersistedSessionPayload> {
  const sessionId = crypto.randomUUID()
  const token = createSessionToken()
  const sessionTokenHash = await hashSessionToken(token)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await this.executeAsync(
    `INSERT INTO auth_session (user_id, session_id, session_token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    [userId, sessionId, sessionTokenHash, expiresAt],
  )

  return { sessionId, token, userId, version: 1 }
}

async restoreAuthSession(payload: PersistedSessionPayload): Promise<any | null> {
  if (payload.version !== 1) return null

  const sessionTokenHash = await hashSessionToken(payload.token)
  const session = await this.queryOneAsync(
    `SELECT
       s.user_id,
       u.id,
       u.username,
       u.role,
       u.name,
       u.email,
       u.last_login
     FROM auth_session s
     JOIN user u ON u.id = s.user_id
     WHERE s.session_id = ?
       AND s.session_token_hash = ?
       AND s.revoked_at IS NULL
       AND s.expires_at > CURRENT_TIMESTAMP
       AND u.is_active = 1`,
    [payload.sessionId, sessionTokenHash],
  )

  if (!session || session.user_id !== payload.userId) {
    return null
  }

  await this.executeAsync(
    'UPDATE auth_session SET last_used_at = CURRENT_TIMESTAMP WHERE session_id = ?',
    [payload.sessionId],
  )

  const { user_id, ...userInfo } = session
  return userInfo
}

async revokeAuthSession(sessionId: string): Promise<void> {
  await this.executeAsync(
    'UPDATE auth_session SET revoked_at = CURRENT_TIMESTAMP WHERE session_id = ? AND revoked_at IS NULL',
    [sessionId],
  )
}
```

- [ ] **步骤 3：改造 `authStore`，只持久化最小会话标记**

```ts
// src/stores/auth.ts
async login(username: string, password: string): Promise<boolean> {
  const user = await userAPI.login(username, password)
  if (!user) return false

  const session = await userAPI.createAuthSession(user.id)
  this.user = user
  this.token = session.token
  localStorage.setItem('auth_session', JSON.stringify(session))
  localStorage.removeItem('user_info')
  return true
}

async restoreAuth(): Promise<boolean> {
  const raw = localStorage.getItem('auth_session')
  if (!raw) return false
  const payload = JSON.parse(raw)
  const restoredUser = await userAPI.restoreAuthSession(payload)
  if (!restoredUser) {
    this.logout()
    return false
  }
  this.user = restoredUser
  this.token = payload.token
  return true
}
```

- [ ] **步骤 4：调整应用启动顺序，确保路由守卫前完成恢复**

```ts
// src/main.ts
app.use(pinia)

const authStore = useAuthStore()
await authStore.restoreAuth()
await authStore.checkActivation()

app.use(router)
app.mount('#app')
```

```ts
// src/router/index.ts
if (to.meta.requiresAuth !== false && !authStore.isLoggedIn) {
  next({ path: '/login', query: { redirect: to.fullPath } })
  return
}
```

- [ ] **步骤 5：运行编译验证**

运行：`npm run type-check`
预期：PASS

运行：`npm run build:web`
预期：PASS

- [ ] **步骤 6：执行手工回归**

手工验证：

1. 正常登录后刷新应用，仍能恢复登录态。
2. 手工把 `localStorage.user_info.role` 改成 `admin`，重启应用，权限不提升。
3. 手工篡改 `auth_session.userId` 或 `token`，重启后会被强制登出。

- [ ] **步骤 7：Commit**

```bash
git add src/utils/auth-session.ts src/database/api.ts src/database/init.ts src/database/sqljs-init.ts src/database/schema.sql src/stores/auth.ts src/main.ts src/router/index.ts
git commit -m "fix(auth): verify persisted sessions against database"
```

---

### 任务 3：移除激活缓存授权快速路径，改为数据库 / 许可证回源

**文件：**

- 修改：`src/utils/activation-manager.ts`
- 修改：`src/stores/auth.ts`

- [ ] **步骤 1：删除 `localStorage` 激活缓存的授权快速返回**

```ts
// src/utils/activation-manager.ts
async getCurrentActivation(): Promise<ActivationInfo> {
  const machineCode = await this.getMachineCode()

  // 删除此类快速返回
  // const cache = this.getCache()
  // if (cache && cache.machineCode === machineCode && this.verifyCache(cache)) { ... }

  const activation = this.loadActivationFromDatabase(machineCode)
  this.setCache(activation)
  return activation
}
```

- [ ] **步骤 2：把缓存降级为快照而非授权事实来源**

```ts
// src/utils/activation-manager.ts
private setCache(info: ActivationInfo): void {
  const snapshot = {
    version: CACHE_VERSION,
    machineCode: info.machineCode,
    cachedAt: new Date().toISOString(),
    summary: {
      isActivated: info.isActivated,
      isTrial: info.isTrial,
      expiresAt: info.expiresAt,
      allowedModules: info.allowedModules,
    },
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot))
}
```

```ts
// src/stores/auth.ts
const activation = await activationManager.getCurrentActivation()
this.entitlements.allowedModules = Array.isArray(activation.allowedModules) ? activation.allowedModules : []
```

- [ ] **步骤 3：运行编译验证**

运行：`npm run type-check`
预期：PASS

运行：`npm run build:web`
预期：PASS

- [ ] **步骤 4：执行手工回归**

手工验证：

1. 未激活环境进入应用，仍正确落到激活页 / 试用逻辑。
2. 已激活环境进入应用，模块授权与数据库真实状态一致。
3. 手工篡改 `sic_ads_activation_cache.allowedModules` 后，重启应用，授权结果不变化。

- [ ] **步骤 5：Commit**

```bash
git add src/utils/activation-manager.ts src/stores/auth.ts
git commit -m "fix(activation): remove local cache as authorization source"
```

---

### 任务 4：移除登录页明文密码重置入口，改为开发态临时密码流程

**文件：**

- 修改：`src/components/login/LoginCard.vue`
- 修改：`src/views/Login.vue`
- 修改：`src/database/api.ts`
- 修改：`src/utils/password-security.ts`

- [ ] **步骤 1：让登录卡片支持按条件显示恢复入口**

```vue
<!-- src/components/login/LoginCard.vue -->
<button
  v-if="showEmergencyReset"
  type="button"
  class="login-card__link"
  @click="emit('emergency-reset')"
>
  重置管理员密码
</button>
```

```ts
// src/components/login/LoginCard.vue
interface Props {
  // ...
  showEmergencyReset?: boolean
}
```

- [ ] **步骤 2：把恢复流程改为开发态一次性临时密码**

```ts
// src/database/api.ts
async issueTemporaryAdminPassword(userId = 1): Promise<{ temporaryPassword: string }> {
  const temporaryPassword = createHumanReadableTemporaryPassword()
  const { passwordHash, salt } = await hashPasswordV1(temporaryPassword)
  await this.executeAsync(
    'UPDATE user SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [passwordHash, salt, userId],
  )
  return { temporaryPassword }
}
```

```ts
// src/views/Login.vue
const showEmergencyReset = import.meta.env.DEV

const handleEmergencyReset = async () => {
  if (!import.meta.env.DEV) return
  const { temporaryPassword } = await userAPI.issueTemporaryAdminPassword(1)
  await ElMessageBox.alert(`临时密码：${temporaryPassword}\n请登录后立即修改。`, '开发态紧急恢复')
}
```

- [ ] **步骤 3：运行编译验证**

运行：`npm run type-check`
预期：PASS

运行：`npm run build:web`
预期：PASS

- [ ] **步骤 4：执行手工回归**

手工验证：

1. 生产构建下登录页不显示“重置管理员密码”按钮。
2. 开发环境下按钮仍可见，但不会再把密码重置成固定的 `admin123`。
3. 临时密码仅展示一次，登录后可正常修改。

- [ ] **步骤 5：Commit**

```bash
git add src/components/login/LoginCard.vue src/views/Login.vue src/database/api.ts src/utils/password-security.ts
git commit -m "fix(login): replace static admin reset with dev-only temporary password"
```

---

### 任务 5：Wave 1 总体验证与文档回写

**文件：**

- 修改：`docs/reports/2026-04-19-code-review-comprehensive.md`
- 修改：`docs/INDEX.md`

- [ ] **步骤 1：执行统一验证**

运行：`npm run type-check`
预期：PASS

运行：`npm run build:web`
预期：PASS

- [ ] **步骤 2：执行 Wave 1 四条手工回归**

手工验证：

1. 旧管理员账号登录成功并触发密码哈希升级。
2. 篡改 `auth_session` / `user_info` 后无法提权。
3. 篡改 `sic_ads_activation_cache` 后模块授权不变化。
4. 生产构建中不存在固定密码恢复入口。

- [ ] **步骤 3：回写状态到总报告**

```md
## 八、可执行整改清单

- [x] W1-01 ...
- [x] W1-02 ...
```

- [ ] **步骤 4：Commit**

```bash
git add docs/reports/2026-04-19-code-review-comprehensive.md docs/INDEX.md
git commit -m "docs(security): record wave1 hardening progress"
```

---

## 自检结果

- 覆盖项：`W1-01`、`W1-02`、`W1-03`、`W1-04` 全部已映射到任务 1 至任务 4。
- 兼容性：计划显式要求“旧密码登录成功后自动升级”，避免一次性破坏本地数据。
- 验证链：每个任务都包含 `type-check`、`build:web` 和定向手工回归；仓库当前没有现成的认证单元测试框架，因此本轮以编译验证和明确手工矩阵为主。

## 执行交接

计划已完成并保存到 `docs/planning/2026-04-19-wave1-auth-activation-hardening-plan.md`。两种执行方式：

**1. 子代理驱动（推荐）** - 每个任务调度一个新的子代理，任务间进行审查，快速迭代

**2. 内联执行** - 在当前会话中使用 executing-plans 执行任务，批量执行并设有检查点
