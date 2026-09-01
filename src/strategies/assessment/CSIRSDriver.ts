/**
 * CSIRS 量表驱动器
 *
 * 儿童感觉统合能力发展评定量表（Children's Sensory Integration Rating Scale）
 *
 * 特点：
 * - 58 道题目（根据年龄动态调整）
 * - 5 个维度：前庭觉调节与运动规划、触觉调节与情绪行为、身体感知与动作协调、
 *   视听知觉与学业表现（6岁+）、执行功能与社会适应（10岁+）
 * - 5 级评分（1-5分）
 * - 查表转换：原始分 → T分
 * - T分等级：严重偏低(0-29)、偏低(30-39)、正常(40-60)、优秀(61-70)、非常优秀(71+)
 * - 无跳题逻辑，线性评估
 *
 * @module strategies/assessment/CSIRSDriver
 */

import type {
  StudentContext,
  ScaleQuestion,
  ScaleAnswer,
  ScoreResult,
  AssessmentFeedback,
  DimensionScore,
  AssessmentState,
  PersistContext,
  PersistResult
} from '@/types/assessment'
import { BaseDriver } from './BaseDriver'
import {
  csirsQuestions,
  csirsDimensions,
  getQuestionsByAge
} from '@/database/csirs-questions'
import {
  csirsEvaluationLevels,
  calculateTScore,
  getEvaluationLevel as getCSIRSEvaluationLevel
} from '@/database/csirs-conversion'
import type { CSIRSQuestion, CSIRSDimensionType } from '@/types/csirs'
import { CSIRSAPI } from '@/database/api'

/**
 * CSIRS 量表驱动器实现
 */
export class CSIRSDriver extends BaseDriver {
  // ========== 元信息 ==========

  readonly scaleCode = 'csirs'
  readonly scaleName = '儿童感觉统合能力发展评定量表'
  readonly version = '2.0.0'
  readonly ageRange = { min: 36, max: 156 }  // 3岁 - 13岁
  readonly totalQuestions = 58  // 最大题目数

  // CSIRS 维度
  readonly dimensions = [
    '前庭觉调节与运动规划',
    '触觉调节与情绪行为',
    '身体感知与动作协调',
    '视听知觉与学业表现',
    '执行功能与社会适应'
  ]

  // 维度英文名映射
  private readonly dimensionNameMap: Record<string, CSIRSDimensionType> = {
    '前庭觉调节与运动规划': 'vestibular',
    '触觉调节与情绪行为': 'tactile',
    '身体感知与动作协调': 'proprioception',
    '视听知觉与学业表现': 'learning',
    '执行功能与社会适应': 'executive'
  }

  // 评分选项（1-5分）
  private readonly scoreOptions = [
    { value: 5, label: '从不这样', description: '该项行为从不出现', score: 5 },
    { value: 4, label: '很少这样', description: '该项行为很少出现', score: 4 },
    { value: 3, label: '有时候', description: '该项行为偶尔出现', score: 3 },
    { value: 2, label: '经常这样', description: '该项行为经常出现', score: 2 },
    { value: 1, label: '总是这样', description: '该项行为总是出现', score: 1 }
  ]

  // 题目缓存
  private allQuestions: CSIRSQuestion[] = []

  constructor() {
    super()
    this.allQuestions = [...csirsQuestions].sort((a, b) => a.id - b.id)
  }

  // ========== 题目管理 ==========

  /**
   * 获取题目列表
   * 根据学生年龄动态返回适用的题目
   */
  getQuestions(context: StudentContext): ScaleQuestion[] {
    const applicableQuestions = getQuestionsByAge(context.ageInMonths)
    return applicableQuestions.map(q => this.convertToScaleQuestion(q))
  }

  /**
   * 获取起始题目索引
   * CSIRS 无跳题逻辑，始终从第一题开始
   */
  getStartIndex(context: StudentContext): number {
    return 0
  }

  /**
   * 获取实际题目数（根据年龄）
   */
  getActualQuestionCount(context: StudentContext): number {
    return getQuestionsByAge(context.ageInMonths).length
  }

  // ========== 评分计算 ==========

  /**
   * 计算评分结果
   *
   * CSIRS 评分规则：
   * 1. 计算各维度原始分（题目得分之和）
   * 2. 根据年龄和维度查表转换为 T 分
   * 3. 计算平均 T 分作为总分
   * 4. 根据 T 分确定评定等级
   */
  calculateScore(
    answers: Record<string, ScaleAnswer>,
    context: StudentContext
  ): ScoreResult {
    const ageYears = Math.floor(context.ageInMonths / 12)
    const applicableQuestions = getQuestionsByAge(context.ageInMonths)

    // 1. 计算各维度原始分
    const dimensionRawScores = this.calculateDimensionRawScores(answers, applicableQuestions)

    // 2. 查表转换为 T 分
    const dimensionTScores = this.calculateDimensionTScores(dimensionRawScores, ageYears)

    // 3. 计算平均 T 分（仅计算有转换表的维度）
    const avgTScore = this.calculateAverageTScore(dimensionTScores)

    // 4. 确定评定等级
    const levelInfo = getCSIRSEvaluationLevel(avgTScore)

    // 5. 构建维度分数数组
    const dimensions = this.buildDimensionScores(dimensionRawScores, dimensionTScores)

    // 6. 统计答题时长
    const timing = this.calculateTiming(answers)

    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      totalScore: avgTScore,
      standardScore: avgTScore,
      tScore: avgTScore,
      level: levelInfo.level,
      levelCode: this.getLevelCode(avgTScore),
      dimensions,
      rawAnswers: this.serializeAnswers(answers),
      timing
    }
  }

  // ========== 反馈生成 ==========

  /**
   * 生成评估反馈和 IEP 建议
   */
  generateFeedback(scoreResult: ScoreResult): AssessmentFeedback {
    const avgTScore = scoreResult.tScore || scoreResult.totalScore || 50
    const level = scoreResult.level

    // 生成总体评价
    const summary = this.generateSummary(avgTScore, level, scoreResult.dimensions)

    // 分析各维度的失调情况
    const { strengths, weaknesses } = this.analyzeCSIRSDimensions(scoreResult.dimensions)

    // 生成针对性建议
    const recommendations = this.generateRecommendations(level, weaknesses)

    // 生成训练重点
    const trainingFocus = this.generateTrainingFocus(scoreResult.dimensions)

    return {
      summary,
      strengths,
      weaknesses,
      recommendations,
      trainingFocus,
      homeGuidance: this.generateHomeGuidance(level)
    }
  }

  // ========== 可选方法 ==========

  /**
   * 获取欢迎对话框内容
   */
  getWelcomeContent() {
    return {
      title: '儿童感觉统合能力评定量表 (CSIRS)',
      intro: '可用于初次筛查儿童感觉统合问题，也可定期追踪训练效果，建议训练期每6个月评估一次。CSIRS通过58道题目评估触觉、前庭觉、本体觉、精细动作、大运动五大感觉系统，计算T分数和总失调率，找出孩子行为异常背后的"生理元凶"，翻译孩子身体发出的感觉警报。',
      sections: [
        {
          icon: '👨‍🏫',
          title: '给专业人员的实操心法',
          items: [
            'CSIRS可用于初筛和追踪，建议训练期每6个月评估一次：初次怀疑孩子有感觉统合问题时，CSIRS可快速筛查五大感觉系统。确认问题并开始感统训练后，每6个月复测一次，观察各系统T分数和总失调率变化趋势，评估训练效果。',
            '别把"防御"当"对抗"：孩子进门死活不肯脱鞋踩地垫，不一定是没规矩，而可能是地垫材质让他像踩在针尖上一样疼。请先建立安全感，再谈评估。',
            '区分"感觉迟钝"与"感觉寻求"：孩子总爱撞墙、摔倒，是因为本体觉迟钝，还是因为极度渴望强烈刺激来满足大脑？这决定了后续干预到底该"加刺激"还是"减负担"。',
            '评估环境本身的"脱敏"：测试前请检查灯光、噪音、桌椅触感等环境因素。对感统失调的孩子，环境里的微小刺激都可能毁掉整场评估。',
            '用T分数变化追踪训练效果：如果一个孩子基线触觉防御T分数72（异常），经过6个月感统训练后降到66，再6个月降到61，这说明训练有效。T分数每降低5-7分都是显著进步。',
            '关注"系统剪刀差"：有的孩子触觉T=75（严重防御）但大运动T=50（正常），这提示需要重点进行触觉脱敏训练而非全面运动训练。针对性干预更高效。',
          ],
        },
        {
          icon: '❤️',
          title: '给家长的填表大实话',
          items: [
            'CSIRS既能筛查问题，也能追踪进步，建议训练期每半年做一次：第一次填CSIRS是为了看孩子在触觉、前庭觉、本体觉等感觉系统有没有问题。如果发现问题并开始感统训练，建议每半年复测一次，看总失调率和各系统分数是降了还是升了。',
            '重新认识您的"熊孩子"：挑食只吃软烂的、理发像杀猪、坐荡秋千会吐、喜欢转圈停不下来……请把这些全部填进量表，这些往往是神经系统在求救。',
            '回忆那些"诡异"的小癖好：特别喜欢闻头发、经常啃咬衣领、必须摸着旧毛巾才能睡，这些看似奇怪的习惯，正是干预的宝贵线索。',
            '这不是管教失败的证据：感统失调是中枢神经系统处理信息出了偏差，不是靠打骂或者讲道理能治好的。如实填表，我们才能帮他调准频率。',
            '看长期趋势而非单次分数：一次评估总失调率65%不用太焦虑，重要的是半年后复测是降到50%还是保持65%甚至升到70%。持续追踪才能看到感统训练的真实效果。',
          ],
        },
      ],
      reminder: {
        icon: '⚠️',
        title: '特别提醒',
        content:
          'CSIRS可用于初次筛查儿童感觉统合问题，也可定期追踪训练效果（建议训练期每6个月评估一次）。本量表结果仅供学校制定感统训练与环境适应策略参考，不能作为感觉统合失调的临床诊断依据。如感官异常严重影响生活（如触觉极度防御、前庭功能严重异常等），建议前往正规医院发育行为科或康复科就诊。',
      },
    }
  }

  /**
   * 【重写】计算进度百分比
   * CSIRS 根据年龄动态调整题目数量
   */
  calculateProgress(state: AssessmentState): number {
    // 注意：这里需要知道实际的题目数量
    // 由于 BaseDriver 的 calculateProgress 使用 totalQuestions（固定58题）
    // 这里暂时使用固定值，实际应该传入 context
    const answeredCount = Object.keys(state.answers).length
    return Math.min(100, Math.round((answeredCount / this.totalQuestions) * 100))
  }

  // ========== 持久化 ==========

  /**
   * 持久化 CSIRS 量表评估结果到数据库
   *
   * 包含：
   * 1. 创建 csirs_assess 主记录（使用 JSON 字段存储维度分数）
   * 2. 保存 csirs_assess_detail 答题详情
   * 3. 创建 report_record
   */
  async persistAssessment(context: PersistContext): Promise<PersistResult> {
    const { student, state, scoreResult, startTime, endTime } = context

    const csirsApi = new CSIRSAPI()

    // 从维度分数中提取各维度得分
    const dimensions = scoreResult.dimensions

    // 构建原始分和 T 分的 JSON 对象
    const rawScores: Record<string, number> = {}
    const tScores: Record<string, number> = {}

    for (const dim of dimensions) {
      rawScores[dim.code] = dim.rawScore || 0
      tScores[dim.code] = dim.standardScore || 50
    }

    // 1. 创建评估主记录
    const assessId = csirsApi.createAssessmentWithJsonScores({
      student_id: student.id,
      age_months: student.ageInMonths,
      raw_scores: JSON.stringify(rawScores),
      t_scores: JSON.stringify(tScores),
      total_t_score: scoreResult.tScore || scoreResult.totalScore || 50,
      level: scoreResult.level,
      start_time: startTime,
      end_time: endTime
    })

    // 2. 保存答题详情（含维度信息）
    const questions = this.getQuestions(student)
    const details: Array<{
      assess_id: number
      question_id: number
      dimension: string
      score: number
      answer_time: number
    }> = []

    for (const [questionId, answer] of Object.entries(state.answers)) {
      const question = questions.find(q => q.id === parseInt(questionId))
      details.push({
        assess_id: assessId,
        question_id: parseInt(questionId),
        dimension: question?.dimension || '',
        score: answer.score,
        answer_time: answer.responseTime || 0
      })
    }

    csirsApi.saveAssessmentDetailsWithDimension(details)

    // 3. 创建报告记录
    const reportId = this.createReportRecord({
      studentId: student.id,
      reportType: 'csirs',
      assessId,
      title: `${student.name} - CSIRS感觉统合评估报告`
    })

    console.log('[CSIRSDriver] CSIRS 评估持久化成功, assessId:', assessId)
    this.saveQualityMetrics('csirs_assess', assessId, context)
    return { assessId, reportId }
  }

  // ========== 私有方法：题目转换 ==========

  /**
   * 将 CSIRS 原始题目转换为通用 ScaleQuestion 格式
   */
  private convertToScaleQuestion(q: CSIRSQuestion): ScaleQuestion {
    return {
      id: q.id,
      dimension: q.dimension,
      dimensionName: q.dimension,
      content: q.title,
      options: this.scoreOptions.map(opt => ({
        value: opt.value,
        label: opt.label,
        description: opt.description,
        score: opt.score
      })),
      metadata: {
        dimension_en: q.dimension_en,
        age_min: q.age_min,
        age_max: q.age_max
      },
      audioPath: q.audio
    }
  }

  // ========== 私有方法：评分计算 ==========

  /**
   * 计算各维度原始分
   */
  private calculateDimensionRawScores(
    answers: Record<string, ScaleAnswer>,
    questions: CSIRSQuestion[]
  ): Map<string, number> {
    const dimensionScores = new Map<string, number>()

    // 初始化所有维度
    for (const q of questions) {
      if (!dimensionScores.has(q.dimension)) {
        dimensionScores.set(q.dimension, 0)
      }
    }

    // 累加各维度得分
    for (const q of questions) {
      const answer = answers[q.id]
      if (answer) {
        const currentScore = dimensionScores.get(q.dimension) || 0
        dimensionScores.set(q.dimension, currentScore + answer.score)
      }
    }

    return dimensionScores
  }

  /**
   * 查表计算各维度 T 分
   */
  private calculateDimensionTScores(
    dimensionRawScores: Map<string, number>,
    ageYears: number
  ): Map<string, number> {
    const tScores = new Map<string, number>()

    for (const [dimensionName, rawScore] of dimensionRawScores) {
      const dimensionType = this.dimensionNameMap[dimensionName]
      if (dimensionType) {
        const tScore = calculateTScore(rawScore, ageYears, dimensionType)
        tScores.set(dimensionName, tScore)
      }
    }

    return tScores
  }

  /**
   * 计算平均 T 分（仅计算有转换表的维度）
   */
  private calculateAverageTScore(dimensionTScores: Map<string, number>): number {
    // 排除 executive 维度（没有转换表）
    const validDimensions = ['前庭觉调节与运动规划', '触觉调节与情绪行为', '身体感知与动作协调']

    // 根据年龄添加 learning 维度
    // learning 维度在6岁以上才有转换表

    let totalTScore = 0
    let count = 0

    for (const [dimension, tScore] of dimensionTScores) {
      if (validDimensions.includes(dimension) || dimension === '视听知觉与学业表现') {
        totalTScore += tScore
        count++
      }
    }

    return count > 0 ? Math.round(totalTScore / count) : 50
  }

  /**
   * 构建维度分数数组
   */
  private buildDimensionScores(
    dimensionRawScores: Map<string, number>,
    dimensionTScores: Map<string, number>
  ): DimensionScore[] {
    const result: DimensionScore[] = []

    for (const [dimensionName, rawScore] of dimensionRawScores) {
      const tScore = dimensionTScores.get(dimensionName) || 50
      const dimensionType = this.dimensionNameMap[dimensionName]

      // 获取该维度的题目数量
      const questionCount = this.getDimensionQuestionCount(dimensionType)

      result.push({
        code: dimensionType || dimensionName,
        name: dimensionName,
        rawScore,
        standardScore: tScore,
        itemCount: questionCount,
        passedCount: rawScore,
        averageScore: questionCount > 0 ? rawScore / questionCount : 0
      })
    }

    return result
  }

  /**
   * 获取维度的题目数量
   */
  private getDimensionQuestionCount(dimensionType?: CSIRSDimensionType): number {
    const dimension = csirsDimensions.find(d => d.name_en === dimensionType)
    if (dimension) {
      return dimension.question_end - dimension.question_start + 1
    }
    return 0
  }

  /**
   * 获取等级代码
   */
  private getLevelCode(tScore: number): string {
    if (tScore >= 71) return 'excellent'        // 非常优秀
    if (tScore >= 61) return 'high_normal'      // 优秀
    if (tScore >= 40) return 'normal'           // 正常
    if (tScore >= 30) return 'mild_deficit'     // 偏低
    return 'severe_deficit'                      // 严重偏低
  }

  // ========== 私有方法：反馈生成 ==========

  /**
   * 生成总体评价
   */
  private generateSummary(
    avgTScore: number,
    level: string,
    dimensions: DimensionScore[]
  ): string {
    const levelInfo = csirsEvaluationLevels.find(l => l.level === level)
    const description = levelInfo?.description || ''

    // 找出最需要关注的维度
    const lowDimensions = dimensions
      .filter(d => (d.standardScore || 50) < 40)
      .map(d => d.name)

    let summary = `该儿童 CSIRS 平均 T 分为 ${avgTScore} 分，感觉统合能力等级为"${level}"。${description}`

    if (lowDimensions.length > 0) {
      summary += ` 其中${lowDimensions.join('、')}维度表现相对较弱，需要重点关注。`
    }

    return summary
  }

  /**
   * 分析 CSIRS 维度的优势和弱势
   */
  private analyzeCSIRSDimensions(dimensions: DimensionScore[]): {
    strengths: string[]
    weaknesses: string[]
  } {
    const strengths: string[] = []
    const weaknesses: string[] = []

    for (const dim of dimensions) {
      const tScore = dim.standardScore || 50
      const dimensionName = dim.name

      if (tScore >= 60) {
        strengths.push(`${dimensionName}（T分：${tScore}）`)
      } else if (tScore < 40) {
        const levelText = tScore < 30 ? '严重偏低' : '偏低'
        weaknesses.push(`${dimensionName}（T分：${tScore}，${levelText}）`)
      }
    }

    return { strengths, weaknesses }
  }

  /**
   * 生成针对性建议
   */
  private generateRecommendations(level: string, weaknesses: string[]): string[] {
    const recommendations: string[] = []

    // 根据等级添加基础建议
    if (level === '严重偏低') {
      recommendations.push('建议尽快寻求专业的感统训练机构进行系统评估和干预')
      recommendations.push('制定结构化的感觉统合训练计划，建议每周至少2-3次训练')
      recommendations.push('在日常生活中创造丰富的感官刺激环境')
    } else if (level === '偏低') {
      recommendations.push('建议进行专业的感觉统合能力评估')
      recommendations.push('可参加感统训练课程，提升感觉统合能力')
      recommendations.push('家长可学习简单的感统训练方法，在家庭中进行辅助训练')
    } else if (level === '正常') {
      recommendations.push('继续保持良好的生活习惯和运动锻炼')
      recommendations.push('关注孩子的情绪变化，及时给予支持')
    } else {
      recommendations.push('继续保持现有的教育方式')
      recommendations.push('鼓励孩子参与多样化的活动，全面发展')
    }

    // 根据弱势维度添加具体建议
    if (weaknesses.some(w => w.includes('前庭觉'))) {
      recommendations.push('增加前庭觉刺激活动：荡秋千、旋转木马、平衡木练习')
    }
    if (weaknesses.some(w => w.includes('触觉'))) {
      recommendations.push('增加触觉脱敏训练：玩沙、玩水、触觉球游戏')
    }
    if (weaknesses.some(w => w.includes('本体感') || w.includes('身体感知'))) {
      recommendations.push('加强本体感训练：攀爬、推拉重物、关节挤压活动')
    }
    if (weaknesses.some(w => w.includes('学习'))) {
      recommendations.push('关注视听知觉发展，进行视觉追踪和听觉分辨训练')
    }
    if (weaknesses.some(w => w.includes('执行功能'))) {
      recommendations.push('培养计划和组织能力，使用视觉日程表辅助日常安排')
    }

    return recommendations.slice(0, 6)
  }

  /**
   * 生成训练重点
   */
  private generateTrainingFocus(dimensions: DimensionScore[]): string[] {
    const focus: string[] = []

    // 按 T 分排序，找出最需要关注的维度
    const sortedDimensions = [...dimensions].sort(
      (a, b) => (a.standardScore || 50) - (b.standardScore || 50)
    )

    for (const dim of sortedDimensions.slice(0, 3)) {
      const tScore = dim.standardScore || 50
      if (tScore < 40) {
        if (dim.name.includes('前庭觉')) {
          focus.push('前庭觉训练')
        } else if (dim.name.includes('触觉')) {
          focus.push('触觉脱敏')
        } else if (dim.name.includes('本体感') || dim.name.includes('身体感知')) {
          focus.push('本体感训练')
        } else if (dim.name.includes('学习')) {
          focus.push('视听知觉训练')
        } else if (dim.name.includes('执行功能')) {
          focus.push('执行功能训练')
        }
      }
    }

    if (focus.length === 0) {
      focus.push('维持现有能力水平')
    }

    return [...new Set(focus)]
  }

  /**
   * 生成家庭指导建议
   */
  private generateHomeGuidance(level: string): string[] {
    const guidance: string[] = [
      '提供安全、丰富的感官探索环境',
      '鼓励孩子参与日常生活活动，如穿衣、吃饭、收拾玩具',
      '保持规律的作息时间，有助于感觉系统的稳定',
      '给予孩子足够的运动和户外活动时间'
    ]

    if (level === '严重偏低' || level === '偏低') {
      guidance.push('学习感统训练相关知识，在专业人员指导下进行家庭训练')
      guidance.push('耐心对待孩子的行为问题，理解这可能是感觉统合困难的表现')
      guidance.push('与学校老师保持沟通，共同支持孩子的发展')
    }

    return guidance
  }

  // ========== 重写基类方法 ==========

  protected getDefaultDescription(): string {
    return '评估儿童的感觉统合能力发展水平，识别可能存在的感觉统合失调问题'
  }

  protected getEstimatedTime(): number {
    return 15  // CSIRS 约需 15 分钟
  }

  protected getIcon(): string {
    return '🧠'
  }
}
