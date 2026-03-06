/**
 * SRS-2 (社交反应量表第二版) 类型定义
 *
 * @module types/srs2
 */

/**
 * SRS-2 子维度代码
 */
export type SRS2DimensionCode = 'awareness' | 'cognition' | 'communication' | 'motivation' | 'repetitive'

/**
 * SRS-2 临床等级
 */
export type SRS2Level = 'normal' | 'mild' | 'moderate' | 'severe'

/**
 * SRS-2 维度分数数据
 */
export interface SRS2DimensionScore {
  code: SRS2DimensionCode
  name: string
  rawScore: number
  tScore: number
  level: SRS2Level
  levelName: string
}

/**
 * SRS-2 评估记录
 */
export interface SRS2AssessRecord {
  id: number
  student_id: number
  start_time: string
  end_time?: string
  total_raw_score: number
  total_t_score: number
  total_level: string
  dimension_scores: string  // JSON string
  raw_answers: string  // JSON string
  age_months: number
  gender: string
}

/**
 * SRS-2 维度详情（用于报告展示）
 */
export interface SRS2DimensionDetail {
  code: string
  name: string
  rawScore: number
  tScore: number
  level: SRS2Level
  levelName: string
  severity: 'success' | 'warning' | 'danger'
  content: string
  advice: string[]
}

/**
 * SRS-2 结构化反馈
 */
export interface SRS2StructuredFeedback {
  overallSummary: string
  overallAdvice: string[]
  dimensionDetails: SRS2DimensionDetail[]
}
