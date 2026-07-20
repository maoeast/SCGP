// K04_ODD_ONE_OUT 语义归类数据：程序化 SVG 图标库，按类别组织，供组件按难度抽题
export type OddShapeKind =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'star'
  | 'hexagon'
  | 'diamond'
  | 'pentagon'
  | 'heart'

export interface OddItem {
  id: string
  label: string
  category: string
  functionTags: string[]
  shape: OddShapeKind
  color: string
}

export interface OddRoundSpec {
  items: OddItem[]
  oddItemId: string
  rationale?: string
}

// L1：大类混合（动物/植物/食物/交通/日用品），3 选 1，找出与另外两个大类不同的那个
const L1_ITEMS: OddItem[] = [
  { id: 'l1-cat', label: '猫', category: 'animal', functionTags: [], shape: 'circle', color: '#ff9f43' },
  { id: 'l1-dog', label: '狗', category: 'animal', functionTags: [], shape: 'circle', color: '#ffa94d' },
  { id: 'l1-rabbit', label: '兔子', category: 'animal', functionTags: [], shape: 'circle', color: '#ffb74d' },
  { id: 'l1-rose', label: '玫瑰', category: 'plant', functionTags: [], shape: 'pentagon', color: '#ff6b81' },
  { id: 'l1-sunflower', label: '向日葵', category: 'plant', functionTags: [], shape: 'pentagon', color: '#ffd43b' },
  { id: 'l1-tree', label: '大树', category: 'plant', functionTags: [], shape: 'pentagon', color: '#51cf66' },
  { id: 'l1-apple', label: '苹果', category: 'food', functionTags: [], shape: 'circle', color: '#ff6b6b' },
  { id: 'l1-banana', label: '香蕉', category: 'food', functionTags: [], shape: 'diamond', color: '#ffe066' },
  { id: 'l1-bread', label: '面包', category: 'food', functionTags: [], shape: 'square', color: '#e8b06a' },
  { id: 'l1-car', label: '汽车', category: 'vehicle', functionTags: [], shape: 'square', color: '#4dabf7' },
  { id: 'l1-bus', label: '公交车', category: 'vehicle', functionTags: [], shape: 'square', color: '#339af0' },
  { id: 'l1-bike', label: '自行车', category: 'vehicle', functionTags: [], shape: 'triangle', color: '#22b8cf' },
  { id: 'l1-cup', label: '杯子', category: 'daily', functionTags: [], shape: 'hexagon', color: '#9775fa' },
  { id: 'l1-chair', label: '椅子', category: 'daily', functionTags: [], shape: 'hexagon', color: '#845ef7' },
  { id: 'l1-towel', label: '毛巾', category: 'daily', functionTags: [], shape: 'square', color: '#748ffc' },
]

// L2：细分类别（同大类"动物"下再细分猫科/植物等），4 选 1
const L2_ITEMS: OddItem[] = [
  { id: 'l2-cat', label: '猫', category: 'pet-mammal', functionTags: [], shape: 'circle', color: '#ff9f43' },
  { id: 'l2-dog', label: '狗', category: 'pet-mammal', functionTags: [], shape: 'circle', color: '#ffa94d' },
  { id: 'l2-rabbit2', label: '兔子', category: 'pet-mammal', functionTags: [], shape: 'circle', color: '#ffb74d' },
  { id: 'l2-rose2', label: '玫瑰', category: 'flower', functionTags: [], shape: 'pentagon', color: '#ff6b81' },
  { id: 'l2-tulip', label: '郁金香', category: 'flower', functionTags: [], shape: 'pentagon', color: '#f783ac' },
  { id: 'l2-lily', label: '百合', category: 'flower', functionTags: [], shape: 'pentagon', color: '#eebefa' },
  { id: 'l2-apple2', label: '苹果', category: 'fruit', functionTags: [], shape: 'circle', color: '#ff6b6b' },
  { id: 'l2-pear', label: '梨', category: 'fruit', functionTags: [], shape: 'circle', color: '#c0eb75' },
  { id: 'l2-grape', label: '葡萄', category: 'fruit', functionTags: [], shape: 'circle', color: '#9775fa' },
  { id: 'l2-carrot', label: '胡萝卜', category: 'vegetable', functionTags: [], shape: 'triangle', color: '#ff922b' },
  { id: 'l2-tomato', label: '番茄', category: 'vegetable', functionTags: [], shape: 'circle', color: '#fa5252' },
  { id: 'l2-potato', label: '土豆', category: 'vegetable', functionTags: [], shape: 'diamond', color: '#d9a86c' },
]

// L3：功能/抽象维度（跨大类，按"会不会飞"等功能属性归类），5 选 1，正确答案需附归类理由
const L3_ITEMS: OddItem[] = [
  { id: 'l3-plane', label: '飞机', category: 'transport', functionTags: ['flies'], shape: 'triangle', color: '#4dabf7' },
  { id: 'l3-bird', label: '小鸟', category: 'animal', functionTags: ['flies'], shape: 'triangle', color: '#66d9e8' },
  { id: 'l3-butterfly', label: '蝴蝶', category: 'insect', functionTags: ['flies'], shape: 'triangle', color: '#e599f7' },
  { id: 'l3-kite', label: '风筝', category: 'toy', functionTags: ['flies'], shape: 'diamond', color: '#ffd43b' },
  { id: 'l3-fish', label: '鱼', category: 'animal', functionTags: ['swims'], shape: 'circle', color: '#3bc9db' },

  { id: 'l3-boat', label: '小船', category: 'transport', functionTags: ['floats'], shape: 'triangle', color: '#4dabf7' },
  { id: 'l3-duck', label: '鸭子', category: 'animal', functionTags: ['floats'], shape: 'circle', color: '#ffe066' },
  { id: 'l3-lifebuoy', label: '救生圈', category: 'daily', functionTags: ['floats'], shape: 'hexagon', color: '#ff8787' },
  { id: 'l3-leaf', label: '树叶', category: 'plant', functionTags: ['floats'], shape: 'pentagon', color: '#69db7c' },
  { id: 'l3-rock', label: '石头', category: 'nature', functionTags: ['sinks'], shape: 'square', color: '#868e96' },
]

const L3_RATIONALE: Record<string, string> = {
  'l3-fish': '其他几个都会飞哦，鱼是在水里游的。',
  'l3-rock': '其他几个都能浮在水面上，石头会沉下去。',
}

function pickRandom<T>(list: T[], count: number): T[] {
  const pool = [...list]
  const picked: T[] = []
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(idx, 1)[0]!)
  }
  return picked
}

function buildMixedCategoryRound(items: OddItem[], choiceCount: number): OddRoundSpec {
  const byCategory = new Map<string, OddItem[]>()
  for (const item of items) {
    const bucket = byCategory.get(item.category) ?? []
    bucket.push(item)
    byCategory.set(item.category, bucket)
  }
  // 只挑「陪衬项数量够」的类别当主类别（需 choiceCount-1 个同类项），保证能凑出「N 个同类 + 1 个异类」
  const categories = [...byCategory.keys()]
  const eligibleMainCategories = categories.filter(
    (c) => (byCategory.get(c)?.length ?? 0) >= choiceCount - 1,
  )
  const mainCategory = eligibleMainCategories[Math.floor(Math.random() * eligibleMainCategories.length)]!
  // 异类从其余任意类别里选一个
  const oddCategories = categories.filter((c) => c !== mainCategory)
  const oddCategory = oddCategories[Math.floor(Math.random() * oddCategories.length)]!

  // 主类别里取 choiceCount-1 个同类项，异类别里取 1 个落单项
  const mainItems = pickRandom(byCategory.get(mainCategory) ?? [], choiceCount - 1)
  const oddItem = pickRandom(byCategory.get(oddCategory) ?? [], 1)[0]!

  const roundItems = shuffle([oddItem, ...mainItems])
  return { items: roundItems, oddItemId: oddItem.id }
}

function buildFunctionTagRound(items: OddItem[], choiceCount: number): OddRoundSpec {
  const byTag = new Map<string, OddItem[]>()
  for (const item of items) {
    for (const tag of item.functionTags) {
      const bucket = byTag.get(tag) ?? []
      bucket.push(item)
      byTag.set(tag, bucket)
    }
  }
  const tags = [...byTag.keys()].filter((tag) => (byTag.get(tag)?.length ?? 0) >= choiceCount - 1)
  const mainTag = tags[Math.floor(Math.random() * tags.length)]!
  const mainPool = byTag.get(mainTag) ?? []
  const mainItems = pickRandom(mainPool, choiceCount - 1)

  const oddPool = items.filter((it) => !it.functionTags.includes(mainTag) && !mainItems.includes(it))
  const oddItem = pickRandom(oddPool, 1)[0] ?? items.find((it) => !mainItems.includes(it))!

  const roundItems = shuffle([oddItem, ...mainItems])
  return { items: roundItems, oddItemId: oddItem.id, rationale: L3_RATIONALE[oddItem.id] }
}

function shuffle<T>(list: T[]): T[] {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

export function generateOddOneOutRound(level: 1 | 2 | 3): OddRoundSpec {
  if (level === 1) {
    return buildMixedCategoryRound(L1_ITEMS, 3)
  }
  if (level === 2) {
    return buildMixedCategoryRound(L2_ITEMS, 4)
  }
  return buildFunctionTagRound(L3_ITEMS, 5)
}
