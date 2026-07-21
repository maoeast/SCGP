import { DatabaseAPI } from '@/database/api'
import type { ModuleCode } from '@/types/module'
import {
  getTeachingMaterialModuleCode,
  type TeachingMaterialDimensionCode,
} from '@/utils/resource-center-business'

export interface TeachingMaterialItem {
  id: number
  title: string
  dimensionCode: TeachingMaterialDimensionCode
  moduleCode: ModuleCode
  fileName: string
  fileType: string
  filePath: string
  fileSizeBytes: number
  description?: string
  tags: string[]
  sequenceOrder?: number
  isFavorite: boolean
  createdAt?: string
  updatedAt?: string
}

export interface TeachingMaterialQueryOptions {
  userId?: number
  keyword?: string
  dimensionCode?: TeachingMaterialDimensionCode | null
  allowedModuleCodes?: string[]
}

export interface TeachingMaterialCreateInput {
  title: string
  dimensionCode: TeachingMaterialDimensionCode
  fileName: string
  fileType: string
  filePath: string
  fileSizeBytes: number
  description?: string
  tags?: string[]
}

export class TeachingMaterialsAPI extends DatabaseAPI {
  getMaterials(options: TeachingMaterialQueryOptions = {}): TeachingMaterialItem[] {
    const userId = Number(options.userId || 0)
    const params: any[] = [userId > 0 ? userId : -1]
    let sql = `
      SELECT
        tm.id,
        tm.title,
        tm.dimension_code,
        tm.module_code,
        tm.file_name,
        tm.file_type,
        tm.file_path,
        tm.file_size_bytes,
        tm.description,
        tm.tags,
        tm.sequence_order,
        tm.created_at,
        tm.updated_at,
        CASE WHEN tf.id IS NOT NULL THEN 1 ELSE 0 END AS is_favorite
      FROM teaching_material tm
      LEFT JOIN teaching_material_favorite tf
        ON tf.material_id = tm.id
       AND tf.user_id = ?
      WHERE 1 = 1
    `

    if (options.allowedModuleCodes && options.allowedModuleCodes.length > 0) {
      sql += ` AND tm.module_code IN (${options.allowedModuleCodes.map(() => '?').join(', ')})`
      params.push(...options.allowedModuleCodes)
    }

    if (options.dimensionCode) {
      sql += ' AND tm.dimension_code = ?'
      params.push(options.dimensionCode)
    }

    if (options.keyword) {
      sql += `
        AND (
          tm.title LIKE ?
          OR tm.file_name LIKE ?
          OR COALESCE(tm.description, '') LIKE ?
          OR COALESCE(tm.tags, '') LIKE ?
        )
      `
      const pattern = `%${options.keyword}%`
      params.push(pattern, pattern, pattern, pattern)
    }

    // 排序优先级：sequence_order（数值步骤序号，降序）> updated_at（更新时间）> id
    // sequence_order 为 NULL 的记录（无步骤序号的辅助资料）排在最后
    sql += ' ORDER BY tm.sequence_order DESC NULLS LAST, tm.updated_at DESC, tm.id DESC'

    return this.query(sql, params).map((row) => this.mapRow(row))
  }

  addMaterial(input: TeachingMaterialCreateInput): number {
    const moduleCode = getTeachingMaterialModuleCode(input.dimensionCode)
    const tags = normalizeTagList(input.tags)

    this.execute(`
      INSERT INTO teaching_material (
        title,
        dimension_code,
        module_code,
        file_name,
        file_type,
        file_path,
        file_size_bytes,
        description,
        tags,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      input.title,
      input.dimensionCode,
      moduleCode,
      input.fileName,
      input.fileType,
      input.filePath,
      Math.max(0, Math.round(input.fileSizeBytes || 0)),
      input.description || null,
      tags.length > 0 ? tags.join(',') : null,
    ])

    return this.getLastInsertId()
  }

  deleteMaterial(id: number): boolean {
    this.execute('DELETE FROM teaching_material_favorite WHERE material_id = ?', [id])
    return this.execute('DELETE FROM teaching_material WHERE id = ?', [id]) > 0
  }

  toggleFavorite(userId: number, materialId: number): boolean {
    if (!userId) {
      return false
    }

    const existing = this.queryOne(
      'SELECT id FROM teaching_material_favorite WHERE user_id = ? AND material_id = ?',
      [userId, materialId]
    )

    if (existing) {
      this.execute(
        'DELETE FROM teaching_material_favorite WHERE user_id = ? AND material_id = ?',
        [userId, materialId]
      )
      return false
    }

    this.execute(
      'INSERT INTO teaching_material_favorite (user_id, material_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [userId, materialId]
    )
    return true
  }

  private mapRow(row: any): TeachingMaterialItem {
    return {
      id: Number(row.id || 0),
      title: String(row.title || ''),
      dimensionCode: row.dimension_code as TeachingMaterialDimensionCode,
      moduleCode: row.module_code as ModuleCode,
      fileName: String(row.file_name || ''),
      fileType: String(row.file_type || ''),
      filePath: String(row.file_path || ''),
      fileSizeBytes: Number(row.file_size_bytes || 0),
      description: row.description ? String(row.description) : undefined,
      tags: splitTags(row.tags),
      sequenceOrder: row.sequence_order != null ? Number(row.sequence_order) : undefined,
      isFavorite: Number(row.is_favorite || 0) === 1,
      createdAt: row.created_at ? String(row.created_at) : undefined,
      updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    }
  }
}

function splitTags(value: unknown): string[] {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return []
  }

  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
}

function normalizeTagList(tags?: string[]): string[] {
  if (!Array.isArray(tags)) {
    return []
  }

  return tags
    .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
    .filter((tag, index, array) => tag.length > 0 && array.indexOf(tag) === index)
}
