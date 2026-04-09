import type { EmotionSceneResourceMeta } from '@/types/emotional'
import type {
  EmotionalCompileContext,
  EmotionalCompiledSessionConfig,
} from '@/features/emotional/engine/types'
import {
  buildEmotionChoiceOptions,
  EMOTIONAL_BASE_EMOTION_META,
} from '@/features/emotional/emotion-catalog'

export function compileEmotionScene(
  meta: EmotionSceneResourceMeta,
  context: EmotionalCompileContext,
): EmotionalCompiledSessionConfig {
  const emotionChoiceOptions = buildEmotionChoiceOptions(meta.targetEmotion, 5)

  const steps: EmotionalCompiledSessionConfig['steps'] = [
    {
      key: 'scene_intro',
      phase: 'scene_intro',
      stepType: 'emotion_choice',
      interactive: false,
      title: meta.title,
      metadata: {
        variant: 'emotion_scene',
        title: meta.title,
        description: context.resourceDescription,
        clues: meta.emotionClues,
        sceneVisual: {
          imageUrl: meta.imageUrl,
          coverImage: context.coverImage,
          emotionColorHex: meta.emotionColorHex,
          emotionColorToken: meta.emotionColorToken,
          emotionColorLabel: meta.emotionColorLabel,
        },
      },
    },
    {
      key: 'emotion_choice',
      phase: 'emotion_recognition',
      stepType: 'emotion_choice',
      promptText: '你觉得他现在是什么心情？',
      metadata: {
        targetEmotion: meta.targetEmotion,
        emotionColorHex: meta.emotionColorHex,
        emotionColorToken: meta.emotionColorToken,
        emotionColorLabel: meta.emotionColorLabel,
      },
      options: emotionChoiceOptions.map((emotion) => ({
        value: emotion,
        label: EMOTIONAL_BASE_EMOTION_META[emotion].label,
        isCorrect: emotion === meta.targetEmotion,
        metadata: {
          emotion,
        },
      })),
      correctValues: [meta.targetEmotion],
    },
    ...meta.prompts.map((prompt) => ({
      key: prompt.questionId,
      phase: 'reasoning' as const,
      stepType: 'reasoning_question' as const,
      promptId: prompt.questionId,
      promptText: prompt.questionText,
      metadata: {
        questionType: prompt.questionType,
        feedbackMode: 'gentle' as const,
      },
      options: prompt.options.map((option) => ({
        value: option.id,
        label: option.text,
        isCorrect: option.isCorrect,
        isAcceptable: option.isAcceptable,
        metadata: {
          feedbackText: option.feedbackText,
        },
      })),
      correctValues: prompt.options.filter((option) => option.isCorrect).map((option) => option.id),
      acceptableValues: prompt.options.filter((option) => option.isAcceptable).map((option) => option.id),
    })),
    {
      key: 'solution_choice',
      phase: 'solution',
      stepType: 'solution_choice',
      promptText: '你觉得他现在应该怎么办呀？',
      metadata: {
        displayIntent: 'supportive_response',
      },
      options: meta.solutions.map((solution) => ({
        value: solution.id,
        label: solution.text,
        isCorrect: solution.suitability === 'optimal',
        isAcceptable: solution.suitability === 'acceptable',
        metadata: {
          explanation: solution.explanation,
          suitability: solution.suitability,
        },
      })),
      correctValues: meta.solutions.filter((solution) => solution.suitability === 'optimal').map((solution) => solution.id),
      acceptableValues: meta.solutions.filter((solution) => solution.suitability === 'acceptable').map((solution) => solution.id),
    },
  ]

  return {
    studentId: context.studentId,
    resourceId: context.resourceId,
    resourceType: 'emotion_scene',
    subModule: 'emotion_scene',
    steps,
  }
}
