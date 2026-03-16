import { getDatabase } from '../init'

function getRawDB(): any {
  const db = getDatabase()
  if (db && typeof db.getRawDB === 'function') {
    return db.getRawDB()
  }
  return db
}

function getTableSql(db: any, tableName: string): string {
  try {
    const result = db.exec(`
      SELECT sql FROM sqlite_master
      WHERE type='table' AND name='${tableName}'
    `)
    return (result?.[0]?.values?.[0]?.[0] as string) || ''
  } catch {
    return ''
  }
}

function getTableColumns(db: any, tableName: string): string[] {
  try {
    const result = db.exec(`PRAGMA table_info(${tableName})`)
    return (result?.[0]?.values || []).map((row: any[]) => row[1] as string)
  } catch {
    return []
  }
}

function hasColumn(db: any, tableName: string, columnName: string): boolean {
  return getTableColumns(db, tableName).includes(columnName)
}

function needsTrainingRecordsMigration(db: any): boolean {
  const tableSql = getTableSql(db, 'training_records')
  if (!tableSql) return false

  const requiredColumns = ['resource_id', 'resource_type', 'session_type']
  const hasAllColumns = requiredColumns.every((column) => hasColumn(db, 'training_records', column))
  const hasLegacyTaskConstraint = /CHECK\s*\(\s*task_id\s+IN\s*\(/i.test(tableSql)

  return hasLegacyTaskConstraint || !hasAllColumns
}

function needsReportRecordMigration(db: any): boolean {
  const tableSql = getTableSql(db, 'report_record')
  if (!tableSql) return false

  return !tableSql.includes("'emotional'")
}

function buildCopyExpression(columns: Set<string>, columnName: string, fallbackSql: string): string {
  return columns.has(columnName) ? columnName : `${fallbackSql} AS ${columnName}`
}

function migrateTrainingRecords(db: any): number {
  const columns = new Set(getTableColumns(db, 'training_records'))

  db.run(`
    CREATE TABLE training_records_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      task_id INTEGER,
      resource_id INTEGER,
      resource_type TEXT,
      session_type TEXT,
      timestamp INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      accuracy_rate REAL NOT NULL CHECK(accuracy_rate BETWEEN 0 AND 1),
      avg_response_time INTEGER NOT NULL,
      raw_data TEXT NOT NULL,
      class_id INTEGER,
      class_name TEXT,
      module_code TEXT DEFAULT 'sensory',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student(id)
    )
  `)

  const insertResult = db.run(`
    INSERT INTO training_records_new (
      id,
      student_id,
      task_id,
      resource_id,
      resource_type,
      session_type,
      timestamp,
      duration,
      accuracy_rate,
      avg_response_time,
      raw_data,
      class_id,
      class_name,
      module_code,
      created_at
    )
    SELECT
      ${buildCopyExpression(columns, 'id', 'NULL')},
      ${buildCopyExpression(columns, 'student_id', 'NULL')},
      ${buildCopyExpression(columns, 'task_id', 'NULL')},
      ${buildCopyExpression(columns, 'resource_id', 'NULL')},
      ${buildCopyExpression(columns, 'resource_type', "CASE WHEN task_id IS NOT NULL THEN 'game' ELSE NULL END")},
      ${buildCopyExpression(columns, 'session_type', "CASE WHEN task_id IS NOT NULL THEN 'game_session' ELSE NULL END")},
      ${buildCopyExpression(columns, 'timestamp', '0')},
      ${buildCopyExpression(columns, 'duration', '0')},
      ${buildCopyExpression(columns, 'accuracy_rate', '0')},
      ${buildCopyExpression(columns, 'avg_response_time', '0')},
      ${buildCopyExpression(columns, 'raw_data', "'{}'")},
      ${buildCopyExpression(columns, 'class_id', 'NULL')},
      ${buildCopyExpression(columns, 'class_name', 'NULL')},
      ${buildCopyExpression(columns, 'module_code', "'sensory'")},
      ${buildCopyExpression(columns, 'created_at', 'CURRENT_TIMESTAMP')}
    FROM training_records
  `)

  db.run('DROP TABLE training_records')
  db.run('ALTER TABLE training_records_new RENAME TO training_records')

  db.run('CREATE INDEX IF NOT EXISTS idx_training_records_student_id ON training_records(student_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_training_records_task_id ON training_records(task_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_training_records_timestamp ON training_records(timestamp)')
  db.run('CREATE INDEX IF NOT EXISTS idx_training_records_resource_id ON training_records(resource_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_training_records_module_class ON training_records(module_code, class_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_training_records_module_date ON training_records(module_code, created_at)')

  return insertResult?.changes || 0
}

function migrateReportRecord(db: any): number {
  const columns = new Set(getTableColumns(db, 'report_record'))

  db.run(`
    CREATE TABLE report_record_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      report_type TEXT NOT NULL CHECK(report_type IN ('sm', 'weefim', 'training', 'iep', 'csirs', 'conners-psq', 'conners-trs', 'sdq', 'srs2', 'cbcl', 'emotional')),
      assess_id INTEGER,
      plan_id INTEGER,
      training_record_id INTEGER,
      title TEXT NOT NULL,
      class_id INTEGER,
      class_name TEXT,
      module_code TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student(id),
      FOREIGN KEY (assess_id) REFERENCES sm_assess(id),
      FOREIGN KEY (plan_id) REFERENCES train_plan(id),
      FOREIGN KEY (training_record_id) REFERENCES training_records(id)
    )
  `)

  const insertResult = db.run(`
    INSERT INTO report_record_new (
      id,
      student_id,
      report_type,
      assess_id,
      plan_id,
      training_record_id,
      title,
      class_id,
      class_name,
      module_code,
      created_at,
      updated_at
    )
    SELECT
      ${buildCopyExpression(columns, 'id', 'NULL')},
      ${buildCopyExpression(columns, 'student_id', 'NULL')},
      ${buildCopyExpression(columns, 'report_type', "'training'")},
      ${buildCopyExpression(columns, 'assess_id', 'NULL')},
      ${buildCopyExpression(columns, 'plan_id', 'NULL')},
      ${buildCopyExpression(columns, 'training_record_id', 'NULL')},
      ${buildCopyExpression(columns, 'title', "''")},
      ${buildCopyExpression(columns, 'class_id', 'NULL')},
      ${buildCopyExpression(columns, 'class_name', 'NULL')},
      ${buildCopyExpression(columns, 'module_code', 'NULL')},
      ${buildCopyExpression(columns, 'created_at', 'CURRENT_TIMESTAMP')},
      ${buildCopyExpression(columns, 'updated_at', 'CURRENT_TIMESTAMP')}
    FROM report_record
  `)

  db.run('DROP TABLE report_record')
  db.run('ALTER TABLE report_record_new RENAME TO report_record')

  db.run('CREATE INDEX IF NOT EXISTS idx_report_student ON report_record(student_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_report_type ON report_record(report_type)')
  db.run('CREATE INDEX IF NOT EXISTS idx_report_created ON report_record(created_at DESC)')
  db.run('CREATE INDEX IF NOT EXISTS idx_report_record_module_class ON report_record(module_code, class_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_report_record_module_date ON report_record(module_code, created_at)')

  return insertResult?.changes || 0
}

export function needsEmotionalFoundationMigration(): boolean {
  const db = getRawDB()
  if (!db) return false

  return needsTrainingRecordsMigration(db) || needsReportRecordMigration(db)
}

export async function migrateEmotionalFoundation(): Promise<{
  success: boolean
  message: string
  changes?: {
    trainingRecordsRebuilt: number
    reportRecordsRebuilt: number
  }
}> {
  const db = getRawDB()
  if (!db) {
    return {
      success: false,
      message: '数据库未初始化'
    }
  }

  let trainingRecordsRebuilt = 0
  let reportRecordsRebuilt = 0

  try {
    db.run('PRAGMA foreign_keys = OFF')
    db.run('BEGIN TRANSACTION')

    if (needsTrainingRecordsMigration(db)) {
      trainingRecordsRebuilt = migrateTrainingRecords(db)
    }

    if (needsReportRecordMigration(db)) {
      reportRecordsRebuilt = migrateReportRecord(db)
    }

    db.run('COMMIT')
    db.run('PRAGMA foreign_keys = ON')

    return {
      success: true,
      message: '情绪模块基础迁移完成',
      changes: {
        trainingRecordsRebuilt,
        reportRecordsRebuilt
      }
    }
  } catch (error) {
    try {
      db.run('ROLLBACK')
    } catch {
      // ignore rollback errors
    }
    try {
      db.run('PRAGMA foreign_keys = ON')
    } catch {
      // ignore restore errors
    }

    return {
      success: false,
      message: `情绪模块基础迁移失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}
