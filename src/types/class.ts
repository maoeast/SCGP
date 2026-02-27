/**
 * 班级管理类型定义
 *
 * Phase: 班级管理模块
 * 设计原则：混合快照模式 - 当前状态 + 历史快照 + 变更追踪
 */

/**
 * 学年类型
 * 格式: "2023-2024"
 */
export type AcademicYear = string

/**
 * 年级级别
 */
export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6

/**
 * 班号
 */
export type ClassNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

/**
 * 班级状态
 */
export enum ClassStatus {
  ACTIVE = 1,    // 激活
  INACTIVE = 0,  // 停用
  GRADUATED = 2  // 已毕业
}

/**
 * 班级信息
 */
export interface ClassInfo {
  id: number
  name: string                    // 班级名称: "1年级1班"
  gradeLevel: GradeLevel          // 年级: 1, 2, 3...
  classNumber: ClassNumber        // 班号: 1, 2, 3...
  academicYear: AcademicYear      // 学年: "2023-2024"
  maxStudents: number             // 最大学生数 (默认50)
  currentEnrollment: number       // 当前在籍人数
  status: ClassStatus             // 班级状态
  createdAt: string
  updatedAt: string
  teachers?: ClassTeacher[]       // 负责老师列表（可选，按需加载）
}

/**
 * 班级-老师关联信息
 */
export interface ClassTeacher {
  id: number
  classId: number
  teacherId: number
  teacherName: string             // 冗余字段，便于显示
  teacherUsername?: string        // 老师用户名
  assignedAt: string              // 分配时间
  assignedBy?: number             // 分配者ID
  assignedByName?: string         // 分配者名称（冗余）
}

/**
 * 创建班级参数
 */
export interface CreateClassParams {
  gradeLevel: GradeLevel
  classNumber: ClassNumber
  academicYear: AcademicYear
  maxStudents?: number
  name?: string  // 可选的自定义班级名称
}

/**
 * 更新班级参数
 */
export interface UpdateClassParams {
  id: number
  maxStudents?: number
  status?: ClassStatus
}

/**
 * 学生班级历史记录
 */
export interface StudentClassHistory {
  id: number
  studentId: number
  studentName: string              // 冗余字段，便于显示
  classId: number
  className: string                // 冗余字段，便于显示
  academicYear: AcademicYear
  enrollmentDate: string           // 入班日期
  leaveDate: string | null         // 离班日期
  leaveReason: string | null       // 离班原因
  isCurrent: boolean               // 是否当前班级
  createdAt: string
}

/**
 * 班级变更原因
 */
export enum ClassChangeReason {
  UPGRADE = 'upgrade',       // 升学
  TRANSFER = 'transfer',     // 转学
  ADJUST = 'adjust',         // 调整
  GRADUATE = 'graduate'      // 毕业
}

/**
 * 班级变更请求
 */
export interface ClassChangeRequest {
  studentId: number
  oldClassId: number | null
  newClassId: number
  academicYear: AcademicYear
  changeDate: string
  reason: ClassChangeReason
}

/**
 * 批量分班请求
 */
export interface BatchClassAssignmentRequest {
  studentIds: number[]
  classId: number
  academicYear: AcademicYear
  enrollmentDate: string
}

/**
 * 学年升级请求（批量）
 */
export interface GradeUpgradeRequest {
  academicYear: AcademicYear      // 新学年
  upgradeDate: string             // 升级日期
  createNewClasses: boolean       // 是否自动创建新班级
}

/**
 * 班级统计信息
 */
export interface ClassStatistics {
  classId: number
  className: string
  totalStudents: number           // 班级总人数
  trainingCount: number           // 训练记录总数
  assessmentCount: number         // 评估记录总数
  averageScore?: number           // 平均训练分
  lastActivityDate?: string       // 最近活动日期
}

/**
 * 统一班级统计信息（支持模块化）
 * 扩展自 ClassStatistics，增加模块维度
 */
export interface UnifiedClassStatistics {
  classId: number
  className: string
  gradeLevel: number              // 年级
  classNumber: number             // 班号
  academicYear: string            // 学年
  totalStudents: number           // 班级总人数
  maxStudents: number             // 最大学生数
  moduleCode: string              // 模块代码 ('all', 'sensory', 'life_skills' 等)
  totalTrainingCount: number      // 训练记录总数（含游戏+器材）
  totalAssessmentCount: number    // 评估记录总数
  averageScore?: number           // 平均训练分
  lastActivityDate?: string       // 最近活动日期
  activeStudentsTraining: number  // 参与训练的学生数
  activeStudentsAssessment: number // 参与评估的学生数
}

/**
 * 班级统计查询选项（支持模块化统计）
 */
export interface ClassStatisticsOptions {
  classId?: number                // 指定班级ID（可选，不传则查询所有班级）
  moduleCode?: string             // 模块代码（可选，支持 'all', 'sensory', 'life_skills' 等）
  academicYear?: string           // 学年筛选（可选）
  gradeLevel?: number             // 年级筛选（可选）
}

/**
 * 班级查询选项
 */
export interface ClassQueryOptions {
  academicYear?: AcademicYear
  gradeLevel?: GradeLevel
  status?: ClassStatus
  includeStats?: boolean          // 是否包含统计信息
}

/**
 * 学生班级信息（含历史）
 */
export interface StudentClassInfo {
  studentId: number
  studentName: string
  currentClass?: {
    id: number
    name: string
    academicYear: AcademicYear
  }
  history: StudentClassHistory[]
}

/**
 * 班级学生列表项
 */
export interface ClassStudentItem {
  studentId: number
  studentName: string
  gender: '男' | '女'
  enrollmentDate: string
  leaveDate: string | null
}

/**
 * 学年信息
 */
export interface AcademicYearInfo {
  academicYear: AcademicYear
  startDate: string               // "2023-09-01"
  endDate: string                 // "2024-08-31"
  isActive: boolean               // 是否当前学年
}

/**
 * 工具函数：生成班级名称
 */
export function generateClassName(gradeLevel: GradeLevel, classNumber: ClassNumber): string {
  return `${gradeLevel}年级${classNumber}班`
}

/**
 * 工具函数：解析学年
 */
export function parseAcademicYear(academicYear: AcademicYear): {
  startYear: number
  endYear: number
  startDate: string
  endDate: string
} {
  const [start, end] = academicYear.split('-').map(Number)
  return {
    startYear: start,
    endYear: end,
    startDate: `${start}-09-01`,
    endDate: `${end}-08-31`
  }
}

/**
 * 工具函数：获取当前学年
 */
export function getCurrentAcademicYear(): AcademicYear {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-12

  // 9月后是下一学年的开始
  if (month >= 9) {
    return `${year}-${year + 1}`
  } else {
    return `${year - 1}-${year}`
  }
}

/**
 * 工具函数：检查日期是否在学年内
 */
export function isDateInAcademicYear(date: Date | string, academicYear: AcademicYear): boolean {
  const { startDate, endDate } = parseAcademicYear(academicYear)
  const checkDate = typeof date === 'string' ? new Date(date) : date
  const start = new Date(startDate)
  const end = new Date(endDate)
  return checkDate >= start && checkDate <= end
}

/**
 * 班级容量配置
 */
export const CLASS_CONFIG = {
  MAX_STUDENTS: 50,              // 默认最大人数
  MIN_STUDENTS: 1,               // 最小人数
  DEFAULT_MAX_STUDENTS: 50       // 默认值
} as const

/**
 * 分配老师请求
 */
export interface AssignTeacherRequest {
  classId: number
  teacherId: number
}

/**
 * 批量分配老师请求
 */
export interface BatchAssignTeachersRequest {
  classId: number
  teacherIds: number[]
}

/**
 * 移除老师请求
 */
export interface RemoveTeacherRequest {
  classId: number
  teacherId: number
}
