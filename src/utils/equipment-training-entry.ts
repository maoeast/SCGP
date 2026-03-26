import { ModuleCode, type ResourceItem } from '@/types/module'
import {
  type EquipmentCatalogGroupCode,
  resolveEquipmentCatalogGroupCode,
} from '@/utils/equipment-catalog-group'

export const EQUIPMENT_TRAINING_ENTRY_CODES = [
  'sensory-integration',
  'emotional-regulation',
  'social-communication',
  'fine-motor',
  'soothing-aids',
  'life-skills',
] as const

export type EquipmentTrainingEntryCode = typeof EQUIPMENT_TRAINING_ENTRY_CODES[number]

export interface EquipmentTrainingEntryDefinition {
  code: EquipmentTrainingEntryCode
  name: string
  description: string
  moduleCode: ModuleCode
  catalogGroups: EquipmentCatalogGroupCode[]
  icon: string
  themeColor: string
}

const EQUIPMENT_TRAINING_ENTRY_DEFINITIONS: Record<EquipmentTrainingEntryCode, EquipmentTrainingEntryDefinition> = {
  'sensory-integration': {
    code: 'sensory-integration',
    name: '感官统合训练',
    description: '围绕传统感官器材与感觉统合训练资源开展快速录入。',
    moduleCode: ModuleCode.SENSORY,
    catalogGroups: ['sensory-training'],
    icon: 'MagicStick',
    themeColor: '#67c23a',
  },
  'emotional-regulation': {
    code: 'emotional-regulation',
    name: '情绪调节',
    description: '围绕情绪调节器材开展快速录入。',
    moduleCode: ModuleCode.EMOTIONAL,
    catalogGroups: ['emotional-regulation'],
    icon: 'Sunny',
    themeColor: '#e6a23c',
  },
  'social-communication': {
    code: 'social-communication',
    name: '社交沟通',
    description: '围绕社交沟通器材开展快速录入。',
    moduleCode: ModuleCode.SOCIAL,
    catalogGroups: ['social-communication'],
    icon: 'ChatDotRound',
    themeColor: '#409eff',
  },
  'fine-motor': {
    code: 'fine-motor',
    name: '精细动作',
    description: '围绕精细动作器材开展快速录入。',
    moduleCode: ModuleCode.SENSORY,
    catalogGroups: ['fine-motor'],
    icon: 'Operation',
    themeColor: '#27ae60',
  },
  'soothing-aids': {
    code: 'soothing-aids',
    name: '安抚教具',
    description: '围绕安抚教具开展快速录入。',
    moduleCode: ModuleCode.EMOTIONAL,
    catalogGroups: ['soothing-aids'],
    icon: 'MoonNight',
    themeColor: '#8e44ad',
  },
  'life-skills': {
    code: 'life-skills',
    name: '生活自理',
    description: '围绕生活自理器材开展快速录入。',
    moduleCode: ModuleCode.LIFE_SKILLS,
    catalogGroups: ['life-skills'],
    icon: 'House',
    themeColor: '#d97706',
  },
}

const LEGACY_ENTRY_ALIASES: Record<string, EquipmentTrainingEntryCode> = {
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

const CATALOG_GROUP_ENTRY_MAP: Record<EquipmentCatalogGroupCode, EquipmentTrainingEntryCode> = {
  'sensory-training': 'sensory-integration',
  'emotional-regulation': 'emotional-regulation',
  'social-communication': 'social-communication',
  'fine-motor': 'fine-motor',
  'soothing-aids': 'soothing-aids',
  'life-skills': 'life-skills',
}

export function isEquipmentTrainingEntryCode(value: unknown): value is EquipmentTrainingEntryCode {
  return typeof value === 'string' && value in EQUIPMENT_TRAINING_ENTRY_DEFINITIONS
}

export function normalizeEquipmentTrainingEntryCode(value: unknown): EquipmentTrainingEntryCode | null {
  if (typeof value !== 'string') {
    return null
  }

  return LEGACY_ENTRY_ALIASES[value.trim()] || null
}

export function resolveEquipmentTrainingEntryCode(
  entryValue?: unknown,
  moduleValue?: unknown
): EquipmentTrainingEntryCode {
  return normalizeEquipmentTrainingEntryCode(entryValue)
    || normalizeEquipmentTrainingEntryCode(moduleValue)
    || 'sensory-integration'
}

export function getAllEquipmentTrainingEntries(): EquipmentTrainingEntryDefinition[] {
  return EQUIPMENT_TRAINING_ENTRY_CODES.map((code) => EQUIPMENT_TRAINING_ENTRY_DEFINITIONS[code])
}

export function getEquipmentTrainingEntry(
  entryValue?: unknown,
  moduleValue?: unknown
): EquipmentTrainingEntryDefinition {
  return EQUIPMENT_TRAINING_ENTRY_DEFINITIONS[resolveEquipmentTrainingEntryCode(entryValue, moduleValue)]
}

export function getEquipmentTrainingEntryModuleCode(
  entryValue?: unknown,
  moduleValue?: unknown
): ModuleCode {
  return getEquipmentTrainingEntry(entryValue, moduleValue).moduleCode
}

export function getEquipmentTrainingEntryCatalogGroups(
  entryValue?: unknown,
  moduleValue?: unknown
): EquipmentCatalogGroupCode[] {
  return getEquipmentTrainingEntry(entryValue, moduleValue).catalogGroups
}

export function getEquipmentTrainingEntryPrimaryCatalogGroup(
  entryValue?: unknown,
  moduleValue?: unknown
): EquipmentCatalogGroupCode {
  return getEquipmentTrainingEntry(entryValue, moduleValue).catalogGroups[0] || 'sensory-training'
}

export function resolveEquipmentTrainingEntryCodeFromResource(resource: Pick<ResourceItem, 'moduleCode' | 'category' | 'metadata'>): EquipmentTrainingEntryCode {
  return CATALOG_GROUP_ENTRY_MAP[resolveEquipmentCatalogGroupCode(resource)] || 'sensory-integration'
}

export function matchesEquipmentTrainingEntry(
  resource: Pick<ResourceItem, 'moduleCode' | 'category' | 'metadata'>,
  entryValue?: unknown,
  moduleValue?: unknown
): boolean {
  const allowedGroups = new Set(getEquipmentTrainingEntryCatalogGroups(entryValue, moduleValue))
  return allowedGroups.has(resolveEquipmentCatalogGroupCode(resource))
}
