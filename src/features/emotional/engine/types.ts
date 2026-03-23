import type {
  CareSceneResourceMeta,
  EmotionalBaseEmotion,
  EmotionalCareType,
  EmotionalReasoningQuestionType,
  EmotionalSessionConfig,
  EmotionalSessionOption,
  EmotionalSessionPhase,
  EmotionalSessionStepDefinition,
  EmotionalSolutionRank,
  EmotionalStepType,
  EmotionSceneResourceMeta,
} from '@/types/emotional'

export interface EmotionalCompileContext {
  studentId: number
  resourceId: number
  resourceName: string
  resourceDescription?: string
  coverImage?: string
}

export interface EmotionalSceneVisualInfo {
  imageUrl?: string
  coverImage?: string
  emotionColorHex?: string
  emotionColorToken?: EmotionSceneResourceMeta['emotionColorToken'] | CareSceneResourceMeta['emotionColorToken']
  emotionColorLabel?: string
}

export interface SceneIntroStepMetadata {
  variant: 'emotion_scene' | 'care_scene'
  title: string
  description?: string
  clues?: string[]
  speakerPerspectiveText?: string
  receiverPerspectiveText?: string
  sceneVisual: EmotionalSceneVisualInfo
}

export interface EmotionChoiceStepMetadata {
  targetEmotion: EmotionalBaseEmotion
  emotionColorHex?: string
  emotionColorToken?: EmotionSceneResourceMeta['emotionColorToken']
  emotionColorLabel?: string
}

export interface EmotionChoiceOptionMetadata {
  emotion: EmotionalBaseEmotion
}

export interface ReasoningQuestionStepMetadata {
  questionType: EmotionalReasoningQuestionType
  feedbackMode: 'gentle'
}

export interface ReasoningQuestionOptionMetadata {
  feedbackText: string
}

export interface SolutionChoiceStepMetadata {
  displayIntent: 'supportive_response'
}

export interface SolutionChoiceOptionMetadata {
  explanation: string
  suitability: EmotionalSolutionRank
}

export interface CareUtteranceStepMetadata {
  speakerPerspectiveText: string
}

export interface CareUtteranceOptionMetadata {
  utteranceType: EmotionalCareType
  effect: string
  receiverReactionText?: string
  receiverReactionEmoji?: string
}

export interface ReceiverPreferenceStepMetadata {
  receiverPerspectiveText: string
}

export interface ReceiverPreferenceOptionMetadata {
  reasonText: string
  isComforting: boolean
}

type TypedOption<TMetadata> = Omit<EmotionalSessionOption, 'metadata'> & {
  metadata: TMetadata
}

type TypedStep<
  TPhase extends EmotionalSessionPhase,
  TStepType extends EmotionalStepType,
  TMetadata,
  TOptionMetadata = never,
> = Omit<EmotionalSessionStepDefinition, 'phase' | 'stepType' | 'metadata' | 'options'> & {
  phase: TPhase
  stepType: TStepType
  metadata: TMetadata
  options?: [TOptionMetadata] extends [never] ? never : Array<TypedOption<TOptionMetadata>>
}

export type EmotionSceneIntroStep = TypedStep<'scene_intro', 'emotion_choice', SceneIntroStepMetadata>

export type CareSceneIntroStep = TypedStep<'scene_intro', 'care_utterance', SceneIntroStepMetadata>

export type EmotionChoiceStep = TypedStep<
  'emotion_recognition',
  'emotion_choice',
  EmotionChoiceStepMetadata,
  EmotionChoiceOptionMetadata
>

export type ReasoningQuestionStep = TypedStep<
  'reasoning',
  'reasoning_question',
  ReasoningQuestionStepMetadata,
  ReasoningQuestionOptionMetadata
>

export type SolutionChoiceStep = TypedStep<
  'solution',
  'solution_choice',
  SolutionChoiceStepMetadata,
  SolutionChoiceOptionMetadata
>

export type CareUtteranceStep = TypedStep<
  'solution',
  'care_utterance',
  CareUtteranceStepMetadata,
  CareUtteranceOptionMetadata
>

export type ReceiverPreferenceStep = TypedStep<
  'perspective_taking',
  'receiver_preference',
  ReceiverPreferenceStepMetadata,
  ReceiverPreferenceOptionMetadata
>

export type EmotionalCompiledStep =
  | EmotionSceneIntroStep
  | CareSceneIntroStep
  | EmotionChoiceStep
  | ReasoningQuestionStep
  | SolutionChoiceStep
  | CareUtteranceStep
  | ReceiverPreferenceStep

export type EmotionalCompiledSessionConfig = Omit<EmotionalSessionConfig, 'steps'> & {
  steps: EmotionalCompiledStep[]
}
