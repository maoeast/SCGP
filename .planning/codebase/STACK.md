# SCGP 当前技术栈

本文件只描述仓库当前主线代码里已经存在、已经接线或明显处于兼容过渡态的技术栈事实，不把历史规划或未来目标态写成现状。

## 1. 判定范围

- 核心依据来自 `package.json`、`index.html`、`vite.config.ts`、`tsconfig.json`、`tsconfig.app.json`、`tsconfig.node.json`、`src/main.ts`、`src/router/index.ts`、`electron/main.mjs`、`src/database/init.ts`、`src/database/resource-api.ts`、`src/database/api.ts`。
- 文档口径与 `README.md`、`PROJECT_CONTEXT.md`、`重构实施技术规范.md`、`docs/planning/2026-03-13-scgp-current-prd.md`、`docs/reports/2026-03-13-scgp-prd-gap-analysis.md` 保持一致，但以代码实际接线为准。

## 2. 语言与代码形态

- 主语言是 TypeScript。前端业务、数据库访问层、模块注册、更新服务、鉴权状态都以 `.ts` 和 `.vue` 为主，见 `src/**/*.ts` 与 `src/**/*.vue`。
- 前端 UI 使用 Vue 3 单文件组件，主要采用 `<script setup lang="ts">`，见 `src/views/**`、`src/components/**`。
- Electron 主进程当前主入口是 ESM：`package.json` 声明 `"type": "module"`，`"main": "electron/main.mjs"`，主进程实现位于 `electron/main.mjs`。
- 预加载脚本同时保留 ESM 与 CJS 两份：`electron/preload.mjs` 是当前主进程实际加载版本，`electron/preload.cjs` 是兼容残留。
- SQL 以两种形态存在：
  - 主线 schema/migration 以内联字符串和 TypeScript 迁移逻辑存在于 `src/database/init.ts`、`src/database/migration/*.ts`。
  - 参考/辅助 SQL 文件存在于 `src/database/schema.sql`、`src/database/schema/sys-tables.sql`、`src/database/schema/class-schema.sql`。
- 纯前端静态资源包含 HTML、CSS、WASM 与大量本地素材，见 `index.html`、`public/**`、`assets/resources/**`。

## 3. 运行时与应用壳

- 当前产品是桌面优先应用，运行时核心是 `Electron + Chromium + Node.js`。
- Electron 版本来自 `package.json`：`electron ^34.5.8`。
- Node.js 版本约束来自 `package.json`：`^20.19.0 || >=22.12.0`。
- 渲染进程入口是 `src/main.ts`，负责：
  - 初始化数据库 `initDatabase()`
  - 初始化 `ModuleRegistry`
  - 初始化 IEP 策略
  - 注册 Pinia、Vue Router、Element Plus
  - 恢复登录态和激活状态
- Electron 环境下路由使用 `HashHistory`，Web 环境使用 `BrowserHistory`，见 `src/router/index.ts`。这说明当前前端同时保留桌面运行与浏览器调试两种启动方式。
- BrowserWindow 配置见 `electron/main.mjs`：
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `enableRemoteModule: false`
  - `sandbox: false`
  - 开发环境启用 DevTools，生产环境关闭

## 4. 前端框架与 UI 栈

- UI 框架：`vue ^3.5.25`。
- 路由：`vue-router ^4.6.3`，当前仍是静态路由表，不是注册表动态装配，见 `src/router/index.ts`。
- 状态管理：`pinia ^3.0.4`，当前核心 store 包括 `src/stores/auth.ts`、`src/stores/resource.ts`、`src/stores/systemConfig.ts`、`src/stores/student.ts`、`src/stores/assessment.ts`。
- 组件库：`element-plus ^2.12.0` 与 `@element-plus/icons-vue ^2.3.2`。
- 图表：`echarts ^6.0.0` 与 `vue-echarts ^8.0.1`。
- 图标资源当前主用本地 Font Awesome 静态文件，`index.html` 实际加载的是 `/fontawesome/css/all.min.css`，资源位于 `public/fontawesome/**`。
- 页面样式主入口包括 `src/assets/layout.css` 与 `src/assets/main.css`。

## 5. 数据与持久化栈

### 5.1 主线数据库

- 主线数据库引擎是 `sql.js ^1.13.0`，运行在渲染进程内，不是原生 SQLite 驱动。
- `sql.js` 的 WASM 运行时当前通过 `public/sql-wasm.js` 与 `public/sql-wasm.wasm` 提供。
- 当前数据库初始化链路是：
  - `src/main.ts` 调用 `initDatabase()`
  - `src/database/init.ts` 优先通过 `window.electronAPI.loadDatabaseFile()` 读取 `userData/database.sqlite`
  - `src/database/database-loader.ts` 用二进制 Buffer 初始化 SQL.js
  - `src/database/sql-wrapper.ts` 用 `SQLWrapper` 包装原始数据库
- 主线持久化不是 Worker，而是 `SQLWrapper` 的 2000ms 防抖导出 + Electron IPC 原子写入。

### 5.2 兼容与降级存储

- Web/兼容降级路径仍存在：
  - `src/database/indexeddb-storage.ts`：IndexedDB 保存 SQL.js 二进制
  - `src/database/sqljs-loader.ts`：旧加载器，仍保留 IndexedDB、`database_backup.db`、localStorage 兼容逻辑
  - `src/database/sqljs-init.ts`：更早期的 localStorage 版 SQL.js 初始化逻辑
- 这些代码说明仓库仍保留从 localStorage/IndexedDB 迁移过来的兼容层，但当前 Electron 主链以 `database.sqlite` + IPC 保存为准。

### 5.3 当前 schema 现实

- `src/database/init.ts` 仍维护大块内联 schema，包含学生、评估、训练、资源、用户、激活、报告、班级扩展等表。
- 系统资源主模型已经落到：
  - `sys_training_resource`
  - `sys_tags`
  - `sys_resource_tag_map`
  - `sys_favorites`
  - `sys_app_settings`
- 但旧资源表仍存在并仍被部分页面使用：
  - `resource_meta`
  - `teacher_fav`
- 班级管理扩展表在初始化阶段动态补建，见 `src/database/init.ts` 中的 `initializeClassTables()`。
- FTS5 全文检索不是默认稳定主线。`src/database/schema/sys-tables.sql` 里相关 DDL 仍是注释状态，迁移脚本 `src/database/migration/migrate-to-resource.ts` 会运行时检测支持后再创建。

## 6. 业务底座与内部平台能力

- 统一评估执行层已经平台化到 `AssessmentContainer + ScaleDriver`，入口与策略初始化分别见 `src/views/assessment/AssessmentContainer.vue` 与 `src/core/strategies-init.ts`。
- 模块注册底座已经存在于 `src/core/module-registry.ts`，模块类型定义在 `src/types/module.ts`。
- 当前模块状态是：
  - `sensory` 已是完整主链
  - `emotional`、`social`、`cognitive`、`life_skills` 在类型、注册表或部分界面中出现，但未形成完整交付链
- 资源层当前也是双轨：
  - 新训练资源链路走 `src/database/resource-api.ts`
  - 旧教学资料链路仍走 `src/database/api.ts` 里的老版 `ResourceAPI`

## 7. 关键依赖分组

### 7.1 当前主链依赖

- `sql.js`：本地优先数据库核心。
- `element-plus`、`@element-plus/icons-vue`：主 UI 组件与图标。
- `pinia`：应用状态管理。
- `vue-router`：静态路由组织。
- `electron-updater`：桌面自动更新。
- `crypto-js`：数据加密、备份加密、密码/兼容安全逻辑。
- `docx`：Word 文档导出。
- `jspdf`、`html2canvas`：PDF/截图式导出。
- `xlsx`：Excel 导入导出。
- `jszip`：压缩包处理。
- `file-saver`：浏览器侧文件保存。
- `uuid`：ID 生成。

### 7.2 开发与构建依赖

- `vite ^7.2.4`：前端开发与打包。
- `@vitejs/plugin-vue`：Vue SFC 编译。
- `vite-plugin-vue-devtools`：Vue DevTools 插件注入。
- `typescript ~5.9.0` 与 `vue-tsc ^3.1.5`：类型检查。
- `eslint ^9.39.1`、`eslint-plugin-vue`、`@vue/eslint-config-typescript`、`@vue/eslint-config-prettier`：静态检查。
- `prettier 3.6.2`：格式化。
- `electron-builder ^25.1.8`：桌面打包。
- `concurrently`、`wait-on`、`cross-env`、`npm-run-all2`：开发启动与脚本编排。
- `terser`：生产构建压缩。

### 7.3 非主链或历史残留依赖

- `better-sqlite3` 仍存在于 `devDependencies`，但当前运行时主链没有使用它；它更像历史迁移/开发工具残留，与“零原生依赖”目标并不完全一致。
- `public/fontawesome-local.css` 仍引用 jsDelivr CDN，但当前实际入口 `index.html` 没有使用它。

## 8. 构建、开发与打包工具链

- `npm run dev` 调用 `scripts/dev-start.js`，会先检查并清理 5173 端口，再启动 Vite。
- `npm run build:web` 使用 `cross-env ELECTRON=true vite build`，让 Vite 以 Electron 相对路径模式构建。
- `npm run build:electron` 先构建前端，再调用 `electron-builder` 打包。
- `vite.config.ts` 的重要事实：
  - Electron 构建时 `base` 为 `./`
  - 开发服务器默认 `https://localhost:5173`
  - 若根目录存在 `dev-cert.pem` / `dev-key.pem` 就启用 HTTPS
  - 监听 `0.0.0.0`，支持局域网访问
  - `sql.js` 被排除出 `optimizeDeps`
  - `copyPublicDir: true`
  - `manualChunks` 人工拆分 `element-plus` 与 `echarts`
- 当前证书文件真实存在于仓库根目录：`dev-cert.pem`、`dev-key.pem`。
- `package.json` 里的 Electron Builder 配置仍保留旧命名：
  - `appId` 是 `com.sic.ads`
  - `productName` 是 `感官能力发展系统`
  这与当前 SCGP 名称不完全一致，属于已知命名残留。

## 9. 静态资源与重要运行资产

- 应用入口 HTML：`index.html`。
- SQL.js 运行时资产：`public/sql-wasm.js`、`public/sql-wasm.wasm`。
- 本地字体图标：`public/fontawesome/**`。
- 预置任务封面与静态任务资源：`public/tasks/**`。
- 预置教学/资源中心素材：`assets/resources/**`。
- 应用图标与安装器附加配置：`build/icon.ico`、`build/installer.nsh`。
- 许可证公钥浏览器回退文件：`public/public-key.pem`。

## 10. 测试与验证现状

- 当前没有真正接入 Jest/Vitest/Cypress/Playwright 的 npm 脚本。
- `tsconfig.node.json` 虽然把 `vitest.config.*`、`cypress.config.*`、`playwright.config.*` 纳入了类型检查范围，但仓库主线没有对应测试脚本和标准测试流水线。
- 当前更像“开发内嵌验证 + 性能脚本”模式：
  - 开发验证页面在 `src/views/devtools/**`
  - 性能脚本在 `tests/performance/**`
  - 数据迁移/验证脚本在 `src/database/migration/**`、`src/database/test/**`

## 11. 当前事实与非事实

### 当前已经成立

- Electron 桌面壳 + Vue 3 + TypeScript + Vite + SQL.js 是当前真实主链。
- 数据库存储主线是渲染进程 SQL.js + 主进程原子落盘。
- 资源协议 `resource://` 已真实接线。
- 统一评估容器、模块注册表、统一训练资源模型都已存在。

### 当前不是事实

- 数据库 Worker 不是当前主链。
- 图片 Worker 不是当前主链。
- 路由与导航不是注册表驱动。
- 全部未来模块不是完整可交付产品。
- 资源中心没有完全脱离旧 `resource_meta` / `teacher_fav` 双轨结构。

## 12. 一句话结论

当前 SCGP 的技术栈不是“纯前端网页应用”，也不是“原生 SQLite 桌面应用”；它是一个以 `Electron + Vue 3 + sql.js` 为核心、带有明显平台化过渡结构和历史兼容层的本地优先桌面系统。
