/**
 * Worker 消息类型定义
 * 用于主线程与 Worker 之间的通讯
 */

// ============ 基础类型 ============

/**
 * 批量操作项
 */
export interface BatchOperation {
  /** SQL 语句 */
  sql: string
  /** 参数数组 */
  params?: any[]
  /** 操作 ID（用于追踪） */
  id?: string
}

/**
 * Worker 消息类型
 */
export enum WorkerMessageType {
  /** 初始化数据库 */
  INIT = 'init',
  /** 单次查询 */
  QUERY = 'query',
  /** 批量查询 */
  BATCH_QUERY = 'batch_query',
  /** 执行 SQL（INSERT/UPDATE/DELETE） */
  EXECUTE = 'execute',
  /** 导出数据库 */
  EXPORT = 'export',
  /** 关闭数据库 */
  CLOSE = 'close',
  /** 健康检查 */
  PING = 'ping'
}

/**
 * Worker 消息结构（主线程 → Worker）
 */
export interface WorkerMessage<T = any> {
  /** 消息类型 */
  type: WorkerMessageType | string
  /** 消息 ID（用于请求-响应匹配） */
  id: string
  /** 消息载荷 */
  payload: T
  /** 时间戳 */
  timestamp?: number
}

/**
 * Worker 响应结构（Worker → 主线程）
 */
export interface WorkerResponse<T = any> {
  /** 对应的请求 ID */
  id: string
  /** 是否成功 */
  success: boolean
  /** 响应数据 */
  data?: T
  /** 错误信息 */
  error?: {
    code: string
    message: string
    stack?: string
  }
  /** 处理时长（毫秒） */
  duration?: number
}

// ============ 具体消息类型 ============

/**
 * 初始化消息载荷
 */
export interface InitPayload {
  /** 数据库文件路径（可选，用于 Electron） */
  dbPath?: string
  /** SQL.js 配置 */
  config?: {
    /** 是否启用 WebWorker */
    enableWorker?: boolean
  }
}

/**
 * 查询消息载荷
 */
export interface QueryPayload {
  /** SQL 语句 */
  sql: string
  /** 参数 */
  params?: any[]
}

/**
 * 批量查询消息载荷
 */
export interface BatchQueryPayload {
  /** 批量操作列表 */
  operations: BatchOperation[]
  /** 是否使用事务 */
  useTransaction?: boolean
}

/**
 * 执行消息载荷
 */
export interface ExecutePayload {
  /** SQL 语句 */
  sql: string
  /** 参数 */
  params?: any[]
}

/**
 * 导出消息载荷
 */
export interface ExportPayload {
  /** 是否压缩 */
  compress?: boolean
}

// ============ 响应数据类型 ============

/**
 * 查询结果
 */
export interface QueryResult {
  /** 行数据数组 */
  rows: any[]
  /** 列信息 */
  columns?: string[]
  /** 受影响的行数 */
  changes?: number
  /** 最后插入的 ID */
  lastInsertId?: number
}

/**
 * 批量查询结果
 */
export interface BatchQueryResult {
  /** 每个操作的结果 */
  results: QueryResult[]
  /** 总处理时长 */
  totalDuration: number
}

/**
 * 导出结果
 */
export interface ExportResult {
  /** 数据库二进制数据 */
  data: Uint8Array
  /** 数据大小（字节） */
  size: number
  /** 是否压缩 */
  compressed?: boolean
}

/**
 * 健康状态
 */
export interface HealthStatus {
  /** 是否就绪 */
  ready: boolean
  /** 数据库路径 */
  dbPath?: string
  /** 内存使用（字节） */
  memoryUsage?: number
  /** 活动连接数 */
  activeConnections?: number
}

// ============ 错误码 ============

export enum WorkerErrorCode {
  /** 数据库未初始化 */
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  /** SQL 语法错误 */
  SYNTAX_ERROR = 'SYNTAX_ERROR',
  /** 约束违反 */
  CONSTRAINT_ERROR = 'CONSTRAINT_ERROR',
  /** 未知错误 */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  /** 序列化错误 */
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR'
}
