/**
 * 瑞文 CRT 图形推理测验 — 题库与计分数据（DRAFT）
 *
 * ⚠️ DRAFT（重要，需专业人员审核后方可用于临床）：
 * - 按 SPM 标准的「题目结构 + 五组推理规律类型」自编**原创几何矩阵占位题**，
 *   **非**瑞文标准图（Pearson 版权）。题目与常模均为草稿，无标准化效度。
 * - 仅用于平台「筛查 / 发育监测 / 转介建议」，不能作为临床诊断依据。
 * - 矩阵图元由 crt-matrix.ts 按规格程序化生成（SVG），无外部素材依赖。
 *
 * 五组（SPM A–E，难度递增）：
 * - A 知觉辨别（连续变化：图元数量沿行/列递增）
 * - B 类同比较（每行同一形状 / 同一颜色）
 * - C 比较推理（每行每列每形状各出现一次，数独逻辑）
 * - D 系列关系（图元沿行旋转 0/90/180）
 * - E 抽象推理（简化：每行第三格数量 = 前两格之和）
 *
 * @module database/crt-data
 */

/** SPM 五组 */
export type CrtUnit = 'A' | 'B' | 'C' | 'D' | 'E'

/** 可代码绘制的几何图元 */
export type CrtShape =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'hexagon'
  | 'arrow'
  | 'dot'

/** 矩阵一格的图元规格 */
export interface CrtCellSpec {
  shape: CrtShape
  /** 主题色名（primary/red/green/orange/purple/gray）或具体色值 */
  color?: string
  /** 旋转角度（0/90/180/270，主要 arrow/triangle 用） */
  rotate?: number
  /** 同格内图元数量（>1 时横向排列） */
  count?: number
  /** 大小比例 0.5-1.5 */
  scale?: number
}

/** 一道瑞文矩阵题 */
export interface CrtQuestion {
  id: number
  unit: CrtUnit
  /** 3×3=9 格，索引 8（右下角）恒为 null = 缺失 */
  matrix: (CrtCellSpec | null)[]
  /** 6 个选项图元 */
  options: CrtCellSpec[]
  /** 正解选项索引 0-5（仅 Driver 内部用于判分，不进 ScaleOption） */
  correctIndex: number
}

/** 维度定义（runtime code，与 DimensionScore.code 一致） */
export interface CrtUnitDef {
  code: string
  unit: CrtUnit
  name: string
  ability: string
}

export const crtUnitDefs: CrtUnitDef[] = [
  { code: 'unit_a', unit: 'A', name: 'A 组', ability: '知觉辨别' },
  { code: 'unit_b', unit: 'B', name: 'B 组', ability: '类同比较' },
  { code: 'unit_c', unit: 'C', name: 'C 组', ability: '比较推理' },
  { code: 'unit_d', unit: 'D', name: 'D 组', ability: '系列关系' },
  { code: 'unit_e', unit: 'E', name: 'E 组', ability: '抽象推理' },
]

// ============================================================================
// 题库（DRAFT：五组各 1-2 道示例，规律可程序化验证）
// ============================================================================

export const crtQuestions: CrtQuestion[] = [
  // ---- A 组：连续变化（图元数量沿行递增 1→2→3）----
  {
    id: 1,
    unit: 'A',
    matrix: [
      { shape: 'dot', count: 1 }, { shape: 'dot', count: 2 }, { shape: 'dot', count: 3 },
      { shape: 'dot', count: 1 }, { shape: 'dot', count: 2 }, { shape: 'dot', count: 3 },
      { shape: 'dot', count: 1 }, { shape: 'dot', count: 2 }, null,
    ],
    options: [
      { shape: 'dot', count: 3 }, // 正解
      { shape: 'dot', count: 1 },
      { shape: 'dot', count: 2 },
      { shape: 'dot', count: 4 },
      { shape: 'square', count: 3 }, // 形状干扰
      { shape: 'dot', count: 5 },
    ],
    correctIndex: 0,
  },
  {
    id: 2,
    unit: 'A',
    matrix: [
      { shape: 'square', count: 1 }, { shape: 'square', count: 2 }, { shape: 'square', count: 3 },
      { shape: 'square', count: 2 }, { shape: 'square', count: 3 }, { shape: 'square', count: 4 },
      { shape: 'square', count: 3 }, { shape: 'square', count: 4 }, null,
    ],
    options: [
      { shape: 'square', count: 5 }, // 正解（行+列各+1 → (2,2)=5）
      { shape: 'square', count: 3 },
      { shape: 'square', count: 4 },
      { shape: 'square', count: 6 },
      { shape: 'circle', count: 5 },
      { shape: 'square', count: 2 },
    ],
    correctIndex: 0,
  },

  // ---- B 组：类同比较（每行同一形状）----
  {
    id: 3,
    unit: 'B',
    matrix: [
      { shape: 'circle' }, { shape: 'circle' }, { shape: 'circle' },
      { shape: 'square' }, { shape: 'square' }, { shape: 'square' },
      { shape: 'triangle' }, { shape: 'triangle' }, null,
    ],
    options: [
      { shape: 'triangle' }, // 正解
      { shape: 'circle' },
      { shape: 'square' },
      { shape: 'diamond' },
      { shape: 'star' },
      { shape: 'hexagon' },
    ],
    correctIndex: 0,
  },
  {
    id: 4,
    unit: 'B',
    matrix: [
      { shape: 'circle', color: 'red' }, { shape: 'circle', color: 'red' }, { shape: 'circle', color: 'red' },
      { shape: 'circle', color: 'green' }, { shape: 'circle', color: 'green' }, { shape: 'circle', color: 'green' },
      { shape: 'circle', color: 'orange' }, { shape: 'circle', color: 'orange' }, null,
    ],
    options: [
      { shape: 'circle', color: 'orange' }, // 正解
      { shape: 'circle', color: 'red' },
      { shape: 'circle', color: 'green' },
      { shape: 'circle', color: 'purple' },
      { shape: 'circle', color: 'gray' },
      { shape: 'circle', color: 'primary' },
    ],
    correctIndex: 0,
  },

  // ---- C 组：比较推理（每行每列每形状各一次，数独逻辑）----
  {
    id: 5,
    unit: 'C',
    matrix: [
      { shape: 'circle' }, { shape: 'square' }, { shape: 'triangle' },
      { shape: 'square' }, { shape: 'triangle' }, { shape: 'circle' },
      { shape: 'triangle' }, { shape: 'circle' }, null,
    ],
    options: [
      { shape: 'square' }, // 正解（第三列已有三角、圆，缺方）
      { shape: 'circle' },
      { shape: 'triangle' },
      { shape: 'diamond' },
      { shape: 'hexagon' },
      { shape: 'star' },
    ],
    correctIndex: 0,
  },

  // ---- D 组：系列关系（沿行旋转 0/90/180）----
  {
    id: 6,
    unit: 'D',
    matrix: [
      { shape: 'arrow', rotate: 0 }, { shape: 'arrow', rotate: 90 }, { shape: 'arrow', rotate: 180 },
      { shape: 'arrow', rotate: 0 }, { shape: 'arrow', rotate: 90 }, { shape: 'arrow', rotate: 180 },
      { shape: 'arrow', rotate: 0 }, { shape: 'arrow', rotate: 90 }, null,
    ],
    options: [
      { shape: 'arrow', rotate: 180 }, // 正解
      { shape: 'arrow', rotate: 0 },
      { shape: 'arrow', rotate: 90 },
      { shape: 'arrow', rotate: 270 },
      { shape: 'triangle', rotate: 180 },
      { shape: 'arrow', rotate: 45 },
    ],
    correctIndex: 0,
  },

  // ---- E 组：抽象推理（简化：每行第三格 count = 前两格之和）----
  {
    id: 7,
    unit: 'E',
    matrix: [
      { shape: 'dot', count: 1 }, { shape: 'dot', count: 2 }, { shape: 'dot', count: 3 },
      { shape: 'dot', count: 2 }, { shape: 'dot', count: 3 }, { shape: 'dot', count: 5 },
      { shape: 'dot', count: 1 }, { shape: 'dot', count: 4 }, null,
    ],
    options: [
      { shape: 'dot', count: 5 }, // 正解（1+4=5）
      { shape: 'dot', count: 3 },
      { shape: 'dot', count: 4 },
      { shape: 'dot', count: 6 },
      { shape: 'dot', count: 2 },
      { shape: 'square', count: 5 },
    ],
    correctIndex: 0,
  },
]

// ============================================================================
// IQ 等级（IQ 越高 = 推理能力越强）
// ============================================================================

export interface CrtLevel {
  minIq: number
  level: string
  levelCode: string
  description: string
}

export const crtLevels: CrtLevel[] = [
  { minIq: 0, level: '明显落后', levelCode: 'delayed', description: '推理能力显著低于同龄典型水平，建议进一步专业评估' },
  { minIq: 80, level: '边缘水平', levelCode: 'borderline', description: '推理能力处于边缘水平，建议关注并提供针对性练习' },
  { minIq: 90, level: '典型水平', levelCode: 'average', description: '推理能力处于同龄典型范围' },
  { minIq: 110, level: '中上水平', levelCode: 'high_average', description: '推理能力高于典型水平' },
  { minIq: 120, level: '优秀', levelCode: 'superior', description: '推理能力优秀' },
  { minIq: 130, level: '极优秀', levelCode: 'very_superior', description: '推理能力极为优秀' },
]

// ============================================================================
// 按等级的反馈建议
// ============================================================================

export interface CrtRecommendation {
  level: string
  general_comment: string
  suggestions: string[]
}

export const crtRecommendations: CrtRecommendation[] = [
  {
    level: '明显落后',
    general_comment:
      '该儿童图形推理能力显著低于同龄典型水平，可能影响抽象思维与问题解决，建议进一步专业评估。',
    suggestions: [
      '建议转介具备资质的心理 / 发育行为专业机构进行系统评估',
      '从具象到抽象，提供大量图形配对、分类、排序的视觉推理练习',
      '在专业指导下制定个体化认知支持计划，定期追踪进展',
    ],
  },
  {
    level: '边缘水平',
    general_comment:
      '该儿童图形推理能力处于边缘水平，部分抽象推理任务存在困难，可通过结构化练习提升。',
    suggestions: [
      '提供由易到难的图形规律、矩阵补全类视觉推理练习',
      '在日常生活与学习中多用「找规律、找不同、分类排序」活动',
      '关注工作记忆与注意力基础，配合执行功能支持',
    ],
  },
  {
    level: '典型水平',
    general_comment: '该儿童图形推理能力处于同龄典型范围，抽象思维与问题解决能力发展正常。',
    suggestions: [
      '继续保持适度的思维挑战，提供进阶的图形与逻辑推理活动',
      '鼓励探索模式、规律、空间关系类游戏与任务',
    ],
  },
  {
    level: '中上水平',
    general_comment: '该儿童图形推理能力高于典型水平，抽象思维发展良好。',
    suggestions: [
      '提供更具挑战性的逻辑推理、空间想象与模式识别任务',
      '鼓励参与策略类、建构类、科学探究类活动以发挥优势',
    ],
  },
  {
    level: '优秀',
    general_comment: '该儿童图形推理能力优秀，抽象思维与模式识别能力突出。',
    suggestions: [
      '提供高阶逻辑、数学推理与创造性问题解决挑战',
      '可考虑拓展课程，进一步发展认知潜能',
    ],
  },
  {
    level: '极优秀',
    general_comment: '该儿童图形推理能力极为优秀，处于同龄人群的极高水平。',
    suggestions: [
      '提供深度拓展与加速学习机会，避免因任务过易而失去兴趣',
      '关注社会情感发展，帮助其将认知优势转化为综合素养',
    ],
  },
]
