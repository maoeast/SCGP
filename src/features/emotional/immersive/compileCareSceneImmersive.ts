import {
  buildEmotionChoiceOptions,
  EMOTIONAL_BASE_EMOTION_META,
} from '@/features/emotional/emotion-catalog'
import { enrichCareSceneGeneratedFields } from '@/features/emotional/care-scene-generated-fields'
import type {
  SceneData,
  StepData,
  TrainingSessionPayload,
} from '@/stores/useTrainingStore'
import type { CareSceneResourceMeta } from '@/types/emotional'

interface CompileCareSceneImmersiveContext {
  resourceId: number
  resourceName: string
  resourceDescription?: string
  coverImage?: string
}

function buildSceneDescription(
  receiverName: string,
  resourceDescription: string | undefined,
  comfortTip: string,
): string {
  return [
    resourceDescription?.trim(),
    `请先看看${receiverName}发生了什么，再想一想怎样说会更让TA舒服。`,
    comfortTip.trim(),
  ]
    .filter((item): item is string => Boolean(item && item.trim()))
    .join(' ')
}

function buildEmotionFeedbackText(emotionLabel: string, emotionChips: string[]): string {
  const clueText = emotionChips.slice(0, 3).join('、')
  return clueText
    ? `对，{name}现在更像是${emotionLabel}，因为TA可能会觉得${clueText}。`
    : `对，{name}现在更像是${emotionLabel}，你已经接住TA的感受了。`
}

function buildEmotionRetryText(emotionLabel: string, comfortTip: string): string {
  const normalizedTip = comfortTip.trim()
  return normalizedTip
    ? `再看看{name}的状态。TA更像是${emotionLabel}，${normalizedTip}`
    : `再看看{name}的表情和处境，TA更像是${emotionLabel}。`
}

function buildUtteranceFeedback(option: CareSceneResourceMeta['utterances'][number], isPreferred: boolean): string {
  const reactionText = option.receiverReactionText?.trim()
  const effectText = option.effect.trim()

  if (isPreferred) {
    return reactionText
      ? `这句话更能接住{name}的感受。${reactionText}`
      : `这句话更能接住{name}的感受。${effectText}`
  }

  if (option.type === 'advice') {
    return reactionText
      ? `这样说也可以，但如果先更轻一点、更贴近{name}的感受，会更舒服。${reactionText}`
      : `这样说也可以，但如果先更轻一点、更贴近{name}的感受，会更舒服。`
  }

  return reactionText
    ? `这句话还没有真正接住{name}的感受。${reactionText}`
    : `这句话还没有真正接住{name}的感受，我们换一句更贴心的试试。`
}

function buildReceiverFeedback(
  option: CareSceneResourceMeta['receiverOptions'][number],
  receiverName: string,
): string {
  if (option.isComforting) {
    return `${receiverName}听到这句会更舒服，因为${option.reasonText.trim()}`
  }

  return `再站在${receiverName}这边想一想，哪一句更能让TA觉得被理解？`
}

export function compileCareSceneImmersive(
  meta: CareSceneResourceMeta,
  context: CompileCareSceneImmersiveContext,
): TrainingSessionPayload {
  const enrichedMeta = enrichCareSceneGeneratedFields(meta, context.resourceDescription || '')
  const sceneId = context.resourceId > 0 ? context.resourceId : Date.now()
  let idSeed = Math.max(sceneId * 100, 1000)
  const nextId = () => {
    idSeed += 1
    return idSeed
  }

  const receiverEmotion = enrichedMeta.receiverEmotion || 'sad'
  const receiverEmotionMeta = EMOTIONAL_BASE_EMOTION_META[receiverEmotion]
  const scene: SceneData = {
    id: sceneId,
    variant: 'care_scene',
    persistence_mode: 'deferred',
    scene_code: enrichedMeta.sceneCode,
    title: enrichedMeta.title,
    description: buildSceneDescription(
      enrichedMeta.receiverName || '这位小朋友',
      context.resourceDescription,
      enrichedMeta.comfortTip || '',
    ),
    background_image_url: context.coverImage?.trim() || enrichedMeta.imageUrl || null,
    target_emotion: receiverEmotion,
    character_name: enrichedMeta.receiverName || '这位小朋友',
    difficulty_level: enrichedMeta.difficultyLevel,
    scene_domain: null,
    age_range: enrichedMeta.ageRange || null,
    ability_level: enrichedMeta.abilityLevel || null,
    tags: enrichedMeta.tags || [],
    recommended_hint_ceiling: enrichedMeta.recommendedHintCeiling ?? null,
    created_at: null,
    care_type: enrichedMeta.careType || null,
    receiver_emotion: receiverEmotion,
  }

  const emotionStepId = nextId()
  const utteranceStepId = nextId()
  const receiverStepId = nextId()

  const steps: StepData[] = [
    {
      id: emotionStepId,
      scene_id: scene.id,
      step_index: 1,
      question_id: `${enrichedMeta.sceneCode}_care_emotion`,
      question_text: '你觉得{name}现在更像是什么感受呀？',
      step_type: 'care_emotion',
      audio_url: null,
      options: buildEmotionChoiceOptions(receiverEmotion, 5).map((emotion) => ({
        id: nextId(),
        step_id: emotionStepId,
        option_code: emotion,
        content: EMOTIONAL_BASE_EMOTION_META[emotion].label,
        icon_name: emotion,
        color_hex: EMOTIONAL_BASE_EMOTION_META[emotion].colorHex,
        color_label: EMOTIONAL_BASE_EMOTION_META[emotion].colorLabel,
        is_correct: emotion === receiverEmotion,
        is_acceptable: null,
        feedback_text: emotion === receiverEmotion
          ? buildEmotionFeedbackText(receiverEmotionMeta.label, enrichedMeta.emotionChips || [])
          : buildEmotionRetryText(receiverEmotionMeta.label, enrichedMeta.comfortTip || ''),
        metadata: {
          emotion,
          emotion_chips: [...(enrichedMeta.emotionChips || [])],
          comfort_tip: enrichedMeta.comfortTip || '',
        },
      })),
      hints: [],
    },
    {
      id: utteranceStepId,
      scene_id: scene.id,
      step_index: 2,
      question_id: `${enrichedMeta.sceneCode}_care_utterance`,
      question_text: '如果你要对{name}说一句关心的话，你会怎么说？',
      step_type: 'care_utterance',
      audio_url: null,
      options: enrichedMeta.utterances.map((utterance) => {
        const isPreferred = enrichedMeta.preferredUtteranceIds.includes(utterance.id)
        const isAcceptable = !isPreferred && utterance.type === 'advice'

        return {
          id: nextId(),
          step_id: utteranceStepId,
          option_code: utterance.id,
          content: utterance.text,
          icon_name: null,
          color_hex: null,
          color_label: null,
          is_correct: isPreferred,
          is_acceptable: isAcceptable ? true : null,
          feedback_text: buildUtteranceFeedback(utterance, isPreferred),
          metadata: {
            utterance_type: utterance.type,
            effect: utterance.effect,
            receiver_reaction_text: utterance.receiverReactionText || '',
            receiver_reaction_emoji: utterance.receiverReactionEmoji || '',
          },
        }
      }),
      hints: [],
    },
    {
      id: receiverStepId,
      scene_id: scene.id,
      step_index: 3,
      question_id: `${enrichedMeta.sceneCode}_receiver_preference`,
      question_text: '站在{name}这边想，听到哪一句会更舒服？',
      step_type: 'receiver_preference',
      audio_url: null,
      options: enrichedMeta.receiverOptions.map((option) => ({
        id: nextId(),
        step_id: receiverStepId,
        option_code: option.id,
        content: option.text,
        icon_name: null,
        color_hex: null,
        color_label: null,
        is_correct: option.isComforting,
        is_acceptable: null,
        feedback_text: buildReceiverFeedback(option, scene.character_name),
        metadata: {
          reason_text: option.reasonText,
          is_comforting: option.isComforting,
        },
      })),
      hints: [],
    },
  ]

  return {
    scene,
    steps,
  }
}
