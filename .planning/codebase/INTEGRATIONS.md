# SCGP 当前集成边界

本文件聚焦仓库当前已经接线的内部/外部集成，重点覆盖 Electron IPC、数据库与文件持久化、资源协议、更新、激活、登录、备份，以及当前明确不存在的外部服务。

## 1. 判定范围

- 主要依据 `electron/main.mjs`、`electron/preload.mjs`、`electron/handlers/update.js`、`src/main.ts`、`src/router/index.ts`、`src/database/init.ts`、`src/database/sql-wrapper.ts`、`src/database/database-loader.ts`、`src/database/api.ts`、`src/database/resource-api.ts`、`src/utils/resource-manager.ts`、`src/utils/license-manager.ts`、`src/utils/activation-manager.ts`、`src/stores/auth.ts`、`src/utils/backup.ts`、`src/services/UpdateService.ts`。
- 文档中会明确区分“当前主链”“兼容/过渡层”“存在但未进入主链的目标态”。

## 2. Electron 进程边界与 IPC

### 2.1 进程模型

- 主进程入口是 `electron/main.mjs`。
- 预加载脚本主入口是 `electron/preload.mjs`。
- 渲染进程通过 `contextBridge.exposeInMainWorld('electronAPI', ...)` 访问受控能力，见 `electron/preload.mjs`。
- 当前 BrowserWindow 安全边界是：
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `enableRemoteModule: false`
- 这意味着渲染进程不能直接访问 Node.js，所有本地文件、数据库落盘、更新、机器码获取都必须跨 IPC。

### 2.2 当前公开的 IPC 能力

`electron/preload.mjs` 当前对渲染进程暴露了几类接口：

- 通用文件接口：
  - `app-path`
  - `save-file`
  - `read-file-as-base64`
  - `file-exists`
  - `delete-file`
  - `get-file-url`
  - `ensure-dir`
  - `read-dir`
  - `open-file`
  - `select-file`
  - `select-files`
  - `select-folder`
- 应用与设备信息：
  - `get-machine-id`
  - `get-app-version`
  - `get-electron-version`
  - `get-app-path`
  - `get-user-data-path`
- 数据库文件接口：
  - `db:load`
  - `write-database-file`
  - `read-database-file`
  - `database-file-exists`
  - `delete-database-backup`
  - `save-database-atomic`
  - `get-database-stats`
- 更新接口：
  - 统一 `invoke(channel, ...args)`
  - 事件监听 `on/off`
  - 单向通知 `send`

### 2.3 当前 IPC 设计上的实际情况

- `electron/preload.cjs` 与 `electron/preload.mjs` 功能重复，但当前 `electron/main.mjs` 只加载 `.mjs` 版。
- `env.d.ts` 里的 `Window.electronAPI` 类型声明并没有覆盖全部真实接口，属于类型声明滞后。
- 仓库里仍有旧接口残影，例如 `src/components/ResourceUpload.vue` 调用 `window.api.invoke('SAVE_ASSET', ...)`，但当前 preload 并未暴露 `window.api`。这说明该组件不是当前主链可靠边界的一部分。

## 3. 数据库与存储集成

### 3.1 当前主链

- 应用启动后，`src/main.ts` 先调用 `initDatabase()`。
- `src/database/init.ts` 在 Electron 环境下优先调用 `window.electronAPI.loadDatabaseFile()` 读取 `userData/database.sqlite`。
- 读出的二进制交给 `src/database/database-loader.ts`，用 SQL.js 创建内存数据库。
- 原始 SQL.js 数据库再由 `src/database/sql-wrapper.ts` 包装为 `SQLWrapper`。
- 所有数据库读写随后都走渲染进程内 SQL.js；持久化不是每次 SQL 都直写文件，而是 `SQLWrapper` 在 `INSERT/UPDATE/DELETE` 后触发 2000ms 防抖保存。
- 真正落盘发生在 Electron 主进程的 `save-database-atomic`：
  - 写入 `database.sqlite.tmp`
  - `fsync`
  - `rename` 原子替换成 `database.sqlite`

### 3.2 当前兼容/过渡层

- `src/database/sqljs-loader.ts` 仍保留更复杂的兼容加载顺序：
  - `database_backup.db`
  - IndexedDB
  - localStorage
  - 新建数据库
- `src/database/indexeddb-storage.ts` 仍是 SQL.js 二进制的 IndexedDB 包装。
- `src/database/sqljs-init.ts` 仍保留更早的 localStorage 版本初始化逻辑。
- 这些层说明仓库仍背着历史兼容负担，但 `src/database/init.ts` 已经把主线切回 `database.sqlite` + IPC 文件落盘。

### 3.3 启动时自动执行的内部迁移

`src/database/init.ts` 当前会在数据库初始化时自动执行多类内部集成动作：

- 执行主 schema 初始化
- 执行旧表字段迁移
- 执行 `initializeSysTables()` 建立 `sys_*` 系统表
- 执行 `initializeClassTables()` 建立班级管理表、索引、触发器、视图
- 执行 `migrateEquipmentLegacyIds()`
- 执行 `migrateEquipmentToResource()` 把旧器材资源迁移到 `sys_training_resource`
- 执行 `migrateReportRecordConstraints()`
- 执行 `runModuleCodeMigration()`

这意味着数据库集成不只是“读写 sqlite 文件”，而是把 schema 演进逻辑直接嵌进应用启动阶段。

### 3.4 当前数据模型的双轨现实

- 新训练资源主链使用 `src/database/resource-api.ts`，对应：
  - `sys_training_resource`
  - `sys_tags`
  - `sys_resource_tag_map`
  - `sys_favorites`
  - `sys_app_settings`
- 旧教学资料与收藏主链仍使用 `src/database/api.ts` 中的老版 `ResourceAPI`，对应：
  - `resource_meta`
  - `teacher_fav`
- `src/views/resource-center/TrainingResources.vue` 已接入新 `ResourceAPI`。
- `src/views/resource-center/TeachingMaterials.vue` 与 `src/stores/resource.ts` 仍接入旧 `ResourceAPI`。
- 因此当前资源系统在数据库层并非完全统一，而是“训练资源新模型 + 教学资料旧模型”并存。

### 3.5 FTS5 集成状态

- `src/database/schema/sys-tables.sql` 中的 `sys_resource_fts` 仍是注释态，不是默认建表。
- `src/database/migration/migrate-to-resource.ts` 会在迁移时运行 `detectFTS5Support()`，若 SQL.js 构建支持 FTS5，则动态创建：
  - `sys_resource_fts`
  - `sys_resource_ai`
  - `sys_resource_ad`
  - `sys_resource_au`
- 结论：FTS5 是“有条件启用的增强”，不是当前必须存在的集成前提。

## 4. 资源协议与文件系统集成

### 4.1 `resource://` 协议

- `electron/main.mjs` 在 `app.whenReady()` 后注册 `protocol.registerFileProtocol('resource', ...)`。
- 路径解析优先级是：
  1. `userData/resources/`
  2. `assets/resources/`（开发环境）或 `process.resourcesPath/assets/resources/`（打包环境）
- 协议实现包含路径清洗与目录遍历防护：
  - 禁止 `..`
  - 禁止 `\`
  - 禁止 `~`
  - 只允许安全字符集

### 4.2 用户资源文件接口

主进程中还额外提供了资源文件专用 IPC：

- `SAVE_ASSET`
- `DELETE_ASSET`
- `LIST_ASSETS`

这些接口都以 `userData/resources/` 为根目录，并带有安全校验。返回值里会直接给出 `resource:///...` URL。

### 4.3 渲染进程中的资源文件管理

- `src/utils/resource-manager.ts` 负责把业务路径转换为可用 URL。
- 当前逻辑是：
  - Electron 中优先返回 `resource://...`
  - 纯浏览器调试环境返回 `/assets/resources/...`
- 它还能通过 `electronAPI.saveFile`、`fileExists`、`deleteFile`、`openFile` 操作物理文件。
- 当前图片压缩管线在 `src/utils/image-processor.ts`，使用浏览器 `Canvas` 与 `fetch(dataUrl)` 转 `Blob`，没有接入独立 Image Worker。

### 4.4 当前资源链路的过渡态

- 新训练资源 UI 与计划/游戏/器材入口已普遍改用 `src/database/resource-api.ts`。
- 教学资料页面仍依赖旧资源表、旧分类和旧收藏逻辑，见 `src/views/resource-center/TeachingMaterials.vue` 与 `src/stores/resource.ts`。
- `src/database/resource-api.ts` 中 `favoritesOnly` 仍是 `TODO`，说明新模型的收藏筛选还没真正打通。
- `hardDeleteResource()` 会删数据库记录和 `sys_favorites` 关联，但文件物理删除仍需要业务层显式调用文件 IPC；资源元数据与物理文件生命周期尚未完全统一收口。

### 4.5 预置资源打包现实

- 开发环境预置资源源目录是 `assets/resources/**`。
- 生产环境协议代码期望它们位于 `process.resourcesPath/assets/resources/`。
- 仓库提供了 `scripts/init-resources.js`，但它把资源复制到 `dist/resources/`，而且没有挂到 `package.json` 构建脚本里。
- 这说明“预置资源如何随安装包稳定进入主进程预期路径”目前仍带手工/历史脚本色彩，不是完全自动化的稳定集成。

## 5. 更新、激活、登录与备份

### 5.1 自动更新

- 自动更新主入口在 `electron/handlers/update.js`，由 `electron/main.mjs` 延迟动态加载。
- 运行时依赖 `electron-updater`。
- 默认更新源配置是 GitHub：
  - `owner: maoeast`
  - `repo: Self-Care-ATS`
- 用户配置保存在 `userData/update-config.json`。
- 渲染进程通过 `src/services/UpdateService.ts` 订阅这些事件：
  - `update:update-available`
  - `update:update-not-available`
  - `update:download-progress`
  - `update:update-downloaded`
  - `update:error`
  - `update:before-quit`
- 安装更新前，主进程会发 `update:before-quit`，渲染进程回发 `update:ready-to-quit`，给数据库保存留出时间。
- 如果更新处理器模块加载失败，应用仍会启动，只是自动更新不可用。这是当前代码刻意保留的降级策略。

### 5.2 本地登录与权限

- 登录逻辑在 `src/stores/auth.ts`，实际用户查询由 `src/database/api.ts` 的 `UserAPI` 执行。
- 用户数据存于本地数据库 `user` 表。
- 登录成功后会：
  - 把简单 token 存入 localStorage：`auth_token`
  - 把用户信息存入 localStorage：`user_info`
  - 写入 `login_log`
- 当前 token 生成方式只是 `btoa(\`\${user.id}:\${Date.now()}\`)`，没有服务端签发或刷新机制。
- 路由权限由 `src/router/index.ts` 守卫控制，角色粒度是 `admin` / `teacher` 两级。

### 5.3 激活与许可证

- 激活状态管理在 `src/utils/activation-manager.ts`。
- 许可证校验在 `src/utils/license-manager.ts`。
- 当前运行时激活链路完全本地化：
  - 机器码来自 Electron 主进程 `get-machine-id`
  - 主进程用 `hostname + platform + arch` 做 SHA-256
  - 渲染进程取前 16 位作为显示机器码
  - 激活记录存入本地数据库 `activation` 表
  - 首次运行时间存到 `system_config.first_run_time`
  - 试用期默认 7 天
- 许可证校验使用内嵌 RSA 公钥；浏览器环境下会尝试读取 `public/public-key.pem`，但这也是本地静态文件，不是远程鉴权服务。
- 运行时没有在线授权服务器、没有远程许可证校验 API。

### 5.4 激活工具链的现实分叉

- 运行时校验逻辑已经是 RSA 签名方案，见 `src/utils/license-manager.ts`。
- 但 `package.json` 仍保留 `npm run generate:activation`，对应 `scripts/generate-activation.js`。
- 这个脚本生成的是旧的 HMAC/拼接式 `SPED-...` 激活码，不是当前运行时 RSA 许可证打包格式。
- 也就是说，仓库里同时存在“当前运行时方案”和“历史生成脚本”，两者并不一致；应把运行时 verifier 视为当前事实，把旧生成脚本视为残留工具。

### 5.5 备份与恢复

- 用户可见备份逻辑在 `src/utils/backup.ts`。
- 备份格式不是数据库文件快照，而是：
  - 从若干表读取 JSON
  - 拼成 `BackupData`
  - 用 `src/utils/crypto.ts` 的 AES 封装加密
  - 下载为 `.dat`
- 这个备份表清单仍偏旧，只覆盖：
  - `resource_meta`
  - `teacher_fav`
  - 旧训练/评估/用户/激活等表
- 它没有覆盖当前主线新增表，例如：
  - `sys_training_resource`
  - `sys_tags`
  - `sys_resource_tag_map`
  - `sys_favorites`
  - `sys_app_settings`
  - `sys_class`
  - `student_class_history`
  - `sys_class_teachers`
- 这与 `docs/reports/2026-03-13-scgp-prd-gap-analysis.md` 的判断一致：当前备份/恢复未完全覆盖主线 schema。

### 5.6 `database_backup.db` 的角色

- `database_backup.db` 不是终端用户下载备份格式，而是应用内部兼容/迁移文件。
- 它在 `src/database/sqljs-loader.ts` 中被当作本地文件恢复源。
- 主进程对它提供 `write-database-file`、`read-database-file`、`database-file-exists`、`delete-database-backup` 等接口。
- 这属于历史兼容层，不是当前正式备份产品能力的唯一实现。

## 6. 外部服务与“明确不存在”的集成

### 6.1 当前明确存在的外部网络集成

- 真正进入主链的外部网络服务只有自动更新：
  - `electron-updater`
  - GitHub Releases 源

### 6.2 当前明确不存在的外部服务

- 没有后端 REST API。
- 没有云数据库。
- 没有 SaaS 登录/统一鉴权。
- 没有遥测、埋点、分析平台。
- 没有 Sentry、DataDog 之类的错误上报。
- 没有在线资源中心服务端。

### 6.3 存在代码痕迹但不应视为当前主链

- `index.html` 的 CSP 允许 `tfhub.dev` 与 `mediapipe.net`，说明仓库为视觉/眼动类实验能力预留过网络白名单。
- `public/webgazer.js` 存在，`src/components/games/visual/VisualTracker.vue` 也保留了对 `window.webgazer` 的依赖代码。
- 但 `index.html` 当前把 `<script src="/webgazer.js">` 注释掉了，所以它不是默认启动的稳定主链依赖。
- `public/fontawesome-local.css` 指向 jsDelivr，但当前页面实际加载的是本地 `public/fontawesome/**` 资源，也不应把 CDN 字体当作主线外部依赖。

## 7. 当前集成现实总结

- Electron IPC 边界已经清晰，数据库、文件、更新、机器码都通过 preload 白名单暴露。
- 数据库主线已经收敛到 `sql.js + SQLWrapper + save-database-atomic`，但 IndexedDB/localStorage/backup db 兼容层仍在。
- 资源系统已经有 `resource://` 和 `sys_*` 统一模型，但教学资料与收藏仍停留在旧表链路。
- 更新和激活都是本地优先设计：
  - 更新依赖 GitHub Releases
  - 激活依赖本地机器码 + 本地 RSA 验签
- 备份/恢复仍是当前最明显的集成缺口之一，因为它还没有覆盖现行主线 schema。
