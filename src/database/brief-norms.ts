/**
 * BRIEF 常模转换（DRAFT — 占位线性转换，非真实常模）
 *
 * ⚠️ 真实 BRIEF 按「年龄 × 性别」分组查表得到 T 分（M=50，SD=10）。
 *    本文件提供的是**占位线性转换**，仅用于让评估链端到端可跑；
 *    正式使用前必须采集中国本地常模后替换 `briefRawMeanToT`。
 *    当前结果仅供平台「筛查 / 发育监测 / 转介建议」，不能作为诊断。
 *
 * @module database/brief-norms
 */

/**
 * 将单维度原始均分（1-3，越高=执行功能困难越多）转换为 T 分（DRAFT 线性）。
 * 映射：rawMean=1 → T≈35（明显低于典型困难水平）；2 → T≈50（典型）；3 → T≈65（偏高）。
 * 结果夹紧到 [30, 90]。
 */
export function briefRawMeanToT(rawMean: number): number {
  if (!Number.isFinite(rawMean)) return 50
  const t = 50 + (rawMean - 2) * 15
  return Math.max(30, Math.min(90, Math.round(t)))
}
