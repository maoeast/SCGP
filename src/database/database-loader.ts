/**
 * Database Loader - 纯内存数据库加载器
 *
 * 功能：接收 Uint8Array Buffer，用其初始化 sql.js 数据库
 * 不包含任何文件系统操作，所有文件操作由 Electron 主进程通过 IPC 完成
 *
 * @module database-loader
 */

// 复用已有的 sql.js 加载器
import { loadSQLJs } from './sqljs-loader'

/**
 * 数据库加载结果
 */
export interface DatabaseLoadResult {
  /** sql.js Database 实例 */
  db: any
  /** SQL 构造函数（用于创建新数据库） */
  SQL: any
  /** 是否为新数据库（首次创建） */
  isNewDb: boolean
}

/**
 * 用 Buffer 初始化数据库
 * @param dbBuffer 数据库二进制数据（从 Electron IPC 获取）
 * @returns DatabaseLoadResult
 */
export async function loadDatabaseFromBuffer(
  dbBuffer: Uint8Array | null
): Promise<DatabaseLoadResult> {
  console.log('[DatabaseLoader] 🔄 初始化 SQL.js...')

  // 使用已有的 loadSQLJs 方法加载
  const initSqlJs = await loadSQLJs()

  // 初始化 SQL.js
  const SQL = await initSqlJs({
    // 在 Electron 环境中，WASM 文件已经通过 preload 脚本加载到全局
    locateFile: (file: string) => {
      const path = `/sql-wasm.wasm`
      console.log(`[DatabaseLoader] locateFile: ${file} -> ${path}`)
      return path
    }
  })

  console.log('[DatabaseLoader] ✅ SQL.js 初始化成功')

  // 判断是否为新数据库
  const isNewDb = !dbBuffer || dbBuffer.length === 0

  if (isNewDb) {
    console.log('[DatabaseLoader] 🆕 创建新数据库')
    const db = new SQL.Database()
    return { db, SQL, isNewDb: true }
  }

  console.log('[DatabaseLoader] 📦 加载已有数据库，大小:', dbBuffer.length, 'bytes')

  try {
    const db = new SQL.Database(dbBuffer)
    console.log('[DatabaseLoader] ✅ 数据库加载成功')
    return { db, SQL, isNewDb: false }
  } catch (error) {
    console.error('[DatabaseLoader] ❌ 数据库加载失败，创建新数据库:', error)
    const db = new SQL.Database()
    return { db, SQL, isNewDb: true }
  }
}

/**
 * 创建新的空数据库
 * @returns DatabaseLoadResult
 */
export async function createEmptyDatabase(): Promise<DatabaseLoadResult> {
  return loadDatabaseFromBuffer(null)
}
