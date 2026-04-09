import currentEmotionScenesRaw from '../../docs/references/current-emotion-scenes-export.json?raw'
import emotionSceneCharacterNamesRaw from '../../docs/references/emotion-scene-character-names.json?raw'

import {
  EMOTIONAL_BASE_EMOTION_META,
  normalizeEmotionalBaseEmotion,
} from '@/features/emotional/emotion-catalog'
import type {
  EmotionalBaseEmotion,
  EmotionalSceneDomain,
} from '@/types/emotional'

interface SqlDatabase {
  exec(sql: string, params?: unknown): Array<{ columns: string[]; values: unknown[][] }>
  run(sql: string, params?: unknown): void
}

interface LegacyPromptOption {
  id?: string
  text?: string
  isCorrect?: boolean
  isAcceptable?: boolean
  feedbackText?: string
}

interface LegacyPrompt {
  questionId?: string
  questionType?: 'cause' | 'need' | 'empathy'
  questionText?: string
  options?: LegacyPromptOption[]
}

interface LegacySolution {
  id?: string
  text?: string
  suitability?: 'optimal' | 'acceptable' | 'inappropriate'
  explanation?: string
}

interface LegacyEmotionScene {
  sceneCode?: string
  title?: string
  description?: string
  imageUrl?: string
  difficultyLevel?: 1 | 2 | 3
  targetEmotion?: EmotionalBaseEmotion
  emotionOptions?: string[]
  emotionClues?: string[]
  prompts?: LegacyPrompt[]
  solutions?: LegacySolution[]
  sceneDomain?: EmotionalSceneDomain
  ageRange?: string
  abilityLevel?: 'primary' | 'middle' | 'advanced'
  tags?: string[]
  recommendedHintCeiling?: 0 | 1 | 2 | 3
}

export interface LegacyMigrationResult {
  sceneCount: number
  clueCount: number
  stepCount: number
  optionCount: number
}

export interface LegacyMigrationOptions {
  clearExisting?: boolean
  fallbackCharacterName?: string
}

const DEFAULT_EMOTION_STEP_TEXT = '你觉得他现在是什么心情？'
const DEFAULT_RESPONSE_STEP_TEXT = '你觉得他现在应该怎么办呀？'
const DEFAULT_CHARACTER_NAME = '小朋友'
const NAME_SENTENCE_PREFIXES = [
  '为什么',
  '怎么',
  '现在',
  '最',
  '会',
  '觉得',
  '感到',
  '需要',
  '想',
  '在',
  '很',
  '期待',
  '表现',
  '看起来',
  '应该',
  '要',
  '能',
]

function extractLeadingName(text: string): string | null {
  if (!(text.startsWith('小') || text.startsWith('阿'))) {
    return null
  }

  const candidates = [text.slice(0, 3), text.slice(0, 2)]
  for (const candidate of candidates) {
    if (candidate.length < 2) {
      continue
    }

    const rest = text.slice(candidate.length)
    if (NAME_SENTENCE_PREFIXES.some((prefix) => rest.startsWith(prefix))) {
      return candidate
    }
  }

  return null
}

function parseLegacyEmotionScenes(): LegacyEmotionScene[] {
  const parsed = JSON.parse(currentEmotionScenesRaw) as unknown
  return Array.isArray(parsed) ? parsed as LegacyEmotionScene[] : []
}

function parseCharacterNameMap(): Record<string, string> {
  const parsed = JSON.parse(emotionSceneCharacterNamesRaw) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(parsed)
      .filter(([sceneCode, name]) => typeof sceneCode === 'string' && typeof name === 'string')
      .map(([sceneCode, name]) => [sceneCode.trim(), name.trim()]),
  )
}

function normalizeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function normalizeOptionalPath(value: unknown): string | null {
  const text = normalizeText(value)
  return text ? text.replace(/\\/g, '/') : null
}

function normalizeEmotion(value: unknown, fallback: EmotionalBaseEmotion): EmotionalBaseEmotion {
  return normalizeEmotionalBaseEmotion(value, fallback)
}

function normalizeDifficulty(value: unknown): 1 | 2 | 3 {
  return value === 2 || value === 3 ? value : 1
}

function normalizeHintCeiling(value: unknown): 0 | 1 | 2 | 3 | null {
  return value === 0 || value === 1 || value === 2 || value === 3 ? value : null
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => normalizeText(item))
    .filter((item) => item.length > 0)
}

function deriveCharacterNames(scene: LegacyEmotionScene): string[] {
  const texts = (Array.isArray(scene.prompts) ? scene.prompts : [])
    .map((prompt) => normalizeText(prompt.questionText))
    .filter((text) => text.length > 0)

  const names = new Set<string>()
  for (const text of texts) {
    const match = extractLeadingName(text)
    if (match) {
      names.add(match)
    }
  }

  return Array.from(names)
}

function deriveCharacterName(scene: LegacyEmotionScene, fallbackCharacterName: string): string {
  const names = deriveCharacterNames(scene)
  if (names.length === 1) {
    return names[0] || fallbackCharacterName
  }

  return fallbackCharacterName
}

function applyNamePlaceholder(
  text: string,
  characterNames: string[],
  fallbackCharacterName: string,
): string {
  let result = text

  for (const name of characterNames) {
    result = result.split(name).join('{name}')
  }

  result = result.replace(/(?<!其)(他|她)/g, '{name}')

  if (!result.includes('{name}') && characterNames.length > 0) {
    result = result.replace(fallbackCharacterName, '{name}')
  }

  return result
}

function mapPromptQuestionTypeToStepType(questionType: LegacyPrompt['questionType']): 'reason' | 'need' {
  return questionType === 'need' ? 'need' : 'reason'
}

function buildEmotionStepPromptText(): string {
  return DEFAULT_EMOTION_STEP_TEXT.replace(/(?<!其)(他|她)/g, '{name}')
}

function buildResponseStepPromptText(): string {
  return DEFAULT_RESPONSE_STEP_TEXT
}

function getEmotionChoiceValues(scene: LegacyEmotionScene, targetEmotion: EmotionalBaseEmotion): EmotionalBaseEmotion[] {
  const values = normalizeStringArray(scene.emotionOptions)
    .map((item) => normalizeEmotion(item, targetEmotion))
    .filter((item, index, items) => items.indexOf(item) === index)

  if (!values.includes(targetEmotion)) {
    values.unshift(targetEmotion)
  }

  return values.length > 0 ? values : [targetEmotion]
}

function getLastInsertId(db: SqlDatabase): number {
  const result = db.exec('SELECT last_insert_rowid() AS id')
  const value = result[0]?.values[0]?.[0]
  return typeof value === 'number' ? value : Number(value || 0)
}

function insertScene(db: SqlDatabase, scene: LegacyEmotionScene, characterName: string): number {
  const sceneCode = normalizeText(scene.sceneCode)
  const title = normalizeText(scene.title, sceneCode)
  const description = normalizeText(scene.description)
  const backgroundImageUrl = normalizeOptionalPath(scene.imageUrl)
  const targetEmotion = normalizeEmotion(scene.targetEmotion, 'happy')
  const difficultyLevel = normalizeDifficulty(scene.difficultyLevel)
  const sceneDomain = normalizeText(scene.sceneDomain)
  const ageRange = normalizeText(scene.ageRange)
  const abilityLevel = normalizeText(scene.abilityLevel)
  const tags = normalizeStringArray(scene.tags)
  const recommendedHintCeiling = normalizeHintCeiling(scene.recommendedHintCeiling)

  db.run(
    `
      INSERT INTO scenes (
        scene_code,
        title,
        description,
        background_image_url,
        target_emotion,
        character_name,
        difficulty_level,
        scene_domain,
        age_range,
        ability_level,
        tags,
        recommended_hint_ceiling
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      sceneCode,
      title,
      description || null,
      backgroundImageUrl,
      targetEmotion,
      characterName,
      difficultyLevel,
      sceneDomain || null,
      ageRange || null,
      abilityLevel || null,
      tags.length > 0 ? JSON.stringify(tags) : null,
      recommendedHintCeiling,
    ],
  )

  return getLastInsertId(db)
}

function insertClues(db: SqlDatabase, sceneId: number, clues: string[]): number {
  let count = 0

  clues.forEach((clue, index) => {
    db.run(
      'INSERT INTO clues (scene_id, content, display_order) VALUES (?, ?, ?)',
      [sceneId, clue, index + 1],
    )
    count += 1
  })

  return count
}

function insertStep(
  db: SqlDatabase,
  sceneId: number,
  stepIndex: number,
  questionId: string,
  questionText: string,
  stepType: 'emotion' | 'reason' | 'need' | 'response',
): number {
  db.run(
    `
      INSERT INTO steps (
        scene_id,
        step_index,
        question_id,
        question_text,
        step_type
      ) VALUES (?, ?, ?, ?, ?)
    `,
    [sceneId, stepIndex, questionId, questionText, stepType],
  )

  return getLastInsertId(db)
}

function insertEmotionOptions(
  db: SqlDatabase,
  stepId: number,
  emotionValues: EmotionalBaseEmotion[],
  targetEmotion: EmotionalBaseEmotion,
): number {
  let count = 0

  emotionValues.forEach((emotionValue) => {
    const meta = EMOTIONAL_BASE_EMOTION_META[emotionValue]
    db.run(
      `
        INSERT INTO options (
          step_id,
          option_code,
          content,
          icon_name,
          color_hex,
          color_label,
          is_correct,
          is_acceptable,
          feedback_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        stepId,
        emotionValue,
        meta.label,
        emotionValue,
        meta.colorHex,
        meta.colorLabel,
        emotionValue === targetEmotion ? 1 : 0,
        null,
        emotionValue === targetEmotion
          ? '答对了，继续观察场景里的线索吧。'
          : '再仔细看一看画面和线索哦。',
      ],
    )
    count += 1
  })

  return count
}

function insertPromptOptions(db: SqlDatabase, stepId: number, options: LegacyPromptOption[]): number {
  let count = 0

  options.forEach((option, index) => {
    db.run(
      `
        INSERT INTO options (
          step_id,
          option_code,
          content,
          is_correct,
          is_acceptable,
          feedback_text
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        stepId,
        normalizeText(option.id, `prompt_option_${index + 1}`),
        normalizeText(option.text, `选项 ${index + 1}`),
        option.isCorrect === true ? 1 : 0,
        option.isAcceptable === true ? 1 : null,
        normalizeText(option.feedbackText, '请根据场景线索再想一想。'),
      ],
    )
    count += 1
  })

  return count
}

function insertSolutionOptions(db: SqlDatabase, stepId: number, solutions: LegacySolution[]): number {
  let count = 0

  solutions.forEach((solution, index) => {
    const suitability = normalizeText(solution.suitability, index === 0 ? 'optimal' : 'acceptable')
    db.run(
      `
        INSERT INTO options (
          step_id,
          option_code,
          content,
          is_correct,
          is_acceptable,
          feedback_text
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        stepId,
        normalizeText(solution.id, `solution_${index + 1}`),
        normalizeText(solution.text, `回应 ${index + 1}`),
        suitability === 'optimal' ? 1 : 0,
        suitability === 'acceptable' ? 1 : 0,
        normalizeText(solution.explanation, '这是一个可以继续讨论的回应方式。'),
      ],
    )
    count += 1
  })

  return count
}

function clearExistingData(db: SqlDatabase): void {
  db.run('DELETE FROM training_records')
  db.run('DELETE FROM hints')
  db.run('DELETE FROM options')
  db.run('DELETE FROM steps')
  db.run('DELETE FROM clues')
  db.run('DELETE FROM scenes')
}

export function migrateLegacyEmotionSceneData(
  db: SqlDatabase,
  options: LegacyMigrationOptions = {},
): LegacyMigrationResult {
  const {
    clearExisting = true,
    fallbackCharacterName = DEFAULT_CHARACTER_NAME,
  } = options

  const scenes = parseLegacyEmotionScenes()
  const characterNameMap = parseCharacterNameMap()
  let clueCount = 0
  let stepCount = 0
  let optionCount = 0

  db.run('BEGIN')

  try {
    db.run('PRAGMA foreign_keys = ON')

    if (clearExisting) {
      clearExistingData(db)
    }

    scenes.forEach((scene) => {
      const allDetectedNames = deriveCharacterNames(scene)
      const sceneCode = normalizeText(scene.sceneCode)
      const mappedCharacterName = characterNameMap[sceneCode]
      const characterName = mappedCharacterName || fallbackCharacterName
      const targetEmotion = normalizeEmotion(scene.targetEmotion, 'happy')
      const sceneId = insertScene(db, scene, characterName)

      clueCount += insertClues(db, sceneId, normalizeStringArray(scene.emotionClues))

      const emotionStepId = insertStep(
        db,
        sceneId,
        1,
        `${normalizeText(scene.sceneCode)}:emotion`,
        buildEmotionStepPromptText(),
        'emotion',
      )
      stepCount += 1
      optionCount += insertEmotionOptions(
        db,
        emotionStepId,
        getEmotionChoiceValues(scene, targetEmotion),
        targetEmotion,
      )

      const prompts = Array.isArray(scene.prompts) ? scene.prompts : []
      const causePrompt = prompts.find((prompt) => prompt.questionType === 'cause') || prompts[0]
      const needPrompt = prompts.find((prompt) => prompt.questionType === 'need')

      if (causePrompt) {
        const questionText = applyNamePlaceholder(
          normalizeText(causePrompt.questionText, '请结合场景线索继续思考。'),
          allDetectedNames,
          characterName,
        )

        const stepId = insertStep(
          db,
          sceneId,
          2,
          normalizeText(causePrompt.questionId, `${normalizeText(scene.sceneCode)}:cause`),
          questionText,
          mapPromptQuestionTypeToStepType(causePrompt.questionType),
        )
        stepCount += 1
        optionCount += insertPromptOptions(db, stepId, Array.isArray(causePrompt.options) ? causePrompt.options : [])
      }

      if (needPrompt) {
        const questionText = applyNamePlaceholder(
          normalizeText(needPrompt.questionText, '请想一想现在最需要什么。'),
          allDetectedNames,
          characterName,
        )

        const stepId = insertStep(
          db,
          sceneId,
          3,
          normalizeText(needPrompt.questionId, `${normalizeText(scene.sceneCode)}:need`),
          questionText,
          mapPromptQuestionTypeToStepType(needPrompt.questionType),
        )
        stepCount += 1
        optionCount += insertPromptOptions(db, stepId, Array.isArray(needPrompt.options) ? needPrompt.options : [])
      }

      const responseStepId = insertStep(
        db,
        sceneId,
        4,
        `${normalizeText(scene.sceneCode)}:response`,
        buildResponseStepPromptText(),
        'response',
      )
      stepCount += 1
      optionCount += insertSolutionOptions(db, responseStepId, Array.isArray(scene.solutions) ? scene.solutions : [])
    })

    db.run('COMMIT')
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  }

  return {
    sceneCount: scenes.length,
    clueCount,
    stepCount,
    optionCount,
  }
}
