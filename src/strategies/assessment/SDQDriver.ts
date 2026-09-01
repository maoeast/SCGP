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
  DimensionScore,
  PersistContext,
  PersistResult
} from '@/types/assessment'
import { SDQAssessmentAPI } from '@/database/api'
import {
  SDQ_QUESTIONS,
  SDQ_DIMENSION_NAMES,
  SDQ_DIMENSION_QUESTIONS,
  SDQ_THRESHOLDS,
  reverseScore,
  getSDQScaleQuestions
} from '@/database/sdq-questions'
import { ASSESSMENT_LIBRARY } from '@/config/feedbackConfig'
import type { SDQDimensionCode, SDQDimensionDetail, SDQLevel, SDQStructuredFeedback } from '@/types/sdq'

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
const PROSOCIAL_LEVEL_NAMES: Record<SDQLevel, string> = {
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
            name: dimConfig?.label || SDQ_DIMENSION_NAMES[dim.code] || dim.name || dim.code,
            level: (dim.level as SDQLevel | undefined) ?? 'normal',
            levelName: dim.levelName ?? '正常',
            score: dim.rawScore,
            severity: (dimLevelConfig.severity as 'success' | 'warning' | 'danger') || 'success',
            content,
            advice: dimLevelConfig.advice || [],
            structured_advice: dimLevelConfig.structured_advice
          })

          // 记录有问题的维度（severity 为 warning 或 danger）
          if (dimLevelConfig.severity === 'warning' || dimLevelConfig.severity === 'danger') {
            problemDimensions.push(dim.code as SDQDimensionCode)
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
              (values as string[]).map(replacePlaceholders)
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
  private analyzeDimensionsLegacy(
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
      intro: '可用于初次筛查儿童情绪行为问题，也可定期追踪干预效果，建议每6-12个月评估一次。SDQ通过25道题目评估情绪症状、行为问题、多动、同伴关系、亲社会行为五大维度，既排查困难也挖掘长处，计算困难总分判定整体情况。不同于单纯问题筛查，SDQ特别关注"亲社会行为"等正向资源，为干预提供支点。',
      sections: [
        {
          icon: '👨‍🏫',
          title: '给专业人员的实操心法',
          items: [
            'SDQ可用于初筛和追踪，建议每6-12个月评估一次：初次怀疑孩子有情绪行为问题时，SDQ可快速筛查五大维度。确认问题后，每6-12个月复测一次，观察困难总分和各维度得分变化趋势，评估干预效果。',
            '用"长处"做干预的抓手：看SDQ时，第一眼先看"亲社会行为"那一栏。一个经常打架的孩子，如果同时显示他"对小动物极度有爱心"，这往往就是干预突破口。',
            '三角交叉验证：把家长版、教师版和自评版放在一起看。如果孩子自评极度焦虑，但家长和老师都没看出来，说明孩子可能在刻意掩饰，内心极为痛苦孤立。',
            '用困难总分变化追踪干预效果：如果一个孩子基线困难总分22（异常），经过6个月情绪行为干预后降到18（临界），再6个月降到15（正常），这说明干预有效。困难总分每降低3-5分都是显著进步。',
            '关注"维度剪刀差"：有的孩子情绪症状8分（异常）但行为问题2分（正常），这提示内化问题突出而外化行为正常，需要重点关注焦虑抑郁等情绪困难。',
            '配合专项量表使用：SDQ是广谱筛查工具。如发现多动维度异常，建议进一步使用Conners量表；如情绪症状异常，建议使用CBCL或专业情绪评估工具深入评估。',
          ],
        },
        {
          icon: '❤️',
          title: '给家长的填表大实话',
          items: [
            'SDQ既能筛查问题，也能追踪进步，建议每半年到一年做一次：第一次填SDQ是为了看孩子在情绪、行为、注意力、同伴关系等方面有没有困难。如果发现问题并开始干预，建议每半年到一年复测一次，看困难总分是降了还是升了。',
            '别让黑云遮住全部太阳：即便孩子现在脾气暴躁、拒学、天天和您对着干，也请您在填表时盯住他身上哪怕芝麻大小的优点。',
            '填写他的"超能力"：请把这些长处和优点郑重地填上去。在后续漫长的康复与行为矫正中，这些仅存的善意和长处，就是我们帮他翻盘的底牌。',
            '回忆最近半年的整体表现：SDQ问的是"最近六个月"的情况，不要因为昨天孩子刚发脾气就全部打高分。请回想这半年的整体常态，平均水平是什么样。',
            '看长期趋势而非单次分数：一次评估困难总分18（临界）不用太焦虑，重要的是半年后复测是降到14（正常）还是升到22（异常）。持续追踪才能看到孩子的真实变化和干预效果。',
          ],
        },
      ],
      reminder: {
        icon: '⚠️',
        title: '特别提醒',
        content:
          'SDQ可用于初次筛查儿童情绪行为问题，也可定期追踪干预效果（建议每6-12个月评估一次）。本量表结果仅供学校发掘孩子优势与制定行为支持方案参考，不能作为任何心理或行为障碍的临床诊断标准。如困难总分≥17（异常）且持续存在，或发现严重的情绪或行为困难，建议前往正规医院儿童精神科或心理科就诊。',
      },
    }
  }
  // ========== 图标 ==========
  protected getIcon(): string {
    return '❤️'
  }
  protected getDefaultDescription(): string {
    return '评估儿童的情绪、行为、注意力及社交能力'
  }
  // ========== 持久化 ==========

  /**
   * 持久化 SDQ 评估结果到数据库
   */
  async persistAssessment(context: PersistContext): Promise<PersistResult> {
    const { student, scoreResult, startTime, endTime } = context

    const sdqApi = new SDQAssessmentAPI()

    const rawAnswers = scoreResult.rawAnswers || {}
    const dimensionScores = scoreResult.dimensions.reduce((acc, dim) => {
      acc[dim.code] = {
        rawScore: dim.rawScore,
        level: dim.level || 'normal',
        levelName: dim.levelName || '正常'
      }
      return acc
    }, {} as any)

    const assessId = sdqApi.createAssessment({
      student_id: student.id,
      age_months: student.ageInMonths,
      raw_scores: JSON.stringify(rawAnswers),
      dimension_scores: JSON.stringify(dimensionScores),
      total_difficulties_score: scoreResult.totalScore || 0,
      prosocial_score: dimensionScores['prosocial']?.rawScore || 0,
      is_valid: 1,
      level: scoreResult.level || '正常',
      start_time: startTime,
      end_time: endTime
    })

    const reportId = this.createReportRecord({
      studentId: student.id,
      reportType: 'sdq',
      assessId,
      title: `${student.name} - SDQ长处和困难问卷评估报告`
    })

    console.log('[SDQDriver] SDQ 评估持久化成功, assessId:', assessId)
    this.saveQualityMetrics('sdq_assess', assessId, context)
    return { assessId, reportId }
  }

  protected getEstimatedTime(): number {
    return 8 // 8分钟
  }
}
