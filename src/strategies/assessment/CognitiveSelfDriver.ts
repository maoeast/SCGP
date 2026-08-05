/**
 * 视知觉图形匹配筛查任务（DRAFT）绩效题驱动器（v4）
 *
 * 与 v0.1-draft 的区别（按 docs/planning/2026-08-05-cognitive-self-difficulty-curve-design.md v4）：
 * - 输出**描述性结果**：总正确数（0–16 等权）+ 各层正确数 + 正确题中位 RT + 错误类型分布；
 *   **不输出 IQ / 百分位 / 标准分**（占位常模已废弃，cognitive-self-norms.ts 不再被调用）；
 * - 层级判读：稳定 / 疑似边界 / 结果不一致 / 不可判读 + L4 单独描述 + 地板/天花板提示；
 * - 练习题（2 道不计分）置于题目流前部，用于确认规则理解；练习表现进入报告有效性卡片，
 *   两题均未通过时判读为「不可判读」（规则理解不足）。
 */
import { BaseDriver } from '@/strategies/assessment/BaseDriver'
import type {
  AssessmentFeedback,
  DimensionScore,
  PersistContext,
  PersistResult,
  ScaleAnswer,
  ScaleQuestion,
  ScoreResult,
  StudentContext,
} from '@/types/assessment'
import {
  cognitiveSelfDimensions,
  cognitiveSelfQuestions,
  COGNITIVE_SELF_LAYER_PLAIN,
  type CognitiveSelfDimension,
  type CognitiveSelfQuestion,
} from '@/database/cognitive-self-data'
import { renderOptionSvg, svgToDataUri } from '@/utils/crt-matrix'
import { shuffleOptions as cognitiveShuffleOptions } from '@/utils/cognitive-shuffle'
import { CognitiveSelfAssessmentAPI } from '@/database/api'
import type { CrtCellSpec } from '@/database/crt-data'

/** 匹配题指导语 */
const MATCH_PROMPT = '找出与目标图案完全相同的一项，看准后尽快作答。'

/** 判读结果（v4） */
export type CognitiveSelfVerdict =
  | 'stable'          // 该层表现稳定
  | 'boundary'        // 疑似边界（L1–L3 适用）
  | 'inconsistent'    // 结果不一致（需复核）
  | 'unreadable'      // 不可判读（规则未理解 / 中断等）
  | 'floor_risk'      // 地板风险
  | 'ceiling_risk'    // 天花板风险（L4 = 4/4）

interface LevelStat {
  code: string
  name: string
  ability: string
  correct: number
  total: number
  correctRtMs: number[] // 正确题 RT
  errorRtMs: number[]
}

/** 错误类型：比较所选选项与 target 的差异属性 */
export type CognitiveSelfErrorType =
  | 'shape'
  | 'color'
  | 'rotation'
  | 'scale'
  | 'mirror'
  | 'gap'
  | 'internal_mark'
  | 'layout'
  | 'unclassified'

export class CognitiveSelfDriver extends BaseDriver {
  // ========== 元信息 ==========

  readonly scaleCode = 'cognitive_self'
  readonly scaleName = '视知觉图形匹配筛查任务（DRAFT）'
  readonly version = '0.4.0-draft'
  readonly ageRange = { min: 66, max: 198 } // 5.5 岁 - 16.5 岁
  /** 正式题数（不含练习题） */
  readonly totalQuestions = cognitiveSelfQuestions.filter((q) => !q.isPractice).length

  /** 覆写基类：本量表为绩效题，容器据此切换到 PerformanceTrialBoard 采集真 RT */
  readonly isPerformanceTask = true

  // 四个难度层级（runtime code，scale-dimension-mapping 全部 → cognitive）
  readonly dimensions = cognitiveSelfDimensions.map((d) => d.code)

  // ========== 题目管理 ==========

  getQuestions(_context: StudentContext): ScaleQuestion[] {
    return cognitiveSelfQuestions
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((q) => this.convertToScaleQuestion(q))
  }

  getStartIndex(_context: StudentContext): number {
    return 0
  }

  // ========== 评分计算（v4：描述性结果） ==========

  calculateScore(answers: Record<string, ScaleAnswer>, context: StudentContext): ScoreResult {
    const formalQuestions = cognitiveSelfQuestions.filter((q) => !q.isPractice)
    const practiceQuestions = cognitiveSelfQuestions.filter((q) => q.isPractice)
    const total = formalQuestions.length

    let rawScore = 0
    let omittedCount = 0

    // 按难度层级聚合
    const levelStats = new Map<CognitiveSelfDimension, LevelStat>()
    for (const def of cognitiveSelfDimensions) {
      levelStats.set(def.dimension, {
        code: def.code,
        name: def.name,
        ability: def.ability,
        correct: 0,
        total: 0,
        correctRtMs: [],
        errorRtMs: [],
      })
    }

    // 错误类型分布（选项级：一题只计一次实际错误）
    const errorCounts = new Map<CognitiveSelfErrorType, number>()
    // RT < 300 ms 的作答（预期性/误触候选，仅标记不计入正常 RT，v4 §5.3）
    let anticipatoryCount = 0

    for (const q of formalQuestions) {
      const stat = levelStats.get(q.dimension)!
      stat.total++
      const answer = answers[q.id]

      if (!answer || answer.value === undefined || answer.value === null) {
        // 未作答 → omitted（不等于错误选择）
        omittedCount++
        continue
      }

      const selectedIdx = Number(answer.value)
      const rt = typeof answer.responseTime === 'number' ? answer.responseTime : null
      if (rt !== null && rt < 300) {
        anticipatoryCount++
      }
      if (selectedIdx === q.correctIndex) {
        rawScore++
        stat.correct++
        if (rt !== null && rt >= 300) stat.correctRtMs.push(rt)
      } else {
        if (rt !== null && rt >= 300) stat.errorRtMs.push(rt)
        const errorType = this.classifyError(q, selectedIdx)
        errorCounts.set(errorType, (errorCounts.get(errorType) ?? 0) + 1)
      }
    }

    // 练习题表现（不计分，仅判读与有效性记录）
    const practiceAnswers = practiceQuestions.map((q) => {
      const answer = answers[q.id]
      const answered = answer !== undefined && answer.value !== undefined && answer.value !== null
      const correct = answered && Number(answer.value) === q.correctIndex
      return { id: q.id, answered, correct }
    })
    const practicePassed = practiceAnswers.length > 0 && practiceAnswers.every((p) => p.answered && p.correct)
    const practiceAllFailed = practiceAnswers.length > 0 && practiceAnswers.every((p) => p.answered && !p.correct)

    // 各层正确率（用于判读）
    const dimensions: DimensionScore[] = cognitiveSelfDimensions.map((def) => {
      const stat = levelStats.get(def.dimension)!
      const rate = stat.total > 0 ? stat.correct / stat.total : 0
      return {
        code: stat.code,
        name: `${stat.name}·${stat.ability}`,
        rawScore: stat.correct,
        itemCount: stat.total,
        passedCount: stat.correct,
        averageScore: rate,
      }
    })

    // 层正确题中位 RT（每层 ≥2 道有效正确题才报告）
    const layerRtMs: Record<string, number | null> = {}
    for (const def of cognitiveSelfDimensions) {
      const stat = levelStats.get(def.dimension)!
      layerRtMs[stat.code] = stat.correctRtMs.length >= 2 ? median(stat.correctRtMs) : null
    }
    const allCorrectRt = formalQuestions.flatMap((q) => {
      const stat = levelStats.get(q.dimension)!
      return stat.correctRtMs
    })
    const overallMedianRt = allCorrectRt.length >= 2 ? median(allCorrectRt) : null

    // 判读（§6.2 / §6.3 / §6.4）
    const verdict = this.deriveVerdict(levelStats, practiceAllFailed)
    const verdictLabel = VERDICT_LABELS[verdict]

    const accuracyRate = total > 0 ? rawScore / total : 0
    const reactionAvailable = allCorrectRt.length >= 2

    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      totalScore: rawScore,
      // v4：不输出 IQ / 百分位 / 标准分
      standardScore: undefined,
      percentile: undefined,
      level: verdictLabel,
      levelCode: verdict,
      dimensions,
      rawAnswers: this.serializeAnswers(answers),
      timing: this.calculateTiming(answers),
      extraData: {
        draftVersion: this.version,
        descriptiveOnly: true,
        totalQuestions: total,
        omittedCount,
        anticipatoryCount,
        accuracyRate,
        overallMedianRt,
        reactionAvailable,
        layerCorrect: Object.fromEntries(
          [...levelStats.entries()].map(([dim, s]) => [s.code, { correct: s.correct, total: s.total }]),
        ),
        layerMedianRtMs: layerRtMs,
        errorTypeCounts: Object.fromEntries(errorCounts),
        errorOpportunities: this.computeErrorOpportunities(),
        practice: {
          passed: practicePassed,
          allFailed: practiceAllFailed,
          answers: practiceAnswers,
        },
        verdict,
        verdictLabel,
      },
    }
  }

  // ========== 反馈生成（v4：层级描述 + 措辞约束） ==========

  generateFeedback(scoreResult: ScoreResult): AssessmentFeedback {
    const extra = (scoreResult.extraData ?? {}) as Record<string, any>
    const verdict = (extra.verdict ?? 'stable') as CognitiveSelfVerdict
    const layerCorrect = (extra.layerCorrect ?? {}) as Record<string, { correct: number; total: number }>
    const errorTypeCounts = (extra.errorTypeCounts ?? {}) as Record<string, number>
    const practice = (extra.practice ?? {}) as { passed: boolean; allFailed: boolean }

    const summaryParts: string[] = [
      `本次共 ${extra.totalQuestions ?? this.totalQuestions} 道题，答对 ${scoreResult.totalScore ?? 0} 道（正确率 ${Math.round((extra.accuracyRate ?? 0) * 100)}%）。`,
      `${VERDICT_LABELS[verdict]}。`,
    ]
    if (extra.overallMedianRt) {
      summaryParts.push(`答对的题平均用时约 ${(Math.round(extra.overallMedianRt) / 1000).toFixed(1)} 秒。`)
    }
    if ((extra.omittedCount ?? 0) > 0) {
      summaryParts.push(`有 ${extra.omittedCount} 题超时没有作答（不算答错）。`)
    }
    summaryParts.push('这是教学参考结果，不是诊断结论。')

    // 层级描述（口语名）
    const layerLines: string[] = []
    for (const def of cognitiveSelfDimensions) {
      const s = layerCorrect[def.code]
      if (!s) continue
      layerLines.push(`${COGNITIVE_SELF_LAYER_PLAIN[def.code] ?? def.name}：答对 ${s.correct}/${s.total}`)
    }

    // 错误类型 → 建议（最低证据门槛：≥3 次机会且 ≥2 次同类错误，见 §6.5）
    const suggestions = this.buildErrorSuggestions(errorTypeCounts)

    if (practice.allFailed) {
      suggestions.unshift('练习阶段两题都没做对：建议先教孩子理解规则（要找和上面一模一样、形状颜色都相同的图），理解后再测一次。')
    }

    // 地板 / 天花板提示
    if (verdict === 'floor_risk') {
      suggestions.push('最基础的题也没答好：先排除孩子没理解规则、当天状态不好等情况，必要时找专业人员看看视知觉。')
    }
    if (verdict === 'ceiling_risk') {
      suggestions.push('最难的题也全对：说明这套题对孩子偏简单，可以试试更难的图形辨别内容。')
    }

    return {
      summary: summaryParts.join(''),
      strengths: layerLines.filter((_, i) => (layerCorrect[cognitiveSelfDimensions[i]!.code]?.correct ?? 0) >= 3),
      weaknesses: layerLines.filter((_, i) => (layerCorrect[cognitiveSelfDimensions[i]!.code]?.correct ?? 0) <= 1),
      recommendations: suggestions.slice(0, 6),
      trainingFocus: this.buildTrainingFocus(scoreResult.dimensions),
    }
  }

  getWelcomeContent() {
    return {
      title: '视知觉图形匹配筛查任务（草稿版）',
      intro:
        '屏幕左侧会显示一个目标图案，孩子从右侧 4 个选项里点出跟它完全一样的那一个。一共 18 道题（前 2 道是练习、不计分），图形从简单到复杂分 4 个难度。这个测验看两件事：能不能看准（正确率）、看得有多快（反应时间）。',
      sections: [
        {
          icon: '📋',
          title: '怎么带孩子做这个测验',
          items: [
            '让孩子自己看、自己点：测验看的是孩子眼睛和大脑处理视觉信息的真实速度和准确度，您或老师一旦在旁边提醒"看仔细点""再想想"，测出来的就不是孩子本身的能力了。',
            '前 2 道是练习题：不计分，主要帮孩子理解规则——"找一模一样的"。如果练习题都答错，先确认孩子是不是没听懂规则，再决定要不要继续。',
            '看图案辨差别：图形的差别包括形状、颜色、方向（旋转）、大小、左右翻转、缺口位置等。越往后的题，图形之间越接近，越考验视觉细节辨别。',
            '答错或超时都没关系：答错不会单独反馈给孩子（标准化要求）；如果某道题 40 秒还没作答，会自动算"未作答"跳过（不算答错）。',
          ],
        },
        {
          icon: '💡',
          title: '怎么看这个结果',
          items: [
            '又快又对 ≠ 更聪明：有些孩子天生谨慎，宁可多看两秒也不冒险出错，只要正确率在线、反应稍慢一点很正常，不代表智力低。',
            '看难度层级比看总分更有用：如果简单题都对、难题才开始出错，说明视觉辨别的基础没问题，只是复杂细节加工还需多练；如果简单题就错得多，可能要留意。',
            '这只是视知觉的一个小切片：图形匹配主要测视觉辨别和加工速度，跟语言理解、记忆、推理是两回事，不能用这一个测验下"认知落后"的结论。',
          ],
        },
      ],
      reminder: {
        icon: '⚠️',
        title: '特别提醒',
        content:
          '本测验为自编草稿版筛查工具，题目和判定标准都是临时占位版，不是正式出版的标准化量表。结果只提供大致方向、仅供参考，不输出智商（IQ）或百分位，也不能作为学习障碍、智力发育迟缓的诊断依据。如怀疑孩子有视知觉或认知加工方面的困难，建议前往正规医院儿童心理科或发育行为科做专业评估。',
      },
    }
  }

  // ========== 私有方法 ==========

  private convertToScaleQuestion(q: CognitiveSelfQuestion): ScaleQuestion {
    const dimDef = cognitiveSelfDimensions.find((d) => d.dimension === q.dimension)
    // 每次施测随机排列选项显示顺序（防记位置）；判分 value 保留题库原始下标，
    // 与题库 correctIndex 比较不受显示顺序影响（v4.3）
    const shuffled = shuffleOptions(q.options)
    return {
      id: q.id,
      dimension: dimDef?.code ?? q.dimension,
      dimensionName: dimDef ? `${dimDef.name}·${dimDef.ability}` : q.dimension,
      content: MATCH_PROMPT,
      imagePath: svgToDataUri(renderOptionSvg(q.target)),
      options: shuffled.map(({ cell, originalIndex }) => ({
        value: originalIndex,
        label: '',
        score: 0, // 不暴露正解
        imagePath: svgToDataUri(renderOptionSvg(cell)),
      })),
      metadata: { dimension: q.dimension, isPractice: Boolean(q.isPractice) },
    }
  }

  private dimCodeOf(dim: CognitiveSelfDimension): string {
    return cognitiveSelfDimensions.find((d) => d.dimension === dim)?.code ?? `match_${dim}`
  }

  /** 错误分类：比较所选选项与 target 的差异属性（选项级，一题只计一次） */
  private classifyError(q: CognitiveSelfQuestion, selectedIdx: number): CognitiveSelfErrorType {
    const selected = q.options[selectedIdx]
    const target = q.target
    if (!selected) return 'unclassified'

    if (selected.shape !== target.shape) return 'shape'
    if ((selected.color ?? null) !== (target.color ?? null)) return 'color'
    if (normalizeRot(selected.rotate) !== normalizeRot(target.rotate)) return 'rotation'
    if ((selected.scale ?? 1) !== (target.scale ?? 1)) return 'scale'
    if (Boolean(selected.mirrorX) !== Boolean(target.mirrorX) || Boolean(selected.mirrorY) !== Boolean(target.mirrorY)) {
      return 'mirror'
    }
    if ((selected.gapPosition ?? null) !== (target.gapPosition ?? null)) return 'gap'
    if ((selected.internalMarkPosition ?? null) !== (target.internalMarkPosition ?? null)) return 'internal_mark'
    if ((selected.layout ?? null) !== (target.layout ?? null)) return 'layout'
    return 'unclassified'
  }

  /** 判读（§6.2 / §6.3 / §6.4） */
  private deriveVerdict(
    levelStats: Map<CognitiveSelfDimension, LevelStat>,
    practiceAllFailed: boolean,
  ): CognitiveSelfVerdict {
    if (practiceAllFailed) {
      return 'unreadable'
    }

    const get = (dim: CognitiveSelfDimension) => levelStats.get(dim)!
    const basic = get('basic')
    const fine = get('fine')
    const cross = get('cross')
    const expert = get('expert')

    // 地板风险：练习通过但 L1 ≤ 1/4
    if (basic.total > 0 && basic.correct <= 1) {
      return 'floor_risk'
    }
    // 天花板风险：L4 = 4/4（准确率天花板）
    if (expert.total > 0 && expert.correct === expert.total && expert.correct >= 4) {
      return 'ceiling_risk'
    }

    // 结果不一致：单层下降但更高层重新 ≥ 3/4
    const layers: CognitiveSelfDimension[] = ['basic', 'fine', 'cross', 'expert']
    for (let i = 0; i < layers.length - 1; i++) {
      const cur = levelStats.get(layers[i]!)!
      const higherAll = layers.slice(i + 1).map((d) => levelStats.get(d)!)
      if (cur.total > 0 && cur.correct <= 2 && higherAll.some((h) => h.total > 0 && h.correct / h.total >= 0.75)) {
        return 'inconsistent'
      }
    }

    // 疑似边界：某层 ≤ 2/4 且更高级别题合计正确率 ≤ 50%（L1–L3 适用）
    for (let i = 0; i < layers.length - 1; i++) {
      const cur = levelStats.get(layers[i]!)!
      const higher = layers.slice(i + 1).map((d) => levelStats.get(d)!)
      const higherTotal = higher.reduce((sum, h) => sum + h.total, 0)
      const higherCorrect = higher.reduce((sum, h) => sum + h.correct, 0)
      if (cur.total > 0 && cur.correct <= 2 && higherTotal > 0 && higherCorrect / higherTotal <= 0.5) {
        return 'boundary'
      }
    }

    return 'stable'
  }

  /** 错误类型 → 训练建议（证据门槛：≥3 次机会且 ≥2 次同类错误，见 §6.5） */
  private buildErrorSuggestions(errorCounts: Record<string, number>): string[] {
    const opportunityByType = this.computeErrorOpportunities()
    const suggestions: string[] = []
    const rules: Array<[string, string]> = [
      ['rotation', '使用非对称箭头等图形的方向配对练习'],
      ['scale', '使用同形图形的大小排序与大小匹配练习'],
      ['gap', '使用大尺寸缺口定位训练（缺口位置辨别）'],
      ['layout', '使用双图形位置关系匹配练习'],
      ['mirror', '使用左右/上下镜像辨别练习'],
      ['internal_mark', '使用图形内部标记方位辨别练习'],
      ['color', '颜色类错误出现时，先排除色觉因素；结合纹理/形状冗余的配对练习'],
      ['shape', '使用形状配对与分类练习'],
    ]
    for (const [type, advice] of rules) {
      const opportunities = opportunityByType[type] ?? 0
      const errors = errorCounts[type] ?? 0
      if (opportunities >= 3 && errors >= 2) {
        suggestions.push(`错误集中于「${ERROR_TYPE_LABELS[type as CognitiveSelfErrorType] ?? type}」：建议${advice}。`)
      }
    }
    const totalErrors = Object.values(errorCounts).reduce((a, b) => a + b, 0)
    if (suggestions.length === 0 && totalErrors < 3) {
      suggestions.push('本次错误次数较少，建议继续观察。')
    }
    return suggestions
  }

  /** 各错误类型的可选干扰机会数（静态题库元数据，供报告属性矩阵分母使用） */
  private computeErrorOpportunities(): Record<string, number> {
    const opportunityByType: Record<string, number> = {
      shape: 0, color: 0, rotation: 0, scale: 0, mirror: 0, gap: 0, internal_mark: 0, layout: 0,
    }
    for (const q of cognitiveSelfQuestions) {
      if (q.isPractice) continue
      for (let idx = 0; idx < q.options.length; idx++) {
        if (idx === q.correctIndex) continue
        const t = this.classifyError(q, idx)
        opportunityByType[t] = (opportunityByType[t] ?? 0) + 1
      }
    }
    return opportunityByType
  }

  private buildTrainingFocus(dimensions: DimensionScore[]): string[] {
    const focus = dimensions
      .filter((d) => (d.averageScore ?? 0) < 0.7)
      .sort((a, b) => (a.averageScore ?? 0) - (b.averageScore ?? 0))
      .map((d) => `${d.name}练习（正确率 ${Math.round((d.averageScore ?? 0) * 100)}%）`)
    if (focus.length === 0) focus.push('维持并拓展现有视空间匹配水平')
    return focus.slice(0, 4)
  }

  protected getDefaultDescription(): string {
    return '视知觉图形匹配筛查（DRAFT）：测量视觉图形匹配表现与作答反应时'
  }

  protected getEstimatedTime(): number {
    return 8
  }

  protected getIcon(): string {
    return '🎯'
  }

  // ========== 持久化（v4：不落 IQ / 百分位） ==========

  async persistAssessment(context: PersistContext): Promise<PersistResult> {
    const { student, scoreResult, startTime, endTime } = context
    const api = new CognitiveSelfAssessmentAPI()

    // 按层级聚合存档
    const dimScores: Record<string, unknown> = {}
    for (const d of scoreResult.dimensions) {
      dimScores[d.code] = {
        name: d.name,
        correct: d.passedCount ?? d.rawScore,
        total: d.itemCount,
      }
    }

    const extra = (scoreResult.extraData as Record<string, any>) ?? {}
    const totalQuestions = extra.totalQuestions ?? this.totalQuestions
    const accuracyRate = extra.accuracyRate ?? 0
    const avgResponseTime = extra.overallMedianRt ?? 0

    const assessId = api.createAssessment({
      student_id: student.id,
      age_months: student.ageInMonths,
      gender: student.gender,
      raw_answers: JSON.stringify(scoreResult.rawAnswers || {}),
      total_raw_score: scoreResult.totalScore ?? 0,
      total_questions: totalQuestions,
      // v4：占位常模已废弃，不落 IQ / 百分位
      percentile_rank: null,
      iq_estimate: null,
      level: scoreResult.level,
      level_code: scoreResult.levelCode ?? null,
      unit_scores: JSON.stringify(dimScores),
      accuracy_rate: accuracyRate,
      avg_response_time: avgResponseTime,
      extra_data: scoreResult.extraData ? JSON.stringify(scoreResult.extraData) : null,
      start_time: startTime,
      end_time: endTime,
    })

    const reportId = this.createReportRecord({
      studentId: student.id,
      reportType: 'cognitive_self',
      assessId,
      title: `${student.name} - 视知觉图形匹配筛查（DRAFT）评估报告`,
      moduleCode: 'cognitive',
    })

    console.log('[CognitiveSelfDriver] 视知觉图形匹配筛查持久化成功, assessId:', assessId)
    return { assessId, reportId }
  }
}

// ============================================================================
// 工具
// ============================================================================

const VERDICT_LABELS: Record<CognitiveSelfVerdict, string> = {
  stable: '整体表现正常：从简单到最难的题目都能较好地完成',
  boundary: '较难的题目开始出现困难：题目越难答对越少，建议多练同类型的内容',
  inconsistent: '答题表现不太稳定（简单的错了、难的反而对），建议隔几天再测一次核实',
  unreadable: '本次结果不作参考（规则没理解或中途中断），请在引导下重新测一次',
  floor_risk: '最基础的题目也没完成好：先确认孩子是否理解规则、当天状态是否合适',
  ceiling_risk: '最难的题目也全部答对了：这次测试测不出孩子的上限，可以尝试更难的挑战',
}

const ERROR_TYPE_LABELS: Record<CognitiveSelfErrorType, string> = {
  shape: '形状',
  color: '颜色',
  rotation: '方向',
  scale: '大小',
  mirror: '镜像',
  gap: '缺口方位',
  internal_mark: '内部标记',
  layout: '布局',
  unclassified: '未分类',
}

function normalizeRot(deg: number | undefined): number {
  return ((Number(deg ?? 0) % 360) + 360) % 360
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

/** Fisher-Yates 洗牌：随机排列选项显示顺序，保留原始下标用于判分（实现见 utils/cognitive-shuffle） */
function shuffleOptions<T>(items: T[]): Array<{ cell: T; originalIndex: number }> {
  return cognitiveShuffleOptions(items)
}
