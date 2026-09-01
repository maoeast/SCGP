/**
 * ABC (孤独症儿童行为评定量表) 驱动器
 * Autism Behavior Checklist
 *
 * 57题，分为5个因子：感觉、交往、躯体运动、语言、生活自理
 * 加权计分（不同题目权重1-4分）
 * 总分范围：0-158分
 * 截断值：49-67分（研究显示49分敏感性更高，传统为67分）
 *
 * @module strategies/assessment/ABCDriver
 */

import { BaseDriver } from './BaseDriver'
import type {
  StudentContext,
  ScaleQuestion,
  ScaleAnswer,
  ScoreResult,
  DimensionScore,
  PersistContext,
  PersistResult,
  AssessmentFeedback,
} from '@/types/assessment'
import { getDatabase } from '@/database/init'
import {
  ABC_QUESTIONS,
  ABC_DIMENSION_NAMES,
  ABC_DIMENSION_QUESTIONS,
  getABCLevel,
  ABC_LEVEL_NAMES,
  getABCScaleQuestions,
  type ABCDimensionCode,
  type ABCLevel,
} from '@/database/abc-questions'

/**
 * ABC 维度详情
 */
export interface ABCDimensionDetail {
  code: string
  name: string
  score: number
  maxScore: number
  percentage: number
}

/**
 * ABC 驱动器
 */
export class ABCDriver extends BaseDriver {
  // ========== 量表元信息 ==========

  readonly scaleCode = 'abc'
  readonly scaleName = '孤独症儿童行为评定量表 (ABC)'
  readonly version = '标准版'
  readonly ageRange = { min: 36, max: 216 } // 3岁以上（月）
  readonly totalQuestions = 57
  readonly dimensions = ['sensory', 'relating', 'body_object', 'language', 'social_self_help'] as ABCDimensionCode[]

  // ========== 模型配置 ==========
  private studentName: string = ''
  private studentAgeMonths: number = 0

  /**
   * 配置学生信息
   */
  setStudentContext(context: StudentContext): void {
    this.studentName = context.name
    this.studentAgeMonths = context.ageInMonths
  }

  /**
   * 获取题目列表
   */
  getQuestions(_context: StudentContext): ScaleQuestion[] {
    return getABCScaleQuestions()
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
    console.log('%c========== ABC 评分计算开始 ==========', 'color: #FF9800; font-size: 14px; font-weight: bold;')
    console.log('📋 学生信息:', { id: context.id, name: context.name, ageMonths: context.ageInMonths })

    // 1. 计算各维度得分
    const dimensions: DimensionScore[] = []
    let totalScore = 0
    const rawAnswers: Record<string, any> = {}

    for (const dimension of this.dimensions) {
      const questionIds = ABC_DIMENSION_QUESTIONS[dimension]
      let dimensionRawScore = 0

      for (const questionId of questionIds) {
        const answer = answers[questionId]
        if (answer !== undefined) {
          dimensionRawScore += answer.score // score 已经是加权分（0或权重值）
          rawAnswers[questionId] = answer.score
        }
      }

      // 计算该维度最大可能分数（所有题目权重之和）
      const maxDimensionScore = ABC_QUESTIONS
        .filter(q => q.dimension === dimension)
        .reduce((sum, q) => sum + q.weight, 0)

      dimensions.push({
        code: dimension,
        name: ABC_DIMENSION_NAMES[dimension],
        rawScore: dimensionRawScore,
        itemCount: questionIds.length,
        averageScore: questionIds.length > 0 ? dimensionRawScore / questionIds.length : 0,
      })

      totalScore += dimensionRawScore
    }

    console.log('%c[Step 1] 维度得分计算', 'color: #2196F3; font-weight: bold;')
    console.log('维度得分:', dimensions)
    console.log('总分:', totalScore)

    // 2. 判断严重程度
    const level = getABCLevel(totalScore)
    const levelName = ABC_LEVEL_NAMES[level]

    console.log('%c[Step 2] 严重程度判断', 'color: #4CAF50; font-weight: bold;')
    console.log('等级:', level, '-', levelName)

    console.log('%c========== ABC 评分计算完成 ==========', 'color: #FF9800; font-size: 14px; font-weight: bold;')

    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      dimensions,
      totalScore,
      level: levelName,
      levelCode: level,
      rawAnswers,
    }
  }

  /**
   * 生成反馈
   */
  generateFeedback(scoreResult: ScoreResult): AssessmentFeedback {
    const totalScore = scoreResult.totalScore || 0
    const level = getABCLevel(totalScore)

    let summary = `总分：${totalScore}/158 分，评估等级：${ABC_LEVEL_NAMES[level]}。`

    // 根据等级给出解释
    switch (level) {
      case 'normal':
        summary += `当前评分在正常范围内（<49分），未显示显著的孤独症相关行为特征。`
        break
      case 'borderline':
        summary += `当前评分在边缘范围（49-61分），建议进一步专业评估以明确诊断。`
        break
      case 'mild':
        summary += `当前评分提示轻度孤独症行为特征（62-79分），建议及早开始干预训练。`
        break
      case 'moderate':
        summary += `当前评分提示中度孤独症行为特征（80-99分），需要系统的干预和支持。`
        break
      case 'severe':
        summary += `当前评分提示重度孤独症行为特征（≥100分），需要密集的专业干预和全面支持。`
        break
    }

    const recommendations = [
      '本量表为筛查工具，最终诊断需由专业医生结合临床观察、发育史等综合判断',
      '如评分显示异常，建议尽快到专业机构进行全面评估',
      '早期发现、早期干预对孤独症儿童的发展至关重要',
    ]

    return {
      summary,
      recommendations,
    }
  }

  /**
   * 获取欢迎对话框内容
   */
  getWelcomeContent() {
    return {
      title: '孤独症儿童行为评定量表 (ABC)',
      intro: '经典的孤独症初筛工具，适用于识别儿童是否存在孤独症倾向。建议在初次筛查时使用，通过观察儿童日常行为特征，快速识别可能的孤独症谱系障碍（ASD）表现。ABC量表采用加权计分，重点关注感觉、交往、躯体运动、语言等核心领域。',
      sections: [
        {
          icon: '👨‍🏫',
          title: '给专业人员的评估要点',
          items: [
            'ABC是初筛工具，用于"发现"而非"追踪"：当您怀疑一个孩子可能有孤独症倾向时，ABC是首选的快速筛查工具。如果筛查阳性（≥49分），应转介专业机构进行诊断性评估（如ADOS、ADI-R）。',
            '基于观察而非推测：ABC的57道题都应基于您对孩子近期（1-3个月）的实际观察。如果某个行为您从未见过，请标记"不符合"，而不是凭印象猜测。',
            '加权计分的意义：ABC对不同题目赋予1-4分的权重，权重越高表示该行为对孤独症诊断的特异性越强。例如"对人缺乏目光接触"比"喜欢旋转物体"权重更高。',
            '筛查分界值说明：总分≥57分为传统筛查分界值，≥67分为诊断参考值。但近期研究建议49分以上即应引起关注，建议结合临床观察综合判断。',
            '维度分析的价值：ABC包含5个维度（感觉、交往、躯体运动、语言、生活自理），各维度得分可以帮助识别孩子的核心困难领域，为后续干预提供方向。',
            'ABC vs ATEC：初筛用ABC，康复追踪用ATEC。确诊后的孩子如需监测康复进展，应改用ATEC量表（建议每3个月评估一次）。',
          ],
        },
        {
          icon: '❤️',
          title: '给家长的填表指南',
          items: [
            'ABC是用来"发现问题"的初筛工具：如果您担心孩子可能有孤独症倾向（如不爱说话、不和小朋友玩、刻板重复行为等），ABC可以帮您做初步筛查。这是第一次评估时使用的工具。',
            '回忆孩子最真实的样子：请回想孩子在家中、公园、商场等不同场景下的实际表现。有些行为可能在学校不明显，但在家里很突出，都需要如实填写。',
            '不要因为焦虑而夸大：有的家长担心"分数不够高就得不到干预资源"而倾向于选择更严重的选项。请相信，准确的评估才能得到真正适合的帮助。',
            '"不符合"不代表孩子优秀：ABC的题目是负向描述（如"不理人""刻板行为"），选择"不符合"只是说明孩子没有这个困难，不必为选了很多"不符合"而内疚。',
            '量表只是起点，不是终点：无论分数高低，ABC只是筛查工具，最终诊断需要专业医生综合判断。如果孩子已确诊并开始康复训练，后续请使用ATEC量表（每3个月一次）来追踪康复效果。',
          ],
        },
      ],
      reminder: {
        icon: '⚠️',
        title: '重要提醒',
        content:
          'ABC量表是孤独症初筛工具，建议在怀疑孩子有孤独症倾向时首次使用。如果总分≥49分，建议尽快前往儿童精神科、发育行为科或儿保科进行专业诊断性评估。确诊后如需追踪康复效果，请使用ATEC量表（建议每3个月评估一次）。ABC不适合用于追踪康复进展。',
      },
    }
  }

  // ========== 持久化 ==========

  /**
   * 保存评估结果
   */
  async persistAssessment(context: PersistContext): Promise<PersistResult> {
    const db = getDatabase()
    const { student, scoreResult, startTime, endTime } = context

    const level = getABCLevel(scoreResult.totalScore || 0)

    // 计算维度得分
    const dimensionScores: Record<string, number> = {}
    for (const dim of scoreResult.dimensions) {
      dimensionScores[dim.code] = dim.rawScore
    }

    // 插入评估记录
    const sql = `
      INSERT INTO abc_assess (
        student_id, age_months, raw_answers, dimension_scores,
        total_score, level, start_time, end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `

    db.run(sql, [
      student.id,
      student.ageInMonths,
      JSON.stringify(scoreResult.rawAnswers),
      JSON.stringify(dimensionScores),
      scoreResult.totalScore || 0,
      level,
      startTime,
      endTime,
    ])

    // 获取插入的ID
    const selectSql = 'SELECT last_insert_rowid() as id'
    const rows = db.all(selectSql)
    const assessId = rows[0]?.id as number

    // 创建报告记录（供报告中心展示）
    const reportId = this.createReportRecord({
      studentId: student.id,
      reportType: 'abc',
      assessId,
      title: `${student.name} - ABC孤独症行为评定量表报告`
    })

    return {
      assessId,
      reportId,
    }
  }
}
