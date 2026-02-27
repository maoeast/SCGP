/**
 * SQL.js数据库封装
 * 使用实际的SQLite数据库替代Mock数据库
 */

import initSqlJs, { Database } from 'sql.js'
import { SQLiteDatabase } from './sql-database'

let dbInstance: SQLiteDatabase | null = null

/**
 * 初始化数据库
 */
export async function initDatabase(): Promise<SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance
  }

  try {
    // 初始化SQL.js
    const SQL = await initSqlJs({
      locateFile: file => `/node_modules/sql.js/dist/${file}`
    })

    // 创建数据库实例
    const sqliteDb = new SQL.Database()

    // 创建我们的数据库封装
    dbInstance = new SQLiteDatabase(sqliteDb)

    // 初始化表结构
    await dbInstance.initTables()

    // 插入初始数据
    await dbInstance.insertInitialData()

    console.log('数据库初始化成功')
    return dbInstance
  } catch (error) {
    console.error('数据库初始化失败:', error)
    throw error
  }
}

/**
 * 获取数据库实例
 */
export async function getDatabase(): Promise<SQLiteDatabase> {
  if (!dbInstance) {
    return await initDatabase()
  }
  return dbInstance
}

/**
 * 关闭数据库
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}