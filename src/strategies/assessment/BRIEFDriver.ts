/**
 * BRIEF 执行功能量表驱动器（DRAFT）
 *
 * 改良自 BRIEF-P（学前 2-5 岁）/ BRIEF-2（学龄 5-18 岁）的维度构造，
 * 采用「自编题目 + 本地常模」策略（规避版权），题目与常模均为草稿，
 * 仅供平台「筛查 / 发育监测 / 转介建议」，不能作为临床诊断。
 *
 * 特点：
 * - 双版本按年龄动态切换：< 72 月（6 岁）用 BRIEF-P（15 题），否则用 BRIEF-2（27 题）
 * - 每题 1-3 三点计分（从不 / 有时 / 经常），得分越高 = 执行功能困难越多
 * - 各临床量表 → T 分（DRAFT 线性转换）→ 聚合为复合指数（GEC 等）
 * - 持久化走 brief_assess 专属表 + report_record 索引（仿 SRS2 范式）
 *
 * @module strategies/assessment/BRIEFDriver
 */

import type {
  StudentContext,
  ScaleQuestion,
  ScaleAnswer,
  ScoreResult,
  AssessmentFeedback,
  AssessmentState,
  DimensionScore,
  PersistContext,
  PersistResult,
} from '@/types/assessment'
import { BaseDriver } from './BaseDriver'
import { BRIEFAssessmentAPI } from '@/database/api'
import {
  briefQuestions,
  briefDimensions,
  briefComposites,
  briefScoring,
  briefLevels,
  briefRecommendations,
  type BriefVersion,
  type BriefLevel,
} from '@/database/brief-data'
import { briefRawMeanToT } from '@/database/brief-norms'

/** BRIEF 版本切换年龄阈值：72 月（6 岁）—— < 6 岁 用学前版 */
const BRIEF_PRESCHOOL_AGE_MONTHS = 72

/**
 * BRIEF 量表驱动器实现
 */
export class BRIEFDriver extends BaseDriver {
  // ========== 元信息 ==========

  readonly scaleCode = 'brief'
  readonly scaleName = '执行功能评估量表（BRIEF 自编 DRAFT）'
  readonly version = '0.1.0-draft'
  readonly ageRange = { min: 24, max: 216 } // 2 岁 - 18 岁
  // 静态字段取学龄版最大题数（学前 15 / 学龄 27）；实际按年龄动态，
  // 完成判定与进度按 state.metadata.totalQuestions（容器写入实际题数）。
  readonly totalQuestions = 27

  // 全部临床量表 code（学前 + 学龄），供 getScaleInfo 与映射断言；
  // scale-dimension-mapping.brief 已覆盖全部 code → cognitive。
  readonly dimensions = [
    'inhibit_p', 'shift_p', 'emotional_control_p', 'working_memory_p', 'plan_organize_p',
    'inhibit', 'self_monitor', 'shift', 'emotional_control', 'initiate',
    'working_memory', 'plan_organize', 'task_monitor', 'organization_of_materials',
  ]

  // ========== 题目管理 ==========

  /** 按年龄选择版本 */
  private selectVersion(ageInMonths: number): BriefVersion {
    return ageInMonths < BRIEF_PRESCHOOL_AGE_MONTHS ? 'preschool' : 'school'
  }

  /** 获取题目列表（按年龄过滤版本） */
  getQuestions(context: StudentContext): ScaleQuestion[] {
    const version = this.selectVersion(context.ageInMonths)
    return briefQuestions
      .filter((q) => q.version === version)
      .sort((a, b) => a.id - b.id)
      .map((q) => this.convertToScaleQuestion(q))
  }

  /** 起始题索引（线性评估，从第 1 题开始） */
  getStartIndex(_context: StudentContext): number {
    return 0
  }

  /** 当前学生适用题数（容器据此设置 state.metadata.totalQuestions） */
  getApplicableQuestionCount(context: StudentContext): number {
    const version = this.selectVersion(context.ageInMonths)
    return briefQuestions.filter((q) => q.version === version).length
  }

  /**
   * 进度：按 metadata.totalQuestions（实际题数）计算，修正学前版进度封顶问题
   * （BaseDriver 默认用静态 totalQuestions=27，学前 15 题会卡在 55%）。
   */
  calculateProgress(state: AssessmentState): number {
    const answeredCount = Object.keys(state.answers).length
    const total = (state.metadata?.totalQuestions as number | undefined) ?? this.totalQuestions
    if (!total || total <= 0) return 0
    return Math.min(100, Math.round((answeredCount / total) * 100))
  }

  // ========== 评分计算 ==========

  calculateScore(answers: Record<string, ScaleAnswer>, context: StudentContext): ScoreResult {
    const version = this.selectVersion(context.ageInMonths)
    const versionScales = briefDimensions.filter((d) => d.version === version)

    const dimensions: DimensionScore[] = []
    const scaleTMap: Record<string, number> = {}
    let totalRaw = 0

    // 逐临床量表：原始分 → 均分 → T 分 → 等级
    for (const scale of versionScales) {
      const items = briefQuestions.filter((q) => q.dimension === scale.code)
      const answeredItems = items.filter((q) => answers[q.id])
      const rawScore = answeredItems.reduce(
        (sum, q) => sum + this.getAnswerScore(answers, q.id, 0),
        0
      )
      const rawMean = answeredItems.length > 0 ? rawScore / answeredItems.length : 0
      const t = briefRawMeanToT(rawMean)
      scaleTMap[scale.code] = t
      totalRaw += rawScore

      const lv = this.getLevelByT(t)
      dimensions.push({
        code: scale.code,
        name: scale.name,
        rawScore,
        itemCount: answeredItems.length,
        passedCount: rawScore,
        averageScore: rawMean,
        standardScore: t,
        level: lv.levelCode,
        levelName: lv.level,
      })
    }

    // 复合指数：成员量表 T 分均值
    const versionComposites = briefComposites.filter((c) => c.version === version)
    const gecCode = version === 'preschool' ? 'gec_p' : 'gec'
    const composites: Record<string, { name: string; tScore: number; level: string }> = {}

    const meanTOf = (memberCodes: string[]): number => {
      const ts = memberCodes
        .map((c) => scaleTMap[c])
        .filter((t): t is number => typeof t === 'number' && Number.isFinite(t))
      return ts.length > 0 ? Math.round(ts.reduce((s, t) => s + t, 0) / ts.length) : 50
    }

    const gecT = meanTOf(versionComposites.find((c) => c.code === gecCode)?.memberScaleCodes ?? [])
    for (const c of versionComposites) {
      const ct = c.code === gecCode ? gecT : meanTOf(c.memberScaleCodes)
      composites[c.code] = { name: c.name, tScore: ct, level: this.getLevelByT(ct).level }
    }

    const overall = this.getLevelByT(gecT)
    const timing = this.calculateTiming(answers)

    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      totalScore: totalRaw,
      standardScore: gecT,
      tScore: gecT,
      level: overall.level,
      levelCode: overall.levelCode,
      dimensions,
      rawAnswers: this.serializeAnswers(answers),
      timing,
      extraData: { version, composites, draftNorm: true },
    }
  }

  // ========== 反馈生成 ==========

  generateFeedback(scoreResult: ScoreResult): AssessmentFeedback {
    const level = scoreResult.level || '良好'
    const rec = briefRecommendations.find((r) => r.level === level) ?? briefRecommendations[0]

    const { strengths, weaknesses } = this.analyzeExecutiveDimensions(scoreResult.dimensions)

    return {
      summary: this.buildSummary(scoreResult, rec?.general_comment ?? ''),
      strengths,
      weaknesses,
      recommendations: rec?.suggestions ?? [],
      trainingFocus: this.buildTrainingFocus(scoreResult.dimensions),
      homeGuidance: this.buildHomeGuidance(level),
    }
  }

  getWelcomeContent() {
    return {
      title: '执行功能评估量表（BRIEF，自编 DRAFT）',
      intro: '可用于初次筛查儿童执行功能问题，也可定期追踪训练效果，建议训练期每6个月评估一次。BRIEF评估孩子大脑的"总指挥部"——从控制冲动、转换任务、情感控制、工作记忆，到计划组织、自我监控，通过计算全局执行复合（GEC）T分数和各维度T分数，测量孩子在真实生活中的执行功能表现。',
      sections: [
        {
          icon: '👨‍🏫',
          title: '给专业人员的实操心法',
          items: [
            'BRIEF可用于初筛和追踪，建议训练期每6个月评估一次：初次怀疑孩子有执行功能问题时，BRIEF可快速筛查抑制、转换、情感控制、工作记忆、计划组织等维度。确认问题并开始执行功能训练后，每6个月复测一次，观察GEC T分数和各维度变化趋势，评估训练效果。',
            '区分"不想做"与"想不起来"：孩子总是忘带作业本，可能是对抗你，也可能是工作记忆真的装不下"明天要交数学作业"这个信息。前者需要动机干预，后者需要外部辅助（提醒卡、清单）。',
            '警惕"高智商遮掩效应"：很多聪明孩子靠智商暴力硬撑，BRIEF T分勉强在临界线下，但实际已经耗尽心理资源。如果家长报告"越来越累""越到高年级越吃力"，要重点关注。',
            '看剖面比看总分更有价值：一个孩子可能"抑制"和"情感控制"爆表（T≥70），但"工作记忆"和"计划"还好。干预重点应该放在高峰维度，而不是笼统地说"执行功能差"。',
            '用T分数变化追踪训练效果：如果一个孩子基线GEC T分数72（显著风险），经过6个月执行功能训练后降到66，再6个月降到61，这说明训练有效。T分数每降低5-7分都是显著进步。',
            '配合ADHD评估使用：执行功能问题常见于ADHD儿童。如BRIEF显示多个维度T≥65，建议结合Conners量表评估ADHD症状，或转介专业机构进行全面评估。',
          ],
        },
        {
          icon: '❤️',
          title: '给家长的填表大实话',
          items: [
            'BRIEF既能筛查问题，也能追踪进步，建议训练期每半年做一次：第一次填BRIEF是为了看孩子的"大脑总指挥部"（执行功能）有没有问题。如果发现问题并开始执行功能训练，建议每半年复测一次，看总分和各维度分数是降了还是升了。',
            '填的是"做不到"，不是"不听话"：这上面的题问的是孩子能不能控制自己、能不能想起来、能不能做计划，不是问他听不听您的话。请把"故意气我"和"真的做不到"分开。',
            '不要拿别人家的孩子做标杆：同班同学都能管住自己不插嘴，不代表您的孩子也应该能。执行功能发育速度个体差异很大，有些孩子的大脑"总指挥部"就是晚熟两三年。',
            '回忆最近6个月的日常，不是最糟的那天：请不要因为昨天孩子大崩溃就把所有题都选"经常"，也不要因为今天表现好就都选"从不"。想想过去半年他通常是什么样。',
            '看长期趋势而非单次T分数：一次评估GEC T分数68（中度风险）不用太焦虑，重要的是半年后复测是降到62还是保持68甚至升到74。持续追踪才能看到执行功能训练的真实效果。',
          ],
        },
      ],
      reminder: {
        icon: '⚠️',
        title: '特别提醒',
        content:
          'BRIEF可用于初次筛查儿童执行功能问题，也可定期追踪训练效果（建议训练期每6个月评估一次）。本量表为自编简化版，仅供学校设计执行功能支持策略参考，不能作为ADHD或其他神经发育障碍的诊断依据。如GEC T分数≥65（显著风险）且持续存在，或执行功能困难显著影响学习和生活，建议前往正规医院儿童精神心理科或发育行为科进行专业评估。',
      },
    }
  }

  // ========== 私有方法 ==========

  private convertToScaleQuestion(q: (typeof briefQuestions)[number]): ScaleQuestion {
    return {
      id: q.id,
      dimension: q.dimension,
      dimensionName: q.dimensionName,
      content: q.content,
      options: this.createOptions(),
      metadata: { version: q.version },
    }
  }

  private createOptions(): Array<{ value: number; label: string; description: string; score: number }> {
    return briefScoring.map((o) => ({
      value: o.score,
      label: o.label,
      description: o.description,
      score: o.score,
    }))
  }

  /** 由 T 分取等级（briefLevels 按 minT 升序，取最大的 minT ≤ t） */
  private getLevelByT(t: number): BriefLevel {
    const fallback: BriefLevel = briefLevels[0] ?? {
      minT: 0,
      level: '良好',
      levelCode: 'typical',
      description: '典型范围',
    }
    let matched = fallback
    for (const lv of briefLevels) {
      if (t >= lv.minT) matched = lv
    }
    return matched
  }

  /**
   * 执行功能维度优劣分析（注意：BRIEF 中 T 分越高 = 困难越多 = 弱势）。
   * 弱势：T ≥ 60；优势：T < 50。
   */
  private analyzeExecutiveDimensions(dimensions: DimensionScore[]): {
    strengths: string[]
    weaknesses: string[]
  } {
    const strengths: string[] = []
    const weaknesses: string[] = []
    for (const d of dimensions) {
      const t = d.standardScore ?? 50
      if (t >= 65) {
        weaknesses.push(`${d.name}（T ${t}，显著风险）`)
      } else if (t >= 60) {
        weaknesses.push(`${d.name}（T ${t}，中度风险）`)
      } else if (t < 50) {
        strengths.push(`${d.name}（T ${t}，发展良好）`)
      }
    }
    return { strengths, weaknesses }
  }

  private buildSummary(scoreResult: ScoreResult, generalComment: string): string {
    const gecT = scoreResult.tScore ?? scoreResult.standardScore ?? 50
    const versionLabel =
      (scoreResult.extraData as { version?: string } | undefined)?.version === 'preschool'
        ? '学前版 BRIEF-P'
        : '学龄版 BRIEF-2'
    return (
      `该儿童执行功能评估（${versionLabel}，自编 DRAFT）全局执行复合 GEC 的 T 分为 ${gecT}（均值 50，标准差 10），` +
      `总体等级"${scoreResult.level}"。原始总分 ${scoreResult.totalScore ?? 0}。` +
      generalComment
    )
  }

  private buildTrainingFocus(dimensions: DimensionScore[]): string[] {
    const focus = dimensions
      .filter((d) => (d.standardScore ?? 50) >= 60)
      .sort((a, b) => (b.standardScore ?? 50) - (a.standardScore ?? 50))
      .map((d) => `${d.name}训练（T ${d.standardScore}）`)
    if (focus.length === 0) focus.push('维持并巩固现有执行功能水平')
    return focus.slice(0, 4)
  }

  private buildHomeGuidance(level: string): string[] {
    const guidance = [
      '在日常生活中提供结构化提示：清单、计时器、分步骤指引',
      '将多步任务拆解为小步骤，完成后逐步撤除辅助',
      '提前预告变化与转换，降低转换与情绪困难',
      '关注并正向强化孩子的自我管理行为',
    ]
    if (['中度风险', '显著风险'].includes(level)) {
      guidance.push('建议结合专业评估，制定个体化执行功能支持计划')
    }
    return guidance
  }

  protected getDefaultDescription(): string {
    return '评估儿童执行功能（抑制、转换、情感控制、工作记忆、计划组织等）的日常表现'
  }

  protected getEstimatedTime(): number {
    return 15
  }

  protected getIcon(): string {
    return '🧠'
  }

  // ========== 持久化 ==========

  async persistAssessment(context: PersistContext): Promise<PersistResult> {
    const { student, scoreResult, startTime, endTime } = context
    const api = new BRIEFAssessmentAPI()
    const version =
      (scoreResult.extraData as { version?: string } | undefined)?.version ?? 'school'

    const dimensionScores: Record<string, unknown> = {}
    for (const d of scoreResult.dimensions) {
      dimensionScores[d.code] = {
        name: d.name,
        rawScore: d.rawScore,
        rawMean: d.averageScore,
        tScore: d.standardScore,
        level: d.level,
        levelName: d.levelName,
      }
    }

    const assessId = api.createAssessment({
      student_id: student.id,
      age_months: student.ageInMonths,
      gender: student.gender,
      version,
      raw_answers: JSON.stringify(scoreResult.rawAnswers || {}),
      dimension_scores: JSON.stringify(dimensionScores),
      total_raw_score: scoreResult.totalScore || 0,
      total_t_score: scoreResult.tScore ?? scoreResult.standardScore ?? 50,
      level: scoreResult.level,
      level_code: scoreResult.levelCode ?? null,
      extra_data: scoreResult.extraData ? JSON.stringify(scoreResult.extraData) : null,
      start_time: startTime,
      end_time: endTime,
    })

    const reportId = this.createReportRecord({
      studentId: student.id,
      reportType: 'brief',
      assessId,
      title: `${student.name} - BRIEF执行功能问卷评估报告`,
      moduleCode: 'cognitive',
    })

    console.log('[BRIEFDriver] BRIEF 评估持久化成功, assessId:', assessId)
    return { assessId, reportId }
  }
}
