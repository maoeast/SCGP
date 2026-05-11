export type SelfCareCategoryFilterKey =
  | 'all'
  | 'feeding'
  | 'dressing'
  | 'toileting'
  | 'hygiene'
  | 'home'
  | 'community'

export type SelfCareTaskCategoryKey = Exclude<SelfCareCategoryFilterKey, 'all'>

export type SelfCareCategoryIconName =
  | 'Grid'
  | 'ForkSpoon'
  | 'SuitcaseLine'
  | 'ToiletPaper'
  | 'Brush'
  | 'House'
  | 'MapLocation'

export interface SelfCareCategoryFilter {
  key: SelfCareCategoryFilterKey
  label: string
  iconName: SelfCareCategoryIconName
  accentColor: string
  coverGradient: string
}

export interface SelfCareTaskCategoryLike {
  name?: string | null
  category?: string | null
  metadata?: {
    category?: {
      parentId?: number | null
      parentName?: string | null
      childName?: string | null
    } | null
    abilityItem?: {
      id?: string | null
      name?: string | null
    } | null
  } | null
}

const SELF_CARE_CATEGORY_META: Record<SelfCareTaskCategoryKey, SelfCareCategoryFilter> = {
  feeding: {
    key: 'feeding',
    label: '饮食技能',
    iconName: 'ForkSpoon',
    accentColor: '#d97706',
    coverGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(251, 191, 36, 0.32) 100%)',
  },
  dressing: {
    key: 'dressing',
    label: '穿着技能',
    iconName: 'SuitcaseLine',
    accentColor: '#0f766e',
    coverGradient: 'linear-gradient(135deg, rgba(20, 184, 166, 0.16) 0%, rgba(45, 212, 191, 0.30) 100%)',
  },
  toileting: {
    key: 'toileting',
    label: '如厕技能',
    iconName: 'ToiletPaper',
    accentColor: '#2563eb',
    coverGradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.16) 0%, rgba(96, 165, 250, 0.30) 100%)',
  },
  hygiene: {
    key: 'hygiene',
    label: '个人卫生',
    iconName: 'Brush',
    accentColor: '#16a34a',
    coverGradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(134, 239, 172, 0.28) 100%)',
  },
  home: {
    key: 'home',
    label: '居家生活',
    iconName: 'House',
    accentColor: '#a16207',
    coverGradient: 'linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(251, 191, 36, 0.26) 100%)',
  },
  community: {
    key: 'community',
    label: '社区生活',
    iconName: 'MapLocation',
    accentColor: '#7c3aed',
    coverGradient: 'linear-gradient(135deg, rgba(124, 58, 237, 0.14) 0%, rgba(167, 139, 250, 0.28) 100%)',
  },
}

export const SELF_CARE_CATEGORY_FILTERS: SelfCareCategoryFilter[] = [
  {
    key: 'all',
    label: '全部',
    iconName: 'Grid',
    accentColor: '#475569',
    coverGradient: 'linear-gradient(135deg, rgba(148, 163, 184, 0.14) 0%, rgba(203, 213, 225, 0.28) 100%)',
  },
  SELF_CARE_CATEGORY_META.feeding,
  SELF_CARE_CATEGORY_META.dressing,
  SELF_CARE_CATEGORY_META.toileting,
  SELF_CARE_CATEGORY_META.hygiene,
  SELF_CARE_CATEGORY_META.home,
  SELF_CARE_CATEGORY_META.community,
]

const PARENT_ID_TO_CATEGORY_KEY: Record<number, SelfCareTaskCategoryKey> = {
  1: 'feeding',
  2: 'dressing',
  3: 'toileting',
  4: 'hygiene',
  5: 'home',
  6: 'community',
}

const PARENT_NAME_TO_CATEGORY_KEY: Array<[SelfCareTaskCategoryKey, string[]]> = [
  ['feeding', ['饮食技能']],
  ['dressing', ['穿着技能']],
  ['toileting', ['如厕技能']],
  ['hygiene', ['个人卫生']],
  ['home', ['居家生活']],
  ['community', ['社区生活']],
]

const ABILITY_ID_PREFIX_TO_CATEGORY_KEY: Array<[SelfCareTaskCategoryKey, string]> = [
  ['feeding', 'feed_'],
  ['dressing', 'dress_'],
  ['toileting', 'toilet_'],
  ['hygiene', 'hygiene_'],
  ['home', 'home_'],
  ['community', 'community_'],
]

const TEXT_FALLBACK_MATCHERS: Array<[SelfCareTaskCategoryKey, RegExp]> = [
  ['feeding', /(勺子|筷子|杯子|吃饭|喝水)/],
  ['dressing', /(纽扣|上衣|裤子|袜子|鞋子|鞋带|穿上衣|脱上衣|穿裤子|脱裤子|穿袜子|穿鞋子)/],
  ['toileting', /(大便|小便|如厕|厕所)/],
  ['hygiene', /(刷牙|牙膏|鼻涕|梳头|洗手|洗澡|洗脸)/],
  ['home', /(叠衣服|扫地|擦桌子|书包|床铺|整理床铺|收拾书包)/],
  ['community', /(公交车|购物|过马路|问路|超市)/],
]

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function resolveCategoryKeyFromText(value: string): SelfCareTaskCategoryKey | null {
  const normalized = normalizeText(value)
  if (!normalized) {
    return null
  }

  for (const [key, labels] of PARENT_NAME_TO_CATEGORY_KEY) {
    if (labels.some((label) => normalized.includes(label))) {
      return key
    }
  }

  for (const [key, pattern] of TEXT_FALLBACK_MATCHERS) {
    if (pattern.test(normalized)) {
      return key
    }
  }

  return null
}

export function getSelfCareCategoryFilter(
  key: SelfCareCategoryFilterKey,
): SelfCareCategoryFilter | undefined {
  return SELF_CARE_CATEGORY_FILTERS.find((item) => item.key === key)
}

export function resolveSelfCareCategoryKey(task: SelfCareTaskCategoryLike): SelfCareTaskCategoryKey {
  const parentId = task.metadata?.category?.parentId
  if (typeof parentId === 'number' && PARENT_ID_TO_CATEGORY_KEY[parentId]) {
    return PARENT_ID_TO_CATEGORY_KEY[parentId]
  }

  const parentName = resolveCategoryKeyFromText(task.metadata?.category?.parentName || '')
  if (parentName) {
    return parentName
  }

  const childName = resolveCategoryKeyFromText(task.metadata?.category?.childName || '')
  if (childName) {
    return childName
  }

  const resourceCategory = resolveCategoryKeyFromText(task.category || '')
  if (resourceCategory) {
    return resourceCategory
  }

  const abilityItemId = normalizeText(task.metadata?.abilityItem?.id)
  for (const [key, prefix] of ABILITY_ID_PREFIX_TO_CATEGORY_KEY) {
    if (abilityItemId.startsWith(prefix)) {
      return key
    }
  }

  const abilityName = resolveCategoryKeyFromText(task.metadata?.abilityItem?.name || '')
  if (abilityName) {
    return abilityName
  }

  const taskName = resolveCategoryKeyFromText(task.name || '')
  if (taskName) {
    return taskName
  }

  return 'home'
}

export function buildSelfCareCategoryCounts(
  tasks: SelfCareTaskCategoryLike[],
): Record<SelfCareCategoryFilterKey, number> {
  const counts: Record<SelfCareCategoryFilterKey, number> = {
    all: tasks.length,
    feeding: 0,
    dressing: 0,
    toileting: 0,
    hygiene: 0,
    home: 0,
    community: 0,
  }

  for (const task of tasks) {
    const key = resolveSelfCareCategoryKey(task)
    counts[key] += 1
  }

  return counts
}

export function filterSelfCareTasksByCategory<T extends SelfCareTaskCategoryLike>(
  tasks: T[],
  selectedCategory: SelfCareCategoryFilterKey,
): T[] {
  if (selectedCategory === 'all') {
    return tasks
  }

  return tasks.filter((task) => resolveSelfCareCategoryKey(task) === selectedCategory)
}
