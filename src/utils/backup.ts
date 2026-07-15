// 数据备份与恢复工具
import { getDatabase } from '@/database/init'
import { smQuestions } from '@/database/sm-questions'
import { smAgeRanges, smRawToSQTable } from '@/database/sm-norms'
import { weefimCategories, weefimQuestions } from '@/database/weefim-data'
import { encryptData, decryptData, encryptBytes, decryptBytes, md5Bytes } from './crypto'

const BACKUP_VERSION = '3.0'
const SUPPORTED_BACKUP_VERSIONS = new Set(['1.0', '2.0', BACKUP_VERSION])
const EXCLUDED_BACKUP_TABLES = new Set([
  'task_step_new',
  'train_plan_detail_new',
  'train_log_new',
  'equipment_training_records_new',
])

/**
 * 资源归档载荷（Phase 2）：托管资源文件的 zip 加密串 + 完整性元信息。
 */
export interface ResourceArchivePayload {
  version: number
  fileCount: number
  totalBytes: number
  checksum: string
  /** encryptBytes 返回的 base64 密文（zip 归档加密串） */
  payload: string
}

export interface BackupData {
  version: string
  timestamp: number
  tables: Record<string, any[]>
  metadata: {
    systemName: string
    totalRecords: number
    tableCount: number
    tableNames?: string[]
    /** 资源归档摘要（供 getBackupInfo 不解密 payload 即可展示） */
    resourceArchive?: {
      fileCount: number
      totalBytes: number
    }
  }
  /** Phase 2+：托管资源文件 zip 归档（加密串）；2.0/1.0 备份无此字段 */
  resourceArchive?: ResourceArchivePayload
}

export class BackupManager {
  private quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`
  }

  private getBackupTables(db = getDatabase()): string[] {
    const stmt = db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `)

    const tableNames: string[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject() as { name?: unknown }
      if (typeof row.name !== 'string' || row.name.length === 0) {
        continue
      }

      if (EXCLUDED_BACKUP_TABLES.has(row.name)) {
        continue
      }

      tableNames.push(row.name)
    }

    stmt.free()
    return tableNames
  }

  private getSystemName(db = getDatabase()): string {
    try {
      const stmt = db.prepare(`
        SELECT value
        FROM system_config
        WHERE key = 'system_name'
        LIMIT 1
      `)

      if (stmt.step()) {
        const row = stmt.getAsObject() as { value?: unknown }
        stmt.free()

        if (typeof row.value === 'string' && row.value.trim().length > 0) {
          return row.value
        }
      } else {
        stmt.free()
      }
    } catch {
      // ignore and fall back to default name
    }

    return 'SCGP / 星愿能力发展平台'
  }

  private getForeignKeysEnabled(db = getDatabase()): boolean {
    const stmt = db.prepare('PRAGMA foreign_keys')

    try {
      if (!stmt.step()) {
        return true
      }

      const row = stmt.getAsObject() as Record<string, unknown>
      const value = Object.values(row)[0]
      return value === 1 || value === '1'
    } finally {
      stmt.free()
    }
  }

  private getForeignKeyViolations(db = getDatabase()): string[] {
    const stmt = db.prepare('PRAGMA foreign_key_check')
    const violations: string[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>
      const values = Object.values(row)
      const tableName = typeof values[0] === 'string' ? values[0] : 'unknown_table'
      const rowId = values[1]
      const parentTable = typeof values[2] === 'string' ? values[2] : 'unknown_parent'
      violations.push(`${tableName}(rowid=${String(rowId)}) -> ${parentTable}`)
    }

    stmt.free()
    return violations
  }

  private getTableRowCount(tableName: string, db = getDatabase()): number {
    const stmt = db.prepare(`SELECT COUNT(*) AS count FROM ${this.quoteIdentifier(tableName)}`)

    try {
      if (!stmt.step()) {
        return 0
      }

      const row = stmt.getAsObject() as { count?: unknown }
      return typeof row.count === 'number' ? row.count : Number(row.count || 0)
    } finally {
      stmt.free()
    }
  }

  private ensureAssessmentReferenceData(currentTables: Set<string>, db = getDatabase()): void {
    if (currentTables.has('sm_question')) {
      for (const question of smQuestions) {
        db.run(
          `
            INSERT OR IGNORE INTO sm_question (id, dimension, age_stage, age_min, age_max, title, audio)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            question.id,
            question.dimension,
            question.age_stage,
            question.age_min,
            question.age_max,
            question.title,
            question.audio || null,
          ],
        )
      }
    }

    if (currentTables.has('sm_norm') && this.getTableRowCount('sm_norm', db) === 0) {
      for (const range of smAgeRanges) {
        db.run(
          `
            INSERT OR IGNORE INTO sm_norm (age_month, mean, sd)
            VALUES (?, ?, ?)
          `,
          [range.months, 0, 0],
        )
      }
    }

    if (currentTables.has('sm_raw_to_sq') && this.getTableRowCount('sm_raw_to_sq', db) === 0) {
      for (const table of smRawToSQTable) {
        for (const [sqScore, rawRange] of Object.entries(table.raw_ranges)) {
          if (!rawRange) {
            continue
          }

          db.run(
            `
              INSERT OR IGNORE INTO sm_raw_to_sq (raw_score, sq_score, level)
              VALUES (?, ?, ?)
            `,
            [parseInt(sqScore, 10), parseInt(sqScore, 10), rawRange],
          )
        }
      }
    }

    if (currentTables.has('weefim_category')) {
      for (const category of weefimCategories) {
        db.run(
          `
            INSERT OR IGNORE INTO weefim_category (id, name, description)
            VALUES (?, ?, ?)
          `,
          [category.id, category.name, category.description],
        )
      }
    }

    if (currentTables.has('weefim_question')) {
      for (const question of weefimQuestions) {
        db.run(
          `
            INSERT OR IGNORE INTO weefim_question (id, category_id, title, dimension)
            VALUES (?, ?, ?, ?)
          `,
          [question.id, question.category_id, question.title, question.dimension],
        )
      }
    }
  }

  private reconcileRestoredData(db = getDatabase(), restoredTables = new Set<string>()): void {
    const restoredClassChain =
      restoredTables.has('student') ||
      restoredTables.has('sys_class') ||
      restoredTables.has('student_class_history')

    if (!restoredClassChain) {
      return
    }

    // 班级模块存在触发器，恢复时会再次累加；恢复后统一按历史表重算。
    db.run(`
      UPDATE student
      SET
        current_class_id = (
          SELECT sch.class_id
          FROM student_class_history sch
          WHERE sch.student_id = student.id
            AND sch.is_current = 1
          ORDER BY sch.id DESC
          LIMIT 1
        ),
        current_class_name = (
          SELECT sch.class_name
          FROM student_class_history sch
          WHERE sch.student_id = student.id
            AND sch.is_current = 1
          ORDER BY sch.id DESC
          LIMIT 1
        )
    `)

    db.run(`
      UPDATE sys_class
      SET current_enrollment = (
        SELECT COUNT(*)
        FROM student_class_history sch
        WHERE sch.class_id = sys_class.id
          AND sch.is_current = 1
      )
    `)
  }

  // 导出数据
  async exportData(includeSystemConfig = true, includeResources = true): Promise<string> {
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
          const stmt = db.prepare(`SELECT * FROM ${this.quoteIdentifier(tableName)}`)
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

      // 打包托管资源文件（Phase 2）：失败不阻断备份，仅省略归档
      let resourceArchive: ResourceArchivePayload | undefined
      if (includeResources && window.electronAPI?.packResourceArchive) {
        try {
          const packed = await window.electronAPI.packResourceArchive()
          if (packed.success && packed.zipBytes) {
            resourceArchive = {
              version: 1,
              fileCount: packed.fileCount,
              totalBytes: packed.totalBytes,
              checksum: md5Bytes(packed.zipBytes),
              payload: encryptBytes(packed.zipBytes),
            }
          } else if (!packed.success) {
            console.warn('资源归档打包失败，备份将不含资源文件:', packed.error)
          }
        } catch (error) {
          console.warn('资源归档打包异常，备份将不含资源文件:', error)
        }
      }

      // 构建备份数据
      const backupData: BackupData = {
        version: BACKUP_VERSION,
        timestamp: Date.now(),
        tables,
        metadata: {
          systemName: this.getSystemName(db),
          totalRecords,
          tableCount: Object.keys(tables).length,
          tableNames: backupTables,
          ...(resourceArchive
            ? {
                resourceArchive: {
                  fileCount: resourceArchive.fileCount,
                  totalBytes: resourceArchive.totalBytes,
                },
              }
            : {}),
        },
        ...(resourceArchive ? { resourceArchive } : {}),
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
      if (!SUPPORTED_BACKUP_VERSIONS.has(backupData.version)) {
        throw new Error(`不支持的备份版本: ${backupData.version}`)
      }

      const db = getDatabase()
      const skipTables = options.skipSystemConfig ? ['system_config'] : []
      const restoredEntries = Object.entries(backupData.tables).filter(([tableName]) => !skipTables.includes(tableName))
      const currentTables = new Set(this.getBackupTables(db))
      const missingTables = restoredEntries
        .map(([tableName]) => tableName)
        .filter((tableName) => !currentTables.has(tableName))

      if (missingTables.length > 0) {
        throw new Error(`当前版本缺少备份中的数据表：${missingTables.join('、')}`)
      }

      const foreignKeysEnabled = this.getForeignKeysEnabled(db)

      db.run('PRAGMA foreign_keys = OFF')

      try {
        db.run('BEGIN TRANSACTION')

        if (options.overwrite) {
          for (const [tableName] of restoredEntries) {
            db.run(`DELETE FROM ${this.quoteIdentifier(tableName)}`)
          }
        }

        // 导入每个表的数据
        for (const [tableName, records] of restoredEntries) {
          if (!Array.isArray(records) || records.length === 0) {
            continue
          }

          // 获取表的列信息
          const firstRecord = records[0]
          const columns = Object.keys(firstRecord)
          if (columns.length === 0) {
            continue
          }

          // 构建插入语句
          const placeholders = columns.map(() => '?').join(', ')
          const quotedColumns = columns.map((column) => this.quoteIdentifier(column)).join(', ')
          const insertSQL = `INSERT INTO ${this.quoteIdentifier(tableName)} (${quotedColumns}) VALUES (${placeholders})`

          // 插入数据
          for (const record of records) {
            const values = columns.map((col) => record[col])
            db.run(insertSQL, values)
          }
        }

        this.reconcileRestoredData(
          db,
          new Set(restoredEntries.map(([tableName]) => tableName)),
        )
        this.ensureAssessmentReferenceData(currentTables, db)

        const violations = this.getForeignKeyViolations(db)
        if (violations.length > 0) {
          throw new Error(`恢复后外键校验失败：${violations.slice(0, 5).join('；')}`)
        }

        // 提交事务
        db.run('COMMIT')

        console.log(`成功导入 ${backupData.metadata.totalRecords} 条记录`)
      } catch (error) {
        // 回滚事务
        try {
          db.run('ROLLBACK')
        } catch {
          // ignore rollback failures
        }
        throw error
      } finally {
        db.run(`PRAGMA foreign_keys = ${foreignKeysEnabled ? 'ON' : 'OFF'}`)
      }

      // 恢复资源物理文件（Phase 2）：DB 已成功提交后执行，失败不阻断数据恢复
      if (backupData.resourceArchive?.payload) {
        await this.restoreResourceArchive(backupData.resourceArchive)
      } else if (backupData.version === '1.0' || backupData.version === '2.0') {
        console.warn(`v${backupData.version} 备份不含资源文件，恢复后图片/教具可能缺失`)
      }
    } catch (error) {
      console.error('导入数据失败:', error)
      throw error
    }
  }

  /**
   * 恢复资源归档（Phase 2）：解密 payload → unpack IPC 写回 userData/resources。
   * 解密/解包失败仅告警，不抛错（不让资源文件失败阻断 DB 数据恢复）。
   */
  private async restoreResourceArchive(archive: ResourceArchivePayload): Promise<void> {
    if (!window.electronAPI?.unpackResourceArchive) {
      console.warn('当前环境不支持资源文件恢复，跳过（数据已恢复）')
      return
    }
    try {
      const zipBytes = decryptBytes(archive.payload)
      if (!zipBytes) {
        console.warn('资源归档解密失败，跳过资源恢复（数据已恢复）')
        return
      }
      const result = await window.electronAPI.unpackResourceArchive(zipBytes)
      if (result.success) {
        console.log(`资源文件恢复：${result.restored} 个成功，${result.failed.length} 个失败`)
        if (result.failed.length > 0) {
          console.warn('资源文件恢复部分失败:', result.failed)
        }
      } else {
        console.warn('资源文件解包失败（数据已恢复）:', result.error)
      }
    } catch (error) {
      console.warn('资源文件恢复异常，不阻断数据恢复:', error)
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
