/**
 * 班级管理模块 - 测试数据生成器
 *
 * 功能：
 * 1. 生成测试学生数据
 * 2. 生成测试班级数据
 * 3. 生成学生分班数据
 * 4. 测试学年升级场景
 */

import { ClassAPI } from '../class-api'
import type {
  AcademicYear,
  GradeLevel,
  ClassNumber
} from '../../types/class'

/**
 * 测试学生数据模板
 */
export interface TestStudentTemplate {
  id: number
  name: string
  gender: '男' | '女'
  birthday: string
}

/**
 * 测试数据配置
 */
export interface ClassTestDataConfig {
  academicYears: AcademicYear[]      // 要创建的学年列表
  gradesPerYear: GradeLevel[]         // 每个学年要创建的年级
  classesPerGrade: number             // 每个年级要创建的班级数
  studentsPerClass: number            // 每个班级要分配的学生数
  maxStudents: number                 // 每个班级最大学生数
}

/**
 * 默认测试配置
 */
export const DEFAULT_TEST_CONFIG: ClassTestDataConfig = {
  academicYears: ['2023-2024', '2024-2025'],
  gradesPerYear: [1, 2, 3, 4, 5, 6],
  classesPerGrade: 3,
  studentsPerClass: 20,
  maxStudents: 50
}

/**
 * 测试学生姓名库
 */
const TEST_SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴']
const TEST_NAMES = ['小明', '小红', '小华', '小丽', '小强', '小芳', '小军', '小娟', '小伟', '小敏',
  '子涵', '欣怡', '浩宇', '梓萱', '宇轩', '雨桐', '子轩', '浩然', '诗涵', '梦洁']

/**
 * 生成随机测试学生
 */
export function generateTestStudents(count: number, baseGradeLevel: GradeLevel): TestStudentTemplate[] {
  const students: TestStudentTemplate[] = []
  const currentYear = new Date().getFullYear()

  for (let i = 0; i < count; i++) {
    const surname = TEST_SURNAMES[Math.floor(Math.random() * TEST_SURNAMES.length)]
    const name = TEST_NAMES[Math.floor(Math.random() * TEST_NAMES.length)]
    const gender = Math.random() > 0.5 ? '男' : '女'

    // 根据年级生成合理的生日
    const age = 6 + baseGradeLevel
    const birthYear = currentYear - age
    const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')
    const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')
    const birthday = `${birthYear}-${birthMonth}-${birthDay}`

    students.push({
      id: i + 1,
      name: `${surname}${name}`,
      gender,
      birthday
    })
  }

  return students
}

/**
 * 测试数据生成器类
 */
export class ClassTestDataGenerator {
  private classAPI: ClassAPI
  private config: ClassTestDataConfig

  constructor(classAPI: ClassAPI, config: ClassTestDataConfig = DEFAULT_TEST_CONFIG) {
    this.classAPI = classAPI
    this.config = config
  }

  /**
   * 生成完整的测试数据集
   */
  async generateFullTestData(): Promise<{
    classesCreated: number
    studentsInserted: number
    assignmentsCreated: number
  }> {
    let classesCreated = 0
    let studentsInserted = 0
    let assignmentsCreated = 0

    console.log('[ClassTestDataGenerator] 开始生成测试数据...')

    // 为每个学年创建班级
    for (const academicYear of this.config.academicYears) {
      console.log(`[ClassTestDataGenerator] 处理学年: ${academicYear}`)

      // 为每个年级创建班级
      for (const gradeLevel of this.config.gradesPerYear) {
        console.log(`[ClassTestDataGenerator]   创建 ${gradeLevel} 年级班级...`)

        // 创建班级
        for (let i = 1; i <= this.config.classesPerGrade; i++) {
          const classNumber = i as ClassNumber
          const classId = this.classAPI.createClass({
            academicYear,
            gradeLevel,
            classNumber,
            maxStudents: this.config.maxStudents
          })
          classesCreated++

          // 生成并分配学生
          const students = generateTestStudents(this.config.studentsPerClass, gradeLevel)
          const enrollmentDate = this.getEnrollmentDate(academicYear)

          for (const student of students) {
            try {
              // 注意：这里假设学生已存在于 student 表中
              // 实际使用时需要先插入学生到 student 表
              this.classAPI.assignStudentToClass(
                student.id,
                student.name,
                classId,
                academicYear,
                enrollmentDate
              )
              assignmentsCreated++
            } catch (error: any) {
              // 学生可能不存在，这是正常的
              console.warn(`[ClassTestDataGenerator]     学生 ${student.name} (ID: ${student.id}) 不存在，跳过分班`)
            }
          }
        }
      }
    }

    console.log('[ClassTestDataGenerator] 测试数据生成完成:')
    console.log(`  - 创建班级: ${classesCreated}`)
    console.log(`  - 学生分班: ${assignmentsCreated}`)

    return {
      classesCreated,
      studentsInserted,
      assignmentsCreated
    }
  }

  /**
   * 创建指定学年的班级
   */
  createClassesForYear(academicYear: AcademicYear): number {
    let count = 0

    for (const gradeLevel of this.config.gradesPerYear) {
      for (let i = 1; i <= this.config.classesPerGrade; i++) {
        this.classAPI.createClass({
          academicYear,
          gradeLevel,
          classNumber: i as ClassNumber,
          maxStudents: this.config.maxStudents
        })
        count++
      }
    }

    console.log(`[ClassTestDataGenerator] 为 ${academicYear} 创建了 ${count} 个班级`)
    return count
  }

  /**
   * 模拟学年升级场景
   */
  simulateGradeUpgrade(
    fromYear: AcademicYear,
    toYear: AcademicYear,
    upgradeDate: string
  ): {
    upgraded: number
    graduated: number
  } {
    console.log(`[ClassTestDataGenerator] 模拟学年升级: ${fromYear} → ${toYear}`)

    // 创建新学年的班级
    const newClassesCreated = this.createClassesForYear(toYear)

    // 执行升级
    const result = this.classAPI.upgradeGrade({
      academicYear: toYear,
      upgradeDate,
      createNewClasses: false
    })

    console.log(`[ClassTestDataGenerator] 升级完成: ${result.upgraded} 名学生升级, ${result.graduated} 名学生毕业`)

    return result
  }

  /**
   * 获取入学日期（学年起始日期）
   */
  private getEnrollmentDate(academicYear: AcademicYear): string {
    const [startYear] = academicYear.split('-').map(Number)
    return `${startYear}-09-01`
  }

  /**
   * 清理所有测试数据
   */
  clearAllTestData(): void {
    console.log('[ClassTestDataGenerator] 清理测试数据...')
    // 注意：这里需要实现删除逻辑
    // 由于外键约束，需要按正确顺序删除
    console.warn('[ClassTestDataGenerator] 清理功能需要手动实现或通过数据库工具完成')
  }

  /**
   * 生成测试报告
   */
  generateTestReport(): {
    totalClasses: number
    totalStudents: number
    classesByYear: Record<string, number>
    studentsByClass: Array<{ className: string; count: number }>
  } {
    const allClasses = this.classAPI.getAllClasses()
    const totalClasses = allClasses.length

    const classesByYear: Record<string, number> = {}
    const studentsByClass: Array<{ className: string; count: number }> = []
    let totalStudents = 0

    for (const cls of allClasses) {
      // 按学年统计
      classesByYear[cls.academicYear] = (classesByYear[cls.academicYear] || 0) + 1

      // 按班级统计学生数
      studentsByClass.push({
        className: cls.name,
        count: cls.currentEnrollment
      })

      totalStudents += cls.currentEnrollment
    }

    return {
      totalClasses,
      totalStudents,
      classesByYear,
      studentsByClass
    }
  }
}

/**
 * 快捷函数：生成默认配置的测试数据
 */
export async function generateDefaultClassTestData(classAPI: ClassAPI): Promise<void> {
  const generator = new ClassTestDataGenerator(classAPI, DEFAULT_TEST_CONFIG)
  const result = await generator.generateFullTestData()

  console.log('\n========== 测试数据生成报告 ==========')
  console.log(`创建班级: ${result.classesCreated}`)
  console.log(`学生分班: ${result.assignmentsCreated}`)
  console.log('===================================\n')
}

/**
 * 快捷函数：生成指定年级的测试学生（用于插入到 student 表）
 */
export function generateTestStudentsForGrade(gradeLevel: GradeLevel, count: number = 30): TestStudentTemplate[] {
  return generateTestStudents(count, gradeLevel)
}

/**
 * 获取测试配置
 */
export function getTestConfig(): ClassTestDataConfig {
  return { ...DEFAULT_TEST_CONFIG }
}
