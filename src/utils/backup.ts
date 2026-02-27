// 数据备份与恢复工具
import { getDatabase } from '@/database/init'
import { encryptData, decryptData } from './crypto'

export interface BackupData {
  version: string
  timestamp: number
  tables: Record<string, any[]>
  metadata: {
    systemName: string
    totalRecords: number
    tableCount: number
  }
}

export class BackupManager {
  // 获取所有需要备份的表
  private getBackupTables(): string[] {
    return [
      'user',
      'student',
      'sm_age_stage',
      'sm_question',
      'sm_norm',
      'sm_raw_to_sq',
      'sm_assess',
      'sm_assess_detail',
      'weefim_category',
      'weefim_question',
      'weefim_assess',
      'weefim_assess_detail',
      'task_category',
      'task',
      'task_level',
      'task_step',
      'train_plan',
      'train_plan_detail',
      'train_log',
      'resource_meta',
      'teacher_fav',
      'system_config',
      'activation',
    ]
  }

  // 导出数据
  async exportData(includeSystemConfig = true): Promise<string> {
    try {
      const db = getDatabase()
      const tables: Record<string, any[]> = {}
      const backupTables = includeSystemConfig
        ? this.getBackupTables()
        : this.getBackupTables().filter((t) => t !== 'system_config')

      let totalRecords = 0

      // 导出每个表的数据
      for (const tableName of backupTables) {
        try {
          const stmt = db.prepare(`SELECT * FROM ${tableName}`)
          const tableData: any[] = []

          while (stmt.step()) {
            tableData.push(stmt.getAsObject())
          }

          stmt.free()
          tables[tableName] = tableData
          totalRecords += tableData.length
        } catch (error) {
          console.warn(`导出表 ${tableName} 失败:`, error)
          tables[tableName] = []
        }
      }

      // 构建备份数据
      const backupData: BackupData = {
        version: '1.0',
        timestamp: Date.now(),
        tables,
        metadata: {
          systemName: '感官综合发展系统',
          totalRecords,
          tableCount: Object.keys(tables).length,
        },
      }

      // 加密备份数据
      const jsonStr = JSON.stringify(backupData)
      return encryptData(jsonStr)
    } catch (error) {
      console.error('导出数据失败:', error)
      throw error
    }
  }

  // 导入数据
  async importData(
    encryptedData: string,
    options: {
      overwrite?: boolean
      skipSystemConfig?: boolean
    } = {},
  ): Promise<void> {
    try {
      // 解密数据
      const jsonStr = decryptData(encryptedData)
      if (!jsonStr) {
        throw new Error('备份文件格式错误或密码不正确')
      }

      const backupData: BackupData = JSON.parse(jsonStr)

      // 验证版本兼容性
      if (backupData.version !== '1.0') {
        throw new Error(`不支持的备份版本: ${backupData.version}`)
      }

      const db = getDatabase()
      const skipTables = options.skipSystemConfig ? ['system_config'] : []

      // 开始事务
      db.run('BEGIN TRANSACTION')

      try {
        // 导入每个表的数据
        for (const [tableName, records] of Object.entries(backupData.tables)) {
          if (skipTables.includes(tableName)) {
            continue
          }

          if (records.length === 0) {
            continue
          }

          // 如果不覆盖，先清空表
          if (options.overwrite) {
            db.run(`DELETE FROM ${tableName}`)
          }

          // 获取表的列信息
          const firstRecord = records[0]
          const columns = Object.keys(firstRecord)

          // 构建插入语句
          const placeholders = columns.map(() => '?').join(', ')
          const insertSQL = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`

          // 插入数据
          for (const record of records) {
            const values = columns.map((col) => record[col])
            db.run(insertSQL, values)
          }
        }

        // 提交事务
        db.run('COMMIT')

        console.log(`成功导入 ${backupData.metadata.totalRecords} 条记录`)
      } catch (error) {
        // 回滚事务
        db.run('ROLLBACK')
        throw error
      }
    } catch (error) {
      console.error('导入数据失败:', error)
      throw error
    }
  }

  // 下载备份文件
  async downloadBackup(filename?: string): Promise<void> {
    try {
      const encryptedData = await this.exportData()

      // 创建 Blob
      const blob = new Blob([encryptedData], { type: 'application/json' })

      // 创建下载链接
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `backup_${new Date().toISOString().split('T')[0]}.dat`

      // 触发下载
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // 清理 URL
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下载备份失败:', error)
      throw error
    }
  }

  // 从文件加载备份
  async loadBackupFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          resolve(content)
        } catch (error) {
          reject(new Error('读取备份文件失败'))
        }
      }

      reader.onerror = () => {
        reject(new Error('文件读取错误'))
      }

      reader.readAsText(file)
    })
  }

  // 获取备份信息（不解密数据）
  getBackupInfo(encryptedData: string): BackupData['metadata'] | null {
    try {
      const jsonStr = decryptData(encryptedData)
      if (!jsonStr) {
        return null
      }

      const backupData: BackupData = JSON.parse(jsonStr)
      return backupData.metadata
    } catch (error) {
      return null
    }
  }
}

// 导出单例
export const backupManager = new BackupManager()
