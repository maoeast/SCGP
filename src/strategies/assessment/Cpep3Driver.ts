import type {
  ScaleQuestion,
  ScaleAnswer,
  ScoreResult,
  DimensionScore,
  AssessmentFeedback,
  AssessmentState,
  StudentContext,
  NavigationDecision,
  PersistContext,
  PersistResult,
} from '@/types/assessment'
import type { Cpep3DomainCode, Cpep3DomainResult, Cpep3DevelopmentalDomainCode, Cpep3QuestionData } from '@/types/cpep_3'
import {
  CPEP3_QUESTIONS,
  CPEP3_PG_MONTH_NORMS,
  CPEP3_GN_FZ_MONTH_NORMS,
  CPEP3_DOMAIN_DEFINITIONS,
} from '@/database/cpep3-questions'
import { Cpep3AssessmentAPI } from '@/database/cpep3-api'
import { BaseDriver } from './BaseDriver'
import {
  monthRangeMidpoint,
  lookupPgNorm,
  lookupGnNorm,
  deriveDq,
  resolveChronologicalAge,
  buildCeilingWarning,
} from '@/services/cpep3-scoring'
import {
  buildCpep3Report,
  CPEP3_REPORT_VERSION,
  CPEP3_SCORING_VERSION,
  type Cpep3ItemAnswer,
  type Cpep3NormLookup,
} from '@/services/cpep3-report-engine'

const SCALE_LABEL = 'PEP-3 心理教育量表（中文修订版）'

/** 常模覆盖的 CA 上限（月）：常模末带 84-89（7岁0月-7岁5月）。CA<=89 可常模转换；CA>=90 超龄。
 *  边界口径统一用本常量，避免 89/90 off-by-one 分散硬编码。 */
export const CPEP3_MAX_NORM_CA_MONTHS = 89

/** 超龄机器状态标记（domain_results 之外的 extraData 层） */
export const CPEP3_OUTSIDE_NORM_AGE_RANGE = 'OUTSIDE_NORM_AGE_RANGE'

/** 各能区题数（天花板判定用） */
const DOMAIN_MAX_PASS: Record<Cpep3DomainCode, number> = {
  A: 10, B: 11, C: 10, D: 11, E: 14, F: 20, G: 19,
  H: 6, I: 7, J: 6, K: 14, L: 11,
}

/**
 * CPEP-3 驱动器（PEP-3 心理教育量表·中文修订版）。
 *
 * 施测形态：全量表 139 题线性施测（无 basal/ceiling）。
 * 计分（docs/cpep3-report-design-v1.0.md）：
 *  - 发展能区（7 区 95 施测题）：P 计入通过数（常模输入）；E 不计通过数但单独计数（萌发技能）；
 *    分值映射 P=2/E=1/F=0（任务书 §2.2，事实层双存 level+score）；
 *  - 能区通过数 → pg 常模查发展当量月龄区间（中值为派生估计）；总通过数 → gn 常模查总发展当量；
 *  - 综合发展商数（总 DQ）已移除——任务书 §23 禁止，见 docs/legacy-dq-audit.md；能区派生 DQ 保留于 domain_results 并固定标注；
 *  - 适应不良行为能区（5 区 44 观察题）：A/M/S 计数 + 严重度分（A=0/M=1/S=2），仅描述性呈现（方向审计已核实）；
 *  - 报告快照：persist 时由 cpep3-report-engine 一次生成（G1-G8 校验通过才入快照列），历史报告不可变。
 * CA 计算：年月日借位、月按 30 天（不采用「≥15 天进 1 月」）。
 */
export class Cpep3Driver extends BaseDriver {
  readonly scaleCode = 'cpep_3'
  readonly scaleName = SCALE_LABEL
  readonly version = 'CPEP-3 中文修订版'
  readonly ageRange = { min: 24, max: 89 } // 常模末带 84-89 月（7岁0月-7岁5月），与 CPEP3_MAX_NORM_CA_MONTHS 一致
  readonly totalQuestions = CPEP3_QUESTIONS.length
  readonly dimensions = CPEP3_DOMAIN_DEFINITIONS.map((d) => d.name)

  private readonly questionMap = new Map<number, Cpep3QuestionData>(
    CPEP3_QUESTIONS.map((q) => [q.id, q]),
  )

  private readonly orderedQuestions: ScaleQuestion[] = CPEP3_QUESTIONS.map((q) => ({
    id: q.id,
    dimension: q.domainCode,
    dimensionName: q.domainName,
    content: q.taskName,
    options: q.scoreLevels.map((sl, index) => ({
      value: index,
      label: `${sl.level} - ${sl.desc}`,
      score: sl.score,
    })),
    metadata: {
      codeNo: q.codeNo,
      itemType: q.itemType,
      materialDesc: q.materialDesc,
      procedureDesc: q.procedureDesc,
      levels: q.scoreLevels.map((sl) => ({ level: sl.level, desc: sl.desc })),
    },
  }))

  getQuestions(_context: StudentContext): ScaleQuestion[] {
    return this.orderedQuestions
  }

  /** 全量表线性施测：从第 1 题开始 */
  getStartIndex(_context: StudentContext): number {
    return 0
  }

  calculateScore(
    answers: Record<string, ScaleAnswer>,
    context: StudentContext,
  ): ScoreResult {
    const ca = resolveChronologicalAge(context.birthday)

    // —— 分能区统计 ——
    const domainResults: Cpep3DomainResult[] = CPEP3_DOMAIN_DEFINITIONS.map((meta) => {
      const domainQuestions = CPEP3_QUESTIONS.filter((q) => q.domainCode === meta.code)

      if (meta.kind === 'developmental') {
        let passCount = 0
        let emergingCount = 0
        for (const q of domainQuestions) {
          const answer = answers[String(q.id)]
          if (!answer) continue
          const level = this.resolveAnswerLevel(answer, this.questionMap.get(q.id))
          if (level === 'P') passCount++
          else if (level === 'E') emergingCount++
        }

        const norm = lookupPgNorm(CPEP3_PG_MONTH_NORMS, meta.code as Cpep3DevelopmentalDomainCode, passCount)
        // 无常模档命中时 DA/DQ 为 null（不是 0，任务书 §六/test4 口径；pg 表 0..N 全覆盖，理论不命中仅防御）
        const da: number | null = norm ? monthRangeMidpoint(norm.monthRange) : null
        // 能区派生 DQ 保留（DQ换算口径.md 双层架构：DA/CA×100，非官方规范分数）——仅存 domain_results JSON
        // 供 AI 趋势维度分使用；报告页主位不展示该指标（任务书 §23 仅禁总 DQ，见 docs/legacy-dq-audit.md）
        const dq = da !== null ? deriveDq(da, ca.monthsDecimal) : null
        // 区间型 DA 完整保留（协康会中文版源表原样），中值仅为派生估计（INTERVAL_MIDPOINT）
        const [daLower, daUpper] = norm ? norm.monthRange.split('-').map(Number) : [null, null]

        return {
          domainCode: meta.code,
          domainName: meta.name,
          kind: 'developmental' as const,
          passCount,
          emergingCount,
          monthRange: norm?.monthRange ?? '',
          daLowerMonths: daLower,
          daUpperMonths: daUpper,
          developmentalAgeMonths: da,
          daMethod: da !== null ? ('INTERVAL_MIDPOINT' as const) : undefined,
          dq,
        }
      }

      // 适应不良行为能区：A/M/S 计数 + 严重度分
      const ratedCounts = { A: 0, M: 0, S: 0 }
      let severityScore = 0
      for (const q of domainQuestions) {
        const answer = answers[String(q.id)]
        if (!answer) continue
        const level = this.resolveAnswerLevel(answer, this.questionMap.get(q.id))
        if (level === 'A' || level === 'M' || level === 'S') {
          ratedCounts[level]++
          severityScore += this.questionMap.get(q.id)?.scoreLevels.find((sl) => sl.level === level)?.score ?? 0
        }
      }

      return {
        domainCode: meta.code,
        domainName: meta.name,
        kind: 'pathological' as const,
        ratedCounts,
        severityScore,
      }
    })

    // —— 总量：总发展当量查 gn 表（官方层展示口径）。总 DQ 已移除（任务书 §23，legacy-dq-audit.md）——
    const totalPassCount = domainResults.reduce((sum, r) => sum + (r.passCount ?? 0), 0)
    const totalEmergingCount = domainResults.reduce((sum, r) => sum + (r.emergingCount ?? 0), 0)
    const totalNorm = lookupGnNorm(CPEP3_GN_FZ_MONTH_NORMS, totalPassCount)
    // 无常模命中时总 DA 为 null（不是 0）；standardScore 字段不承载 DA（语义不符，置 undefined）
    const totalDa: number | null = totalNorm ? monthRangeMidpoint(totalNorm.monthRange) : null
    const [totalDaLower, totalDaUpper] = totalNorm ? totalNorm.monthRange.split('-').map(Number) : [null, null]
    const outsideNormAgeRange = ca.monthsDecimal > CPEP3_MAX_NORM_CA_MONTHS
    ? CPEP3_OUTSIDE_NORM_AGE_RANGE
    : null

    // DimensionScore（施测容器通用链，非报告合同）：rawScore=通过数（施测 UI「通过/总题」展示口径，与 cnbsr2016 同款）；
    // 报告合同 Cpep3SubtestResult.rawScore=Σscore_value，两者是有意区分的两个出口，见 docs/cpep3-report-design-v1.0.md §3.5。
    // 适应不良行为能区不计入 dimensions（extraData 全量承载）。
    const dimensions: DimensionScore[] = domainResults
      .filter((r) => r.kind === 'developmental')
      .map((r) => ({
        code: r.domainCode,
        name: r.domainName,
        rawScore: r.passCount ?? 0,
        itemCount: DOMAIN_MAX_PASS[r.domainCode],
        passedCount: r.passCount ?? 0,
        level: `发展当量 ${r.monthRange || '-'}月`,
        levelCode: undefined,
      }))

    const ceilingWarning = buildCeilingWarning(ca.monthsDecimal, domainResults, DOMAIN_MAX_PASS, CPEP3_MAX_NORM_CA_MONTHS)

    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      totalScore: totalPassCount,
      // standardScore 不承载总 DA（语义不符）：CPEP-3 无标准分常模，恒空
      standardScore: undefined,
      level: `总通过 ${totalPassCount}/95 · 总发展当量 ${totalNorm?.monthRange ?? '-'}月`,
      levelCode: undefined,
      dimensions,
      rawAnswers: answers,
      extraData: {
        domainResults,
        totalPassCount,
        totalEmergingCount,
        totalMonthRange: totalNorm?.monthRange ?? '',
        totalDaLowerMonths: totalDaLower,
        totalDaUpperMonths: totalDaUpper,
        totalDaMethod: totalDa !== null ? ('INTERVAL_MIDPOINT' as const) : undefined,
        totalDevelopmentalAgeMonths: totalDa,
        ca,
        ceilingWarning,
        outsideNormAgeRange, // 机器状态 OUTSIDE_NORM_AGE_RANGE（CA>=90）：保留 Raw/DA/剖面，DQ 仅作功能水平参考
      },
    }
  }

  generateFeedback(scoreResult: ScoreResult): AssessmentFeedback {
    const extra = scoreResult.extraData as { domainResults?: Cpep3DomainResult[]; totalPassCount?: number; totalEmergingCount?: number; totalMonthRange?: string; ceilingWarning?: string | null }
    const devResults = (extra?.domainResults ?? []).filter((r) => r.kind === 'developmental')
    const strongest = [...devResults].sort((a, b) => (b.passCount ?? 0) - (a.passCount ?? 0))[0]
    const weakest = [...devResults].sort((a, b) => (a.passCount ?? 0) - (b.passCount ?? 0))[0]

    const summary = [
      `本次评估共通过 ${extra?.totalPassCount ?? 0} 项（另有 ${extra?.totalEmergingCount ?? 0} 项萌发技能）。`,
      `总发展当量约 ${extra?.totalMonthRange || '-'} 个月。`,
      extra?.ceilingWarning ?? '',
    ]
      .filter(Boolean)
      .join(' ')

    const suggestion = strongest && weakest && strongest.domainCode !== weakest.domainCode
      ? `相对优势能区：${strongest.domainName}；相对需关注能区：${weakest.domainName}。建议结合各能区发展当量与萌发技能分布安排训练活动。`
      : '建议结合各能区发展当量与萌发技能分布安排训练活动。'

    return {
      summary,
      suggestion,
      dimensions: [],
      riskLevel: 'info',
    }
  }

  // ========== 持久化 ==========

  async persistAssessment(context: PersistContext): Promise<PersistResult> {
    const { student, state, scoreResult, startTime, endTime } = context
    const extra = scoreResult.extraData as {
      domainResults: Cpep3DomainResult[]
      totalPassCount: number
      totalEmergingCount: number
      totalMonthRange: string
      totalDevelopmentalAgeMonths: number | null
      ca: { year: number; month: number; day: number; monthsDecimal: number }
      outsideNormAgeRange?: string | null
    }
    // total_mental_age 列 NOT NULL：无常模命中（理论不发生）时兜底 0，区间原文为空串已是展示信号
    const totalDaForDb = extra.totalDevelopmentalAgeMonths ?? 0

    const api = new Cpep3AssessmentAPI()

    // —— 事实层：每题 level + score 双存（任务书 §2.2）——
    const orderedDetails = Object.entries(state.answers)
      .map(([questionId, answer]) => {
        const questionData = this.questionMap.get(Number(questionId))
        return {
          question_id: Number(questionId),
          code_no: questionData?.codeNo ?? '',
          dimension: questionData?.domainCode ?? '',
          item_type: questionData?.itemType ?? ('administered' as const),
          level: this.resolveAnswerLevel(answer, questionData) as 'P' | 'E' | 'F' | 'A' | 'M' | 'S',
          score: answer.score as 0 | 1 | 2,
          answer_time: answer.responseTime || 0,
        }
      })
      .sort((left, right) => left.question_id - right.question_id)

    // —— 规则层：报告快照一次生成（G1-G8 校验通过才入快照列，失败则持久化整体失败）——
    const itemAnswers: Cpep3ItemAnswer[] = orderedDetails.map((d) => {
      const questionData = this.questionMap.get(d.question_id)
      return {
        questionId: d.question_id,
        codeNo: d.code_no,
        taskName: questionData?.taskName ?? '',
        domainCode: d.dimension as Cpep3DomainCode,
        domainName: questionData?.domainName ?? '',
        itemType: d.item_type,
        scoreLevel: d.level,
        scoreValue: d.score,
      }
    })
    const domainNames = Object.fromEntries(
      CPEP3_DOMAIN_DEFINITIONS.map((d) => [d.code, d.name]),
    ) as Record<Cpep3DomainCode, string>
    const domainItemTotals = Object.fromEntries(
      CPEP3_DOMAIN_DEFINITIONS.map((d) => [d.code, DOMAIN_MAX_PASS[d.code]]),
    ) as Record<Cpep3DomainCode, number>
    const normLookup: Cpep3NormLookup = {
      lookupPg: (domain, passCount) => lookupPgNorm(CPEP3_PG_MONTH_NORMS, domain, passCount),
      lookupGn: (totalPassCount) => lookupGnNorm(CPEP3_GN_FZ_MONTH_NORMS, totalPassCount),
    }
    const reportSnapshot = buildCpep3Report(
      {
        itemAnswers,
        domainItemTotals,
        domainNames,
        normLookup,
        totalMonthRange: extra.totalMonthRange,
        totalDaMidpointMonths: extra.totalDevelopmentalAgeMonths ?? 0,
        generatedAt: endTime ?? new Date().toISOString(),
      },
      new Set(CPEP3_QUESTIONS.map((q) => q.id)),
    )

    const assessId = api.saveAssessment({
      assessment: {
        student_id: student.id,
        ca: extra.ca,
        age_months: Math.floor(extra.ca.monthsDecimal),
        total_pass_count: extra.totalPassCount,
        total_emerging_count: extra.totalEmergingCount,
        total_mental_age: totalDaForDb,
        total_month_range: extra.totalMonthRange,
        domain_results: [
          ...extra.domainResults,
          // 追加持久化机器状态行（与能区结果同 JSON，免 DDL；消费方按 dataType 字段区分）
          { dataType: 'assessment_status', outsideNormAgeRange: extra.outsideNormAgeRange ?? null },
        ],
        report_snapshot: JSON.stringify(reportSnapshot),
        report_version: reportSnapshot.reportVersion,
        scoring_version: reportSnapshot.scoringVersion,
        start_time: startTime,
        end_time: endTime,
      },
      details: orderedDetails,
    })

    const reportId = this.createReportRecord({
      studentId: student.id,
      reportType: 'cpep_3',
      assessId,
      moduleCode: 'social',
      title: `${student.name} - PEP-3心理教育量表评估报告`,
    })

    console.log('[Cpep3Driver] CPEP-3 评估持久化成功, assessId:', assessId, '快照版本:', reportSnapshot.reportVersion)
    this.saveQualityMetrics('cpep3_assess', assessId, context)
    return { assessId, reportId }
  }

  protected getDefaultDescription(): string {
    return 'PEP-3 中文修订版：发展能区 + 适应不良行为能区的教育评估'
  }

  protected getEstimatedTime(): number {
    return 60
  }

  /**
   * 获取欢迎对话框内容（评估说明页，与 ABC/ATEC 同规格：
   * intro 定位 + 给专业人员的施测要点 + 给家长的填表与配合建议 + 特别提醒）
   */
  getWelcomeContent() {
    return {
      title: 'PEP-3 心理教育量表（中文修订版）',
      intro: '孤独症谱系及相关发育障碍儿童的教育评估工具。与ABC（初筛）、ATEC（康复追踪）互补，PEP-3 的特色是"发展能力与行为观察并评"：既测孩子会做什么（模仿、认知、语言等 7 个发展能区），也观察伴随的行为表现（情感、人际、感觉等 5 个适应不良行为能区），输出 7 个发展能区的发展当量月龄与技能剖面、5 个适应不良行为能区的行为观察记录，直接服务于制定个别化教育计划（IEP）。',
      sections: [
        {
          icon: '👨‍🏫',
          title: '给专业人员的施测要点',
          items: [
            'PEP-3 是教育评估工具，不是诊断工具：它回答"孩子现在的发展水平相当于多大月龄、哪些技能已掌握、哪些正在萌发"，为制定训练计划提供依据，不用于孤独症诊断。',
            '无停测规则，需完成全部项目：量表不设基础线/上限停测，139 个项目按顺序全部施测或观察。明显已掌握的项目可凭充分证据直接评"通过"，不必反复试测。',
            '发展能区三级评分：P=通过、E=萌发（孩子表现出意图或部分完成，但不稳定、不完整）、F=未通过。E 档非常有价值——萌发中的技能正是近期教学介入的最佳切入点。',
            '适应不良行为能区是观察题：情感、人际、物品喜好、感觉、语言 5 个能区在施测全程中自然观察记录（A 适当/M 轻微/S 严重），不需要专门"考"孩子，观察期覆盖整个评估过程。',
            '发展当量的解读：系统按各能区通过数查协康会中文版常模表得出发展当量月龄区间，并可派生发展商数（DQ）。请注意派生 DQ 不是官方规范分数，且孩子实际年龄超出常模范围（约 2-7.5 岁）时存在天花板效应，宜优先解读发展当量与技能剖面。',
            '与 ABC/ATEC 配合使用：初筛怀疑孤独症用 ABC，确诊后追踪康复进度用 ATEC，需要细致的能力剖面来制定 IEP 时用 PEP-3。三者不互斥，按需求阶段选用。',
          ],
        },
        {
          icon: '❤️',
          title: '给家长的填表与配合建议',
          items: [
            '这是一份"看见能力"的评估：与看"问题行为"的量表不同，PEP-3 一半以上的内容是在看孩子会做什么——模仿、拼图、认颜色、数数、说话。评估报告会告诉您孩子已经掌握了哪些技能、哪些正在萌芽。',
            '"萌发"不是失败：有些项目孩子似会非会、有时能做到有时做不到，这类会评为 E（萌发）。萌发是值得关注的好消息——它提示这项能力正在发展中，可作为近期训练的重点方向。',
            '评估需要孩子与施测老师互动完成：部分项目老师会和孩子玩游戏（手偶、串珠、拼图），部分项目靠观察孩子自然表现。请让孩子以平时状态参与，不必提前排练，也不要过度督促。',
            '配合老师提供孩子的日常表现：评估中一部分项目由老师现场和孩子互动完成，另一部分（情感、人际、感觉、语言等行为观察）以施测现场的观察为主要依据，也会参考孩子在家和在校的日常表现。老师询问时请如实描述，不要因为"希望孩子表现好"而往好的方向说——准确的记录才能换来真正适合孩子的训练方案。',
            '分数请"自己和自己比"：发展当量和 DQ 反映的是孩子当前的发展水平，不同孩子之间没有可比性。有意义的是几个月后复测时，各能区的变化和进步。',
          ],
        },
      ],
      reminder: {
        icon: '⚠️',
        title: '重要提醒',
        content:
          'PEP-3 是教育评估工具，评估结果用于制定个别化训练计划，不构成医学诊断。如需诊断孤独症谱系障碍，请前往专业医疗机构；初筛可使用本系统 ABC 量表。评估结果请结合孩子日常表现综合解读，如有疑问请咨询专业康复人员。',
      },
    }
  }

  // ========== 私有：CA / 常模 / 答案解析 ==========

  
  
  
  
  /** 从作答还原档位：value → 该题 scoreLevels 的 level（options.value 即 scoreLevels 下标） */
  private resolveAnswerLevel(
    answer: ScaleAnswer,
    questionData?: Cpep3QuestionData,
  ): 'P' | 'E' | 'F' | 'A' | 'M' | 'S' {
    const byValue = questionData?.scoreLevels?.[Number(answer?.value)]
    if (byValue) return byValue.level
    // fallback：按 score 反查（多档同分时取先命中者）
    const byScore = questionData?.scoreLevels?.find((sl) => sl.score === answer?.score)
    return (byScore?.level ?? 'F') as 'P' | 'E' | 'F' | 'A' | 'M' | 'S'
  }

  }
