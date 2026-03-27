/**
 * SQL.js database wrapper.
 *
 * Responsibilities:
 * 1. Expose a small sqlite-like API on top of sql.js
 * 2. Debounce persistence in Electron
 * 3. Persist through electronAPI.saveDatabaseAtomic
 */
export class SQLWrapper {
  private db: any
  private SQL: any
  private isElectron = false

  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private readonly SAVE_DEBOUNCE_MS = 2000
  private readonly DB_NAME = 'database.sqlite'
  private isSaving = false
  private isDirty = false
  private pendingSave = false

  private lastInsertedRowId = 0
  private lastRowsModified = 0

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

  private triggerDebouncedSave(): void {
    if (!this.isElectron) {
      return
    }

    this.isDirty = true

    if (this.isSaving) {
      this.pendingSave = true
      console.log('[SQLWrapper] ⏳ 保存进行中，已标记待保存变更')
      return
    }

    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }

    console.log('[SQLWrapper] 🔄 触发防抖保存（2000ms 延迟）')

    this.saveTimer = setTimeout(() => {
      void this.performAtomicSave()
    }, this.SAVE_DEBOUNCE_MS)
  }

  private async performAtomicSave(): Promise<void> {
    if (this.isSaving) {
      console.log('[SQLWrapper] ⏳ 正在保存中，标记待处理保存请求...')
      this.pendingSave = true
      return
    }

    this.isSaving = true
    this.saveTimer = null
    this.pendingSave = false
    this.isDirty = false

    let saveFailed = false

    try {
      console.log('[SQLWrapper] 💾 开始导出数据库...')

      const data = this.db.export()
      if (data.byteLength === 0) {
        console.warn('[SQLWrapper] ⚠️  数据库为空，跳过保存')
        return
      }

      console.log('[SQLWrapper] 📦 数据库大小:', data.byteLength, 'bytes')

      const electronAPI = (window as any).electronAPI
      const result = await electronAPI.saveDatabaseAtomic(data, this.DB_NAME)

      if (result.success) {
        console.log('[SQLWrapper] ✅ 原子写入成功！文件:', result.filePath || this.DB_NAME)
      } else {
        console.error('[SQLWrapper] ❌ 原子写入失败:', result.error)
        saveFailed = true
      }
    } catch (error) {
      console.error('[SQLWrapper] ❌ 保存失败:', error)
      saveFailed = true
    } finally {
      const shouldSaveAgain = saveFailed || this.pendingSave || this.isDirty

      this.isSaving = false
      this.pendingSave = false

      if (shouldSaveAgain) {
        this.isDirty = true
        console.log('[SQLWrapper] 🔄 检测到待保存变更或上次保存失败，再次触发保存...')
        this.triggerDebouncedSave()
      }
    }
  }

  run(sql: string, params: any[] = []): any {
    try {
      let result
      const sqlUpper = sql.trim().toUpperCase()
      const isInsert = sqlUpper.startsWith('INSERT')
      const isUpdate = sqlUpper.startsWith('UPDATE')
      const isDelete = sqlUpper.startsWith('DELETE')

      if (params.length > 0) {
        const stmt = this.db.prepare(sql)
        const processedParams = params.map((param) => (param === undefined ? null : param))
        stmt.bind(processedParams)
        result = stmt.step()

        if (isInsert) {
          const idStmt = this.db.prepare('SELECT last_insert_rowid() as id')
          idStmt.step()
          const idObj = idStmt.getAsObject()
          this.lastInsertedRowId = idObj.id as number
          this.lastRowsModified = 1
          console.log('📽 INSERT操作完成，获取到的ID:', this.lastInsertedRowId)
          idStmt.free()
        } else if (isUpdate || isDelete) {
          this.lastRowsModified = 1
        }

        stmt.free()
      } else {
        result = this.db.run(sql)

        if (isInsert) {
          const idStmt = this.db.prepare('SELECT last_insert_rowid() as id')
          idStmt.step()
          const idObj = idStmt.getAsObject()
          this.lastInsertedRowId = idObj.id as number
          this.lastRowsModified = 1
          console.log('📽 INSERT操作完成，获取到的ID:', this.lastInsertedRowId)
          idStmt.free()
        } else if (isUpdate || isDelete) {
          this.lastRowsModified = 1
        }
      }

      if (isInsert || isUpdate || isDelete) {
        this.triggerDebouncedSave()
      }

      return result
    } catch (error) {
      console.error('SQL执行错误:', sql, params, error)
      throw error
    }
  }

  exec(sql: string): void {
    try {
      const statements = sql
        .split(';')
        .map((statement) => statement.trim())
        .filter((statement) => statement.length > 0 && !statement.startsWith('--'))

      for (const statement of statements) {
        this.db.run(statement)
      }

      this.triggerDebouncedSave()
    } catch (error) {
      console.error('SQL执行错误:', sql, error)
      throw error
    }
  }

  all(sql: string, params: any[] = []): any[] {
    try {
      const stmt = this.db.prepare(sql)
      if (params.length > 0) {
        const processedParams = params.map((param) => (param === undefined ? null : param))
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

  get(sql: string, params: any[] = []): any | null {
    try {
      const stmt = this.db.prepare(sql)
      if (params.length > 0) {
        const processedParams = params.map((param) => (param === undefined ? null : param))
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

  prepare(sql: string): any {
    return this.db.prepare(sql)
  }

  lastInsertId(): number {
    console.log('🔶 获取最后插入的ID，缓存值:', this.lastInsertedRowId)

    if (this.lastInsertedRowId > 0) {
      return this.lastInsertedRowId
    }

    try {
      const stmt = this.db.prepare('SELECT last_insert_rowid() as id')
      stmt.step()
      const idObj = stmt.getAsObject()
      const id = idObj.id as number
      stmt.free()

      console.log('🔶 从数据库查询到的ID:', id)
      return id
    } catch (error) {
      console.error('❌ 获取最后插入ID失败:', error)
      return 0
    }
  }

  changes(): number {
    return this.lastRowsModified
  }

  export(): Uint8Array {
    return this.db.export()
  }

  getRawDB(): any {
    return this.db
  }

  async saveNow(): Promise<void> {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }

    await this.performAtomicSave()
  }

  async close(): Promise<void> {
    if (this.isElectron) {
      await this.saveNow()
    }

    this.db.close()
  }
}
