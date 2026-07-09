import type { EquipmentCatalogGroupCode } from '@/utils/equipment-catalog-group'
import { ModuleCode, type ResourceItem } from '@/types/module'
import {
  type TrainingEntryCode,
  type TrainingEntryDefinition,
  TRAINING_ENTRY_CODES,
  getAllTrainingEntries,
  getTrainingEntry,
  getTrainingEntryCatalogGroups,
  getTrainingEntryModuleCode,
  getTrainingEntryRequiredEntitlement,
  isTrainingEntryCode,
  matchesTrainingEntryResource,
  normalizeTrainingEntryCode,
  resolveTrainingEntryCode,
  resolveTrainingEntryCodeFromEquipmentResource,
} from '@/utils/training-entry'

export const EQUIPMENT_TRAINING_ENTRY_CODES = TRAINING_ENTRY_CODES

export type EquipmentTrainingEntryCode = TrainingEntryCode

export interface EquipmentTrainingEntryDefinition extends TrainingEntryDefinition {}

export const isEquipmentTrainingEntryCode = isTrainingEntryCode
export const normalizeEquipmentTrainingEntryCode = normalizeTrainingEntryCode
export const resolveEquipmentTrainingEntryCode = resolveTrainingEntryCode
export const getAllEquipmentTrainingEntries = getAllTrainingEntries
export const getEquipmentTrainingEntry = getTrainingEntry
export const getEquipmentTrainingEntryModuleCode = getTrainingEntryModuleCode
export const getEquipmentTrainingEntryRequiredEntitlement = getTrainingEntryRequiredEntitlement
export const getEquipmentTrainingEntryCatalogGroups = getTrainingEntryCatalogGroups

const ROUTE_ENTRY_ALIASES: Record<string, EquipmentTrainingEntryCode> = {
  'sensory-training': 'sensory-integration',
  'sensory-integration': 'sensory-integration',
  'emotional-regulation': 'emotional-regulation',
  'social-communication': 'social-communication',
  'fine-motor': 'fine-motor',
  'soothing-aids': 'soothing-aids',
  'life-skills': 'life-skills',
  'cognitive': 'cognitive',
}

const UNIQUE_MODULE_ENTRY_MAP: Partial<Record<ModuleCode, EquipmentTrainingEntryCode>> = {
  [ModuleCode.SOCIAL]: 'social-communication',
  [ModuleCode.LIFE_SKILLS]: 'life-skills',
  [ModuleCode.COGNITIVE]: 'cognitive',
}

function normalizeRouteValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeEquipmentTrainingRouteEntryCode(
  value: unknown
): EquipmentTrainingEntryCode | null {
  const normalized = normalizeRouteValue(value)
  return ROUTE_ENTRY_ALIASES[normalized] || null
}

export function resolveEquipmentTrainingEntryRouteCode(
  entryValue?: unknown,
  moduleValue?: unknown
): EquipmentTrainingEntryCode | null {
  const entryCode = normalizeEquipmentTrainingRouteEntryCode(entryValue)
  if (entryCode) {
    return entryCode
  }

  const moduleCode = normalizeRouteValue(moduleValue) as ModuleCode
  return UNIQUE_MODULE_ENTRY_MAP[moduleCode] || null
}

export function resolveEquipmentTrainingEntryRouteModuleCode(
  entryValue?: unknown,
  moduleValue?: unknown
): ModuleCode | '' {
  const entryCode = resolveEquipmentTrainingEntryRouteCode(entryValue, moduleValue)
  if (entryCode) {
    return getEquipmentTrainingEntry(entryCode).moduleCode
  }

  const moduleCode = normalizeRouteValue(moduleValue)
  switch (moduleCode) {
    case ModuleCode.SENSORY:
    case ModuleCode.EMOTIONAL:
    case ModuleCode.SOCIAL:
    case ModuleCode.LIFE_SKILLS:
    case ModuleCode.COGNITIVE:
    case ModuleCode.RESOURCE:
      return moduleCode
    default:
      return ''
  }
}

export function getEquipmentTrainingEntryPrimaryCatalogGroup(
  entryValue?: unknown,
  moduleValue?: unknown
): EquipmentCatalogGroupCode {
  return getEquipmentTrainingEntry(entryValue, moduleValue).catalogGroups[0] || 'sensory-training'
}

export function resolveEquipmentTrainingEntryCodeFromResource(
  resource: Pick<ResourceItem, 'moduleCode' | 'category' | 'metadata'>
): EquipmentTrainingEntryCode {
  return resolveTrainingEntryCodeFromEquipmentResource(resource)
}

export function matchesEquipmentTrainingEntry(
  resource: Pick<ResourceItem, 'moduleCode' | 'resourceType' | 'category' | 'metadata'>,
  entryValue?: unknown,
  moduleValue?: unknown
): boolean {
  return matchesTrainingEntryResource(resource, entryValue, moduleValue)
}
