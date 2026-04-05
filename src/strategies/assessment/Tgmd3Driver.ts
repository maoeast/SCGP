import { BaseDriver } from './BaseDriver'
import type {
  AssessmentFeedback,
  DimensionScore,
  ScaleAnswer,
  ScaleQuestion,
  ScoreResult,
  StudentContext,
} from '@/types/assessment'
import { ASSESSMENT_LIBRARY } from '@/config/feedbackConfig'
import {
  TGMD3_DIMENSIONS,
  TGMD3_LEVEL_DESCRIPTIONS,
  TGMD3_NORMS,
  TGMD3_SKILLS,
  getTgmd3ScaleQuestions,
  type Tgmd3DimensionCode,
  type Tgmd3NormLevels,
} from '@/database/tgmd3-questions'

type Tgmd3OverallLevelCode = 'emerging_skills' | 'developing_skills' | 'proficient_skills'
type Tgmd3Severity = 'success' | 'warning' | 'danger'

interface Tgmd3OverallRule {
  id: Tgmd3OverallLevelCode
  range: [number, number]
  title: string
  severity: 'success' | 'warning' | 'info'
  summary: string
  content: string
  advice: string[]
}

interface Tgmd3DimensionCopy {
  label: string
  content: string
  advice: string
}

interface Tgmd3DimensionConfig {
  title: string
  low: Tgmd3DimensionCopy
  high: Tgmd3DimensionCopy
}

interface Tgmd3SkillResult {
  questionId: number
  itemCode: string
  code: string
  dimension: Tgmd3DimensionCode
  dimensionName: string
  name: string
  equipment: string
  guidance: string
  criteria: string[]
  score: number
  maxScore: number
  percentage: number
}

interface Tgmd3DomainResult {
  code: Tgmd3DimensionCode
  name: string
  rawScore: number
  maxScore: number
  percentage: number
  normLevel: number | null
  normLabel: string | null
  level: string
  levelCode: string
  severity: Tgmd3Severity
}

interface Tgmd3DomainFeedback {
  code: Tgmd3DimensionCode
  title: string
  label: string
  content: string
  advice: string
}

interface Tgmd3NormSummary {
  ageYears: number
  genderCode: 'M' | 'F'
  locomotorLevel: number | null
  ballLevel: number | null
  totalLevel: number | null
  locomotorLabel: string | null
  ballLabel: string | null
  totalLabel: string | null
}

interface Tgmd3Flag {
  code: 'DCD_RISK'
  title: string
  severity: 'error' | 'warning'
  content: string
  advice: string
}

interface Tgmd3IepTarget {
  questionId: number
  itemCode: string
  skillCode: string
  title: string
  dimension: Tgmd3DimensionCode
  dimensionName: string
  score: number
  maxScore: number
  percentage: number
  priority: 1 | 2 | 3
  rationale: string
  advice: string
}

const TGMD3_LIBRARY = ASSESSMENT_LIBRARY.tgmd_3 as {
  total_score_rules: Tgmd3OverallRule[]
  dimensions: Record<Tgmd3DimensionCode, Tgmd3DimensionConfig>
  flags: Record<'DCD_RISK', Omit<Tgmd3Flag, 'code'>>
}

export class Tgmd3Driver extends BaseDriver {
  readonly scaleCode = 'tgmd_3'
  readonly scaleName = '大肌肉动作发展测验第三版 (TGMD-3)'
  readonly version = '1.0.0'
  readonly ageRange = { min: 36, max: 131 }
  readonly totalQuestions = TGMD3_SKILLS.length
  readonly dimensions = TGMD3_DIMENSIONS.map((item) => item.fullLabel)

  private readonly scaleQuestions = getTgmd3ScaleQuestions()

  getQuestions(_context: StudentContext): ScaleQuestion[] {
    return this.scaleQuestions
  }

  getStartIndex(_context: StudentContext): number {
    return 0
  }

  calculateScore(
    answers: Record<string, ScaleAnswer>,
    context: StudentContext,
  ): ScoreResult {
    const skillResults = TGMD3_SKILLS.map((skill) => {
      const answer = answers[String(skill.id)] || answers[skill.id]
      const score = Number(answer?.score ?? 0)

      return {
        questionId: skill.id,
        itemCode: skill.itemCode,
        code: skill.code,
        dimension: skill.dimension,
        dimensionName: skill.dimensionName,
        name: skill.name,
        equipment: skill.equipment,
        guidance: skill.guidance,
        criteria: skill.criteria,
        score,
        maxScore: skill.maxScore,
        percentage: Number(((score / skill.maxScore) * 100).toFixed(1)),
      } satisfies Tgmd3SkillResult
    })

    const domainResults = TGMD3_DIMENSIONS.map((dimension) => {
      const skills = skillResults.filter((item) => item.dimension === dimension.code)
      const rawScore = skills.reduce((sum, item) => sum + item.score, 0)
      const percentage = Number(((rawScore / dimension.maxScore) * 100).toFixed(1))
      const normLevel = this.resolveNormLevel(
        rawScore,
        dimension.code === 'locomotor'
          ? TGMD3_NORMS.locomotor[this.resolveNormAge(context.ageInMonths)]
          : this.resolveBallNormLevels(context)[this.resolveNormAge(context.ageInMonths)],
      )
      const normLabel = this.resolveNormLabel(normLevel)
      const levelCode = this.resolveDomainBand(percentage, normLevel)

      return {
        code: dimension.code,
        name: dimension.fullLabel,
        rawScore,
        maxScore: dimension.maxScore,
        percentage,
        normLevel,
        normLabel,
        level: normLabel ? `常模${normLevel}级` : levelCode === 'high' ? '发展优势' : '需要支持',
        levelCode,
        severity: this.resolveSeverity(percentage, normLevel),
      } satisfies Tgmd3DomainResult
    })

    const locomotor = domainResults.find((item) => item.code === 'locomotor')!
    const ballSkills = domainResults.find((item) => item.code === 'ball_skills')!
    const totalRawScore = locomotor.rawScore + ballSkills.rawScore
    const totalPercent = Number(totalRawScore.toFixed(1))
    const totalNormLevel = this.resolveNormLevel(
      totalRawScore,
      TGMD3_NORMS.total[this.resolveNormAge(context.ageInMonths)],
    )
    const overallRule = this.resolveOverallRule(totalPercent)
    const normSummary = this.buildNormSummary(context, locomotor.normLevel, ballSkills.normLevel, totalNormLevel)
    const domainFeedback = this.buildDomainFeedback(domainResults)
    const iepTargets = this.extractIepTargets(skillResults, domainResults)
    const flags = this.buildFlags(domainResults, totalNormLevel)

    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      totalScore: totalRawScore,
      level: overallRule.title,
      levelCode: overallRule.id,
      dimensions: domainResults.map((item) => this.toDimensionScore(item)),
      rawAnswers: this.serializeAnswers(answers),
      extraData: {
        locomotorScore: locomotor.rawScore,
        locomotorPercent: locomotor.percentage,
        locomotorLevel: locomotor.normLevel,
        ballSkillsScore: ballSkills.rawScore,
        ballSkillsPercent: ballSkills.percentage,
        ballSkillsLevel: ballSkills.normLevel,
        totalRawScore,
        totalPercent,
        totalLevel: totalNormLevel,
        skillResults,
        domainResults,
        normSummary,
        overallRule,
        domainFeedback,
        flags,
        iepTargets,
      },
      timing: this.calculateTiming(answers),
    }
  }

  generateFeedback(scoreResult: ScoreResult): AssessmentFeedback {
    const extraData = scoreResult.extraData as {
      totalPercent: number
      overallRule: Tgmd3OverallRule
      skillResults: Tgmd3SkillResult[]
      domainFeedback: Tgmd3DomainFeedback[]
      flags: Tgmd3Flag[]
      iepTargets: Tgmd3IepTarget[]
      normSummary: Tgmd3NormSummary
    } | undefined

    const overallRule = extraData?.overallRule || this.resolveOverallRule(Number(scoreResult.totalScore || 0))
    const skillResults = extraData?.skillResults || []
    const iepTargets = extraData?.iepTargets || []
    const flags = extraData?.flags || []

    const strengths = skillResults
      .filter((item) => item.percentage >= 75)
      .map((item) => `${item.name} ${item.score}/${item.maxScore}`)

    const weaknesses = skillResults
      .filter((item) => item.percentage < 60)
      .map((item) => `${item.name} ${item.score}/${item.maxScore}`)

    const normSummary = extraData?.normSummary
    const normDescription = normSummary?.totalLevel
      ? `动作总分常模 ${normSummary.totalLevel} 级（${normSummary.totalLabel}）`
      : '当前未命中本地常模等级'

    return {
      summary: `TGMD-3 动作总分 ${Number(scoreResult.totalScore || 0).toFixed(0)} / 100，${normDescription}。${overallRule.summary}`,
      strengths,
      weaknesses,
      recommendations: overallRule.advice,
      trainingFocus: iepTargets.map((item) => `${item.dimensionName} - ${item.title}`),
      resourceSuggestions: [
        ...(extraData?.domainFeedback || []).map((item) => item.advice),
        ...flags.map((item) => item.advice),
      ],
      homeGuidance: [
        overallRule.content,
        ...(extraData?.domainFeedback || []).map((item) => item.content),
      ],
      overallRule,
      normSummary,
      domainFeedback: extraData?.domainFeedback || [],
      flags,
      iepTargets,
    }
  }

  validateAnswer(_questionId: number | string, value: unknown): boolean {
    return Number.isInteger(Number(value)) && Number(value) >= 0
  }

  getWelcomeContent() {
    return {
      title: 'TGMD-3 大肌肉动作发展测验',
      intro: '本评估按 13 个动作技能录入每项总分，系统自动计算位移技能、球类技能、动作总分与上海市常模等级。',
      sections: [
        {
          icon: '🏃',
          title: '录入方式',
          content: '每项技能请根据两次正式试做后的累计得分录入，不是单次表现分。',
        },
        {
          icon: '📊',
          title: '结果输出',
          content: '系统会同时输出位移技能、球类技能、动作总分，以及年龄/性别对应的本地常模等级。',
        },
        {
          icon: '🎯',
          title: '干预提取',
          content: '报告会优先从低得分技能中提取近期 IEP 关注点，帮助快速形成训练重点。',
        },
      ],
      footer: '位移技能展示的是仓库本地资料摘录的观察点，正式评分仍应以 TGMD-3 手册为准。',
    }
  }

  protected getDefaultDescription(): string {
    return '基于技能总分录入与上海市常模等级换算的 TGMD-3 粗大动作评估'
  }

  protected getEstimatedTime(): number {
    return 20
  }

  protected getIcon(): string {
    return 'trophy'
  }

  private resolveNormAge(ageInMonths: number): number {
    const ageYears = Math.floor(ageInMonths / 12)
    return Math.min(10, Math.max(3, ageYears))
  }

  private resolveBallNormLevels(context: StudentContext): Record<number, Tgmd3NormLevels> {
    return context.gender === '男' ? TGMD3_NORMS.ballMale : TGMD3_NORMS.ballFemale
  }

  private resolveNormLevel(score: number, ranges: Tgmd3NormLevels | undefined): number | null {
    if (!ranges) {
      return null
    }

    for (let index = 0; index < ranges.length; index += 1) {
      const range = ranges[index]
      if (!range) continue
      if (score >= range.min && score <= range.max) {
        return index + 1
      }
    }

    return null
  }

  private resolveNormLabel(level: number | null): string | null {
    if (!level || level < 1 || level > TGMD3_LEVEL_DESCRIPTIONS.length) {
      return null
    }

    return TGMD3_LEVEL_DESCRIPTIONS[level - 1] || null
  }

  private resolveOverallRule(totalPercent: number): Tgmd3OverallRule {
    const matchedRule = TGMD3_LIBRARY.total_score_rules.find(
      (rule) => totalPercent >= rule.range[0] && totalPercent <= rule.range[1],
    )

    return matchedRule || {
      id: 'developing_skills',
      range: [25, 75],
      title: '稳步成长期（技能泛化与环境适应）',
      severity: 'info',
      summary: '已掌握大部分基础运动模块，正处于动作流畅度与协调性提升的黄金期。',
      content: '当前未命中本地配置区间，系统按默认发展中区间生成解释，请结合原始技能分与常模等级综合判断。',
      advice: ['建议结合位移技能、球类技能与动作总分常模等级，确定近期训练重点。'],
    }
  }

  private resolveDomainBand(percentage: number, normLevel: number | null): 'low' | 'high' {
    if (normLevel !== null) {
      return normLevel <= 2 ? 'low' : 'high'
    }

    return percentage < 60 ? 'low' : 'high'
  }

  private resolveSeverity(percentage: number, normLevel: number | null): Tgmd3Severity {
    if (normLevel !== null) {
      if (normLevel <= 2) return 'danger'
      if (normLevel === 3) return 'warning'
      return 'success'
    }

    if (percentage < 40) return 'danger'
    if (percentage < 75) return 'warning'
    return 'success'
  }

  private buildNormSummary(
    context: StudentContext,
    locomotorLevel: number | null,
    ballLevel: number | null,
    totalLevel: number | null,
  ): Tgmd3NormSummary {
    return {
      ageYears: this.resolveNormAge(context.ageInMonths),
      genderCode: context.gender === '男' ? 'M' : 'F',
      locomotorLevel,
      ballLevel,
      totalLevel,
      locomotorLabel: this.resolveNormLabel(locomotorLevel),
      ballLabel: this.resolveNormLabel(ballLevel),
      totalLabel: this.resolveNormLabel(totalLevel),
    }
  }

  private buildDomainFeedback(domainResults: Tgmd3DomainResult[]): Tgmd3DomainFeedback[] {
    return domainResults.map((item) => {
      const config = TGMD3_LIBRARY.dimensions[item.code]
      const copy = item.levelCode === 'low' ? config.low : config.high

      return {
        code: item.code,
        title: config.title,
        label: copy.label,
        content: copy.content,
        advice: copy.advice,
      }
    })
  }

  private buildFlags(domainResults: Tgmd3DomainResult[], totalNormLevel: number | null): Tgmd3Flag[] {
    const locomotor = domainResults.find((item) => item.code === 'locomotor')
    const ball = domainResults.find((item) => item.code === 'ball_skills')
    if (!locomotor || !ball) {
      return []
    }

    const bothLow = (
      (locomotor.normLevel !== null && locomotor.normLevel <= 2)
      && (ball.normLevel !== null && ball.normLevel <= 2)
    ) || (
      locomotor.percentage < 40 && ball.percentage < 40 && (totalNormLevel === null || totalNormLevel <= 2)
    )

    if (!bothLow) {
      return []
    }

    return [
      {
        code: 'DCD_RISK',
        title: TGMD3_LIBRARY.flags.DCD_RISK.title,
        severity: TGMD3_LIBRARY.flags.DCD_RISK.severity,
        content: TGMD3_LIBRARY.flags.DCD_RISK.content,
        advice: TGMD3_LIBRARY.flags.DCD_RISK.advice,
      },
    ]
  }

  private extractIepTargets(
    skillResults: Tgmd3SkillResult[],
    domainResults: Tgmd3DomainResult[],
  ): Tgmd3IepTarget[] {
    const domainMap = new Map(domainResults.map((item) => [item.code, item]))

    return skillResults
      .filter((item) => item.percentage < 75)
      .sort((left, right) => left.percentage - right.percentage)
      .slice(0, 3)
      .map((item, index) => {
        const domainResult = domainMap.get(item.dimension)
        const domainConfig = TGMD3_LIBRARY.dimensions[item.dimension]
        const advice = (domainResult?.levelCode === 'low' ? domainConfig.low : domainConfig.high).advice

        return {
          questionId: item.questionId,
          itemCode: item.itemCode,
          skillCode: item.code,
          title: item.name,
          dimension: item.dimension,
          dimensionName: item.dimensionName,
          score: item.score,
          maxScore: item.maxScore,
          percentage: item.percentage,
          priority: (index + 1) as 1 | 2 | 3,
          rationale: `${item.name} 当前得分 ${item.score}/${item.maxScore}，完成率 ${item.percentage.toFixed(1)}%，建议优先拆解基本动作模式并做重复练习。`,
          advice,
        }
      })
  }

  private toDimensionScore(item: Tgmd3DomainResult): DimensionScore {
    return {
      code: item.code,
      name: item.name,
      rawScore: item.rawScore,
      standardScore: item.percentage,
      percentile: item.normLevel || undefined,
      itemCount: TGMD3_SKILLS.filter((skill) => skill.dimension === item.code).length,
      averageScore: item.percentage / 100,
      level: item.level,
      levelCode: item.levelCode,
      levelName: item.normLabel || item.level,
      severity: item.severity,
    }
  }
}
