/**
 * DatabaseCommandQueue - 数据库命令队列
 *
 * 功能：
 * 1. 批量合并相邻的数据库操作
 * 2. 防抖处理，减少 postMessage 调用
 * 3. 请求-响应匹配
 *
 * @module DatabaseCommandQueue
 */

import type {
  WorkerMessage,
  WorkerResponse,
  BatchOperation
} from './types/worker-messages'

/**
 * 队列配置
 */
export interface QueueConfig {
  /** 合并窗口时间（毫秒）*/
  batchWindow: number
  /** 最大批量大小 */
  maxBatchSize: number
  /** 是否启用调试日志 */
  debug: boolean
}

/**
 * 待处理的请求
 */
interface PendingRequest {
  /** 请求消息 */
  message: WorkerMessage
  /** Promise resolve */
  resolve: (response: WorkerResponse) => void
  /** Promise reject */
  reject: (error: Error) => void
  /** 请求时间戳 */
  timestamp: number
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: QueueConfig = {
  batchWindow: 50,        // 50ms 合并窗口
  maxBatchSize: 50,       // 最多合并 50 个操作
  debug: import.meta.env.DEV
}

/**
 * DatabaseCommandQueue 类
 *
 * 使用示例：
 * ```typescript
 * const queue = new DatabaseCommandQueue(worker)
 * const result = await queue.enqueue({
 *   type: 'query',
 *   payload: { sql: 'SELECT * FROM students' }
 * })
 * ```
 */
export class DatabaseCommandQueue {
  private worker: Worker
  private config: QueueConfig
  private queue: PendingRequest[] = []
  private flushTimer: number | null = null
  private pendingRequests = new Map<string, {
    resolve: (response: WorkerResponse) => void
    reject: (error: Error) => void
  }>()
  private messageIdCounter = 0

  /**
   * 构造函数
   * @param worker Web Worker 实例
   * @param config 队列配置
   */
  constructor(worker: Worker, config: Partial<QueueConfig> = {}) {
    this.worker = worker
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.setupWorkerListener()
    this.log('DatabaseCommandQueue initialized', { config: this.config })
  }

  /**
   * 设置 Worker 消息监听器
   */
  private setupWorkerListener(): void {
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data
      this.handleResponse(response)
    }

    this.worker.onerror = (error: ErrorEvent) => {
      // 打印详细的 Worker 错误信息
      console.error('[DatabaseCommandQueue] ❌ Worker crashed!')
      console.error('[DatabaseCommandQueue] Message:', error.message)
      console.error('[DatabaseCommandQueue] Filename:', error.filename)
      console.error('[DatabaseCommandQueue] Line:', error.lineno)
      console.error('[DatabaseCommandQueue] Col:', error.colno)
      console.error('[DatabaseCommandQueue] Error object:', error)
      console.error('[DatabaseCommandQueue] Stack:', error.error)

      this.log('Worker error:', error)
      this.rejectAllPending(new Error(`Worker error: ${error.message} (line ${error.lineno})`))
    }
  }

  /**
   * 处理 Worker 响应
   */
  private handleResponse(response: WorkerResponse): void {
    const pending = this.pendingRequests.get(response.id)

    if (!pending) {
      this.log('No pending request for response:', response.id)
      return
    }

    if (response.success) {
      pending.resolve(response)
    } else {
      pending.reject(new Error(response.error?.message || 'Unknown error'))
    }

    this.pendingRequests.delete(response.id)
  }

  /**
   * 生成唯一的消息 ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageIdCounter}`
  }

  /**
   * 入队一个请求
   */
  async enqueue<T = any>(
    type: string,
    payload: any,
    options?: { skipBatch?: boolean }
  ): Promise<WorkerResponse<T>> {
    return new Promise((resolve, reject) => {
      const id = this.generateMessageId()
      const message: WorkerMessage = {
        type,
        id,
        payload,
        timestamp: Date.now()
      }

      // 保存待处理的 Promise
      this.pendingRequests.set(id, { resolve, reject })

      // 如果跳过批处理，立即发送
      if (options?.skipBatch) {
        this.sendMessage(message)
        return
      }

      // 添加到队列
      this.queue.push({
        message,
        resolve,
        reject,
        timestamp: Date.now()
      })

      // 安排刷新
      this.scheduleFlush()
    })
  }

  /**
   * 安排队列刷新
   */
  private scheduleFlush(): void {
    // 如果已经有定时器，不重复安排
    if (this.flushTimer !== null) {
      return
    }

    // 如果队列已满，立即刷新
    if (this.queue.length >= this.config.maxBatchSize) {
      this.flush()
      return
    }

    // 否则，设置防抖定时器
    this.flushTimer = window.setTimeout(() => {
      this.flush()
    }, this.config.batchWindow)
  }

  /**
   * 刷新队列（发送所有待处理的消息）
   */
  private flush(): void {
    // 清除定时器
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    // 如果队列为空，不处理
    if (this.queue.length === 0) {
      return
    }

    const requests = this.queue.splice(0, this.config.maxBatchSize)
    this.log(`Flushing ${requests.length} requests`)

    // 如果只有一个请求，直接发送
    if (requests.length === 1) {
      this.sendMessage(requests[0].message)
      return
    }

    // 多个请求，尝试批量发送
    this.sendBatch(requests)
  }

  /**
   * 发送单个消息
   */
  private sendMessage(message: WorkerMessage): void {
    this.log('Sending message:', message.type, message.id)
    this.worker.postMessage(message)
  }

  /**
   * 批量发送消息
   */
  private sendBatch(requests: PendingRequest[]): void {
    // 检查是否可以批量（所有请求都是 query 类型）
    const allQueries = requests.every(r => r.message.type === 'query')

    if (allQueries) {
      // 合并为批量查询
      const batchMessage: WorkerMessage<BatchOperation[]> = {
        type: 'batch_query',
        id: this.generateMessageId(),
        payload: {
          operations: requests.map(r => ({
            sql: r.message.payload.sql,
            params: r.message.payload.params,
            id: r.message.id
          })),
          useTransaction: false
        },
        timestamp: Date.now()
      }

      // 保存批量请求的响应处理器
      this.pendingRequests.set(batchMessage.id, {
        resolve: (response) => {
          // 批量响应包含多个结果，分发到各个请求
          const batchResults = response.data as any
          if (batchResults?.results) {
            requests.forEach((req, index) => {
              const result = batchResults.results[index]
              req.resolve({
                id: req.message.id,
                success: true,
                data: result,
                duration: response.duration
              })
            })
          }
        },
        reject: (error) => {
          requests.forEach(req => req.reject(error))
        }
      })

      this.worker.postMessage(batchMessage)
      this.log('Sent batch query:', requests.length, 'operations')
    } else {
      // 不能批量，逐个发送
      requests.forEach(req => this.sendMessage(req.message))
    }
  }

  /**
   * 拒绝所有待处理的请求
   */
  private rejectAllPending(error: Error): void {
    // 拒绝队列中的请求
    this.queue.forEach(req => req.reject(error))
    this.queue = []

    // 拒绝等待响应的请求
    this.pendingRequests.forEach(pending => pending.reject(error))
    this.pendingRequests.clear()
  }

  /**
   * 销毁队列
   */
  destroy(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    this.rejectAllPending(new Error('CommandQueue destroyed'))
  }

  /**
   * 获取队列状态
   */
  getStatus(): {
    queueLength: number
    pendingCount: number
  } {
    return {
      queueLength: this.queue.length,
      pendingCount: this.pendingRequests.size
    }
  }

  /**
   * 调试日志
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[DatabaseCommandQueue]', ...args)
    }
  }
}

/**
 * 创建 DatabaseCommandQueue 实例的工厂函数
 */
export function createCommandQueue(
  worker: Worker,
  config?: Partial<QueueConfig>
): DatabaseCommandQueue {
  return new DatabaseCommandQueue(worker, config)
}
