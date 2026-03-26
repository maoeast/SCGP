import type { ResourceItem } from '@/types/module'
import type { PhysicalEquipmentResourceMeta } from '@/types/physical-equipment'

type EquipmentCategoryLike = Pick<ResourceItem, 'category' | 'metadata'>

interface EquipmentSourceCategoryMetadata extends Partial<PhysicalEquipmentResourceMeta> {
  original_sub_category?: string
  source_module?: string
}

const LEGACY_SOURCE_CATEGORY_LABELS: Record<string, string> = {
  '触觉材料套装': '触觉',
  '味嗅觉材料套装': '味嗅觉',
  '视觉材料套装': '视觉',
  '听觉材料套装': '听觉',
  '本体觉材料套装': '本体觉',
  '综合训练材料套装': '综合训练',
}

const CATEGORY_FALLBACK_LABELS: Record<string, string> = {
  tactile: '触觉',
  olfactory: '味嗅觉',
  gustatory: '味嗅觉',
  visual: '视觉',
  auditory: '听觉',
  proprioceptive: '本体觉',
  integration: '综合训练',
}

const FIXED_CATEGORY_ORDER = [
  '触觉',
  '味嗅觉',
  '视觉',
  '听觉',
  '本体觉',
  '综合训练',
] as const

function parseMetadata(metadata: unknown): EquipmentSourceCategoryMetadata | null {
  let normalized = metadata

  if (typeof normalized === 'string') {
    try {
      normalized = JSON.parse(normalized)
    } catch {
      return null
    }
  }

  if (!normalized || typeof normalized !== 'object') {
    return null
  }

  return normalized as EquipmentSourceCategoryMetadata
}

function normalizeSourceCategoryLabel(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  const normalized = value.trim()
  return LEGACY_SOURCE_CATEGORY_LABELS[normalized] || normalized
}

export function resolveEquipmentSourceCategory(resource: EquipmentCategoryLike): string {
  const metadata = parseMetadata(resource.metadata)
  const metadataCategory = normalizeSourceCategoryLabel(metadata?.sourceCategory)
  if (metadataCategory) {
    return metadataCategory
  }

  const legacyCategory = normalizeSourceCategoryLabel(
    metadata?.original_sub_category || metadata?.source_module
  )
  if (legacyCategory) {
    return legacyCategory
  }

  const category = typeof resource.category === 'string' ? resource.category.trim() : ''
  return CATEGORY_FALLBACK_LABELS[category] || category || '未分类'
}

export function buildEquipmentSourceCategoryCounts(resources: ResourceItem[]): Record<string, number> {
  const counts: Record<string, number> = { all: resources.length }

  for (const resource of resources) {
    const category = resolveEquipmentSourceCategory(resource)
    counts[category] = (counts[category] || 0) + 1
  }

  return counts
}

export function sortEquipmentSourceCategoryKeys(categories: string[]): string[] {
  const orderMap = new Map<string, number>(FIXED_CATEGORY_ORDER.map((label, index) => [label, index]))

  return [...categories].sort((left, right) => {
    const leftOrder = orderMap.get(left)
    const rightOrder = orderMap.get(right)

    if (leftOrder !== undefined || rightOrder !== undefined) {
      return (leftOrder ?? Number.MAX_SAFE_INTEGER) - (rightOrder ?? Number.MAX_SAFE_INTEGER)
    }

    return left.localeCompare(right, 'zh-Hans-CN')
  })
}
