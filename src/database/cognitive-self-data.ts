/**
 * 综合认知自测（视空间·图形匹配）— 题库与计分数据（DRAFT）
 *
 * ⚠️ DRAFT（重要，需专业人员审核后方可用于临床）：
 * - 自编「视空间图形匹配」占位绩效题，测量**视觉辨别 + 加工速度**。
 *   呈现目标图，从干扰项中选出与目标完全相同的一项；记录每题正确性 + 真反应时。
 * - 题目与常模均为草稿，无标准化效度。仅用于平台「筛查 / 发育监测 / 转介建议」，
 *   不能作为临床诊断依据。
 * - 图元规格复用 crt-data 的 CrtCellSpec，由 crt-matrix.ts 程序化渲染 SVG，无外部素材。
 * - 与 CRT（图形推理补全）不同：本量表是「找相同」匹配任务，偏加工速度而非推理。
 *
 * 维度（按难度分组，runtime code 与 DimensionScore.code / 维度映射一致）：
 * - match_basic 基础辨别：干扰项形状 / 颜色显著不同
 * - match_detail 细节辨别：需辨别旋转方向 / 图元数量 / 大小比例
 *
 * @module database/cognitive-self-data
 */

import type { CrtCellSpec } from '@/database/crt-data'

/** 难度维度 */
export type CognitiveSelfDimension = 'basic' | 'detail'

/** 一道视空间图形匹配题 */
export interface CognitiveSelfQuestion {
  id: number
  dimension: CognitiveSelfDimension
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
  { code: 'match_basic', dimension: 'basic', name: '基础辨别', ability: '形状 / 颜色视觉辨别' },
  { code: 'match_detail', dimension: 'detail', name: '细节辨别', ability: '方向 / 数量 / 大小精细辨别' },
]

// ============================================================================
// 题库（DRAFT：12 题，4 选 1；难度递增；正解位置打散避免固定偏好）
// ============================================================================

export const cognitiveSelfQuestions: CognitiveSelfQuestion[] = [
  // ---- 基础辨别（match_basic）：干扰项形状显著不同 ----
  {
    id: 1, dimension: 'basic',
    target: { shape: 'circle', color: 'red' },
    options: [
      { shape: 'circle', color: 'red' },
      { shape: 'square', color: 'red' },
      { shape: 'triangle', color: 'red' },
      { shape: 'star', color: 'red' },
    ],
    correctIndex: 0,
  },
  {
    id: 2, dimension: 'basic',
    target: { shape: 'square', color: 'primary' },
    options: [
      { shape: 'circle', color: 'primary' },
      { shape: 'star', color: 'primary' },
      { shape: 'square', color: 'primary' },
      { shape: 'hexagon', color: 'primary' },
    ],
    correctIndex: 2,
  },
  {
    id: 3, dimension: 'basic',
    target: { shape: 'triangle', color: 'green' },
    options: [
      { shape: 'diamond', color: 'green' },
      { shape: 'triangle', color: 'green' },
      { shape: 'circle', color: 'green' },
      { shape: 'square', color: 'green' },
    ],
    correctIndex: 1,
  },
  {
    id: 4, dimension: 'basic',
    target: { shape: 'star', color: 'orange' },
    options: [
      { shape: 'hexagon', color: 'orange' },
      { shape: 'circle', color: 'orange' },
      { shape: 'diamond', color: 'orange' },
      { shape: 'star', color: 'orange' },
    ],
    correctIndex: 3,
  },
  // ---- 基础辨别（match_basic）：颜色辨别（同形状不同颜色）----
  {
    id: 5, dimension: 'basic',
    target: { shape: 'circle', color: 'red' },
    options: [
      { shape: 'circle', color: 'green' },
      { shape: 'circle', color: 'red' },
      { shape: 'circle', color: 'primary' },
      { shape: 'circle', color: 'orange' },
    ],
    correctIndex: 1,
  },
  {
    id: 6, dimension: 'basic',
    target: { shape: 'hexagon', color: 'purple' },
    options: [
      { shape: 'square', color: 'purple' },
      { shape: 'triangle', color: 'purple' },
      { shape: 'hexagon', color: 'purple' },
      { shape: 'star', color: 'purple' },
    ],
    correctIndex: 2,
  },
  // ---- 细节辨别（match_detail）：方向辨别（同形状不同旋转）----
  {
    id: 7, dimension: 'detail',
    target: { shape: 'arrow', rotate: 90 },
    options: [
      { shape: 'arrow', rotate: 90 },
      { shape: 'arrow', rotate: 0 },
      { shape: 'arrow', rotate: 180 },
      { shape: 'arrow', rotate: 270 },
    ],
    correctIndex: 0,
  },
  {
    id: 8, dimension: 'detail',
    target: { shape: 'triangle', rotate: 180 },
    options: [
      { shape: 'triangle', rotate: 0 },
      { shape: 'triangle', rotate: 90 },
      { shape: 'triangle', rotate: 180 },
      { shape: 'triangle', rotate: 270 },
    ],
    correctIndex: 2,
  },
  // ---- 细节辨别（match_detail）：数量辨别（同形状不同图元数）----
  {
    id: 9, dimension: 'detail',
    target: { shape: 'dot', count: 3 },
    options: [
      { shape: 'dot', count: 1 },
      { shape: 'dot', count: 3 },
      { shape: 'dot', count: 5 },
      { shape: 'dot', count: 2 },
    ],
    correctIndex: 1,
  },
  {
    id: 10, dimension: 'detail',
    target: { shape: 'square', count: 2 },
    options: [
      { shape: 'square', count: 4 },
      { shape: 'square', count: 1 },
      { shape: 'square', count: 3 },
      { shape: 'square', count: 2 },
    ],
    correctIndex: 3,
  },
  // ---- 细节辨别（match_detail）：大小辨别（同形状不同比例）----
  {
    id: 11, dimension: 'detail',
    target: { shape: 'diamond', scale: 0.7 },
    options: [
      { shape: 'diamond', scale: 0.7 },
      { shape: 'diamond', scale: 1 },
      { shape: 'diamond', scale: 1.3 },
      { shape: 'diamond', scale: 0.5 },
    ],
    correctIndex: 0,
  },
  {
    id: 12, dimension: 'detail',
    target: { shape: 'arrow', rotate: 0 },
    options: [
      { shape: 'arrow', rotate: 180 },
      { shape: 'arrow', rotate: 90 },
      { shape: 'arrow', rotate: 0 },
      { shape: 'arrow', rotate: 270 },
    ],
    correctIndex: 2,
  },
]

// ============================================================================
// IQ 等级（IQ 越高 = 视空间辨别与加工速度越强；与 crtLevels 同结构便于报告复用）
// ============================================================================

export interface CognitiveSelfLevel {
  minIq: number
  level: string
  levelCode: string
  description: string
}

export const cognitiveSelfLevels: CognitiveSelfLevel[] = [
  { minIq: 0, level: '明显落后', levelCode: 'delayed', description: '视空间辨别与加工速度显著低于同龄典型水平，建议进一步专业评估' },
  { minIq: 80, level: '边缘水平', levelCode: 'borderline', description: '视空间辨别处于边缘水平，建议关注并提供针对性练习' },
  { minIq: 90, level: '典型水平', levelCode: 'average', description: '视空间辨别与加工速度处于同龄典型范围' },
  { minIq: 110, level: '中上水平', levelCode: 'high_average', description: '视空间辨别高于典型水平' },
  { minIq: 120, level: '优秀', levelCode: 'superior', description: '视空间辨别与加工速度优秀' },
  { minIq: 130, level: '极优秀', levelCode: 'very_superior', description: '视空间辨别能力极为优秀' },
]

// ============================================================================
// 按等级的反馈建议
// ============================================================================

export interface CognitiveSelfRecommendation {
  level: string
  general_comment: string
  suggestions: string[]
}

export const cognitiveSelfRecommendations: CognitiveSelfRecommendation[] = [
  {
    level: '明显落后',
    general_comment:
      '该儿童视空间辨别与加工速度显著低于同龄典型水平，可能影响阅读、书写、方位判断等日常学习任务，建议进一步专业评估。',
    suggestions: [
      '建议转介具备资质的心理 / 发育行为专业机构进行系统评估',
      '从大颗粒、高对比的图形配对入手，逐步缩小差异、提升复杂度',
      '在专业指导下制定个体化视知觉支持计划，定期追踪进展',
    ],
  },
  {
    level: '边缘水平',
    general_comment:
      '该儿童视空间辨别处于边缘水平，部分精细辨别任务（方向 / 数量 / 大小）存在困难，可通过结构化练习提升。',
    suggestions: [
      '提供由易到难的「找相同、找不同、图形配对」视觉辨别练习',
      '在日常活动中融入方位词、数量比较、大小排序等任务',
      '关注注意力基础，配合执行功能与加工速度训练',
    ],
  },
  {
    level: '典型水平',
    general_comment: '该儿童视空间辨别与加工速度处于同龄典型范围，视觉认知发展正常。',
    suggestions: [
      '继续保持适度的视觉辨别挑战，提供进阶的配对与分类活动',
      '鼓励参与拼图、建构、迷宫等空间关系类游戏',
    ],
  },
  {
    level: '中上水平',
    general_comment: '该儿童视空间辨别高于典型水平，视觉加工效率良好。',
    suggestions: [
      '提供更具挑战性的复杂图形辨别、空间推理任务',
      '鼓励参与建构类、美术类、科学探究类活动以发挥优势',
    ],
  },
  {
    level: '优秀',
    general_comment: '该儿童视空间辨别与加工速度优秀，视觉信息处理快速准确。',
    suggestions: [
      '提供高阶空间推理、几何图形与快速决策类挑战',
      '可考虑拓展课程，进一步发展视知觉与认知潜能',
    ],
  },
  {
    level: '极优秀',
    general_comment: '该儿童视空间辨别能力极为优秀，处于同龄人群的极高水平。',
    suggestions: [
      '提供深度拓展与加速学习机会，避免因任务过易而失去兴趣',
      '关注综合素养发展，帮助其将视知觉优势转化为学习能力',
    ],
  },
]
