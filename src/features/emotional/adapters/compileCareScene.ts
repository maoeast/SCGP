import type { CareSceneResourceMeta, EmotionalCareType } from '@/types/emotional'
import type {
  EmotionalCompileContext,
  EmotionalCompiledSessionConfig,
} from '@/features/emotional/engine/types'

export function compileCareScene(
  meta: CareSceneResourceMeta,
  context: EmotionalCompileContext,
): EmotionalCompiledSessionConfig {
  const preferredUtteranceIds = new Set(meta.preferredUtteranceIds)
  const adviceUtteranceIds = meta.utterances
    .filter((item) => item.type === 'advice')
    .map((item) => item.id)

  const steps: EmotionalCompiledSessionConfig['steps'] = [
    {
      key: 'care_intro',
      phase: 'scene_intro',
      stepType: 'care_utterance',
      interactive: false,
      title: meta.title,
      metadata: {
        variant: 'care_scene',
        title: meta.title,
        description: context.resourceDescription,
        speakerPerspectiveText: meta.speakerPerspectiveText,
        receiverPerspectiveText: meta.receiverPerspectiveText,
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
      key: 'care_utterance_choice',
      phase: 'solution',
      stepType: 'care_utterance',
      promptText: meta.speakerPerspectiveText,
      perspective: 'sender',
      metadata: {
        speakerPerspectiveText: meta.speakerPerspectiveText,
      },
      options: meta.utterances.map((utterance) => ({
        value: utterance.id,
        label: utterance.text,
        isCorrect: preferredUtteranceIds.has(utterance.id),
        isAcceptable: utterance.type === 'advice',
        metadata: {
          utteranceType: utterance.type,
          effect: utterance.effect,
          receiverReactionText: utterance.receiverReactionText,
          receiverReactionEmoji: utterance.receiverReactionEmoji,
        },
      })),
      correctValues: meta.preferredUtteranceIds,
      acceptableValues: adviceUtteranceIds,
    },
    {
      key: 'receiver_preference_choice',
      phase: 'perspective_taking',
      stepType: 'receiver_preference',
      promptText: meta.receiverPerspectiveText,
      perspective: 'receiver',
      metadata: {
        receiverPerspectiveText: meta.receiverPerspectiveText,
      },
      options: meta.receiverOptions.map((option) => ({
        value: option.id,
        label: option.text,
        isCorrect: option.isComforting,
        isAcceptable: option.isComforting,
        metadata: {
          reasonText: option.reasonText,
          isComforting: option.isComforting,
        },
      })),
      correctValues: meta.receiverOptions.filter((option) => option.isComforting).map((option) => option.id),
    },
  ]

  return {
    studentId: context.studentId,
    resourceId: context.resourceId,
    resourceType: 'care_scene',
    subModule: 'care_scene',
    steps,
    buildSummary: ({ config, latestResults }) => {
      const selectedUtterance = latestResults.find((item) => item.stepType === 'care_utterance')
      const utteranceStep = config.steps.find((step) => step.key === 'care_utterance_choice')
      const selectedOption = utteranceStep?.options?.find((option) => option.value === selectedUtterance?.selectedValue)
      const utteranceType = selectedOption?.metadata
        ? (selectedOption.metadata as { utteranceType?: EmotionalCareType }).utteranceType
        : undefined

      return {
        dominantChoiceType: utteranceType || null,
      }
    },
  }
}
