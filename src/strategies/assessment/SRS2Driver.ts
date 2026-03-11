/**
 * SRS-2 (社交反应量表第二版) 驱动器
 *
 * 学龄版 65 题，适用于 6-18 岁儿童
 * 4 点计分：0 = 从不，1 = 偶尔，2 = 经常，3 = 总是
 *
 * @module strategies/assessment/SRS2Driver
 */

import { BaseDriver } from './BaseDriver'
import type {
  StudentContext,
  ScaleQuestion,
  ScaleAnswer,
  ScoreResult,
  DimensionScore
} from '@/types/assessment'
import {
  SRS2_QUESTIONS,
  SRS2_DIMENSION_NAMES,
  SRS2_DIMENSION_QUESTIONS,
  reverseScore,
  getSeverityFromTScore,
  getSRS2ScaleQuestions,
  type SRS2DimensionCode
} from '@/database/srs2-questions'
import { getSRSTScore } from '@/database/srs2-norms'
import { ASSESSMENT_LIBRARY } from '@/config/feedbackConfig'
import type { SRS2Level, SRS2StructuredFeedback } from '@/types/srs2'

/**
 * SRS-2 维度详情（用于反馈生成）
 */
export interface SRS2DimensionDetail {
  code: string
  name: string
  rawScore: number
  tScore: number
  level: 'normal' | 'mild' | 'moderate' | 'severe'
  levelName: string
  severity: 'success' | 'warning' | 'danger'
  content: string
  advice: string[]
}

// 维度代码列表
const SRS2_DIMENSIONS: SRS2DimensionCode[] = [
  'awareness',
  'cognition',
  'communication',
  'motivation',
  'repetitive'
]

// 等级名称映射
const LEVEL_NAMES: Record<SRS2Level, string> = {
  normal: '正常',
  mild: '轻度',
  moderate: '中度',
  severe: '重度'
}

/**
 * 根据等级获取 severity 类型
 */
function getSeverityType(level: SRS2Level): 'success' | 'warning' | 'danger' {
  switch (level) {
    case 'normal':
      return 'success'
    case 'mild':
      return 'warning'
    case 'moderate':
    case 'severe':
      return 'danger'
    default:
      return 'success'
  }
}

/**
 * SRS-2 驱动器
 */
export class SRS2Driver extends BaseDriver {
  // ========== 量表元信息 ==========

  readonly scaleCode = 'srs2'
  readonly scaleName = '社交反应量表 (SRS-2)'
  readonly version = '学龄版'
  readonly ageRange = { min: 72, max: 216 } // 6-18岁（月）
  readonly totalQuestions = 65
  readonly dimensions = SRS2_DIMENSIONS

  // ========== 模型配置 ==========
  private studentName: string = ''
  private studentAgeMonths: number = 0
  private studentGender: '男' | '女' = '男'

  /**
   * 配置学生信息（用于反馈生成和T分数计算）
   */
  setStudentContext(context: StudentContext & { gender?: '男' | '女' }): void {
    this.studentName = context.name
    this.studentAgeMonths = context.ageInMonths
    this.studentGender = context.gender || '男'
  }

  /**
   * 获取题目列表
   */
  getQuestions(_context: StudentContext): ScaleQuestion[] {
    return getSRS2ScaleQuestions()
  }

  /**
   * 获取起始题目索引
   */
  getStartIndex(_context: StudentContext): number {
    return 0
  }

  // ========== 评分计算 ==========
  /**
   * 计算评分结果
   */
  calculateScore(
    answers: Record<string, ScaleAnswer>,
    context: StudentContext
  ): ScoreResult {
    console.log('%c========== SRS-2 评分计算开始 ==========', 'color: #2196F3; font-size: 14px; font-weight: bold;')
    console.log('📋 学生信息:', { id: context.id, name: context.name, ageMonths: context.ageInMonths, gender: this.studentGender })

    // 1. 处理答案：对反向题进行计分转换
    const processedScores: Record<string, number> = {}
    for (const q of SRS2_QUESTIONS) {
      const answer = answers[q.id]
      if (answer !== undefined) {
        // 反向计分题需要转换
        if (q.isReversed) {
          processedScores[q.id] = reverseScore(answer.score)
        } else {
          processedScores[q.id] = answer.score
        }
      }
    }

    console.log('%c[Step 1] 原始答案处理（含反向计分转换）', 'color: #FF9800; font-weight: bold;')
    console.log('反向计分题:', SRS2_QUESTIONS.filter(q => q.isReversed).map(q => q.id))
    console.log('处理后得分:', processedScores)

    // 2. 计算各维度原始分和 T分数
    const dimensionScores = this.calculateDimensionScores(processedScores)

    // 3. 计算总分
    const totalRawScore = Object.values(processedScores).reduce((sum, score) => sum + score, 0)
    const totalTScore = getSRSTScore('total', this.studentGender, this.studentAgeMonths, totalRawScore)
    const totalLevel = getSeverityFromTScore(totalTScore)

    // 🔬 输出评分结果
    console.log('%c[Step 2] 维度分数计算结果:', 'color: #4CAF50; font-weight: bold;')
    console.table(Object.entries(dimensionScores).map(([code, data]) => ({
      '维度': SRS2_DIMENSION_NAMES[code as SRS2DimensionCode],
      '原始分': data.rawScore,
      'T分数': data.tScore,
      '等级': LEVEL_NAMES[data.level]
    })))

    console.log('%c[Step 3] 总分汇总:', 'color: #9C27B0; font-weight: bold;', {
      '总原始分': totalRawScore,
      '总T分数': totalTScore,
      '总体等级': LEVEL_NAMES[totalLevel]
    })

    // 4. 构建维度分数数组
    const dimensions: DimensionScore[] = SRS2_DIMENSIONS.map(code => ({
      code,
      name: SRS2_DIMENSION_NAMES[code] || code,
      rawScore: dimensionScores[code]?.rawScore || 0,
      itemCount: SRS2_DIMENSION_QUESTIONS[code].length,
      passedCount: dimensionScores[code]?.rawScore || 0,
      averageScore: (dimensionScores[code]?.rawScore || 0) / SRS2_DIMENSION_QUESTIONS[code].length,
      level: dimensionScores[code]?.level || 'normal',
      levelName: LEVEL_NAMES[dimensionScores[code]?.level || 'normal']
    }))

    // 5. 序列化原始答案
    const rawAnswers: Record<string, number> = {}
    for (const [key, score] of Object.entries(processedScores)) {
      rawAnswers[key] = score
    }

    console.log('%c========== SRS-2 评分计算完成 ==========', 'color: #2196F3; font-size: 14px; font-weight: bold;')

    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      dimensions,
      totalScore: totalRawScore,
      level: LEVEL_NAMES[totalLevel],
      levelCode: totalLevel,
      rawAnswers,
      timing: this.calculateTiming(answers),
      // 额外存储 T分数信息
      extraData: {
        totalTScore,
        dimensionTScores: Object.fromEntries(
          SRS2_DIMENSIONS.map(code => [code, dimensionScores[code]?.tScore || 50])
        )
      }
    }
  }

  /**
   * 计算各维度分数（原始分 + T分数）
   */
  private calculateDimensionScores(
    processedScores: Record<string, number>
  ): Record<string, { rawScore: number; tScore: number; level: SRS2Level }> {
    const results: Record<string, { rawScore: number; tScore: number; level: SRS2Level }> = {}

    for (const dimension of SRS2_DIMENSIONS) {
      const questionIds = SRS2_DIMENSION_QUESTIONS[dimension]
      let rawScore = 0
      for (const qid of questionIds) {
        rawScore += processedScores[qid] || 0
      }

      // 计算 T分数
      const tScore = getSRSTScore(dimension, this.studentGender, this.studentAgeMonths, rawScore)
      const level = getSeverityFromTScore(tScore) as SRS2Level

      results[dimension] = { rawScore, tScore, level }
    }

    return results
  }

  // ========== 反馈生成 ==========
  /**
   * 生成评估反馈和 IEP 建议
   */
  generateFeedback(scoreResult: ScoreResult): SRS2StructuredFeedback {
    const totalTScore =
      (scoreResult.extraData as { totalTScore?: number } | undefined)?.totalTScore ??
      scoreResult.totalScore ??
      50
    const studentName = this.studentName || '孩子'

    // 获取反馈配置
    const feedbackConfig = ASSESSMENT_LIBRARY.srs2

    // 1. 生成总体评价 - 从数组中匹配 T分数范围
    const totalRules = feedbackConfig.total_score_rules
    const levelConfig = this.matchScoreToLevel(totalRules, totalTScore)

    // 处理总体说明
    let overallSummary = ''
    if (levelConfig?.content) {
      overallSummary = levelConfig.content
    }

    // 2. 生成维度详情
    const dimensionDetails: SRS2DimensionDetail[] = []

    for (const dim of scoreResult.dimensions) {
      const dimConfig = feedbackConfig.dimensions[dim.code]
      const dimTScore = (scoreResult.extraData as { dimensionTScores: Record<string, number> })?.dimensionTScores?.[dim.code] || 50

      if (dimConfig?.levels && Array.isArray(dimConfig.levels)) {
        const dimLevelConfig = this.matchScoreToLevel(dimConfig.levels, dimTScore)

        if (dimLevelConfig) {
          dimensionDetails.push({
            code: dim.code,
            name: dimConfig?.label || SRS2_DIMENSION_NAMES[dim.code as SRS2DimensionCode] || dim.name,
            rawScore: dim.rawScore,
            tScore: dimTScore,
            level: getSeverityFromTScore(dimTScore) as SRS2Level,
            levelName: dimLevelConfig.title || LEVEL_NAMES[getSeverityFromTScore(dimTScore) as SRS2Level],
            severity: (dimLevelConfig.severity as 'success' | 'warning' | 'danger') || getSeverityType(getSeverityFromTScore(dimTScore) as SRS2Level),
            content: dimLevelConfig.summary || '',
            advice: dimLevelConfig.advice || []
          })
        }
      }
    }

    // 3. 占位符替换
    const replacePlaceholders = (text: string): string => {
      return text.replace(/\[儿童姓名\]/g, studentName)
    }

    const processedOverallSummary = replacePlaceholders(overallSummary)
    const processedOverallAdvice = (levelConfig?.base_advice || []).map(replacePlaceholders)
    const processedDimensionDetails = dimensionDetails.map(dim => ({
      ...dim,
      content: replacePlaceholders(dim.content),
      advice: dim.advice.map(replacePlaceholders)
    }))

    return {
      overallSummary: processedOverallSummary,
      overallAdvice: processedOverallAdvice,
      dimensionDetails: processedDimensionDetails
    }
  }

  /**
   * 从 levels 数组中匹配分数到对应的等级配置
   */
  private matchScoreToLevel(
    levels: Array<{ range: [number, number]; [key: string]: any }>,
    score: number
  ): { range: [number, number]; [key: string]: any } | null {
    if (!levels || !Array.isArray(levels)) {
      return null
    }
    for (const level of levels) {
      if (score >= level.range[0] && score <= level.range[1]) {
        return level
      }
    }
    // 兜底：返回第一个等级配置
    return levels[0] || null
  }

  // ========== 欢迎内容 ==========
  /**
   * 获取欢迎对话框内容
   */
  getWelcomeContent() {
    return {
      title: '社交反应量表 (SRS-2)',
      intro: '本问卷用于评估孩子的社交能力，请根据孩子最近 6 个月的情况如实作答。',
      sections: [
        {
          icon: '📋',
          title: '评估说明',
          content: '共 65 道题目，评估 5 个维度：社交觉知、社交认知、社交沟通、社交动机、刻板行为。请根据实际情况选择最符合的选项。'
        },
        {
          icon: '📝',
          title: '评分标准',
          content: '每道题目有 4 个选项：从不、偶尔、经常、总是。有些题目看起来问的是优点，有些问的是挑战，请看清题目后再作答。'
        }
      ],
      footer: '请注意：本评估结果仅供参考，不能作为临床诊断的依据。如有疑问，请咨询专业医生。'
    }
  }

  // ========== 图标 ==========
  protected getIcon(): string {
    return '🤝'
  }

  protected getDefaultDescription(): string {
    return '评估儿童的社交反应能力'
  }

  protected getEstimatedTime(): number {
    return 15 // 约15分钟
  }
}
