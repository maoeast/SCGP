/**
 * CBCL (Achenbach儿童行为量表) 驱动器
 *
 * 家长版 113 题，适用于 4-16 岁儿童
 * 3 点计分：0 = 无，1 = 偶尔/轻微，2 = 经常/明显
 *
 * 评估结构：
 * - Part 2: 社会能力 (Social Competence) - 7个部分
 * - Part 3: 行为问题 (Behavior Problems) - 113题
 *
 * @module strategies/assessment/CBCLDriver
 */

import { BaseDriver } from './BaseDriver'
import type {
  StudentContext,
  ScaleQuestion,
  ScaleAnswer,
  ScoreResult,
  DimensionScore,
  AssessmentFeedback
} from '@/types/assessment'
import type {
  CBCLSocialCompetenceData,
  CBCLSocialCompetenceResult,
  CBCLFactorResult,
  CBCLNormGroup,
  CBCLGender,
  CBCLBehaviorAnswers
} from '@/types/cbcl'
import {
  CBCL_FACTOR_NORMS,
  CBCL_SOCIAL_NORMS,
  CBCL_TOTAL_SCORE_LIMITS,
  determineNormGroup,
  evaluateFactorScore,
  getFactorNames,
  getFactorItems,
  getFactorThresholds,
  hasDetailedFactors
} from '@/database/cbcl-norms'
import { ASSESSMENT_LIBRARY } from '@/config/feedbackConfig'

// ==========================================
// 类型定义
// ==========================================

/** CBCL 行为因子结果 */
export interface CBCLFactorScore {
  code: string
  name: string
  rawScore: number
  tScore: number
  level: 'normal' | 'borderline' | 'clinical'
  levelName: string
  p69: number
  p98: number
}

/** CBCL 行为问题评分结果 */
export interface CBCLBehaviorScoreResult {
  normGroup: CBCLNormGroup
  factors: CBCLFactorScore[]
  totalProblemsScore: number
  totalProblemsTScore: number
  internalizingScore: number
  internalizingTScore: number
  externalizingScore: number
  externalizingTScore: number
  summaryLevel: 'normal' | 'borderline' | 'clinical'
}

/** CBCL 结构化反馈 */
export interface CBCLStructuredFeedback {
  overallSummary: string[]
  overallAdvice: string[]
  socialCompetence: {
    summary: string
    advice: string
  }
  syndromeScales: Array<{
    code: string
    name: string
    tScore: number
    level: string
    summary: string
    advice: string
  }>
  clinicalProfile: {
    factors: CBCLFactorScore[]
    normGroup: CBCLNormGroup
  }
}

// ==========================================
// 常量定义
// ==========================================

/** 内化问题因子映射 (用于计算宽带量表) */
const INTERNALIZING_FACTORS: Record<string, string[]> = {
  'boy_6_11': ['抑郁', '社交退缩', '体诉'],
  'girl_6_11': ['体诉', '分裂样', '交往不良'],
  'boy_12_16': ['焦虑强迫', '体诉', '分裂样', '抑郁退缩'],
  'girl_12_16': ['体诉', '分裂样', '交往不良']
}

/** 外化问题因子映射 */
const EXTERNALIZING_FACTORS: Record<string, string[]> = {
  'boy_6_11': ['违纪', '攻击性'],
  'girl_6_11': ['违纪', '攻击性'],
  'boy_12_16': ['违纪', '攻击性'],
  'girl_12_16': ['违纪', '攻击性']
}

/** 因子代码到中文名称映射 */
const FACTOR_NAME_MAP: Record<string, string> = {
  // 6-11岁男孩
  '分裂样': '分裂样',
  '抑郁': '抑郁',
  '交往不良': '交往不良',
  '强迫性': '强迫性',
  '体诉': '体诉',
  '社交退缩': '社交退缩',
  '多动': '多动',
  '攻击性': '攻击性',
  '违纪': '违纪',
  // 6-11岁女孩
  '不成熟': '不成熟',
  '敌意性': '敌意性',
  // 12-16岁男孩
  '焦虑强迫': '焦虑强迫',
  '抑郁退缩': '抑郁退缩',
  '残忍': '残忍'
}

/** 反馈配置中的因子代码映射 */
const FEEDBACK_FACTOR_MAP: Record<string, string> = {
  '抑郁': 'anxious_depressed',
  '焦虑强迫': 'anxious_depressed',
  '社交退缩': 'withdrawn',
  '抑郁退缩': 'withdrawn',
  '体诉': 'somatic',
  '交往不良': 'social_problems',
  '强迫性': 'thought_problems',
  '多动': 'attention',
  '攻击性': 'aggressive',
  '违纪': 'rule_breaking',
  '分裂样': 'thought_problems',
  '不成熟': 'thought_problems',
  '敌意性': 'aggressive',
  '残忍': 'aggressive'
}

// ==========================================
// 辅助函数
// ==========================================

/**
 * 计算活动能力得分
 * 根据参与数量、时间投入和水平评价计算
 */
function calculateActivityScore(count: number, time: number, level: number): number {
  // 数量得分: 0-3分
  const countScore = Math.min(count, 3)
  // 时间得分: 0-3分
  const timeScore = time >= 0 ? Math.min(time, 3) : 0
  // 水平得分: 0-3分
  const levelScore = level >= 0 ? Math.min(level, 3) : 0

  // 加权平均
  return Math.round((countScore + timeScore + levelScore) / 3 * 2) / 2
}

/**
 * 计算平均值
 */
function calcAvg(values: number[]): number {
  const validValues = values.filter(v => v >= 0)
  if (validValues.length === 0) return 0
  return Math.round((validValues.reduce((a, b) => a + b, 0) / validValues.length) * 2) / 2
}

/**
 * 根据原始分估算T分数 (简化版线性转换)
 * 实际应用中应使用完整的常模转换表
 */
function estimateTScore(rawScore: number, mean: number, sd: number): number {
  const tScore = 50 + 10 * ((rawScore - mean) / sd)
  return Math.round(Math.max(30, Math.min(100, tScore)))
}

/**
 * 获取T分数对应的等级
 */
function getTScoreLevel(tScore: number): 'normal' | 'borderline' | 'clinical' {
  if (tScore >= 70) return 'clinical'
  if (tScore >= 65) return 'borderline'
  return 'normal'
}

/**
 * CBCL 驱动器
 */
export class CBCLDriver extends BaseDriver {
  // ========== 量表元信息 ==========

  readonly scaleCode = 'cbcl'
  readonly scaleName = 'Achenbach儿童行为量表 (CBCL)'
  readonly version = '家长版'
  readonly ageRange = { min: 48, max: 192 } // 4-16岁（月）
  readonly totalQuestions = 113
  readonly dimensions = ['social', 'behavior'] // 高级维度

  // ========== 实例状态 ==========

  /** 社会能力数据 (Part 2) */
  private socialData: CBCLSocialCompetenceData | null = null

  /** 学生上下文 */
  private studentName: string = ''
  private studentAgeMonths: number = 0
  private studentGender: CBCLGender = 'boy'

  // ========== 社会能力数据设置 ==========

  /**
   * 设置社会能力数据 (Part 2)
   * 在评估Part 3之前调用
   */
  setSocialData(data: CBCLSocialCompetenceData): void {
    this.socialData = data
  }

  /**
   * 配置学生上下文
   */
  setStudentContext(context: StudentContext): void {
    this.studentName = context.name
    this.studentAgeMonths = context.ageInMonths
    this.studentGender = context.gender === '男' ? 'boy' : 'girl'
  }

  // ========== 题目管理 ==========

  /**
   * 获取题目列表
   * CBCL题目是静态的，不随年龄变化
   */
  getQuestions(_context: StudentContext): ScaleQuestion[] {
    // 题目数据将在后续计划中实现
    // 这里返回空数组，实际使用时从 cbcl-questions.ts 加载
    return []
  }

  /**
   * 获取起始题目索引
   */
  getStartIndex(_context: StudentContext): number {
    return 0
  }

  // ========== 评分计算 ==========

  /**
   * 计算社会能力得分 (Part 2)
   */
  calculateSocialCompetence(): CBCLSocialCompetenceResult | null {
    if (!this.socialData) return null

    const data = this.socialData
    const normGroup = determineNormGroup(this.studentGender, this.studentAgeMonths)

    // 1. 计算活动能力因子 (I-IV部分)
    const scoreI = calculateActivityScore(data.I_count, data.I_time, data.I_level)
    const scoreII = calculateActivityScore(data.II_count, data.II_time, data.II_level)
    const scoreIII = calculateActivityScore(data.III_count, data.III_active, -1)
    const scoreIV = data.IV_count > 0 ? calcAvg([data.IV_quality]) : 0
    const factorActivity = scoreI + scoreII + scoreIII + scoreIV

    // 2. 计算社交情况因子 (V-VI部分)
    const scoreV1 = data.V_friends >= 4 ? 2 : (data.V_friends >= 2 ? 1 : 0)
    const scoreV2 = data.V_meet >= 3 ? 2 : (data.V_meet >= 1 ? 1 : 0)
    const scoreVI_abc = calcAvg([data.VI_a, data.VI_b, data.VI_c])
    const scoreVI_d = data.VI_d >= 0 ? data.VI_d : 0
    const factorSocial = scoreV1 + scoreV2 + scoreVI_abc + scoreVI_d

    // 3. 计算学校情况因子 (VII部分)
    const scoreVII_1 = calcAvg([data.VII_math, data.VII_chinese, data.VII_english, data.VII_other])
    const scoreVII_234 = (data.VII_isSpecial ? 0 : 1) + (data.VII_isRetained ? 0 : 1) + (data.VII_hasProblem ? 0 : 1)
    const factorSchool = scoreVII_1 + scoreVII_234

    // 4. 获取常模阈值并评估
    const socialNorm = CBCL_SOCIAL_NORMS[normGroup]

    const evaluateSocialFactor = (score: number, threshold: number): { status: string; level: 0 | 1 | 2 } => {
      // 社会能力分数越低越差
      if (score < threshold) return { status: '可能异常', level: 2 }
      if (score < threshold + 1) return { status: '边缘/需关注', level: 1 }
      return { status: '正常', level: 0 }
    }

    const activityResult = evaluateSocialFactor(factorActivity, socialNorm?.activity || 3)
    const socialResult = evaluateSocialFactor(factorSocial, socialNorm?.social || 3)
    const schoolResult = evaluateSocialFactor(factorSchool, socialNorm?.school || 2)

    return {
      group: normGroup,
      activity: {
        score: factorActivity,
        status: activityResult.status,
        level: activityResult.level
      },
      social: {
        score: factorSocial,
        status: socialResult.status,
        level: socialResult.level
      },
      school: {
        score: factorSchool,
        status: schoolResult.status,
        level: schoolResult.level
      },
      rawScores: {
        factorActivity,
        factorSocial,
        factorSchool
      }
    }
  }

  /**
   * 计算行为问题得分 (Part 3)
   */
  calculateBehaviorProblems(answers: Record<string, ScaleAnswer>): CBCLBehaviorScoreResult {
    // 1. 确定常模组
    const normGroup = determineNormGroup(this.studentGender, this.studentAgeMonths)

    // 2. 获取因子配置
    const factorConfig = CBCL_FACTOR_NORMS[normGroup]
    const factorNames = factorConfig ? Object.keys(factorConfig) : []

    // 3. 计算各因子原始分
    const factorScores: CBCLFactorScore[] = []
    let totalRawScore = 0

    for (const factorName of factorNames) {
      const config = factorConfig[factorName]
      let rawScore = 0

      for (const item of config.items) {
        const answer = answers[item]
        if (answer) {
          rawScore += answer.score
        }
      }

      // 估算T分数 (使用简化公式，实际应查表)
      // 均值和标准差根据常模数据估算
      const mean = config.p69
      const sd = (config.p98 - config.p69) / 2
      const tScore = estimateTScore(rawScore, mean, sd)
      const level = getTScoreLevel(tScore)

      factorScores.push({
        code: FEEDBACK_FACTOR_MAP[factorName] || factorName,
        name: FACTOR_NAME_MAP[factorName] || factorName,
        rawScore,
        tScore,
        level,
        levelName: level === 'clinical' ? '可能异常' : level === 'borderline' ? '边缘/需关注' : '正常',
        p69: config.p69,
        p98: config.p98
      })

      totalRawScore += rawScore
    }

    // 4. 计算内化/外化问题得分
    const internalizingFactors = INTERNALIZING_FACTORS[normGroup] || []
    const externalizingFactors = EXTERNALIZING_FACTORS[normGroup] || []

    const internalizingScore = factorScores
      .filter(f => internalizingFactors.includes(f.name))
      .reduce((sum, f) => sum + f.rawScore, 0)

    const externalizingScore = factorScores
      .filter(f => externalizingFactors.includes(f.name))
      .reduce((sum, f) => sum + f.rawScore, 0)

    // 估算内化/外化T分数
    const internalizingTScore = estimateTScore(internalizingScore, 6, 3)
    const externalizingTScore = estimateTScore(externalizingScore, 8, 4)

    // 5. 计算总分T分数
    const totalTScore = estimateTScore(totalRawScore, 25, 10)

    // 6. 确定总体等级
    const summaryLevel = getTScoreLevel(totalTScore)

    return {
      normGroup,
      factors: factorScores,
      totalProblemsScore: totalRawScore,
      totalProblemsTScore: totalTScore,
      internalizingScore,
      internalizingTScore,
      externalizingScore,
      externalizingTScore,
      summaryLevel
    }
  }

  /**
   * 计算评分结果
   */
  calculateScore(
    answers: Record<string, ScaleAnswer>,
    context: StudentContext
  ): ScoreResult {
    console.log('%c========== CBCL 评分计算开始 ==========', 'color: #2196F3; font-size: 14px; font-weight: bold;')
    console.log('📋 学生信息:', { id: context.id, name: context.name, ageMonths: context.ageInMonths })

    // 1. 存储上下文
    this.setStudentContext(context)

    // 2. 计算社会能力得分
    const socialScores = this.calculateSocialCompetence()
    console.log('%c[Step 1] 社会能力得分:', 'color: #FF9800; font-weight: bold;', socialScores)

    // 3. 计算行为问题得分
    const behaviorScores = this.calculateBehaviorProblems(answers)
    console.log('%c[Step 2] 行为问题得分:', 'color: #4CAF50; font-weight: bold;', {
      常模组: behaviorScores.normGroup,
      总分: behaviorScores.totalProblemsScore,
      总分T分数: behaviorScores.totalProblemsTScore,
      内化T分数: behaviorScores.internalizingTScore,
      外化T分数: behaviorScores.externalizingTScore,
      总体等级: behaviorScores.summaryLevel
    })

    // 4. 构建维度分数数组
    const dimensions: DimensionScore[] = []

    // 添加社会能力维度
    if (socialScores) {
      dimensions.push(
        {
          code: 'activity',
          name: '活动能力',
          rawScore: socialScores.activity.score,
          itemCount: 4,
          level: socialScores.activity.level === 2 ? 'abnormal' : socialScores.activity.level === 1 ? 'borderline' : 'normal',
          levelName: socialScores.activity.status
        },
        {
          code: 'social',
          name: '社交情况',
          rawScore: socialScores.social.score,
          itemCount: 4,
          level: socialScores.social.level === 2 ? 'abnormal' : socialScores.social.level === 1 ? 'borderline' : 'normal',
          levelName: socialScores.social.status
        },
        {
          code: 'school',
          name: '学校表现',
          rawScore: socialScores.school.score,
          itemCount: 3,
          level: socialScores.school.level === 2 ? 'abnormal' : socialScores.school.level === 1 ? 'borderline' : 'normal',
          levelName: socialScores.school.status
        }
      )
    }

    // 添加行为问题维度
    for (const factor of behaviorScores.factors) {
      dimensions.push({
        code: factor.code,
        name: factor.name,
        rawScore: factor.rawScore,
        standardScore: factor.tScore,
        itemCount: 0, // 将在后续填充
        level: factor.level,
        levelName: factor.levelName
      })
    }

    // 5. 序列化原始答案
    const rawAnswers: Record<string, number> = {}
    for (const [key, answer] of Object.entries(answers)) {
      rawAnswers[key] = answer.score
    }

    console.log('%c========== CBCL 评分计算完成 ==========', 'color: #2196F3; font-size: 14px; font-weight: bold;')

    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      dimensions,
      totalScore: behaviorScores.totalProblemsScore,
      tScore: behaviorScores.totalProblemsTScore,
      level: behaviorScores.summaryLevel === 'clinical' ? '可能异常' : behaviorScores.summaryLevel === 'borderline' ? '边缘/需关注' : '正常',
      levelCode: behaviorScores.summaryLevel,
      rawAnswers,
      timing: this.calculateTiming(answers),
      // CBCL特有数据
      extraData: {
        socialCompetence: socialScores,
        behaviorProblems: behaviorScores,
        internalizingTScore: behaviorScores.internalizingTScore,
        externalizingTScore: behaviorScores.externalizingTScore
      }
    }
  }

  // ========== 反馈生成 ==========

  /**
   * 生成评估反馈
   */
  generateFeedback(scoreResult: ScoreResult): CBCLStructuredFeedback {
    const extraData = scoreResult.extraData as {
      socialCompetence?: CBCLSocialCompetenceResult
      behaviorProblems?: CBCLBehaviorScoreResult
      internalizingTScore?: number
      externalizingTScore?: number
    } | undefined

    const behaviorScores = extraData?.behaviorProblems
    const socialScores = extraData?.socialCompetence
    const studentName = this.studentName || '孩子'

    // 获取反馈配置
    const feedbackConfig = ASSESSMENT_LIBRARY.cbcl

    // 1. 生成总体评价
    const totalTScore = behaviorScores?.totalProblemsTScore || scoreResult.tScore || 50
    const totalLevelConfig = this.matchTScoreToLevel(
      feedbackConfig.total_score_rules,
      totalTScore
    )

    // 2. 生成社会能力反馈
    const socialFeedback = this.generateSocialCompetenceFeedback(
      socialScores,
      feedbackConfig.social_competence?.levels || []
    )

    // 3. 生成综合征量表反馈
    const syndromeFeedback = (behaviorScores?.factors || []).map(factor => {
      const syndromeConfig = feedbackConfig.dimensions?.[factor.code]
      const levelConfig = syndromeConfig?.levels
        ? this.matchTScoreToLevel(syndromeConfig.levels, factor.tScore)
        : null

      return {
        code: factor.code,
        name: factor.name,
        tScore: factor.tScore,
        level: factor.level,
        summary: levelConfig?.content || '',
        advice: this.extractAdvice(levelConfig?.structured_advice) || levelConfig?.advice?.join('\n') || ''
      }
    })

    // 4. 占位符替换
    const replacePlaceholders = (text: string): string => {
      return text.replace(/\[儿童姓名\]/g, studentName)
    }

    // 5. 返回结构化反馈
    return {
      overallSummary: totalLevelConfig?.content ? [replacePlaceholders(totalLevelConfig.content)] : [],
      overallAdvice: (totalLevelConfig?.base_advice || []).map(replacePlaceholders),
      socialCompetence: {
        summary: replacePlaceholders(socialFeedback.summary),
        advice: replacePlaceholders(socialFeedback.advice)
      },
      syndromeScales: syndromeFeedback.map(s => ({
        ...s,
        summary: replacePlaceholders(s.summary),
        advice: replacePlaceholders(s.advice)
      })),
      clinicalProfile: {
        factors: behaviorScores?.factors || [],
        normGroup: behaviorScores?.normGroup || 'boy_6_11'
      }
    }
  }

  /**
   * 生成社会能力反馈
   */
  private generateSocialCompetenceFeedback(
    socialScores: CBCLSocialCompetenceResult | null | undefined,
    levels: Array<{ range: [number, number]; content?: string; structured_advice?: any }>
  ): { summary: string; advice: string } {
    if (!socialScores) {
      return { summary: '未提供社会能力数据', advice: '' }
    }

    // 计算社会能力综合T分数 (简化处理)
    const avgScore = (socialScores.activity.score + socialScores.social.score + socialScores.school.score) / 3
    const estimatedTSocial = 30 + avgScore * 10 // 粗略估算

    const levelConfig = this.matchTScoreToLevel(levels, estimatedTSocial)

    if (levelConfig) {
      const advice = this.extractAdvice(levelConfig.structured_advice) || ''
      return {
        summary: levelConfig.content || '',
        advice
      }
    }

    return { summary: '', advice: '' }
  }

  /**
   * 从结构化建议中提取文本
   */
  private extractAdvice(structuredAdvice: any): string {
    if (!structuredAdvice) return ''

    const parts: string[] = []
    for (const key of Object.keys(structuredAdvice)) {
      const value = structuredAdvice[key]
      if (Array.isArray(value)) {
        parts.push(...value)
      } else if (typeof value === 'string') {
        parts.push(value)
      }
    }
    return parts.join('\n')
  }

  /**
   * 从 levels 数组中匹配 T 分数到对应的等级配置
   */
  private matchTScoreToLevel(
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
      title: 'Achenbach儿童行为量表 (CBCL)',
      intro: '本量表用于评估4-16岁儿童的社会能力和行为问题，请根据孩子最近6个月的情况如实作答。',
      sections: [
        {
          icon: '📋',
          title: '评估说明',
          content: 'CBCL包含两部分：第一部分评估孩子的社会能力（爱好、交友、学校表现），第二部分评估行为问题（情绪、行为、身体症状等）。请根据孩子的实际情况选择最符合的选项。'
        },
        {
          icon: '📝',
          title: '评分标准',
          content: '行为问题部分每题有3个选项：0=无，1=偶尔/轻微，2=经常/明显。社会能力部分根据不同维度有不同的评分方式。请在安静的环境中完成。'
        }
      ],
      footer: '请注意：本评估结果仅供参考，不能作为临床诊断的依据。如有疑问，请咨询专业医生或儿童心理专家。'
    }
  }

  // ========== 图标和描述 ==========

  protected getIcon(): string {
    return '📊'
  }

  protected getDefaultDescription(): string {
    return '评估儿童的社会能力和行为问题'
  }

  protected getEstimatedTime(): number {
    return 20 // 约20分钟
  }
}
