import {
  Box,
  ChatDotRound,
  CollectionTag,
  Document,
  Files,
  Picture,
  Sunny,
  VideoPlay,
} from '@element-plus/icons-vue'
import type { Component } from 'vue'
import { ModuleCode } from '@/types/module'
import type {
  TrainingResourceBusinessGroupCode,
  TrainingResourceDisplayType,
} from '@/utils/resource-center-business'

export interface TrainingResourceTypeOption {
  code: string
  name: string
}

interface DefaultCreateTypeContext {
  businessGroupCode: TrainingResourceBusinessGroupCode
  displayType: '' | TrainingResourceDisplayType
  moduleCode: ModuleCode | null
  isEmotionalBusinessGroup: boolean
}

const BASE_TRAINING_RESOURCE_TYPE_OPTIONS: TrainingResourceTypeOption[] = [
  { code: 'equipment', name: '器材' },
  { code: 'document', name: '文档' },
  { code: 'video', name: '视频' },
  { code: 'flashcard', name: '闪卡' },
]

const EMOTIONAL_TRAINING_RESOURCE_TYPE_OPTIONS: TrainingResourceTypeOption[] = [
  { code: 'emotion_scene', name: '情绪场景' },
  { code: 'care_scene', name: '表达关心' },
]

const LIFE_SKILLS_TRAINING_RESOURCE_TYPE_OPTIONS: TrainingResourceTypeOption[] = [
  { code: 'task_training', name: '自理任务' },
]

const TRAINING_RESOURCE_TYPE_ICON_MAP: Record<string, Component> = {
  equipment: Box,
  game: VideoPlay,
  document: Document,
  video: VideoPlay,
  flashcard: Picture,
  emotion_scene: Sunny,
  care_scene: ChatDotRound,
  task_training: CollectionTag,
  default: Files,
}

const TRAINING_RESOURCE_TYPE_ICON_CLASS_MAP: Record<string, string> = {
  equipment: 'type-equipment',
  game: 'type-game',
  document: 'type-document',
  video: 'type-video',
  flashcard: 'type-flashcard',
  emotion_scene: 'type-emotion-scene',
  care_scene: 'type-care-scene',
  task_training: 'type-task-training',
  default: 'type-default',
}

export function getTrainingResourceTypeOptions(moduleCode: ModuleCode | null): TrainingResourceTypeOption[] {
  const options = [...BASE_TRAINING_RESOURCE_TYPE_OPTIONS]

  if (moduleCode === ModuleCode.EMOTIONAL) {
    options.push(...EMOTIONAL_TRAINING_RESOURCE_TYPE_OPTIONS)
  }

  if (moduleCode === ModuleCode.LIFE_SKILLS) {
    options.push(...LIFE_SKILLS_TRAINING_RESOURCE_TYPE_OPTIONS)
  }

  return options
}

export function getTrainingResourceTypeIcon(type: string): Component {
  return TRAINING_RESOURCE_TYPE_ICON_MAP[type] ?? Files
}

export function getTrainingResourceTypeIconClass(type: string): string {
  return TRAINING_RESOURCE_TYPE_ICON_CLASS_MAP[type] ?? 'type-default'
}

export function resolveTrainingResourceDefaultCreateType({
  businessGroupCode,
  displayType,
  moduleCode,
  isEmotionalBusinessGroup,
}: DefaultCreateTypeContext): string {
  if (businessGroupCode === 'life-skills' || moduleCode === ModuleCode.LIFE_SKILLS) {
    return 'task_training'
  }

  if (businessGroupCode === 'emotional-behavior') {
    return 'emotion_scene'
  }

  if (displayType === 'equipment') {
    return 'equipment'
  }

  return isEmotionalBusinessGroup ? 'emotion_scene' : 'equipment'
}

export function normalizeTrainingResourceModuleCode(
  resourceType: string,
  fallbackModuleCode: ModuleCode | null | string,
): ModuleCode {
  if (resourceType === 'task_training') {
    return ModuleCode.LIFE_SKILLS
  }

  if (resourceType === 'emotion_scene' || resourceType === 'care_scene') {
    return ModuleCode.EMOTIONAL
  }

  return (fallbackModuleCode as ModuleCode) || ModuleCode.SENSORY
}
