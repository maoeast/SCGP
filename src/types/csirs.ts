// src/types/csirs.ts
// CSIRS量表类型定义

/** CSIRS维度类型 */
export type CSIRSDimensionType = 'vestibular' | 'tactile' | 'proprioception' | 'learning' | 'executive';

/** CSIRS评定等级 */
export type CSIRSEvaluationLevelType = '严重偏低' | '偏低' | '正常' | '优秀' | '非常优秀';

/**
 * CSIRS评估题目
 * 定义单个评估题目的结构和属性
 */
export interface CSIRSQuestion {
  /** 题目ID */
  id: number;
  /** 维度名称 */
  dimension: string;
  /** 维度英文标识 */
  dimension_en: CSIRSDimensionType;
  /** 最小月龄 */
  age_min: number;
  /** 最大月龄 */
  age_max: number;
  /** 题目描述(2025优化版) */
  title: string;
  /** 语音文件路径(可选) */
  audio?: string;
}

/**
 * CSIRS评估维度
 * 定义评估的5个维度
 */
export interface CSIRSDimension {
  /** 维度ID (1-5) */
  id: number;
  /** 维度中文名 */
  name: string;
  /** 维度英文标识 */
  name_en: CSIRSDimensionType;
  /** 起始题号 */
  question_start: number;
  /** 结束题号 */
  question_end: number;
  /** 最小适用年龄(岁) */
  min_age?: number;
}

/**
 * CSIRS原始分到T分转换表
 * 基于官方常模数据
 */
export interface CSIRSConversionTable {
  /** 年龄(岁) */
  age_years: number;
  /** 各维度原始分范围 */
  dimensions: {
    /** 前庭觉调节与运动规划原始分范围 */
    vestibular: number[];
    /** 触觉调节与情绪行为原始分范围 */
    tactile: number[];
    /** 身体感知与动作协调原始分范围 */
    proprioception: number[];
    /** 视听知觉与学业表现原始分范围(6岁+) */
    learning?: number[];
    /** 执行功能与社会适应原始分范围(10岁+) */
    executive?: number[];
  };
}

/**
 * CSIRS答题记录
 * 记录单个题目的答案
 */
export interface CSIRSAnswer {
  /** 题目ID */
  question_id: number;
  /** 评分(1-5分) */
  score: number;
  /** 答题用时(毫秒) */
  answer_time?: number;
}

/**
 * CSIRS评估记录
 * 完整的评估数据
 */
export interface CSIRSAssessment {
  /** 评估ID */
  id: number;
  /** 学生ID */
  student_id: number;
  /** 学生姓名 */
  student_name: string;
  /** 学生年龄(月) */
  age_months: number;
  /** 各维度原始分 */
  raw_scores: Record<string, number>;
  /** 各维度T分 */
  t_scores: Record<string, number>;
  /** 总T分 */
  total_t_score: number;
  /** 评定等级 */
  level: CSIRSEvaluationLevelType;
  /** 评估开始时间 (ISO 8601格式) */
  start_time: string;
  /** 评估结束时间 (ISO 8601格式, 可选) */
  end_time?: string;
  /** 答题记录列表 */
  answers: CSIRSAnswer[];
}

/**
 * CSIRS历史评估记录
 * 用于历史对比和趋势分析
 */
export interface CSIRSHistoryItem {
  /** 评估ID */
  assess_id: number;
  /** 评估日期 */
  date: string;
  /** 学生年龄(月) */
  age_months: number;
  /** 各维度T分 */
  t_scores: Record<string, number>;
  /** 总T分 */
  total_t_score: number;
  /** 评定等级 */
  level: CSIRSEvaluationLevelType;
}

/**
 * CSIRS等级评定标准
 * 定义T分范围与等级的对应关系
 */
export interface CSIRSEvaluationLevel {
  /** 最低T分 */
  min_t: number;
  /** 最高T分 */
  max_t: number;
  /** 等级描述 */
  level: CSIRSEvaluationLevelType;
  /** 等级说明 */
  description: string;
  /** 显示颜色 */
  color: string;
}
