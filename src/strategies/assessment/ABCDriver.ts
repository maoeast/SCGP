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

  // ========== 持久化 ==========

  /**
   * 保存评估结果
   */
  async saveAssessment(context: PersistContext): Promise<PersistResult> {
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

    db.exec(sql, [
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
    const rows = db.exec(selectSql)
    const assessId = rows[0]?.values[0][0] as number

    console.log('ABC 评估已保存，ID:', assessId)

    return {
      assessId,
    }
  }
}
