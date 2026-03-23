import type {
  EmotionalAdvanceMode,
  EmotionalCompiledStep,
} from '@/features/emotional/engine/types'
import type { EmotionalSubModule } from '@/types/emotional'

export function getPostSubmitBehavior(step: EmotionalCompiledStep): EmotionalAdvanceMode {
  if (step.stepType === 'care_utterance') {
    return 'continue'
  }

  if (step.stepType === 'receiver_preference') {
    return 'complete'
  }

  return 'auto'
}

export function getDefaultIntroActionLabel(subModule: EmotionalSubModule) {
  return subModule === 'care_scene' ? '开始选择关心表达' : '开始识别情绪'
}
