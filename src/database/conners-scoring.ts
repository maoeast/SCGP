/**
 * Conners 量表评分逻辑
 * 基于 Conners 1978 年修订版
 * 包含: 漏填处理、维度计算、完整评分流程
 */

import {
  PSQ_DIMENSION_QUESTIONS_EN
} from './conners-psq-questions'
import {
  TRS_DIMENSION_QUESTIONS_EN
} from './conners-trs-questions'
import { calculateConnersTScore } from './conners-norms'

const MISSING_TOLERANCE = 0.1  // 10% 漏填容忍度

// ==================== 类型定义 ====================

export interface DimensionScoreResult {
  rawScore: number
  isAdjusted: boolean
  isValid: boolean
  missingCount: number
}

export interface ConnersScoreResult {
  dimensionScores: Record<string, DimensionScoreResult>
  tScores: Record<string, number>
  level: string
}

// ==================== 工具函数 ====================

/**
 * 计算月龄
 */
function getAgeInMonths(birthday: string): number {
  const birth = new Date(birthday)
  const today = new Date()

  let months = (today.getFullYear() - birth.getFullYear()) * 12
  months += today.getMonth() - birth.getMonth()

  if (today.getDate() < birth.getDate()) {
    months--
  }

  return Math.max(0, months)
}

// ==================== 漏填处理 ====================

/**
 * 处理单个维度的漏填
 */
function processDimensionWithMissing(
  answers: Record<number, number | null>,
  questionIds: number[]
): DimensionScoreResult {
  const totalQuestions = questionIds.length
  const answeredScores: number[] = []
  let missingCount = 0

  for (const qid of questionIds) {
    const score = answers[qid]
    if (score === null || score === undefined) {
      missingCount++
    } else {
      answeredScores.push(score)
    }
  }

  const missingRatio = missingCount / totalQuestions

  // 漏填过多
  if (missingRatio > MISSING_TOLERANCE) {
    return {
      rawScore: 0,
      isAdjusted: false,
      isValid: false,
      missingCount
    }
  }

  // 漏填在容忍范围内，用平均分填补
  if (missingCount > 0) {
    const actualSum = answeredScores.reduce((a, b) => a + b, 0)
    const actualCount = answeredScores.length
    const avgScore = actualSum / actualCount

    // 用平均分填补缺失值，然后计算总平均分
    const adjustedScore = avgScore  // 平均分保持不变

    return {
      rawScore: Math.round(adjustedScore * 100) / 100,
      isAdjusted: true,
      isValid: true,
      missingCount
    }
  }

  // 无漏填 - 计算平均分
  const sum = answeredScores.reduce((a, b) => a + b, 0)
  const avgScore = sum / answeredScores.length
  return {
    rawScore: Math.round(avgScore * 100) / 100,
    isAdjusted: false,
    isValid: true,
    missingCount: 0
  }
}

/**
 * 计算各维度分数
 */
export function calculateDimensionScores(
  answers: Record<number, number | null>,
  scaleType: 'psq' | 'trs'
): Record<string, DimensionScoreResult> {
  // 使用英文维度映射
  const dimensionQuestions = scaleType === 'psq' ? PSQ_DIMENSION_QUESTIONS_EN : TRS_DIMENSION_QUESTIONS_EN
  const results: Record<string, DimensionScoreResult> = {}

  for (const [dim, questionIds] of Object.entries(dimensionQuestions)) {
    results[dim] = processDimensionWithMissing(answers, questionIds)
  }

  return results
}

// ==================== 完整评分流程 ====================

/**
 * 完整评分流程
 */
export async function calculateConnersScores(
  answers: Record<number, number | null>,
  student: { gender: string; birthday: string },
  scaleType: 'psq' | 'trs'
): Promise<ConnersScoreResult> {
  // 验证必需字段
  if (!student?.gender) {
    throw new Error('学生性别不能为空')
  }
  if (!student?.birthday) {
    throw new Error('学生生日不能为空')
  }

  // 1. 维度分数计算
  const dimensionScores = calculateDimensionScores(answers, scaleType)

  // 2. 计算T分
  const tScores: Record<string, number> = {}
  const ageMonths = getAgeInMonths(student.birthday)
  const gender = student.gender === '男' ? 'male' : 'female'

  for (const [dim, result] of Object.entries(dimensionScores)) {
    if (result.isValid) {
      tScores[dim] = calculateConnersTScore(
        result.rawScore,
        gender,
        ageMonths,
        dim,
        scaleType
      )
    }
  }

  // 3. 评定等级
  const level = determineConnersLevel(tScores)

  return {
    dimensionScores,
    tScores,
    level
  }
}

/**
 * 计算评定等级
 */
function determineConnersLevel(tScores: Record<string, number>): string {
  // 使用多动指数或最高T分
  const scores = Object.values(tScores)
  const maxScore = Math.max(...scores)

  if (maxScore < 60) return 'normal'
  if (maxScore < 70) return 'borderline'
  return 'clinical'
}
