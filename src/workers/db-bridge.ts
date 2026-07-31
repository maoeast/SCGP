/**
 * DatabaseBridge - 主线程与 Worker 的桥接层
 *
 * 功能：
 * 1. 管理 Worker 实例的生命周期
 * 2. 提供类型安全的数据库操作 API
 * 3. 集成 DatabaseCommandQueue 进行批量优化
 *
 * @module db-bridge
 */

// Vite 会自动处理 ?worker 后缀的文件
import DbWorker from './db.worker.ts?worker'
import { DatabaseCommandQueue, type QueueConfig } from './command-queue'
import type {
  QueryResult,
  BatchOperation,
  WorkerResponse
} from './types/worker-messages'
import type { ElectronAPI } from '../types/electron'

/**
 * DatabaseBridge 配置
 */
interface BridgeConfig {
  /** 队列配置 */
  queueConfig?: Partial<QueueConfig>
  /** 是否启用调试 */
  debug?: boolean
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: BridgeConfig = {
  debug: import.meta.env.DEV
}

/**
 * DatabaseBridge 类
 *
 * 使用示例：
 * ```typescript
 * const bridge = new DatabaseBridge()
 * await bridge.init()
 * const result = await bridge.query('SELECT * FROM students')
 * await bridge.close()
 * ```
 */
export class DatabaseBridge {
  private worker: Worker | null = null
  private queue: DatabaseCommandQueue | null = null
  private config: BridgeConfig
  private isReady = false

  constructor(config: BridgeConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.log('DatabaseBridge created')
  }

  /**
   * 初始化 Worker
   * @param dbPath 数据库路径（Electron 环境）
   * @param dbData 数据库二进制数据（直接传入 Buffer，绕过文件系统）
   */
  async init(dbPath?: string, dbData?: Uint8Array): Promise<void> {
    if (this.worker) {
      throw new Error('Worker already initialized')
    }

    this.log('Initializing worker...')

    // 使用 Vite 的 worker 导入
    try {
      this.worker = new DbWorker()
      this.log('Worker created successfully')
    } catch (error) {
      this.log('Failed to create worker:', error)
      throw new Error(`Failed to create worker: ${error}`)
    }

    // 创建命令队列（队列会在构造函数中设置 onmessage）
    this.queue = new DatabaseCommandQueue(this.worker, this.config.queueConfig)

    // Phase 1.4: 设置防抖保存消息监听器（在队列之后，包装队列的处理器）
    // 保存队列的处理器，然后设置新的处理器来拦截 save_database 消息
    this.setupSaveListener()

    // 初始化数据库
    const response = await this.enqueue('init', { dbPath, dbData })

    if (response.success) {
      this.isReady = true
      this.log('Worker initialized successfully')
    } else {
      throw new Error(response.error?.message || 'Failed to initialize worker')
    }
  }

  /** 队列的原始消息处理器（用于转发非 save_database 消息） */
  private queueMessageHandler: ((event: MessageEvent) => void) | null = null

  /**
   * Phase 1.4: 设置防抖保存消息监听器
   * 监听 Worker 发送的 save_database 消息，调用 Electron IPC 进行原子写入
   * 其他消息转发给命令队列处理
   */
  private setupSaveListener(): void {
    if (!this.worker) return

    // 保存队列的 onmessage 处理器
    this.queueMessageHandler = this.worker.onmessage

    // 设置新的消息处理器来拦截 save_database 消息
    this.worker.onmessage = (event: MessageEvent) => {
      const { type, payload } = event.data

      // 处理 save_database 消息（单向通知，无响应）
      if (type === 'save_database') {
        this.handleSaveDatabase(payload)
        return
      }

      // 其他消息转发给队列的处理器
      if (this.queueMessageHandler) {
        this.queueMessageHandler(event)
      }
    }

    this.log('Save listener installed (wrapping queue handler)')
  }

  /**
   * 处理数据库保存请求
   * 调用 Electron IPC 进行原子写入
   */
  private async handleSaveDatabase(payload: { dbBuffer: Uint8Array; dbName: string }): Promise<void> {
    try {
      this.log('💾 收到保存请求，数据库大小:', payload.dbBuffer.byteLength, 'bytes')

      // 检查是否在 Electron 环境
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const electronAPI = (window as any).electronAPI as ElectronAPI
        const result = await electronAPI.saveDatabaseAtomic(payload.dbBuffer, payload.dbName)

        if (result.success) {
          this.log('✅ 数据库原子写入成功')
        } else {
          this.log('❌ 数据库原子写入失败:', result.error)
        }
      } else {
        // Web 模式：使用 localStorage 模拟
        this.log('⚠️  Web 模式，跳过原子写入（使用 localStorage）')
        this.saveToLocalStorage(payload.dbBuffer)
      }
    } catch (error) {
      this.log('❌ 保存处理失败:', error)
    }
  }

  /**
   * Web 模式：保存到 localStorage（模拟持久化）
   */
  private saveToLocalStorage(buffer: Uint8Array): void {
    try {
      // 将 ArrayBuffer 转换为 Base64 存储
      const binary = Array.from(buffer)
      const base64 = btoa(String.fromCharCode.apply(null, binary))
      localStorage.setItem('sic-ads-database', base64)
      this.log('✅ 数据库已保存到 localStorage (', base64.length, ' chars )')
    } catch (error) {
      this.log('❌ localStorage 保存失败:', error)
    }
  }

  /**
   * 发送消息到 Worker
   */
  private async enqueue<T = any>(
    type: string,
    payload: any,
    options?: { skipBatch?: boolean }
  ): Promise<WorkerResponse<T>> {
    if (!this.queue) {
      throw new Error('Worker not initialized. Call init() first.')
    }

    return this.queue.enqueue<T>(type, payload, options)
  }

  /**
   * 查询（SELECT）
   */
  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    this.log('Query:', sql)

    const response = await this.enqueue<QueryResult>('query', { sql, params })

    if (!response.success) {
      throw new Error(response.error?.message || 'Query failed')
    }

    return response.data!
  }

  /**
   * 批量查询
   */
  async batchQuery(operations: BatchOperation[]): Promise<QueryResult[]> {
    this.log('Batch query:', operations.length, 'operations')

    const response = await this.enqueue<{ results: QueryResult[] }>(
      'batch_query',
      { operations, useTransaction: false },
      { skipBatch: true }  // 跳过队列的批量处理，直接发送批量查询
    )

    if (!response.success) {
      throw new Error(response.error?.message || 'Batch query failed')
    }

    return response.data!.results
  }

  /**
   * 执行（INSERT/UPDATE/DELETE）
   */
  async execute(sql: string, params: any[] = []): Promise<{
    changes: number
    lastInsertId: number
  }> {
    this.log('Execute:', sql)

    const response = await this.enqueue<QueryResult>('execute', { sql, params })

    if (!response.success) {
      throw new Error(response.error?.message || 'Execute failed')
    }

    const result = response.data!
    return {
      changes: result.changes || 0,
      lastInsertId: result.lastInsertId || 0
    }
  }

  /**
   * 导出数据库
   */
  async export(): Promise<Uint8Array> {
    this.log('Exporting database...')

    const response = await this.enqueue<{ data: Uint8Array }>('export', {})

    if (!response.success) {
      throw new Error(response.error?.message || 'Export failed')
    }

    return response.data!.data
  }

  /**
   * 健康检查
   */
  async ping(): Promise<{
    ready: boolean
    memoryUsage: number
  }> {
    const response = await this.enqueue('ping', {}, { skipBatch: true })

    if (!response.success) {
      throw new Error(response.error?.message || 'Ping failed')
    }

    return {
      ready: response.data!.ready,
      memoryUsage: response.data!.memoryUsage || 0
    }
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return this.queue?.getStatus() || { queueLength: 0, pendingCount: 0 }
  }

  /**
   * 关闭 Worker
   */
  async close(): Promise<void> {
    this.log('Closing worker...')

    if (this.worker) {
      await this.enqueue('close', {}, { skipBatch: true })
      this.worker.terminate()
      this.worker = null
    }

    if (this.queue) {
      this.queue.destroy()
      this.queue = null
    }

    this.isReady = false
    this.log('Worker closed')
  }

  /**
   * 调试日志
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[DatabaseBridge]', ...args)
    }
  }
}

/**
 * 单例实例
 */
let bridgeInstance: DatabaseBridge | null = null

/**
 * 获取 DatabaseBridge 单例
 */
export function getDatabaseBridge(): DatabaseBridge {
  if (!bridgeInstance) {
    bridgeInstance = new DatabaseBridge()
  }
  return bridgeInstance
}

/**
 * 销毁 DatabaseBridge 单例
 */
export function destroyDatabaseBridge(): void {
  if (bridgeInstance) {
    bridgeInstance.close()
    bridgeInstance = null
  }
}
