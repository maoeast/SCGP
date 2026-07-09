import {
  TASK_TRAINING_ENTRY_CODE,
  TASK_TRAINING_RESOURCE_DISPLAY_TYPE,
  TASK_TRAINING_RESOURCE_TYPE,
} from '@/features/self-care/task-training-contract'
import { ModuleCode, type ResourceItem } from '@/types/module'
import type { AccessControlledItem } from '@/utils/access-visibility'
import {
  EQUIPMENT_CATALOG_GROUPS,
  EQUIPMENT_CATALOG_GROUP_LABELS,
  type EquipmentCatalogGroupCode,
  resolveEquipmentCatalogGroupCode,
} from '@/utils/equipment-catalog-group'
import {
  getTrainingEntryRequiredEntitlement,
  resolveTrainingEntryCodeFromResource,
} from '@/utils/training-entry'

export const TEACHING_MATERIAL_DIMENSION_CODES = EQUIPMENT_CATALOG_GROUPS

export type TeachingMaterialDimensionCode = EquipmentCatalogGroupCode

export const TEACHING_MATERIAL_DIMENSION_MODULE_MAP: Record<TeachingMaterialDimensionCode, ModuleCode> = {
  'sensory-training': ModuleCode.SENSORY,
  'emotional-regulation': ModuleCode.EMOTIONAL,
  'social-communication': ModuleCode.SOCIAL,
  'life-skills': ModuleCode.LIFE_SKILLS,
  'fine-motor': ModuleCode.SENSORY,
  'soothing-aids': ModuleCode.EMOTIONAL,
  'cognitive-development': ModuleCode.COGNITIVE,
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

export const TEACHING_MATERIAL_FILE_CATEGORY_CODES = [
  'all',
  'video',
  'image',
  'document',
  'audio',
  'archive',
  'other',
] as const

export type TeachingMaterialFileCategoryCode = typeof TEACHING_MATERIAL_FILE_CATEGORY_CODES[number]

export const TEACHING_MATERIAL_FILE_CATEGORY_LABELS: Record<TeachingMaterialFileCategoryCode, string> = {
  all: '全部类型',
  video: '视频',
  image: '图片',
  document: '文档',
  audio: '音频',
  archive: '压缩包',
  other: '其他',
}

const TEACHING_MATERIAL_VIDEO_TYPES = new Set(['mp4', 'avi', 'mov', 'wmv', 'webm', 'mkv', 'm4v'])
const TEACHING_MATERIAL_IMAGE_TYPES = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'])
const TEACHING_MATERIAL_DOCUMENT_TYPES = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'rtf',
  'csv',
])
const TEACHING_MATERIAL_AUDIO_TYPES = new Set(['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'])
const TEACHING_MATERIAL_ARCHIVE_TYPES = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'])

export function getTeachingMaterialFileCategoryLabel(code: TeachingMaterialFileCategoryCode): string {
  return TEACHING_MATERIAL_FILE_CATEGORY_LABELS[code]
}

export function resolveTeachingMaterialFileCategory(fileType: string): Exclude<TeachingMaterialFileCategoryCode, 'all'> {
  const normalizedType = normalizeTeachingMaterialFileType(fileType)

  if (TEACHING_MATERIAL_VIDEO_TYPES.has(normalizedType)) {
    return 'video'
  }

  if (TEACHING_MATERIAL_IMAGE_TYPES.has(normalizedType)) {
    return 'image'
  }

  if (TEACHING_MATERIAL_DOCUMENT_TYPES.has(normalizedType)) {
    return 'document'
  }

  if (TEACHING_MATERIAL_AUDIO_TYPES.has(normalizedType)) {
    return 'audio'
  }

  if (TEACHING_MATERIAL_ARCHIVE_TYPES.has(normalizedType)) {
    return 'archive'
  }

  return 'other'
}

function normalizeTeachingMaterialFileType(fileType: string): string {
  return String(fileType || '')
    .trim()
    .replace(/^\./, '')
    .toLowerCase()
}

export const TRAINING_RESOURCE_BUSINESS_GROUP_CODES = [
  'sensory-training',
  'emotional-behavior',
  'emotional-regulation',
  'social-communication',
  'fine-motor',
  'life-skills',
  'soothing-aids',
  'cognitive-development',
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
  'cognitive-development': '认知发展',
}

export const TRAINING_RESOURCE_BUSINESS_GROUP_MODULE_MAP: Record<TrainingResourceBusinessGroupCode, ModuleCode> = {
  'sensory-training': ModuleCode.SENSORY,
  'emotional-behavior': ModuleCode.EMOTIONAL,
  'emotional-regulation': ModuleCode.EMOTIONAL,
  'social-communication': ModuleCode.SOCIAL,
  'fine-motor': ModuleCode.SENSORY,
  'life-skills': ModuleCode.LIFE_SKILLS,
  'soothing-aids': ModuleCode.EMOTIONAL,
  'cognitive-development': ModuleCode.COGNITIVE,
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

  if (resource.resourceType === TASK_TRAINING_RESOURCE_TYPE) {
    return TASK_TRAINING_RESOURCE_DISPLAY_TYPE
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

  if (resource.resourceType === TASK_TRAINING_RESOURCE_TYPE) {
    return TASK_TRAINING_ENTRY_CODE
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
    case 'cognitive':
      return 'cognitive-development'
    case TASK_TRAINING_ENTRY_CODE:
      return TASK_TRAINING_ENTRY_CODE
    case 'sensory-integration':
    default:
      return 'sensory-training'
  }
}

export function adaptTrainingResourceAccessControlledItem(
  resource: Pick<ResourceItem, 'moduleCode' | 'resourceType' | 'category' | 'metadata'>
): AccessControlledItem {
  if (resource.resourceType === 'emotion_scene') {
    return {
      accessScope: 'entitlement',
      moduleCode: resource.moduleCode,
      entitlementCode: 'emotional',
    }
  }

  if (resource.resourceType === 'care_scene') {
    return {
      accessScope: 'entitlement',
      moduleCode: resource.moduleCode,
      entitlementCode: 'emotional',
    }
  }

  return {
    accessScope: 'entitlement',
    moduleCode: resource.moduleCode,
    entitlementCode: getTrainingEntryRequiredEntitlement(resolveTrainingEntryCodeFromResource(resource)),
  }
}
