export type EmotionalSubModule = 'emotion_scene' | 'care_scene'

export type EmotionalResourceType = EmotionalSubModule

export type EmotionalBaseEmotion =
  | 'happy'
  | 'sad'
  | 'embarrassed'
  | 'angry'
  | 'scared'

export type EmotionalReasoningQuestionType = 'cause' | 'need' | 'empathy'

export type EmotionalSolutionRank = 'optimal' | 'acceptable' | 'inappropriate'

export type EmotionalCareType = 'empathy' | 'advice' | 'action'

export type EmotionalSessionType =
  | 'game_session'
  | 'emotion_scene'
  | 'care_scene'

export type EmotionalStepType =
  | 'emotion_choice'
  | 'reasoning_question'
  | 'solution_choice'
  | 'care_utterance'
  | 'receiver_preference'

export type EmotionalPerspective = 'sender' | 'receiver' | 'none'

export type EmotionalFeedbackCode = 'correct' | 'acceptable' | 'retry' | 'guided' | 'modelled'

export interface EmotionScenePromptOption {
  id: string
  text: string
  imageUrl?: string
  isCorrect: boolean
  isAcceptable?: boolean
  feedbackText: string
}

export interface EmotionScenePrompt {
  questionId: string
  questionType: EmotionalReasoningQuestionType
  questionText: string
  options: EmotionScenePromptOption[]
}

export interface EmotionSceneSolution {
  id: string
  text: string
  imageUrl?: string
  suitability: EmotionalSolutionRank
  explanation: string
}

export interface EmotionSceneResourceMeta {
  sceneCode: string
  title: string
  imageUrl: string
  difficultyLevel: 1 | 2 | 3
  targetEmotion: EmotionalBaseEmotion
  emotionOptions: EmotionalBaseEmotion[]
  emotionClues: string[]
  prompts: EmotionScenePrompt[]
  solutions: EmotionSceneSolution[]
  recommendedHintCeiling?: 0 | 1 | 2 | 3
  emotionColorToken?: 'green' | 'blue' | 'yellow' | 'red'
  emotionColorHex?: string
  emotionColorLabel?: string
  ageRange?: string
  abilityLevel?: 'primary' | 'middle' | 'advanced'
  tags?: string[]
}

export interface CareSceneUtterance {
  id: string
  type: EmotionalCareType
  text: string
  effect: string
  receiverReactionText?: string
  receiverReactionEmoji?: string
}

export interface CareSceneReceiverOption {
  id: string
  text: string
  isComforting: boolean
  reasonText: string
}

export interface CareSceneResourceMeta {
  sceneCode: string
  title: string
  imageUrl: string
  difficultyLevel: 1 | 2 | 3
  careType?: EmotionalCareType
  receiverEmotion?: EmotionalBaseEmotion
  emotionColorToken?: 'green' | 'blue' | 'yellow' | 'red'
  emotionColorHex?: string
  emotionColorLabel?: string
  speakerPerspectiveText: string
  receiverPerspectiveText: string
  utterances: CareSceneUtterance[]
  receiverOptions: CareSceneReceiverOption[]
  preferredUtteranceIds: string[]
  recommendedHintCeiling?: 0 | 1 | 2 | 3
  ageRange?: string
  abilityLevel?: 'primary' | 'middle' | 'advanced'
  tags?: string[]
}

export interface EmotionalTrainingSummaryRawData {
  subModule: EmotionalSubModule
  resourceId: number
  resourceType: EmotionalResourceType
  sessionType: EmotionalSessionType
  correctCount: number
  questionCount: number
  hintCount: number
  retryCount: number
  dominantChoiceType?: EmotionalCareType | null
  preferredPerspective?: EmotionalPerspective | null
}

export interface EmotionalTrainingSessionEntity {
  id?: number
  training_record_id: number
  student_id: number
  module_code: 'emotional'
  sub_module: EmotionalSubModule
  resource_id: number
  resource_type: EmotionalResourceType
  start_time: string
  end_time?: string | null
  duration_ms: number
  question_count: number
  correct_count: number
  accuracy_rate: number
  hint_count: number
  retry_count: number
  completion_status: 'completed' | 'cancelled' | 'interrupted'
  created_at?: string
}

export interface EmotionalTrainingDetailEntity {
  id?: number
  session_id: number
  student_id: number
  resource_id: number
  step_type: EmotionalStepType
  step_index: number
  prompt_id?: string | null
  selected_value?: string | null
  selected_label?: string | null
  is_correct: number
  is_acceptable: number
  hint_level: 0 | 1 | 2 | 3
  retry_count: number
  response_time_ms?: number | null
  feedback_code?: EmotionalFeedbackCode | null
  perspective: EmotionalPerspective
  created_at?: string
}

export interface EmotionalReportSummary {
  studentId: number
  totalSessions: number
  emotionRecognitionAccuracy: number
  reasoningAccuracy: number
  solutionAccuracy: number
  empathyPreferenceRate: number
  senderPerspectiveAccuracy: number
  receiverPerspectiveAccuracy: number
}

export type EmotionalSessionStatus =
  | 'idle'
  | 'running'
  | 'persisting'
  | 'completed'
  | 'cancelled'
  | 'error'

export type EmotionalSessionPhase =
  | 'scene_intro'
  | 'emotion_recognition'
  | 'reasoning'
  | 'solution'
  | 'perspective_taking'
  | 'summary'

export interface EmotionalSessionOption {
  value: string
  label: string
  isCorrect?: boolean
  isAcceptable?: boolean
  metadata?: Record<string, any>
}

export interface EmotionalSessionStepDefinition {
  key: string
  phase: EmotionalSessionPhase
  stepType: EmotionalStepType
  interactive?: boolean
  title?: string
  promptId?: string
  promptText?: string
  perspective?: EmotionalPerspective
  options?: EmotionalSessionOption[]
  correctValues?: string[]
  acceptableValues?: string[]
  metadata?: Record<string, any>
}

export interface EmotionalStepSubmitPayload {
  selectedValue: string
  selectedLabel?: string
  isCorrect?: boolean
  isAcceptable?: boolean
  feedbackCode?: EmotionalFeedbackCode
  perspective?: EmotionalPerspective
  metadata?: Record<string, any>
}

export interface EmotionalStepResult {
  stepKey: string
  stepType: EmotionalStepType
  phase: EmotionalSessionPhase
  selectedValue: string
  selectedLabel?: string
  isCorrect: boolean
  isAcceptable: boolean
  hintLevel: 0 | 1 | 2 | 3
  retryCount: number
  responseTimeMs: number
  feedbackCode?: EmotionalFeedbackCode
  perspective: EmotionalPerspective
  recordedAt: number
}

export interface EmotionalSessionConfig {
  studentId: number
  resourceId: number
  resourceType: EmotionalResourceType
  subModule: EmotionalSubModule
  steps: EmotionalSessionStepDefinition[]
  moduleCode?: 'emotional'
  startedAt?: number
  buildSummary?: (context: {
    config: EmotionalSessionConfig
    latestResults: EmotionalStepResult[]
    attempts: EmotionalStepResult[]
    totalHintCount: number
    totalRetryCount: number
  }) => Partial<EmotionalTrainingSummaryRawData>
}

export interface PersistEmotionalSessionInput {
  studentId: number
  resourceId: number
  resourceType: EmotionalResourceType
  subModule: EmotionalSubModule
  startedAt: number
  endedAt: number
  completionStatus: 'completed' | 'cancelled' | 'interrupted'
  summary: EmotionalTrainingSummaryRawData
  details: Array<Omit<EmotionalTrainingDetailEntity, 'id' | 'session_id' | 'created_at'>>
}

export interface PersistEmotionalSessionResult {
  trainingRecordId: number
  sessionId: number
  detailIds: number[]
}
