/**
 * ATEC (孤独症治疗评估量表) 驱动器
 * Autism Treatment Evaluation Checklist
 *
 * 77题，分为4个分量表：
 * - Speech/Language/Communication（表达/语言沟通）- 14题
 * - Sociability（社交能力）- 20题
 * - Sensory/Cognitive Awareness（感知/认知能力）- 18题
 * - Health/Physical/Behavior（健康/生理/行为）- 25题
 *
 * 计分方式（各分量表评分等级不同）：
 * - I 表达/语言沟通：反向计分 N=2, S=1, V=0（总分0-28）
 * - II 社交能力：正向计分 N=0, S=1, V=2（总分0-40）
 * - III 感知/认知能力：反向计分 N=2, S=1, V=0（总分0-36）
 * - IV 健康/生理/行为：4级计分 N=0, MI=1, MO=2, V=3（总分0-75）
 *
 * 总分范围：0-179分
 * 分数越高表示症状越严重或问题越多
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
  ATEC_TOTAL_MAX_SCORE,
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

    let summary = `总分：${totalScore}/${ATEC_TOTAL_MAX_SCORE} 分，评估等级：${ATEC_LEVEL_NAMES[level]}。`

    // 根据等级给出解释
    switch (level) {
      case 'minimal':
        summary += `当前评分显示症状轻微（<40分），整体功能相对较好。`
        break
      case 'mild':
        summary += `当前评分提示轻度症状（40-69分），部分领域需要支持。`
        break
      case 'moderate':
        summary += `当前评分提示中度症状（70-119分），需要持续的干预和支持。`
        break
      case 'severe':
        summary += `当前评分提示重度症状（≥120分），需要密集的专业干预。`
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

  /**
   * 获取欢迎对话框内容
   */
  getWelcomeContent() {
    return {
      title: '孤独症治疗评估量表 (ATEC)',
      intro: '专门用于追踪孤独症康复效果的评估工具，建议每3个月评估一次。与ABC侧重初筛不同，ATEC的核心价值在于"定期追踪"——通过每3个月一次的评估，观察孩子在接受干预后的康复进展，为调整干预方案提供数据支持。',
      sections: [
        {
          icon: '👨‍🏫',
          title: '给专业人员的使用要点',
          items: [
            'ATEC是康复追踪工具，建议每3个月评估一次：ATEC不适合用于初次筛查或诊断，它的价值在于"建立基线→干预3个月→复测→再3个月→再复测"的持续追踪。通过每3个月的定期评估，可以清晰看到康复曲线。',
            '分数下降才是好消息：ATEC采用"问题计分"，分数越高表示症状越严重。如果经过3个月的干预后，总分从120降到100，再过3个月降到85，这说明干预方向正确且有效。',
            '四个分量表的评分方式各不相同：I表达/语言沟通（反向计分）、II社交能力（正向计分）、III感知/认知能力（反向计分）、IV健康/生理/行为（4级计分）。这种混合计分设计是为了更准确地反映不同领域的症状表现。',
            '用ATEC追踪"哪里进步了"：单次ATEC分数意义有限，但每3个月的变化曲线能清晰显示：语言进步了吗？刻板行为减少了吗？睡眠和饮食问题改善了吗？这些具体的变化比总分更有指导意义。',
            'ABC vs ATEC：初筛用ABC（怀疑孤独症时），康复追踪用ATEC（确诊后每3个月）。如果一个孩子ABC筛查阳性并确诊，开始干预后应改用ATEC定期监测进展。',
            '建立康复档案：建议为每个孩子建立ATEC追踪档案，记录每次评估的时间、总分、各分量表得分，以及当时采用的干预方案。这样可以清楚看到"哪种干预在哪个阶段有效"。',
          ],
        },
        {
          icon: '❤️',
          title: '给家长的填表建议',
          items: [
            '这是一份"看见进步"的量表，建议每3个月做一次：很多家长觉得孩子干预了大半年，好像没什么变化。但如果您坚持每3个月做一次ATEC，对比几次评分，往往会发现：语言从28分降到22分再降到18分，睡眠问题从严重变成偶尔，这些都是实实在在的进步。',
            '第一次做ATEC建立"基线"：建议在孩子确诊后、开始干预前做第一次ATEC，这个分数叫"基线"。之后每3个月做一次，就能看到孩子从基线开始的康复轨迹。',
            '不要和别人家孩子比分数：ATEC总分0-179，每个孩子的起点不同。有的孩子基线150分，有的60分，重要的不是分数高低，而是"自己和自己比"——3个月后是涨了还是降了，降了多少。',
            '如实填写"现在的状态"：ATEC问的是"过去一个月"的表现，请不要填"孩子刚确诊时的样子"，也不要填"您期待的样子"，而是如实反映近期的真实状态。',
            '分数不降反升不一定是坏事：有些孩子在某个阶段ATEC分数可能暂时回升（如青春期、换环境、生病等）。这提示需要调整干预策略，而不是"前功尽弃"。继续每3个月追踪，观察调整后的效果。',
            '保留每次评估记录：建议每次做完ATEC都截图或打印保存，标注日期和当时的干预方案。几年后回头看，您会发现孩子走过的每一步都值得记录。',
          ],
        },
      ],
      reminder: {
        icon: '⚠️',
        title: '重要提醒',
        content:
          'ATEC是康复追踪工具，不能用于初筛或诊断。如果是首次怀疑孩子有孤独症，请使用ABC量表或前往专业医疗机构。ATEC的最佳使用方式是：确诊后建立基线→干预3个月→复测→再3个月→再复测，通过定期追踪（建议每3个月一次）观察康复进展。',
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

    db.run(sql, [
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
    const rows = db.all(selectSql)
    const assessId = rows[0]?.id as number

    // 保存质量追踪数据（宽松质控，quality 缺失时跳过）
    this.saveQualityMetrics('atec_assess', assessId, context)

    // 创建报告记录（供报告中心展示）
    const reportId = this.createReportRecord({
      studentId: student.id,
      reportType: 'atec',
      assessId,
      title: `${student.name} - ATEC孤独症治疗评估量表报告`
    })

    return {
      assessId,
      reportId,
    }
  }
}
