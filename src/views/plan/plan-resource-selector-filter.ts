import type { ResourceItem } from '../../types/module'

const TASK_TRAINING_RESOURCE_TYPE = 'task_training'

export const PLAN_RESOURCE_SELECTOR_MODULE_OPTIONS = [
  { value: 'all', label: '全部模块' },
  { value: 'task-training', label: '自理训练' },
  { value: 'life-skills', label: '生活自理' },
  { value: 'emotion-scene', label: '情绪场景' },
  { value: 'care-scene', label: '表达关心' },
  { value: 'sensory-training', label: '感官训练' },
  { value: 'emotional-regulation', label: '情绪调节' },
  { value: 'soothing-aids', label: '安抚教具' },
  { value: 'social-communication', label: '社交沟通' },
  { value: 'fine-motor', label: '精细动作' },
] as const

export const PLAN_RESOURCE_SELECTOR_TYPE_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: 'game', label: '游戏' },
  { value: 'equipment', label: '器材' },
] as const

export type PlanResourceSelectorModuleFilter =
  typeof PLAN_RESOURCE_SELECTOR_MODULE_OPTIONS[number]['value']

export type PlanResourceSelectorTypeFilter =
  typeof PLAN_RESOURCE_SELECTOR_TYPE_OPTIONS[number]['value']

export function resolvePlanResourceSelectorModuleFilter(
  resource: Pick<ResourceItem, 'moduleCode' | 'resourceType' | 'category' | 'metadata'>
): Exclude<PlanResourceSelectorModuleFilter, 'all'> {
  if (resource.resourceType === TASK_TRAINING_RESOURCE_TYPE) {
    return 'task-training'
  }

  if (resource.resourceType === 'emotion_scene') {
    return 'emotion-scene'
  }

  if (resource.resourceType === 'care_scene') {
    return 'care-scene'
  }

  switch (resolveBusinessGroupCode(resource)) {
    case 'life-skills':
      return 'life-skills'
    case 'emotional-regulation':
      return 'emotional-regulation'
    case 'soothing-aids':
      return 'soothing-aids'
    case 'social-communication':
      return 'social-communication'
    case 'fine-motor':
      return 'fine-motor'
    case 'sensory-training':
    case 'emotional-behavior':
    default:
      return 'sensory-training'
  }
}

export function resolvePlanResourceSelectorDisplayType(
  resource: Pick<ResourceItem, 'resourceType'>
): Exclude<PlanResourceSelectorTypeFilter, 'all'> | null {
  if (resource.resourceType === 'equipment') {
    return 'equipment'
  }

  if (
    resource.resourceType === 'game'
    || resource.resourceType === 'emotion_scene'
    || resource.resourceType === 'care_scene'
    || resource.resourceType === TASK_TRAINING_RESOURCE_TYPE
  ) {
    return 'game'
  }

  return null
}

export function filterPlanResourceSelectorItems(
  resources: ResourceItem[],
  filters: {
    moduleFilter: PlanResourceSelectorModuleFilter
    typeFilter: PlanResourceSelectorTypeFilter
  }
): ResourceItem[] {
  return resources.filter((resource) => {
    const displayType = resolvePlanResourceSelectorDisplayType(resource)
    if (!displayType) {
      return false
    }

    if (filters.typeFilter !== 'all' && displayType !== filters.typeFilter) {
      return false
    }

    if (filters.moduleFilter === 'all') {
      return true
    }

    return resolvePlanResourceSelectorModuleFilter(resource) === filters.moduleFilter
  })
}

type BusinessGroupCode =
  | 'sensory-training'
  | 'emotional-behavior'
  | 'emotional-regulation'
  | 'social-communication'
  | 'fine-motor'
  | 'life-skills'
  | 'soothing-aids'

type PhysicalEquipmentDomain =
  | 'emotional-regulation'
  | 'social-communication'
  | 'fine-motor'
  | 'soothing-aids'
  | 'daily-living'

interface PhysicalEquipmentResourceMetaLike {
  kind?: string
  domain?: string
}

interface TrainingEntryMetadataLike {
  entryCode?: string
  trainingEntryCode?: string
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

function parseMetadata<T extends object>(metadata: unknown): T | null {
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

  return normalized as T
}

function resolveEquipmentBusinessGroup(
  resource: Pick<ResourceItem, 'moduleCode' | 'category' | 'metadata'>
): Exclude<BusinessGroupCode, 'emotional-behavior'> {
  const metadata = parseMetadata<PhysicalEquipmentResourceMetaLike>(resource.metadata)
  if (metadata?.kind === 'physical_equipment' && typeof metadata.domain === 'string') {
    switch (metadata.domain as PhysicalEquipmentDomain) {
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

  const category = String(resource.category || '').trim()

  if (LIFE_SKILL_CATEGORY_SET.has(category) || resource.moduleCode === 'life_skills') {
    return 'life-skills'
  }

  if (SOCIAL_CATEGORY_SET.has(category) || resource.moduleCode === 'social') {
    return 'social-communication'
  }

  if (EMOTIONAL_CATEGORY_SET.has(category) || resource.moduleCode === 'emotional') {
    return 'emotional-regulation'
  }

  if (SENSORY_CATEGORY_SET.has(category) || resource.moduleCode === 'sensory') {
    return 'sensory-training'
  }

  return 'sensory-training'
}

function resolveTrainingEntryCodeFromMetadata(metadata: unknown): string | null {
  const parsed = parseMetadata<TrainingEntryMetadataLike>(metadata)
  const entryCode = parsed?.trainingEntryCode || parsed?.entryCode
  return typeof entryCode === 'string' && entryCode.trim()
    ? entryCode.trim()
    : null
}

function mapEntryCodeToBusinessGroup(entryCode: string | null): BusinessGroupCode {
  switch (entryCode) {
    case 'emotional-regulation':
      return 'emotional-regulation'
    case 'social-communication':
      return 'social-communication'
    case 'fine-motor':
      return 'fine-motor'
    case 'soothing-aids':
      return 'soothing-aids'
    case 'life-skills':
      return 'life-skills'
    case 'sensory-integration':
    default:
      return 'sensory-training'
  }
}

function resolveBusinessGroupCode(
  resource: Pick<ResourceItem, 'moduleCode' | 'resourceType' | 'category' | 'metadata'>
): BusinessGroupCode {
  if (resource.resourceType === 'emotion_scene' || resource.resourceType === 'care_scene') {
    return 'emotional-behavior'
  }

  if (resource.resourceType === 'equipment') {
    return resolveEquipmentBusinessGroup(resource)
  }

  const metadataEntryCode = resolveTrainingEntryCodeFromMetadata(resource.metadata)
  if (metadataEntryCode) {
    return mapEntryCodeToBusinessGroup(metadataEntryCode)
  }

  switch (resource.moduleCode) {
    case 'emotional':
      return 'emotional-regulation'
    case 'social':
      return 'social-communication'
    case 'life_skills':
      return 'life-skills'
    case 'sensory':
    default:
      return 'sensory-training'
  }
}
