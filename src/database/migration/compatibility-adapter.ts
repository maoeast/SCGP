/**
 * SIC-ADS 2.0 兼容性适配器
 *
 * Phase 1.5: 双写验证与回退支持
 *
 * 功能：
 * 1. 双写验证：同时写入新旧两张表，验证迁移正确性
 * 2. 双读回退：优先从新表读取，失败时回退到旧表
 * 3. 数据一致性对比：验证新旧表数据一致性
 *
 * @module compatibility-adapter
 */

import { getDatabase } from '../init'

// ============ 类型定义 ============

interface Database {
  exec(sql: string, ...params: any[]): any[]
  prepare(sql: string): { bind(params: any[]): void; step(): boolean; getAsObject(): any; free(): void }
}

interface EquipmentData {
  id?: number
  category: string
  sub_category: string
  name: string
  description: string
  ability_tags: string[]
  image_url: string
  is_active: number
}

interface ResourceData {
  id?: number
  module_code: string
  resource_type: string
  name: string
  category: string
  description: string
  cover_image: string
  is_custom: number
  is_active: number
  legacy_id?: number
  legacy_source?: string
  meta_data?: string
}

interface DualWriteResult {
  oldId: number | null
  newId: number | null
  success: boolean
  error?: string
}

interface DataComparisonResult {
  match: boolean
  differences: Difference[]
  summary: {
    totalRecords: number
    matchedRecords: number
    mismatchedRecords: number
    missingInNew: number
    missingInOld: number
  }
}

interface Difference {
  recordId: number
  field: string
  oldValue: any
  newValue: any
}

// ============ 双写验证 ============

/**
 * 兼容性适配器：在新旧系统并行运行期间保持数据关联
 */
export class CompatibilityAdapter {
  private db: Database
  private dualWriteEnabled: boolean

  constructor(dualWriteEnabled: boolean = false) {
    // 获取 SQLWrapper，然后获取原始 sql.js Database
    const sqlWrapper = getDatabase()
    this.db = sqlWrapper.getRawDB()
    this.dualWriteEnabled = dualWriteEnabled
  }

  /**
   * 检查双写模式是否启用
   */
  isDualWriteEnabled(): boolean {
    return this.dualWriteEnabled
  }

  /**
   * 启用/禁用双写模式
   */
  setDualWriteEnabled(enabled: boolean): void {
    this.dualWriteEnabled = enabled
    console.log(`[CompatibilityAdapter] 双写模式: ${enabled ? '启用' : '禁用'}`)
  }

  /**
   * 双写验证：同时写入新旧两张表，用于验证迁移正确性
   *
   * @param data 器材数据
   * @returns 双写结果（包含新旧表 ID）
   */
  async dualWriteEquipment(data: EquipmentData): Promise<DualWriteResult> {
    const startTime = Date.now()

    try {
      // 1. 写入旧表 equipment_catalog
      let oldId: number | null = null
      try {
        const insertStmt = this.db.prepare(`
          INSERT INTO equipment_catalog (
            category, sub_category, name, description, ability_tags, image_url, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        insertStmt.bind([
          data.category,
          data.sub_category,
          data.name,
          data.description,
          JSON.stringify(data.ability_tags),
          data.image_url,
          data.is_active
        ])
        insertStmt.step()
        insertStmt.free()

        const result = this.db.exec('SELECT last_insert_rowid() as id')
        oldId = (result[0].values[0] as any)[0]
      } catch (error: any) {
        console.error('[DualWrite] 旧表写入失败:', error.message)
        return {
          oldId: null,
          newId: null,
          success: false,
          error: `旧表写入失败: ${error.message}`
        }
      }

      // 2. 写入新表 sys_training_resource
      let newId: number | null = null
      try {
        const insertStmt = this.db.prepare(`
          INSERT INTO sys_training_resource (
            module_code, resource_type, name, category, description,
            cover_image, is_custom, is_active,
            legacy_id, legacy_source,
            meta_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        insertStmt.bind([
          'sensory',
          'equipment',
          data.name,
          data.sub_category,
          data.description,
          data.image_url,
          0,
          data.is_active,
          oldId,
          'equipment_catalog',
          JSON.stringify({ original_tags: data.ability_tags })
        ])
        insertStmt.step()
        insertStmt.free()

        const result = this.db.exec('SELECT last_insert_rowid() as id')
        newId = (result[0].values[0] as any)[0]
      } catch (error: any) {
        console.error('[DualWrite] 新表写入失败:', error.message)
        // 新表写入失败不影响整体结果（旧表已写入）
      }

      // 3. 迁移标签
      if (newId !== null && data.ability_tags.length > 0) {
        try {
          for (const tagName of data.ability_tags) {
            // 创建或获取标签
            const tagStmt = this.db.prepare(`
              INSERT OR IGNORE INTO sys_tags (domain, name)
              VALUES ('ability', ?)
            `)
            tagStmt.bind([tagName])
            tagStmt.step()
            tagStmt.free()

            // 获取标签 ID
            const tagResult = this.db.exec(`
              SELECT id FROM sys_tags WHERE domain = 'ability' AND name = ?
            `, [tagName])

            if (tagResult.length > 0 && tagResult[0].values.length > 0) {
              const tagId = (tagResult[0].values[0] as any)[0]

              // 创建资源-标签关联
              const mapStmt = this.db.prepare(`
                INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id)
                VALUES (?, ?)
              `)
              mapStmt.bind([newId, tagId])
              mapStmt.step()
              mapStmt.free()
            }
          }
        } catch (error: any) {
          console.warn('[DualWrite] 标签迁移失败:', error.message)
        }
      }

      const elapsed = Date.now() - startTime
      console.log(`[DualWrite] 完成: old_id=${oldId}, new_id=${newId} (${elapsed}ms)`)

      return {
        oldId,
        newId,
        success: oldId !== null
      }
    } catch (error: any) {
      console.error('[DualWrite] 失败:', error)
      return {
        oldId: null,
        newId: null,
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 双读回退：优先从新表读取，失败时回退到旧表
   *
   * @param id 记录 ID（可能是旧表 ID 或新表 ID）
   * @param preferNew 是否优先从新表读取（默认 true）
   * @returns 资源数据或 null
   */
  async getResourceWithFallback(
    id: number,
    preferNew: boolean = true
  ): Promise<ResourceData | EquipmentData | null> {
    // 1. 优先从新表读取（通过 legacy_id）
    if (preferNew) {
      try {
        const stmt = this.db.prepare(`
          SELECT * FROM sys_training_resource
          WHERE (id = ? OR legacy_id = ?)
          AND legacy_source = 'equipment_catalog'
          LIMIT 1
        `)
        stmt.bind([id, id])
        const hasResult = stmt.step()

        if (hasResult) {
          const row = stmt.getAsObject()
          stmt.free()
          console.log(`[Fallback] 从新表读取: id=${id}`)
          return row as ResourceData
        }

        stmt.free()
      } catch (error: any) {
        console.warn('[Fallback] 新表读取失败，尝试旧表:', error.message)
      }
    }

    // 2. 回退到旧表
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM equipment_catalog WHERE id = ? LIMIT 1
      `)
      stmt.bind([id])
      const hasResult = stmt.step()

      if (hasResult) {
        const row = stmt.getAsObject()
        stmt.free()
        console.log(`[Fallback] 从旧表读取: id=${id}`)
        return row as EquipmentData
      }

      stmt.free()
    } catch (error: any) {
      console.error('[Fallback] 旧表读取失败:', error.message)
    }

    console.warn(`[Fallback] 未找到记录: id=${id}`)
    return null
  }

  /**
   * 数据一致性对比：验证新旧表数据一致性
   *
   * @returns 对比结果
   */
  async compareData(): Promise<DataComparisonResult> {
    console.log('[CompatibilityAdapter] 开始数据一致性对比...')

    const differences: Difference[] = []
    let matchedRecords = 0
    let mismatchedRecords = 0
    let missingInNew = 0
    let missingInOld = 0

    try {
      // 1. 获取所有旧表记录
      const oldResult = this.db.exec('SELECT * FROM equipment_catalog ORDER BY id')

      if (oldResult.length === 0 || oldResult[0].values.length === 0) {
        console.warn('[CompatibilityAdapter] 旧表无数据')
        return {
          match: true,
          differences: [],
          summary: {
            totalRecords: 0,
            matchedRecords: 0,
            mismatchedRecords: 0,
            missingInNew: 0,
            missingInOld: 0
          }
        }
      }

      const totalRecords = oldResult[0].values.length
      const columns = oldResult[0].columns

      // 2. 逐条对比
      for (const row of oldResult[0].values) {
        const oldRecord: any = {}
        columns.forEach((col: string, i: number) => {
          oldRecord[col] = row[i]
        })

        const oldId = oldRecord.id

        // 查找新表对应记录
        const newResult = this.db.exec(`
          SELECT * FROM sys_training_resource
          WHERE legacy_id = ? AND legacy_source = 'equipment_catalog'
          LIMIT 1
        `, [oldId])

        // 检查是否在新表中存在
        if (newResult.length === 0 || newResult[0].values.length === 0) {
          missingInNew++
          differences.push({
            recordId: oldId,
            field: '__record__',
            oldValue: 'exists',
            newValue: 'missing'
          })
          continue
        }

        const newRecord: any = {}
        const newColumns = newResult[0].columns
        newResult[0].values[0].forEach((val: any, i: number) => {
          newRecord[newColumns[i]] = val
        })

        // 对比关键字段
        let recordMismatched = false

        // 名称对比
        if (oldRecord.name !== newRecord.name) {
          differences.push({
            recordId: oldId,
            field: 'name',
            oldValue: oldRecord.name,
            newValue: newRecord.name
          })
          recordMismatched = true
        }

        // 描述对比
        if ((oldRecord.description || '') !== (newRecord.description || '')) {
          differences.push({
            recordId: oldId,
            field: 'description',
            oldValue: oldRecord.description || '',
            newValue: newRecord.description || ''
          })
          recordMismatched = true
        }

        // 标签对比（需要解析 JSON）
        try {
          const oldTags = JSON.parse(oldRecord.ability_tags || '[]')
          const newMeta = JSON.parse(newRecord.meta_data || '{}')
          const newTags = newMeta.original_tags || []

          if (JSON.stringify(oldTags.sort()) !== JSON.stringify(newTags.sort())) {
            differences.push({
              recordId: oldId,
              field: 'ability_tags',
              oldValue: JSON.stringify(oldTags),
              newValue: JSON.stringify(newTags)
            })
            recordMismatched = true
          }
        } catch {
          // JSON 解析失败，跳过标签对比
        }

        if (recordMismatched) {
          mismatchedRecords++
        } else {
          matchedRecords++
        }
      }

      // 3. 检查新表中是否有孤儿记录（旧表中不存在）
      const orphanedResult = this.db.exec(`
        SELECT COUNT(*) as count FROM sys_training_resource r
        WHERE r.legacy_source = 'equipment_catalog'
        AND NOT EXISTS (
          SELECT 1 FROM equipment_catalog e WHERE e.id = r.legacy_id
        )
      `)

      if (orphanedResult.length > 0 && orphanedResult[0].values.length > 0) {
        missingInOld = (orphanedResult[0].values[0] as any)[0]
      }

      const match = differences.length === 0

      console.log(`[CompatibilityAdapter] 对比完成:`)
      console.log(`  总记录数: ${totalRecords}`)
      console.log(`  匹配: ${matchedRecords}`)
      console.log(`  不匹配: ${mismatchedRecords}`)
      console.log(`  新表缺失: ${missingInNew}`)
      console.log(`  旧表缺失: ${missingInOld}`)
      console.log(`  一致性: ${match ? '✅ 通过' : '❌ 失败'}`)

      return {
        match,
        differences,
        summary: {
          totalRecords,
          matchedRecords,
          mismatchedRecords,
          missingInNew,
          missingInOld
        }
      }
    } catch (error: any) {
      console.error('[CompatibilityAdapter] 对比失败:', error)
      throw error
    }
  }

  /**
   * 生成数据一致性报告
   */
  generateComparisonReport(result: DataComparisonResult): string {
    let output = '\n'
    output += '==========================================\n'
    output += '数据一致性对比报告\n'
    output += '==========================================\n'
    output += `总体结果: ${result.match ? '✅ 一致' : '❌ 不一致'}\n`
    output += '\n'

    output += '------------------------------------------\n'
    output += '统计摘要\n'
    output += '------------------------------------------\n'
    output += `总记录数: ${result.summary.totalRecords}\n`
    output += `匹配记录: ${result.summary.matchedRecords}\n`
    output += `不匹配记录: ${result.summary.mismatchedRecords}\n`
    output += `新表缺失: ${result.summary.missingInNew}\n`
    output += `旧表缺失: ${result.summary.missingInOld}\n`
    output += '\n'

    if (result.differences.length > 0) {
      output += '------------------------------------------\n'
      output += '差异详情\n'
      output += '------------------------------------------\n'

      // 按记录 ID 分组显示差异
      const groupedDifferences = new Map<number, Difference[]>()
      for (const diff of result.differences) {
        if (!groupedDifferences.has(diff.recordId)) {
          groupedDifferences.set(diff.recordId, [])
        }
        groupedDifferences.get(diff.recordId)!.push(diff)
      }

      for (const [recordId, diffs] of groupedDifferences) {
        output += `记录 #${recordId}:\n`
        for (const diff of diffs) {
          if (diff.field === '__record__') {
            output += `  ⚠️ ${diff.newValue === 'missing' ? '新表中缺失' : '旧表中缺失'}\n`
          } else {
            output += `  ${diff.field}:\n`
            output += `    旧值: ${diff.oldValue}\n`
            output += `    新值: ${diff.newValue}\n`
          }
        }
        output += '\n'
      }
    }

    output += '==========================================\n'

    return output
  }
}

// ============ 导出便捷函数 ============

/**
 * 创建兼容性适配器实例
 */
export function createCompatibilityAdapter(dualWriteEnabled: boolean = false): CompatibilityAdapter {
  return new CompatibilityAdapter(dualWriteEnabled)
}

/**
 * 检查是否应启用双写模式
 */
export function shouldEnableDualWrite(): boolean {
  // 仅在开发环境且明确设置时启用
  return (
    typeof import.meta.env !== 'undefined' &&
    import.meta.env.DEV &&
    typeof process !== 'undefined' &&
    process.env.VITE_DUAL_WRITE === 'true'
  )
}
