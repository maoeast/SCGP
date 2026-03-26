import currentEmotionScenesRaw from '../../docs/references/emotion-scene/current-emotion-scenes-export.json?raw'
import emotionTaxonomyRaw from '../../docs/references/emotion-scene/emotion-scene-taxonomy-2026-03-24.csv?raw'
import careScenesRaw from '../../care_scenes_database.json?raw'
import type {
  CareSceneReceiverOption,
  CareSceneResourceMeta,
  CareSceneUtterance,
  EmotionScenePrompt,
  EmotionScenePromptOption,
  EmotionSceneResourceMeta,
  EmotionSceneSolution,
  EmotionalBaseEmotion,
  EmotionalCareType,
  EmotionalColorToken,
  EmotionalReasoningQuestionType,
  EmotionalResourceType,
  EmotionalSceneDomain,
  EmotionalSolutionRank,
} from '@/types/emotional'

type EmotionalSeedMetadata = EmotionSceneResourceMeta | CareSceneResourceMeta

export interface EmotionalSeedResource {
  resourceType: EmotionalResourceType
  name: string
  category: string
  description: string
  coverImage?: string
  tags: string[]
  metadata: EmotionalSeedMetadata
}

interface EmotionSceneTaxonomyEntry {
  themeCategory: string
  sceneDomain?: EmotionalSceneDomain
  ageRange?: string
}

type RawEmotionScene = Record<string, unknown>
type RawCareScene = Record<string, unknown>

const EMOTION_VALUES = new Set<EmotionalBaseEmotion>([
  'calm',
  'happy',
  'sad',
  'angry',
  'scared',
  'embarrassed',
  'shy',
  'proud',
])

const REASONING_TYPES = new Set<EmotionalReasoningQuestionType>(['cause', 'need', 'empathy'])
const SOLUTION_RANKS = new Set<EmotionalSolutionRank>(['optimal', 'acceptable', 'inappropriate'])
const CARE_TYPES = new Set<EmotionalCareType>(['empathy', 'advice', 'action'])
const ABILITY_LEVELS = new Set<NonNullable<EmotionSceneResourceMeta['abilityLevel']>>([
  'primary',
  'middle',
  'advanced',
])
const SCENE_DOMAINS = new Set<EmotionalSceneDomain>([
  '家庭',
  '校园',
  '公共商业与社区',
  '交通出行',
  '医疗康复',
  '数字虚拟',
  '自然生态',
])

const EMOTION_COLORS: Record<EmotionalBaseEmotion, {
  token: EmotionalColorToken
  hex: string
  label: string
}> = {
  calm: { token: 'green', hex: '#67C23A', label: '绿色区' },
  happy: { token: 'green', hex: '#67C23A', label: '绿色区' },
  sad: { token: 'blue', hex: '#409EFF', label: '蓝色区' },
  angry: { token: 'red', hex: '#F56C6C', label: '红色区' },
  scared: { token: 'purple', hex: '#7E57C2', label: '紫色区' },
  embarrassed: { token: 'yellow', hex: '#E6A23C', label: '黄色区' },
  shy: { token: 'peach', hex: '#F7B7A3', label: '桃色区' },
  proud: { token: 'gold', hex: '#D4A017', label: '金色区' },
}

export const EMOTIONAL_RESOURCE_SEED_LEGACY_SOURCE = 'emotional_full_seed_2026_03_26'

function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function normalizeOptionalString(value: unknown): string | undefined {
  const normalized = normalizeString(value)
  return normalized || undefined
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => normalizeString(item))
    .filter((item) => item.length > 0)
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => !!value && value.length > 0)))
}

function normalizeDifficultyLevel(value: unknown): 1 | 2 | 3 {
  return value === 2 || value === 3 ? value : 1
}

function normalizeHintLevel(value: unknown): 0 | 1 | 2 | 3 | undefined {
  return value === 0 || value === 1 || value === 2 || value === 3 ? value : undefined
}

function normalizeEmotion(value: unknown, fallback: EmotionalBaseEmotion): EmotionalBaseEmotion {
  return EMOTION_VALUES.has(value as EmotionalBaseEmotion) ? value as EmotionalBaseEmotion : fallback
}

function normalizeReasoningType(
  value: unknown,
  fallback: EmotionalReasoningQuestionType
): EmotionalReasoningQuestionType {
  return REASONING_TYPES.has(value as EmotionalReasoningQuestionType)
    ? value as EmotionalReasoningQuestionType
    : fallback
}

function normalizeSolutionRank(value: unknown, fallback: EmotionalSolutionRank): EmotionalSolutionRank {
  return SOLUTION_RANKS.has(value as EmotionalSolutionRank)
    ? value as EmotionalSolutionRank
    : fallback
}

function normalizeCareType(value: unknown, fallback: EmotionalCareType): EmotionalCareType {
  return CARE_TYPES.has(value as EmotionalCareType) ? value as EmotionalCareType : fallback
}

function normalizeAbilityLevel(
  value: unknown
): EmotionSceneResourceMeta['abilityLevel'] | CareSceneResourceMeta['abilityLevel'] | undefined {
  return ABILITY_LEVELS.has(value as NonNullable<EmotionSceneResourceMeta['abilityLevel']>)
    ? value as NonNullable<EmotionSceneResourceMeta['abilityLevel']>
    : undefined
}

function normalizeSceneDomain(value: unknown): EmotionalSceneDomain | undefined {
  return SCENE_DOMAINS.has(value as EmotionalSceneDomain) ? value as EmotionalSceneDomain : undefined
}

function ensureArrayOfObjects<T extends Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter((item): item is T => !!item && typeof item === 'object') : []
}

function parseJsonArray<T>(raw: string, label: string): T[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed as T[]
    }
  } catch {
    // Fallback handled below.
  }

  const items: T[] = []
  let inString = false
  let escaped = false
  let depth = 0
  let start = -1

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) {
      continue
    }
    if (char === '{') {
      if (depth === 0) {
        start = index
      }
      depth += 1
      continue
    }
    if (char === '}') {
      depth -= 1
      if (depth === 0 && start >= 0) {
        items.push(JSON.parse(raw.slice(start, index + 1)) as T)
        start = -1
      }
    }
  }

  if (items.length === 0) {
    throw new Error(`${label} is not a valid JSON array`)
  }

  return items
}

function parseEmotionTaxonomy(raw: string): Map<string, EmotionSceneTaxonomyEntry> {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const result = new Map<string, EmotionSceneTaxonomyEntry>()
  for (const line of lines.slice(1)) {
    const [sceneCode, , themeCategory, sceneDomain, ageRange] = line.split(',')
    const code = normalizeString(sceneCode)
    if (!code) {
      continue
    }

    result.set(code, {
      themeCategory: normalizeString(themeCategory),
      sceneDomain: normalizeSceneDomain(sceneDomain),
      ageRange: normalizeOptionalString(ageRange),
    })
  }

  return result
}

function normalizePromptOptions(value: unknown): EmotionScenePromptOption[] {
  return ensureArrayOfObjects<Record<string, unknown>>(value).map((option, optionIndex) => ({
    id: normalizeString(option.id, `option_${optionIndex + 1}`),
    text: normalizeString(option.text, `Option ${optionIndex + 1}`),
    imageUrl: normalizeOptionalString(option.imageUrl),
    isCorrect: option.isCorrect === true,
    isAcceptable: option.isAcceptable === true ? true : undefined,
    feedbackText: normalizeString(option.feedbackText, '请根据场景线索再想一想。'),
  }))
}

function normalizePrompts(value: unknown): EmotionScenePrompt[] {
  return ensureArrayOfObjects<Record<string, unknown>>(value).map((prompt, promptIndex) => ({
    questionId: normalizeString(prompt.questionId, `prompt_${promptIndex + 1}`),
    questionType: normalizeReasoningType(prompt.questionType, 'cause'),
    questionText: normalizeString(prompt.questionText, '请选择最合适的答案。'),
    options: normalizePromptOptions(prompt.options),
  }))
}

function normalizeSolutions(value: unknown): EmotionSceneSolution[] {
  return ensureArrayOfObjects<Record<string, unknown>>(value).map((solution, solutionIndex) => ({
    id: normalizeString(solution.id, `solution_${solutionIndex + 1}`),
    text: normalizeString(solution.text, `Solution ${solutionIndex + 1}`),
    imageUrl: normalizeOptionalString(solution.imageUrl),
    suitability: normalizeSolutionRank(
      solution.suitability,
      solutionIndex === 0 ? 'optimal' : 'acceptable'
    ),
    explanation: normalizeString(solution.explanation, '这是一个可以继续讨论的回应方式。'),
  }))
}

function normalizeUtterances(value: unknown): CareSceneUtterance[] {
  return ensureArrayOfObjects<Record<string, unknown>>(value).map((utterance, utteranceIndex) => ({
    id: normalizeString(utterance.id, `utterance_${utteranceIndex + 1}`),
    type: normalizeCareType(
      utterance.type,
      utteranceIndex === 0 ? 'empathy' : utteranceIndex === 1 ? 'advice' : 'action'
    ),
    text: normalizeString(utterance.text, `Utterance ${utteranceIndex + 1}`),
    effect: normalizeString(utterance.effect, '这是一种可以继续讨论的表达方式。'),
    receiverReactionText: normalizeOptionalString(utterance.receiverReactionText),
    receiverReactionEmoji: normalizeOptionalString(utterance.receiverReactionEmoji),
  }))
}

function normalizeReceiverOptions(value: unknown): CareSceneReceiverOption[] {
  return ensureArrayOfObjects<Record<string, unknown>>(value).map((option, optionIndex) => ({
    id: normalizeString(option.id, `receiver_${optionIndex + 1}`),
    text: normalizeString(option.text, `Receiver option ${optionIndex + 1}`),
    isComforting: option.isComforting === true,
    reasonText: normalizeString(option.reasonText, '请结合对方感受继续讨论。'),
  }))
}

const emotionTaxonomy = parseEmotionTaxonomy(emotionTaxonomyRaw)

function normalizeEmotionScene(raw: RawEmotionScene, index: number): EmotionSceneResourceMeta {
  const sceneCode = normalizeString(raw.sceneCode, `emotion_scene_${index + 1}`)
  const taxonomy = emotionTaxonomy.get(sceneCode)
  const targetEmotion = normalizeEmotion(raw.targetEmotion, 'happy')
  const color = EMOTION_COLORS[targetEmotion]
  const emotionOptions = uniqueStrings(normalizeStringArray(raw.emotionOptions))
    .map((item) => normalizeEmotion(item, targetEmotion))
    .filter((item, optionIndex, items) => items.indexOf(item) === optionIndex)

  if (!emotionOptions.includes(targetEmotion)) {
    emotionOptions.unshift(targetEmotion)
  }

  return {
    sceneCode,
    title: normalizeString(raw.title, `情绪场景 ${index + 1}`),
    imageUrl: normalizeString(raw.imageUrl),
    difficultyLevel: normalizeDifficultyLevel(raw.difficultyLevel),
    targetEmotion,
    sceneDomain: normalizeSceneDomain(raw.sceneDomain) || taxonomy?.sceneDomain,
    emotionOptions: emotionOptions.length > 0 ? emotionOptions : [targetEmotion],
    emotionClues: normalizeStringArray(raw.emotionClues),
    prompts: normalizePrompts(raw.prompts),
    solutions: normalizeSolutions(raw.solutions),
    recommendedHintCeiling: normalizeHintLevel(raw.recommendedHintCeiling),
    emotionColorToken: color.token,
    emotionColorHex: color.hex,
    emotionColorLabel: color.label,
    ageRange: normalizeOptionalString(raw.ageRange) || taxonomy?.ageRange,
    abilityLevel: normalizeAbilityLevel(raw.abilityLevel),
    tags: normalizeStringArray(raw.tags),
  }
}

function normalizeCareScene(raw: RawCareScene, index: number): CareSceneResourceMeta {
  const receiverEmotion = normalizeEmotion(raw.receiverEmotion, 'sad')
  const color = EMOTION_COLORS[receiverEmotion]
  const utterances = normalizeUtterances(raw.utterances)
  const preferredUtteranceIds = normalizeStringArray(raw.preferredUtteranceIds)
    .filter((utteranceId) => utterances.some((utterance) => utterance.id === utteranceId))

  return {
    sceneCode: normalizeString(raw.sceneCode, `care_scene_${index + 1}`),
    title: normalizeString(raw.title, `表达关心 ${index + 1}`),
    imageUrl: normalizeString(raw.imageUrl),
    difficultyLevel: normalizeDifficultyLevel(raw.difficultyLevel),
    careType: normalizeCareType(raw.careType, 'empathy'),
    receiverEmotion,
    emotionColorToken: color.token,
    emotionColorHex: color.hex,
    emotionColorLabel: color.label,
    speakerPerspectiveText: normalizeString(raw.speakerPerspectiveText, '请从表达者视角思考。'),
    receiverPerspectiveText: normalizeString(raw.receiverPerspectiveText, '请从接收者视角思考。'),
    utterances,
    receiverOptions: normalizeReceiverOptions(raw.receiverOptions),
    preferredUtteranceIds: preferredUtteranceIds.length > 0
      ? preferredUtteranceIds
      : utterances.slice(0, 2).map((utterance) => utterance.id),
    recommendedHintCeiling: normalizeHintLevel(raw.recommendedHintCeiling),
    ageRange: normalizeOptionalString(raw.ageRange),
    abilityLevel: normalizeAbilityLevel(raw.abilityLevel),
    tags: normalizeStringArray(raw.tags),
  }
}

const rawEmotionScenes = parseJsonArray<RawEmotionScene>(
  currentEmotionScenesRaw,
  'current-emotion-scenes-export.json'
)

const rawCareScenes = parseJsonArray<RawCareScene>(
  careScenesRaw,
  'care_scenes_database.json'
)

const emotionResources: EmotionalSeedResource[] = rawEmotionScenes.map((rawScene, index) => {
  const metadata = normalizeEmotionScene(rawScene, index)
  const taxonomy = emotionTaxonomy.get(metadata.sceneCode)
  const tags = uniqueStrings([
    ...normalizeStringArray(rawScene.tags),
    taxonomy?.themeCategory,
    metadata.sceneDomain,
  ])

  return {
    resourceType: 'emotion_scene',
    name: metadata.title,
    category: taxonomy?.themeCategory || tags[0] || 'imported_emotion_scene',
    description: normalizeString(rawScene.description, metadata.title),
    coverImage: metadata.imageUrl || '',
    tags,
    metadata,
  }
})

const careResources: EmotionalSeedResource[] = rawCareScenes.map((rawScene, index) => {
  const metadata = normalizeCareScene(rawScene, index)
  const tags = uniqueStrings([
    ...normalizeStringArray(rawScene.tags),
    metadata.careType,
    metadata.receiverEmotion,
  ])

  return {
    resourceType: 'care_scene',
    name: metadata.title,
    category: tags[0] || 'imported_care_scene',
    description: normalizeString(rawScene.description, metadata.title),
    coverImage: metadata.imageUrl || '',
    tags,
    metadata,
  }
})

export const EMOTIONAL_SEED_RESOURCES: EmotionalSeedResource[] = [
  ...emotionResources,
  ...careResources,
]

export const EMOTIONAL_SEED_COUNTS = {
  emotionSceneCount: emotionResources.length,
  careSceneCount: careResources.length,
  totalCount: emotionResources.length + careResources.length,
} as const
