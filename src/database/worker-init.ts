/**
 * Worker-based database initialization (A1: DB Worker 主链接入)
 *
 * 功能：
 * 1. 通过 DatabaseBridge 在 Worker 线程中加载 SQL.js
 * 2. 传入二进制 Buffer 初始化数据库
 * 3. 执行 schema SQL 建表
 * 4. 返回 DatabaseBridge 实例供后续异步查询
 *
 * 启用方式：设环境变量 VITE_USE_DB_WORKER=true
 * 默认走主线程路径（sqljs-loader.ts），Worker 路径需显式开启。
 *
 * @module worker-init
 */

import { DatabaseBridge } from '@/workers/db-bridge'

/**
 * Worker 初始化参数
 */
export interface WorkerInitOptions {
  /** 数据库二进制数据（从 Electron IPC 获取） */
  dbBuffer: Uint8Array | null
  /** Schema SQL（建表语句） */
  schemaSql: string
  /** 是否为新数据库 */
  isNewDb: boolean
}

/**
 * Worker 初始化结果
 */
export interface WorkerInitResult {
  /** DatabaseBridge 实例（可用于异步查询） */
  bridge: DatabaseBridge
  /** 是否为新数据库 */
  isNewDb: boolean
}

/**
 * 通过 Worker 初始化数据库
 *
 * @param options 初始化参数
 * @returns WorkerInitResult
 */
export async function initDatabaseViaWorker(
  options: WorkerInitOptions
): Promise<WorkerInitResult> {
  const { dbBuffer, schemaSql } = options

  console.log('[WorkerInit] 🔄 通过 Worker 初始化数据库...')

  // 创建 Bridge 实例
  const bridge = new DatabaseBridge({ debug: import.meta.env.DEV })

  // 初始化 Worker 并加载数据库
  await bridge.init(undefined, dbBuffer ?? undefined)

  console.log('[WorkerInit] ✅ Worker 初始化成功，开始建表...')

  // 执行 schema SQL
  if (schemaSql) {
    try {
      await bridge.execute(schemaSql)
      console.log('[WorkerInit] ✅ Schema 建表完成')
    } catch (error) {
      console.error('[WorkerInit] ❌ Schema 执行失败:', error)
      throw error
    }
  }

  // 启用外键约束
  try {
    await bridge.execute('PRAGMA foreign_keys = ON')
  } catch {
    // PRAGMA 在 Worker 模式下可能忽略，不阻塞
  }

  console.log('[WorkerInit] ✅ Worker 数据库初始化完成')

  return { bridge, isNewDb: !dbBuffer || dbBuffer.length === 0 }
}

/**
 * 获取当前 Worker 模式下的 bridge 实例
 *
 * 由 init.ts 在 Worker 初始化成功后设置，
 * 其他模块可通过此函数获取 bridge 进行异步查询。
 */
let workerBridge: DatabaseBridge | null = null

export function getWorkerBridge(): DatabaseBridge | null {
  return workerBridge
}

export function setWorkerBridge(bridge: DatabaseBridge | null): void {
  workerBridge = bridge
}
