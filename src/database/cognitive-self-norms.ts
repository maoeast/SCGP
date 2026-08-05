/**
 * 视知觉图形匹配筛查任务（DRAFT）常模转换（⚠️ 已废弃，不再被 CognitiveSelfDriver 调用）
 *
 * v4 起（2026-08-05）：按设计稿与外部审查意见，**不再输出 IQ / 百分位 / 标准分**，
 * 结果仅为描述性（总正确数 + 各层正确数 + 中位 RT + 错误类型）。
 * 本文件保留仅为历史兼容与未来真实常模重建的参考；恢复标准分换算的前提是：
 * 真实样本、信度、项目参数（IRT/Rasch）与年龄参考数据齐备。
 *
 * @module database/cognitive-self-norms
 * @deprecated v4 起不再被调用
 */

/** 百分位 → IQ 锚点表（正态分布近似，DRAFT） */
const PR_IQ_TABLE: Array<{ pr: number; iq: number }> = [
  { pr: 1, iq: 65 },
  { pr: 5, iq: 76 },
  { pr: 10, iq: 81 },
  { pr: 16, iq: 85 },
  { pr: 25, iq: 90 },
  { pr: 40, iq: 96 },
  { pr: 50, iq: 100 },
  { pr: 60, iq: 104 },
  { pr: 75, iq: 110 },
  { pr: 84, iq: 115 },
  { pr: 90, iq: 119 },
  { pr: 95, iq: 125 },
  { pr: 99, iq: 135 },
]

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/**
 * 正确数（答对数）+ 月龄 → 百分位（占位）。
 * 占位策略：以正确率为主，年幼达到同等水平略加分（贴近「年幼达同等水平更优」的常识）。
 * 结果夹紧 [1, 99]。
 */
export function cognitiveSelfRawToPercentile(raw: number, ageMonths: number, maxRaw: number): number {
  if (!Number.isFinite(raw) || !Number.isFinite(maxRaw) || maxRaw <= 0) return 50
  const accuracy = clamp(raw / maxRaw, 0, 1)
  // 年幼加分：5.5 岁(66月)→约+8，16.5 岁(198月)→约+0
  const ageBonus = clamp(((198 - ageMonths) / 132) * 8, 0, 8)
  const pr = accuracy * 88 + ageBonus + 5
  return clamp(Math.round(pr), 1, 99)
}

/** 百分位 → 离差 IQ（占位查表线性插值），夹紧 [55, 145] */
export function cognitiveSelfPercentileToIq(percentile: number): number {
  const pr = clamp(Math.round(percentile), 1, 99)
  let lo = PR_IQ_TABLE[0]!
  let hi = PR_IQ_TABLE[PR_IQ_TABLE.length - 1]!
  for (let i = 0; i < PR_IQ_TABLE.length - 1; i++) {
    const a = PR_IQ_TABLE[i]!
    const b = PR_IQ_TABLE[i + 1]!
    if (pr >= a.pr && pr <= b.pr) {
      lo = a
      hi = b
      break
    }
  }
  const span = hi.pr - lo.pr || 1
  const iq = lo.iq + ((pr - lo.pr) / span) * (hi.iq - lo.iq)
  return clamp(Math.round(iq), 55, 145)
}

/**
 * 反应时参考区间（占位，DRAFT）。
 * 返回该月龄段「典型」平均反应时上下界（ms），**仅用于报告侧标注，不参与计分**。
 * 占位口径：年长儿童更快；5.5 岁约 2500ms 上限，16.5 岁约 1200ms 上限。
 */
export function cognitiveSelfRtReferenceRange(ageMonths: number): {
  lowerMs: number
  upperMs: number
  typicalMs: number
} {
  const ratio = clamp((ageMonths - 66) / 132, 0, 1) // 0=5.5岁 1=16.5岁
  const upper = Math.round(2500 - ratio * 1300) // 2500 → 1200
  const lower = Math.round(900 - ratio * 200) // 900 → 700
  return { lowerMs: lower, upperMs: upper, typicalMs: Math.round((lower + upper) / 2) }
}
