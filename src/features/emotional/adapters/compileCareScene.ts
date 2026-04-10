import type { CareSceneResourceMeta, EmotionalCareType } from '@/types/emotional'
import {
  enrichCareSceneGeneratedFields,
} from '@/features/emotional/care-scene-generated-fields'
import type {
  EmotionalCompileContext,
  EmotionalCompiledSessionConfig,
} from '@/features/emotional/engine/types'

export function compileCareScene(
  meta: CareSceneResourceMeta,
  context: EmotionalCompileContext,
): EmotionalCompiledSessionConfig {
  const enrichedMeta = enrichCareSceneGeneratedFields(meta)
  const preferredUtteranceIds = new Set(enrichedMeta.preferredUtteranceIds)
  const adviceUtteranceIds = enrichedMeta.utterances
    .filter((item) => item.type === 'advice')
    .map((item) => item.id)

  const steps: EmotionalCompiledSessionConfig['steps'] = [
    {
      key: 'care_intro',
      phase: 'scene_intro',
      stepType: 'care_utterance',
      interactive: false,
      title: enrichedMeta.title,
      metadata: {
        variant: 'care_scene',
        title: enrichedMeta.title,
        description: enrichedMeta.description || context.resourceDescription,
        receiverName: enrichedMeta.receiverName,
        emotionChips: enrichedMeta.emotionChips,
        comfortTip: enrichedMeta.comfortTip,
        speakerPerspectiveText: enrichedMeta.speakerPerspectiveText,
        receiverPerspectiveText: enrichedMeta.receiverPerspectiveText,
        sceneVisual: {
          imageUrl: enrichedMeta.imageUrl,
          coverImage: context.coverImage,
          emotionColorHex: enrichedMeta.emotionColorHex,
          emotionColorToken: enrichedMeta.emotionColorToken,
          emotionColorLabel: enrichedMeta.emotionColorLabel,
        },
      },
    },
    {
      key: 'care_utterance_choice',
      phase: 'solution',
      stepType: 'care_utterance',
      promptText: enrichedMeta.speakerPerspectiveText,
      perspective: 'sender',
      metadata: {
        speakerPerspectiveText: enrichedMeta.speakerPerspectiveText,
        receiverName: enrichedMeta.receiverName,
        emotionChips: enrichedMeta.emotionChips,
        comfortTip: enrichedMeta.comfortTip,
      },
      options: enrichedMeta.utterances.map((utterance) => ({
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
      correctValues: enrichedMeta.preferredUtteranceIds,
      acceptableValues: adviceUtteranceIds,
    },
    {
      key: 'receiver_preference_choice',
      phase: 'perspective_taking',
      stepType: 'receiver_preference',
      promptText: enrichedMeta.receiverPerspectiveText,
      perspective: 'receiver',
      metadata: {
        receiverPerspectiveText: enrichedMeta.receiverPerspectiveText,
        receiverName: enrichedMeta.receiverName,
        comfortTip: enrichedMeta.comfortTip,
      },
      options: enrichedMeta.receiverOptions.map((option) => ({
        value: option.id,
        label: option.text,
        isCorrect: option.isComforting,
        isAcceptable: option.isComforting,
        metadata: {
          reasonText: option.reasonText,
          isComforting: option.isComforting,
        },
      })),
      correctValues: enrichedMeta.receiverOptions.filter((option) => option.isComforting).map((option) => option.id),
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
