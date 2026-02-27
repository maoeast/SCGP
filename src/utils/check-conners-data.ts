/**
 * Conners 数据兼容性检查工具
 * 用于检查现有 Conners 评估记录中 t_scores JSON 是否包含 hyperactivity_index 字段
 */

import { ConnersPSQAPI, ConnersTRSAPI } from '../database/api'

interface CheckResult {
  table: string
  totalRecords: number
  validRecords: number
  invalidRecords: number
  recordsWithoutHyperactivityIndex: Array<{
    id: number
    student_id: number
    t_scores: any
    hyperactivity_index_column: number | null
  }>
}

/**
 * 检查 t_scores JSON 中是否包含 hyperactivity_index
 */
function checkTScoresCompatibility(tScoresJson: string): { hasHyperactivityIndex: boolean; tScores: any } {
  try {
    const tScores = JSON.parse(tScoresJson)
    const hasHyperactivityIndex = 'hyperactivity_index' in tScores
    return { hasHyperactivityIndex, tScores }
  } catch (error) {
    console.error('解析 t_scores JSON 失败:', error)
    return { hasHyperactivityIndex: false, tScores: null }
  }
}

/**
 * 检查 Conners PSQ 数据兼容性
 */
function checkConnersPSQData(): CheckResult {
  const api = new ConnersPSQAPI()
  const result: CheckResult = {
    table: 'conners_psq_assess',
    totalRecords: 0,
    validRecords: 0,
    invalidRecords: 0,
    recordsWithoutHyperactivityIndex: []
  }

  try {
    // 查询所有 PSQ 记录
    const records = api['query']('SELECT id, student_id, t_scores, hyperactivity_index FROM conners_psq_assess')
    result.totalRecords = records.length

    for (const record of records) {
      const { hasHyperactivityIndex, tScores } = checkTScoresCompatibility(record.t_scores)

      if (hasHyperactivityIndex) {
        result.validRecords++
      } else {
        result.invalidRecords++
        result.recordsWithoutHyperactivityIndex.push({
          id: record.id,
          student_id: record.student_id,
          t_scores: tScores,
          hyperactivity_index_column: record.hyperactivity_index
        })
      }
    }
  } catch (error) {
    console.error('检查 Conners PSQ 数据失败:', error)
  }

  return result
}

/**
 * 检查 Conners TRS 数据兼容性
 */
function checkConnersTRSData(): CheckResult {
  const api = new ConnersTRSAPI()
  const result: CheckResult = {
    table: 'conners_trs_assess',
    totalRecords: 0,
    validRecords: 0,
    invalidRecords: 0,
    recordsWithoutHyperactivityIndex: []
  }

  try {
    // 查询所有 TRS 记录
    const records = api['query']('SELECT id, student_id, t_scores, hyperactivity_index FROM conners_trs_assess')
    result.totalRecords = records.length

    for (const record of records) {
      const { hasHyperactivityIndex, tScores } = checkTScoresCompatibility(record.t_scores)

      if (hasHyperactivityIndex) {
        result.validRecords++
      } else {
        result.invalidRecords++
        result.recordsWithoutHyperactivityIndex.push({
          id: record.id,
          student_id: record.student_id,
          t_scores: tScores,
          hyperactivity_index_column: record.hyperactivity_index
        })
      }
    }
  } catch (error) {
    console.error('检查 Conners TRS 数据失败:', error)
  }

  return result
}

/**
 * 执行完整的兼容性检查
 */
export function checkConnersDataCompatibility(): {
  psq: CheckResult
  trs: CheckResult
  summary: string
} {
  console.log('🔍 开始检查 Conners 数据兼容性...\n')

  const psqResult = checkConnersPSQData()
  const trsResult = checkConnersTRSData()

  console.log('📊 PSQ 检查结果:')
  console.log(`   总记录数: ${psqResult.totalRecords}`)
  console.log(`   有效记录: ${psqResult.validRecords}`)
  console.log(`   无效记录: ${psqResult.invalidRecords}`)

  console.log('\n📊 TRS 检查结果:')
  console.log(`   总记录数: ${trsResult.totalRecords}`)
  console.log(`   有效记录: ${trsResult.validRecords}`)
  console.log(`   无效记录: ${trsResult.invalidRecords}`)

  // 生成汇总信息
  let summary = '\n📋 兼容性检查汇总:\n'
  summary += `   PSQ: ${psqResult.invalidRecords > 0 ? '❌ 需要修复' : '✅ 全部兼容'} (${psqResult.validRecords}/${psqResult.totalRecords})\n`
  summary += `   TRS: ${trsResult.invalidRecords > 0 ? '❌ 需要修复' : '✅ 全部兼容'} (${trsResult.validRecords}/${trsResult.totalRecords})\n`

  if (psqResult.invalidRecords > 0 || trsResult.invalidRecords > 0) {
    summary += '\n⚠️  发现不兼容数据，建议执行数据迁移脚本修复。\n'
    summary += '详情请查看返回的 recordsWithoutHyperactivityIndex 字段。'
  } else {
    summary += '\n✅ 所有数据兼容，无需修复。'
  }

  console.log(summary)

  return {
    psq: psqResult,
    trs: trsResult,
    summary
  }
}

/**
 * 修复不兼容的数据
 * 为 t_scores JSON 添加 hyperactivity_index 字段
 */
export function fixConnersDataCompatibility(): {
  psqFixed: number
  trsFixed: number
  errors: string[]
} {
  console.log('🔧 开始修复 Conners 数据兼容性...\n')

  const errors: string[] = []
  let psqFixed = 0
  let trsFixed = 0

  try {
    // 修复 PSQ 数据
    const psqApi = new ConnersPSQAPI()
    const psqRecords = psqApi['query']('SELECT id, t_scores, hyperactivity_index FROM conners_psq_assess')

    for (const record of psqRecords) {
      const { hasHyperactivityIndex, tScores } = checkTScoresCompatibility(record.t_scores)

      if (!hasHyperactivityIndex && tScores !== null) {
        // 添加 hyperactivity_index 到 JSON
        tScores.hyperactivity_index = record.hyperactivity_index
        const updatedTScores = JSON.stringify(tScores)

        psqApi['execute'](
          'UPDATE conners_psq_assess SET t_scores = ? WHERE id = ?',
          [updatedTScores, record.id]
        )
        psqFixed++
      }
    }

    // 修复 TRS 数据
    const trsApi = new ConnersTRSAPI()
    const trsRecords = trsApi['query']('SELECT id, t_scores, hyperactivity_index FROM conners_trs_assess')

    for (const record of trsRecords) {
      const { hasHyperactivityIndex, tScores } = checkTScoresCompatibility(record.t_scores)

      if (!hasHyperactivityIndex && tScores !== null) {
        // 添加 hyperactivity_index 到 JSON
        tScores.hyperactivity_index = record.hyperactivity_index
        const updatedTScores = JSON.stringify(tScores)

        trsApi['execute'](
          'UPDATE conners_trs_assess SET t_scores = ? WHERE id = ?',
          [updatedTScores, record.id]
        )
        trsFixed++
      }
    }

    console.log(`✅ 修复完成: PSQ ${psqFixed} 条, TRS ${trsFixed} 条`)
  } catch (error) {
    errors.push((error as Error).message)
    console.error('❌ 修复失败:', error)
  }

  return { psqFixed, trsFixed, errors }
}

/**
 * 在浏览器控制台中运行检查
 * 使用方法：
 * 1. 打开应用
 * 2. 打开浏览器开发者工具控制台
 * 3. 运行: import('/src/utils/check-conners-data.ts').then(m => m.checkConnersDataCompatibility())
 */
export function runCheckInConsole() {
  if (typeof window !== 'undefined') {
    ;(window as any).__checkConnersDataCompatibility = checkConnersDataCompatibility
    ;(window as any).__fixConnersDataCompatibility = fixConnersDataCompatibility
    console.log('✅ 已在 window 对象上注册检查函数:')
    console.log('   - __checkConnersDataCompatibility(): 检查数据兼容性')
    console.log('   - __fixConnersDataCompatibility(): 修复不兼容数据')
  }
}
