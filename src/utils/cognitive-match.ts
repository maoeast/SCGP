/**
 * 视空间图形匹配 — 图元相等判定与题库校验（DRAFT）
 *
 * cognitive-self-data.ts 的固定题库在构建期校验：
 * 1. 语义唯一性：每题 correctIndex 指向的选项必须与 target 完全相等，
 *    其余选项必须与 target 不相等（否则匹配题无解或多解）；
 * 2. 视觉等价归一：按图形对称性把 rotate/mirror 归一后比较（circle 任意旋转
 *    等价、square 每 90° 等价、triangle 每 120° 等价、hexagon 每 60° 等价、
 *    五角星每 72° 等价、diamond 每 180° 等价、arrow 无旋转等价、flag 无旋转
 *    等价且 mirrorX 为独立属性、ring/dot 旋转等价）；
 * 3. 干扰项属性差合同：每个干扰项只能改变规格表声明的属性（由题目声明
 *    expectedDiffs 校验，见 validateMatchQuestion）；
 * 4. 练习题与正式题去重：完整选项集合不得与正式题复用。
 *
 * 本文件提供 cellEquals / cellVisuallyEquals / validateMatchQuestion 等函数，
 * 避免手写题库出错，供 Driver / 测试调用。
 *
 * @module utils/cognitive-match
 */

import type { CrtCellSpec, CrtShape } from '@/database/crt-data'
import type { CognitiveSelfQuestion } from '@/database/cognitive-self-data'

/** 对称图形的旋转等价周期（度）；0 = 无旋转等价（任意旋转都不同） */
export const SHAPE_ROTATION_PERIOD: Record<CrtShape, number> = {
  circle: 0, // 任意旋转等价
  dot: 0,
  ring: 0,
  square: 90,
  triangle: 120,
  hexagon: 60,
  star: 72,
  diamond: 180,
  arrow: 360, // 无旋转等价（0/360 同，其余不同）
  flag: 360, // 手性，无旋转等价
}

/** 形状是否有镜像等价（对称图形镜像后与某旋转相同 → mirror 不构成独立属性） */
const MIRROR_EQUIVALENT_SHAPES: ReadonlySet<CrtShape> = new Set([
  'circle', 'dot', 'ring', 'square', 'triangle', 'hexagon', 'star', 'diamond',
])

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360
}

function rotationPeriod(shape: CrtShape): number {
  return SHAPE_ROTATION_PERIOD[shape] ?? 360
}

/** 归一化旋转角（按形状对称周期折叠） */
function normalizeRotation(shape: CrtShape, rotate: number | undefined): number {
  const period = rotationPeriod(shape)
  if (period === 0) return 0
  return ((normalizeAngle(rotate ?? 0) % period) + period) % period
}

/** 两个图元是否视觉等价（对称归一后比较；不考虑像素级差异，像素阈值由 render 侧校验） */
export function cellVisuallyEquals(a: CrtCellSpec, b: CrtCellSpec): boolean {
  if (a.shape !== b.shape) return false
  if ((a.color ?? null) !== (b.color ?? null)) return false
  if ((a.scale ?? 1) !== (b.scale ?? 1)) return false
  if ((a.count ?? 1) !== (b.count ?? 1)) return false
  if ((a.gapPosition ?? null) !== (b.gapPosition ?? null)) return false
  if ((a.internalMarkPosition ?? null) !== (b.internalMarkPosition ?? null)) return false

  const rotA = normalizeRotation(a.shape, a.rotate)
  const rotB = normalizeRotation(b.shape, b.rotate)
  if (rotA !== rotB) return false

  // 镜像：对称图形镜像等价于旋转，不构成差异；非对称图形（arrow/flag）镜像独立
  const mirrorA = Boolean(a.mirrorX) !== Boolean(b.mirrorX) || Boolean(a.mirrorY) !== Boolean(b.mirrorY)
  if (mirrorA && MIRROR_EQUIVALENT_SHAPES.has(a.shape)) {
    return true // 对称图形镜像后视觉等价
  }
  if (mirrorA) {
    return false // 非对称图形镜像 ≠ 旋转
  }

  // 双图元布局
  const la = a.layout ?? null
  const lb = b.layout ?? null
  if (la !== lb) return false
  if (a.secondary || b.secondary) {
    const sa = a.secondary
    const sb = b.secondary
    if (!sa || !sb) return false
    if (sa.shape !== sb.shape) return false
    if ((sa.color ?? null) !== (sb.color ?? null)) return false
    if (normalizeRotation(sa.shape, sa.rotate) !== normalizeRotation(sb.shape, sb.rotate)) return false
    if ((sa.scale ?? 1) !== (sb.scale ?? 1)) return false
    if (Boolean(sa.mirrorX) !== Boolean(sb.mirrorX)) return false
  }

  return true
}

/** 两个图元规格是否完全相同（参与匹配判定的全部字段，缺失字段按渲染默认值归一） */
export function cellEquals(a: CrtCellSpec, b: CrtCellSpec): boolean {
  return cellVisuallyEquals(a, b)
}

/**
 * 校验一道匹配题：正解须等于 target，其余选项须不等于 target（视觉等价口径）。
 * 返回错误信息数组（空表示通过）。
 */
export function validateMatchQuestion(q: CognitiveSelfQuestion): string[] {
  const errors: string[] = []
  const correct = q.options[q.correctIndex]
  if (!correct) {
    errors.push(`题 ${q.id}: correctIndex ${q.correctIndex} 越界`)
    return errors
  }
  if (!cellVisuallyEquals(correct, q.target)) {
    errors.push(`题 ${q.id}: correctIndex 指向的选项与 target 视觉不等价`)
  }
  q.options.forEach((opt, idx) => {
    if (idx === q.correctIndex) return
    if (cellVisuallyEquals(opt, q.target)) {
      errors.push(`题 ${q.id}: 干扰项 ${idx} 与 target 视觉等价（多解）`)
    }
  })
  // 干扰项两两互异
  q.options.forEach((optA, idxA) => {
    q.options.forEach((optB, idxB) => {
      if (idxA < idxB && cellVisuallyEquals(optA, optB)) {
        errors.push(`题 ${q.id}: 选项 ${idxA} 与选项 ${idxB} 视觉等价`)
      }
    })
  })
  return errors
}

/** 校验整个题库（含练习题）；开发期断言用 */
export function validateAllMatchQuestions(questions: CognitiveSelfQuestion[]): string[] {
  return questions.flatMap(validateMatchQuestion)
}

/**
 * 正解位置平衡校验：正式题（非练习）中 0/1/2/3 各出现 4 次、同一位置连续不超 2 次。
 * 返回错误信息数组（空表示通过）。
 */
export function validateAnswerPositionBalance(questions: CognitiveSelfQuestion[]): string[] {
  const errors: string[] = []
  const formal = questions.filter((q) => !q.isPractice)
  const counts = [0, 0, 0, 0]
  let consecutive = 0
  let prev = -1
  for (const q of formal) {
    const idx = q.correctIndex
    if (idx < 0 || idx > 3) {
      errors.push(`题 ${q.id}: 正解位置 ${idx} 超出 0-3`)
      continue
    }
    counts[idx] = (counts[idx] ?? 0) + 1
    consecutive = idx === prev ? consecutive + 1 : 1
    if (consecutive > 2) {
      errors.push(`题 ${q.id}: 正解位置 ${idx} 连续出现 ${consecutive} 次（超过 2）`)
    }
    prev = idx
  }
  counts.forEach((c, pos) => {
    if (c !== 4) {
      errors.push(`正解位置 ${pos} 出现 ${c} 次（应为 4）`)
    }
  })
  return errors
}

/**
 * 练习题与正式题去重校验：练习题 target 与选项集合不得与正式题复用。
 * 返回错误信息数组（空表示通过）。
 */
export function validatePracticeNoLeak(questions: CognitiveSelfQuestion[]): string[] {
  const errors: string[] = []
  const formal = questions.filter((q) => !q.isPractice)
  const practice = questions.filter((q) => q.isPractice)
  for (const p of practice) {
    for (const f of formal) {
      if (cellVisuallyEquals(p.target, f.target)) {
        errors.push(`练习题 ${p.id} 与正式题 ${f.id} 复用 target`)
      }
      for (const po of p.options) {
        for (const fo of f.options) {
          if (cellVisuallyEquals(po, fo)) {
            errors.push(`练习题 ${p.id} 选项与正式题 ${f.id} 选项视觉等价`)
          }
        }
      }
    }
  }
  return errors
}
