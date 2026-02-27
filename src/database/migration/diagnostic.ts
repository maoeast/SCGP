/**
 * SIC-ADS 2.0 数据库诊断工具
 *
 * 用于快速检查迁移状态和诊断问题
 */

import { getDatabase } from '../init'

export interface DiagnosticResult {
  sysTablesExist: boolean
  equipmentCount: number
  resourceCount: number
  tagCount: number
  issues: string[]
  recommendations: string[]
}

/**
 * 运行数据库诊断
 */
export function runDiagnostics(): DiagnosticResult {
  // 获取 SQLWrapper，然后获取原始 sql.js Database
  const sqlWrapper = getDatabase()
  const db = sqlWrapper.getRawDB()

  const issues: string[] = []
  const recommendations: string[] = []

  // 1. 检查 sys_ 表是否存在
  let sysTablesExist = false
  try {
    const tables = db.exec(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name LIKE 'sys_%'
    `)

    if (tables.length > 0 && tables[0].values.length > 0) {
      sysTablesExist = true
      const tableNames = tables[0].values.map((v: any[]) => v[0])
      console.log('[诊断] 找到 sys_ 表:', tableNames.join(', '))
    } else {
      issues.push('sys_ 表不存在，需要先执行 Schema 迁移')
      recommendations.push('访问 /schema-migration 页面执行迁移')
    }
  } catch (e) {
    issues.push(`检查表结构失败: ${e}`)
  }

  // 2. 统计 equipment_catalog 数量
  let equipmentCount = 0
  try {
    const result = db.exec('SELECT COUNT(*) FROM equipment_catalog WHERE is_active = 1')
    equipmentCount = result[0]?.values[0]?.[0] || 0
    console.log(`[诊断] equipment_catalog 活跃记录: ${equipmentCount}`)
  } catch (e) {
    issues.push(`查询 equipment_catalog 失败: ${e}`)
  }

  // 3. 统计 sys_training_resource 数量
  let resourceCount = 0
  try {
    const result = db.exec(`
      SELECT COUNT(*) FROM sys_training_resource
      WHERE legacy_source = 'equipment_catalog' AND is_active = 1
    `)
    resourceCount = result[0]?.values[0]?.[0] || 0
    console.log(`[诊断] sys_training_resource 迁移记录: ${resourceCount}`)
  } catch (e) {
    // 表可能不存在
    console.log('[诊断] sys_training_resource 不存在或查询失败')
  }

  // 4. 统计标签数量
  let tagCount = 0
  try {
    const result = db.exec("SELECT COUNT(*) FROM sys_tags WHERE domain = 'ability'")
    tagCount = result[0]?.values[0]?.[0] || 0
    console.log(`[诊断] sys_tags 标签数量: ${tagCount}`)
  } catch (e) {
    console.log('[诊断] sys_tags 不存在或查询失败')
  }

  // 5. 分析问题
  if (sysTablesExist) {
    if (equipmentCount > 0 && resourceCount === 0) {
      issues.push('sys_ 表存在但无数据，迁移可能未完成')
      recommendations.push('重新执行迁移')
    }

    if (equipmentCount > resourceCount && resourceCount > 0) {
      issues.push(`迁移不完整: equipment_catalog 有 ${equipmentCount} 条，sys_training_resource 只有 ${resourceCount} 条`)
      recommendations.push('检查迁移日志，可能有部分记录迁移失败')
    }

    if (resourceCount > 0 && tagCount === 0) {
      issues.push('资源已迁移但标签未创建')
      recommendations.push('重新执行迁移以创建标签')
    }
  }

  return {
    sysTablesExist,
    equipmentCount,
    resourceCount,
    tagCount,
    issues,
    recommendations
  }
}

/**
 * 打印诊断报告
 */
export function printDiagnosticReport(result: DiagnosticResult): void {
  console.log('\n==========================================')
  console.log('SIC-ADS 2.0 数据库诊断报告')
  console.log('==========================================\n')

  console.log('表结构状态:')
  console.log(`  sys_ 表存在: ${result.sysTablesExist ? '✅' : '❌'}`)

  console.log('\n数据统计:')
  console.log(`  equipment_catalog: ${result.equipmentCount} 条`)
  console.log(`  sys_training_resource: ${result.resourceCount} 条`)
  console.log(`  sys_tags: ${result.tagCount} 个`)

  if (result.issues.length > 0) {
    console.log('\n发现的问题:')
    result.issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`)
    })
  }

  if (result.recommendations.length > 0) {
    console.log('\n建议操作:')
    result.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`)
    })
  }

  console.log('\n==========================================\n')
}
