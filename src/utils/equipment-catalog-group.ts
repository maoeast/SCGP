import type { ResourceItem } from '@/types/module'
import type { PhysicalEquipmentDomain, PhysicalEquipmentResourceMeta } from '@/types/physical-equipment'

export const EQUIPMENT_CATALOG_GROUPS = [
  'sensory-training',
  'emotional-regulation',
  'social-communication',
  'life-skills',
  'fine-motor',
  'soothing-aids',
] as const

export type EquipmentCatalogGroupCode = typeof EQUIPMENT_CATALOG_GROUPS[number]

export const EQUIPMENT_CATALOG_GROUP_LABELS: Record<EquipmentCatalogGroupCode, string> = {
  'sensory-training': '感官训练',
  'emotional-regulation': '情绪调节',
  'social-communication': '社交沟通',
  'life-skills': '生活自理',
  'fine-motor': '精细动作',
  'soothing-aids': '安抚教具',
}

export const EQUIPMENT_CATALOG_GROUP_TAG_TYPES: Record<EquipmentCatalogGroupCode, '' | 'success' | 'warning' | 'danger' | 'info' | 'primary'> = {
  'sensory-training': 'primary',
  'emotional-regulation': 'danger',
  'social-communication': 'success',
  'life-skills': 'warning',
  'fine-motor': 'info',
  'soothing-aids': '',
}

interface ResourceCatalogLike {
  moduleCode?: string
  category?: string
  metadata?: unknown
}

const LIFE_SKILL_CATEGORY_SET = new Set([
  'selfcare',
  'daily_life',
])

const SOCIAL_CATEGORY_SET = new Set([
  'communication',
  'social',
  'peer_interaction',
  'peer_support',
  'school_context',
  'family_support',
])

const EMOTIONAL_CATEGORY_SET = new Set([
  'emotional',
])

const SENSORY_CATEGORY_SET = new Set([
  'tactile',
  'olfactory',
  'visual',
  'auditory',
  'gustatory',
  'proprioceptive',
  'integration',
  'oral',
  'praxis',
  'bilateralmotor',
  'mobility',
  'cognition',
])

function parsePhysicalEquipmentMetadata(metadata: unknown): Partial<PhysicalEquipmentResourceMeta> | null {
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

  return normalized as Partial<PhysicalEquipmentResourceMeta>
}

function mapPhysicalDomainToGroup(domain: PhysicalEquipmentDomain): EquipmentCatalogGroupCode {
  switch (domain) {
    case 'emotional-regulation':
      return 'emotional-regulation'
    case 'social-communication':
      return 'social-communication'
    case 'fine-motor':
      return 'fine-motor'
    case 'soothing-aids':
      return 'soothing-aids'
    case 'daily-living':
      return 'life-skills'
  }
}

export function resolveEquipmentCatalogGroupCode(resource: ResourceCatalogLike): EquipmentCatalogGroupCode {
  const metadata = parsePhysicalEquipmentMetadata(resource.metadata)
  if (metadata?.kind === 'physical_equipment' && typeof metadata.domain === 'string') {
    return mapPhysicalDomainToGroup(metadata.domain as PhysicalEquipmentDomain)
  }

  const category = (resource.category || '').trim()
  if (LIFE_SKILL_CATEGORY_SET.has(category)) {
    return 'life-skills'
  }

  if (SOCIAL_CATEGORY_SET.has(category)) {
    return 'social-communication'
  }

  if (EMOTIONAL_CATEGORY_SET.has(category)) {
    return 'emotional-regulation'
  }

  if (resource.moduleCode === 'life_skills') {
    return 'life-skills'
  }

  if (resource.moduleCode === 'social') {
    return 'social-communication'
  }

  if (resource.moduleCode === 'emotional') {
    return 'emotional-regulation'
  }

  if (SENSORY_CATEGORY_SET.has(category) || resource.moduleCode === 'sensory') {
    return 'sensory-training'
  }

  return 'sensory-training'
}

export function getEquipmentCatalogGroupLabel(resource: ResourceCatalogLike): string {
  return EQUIPMENT_CATALOG_GROUP_LABELS[resolveEquipmentCatalogGroupCode(resource)]
}

export function getEquipmentCatalogGroupTagType(resource: ResourceCatalogLike): '' | 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  return EQUIPMENT_CATALOG_GROUP_TAG_TYPES[resolveEquipmentCatalogGroupCode(resource)]
}

export function buildEquipmentCatalogGroupCounts(resources: ResourceItem[]): Record<string, number> {
  const counts: Record<string, number> = { all: resources.length }

  for (const resource of resources) {
    const groupCode = resolveEquipmentCatalogGroupCode(resource)
    counts[groupCode] = (counts[groupCode] || 0) + 1
  }

  return counts
}
