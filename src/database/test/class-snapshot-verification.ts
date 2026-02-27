/**
 * 班级管理混合快照模式验证脚本
 *
 * Phase 3.6 班级管理模块 - 数据一致性核验
 *
 * 验证目标：确保在升学场景下，业务记录的班级快照不会被后续的升学操作篡改
 *
 * 验证步骤：
 * 1. 建立初始状态：创建班级"2025级-启航班"并分配测试学生
 * 2. 触发快照记录：录入器材训练记录，确认班级快照已固化
 * 3. 模拟组织变更：执行学年升级，将学生迁移至"2026级-进阶班"
 * 4. 核心验收核实：验证历史记录的班级信息不变，学生档案的当前班级已更新
 */

import { ClassAPI } from '../class-api'
import { StudentAPI } from '../api'
import { EquipmentTrainingAPI } from '../api'
import { getDatabase } from '../init'
import type { AcademicYear, GradeLevel } from '@/types/class'

/**
 * 验证结果接口
 */
interface VerificationResult {
  success: boolean
  phase: string
  message: string
  data?: any
  error?: string
}

/**
 * 验证报告接口
 */
interface VerificationReport {
  phases: VerificationResult[]
  summary: {
    total: number
    passed: number
    failed: number
  }
  finalVerdict: string
}

/**
 * 班级快照验证器
 */
export class ClassSnapshotVerifier {
  private classAPI: ClassAPI
  private studentAPI: StudentAPI
  private equipmentAPI: EquipmentTrainingAPI
  private db: any
  private rawDb: any  // Raw sql.js Database - 绕过 SQLWrapper
  private report: VerificationReport

  // 测试数据
  private testStudentId: number | null = null
  private initialClassId: number | null = null
  private newClassId: number | null = null
  private trainingRecordId: number | null = null

  // 班级信息
  private readonly INITIAL_CLASS_NAME = '2025级-启航班'
  private readonly NEW_CLASS_NAME = '2026级-进阶班'
  private readonly INITIAL_ACADEMIC_YEAR: AcademicYear = '2025-2026'
  private readonly NEW_ACADEMIC_YEAR: AcademicYear = '2026-2027'

  constructor() {
    this.classAPI = new ClassAPI()
    this.studentAPI = new StudentAPI()
    this.equipmentAPI = new EquipmentTrainingAPI()
    this.db = getDatabase()

    // Force获取 Raw DB - 绕过 SQLWrapper 的防抖保存
    this.rawDb = (this.db as any)._db || (this.db as any).getRawDb?.() || this.db

    this.report = {
      phases: [],
      summary: { total: 0, passed: 0, failed: 0 },
      finalVerdict: ''
    }

    // 确保班级管理表已创建
    this.ensureClassTablesExist()
  }

  /**
   * 确保班级管理表已创建
   */
  private ensureClassTablesExist(): void {
    try {
      // 检查 sys_class 表是否存在 - 使用 Raw DB
      const tableExists = this.rawDb.exec(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='sys_class'
      `)

      if (!tableExists || tableExists.length === 0 || !tableExists[0]?.values?.length) {
        console.log('[Verifier] 班级管理表不存在，开始创建...')
        this.createClassTables()
        console.log('[Verifier] 班级管理表创建完成')
      } else {
        // 表存在，先清理之前的测试数据
        console.log('[Verifier] 检测到现有表，开始清理历史测试数据...')
        this.cleanupExistingTestData()
        console.log('[Verifier] 历史测试数据清理完成')
      }
    } catch (error) {
      console.warn('[Verifier] 检查表失败:', error)
    }
  }

  /**
   * 清理现有的测试数据（按名称模式和约束列）
   * 在验证开始前删除所有可能存在的测试数据
   */
  private cleanupExistingTestData(): void {
    try {
      console.log('[清理] 开始清理测试数据...')

      // 1. 先按约束列删除可能冲突的班级（避免 UNIQUE constraint 失败）
      // 使用 exec() 查询，然后解析结果 - 使用 Raw DB
      const conflictResult = this.rawDb.exec(`
        SELECT id, name, academic_year, grade_level, class_number
        FROM sys_class
        WHERE (academic_year = '${this.INITIAL_ACADEMIC_YEAR}' AND grade_level = 1 AND class_number = 1)
           OR (academic_year = '${this.NEW_ACADEMIC_YEAR}' AND grade_level = 2 AND class_number = 1)
      `)

      if (conflictResult.length > 0 && conflictResult[0].values) {
        for (const row of conflictResult[0].values) {
          const [id, name, academicYear, gradeLevel, classNumber] = row
          console.log(`  [清理] 删除约束冲突班级: ${name} (${academicYear}, ${gradeLevel}年级, ${classNumber}班)`)
          this.rawDb.run(`DELETE FROM sys_class WHERE id = ${id}`)
        }
      }

      // 2. 按名称删除测试班级（双重保险）
      const nameResult = this.rawDb.exec(`
        SELECT id, name FROM sys_class
        WHERE name IN ('${this.INITIAL_CLASS_NAME}', '${this.NEW_CLASS_NAME}')
      `)

      if (nameResult.length > 0 && nameResult[0].values) {
        for (const row of nameResult[0].values) {
          const [id, name] = row
          console.log(`  [清理] 删除测试班级: ${name} (ID: ${id})`)
          this.rawDb.run(`DELETE FROM sys_class WHERE id = ${id}`)
        }
      }

      // 3. 查找并删除测试学生
      const studentResult = this.rawDb.exec(`
        SELECT id FROM student WHERE name LIKE '%测试学生-快照验证%'
      `)

      if (studentResult.length > 0 && studentResult[0].values) {
        for (const row of studentResult[0].values) {
          const [studentId] = row
          // 先删除班级历史
          this.rawDb.run(`DELETE FROM student_class_history WHERE student_id = ${studentId}`)
          console.log(`  [清理] 删除学生 ${studentId} 的班级历史`)
        }
      }

      // 删除测试学生
      const deletedStudents = this.rawDb.run(`
        DELETE FROM student WHERE name LIKE '%测试学生-快照验证%'
      `)
      if (deletedStudents.changes > 0) {
        console.log(`  [清理] 删除 ${deletedStudents.changes} 个测试学生`)
      }

      // 4. 删除测试训练记录
      const deletedRecords = this.rawDb.run(`
        DELETE FROM equipment_training_records WHERE notes LIKE '%快照验证测试记录%'
      `)

      if (deletedRecords.changes > 0) {
        console.log(`  [清理] 删除 ${deletedRecords.changes} 条测试训练记录`)
      }

      console.log('[清理] 测试数据清理完成')
    } catch (error: any) {
      console.warn(`[清理] 警告: ${error.message}`)
    }
  }

  /**
   * 检查表中的列是否存在
   * 使用 PRAGMA table_info 查询表结构
   *
   * sql.js exec() 返回格式: [{ columns: [...], values: [[cid, name, type, ...], ...] }]
   * 每个 values 元素是 [cid, name, type, notnull, dflt_value, pk]
   */
  private columnExists(tableName: string, columnName: string): boolean {
    try {
      // 使用 Raw DB 的 exec 方法
      const result = this.rawDb.exec(`PRAGMA table_info(${tableName})`)
      // sql.js 返回的是结果对象数组，每个结果有 values 属性
      if (result && result.length > 0 && result[0]?.values) {
        // result[0].values 是一个二维数组，每个子数组代表一行的列信息
        // 行格式: [cid, name, type, notnull, dflt_value, pk]
        // 我们需要检查索引 1 (name) 是否等于目标列名
        for (const row of result[0].values) {
          if (Array.isArray(row) && row[1] === columnName) {
            return true
          }
        }
      }
      return false
    } catch (error) {
      return false
    }
  }

  /**
   * 安全添加列（如果不存在）
   *
   * 绝对静默版本 - 不输出任何错误或警告日志
   *
   * 健壮性增强：
   * - 即使 columnExists 返回 false，也在 try-catch 中执行 ALTER TABLE
   * - 捕获所有错误时静默忽略（可能由并发或检查失败导致）
   * - 使用 Raw DB 避免防抖保存干扰
   */
  private safeAddColumn(tableName: string, columnDef: string): void {
    const parts = columnDef.trim().split(/\s+/)
    const columnName = parts[0]

    const exists = this.columnExists(tableName, columnName)

    if (exists) {
      // 列已存在，静默跳过
      return
    }

    // 即使检查返回不存在，也要在 try-catch 中执行
    // 处理可能的竞态条件或检查失败的情况
    // 使用 Raw DB 的 run 方法
    try {
      this.rawDb.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`)
    } catch {
      // 绝对静默 - 所有错误都忽略，包括 duplicate column 错误
      // 不输出任何日志或警告
    }
  }

  /**
   * 创建班级管理相关表（仅在表不存在时创建）
   */
  private createClassTables(): void {
    // 创建 sys_class 表 - 使用 Raw DB
    this.rawDb.exec(`
      CREATE TABLE IF NOT EXISTS sys_class (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        grade_level INTEGER NOT NULL,
        class_number INTEGER NOT NULL,
        academic_year TEXT NOT NULL,
        max_students INTEGER DEFAULT 50,
        current_enrollment INTEGER DEFAULT 0,
        status INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (academic_year, grade_level, class_number)
      )
    `)

    // 创建 student_class_history 表 - 使用 Raw DB
    this.rawDb.exec(`
      CREATE TABLE IF NOT EXISTS student_class_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        student_name TEXT NOT NULL,
        class_id INTEGER NOT NULL,
        class_name TEXT NOT NULL,
        academic_year TEXT NOT NULL,
        enrollment_date TEXT NOT NULL,
        leave_date TEXT,
        leave_reason TEXT,
        is_current INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES sys_class(id) ON DELETE CASCADE,
        UNIQUE (student_id, academic_year)
      )
    `)

    // 安全添加列到学生表
    this.safeAddColumn('student', 'current_class_id INTEGER')
    this.safeAddColumn('student', 'current_class_name TEXT')

    // 安全添加列到业务记录表
    const tables = ['training_records', 'train_log', 'report_record', 'equipment_training_records']
    for (const table of tables) {
      this.safeAddColumn(table, 'class_id INTEGER')
      this.safeAddColumn(table, 'class_name TEXT')
    }
  }

  /**
   * 添加验证结果
   */
  private addResult(result: VerificationResult): void {
    this.report.phases.push(result)
    this.report.summary.total++

    if (result.success) {
      this.report.summary.passed++
    } else {
      this.report.summary.failed++
    }
  }

  /**
   * Phase 1: 建立初始状态
   * 创建班级"2025级-启航班"并分配测试学生
   */
  private async phase1_InitialSetup(): Promise<VerificationResult> {
    const phase = 'Phase 1: 建立初始状态'

    try {
      console.log(`\n[${phase}] 开始执行...`)

      // ========== 幂等性保证：先删除可能存在的测试数据 ==========
      console.log(`  [幂等检查] 清理可能存在的旧测试数据...`)

      // 删除可能存在的测试学生（按名称）
      const existingStudents = this.rawDb.exec(`
        SELECT id FROM student WHERE name = '测试学生-快照验证'
      `)
      if (existingStudents.length > 0 && existingStudents[0]?.values) {
        for (const row of existingStudents[0].values) {
          const [studentId] = row
          // 先删除班级历史
          this.rawDb.run(`DELETE FROM student_class_history WHERE student_id = ${studentId}`)
          // 再删除学生
          this.rawDb.run(`DELETE FROM student WHERE id = ${studentId}`)
          console.log(`      - 删除旧测试学生，ID: ${studentId}`)
        }
      }

      // 删除可能存在的测试班级（按约束条件）
      const existingClasses = this.rawDb.exec(`
        SELECT id, name FROM sys_class
        WHERE (academic_year = '${this.INITIAL_ACADEMIC_YEAR}' AND grade_level = 1 AND class_number = 1)
           OR name = '${this.INITIAL_CLASS_NAME}'
      `)
      if (existingClasses.length > 0 && existingClasses[0]?.values) {
        for (const row of existingClasses[0].values) {
          const [classId, className] = row
          this.rawDb.run(`DELETE FROM sys_class WHERE id = ${classId}`)
          console.log(`      - 删除旧测试班级: ${className} (ID: ${classId})`)
        }
      }

      console.log(`      ✓ 旧测试数据清理完成\n`)

      // 1.1 创建初始班级
      console.log(`  1.1 创建班级: ${this.INITIAL_CLASS_NAME}`)
      this.initialClassId = this.classAPI.createClass({
        gradeLevel: 1,
        classNumber: 1,
        academicYear: this.INITIAL_ACADEMIC_YEAR,
        maxStudents: 50
      })

      // 手动设置班级名称
      this.rawDb.run(`
        UPDATE sys_class SET name = ? WHERE id = ?
      `, [this.INITIAL_CLASS_NAME, this.initialClassId])

      console.log(`      ✓ 班级创建成功，ID: ${this.initialClassId}`)

      // 1.2 创建测试学生
      console.log(`  1.2 创建测试学生`)
      this.testStudentId = await this.studentAPI.addStudent({
        name: '测试学生-快照验证',
        gender: '男',
        birthday: '2018-06-15',
        student_no: 'TEST001',
        disorder: '自闭症谱系障碍',
        avatar_path: null
      })

      console.log(`      ✓ 学生创建成功，ID: ${this.testStudentId}`)

      // 1.3 分配学生到初始班级
      console.log(`  1.3 分配学生到班级: ${this.INITIAL_CLASS_NAME}`)
      this.classAPI.assignStudentToClass(
        this.testStudentId,
        '测试学生-快照验证',
        this.initialClassId,
        this.INITIAL_ACADEMIC_YEAR,
        new Date().toISOString().split('T')[0]
      )

      console.log(`      ✓ 学生分配成功`)

      // 1.4 验证学生当前班级
      const student = this.rawDb.get(`
        SELECT id, name, current_class_id, current_class_name
        FROM student WHERE id = ?
      `, [this.testStudentId])

      console.log(`  1.4 验证学生当前班级:`)
      console.log(`      - 学生姓名: ${student.name}`)
      console.log(`      - 当前班级ID: ${student.current_class_id}`)
      console.log(`      - 当前班级名称: ${student.current_class_name}`)

      if (student.current_class_name !== this.INITIAL_CLASS_NAME) {
        throw new Error(`学生当前班级不正确，期望: ${this.INITIAL_CLASS_NAME}，实际: ${student.current_class_name}`)
      }

      return {
        success: true,
        phase,
        message: '初始状态建立成功',
        data: {
          student: {
            id: student.id,
            name: student.name,
            currentClassId: student.current_class_id,
            currentClassName: student.current_class_name
          },
          class: {
            id: this.initialClassId,
            name: this.INITIAL_CLASS_NAME,
            academicYear: this.INITIAL_ACADEMIC_YEAR
          }
        }
      }
    } catch (error: any) {
      return {
        success: false,
        phase,
        message: '初始状态建立失败',
        error: error.message
      }
    }
  }

  /**
   * Phase 2: 触发快照记录
   * 录入器材训练记录，确认班级快照已固化
   */
  private async phase2_TriggerSnapshot(): Promise<VerificationResult> {
    const phase = 'Phase 2: 触发快照记录'

    try {
      console.log(`\n[${phase}] 开始执行...`)

      // 2.1 获取"颗粒大龙球"器材ID
      console.log(`  2.1 查找器材: 颗粒大龙球`)
      const equipment = this.rawDb.get(`
        SELECT id, name, category
        FROM sys_training_resource
        WHERE name LIKE '%颗粒大龙球%' OR name LIKE '%大龙球%'
        LIMIT 1
      `)

      if (!equipment) {
        throw new Error('找不到"颗粒大龙球"器材')
      }

      console.log(`      ✓ 找到器材: ${equipment.name} (ID: ${equipment.id})`)

      // 2.2 录入器材训练记录
      console.log(`  2.2 录入器材训练记录`)
      const today = new Date().toISOString().split('T')[0]

      this.trainingRecordId = this.equipmentAPI.createRecord({
        student_id: this.testStudentId!,
        equipment_id: equipment.id,
        score: 4,
        prompt_level: 2,
        duration_seconds: 600,
        notes: '快照验证测试记录',
        training_date: today,
        teacher_name: '测试教师',
        environment: '个体训练室'
      })

      console.log(`      ✓ 训练记录创建成功，ID: ${this.trainingRecordId}`)

      // 2.3 立即通过数据库查询，确认班级快照已固化
      console.log(`  2.3 查询训练记录的班级快照:`)
      const record = this.rawDb.get(`
        SELECT
          id,
          student_id,
          equipment_id,
          score,
          class_id,
          class_name,
          training_date,
          created_at
        FROM equipment_training_records
        WHERE id = ?
      `, [this.trainingRecordId])

      console.log(`      - 记录ID: ${record.id}`)
      console.log(`      - 班级ID快照: ${record.class_id}`)
      console.log(`      - 班级名称快照: ${record.class_name}`)
      console.log(`      - 创建时间: ${record.created_at}`)

      if (record.class_name !== this.INITIAL_CLASS_NAME) {
        throw new Error(`班级快照不正确，期望: ${this.INITIAL_CLASS_NAME}，实际: ${record.class_name}`)
      }

      if (record.class_id !== this.initialClassId) {
        throw new Error(`班级ID快照不正确，期望: ${this.initialClassId}，实际: ${record.class_id}`)
      }

      return {
        success: true,
        phase,
        message: '快照记录固化成功',
        data: {
          record: {
            id: record.id,
            classIdSnapshot: record.class_id,
            classNameSnapshot: record.class_name,
            createdAt: record.created_at
          },
          verification: {
            expectedClassId: this.initialClassId,
            expectedClassName: this.INITIAL_CLASS_NAME,
            classIdMatch: record.class_id === this.initialClassId,
            classNameMatch: record.class_name === this.INITIAL_CLASS_NAME
          }
        }
      }
    } catch (error: any) {
      return {
        success: false,
        phase,
        message: '快照记录固化失败',
        error: error.message
      }
    }
  }

  /**
   * Phase 3: 模拟组织变更
   * 执行学年升级，将学生迁移至"2026级-进阶班"
   */
  private async phase3_SimulateUpgrade(): Promise<VerificationResult> {
    const phase = 'Phase 3: 模拟组织变更'

    try {
      console.log(`\n[${phase}] 开始执行...`)

      // 3.1 创建新班级"2026级-进阶班"
      console.log(`  3.1 创建新班级: ${this.NEW_CLASS_NAME}`)
      this.newClassId = this.classAPI.createClass({
        gradeLevel: 2,
        classNumber: 1,
        academicYear: this.NEW_ACADEMIC_YEAR,
        maxStudents: 50
      })

      // 手动设置班级名称
      this.rawDb.run(`
        UPDATE sys_class SET name = ? WHERE id = ?
      `, [this.NEW_CLASS_NAME, this.newClassId])

      console.log(`      ✓ 新班级创建成功，ID: ${this.newClassId}`)

      // 3.2 执行学生转班（模拟升学）
      console.log(`  3.2 执行学生转班操作`)
      const upgradeDate = new Date().toISOString().split('T')[0]

      this.classAPI.changeStudentClass({
        studentId: this.testStudentId!,
        oldClassId: this.initialClassId!,
        newClassId: this.newClassId!,
        academicYear: this.NEW_ACADEMIC_YEAR,
        changeDate: upgradeDate,
        reason: 'upgrade'
      })

      console.log(`      ✓ 学生转班成功`)

      // 3.3 验证学生档案中的当前班级已更新
      console.log(`  3.3 验证学生档案当前班级:`)
      const student = this.rawDb.get(`
        SELECT id, name, current_class_id, current_class_name
        FROM student WHERE id = ?
      `, [this.testStudentId])

      console.log(`      - 学生姓名: ${student.name}`)
      console.log(`      - 当前班级ID: ${student.current_class_id}`)
      console.log(`      - 当前班级名称: ${student.current_class_name}`)

      if (student.current_class_name !== this.NEW_CLASS_NAME) {
        throw new Error(`学生当前班级未更新，期望: ${this.NEW_CLASS_NAME}，实际: ${student.current_class_name}`)
      }

      // 3.4 验证班级变更历史记录
      console.log(`  3.4 验证班级变更历史:`)
      const history = this.rawDb.all(`
        SELECT
          id,
          student_id,
          class_id,
          class_name,
          academic_year,
          enrollment_date,
          leave_date,
          leave_reason,
          is_current
        FROM student_class_history
        WHERE student_id = ?
        ORDER BY enrollment_date DESC
      `, [this.testStudentId])

      console.log(`      - 历史记录数: ${history.length}`)

      history.forEach((h: any, index: number) => {
        const status = h.is_current ? '[当前]' : '[历史]'
        console.log(`      ${index + 1}. ${status} ${h.class_name} (${h.academic_year})`)
      })

      return {
        success: true,
        phase,
        message: '组织变更执行成功',
        data: {
          student: {
            id: student.id,
            name: student.name,
            currentClassId: student.current_class_id,
            currentClassName: student.current_class_name
          },
          newClass: {
            id: this.newClassId,
            name: this.NEW_CLASS_NAME,
            academicYear: this.NEW_ACADEMIC_YEAR
          },
          historyCount: history.length
        }
      }
    } catch (error: any) {
      return {
        success: false,
        phase,
        message: '组织变更执行失败',
        error: error.message
      }
    }
  }

  /**
   * Phase 4: 核心验收核实
   * 验证历史记录的班级信息不变，学生档案的当前班级已更新
   */
  private async phase4_FinalVerification(): Promise<VerificationResult> {
    const phase = 'Phase 4: 核心验收核实'

    try {
      console.log(`\n[${phase}] 开始执行...`)

      // 4.1 查询之前录入的训练记录
      console.log(`  4.1 查询历史训练记录:`)
      const record = this.rawDb.get(`
        SELECT
          id,
          student_id,
          equipment_id,
          score,
          class_id,
          class_name,
          training_date,
          created_at
        FROM equipment_training_records
        WHERE id = ?
      `, [this.trainingRecordId])

      console.log(`      - 记录ID: ${record.id}`)
      console.log(`      - 班级ID快照: ${record.class_id}`)
      console.log(`      - 班级名称快照: ${record.class_name}`)
      console.log(`      - 训练日期: ${record.training_date}`)
      console.log(`      - 创建时间: ${record.created_at}`)

      // 4.2 核心验收：历史记录必须保持原始班级信息
      console.log(`  4.2 核心验收 - 历史快照完整性:`)
      const snapshotIntact = record.class_name === this.INITIAL_CLASS_NAME
      const snapshotIdIntact = record.class_id === this.initialClassId

      console.log(`      - 班级名称快照: ${snapshotIntact ? '✓ 保持不变' : '✗ 被篡改'}`)
      console.log(`      - 班级ID快照: ${snapshotIdIntact ? '✓ 保持不变' : '✗ 被篡改'}`)

      if (!snapshotIntact) {
        throw new Error(`历史快照被篡改！期望班级名称: ${this.INITIAL_CLASS_NAME}，实际: ${record.class_name}`)
      }

      if (!snapshotIdIntact) {
        throw new Error(`历史快照ID被篡改！期望班级ID: ${this.initialClassId}，实际: ${record.class_id}`)
      }

      // 4.3 验证学生档案的当前班级已更新
      console.log(`  4.3 附加核对 - 学生档案当前状态:`)
      const student = this.rawDb.get(`
        SELECT id, name, current_class_id, current_class_name
        FROM student WHERE id = ?
      `, [this.testStudentId])

      const studentUpdated = student.current_class_name === this.NEW_CLASS_NAME
      console.log(`      - 当前班级: ${studentUpdated ? '✓ 已更新' : '✗ 未更新'}`)
      console.log(`      - 当前班级名称: ${student.current_class_name}`)

      if (!studentUpdated) {
        throw new Error(`学生档案未更新！期望当前班级: ${this.NEW_CLASS_NAME}，实际: ${student.current_class_name}`)
      }

      // 4.4 生成最终对比报告
      console.log(`  4.4 数据一致性对比报告:`)
      console.log(`      ┌─────────────────┬──────────────────┬──────────────────┐`)
      console.log(`      │ 数据项          │ 历史快照         │ 当前档案         │`)
      console.log(`      ├─────────────────┼──────────────────┼──────────────────┤`)
      console.log(`      │ 班级ID          │ ${record.class_id}              │ ${student.current_class_id}              │`)
      console.log(`      │ 班级名称        │ ${record.class_name}         │ ${student.current_class_name}         │`)
      console.log(`      │ 一致性          │ ${(record.class_id !== student.current_class_id) ? '✓ 快照独立' : '✗ 异常'}  │                  │`)
      console.log(`      └─────────────────┴──────────────────┴──────────────────┘`)

      return {
        success: true,
        phase,
        message: '核心验收通过 - 混合快照模式验证成功',
        data: {
          historicalRecord: {
            classId: record.class_id,
            className: record.class_name
          },
          currentProfile: {
            classId: student.current_class_id,
            className: student.current_class_name
          },
          verification: {
            snapshotIntact: snapshotIntact && snapshotIdIntact,
            studentUpdated: studentUpdated,
            isolationVerified: record.class_id !== student.current_class_id
          }
        }
      }
    } catch (error: any) {
      return {
        success: false,
        phase,
        message: '核心验收失败',
        error: error.message
      }
    }
  }

  /**
   * 执行完整验证流程
   */
  async runFullVerification(): Promise<VerificationReport> {
    console.log('\n' + '='.repeat(70))
    console.log('班级管理混合快照模式验证 - 开始')
    console.log('='.repeat(70))

    // ========== 预清理：确保测试环境干净 ==========
    console.log('\n[预清理] 开始清理历史测试数据...')
    this.cleanupExistingTestData()
    console.log('[预清理] 历史测试数据清理完成\n')

    // Phase 1: 建立初始状态
    const result1 = await this.phase1_InitialSetup()
    this.addResult(result1)

    if (!result1.success) {
      console.log(`\n✗ ${result1.phase} 失败: ${result1.error}`)
      this.report.finalVerdict = '❌ 验证失败 - 初始状态建立失败'
      return this.report
    }

    // Phase 2: 触发快照记录
    const result2 = await this.phase2_TriggerSnapshot()
    this.addResult(result2)

    if (!result2.success) {
      console.log(`\n✗ ${result2.phase} 失败: ${result2.error}`)
      this.report.finalVerdict = '❌ 验证失败 - 快照记录固化失败'
      return this.report
    }

    // Phase 3: 模拟组织变更
    const result3 = await this.phase3_SimulateUpgrade()
    this.addResult(result3)

    if (!result3.success) {
      console.log(`\n✗ ${result3.phase} 失败: ${result3.error}`)
      this.report.finalVerdict = '❌ 验证失败 - 组织变更执行失败'
      return this.report
    }

    // Phase 4: 核心验收核实
    const result4 = await this.phase4_FinalVerification()
    this.addResult(result4)

    if (!result4.success) {
      console.log(`\n✗ ${result4.phase} 失败: ${result4.error}`)
      this.report.finalVerdict = '❌ 验证失败 - 核心验收未通过'
      return this.report
    }

    // 所有阶段通过
    console.log('\n' + '='.repeat(70))
    console.log('✅ 验证报告汇总')
    console.log('='.repeat(70))
    console.log(`总阶段数: ${this.report.summary.total}`)
    console.log(`通过阶段: ${this.report.summary.passed}`)
    console.log(`失败阶段: ${this.report.summary.failed}`)
    console.log('')

    this.report.finalVerdict = '✅ 验证通过 - 混合快照模式工作正常'

    console.log(this.report.finalVerdict)
    console.log('='.repeat(70) + '\n')

    return this.report
  }

  /**
   * 生成数据库快照
   */
  generateDatabaseSnapshot(): any {
    console.log('\n[数据库快照] 开始生成...')

    // 学生表快照
    const student = this.rawDb.get(`
      SELECT id, name, current_class_id, current_class_name
      FROM student WHERE id = ?
    `, [this.testStudentId])

    // 训练记录快照
    const record = this.rawDb.get(`
      SELECT id, class_id, class_name, training_date, created_at
      FROM equipment_training_records
      WHERE id = ?
    `, [this.trainingRecordId])

    // 班级历史快照
    const history = this.rawDb.all(`
      SELECT class_id, class_name, academic_year, is_current, leave_date
      FROM student_class_history
      WHERE student_id = ?
      ORDER BY enrollment_date DESC
    `, [this.testStudentId])

    console.log('[数据库快照] 生成完成\n')

    return {
      timestamp: new Date().toISOString(),
      student,
      trainingRecord: record,
      classHistory: history
    }
  }

  /**
   * 清理测试数据
   */
  cleanupTestData(): void {
    console.log('\n[清理测试数据] 开始清理...')

    try {
      // 删除训练记录
      if (this.trainingRecordId) {
        this.rawDb.run('DELETE FROM equipment_training_records WHERE id = ?', [this.trainingRecordId])
        console.log(`  ✓ 删除训练记录: ${this.trainingRecordId}`)
      }

      // 删除班级历史
      if (this.testStudentId) {
        this.rawDb.run('DELETE FROM student_class_history WHERE student_id = ?', [this.testStudentId])
        console.log(`  ✓ 删除班级历史`)
      }

      // 删除学生
      if (this.testStudentId) {
        this.rawDb.run('DELETE FROM student WHERE id = ?', [this.testStudentId])
        console.log(`  ✓ 删除学生: ${this.testStudentId}`)
      }

      // 删除班级
      if (this.newClassId) {
        this.rawDb.run('DELETE FROM sys_class WHERE id = ?', [this.newClassId])
        console.log(`  ✓ 删除新班级: ${this.newClassId}`)
      }

      if (this.initialClassId) {
        this.rawDb.run('DELETE FROM sys_class WHERE id = ?', [this.initialClassId])
        console.log(`  ✓ 删除初始班级: ${this.initialClassId}`)
      }

      console.log('[清理测试数据] 清理完成\n')
    } catch (error: any) {
      console.error(`[清理测试数据] 清理失败: ${error.message}\n`)
    }
  }
}

/**
 * 导出验证函数
 */
export async function verifyClassSnapshotMode(): Promise<VerificationReport> {
  const verifier = new ClassSnapshotVerifier()
  const report = await verifier.runFullVerification()

  // 生成数据库快照
  const snapshot = verifier.generateDatabaseSnapshot()

  // 可选：清理测试数据
  // verifier.cleanupTestData()

  return report
}
