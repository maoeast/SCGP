import { ModuleCode, type ResourceItem } from '@/types/module'
import {
  EQUIPMENT_CATALOG_GROUPS,
  EQUIPMENT_CATALOG_GROUP_LABELS,
  type EquipmentCatalogGroupCode,
  resolveEquipmentCatalogGroupCode,
} from '@/utils/equipment-catalog-group'
import { resolveTrainingEntryCodeFromResource } from '@/utils/training-entry'

export const TEACHING_MATERIAL_DIMENSION_CODES = EQUIPMENT_CATALOG_GROUPS

export type TeachingMaterialDimensionCode = EquipmentCatalogGroupCode

export const TEACHING_MATERIAL_DIMENSION_MODULE_MAP: Record<TeachingMaterialDimensionCode, ModuleCode> = {
  'sensory-training': ModuleCode.SENSORY,
  'emotional-regulation': ModuleCode.EMOTIONAL,
  'social-communication': ModuleCode.SOCIAL,
  'life-skills': ModuleCode.LIFE_SKILLS,
  'fine-motor': ModuleCode.SENSORY,
  'soothing-aids': ModuleCode.EMOTIONAL,
}

export function isTeachingMaterialDimensionCode(value: unknown): value is TeachingMaterialDimensionCode {
  return typeof value === 'string'
    && (TEACHING_MATERIAL_DIMENSION_CODES as readonly string[]).includes(value)
}

export function normalizeTeachingMaterialDimensionCode(value: unknown): TeachingMaterialDimensionCode | null {
  if (!isTeachingMaterialDimensionCode(value)) {
    return null
  }

  return value
}

export function getTeachingMaterialDimensionLabel(code: TeachingMaterialDimensionCode): string {
  return EQUIPMENT_CATALOG_GROUP_LABELS[code]
}

export function getTeachingMaterialModuleCode(code: TeachingMaterialDimensionCode): ModuleCode {
  return TEACHING_MATERIAL_DIMENSION_MODULE_MAP[code]
}

export function getAccessibleTeachingMaterialDimensions(
  hasModuleAccess?: (moduleCode: string) => boolean
): TeachingMaterialDimensionCode[] {
  if (!hasModuleAccess) {
    return [...TEACHING_MATERIAL_DIMENSION_CODES]
  }

  return TEACHING_MATERIAL_DIMENSION_CODES.filter((code) => hasModuleAccess(getTeachingMaterialModuleCode(code)))
}

export const TRAINING_RESOURCE_BUSINESS_GROUP_CODES = [
  'sensory-training',
  'emotional-behavior',
  'emotional-regulation',
  'social-communication',
  'fine-motor',
  'life-skills',
  'soothing-aids',
] as const

export type TrainingResourceBusinessGroupCode = typeof TRAINING_RESOURCE_BUSINESS_GROUP_CODES[number]
export type TrainingResourceDisplayType = 'equipment' | 'game'

export const TRAINING_RESOURCE_BUSINESS_GROUP_LABELS: Record<TrainingResourceBusinessGroupCode, string> = {
  'sensory-training': '感官训练',
  'emotional-behavior': '情绪行为',
  'emotional-regulation': '情绪调节',
  'social-communication': '社交沟通',
  'fine-motor': '精细动作',
  'life-skills': '生活自理',
  'soothing-aids': '安抚教具',
}

export const TRAINING_RESOURCE_BUSINESS_GROUP_MODULE_MAP: Record<TrainingResourceBusinessGroupCode, ModuleCode> = {
  'sensory-training': ModuleCode.SENSORY,
  'emotional-behavior': ModuleCode.EMOTIONAL,
  'emotional-regulation': ModuleCode.EMOTIONAL,
  'social-communication': ModuleCode.SOCIAL,
  'fine-motor': ModuleCode.SENSORY,
  'life-skills': ModuleCode.LIFE_SKILLS,
  'soothing-aids': ModuleCode.EMOTIONAL,
}

export function getTrainingResourceBusinessGroupLabel(code: TrainingResourceBusinessGroupCode): string {
  return TRAINING_RESOURCE_BUSINESS_GROUP_LABELS[code]
}

export function getTrainingResourceBusinessGroupModuleCode(code: TrainingResourceBusinessGroupCode): ModuleCode {
  return TRAINING_RESOURCE_BUSINESS_GROUP_MODULE_MAP[code]
}

export function getAccessibleTrainingResourceBusinessGroups(
  hasModuleAccess?: (moduleCode: string) => boolean
): TrainingResourceBusinessGroupCode[] {
  if (!hasModuleAccess) {
    return [...TRAINING_RESOURCE_BUSINESS_GROUP_CODES]
  }

  return TRAINING_RESOURCE_BUSINESS_GROUP_CODES.filter((code) =>
    hasModuleAccess(getTrainingResourceBusinessGroupModuleCode(code))
  )
}

export function resolveTrainingResourceDisplayType(
  resource: Pick<ResourceItem, 'resourceType'>
): TrainingResourceDisplayType | null {
  if (resource.resourceType === 'equipment') {
    return 'equipment'
  }

  if (resource.resourceType === 'game'
    || resource.resourceType === 'emotion_scene'
    || resource.resourceType === 'care_scene') {
    return 'game'
  }

  return null
}

export function isVisibleTrainingResource(
  resource: Pick<ResourceItem, 'resourceType'>
): boolean {
  return resolveTrainingResourceDisplayType(resource) !== null
}

export function resolveTrainingResourceBusinessGroupCode(
  resource: Pick<ResourceItem, 'moduleCode' | 'resourceType' | 'category' | 'metadata'>
): TrainingResourceBusinessGroupCode {
  if (resource.resourceType === 'emotion_scene' || resource.resourceType === 'care_scene') {
    return 'emotional-behavior'
  }

  if (resource.resourceType === 'equipment') {
    return resolveEquipmentCatalogGroupCode(resource)
  }

  const entryCode = resolveTrainingEntryCodeFromResource(resource)

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
