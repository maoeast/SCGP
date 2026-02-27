// 内存数据库模拟器（临时方案）
import { getMockData, findMockData, generateNewId } from './mock-data';

export class MockDatabase {
  private data: Record<string, any[]> = {};

  // 创建表
  run(sql: string, params?: any[]) {
    const sqlUpper = sql.trim().toUpperCase();

    // 简单解析 SQL 语句
    if (sqlUpper.includes('CREATE TABLE')) {
      const tableName = this.extractTableName(sql);
      this.data[tableName] = getMockData(tableName);
      console.log('[MockDB] 创建表:', tableName, '数据量:', this.data[tableName].length);
    } else if (sqlUpper.includes('INSERT INTO')) {
      const { table, data } = this.parseInsert(sql, params);
      if (!this.data[table]) {
        this.data[table] = [];
        console.log('[MockDB] 创建新表:', table);
      }
      const newId = this.getNextId(table);
      const newRecord = { ...data, id: newId };
      this.data[table].push(newRecord);
      console.log('[MockDB] 插入记录:', table, newRecord);
      // 保存最后插入的 ID
      (this as any)._lastInsertId = newId;
    } else if (sqlUpper.includes('UPDATE')) {
      // 处理 UPDATE
      this.parseUpdate(sql, params);
    } else if (sqlUpper.includes('DELETE')) {
      // 处理 DELETE
      this.parseDelete(sql, params);
    } else if (sqlUpper.startsWith('SELECT')) {
      // SELECT 通过 run 调用时忽略（应该用 all 或 get）
      console.log('[MockDB] SELECT 语句应该使用 all() 或 get() 方法');
    }
  }

  // 准备查询语句
  prepare(sql: string) {
    const self = this;
    let queryData: any[] = [];
    let currentIndex = 0;

    return {
      bind: (params?: any[]) => {
        // 处理参数化查询
        queryData = self.parseSelect(sql, params);
        currentIndex = 0;
        return this;
      },
      step: () => {
        if (currentIndex < queryData.length) {
          this.currentRow = queryData[currentIndex];
          currentIndex++;
          return true;
        }
        return false;
      },
      getAsObject: () => {
        return this.currentRow;
      },
      free: () => {},
      currentRow: null as any,
    };
  }

  // 执行查询并返回数组（SQL.js 兼容）
  all(sql: string, params?: any[]): any[] {
    return this.parseSelect(sql, params);
  }

  // 执行查询并返回第一行（SQL.js 兼容）
  get(sql: string, params?: any[]): any | null {
    const results = this.parseSelect(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  // 执行查询并返回数组
  exec(sql: string) {
    // 执行 SQL，这里简化处理
    console.log('Executing SQL:', sql);
  }

  // 导出数据库
  export() {
    return new Uint8Array();
  }

  // 关闭数据库
  close() {
    // 清理资源
  }

  // 获取最后修改的行数
  changes() {
    return 1;
  }

  // 获取最后插入的ID
  lastInsertId() {
    return (this as any)._lastInsertId || 1;
  }

  // 获取最后修改的行数（旧方法兼容）
  getRowsModified() {
    return this.changes();
  }

  // 解析 SELECT 语句
  private parseSelect(sql: string, params?: any[]): any[] {
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (!tableMatch) return [];

    const tableName = tableMatch[1];
    let data = this.data[tableName] || [];

    // 处理 WHERE 条件
    if (sql.includes('WHERE') && params) {
      const conditionsMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
      if (conditionsMatch) {
        const conditions = conditionsMatch[1].split('AND');
        data = data.filter(row => {
          return conditions.every((cond, index) => {
            // 简单的LIKE条件处理
            if (cond.includes('LIKE') && params[index]) {
              const value = params[index];
              const fieldMatch = cond.match(/(\w+)\s+LIKE\s+\?/i);
              if (fieldMatch) {
                const field = fieldMatch[1];
                if (row[field]) {
                  return row[field].toLowerCase().includes(value.toLowerCase().replace(/%/g, ''));
                }
              }
            }
            // 简单的等于条件处理
            else if (params[index] !== undefined) {
              const fieldMatch = cond.match(/(\w+)\s*=\s*\?/i);
              if (fieldMatch) {
                const field = fieldMatch[1];
                return row[field] === params[index];
              }
            }
            return false;
          });
        });
      }
    }

    // 处理字段选择
    const fieldsMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i);
    if (fieldsMatch && fieldsMatch[1] !== '*') {
      const fields = fieldsMatch[1].split(',').map(f => f.trim());
      data = data.map(row => {
        const filteredRow: any = {};
        fields.forEach(field => {
          if (row.hasOwnProperty(field)) {
            filteredRow[field] = row[field];
          }
        });
        return filteredRow;
      });
    }

    return data;
  }

  // 解析 UPDATE 语句
  private parseUpdate(sql: string, params?: any[]) {
    const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
    if (!tableMatch || !params) return;

    const tableName = tableMatch[1];
    const data = this.data[tableName] || [];

    // 提取 SET 和 WHERE 部分
    const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
    const whereMatch = sql.match(/WHERE\s+(.+)/i);

    if (whereMatch) {
      // 简化处理：假设 WHERE 是 id = ?
      const idIndex = params.length - 1;
      const id = params[idIndex];
      const rowIndex = data.findIndex(row => row.id === id);

      if (rowIndex !== -1 && setMatch) {
        // 更新数据
        // 这里简化处理，实际应该解析 SET 子句
        const setFields = setMatch[1].split(',').map(f => f.trim());
        setFields.forEach((field, index) => {
          const [fieldName] = field.split('=');
          data[rowIndex][fieldName.trim()] = params[index];
        });
      }
    }
  }

  // 辅助方法
  private extractTableName(sql: string): string {
    const match = sql.match(/CREATE TABLE.*?IF NOT EXISTS\s+(\w+)/i);
    return match ? match[1] : '';
  }

  private parseInsert(sql: string, params?: any[]) {
    const tableMatch = sql.match(/INSERT INTO\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : '';

    // 简化处理 - 假设 INSERT 有具体的值
    let data: any = {};

    if (params) {
      const fieldsMatch = sql.match(/INSERT INTO \w+\s*\((.*?)\)\s*VALUES/i);
      if (fieldsMatch) {
        const fields = fieldsMatch[1].split(',').map(f => f.trim());
        fields.forEach((field, index) => {
          data[field] = params[index];
        });
      }
    }

    return { table, data };
  }

  private getNextId(table: string): number {
    const tableData = this.data[table] || [];
    return tableData.length > 0 ? Math.max(...tableData.map((row: any) => row.id || 0)) + 1 : 1;
  }

  // 解析 DELETE 语句
  private parseDelete(sql: string, params?: any[]) {
    const tableMatch = sql.match(/DELETE FROM\s+(\w+)/i);
    if (!tableMatch) return;

    const tableName = tableMatch[1];
    const data = this.data[tableName] || [];

    // 处理 WHERE 条件
    if (sql.includes('WHERE') && params) {
      const conditionsMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
      if (conditionsMatch) {
        const conditions = conditionsMatch[1].split('AND');
        // 简化处理：假设 WHERE 是 id = ?
        if (conditions.length === 1 && params.length === 1) {
          const fieldMatch = conditions[0].match(/(\w+)\s*=\s*\?/i);
          if (fieldMatch && fieldMatch[1] === 'id') {
            const idToDelete = params[0];
            const index = data.findIndex((row: any) => row.id === idToDelete);
            if (index !== -1) {
              data.splice(index, 1);
              console.log('[MockDB] 删除记录:', tableName, 'id:', idToDelete);
            }
          }
        }
      }
    } else {
      // 没有 WHERE 条件，清空整个表
      this.data[tableName] = [];
      console.log('[MockDB] 清空表:', tableName);
    }
  }
}

// 创建默认的 mock 数据（模拟数据已在 getMockData 中定义）
export function createMockData(db: MockDatabase) {
  // 获取当前数据
  const currentData = (db as any).data;

  // 初始化量表数据为空数组
  currentData.sm_question = [];
  currentData.sm_norm = [];
  currentData.sm_raw_to_sq = [];
  currentData.weefim_category = [];
  currentData.weefim_question = [];

  console.log('Mock 数据已初始化，量表数据将在首次使用时动态加载');
}

export function createMockStatement(data: any[]) {
  let index = 0;
  return {
    bind: () => {},
    step: () => {
      if (index < data.length) {
        this.currentRow = data[index];
        index++;
        return true;
      }
      return false;
    },
    getAsObject: () => this.currentRow,
    free: () => {},
    currentRow: null as any
  };
}