/**
 * 班级管理 API
 *
 * Phase: 班级管理模块
 * 职责: 处理所有班级相关的数据库操作
 */

import { getDatabase } from './init'
import { generateClassName, CLASS_CONFIG, ClassChangeReason } from '@/types/class'
import { useAuthStore } from '@/stores/auth'
import type {
  ClassInfo,
  CreateClassParams,
  UpdateClassParams,
  StudentClassHistory,
  ClassChangeRequest,
  BatchClassAssignmentRequest,
  GradeUpgradeRequest,
  ClassStatistics,
  ClassQueryOptions,
  StudentClassInfo,
  ClassStudentItem,
  AcademicYear,
  GradeLevel,
  ClassNumber,
  ClassStatus,
  UnifiedClassStatistics,
  ClassStatisticsOptions
} from '@/types/class'

/**
 * 班级管理 API 类
 */
export class ClassAPI {
  private db: any

  constructor() {
    this.db = getDatabase()
  }

  /**
   * 强制立即保存（绕过防抖）
   *
   * 用途：在关键数据操作后立即落盘，防止数据丢失
   * 调用时机：createClass, updateClass, deleteClass 等关键操作后
   */
  protected async forceSave(): Promise<void> {
    if (this.db && typeof this.db.saveNow === 'function') {
      try {
        await this.db.saveNow()
        console.log('[ClassAPI] 强制保存完成')
      } catch (error) {
        console.error('[ClassAPI] 强制保存失败:', error)
      }
    }
  }

  // ==================== 班级 CRUD ====================

  /**
   * 创建班级（异步，立即落盘）
   *
   * @throws {Error} 如果班级已存在（同一学年、年级、班号组合）
   */
  async createClass(params: CreateClassParams): Promise<number> {
    const { gradeLevel, classNumber, academicYear, maxStudents = CLASS_CONFIG.DEFAULT_MAX_STUDENTS, name: customName } = params
    // 如果提供了自定义名称，使用自定义名称；否则自动生成
    const name = customName || generateClassName(gradeLevel, classNumber)

    // ========== 前置检查：验证班级是否已存在 ==========
    const existing = this.db.get(`
      SELECT id, name FROM sys_class
      WHERE academic_year = ? AND grade_level = ? AND class_number = ?
    `, [academicYear, gradeLevel, classNumber])

    if (existing) {
      throw new Error(`当前学年已存在 ${gradeLevel}年级${classNumber}班（${existing.name}），请勿重复创建`)
    }

    // ========== 执行插入 ==========
    const result = this.db.run(`
      INSERT INTO sys_class (name, grade_level, class_number, academic_year, max_students)
      VALUES (?, ?, ?, ?, ?)
    `, [name, gradeLevel, classNumber, academicYear, maxStudents])

    // ========== 立即落盘，防止数据丢失 ==========
    await this.forceSave()

    return result.lastInsertRowid
  }

  /**
   * 批量创建班级（异步，立即落盘，跳过已存在的班级）
   *
   * @returns 返回成功创建的班级 ID 数组
   */
  async createClassesBatch(paramsArray: CreateClassParams[]): Promise<number[]> {
    const ids: number[] = []
    const skipped: string[] = []

    for (const params of paramsArray) {
      try {
        const id = await this.createClass(params)
        ids.push(id)
      } catch (error: any) {
        // 如果是班级已存在的错误，记录并跳过
        if (error.message.includes('已存在')) {
          skipped.push(`${params.gradeLevel}年级${params.classNumber}班`)
        } else {
          // 其他错误重新抛出
          throw error
        }
      }
    }

    // 记录跳过的班级
    if (skipped.length > 0) {
      console.warn('[ClassAPI] 批量创建班级时跳过已存在的班级:', skipped)
    }

    // 批量创建完成后再次落盘
    if (ids.length > 0) {
      await this.forceSave()
    }

    return ids
  }

  /**
   * 获取班级信息
   */
  getClass(id: number): ClassInfo | null {
    const row = this.db.get(`
      SELECT * FROM sys_class WHERE id = ?
    `, [id])

    return row ? this.mapToClassInfo(row) : null
  }

  /**
   * 获取所有班级（可按条件筛选）
   * 权限控制：老师只能看到自己负责的班级
   */
  getClasses(options?: ClassQueryOptions): ClassInfo[] {
    let sql = 'SELECT c.* FROM sys_class c WHERE 1=1'
    const params: any[] = []

    // 权限过滤：老师只能看到自己负责的班级
    try {
      const authStore = useAuthStore()
      if (authStore.isTeacher && authStore.user) {
        // 老师只能看到自己负责的班级
        sql += ' AND EXISTS (SELECT 1 FROM sys_class_teachers ct WHERE ct.class_id = c.id AND ct.teacher_id = ?)'
        params.push(authStore.user.id)
      }
    } catch {
      // auth store 可能不可用（如初始化阶段），跳过权限检查
    }

    if (options?.academicYear) {
      sql += ' AND c.academic_year = ?'
      params.push(options.academicYear)
    }

    if (options?.gradeLevel !== undefined) {
      sql += ' AND c.grade_level = ?'
      params.push(options.gradeLevel)
    }

    if (options?.status !== undefined) {
      sql += ' AND c.status = ?'
      params.push(options.status)
    }

    sql += ' ORDER BY c.grade_level, c.class_number'

    const rows = this.db.all(sql, params)
    return rows.map((row: any) => this.mapToClassInfo(row))
  }

  /**
   * 更新班级信息（异步，立即落盘）
   */
  async updateClass(params: UpdateClassParams): Promise<boolean> {
    const { id, maxStudents, status } = params
    const updates: string[] = []
    const values: any[] = []

    if (maxStudents !== undefined) {
      updates.push('max_students = ?')
      values.push(maxStudents)
    }

    if (status !== undefined) {
      updates.push('status = ?')
      values.push(status)
    }

    if (updates.length === 0) return false

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const result = this.db.run(`
      UPDATE sys_class
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values)

    // ========== 立即落盘，防止数据丢失 ==========
    await this.forceSave()

    return result.changes > 0
  }

  /**
   * 删除班级（异步，立即落盘，如果有学生则不允许删除）
   */
  async deleteClass(id: number): Promise<boolean> {
    // 检查是否有在籍学生
    const studentCount = this.db.get(`
      SELECT COUNT(*) as count
      FROM student_class_history
      WHERE class_id = ? AND is_current = 1
    `, [id])

    if (studentCount.count > 0) {
      throw new Error('班级中有在籍学生，无法删除')
    }

    const result = this.db.run(`
      DELETE FROM sys_class WHERE id = ?
    `, [id])

    // ========== 立即落盘，防止数据丢失 ==========
    await this.forceSave()

    return result.changes > 0
  }

  // ==================== 学生分班操作 ====================

  /**
   * 学生入班（单个，异步，立即落盘）
   */
  async assignStudentToClass(
    studentId: number,
    studentName: string,
    classId: number,
    academicYear: AcademicYear,
    enrollmentDate: string
  ): Promise<number> {
    // 检查班级容量
    const classInfo = this.getClass(classId)
    if (!classInfo) {
      throw new Error('班级不存在')
    }

    if (classInfo.currentEnrollment >= classInfo.maxStudents) {
      throw new Error('班级人数已达上限')
    }

    // 检查学生是否已在当前学年的班级中
    const existing = this.db.get(`
      SELECT id FROM student_class_history
      WHERE student_id = ? AND academic_year = ?
    `, [studentId, academicYear])

    if (existing) {
      throw new Error('学生已在本学年班级中')
    }

    // 获取班级信息
    const className = classInfo.name

    // 创建班级历史记录
    const result = this.db.run(`
      INSERT INTO student_class_history
      (student_id, student_name, class_id, class_name, academic_year, enrollment_date, is_current)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [studentId, studentName, classId, className, academicYear, enrollmentDate])

    // 更新学生表的当前班级
    this.db.run(`
      UPDATE student
      SET current_class_id = ?, current_class_name = ?
      WHERE id = ?
    `, [classId, className, studentId])

    // ========== 立即落盘，防止数据丢失 ==========
    await this.forceSave()

    return result.lastInsertRowid
  }

  /**
   * 批量学生入班（异步，立即落盘）
   */
  async assignStudentsBatch(request: BatchClassAssignmentRequest): Promise<number[]> {
    const { studentIds, classId, academicYear, enrollmentDate } = request
    const historyIds: number[] = []

    for (const studentId of studentIds) {
      // 获取学生信息
      const student = this.db.get('SELECT id, name FROM student WHERE id = ?', [studentId])
      if (!student) continue

      try {
        const historyId = await this.assignStudentToClass(
          studentId,
          student.name,
          classId,
          academicYear,
          enrollmentDate
        )
        historyIds.push(historyId)
      } catch (error: any) {
        console.error(`学生 ${student.name} 分班失败:`, error.message)
      }
    }

    // 批量分配完成后再次落盘
    if (historyIds.length > 0) {
      await this.forceSave()
    }

    return historyIds
  }

  /**
   * 学生转班（异步 + 立即保存）
   */
  async changeStudentClass(request: ClassChangeRequest): Promise<boolean> {
    const { studentId, oldClassId, newClassId, academicYear, changeDate, reason } = request

    // 获取学生信息
    const student = this.db.get('SELECT name FROM student WHERE id = ?', [studentId])
    if (!student) {
      throw new Error('学生不存在')
    }

    // 获取新班级信息
    const newClass = this.getClass(newClassId)
    if (!newClass) {
      throw new Error('新班级不存在')
    }

    // 检查新班级容量
    if (newClass.currentEnrollment >= newClass.maxStudents) {
      throw new Error('新班级人数已达上限')
    }

    // 关闭旧班级历史记录
    if (oldClassId) {
      this.db.run(`
        UPDATE student_class_history
        SET is_current = 0, leave_date = ?, leave_reason = ?
        WHERE student_id = ? AND class_id = ? AND is_current = 1
      `, [changeDate, reason, studentId, oldClassId])
    }

    // 创建新班级历史记录
    this.db.run(`
      INSERT INTO student_class_history
      (student_id, student_name, class_id, class_name, academic_year, enrollment_date, is_current)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [studentId, student.name, newClassId, newClass.name, academicYear, changeDate])

    // 更新学生表的当前班级
    this.db.run(`
      UPDATE student
      SET current_class_id = ?, current_class_name = ?
      WHERE id = ?
    `, [newClassId, newClass.name, studentId])

    // 立即保存，防止数据丢失
    await this.forceSave()

    return true
  }

  /**
   * 学年升级（批量）（异步 + 立即保存）
   */
  async upgradeGrade(request: GradeUpgradeRequest): Promise<number> {
    const { academicYear, upgradeDate, createNewClasses } = request
    let upgradeCount = 0

    // 获取当前学年的所有学生
    const currentStudents = this.db.all(`
      SELECT s.id, s.name, s.current_class_id, sc.grade_level
      FROM student s
      INNER JOIN sys_class sc ON s.current_class_id = sc.id
      WHERE sc.status = 1
    `)

    for (const student of currentStudents) {
      const newGradeLevel = student.grade_level + 1 as GradeLevel

      // 如果超过6年级，标记为毕业
      if (newGradeLevel > 6) {
        this.db.run(`
          UPDATE student_class_history
          SET is_current = 0, leave_date = ?, leave_reason = ?
          WHERE student_id = ? AND is_current = 1
        `, [upgradeDate, 'graduate', student.id])

        this.db.run(`
          UPDATE student
          SET current_class_id = NULL, current_class_name = NULL
          WHERE id = ?
        `, [student.id])
        upgradeCount++
        continue
      }

      // 查找或创建新班级
      let newClassId: number

      if (createNewClasses) {
        // 尝试查找新学年对应班级
        const existingClass = this.db.get(`
          SELECT id FROM sys_class
          WHERE academic_year = ? AND grade_level = ? AND class_number = 1
        `, [academicYear, newGradeLevel])

        if (existingClass) {
          newClassId = existingClass.id
        } else {
          // 创建新班级（async，需要 await）
          newClassId = await this.createClass({
            gradeLevel: newGradeLevel,
            classNumber: 1,
            academicYear
          })
        }
      } else {
        // 查找新学年对应班级
        const existingClass = this.db.get(`
          SELECT id FROM sys_class
          WHERE academic_year = ? AND grade_level = ? AND class_number = 1
        `, [academicYear, newGradeLevel])

        if (!existingClass) {
          throw new Error(`找不到 ${newGradeLevel} 年级班级，请先创建班级`)
        }
        newClassId = existingClass.id
      }

      // 执行升级（async，需要 await）
      try {
        await this.changeStudentClass({
          studentId: student.id,
          oldClassId: student.current_class_id,
          newClassId,
          academicYear,
          changeDate: upgradeDate,
          reason: ClassChangeReason.UPGRADE
        })
        upgradeCount++
      } catch (error: any) {
        console.error(`学生 ${student.name} 升级失败:`, error.message)
      }
    }

    // 批量操作结束后立即保存
    await this.forceSave()

    return upgradeCount
  }

  // ==================== 查询操作 ====================

  /**
   * 获取班级学生列表
   */
  getClassStudents(classId: number): ClassStudentItem[] {
    const rows = this.db.all(`
      SELECT
        s.id as student_id,
        s.name as student_name,
        s.gender,
        sch.enrollment_date,
        sch.leave_date
      FROM student_class_history sch
      INNER JOIN student s ON sch.student_id = s.id
      WHERE sch.class_id = ? AND sch.is_current = 1
      ORDER BY s.name
    `, [classId])

    return rows.map((row: any) => ({
      studentId: row.student_id,
      studentName: row.student_name,
      gender: row.gender,
      enrollmentDate: row.enrollment_date,
      leaveDate: row.leave_date
    }))
  }

  /**
   * 获取学生班级信息（含历史）
   */
  getStudentClassInfo(studentId: number): StudentClassInfo {
    // 获取学生基本信息
    const student = this.db.get('SELECT id, name, current_class_id, current_class_name FROM student WHERE id = ?', [studentId])

    if (!student) {
      throw new Error('学生不存在')
    }

    // 获取当前班级信息
    let currentClass: any = null
    if (student.current_class_id) {
      const cls = this.getClass(student.current_class_id)
      if (cls) {
        currentClass = {
          id: cls.id,
          name: cls.name,
          academicYear: cls.academicYear
        }
      }
    }

    // 获取历史记录
    const historyRows = this.db.all(`
      SELECT
        id, student_id, student_name, class_id, class_name,
        academic_year, enrollment_date, leave_date, leave_reason,
        is_current, created_at
      FROM student_class_history
      WHERE student_id = ?
      ORDER BY enrollment_date DESC
    `, [studentId])

    const history: StudentClassHistory[] = historyRows.map((row: any) => ({
      id: row.id,
      studentId: row.student_id,
      studentName: row.student_name,
      classId: row.class_id,
      className: row.class_name,
      academicYear: row.academic_year,
      enrollmentDate: row.enrollment_date,
      leaveDate: row.leave_date,
      leaveReason: row.leave_reason,
      isCurrent: row.is_current === 1,
      createdAt: row.created_at
    }))

    return {
      studentId: student.id,
      studentName: student.name,
      currentClass,
      history
    }
  }

  /**
   * 获取班级统计信息
   */
  getClassStatistics(classId: number): ClassStatistics | null {
    const row = this.db.get(`
      SELECT * FROM v_class_statistics WHERE class_id = ?
    `, [classId])

    if (!row) return null

    return {
      classId: row.class_id,
      className: row.class_name,
      totalStudents: row.total_students || 0,
      trainingCount: row.training_count || 0,
      assessmentCount: 0, // 需要额外查询 report_record 表
      averageScore: row.average_score || null,
      lastActivityDate: row.last_training_date || null
    }
  }

  /**
   * 获取统一班级统计信息（支持模块化）
   *
   * @description
   * 通用统计 API，支持按模块、学年、年级等维度查询班级统计数据
   * 直接查询 v_class_statistics_unified 视图，确保数据聚合的准确性
   *
   * @param options - 查询选项
   * @returns 统计数据数组
   *
   * @example
   * // 查询所有班级的所有模块统计
   * const stats = api.getStatistics()
   *
   * // 查询指定班级的统计
   * const stats = api.getStatistics({ classId: 1 })
   *
   * // 查询感官模块的统计
   * const stats = api.getStatistics({ moduleCode: 'sensory' })
   *
   * // 查询指定学年的统计
   * const stats = api.getStatistics({ academicYear: '2023-2024' })
   */
  getStatistics(options: ClassStatisticsOptions = {}): UnifiedClassStatistics[] {
    const { classId, moduleCode, academicYear, gradeLevel } = options

    // 构建 SQL 查询
    let sql = 'SELECT * FROM v_class_statistics_unified WHERE 1=1'
    const params: any[] = []

    // 按班级ID筛选
    if (classId !== undefined) {
      sql += ' AND class_id = ?'
      params.push(classId)
    }

    // 按模块代码筛选（支持 'all' 表示所有模块的总计）
    if (moduleCode !== undefined) {
      sql += ' AND module_code = ?'
      params.push(moduleCode)
    }

    // 按学年筛选
    if (academicYear !== undefined) {
      sql += ' AND academic_year = ?'
      params.push(academicYear)
    }

    // 按年级筛选
    if (gradeLevel !== undefined) {
      sql += ' AND grade_level = ?'
      params.push(gradeLevel)
    }

    // 排序：按年级、班号排序
    sql += ' ORDER BY grade_level, class_number'

    try {
      const rows = this.db.all(sql, params)

      return rows.map((row: any) => ({
        classId: row.class_id,
        className: row.class_name,
        gradeLevel: row.grade_level,
        classNumber: row.class_number,
        academicYear: row.academic_year,
        totalStudents: row.total_students || 0,
        maxStudents: row.max_students || 50,
        moduleCode: row.module_code || 'all',
        totalTrainingCount: row.total_training_count || 0,
        totalAssessmentCount: row.total_assessment_count || 0,
        averageScore: row.average_score || null,
        lastActivityDate: row.last_activity_date || null,
        activeStudentsTraining: row.active_students_training || 0,
        activeStudentsAssessment: row.active_students_assessment || 0
      }))
    } catch (error) {
      // 容错处理：视图可能尚未创建（极端情况）
      console.warn('[ClassAPI.getStatistics] 查询失败，返回空数组:', error)
      return []
    }
  }

  /**
   * 获取单个班级的统一统计信息（支持模块化）
   *
   * @description
   * getStatistics 的简化版本，专门用于查询单个班级
   *
   * @param classId - 班级ID
   * @param moduleCode - 模块代码（可选，默认 'all'）
   * @returns 统计数据或 null
   */
  getClassStatisticsUnified(classId: number, moduleCode: string = 'all'): UnifiedClassStatistics | null {
    const results = this.getStatistics({ classId, moduleCode })
    return results.length > 0 ? results[0] : null
  }

  /**
   * 获取所有模块的统计汇总（按班级分组）
   *
   * @description
   * 返回每个班级在不同模块下的统计情况，便于前端展示模块对比
   *
   * @param classId - 班级ID（可选，不传则查询所有班级）
   * @returns 按班级分组的模块统计数据
   */
  getStatisticsByModule(classId?: number): any {
    // 查询所有模块的统计数据（包括 'all' 总计）
    const allStats = this.getStatistics({ classId })

    // 按班级分组
    const grouped: Record<number, any> = {}

    for (const stat of allStats) {
      if (!grouped[stat.classId]) {
        grouped[stat.classId] = {
          classId: stat.classId,
          className: stat.className,
          gradeLevel: stat.gradeLevel,
          classNumber: stat.classNumber,
          modules: {}
        }
      }

      // 提取模块特定的统计数据
      const { classId, className, gradeLevel, classNumber, academicYear, totalStudents, maxStudents, moduleCode, ...moduleStats } = stat
      grouped[stat.classId].modules[moduleCode] = moduleStats
    }

    return grouped
  }

  /**
   * 获取所有班级统计信息
   */
  getAllClassStatistics(academicYear?: AcademicYear): ClassStatistics[] {
    let sql = 'SELECT * FROM v_class_statistics WHERE 1=1'
    const params: any[] = []

    if (academicYear) {
      sql += ' AND academic_year = ?'
      params.push(academicYear)
    }

    sql += ' ORDER BY grade_level, class_number'

    const rows = this.db.all(sql, params)

    return rows.map((row: any) => ({
      classId: row.class_id,
      className: row.class_name,
      totalStudents: row.total_students || 0,
      trainingCount: row.training_count || 0,
      assessmentCount: 0,
      averageScore: row.average_score || null,
      lastActivityDate: row.last_training_date || null
    }))
  }

  // ==================== 工具方法 ====================

  /**
   * 映射数据库行到 ClassInfo
   */
  private mapToClassInfo(row: any): ClassInfo {
    return {
      id: row.id,
      name: row.name,
      gradeLevel: row.grade_level,
      classNumber: row.class_number,
      academicYear: row.academic_year,
      maxStudents: row.max_students,
      currentEnrollment: row.current_enrollment,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  // ==================== 班级-老师关联 ====================

  /**
   * 获取班级的所有老师
   */
  getClassTeachers(classId: number) {
    const rows = this.db.all(`
      SELECT
        ct.id,
        ct.class_id,
        ct.teacher_id,
        u.name as teacher_name,
        u.username as teacher_username,
        ct.assigned_at,
        ct.assigned_by,
        ab.name as assigned_by_name
      FROM sys_class_teachers ct
      INNER JOIN user u ON ct.teacher_id = u.id
      LEFT JOIN user ab ON ct.assigned_by = ab.id
      WHERE ct.class_id = ?
      ORDER BY ct.assigned_at DESC
    `, [classId])

    return rows.map((row: any) => ({
      id: row.id,
      classId: row.class_id,
      teacherId: row.teacher_id,
      teacherName: row.teacher_name,
      teacherUsername: row.teacher_username,
      assignedAt: row.assigned_at,
      assignedBy: row.assigned_by,
      assignedByName: row.assigned_by_name
    }))
  }

  /**
   * 获取老师负责的所有班级
   */
  getTeacherClasses(teacherId: number): ClassInfo[] {
    const rows = this.db.all(`
      SELECT c.*
      FROM sys_class c
      INNER JOIN sys_class_teachers ct ON c.id = ct.class_id
      WHERE ct.teacher_id = ?
      ORDER BY c.grade_level, c.class_number
    `, [teacherId])

    return rows.map((row: any) => this.mapToClassInfo(row))
  }

  /**
   * 分配老师到班级
   */
  assignTeacherToClass(classId: number, teacherId: number, assignedBy?: number): number {
    // 检查班级是否存在
    const classInfo = this.getClass(classId)
    if (!classInfo) {
      throw new Error('班级不存在')
    }

    // 检查老师是否存在
    const teacher = this.db.get('SELECT id, name FROM user WHERE id = ? AND role = ?', [teacherId, 'teacher'])
    if (!teacher) {
      throw new Error('老师不存在')
    }

    // 检查是否已经分配
    const existing = this.db.get(
      'SELECT id FROM sys_class_teachers WHERE class_id = ? AND teacher_id = ?',
      [classId, teacherId]
    )
    if (existing) {
      throw new Error('该老师已分配到此班级')
    }

    // 创建关联
    const result = this.db.run(`
      INSERT INTO sys_class_teachers (class_id, teacher_id, assigned_by)
      VALUES (?, ?, ?)
    `, [classId, teacherId, assignedBy])

    return result.lastInsertRowid
  }

  /**
   * 批量分配老师到班级
   */
  assignTeachersBatch(classId: number, teacherIds: number[], assignedBy?: number): number[] {
    const ids: number[] = []
    for (const teacherId of teacherIds) {
      try {
        ids.push(this.assignTeacherToClass(classId, teacherId, assignedBy))
      } catch (error: any) {
        console.warn(`分配老师 ${teacherId} 到班级 ${classId} 失败:`, error.message)
      }
    }
    return ids
  }

  /**
   * 从班级移除老师
   */
  removeTeacherFromClass(classId: number, teacherId: number): boolean {
    const result = this.db.run(
      'DELETE FROM sys_class_teachers WHERE class_id = ? AND teacher_id = ?',
      [classId, teacherId]
    )
    return result.changes > 0
  }

  /**
   * 获取可分配的老师列表（所有 teacher 角色）
   */
  getAvailableTeachers(): Array<{ id: number; name: string; username: string }> {
    const rows = this.db.all(`
      SELECT id, name, username
      FROM user
      WHERE role = 'teacher'
      ORDER BY name
    `)
    return rows
  }

  /**
   * 初始化班级表（执行 Schema）
   */
  static initialize(): void {
    const db = getDatabase()
    const schema = require('@/database/schema/class-schema.sql')
    // Schema 应该在 init.ts 中执行
  }
}

// 导出单例
export const classAPI = new ClassAPI()
