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
export const GRADE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

export type GradeLevel = typeof GRADE_LEVELS[number]

/**
 * 班号
 */
export type ClassNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type GradeStage = 'preschool' | 'schoolAge' | 'postSchoolAge'

export interface GradeOption {
  value: GradeLevel
  label: string
  stage: GradeStage
}

export const GRADE_OPTIONS: GradeOption[] = [
  { value: 1, label: '小班', stage: 'preschool' },
  { value: 2, label: '中班', stage: 'preschool' },
  { value: 3, label: '大班', stage: 'preschool' },
  { value: 4, label: '一年级', stage: 'schoolAge' },
  { value: 5, label: '二年级', stage: 'schoolAge' },
  { value: 6, label: '三年级', stage: 'schoolAge' },
  { value: 7, label: '四年级', stage: 'schoolAge' },
  { value: 8, label: '五年级', stage: 'schoolAge' },
  { value: 9, label: '六年级', stage: 'schoolAge' },
  { value: 10, label: '七年级（初一）', stage: 'postSchoolAge' },
  { value: 11, label: '八年级（初二）', stage: 'postSchoolAge' },
  { value: 12, label: '九年级（初三）', stage: 'postSchoolAge' }
]

export const GRADE_STAGE_LABELS: Record<GradeStage, string> = {
  preschool: '学龄前',
  schoolAge: '学龄期',
  postSchoolAge: '学龄后'
}

export const GRADE_OPTION_GROUPS = [
  {
    label: GRADE_STAGE_LABELS.preschool,
    options: GRADE_OPTIONS.filter(option => option.stage === 'preschool')
  },
  {
    label: GRADE_STAGE_LABELS.schoolAge,
    options: GRADE_OPTIONS.filter(option => option.stage === 'schoolAge')
  },
  {
    label: GRADE_STAGE_LABELS.postSchoolAge,
    options: GRADE_OPTIONS.filter(option => option.stage === 'postSchoolAge')
  }
] as const

export const DEFAULT_GRADE_LEVEL: GradeLevel = 4
export const LAST_GRADE_LEVEL: GradeLevel = 12

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
  id: number
  academicYear: AcademicYear
  startDate: string               // "2023-09-01"
  endDate: string                 // "2024-08-31"
  isActive: boolean               // 是否当前学年
  classCount: number
  studentCount: number
}

export interface CreateAcademicYearParams {
  academicYear: AcademicYear
  isActive?: boolean
}

export interface UpdateAcademicYearParams {
  id: number
  academicYear: AcademicYear
  isActive?: boolean
}

/**
 * 工具函数：生成班级名称
 */
export function generateClassName(gradeLevel: GradeLevel, classNumber: ClassNumber): string {
  return `${getGradeLabel(gradeLevel)}${classNumber}班`
}

export function getGradeLabel(gradeLevel: number): string {
  return GRADE_OPTIONS.find(option => option.value === gradeLevel)?.label ?? `${gradeLevel}年级`
}

export function getGradeStageLabel(gradeLevel: number): string {
  const stage = GRADE_OPTIONS.find(option => option.value === gradeLevel)?.stage
  return stage ? GRADE_STAGE_LABELS[stage] : '未分组'
}

export function isValidGradeLevel(value: number): value is GradeLevel {
  return GRADE_LEVELS.includes(value as GradeLevel)
}

// ══════════════════════════════════════════════════════════════════
// 月龄-年级对应性核对（软提示，非校验阻断）
// 规则依据：中国《义务教育法》第十一条——年满 6 周岁入学（截止当年 8 月
// 31 日，9 月 1 日入读一年级）。特教场景留级/延迟入学属常态，跳级（年龄不够读高年级）
// 则几乎不会发生——阈值不对称（用户 2026-09-19 拍板）：跳级 ≥1 级即提示，留级 ≥2 级才提示。
// 仅软提示，不阻断任何操作。
// ══════════════════════════════════════════════════════════════════

/** 义务教育法定入学年龄（周岁） */
export const COMPULSORY_EDUCATION_ENTRY_AGE = 6

/**
 * 计算学生入学资格日（学年前一年 8 月 31 日截止口径）的周岁年龄
 * 法定语义：截至当年 8 月 31 日年满 6 周岁方可入读一年级（9 月 1 日开学）
 * @param birthday 生日 "YYYY-MM-DD"
 * @param academicYear 学年 "2024-2025"
 * @returns 周岁年龄（8/31 截止口径）；生日无效返回 null
 */
export function getAgeAtAcademicYearStart(birthday: string, academicYear: AcademicYear): number | null {
  const { startYear } = parseAcademicYear(academicYear)
  const birth = new Date(birthday)
  if (Number.isNaN(birth.getTime()) || !birthday) return null
  let age = startYear - birth.getFullYear()
  // 生日在 9 月及之后 → 截至 8/31 资格日还没过生日，周岁减一
  // （月份按生日字符串第 6-7 位取，避免 new Date 对 "YYYY-MM-DD" 的 UTC 解析在负时区下月份漂移；非标格式回退 Date 取月）
  const birthMonth = Number(birthday.slice(5, 7))
  if ((Number.isNaN(birthMonth) ? birth.getMonth() + 1 : birthMonth) >= 9) age -= 1
  return age
}

/**
 * 按义务教育入学规则推算学生当前"应读"年级（GRADE_OPTIONS 的 value 口径，
 * 4 = 一年级，12 = 九年级）
 * @returns 应读年级 value；生日无效返回 null
 */
export function getExpectedGradeLevel(birthday: string, academicYear: AcademicYear): GradeLevel | null {
  const ageAtYearStart = getAgeAtAcademicYearStart(birthday, academicYear)
  if (ageAtYearStart === null) return null
  // 一年级常规入学 = 满 6 周岁 → 应读年级 value = 4 + (年龄 - 6)
  const expected = 4 + (ageAtYearStart - COMPULSORY_EDUCATION_ENTRY_AGE)
  if (expected < 1) {
    // 未到幼儿园小班常规年龄
    return 1
  }
  return Math.min(expected, 12) as GradeLevel
}

export interface GradeAgeCheckResult {
  /** 偏差级数：正数 = 在读高于应读（学生偏小/提前入学），负数 = 低于应读（偏大/延迟入学），0 = 相符 */
  gap: number
  /** 是否达到提示阈值（跳级 gap≥+1 或留级 gap≤-2，不对称） */
  shouldWarn: boolean
  /** 提示文案；不需要提示时为空字符串 */
  message: string
}

/**
 * 月龄-年级对应性核对（软提示，阈值不对称——用户 2026-09-19 拍板）：
 * 跳级（年龄不够读了高年级，gap ≥ +1）任何偏差都提示；
 * 留级（年龄到了还在低年级，gap ≤ -2）才提示，留 1 级属特教常态不提示。
 * @param birthday 学生生日 "YYYY-MM-DD"
 * @param currentGradeLevel 在读年级（GRADE_OPTIONS value 口径，4 = 一年级）
 * @param academicYear 所在学年，缺省用当前学年
 */
export function checkGradeAgeMatch(
  birthday: string,
  currentGradeLevel: number | null | undefined,
  academicYear?: AcademicYear
): GradeAgeCheckResult {
  const year = academicYear || getCurrentAcademicYear()
  const expectedGrade = getExpectedGradeLevel(birthday, year)
  if (expectedGrade === null || !currentGradeLevel) {
    return { gap: 0, shouldWarn: false, message: '' }
  }
  const gap = currentGradeLevel - expectedGrade
  // 不对称阈值：跳级 gap ≥ +1 即提示；留级要 gap ≤ -2 才提示（-1 属常态）
  const isSkipping = gap >= 1
  const isRetained = gap <= -2
  if (!isSkipping && !isRetained) {
    return { gap, shouldWarn: false, message: '' }
  }
  const message = isSkipping
    ? `按常规学龄（年满 6 周岁入学，截至 8 月 31 日），该生目前宜读${getGradeLabel(expectedGrade)}，在读${getGradeLabel(currentGradeLevel)}——年龄未达常规，疑似跳级，请核对`
    : `按常规学龄（年满 6 周岁入学，截至 8 月 31 日），该生目前宜读${getGradeLabel(expectedGrade)}，在读${getGradeLabel(currentGradeLevel)}低于常规 ${Math.abs(gap)} 级——特教场景延迟入学/按能力分班属正常，仅作核对提示`
  return {
    gap,
    shouldWarn: true,
    message
  }
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
    startYear: start ?? new Date().getFullYear(),
    endYear: end ?? new Date().getFullYear() + 1,
    startDate: `${start ?? new Date().getFullYear()}-09-01`,
    endDate: `${end ?? new Date().getFullYear() + 1}-08-31`
  }
}

export function isValidAcademicYearFormat(academicYear: string): boolean {
  const match = academicYear.match(/^(\d{4})-(\d{4})$/)
  if (!match) {
    return false
  }

  const startYear = Number(match[1])
  const endYear = Number(match[2])
  return endYear === startYear + 1
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
