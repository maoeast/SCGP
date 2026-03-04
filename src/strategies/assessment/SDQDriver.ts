/**
 * SDQ (长处和困难问卷) 驱动器
 *
 * 父母版 25 题，适用于 3-16 岁儿童
 * 3 点计分：0 = 不符合， 1 = 有点符合， 2 = 完全符合
 *
 * @module strategies/assessment/SDQDriver
 */

import { BaseDriver } from './BaseDriver'
import type {
  StudentContext,
  ScaleQuestion,
  ScaleAnswer,
  ScoreResult,
  AssessmentFeedback,
  DimensionScore
} from '@/types/assessment'
import {
  SDQ_QUESTIONS,
  SDQ_OPTIONS,
  SDQ_DIMENSION_NAMES,
  SDQ_DIMENSION_QUESTIONS,
  SDQ_THRESHOLDS,
  reverseScore,
  isReversedQuestion,
  getSDQScaleQuestions
} from '@/database/sdq-questions'
import { ASSESSMENT_LIBRARY } from '@/config/feedbackConfig'
import type { SDQDimensionCode, SDQLevel } from '@/types/sdq'

/**
 * SDQ 维度详情（用于反馈生成）
 */
export interface SDQDimensionDetail {
  code: string
  name: string
  level: SDQLevel
  levelName: string
  score: number
  content: string[]
  advice: string[]
  structured_advice?: Record<string, string[]>
}



/**
 * SDQ 结构化反馈（返回给前端)
 */
export interface SDQStructuredFeedback {
  overallSummary: string[]
  overallAdvice: string[]
  dimensionDetails: SDQDimensionDetail[]
  expertRecommendations: string[]
}

// 维度代码列表
const SDQ_DIMENSIONS: SDQDimensionCode[] = [
  'emotional',
  'conduct',
  'hyperactivity',
  'peer',
  'prosocial'
]

// 等级名称映射
const LEVEL_NAMES: Record<SDQLevel, string> = {
  normal: '正常',
  borderline: '边缘',
  abnormal: '异常'
}

// 亲社会行为等级名称
const PROSOCIAL_LEVEL_NAMES: Record<string, string> = {
  normal: '优秀',
  borderline: '边缘',
  abnormal: '需培养'
}

/**
 * 根据分数确定等级
 */
function determineLevel(dimension: string, score: number): SDQLevel {
  const threshold = SDQ_THRESHOLDS[dimension]
  if (!threshold) return 'normal'

  if (dimension === 'prosocial') {
    // 亲社会行为：分数越高越好
    if (score >= threshold.normal) return 'normal'
    if (score >= threshold.borderline) return 'borderline'
    return 'abnormal'
  } else {
    // 其他维度：分数越低越好
    if (score <= threshold.normal) return 'normal'
    if (score <= threshold.borderline) return 'borderline'
    return 'abnormal'
  }
}

/**
 * 根据等级获取 severity 类型
 */
function getSeverityFromLevel(level: SDQLevel): 'success' | 'warning' | 'danger' {
  switch (level) {
    case 'normal':
      return 'success'
    case 'borderline':
      return 'warning'
    case 'abnormal':
      return 'danger'
    default:
      return 'success'
  }
}
/**
 * SDQ 驱动器
 */
export class SDQDriver extends BaseDriver {
  // ========== 量表元信息 ==========

  readonly scaleCode = 'sdq'
  readonly scaleName = '长处和困难问卷 (SDQ)'
  readonly version = '父母版'
  readonly ageRange = { min: 36, max: 192 } // 3-16岁（月）
  readonly totalQuestions = 25
  readonly dimensions = SDQ_DIMENSIONS

  // ========== 騡型配置 ==========
  private studentName: string = ''
  private studentAgeMonths: number = 0

  // ========== 騡型配置 ==========
  /**
   * 配置学生信息（用于反馈生成)
   */
  setStudentContext(context: StudentContext): void {
    this.studentName = context.name
    this.studentAgeMonths = context.ageInMonths
  }
  // ========== 騡型配置 ==========
  /**
   * 获取题目列表
   */
  getQuestions(_context: StudentContext): ScaleQuestion[] {
    return getSDQScaleQuestions()
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
    console.log('%c========== SDQ 评分计算开始 ==========', 'color: #2196F3; font-size: 14px; font-weight: bold;')
    console.log('📋 学生信息:', { id: context.id, name: context.name, ageMonths: context.ageInMonths })

    // 1. 处理答案：对反向题进行计分转换
    const processedScores: Record<string, number> = {}
    for (const q of SDQ_QUESTIONS) {
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
    console.log('反向计分题:', [7, 11, 14, 21, 25])
    console.log('处理后得分:', processedScores)
    // 2. 计算各维度分数
    const dimensionScores = this.calculateDimensionScores(processedScores)
    // 3. 计算困难总分（前4个因子之和）
    const totalDifficultiesScore =
      (dimensionScores['emotional']?.rawScore || 0) +
      (dimensionScores['conduct']?.rawScore || 0) +
      (dimensionScores['hyperactivity']?.rawScore || 1) +
      (dimensionScores['peer']?.rawScore || 0)
    // 4. 获取亲社会行为分数
    const prosocialScore = dimensionScores['prosocial']?.rawScore || 0
    // 5. 确定总体等级（基于困难总分）
    const totalLevel = determineLevel('total_difficulties', totalDifficultiesScore)
    // 🔬 输出评分结果
    console.log('%c[Step 2] 维度分数计算结果:', 'color: #4CAF50; font-weight: bold;')
    console.table(Object.entries(dimensionScores).map(([code, data]) => ({
      '维度': SDQ_DIMENSION_NAMES[code],
      '分数': data.rawScore,
      '等级': data.levelName,
      '满分': 10
    })))
    console.log('%c[Step 3] 总分汇总:', 'color: #9C27B0; font-weight: bold;', {
      '困难总分': totalDifficultiesScore,
      '亲社会行为分': prosocialScore,
      '总体等级': LEVEL_NAMES[totalLevel]
    })
    // 6. 构建维度分数数组（包含 level 和 levelName）
    const dimensions: DimensionScore[] = SDQ_DIMENSIONS.map(code => ({
      code,
      name: SDQ_DIMENSION_NAMES[code] || code,
      rawScore: dimensionScores[code]?.rawScore || 0,
      itemCount: 5,
      passedCount: dimensionScores[code]?.rawScore || 0,
      averageScore: (dimensionScores[code]?.rawScore || 0) / 5,
      level: dimensionScores[code]?.level || 'normal',
      levelName: dimensionScores[code]?.levelName || '正常'
    }))
    // 7. 序列化原始答案（存储转换后的分数）
    const rawAnswers: Record<string, number> = {}
    for (const [key, score] of Object.entries(processedScores)) {
      rawAnswers[key] = score
    }
    console.log('%c========== SDQ 评分计算完成 ==========', 'color: #2196F3; font-size: 14px; font-weight: bold;')
    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      dimensions,
      totalScore: totalDifficultiesScore,
      level: LEVEL_NAMES[totalLevel],
      levelCode: totalLevel,
      rawAnswers,
      timing: this.calculateTiming(answers)
    }
  }
  /**
   * 计算各维度分数
   */
  private calculateDimensionScores(
    processedScores: Record<string, number>
  ): Record<string, { rawScore: number; level: SDQLevel; levelName: string }> {
    const results: Record<string, { rawScore: number; level: SDQLevel; levelName: string }> = {}
    for (const [dimension, questionIds] of Object.entries(SDQ_DIMENSION_QUESTIONS)) {
      let rawScore = 0
      for (const qid of questionIds) {
        rawScore += processedScores[qid] || 0
      }
      const level = determineLevel(dimension, rawScore)
      results[dimension] = {
        rawScore,
        level,
        levelName: dimension === 'prosocial'
          ? PROSOCIAL_LEVEL_NAMES[level]
          : LEVEL_NAMES[level]
      }
    }
    return results
  }
  // ========== 反馈生成 ==========
  /**
   * 生成评估反馈和 IEP 建议
   * 实现木桶效应 + 矛盾规避 + 总分兜底策略
   */
  generateFeedback(scoreResult: ScoreResult): SDQStructuredFeedback {
    const totalDifficultiesScore = scoreResult.totalScore || 0
    const studentName = this.studentName || '孩子'
    const studentAgeMonths = this.studentAgeMonths

    // 获取反馈配置
    const feedbackConfig = ASSESSMENT_LIBRARY.sdq

    // 1. 生成总体评价 - 从数组中匹配分数范围
    const totalRules = feedbackConfig.total_score_rules
    const levelConfig = this.matchScoreToLevel(totalRules, totalDifficultiesScore)

    // 处理总体说明（可能包含年龄分层）
    let overallSummary: string[] = []
    if (levelConfig?.content) {
      overallSummary = [levelConfig.content]
    }
    // 如果有年龄分层内容，根据年龄选择
    if (levelConfig?.age_stratified_summary) {
      const ageGroup = studentAgeMonths < 72 ? 'preschool' : 'school_age' // 72个月 = 6岁
      const ageContent = levelConfig.age_stratified_summary[ageGroup]
      if (ageContent) {
        overallSummary.push(ageContent)
      }
    }

    // 2. 生成维度详情
    const dimensionDetails: SDQDimensionDetail[] = []
    const problemDimensions: SDQDimensionCode[] = [] // 记录有问题的维度

    for (const dim of scoreResult.dimensions) {
      const dimConfig = feedbackConfig.dimensions[dim.code]
      if (dimConfig?.levels && Array.isArray(dimConfig.levels)) {
        // 从 levels 数组中匹配分数范围
        const dimLevelConfig = this.matchScoreToLevel(dimConfig.levels, dim.rawScore)

        if (dimLevelConfig) {
          // 处理维度说明（可能包含年龄分层）
          let content: string[] = []
          if (dimLevelConfig.summary) {
            content = [dimLevelConfig.summary]
          }
          if (dimLevelConfig.age_stratified_summary) {
            const ageGroup = studentAgeMonths < 72 ? 'preschool' : 'school_age'
            const ageContent = dimLevelConfig.age_stratified_summary[ageGroup]
            if (ageContent) {
              content.push(ageContent)
            }
          }

          dimensionDetails.push({
            code: dim.code,
            name: dim.name,
            level: dim.level,
            levelName: dim.levelName,
            score: dim.rawScore,
            content,
            advice: dimLevelConfig.advice || [],
            structured_advice: dimLevelConfig.structured_advice
          })

          // 记录有问题的维度（severity 为 warning 或 danger）
          if (dimLevelConfig.severity === 'warning' || dimLevelConfig.severity === 'danger') {
            problemDimensions.push(dim.code)
          }
        }
      }
    }

    // 3. 生成专家建议（木桶效应 + 矛盾规避 + 总分兜底）
    const expertRecommendations: string[] = []

    // 优先级1: 提取有问题维度的针对性建议
    for (const dimCode of problemDimensions) {
      const dimConfig = feedbackConfig.dimensions[dimCode]
      if (dimConfig?.levels && Array.isArray(dimConfig.levels)) {
        const dimData = scoreResult.dimensions.find(d => d.code === dimCode)
        if (dimData) {
          const dimLevelConfig = this.matchScoreToLevel(dimConfig.levels, dimData.rawScore)
          if (dimLevelConfig?.structured_advice) {
            // 提取所有分类的建议
            for (const category of Object.values(dimLevelConfig.structured_advice)) {
              if (Array.isArray(category)) {
                expertRecommendations.push(...category)
              }
            }
          }
          if (dimLevelConfig?.advice) {
            expertRecommendations.push(...dimLevelConfig.advice)
          }
        }
      }
    }

    // 优先级2: 矛盾规避 - 如果亲社会行为有问题，过滤掉正面鼓励话术
    const prosocialHasIssue = problemDimensions.includes('prosocial')
    const contradictionKeywords = ['分享', '助人', '乐于', '善良', '亲社会', '帮助他人', '体谅他人']
    if (prosocialHasIssue) {
      // 过滤掉可能矛盾的正面鼓励话术
      const filteredRecommendations = expertRecommendations.filter(rec => {
        return !contradictionKeywords.some(keyword => rec.includes(keyword))
      })
      expertRecommendations.length = 0
      expertRecommendations.push(...filteredRecommendations)
    }

    // 优先级3: 总分兜底 - 添加通用建议
    if (levelConfig?.base_advice) {
      expertRecommendations.push(...levelConfig.base_advice)
    }

    // 4. 占位符替换
    const replacePlaceholders = (text: string): string => {
      return text.replace(/\[儿童姓名\]/g, studentName)
    }

    // 对所有文本进行占位符替换
    const processedOverallSummary = overallSummary.map(replacePlaceholders)
    const processedOverallAdvice = (levelConfig?.base_advice || []).map(replacePlaceholders)
    const processedExpertRecommendations = expertRecommendations.map(replacePlaceholders)
    const processedDimensionDetails = dimensionDetails.map(dim => ({
      ...dim,
      content: dim.content.map(replacePlaceholders),
      advice: dim.advice.map(replacePlaceholders),
      structured_advice: dim.structured_advice
        ? Object.fromEntries(
            Object.entries(dim.structured_advice).map(([key, values]) => [
              key,
              values.map(replacePlaceholders)
            ])
          )
        : undefined
    }))

    return {
      overallSummary: processedOverallSummary,
      overallAdvice: processedOverallAdvice,
      dimensionDetails: processedDimensionDetails,
      expertRecommendations: processedExpertRecommendations
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
  /**
   * 分析各维度情况并生成反馈（旧方法，保留向后兼容）
   */
  private analyzeDimensions(
    dimensions: DimensionScore[],
    dimensionConfigs: typeof ASSESSMENT_LIBRARY.sdq.dimensions
  ): {
    strengths: string[]
    weaknesses: string[]
    dimensionFeedback: { advice: string[] }[]
  } {
    const strengths: string[] = []
    const weaknesses: string[] = []
    const dimensionFeedback: { advice: string[] }[] = []
    for (const dim of dimensions) {
      const level = determineLevel(dim.code, dim.rawScore)
      const config = dimensionConfigs[dim.code]
      if (config) {
        const levelKey = level as 'normal' | 'borderline' | 'abnormal'
        const levelConfig = config[levelKey]
        if (levelConfig) {
          dimensionFeedback.push({
            advice: levelConfig.advice
          })
        }
      }
      // 分类优势和弱势
      if (dim.code === 'prosocial') {
        if (level === 'normal') {
          strengths.push(`${dim.name}（得分: ${dim.rawScore}/10）`)
        } else if (level === 'abnormal') {
          weaknesses.push(`${dim.name}（得分: ${dim.rawScore}/10）`)
        }
      } else {
        if (level === 'normal') {
          strengths.push(`${dim.name}（得分: ${dim.rawScore}/10）`)
        } else if (level === 'abnormal') {
          weaknesses.push(`${dim.name}（得分: ${dim.rawScore}/10）`)
        }
      }
    }
    return { strengths, weaknesses, dimensionFeedback }
  }
  // ========== 欢迎内容 ==========
  /**
   * 获取欢迎对话框内容
   */
  getWelcomeContent() {
    return {
      title: '长处和困难问卷 (SDQ)',
      intro: '本问卷用于评估孩子的情绪、行为、注意力及社交能力，请根据孩子最近 6 个月的情况如实作答。',
      sections: [
        {
          icon: '📋',
          title: '评估说明',
          content: '共 25 道题目，评估 5 个维度：情绪症状、品行问题、多动注意、同伴交往、亲社会行为。只要根据实际情况选择最符合的选项。请在安静的环境中完成。'
        },
        {
          icon: '📝',
          title: '评分标准',
          content: '每道题目有 3 个选项：不符合、有点符合、完全符合。请根据实际情况选择最符合的选项。请在安静的环境中完成。'
        }
      ],
      footer: '请注意：本评估结果仅供参考，不能作为临床诊断的依据。如有疑问,请咨询专业医生。请在安静的环境中完成。'
    }
  }
  // ========== 图标 ==========
  protected getIcon(): string {
    return '❤️'
  }
  protected getDefaultDescription(): string {
    return '评估儿童的情绪、行为、注意力及社交能力'
  }
  protected getEstimatedTime(): number {
    return 8 // 8分钟
  }
}
