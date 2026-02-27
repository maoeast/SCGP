/**
 * 数据库迁移脚本
 * 更新 report_record 表的 CHECK 约束，添加 conners-psq 和 conners-trs 类型
 */

import { getDatabase } from './init'

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

    // 步骤1: 开启事务
    db.run('BEGIN TRANSACTION')

    // 步骤2: 创建新表（带更新的约束）
    db.run(`
      CREATE TABLE report_record_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        report_type TEXT NOT NULL CHECK(report_type IN ('sm', 'weefim', 'training', 'iep', 'csirs', 'conners-psq', 'conners-trs')),
        assess_id INTEGER,
        plan_id INTEGER,
        training_record_id INTEGER,
        title TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES student(id),
        FOREIGN KEY (assess_id) REFERENCES sm_assess(id),
        FOREIGN KEY (plan_id) REFERENCES train_plan(id),
        FOREIGN KEY (training_record_id) REFERENCES training_records(id)
      )
    `)

    // 步骤3: 复制数据
    const insertResult = db.run(`
      INSERT INTO report_record_new (id, student_id, report_type, assess_id, plan_id, training_record_id, title, created_at, updated_at)
      SELECT id, student_id, report_type, assess_id, plan_id, training_record_id, title, created_at, updated_at
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

    // 步骤7: 提交事务
    db.run('COMMIT')

    console.log('[迁移] report_record 表约束更新成功！')
    console.log('[迁移] 支持的报告类型: sm, weefim, training, iep, csirs, conners-psq, conners-trs')

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

    // 检查约束是否包含 'conners-psq' 和 'conners-trs'
    return !sql.includes("'conners-psq'") || !sql.includes("'conners-trs'")
  } catch (error) {
    // 如果查询失败，保守地认为不需要迁移
    console.warn('[needsMigration] 检查约束失败，跳过迁移:', error)
    return false
  }
}
