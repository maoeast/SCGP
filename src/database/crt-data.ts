/**
 * 瑞文 CRT 图形推理测验 — 题库与计分数据
 *
 * 基于瑞文标准推理测验（SPM）结构：
 * - 60 道图形推理题，分为 A-E 五组（每组 12 题），难度递增
 * - 3×3 矩阵缺一角，6 选 1（选项 A-F）
 * - 五组推理类型：A 知觉辨别、B 类同比较、C 比较推理、D 系列关系、E 抽象推理
 * - 用于平台「筛查 / 发育监测 / 转介建议」，不能作为临床诊断依据
 *
 * 注：本模块同时导出 CrtCellSpec / CrtShape 类型供其他模块（如 cognitive-self-data）
 * 程序化生成 SVG 图形使用，这些类型不用于瑞文 CRT 本身（CRT 已改用真实图片素材）。
 *
 * @module database/crt-data
 */

/** SPM 五组 */
export type CrtUnit = 'A' | 'B' | 'C' | 'D' | 'E'

// ============================================================================
// SVG 图形生成类型（供其他模块使用，CRT 本身不再使用）
// ============================================================================

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
  | 'ring'
  | 'flag'

/** 双图元排列方式（配合 secondary 使用，显式坐标生成，禁止整体 SVG mirror） */
export type CrtCellLayout = 'diagonal_down' | 'diagonal_up' | 'swapped_diagonal_down'

/** 矩阵一格的图元规格 */
export interface CrtCellSpec {
  shape: CrtShape
  /** 主题色名（primary/red/green/orange/purple/gray）或具体色值。
   *  视知觉图形匹配筛查任务（cognitive_self）一律使用固定 HEX（见 cognitive-self-data.ts 色板），禁用主题色名。 */
  color?: string
  /** 旋转角度（0/90/180/270，主要 arrow/triangle 用；筛查任务支持任意角度如 15/30/45/60/150/165） */
  rotate?: number
  /** 同格内图元数量（>1 时横向排列） */
  count?: number
  /** 大小比例 0.5-1.5 */
  scale?: number
  /** 水平镜像（仅对非对称图形生效，如 flag；对称图形按对称等价表归一） */
  mirrorX?: boolean
  /** 垂直镜像 */
  mirrorY?: boolean
  /** 缺口圆环的缺口方位（钟面 0–11，0=12 点方向，顺时针递增；仅 shape='ring' 生效） */
  gapPosition?: number
  /** 图形内部标记点（小圆点）方位（钟面 0–11，随 rotate 共同旋转） */
  internalMarkPosition?: number
  /** 双图元组合：与主图元共同排列（布局题） */
  secondary?: Pick<CrtCellSpec, 'shape' | 'color' | 'rotate' | 'scale' | 'mirrorX'>
  /** 双图元排列方式（有 secondary 时生效） */
  layout?: CrtCellLayout
}

/** 一道瑞文矩阵题 */
export interface CrtQuestion {
  id: number
  unit: CrtUnit
  /** 题干图片路径（相对于 assets/resources/images/raven60/） */
  imagePath: string
  /** 6 个选项（A-F） */
  options: {
    label: string
    /** 选项图片路径 */
    imagePath: string
  }[]
  /** 正解选项索引 0-5（对应 A-F，仅 Driver 内部用于判分） */
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
// 题库（60 题，基于瑞文标准推理测验图片素材）
// ============================================================================

/**
 * 答案映射表（完整 60 题答案，A=0, B=1, C=2, D=3, E=4, F=5）
 */
const ANSWER_MAP: Record<string, number> = {
  // A组（题1-12）：D,E,A,B,F,C,F,B,A,C,D,E
  '1': 3,  '2': 4,  '3': 0,  '4': 1,  '5': 5,  '6': 2,  '7': 5,  '8': 1,  '9': 0, '10': 2, '11': 3, '12': 4,
  // B组（题13-24）：B,F,A,B,A,C,E,F,D,C,D,E
  '13': 1, '14': 5, '15': 0, '16': 1, '17': 0, '18': 2, '19': 4, '20': 5, '21': 3, '22': 2, '23': 3, '24': 4,
  // C组（题25-36）：F,B,C,F,E,D,E,A,E,F,A,B
  '25': 5, '26': 1, '27': 2, '28': 5, '29': 4, '30': 3, '31': 4, '32': 0, '33': 4, '34': 5, '35': 0, '36': 1,
  // D组（题37-48）：C,D,C,E,F,F,E,D,A,B,E,F
  '37': 2, '38': 3, '39': 2, '40': 4, '41': 5, '42': 5, '43': 4, '44': 3, '45': 0, '46': 1, '47': 4, '48': 5,
  // E组（题49-60）：E,F,F,B,A,E,A,F,C,B,D,E
  '49': 4, '50': 5, '51': 5, '52': 1, '53': 0, '54': 4, '55': 0, '56': 5, '57': 2, '58': 1, '59': 3, '60': 4,
}

/** 生成题目（通用工厂函数） */
function createQuestion(id: number, unit: CrtUnit): CrtQuestion {
  const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F']
  return {
    id,
    unit,
    imagePath: `IQ-${id}.png`,
    options: optionLabels.map((label) => ({
      label,
      imagePath: `IQ-${id}-${label}.png`,
    })),
    correctIndex: ANSWER_MAP[id.toString()] ?? 0,
  }
}

export const crtQuestions: CrtQuestion[] = [
  // ---- A 组：知觉辨别（题 1-12）----
  ...Array.from({ length: 12 }, (_, i) => createQuestion(i + 1, 'A')),

  // ---- B 组：类同比较（题 13-24）----
  ...Array.from({ length: 12 }, (_, i) => createQuestion(i + 13, 'B')),

  // ---- C 组：比较推理（题 25-36）----
  ...Array.from({ length: 12 }, (_, i) => createQuestion(i + 25, 'C')),

  // ---- D 组：系列关系（题 37-48）----
  ...Array.from({ length: 12 }, (_, i) => createQuestion(i + 37, 'D')),

  // ---- E 组：抽象推理（题 49-60）----
  ...Array.from({ length: 12 }, (_, i) => createQuestion(i + 49, 'E')),
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
