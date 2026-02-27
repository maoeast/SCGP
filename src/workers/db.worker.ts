/**
 * Database Worker - 数据库 Web Worker
 *
 * 功能：
 * 1. 在独立线程中运行 SQL.js
 * 2. 处理主线程发送的数据库操作请求
 * 3. 支持批量查询优化
 * 4. 自动保存机制
 *
 * @module db.worker
 */

// ========== 静态导入 SQL.js ==========
// 使用默认导入，因为 sql.js 主要是 CommonJS 模块
import initSqlJs from 'sql.js'
// 使用 ?url 后缀获取 WASM 文件的 URL
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

console.log('[db.worker] 📦 静态导入完成，WASM URL:', sqlWasmUrl)
console.log('[db.worker] 📦 initSqlJs 类型:', typeof initSqlJs)

// 类型定义（内联以避免导入问题）
interface WorkerMessage<T = any> {
  type: string
  id: string
  payload: T
  timestamp?: number
}

interface WorkerResponse<T = any> {
  id: string
  success: boolean
  data?: T
  error?: { code: string; message: string; stack?: string }
  duration?: number
}

interface QueryResult {
  rows: any[]
  columns?: string[]
  changes?: number
  lastInsertId?: number
}

// 消息载荷类型定义
interface InitPayload {
  dbPath?: string
  dbData?: Uint8Array
  config?: {
    enableWorker?: boolean
  }
}

interface QueryPayload {
  sql: string
  params?: any[]
}

interface BatchQueryPayload {
  operations: Array<{ sql: string; params?: any[]; id?: string }>
  useTransaction?: boolean
}

interface ExecutePayload {
  sql: string
  params?: any[]
}

// ============ Worker 全局状态 ============

let SQL: any = null
let db: any = null
let isInitialized = false
let useTestMode = false  // 测试模式（不使用 SQL.js）

// ============ Phase 1.4: 防抖保存状态 ============

/** 是否有未保存的变更 */
let isDirty = false
/** 保存定时器 ID */
let saveTimer: ReturnType<typeof setTimeout> | null = null
/** 防抖延迟（毫秒） */
const SAVE_DEBOUNCE_MS = 2000
/** 数据库名称（用于保存） */
const DB_NAME = 'database.sqlite'
/** 是否正在保存中 */
let isSaving = false

/**
 * 触发防抖保存
 * - 清除现有定时器
 * - 标记 isDirty = true
 * - 启动新的 2000ms 定时器
 */
function triggerDebouncedSave(): void {
  // 清除现有定时器
  if (saveTimer !== null) {
    clearTimeout(saveTimer)
    saveTimer = null
  }

  // 标记为需要保存
  isDirty = true

  console.log('[db.worker] 🔄 触发防抖保存（2000ms 延迟）')

  // 启动新的定时器
  saveTimer = setTimeout(() => {
    performAtomicSave()
  }, SAVE_DEBOUNCE_MS)
}

/**
 * 执行原子保存
 * - 导出数据库
 * - 发送 SAVE_DATABASE 消息到主线程
 * - 保存完成后，如果 isDirty=true，再次触发保存
 */
async function performAtomicSave(): Promise<void> {
  if (isSaving) {
    console.log('[db.worker] ⏳ 正在保存中，等待完成...')
    // 如果正在保存，等保存完成后会检查 isDirty
    return
  }

  isSaving = true
  saveTimer = null

  try {
    console.log('[db.worker] 💾 开始导出数据库...')

    // 导出数据库
    const data = db ? db.export() : new Uint8Array(0)

    if (data.byteLength === 0) {
      console.warn('[db.worker] ⚠️  数据库为空，跳过保存')
      return
    }

    console.log('[db.worker] 📦 数据库大小:', data.byteLength, 'bytes')

    // 发送保存消息到主线程（特殊消息，不需要 id）
    self.postMessage({
      type: 'save_database',
      payload: {
        dbBuffer: data,
        dbName: DB_NAME
      }
    })

    console.log('[db.worker] ✅ 数据库已发送到主线程进行原子写入')
  } catch (error) {
    console.error('[db.worker] ❌ 保存失败:', error)
  } finally {
    isSaving = false

    // 如果在保存期间有新的变更，再次触发保存
    if (isDirty) {
      console.log('[db.worker] 🔄 检测到新变更，再次触发保存...')
      isDirty = false
      triggerDebouncedSave()
    }
  }
}

/**
 * 创建响应对象
 */
function createResponse<T>(
  id: string,
  success: boolean,
  data?: T,
  error?: { code: string; message: string; stack?: string }
): WorkerResponse<T> {
  return {
    id,
    success,
    data,
    error,
    duration: 0
  }
}

/**
 * 发送响应到主线程
 */
function postResponse<T>(response: WorkerResponse<T>): void {
  self.postMessage(response)
}

/**
 * 错误处理
 */
function handleError(id: string, error: unknown): void {
  console.error('[db.worker] Error:', error)

  let errorCode = 'UNKNOWN_ERROR'
  let errorMessage = 'Unknown error'
  let errorStack: string | undefined

  if (error instanceof Error) {
    errorMessage = error.message
    errorStack = error.stack

    // SQL.js 错误码映射
    if (errorMessage.includes('SQLITE_ERROR')) {
      errorCode = 'SYNTAX_ERROR'
    } else if (errorMessage.includes('SQLITE_CONSTRAINT')) {
      errorCode = 'CONSTRAINT_ERROR'
    }
  }

  postResponse({
    id,
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
      stack: errorStack
    }
  })
}

// ============ 消息处理器 ============

/**
 * 处理初始化消息
 */
async function handleInit(id: string, payload: any): Promise<void> {
  const startTime = performance.now()

  try {
    if (isInitialized) {
      postResponse(createResponse(id, true, { ready: true, dbPath: payload.dbPath }))
      return
    }

    console.log('[db.worker] 🔄 Initializing SQL.js from static import...')
    console.log('[db.worker] 📦 initSqlJs 类型:', typeof initSqlJs)

    // 验证 initSqlJs 是函数
    if (typeof initSqlJs !== 'function') {
      throw new Error(`initSqlJs is not a function, it is: ${typeof initSqlJs}`)
    }

    console.log('[db.worker] 📦 调用 initSqlJs 初始化 WASM...')

    // 初始化 SQL.js
    SQL = await initSqlJs({
      locateFile: (file: string) => {
        console.log(`[db.worker] 🔍 locateFile: ${file} -> ${sqlWasmUrl}`)
        return sqlWasmUrl
      }
    })

    if (!SQL || !SQL.Database) {
      throw new Error('SQL.js initialization failed: SQL or SQL.Database is undefined')
    }

    console.log('[db.worker] ✅ SQL.js initialized successfully')

    // 创建数据库
    if (payload.dbData && payload.dbData instanceof Uint8Array && payload.dbData.byteLength > 0) {
      console.log('[db.worker] 📦 Loading existing database data, size:', payload.dbData.byteLength)
      try {
        db = new SQL.Database(payload.dbData)
        console.log('[db.worker] ✅ Existing database loaded successfully')
      } catch (error) {
        console.error('[db.worker] ⚠️ Failed to load existing database, using empty:', error)
        db = new SQL.Database()
      }
    } else {
      console.log('[db.worker] 🆕 Created new empty database')
      db = new SQL.Database()
    }

    isInitialized = true
    const duration = performance.now() - startTime

    console.log(`[db.worker] ✅ Initialized in ${duration.toFixed(2)}ms`)

    postResponse(createResponse(id, true, {
      ready: true,
      dbPath: payload.dbPath,
      memoryUsage: db?.export().byteLength || 0,
      testMode: false
    }))

    // Phase 1.4: 初始化完成后触发防抖保存（确保初始数据被持久化）
    if (db && payload.dbData && payload.dbData.byteLength > 0) {
      console.log('[db.worker] 🔄 初始化完成，触发防抖保存...')
      triggerDebouncedSave()
    }
  } catch (error) {
    console.error('[db.worker] ❌ Initialization failed:', error)
    handleError(id, error)
  }
}

/**
 * 处理查询消息（SELECT）
 */
function handleQuery(id: string, payload: any): void {
  const startTime = performance.now()

  try {
    if (!isInitialized) {
      throw new Error('Database not initialized')
    }

    const { sql, params = [] } = payload

    if (!db) {
      throw new Error('Database not initialized')
    }

    // 执行查询
    const stmt = db.prepare(sql)
    if (params.length > 0) {
      stmt.bind(params)
    }

    const rows: any[] = []
    const columns: string[] = []

    // 获取列名（第一次迭代）
    if (stmt.step()) {
      const row = stmt.getAsObject()
      columns.push(...Object.keys(row))
      rows.push(row)
    }

    // 获取剩余行
    while (stmt.step()) {
      rows.push(stmt.getAsObject())
    }

    stmt.free()

    const duration = performance.now() - startTime

    postResponse(createResponse(id, true, {
      rows,
      columns,
      changes: 0,
      lastInsertId: 0
    } as QueryResult))
  } catch (error) {
    handleError(id, error)
  }
}

/**
 * 处理批量查询消息
 */
function handleBatchQuery(id: string, payload: any): void {
  const startTime = performance.now()
  const results: QueryResult[] = []

  try {
    if (!isInitialized) {
      throw new Error('Database not initialized')
    }

    const { operations, useTransaction = false } = payload

    if (!db) {
      throw new Error('Database not initialized')
    }

    if (useTransaction) {
      db.run('BEGIN TRANSACTION')
    }

    for (const op of operations) {
      try {
        const stmt = db.prepare(op.sql)
        if (op.params && op.params.length > 0) {
          stmt.bind(op.params)
        }

        const rows: any[] = []
        while (stmt.step()) {
          rows.push(stmt.getAsObject())
        }

        stmt.free()

        results.push({
          rows,
          changes: 0,
          lastInsertId: 0
        })
      } catch (error) {
        if (useTransaction) {
          db.run('ROLLBACK')
          throw error
        }
        // 单个操作失败，返回空结果
        results.push({ rows: [], changes: 0, lastInsertId: 0 })
      }
    }

    if (useTransaction) {
      db.run('COMMIT')
    }

    const duration = performance.now() - startTime

    postResponse(createResponse(id, true, {
      results,
      totalDuration: duration
    }))
  } catch (error) {
    handleError(id, error)
  }
}

/**
 * 处理执行消息（INSERT/UPDATE/DELETE）
 */
function handleExecute(id: string, payload: ExecutePayload): void {
  const startTime = performance.now()

  try {
    if (!isInitialized) {
      throw new Error('Database not initialized')
    }

    if (!db) {
      throw new Error('Database not initialized')
    }

    const { sql, params = [] } = payload

    // 执行 SQL
    const result = db.run(sql, params)

    // 获取最后插入的 ID
    const lastInsertId = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0] as number

    // Phase 1.4: 触发防抖保存
    triggerDebouncedSave()

    const duration = performance.now() - startTime

    postResponse(createResponse(id, true, {
      rows: [],
      changes: 1,
      lastInsertId
    } as QueryResult))
  } catch (error) {
    handleError(id, error)
  }
}

/**
 * 处理导出消息
 */
function handleExport(id: string): void {
  const startTime = performance.now()

  try {
    if (!isInitialized) {
      throw new Error('Database not initialized')
    }

    if (!db) {
      throw new Error('Database not initialized')
    }

    const data = db.export()
    const duration = performance.now() - startTime

    postResponse(createResponse(id, true, {
      data,
      size: data.byteLength
    }))
  } catch (error) {
    handleError(id, error)
  }
}

/**
 * 处理 PING 消息（健康检查）
 */
function handlePing(id: string): void {
  postResponse(createResponse(id, true, {
    ready: isInitialized,
    dbPath: '',
    memoryUsage: db ? db.export().byteLength : 0,
    activeConnections: 1,
    testMode: useTestMode
  }))
}

/**
 * 处理 CLOSE 消息
 */
function handleClose(id: string): void {
  try {
    if (db) {
      db.close()
      db = null
    }
    isInitialized = false

    postResponse(createResponse(id, true, { closed: true }))
  } catch (error) {
    handleError(id, error)
  }
}

// ============ Worker 消息入口 ============

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, id, payload } = event.data

  console.log('[db.worker] Received:', type, id)

  switch (type) {
    case 'init':
      handleInit(id, payload as InitPayload)
      break

    case 'query':
      handleQuery(id, payload as QueryPayload)
      break

    case 'batch_query':
      handleBatchQuery(id, payload as BatchQueryPayload)
      break

    case 'execute':
      handleExecute(id, payload as ExecutePayload)
      break

    case 'export':
      handleExport(id)
      break

    case 'ping':
      handlePing(id)
      break

    case 'close':
      handleClose(id)
      break

    default:
      postResponse({
        id,
        success: false,
        error: {
          code: 'UNKNOWN_MESSAGE_TYPE',
          message: `Unknown message type: ${type}`
        }
      })
  }
}

// 导出类型（用于 TypeScript）
export type {}
