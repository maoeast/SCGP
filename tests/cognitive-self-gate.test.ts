/**
 * 视知觉图形匹配筛查任务（DRAFT）— 题库门禁校验（v4 §7.5）
 *
 * 运行：npx jiti tests/cognitive-self-gate.test.ts
 *
 * 覆盖（node 环境可执行项）：
 *  1. 18 题（2 练习 + 16 正式）语义唯一性（正解=target、干扰项≠target）
 *  2. 视觉等价检查（对称归一：circle/square/triangle/hexagon/star/diamond 旋转折叠）
 *  3. 每题 4 个选项两两视觉不等
 *  4. target 与 correct option 渲染 SVG 一致（像素等价的结构近似）
 *  5. 干扰项属性差合同：正式题每个干扰项与 target 恰差 1 个属性
 *  6. 练习题与正式题零复用（target + 选项集合）
 *  7. 大小题像素差阈值：L2/L3 ≥ 7 px、L4 ≥ 5 px（88 px 基准外径）
 *  8. 题16 布局四选项渲染 SVG 互不相同（无视觉重复）
 *  9. 正解位置平衡：0/1/2/3 各 4 次、连续不超 2 次
 *  10. 手性验证：flag 镜像与任意旋转不等价；对称图形镜像等价
 */
import assert from 'node:assert/strict'

import {
  cognitiveSelfQuestions,
  cognitiveSelfDimensions,
} from '../src/database/cognitive-self-data.ts'
import {
  cellVisuallyEquals,
  validateAllMatchQuestions,
  validateAnswerPositionBalance,
  validatePracticeNoLeak,
} from '../src/utils/cognitive-match.ts'
import { renderOptionSvg } from '../src/utils/crt-matrix.ts'
import type { CrtCellSpec } from '../src/database/crt-data.ts'
import { shuffleOptions } from '../src/utils/cognitive-shuffle.ts'

const formalQuestions = cognitiveSelfQuestions.filter((q) => !q.isPractice)
const practiceQuestions = cognitiveSelfQuestions.filter((q) => q.isPractice)

// ---------- 1/2/3. 语义唯一性 + 视觉等价 + 选项两两不等 ----------
{
  const errors = validateAllMatchQuestions(cognitiveSelfQuestions)
  assert.deepEqual(errors, [], `题库语义/视觉校验失败:\n${errors.join('\n')}`)
  console.log('✓ 1/2/3. 18 题语义唯一性 + 视觉等价 + 选项两两不等通过')
}

// ---------- 4. target 与 correct option 渲染 SVG 一致 ----------
{
  const mismatched = formalQuestions.filter(
    (q) => renderOptionSvg(q.target) !== renderOptionSvg(q.options[q.correctIndex]!),
  )
  assert.deepEqual(mismatched.map((q) => q.id), [], 'target 与 correct option 渲染不一致')
  console.log('✓ 4. target 与 correct option 渲染 SVG 一致（16 题）')
}

// ---------- 5. 干扰项属性差合同（正式题，恰差 1 个属性） ----------
{
  type DiffKey = 'shape' | 'color' | 'rotation' | 'scale' | 'mirror' | 'gap' | 'internal_mark' | 'layout'
  const diffKeys = (a: CrtCellSpec, b: CrtCellSpec): DiffKey[] => {
    const diffs: DiffKey[] = []
    if (a.shape !== b.shape) diffs.push('shape')
    if ((a.color ?? null) !== (b.color ?? null)) diffs.push('color')
    if (a.shape === b.shape && ((a.rotate ?? 0) % 360) !== ((b.rotate ?? 0) % 360)) diffs.push('rotation')
    if ((a.scale ?? 1) !== (b.scale ?? 1)) diffs.push('scale')
    if (Boolean(a.mirrorX) !== Boolean(b.mirrorX) || Boolean(a.mirrorY) !== Boolean(b.mirrorY)) diffs.push('mirror')
    if ((a.gapPosition ?? null) !== (b.gapPosition ?? null)) diffs.push('gap')
    if ((a.internalMarkPosition ?? null) !== (b.internalMarkPosition ?? null)) diffs.push('internal_mark')
    if ((a.layout ?? null) !== (b.layout ?? null)) diffs.push('layout')
    return diffs
  }
  const violations: string[] = []
  for (const q of formalQuestions) {
    q.options.forEach((opt, idx) => {
      if (idx === q.correctIndex) return
      const diffs = diffKeys(q.target, opt)
      if (diffs.length !== 1) {
        violations.push(`题 ${q.id} 选项 ${idx} 与 target 差异属性 ${diffs.length} 个: [${diffs.join(',')}]`)
      }
    })
  }
  assert.deepEqual(violations, [], `干扰项属性差合同违规:\n${violations.join('\n')}`)
  console.log('✓ 5. 正式题干扰项属性差合同（每干扰项恰差 1 属性）通过')
}

// ---------- 6. 练习题与正式题零复用 ----------
{
  const errors = validatePracticeNoLeak(cognitiveSelfQuestions)
  assert.deepEqual(errors, [], `练习题泄漏:\n${errors.join('\n')}`)
  assert.equal(practiceQuestions.length, 2, '练习题数量应为 2')
  assert.equal(formalQuestions.length, 16, '正式题数量应为 16')
  assert.equal(cognitiveSelfDimensions.length, 4, '维度应为 4 级')
  console.log('✓ 6. 练习题与正式题零复用（2 练习 + 16 正式）通过')
}

// ---------- 7. 大小题像素差阈值（88 px 基准：L2/L3 ≥ 7px、L4 ≥ 5px） ----------
{
  const thresholdByDimension: Record<string, number> = {
    basic: 0, // L1 无大小题
    fine: 7,
    cross: 8, // v4.2：L3 大小差实际边界 ≥ 8 CSS px（实测反馈）
    expert: 5,
  }
  const violations: string[] = []
  for (const q of formalQuestions) {
    const threshold = thresholdByDimension[q.dimension]
    if (!threshold) continue
    q.options.forEach((opt, idx) => {
      if (idx === q.correctIndex) return
      const dt = Math.abs((opt.scale ?? 1) - (q.target.scale ?? 1))
      if (dt > 0) {
        const px = dt * 88
        if (px < threshold - 0.01) {
          violations.push(`题 ${q.id} 选项 ${idx} 大小差 ${px.toFixed(2)}px < ${threshold}px`)
        }
      }
    })
  }
  assert.deepEqual(violations, [], `大小题像素差不足:\n${violations.join('\n')}`)
  console.log('✓ 7. 大小题像素差阈值（L2/L3 ≥7px、L4 ≥5px @88px）通过')
}

// ---------- 8. 题16 布局四选项渲染互不相同 ----------
{
  const q16 = formalQuestions.find((q) => q.id === 16)
  assert.ok(q16, '题16 存在')
  const svgs = q16.options.map((o) => renderOptionSvg(o))
  const unique = new Set(svgs)
  assert.equal(unique.size, 4, '题16 四个选项渲染 SVG 存在重复')
  assert.equal(renderOptionSvg(q16.target), svgs[q16.correctIndex]!, '题16 正解渲染与 target 一致')
  console.log('✓ 8. 题16 布局四选项渲染无视觉重复通过')
}

// ---------- 9. 正解位置平衡 ----------
{
  const errors = validateAnswerPositionBalance(cognitiveSelfQuestions)
  assert.deepEqual(errors, [], `正解位置平衡失败:\n${errors.join('\n')}`)
  console.log('✓ 9. 正解位置平衡（0/1/2/3 各 4 次、连续不超 2 次）通过')
}

// ---------- 10. 手性与对称验证 ----------
{
  const flagBase: CrtCellSpec = { shape: 'flag', rotate: 30 }
  const flagMirror: CrtCellSpec = { shape: 'flag', rotate: 30, mirrorX: true }
  // flag 镜像与任何旋转（15/30/60/90/180/270）都不等价
  for (const rot of [0, 15, 30, 60, 90, 150, 180, 270]) {
    assert.equal(cellVisuallyEquals(flagBase, { ...flagBase, rotate: rot }), rot === 30, `flag rotate ${rot} 等价判断错误`)
  }
  assert.equal(cellVisuallyEquals(flagBase, flagMirror), false, 'flag 镜像应与原图不等价')
  // 对称图形：镜像等价于旋转（circle 任意旋转等价、square 90° 折叠）
  assert.equal(cellVisuallyEquals({ shape: 'circle', rotate: 45 }, { shape: 'circle', rotate: 200 }), true)
  assert.equal(cellVisuallyEquals({ shape: 'square', rotate: 90 }, { shape: 'square', rotate: 180 }), true)
  assert.equal(cellVisuallyEquals({ shape: 'square', rotate: 45 }, { shape: 'square', rotate: 90 }), false)
  assert.equal(cellVisuallyEquals({ shape: 'hexagon', rotate: 60 }, { shape: 'hexagon', rotate: 120 }), true)
  // 对称图形镜像不构成差异
  assert.equal(cellVisuallyEquals({ shape: 'square', rotate: 0 }, { shape: 'square', rotate: 0, mirrorX: true }), true)
  console.log('✓ 10. 手性 flag 镜像独立 + 对称图形旋转/镜像归一通过')
}

// ---------- 11. 内部标记点渲染检查（v4.2 实测修复：点必须可见且与主体异色） ----------
{
  const markCells = formalQuestions.flatMap((q) => [q.target, ...q.options])
    .filter((c) => c.internalMarkPosition !== undefined)
  assert.ok(markCells.length >= 6, `内部点题应覆盖 3 道题 × 多选项，实际 ${markCells.length} 个点`)
  for (const cell of markCells) {
    const svg = renderOptionSvg(cell)
    assert.match(svg, /<circle[^>]*cx=/, `内部点未渲染（${cell.shape}）`)
    assert.match(svg, /fill="#ffffff"/, `内部点颜色错误（应为白色高对比）`)
    assert.match(svg, /stroke="#111827"/, `内部点缺深色描边`)
  }
  // 点 1 与点 2 渲染必须不同（坐标不同 → 像素不同）
  const q10 = formalQuestions.find((q) => q.id === 10)!
  const mark1 = q10.options.find((o) => o.internalMarkPosition === 1)
  const mark2 = q10.options.find((o) => o.internalMarkPosition === 2)
  assert.ok(mark1 && mark2, '题10 应同时含点1/点2 选项')
  assert.notEqual(renderOptionSvg(mark1!), renderOptionSvg(mark2!), '内部点 1 与 2 渲染应不同')
  // 点不越界：点边缘距中心 = 定位半径 + 点半径 < 六边形内切半径（38 单位 @78.6）
  const size = 78.6
  const markEdge = size * 0.27 + size * 0.1
  const hexInradius = size * 0.5 * Math.cos(Math.PI / 6)
  assert.ok(markEdge < hexInradius, `内部点越界风险: 点边缘 ${markEdge.toFixed(1)} ≥ 内切半径 ${hexInradius.toFixed(1)}`)
  console.log('✓ 11. 内部标记点渲染可见（白点+深描边、点1/2 互异、不越界）通过')
}

// ---------- 12. 选项洗牌正确性（v4.3：每次施测随机排列，防记位置） ----------
{
  // 模拟 Driver.convertToScaleQuestion 的映射：洗牌后 value 保留原始下标
  const shuffledByQuestion = cognitiveSelfQuestions.map((q) => ({
    id: q.id,
    correctIndex: q.correctIndex,
    values: shuffleOptions(q.options).map(({ originalIndex }) => originalIndex),
  }))

  // 每题：value 集合 = {0,1,2,3}，且含题库 correctIndex 正解
  for (const { id, correctIndex, values } of shuffledByQuestion) {
    assert.deepEqual([...values].sort((a, b) => a - b), [0, 1, 2, 3], `题 ${id} 选项 value 集合不完整`)
    assert.ok(values.includes(correctIndex), `题 ${id} 缺少正解`)
  }

  // 随机性冒烟：多次洗牌应产生多种排列（防固定顺序）
  const signatures = new Set<string>()
  for (let i = 0; i < 40; i++) {
    signatures.add(shuffleOptions(cognitiveSelfQuestions[0]!.options).map((e) => e.originalIndex).join(','))
  }
  assert.ok(signatures.size >= 2, `洗牌应产生多种排列，实际 ${signatures.size} 种`)
  console.log('✓ 12. 选项洗牌正确性（value 集合完整、正解可判、多次调用排列随机）通过')
}

console.log('cognitive-self gate test passed（门禁校验 10/11 项；第 11 项渲染尺寸为人工复核项）')
