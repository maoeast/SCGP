// K04_ODD_ONE_OUT 语义归类数据：贴纸图物品库（assets/resources/images/cognitive/items/），按类别组织，供组件按难度抽题
export interface OddItem {
  id: string
  label: string
  category: string
  functionTags: string[]
  /** 对应 assets/resources/images/cognitive/items/{imageKey}.png */
  imageKey: string
}

export interface OddRoundSpec {
  items: OddItem[]
  oddItemId: string
  rationale?: string
}

// L1：大类混合（动物/植物/食物/交通/日用品），3 选 1，找出与另外两个大类不同的那个
const L1_ITEMS: OddItem[] = [
  { id: 'l1-cat', label: '猫', category: 'animal', functionTags: [], imageKey: 'cat' },
  { id: 'l1-dog', label: '狗', category: 'animal', functionTags: [], imageKey: 'dog' },
  { id: 'l1-rabbit', label: '兔子', category: 'animal', functionTags: [], imageKey: 'rabbit' },
  { id: 'l1-rose', label: '玫瑰', category: 'plant', functionTags: [], imageKey: 'rose' },
  { id: 'l1-sunflower', label: '向日葵', category: 'plant', functionTags: [], imageKey: 'sunflower' },
  { id: 'l1-tree', label: '大树', category: 'plant', functionTags: [], imageKey: 'tree' },
  { id: 'l1-apple', label: '苹果', category: 'food', functionTags: [], imageKey: 'apple' },
  { id: 'l1-banana', label: '香蕉', category: 'food', functionTags: [], imageKey: 'banana' },
  { id: 'l1-bread', label: '面包', category: 'food', functionTags: [], imageKey: 'bread' },
  { id: 'l1-car', label: '汽车', category: 'vehicle', functionTags: [], imageKey: 'car' },
  { id: 'l1-bus', label: '公交车', category: 'vehicle', functionTags: [], imageKey: 'bus' },
  { id: 'l1-bike', label: '自行车', category: 'vehicle', functionTags: [], imageKey: 'bike' },
  { id: 'l1-cup', label: '杯子', category: 'daily', functionTags: [], imageKey: 'cup' },
  { id: 'l1-chair', label: '椅子', category: 'daily', functionTags: [], imageKey: 'chair' },
  { id: 'l1-towel', label: '毛巾', category: 'daily', functionTags: [], imageKey: 'towel' },
]

// L2：细分类别（同大类"动物"下再细分猫科/植物等），4 选 1
const L2_ITEMS: OddItem[] = [
  { id: 'l2-cat', label: '猫', category: 'pet-mammal', functionTags: [], imageKey: 'cat' },
  { id: 'l2-dog', label: '狗', category: 'pet-mammal', functionTags: [], imageKey: 'dog' },
  { id: 'l2-rabbit2', label: '兔子', category: 'pet-mammal', functionTags: [], imageKey: 'rabbit' },
  { id: 'l2-rose2', label: '玫瑰', category: 'flower', functionTags: [], imageKey: 'rose' },
  { id: 'l2-tulip', label: '郁金香', category: 'flower', functionTags: [], imageKey: 'tulip' },
  { id: 'l2-lily', label: '百合', category: 'flower', functionTags: [], imageKey: 'lily' },
  { id: 'l2-apple2', label: '苹果', category: 'fruit', functionTags: [], imageKey: 'apple' },
  { id: 'l2-pear', label: '梨', category: 'fruit', functionTags: [], imageKey: 'pear' },
  { id: 'l2-grape', label: '葡萄', category: 'fruit', functionTags: [], imageKey: 'grape' },
  { id: 'l2-carrot', label: '胡萝卜', category: 'vegetable', functionTags: [], imageKey: 'carrot' },
  { id: 'l2-tomato', label: '番茄', category: 'vegetable', functionTags: [], imageKey: 'tomato' },
  { id: 'l2-potato', label: '土豆', category: 'vegetable', functionTags: [], imageKey: 'potato' },
]

// L3：功能/抽象维度（跨大类，按"会不会飞"等功能属性归类），5 选 1，正确答案需附归类理由
const L3_ITEMS: OddItem[] = [
  { id: 'l3-plane', label: '飞机', category: 'transport', functionTags: ['flies'], imageKey: 'plane' },
  { id: 'l3-bird', label: '小鸟', category: 'animal', functionTags: ['flies'], imageKey: 'bird' },
  { id: 'l3-butterfly', label: '蝴蝶', category: 'insect', functionTags: ['flies'], imageKey: 'butterfly' },
  { id: 'l3-kite', label: '风筝', category: 'toy', functionTags: ['flies'], imageKey: 'kite' },
  { id: 'l3-fish', label: '鱼', category: 'animal', functionTags: ['swims'], imageKey: 'fish' },

  { id: 'l3-boat', label: '小船', category: 'transport', functionTags: ['floats'], imageKey: 'boat' },
  { id: 'l3-duck', label: '鸭子', category: 'animal', functionTags: ['floats'], imageKey: 'duck' },
  { id: 'l3-lifebuoy', label: '救生圈', category: 'daily', functionTags: ['floats'], imageKey: 'lifebuoy' },
  { id: 'l3-leaf', label: '树叶', category: 'plant', functionTags: ['floats'], imageKey: 'leaf' },
  { id: 'l3-rock', label: '石头', category: 'nature', functionTags: ['sinks'], imageKey: 'rock' },
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
