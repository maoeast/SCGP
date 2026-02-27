/**
 * 模块化统计支持迁移脚本
 *
 * Phase: 通用统计功能实现
 * 方案: 方案 B - 扩展现有表
 *
 * 功能:
 * 1. 为所有训练/评估记录表添加 module_code 字段
 * 2. 为现有记录设置默认 module_code 值
 * 3. 创建统一统计视图 v_class_statistics_unified
 * 4. 创建索引优化查询性能
 */

import { getDatabase } from '../init'

/**
 * 获取原始数据库对象（绕过 SQLWrapper）
 */
function getRawDB(): any {
  const db = getDatabase()
  // 如果是 SQLWrapper 实例，调用其 getRawDB 方法
  if (db && typeof db.getRawDB === 'function') {
    return db.getRawDB()
  }
  // 否则直接返回（可能是原生数据库对象）
  return db
}

/**
 * 执行模块化统计支持迁移
 * @returns 迁移结果
 */
export async function migrateModuleCodeSupport(): Promise<{
  success: boolean
  message: string
  changes?: {
    trainingRecords: number
    equipmentRecords: number
    reportRecords: number
  }
}> {
  const db = getRawDB() // 使用原始数据库对象，绕过 SQLWrapper 防抖保存

  if (!db) {
    return { success: false, message: '数据库未初始化' }
  }

  try {
    // ========== 步骤 1: 添加 module_code 字段 ==========
    await addModuleCodeColumns(db)

    // ========== 步骤 2: 为现有记录设置默认值 ==========
    const changes = await setDefaultModuleCodeValues(db)

    // ========== 步骤 3: 创建索引 ==========
    await createModuleCodeIndexes(db)

    // ========== 步骤 4: 创建统一统计视图 ==========
    await createUnifiedStatisticsView(db)

    // ========== 步骤 5: 验证数据完整性 ==========
    const validation = validateMigration(db)

    if (!validation.passed) {
      return {
        success: false,
        message: `迁移验证失败: ${validation.errors.join(', ')}`
      }
    }

    return {
      success: true,
      message: '模块化统计支持迁移成功',
      changes
    }
  } catch (error) {
    console.error('[migrateModuleCodeSupport] 迁移失败:', error)
    return {
      success: false,
      message: `迁移失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * 步骤 1: 为现有表添加 module_code 字段
 */
async function addModuleCodeColumns(db: any): Promise<void> {
  const tables = [
    { name: 'training_records', default: "'sensory'" },
    { name: 'equipment_training_records', default: "'sensory'" },
    { name: 'train_log', default: "'sensory'" },
    { name: 'report_record', default: '' }  // 评估记录不设置默认值
  ]

  for (const table of tables) {
    const columnExists = checkColumnExists(db, table.name, 'module_code')

    if (!columnExists) {
      console.log(`[migrateModuleCodeSupport] 添加 module_code 字段到 ${table.name}`)

      const defaultValue = table.default ? `DEFAULT ${table.default}` : ''
      db.exec(`
        ALTER TABLE ${table.name}
        ADD COLUMN module_code TEXT ${defaultValue};
      `)
    } else {
      console.log(`[migrateModuleCodeSupport] ${table.name}.module_code 字段已存在，跳过`)
    }
  }
}

/**
 * 步骤 2: 为现有记录设置默认 module_code 值
 */
async function setDefaultModuleCodeValues(db: any): Promise<{
  trainingRecords: number
  equipmentRecords: number
  reportRecords: number
}> {
  let trainingRecords = 0
  let equipmentRecords = 0
  let reportRecords = 0

  // 2.1 更新评估记录的 module_code（根据评估类型映射）
  // 注意：report_record 表使用 report_type 字段，不是 type
  try {
    const result = db.exec(`
      UPDATE report_record
      SET module_code = CASE
        WHEN report_type IN ('sm', 'weefim') THEN 'life_skills'
        WHEN report_type = 'csirs' THEN 'sensory'
        WHEN report_type IN ('conners-psq', 'conners-trs') THEN 'sensory'
        WHEN report_type = 'training' THEN 'sensory'
        WHEN report_type = 'iep' THEN 'sensory'
        ELSE 'sensory'
      END
      WHERE module_code IS NULL;
    `)

    if (result.length > 0) {
      reportRecords = result[0].values[0]?.[0] || 0
    }
  } catch (error) {
    // 如果 report_record 表还没有 module_code 字段，跳过
    console.warn('[setDefaultModuleCodeValues] 跳过 report_record 更新:', error)
  }

  // training_records 和 equipment_training_records 已通过 DEFAULT 设置
  // 这里只是为了统计返回值
  try {
    const trainingResult = db.exec('SELECT COUNT(*) FROM training_records WHERE module_code = "sensory"')
    if (trainingResult.length > 0 && trainingResult[0].values.length > 0) {
      trainingRecords = trainingResult[0].values[0][0] as number
    }
  } catch (error) {
    console.warn('[setDefaultModuleCodeValues] 无法统计 training_records:', error)
  }

  try {
    const equipmentResult = db.exec('SELECT COUNT(*) FROM equipment_training_records WHERE module_code = "sensory"')
    if (equipmentResult.length > 0 && equipmentResult[0].values.length > 0) {
      equipmentRecords = equipmentResult[0].values[0][0] as number
    }
  } catch (error) {
    console.warn('[setDefaultModuleCodeValues] 无法统计 equipment_training_records:', error)
  }

  return { trainingRecords, equipmentRecords, reportRecords }
}

/**
 * 步骤 3: 创建索引优化查询性能
 */
async function createModuleCodeIndexes(db: any): Promise<void> {
  const indexes = [
    // training_records 索引
    { name: 'idx_training_records_module_class', sql: 'CREATE INDEX IF NOT EXISTS idx_training_records_module_class ON training_records(module_code, class_id)' },
    { name: 'idx_training_records_module_date', sql: 'CREATE INDEX IF NOT EXISTS idx_training_records_module_date ON training_records(module_code, created_at)' },

    // equipment_training_records 索引
    { name: 'idx_equipment_training_module_class', sql: 'CREATE INDEX IF NOT EXISTS idx_equipment_training_module_class ON equipment_training_records(module_code, class_id)' },
    { name: 'idx_equipment_training_module_date', sql: 'CREATE INDEX IF NOT EXISTS idx_equipment_training_module_date ON equipment_training_records(module_code, training_date)' },

    // report_record 索引
    { name: 'idx_report_record_module_class', sql: 'CREATE INDEX IF NOT EXISTS idx_report_record_module_class ON report_record(module_code, class_id)' },
    { name: 'idx_report_record_module_date', sql: 'CREATE INDEX IF NOT EXISTS idx_report_record_module_date ON report_record(module_code, created_at)' }
  ]

  for (const index of indexes) {
    try {
      db.exec(index.sql)
      console.log(`[migrateModuleCodeSupport] 创建索引: ${index.name}`)
    } catch (error) {
      // 索引可能已存在，忽略错误
      console.warn(`[migrateModuleCodeSupport] 索引创建跳过: ${index.name}`)
    }
  }
}

/**
 * 步骤 4: 创建统一统计视图
 */
async function createUnifiedStatisticsView(db: any): Promise<void> {
  // 先删除旧视图（如果存在）
  try {
    db.exec('DROP VIEW IF EXISTS v_class_statistics_unified')
    console.log('[migrateModuleCodeSupport] 删除旧视图: v_class_statistics_unified')
  } catch {
    // 视图可能不存在，忽略错误
  }

  // 创建新视图
  const viewSQL = `
CREATE VIEW IF NOT EXISTS v_class_statistics_unified AS
WITH
-- 训练记录统计
training_stats AS (
  SELECT
    class_id,
    class_name,
    'sensory' AS module_code,
    COUNT(*) AS training_count,
    AVG(
      CASE
        WHEN task_id IN (1, 2, 3) THEN accuracy_rate * 100
        WHEN task_id IN (4, 5) THEN accuracy_rate * 100
        ELSE accuracy_rate * 100
      END
    ) AS avg_score,
    MAX(created_at) AS last_training_date
  FROM training_records
  WHERE class_id IS NOT NULL
  GROUP BY class_id, class_name
),

-- 器材训练统计
equipment_stats AS (
  SELECT
    class_id,
    class_name,
    'sensory' AS module_code,
    COUNT(*) AS training_count,
    AVG(CAST(score AS REAL)) AS avg_score,
    MAX(training_date) AS last_training_date
  FROM equipment_training_records
  WHERE class_id IS NOT NULL
  GROUP BY class_id, class_name
),

-- 评估记录统计
assessment_stats AS (
  SELECT
    class_id,
    class_name,
    module_code,
    COUNT(*) AS assessment_count,
    MAX(created_at) AS last_assessment_date
  FROM report_record
  WHERE class_id IS NOT NULL
  GROUP BY class_id, class_name, module_code
),

-- 合并所有统计数据
all_stats AS (
  SELECT
    class_id,
    class_name,
    module_code,
    training_count,
    0 AS assessment_count,
    avg_score,
    last_training_date AS last_activity_date,
    'training' AS activity_type
  FROM training_stats
  UNION ALL
  SELECT
    class_id,
    class_name,
    module_code,
    training_count,
    0 AS assessment_count,
    avg_score,
    last_training_date AS last_activity_date,
    'equipment' AS activity_type
  FROM equipment_stats
  UNION ALL
  SELECT
    class_id,
    class_name,
    module_code,
    0 AS training_count,
    assessment_count,
    NULL AS avg_score,
    last_assessment_date AS last_activity_date,
    'assessment' AS activity_type
  FROM assessment_stats
)

-- 最终聚合统计
SELECT
  sc.id AS class_id,
  sc.name AS class_name,
  sc.grade_level,
  sc.class_number,
  sc.academic_year,
  sc.current_enrollment AS total_students,
  sc.max_students,
  COALESCE(s.module_code, 'all') AS module_code,
  SUM(s.training_count) AS total_training_count,
  SUM(s.assessment_count) AS total_assessment_count,
  -- 修改：全部模式下不计算混合平均分，避免不同分值类型导致的无意义结果
  CASE
    WHEN COALESCE(s.module_code, 'all') = 'all' THEN NULL
    WHEN COUNT(DISTINCT s.activity_type) > 1 THEN NULL
    ELSE AVG(s.avg_score)
  END AS average_score,
  MAX(s.last_activity_date) AS last_activity_date,
  COUNT(DISTINCT CASE WHEN s.activity_type = 'training' THEN sch.student_id END) AS active_students_training,
  COUNT(DISTINCT CASE WHEN s.activity_type = 'assessment' THEN sch.student_id END) AS active_students_assessment
FROM sys_class sc
LEFT JOIN all_stats s ON sc.id = s.class_id
LEFT JOIN student_class_history sch ON sc.id = sch.class_id AND sch.is_current = 1
GROUP BY sc.id, s.module_code
ORDER BY sc.grade_level, sc.class_number;
  `

  db.exec(viewSQL)
  console.log('[migrateModuleCodeSupport] 创建统一统计视图: v_class_statistics_unified')
}

/**
 * 步骤 5: 验证迁移结果
 */
function validateMigration(db: any): {
  passed: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 检查是否有未设置 module_code 的记录
  const nullCheckResult = db.exec(`
    SELECT
      'training_records' AS table_name,
      COUNT(*) AS null_count
    FROM training_records
    WHERE module_code IS NULL
    UNION ALL
    SELECT
      'equipment_training_records' AS table_name,
      COUNT(*) AS null_count
    FROM equipment_training_records
    WHERE module_code IS NULL
    UNION ALL
    SELECT
      'report_record' AS table_name,
      COUNT(*) AS null_count
    FROM report_record
    WHERE module_code IS NULL;
  `)

  if (nullCheckResult.length > 0) {
    for (const row of nullCheckResult[0].values) {
      const tableName = row[0] as string
      const nullCount = row[1] as number
      if (nullCount > 0) {
        errors.push(`${tableName} 表有 ${nullCount} 条记录的 module_code 为 NULL`)
      }
    }
  }

  // 检查视图是否创建成功
  try {
    const viewCheck = db.exec("SELECT name FROM sqlite_master WHERE type='view' AND name='v_class_statistics_unified'")
    if (viewCheck.length === 0 || viewCheck[0].values.length === 0) {
      errors.push('统一统计视图 v_class_statistics_unified 未创建')
    }
  } catch (error) {
    errors.push(`视图检查失败: ${error}`)
  }

  return {
    passed: errors.length === 0,
    errors
  }
}

/**
 * 辅助函数: 检查列是否存在
 */
function checkColumnExists(db: any, tableName: string, columnName: string): boolean {
  try {
    const result = db.exec(`PRAGMA table_info(${tableName})`)
    if (result.length > 0 && result[0].values) {
      return result[0].values.some((row: any[]) => row[1] === columnName)
    }
  } catch (error) {
    console.warn(`[checkColumnExists] 检查列失败: ${tableName}.${columnName}`, error)
  }
  return false
}

/**
 * 检查是否需要执行 module_code 迁移
 * @param db 原始数据库对象
 * @returns 是否需要迁移
 */
export function needsModuleCodeMigration(db: any): boolean {
  if (!db) return false

  // 检查关键表是否有 module_code 字段
  const tables = ['training_records', 'equipment_training_records', 'report_record']

  for (const table of tables) {
    if (!checkColumnExists(db, table, 'module_code')) {
      console.log(`[needsModuleCodeMigration] ${table} 表缺少 module_code 字段，需要迁移`)
      return true
    }
  }

  // 检查统一统计视图是否存在
  try {
    const viewCheck = db.exec("SELECT name FROM sqlite_master WHERE type='view' AND name='v_class_statistics_unified'")
    if (viewCheck.length === 0 || viewCheck[0].values.length === 0) {
      console.log('[needsModuleCodeMigration] 统一视图不存在，需要迁移')
      return true
    }
  } catch {
    console.log('[needsModuleCodeMigration] 视图检查失败，需要迁移')
    return true
  }

  return false
}

/**
 * 执行模块化统计支持迁移（供 init.ts 调用）
 * @returns 迁移结果
 */
export async function runModuleCodeMigration(): Promise<{
  success: boolean
  message: string
  changes?: {
    trainingRecords: number
    equipmentRecords: number
    reportRecords: number
  }
}> {
  return await migrateModuleCodeSupport()
}

/**
 * 导出迁移函数供外部调用
 */
export default migrateModuleCodeSupport
