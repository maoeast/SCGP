/**
 * 数据库迁移脚本
 * 更新 report_record 表的 CHECK 约束，并移除错误的 assess_id -> sm_assess 外键
 */

import { getDatabase } from './init'
import { captureDependentViews, dropViews, restoreViews } from './migration/migration-view-utils'

function getTableColumns(db: any, tableName: string): string[] {
  try {
    const result = db.exec(`PRAGMA table_info(${tableName})`)
    return (result?.[0]?.values || []).map((row: any[]) => row[1] as string)
  } catch {
    return []
  }
}

function buildCopyExpression(columns: Set<string>, columnName: string, fallbackSql: string): string {
  return columns.has(columnName) ? columnName : `${fallbackSql} AS ${columnName}`
}

/**
 * 迁移 report_record 表的约束
 */
export async function migrateReportRecordConstraints(): Promise<{ success: boolean; message: string }> {
  // 获取原始 SQL.js Database 对象，绕过 SQLWrapper 的防抖保存
  const wrapper = getDatabase()
  const db = wrapper.getRawDB()

  try {
    // 先检查 report_record 表是否存在
    const tableCheck = db.exec(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='report_record'
    `)

    if (!tableCheck || tableCheck.length === 0 || tableCheck[0].values.length === 0) {
      console.log('[迁移] report_record 表不存在，跳过迁移（全新数据库）')
      return {
        success: true,
        message: 'report_record 表不存在，无需迁移（全新数据库）'
      }
    }

    console.log('[迁移] 开始更新 report_record 表约束...')
    const columns = new Set(getTableColumns(db, 'report_record'))

    // 步骤1: 开启事务
    db.run('BEGIN TRANSACTION')

    // 删除所有依赖 report_record / training_records 的视图，并在迁移完成后按原 SQL 恢复。
    const dependentViews = captureDependentViews(db, ['report_record', 'training_records'])
    if (dependentViews.length > 0) {
      dropViews(db, dependentViews)
      console.log('[迁移] 已删除依赖视图:', dependentViews.map((view) => view.name).join(', '))
    }

    // 步骤2: 创建新表（带更新的约束）
    db.run(`
      CREATE TABLE report_record_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        report_type TEXT NOT NULL CHECK(report_type IN ('sm', 'weefim', 'training', 'iep', 'csirs', 'conners-psq', 'conners-trs', 'sdq', 'srs2', 'cbcl', 'emotional', 'fine_motor', 'cnbsr2016', 'gmfm_88', 'tgmd_3', 'brief', 'crt', 'cognitive_self')),
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
        FOREIGN KEY (plan_id) REFERENCES train_plan(id),
        FOREIGN KEY (training_record_id) REFERENCES training_records(id)
      )
    `)

    // 步骤3: 复制数据
    const insertResult = db.run(`
      INSERT INTO report_record_new (
        id, student_id, report_type, assess_id, plan_id, training_record_id,
        title, class_id, class_name, module_code, created_at, updated_at
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

    const copiedRows = insertResult.changes
    console.log(`[迁移] 已复制 ${copiedRows} 条记录`)

    // 步骤4: 删除旧表
    db.run('DROP TABLE report_record')

    // 步骤5: 重命名新表
    db.run('ALTER TABLE report_record_new RENAME TO report_record')

    // 步骤6: 重建索引
    db.run('CREATE INDEX IF NOT EXISTS idx_report_student ON report_record(student_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_report_type ON report_record(report_type)')
    db.run('CREATE INDEX IF NOT EXISTS idx_report_created ON report_record(created_at DESC)')
    db.run('CREATE INDEX IF NOT EXISTS idx_report_record_module_class ON report_record(module_code, class_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_report_record_module_date ON report_record(module_code, created_at)')

    // 步骤7: 恢复依赖视图
    if (dependentViews.length > 0) {
      restoreViews(db, dependentViews)
      console.log('[迁移] 已恢复依赖视图:', dependentViews.map((view) => view.name).join(', '))
    }

    // 步骤8: 提交事务
    db.run('COMMIT')

    console.log('[迁移] report_record 表约束更新成功！')
    console.log('[迁移] 支持的报告类型: sm, weefim, training, iep, csirs, conners-psq, conners-trs, sdq, srs2, cbcl, emotional, fine_motor, cnbsr2016, gmfm_88, tgmd_3, brief, crt, cognitive_self')

    return {
      success: true,
      message: `约束更新成功！已迁移 ${copiedRows} 条记录。`
    }
  } catch (error) {
    // 回滚事务（只在事务激活时回滚）
    try {
      db.run('ROLLBACK')
    } catch (rollbackError) {
      // 忽略回滚错误（可能是事务已结束）
    }
    console.error('[迁移] 更新约束失败:', error)
    return {
      success: false,
      message: `迁移失败: ${(error as Error).message}`
    }
  }
}

/**
 * 检查是否需要迁移
 */
export function needsMigration(): boolean {
  // 获取原始 SQL.js Database 对象
  const wrapper = getDatabase()
  const db = wrapper.getRawDB()

  try {
    // 首先检查表是否存在
    const tableCheck = db.exec(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='report_record'
    `)

    if (!tableCheck || tableCheck.length === 0 || tableCheck[0].values.length === 0) {
      // 表不存在，不需要迁移（全新数据库会在 schema 中直接创建正确的表）
      console.log('[needsMigration] report_record 表不存在，跳过迁移')
      return false
    }

    // 获取表的 CREATE 语句
    const results = db.exec(`
      SELECT sql FROM sqlite_master
      WHERE type='table' AND name='report_record'
    `)

    if (!results || results.length === 0) {
      return false
    }

    // results[0].values 是二维数组，取第一行第一列
    const sql = results[0].values[0][0] as string

    // 检查约束是否包含当前所需的评估报告类型，并且不再保留错误的 assess_id 外键。
    return !sql.includes("'conners-psq'")
      || !sql.includes("'conners-trs'")
      || !sql.includes("'sdq'")
      || !sql.includes("'srs2'")
      || !sql.includes("'cbcl'")
      || !sql.includes("'emotional'")
      || !sql.includes("'fine_motor'")
      || !sql.includes("'cnbsr2016'")
      || !sql.includes("'gmfm_88'")
      || !sql.includes("'tgmd_3'")
      || !sql.includes("'brief'")
      || !sql.includes("'crt'")
      || !sql.includes("'cognitive_self'")
      || sql.includes('FOREIGN KEY (assess_id) REFERENCES sm_assess(id)')
  } catch (error) {
    // 如果查询失败，保守地认为不需要迁移
    console.warn('[needsMigration] 检查约束失败，跳过迁移:', error)
    return false
  }
}
