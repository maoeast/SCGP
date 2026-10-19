import emotionSceneCharacterNamesRaw from '../../../../docs/references/emotion-scene-character-names.json?raw'

import { EMOTIONAL_BASE_EMOTION_META } from '@/features/emotional/emotion-catalog'
import type { SceneData, StepData, TrainingSessionPayload, TrainingStepType } from '@/stores/useTrainingStore'
import type { EmotionSceneResourceMeta } from '@/types/emotional'

const characterNames = JSON.parse(emotionSceneCharacterNamesRaw) as Record<string, string>

interface CompileEmotionSceneContext {
  studentId: number
  resourceId: number
  resourceDescription?: string
  coverImage?: string
}

export function compileEmotionSceneImmersive(
  meta: EmotionSceneResourceMeta,
  context: CompileEmotionSceneContext,
): TrainingSessionPayload {
  const sceneId = context.resourceId
  let idSeed = Math.max(sceneId * 100, 1000)
  const nextId = () => ++idSeed
  const scene: SceneData = {
    id: sceneId,
    variant: 'emotion_scene',
    persistence_mode: 'deferred',
    scene_code: meta.sceneCode,
    title: meta.title,
    description: context.resourceDescription || null,
    background_image_url: context.coverImage || meta.imageUrl || null,
    target_emotion: meta.targetEmotion,
    character_name: characterNames[meta.sceneCode]?.trim() || '小朋友',
    difficulty_level: meta.difficultyLevel,
    scene_domain: meta.sceneDomain || null,
    age_range: meta.ageRange || null,
    ability_level: meta.abilityLevel || null,
    tags: meta.tags || [],
    recommended_hint_ceiling: meta.recommendedHintCeiling ?? null,
    created_at: null,
    care_type: null,
    receiver_emotion: null,
  }

  const emotionStepId = nextId()
  const steps: StepData[] = [{
    id: emotionStepId,
    scene_id: sceneId,
    step_index: 1,
    question_id: `${meta.sceneCode}_emotion`,
    question_text: '你觉得他现在是什么心情？',
    step_type: 'emotion',
    audio_url: null,
    options: meta.emotionOptions.map((emotion) => ({
      id: nextId(),
      step_id: emotionStepId,
      option_code: emotion,
      content: EMOTIONAL_BASE_EMOTION_META[emotion].label,
      icon_name: emotion,
      color_hex: EMOTIONAL_BASE_EMOTION_META[emotion].colorHex,
      color_label: EMOTIONAL_BASE_EMOTION_META[emotion].colorLabel,
      is_correct: emotion === meta.targetEmotion,
      is_acceptable: null,
      feedback_text: emotion === meta.targetEmotion
        ? '你注意到了场景里的情绪线索，我们继续看看发生了什么。'
        : '再看看表情和场景线索，想一想还有哪种感受更贴近。',
    })),
    hints: meta.emotionClues.filter(Boolean).map((clue, index) => ({
      id: nextId(), step_id: emotionStepId, hint_level: index + 1, hint_text: clue,
    })),
  }]

  for (const prompt of meta.prompts) {
    const stepId = nextId()
    const stepType: TrainingStepType = prompt.questionType === 'need' ? 'need' : 'reason'
    steps.push({
      id: stepId,
      scene_id: sceneId,
      step_index: steps.length + 1,
      question_id: prompt.questionId,
      question_text: prompt.questionText,
      step_type: stepType,
      audio_url: null,
      options: prompt.options.map((option) => ({
        id: nextId(),
        step_id: stepId,
        option_code: option.id,
        content: option.text,
        icon_name: null,
        color_hex: null,
        color_label: null,
        is_correct: option.isCorrect,
        is_acceptable: option.isAcceptable ?? null,
        feedback_text: option.feedbackText,
      })),
      hints: [],
    })
  }

  const responseStepId = nextId()
  steps.push({
    id: responseStepId,
    scene_id: sceneId,
    step_index: steps.length + 1,
    question_id: `${meta.sceneCode}_response`,
    question_text: '你觉得现在怎样回应更合适？',
    step_type: 'response',
    audio_url: null,
    options: meta.solutions.map((solution) => ({
      id: nextId(),
      step_id: responseStepId,
      option_code: solution.id,
      content: solution.text,
      icon_name: null,
      color_hex: null,
      color_label: null,
      is_correct: solution.suitability === 'optimal',
      is_acceptable: solution.suitability === 'acceptable' ? true : null,
      feedback_text: solution.explanation,
    })),
    hints: [],
  })

  return {
    scene,
    steps,
    sessionContext: { studentId: context.studentId, resourceId: context.resourceId, startedAt: Date.now() },
  }
}
