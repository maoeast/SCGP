/**
 * 瑞文 CRT 常模转换（DRAFT — 占位查表，非真实常模）
 *
 * ⚠️ 真实瑞文按「年龄分组」查原始分 → 百分等级 → 离差 IQ 表（M=100，SD=15）。
 *    本文件提供**占位转换**，仅让评估链端到端可跑；
 *    正式使用前必须采集中国本地常模后替换。
 *    当前结果仅供平台「筛查 / 发育监测 / 转介建议」，不能作为诊断。
 *
 * @module database/crt-norms
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
 * 原始分（答对数）+ 月龄 → 百分位（占位）。
 * 占位策略：以正确率为主，年幼达到同等水平略加分（贴近「年幼达同等水平更优」的常识）。
 * 结果夹紧 [1, 99]。
 */
export function crtRawToPercentile(raw: number, ageMonths: number, maxRaw: number): number {
  if (!Number.isFinite(raw) || !Number.isFinite(maxRaw) || maxRaw <= 0) return 50
  const accuracy = clamp(raw / maxRaw, 0, 1)
  // 年幼加分：5.5 岁(66月)→约+8，16.5 岁(198月)→约+0
  const ageBonus = clamp(((198 - ageMonths) / 132) * 8, 0, 8)
  const pr = accuracy * 88 + ageBonus + 5
  return clamp(Math.round(pr), 1, 99)
}

/** 百分位 → 离差 IQ（占位查表线性插值），夹紧 [55, 145] */
export function crtPercentileToIq(percentile: number): number {
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
