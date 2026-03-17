import type {
  CareSceneReceiverOption,
  CareSceneResourceMeta,
  CareSceneUtterance,
  EmotionalBaseEmotion,
  EmotionalCareType,
  EmotionalReasoningQuestionType,
  EmotionalSolutionRank,
  EmotionScenePrompt,
  EmotionScenePromptOption,
  EmotionSceneResourceMeta,
  EmotionSceneSolution,
} from '@/types/emotional'

export const DEFAULT_EMOTION_OPTIONS: EmotionalBaseEmotion[] = [
  'happy',
  'sad',
  'embarrassed',
  'angry',
  'scared',
]

export const REASONING_TYPE_OPTIONS: Array<{
  value: EmotionalReasoningQuestionType
  label: string
}> = [
  { value: 'cause', label: '原因推理' },
  { value: 'need', label: '需求推理' },
  { value: 'empathy', label: '换位思考' },
]

export const SOLUTION_RANK_OPTIONS: Array<{
  value: EmotionalSolutionRank
  label: string
}> = [
  { value: 'optimal', label: '最佳' },
  { value: 'acceptable', label: '可接受' },
  { value: 'inappropriate', label: '不合适' },
]

export const CARE_TYPE_OPTIONS: Array<{
  value: EmotionalCareType
  label: string
}> = [
  { value: 'empathy', label: '共情式' },
  { value: 'advice', label: '建议式' },
  { value: 'action', label: '行动式' },
]

export const EMOTION_COLOR_PRESETS: Record<
  EmotionalBaseEmotion,
  { token: 'green' | 'blue' | 'yellow' | 'red'; hex: string; label: string }
> = {
  happy: { token: 'green', hex: '#67C23A', label: '绿色区' },
  sad: { token: 'blue', hex: '#409EFF', label: '蓝色区' },
  embarrassed: { token: 'yellow', hex: '#E6A23C', label: '黄色区' },
  angry: { token: 'red', hex: '#F56C6C', label: '红色区' },
  scared: { token: 'red', hex: '#F56C6C', label: '红色区' },
}

const ABILITY_LEVELS = ['primary', 'middle', 'advanced'] as const
const HINT_LEVELS = [0, 1, 2, 3] as const
const REASONING_TYPES = ['cause', 'need', 'empathy'] as const
const SOLUTION_RANKS = ['optimal', 'acceptable', 'inappropriate'] as const
const CARE_TYPES = ['empathy', 'advice', 'action'] as const

function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function normalizeDifficultyLevel(value: unknown): 1 | 2 | 3 {
  return value === 2 || value === 3 ? value : 1
}

function normalizeHintLevel(value: unknown): 0 | 1 | 2 | 3 | undefined {
  return HINT_LEVELS.includes(value as 0 | 1 | 2 | 3) ? (value as 0 | 1 | 2 | 3) : undefined
}

function normalizeAbilityLevel(value: unknown): 'primary' | 'middle' | 'advanced' | undefined {
  return ABILITY_LEVELS.includes(value as 'primary' | 'middle' | 'advanced')
    ? (value as 'primary' | 'middle' | 'advanced')
    : undefined
}

function normalizeEmotion(value: unknown, fallback: EmotionalBaseEmotion): EmotionalBaseEmotion {
  return DEFAULT_EMOTION_OPTIONS.includes(value as EmotionalBaseEmotion)
    ? (value as EmotionalBaseEmotion)
    : fallback
}

function normalizeCareType(value: unknown, fallback: EmotionalCareType): EmotionalCareType {
  return CARE_TYPES.includes(value as EmotionalCareType)
    ? (value as EmotionalCareType)
    : fallback
}

function normalizeQuestionType(
  value: unknown,
  fallback: EmotionalReasoningQuestionType
): EmotionalReasoningQuestionType {
  return REASONING_TYPES.includes(value as EmotionalReasoningQuestionType)
    ? (value as EmotionalReasoningQuestionType)
    : fallback
}

function normalizeSolutionRank(value: unknown, fallback: EmotionalSolutionRank): EmotionalSolutionRank {
  return SOLUTION_RANKS.includes(value as EmotionalSolutionRank)
    ? (value as EmotionalSolutionRank)
    : fallback
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback]
  const normalized = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
  return normalized.length > 0 ? normalized : [...fallback]
}

function normalizeEmotionOptions(value: unknown, targetEmotion: EmotionalBaseEmotion): EmotionalBaseEmotion[] {
  const source = Array.isArray(value) ? value : DEFAULT_EMOTION_OPTIONS
  const unique = Array.from(
    new Set(
      source.filter((item): item is EmotionalBaseEmotion =>
        DEFAULT_EMOTION_OPTIONS.includes(item as EmotionalBaseEmotion)
      )
    )
  )

  if (!unique.includes(targetEmotion)) {
    unique.unshift(targetEmotion)
  }

  return unique.length > 0 ? unique : [...DEFAULT_EMOTION_OPTIONS]
}

function normalizeEmotionColorPayload(emotion: EmotionalBaseEmotion) {
  const preset = EMOTION_COLOR_PRESETS[emotion]
  return {
    emotionColorToken: preset.token,
    emotionColorHex: preset.hex,
    emotionColorLabel: preset.label,
  }
}

function normalizePromptOption(
  value: unknown,
  index: number,
  fallbackCorrect = index === 0
): EmotionScenePromptOption {
  const option = value as Partial<EmotionScenePromptOption> | undefined
  return {
    id: normalizeString(option?.id, `option_${index + 1}`),
    text: normalizeString(option?.text, index === 0 ? '请填写正确选项' : '请填写干扰选项'),
    imageUrl: normalizeOptionalString(option?.imageUrl),
    isCorrect: typeof option?.isCorrect === 'boolean' ? option.isCorrect : fallbackCorrect,
    isAcceptable: typeof option?.isAcceptable === 'boolean' ? option.isAcceptable : undefined,
    feedbackText: normalizeString(option?.feedbackText, '请填写温和反馈'),
  }
}

export function createEmotionScenePromptOption(index: number, isCorrect = index === 0): EmotionScenePromptOption {
  return normalizePromptOption(undefined, index, isCorrect)
}

function normalizePrompt(value: unknown, index: number): EmotionScenePrompt {
  const prompt = value as Partial<EmotionScenePrompt> | undefined
  const options = Array.isArray(prompt?.options) && prompt?.options.length > 0
    ? prompt.options.map((item, optionIndex) => normalizePromptOption(item, optionIndex))
    : [
        normalizePromptOption(undefined, 0, true),
        normalizePromptOption(undefined, 1, false),
      ]

  return {
    questionId: normalizeString(prompt?.questionId, `prompt_${index + 1}`),
    questionType: normalizeQuestionType(prompt?.questionType, 'cause'),
    questionText: normalizeString(prompt?.questionText, '请填写原因推理问题'),
    options,
  }
}

export function createEmotionScenePrompt(index: number): EmotionScenePrompt {
  return normalizePrompt(undefined, index)
}

function normalizeSolution(value: unknown, index: number): EmotionSceneSolution {
  const solution = value as Partial<EmotionSceneSolution> | undefined
  return {
    id: normalizeString(solution?.id, `solution_${index + 1}`),
    text: normalizeString(solution?.text, '请填写回应选项'),
    imageUrl: normalizeOptionalString(solution?.imageUrl),
    suitability: normalizeSolutionRank(solution?.suitability, index === 0 ? 'optimal' : 'acceptable'),
    explanation: normalizeString(solution?.explanation, '请填写该回应的解释说明'),
  }
}

export function createEmotionSceneSolution(index: number): EmotionSceneSolution {
  return normalizeSolution(undefined, index)
}

function normalizeUtterance(value: unknown, index: number): CareSceneUtterance {
  const utterance = value as Partial<CareSceneUtterance> | undefined
  const fallbackType = CARE_TYPES[Math.min(index, CARE_TYPES.length - 1)] || 'empathy'
  return {
    id: normalizeString(utterance?.id, `utterance_${index + 1}`),
    type: normalizeCareType(utterance?.type, fallbackType),
    text: normalizeString(utterance?.text, '请填写关心表达'),
    effect: normalizeString(utterance?.effect, '请填写这句话会带来的效果'),
    receiverReactionText: normalizeOptionalString(utterance?.receiverReactionText),
    receiverReactionEmoji: normalizeOptionalString(utterance?.receiverReactionEmoji),
  }
}

export function createCareSceneUtterance(index: number): CareSceneUtterance {
  return normalizeUtterance(undefined, index)
}

function normalizeReceiverOption(value: unknown, index: number): CareSceneReceiverOption {
  const option = value as Partial<CareSceneReceiverOption> | undefined
  return {
    id: normalizeString(option?.id, `receiver_${index + 1}`),
    text: normalizeString(option?.text, '请填写接收者视角选项'),
    isComforting: typeof option?.isComforting === 'boolean' ? option.isComforting : index === 0,
    reasonText: normalizeString(option?.reasonText, '请填写原因说明'),
  }
}

export function createCareSceneReceiverOption(index: number): CareSceneReceiverOption {
  return normalizeReceiverOption(undefined, index)
}

export function createEmotionSceneEditorModel(resourceName = ''): EmotionSceneResourceMeta {
  return normalizeEmotionSceneEditorModel(undefined, resourceName)
}

export function createCareSceneEditorModel(resourceName = ''): CareSceneResourceMeta {
  return normalizeCareSceneEditorModel(undefined, resourceName)
}

export function normalizeEmotionSceneEditorModel(
  value: unknown,
  resourceName = ''
): EmotionSceneResourceMeta {
  const model = value as Partial<EmotionSceneResourceMeta> | undefined
  const targetEmotion = normalizeEmotion(model?.targetEmotion, 'happy')
  const prompts = Array.isArray(model?.prompts) && model?.prompts.length > 0
    ? model.prompts.map((item, index) => normalizePrompt(item, index))
    : [normalizePrompt(undefined, 0)]
  const solutions = Array.isArray(model?.solutions) && model?.solutions.length > 0
    ? model.solutions.map((item, index) => normalizeSolution(item, index))
    : [
        normalizeSolution(undefined, 0),
        normalizeSolution({ suitability: 'inappropriate', text: '请填写不合适回应' }, 1),
      ]

  return {
    sceneCode: normalizeString(model?.sceneCode, `emotion_scene_${Date.now()}`),
    title: normalizeString(model?.title, resourceName || '新的情绪场景'),
    imageUrl: normalizeString(model?.imageUrl),
    difficultyLevel: normalizeDifficultyLevel(model?.difficultyLevel),
    targetEmotion,
    emotionOptions: normalizeEmotionOptions(model?.emotionOptions, targetEmotion),
    emotionClues: normalizeStringArray(model?.emotionClues, ['请补充视觉线索 1', '请补充视觉线索 2']),
    prompts,
    solutions,
    recommendedHintCeiling: normalizeHintLevel(model?.recommendedHintCeiling),
    ageRange: normalizeOptionalString(model?.ageRange),
    abilityLevel: normalizeAbilityLevel(model?.abilityLevel),
    tags: Array.isArray(model?.tags)
      ? model.tags.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [],
    ...normalizeEmotionColorPayload(targetEmotion),
  }
}

export function validateEmotionSceneEditorModel(model: EmotionSceneResourceMeta): string[] {
  const errors: string[] = []

  if (!model.title.trim()) {
    errors.push('请填写场景标题')
  }

  if (!model.sceneCode.trim()) {
    errors.push('请填写场景编码')
  }

  if (model.emotionClues.length === 0 || model.emotionClues.every((item) => !item.trim())) {
    errors.push('请至少填写 1 条情绪线索')
  }

  if (model.prompts.length === 0) {
    errors.push('请至少配置 1 个社交推理问题')
  }

  model.prompts.forEach((prompt, promptIndex) => {
    if (!prompt.questionText.trim()) {
      errors.push(`第 ${promptIndex + 1} 个推理问题缺少题目文字`)
    }

    if (prompt.options.length < 2) {
      errors.push(`第 ${promptIndex + 1} 个推理问题至少需要 2 个选项`)
    }

    const correctCount = prompt.options.filter((option) => option.isCorrect).length
    if (correctCount !== 1) {
      errors.push(`第 ${promptIndex + 1} 个推理问题需要且只能有 1 个正确答案`)
    }

    prompt.options.forEach((option, optionIndex) => {
      if (!option.text.trim()) {
        errors.push(`第 ${promptIndex + 1} 题的第 ${optionIndex + 1} 个选项缺少文字`)
      }
      if (!option.feedbackText.trim()) {
        errors.push(`第 ${promptIndex + 1} 题的第 ${optionIndex + 1} 个选项缺少反馈解释`)
      }
    })
  })

  if (model.solutions.length === 0) {
    errors.push('请至少配置 1 个应对方案')
  }

  model.solutions.forEach((solution, solutionIndex) => {
    if (!solution.text.trim()) {
      errors.push(`第 ${solutionIndex + 1} 个应对方案缺少方案文字`)
    }
    if (!solution.explanation.trim()) {
      errors.push(`第 ${solutionIndex + 1} 个应对方案缺少效果说明`)
    }
  })

  return Array.from(new Set(errors))
}

export function normalizeCareSceneEditorModel(
  value: unknown,
  resourceName = ''
): CareSceneResourceMeta {
  const model = value as Partial<CareSceneResourceMeta> | undefined
  const receiverEmotion = normalizeEmotion(model?.receiverEmotion, 'sad')
  const utterances = Array.isArray(model?.utterances) && model?.utterances.length > 0
    ? model.utterances.map((item, index) => normalizeUtterance(item, index))
    : [
        normalizeUtterance({ type: 'empathy' }, 0),
        normalizeUtterance({ type: 'advice' }, 1),
        normalizeUtterance({ type: 'action' }, 2),
      ]
  const receiverOptions = Array.isArray(model?.receiverOptions) && model?.receiverOptions.length > 0
    ? model.receiverOptions.map((item, index) => normalizeReceiverOption(item, index))
    : [
        normalizeReceiverOption({ isComforting: true }, 0),
        normalizeReceiverOption({ isComforting: false }, 1),
      ]
  const preferredUtteranceIds = Array.isArray(model?.preferredUtteranceIds)
    ? model.preferredUtteranceIds.filter(
        (item): item is string => typeof item === 'string' && utterances.some((utterance) => utterance.id === item)
      )
    : []

  return {
    sceneCode: normalizeString(model?.sceneCode, `care_scene_${Date.now()}`),
    title: normalizeString(model?.title, resourceName || '新的表达关心场景'),
    imageUrl: normalizeString(model?.imageUrl),
    difficultyLevel: normalizeDifficultyLevel(model?.difficultyLevel),
    careType: normalizeCareType(model?.careType, 'empathy'),
    receiverEmotion,
    speakerPerspectiveText: normalizeString(model?.speakerPerspectiveText, '请填写表达者视角文本'),
    receiverPerspectiveText: normalizeString(model?.receiverPerspectiveText, '请填写接收者视角文本'),
    utterances,
    receiverOptions,
    preferredUtteranceIds:
      preferredUtteranceIds.length > 0 ? preferredUtteranceIds : utterances.slice(0, 2).map((item) => item.id),
    recommendedHintCeiling: normalizeHintLevel(model?.recommendedHintCeiling),
    ageRange: normalizeOptionalString(model?.ageRange),
    abilityLevel: normalizeAbilityLevel(model?.abilityLevel),
    tags: Array.isArray(model?.tags)
      ? model.tags.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [],
    ...normalizeEmotionColorPayload(receiverEmotion),
  }
}

export function validateCareSceneEditorModel(model: CareSceneResourceMeta): string[] {
  const errors: string[] = []

  if (!model.title.trim()) {
    errors.push('请填写情境标题')
  }

  if (!model.sceneCode.trim()) {
    errors.push('请填写场景编码')
  }

  if (!model.speakerPerspectiveText.trim()) {
    errors.push('请填写表达者视角提示')
  }

  if (!model.receiverPerspectiveText.trim()) {
    errors.push('请填写接收者视角提示')
  }

  if (model.utterances.length === 0) {
    errors.push('请至少配置 1 条表达者视角话术')
  }

  model.utterances.forEach((utterance, utteranceIndex) => {
    if (!utterance.text.trim()) {
      errors.push(`第 ${utteranceIndex + 1} 条表达者话术缺少文字`)
    }
    if (!utterance.effect.trim()) {
      errors.push(`第 ${utteranceIndex + 1} 条表达者话术缺少效果说明`)
    }
  })

  if (model.receiverOptions.length === 0) {
    errors.push('请至少配置 1 条接收者视角选项')
  }

  model.receiverOptions.forEach((option, optionIndex) => {
    if (!option.text.trim()) {
      errors.push(`第 ${optionIndex + 1} 条接收者选项缺少文字`)
    }
    if (!option.reasonText.trim()) {
      errors.push(`第 ${optionIndex + 1} 条接收者选项缺少原因解释`)
    }
  })

  if (!model.receiverOptions.some((option) => option.isComforting)) {
    errors.push('接收者视角至少需要 1 条“最舒服”的表达')
  }

  if (model.preferredUtteranceIds.length === 0) {
    errors.push('请至少勾选 1 条推荐话术')
  }

  return Array.from(new Set(errors))
}
