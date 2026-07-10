/**
 * 瑞文 CRT 图形推理测验驱动器（DRAFT）
 *
 * 按 SPM 标准的「题目结构 + 五组推理规律」自编**原创几何矩阵占位题**
 * （由 crt-matrix.ts 程序化生成，非 Pearson 版权图）。采用「自编题目 + 占位常模」策略，
 * 题目与常模均为草稿，仅供平台「筛查 / 发育监测 / 转介建议」，不能作为临床诊断。
 *
 * 特点：
 * - 3×3 图形矩阵缺一角，6 选 1；五组（SPM A–E）难度递增
 * - 唯一正解：ScaleOption 不含正解（score=0），正确性由 Driver 用题库 correctIndex 判定
 * - 计分：答对数 → 占位百分位 → 占位离差 IQ（M=100, SD=15）
 * - 儿童本人作答，线性流程，不给即时对错反馈（标准化要求）
 * - 持久化走 crt_assess 专属表 + report_record 索引（仿 BRIEF 范式）
 *
 * @module strategies/assessment/CRTDriver
 */

import type {
  StudentContext,
  ScaleQuestion,
  ScaleAnswer,
  ScoreResult,
  AssessmentFeedback,
  DimensionScore,
  PersistContext,
  PersistResult,
} from '@/types/assessment'
import { BaseDriver } from './BaseDriver'
import { CRTAssessmentAPI } from '@/database/api'
import {
  crtQuestions,
  crtUnitDefs,
  crtLevels,
  crtRecommendations,
  type CrtQuestion,
  type CrtLevel,
} from '@/database/crt-data'
import { crtRawToPercentile, crtPercentileToIq } from '@/database/crt-norms'
import { renderMatrixSvg, renderOptionSvg, svgToDataUri } from '@/utils/crt-matrix'

/** CRT 每题通用指导语 */
const CRT_PROMPT = '观察上方图案的规律，选出能正确补全缺失位置（?）的一项。'

/**
 * 瑞文 CRT 量表驱动器实现
 */
export class CRTDriver extends BaseDriver {
  // ========== 元信息 ==========

  readonly scaleCode = 'crt'
  readonly scaleName = '瑞文图形推理测验（CRT 自编 DRAFT）'
  readonly version = '0.1.0-draft'
  readonly ageRange = { min: 66, max: 198 } // 5.5 岁 - 16.5 岁
  readonly totalQuestions = crtQuestions.length

  // 五组维度（runtime code，scale-dimension-mapping 全部 → cognitive）
  readonly dimensions = crtUnitDefs.map((d) => d.code)

  // ========== 题目管理 ==========

  getQuestions(_context: StudentContext): ScaleQuestion[] {
    return crtQuestions
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((q) => this.convertToScaleQuestion(q))
  }

  getStartIndex(_context: StudentContext): number {
    return 0
  }

  // ========== 评分计算 ==========

  calculateScore(answers: Record<string, ScaleAnswer>, context: StudentContext): ScoreResult {
    const total = crtQuestions.length
    let rawScore = 0

    // 按维度（unit）聚合答对情况
    const unitStats = new Map<string, { correct: number; total: number }>()
    for (const def of crtUnitDefs) {
      unitStats.set(def.code, { correct: 0, total: 0 })
    }

    for (const q of crtQuestions) {
      const stat = unitStats.get(this.unitCodeOf(q.unit))!
      stat.total++
      const answer = answers[q.id]
      if (answer && Number(answer.value) === q.correctIndex) {
        rawScore++
        stat.correct++
      }
    }

    // 占位常模：原始分 + 月龄 → 百分位 → IQ
    const percentile = crtRawToPercentile(rawScore, context.ageInMonths, total)
    const iq = crtPercentileToIq(percentile)
    const lv = this.getLevelByIq(iq)

    // 维度分数
    const dimensions: DimensionScore[] = crtUnitDefs.map((def) => {
      const stat = unitStats.get(def.code)!
      const rate = stat.total > 0 ? stat.correct / stat.total : 0
      return {
        code: def.code,
        name: `${def.name}·${def.ability}`,
        rawScore: stat.correct,
        itemCount: stat.total,
        passedCount: stat.correct,
        averageScore: rate,
      }
    })

    const timing = this.calculateTiming(answers)

    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      totalScore: rawScore,
      standardScore: iq,
      percentile,
      level: lv.level,
      levelCode: lv.levelCode,
      dimensions,
      rawAnswers: this.serializeAnswers(answers),
      timing,
      extraData: { draftNorm: true, iq, percentile, totalQuestions: total },
    }
  }

  // ========== 反馈生成 ==========

  generateFeedback(scoreResult: ScoreResult): AssessmentFeedback {
    const level = scoreResult.level || '典型水平'
    const rec = crtRecommendations.find((r) => r.level === level) ?? crtRecommendations[2]
    const { strengths, weaknesses } = this.analyzeDimensions(scoreResult.dimensions)

    const extra = (scoreResult.extraData as { iq?: number; percentile?: number; totalQuestions?: number }) ?? {}
    const iq = scoreResult.standardScore ?? extra.iq ?? 100
    const pr = scoreResult.percentile ?? extra.percentile ?? 50

    return {
      summary:
        `该儿童图形推理测验（瑞文 CRT 自编 DRAFT）估算离差 IQ 为 ${iq}（M=100，SD=15），` +
        `百分位 ${pr}，总体等级"${level}"。原始分（答对数）${scoreResult.totalScore ?? 0} / ` +
        `${extra.totalQuestions ?? this.totalQuestions}。` +
        (rec?.general_comment ?? ''),
      strengths,
      weaknesses,
      recommendations: rec?.suggestions ?? [],
      trainingFocus: this.buildTrainingFocus(scoreResult.dimensions),
    }
  }

  getWelcomeContent() {
    return {
      title: '瑞文图形推理测验（CRT，自编 DRAFT）',
      intro:
        '观察图案规律，选出能补全空缺的一项。本测验测量孩子的图形推理与抽象思维能力，由孩子本人独立完成。',
      sections: [
        {
          icon: '🧩',
          title: '作答说明',
          items: [
            '每题上方是一个缺失了一角的图案（标 ?），下方有 6 个选项，选出最能补全空缺的一项。',
            '尽量让孩子独立观察与思考，家长/老师只朗读规则，不提示答案。',
            '没有时间限制，鼓励孩子专注；实在看不懂可凭直觉选择后继续，不要长时间停留。',
          ],
        },
        {
          icon: '⚠️',
          title: '草稿与用途说明',
          items: [
            '本测验为自编占位题 + 占位常模的草稿版，仅用于筛查与发展监测，不能作为临床诊断依据。',
            '作答过程不会即时反馈对错（标准化要求），完成后报告展示总体与分组结果。',
          ],
        },
      ],
      reminder: {
        icon: '⚠️',
        title: '特别提醒',
        content:
          '本结果仅供教育支持参考，不能作为医学诊断依据。如结果提示显著落后，请前往正规医院发育行为儿科或心理科进一步评估。',
      },
    }
  }

  // ========== 私有方法 ==========

  private convertToScaleQuestion(q: CrtQuestion): ScaleQuestion {
    const unitDef = crtUnitDefs.find((d) => d.unit === q.unit)
    return {
      id: q.id,
      dimension: this.unitCodeOf(q.unit),
      dimensionName: unitDef ? `${unitDef.name}·${unitDef.ability}` : q.unit,
      content: CRT_PROMPT,
      imagePath: svgToDataUri(renderMatrixSvg(q.matrix)),
      options: q.options.map((cell, idx) => ({
        value: idx,
        label: '',
        score: 0, // 不暴露正解
        imagePath: svgToDataUri(renderOptionSvg(cell)),
      })),
      metadata: { unit: q.unit },
    }
  }

  private unitCodeOf(unit: string): string {
    const def = crtUnitDefs.find((d) => d.unit === unit)
    return def?.code ?? `unit_${unit.toLowerCase()}`
  }

  /** 由 IQ 取等级（crtLevels 按 minIq 升序，取最大的 minIq ≤ iq） */
  private getLevelByIq(iq: number): CrtLevel {
    const fallback: CrtLevel = crtLevels[0]!
    let matched = fallback
    for (const lv of crtLevels) {
      if (iq >= lv.minIq) matched = lv
    }
    return matched
  }

  private buildTrainingFocus(dimensions: DimensionScore[]): string[] {
    // 答对率偏低的维度作为训练重点
    const focus = dimensions
      .filter((d) => (d.averageScore ?? 0) < 0.7)
      .sort((a, b) => (a.averageScore ?? 0) - (b.averageScore ?? 0))
      .map((d) => `${d.name}图形推理练习（答对率 ${Math.round((d.averageScore ?? 0) * 100)}%）`)
    if (focus.length === 0) focus.push('维持并拓展现有图形推理水平')
    return focus.slice(0, 4)
  }

  protected getDefaultDescription(): string {
    return '评估儿童图形推理与抽象思维能力（瑞文 CRT 自编 DRAFT）'
  }

  protected getEstimatedTime(): number {
    return 12
  }

  protected getIcon(): string {
    return '🧩'
  }

  // ========== 持久化 ==========

  async persistAssessment(context: PersistContext): Promise<PersistResult> {
    const { student, scoreResult, startTime, endTime } = context
    const api = new CRTAssessmentAPI()

    // 按 unit 聚合存档
    const unitScores: Record<string, unknown> = {}
    for (const d of scoreResult.dimensions) {
      unitScores[d.code] = {
        name: d.name,
        correct: d.passedCount ?? d.rawScore,
        total: d.itemCount,
      }
    }

    const extra = (scoreResult.extraData as { totalQuestions?: number; iq?: number; percentile?: number }) ?? {}
    const totalQuestions = extra.totalQuestions ?? this.totalQuestions
    const iq = scoreResult.standardScore ?? extra.iq ?? 100
    const percentile = scoreResult.percentile ?? extra.percentile ?? 50

    const assessId = api.createAssessment({
      student_id: student.id,
      age_months: student.ageInMonths,
      gender: student.gender,
      raw_answers: JSON.stringify(scoreResult.rawAnswers || {}),
      total_raw_score: scoreResult.totalScore ?? 0,
      total_questions: totalQuestions,
      percentile_rank: percentile,
      iq_estimate: iq,
      level: scoreResult.level,
      level_code: scoreResult.levelCode ?? null,
      unit_scores: JSON.stringify(unitScores),
      extra_data: scoreResult.extraData ? JSON.stringify(scoreResult.extraData) : null,
      start_time: startTime,
      end_time: endTime,
    })

    const reportId = this.createReportRecord({
      studentId: student.id,
      reportType: 'crt',
      assessId,
      title: `${student.name} - 瑞文CRT图形推理评估报告`,
      moduleCode: 'cognitive',
    })

    console.log('[CRTDriver] CRT 评估持久化成功, assessId:', assessId)
    return { assessId, reportId }
  }
}
