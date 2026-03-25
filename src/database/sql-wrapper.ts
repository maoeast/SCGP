/**
 * SQL.js数据库包装类 - Plan B: 主线程防抖原子写入
 *
 * 功能：
 * 1. 提供 SQL.js 兼容的 API
 * 2. 防抖保存：数据变动后 2000ms 执行原子写入
 * 3. 直接通过 electronAPI.saveDatabaseAtomic 持久化
 */

export class SQLWrapper {
  private db: any
  private SQL: any
  private isElectron: boolean = false

  // ========== Plan B: 防抖保存状态 ==========
  /** 保存定时器 ID */
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  /** 防抖延迟（毫秒） */
  private readonly SAVE_DEBOUNCE_MS = 2000
  /** 数据库名称 */
  private readonly DB_NAME = 'database.sqlite'
  /** 是否正在保存中 */
  private isSaving = false
  /** 是否有未保存的变更 */
  private isDirty = false
  /** 是否有待处理的保存请求（解决并发保存丢失问题） */
  private pendingSave = false

  constructor(db: any, SQL: any) {
    this.db = db
    this.SQL = SQL
    this.isElectron = !!(window as any).electronAPI

    if (this.isElectron) {
      console.log('[SQLWrapper] 🔄 Plan B: 主线程防抖原子写入模式')
      console.log('[SQLWrapper] 📡 防抖延迟:', this.SAVE_DEBOUNCE_MS, 'ms')
    } else {
      console.log('[SQLWrapper] ⚠️  非 Electron 环境，自动保存功能不可用')
    }
  }

  // 存储最后插入的ID
  private lastInsertedRowId: number = 0

  // 存储最后修改的行数
  private lastRowsModified: number = 0

  /**
   * 触发防抖保存
   * - 清除现有定时器
   * - 标记 isDirty = true
   * - 启动新的 2000ms 定时器
   */
  private triggerDebouncedSave(): void {
    if (!this.isElectron) {
      return // 非 Electron 环境，跳过保存
    }

    // 清除现有定时器
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }

    // 标记为需要保存
    this.isDirty = true

    console.log('[SQLWrapper] 🔄 触发防抖保存（2000ms 延迟）')

    // 启动新的定时器
    this.saveTimer = setTimeout(async () => {
      await this.performAtomicSave()
    }, this.SAVE_DEBOUNCE_MS)
  }

  /**
   * 执行原子保存
   * - 导出数据库
   * - 调用 electronAPI.saveDatabaseAtomic
   * - 保存完成后，检查 pendingSave，如果有待处理的保存请求，立即执行
   */
  private async performAtomicSave(): Promise<void> {
    if (this.isSaving) {
      console.log('[SQLWrapper] ⏳ 正在保存中，标记待处理保存请求...')
      this.pendingSave = true
      return
    }

    this.isSaving = true
    this.saveTimer = null
    this.pendingSave = false  // 重置待处理标志

    try {
      console.log('[SQLWrapper] 💾 开始导出数据库...')

      // 导出数据库
      const data = this.db.export()

      if (data.byteLength === 0) {
        console.warn('[SQLWrapper] ⚠️  数据库为空，跳过保存')
        return
      }

      console.log('[SQLWrapper] 📦 数据库大小:', data.byteLength, 'bytes')

      // 调用 Electron IPC 进行原子写入
      const electronAPI = (window as any).electronAPI
      const result = await electronAPI.saveDatabaseAtomic(data, this.DB_NAME)

      if (result.success) {
        console.log('[SQLWrapper] ✅ 原子写入成功！文件:', result.filePath || this.DB_NAME)
      } else {
        console.error('[SQLWrapper] ❌ 原子写入失败:', result.error)
      }
    } catch (error) {
      console.error('[SQLWrapper] ❌ 保存失败:', error)
    } finally {
      // 保存完成后，检查是否有待处理的保存请求
      const hasPendingSave = this.pendingSave

      this.isSaving = false

      // 如果有待处理的保存请求，立即再次执行保存
      if (hasPendingSave) {
        console.log('[SQLWrapper] 🔄 检测到待处理的保存请求，立即执行...')
        await this.performAtomicSave()
      }

      // 如果在保存期间有新的变更，再次触发防抖保存
      if (this.isDirty) {
        console.log('[SQLWrapper] 🔄 检测到新变更，再次触发保存...')
        this.isDirty = false
        this.triggerDebouncedSave()
      }
    }
  }

  /**
   * 执行SQL查询
   */
  run(sql: string, params: any[] = []): any {
    try {
      let result
      const sqlUpper = sql.trim().toUpperCase()
      const isInsert = sqlUpper.startsWith('INSERT')
      const isUpdate = sqlUpper.startsWith('UPDATE')
      const isDelete = sqlUpper.startsWith('DELETE')

      if (params.length > 0) {
        const stmt = this.db.prepare(sql)
        // SQL.js的bind方法接受参数数组，将undefined转换为null
        const processedParams = params.map(param => param === undefined ? null : param)
        stmt.bind(processedParams)
        result = stmt.step()
        // 对于INSERT操作，保存插入的行ID
        if (isInsert) {
          // 立即查询并保存插入的行ID
          const idStmt = this.db.prepare('SELECT last_insert_rowid() as id')
          idStmt.step()
          const idObj = idStmt.getAsObject()
          this.lastInsertedRowId = idObj.id as number
          this.lastRowsModified = 1
          console.log('🔑 INSERT操作完成，获取到的ID:', this.lastInsertedRowId)
          idStmt.free()
        } else if (isUpdate || isDelete) {
          // 对于 UPDATE/DELETE，设置修改行数为 1（简化处理）
          this.lastRowsModified = 1
        }
        stmt.free()
      } else {
        result = this.db.run(sql)
        // 对于INSERT操作，保存插入的行ID
        if (isInsert) {
          // 立即查询并保存插入的行ID
          const idStmt = this.db.prepare('SELECT last_insert_rowid() as id')
          idStmt.step()
          const idObj = idStmt.getAsObject()
          this.lastInsertedRowId = idObj.id as number
          this.lastRowsModified = 1
          console.log('🔑 INSERT操作完成，获取到的ID:', this.lastInsertedRowId)
          idStmt.free()
        } else if (isUpdate || isDelete) {
          this.lastRowsModified = 1
        }
      }

      // ========== Plan B: INSERT/UPDATE/DELETE 触发防抖保存 ==========
      if (isInsert || isUpdate || isDelete) {
        this.triggerDebouncedSave()
      }

      return result
    } catch (error) {
      console.error('SQL执行错误:', sql, params, error)
      throw error
    }
  }

  /**
   * 执行多条 SQL 语句（用于初始化表结构）
   */
  exec(sql: string): void {
    try {
      // 将多条 SQL 按分号分割
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--')) // 过滤空行和注释

      for (const statement of statements) {
        this.db.run(statement)
      }

      // ========== Plan B: 执行 SQL 后触发防抖保存 ==========
      this.triggerDebouncedSave()
    } catch (error) {
      console.error('SQL执行错误:', sql, error)
      throw error
    }
  }

  /**
   * 查询多行数据
   */
  all(sql: string, params: any[] = []): any[] {
    try {
      const stmt = this.db.prepare(sql)
      if (params.length > 0) {
        const processedParams = params.map(param => param === undefined ? null : param)
        stmt.bind(processedParams)
      }
      const result = []
      while (stmt.step()) {
        result.push(stmt.getAsObject())
      }
      stmt.free()
      return result
    } catch (error) {
      console.error('SQL查询错误:', sql, params, error)
      throw error
    }
  }

  /**
   * 查询单行数据
   */
  get(sql: string, params: any[] = []): any | null {
    try {
      const stmt = this.db.prepare(sql)
      if (params.length > 0) {
        const processedParams = params.map(param => param === undefined ? null : param)
        stmt.bind(processedParams)
      }
      const result = stmt.step() ? stmt.getAsObject() : null
      stmt.free()
      return result
    } catch (error) {
      console.error('SQL查询错误:', sql, params, error)
      return null
    }
  }

  /**
   * 准备语句
   */
  prepare(sql: string): any {
    return this.db.prepare(sql)
  }

  /**
   * 获取最后插入的ID
   */
  lastInsertId(): number {
    // 优先返回缓存的ID
    console.log('📌 获取最后插入的ID，缓存值:', this.lastInsertedRowId)

    if (this.lastInsertedRowId > 0) {
      return this.lastInsertedRowId
    }

    // SQL.js使用自增ID时，需要通过查询获取最后插入的ID
    try {
      const stmt = this.db.prepare('SELECT last_insert_rowid() as id')
      stmt.step()
      const idObj = stmt.getAsObject()
      const id = idObj.id as number
      stmt.free()

      console.log('📌 从数据库查询到的ID:', id)
      return id
    } catch (error) {
      console.error('❌ 获取最后插入ID失败:', error)
      return 0
    }
  }

  /**
   * 获取受影响的行数
   */
  changes(): number {
    return this.lastRowsModified
  }

  /**
   * 导出数据库
   */
  export(): Uint8Array {
    return this.db.export()
  }

  /**
   * 获取原始 SQL.js Database 对象
   * ⚠️ 仅用于迁移等特殊场景，普通操作请使用 run/exec/all/get 等方法
   */
  getRawDB(): any {
    return this.db
  }

  /**
   * 立即保存（绕过防抖，用于应用退出前）
   */
  async saveNow(): Promise<void> {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    await this.performAtomicSave()
  }

  /**
   * 关闭数据库
   */
  async close(): Promise<void> {
    // 关闭前确保保存
    if (this.isElectron) {
      await this.saveNow()
    }
    this.db.close()
  }
}
