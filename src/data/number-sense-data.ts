// K05_NUMBER_SENSE 数感小铺数据：程序化 SVG 计数物皮肤 + 双模式出题器
// 模式 A（按数取物）：给数字 N，孩子点 N 个物品进筐；L3 加增减指令二段
// 模式 B（多少比较）：两组物品，选"哪边多/少/一样多"
// 计数物形状本身即冗余编码（满足 PRD §1 色彩编码冗余，不单靠颜色区分）

export type CountSkinKind = 'star' | 'apple' | 'ball'

export interface CountSkin {
  kind: CountSkinKind
  label: string
  color: string
}

export const COUNT_SKINS: CountSkin[] = [
  { kind: 'star', label: '星星', color: '#ffd43b' },
  { kind: 'apple', label: '苹果', color: '#ff6b6b' },
  { kind: 'ball', label: '皮球', color: '#4dabf7' },
]

// 模式 A 单局：目标数 + 皮肤 + 可选增减指令（L3）
export type AdjustOp = 'add' | 'remove'

export interface CountRoundSpec {
  targetNumber: number
  skin: CountSkin
  // L3 达标后追加的一段增减指令；null 表示无二段
  adjust: { op: AdjustOp; amount: number; finalNumber: number } | null
}

// 模式 B 单局：两组数量 + 提问 + 正确答案
export type CompareAnswer = 'left' | 'right' | 'equal'

export interface CompareRoundSpec {
  leftCount: number
  rightCount: number
  leftSkin: CountSkin
  rightSkin: CountSkin
  // 是否允许"一样多"作为候选（L2+）
  allowEqual: boolean
  answer: CompareAnswer
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickSkin(): CountSkin {
  return COUNT_SKINS[Math.floor(Math.random() * COUNT_SKINS.length)]!
}

// 模式 A 数字范围：L1 1–3 / L2 1–5 / L3 1–10（+ 增减指令）
export function generateCountRound(level: 1 | 2 | 3): CountRoundSpec {
  const ranges = { 1: [1, 3], 2: [1, 5], 3: [1, 10] } as const
  const [min, max] = ranges[level]
  const skin = pickSkin()

  if (level < 3) {
    return { targetNumber: randInt(min, max), skin, adjust: null }
  }

  // L3：先取一个中间量，再给增减指令得到最终目标（增减后仍落在 1–10）
  let base = randInt(2, 8)
  const op: AdjustOp = Math.random() < 0.5 ? 'add' : 'remove'
  const amount = randInt(1, 2)
  let finalNumber = op === 'add' ? base + amount : base - amount
  // 边界收敛：最终数固定在 1–10，必要时回退到 add
  if (finalNumber < 1) {
    finalNumber = base + amount
    return { targetNumber: base, skin, adjust: { op: 'add', amount, finalNumber } }
  }
  if (finalNumber > 10) {
    base = finalNumber - amount > 0 ? finalNumber - amount : base
    finalNumber = base - amount
    return { targetNumber: base, skin, adjust: { op: 'remove', amount, finalNumber } }
  }
  return { targetNumber: base, skin, adjust: { op, amount, finalNumber } }
}

// 模式 B 数量差：L1 差大仅多/少 / L2 差小加"一样多" / L3 含相等判断
export function generateCompareRound(level: 1 | 2 | 3): CompareRoundSpec {
  const leftSkin = pickSkin()
  const rightSkin = pickSkin()
  const allowEqual = level >= 2

  // L2/L3 有一定概率直接出"一样多"局
  if (allowEqual && Math.random() < (level === 3 ? 0.4 : 0.3)) {
    const n = randInt(2, level === 3 ? 8 : 5)
    return { leftCount: n, rightCount: n, leftSkin, rightSkin, allowEqual, answer: 'equal' }
  }

  const maxCount = level === 1 ? 6 : level === 2 ? 8 : 10
  const minGap = level === 1 ? 3 : 1 // L1 差大、L2/L3 差小
  let left = randInt(1, maxCount)
  let right = randInt(1, maxCount)
  while (Math.abs(left - right) < minGap) {
    left = randInt(1, maxCount)
    right = randInt(1, maxCount)
  }
  return {
    leftCount: left,
    rightCount: right,
    leftSkin,
    rightSkin,
    allowEqual,
    answer: left > right ? 'left' : 'right',
  }
}
