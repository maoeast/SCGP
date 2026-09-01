/**
 * ATEC (孤独症治疗评估量表) 驱动器
 * Autism Treatment Evaluation Checklist
 *
 * 77题，分为4个分量表：
 * - Speech/Language/Communication（言语/语言/交流）- 14题
 * - Sociability（社交能力）- 20题
 * - Sensory/Cognitive Awareness（感觉/认知意识）- 18题
 * - Health/Physical/Behavior（健康/生理/行为）- 25题
 *
 * 计分方式：每题0-2分（否=0, 部分是=1, 完全是=2）
 * 总分范围：0-154分
 * 分数越高表示症状越严重
 *
 * @module strategies/assessment/ATECDriver
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
  ATEC_QUESTIONS,
  ATEC_SUBSCALE_NAMES,
  ATEC_SUBSCALE_QUESTIONS,
  ATEC_SUBSCALE_MAX_SCORES,
  getATECLevel,
  ATEC_LEVEL_NAMES,
  getATECScaleQuestions,
  calculateSubscaleScore,
  type ATECSubscaleCode,
  type ATECLevel,
} from '@/database/atec-questions'

/**
 * ATEC 分量表详情
 */
export interface ATECSubscaleDetail {
  code: string
  name: string
  score: number
  maxScore: number
  percentage: number
}

/**
 * ATEC 驱动器
 */
export class ATECDriver extends BaseDriver {
  // ========== 量表元信息 ==========

  readonly scaleCode = 'atec'
  readonly scaleName = '孤独症治疗评估量表 (ATEC)'
  readonly version = '标准版'
  readonly ageRange = { min: 24, max: 216 } // 2岁以上（月）
  readonly totalQuestions = 77
  readonly dimensions = ['speech', 'sociability', 'sensory', 'health'] as ATECSubscaleCode[]

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
    return getATECScaleQuestions()
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
    console.log('%c========== ATEC 评分计算开始 ==========', 'color: #4CAF50; font-size: 14px; font-weight: bold;')
    console.log('📋 学生信息:', { id: context.id, name: context.name, ageMonths: context.ageInMonths })

    // 1. 转换答案格式
    const numericAnswers: Record<string, number> = {}
    const rawAnswers: Record<string, any> = {}
    for (const [qid, answer] of Object.entries(answers)) {
      numericAnswers[qid] = answer.score
      rawAnswers[qid] = answer.score
    }

    // 2. 计算各分量表得分
    const dimensions: DimensionScore[] = []
    let totalScore = 0

    for (const subscale of this.dimensions) {
      const score = calculateSubscaleScore(numericAnswers, subscale)
      const maxScore = ATEC_SUBSCALE_MAX_SCORES[subscale]
      const questionIds = ATEC_SUBSCALE_QUESTIONS[subscale]

      dimensions.push({
        code: subscale,
        name: ATEC_SUBSCALE_NAMES[subscale],
        rawScore: score,
        itemCount: questionIds.length,
        averageScore: questionIds.length > 0 ? score / questionIds.length : 0,
      })

      totalScore += score
    }

    console.log('%c[Step 1] 分量表得分计算', 'color: #2196F3; font-weight: bold;')
    console.log('分量表得分:', dimensions)
    console.log('总分:', totalScore)

    // 3. 判断严重程度
    const level = getATECLevel(totalScore)
    const levelName = ATEC_LEVEL_NAMES[level]

    console.log('%c[Step 2] 严重程度判断', 'color: #4CAF50; font-weight: bold;')
    console.log('等级:', level, '-', levelName)

    console.log('%c========== ATEC 评分计算完成 ==========', 'color: #4CAF50; font-size: 14px; font-weight: bold;')

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
    const level = getATECLevel(totalScore)

    let summary = `总分：${totalScore}/154 分，评估等级：${ATEC_LEVEL_NAMES[level]}。`

    // 根据等级给出解释
    switch (level) {
      case 'minimal':
        summary += `当前评分显示症状轻微（<30分），整体功能相对较好。`
        break
      case 'mild':
        summary += `当前评分提示轻度症状（30-49分），部分领域需要支持。`
        break
      case 'moderate':
        summary += `当前评分提示中度症状（50-103分），需要持续的干预和支持。`
        break
      case 'severe':
        summary += `当前评分提示重度症状（≥104分），需要密集的专业干预。`
        break
    }

    const recommendations = [
      'ATEC 是用于跟踪治疗效果的评估工具，适合定期使用以观察变化趋势',
      '分数下降通常表示症状改善，可用于评估干预措施的效果',
      '建议每3-6个月进行一次评估，以监测儿童的进展情况',
      '本量表不能替代专业诊断，仅作为辅助评估工具',
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

    const level = getATECLevel(scoreResult.totalScore || 0)

    // 计算分量表得分
    const subscaleScores: Record<string, number> = {}
    for (const dim of scoreResult.dimensions) {
      subscaleScores[dim.code] = dim.rawScore
    }

    // 插入评估记录
    const sql = `
      INSERT INTO atec_assess (
        student_id, age_months, raw_answers, subscale_scores,
        total_score, level, start_time, end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `

    db.exec(sql, [
      student.id,
      student.ageInMonths,
      JSON.stringify(scoreResult.rawAnswers),
      JSON.stringify(subscaleScores),
      scoreResult.totalScore || 0,
      level,
      startTime,
      endTime,
    ])

    // 获取插入的ID
    const selectSql = 'SELECT last_insert_rowid() as id'
    const rows = db.exec(selectSql)
    const assessId = rows[0]?.values[0][0] as number

    console.log('ATEC 评估已保存，ID:', assessId)

    return {
      assessId,
    }
  }
}
