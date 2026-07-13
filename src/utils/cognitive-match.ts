/**
 * 视空间图形匹配 — 图元相等判定与题库校验（DRAFT）
 *
 * cognitive-self-data.ts 的固定题库在构建期校验：每题 correctIndex 指向的选项必须与
 * target 完全相等，其余选项必须与 target 不相等（否则匹配题无解或多解）。
 * 本文件提供 cellEquals 与校验函数，避免手写题库出错，供 Driver / 测试调用。
 *
 * @module utils/cognitive-match
 */

import type { CrtCellSpec } from '@/database/crt-data'
import type { CognitiveSelfQuestion } from '@/database/cognitive-self-data'

/** 两个图元规格是否完全相同（参与匹配判定的全部字段，缺失字段按渲染默认值归一） */
export function cellEquals(a: CrtCellSpec, b: CrtCellSpec): boolean {
  return (
    a.shape === b.shape &&
    (a.color ?? null) === (b.color ?? null) &&
    (a.rotate ?? 0) === (b.rotate ?? 0) &&
    (a.count ?? 1) === (b.count ?? 1) &&
    (a.scale ?? 1) === (b.scale ?? 1)
  )
}

/**
 * 校验一道匹配题：正解须等于 target，其余选项须不等于 target。
 * 返回错误信息数组（空表示通过）。
 */
export function validateMatchQuestion(q: CognitiveSelfQuestion): string[] {
  const errors: string[] = []
  const correct = q.options[q.correctIndex]
  if (!correct) {
    errors.push(`题 ${q.id}: correctIndex ${q.correctIndex} 越界`)
    return errors
  }
  if (!cellEquals(correct, q.target)) {
    errors.push(`题 ${q.id}: correctIndex 指向的选项与 target 不一致`)
  }
  q.options.forEach((opt, idx) => {
    if (idx !== q.correctIndex && cellEquals(opt, q.target)) {
      errors.push(`题 ${q.id}: 干扰项 ${idx} 与 target 相同（多解）`)
    }
  })
  return errors
}

/** 校验整个题库；开发期断言用 */
export function validateAllMatchQuestions(questions: CognitiveSelfQuestion[]): string[] {
  return questions.flatMap(validateMatchQuestion)
}
