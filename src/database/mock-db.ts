// 内存数据库模拟器（临时方案）
import { getMockData, type MockRow } from './mock-data'

type SqlParams = unknown[] | undefined

interface MockStatement {
  bind(params?: unknown[]): MockStatement
  step(): boolean
  getAsObject(): MockRow | null
  free(): void
  currentRow: MockRow | null
}

export class MockDatabase {
  private data: Record<string, MockRow[]> = {}
  private lastInsertedId = 1

  // 创建表
  run(sql: string, params?: unknown[]) {
    const sqlUpper = sql.trim().toUpperCase()

    // 简单解析 SQL 语句
    if (sqlUpper.includes('CREATE TABLE')) {
      const tableName = this.extractTableName(sql)
      if (!tableName) return

      this.data[tableName] = getMockData(tableName)
      console.log('[MockDB] 创建表:', tableName, '数据量:', this.data[tableName].length)
    } else if (sqlUpper.includes('INSERT INTO')) {
      const { table, data } = this.parseInsert(sql, params)
      if (!table) return

      if (!this.data[table]) {
        this.data[table] = []
        console.log('[MockDB] 创建新表:', table)
      }
      const newId = this.getNextId(table)
      const newRecord: MockRow = { ...data, id: newId }
      this.data[table].push(newRecord)
      console.log('[MockDB] 插入记录:', table, newRecord)
      this.lastInsertedId = newId
    } else if (sqlUpper.includes('UPDATE')) {
      // 处理 UPDATE
      this.parseUpdate(sql, params)
    } else if (sqlUpper.includes('DELETE')) {
      // 处理 DELETE
      this.parseDelete(sql, params)
    } else if (sqlUpper.startsWith('SELECT')) {
      // SELECT 通过 run 调用时忽略（应该用 all 或 get）
      console.log('[MockDB] SELECT 语句应该使用 all() 或 get() 方法')
    }
  }

  // 准备查询语句
  prepare(sql: string): MockStatement {
    let queryData: MockRow[] = []
    let currentIndex = 0

    const statement: MockStatement = {
      currentRow: null,
      bind: (params?: unknown[]) => {
        // 处理参数化查询
        queryData = this.parseSelect(sql, params)
        currentIndex = 0
        statement.currentRow = null
        return statement
      },
      step: () => {
        if (currentIndex < queryData.length) {
          statement.currentRow = queryData[currentIndex] || null
          currentIndex += 1
          return true
        }
        statement.currentRow = null
        return false
      },
      getAsObject: () => statement.currentRow,
      free: () => {},
    }

    return statement
  }

  // 执行查询并返回数组（SQL.js 兼容）
  all(sql: string, params?: unknown[]): MockRow[] {
    return this.parseSelect(sql, params)
  }

  // 执行查询并返回第一行（SQL.js 兼容）
  get(sql: string, params?: unknown[]): MockRow | null {
    const results = this.parseSelect(sql, params)
    return results.length > 0 ? results[0] || null : null
  }

  // 执行查询并返回数组
  exec(sql: string) {
    // 执行 SQL，这里简化处理
    console.log('Executing SQL:', sql)
  }

  // 导出数据库
  export() {
    return new Uint8Array()
  }

  // 关闭数据库
  close() {
    // 清理资源
  }

  // 获取最后修改的行数
  changes() {
    return 1
  }

  // 获取最后插入的ID
  lastInsertId() {
    return this.lastInsertedId
  }

  // 获取最后修改的行数（旧方法兼容）
  getRowsModified() {
    return this.changes()
  }

  // 解析 SELECT 语句
  private parseSelect(sql: string, params?: unknown[]): MockRow[] {
    const tableMatch = sql.match(/FROM\s+(\w+)/i)
    const tableName = tableMatch?.[1]
    if (!tableName) return []

    let data = this.data[tableName] || []

    // 处理 WHERE 条件
    if (sql.includes('WHERE') && params) {
      const conditionsClause = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i)?.[1]
      if (conditionsClause) {
        const conditions = conditionsClause.split('AND')
        data = data.filter((row) => {
          return conditions.every((cond, index) => {
            const currentParam = params[index]

            // 简单的 LIKE 条件处理
            if (cond.includes('LIKE') && currentParam !== undefined) {
              const field = cond.match(/(\w+)\s+LIKE\s+\?/i)?.[1]
              if (!field) return false

              const fieldValue = row[field]
              if (fieldValue === undefined || fieldValue === null) return false

              return String(fieldValue)
                .toLowerCase()
                .includes(String(currentParam).toLowerCase().replace(/%/g, ''))
            }

            // 简单的等于条件处理
            if (currentParam !== undefined) {
              const field = cond.match(/(\w+)\s*=\s*\?/i)?.[1]
              if (!field) return false
              return row[field] === currentParam
            }

            return false
          })
        })
      }
    }

    // 处理字段选择
    const fieldsClause = sql.match(/SELECT\s+(.+?)\s+FROM/i)?.[1]
    if (fieldsClause && fieldsClause !== '*') {
      const fields = fieldsClause.split(',').map((field) => field.trim())
      data = data.map((row) => {
        const filteredRow: MockRow = {}
        fields.forEach((field) => {
          if (Object.prototype.hasOwnProperty.call(row, field)) {
            filteredRow[field] = row[field]
          }
        })
        return filteredRow
      })
    }

    return data
  }

  // 解析 UPDATE 语句
  private parseUpdate(sql: string, params?: unknown[]) {
    const tableName = sql.match(/UPDATE\s+(\w+)/i)?.[1]
    if (!tableName || !params) return

    const data = this.data[tableName] || []

    // 提取 SET 和 WHERE 部分
    const setClause = sql.match(/SET\s+(.+?)\s+WHERE/i)?.[1]
    const hasWhereClause = /WHERE\s+(.+)/i.test(sql)

    if (!hasWhereClause) return

    // 简化处理：假设 WHERE 是 id = ?
    const idIndex = params.length - 1
    const id = params[idIndex]
    const rowIndex = data.findIndex((row) => row.id === id)

    if (rowIndex === -1 || !setClause) return

    const targetRow = data[rowIndex]
    if (!targetRow) return

    const setFields = setClause.split(',').map((field) => field.trim())
    setFields.forEach((field, index) => {
      const fieldName = field.split('=')[0]?.trim()
      if (!fieldName) return
      targetRow[fieldName] = params[index]
    })
  }

  // 辅助方法
  private extractTableName(sql: string): string {
    return sql.match(/CREATE TABLE.*?IF NOT EXISTS\s+(\w+)/i)?.[1] || ''
  }

  private parseInsert(sql: string, params?: unknown[]): { table: string; data: MockRow } {
    const table = sql.match(/INSERT INTO\s+(\w+)/i)?.[1] || ''
    const data: MockRow = {}

    if (params) {
      const fieldsClause = sql.match(/INSERT INTO \w+\s*\((.*?)\)\s*VALUES/i)?.[1]
      if (fieldsClause) {
        const fields = fieldsClause.split(',').map((field) => field.trim())
        fields.forEach((field, index) => {
          data[field] = params[index]
        })
      }
    }

    return { table, data }
  }

  private getNextId(table: string): number {
    const tableData = this.data[table] || []
    return tableData.length > 0 ? Math.max(...tableData.map((row) => row.id || 0)) + 1 : 1
  }

  // 解析 DELETE 语句
  private parseDelete(sql: string, params?: unknown[]) {
    const tableName = sql.match(/DELETE FROM\s+(\w+)/i)?.[1]
    if (!tableName) return

    const data = this.data[tableName] || []

    // 处理 WHERE 条件
    if (sql.includes('WHERE') && params) {
      const conditionsClause = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i)?.[1]
      if (conditionsClause) {
        const conditions = conditionsClause.split('AND')
        // 简化处理：假设 WHERE 是 id = ?
        if (conditions.length === 1 && params.length === 1) {
          const field = conditions[0]?.match(/(\w+)\s*=\s*\?/i)?.[1]
          if (field === 'id') {
            const idToDelete = params[0]
            const index = data.findIndex((row) => row.id === idToDelete)
            if (index !== -1) {
              data.splice(index, 1)
              console.log('[MockDB] 删除记录:', tableName, 'id:', idToDelete)
            }
          }
        }
      }
    } else {
      // 没有 WHERE 条件，清空整个表
      this.data[tableName] = []
      console.log('[MockDB] 清空表:', tableName)
    }
  }
}

// 创建默认的 mock 数据（模拟数据已在 getMockData 中定义）
export function createMockData(db: MockDatabase) {
  const currentData = (db as unknown as { data: Record<string, MockRow[]> }).data

  // 初始化量表数据为空数组
  currentData.sm_question = []
  currentData.sm_norm = []
  currentData.sm_raw_to_sq = []
  currentData.weefim_category = []
  currentData.weefim_question = []

  console.log('Mock 数据已初始化，量表数据将在首次使用时动态加载')
}

export function createMockStatement(data: MockRow[]): MockStatement {
  let index = 0

  const statement: MockStatement = {
    currentRow: null,
    bind: () => statement,
    step: () => {
      if (index < data.length) {
        statement.currentRow = data[index] || null
        index += 1
        return true
      }
      statement.currentRow = null
      return false
    },
    getAsObject: () => statement.currentRow,
    free: () => {},
  }

  return statement
}
