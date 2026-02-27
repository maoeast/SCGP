/**
 * BridgeSQLWrapper - SQL.js 接口兼容层
 *
 * 功能：
 * 1. 提供 SQL.js 兼容的接口（all, get, run, exec, prepare）
 * 2. 内部使用 DatabaseBridge 与 Worker 通信
 * 3. 格式化 Worker 返回的数据为 SQL.js 格式
 * 4. 支持 changes() 和 lastInsertId() 查询
 *
 * @module bridge-sql-wrapper
 */

import { getDatabaseBridge, type DatabaseBridge } from './db-bridge'

/**
 * SQL 语句 Prepared Statement 兼容接口
 */
export class BridgeStatement {
  private bridge: DatabaseBridge
  private sql: string
  private params: any[] = []

  constructor(bridge: DatabaseBridge, sql: string) {
    this.bridge = bridge
    this.sql = sql
  }

  /**
   * 绑定参数
   */
  bind(params: any[]): this {
    this.params = params
    return this
  }

  /**
   * 执行查询并返回所有行（SQL.js all() 行为）
   */
  async all(): Promise<any[]> {
    const result = await this.bridge.query(this.sql, this.params)
    return result.rows || []
  }

  /**
   * 执行查询并返回第一行（SQL.js get() 行为）
   */
  async get(): Promise<any | null> {
    const result = await this.bridge.query(this.sql, this.params)
    return result.rows && result.rows.length > 0 ? result.rows[0] : null
  }

  /**
   * 执行并返回是否还有下一行（兼容 SQL.js step()）
   */
  async step(): Promise<boolean> {
    // 注意：这是简化实现，step() 在 SQL.js 中用于迭代
    // 在异步环境中，我们直接执行查询并返回是否有结果
    const result = await this.bridge.query(this.sql, this.params)
    return (result.rows?.length || 0) > 0
  }

  /**
   * 获取当前行作为对象（SQL.js getAsObject() 行为）
   */
  async getAsObject(): Promise<any | null> {
    return this.get()
  }

  /**
   * 释放语句（SQL.js 行为兼容）
   */
  free(): void {
    this.params = []
  }

  /**
   * 重置语句（SQL.js 行为兼容）
   */
  reset(): void {
    this.params = []
  }
}

/**
 * BridgeSQLWrapper - 主类
 *
 * 模拟 SQL.js Database 接口，内部使用 DatabaseBridge
 */
export class BridgeSQLWrapper {
  private bridge: DatabaseBridge
  private _changes: number = 0
  private _lastInsertId: number = 0

  constructor(bridge: DatabaseBridge) {
    this.bridge = bridge
  }

  /**
   * 执行查询并返回所有结果（SQL.js all() 行为）
   * @param sql SQL 语句
   * @param params 参数数组
   * @returns 结果对象数组
   */
  async all(sql: string, params: any[] = []): Promise<any[]> {
    const result = await this.bridge.query(sql, params)
    return result.rows || []
  }

  /**
   * 执行查询并返回第一行（SQL.js get() 行为）
   * @param sql SQL 语句
   * @param params 参数数组
   * @returns 第一行对象或 null
   */
  async get(sql: string, params: any[] = []): Promise<any | null> {
    const result = await this.bridge.query(sql, params)
    return result.rows && result.rows.length > 0 ? result.rows[0] : null
  }

  /**
   * 执行 SQL 语句（INSERT/UPDATE/DELETE）（SQL.js run() 行为）
   * @param sql SQL 语句
   * @param params 参数数组
   */
  async run(sql: string, params: any[] = []): Promise<void> {
    const result = await this.bridge.execute(sql, params)
    this._changes = result.changes
    this._lastInsertId = result.lastInsertId
  }

  /**
   * 执行多条 SQL 语句（SQL.js exec() 行为）
   * @param sql SQL 语句（可能包含多条）
   */
  async exec(sql: string): Promise<void> {
    // 将多条 SQL 拆分并逐条执行
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const statement of statements) {
      await this.run(statement)
    }
  }

  /**
   * 创建 Prepared Statement（SQL.js prepare() 行为）
   * @param sql SQL 语句
   * @returns Statement 对象
   */
  prepare(sql: string): BridgeStatement {
    return new BridgeStatement(this.bridge, sql)
  }

  /**
   * 获取受影响的行数（SQL.js changes() 行为）
   * @returns 受影响的行数
   */
  changes(): number {
    return this._changes
  }

  /**
   * 获取最后插入的 ID（SQL.js lastInsertId() 行为）
   * @returns 最后插入的行 ID
   */
  lastInsertId(): number {
    return this._lastInsertId
  }

  /**
   * 导出数据库（SQL.js export() 行为）
   * @returns 数据库二进制数据
   */
  async export(): Promise<Uint8Array> {
    return this.bridge.export()
  }

  /**
   * 关闭数据库连接（SQL.js close() 行为）
   */
  async close(): Promise<void> {
    await this.bridge.close()
  }

  /**
   * 检查数据库是否只读（SQL.js 兼容）
   * @returns 是否只读
   */
  // @ts-ignore - SQL.js 兼容方法
  readonly: boolean = false
}

/**
 * 创建 BridgeSQLWrapper 实例
 * 确保 Worker 已初始化，并加载现有数据库
 */
export async function createBridgeSQLWrapper(existingDbData?: Uint8Array): Promise<BridgeSQLWrapper> {
  const bridge = getDatabaseBridge()

  // 检查是否已初始化
  try {
    await bridge.ping()
    console.log('[BridgeSQLWrapper] Worker already initialized')
  } catch (error) {
    // 未初始化，进行初始化
    console.log('[BridgeSQLWrapper] Initializing Worker with database data:', existingDbData?.byteLength || 0, 'bytes')
    await bridge.init(undefined, { dbData: existingDbData })
  }

  return new BridgeSQLWrapper(bridge)
}

/**
 * 获取或创建 BridgeSQLWrapper 单例
 * @param existingDbData 现有数据库数据（可选）
 */
let wrapperInstance: BridgeSQLWrapper | null = null

export async function getBridgeSQLWrapper(existingDbData?: Uint8Array): Promise<BridgeSQLWrapper> {
  if (!wrapperInstance) {
    wrapperInstance = await createBridgeSQLWrapper(existingDbData)
  }
  return wrapperInstance
}

/**
 * 重置 BridgeSQLWrapper 单例（用于测试或重新初始化）
 */
export function resetBridgeSQLWrapper(): void {
  wrapperInstance = null
}
