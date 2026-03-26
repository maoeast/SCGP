import type { EquipmentCatalogGroupCode } from '@/utils/equipment-catalog-group'
import type { ResourceItem } from '@/types/module'
import {
  type TrainingEntryCode,
  type TrainingEntryDefinition,
  TRAINING_ENTRY_CODES,
  getAllTrainingEntries,
  getTrainingEntry,
  getTrainingEntryCatalogGroups,
  getTrainingEntryModuleCode,
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
export const getEquipmentTrainingEntryCatalogGroups = getTrainingEntryCatalogGroups

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
