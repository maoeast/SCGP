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
  DimensionScore,
  PersistContext,
  PersistResult
} from '@/types/assessment'
import { SRS2AssessmentAPI } from '@/database/api'
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
      intro: '专门用于追踪孤独症谱系障碍儿童的社交障碍程度，建议每6个月评估一次。SRS-2通过量化社交能力，监测社交技能训练和同伴融合干预的效果，是观察"社交耗电量"变化的精准工具。',
      sections: [
        {
          icon: '👨‍🏫',
          title: '给专业人员的实操心法',
          items: [
            'SRS-2是社交障碍追踪工具，建议每6个月评估一次：SRS-2不是用来诊断孤独症的（诊断用ADOS/ADI-R），而是用来量化"社交障碍有多严重"以及"干预后改善了多少"。建议每6个月评估一次，观察T分数的变化趋势。',
            '拆穿"高智商的伪装"：有的孩子能背诵圆周率、能流利演讲，但你问他"今天开心吗"时却像没听见一样走开。评估时绝不能被学业智商迷惑，要死死盯住眼神交流、往返回应和对玩笑话的理解。',
            '区分"不想"与"不能"：他不理同学，是觉得同学幼稚不想理，还是根本不知道怎么加入同学的游戏？你要通过追问具体场景，来判定他是缺乏社交动机，还是缺乏社交技能。',
            '关注"社交过度"现象：有一种社交障碍不是不理人，而是"没有界限感"。比如第一次见面就对陌生人滔滔不绝讲半小时恐龙，这也是典型的社交知觉缺陷。',
            '用T分数追踪进步：SRS-2使用T分数（平均50，标准差10）。如果一个孩子基线T分数80（重度），经过6个月社交技能训练降到72，再6个月降到66，这说明干预有效。T分数每降低5-10分都是显著进步。',
            '配合ABC/ATEC使用：ABC用于初筛，ATEC追踪整体康复，SRS-2专注追踪社交领域。三者结合使用可以全面了解孤独症儿童的康复进程。',
          ],
        },
        {
          icon: '❤️',
          title: '给家长的填表大实话',
          items: [
            'SRS-2是看"社交进步"的量表，建议每6个月做一次：如果您的孩子正在接受社交技能训练、同伴融合课程，SRS-2可以帮您看到效果。比如半年前总分T分数75（严重社交困难），现在68（中度），这就是进步！',
            '他不是冷血，他只是"盲了"：当您填到"对别人的悲伤无动于衷"时，可能会觉得孩子很冷漠。其实他的心可能很软，只是大脑缺乏识别"悲伤表情"的雷达。',
            '回忆那些"格格不入"的瞬间：请在脑海里回放孩子在游乐场、生日会上的画面。把那些听不懂暗语、get不到笑点、只能独自玩门把手的细节，真实转化为量表上的分数。',
            '寻找"硬核社交切入点"：即使他不在乎人类，也总会在乎点什么。比如公交车路线、天气预报。请写下来，这往往就是他专属的社交频道。',
            '分数变化比绝对值更重要：T分数60-75之间都属于"轻中度社交困难"，具体多少分不是重点。重点是半年后分数是降了还是升了，降了多少。每降5分都值得庆祝。',
          ],
        },
      ],
      reminder: {
        icon: '⚠️',
        title: '特别提醒',
        content:
          'SRS-2是社交障碍追踪工具，不能用于孤独症诊断。建议用于已确诊孤独症或存在明显社交困难的儿童，每6个月评估一次以监测社交技能训练效果。如需初次筛查，请使用ABC量表或前往专业医疗机构。',
      },
    }
  }

  // ========== 图标 ==========
  protected getIcon(): string {
    return '🤝'
  }

  protected getDefaultDescription(): string {
    return '评估儿童的社交反应能力'
  }

  // ========== 持久化 ==========

  /**
   * 持久化 SRS-2 评估结果到数据库
   */
  async persistAssessment(context: PersistContext): Promise<PersistResult> {
    const { student, scoreResult, startTime, endTime } = context

    const srs2Api = new SRS2AssessmentAPI()

    const rawAnswers = scoreResult.rawAnswers || {}
    const dimensionTScores = (scoreResult.extraData as any)?.dimensionTScores || {}
    const dimensionScores = scoreResult.dimensions.reduce((acc, dim) => {
      acc[dim.code] = {
        name: dim.name,
        rawScore: dim.rawScore,
        tScore: dimensionTScores[dim.code] || dim.standardScore || 50,
        level: dim.level || 'normal',
        levelName: dim.levelName || '正常'
      }
      return acc
    }, {} as any)

    const totalTScore = (scoreResult.extraData as { totalTScore: number })?.totalTScore || 50

    const assessId = srs2Api.createAssessment({
      student_id: student.id,
      age_months: student.ageInMonths,
      gender: student.gender === '男' ? 'male' : 'female',
      raw_answers: JSON.stringify(rawAnswers),
      dimension_scores: JSON.stringify(dimensionScores),
      total_raw_score: scoreResult.totalScore || 0,
      total_t_score: totalTScore,
      total_level: scoreResult.levelCode || 'normal',
      start_time: startTime,
      end_time: endTime
    })

    const reportId = this.createReportRecord({
      studentId: student.id,
      reportType: 'srs2',
      assessId,
      title: `${student.name} - SRS-2社交反应量表评估报告`
    })

    console.log('[SRS2Driver] SRS-2 评估持久化成功, assessId:', assessId)
    return { assessId, reportId }
  }

  protected getEstimatedTime(): number {
    return 15 // 约15分钟
  }
}
