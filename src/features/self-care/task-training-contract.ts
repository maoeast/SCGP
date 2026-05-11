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
