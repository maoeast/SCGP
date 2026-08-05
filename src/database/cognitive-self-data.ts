/**
 * 视知觉图形匹配筛查任务（DRAFT）— 题库与维度数据（v4）
 *
 * ⚠️ DRAFT（需专业人员审核后方可用于临床）：
 * - 自编「视空间图形匹配」绩效题，测量**视觉图形匹配表现 + 作答反应时**。
 *   呈现目标图（全程可见），从 4 个选项中选出与目标完全相同的一项；
 *   记录每题正确性 + 真反应时。
 * - 题目与常模均为草稿，无标准化效度。仅用于平台「筛查 / 发育监测 / 转介建议」，
 *   不能作为临床诊断依据；不输出 IQ / 百分位 / 标准分（见 CognitiveSelfDriver）。
 * - 设计稿：docs/planning/2026-08-05-cognitive-self-difficulty-curve-design.md（v4）
 * - 图元规格复用 crt-data 的 CrtCellSpec，由 crt-matrix.ts 程序化渲染 SVG，无外部素材。
 *
 * 维度（4 级难度，runtime code 与 DimensionScore.code / 维度映射一致）：
 * - match_basic  基础匹配：形状 / 颜色整体辨别（地板锚题）
 * - match_fine   精细辨别：方向 30° 步进 / 大小 ±8%
 * - match_cross  双属性交叉：方向差 30° / 大小差 ±8% / 近色对 / 内部点
 * - match_expert 高相似逼近：方向差 15° / 大小差 ±6% / 手性镜像 / 缺口 / 内部点 / 布局（无颜色干扰）
 *
 * 渲染规格（统一）：目标与选项图元基准外径 88 CSS px（容器 112×112）；
 * 缺口线宽约 7px、缺口角宽 24°、钟点间隔 30°（0=12 点，顺时针）；
 * 内部标记点直径约 5–6%（≈8–10px @88）、定位半径 28%、随 rotate 共同旋转。
 *
 * 正解位置：16 道正式题中 0/1/2/3 各 4 次、同一位置连续不超 2 次（构建测试验证，
 * 见 utils/cognitive-match.ts 与 tests）。
 *
 * @module database/cognitive-self-data
 */

import type { CrtCellSpec } from '@/database/crt-data'

/** 难度维度 */
export type CognitiveSelfDimension = 'basic' | 'fine' | 'cross' | 'expert'

/** 一道视空间图形匹配题 */
export interface CognitiveSelfQuestion {
  id: number
  dimension: CognitiveSelfDimension
  /** 练习题不计分（正式题前呈现，用于确认规则理解） */
  isPractice?: boolean
  /** 目标图（儿童需在选项中找到与它完全相同的一项） */
  target: CrtCellSpec
  /** 选项（含 1 正解 + 干扰项） */
  options: CrtCellSpec[]
  /** 正解选项索引（仅 Driver 内部用于判分，不进 ScaleOption，不外泄） */
  correctIndex: number
}

/** 维度定义（runtime code，与 DimensionScore.code 一致） */
export interface CognitiveSelfDimensionDef {
  code: string
  dimension: CognitiveSelfDimension
  name: string
  ability: string
}

export const cognitiveSelfDimensions: CognitiveSelfDimensionDef[] = [
  { code: 'match_basic', dimension: 'basic', name: '基础匹配', ability: '形状 / 颜色整体辨别' },
  { code: 'match_fine', dimension: 'fine', name: '精细辨别', ability: '方向 / 大小细微辨别' },
  { code: 'match_cross', dimension: 'cross', name: '双属性交叉', ability: '多属性同步锁定与干扰抑制' },
  { code: 'match_expert', dimension: 'expert', name: '高相似逼近', ability: '手性镜像 / 缺口 / 内部点 / 布局精细加工' },
]

/** 层级口语名（给老师/家长看的报告用，替代术语名） */
export const COGNITIVE_SELF_LAYER_PLAIN: Record<string, string> = {
  match_basic: '基础题（认形状、认颜色）',
  match_fine: '中等题（看方向、看大小）',
  match_cross: '较难题（几个特征要一起看）',
  match_expert: '最难题（图形细节非常接近）',
}

// ============================================================================
// 固定色板（色盲安全，全题库统一；禁止主题色名）
// ============================================================================

export const COGNITIVE_SELF_COLORS = {
  blue: '#0072B2',
  teal: '#009E73',
  orange: '#E69F00',
  yellow: '#F0E442',
  gray: '#7A7A7A',
} as const

// ============================================================================
// 题库（DRAFT：2 练习 + 16 正式题，4 选 1；难度递增；正解位置已打散并平衡）
// ============================================================================

export const cognitiveSelfQuestions: CognitiveSelfQuestion[] = [
  // ---- 练习题（不计分；与正式题零重复）----
  {
    id: -2, dimension: 'basic', isPractice: true,
    target: { shape: 'diamond', color: COGNITIVE_SELF_COLORS.gray },
    options: [
      { shape: 'diamond', color: COGNITIVE_SELF_COLORS.gray },
      { shape: 'square', color: COGNITIVE_SELF_COLORS.gray },
      { shape: 'diamond', color: COGNITIVE_SELF_COLORS.orange },
      { shape: 'star', color: COGNITIVE_SELF_COLORS.yellow },
    ],
    correctIndex: 0,
  },
  {
    id: -1, dimension: 'basic', isPractice: true,
    target: { shape: 'arrow', rotate: 0 },
    options: [
      { shape: 'arrow', rotate: 0 },
      { shape: 'arrow', rotate: 90 },
      { shape: 'arrow', rotate: 180 },
      { shape: 'arrow', rotate: 270 },
    ],
    correctIndex: 0,
  },

  // ---- L1 基础匹配（match_basic）：地板锚题 ----
  {
    id: 1, dimension: 'basic',
    target: { shape: 'circle', color: COGNITIVE_SELF_COLORS.blue },
    options: [
      { shape: 'circle', color: COGNITIVE_SELF_COLORS.blue },
      { shape: 'square', color: COGNITIVE_SELF_COLORS.blue },
      { shape: 'triangle', color: COGNITIVE_SELF_COLORS.blue },
      { shape: 'star', color: COGNITIVE_SELF_COLORS.blue },
    ],
    correctIndex: 0,
  },
  {
    id: 2, dimension: 'basic',
    target: { shape: 'square', color: COGNITIVE_SELF_COLORS.orange },
    options: [
      { shape: 'circle', color: COGNITIVE_SELF_COLORS.orange },
      { shape: 'square', color: COGNITIVE_SELF_COLORS.orange },
      { shape: 'star', color: COGNITIVE_SELF_COLORS.orange },
      { shape: 'hexagon', color: COGNITIVE_SELF_COLORS.orange },
    ],
    correctIndex: 1,
  },
  {
    id: 3, dimension: 'basic',
    target: { shape: 'triangle', color: COGNITIVE_SELF_COLORS.yellow },
    options: [
      { shape: 'triangle', color: COGNITIVE_SELF_COLORS.blue },
      { shape: 'triangle', color: COGNITIVE_SELF_COLORS.orange },
      { shape: 'triangle', color: COGNITIVE_SELF_COLORS.yellow },
      { shape: 'triangle', color: COGNITIVE_SELF_COLORS.gray },
    ],
    correctIndex: 2,
  },
  {
    id: 4, dimension: 'basic',
    target: { shape: 'star', color: COGNITIVE_SELF_COLORS.teal },
    options: [
      { shape: 'hexagon', color: COGNITIVE_SELF_COLORS.teal },
      { shape: 'diamond', color: COGNITIVE_SELF_COLORS.teal },
      { shape: 'circle', color: COGNITIVE_SELF_COLORS.teal },
      { shape: 'star', color: COGNITIVE_SELF_COLORS.teal },
    ],
    correctIndex: 3,
  },

  // ---- L2 精细辨别（match_fine）：方向 30° 步进 / 大小 ±8% ----
  {
    id: 5, dimension: 'fine',
    target: { shape: 'arrow', color: COGNITIVE_SELF_COLORS.blue, rotate: 30 },
    options: [
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.blue, rotate: 30 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.blue, rotate: 0 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.blue, rotate: 60 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.blue, rotate: 90 },
    ],
    correctIndex: 0,
  },
  {
    id: 6, dimension: 'fine',
    target: { shape: 'diamond', scale: 0.9 },
    options: [
      { shape: 'diamond', scale: 1.0 },
      { shape: 'diamond', scale: 0.9 },
      { shape: 'diamond', scale: 0.8 },
      { shape: 'diamond', scale: 1.1 },
    ],
    correctIndex: 1,
  },
  {
    id: 7, dimension: 'fine',
    target: { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 150 },
    options: [
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 120 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 180 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 150 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 90 },
    ],
    correctIndex: 2,
  },
  {
    id: 8, dimension: 'fine',
    target: { shape: 'hexagon', scale: 1.1 },
    options: [
      { shape: 'hexagon', scale: 0.9 },
      { shape: 'hexagon', scale: 1.0 },
      { shape: 'hexagon', scale: 1.2 },
      { shape: 'hexagon', scale: 1.1 },
    ],
    correctIndex: 3,
  },

  // ---- L3 双属性交叉（match_cross）：方向差 30° / 大小差 ±8% / 近色对 / 内部点 ----
  {
    id: 9, dimension: 'cross',
    target: { shape: 'arrow', color: COGNITIVE_SELF_COLORS.blue, rotate: 60, scale: 1.0 },
    options: [
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.blue, rotate: 30, scale: 1.0 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.teal, rotate: 60, scale: 1.0 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.blue, rotate: 60, scale: 0.85 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.blue, rotate: 60, scale: 1.0 },
    ],
    correctIndex: 3,
  },
  {
    id: 10, dimension: 'cross',
    target: { shape: 'hexagon', color: COGNITIVE_SELF_COLORS.blue, scale: 1.0, internalMarkPosition: 2 },
    options: [
      { shape: 'hexagon', color: COGNITIVE_SELF_COLORS.blue, scale: 1.0, internalMarkPosition: 2 },
      { shape: 'hexagon', color: COGNITIVE_SELF_COLORS.blue, scale: 1.0, internalMarkPosition: 1 },
      { shape: 'hexagon', color: COGNITIVE_SELF_COLORS.teal, scale: 1.0, internalMarkPosition: 2 },
      { shape: 'hexagon', color: COGNITIVE_SELF_COLORS.blue, scale: 0.85, internalMarkPosition: 2 },
    ],
    correctIndex: 0,
  },
  {
    id: 11, dimension: 'cross',
    target: { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 30, scale: 0.85 },
    options: [
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 60, scale: 0.85 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.yellow, rotate: 30, scale: 0.85 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 30, scale: 0.85 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 30, scale: 1.0 },
    ],
    correctIndex: 2,
  },
  {
    id: 12, dimension: 'cross',
    target: { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 30, scale: 0.85, internalMarkPosition: 6 },
    options: [
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 60, scale: 0.85, internalMarkPosition: 6 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 30, scale: 0.85, internalMarkPosition: 6 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 30, scale: 1.0, internalMarkPosition: 6 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 30, scale: 0.85, internalMarkPosition: 5 },
    ],
    correctIndex: 1,
  },

  // ---- L4 高相似逼近（match_expert）：方向差 15° / 大小差 ±6% / 手性镜像 / 缺口 / 内部点 / 布局 ----
  {
    id: 13, dimension: 'expert',
    target: { shape: 'flag', color: COGNITIVE_SELF_COLORS.blue, rotate: 30, scale: 1.0 },
    options: [
      { shape: 'flag', color: COGNITIVE_SELF_COLORS.blue, rotate: 15, scale: 1.0 },
      { shape: 'flag', color: COGNITIVE_SELF_COLORS.blue, rotate: 30, scale: 0.92 },
      { shape: 'flag', color: COGNITIVE_SELF_COLORS.blue, rotate: 30, scale: 1.0, mirrorX: true },
      { shape: 'flag', color: COGNITIVE_SELF_COLORS.blue, rotate: 30, scale: 1.0 },
    ],
    correctIndex: 3,
  },
  {
    id: 14, dimension: 'expert',
    target: { shape: 'ring', color: COGNITIVE_SELF_COLORS.blue, gapPosition: 2 },
    options: [
      { shape: 'ring', color: COGNITIVE_SELF_COLORS.blue, gapPosition: 2 },
      { shape: 'ring', color: COGNITIVE_SELF_COLORS.blue, gapPosition: 1 },
      { shape: 'ring', color: COGNITIVE_SELF_COLORS.blue, gapPosition: 3 },
      { shape: 'ring', color: COGNITIVE_SELF_COLORS.blue, gapPosition: 10 },
    ],
    correctIndex: 0,
  },
  {
    id: 15, dimension: 'expert',
    target: { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 165, scale: 1.0, internalMarkPosition: 3 },
    options: [
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 150, scale: 1.0, internalMarkPosition: 3 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 165, scale: 0.92, internalMarkPosition: 3 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 165, scale: 1.0, internalMarkPosition: 3 },
      { shape: 'arrow', color: COGNITIVE_SELF_COLORS.orange, rotate: 165, scale: 1.0, internalMarkPosition: 2 },
    ],
    correctIndex: 2,
  },
  {
    id: 16, dimension: 'expert',
    target: {
      shape: 'arrow', color: COGNITIVE_SELF_COLORS.blue, rotate: 30,
      secondary: { shape: 'diamond', color: COGNITIVE_SELF_COLORS.blue },
      layout: 'diagonal_down',
    },
    options: [
      {
        shape: 'arrow', color: COGNITIVE_SELF_COLORS.blue, rotate: 30,
        secondary: { shape: 'diamond', color: COGNITIVE_SELF_COLORS.blue },
        layout: 'swapped_diagonal_down',
      },
      {
        shape: 'arrow', color: COGNITIVE_SELF_COLORS.blue, rotate: 30,
        secondary: { shape: 'diamond', color: COGNITIVE_SELF_COLORS.blue },
        layout: 'diagonal_down',
      },
      {
        shape: 'arrow', color: COGNITIVE_SELF_COLORS.blue, rotate: 30,
        secondary: { shape: 'diamond', color: COGNITIVE_SELF_COLORS.blue },
        layout: 'diagonal_up',
      },
      {
        shape: 'arrow', color: COGNITIVE_SELF_COLORS.blue, rotate: 45,
        secondary: { shape: 'diamond', color: COGNITIVE_SELF_COLORS.blue },
        layout: 'diagonal_down',
      },
    ],
    correctIndex: 1,
  },
]

// ============================================================================
// 层级定义（等权计分；无人工权重，见设计稿 §5）
// ============================================================================

/** 层级权重（v4：全部等权 1；保留表结构供未来 IRT 校准后替换） */
export const cognitiveSelfLevelWeights: Record<CognitiveSelfDimension, number> = {
  basic: 1,
  fine: 1,
  cross: 1,
  expert: 1,
}
