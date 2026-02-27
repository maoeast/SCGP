// src/types/conners.ts
// Conners量表类型定义

/** Conners PSQ维度类型 */
export type ConnersPSQDimensionType = 'conduct' | 'learning' | 'impulsivity' | 'anxiety' | 'hyperactivity_index';

/** Conners TRS维度类型 */
export type ConnersTRSDimensionType = 'conduct' | 'hyperactivity' | 'inattention' | 'hyperactivity_index';

/** Conners评定等级 */
export type ConnersEvaluationLevelType = 'normal' | 'borderline' | 'clinical';

/**
 * Conners PSQ评估题目
 */
export interface ConnersPSQQuestion {
  /** 题目ID */
  id: number;
  /** 题目内容 */
  content: string;
  /** 维度 */
  dimension: ConnersPSQDimensionType;
  /** 效度类型 */
  validityType?: 'PI' | 'NI' | null;
}

/**
 * Conners TRS评估题目
 */
export interface ConnersTRSQuestion {
  /** 题目ID */
  id: number;
  /** 题目内容 */
  content: string;
  /** 维度 */
  dimension: ConnersTRSDimensionType;
  /** 效度类型 */
  validityType?: 'PI' | 'NI' | null;
}

/**
 * Conners答题记录
 */
export interface ConnersAnswer {
  /** 题目ID */
  question_id: number;
  /** 评分(0-3分: A.无, B.稍有, C.相当多, D.很多) */
  score: number;
  /** 答题用时(毫秒) */
  answer_time?: number;
}

/**
 * Conners维度分数结果
 */
export interface ConnersDimensionScoreResult {
  /** 原始分 */
  rawScore: number;
  /** 是否经过调整(漏填填补) */
  isAdjusted: boolean;
  /** 是否有效 */
  isValid: boolean;
  /** 漏填数量 */
  missingCount: number;
}

/**
 * Conners效度检查结果
 */
export interface ConnersValidityCheckResult {
  /** 是否有效 */
  isValid: boolean;
  /** PI得分 */
  piScore: number;
  /** PI切分点 */
  piThreshold: number;
  /** PI状态 */
  piStatus: 'pass' | 'warning';
  /** NI得分 */
  niScore: number;
  /** NI切分点 */
  niThreshold: number;
  /** NI状态 */
  niStatus: 'pass' | 'warning';
  /** 无效原因 */
  invalidReason?: string;
}

/**
 * Conners评分结果
 */
export interface ConnersScoreResult {
  /** 各维度分数 */
  dimensionScores: Record<string, ConnersDimensionScoreResult>;
  /** 各维度T分 */
  tScores: Record<string, number>;
  /** 效度检查 */
  validity: ConnersValidityCheckResult;
  /** 评定等级 */
  level: ConnersEvaluationLevelType;
}

/**
 * Conners PSQ评估记录
 */
export interface ConnersPSQAssessment {
  /** 评估ID */
  id: number;
  /** 学生ID */
  student_id: number;
  /** 性别 */
  gender: string;
  /** 年龄(月) */
  age_months: number;
  /** 原始分(JSON) */
  raw_scores: string;
  /** 维度分数(JSON) */
  dimension_scores: string;
  /** T分(JSON) */
  t_scores: string;
  /** PI得分 */
  pi_score: number;
  /** NI得分 */
  ni_score: number;
  /** 是否有效 */
  is_valid: number;
  /** 无效原因 */
  invalid_reason?: string;
  /** 多动指数 */
  hyperactivity_index: number;
  /** 评定等级 */
  level: string;
  /** 开始时间 */
  start_time: string;
  /** 结束时间 */
  end_time: string;
  /** 创建时间 */
  created_at: string;
}

/**
 * Conners TRS评估记录
 */
export interface ConnersTRSAssessment {
  /** 评估ID */
  id: number;
  /** 学生ID */
  student_id: number;
  /** 性别 */
  gender: string;
  /** 年龄(月) */
  age_months: number;
  /** 原始分(JSON) */
  raw_scores: string;
  /** 维度分数(JSON) */
  dimension_scores: string;
  /** T分(JSON) */
  t_scores: string;
  /** PI得分 */
  pi_score: number;
  /** NI得分 */
  ni_score: number;
  /** 是否有效 */
  is_valid: number;
  /** 无效原因 */
  invalid_reason?: string;
  /** 多动指数 */
  hyperactivity_index: number;
  /** 评定等级 */
  level: string;
  /** 开始时间 */
  start_time: string;
  /** 结束时间 */
  end_time: string;
  /** 创建时间 */
  created_at: string;
}
