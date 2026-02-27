/**
 * 评估模块通用类型定义
 *
 * Phase 4: 评估模块深度重构
 * 采用 "UI 容器复用 + 策略驱动器 (ScaleDriver)" 架构模式
 *
 * @module types/assessment
 */

// ============================================================
// 学生上下文
// ============================================================

/**
 * 学生上下文 - 评估时需要的学生基本信息
 */
export interface StudentContext {
  /** 学生ID */
  id: number
  /** 学生姓名 */
  name: string
  /** 性别 */
  gender: '男' | '女'
  /** 出生日期 (ISO 格式) */
  birthday: string
  /** 年龄（月）- 计算后的月龄 */
  ageInMonths: number
  /** 障碍类型（可选） */
  disorder?: string
  /** 班级ID（可选） */
  classId?: number
  /** 班级名称（可选） */
  className?: string
}

/**
 * 计算年龄（月）的工具函数
 */
export function calculateAgeInMonths(birthday: string): number {
  const birth = new Date(birthday)
  const today = new Date()

  let months = (today.getFullYear() - birth.getFullYear()) * 12
  months += today.getMonth() - birth.getMonth()

  // 如果当月天数小于出生天数，减去一个月
  if (today.getDate() < birth.getDate()) {
    months--
  }

  return Math.max(0, months)
}

// ============================================================
// 题目与选项
// ============================================================

/**
 * 选项定义
 */
export interface ScaleOption {
  /** 选项值 */
  value: number | string
  /** 显示标签（如 "通过"、"A.无"） */
  label: string
  /** 选项说明（可选） */
  description?: string
  /** 对应分值 */
  score: number
}

/**
 * 题目定义 - 所有量表题目的通用结构
 */
export interface ScaleQuestion {
  /** 题目ID */
  id: number | string
  /** 维度名称/代码 */
  dimension: string
  /** 维度显示名称 */
  dimensionName?: string
  /** 题目内容/描述 */
  content: string
  /** 选项列表 */
  options: ScaleOption[]
  /** 量表特有元数据（如 age_stage、validityType 等） */
  metadata?: Record<string, any>
  /** 语音文件路径（可选） */
  audioPath?: string
}

// ============================================================
// 答案记录
// ============================================================

/**
 * 答案记录
 */
export interface ScaleAnswer {
  /** 题目ID */
  questionId: number | string
  /** 答案值 */
  value: number | string
  /** 对应分数 */
  score: number
  /** 答题时间戳 */
  timestamp: number
  /** 响应时长（毫秒） */
  responseTime?: number
}

// ============================================================
// 评估状态
// ============================================================

/**
 * 评估状态 - 驱动器内部状态
 */
export interface AssessmentState {
  /** 当前题目索引 */
  currentIndex: number
  /** 所有答案 (questionId -> ScaleAnswer) */
  answers: Record<string, ScaleAnswer>
  /** 是否完成 */
  isComplete: boolean
  /** 完成原因（正常完成/规则终止） */
  completionReason?: 'normal' | 'rule_terminated' | 'user_cancelled'
  /** 驱动器内部状态（如 S-M 的基线/上限状态） */
  metadata?: Record<string, any>
  /** 开始时间 */
  startTime?: number
  /** 结束时间 */
  endTime?: number
}

// ============================================================
// 导航决策
// ============================================================

/**
 * 导航决策类型
 */
export type NavigationAction = 'next' | 'prev' | 'jump' | 'complete'

/**
 * 导航决策 - getNextQuestion 的返回类型
 */
export interface NavigationDecision {
  /** 导航动作 */
  action: NavigationAction
  /** jump 时的目标索引 */
  targetIndex?: number
  /** jump 时的目标题目ID */
  targetQuestionId?: number | string
  /** 提示信息（如 "评估自动结束"） */
  message?: string
  /** 是否自动跳转（默认 true） */
  autoNavigate?: boolean
}

// ============================================================
// 评分结果
// ============================================================

/**
 * 维度分数
 */
export interface DimensionScore {
  /** 维度代码 */
  code: string
  /** 维度名称 */
  name: string
  /** 原始分 */
  rawScore: number
  /** 标准化分数（如 T 分） */
  standardScore?: number
  /** 百分位 */
  percentile?: number
  /** 题目总数 */
  itemCount: number
  /** 通过数/得分数 */
  passedCount?: number
  /** 平均分 */
  averageScore?: number
}

/**
 * 效度检查结果（部分量表需要）
 */
export interface ValidityCheckResult {
  /** 是否有效 */
  isValid: boolean
  /** 正向指示分（Positive Indication） */
  piScore?: number
  /** 负向指示分（Negative Indication） */
  niScore?: number
  /** PI 切分点 */
  piThreshold?: number
  /** NI 切分点 */
  niThreshold?: number
  /** 警告标记 */
  warningFlags?: string[]
  /** 无效原因 */
  invalidReason?: string
}

/**
 * 评分结果 - 统一的评分结果格式
 */
export interface ScoreResult {
  // ========== 基础信息 ==========
  /** 量表代码 */
  scaleCode: string
  /** 学生ID */
  studentId: number
  /** 评估日期 */
  assessmentDate: string

  // ========== 维度分数 ==========
  /** 各维度分数 */
  dimensions: DimensionScore[]

  // ========== 总分/综合指标 ==========
  /** 总分/原始总分 */
  totalScore?: number
  /** 标准分（如 S-M 的 SQ） */
  standardScore?: number
  /** T 分（如 Conners） */
  tScore?: number
  /** 百分位 */
  percentile?: number

  // ========== 效度检查 ==========
  /** 效度检查结果 */
  validity?: ValidityCheckResult

  // ========== 评定等级 ==========
  /** 等级描述 */
  level: string
  /** 等级代码 */
  levelCode?: string

  // ========== 原始数据 ==========
  /** 原始答案（用于存档） */
  rawAnswers: Record<string, any>
  /** 答题时长统计 */
  timing?: {
    totalTime: number      // 总用时（毫秒）
    averageTime: number    // 平均每题用时
  }
}

// ============================================================
// 反馈与建议
// ============================================================

/**
 * 评估反馈与 IEP 建议
 */
export interface AssessmentFeedback {
  /** 总体评价 */
  summary: string
  /** 优势领域 */
  strengths: string[]
  /** 待提升领域 */
  weaknesses: string[]
  /** IEP 建议 */
  recommendations: string[]
  /** 训练重点 */
  trainingFocus: string[]
  /** 资源推荐 */
  resourceSuggestions?: string[]
  /** 家庭指导建议 */
  homeGuidance?: string[]
}

// ============================================================
// 量表元信息
// ============================================================

/**
 * 量表基本信息
 */
export interface ScaleInfo {
  /** 量表代码 */
  code: string
  /** 量表名称 */
  name: string
  /** 量表版本 */
  version: string
  /** 简短描述 */
  description?: string
  /** 适用年龄范围（月） */
  ageRange: {
    min: number
    max: number
  }
  /** 题目总数 */
  totalQuestions: number
  /** 评估维度列表 */
  dimensions: string[]
  /** 预估用时（分钟） */
  estimatedTime?: number
  /** 图标（可选） */
  icon?: string
}

// ============================================================
// 量表驱动器契约（核心接口）
// ============================================================

/**
 * 量表驱动器契约 - 核心接口
 *
 * 所有具体量表驱动器必须实现此接口
 */
export interface ScaleDriver {
  // ========== 元信息 ==========

  /** 量表代码（唯一标识） */
  readonly scaleCode: string

  /** 量表名称 */
  readonly scaleName: string

  /** 量表版本 */
  readonly version: string

  /** 适用年龄范围（月） */
  readonly ageRange: { min: number; max: number }

  /** 题目总数（预估，实际可能因跳题而不同） */
  readonly totalQuestions: number

  /** 评估维度列表 */
  readonly dimensions: string[]

  // ========== 题目管理 ==========

  /**
   * 获取题目列表
   * @param context 学生上下文（用于确定起始位置等）
   * @returns 题目数组
   */
  getQuestions(context: StudentContext): ScaleQuestion[]

  /**
   * 获取起始题目索引
   * @param context 学生上下文
   * @returns 起始索引
   */
  getStartIndex(context: StudentContext): number

  /**
   * 获取下一个题目的导航决策
   * 这是关键的跳题逻辑钩子
   *
   * @param currentIndex 当前题目索引
   * @param answers 已收集的答案
   * @param state 当前评估状态
   * @returns 导航决策
   */
  getNextQuestion(
    currentIndex: number,
    answers: Record<string, ScaleAnswer>,
    state: AssessmentState
  ): NavigationDecision

  // ========== 评分计算 ==========

  /**
   * 计算评分结果
   * @param answers 所有答案
   * @param context 学生上下文
   * @returns 评分结果
   */
  calculateScore(
    answers: Record<string, ScaleAnswer>,
    context: StudentContext
  ): ScoreResult

  // ========== 反馈生成 ==========

  /**
   * 生成评估反馈和 IEP 建议
   * @param scoreResult 评分结果
   * @returns 结构化反馈
   */
  generateFeedback(scoreResult: ScoreResult): AssessmentFeedback

  // ========== 可选方法 ==========

  /**
   * 计算进度百分比（可选）
   * @param state 当前状态
   * @returns 0-100 的进度值
   */
  calculateProgress?(state: AssessmentState): number

  /**
   * 验证答案是否有效（可选）
   * @param questionId 题目ID
   * @param value 答案值
   * @returns 是否有效
   */
  validateAnswer?(questionId: number | string, value: any): boolean

  /**
   * 获取欢迎对话框内容（可选）
   * @returns 欢迎内容配置
   */
  getWelcomeContent?(): {
    title: string
    intro: string
    sections: Array<{
      icon: string
      title: string
      content: string
    }>
    footer?: string
  }

  /**
   * 获取量表基本信息
   */
  getScaleInfo(): ScaleInfo
}

// ============================================================
// 评估记录（数据库存储格式）
// ============================================================

/**
 * 评估记录 - 用于存储到数据库
 */
export interface AssessmentRecord {
  /** 记录ID（自增） */
  id?: number
  /** 学生ID */
  student_id: number
  /** 量表代码 */
  scale_code: string
  /** 班级ID */
  class_id?: number
  /** 班级快照（JSON） */
  class_snapshot?: string
  /** 模块代码 */
  module_code?: string
  /** 原始答案（JSON） */
  answers: string
  /** 评分结果（JSON） */
  score_result: string
  /** 反馈建议（JSON） */
  feedback?: string
  /** 标准分/总分 */
  total_score?: number
  /** 评定等级 */
  level?: string
  /** 是否有效 */
  is_valid: number
  /** 开始时间 */
  start_time: string
  /** 结束时间 */
  end_time: string
  /** 创建时间 */
  created_at?: string
}

// ============================================================
// 常量定义
// ============================================================

/**
 * 量表代码枚举
 */
export const SCALE_CODES = {
  SM: 'sm',                    // 婴儿-初中生社会生活能力量表
  WEEFIM: 'weefim',            // 改良儿童功能独立性评估量表
  CSIRS: 'csirs',              // 儿童感觉统合能力发展评定量表
  CONNERS_PSQ: 'conners-psq',  // Conners 父母用问卷
  CONNERS_TRS: 'conners-trs'   // Conners 教师用问卷
} as const

export type ScaleCode = typeof SCALE_CODES[keyof typeof SCALE_CODES]
