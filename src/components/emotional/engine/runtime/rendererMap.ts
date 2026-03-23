import type { Component } from 'vue'
import CareUtteranceRenderer from '@/components/emotional/engine/renderers/CareUtteranceRenderer.vue'
import EmotionChoiceRenderer from '@/components/emotional/engine/renderers/EmotionChoiceRenderer.vue'
import ReceiverPreferenceRenderer from '@/components/emotional/engine/renderers/ReceiverPreferenceRenderer.vue'
import ReasoningQuestionRenderer from '@/components/emotional/engine/renderers/ReasoningQuestionRenderer.vue'
import SceneIntroRenderer from '@/components/emotional/engine/renderers/SceneIntroRenderer.vue'
import SolutionChoiceRenderer from '@/components/emotional/engine/renderers/SolutionChoiceRenderer.vue'
import type {
  EmotionalCompiledStep,
  EmotionalRendererKey,
} from '@/features/emotional/engine/types'

export const emotionalRendererMap: Record<EmotionalRendererKey, Component> = {
  scene_intro: SceneIntroRenderer,
  emotion_choice: EmotionChoiceRenderer,
  reasoning_question: ReasoningQuestionRenderer,
  solution_choice: SolutionChoiceRenderer,
  care_utterance: CareUtteranceRenderer,
  receiver_preference: ReceiverPreferenceRenderer,
}

export function getRendererKey(step: EmotionalCompiledStep): EmotionalRendererKey {
  if (step.phase === 'scene_intro') {
    return 'scene_intro'
  }

  return step.stepType
}
