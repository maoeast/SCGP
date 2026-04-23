/**
 * S-M 量表驱动器
 *
 * 婴儿-初中生社会生活能力量表（Social Maturity Scale）
 *
 * 特点：
 * - 132 道题目，按年龄阶段分组（1-7阶段）
 * - 二级评分（通过/不通过）
 * - 基线/上限规则：连续10项通过建立基线，连续10项不通过终止评估
 * - 根据学生年龄确定起始评估阶段
 * - 粗分 -> 标准分（SQ）查表换算
 *
 * @module strategies/assessment/SMDriver
 */

import type {
  StudentContext,
  ScaleQuestion,
  ScaleAnswer,
  AssessmentState,
  NavigationDecision,
  ScoreResult,
  AssessmentFeedback,
  DimensionScore,
  PersistContext,
  PersistResult
} from '@/types/assessment'
import { BaseDriver } from './BaseDriver'
import { smQuestions, type SMQuestion } from '@/database/sm-questions'
import { calculateSQScore, getEvaluationLevel } from '@/database/sm-norms'
import { SMAssessmentAPI } from '@/database/api'
import {
  calculateSMRawScoreFromAnswers,
  ensureSMNavigationMetadata,
  getSMNavigationDecision,
  getSMStartIndex,
  type SMNavigationMetadata,
} from './sm-logic'

/**
 * S-M 量表驱动器实现
 */
export class SMDriver extends BaseDriver {
  // ========== 元信息 ==========

  readonly scaleCode = 'sm'
  readonly scaleName = '婴儿-初中生社会生活能力量表'
  readonly version = '2.0.0'
  readonly ageRange = { min: 6, max: 180 }  // 6个月 - 15岁
  readonly totalQuestions = 132

  // S-M 特有维度
  readonly dimensions = [
    '交往',
    '作业',
    '运动能力',
    '独立生活能力',
    '自我管理',
    '集体活动'
  ]

  // 题目缓存（按ID排序）
  private sortedQuestions: SMQuestion[] = []

  constructor() {
    super()
    // 初始化时按ID排序题目
    this.sortedQuestions = [...smQuestions].sort((a, b) => a.id - b.id)
  }

  // ========== 题目管理 ==========

  /**
   * 获取题目列表
   * 将 S-M 原始题目转换为通用 ScaleQuestion 格式
   */
  getQuestions(context: StudentContext): ScaleQuestion[] {
    return this.sortedQuestions.map(q => this.convertToScaleQuestion(q))
  }

  /**
   * 获取起始题目索引
   * 根据学生月龄确定起始年龄阶段，返回该阶段第一题的索引
   */
  getStartIndex(context: StudentContext): number {
    const stage = this.getAgeStage(context.ageInMonths)
    return getSMStartIndex(this.sortedQuestions, stage)
  }

  // ========== 跳题逻辑（S-M 特有）==========

  /**
   * 【核心重写】获取下一个题目的导航决策
   *
   * S-M 量表的跳题逻辑：
   * 1. 从年龄起点向前搜索连续10项通过，命中即建立基线
   * 2. 若起点区间出现失败且尚未建立基线，则回到更早题目继续找连续10项通过
   * 3. 建立基线后继续向后评估，命中连续10项不通过即结束
   * 4. 其余情况默认进入下一题
   */
  getNextQuestion(
    currentIndex: number,
    answers: Record<string, ScaleAnswer>,
    state: AssessmentState
  ): NavigationDecision {
    const metadata = ensureSMNavigationMetadata(
      this.sortedQuestions,
      currentIndex,
      state.metadata,
    )

    state.metadata = {
      ...state.metadata,
      ...metadata,
    }

    return getSMNavigationDecision(
      this.sortedQuestions,
      currentIndex,
      answers,
      state.metadata as SMNavigationMetadata,
    )
  }

  // ========== 评分计算 ==========

  /**
   * 计算评分结果
   *
   * S-M 量表粗分计算规则：
   * 1. 找到连续10项通过的位置
   * 2. 根据该位置所在阶段确定基础分
   * 3. 粗分 = 基础分 + 连续10项通过后的通过题目数
   * 4. 查表获取标准分（SQ）
   * 5. 确定评定等级
   */
  calculateScore(
    answers: Record<string, ScaleAnswer>,
    context: StudentContext
  ): ScoreResult {
    // 获取起始年龄阶段
    const startStage = this.getAgeStage(context.ageInMonths)

    // 1. 根据S-M量表规则计算粗分
    const rawScore = this.calculateSMRawScore(answers, startStage)

    // 2. 查表获取标准分（SQ）
    const standardScore = calculateSQScore(rawScore, context.ageInMonths)

    // 3. 确定评定等级
    const level = getEvaluationLevel(standardScore)

    // 4. 计算各维度分数
    const dimensions = this.calculateSMDimensionScores(answers)

    // 5. 统计答题时长
    const timing = this.calculateTiming(answers)

    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      totalScore: rawScore,
      standardScore,
      level,
      levelCode: this.getLevelCode(standardScore),
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
    const level = scoreResult.level
    const sq = scoreResult.standardScore || 10

    // 根据等级生成总体评价
    const summary = this.generateSummary(level, sq)

    // 分析优势和弱势维度
    const { strengths, weaknesses } = this.analyzeDimensions(scoreResult.dimensions)

    // 生成 IEP 建议
    const recommendations = this.generateRecommendations(level, weaknesses)

    // 训练重点
    const trainingFocus = this.generateTrainingFocus(weaknesses)

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
   * 【重写】计算进度百分比
   * S-M 量表：基于从起始阶段开始的题目计算进度
   */
  calculateProgress(state: AssessmentState): number {
    const answeredCount = Object.keys(state.answers).length
    // 获取起始索引（从 metadata 中获取，或根据当前状态估算）
    const startIndex = state.metadata?.startIndex || 0
    // 计算从起始位置到最后的题目数
    const questionsFromStart = this.totalQuestions - startIndex
    if (questionsFromStart <= 0) return 100
    return Math.min(100, Math.round((answeredCount / questionsFromStart) * 100))
  }

  // ========== 持久化 ==========

  /**
   * 持久化 S-M 量表评估结果到数据库
   *
   * 包含：
   * 1. 创建 sm_assess 主记录
   * 2. 保存 sm_assess_detail 答题详情
   * 3. 创建 report_record
   */
  async persistAssessment(context: PersistContext): Promise<PersistResult> {
    const { student, state, scoreResult, startTime, endTime } = context

    const smApi = new SMAssessmentAPI()

    // 1. 创建评估主记录
    const startStage = state.metadata?.startStage ||
      this.sortedQuestions[state.currentIndex]?.age_stage || 1

    const assessId = smApi.createAssessment({
      student_id: student.id,
      age_stage: startStage,
      raw_score: scoreResult.totalScore || 0,
      sq_score: scoreResult.standardScore || 10,
      level: scoreResult.level,
      start_time: startTime,
      end_time: endTime
    })

    // 2. 保存评估详情
    for (const [questionId, answer] of Object.entries(state.answers)) {
      smApi.saveAssessmentDetail({
        assess_id: assessId,
        question_id: parseInt(questionId),
        score: answer.score,
        answer_time: answer.responseTime || 0
      })
    }

    // 3. 创建报告记录
    const reportId = this.createReportRecord({
      studentId: student.id,
      reportType: 'sm',
      assessId,
      title: `${student.name} - S-M量表评估报告`
    })

    console.log('[SMDriver] S-M 评估持久化成功, assessId:', assessId)
    return { assessId, reportId }
  }

  /**
   * 获取从起始阶段开始的题目数量
   */
  getQuestionsFromStart(state: AssessmentState): number {
    // 优先使用 metadata 中的 startIndex（在 AssessmentContainer 初始化时设置）
    if (state.metadata?.startIndex !== undefined) {
      return this.totalQuestions - state.metadata.startIndex
    }
    // 默认返回总题数
    return this.totalQuestions
  }

  /**
   * 获取欢迎对话框内容
   */
  getWelcomeContent() {
    return {
      title: '婴儿-初中生社会生活能力量表 (S-M量表)',
      intro: '测量孩子在真实社会环境中的“生存技能”。从自己吃饭穿衣，到帮家里干活，再到独自出门买东西，全面评估孩子是不是一个合格的“社会人”。',
      sections: [
        {
          icon: '👨‍🏫',
          title: '给专业人员的实操心法',
          items: [
            '打破“高智商低能儿”的幻觉：很多自闭症或ADHD孩子，智商测出来很高，但S-M量表只在边缘水平。你要重点关注这种“能力剪刀差”。',
            '核实“包办”水分：当家长给“独立洗澡”“自己整理书包”打高分时，要继续追问他是不是在家长递毛巾、检查重装的情况下完成。很多“独立”其实是“在家长全程指挥下完成”。',
            '关注“退行”信号：如果一个已经上小学的孩子，突然连自己穿鞋都不愿意做了，往往不是能力丧失，而是学校霸凌、极度焦虑或抑郁等更深层问题的信号。',
          ],
        },
        {
          icon: '❤️',
          title: '给家长的填表大实话',
          items: [
            '抛开“智商滤镜”看生存：您的孩子可能英语单词倒背如流，但在填这个表时，请只看他“能不能自己过马路”“会不会去超市买瓶酱油”这类真实生活能力。',
            '这是在给您的“放手”打分：如果您发现这上面一大半项目，孩子都不会做，请先别急着骂孩子笨，先问问自己有没有真的给过他练习和尝试的机会。',
            '用“现在的他”来答题：请不要填“他以前会，只是现在懒得做”，也不要填“只要我好好教，他肯定能学会”。只看他今天、此时此刻，在没有催促和帮助下到底能不能做完。',
          ],
        },
      ],
      reminder: {
        icon: '⚠️',
        title: '特别提醒',
        content:
          '本量表结果仅供学校设计社会适应性课程和生活技能干预参考，不能作为智力低下或社会功能缺陷的法定诊断依据。如社会生活能力极度落后于年龄，建议前往正规医院发育行为科进行全面评估。',
      },
    }
  }

  // ========== 私有方法：题目转换 ==========

  /**
   * 将 S-M 原始题目转换为通用 ScaleQuestion 格式
   */
  private convertToScaleQuestion(q: SMQuestion): ScaleQuestion {
    return {
      id: q.id,
      dimension: q.dimension,
      dimensionName: q.dimension,
      content: q.title,
      options: [
        {
          value: 1,
          label: '通过',
          description: '学生能够完成该项能力',
          score: 1
        },
        {
          value: 0,
          label: '不通过',
          description: '学生不能完成该项能力',
          score: 0
        }
      ],
      metadata: {
        age_stage: q.age_stage,
        age_min: q.age_min,
        age_max: q.age_max
      },
      audioPath: q.audio
    }
  }

  // ========== 私有方法：年龄阶段计算 ==========

  /**
   * 根据月龄获取对应的年龄阶段
   */
  private getAgeStage(ageInMonths: number): number {
    if (ageInMonths >= 0 && ageInMonths <= 23) return 1
    if (ageInMonths >= 24 && ageInMonths <= 41) return 2
    if (ageInMonths >= 42 && ageInMonths <= 59) return 3
    if (ageInMonths >= 60 && ageInMonths <= 77) return 4
    if (ageInMonths >= 78 && ageInMonths <= 101) return 5
    if (ageInMonths >= 102 && ageInMonths <= 125) return 6
    return 7  // 126个月及以上
  }

  // ========== 私有方法：跳题逻辑 ==========

  // ========== 私有方法：评分计算 ==========

  /**
   * 根据S-M量表官方规则计算粗分
   *
   * 规则说明：
   * - 找到连续10项通过的位置
   * - 该位置所在阶段之前的所有题目视为通过（基础分）
   * - 粗分 = 基础分 + 连续10项通过后的通过题目数
   */
  private calculateSMRawScore(
    answers: Record<string, ScaleAnswer>,
    startStage: number
  ): number {
    return calculateSMRawScoreFromAnswers(this.sortedQuestions, answers, startStage)
  }

  /**
   * 计算各维度分数
   */
  private calculateSMDimensionScores(answers: Record<string, ScaleAnswer>): DimensionScore[] {
    const dimensionMap = new Map<string, { passed: number; total: number }>()

    // 初始化维度
    for (const dim of this.dimensions) {
      dimensionMap.set(dim, { passed: 0, total: 0 })
    }

    // 统计各维度得分
    for (const q of this.sortedQuestions) {
      const answer = answers[q.id]
      if (answer) {
        const dim = dimensionMap.get(q.dimension)
        if (dim) {
          dim.total++
          if (answer.score === 1) {
            dim.passed++
          }
        }
      }
    }

    // 转换为 DimensionScore 数组
    return Array.from(dimensionMap.entries()).map(([name, data]) => ({
      code: name,
      name,
      rawScore: data.passed,
      itemCount: data.total,
      passedCount: data.passed,
      averageScore: data.total > 0 ? data.passed / data.total : 0
    }))
  }

  /**
   * 获取等级代码
   */
  private getLevelCode(sqScore: number): string {
    if (sqScore <= 5) return 'severe'        // 极重度
    if (sqScore === 6) return 'heavy'        // 重度
    if (sqScore === 7) return 'moderate'     // 中度
    if (sqScore === 8) return 'mild'         // 轻度
    if (sqScore === 9) return 'borderline'   // 边缘
    if (sqScore === 10) return 'normal'      // 正常
    if (sqScore === 11) return 'high_normal' // 高常
    return 'excellent'                        // 优秀
  }

  // ========== 私有方法：反馈生成 ==========

  /**
   * 生成总体评价
   */
  private generateSummary(level: string, sq: number): string {
    const summaries: Record<string, string> = {
      '极重度': `该学生的社会生活能力标准分为${sq}分，处于极重度水平。在日常生活自理、社会交往等方面存在显著困难，需要全面的专业支持和家庭照护。`,
      '重度': `该学生的社会生活能力标准分为${sq}分，处于重度水平。在多数生活技能方面需要持续的指导和支持，建议制定详细的个别化训练计划。`,
      '中度': `该学生的社会生活能力标准分为${sq}分，处于中度水平。在部分生活技能方面需要定期辅助，有较大的提升空间。`,
      '轻度': `该学生的社会生活能力标准分为${sq}分，处于轻度水平。基本生活能力尚可，但在某些特定领域需要适当支持和训练。`,
      '边缘': `该学生的社会生活能力标准分为${sq}分，处于边缘水平。整体能力接近同龄人平均水平，建议针对性加强薄弱环节。`,
      '正常': `该学生的社会生活能力标准分为${sq}分，处于正常水平。各项生活技能发展良好，能够适应日常生活需要。`,
      '高常': `该学生的社会生活能力标准分为${sq}分，处于高于平均水平。在生活自理和社会适应方面表现优秀。`,
      '优秀': `该学生的社会生活能力标准分为${sq}分，处于优秀水平。在日常生活和社会交往方面表现出色，具备较强的独立能力。`
    }
    return summaries[level] || `该学生的社会生活能力标准分为${sq}分，评定等级为${level}。`
  }

  /**
   * 生成 IEP 建议
   */
  private generateRecommendations(level: string, weaknesses: string[]): string[] {
    const baseRecommendations: string[] = []

    // 根据等级添加基础建议
    if (['极重度', '重度', '中度'].includes(level)) {
      baseRecommendations.push('建议进行更详细的专业评估，确定具体的干预方向')
      baseRecommendations.push('制定结构化的日常生活训练计划，从简单技能开始逐步训练')
      baseRecommendations.push('在家庭和学校环境中保持一致的训练要求和期待')
    }

    if (['轻度', '边缘'].includes(level)) {
      baseRecommendations.push('针对性加强薄弱环节的训练')
      baseRecommendations.push('创造更多实践机会，鼓励独立完成生活任务')
    }

    // 根据弱势维度添加具体建议
    if (weaknesses.some(w => w.includes('独立生活能力'))) {
      baseRecommendations.push('加强日常生活自理能力训练，如穿衣、洗漱、进食等')
    }
    if (weaknesses.some(w => w.includes('交往'))) {
      baseRecommendations.push('增加社交互动机会，培养基本的社交礼仪和沟通技能')
    }
    if (weaknesses.some(w => w.includes('运动能力'))) {
      baseRecommendations.push('加强大运动和精细动作训练，提高身体协调性')
    }
    if (weaknesses.some(w => w.includes('自我管理'))) {
      baseRecommendations.push('培养时间管理和情绪调控能力，建立规律的生活作息')
    }
    if (weaknesses.some(w => w.includes('集体活动'))) {
      baseRecommendations.push('鼓励参与集体活动，培养合作意识和规则意识')
    }

    return baseRecommendations
  }

  /**
   * 生成训练重点
   */
  private generateTrainingFocus(weaknesses: string[]): string[] {
    const focus: string[] = []

    for (const w of weaknesses) {
      if (w.includes('独立生活能力')) {
        focus.push('日常生活技能训练')
      }
      if (w.includes('交往')) {
        focus.push('社交沟通能力培养')
      }
      if (w.includes('运动能力')) {
        focus.push('运动协调训练')
      }
      if (w.includes('自我管理')) {
        focus.push('自我管理能力提升')
      }
      if (w.includes('集体活动')) {
        focus.push('集体活动参与能力')
      }
      if (w.includes('作业')) {
        focus.push('动手操作能力训练')
      }
    }

    // 去重并限制数量
    return [...new Set(focus)].slice(0, 3)
  }

  /**
   * 生成家庭指导建议
   */
  private generateHomeGuidance(level: string): string[] {
    const guidance: string[] = [
      '家长应以鼓励和支持为主，避免过度包办代替',
      '在日常生活中创造让孩子独立完成任务的机会',
      '保持耐心，允许孩子犯错和从中学习',
      '及时给予正向反馈，增强孩子的自信心'
    ]

    if (['极重度', '重度'].includes(level)) {
      guidance.push('建议寻求专业康复机构的支持和指导')
      guidance.push('家庭成员间保持一致的教育方式和期待')
    }

    return guidance
  }

  // ========== 重写基类方法 ==========

  protected getDefaultDescription(): string {
    return '评估儿童日常生活和社会适应能力的发展水平'
  }

  protected getEstimatedTime(): number {
    return 15
  }

  protected getIcon(): string {
    return '📊'
  }
}
