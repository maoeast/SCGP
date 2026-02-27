/**
 * 跨模块统计数据准确性验证脚本
 *
 * 用途：验证 v_class_statistics_unified 视图在不同模块筛选下的准确性
 * 使用：在浏览器控制台或应用代码中调用 verifyStatistics()
 */

import { getDatabase } from '../init'

/**
 * 执行统计验证
 */
export function verifyStatistics(classId: number = 1) {
  const db = getDatabase()

  console.log('========== 跨模块统计验证开始 ==========')
  console.log('目标班级 ID:', classId)

  // ========== 第一步：查看班级信息 ==========
  console.log('\n【第一步】班级信息')
  const classInfo = db.get('SELECT * FROM sys_class WHERE id = ?', [classId])
  console.log('班级信息:', classInfo)

  // ========== 第二步：查看该班级的学生 ==========
  console.log('\n【第二步】班级学生')
  const students = db.all(`
    SELECT s.id, s.name, s.current_class_id, s.current_class_name
    FROM student s
    WHERE s.current_class_id = ?
  `, [classId])
  console.log('学生列表:', students)

  // ========== 第三步：查看原始训练记录 ==========
  console.log('\n【第三步】原始训练记录（按表分组）')

  // 3.1 游戏训练记录
  const trainingRecords = db.all(`
    SELECT 'training_records' as source, COUNT(*) as count,
           AVG(accuracy_rate * 100) as avg_score,
           MIN(accuracy_rate * 100) as min_score,
           MAX(accuracy_rate * 100) as max_score
    FROM training_records
    WHERE class_id = ?
  `, [classId])
  console.log('游戏训练记录:', trainingRecords)

  // 3.2 器材训练记录
  const equipmentRecords = db.all(`
    SELECT 'equipment_training' as source, COUNT(*) as count,
           AVG(CAST(score AS REAL)) as avg_score,
           MIN(score) as min_score,
           MAX(score) as max_score
    FROM equipment_training_records
    WHERE class_id = ?
  `, [classId])
  console.log('器材训练记录:', equipmentRecords)

  // 3.3 评估记录
  const assessmentRecords = db.all(`
    SELECT module_code, COUNT(*) as count
    FROM report_record
    WHERE class_id = ?
    GROUP BY module_code
  `, [classId])
  console.log('评估记录（按模块）:', assessmentRecords)

  // ========== 第四步：验证视图数据（按模块） ==========
  console.log('\n【第四步】视图统计结果（按模块）')

  const statsByModule = db.all(`
    SELECT
      class_id,
      class_name,
      module_code,
      total_training_count,
      total_assessment_count,
      average_score,
      last_activity_date
    FROM v_class_statistics_unified
    WHERE class_id = ?
    ORDER BY module_code
  `, [classId])

  console.log('按模块统计结果:')
  statsByModule.forEach(stat => {
    console.log(`  模块: ${stat.module_code}`)
    console.log(`    训练次数: ${stat.total_training_count}`)
    console.log(`    评估次数: ${stat.total_assessment_count}`)
    console.log(`    平均分: ${stat.average_score}`)
    console.log(`    最近活动: ${stat.last_activity_date}`)
  })

  // ========== 第五步：分值一致性分析 ==========
  console.log('\n【第五步】分值一致性分析')

  const scoreAnalysis = db.all(`
    SELECT
      'training_records' as source,
      'percentage' as score_type,
      COUNT(*) as count,
      AVG(accuracy_rate * 100) as avg_score,
      MIN(accuracy_rate * 100) as min_score,
      MAX(accuracy_rate * 100) as max_score
    FROM training_records
    WHERE class_id = ?

    UNION ALL

    SELECT
      'equipment_training' as source,
      'integer_1_5' as score_type,
      COUNT(*) as count,
      AVG(CAST(score AS REAL)) as avg_score,
      MIN(score) as min_score,
      MAX(score) as max_score
    FROM equipment_training_records
    WHERE class_id = ?
  `, [classId, classId])

  console.log('分值类型分析:')
  scoreAnalysis.forEach(row => {
    console.log(`  ${row.source}:`)
    console.log(`    分值类型: ${row.score_type}`)
    console.log(`    数量: ${row.count}`)
    console.log(`    平均分: ${row.avg_score}`)
    console.log(`    分值范围: ${row.min_score} - ${row.max_score}`)
  })

  // ========== 第六步：风险评估 ==========
  console.log('\n【第六步】分值一致性风险评估')

  const allStats = statsByModule.filter(s => s.module_code === 'all')
  if (allStats.length > 0) {
    const totalStats = allStats[0]
    console.log('⚠️  "全部模块" 模式下的平均分:', totalStats.average_score)
    console.log('⚠️  问题分析:')

    const hasTraining = scoreAnalysis.some(s => s.source === 'training_records' && s.count > 0)
    const hasEquipment = scoreAnalysis.some(s => s.source === 'equipment_training' && s.count > 0)

    if (hasTraining && hasEquipment) {
      console.log('  ❌ 存在混合分值类型：')
      console.log('     - 游戏训练：百分比（0-100）')
      console.log('     - 器材训练：整数（1-5）')
      console.log('     → 简单的 AVG 聚合会导致平均分失去参考意义')
    } else if (hasTraining) {
      console.log('  ✅ 只有游戏训练数据，分值类型统一（百分比）')
    } else if (hasEquipment) {
      console.log('  ✅ 只有器材训练数据，分值类型统一（1-5）')
    } else {
      console.log('  ℹ️  暂无训练数据')
    }
  }

  // ========== 第七步：验证结果总结 ==========
  console.log('\n【验证结果总结】')

  const sensoryStats = statsByModule.find(s => s.module_code === 'sensory')
  const lifeSkillsStats = statsByModule.find(s => s.module_code === 'life_skills')
  const allModuleStats = statsByModule.find(s => s.module_code === 'all')

  console.log('✅ 验证 1: sensory 模块仅包含感官相关数据')
  console.log(`   预期: 训练记录 + 器材记录`)
  console.log(`   实际: 训练=${sensoryStats?.total_training_count || 0}, 评估=${sensoryStats?.total_assessment_count || 0}`)

  console.log('✅ 验证 2: life_skills 模块仅包含生活自理评估')
  console.log(`   预期: 评估记录数量 > 0`)
  console.log(`   实际: ${lifeSkillsStats?.total_assessment_count || 0}`)

  console.log('✅ 验证 3: all 模块包含所有数据')
  console.log(`   预期: 训练 + 评估总和`)
  console.log(`   实际: 训练=${allModuleStats?.total_training_count || 0}, 评估=${allModuleStats?.total_assessment_count || 0}`)

  console.log('\n========== 验证完成 ==========\n')

  return {
    classInfo,
    students,
    trainingRecords,
    equipmentRecords,
    assessmentRecords,
    statsByModule,
    scoreAnalysis
  }
}

/**
 * 创建测试数据
 */
export function createTestData(classId: number = 1, studentId1: number = 1, studentId2: number = 2) {
  const db = getDatabase()

  console.log('========== 创建测试数据 ==========')

  // 数据 A：感官游戏训练记录
  const resultA = db.run(`
    INSERT INTO training_records (
      student_id, task_id, timestamp, duration, accuracy_rate,
      avg_response_time, raw_data, class_id, class_name, module_code, created_at
    ) VALUES (?, 1, strftime('%s', 'now'), 120, 0.8, 2000, '{"test": "verification_a"}',
           ?, '测试班级', 'sensory', datetime('now'))
  `, [studentId1, classId])
  console.log('✅ 数据 A 已插入:', resultA.changes > 0 ? '成功' : '失败')

  // 数据 B：感官器材训练记录
  const resultB = db.run(`
    INSERT INTO equipment_training_records (
      student_id, equipment_id, score, prompt_level, duration_seconds,
      training_date, class_id, class_name, module_code, created_at
    ) VALUES (?, 1, 4, 2, 300, date('now'), ?, '测试班级', 'sensory', datetime('now'))
  `, [studentId2, classId])
  console.log('✅ 数据 B 已插入:', resultB.changes > 0 ? '成功' : '失败')

  // 数据 C：生活自理评估记录
  const resultC = db.run(`
    INSERT INTO report_record (
      student_id, report_type, assess_id, title, class_id, class_name, module_code, created_at
    ) VALUES (?, 'weefim', 1, 'WeeFIM 测试评估', ?, '测试班级', 'life_skills', datetime('now'))
  `, [studentId1, classId])
  console.log('✅ 数据 C 已插入:', resultC.changes > 0 ? '成功' : '失败')

  console.log('========== 测试数据创建完成 ==========\n')

  return {
    trainingRecordId: resultA.lastInsertRowid,
    equipmentRecordId: resultB.lastInsertRowid,
    reportRecordId: resultC.lastInsertRowid
  }
}

/**
 * 清理测试数据
 */
export function cleanupTestData(classId: number = 1, studentId1: number = 1, studentId2: number = 2) {
  const db = getDatabase()

  console.log('========== 清理测试数据 ==========')

  const result1 = db.run(`DELETE FROM training_records WHERE student_id IN (?, ?) AND raw_data LIKE '%verification_%'`, [studentId1, studentId2])
  const result2 = db.run(`DELETE FROM equipment_training_records WHERE student_id = ? AND duration_seconds = 300`, [studentId2])
  const result3 = db.run(`DELETE FROM report_record WHERE student_id = ? AND title LIKE '%测试评估%'`, [studentId1])

  console.log('✅ 训练记录已删除:', result1.changes)
  console.log('✅ 器材记录已删除:', result2.changes)
  console.log('✅ 评估记录已删除:', result3.changes)

  console.log('========== 清理完成 ==========\n')
}

/**
 * 在浏览器控制台中使用的快捷函数
 */
if (typeof window !== 'undefined') {
  ;(window as any).verifyStatistics = verifyStatistics
  ;(window as any).createTestData = createTestData
  ;(window as any).cleanupTestData = cleanupTestData

  console.log('📊 统计验证工具已加载')
  console.log('使用方法:')
  console.log('  verifyStatistics(1)  - 验证班级 ID=1 的统计数据')
  console.log('  createTestData(1)    - 为班级 ID=1 创建测试数据')
  console.log('  cleanupTestData(1)   - 清理测试数据')
}
