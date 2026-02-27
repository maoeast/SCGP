/**
 * 训练计划 API 类
 *
 * 用于管理学生的 IEP 训练计划，支持：
 * - 跨模块资源编排（器材、游戏、课件等）
 * - 长短期目标管理
 * - 计划状态跟踪
 *
 * @module database/plan-api
 */

import { DatabaseAPI } from './api'
import type { ModuleCode } from '@/types/module'

// ========== 类型定义 ==========

/**
 * 计划状态枚举
 */
export type PlanStatus = 'draft' | 'active' | 'completed' | 'archived'

/**
 * 训练计划主表记录
 */
export interface TrainingPlan {
  id: number
  name: string
  student_id: number
  student_name?: string  // JOIN 查询时填充
  module_code: ModuleCode | 'all'
  start_date: string
  end_date: string
  status: PlanStatus
  long_term_goals: string | null  // JSON 字符串
  short_term_goals: string | null // JSON 字符串
  description: string | null
  created_at: string
  updated_at: string
}

/**
 * 计划资源关联表记录
 */
export interface PlanResourceMap {
  id: number
  plan_id: number
  resource_id: number
  // 以下字段通过 JOIN 填充
  resource_name?: string
  resource_type?: string
  cover_image?: string
  module_code?: string
  // 配置字段
  frequency: number | null       // 训练频次（次/周）
  duration_minutes: number | null // 时长建议
  notes: string | null           // 教学指导
  sort_order: number             // 排序
  created_at: string
}

/**
 * 创建计划参数
 */
export interface CreatePlanParams {
  name: string
  student_id: number
  module_code?: ModuleCode | 'all'
  start_date: string
  end_date: string
  status?: PlanStatus
  long_term_goals?: string[] | null
  short_term_goals?: string[] | null
  description?: string
}

/**
 * 更新计划参数
 */
export interface UpdatePlanParams {
  name?: string
  module_code?: ModuleCode | 'all'
  start_date?: string
  end_date?: string
  status?: PlanStatus
  long_term_goals?: string[] | null
  short_term_goals?: string[] | null
  description?: string
}

/**
 * 添加资源到计划参数
 */
export interface AddResourceToPlanParams {
  plan_id: number
  resource_id: number
  frequency?: number
  duration_minutes?: number
  notes?: string
  sort_order?: number
}

/**
 * 计划详情（包含关联资源）
 */
export interface PlanDetail extends TrainingPlan {
  resources: PlanResourceMap[]
}

// ========== API 类 ==========

/**
 * 训练计划 API 类
 */
export class PlanAPI extends DatabaseAPI {
  /**
   * 创建新计划
   */
  createPlan(params: CreatePlanParams): number {
    const {
      name,
      student_id,
      module_code = 'all',
      start_date,
      end_date,
      status = 'draft',
      long_term_goals = null,
      short_term_goals = null,
      description = null
    } = params

    // 将目标数组转为 JSON 字符串
    const ltGoalsJson = long_term_goals ? JSON.stringify(long_term_goals) : null
    const stGoalsJson = short_term_goals ? JSON.stringify(short_term_goals) : null

    this.execute(
      `INSERT INTO sys_training_plan (
        name, student_id, module_code, start_date, end_date, status,
        long_term_goals, short_term_goals, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, student_id, module_code, start_date, end_date, status, ltGoalsJson, stGoalsJson, description]
    )

    const result = this.getRawDb().exec('SELECT last_insert_rowid() as id')
    return result[0]?.values?.[0]?.[0] as number
  }

  /**
   * 根据 ID 获取计划（不含资源）
   */
  getPlanById(id: number): TrainingPlan | null {
    return this.get(
      `SELECT tp.*, s.name as student_name
       FROM sys_training_plan tp
       LEFT JOIN student s ON tp.student_id = s.id
       WHERE tp.id = ? AND tp.is_active = 1`,
      [id]
    ) as TrainingPlan | null
  }

  /**
   * 获取计划详情（包含关联资源）
   */
  getPlanDetail(id: number): PlanDetail | null {
    const plan = this.getPlanById(id)
    if (!plan) return null

    const resources = this.query(
      `SELECT
        prm.id,
        prm.plan_id,
        prm.resource_id,
        prm.frequency,
        prm.duration_minutes,
        prm.notes,
        prm.sort_order,
        prm.created_at,
        tr.name as resource_name,
        tr.resource_type,
        tr.cover_image,
        tr.module_code
       FROM sys_plan_resource_map prm
       INNER JOIN sys_training_resource tr ON prm.resource_id = tr.id
       WHERE prm.plan_id = ?
       ORDER BY prm.sort_order, prm.created_at`,
      [id]
    ) as PlanResourceMap[]

    return { ...plan, resources }
  }

  /**
   * 获取学生的所有计划
   */
  getStudentPlans(studentId: number): TrainingPlan[] {
    return this.query(
      `SELECT tp.*, s.name as student_name
       FROM sys_training_plan tp
       LEFT JOIN student s ON tp.student_id = s.id
       WHERE tp.student_id = ? AND tp.is_active = 1
       ORDER BY tp.created_at DESC`,
      [studentId]
    ) as TrainingPlan[]
  }

  /**
   * 获取所有计划（分页）
   */
  getAllPlans(options?: {
    status?: PlanStatus
    module_code?: ModuleCode | 'all'
    limit?: number
    offset?: number
  }): TrainingPlan[] {
    let sql = `
      SELECT tp.*, s.name as student_name
      FROM sys_training_plan tp
      LEFT JOIN student s ON tp.student_id = s.id
      WHERE tp.is_active = 1
    `
    const params: any[] = []

    if (options?.status) {
      sql += ` AND tp.status = ?`
      params.push(options.status)
    }

    if (options?.module_code) {
      sql += ` AND tp.module_code = ?`
      params.push(options.module_code)
    }

    sql += ` ORDER BY tp.updated_at DESC`

    if (options?.limit) {
      sql += ` LIMIT ?`
      params.push(options.limit)
      if (options?.offset) {
        sql += ` OFFSET ?`
        params.push(options.offset)
      }
    }

    return this.query(sql, params) as TrainingPlan[]
  }

  /**
   * 更新计划
   */
  updatePlan(id: number, params: UpdatePlanParams): boolean {
    const updates: string[] = []
    const values: any[] = []

    if (params.name !== undefined) {
      updates.push('name = ?')
      values.push(params.name)
    }
    if (params.module_code !== undefined) {
      updates.push('module_code = ?')
      values.push(params.module_code)
    }
    if (params.start_date !== undefined) {
      updates.push('start_date = ?')
      values.push(params.start_date)
    }
    if (params.end_date !== undefined) {
      updates.push('end_date = ?')
      values.push(params.end_date)
    }
    if (params.status !== undefined) {
      updates.push('status = ?')
      values.push(params.status)
    }
    if (params.long_term_goals !== undefined) {
      updates.push('long_term_goals = ?')
      values.push(params.long_term_goals ? JSON.stringify(params.long_term_goals) : null)
    }
    if (params.short_term_goals !== undefined) {
      updates.push('short_term_goals = ?')
      values.push(params.short_term_goals ? JSON.stringify(params.short_term_goals) : null)
    }
    if (params.description !== undefined) {
      updates.push('description = ?')
      values.push(params.description)
    }

    if (updates.length === 0) return false

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    this.execute(
      `UPDATE sys_training_plan SET ${updates.join(', ')} WHERE id = ?`,
      values
    )
    return true
  }

  /**
   * 更新计划状态
   */
  updatePlanStatus(id: number, status: PlanStatus): boolean {
    return this.updatePlan(id, { status })
  }

  /**
   * 软删除计划
   */
  deletePlan(id: number): boolean {
    this.execute(
      `UPDATE sys_training_plan SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    )
    return true
  }

  /**
   * 恢复已删除的计划
   */
  restorePlan(id: number): boolean {
    this.execute(
      `UPDATE sys_training_plan SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    )
    return true
  }

  // ========== 资源关联接口 ==========

  /**
   * 添加资源到计划
   */
  addResourceToPlan(params: AddResourceToPlanParams): number {
    const {
      plan_id,
      resource_id,
      frequency = null,
      duration_minutes = null,
      notes = null,
      sort_order = 0
    } = params

    // 检查是否已存在
    const existing = this.get(
      `SELECT id FROM sys_plan_resource_map WHERE plan_id = ? AND resource_id = ?`,
      [plan_id, resource_id]
    )

    if (existing) {
      // 已存在，更新配置
      this.execute(
        `UPDATE sys_plan_resource_map
         SET frequency = ?, duration_minutes = ?, notes = ?, sort_order = ?
         WHERE plan_id = ? AND resource_id = ?`,
        [frequency, duration_minutes, notes, sort_order, plan_id, resource_id]
      )
      return (existing as any).id
    }

    // 新增
    this.execute(
      `INSERT INTO sys_plan_resource_map (plan_id, resource_id, frequency, duration_minutes, notes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [plan_id, resource_id, frequency, duration_minutes, notes, sort_order]
    )

    const result = this.getRawDb().exec('SELECT last_insert_rowid() as id')
    return result[0]?.values?.[0]?.[0] as number
  }

  /**
   * 从计划中移除资源
   */
  removeResourceFromPlan(planId: number, resourceId: number): boolean {
    this.execute(
      `DELETE FROM sys_plan_resource_map WHERE plan_id = ? AND resource_id = ?`,
      [planId, resourceId]
    )
    return true
  }

  /**
   * 更新计划中的资源配置
   */
  updatePlanResource(
    planId: number,
    resourceId: number,
    params: {
      frequency?: number
      duration_minutes?: number
      notes?: string
      sort_order?: number
    }
  ): boolean {
    const updates: string[] = []
    const values: any[] = []

    if (params.frequency !== undefined) {
      updates.push('frequency = ?')
      values.push(params.frequency)
    }
    if (params.duration_minutes !== undefined) {
      updates.push('duration_minutes = ?')
      values.push(params.duration_minutes)
    }
    if (params.notes !== undefined) {
      updates.push('notes = ?')
      values.push(params.notes)
    }
    if (params.sort_order !== undefined) {
      updates.push('sort_order = ?')
      values.push(params.sort_order)
    }

    if (updates.length === 0) return false

    values.push(planId, resourceId)

    this.execute(
      `UPDATE sys_plan_resource_map SET ${updates.join(', ')} WHERE plan_id = ? AND resource_id = ?`,
      values
    )
    return true
  }

  /**
   * 获取计划中的所有资源
   */
  getPlanResources(planId: number): PlanResourceMap[] {
    return this.query(
      `SELECT
        prm.id,
        prm.plan_id,
        prm.resource_id,
        prm.frequency,
        prm.duration_minutes,
        prm.notes,
        prm.sort_order,
        prm.created_at,
        tr.name as resource_name,
        tr.resource_type,
        tr.cover_image,
        tr.module_code,
        tr.category
       FROM sys_plan_resource_map prm
       INNER JOIN sys_training_resource tr ON prm.resource_id = tr.id
       WHERE prm.plan_id = ?
       ORDER BY prm.sort_order, prm.created_at`,
      [planId]
    ) as PlanResourceMap[]
  }

  /**
   * 批量添加资源到计划
   */
  batchAddResources(planId: number, resources: Array<{
    resource_id: number
    frequency?: number
    duration_minutes?: number
    notes?: string
  }>): number {
    let added = 0
    for (const resource of resources) {
      try {
        this.addResourceToPlan({
          plan_id: planId,
          ...resource,
          sort_order: added
        })
        added++
      } catch (error) {
        console.warn(`[PlanAPI] 批量添加资源失败: ${resource.resource_id}`, error)
      }
    }
    return added
  }

  // ========== 统计接口 ==========

  /**
   * 获取计划统计
   */
  getPlanStats(planId: number): {
    total_resources: number
    by_type: Record<string, number>
    by_module: Record<string, number>
  } {
    const totalResult = this.queryOne(
      `SELECT COUNT(*) as count FROM sys_plan_resource_map WHERE plan_id = ?`,
      [planId]
    )
    const total_resources = (totalResult as any)?.count || 0

    const byType = this.query(
      `SELECT tr.resource_type, COUNT(*) as count
       FROM sys_plan_resource_map prm
       INNER JOIN sys_training_resource tr ON prm.resource_id = tr.id
       WHERE prm.plan_id = ?
       GROUP BY tr.resource_type`,
      [planId]
    ) as Array<{ resource_type: string; count: number }>

    const byModule = this.query(
      `SELECT tr.module_code, COUNT(*) as count
       FROM sys_plan_resource_map prm
       INNER JOIN sys_training_resource tr ON prm.resource_id = tr.id
       WHERE prm.plan_id = ?
       GROUP BY tr.module_code`,
      [planId]
    ) as Array<{ module_code: string; count: number }>

    return {
      total_resources,
      by_type: byType.reduce((acc, { resource_type, count }) => {
        acc[resource_type] = count
        return acc
      }, {} as Record<string, number>),
      by_module: byModule.reduce((acc, { module_code, count }) => {
        acc[module_code] = count
        return acc
      }, {} as Record<string, number>)
    }
  }

  /**
   * 获取今日已完成的训练资源
   * 返回学生ID和资源ID的组合集合
   */
  getTodayCompletedResources(): Set<string> {
    const today = new Date().toISOString().split('T')[0]
    const completedSet = new Set<string>()

    try {
      const records = this.query(`
        SELECT DISTINCT student_id, equipment_id as resource_id
        FROM equipment_training_records
        WHERE date(training_date) = date(?)
      `, [today]) as Array<{ student_id: number; resource_id: number }>

      for (const record of records) {
        completedSet.add(`${record.student_id}-${record.resource_id}`)
      }
    } catch (error) {
      console.error('[PlanAPI] 获取今日训练记录失败:', error)
    }

    return completedSet
  }
}
