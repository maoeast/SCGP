/**
 * 通用资源 API 类
 *
 * 支持多模块、多资源类型的统一查询接口
 * 替代原有的 EquipmentAPI 等硬编码的资源查询
 *
 * @module database/resource-api
 */

import { DatabaseAPI } from './api'
import type { ModuleCode, ResourceItem, ResourceQueryOptions } from '@/types/module'

/**
 * 通用资源 API 类
 *
 * 提供统一的资源查询接口，支持：
 * - 多模块查询（SENSORY, EMOTIONAL, SOCIAL 等）
 * - 多资源类型查询（equipment, flashcard, game 等）
 * - 数据库端筛选（category, keyword, tags）
 * - 分类统计（用于 UI 显示筛选按钮数量）
 */
export class ResourceAPI extends DatabaseAPI {
  /**
   * 根据查询选项获取资源列表
   *
   * 所有筛选都在 SQL 层面完成，避免前端处理大量数据
   *
   * @param options 查询选项
   * @param options.moduleCode - 模块代码（必需）
   * @param options.resourceType - 资源类型（可选）
   * @param options.category - 资源分类（可选）
   * @param options.keyword - 搜索关键词（可选，匹配名称、描述、标签）
   * @param options.tags - 标签筛选（可选）
   * @param options.favoritesOnly - 仅显示收藏（可选）
   * @returns 统一格式的资源列表
   */
  getResources(options: ResourceQueryOptions): ResourceItem[] {
    // 验证必需参数
    if (!options.moduleCode) {
      throw new Error('ResourceAPI.getResources: moduleCode is required')
    }

    // 构建 SELECT 子句
    const selectFields = `
      tr.id,
      tr.module_code,
      tr.resource_type,
      tr.name,
      tr.category,
      tr.description,
      tr.cover_image,
      tr.is_custom,
      tr.is_active,
      tr.usage_count,
      tr.created_at,
      tr.updated_at,
      tr.legacy_id,
      tr.legacy_source,
      tr.meta_data,
      -- 聚合标签（GROUP_CONCAT）
      (
        SELECT GROUP_CONCAT(t.name, ',')
        FROM sys_tags t
        JOIN sys_resource_tag_map m ON t.id = m.tag_id
        WHERE m.resource_id = tr.id
      ) as tags
    `

    // 构建 FROM 和 JOIN 子句
    let sql = `
      FROM sys_training_resource tr
      WHERE tr.is_active = 1
        AND tr.module_code = ?
    `

    const params: any[] = [options.moduleCode]

    // 添加资源类型筛选
    if (options.resourceType) {
      sql += ` AND tr.resource_type = ?`
      params.push(options.resourceType)
    }

    // 添加分类筛选
    if (options.category && options.category !== 'all') {
      sql += ` AND tr.category = ?`
      params.push(options.category)
    }

    // 添加关键词搜索（匹配名称、描述、标签）
    if (options.keyword) {
      sql += ` AND (
        tr.name LIKE ?
        OR tr.description LIKE ?
        OR tr.category LIKE ?
        OR EXISTS (
          SELECT 1 FROM sys_resource_tag_map m2
          INNER JOIN sys_tags t2 ON m2.tag_id = t2.id
          WHERE m2.resource_id = tr.id
            AND t2.name LIKE ?
        )
      )`
      const pattern = `%${options.keyword}%`
      params.push(pattern, pattern, pattern, pattern)
    }

    // 添加标签筛选
    if (options.tags && options.tags.length > 0) {
      // 使用 EXISTS 子查询检查资源是否包含所有指定标签
      for (const tag of options.tags) {
        sql += ` AND EXISTS (
          SELECT 1 FROM sys_resource_tag_map m3
          INNER JOIN sys_tags t3 ON m3.tag_id = t3.id
          WHERE m3.resource_id = tr.id
            AND t3.name = ?
        )`
        params.push(tag)
      }
    }

    // 添加仅显示收藏筛选
    if (options.favoritesOnly) {
      // TODO: 实现 favorites 筛选（需要 sys_favorites 表）
      // sql += ` AND EXISTS (
      //   SELECT 1 FROM sys_favorites f
      //   WHERE f.resource_id = tr.id
      //     AND f.user_id = ?
      // )`
      // params.push(currentUserId)
    }

    // 组装完整查询
    const fullSql = `
      SELECT ${selectFields}
      ${sql}
      ORDER BY tr.usage_count DESC, tr.created_at DESC
    `

    console.log('[ResourceAPI.getResources] SQL:', fullSql)
    console.log('[ResourceAPI.getResources] Params:', params)

    const results = this.query(fullSql, params)

    // 转换为统一的 ResourceItem 格式
    return results.map((row: any) => this.mapToResourceItem(row))
  }

  /**
   * 获取所有资源（包括已禁用的）- 用于管理界面
   *
   * @param options 查询选项（moduleCode 为必需）
   * @returns 统一格式的资源列表（包括 is_active = 0 的资源）
   */
  getAllResourcesForAdmin(options: ResourceQueryOptions): ResourceItem[] {
    // 验证必需参数
    if (!options.moduleCode) {
      throw new Error('ResourceAPI.getAllResourcesForAdmin: moduleCode is required')
    }

    // 构建 SELECT 子句
    const selectFields = `
      tr.id,
      tr.module_code,
      tr.resource_type,
      tr.name,
      tr.category,
      tr.description,
      tr.cover_image,
      tr.is_custom,
      tr.is_active,
      tr.usage_count,
      tr.created_at,
      tr.updated_at,
      tr.legacy_id,
      tr.legacy_source,
      tr.meta_data,
      (
        SELECT GROUP_CONCAT(t.name, ',')
        FROM sys_tags t
        JOIN sys_resource_tag_map m ON t.id = m.tag_id
        WHERE m.resource_id = tr.id
      ) as tags
    `

    // 构建 FROM 和 JOIN 子句 - 注意：不限制 is_active
    let sql = `
      FROM sys_training_resource tr
      WHERE tr.module_code = ?
    `

    const params: any[] = [options.moduleCode]

    // 添加资源类型筛选
    if (options.resourceType) {
      sql += ` AND tr.resource_type = ?`
      params.push(options.resourceType)
    }

    // 添加分类筛选
    if (options.category && options.category !== 'all') {
      sql += ` AND tr.category = ?`
      params.push(options.category)
    }

    // 添加关键词搜索
    if (options.keyword) {
      sql += ` AND (
        tr.name LIKE ?
        OR tr.description LIKE ?
        OR tr.category LIKE ?
        OR EXISTS (
          SELECT 1 FROM sys_resource_tag_map m2
          INNER JOIN sys_tags t2 ON m2.tag_id = t2.id
          WHERE m2.resource_id = tr.id
            AND t2.name LIKE ?
        )
      )`
      const pattern = `%${options.keyword}%`
      params.push(pattern, pattern, pattern, pattern)
    }

    // 组装完整查询 - 系统资源排在前面，然后按状态排序
    const fullSql = `
      SELECT ${selectFields}
      ${sql}
      ORDER BY tr.is_active DESC, tr.is_custom ASC, tr.usage_count DESC, tr.created_at DESC
    `

    console.log('[ResourceAPI.getAllResourcesForAdmin] SQL:', fullSql)
    console.log('[ResourceAPI.getAllResourcesForAdmin] Params:', params)

    const results = this.query(fullSql, params)
    return results.map((row: any) => this.mapToResourceItem(row))
  }

  /**
   * 根据 ID 获取单个资源
   *
   * @param id 资源 ID
   * @param moduleCode 模块代码（可选，用于优化查询）
   * @returns 资源对象或 null
   */
  getResourceById(id: number, moduleCode?: ModuleCode): ResourceItem | null {
    let sql = `
      SELECT
        tr.id,
        tr.module_code,
        tr.resource_type,
        tr.name,
        tr.category,
        tr.description,
        tr.cover_image,
        tr.is_custom,
        tr.is_active,
        tr.usage_count,
        tr.created_at,
        tr.updated_at,
        tr.legacy_id,
        tr.legacy_source,
        tr.meta_data,
        (
          SELECT GROUP_CONCAT(t.name, ',')
          FROM sys_tags t
          JOIN sys_resource_tag_map m ON t.id = m.tag_id
          WHERE m.resource_id = tr.id
        ) as tags
      FROM sys_training_resource tr
      WHERE tr.id = ?
        AND tr.is_active = 1
    `

    const params: any[] = [id]

    // 添加模块代码筛选（用于优化查询）
    if (moduleCode) {
      sql += ` AND tr.module_code = ?`
      params.push(moduleCode)
    }

    const row = this.queryOne(sql, params)
    return row ? this.mapToResourceItem(row) : null
  }

  /**
   * 根据 legacy_id 获取资源
   *
   * 用于从旧系统迁移数据时的兼容性查询
   *
   * @param legacyId 旧表 ID
   * @param legacySource 旧表名称（如 'equipment_catalog'）
   * @returns 资源对象或 null
   */
  getResourceByLegacyId(legacyId: number, legacySource: string): ResourceItem | null {
    const sql = `
      SELECT
        tr.id,
        tr.module_code,
        tr.resource_type,
        tr.name,
        tr.category,
        tr.description,
        tr.cover_image,
        tr.is_custom,
        tr.is_active,
        tr.usage_count,
        tr.created_at,
        tr.updated_at,
        tr.legacy_id,
        tr.legacy_source,
        tr.meta_data,
        (
          SELECT GROUP_CONCAT(t.name, ',')
          FROM sys_tags t
          JOIN sys_resource_tag_map m ON t.id = m.tag_id
          WHERE m.resource_id = tr.id
        ) as tags
      FROM sys_training_resource tr
      WHERE tr.legacy_id = ?
        AND tr.legacy_source = ?
        AND tr.is_active = 1
    `

    const row = this.queryOne(sql, [legacyId, legacySource])
    return row ? this.mapToResourceItem(row) : null
  }

  /**
   * 获取资源分类统计
   *
   * 用于 UI 显示每个分类的资源数量
   *
   * @param moduleCode 模块代码
   * @param resourceType 资源类型（可选）
   * @returns 分类数量映射对象 { category: count }
   */
  getCategoryCounts(moduleCode: ModuleCode, resourceType?: string): Record<string, number> {
    let sql = `
      SELECT
        tr.category,
        COUNT(*) as count
      FROM sys_training_resource tr
      WHERE tr.is_active = 1
        AND tr.module_code = ?
    `

    const params: any[] = [moduleCode]

    // 添加资源类型筛选
    if (resourceType) {
      sql += ` AND tr.resource_type = ?`
      params.push(resourceType)
    }

    sql += ` GROUP BY tr.category`

    const results = this.query(sql, params)

    // 转换为 { category: count } 格式
    const counts: Record<string, number> = { all: 0 }
    results.forEach((row: any) => {
      counts[row.category] = row.count
      counts.all += row.count
    })

    return counts
  }

  // ============================================
  // CRUD 操作（写入接口）
  // ============================================

  /**
   * 创建新资源
   *
   * @param data 资源数据
   * @returns 新资源的 ID
   */
  addResource(data: {
    moduleCode: ModuleCode
    resourceType: string
    name: string
    category: string
    description?: string
    coverImage?: string
    tags?: string[]
    metadata?: any
  }): number {
    // 插入资源记录
    this.execute(`
      INSERT INTO sys_training_resource (
        module_code, resource_type, name, category, description,
        cover_image, is_custom, is_active, meta_data, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, datetime('now'), datetime('now'))
    `, [
      data.moduleCode,
      data.resourceType,
      data.name,
      data.category,
      data.description || null,
      data.coverImage || null,
      data.metadata ? JSON.stringify(data.metadata) : null
    ])

    // 获取新插入的资源 ID
    const result = this.queryOne('SELECT last_insert_rowid() as id', [])
    const resourceId = result?.id

    // 处理标签（如果有）
    if (resourceId && data.tags && data.tags.length > 0) {
      for (const tagName of data.tags) {
        this.addTagToResource(resourceId, tagName, 'ability')
      }
    }

    console.log(`[ResourceAPI.addResource] 创建资源成功: ID=${resourceId}, name=${data.name}`)
    return resourceId
  }

  /**
   * 更新资源信息
   *
   * @param id 资源 ID
   * @param data 要更新的字段
   * @returns 是否更新成功
   */
  updateResource(id: number, data: {
    name?: string
    category?: string
    description?: string
    coverImage?: string
    tags?: string[]
    metadata?: any
  }): boolean {
    // 检查资源是否存在
    const existing = this.getResourceById(id)
    if (!existing) {
      console.warn(`[ResourceAPI.updateResource] 资源不存在: ID=${id}`)
      return false
    }

    // 构建 UPDATE 语句
    const updates: string[] = []
    const params: any[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      params.push(data.name)
    }
    if (data.category !== undefined) {
      updates.push('category = ?')
      params.push(data.category)
    }
    if (data.description !== undefined) {
      updates.push('description = ?')
      params.push(data.description)
    }
    if (data.coverImage !== undefined) {
      updates.push('cover_image = ?')
      params.push(data.coverImage)
    }
    if (data.metadata !== undefined) {
      updates.push('meta_data = ?')
      params.push(data.metadata ? JSON.stringify(data.metadata) : null)
    }

    // 总是更新 updated_at
    updates.push("updated_at = datetime('now')")

    if (updates.length === 1) {
      // 只有 updated_at，没有实际更新
      console.log(`[ResourceAPI.updateResource] 无需更新的字段: ID=${id}`)
      return true
    }

    params.push(id)

    this.execute(`
      UPDATE sys_training_resource
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params)

    // 处理标签更新（如果提供了 tags）
    if (data.tags !== undefined) {
      // 先删除旧标签关联
      this.execute('DELETE FROM sys_resource_tag_map WHERE resource_id = ?', [id])

      // 添加新标签
      for (const tagName of data.tags) {
        this.addTagToResource(id, tagName, 'ability')
      }
    }

    console.log(`[ResourceAPI.updateResource] 更新资源成功: ID=${id}`)
    return true
  }

  /**
   * 软删除资源（将 is_active 设为 0）
   *
   * 重要：软删除保证历史业务数据的关联完整性
   *
   * @param id 资源 ID
   * @returns 是否删除成功
   */
  deleteResource(id: number): boolean {
    // 检查资源是否存在
    const existing = this.queryOne(
      'SELECT id, name FROM sys_training_resource WHERE id = ?',
      [id]
    )

    if (!existing) {
      console.warn(`[ResourceAPI.deleteResource] 资源不存在: ID=${id}`)
      return false
    }

    // 软删除：设置 is_active = 0
    this.execute(`
      UPDATE sys_training_resource
      SET is_active = 0, updated_at = datetime('now')
      WHERE id = ?
    `, [id])

    console.log(`[ResourceAPI.deleteResource] 软删除资源成功: ID=${id}, name=${existing.name}`)
    return true
  }

  /**
   * 恢复已软删除的资源
   *
   * @param id 资源 ID
   * @returns 是否恢复成功
   */
  restoreResource(id: number): boolean {
    this.execute(`
      UPDATE sys_training_resource
      SET is_active = 1, updated_at = datetime('now')
      WHERE id = ?
    `, [id])

    console.log(`[ResourceAPI.restoreResource] 恢复资源成功: ID=${id}`)
    return true
  }

  /**
   * 永久删除资源（物理删除）
   *
   * 警告：此操作不可逆，会破坏历史数据关联
   * 仅建议在确认无历史关联数据时使用
   *
   * @param id 资源 ID
   * @returns 是否删除成功
   */
  hardDeleteResource(id: number): boolean {
    // 先删除标签关联
    this.execute('DELETE FROM sys_resource_tag_map WHERE resource_id = ?', [id])

    // 删除收藏关联
    this.execute('DELETE FROM sys_favorites WHERE resource_id = ?', [id])

    // 删除资源本身
    this.execute('DELETE FROM sys_training_resource WHERE id = ?', [id])

    console.log(`[ResourceAPI.hardDeleteResource] 永久删除资源: ID=${id}`)
    return true
  }

  /**
   * 增加资源使用次数
   *
   * @param id 资源 ID
   */
  incrementUsageCount(id: number): void {
    this.execute(`
      UPDATE sys_training_resource
      SET usage_count = usage_count + 1, updated_at = datetime('now')
      WHERE id = ?
    `, [id])
  }

  /**
   * 为资源添加标签
   *
   * @param resourceId 资源 ID
   * @param tagName 标签名称
   * @param domain 标签域（ability, symptom 等）
   */
  private addTagToResource(resourceId: number, tagName: string, domain: string): void {
    // 查找或创建标签
    let tag = this.queryOne(
      'SELECT id FROM sys_tags WHERE domain = ? AND name = ?',
      [domain, tagName]
    )

    if (!tag) {
      // 创建新标签
      this.execute(
        'INSERT INTO sys_tags (domain, name, usage_count, is_preset) VALUES (?, ?, 0, 0)',
        [domain, tagName]
      )
      const result = this.queryOne('SELECT last_insert_rowid() as id', [])
      tag = { id: result?.id }
    }

    // 创建资源-标签关联（忽略重复）
    if (tag?.id) {
      this.execute(
        'INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id) VALUES (?, ?)',
        [resourceId, tag.id]
      )

      // 更新标签使用次数
      this.execute(
        'UPDATE sys_tags SET usage_count = usage_count + 1 WHERE id = ?',
        [tag.id]
      )
    }
  }

  /**
   * 将数据库行映射为 ResourceItem 对象
   *
   * @param row 数据库行对象
   * @returns ResourceItem 对象
   */
  private mapToResourceItem(row: any): ResourceItem {
    // 解析标签字符串为数组
    const tags = row.tags
      ? row.tags.split(',').filter((tag: string) => tag.trim().length > 0)
      : []

    // 解析元数据
    let metadata: any = undefined
    if (row.meta_data) {
      try {
        metadata = JSON.parse(row.meta_data)
      } catch (e) {
        console.warn('[ResourceAPI] Failed to parse metadata:', row.meta_data)
      }
    }

    return {
      id: row.id,
      moduleCode: row.module_code,
      resourceType: row.resource_type,
      name: row.name,
      category: row.category,
      description: row.description || undefined,
      coverImage: row.cover_image || undefined,
      isCustom: row.is_custom === 1,
      isActive: row.is_active === 1,
      usageCount: row.usage_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      legacyId: row.legacy_id || undefined,
      legacySource: row.legacy_source || undefined,
      metadata,
      tags
    }
  }
}
