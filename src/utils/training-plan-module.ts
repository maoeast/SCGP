import {
  TRAINING_RESOURCE_BUSINESS_GROUP_LABELS,
  type TrainingResourceBusinessGroupCode,
} from '@/utils/resource-center-business'

export const TRAINING_PLAN_MODULE_CODES = [
  'all',
  'sensory-training',
  'emotional-behavior',
  'emotional-regulation',
  'social-communication',
  'fine-motor',
  'soothing-aids',
  'life-skills',
  'cognitive-development',
] as const

export type TrainingPlanModuleCode = typeof TRAINING_PLAN_MODULE_CODES[number]
export type TrainingPlanFilterModuleCode = '' | TrainingPlanModuleCode
export type TrainingPlanStoredModuleCode =
  | TrainingPlanModuleCode
  | 'sensory'
  | 'emotional'
  | 'social'
  | 'life_skills'

export interface TrainingPlanModuleOption {
  value: TrainingPlanModuleCode
  label: string
}

export interface TrainingPlanFilterModuleOption {
  value: TrainingPlanFilterModuleCode
  label: string
}

const BUSINESS_GROUP_ORDER: readonly TrainingResourceBusinessGroupCode[] = [
  'sensory-training',
  'emotional-behavior',
  'emotional-regulation',
  'social-communication',
  'fine-motor',
  'soothing-aids',
  'life-skills',
  'cognitive-development',
]

export const TRAINING_PLAN_MODULE_LABELS: Record<TrainingPlanModuleCode, string> = {
  all: '综合计划',
  'sensory-training': TRAINING_RESOURCE_BUSINESS_GROUP_LABELS['sensory-training'],
  'emotional-behavior': TRAINING_RESOURCE_BUSINESS_GROUP_LABELS['emotional-behavior'],
  'emotional-regulation': TRAINING_RESOURCE_BUSINESS_GROUP_LABELS['emotional-regulation'],
  'social-communication': TRAINING_RESOURCE_BUSINESS_GROUP_LABELS['social-communication'],
  'fine-motor': TRAINING_RESOURCE_BUSINESS_GROUP_LABELS['fine-motor'],
  'soothing-aids': TRAINING_RESOURCE_BUSINESS_GROUP_LABELS['soothing-aids'],
  'life-skills': TRAINING_RESOURCE_BUSINESS_GROUP_LABELS['life-skills'],
  'cognitive-development': TRAINING_RESOURCE_BUSINESS_GROUP_LABELS['cognitive-development'],
}

export const TRAINING_PLAN_MODULE_OPTIONS: readonly TrainingPlanModuleOption[] = [
  { value: 'all', label: TRAINING_PLAN_MODULE_LABELS.all },
  ...BUSINESS_GROUP_ORDER.map((value) => ({
    value,
    label: TRAINING_PLAN_MODULE_LABELS[value],
  })),
]

export const TRAINING_PLAN_FILTER_MODULE_OPTIONS: readonly TrainingPlanFilterModuleOption[] = [
  { value: '', label: '全部模块' },
  ...TRAINING_PLAN_MODULE_OPTIONS,
]

const TRAINING_PLAN_MODULE_ALIASES: Record<TrainingPlanStoredModuleCode, TrainingPlanModuleCode> = {
  all: 'all',
  'sensory-training': 'sensory-training',
  sensory: 'sensory-training',
  'emotional-behavior': 'emotional-behavior',
  emotional: 'emotional-behavior',
  'emotional-regulation': 'emotional-regulation',
  'social-communication': 'social-communication',
  social: 'social-communication',
  'fine-motor': 'fine-motor',
  'soothing-aids': 'soothing-aids',
  'life-skills': 'life-skills',
  life_skills: 'life-skills',
  'cognitive-development': 'cognitive-development',
}

export function isTrainingPlanModuleCode(value: unknown): value is TrainingPlanModuleCode {
  return typeof value === 'string'
    && (TRAINING_PLAN_MODULE_CODES as readonly string[]).includes(value)
}

export function normalizeTrainingPlanModuleCode(value: unknown): TrainingPlanModuleCode | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value.trim()
  if (!normalizedValue) {
    return null
  }

  return TRAINING_PLAN_MODULE_ALIASES[normalizedValue as TrainingPlanStoredModuleCode] || null
}

export function getTrainingPlanModuleLabel(value?: string): string {
  const normalizedValue = normalizeTrainingPlanModuleCode(value)
  if (normalizedValue) {
    return TRAINING_PLAN_MODULE_LABELS[normalizedValue]
  }

  if (!value) {
    return '未分类'
  }

  if (value === 'cognitive') {
    return '认知训练'
  }

  return value
}

export function matchesTrainingPlanModule(
  value: string | undefined,
  filterValue: TrainingPlanFilterModuleCode
): boolean {
  if (!filterValue) {
    return true
  }

  return normalizeTrainingPlanModuleCode(value) === filterValue
}
