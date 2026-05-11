export const TASK_TRAINING_RESOURCE_TYPE = 'task_training' as const
export const TASK_TRAINING_MODULE_CODE = 'life_skills' as const
export const TASK_TRAINING_ENTRY_CODE = 'life-skills' as const
export const TASK_TRAINING_RESOURCE_DISPLAY_TYPE = 'game' as const
export const TASK_TRAINING_MODE = 'step_task' as const

export type TaskTrainingResourceType = typeof TASK_TRAINING_RESOURCE_TYPE
export type TaskTrainingModuleCode = typeof TASK_TRAINING_MODULE_CODE
export type TaskTrainingEntryCode = typeof TASK_TRAINING_ENTRY_CODE
export type TaskTrainingResourceDisplayType = typeof TASK_TRAINING_RESOURCE_DISPLAY_TYPE
export type TaskTrainingMode = typeof TASK_TRAINING_MODE

export type TaskTrainingMediaPath = string | null

export interface TaskTrainingCategoryMeta {
  parentId?: number | null
  parentName?: string | null
  childId?: number | null
  childName?: string | null
}

export interface TaskTrainingAbilityItemMeta {
  id: string
  name: string
}

export interface TaskTrainingStep {
  id: string
  seq: number
  text: string
  imagePath?: TaskTrainingMediaPath
  videoPath?: TaskTrainingMediaPath
  audioPath?: TaskTrainingMediaPath
}

export interface TaskTrainingResourceMeta {
  trainingMode: TaskTrainingMode
  trainingEntryCode: TaskTrainingEntryCode
  legacyTaskCode?: string | null
  category?: TaskTrainingCategoryMeta | null
  abilityItem?: TaskTrainingAbilityItemMeta | null
  steps: TaskTrainingStep[]
}

export interface TaskTrainingResourceContract {
  resourceId: number
  moduleCode: TaskTrainingModuleCode
  resourceType: TaskTrainingResourceType
  entryCode: TaskTrainingEntryCode
  displayType: TaskTrainingResourceDisplayType
  metadata: TaskTrainingResourceMeta
}

export type TaskTrainingCompletionLevel = 'independent' | 'prompt' | 'assist' | 'unable'

export type TaskTrainingErrorType = 0 | 1 | 2 | 3

export type TaskTrainingExecutionStatus = 'idle' | 'in_progress' | 'interrupted' | 'completed'

export interface TaskTrainingStepResult {
  seq: number
  stepId?: string
  completionLevel: TaskTrainingCompletionLevel
  errorType?: TaskTrainingErrorType
  teacherNotes?: string | null
  recordedAt?: string | null
}

export interface TaskTrainingExecutionResult {
  trainingMode: TaskTrainingMode
  stepCount: number
  completedStepCount: number
  errorType: TaskTrainingErrorType
  teacherNotes?: string | null
  stepResults: TaskTrainingStepResult[]
}

const DIRECT_MEDIA_URL_RE = /^(?:https?:|data:|blob:|resource:\/\/)/i
const TASK_TRAINING_MEDIA_PREFIX_MAPPINGS: Array<{ source: string; target: string }> = [
  { source: '/assets/resources/', target: '' },
  { source: 'assets/resources/', target: '' },
  { source: '/images/', target: 'images/' },
  { source: 'images/', target: 'images/' },
  { source: '/videos/', target: 'videos/' },
  { source: 'videos/', target: 'videos/' },
  { source: '/audio/', target: 'audio/' },
  { source: 'audio/', target: 'audio/' },
  { source: '/docs/', target: 'docs/' },
  { source: 'docs/', target: 'docs/' },
]

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeOptionalString(value: unknown): string | undefined {
  const trimmed = trimString(value)
  return trimmed || undefined
}

function normalizeOptionalNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }

  return normalizeOptionalString(value)
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function normalizeTaskTrainingMediaStoragePath(value: unknown): string {
  const trimmed = trimString(value)
  if (!trimmed) {
    return ''
  }

  if (DIRECT_MEDIA_URL_RE.test(trimmed)) {
    return trimmed
  }

  for (const mapping of TASK_TRAINING_MEDIA_PREFIX_MAPPINGS) {
    if (trimmed.startsWith(mapping.source)) {
      const remainder = trimmed.slice(mapping.source.length).replace(/^[\\/]+/, '')
      return `${mapping.target}${remainder}`
    }
  }

  return trimmed.replace(/^[\\/]+/, '')
}

function buildTaskTrainingStepId(index: number): string {
  return `step_${index + 1}`
}

function normalizeTaskTrainingCategoryMeta(value: unknown): TaskTrainingCategoryMeta | null | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const candidate = value as Partial<TaskTrainingCategoryMeta>
  const normalized: TaskTrainingCategoryMeta = {
    parentId: normalizeOptionalNumber(candidate.parentId),
    parentName: normalizeOptionalString(candidate.parentName),
    childId: normalizeOptionalNumber(candidate.childId),
    childName: normalizeOptionalString(candidate.childName),
  }

  const hasValue = Object.values(normalized).some((item) => item !== undefined)
  return hasValue ? normalized : undefined
}

function normalizeTaskTrainingAbilityItemMeta(value: unknown): TaskTrainingAbilityItemMeta | null | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const candidate = value as Partial<TaskTrainingAbilityItemMeta>
  const id = normalizeOptionalString(candidate.id)
  const name = normalizeOptionalString(candidate.name)

  if (!id && !name) {
    return undefined
  }

  return {
    id: id || '',
    name: name || '',
  }
}

function normalizeTaskTrainingMediaPath(value: unknown): TaskTrainingMediaPath | undefined {
  if (value === null) {
    return null
  }

  const normalized = normalizeTaskTrainingMediaStoragePath(value)
  if (!normalized) {
    return undefined
  }

  if (DIRECT_MEDIA_URL_RE.test(normalized)) {
    return normalized
  }

  return `resource://${normalized.replace(/^\/+/, '')}`
}

function normalizeTaskTrainingStep(value: unknown, index: number): TaskTrainingStep {
  const candidate = value as Partial<TaskTrainingStep> | undefined
  return {
    id: normalizeOptionalString(candidate?.id) || buildTaskTrainingStepId(index),
    seq: index + 1,
    text: trimString(candidate?.text),
    imagePath: normalizeTaskTrainingMediaPath(candidate?.imagePath),
    videoPath: normalizeTaskTrainingMediaPath(candidate?.videoPath),
    audioPath: normalizeTaskTrainingMediaPath(candidate?.audioPath),
  }
}

export function createTaskTrainingStep(index: number): TaskTrainingStep {
  return normalizeTaskTrainingStep(undefined, index)
}

export function normalizeTaskTrainingEditorModel(
  value: unknown,
  _resourceName = '',
): TaskTrainingResourceMeta {
  const candidate = value as Partial<TaskTrainingResourceMeta> | undefined
  const sourceSteps = Array.isArray(candidate?.steps) && candidate.steps.length > 0
    ? candidate.steps
    : [createTaskTrainingStep(0)]

  return {
    trainingMode: TASK_TRAINING_MODE,
    trainingEntryCode: TASK_TRAINING_ENTRY_CODE,
    legacyTaskCode: normalizeOptionalNullableString(candidate?.legacyTaskCode),
    category: normalizeTaskTrainingCategoryMeta(candidate?.category),
    abilityItem: normalizeTaskTrainingAbilityItemMeta(candidate?.abilityItem),
    steps: sourceSteps.map((step, index) => normalizeTaskTrainingStep(step, index)),
  }
}

export function createTaskTrainingEditorModel(resourceName = ''): TaskTrainingResourceMeta {
  return normalizeTaskTrainingEditorModel(undefined, resourceName)
}

export function validateTaskTrainingEditorModel(model: TaskTrainingResourceMeta): string[] {
  const errors: string[] = []

  if (model.trainingMode !== TASK_TRAINING_MODE) {
    errors.push('任务训练模式必须固定为 step_task')
  }

  if (model.trainingEntryCode !== TASK_TRAINING_ENTRY_CODE) {
    errors.push('任务训练入口必须固定为 life-skills')
  }

  if (!Array.isArray(model.steps) || model.steps.length === 0) {
    errors.push('请至少配置 1 个任务步骤')
    return errors
  }

  if (model.steps.every((step) => !trimString(step.text))) {
    errors.push('请至少配置 1 个有效任务步骤')
  }

  model.steps.forEach((step, index) => {
    if (step.seq !== index + 1) {
      errors.push('任务步骤序号必须从 1 开始连续排列')
    }

    if (!trimString(step.id)) {
      errors.push(`第 ${index + 1} 个任务步骤缺少步骤 ID`)
    }

    if (!trimString(step.text)) {
      errors.push(`第 ${index + 1} 个任务步骤缺少步骤说明`)
    }
  })

  const abilityItem = model.abilityItem
  if (abilityItem && !trimString(abilityItem.id) && !trimString(abilityItem.name)) {
    errors.push('能力项至少填写编号或名称')
  }

  return Array.from(new Set(errors))
}
