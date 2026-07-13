/**
 * 综合认知自测（视空间·图形匹配）绩效题驱动器（DRAFT）
 *
 * 评估系统首个「试次级绩效题」：呈现目标图，从干扰项中选出匹配项，
 * 记录每题正确性 + 真反应时（trial-level RT）。测量视觉辨别 + 加工速度。
 *
 * 特点：
 * - 图元规格复用 crt-data 的 CrtCellSpec，由 crt-matrix.ts 程序化渲染 SVG（不修改该文件）
 * - 唯一正解：ScaleOption 不含正解（score=0），正确性由 Driver 用题库 correctIndex 判定
 * - 真反应时：PerformanceTrialBoard 采集后经 handleAnswer 写入 ScaleAnswer.responseTime，
 *   覆盖问卷型的「伪 RT」；calculateTiming 自动据此给出平均 RT
 * - 计分：答对数 → 占位百分位 → 占位离差 IQ（M=100, SD=15）；额外落库 accuracy_rate / avg_response_time
 * - 儿童本人作答，线性流程，不给即时对错反馈（标准化要求）
 * - 持久化走 cognitive_self_assess 专属表 + report_record 索引（仿 CRT 范式）
 *
 * 题库与常模均为草稿，仅供平台「筛查 / 发育监测 / 转介建议」，不能作为临床诊断。
 *
 * @module strategies/assessment/CognitiveSelfDriver
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
import { CognitiveSelfAssessmentAPI } from '@/database/api'
import {
  cognitiveSelfQuestions,
  cognitiveSelfDimensions,
  cognitiveSelfLevels,
  cognitiveSelfRecommendations,
  type CognitiveSelfQuestion,
  type CognitiveSelfDimension,
  type CognitiveSelfLevel,
} from '@/database/cognitive-self-data'
import {
  cognitiveSelfRawToPercentile,
  cognitiveSelfPercentileToIq,
} from '@/database/cognitive-self-norms'
import { renderOptionSvg, svgToDataUri } from '@/utils/crt-matrix'
import { validateAllMatchQuestions } from '@/utils/cognitive-match'

// 模块加载时校验题库一致性（DRAFT 防手写出错，开销可忽略）
{
  const errs = validateAllMatchQuestions(cognitiveSelfQuestions)
  if (errs.length) console.warn('[CognitiveSelfDriver] 题库校验失败:', errs)
}

/** 每题通用指导语 */
const MATCH_PROMPT = '观察上方的目标图案，从下方选项中选出与它完全相同的一个。'

/**
 * 综合认知自测绩效题驱动器
 */
export class CognitiveSelfDriver extends BaseDriver {
  // ========== 元信息 ==========

  readonly scaleCode = 'cognitive_self'
  readonly scaleName = '综合认知自测（视空间·图形匹配，DRAFT）'
  readonly version = '0.1.0-draft'
  readonly ageRange = { min: 66, max: 198 } // 5.5 岁 - 16.5 岁
  readonly totalQuestions = cognitiveSelfQuestions.length

  /** 覆写基类：本量表为绩效题，容器据此切换到 PerformanceTrialBoard 采集真 RT */
  readonly isPerformanceTask = true

  // 两个难度维度（runtime code，scale-dimension-mapping 全部 → cognitive）
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

  // ========== 评分计算 ==========

  calculateScore(answers: Record<string, ScaleAnswer>, context: StudentContext): ScoreResult {
    const total = cognitiveSelfQuestions.length
    let rawScore = 0

    // 按难度维度聚合答对情况
    const dimStats = new Map<string, { correct: number; total: number }>()
    for (const def of cognitiveSelfDimensions) {
      dimStats.set(def.code, { correct: 0, total: 0 })
    }

    for (const q of cognitiveSelfQuestions) {
      const stat = dimStats.get(this.dimCodeOf(q.dimension))!
      stat.total++
      const answer = answers[q.id]
      if (answer && Number(answer.value) === q.correctIndex) {
        rawScore++
        stat.correct++
      }
    }

    // 占位常模：原始分 + 月龄 → 百分位 → IQ
    const percentile = cognitiveSelfRawToPercentile(rawScore, context.ageInMonths, total)
    const iq = cognitiveSelfPercentileToIq(percentile)
    const lv = this.getLevelByIq(iq)

    // 维度分数
    const dimensions: DimensionScore[] = cognitiveSelfDimensions.map((def) => {
      const stat = dimStats.get(def.code)!
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
    const accuracyRate = total > 0 ? rawScore / total : 0
    const avgResponseTime = timing.averageTime || 0
    const reactionAvailable = avgResponseTime > 0

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
      extraData: {
        draftNorm: true,
        iq,
        percentile,
        totalQuestions: total,
        accuracyRate,
        avgResponseTime,
        // 报告侧据此隐藏空统计卡（DRAFT 真机首次跑前 RT 可能缺失）
        accuracyAvailable: true,
        reactionAvailable,
        hasRealData: reactionAvailable,
      },
    }
  }

  // ========== 反馈生成 ==========

  generateFeedback(scoreResult: ScoreResult): AssessmentFeedback {
    const level = scoreResult.level || '典型水平'
    const rec =
      cognitiveSelfRecommendations.find((r) => r.level === level) ??
      cognitiveSelfRecommendations[2]
    const { strengths, weaknesses } = this.analyzeDimensions(scoreResult.dimensions)

    const extra = (scoreResult.extraData as {
      iq?: number
      percentile?: number
      totalQuestions?: number
      accuracyRate?: number
      avgResponseTime?: number
    }) ?? {}
    const iq = scoreResult.standardScore ?? extra.iq ?? 100
    const pr = scoreResult.percentile ?? extra.percentile ?? 50
    const accuracyRate = extra.accuracyRate ?? 0
    const avgRt = extra.avgResponseTime ?? 0

    return {
      summary:
        `该儿童综合认知自测（视空间·图形匹配，DRAFT）估算离差 IQ 为 ${iq}（M=100，SD=15），` +
        `百分位 ${pr}，总体等级"${level}"。答对 ${scoreResult.totalScore ?? 0} / ` +
        `${extra.totalQuestions ?? this.totalQuestions}（正确率 ${Math.round(accuracyRate * 100)}%）。` +
        (avgRt > 0 ? `平均反应时约 ${Math.round(avgRt)} ms。` : '') +
        (rec?.general_comment ?? ''),
      strengths,
      weaknesses,
      recommendations: rec?.suggestions ?? [],
      trainingFocus: this.buildTrainingFocus(scoreResult.dimensions),
    }
  }

  getWelcomeContent() {
    return {
      title: '综合认知自测（视空间·图形匹配，DRAFT）',
      intro:
        '观察目标图案，从选项中选出与它完全相同的一个。本测验测量孩子的视觉辨别能力与加工速度，由孩子本人独立完成，需尽快作答。',
      sections: [
        {
          icon: '🎯',
          title: '作答说明',
          items: [
            '每题上方是一个目标图案，下方有 4 个选项，选出与目标**完全相同**（形状、颜色、方向、数量、大小都一致）的一个。',
            '鼓励孩子看准后**尽快点击**，但不要盲目乱点；既看正确率也看反应速度。',
            '没有时间限制，但请提示孩子保持专注、一题接一题完成。',
          ],
        },
        {
          icon: '⚠️',
          title: '草稿与用途说明',
          items: [
            '本测验为自编占位题 + 占位常模的草稿版，仅用于筛查与发展监测，不能作为临床诊断依据。',
            '作答过程不会即时反馈对错（标准化要求），完成后报告展示正确率、反应时与总体结果。',
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

  private convertToScaleQuestion(q: CognitiveSelfQuestion): ScaleQuestion {
    const dimDef = cognitiveSelfDimensions.find((d) => d.dimension === q.dimension)
    return {
      id: q.id,
      dimension: dimDef?.code ?? q.dimension,
      dimensionName: dimDef ? `${dimDef.name}·${dimDef.ability}` : q.dimension,
      content: MATCH_PROMPT,
      imagePath: svgToDataUri(renderOptionSvg(q.target)),
      options: q.options.map((cell, idx) => ({
        value: idx,
        label: '',
        score: 0, // 不暴露正解
        imagePath: svgToDataUri(renderOptionSvg(cell)),
      })),
      metadata: { dimension: q.dimension },
    }
  }

  private dimCodeOf(dim: CognitiveSelfDimension): string {
    return cognitiveSelfDimensions.find((d) => d.dimension === dim)?.code ?? `match_${dim}`
  }

  /** 由 IQ 取等级（按 minIq 升序，取最大的 minIq ≤ iq） */
  private getLevelByIq(iq: number): CognitiveSelfLevel {
    const fallback: CognitiveSelfLevel = cognitiveSelfLevels[0]!
    let matched = fallback
    for (const lv of cognitiveSelfLevels) {
      if (iq >= lv.minIq) matched = lv
    }
    return matched
  }

  private buildTrainingFocus(dimensions: DimensionScore[]): string[] {
    const focus = dimensions
      .filter((d) => (d.averageScore ?? 0) < 0.7)
      .sort((a, b) => (a.averageScore ?? 0) - (b.averageScore ?? 0))
      .map((d) => `${d.name}练习（正确率 ${Math.round((d.averageScore ?? 0) * 100)}%）`)
    if (focus.length === 0) focus.push('维持并拓展现有视空间辨别水平')
    return focus.slice(0, 4)
  }

  protected getDefaultDescription(): string {
    return '评估儿童视空间辨别与加工速度（综合认知自测·图形匹配 DRAFT）'
  }

  protected getEstimatedTime(): number {
    return 8
  }

  protected getIcon(): string {
    return '🎯'
  }

  // ========== 持久化 ==========

  async persistAssessment(context: PersistContext): Promise<PersistResult> {
    const { student, scoreResult, startTime, endTime } = context
    const api = new CognitiveSelfAssessmentAPI()

    // 按维度聚合存档
    const dimScores: Record<string, unknown> = {}
    for (const d of scoreResult.dimensions) {
      dimScores[d.code] = {
        name: d.name,
        correct: d.passedCount ?? d.rawScore,
        total: d.itemCount,
      }
    }

    const extra = (scoreResult.extraData as {
      totalQuestions?: number
      iq?: number
      percentile?: number
      accuracyRate?: number
      avgResponseTime?: number
    }) ?? {}
    const totalQuestions = extra.totalQuestions ?? this.totalQuestions
    const iq = scoreResult.standardScore ?? extra.iq ?? 100
    const percentile = scoreResult.percentile ?? extra.percentile ?? 50
    const accuracyRate = extra.accuracyRate ?? 0
    const avgResponseTime = extra.avgResponseTime ?? 0

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
      title: `${student.name} - 综合认知自测（图形匹配）评估报告`,
      moduleCode: 'cognitive',
    })

    console.log('[CognitiveSelfDriver] 认知自测评估持久化成功, assessId:', assessId)
    return { assessId, reportId }
  }
}
