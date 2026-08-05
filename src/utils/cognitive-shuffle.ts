/**
 * 视知觉图形匹配筛查任务 — 选项洗牌工具（v4.3）
 *
 * 每次施测随机排列选项显示顺序（防答题者记住答案位置）。
 * 判分不依赖显示位置：选项的 value 保留题库原始下标，与题库 correctIndex 比较。
 *
 * @module utils/cognitive-shuffle
 */

/** Fisher-Yates 洗牌：随机排列，保留原始下标用于判分 */
export function shuffleOptions<T>(items: T[]): Array<{ cell: T; originalIndex: number }> {
  const entries = items.map((cell, originalIndex) => ({ cell, originalIndex }))
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[entries[i], entries[j]] = [entries[j]!, entries[i]!]
  }
  return entries
}
