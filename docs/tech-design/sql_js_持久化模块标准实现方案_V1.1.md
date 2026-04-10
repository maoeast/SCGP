# sql.js 持久化模块标准实现方案 (V1.1)

> **职责**：定义 SCGP 平台内基于 `sql.js` 的内存数据库在 Electron 环境下的标准化持久化路径。
> **核心原则**：渲染进程不感知物理路径，预加载脚本强制 IPC 审计，主进程确保原子写入。
>
> **V1.1 修订说明**：
> - [P0] 修复 `SQLWrapper.triggerSave()` 在保存期间丢失写入的 Bug（补充 `pendingSave` 标记）
> - [P0] 补充 `beforeunload` + `flushSync` 同步刷盘机制，防止关闭窗口时数据丢失
> - [P1] 主进程 `db:save-atomic` 补充 Buffer 类型校验与大小上限（512MB）
> - [P1] `fileHandle` 异常处理改为 `try/finally`，`sync` 改为性能更优的 `datasync`
> - [P2] 第 6 节异常恢复伪规范描述改为 TODO 标注，移除无实现的文字承诺

---

## 1. 架构总览

系统采用 **"内存计算 + 异步序列化 + 磁盘原子替换"** 的混合架构：

1. **渲染进程 (Renderer)**：运行 `sql.js` WASM 引擎，所有增删改查均在内存中完成。
2. **包装层 (SQLWrapper)**：负责 SQL 执行、脏标记管理及持久化"防抖 (Debounce)"调度，以及退出场景的强制同步刷盘。
3. **安全桥接层 (Preload)**：作为安全防火墙，禁止渲染进程传递绝对路径，仅暴露语义化 API。
4. **主进程 (Main)**：负责最终的磁盘 I/O，通过"临时文件 → datasync → 原子重命名"三步曲确保断电数据不丢失。

---

## 2. 渲染进程实现：SQLWrapper 标准逻辑

`SQLWrapper` 封装了 `sql.js` 实例，核心任务是维护数据库的"脏状态"并触发异步保存，以及在应用退出前强制完成同步刷盘。

```typescript
export class SQLWrapper {
  private db: any;
  private isDirty = false;
  private isSaving = false;
  private pendingSave = false; // [V1.1 新增] 保存期间有新写入时的补调标记
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(db: any) {
    this.db = db;
    this.registerUnloadGuard(); // [V1.1 新增] 注册退出前强制刷盘
  }

  // 执行 SQL 并触发脏检查
  run(sql: string, params: any[] = []) {
    const result = this.db.run(sql, params);
    const sqlUpper = sql.trim().toUpperCase();
    if (['INSERT', 'UPDATE', 'DELETE'].some(v => sqlUpper.startsWith(v))) {
      this.triggerSave();
    }
    return result;
  }

  // [V1.1 修复] 补充 pendingSave 标记，防止保存期间写入的数据被丢弃
  private triggerSave() {
    this.isDirty = true;
    if (this.isSaving) {
      this.pendingSave = true; // 标记：当前保存完成后需要再调度一次
      return;
    }
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.persist(), 2000);
  }

  private async persist() {
    if (this.isSaving) return;
    this.isSaving = true;
    this.pendingSave = false;
    try {
      const data = this.db.export(); // 全量导出为 Uint8Array
      const result = await (window as any).scgpAPI.db.saveAtomic(data);
      if (result.success) {
        this.isDirty = false;
      } else {
        // 刷盘失败必须通知用户，不可静默丢弃
        (window as any).scgpAPI.ui?.showCriticalError('数据保存失败，请立即检查磁盘状态。');
      }
    } catch (err) {
      console.error('[SQLWrapper] 持久化异常:', err);
      (window as any).scgpAPI.ui?.showCriticalError('数据保存失败，请立即检查磁盘状态。');
    } finally {
      this.isSaving = false;
      // [V1.1 修复] 若保存期间有新写入，立即补调一次
      if (this.pendingSave) {
        this.triggerSave();
      }
    }
  }

  // [V1.1 新增] 应用退出前强制同步刷盘，防止 2s 防抖窗口内关闭导致数据丢失
  private registerUnloadGuard() {
    window.addEventListener('beforeunload', () => {
      if (!this.isDirty || !this.db) return;
      // 清除待执行的异步定时器，避免与同步刷盘竞争
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
      }
      const buffer = this.db.export();
      // 调用同步 IPC，阻塞渲染进程直到主进程写入完成
      (window as any).scgpAPI.db.flushSync(buffer);
    });
  }
}
```

---

## 3. 预加载脚本实现：安全沙盒 (preload.mjs)

**严禁** 在此处导入 `path` 或 `fs` 模块。必须启用 `sandbox: true` 兼容模式。

```javascript
import { contextBridge, ipcRenderer } from 'electron';

// 严格的频道白名单
const ALLOWED_INVOKE = Object.freeze([
  'db:load',
  'db:save-atomic',
  'db:get-stats',
]);

// [V1.1] 所有 invoke 调用统一经过白名单校验，白名单不再是装饰性代码
const safeInvoke = (channel, ...args) => {
  if (!ALLOWED_INVOKE.includes(channel)) {
    throw new Error(`[Security Violation] Unauthorized IPC channel: ${channel}`);
  }
  return ipcRenderer.invoke(channel, ...args);
};

contextBridge.exposeInMainWorld('scgpAPI', {
  db: {
    /** 加载现有数据库文件，首次启动返回 null */
    load: () => safeInvoke('db:load'),

    /** 异步原子写入，用于正常防抖刷盘 */
    saveAtomic: (buffer) => {
      if (!(buffer instanceof Uint8Array)) {
        throw new Error('[Preload] saveAtomic: 参数必须为 Uint8Array');
      }
      return safeInvoke('db:save-atomic', buffer);
    },

    /** 数据库统计信息（文件大小、最后写入时间等） */
    getStats: () => safeInvoke('db:get-stats'),

    // [V1.1 新增] 同步刷盘，仅限 beforeunload 退出场景
    // 注意：sendSync 会阻塞渲染进程，严禁在正常业务流程中调用
    flushSync: (buffer) => {
      if (!(buffer instanceof Uint8Array)) {
        throw new Error('[Preload] flushSync: 参数必须为 Uint8Array');
      }
      return ipcRenderer.sendSync('db:flush-sync', buffer);
    },
  },
});
```

---

## 4. 主进程实现：原子写入逻辑 (main.mjs)

主进程控制所有物理路径，确保数据写入的完整性。

```javascript
import { ipcMain, app } from 'electron';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

const DB_FILENAME = 'database.sqlite';

function getDbPath() {
  // app.getPath('userData') 跨平台指向正确目录：
  // Windows: %APPDATA%/scgp
  // macOS:   ~/Library/Application Support/scgp
  // Linux:   ~/.config/scgp
  return path.join(app.getPath('userData'), DB_FILENAME);
}

// ─── 加载：读取现有数据库文件 ─────────────────────────────────────
ipcMain.handle('db:load', async () => {
  const dbPath = getDbPath();
  try {
    const buffer = await fs.readFile(dbPath);
    return buffer.buffer; // Node Buffer → ArrayBuffer
  } catch (err) {
    if (err.code === 'ENOENT') return null; // 首次启动，正常情况
    throw err; // 其他错误（权限问题等）向上抛出
  }
});

// ─── 异步原子刷盘（正常防抖路径）────────────────────────────────
ipcMain.handle('db:save-atomic', async (event, dbBuffer) => {
  // [V1.1 新增] 主进程类型守卫：不信任来自渲染进程的任意数据
  if (!dbBuffer || (!Buffer.isBuffer(dbBuffer) && !(dbBuffer instanceof Uint8Array))) {
    return { success: false, error: 'Invalid buffer type' };
  }
  // [V1.1 新增] 大小上限：防止异常数据写穿磁盘
  const MAX_SIZE = 512 * 1024 * 1024; // 512MB
  if (dbBuffer.byteLength > MAX_SIZE) {
    return { success: false, error: 'Buffer exceeds 512MB size limit' };
  }

  try {
    await atomicWrite(dbBuffer);
    return { success: true };
  } catch (error) {
    console.error('[Main] Database atomic write failed:', error);
    return { success: false, error: error.message };
  }
});

// ─── 同步刷盘（仅限 beforeunload 退出场景）──────────────────────
ipcMain.on('db:flush-sync', (event, dbBuffer) => {
  const dbPath = getDbPath();
  const tmpPath = dbPath + '.tmp';
  try {
    fsSync.writeFileSync(tmpPath, Buffer.from(dbBuffer));
    fsSync.renameSync(tmpPath, dbPath);
    event.returnValue = { success: true };
  } catch (err) {
    console.error('[Main] Sync flush failed:', err);
    event.returnValue = { success: false, error: String(err) };
  }
});

// ─── 原子写入核心逻辑 ─────────────────────────────────────────────
/**
 * 三步曲：
 * 1. 写入 .tmp 临时文件
 * 2. datasync 强制数据物理落盘（仅刷数据，不刷元数据，性能优于 sync）
 * 3. 原子 rename 覆盖旧数据库（同一分区内为内核原子操作）
 */
async function atomicWrite(dbBuffer) {
  const dbPath = getDbPath();
  const tmpPath = dbPath + '.tmp';

  // Step 1：写入临时文件
  await fs.writeFile(tmpPath, Buffer.from(dbBuffer));

  // Step 2：强制落盘，[V1.1 修复] 使用 try/finally 确保句柄一定被关闭
  const fileHandle = await fs.open(tmpPath, 'r+');
  try {
    await fileHandle.datasync(); // datasync 仅刷数据，性能优于 sync
  } finally {
    await fileHandle.close(); // 无论 datasync 是否抛出，都必须关闭
  }

  // Step 3：原子重命名替换
  await fs.rename(tmpPath, dbPath);
}
```

---

## 5. 性能与安全性约束

### 5.1 性能约束

- **序列化成本**：`sql.js` 全量导出是同步操作。当数据库超过 50MB 时，会阻塞渲染主线程。
  - *对策*：未来迁移至 `Worker` 线程运行 `sql.js`（TODO [v2.0]）。
- **IPC 负载**：全量 Buffer 传输会产生内存拷贝。
  - *对策*：维持 2000ms 的防抖间隔，严禁实时保存。

### 5.2 安全红线 (Must Follow)

1. **路径脱敏**：渲染进程禁止传递任何包含 `/` 或 `\` 的字符串作为路径参数。所有路径由主进程通过 `app.getPath('userData')` 内部计算。
2. **沙盒开启**：`main.mjs` 必须设置 `sandbox: true` 且 `contextIsolation: true`。preload 中禁止 `import path` / `import fs` 等 Node 内置模块，否则沙盒模式下静默失败。
3. **白名单强制执行**：所有 `ipcRenderer.invoke` 调用必须经过 `safeInvoke` 函数，直接调用 `ipcRenderer.invoke` 视为违规。
4. **依赖守门**：`better-sqlite3` 严禁出现在 `src/` 或 `electron/` 的生产代码中，仅限 `scripts/` 构建脚本使用。通过 ESLint 规则强制拦截：

```javascript
// .eslintrc.js
'no-restricted-imports': ['error', { paths: ['better-sqlite3'] }]
```

---

## 6. 异常恢复机制

> **TODO [v1.2]**：以下机制已完成设计，将在 v1.2 版本中实现，当前版本不包含对应代码。

- **启动自愈**：启动时检查 `database.sqlite` 文件大小，若为 0 且存在 `.tmp` 文件，尝试将 `.tmp` 重命名为正式数据库文件。
- **定期备份**：每 24 小时生成一次 `.bak` 备份，保留最近 3 个版本（`database.sqlite.bak1` / `.bak2` / `.bak3`）。

---

## 7. 关键决策速查表

| 问题 | ❌ 错误做法 | ✅ 本方案做法 |
|------|------------|-------------|
| WASM 寻址 | 相对路径 `./sql-wasm.wasm` | 自定义协议 `resource://sql/` |
| 磁盘写入权限 | 渲染进程直接调 `fs.writeFile` | 全部委托主进程，IPC 单向传递 |
| 写入安全性 | 直接覆盖目标文件 | `.tmp` → `datasync` → `rename` 三步曲 |
| 高频写入 | 每次操作立即写盘 | 防抖 2s，`isSaving` 期间补调 |
| 应用退出 | 异步 flush，可能未完成就退出 | `beforeunload` 触发 `flushSync` 同步 IPC |
| 刷盘失败 | `console.error` 静默丢弃 | 弹出 Critical Error 通知，用户可感知 |
| IPC 白名单 | 声明但不校验（装饰性代码） | `safeInvoke` 强制所有 invoke 过白名单 |
| 文件句柄泄漏 | `datasync` 异常后 handle 不关闭 | `try/finally` 确保 `fileHandle.close()` |
