/**
 * SDQ (长处和困难问卷) 类型定义
 *
 * 适用于 3-16 岁儿童的情绪行为评估
 * 父母版 25 题，3 点计分
 *
 * @module types/sdq
 */

/**
 * SDQ 维度代码
 */
export type SDQDimensionCode =
  | 'emotional'       // 情绪症状
  | 'conduct'         // 品行问题
  | 'hyperactivity'   // 多动
  | 'peer'            // 同伴交往问题
  | 'prosocial'       // 亲社会行为
  | 'total_difficulties' // 困难总分（前4个因子之和）

/**
 * SDQ 评级等级
 */
export type SDQLevel = 'normal' | 'borderline' | 'abnormal'

/**
 * SDQ 维度分数
 */
export interface SDQDimensionScore {
  /** 维度代码 */
  code: SDQDimensionCode
  /** 维度名称 */
  name: string
  /** 原始分数 (0-10) */
  rawScore: number
  /** 评级 */
  level: SDQLevel
  /** 评级中文名 */
  levelName: string
}

/**
 * SDQ 评估结果
 */
export interface SDQScoreResult {
  /** 学生ID */
  studentId: number
  /** 评估日期 */
  assessmentDate: string
  /** 各维度分数 */
  dimensions: SDQDimensionScore[]
  /** 困难总分 (0-40) */
  totalDifficultiesScore: number
  /** 困难总分评级 */
  totalDifficultiesLevel: SDQLevel
  /** 亲社会行为分数 (0-10) */
  prosocialScore: number
  /** 亲社会行为评级 */
  prosocialLevel: SDQLevel
  /** 原始答案（每题得分） */
  rawScores: Record<string, number>
  /** 年龄（月） */
  ageMonths: number
}

/**
 * SDQ 评估记录（数据库存储格式）
 */
export interface SDQAssessRecord {
  id?: number
  student_id: number
  age_months: number
  raw_scores: string  // JSON: Record<string, number>
  dimension_scores: string  // JSON: SDQDimensionScore[]
  total_difficulties_score: number
  prosocial_score: number
  level: string
  levelCode?: SDQLevel  // 英文评级代码
  is_valid: number
  start_time: string
  end_time: string
  created_at?: string
}

/**
 * SDQ 结构化反馈（返回给前端）
 */
export interface SDQStructuredFeedback {
  /** 总体评价 */
  overallSummary: string[]
  /** 总体建议 */
  overallAdvice: string[]
  /** 各维度详情 */
  dimensionDetails: SDQDimensionDetail[]
  /** 专家建议（木桶效应+矛盾规避+总分兜底） */
  expertRecommendations: string[]
}

/**
 * SDQ 维度详情（用于反馈生成）
 */
export interface SDQDimensionDetail {
  code: string
  name: string
  level: SDQLevel
  levelName: string
  score: number
  severity: 'success' | 'warning' | 'danger'
  content: string[]
  advice: string[]
  structured_advice?: Record<string, string[]>
}
