import { ModuleCode, type ResourceItem } from '@/types/module'
import {
  type EquipmentCatalogGroupCode,
  resolveEquipmentCatalogGroupCode,
} from '@/utils/equipment-catalog-group'

export const TRAINING_ENTRY_CODES = [
  'sensory-integration',
  'emotional-regulation',
  'social-communication',
  'fine-motor',
  'soothing-aids',
  'life-skills',
] as const

export type TrainingEntryCode = typeof TRAINING_ENTRY_CODES[number]

export interface TrainingEntryDefinition {
  code: TrainingEntryCode
  name: string
  description: string
  moduleCode: ModuleCode
  catalogGroups: EquipmentCatalogGroupCode[]
  icon: string
  themeColor: string
}

interface ResourceMetadataLike {
  entryCode?: string
  trainingEntryCode?: string
}

const TRAINING_ENTRY_DEFINITIONS: Record<TrainingEntryCode, TrainingEntryDefinition> = {
  'sensory-integration': {
    code: 'sensory-integration',
    name: '感官统合训练',
    description: '围绕感官统合主链开展游戏训练、器材训练与训练记录。',
    moduleCode: ModuleCode.SENSORY,
    catalogGroups: ['sensory-training'],
    icon: 'MagicStick',
    themeColor: '#67c23a',
  },
  'emotional-regulation': {
    code: 'emotional-regulation',
    name: '情绪调节',
    description: '围绕情绪调节主链开展游戏训练、器材训练与训练记录。',
    moduleCode: ModuleCode.EMOTIONAL,
    catalogGroups: ['emotional-regulation'],
    icon: 'Sunny',
    themeColor: '#e6a23c',
  },
  'social-communication': {
    code: 'social-communication',
    name: '社交沟通',
    description: '围绕社交沟通主链开展游戏训练、器材训练与训练记录。',
    moduleCode: ModuleCode.SOCIAL,
    catalogGroups: ['social-communication'],
    icon: 'ChatDotRound',
    themeColor: '#409eff',
  },
  'fine-motor': {
    code: 'fine-motor',
    name: '精细动作',
    description: '围绕精细动作主链开展游戏训练、器材训练与训练记录。',
    moduleCode: ModuleCode.SENSORY,
    catalogGroups: ['fine-motor'],
    icon: 'Operation',
    themeColor: '#27ae60',
  },
  'soothing-aids': {
    code: 'soothing-aids',
    name: '安抚教具',
    description: '围绕安抚教具体系开展游戏训练、器材训练与训练记录。',
    moduleCode: ModuleCode.EMOTIONAL,
    catalogGroups: ['soothing-aids'],
    icon: 'MoonNight',
    themeColor: '#8e44ad',
  },
  'life-skills': {
    code: 'life-skills',
    name: '生活自理',
    description: '围绕生活自理主链开展游戏训练、器材训练与训练记录。',
    moduleCode: ModuleCode.LIFE_SKILLS,
    catalogGroups: ['life-skills'],
    icon: 'House',
    themeColor: '#d97706',
  },
}

const LEGACY_ENTRY_ALIASES: Record<string, TrainingEntryCode> = {
  sensory: 'sensory-integration',
  'sensory-training': 'sensory-integration',
  'sensory-integration': 'sensory-integration',
  emotional: 'emotional-regulation',
  'emotional-regulation': 'emotional-regulation',
  social: 'social-communication',
  'social-communication': 'social-communication',
  'fine-motor': 'fine-motor',
  'soothing-aids': 'soothing-aids',
  life_skills: 'life-skills',
  'life-skills': 'life-skills',
}

const CATALOG_GROUP_ENTRY_MAP: Record<EquipmentCatalogGroupCode, TrainingEntryCode> = {
  'sensory-training': 'sensory-integration',
  'emotional-regulation': 'emotional-regulation',
  'social-communication': 'social-communication',
  'fine-motor': 'fine-motor',
  'soothing-aids': 'soothing-aids',
  'life-skills': 'life-skills',
}

function parseMetadata(metadata: unknown): ResourceMetadataLike | null {
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

  return normalized as ResourceMetadataLike
}

export function isTrainingEntryCode(value: unknown): value is TrainingEntryCode {
  return typeof value === 'string' && value in TRAINING_ENTRY_DEFINITIONS
}

export function normalizeTrainingEntryCode(value: unknown): TrainingEntryCode | null {
  if (typeof value !== 'string') {
    return null
  }

  return LEGACY_ENTRY_ALIASES[value.trim()] || null
}

export function resolveTrainingEntryCode(
  entryValue?: unknown,
  moduleValue?: unknown
): TrainingEntryCode {
  return normalizeTrainingEntryCode(entryValue)
    || normalizeTrainingEntryCode(moduleValue)
    || 'sensory-integration'
}

export function getAllTrainingEntries(): TrainingEntryDefinition[] {
  return TRAINING_ENTRY_CODES.map((code) => TRAINING_ENTRY_DEFINITIONS[code])
}

export function getTrainingEntry(
  entryValue?: unknown,
  moduleValue?: unknown
): TrainingEntryDefinition {
  return TRAINING_ENTRY_DEFINITIONS[resolveTrainingEntryCode(entryValue, moduleValue)]
}

export function getTrainingEntryModuleCode(
  entryValue?: unknown,
  moduleValue?: unknown
): ModuleCode {
  return getTrainingEntry(entryValue, moduleValue).moduleCode
}

export function getTrainingEntryCatalogGroups(
  entryValue?: unknown,
  moduleValue?: unknown
): EquipmentCatalogGroupCode[] {
  return getTrainingEntry(entryValue, moduleValue).catalogGroups
}

export function resolveTrainingEntryCodeFromEquipmentResource(
  resource: Pick<ResourceItem, 'moduleCode' | 'category' | 'metadata'>
): TrainingEntryCode {
  return CATALOG_GROUP_ENTRY_MAP[resolveEquipmentCatalogGroupCode(resource)] || 'sensory-integration'
}

export function resolveTrainingEntryCodeFromGameResource(
  resource: Pick<ResourceItem, 'moduleCode' | 'resourceType' | 'metadata'>
): TrainingEntryCode {
  const metadata = parseMetadata(resource.metadata)
  const metadataEntryCode = normalizeTrainingEntryCode(
    metadata?.trainingEntryCode || metadata?.entryCode
  )
  if (metadataEntryCode) {
    return metadataEntryCode
  }

  if (resource.resourceType === 'emotion_scene' || resource.resourceType === 'care_scene') {
    return 'emotional-regulation'
  }

  switch (resource.moduleCode) {
    case ModuleCode.EMOTIONAL:
      return 'emotional-regulation'
    case ModuleCode.SOCIAL:
      return 'social-communication'
    case ModuleCode.LIFE_SKILLS:
      return 'life-skills'
    case ModuleCode.SENSORY:
    default:
      return 'sensory-integration'
  }
}

export function resolveTrainingEntryCodeFromResource(
  resource: Pick<ResourceItem, 'moduleCode' | 'resourceType' | 'category' | 'metadata'>
): TrainingEntryCode {
  if (resource.resourceType === 'equipment') {
    return resolveTrainingEntryCodeFromEquipmentResource(resource)
  }

  return resolveTrainingEntryCodeFromGameResource(resource)
}

export function matchesTrainingEntryResource(
  resource: Pick<ResourceItem, 'moduleCode' | 'resourceType' | 'category' | 'metadata'>,
  entryValue?: unknown,
  moduleValue?: unknown
): boolean {
  return resolveTrainingEntryCodeFromResource(resource) === resolveTrainingEntryCode(entryValue, moduleValue)
}
