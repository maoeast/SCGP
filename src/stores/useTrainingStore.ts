import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { useDatabase, type SqlResultSet } from '@/db/useDatabase'
import router from '@/router'

type TrainingFlowIndex = 0 | 1 | 2 | 3 | 4 | 5
type QuestionStepIndex = 1 | 2 | 3 | 4
type HintLevelPerStep = [number, number, number, number]
type TTSEngine = 'edge' | 'cosyvoice' | 'webspeech' | null
type SqlRowValue = string | number | null | Uint8Array

interface SceneRow {
  id: SqlRowValue
  scene_code: SqlRowValue
  title: SqlRowValue
  description: SqlRowValue
  background_image_url: SqlRowValue
  target_emotion: SqlRowValue
  character_name: SqlRowValue
  difficulty_level: SqlRowValue
  scene_domain: SqlRowValue
  age_range: SqlRowValue
  ability_level: SqlRowValue
  tags: SqlRowValue
  recommended_hint_ceiling: SqlRowValue
  created_at: SqlRowValue
}

interface StepRow {
  id: SqlRowValue
  scene_id: SqlRowValue
  step_index: SqlRowValue
  question_id: SqlRowValue
  question_text: SqlRowValue
  step_type: SqlRowValue
  audio_url: SqlRowValue
}

interface OptionRow {
  id: SqlRowValue
  step_id: SqlRowValue
  option_code: SqlRowValue
  content: SqlRowValue
  icon_name: SqlRowValue
  color_hex: SqlRowValue
  color_label: SqlRowValue
  is_correct: SqlRowValue
  is_acceptable: SqlRowValue
  feedback_text: SqlRowValue
}

interface HintRow {
  id: SqlRowValue
  step_id: SqlRowValue
  hint_level: SqlRowValue
  hint_text: SqlRowValue
}

export interface OptionData {
  id: number
  step_id: number
  option_code: string | null
  content: string
  icon_name: string | null
  color_hex: string | null
  color_label: string | null
  is_correct: boolean
  is_acceptable: boolean | null
  feedback_text: string | null
}

export interface HintData {
  id: number
  step_id: number
  hint_level: number
  hint_text: string
}

export interface StepData {
  id: number
  scene_id: number
  step_index: QuestionStepIndex
  question_id: string | null
  question_text: string
  step_type: 'emotion' | 'reason' | 'need' | 'response'
  audio_url: string | null
  options: OptionData[]
  hints: HintData[]
}

export interface SceneData {
  id: number
  scene_code: string
  title: string
  description: string | null
  background_image_url: string | null
  target_emotion: string | null
  character_name: string
  difficulty_level: number
  scene_domain: string | null
  age_range: string | null
  ability_level: string | null
  tags: string[]
  recommended_hint_ceiling: number | null
  created_at: string | null
}

const INTRO_STEP_INDEX: TrainingFlowIndex = 0
const RESULT_STEP_INDEX: TrainingFlowIndex = 5
const DEFAULT_CHARACTER_NAME = '小朋友'
const DEFAULT_HINT_LEVELS: HintLevelPerStep = [0, 0, 0, 0]
const TRANSITION_DURATION_MS = 300

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function cloneDefaultHintLevels(): HintLevelPerStep {
  return [...DEFAULT_HINT_LEVELS] as HintLevelPerStep
}

function rowsFromResultSet<T>(resultSets: SqlResultSet[]): T[] {
  const resultSet = resultSets[0]
  if (!resultSet) {
    return []
  }

  return resultSet.values.map((rowValues) => {
    const entries = resultSet.columns.map((column, index) => [column, rowValues[index] ?? null])
    return Object.fromEntries(entries) as T
  })
}

function toNumber(value: SqlRowValue, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  return fallback
}

function toNullableNumber(value: SqlRowValue): number | null {
  if (value === null) {
    return null
  }

  const parsed = toNumber(value, Number.NaN)
  return Number.isFinite(parsed) ? parsed : null
}

function toStringValue(value: SqlRowValue, fallback = ''): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return fallback
}

function toNullableString(value: SqlRowValue): string | null {
  if (value === null) {
    return null
  }

  const normalized = toStringValue(value).trim()
  return normalized ? normalized : null
}

function toBoolean(value: SqlRowValue): boolean {
  return toNumber(value, 0) === 1
}

function toNullableBoolean(value: SqlRowValue): boolean | null {
  if (value === null) {
    return null
  }

  return toBoolean(value)
}

function parseTags(value: SqlRowValue): string[] {
  const raw = toNullableString(value)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  } catch (error) {
    console.warn('Failed to parse scene tags:', error)
    return []
  }
}

function toQuestionStepIndex(value: number): QuestionStepIndex | null {
  return value >= 1 && value <= 4 ? (value as QuestionStepIndex) : null
}

function toTrainingFlowIndex(value: number): TrainingFlowIndex {
  if (value <= INTRO_STEP_INDEX) {
    return INTRO_STEP_INDEX
  }

  if (value >= RESULT_STEP_INDEX) {
    return RESULT_STEP_INDEX
  }

  return value as TrainingFlowIndex
}

export const useTrainingStore = defineStore('training', () => {
  const database = useDatabase()

  const currentStepIndex = ref<TrainingFlowIndex>(INTRO_STEP_INDEX)
  const scene = ref<SceneData | null>(null)
  const steps = ref<StepData[]>([])
  const hintLevelPerStep = ref<HintLevelPerStep>(cloneDefaultHintLevels())
  const answers = ref<Record<number, number>>({})
  const inputLocked = ref(false)
  const isTransitioning = ref(false)
  const isExitModalVisible = ref(false)
  const showRewardOverlay = ref(false)
  const availableTTSEngine = ref<TTSEngine>(null)
  const questionResetSeed = ref(0)
  const savedRecordId = ref<number | null>(null)

  const currentStepData = computed<StepData | null>(() => {
    const activeStepIndex = toQuestionStepIndex(currentStepIndex.value)
    if (!activeStepIndex) {
      return null
    }

    return steps.value.find((step) => step.step_index === activeStepIndex) ?? null
  })

  const parsedQuestionText = computed(() => {
    if (!currentStepData.value) {
      return ''
    }

    const name = scene.value?.character_name?.trim() || DEFAULT_CHARACTER_NAME
    return currentStepData.value.question_text.replace(/\{name\}/g, name)
  })

  const totalHintLevel = computed(() => {
    return hintLevelPerStep.value.reduce((sum, level) => sum + level, 0)
  })

  watch(currentStepIndex, () => {
    console.log('TODO: Call ttsService.stop() here')
  })

  function bumpQuestionResetSeed(): void {
    questionResetSeed.value += 1
  }

  function resetRuntimeState(nextStepIndex: TrainingFlowIndex = INTRO_STEP_INDEX): void {
    currentStepIndex.value = nextStepIndex
    hintLevelPerStep.value = cloneDefaultHintLevels()
    answers.value = {}
    inputLocked.value = false
    isTransitioning.value = false
    isExitModalVisible.value = false
    showRewardOverlay.value = false
    savedRecordId.value = null
    bumpQuestionResetSeed()
  }

  async function ensurePrototypeDatabaseReady(): Promise<void> {
    if (database.isReady.value) {
      return
    }

    await database.initDatabase()
  }

  function selectRows<T>(sql: string, params: SqlRowValue[] = []): T[] {
    return rowsFromResultSet<T>(database.execute(sql, params))
  }

  function mapScene(row: SceneRow): SceneData {
    return {
      id: toNumber(row.id),
      scene_code: toStringValue(row.scene_code),
      title: toStringValue(row.title),
      description: toNullableString(row.description),
      background_image_url: toNullableString(row.background_image_url),
      target_emotion: toNullableString(row.target_emotion),
      character_name: toNullableString(row.character_name) || DEFAULT_CHARACTER_NAME,
      difficulty_level: toNumber(row.difficulty_level, 1),
      scene_domain: toNullableString(row.scene_domain),
      age_range: toNullableString(row.age_range),
      ability_level: toNullableString(row.ability_level),
      tags: parseTags(row.tags),
      recommended_hint_ceiling: toNullableNumber(row.recommended_hint_ceiling),
      created_at: toNullableString(row.created_at),
    }
  }

  function mapOption(row: OptionRow): OptionData {
    return {
      id: toNumber(row.id),
      step_id: toNumber(row.step_id),
      option_code: toNullableString(row.option_code),
      content: toStringValue(row.content),
      icon_name: toNullableString(row.icon_name),
      color_hex: toNullableString(row.color_hex),
      color_label: toNullableString(row.color_label),
      is_correct: toBoolean(row.is_correct),
      is_acceptable: toNullableBoolean(row.is_acceptable),
      feedback_text: toNullableString(row.feedback_text),
    }
  }

  function mapHint(row: HintRow): HintData {
    return {
      id: toNumber(row.id),
      step_id: toNumber(row.step_id),
      hint_level: toNumber(row.hint_level),
      hint_text: toStringValue(row.hint_text),
    }
  }

  function mapStep(row: StepRow, optionRows: OptionRow[], hintRows: HintRow[]): StepData {
    const stepId = toNumber(row.id)
    const stepIndex = toQuestionStepIndex(toNumber(row.step_index))
    if (!stepIndex) {
      throw new Error(`Invalid step_index detected in prototype database: ${row.step_index}`)
    }

    const rawStepType = toStringValue(row.step_type)
    const stepType = (
      rawStepType === 'emotion' ||
      rawStepType === 'reason' ||
      rawStepType === 'need' ||
      rawStepType === 'response'
    )
      ? rawStepType
      : 'reason'

    return {
      id: stepId,
      scene_id: toNumber(row.scene_id),
      step_index: stepIndex,
      question_id: toNullableString(row.question_id),
      question_text: toStringValue(row.question_text),
      step_type: stepType,
      audio_url: toNullableString(row.audio_url),
      options: optionRows
        .filter((option) => toNumber(option.step_id) === stepId)
        .map(mapOption),
      hints: hintRows
        .filter((hint) => toNumber(hint.step_id) === stepId)
        .map(mapHint)
        .sort((left, right) => left.hint_level - right.hint_level),
    }
  }

  async function loadScene(sceneCode: string): Promise<void> {
    const normalizedSceneCode = sceneCode.trim()
    if (!normalizedSceneCode) {
      throw new Error('loadScene(sceneCode) requires a non-empty scene code.')
    }

    await ensurePrototypeDatabaseReady()
    resetRuntimeState()

    const sceneRow = selectRows<SceneRow>(
      `
        SELECT
          id,
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
          recommended_hint_ceiling,
          created_at
        FROM scenes
        WHERE scene_code = ?
        LIMIT 1
      `,
      [normalizedSceneCode],
    )[0]

    if (!sceneRow) {
      scene.value = null
      steps.value = []
      throw new Error(`Scene not found for scene_code: ${normalizedSceneCode}`)
    }

    const nextScene = mapScene(sceneRow)
    const stepRows = selectRows<StepRow>(
      `
        SELECT
          id,
          scene_id,
          step_index,
          question_id,
          question_text,
          step_type,
          audio_url
        FROM steps
        WHERE scene_id = ?
        ORDER BY step_index ASC
      `,
      [nextScene.id],
    )

    const stepIds = stepRows.map((row) => toNumber(row.id)).filter((id) => id > 0)
    const optionRows = stepIds.length > 0
      ? selectRows<OptionRow>(
        `
          SELECT
            id,
            step_id,
            option_code,
            content,
            icon_name,
            color_hex,
            color_label,
            is_correct,
            is_acceptable,
            feedback_text
          FROM options
          WHERE step_id IN (${stepIds.map(() => '?').join(', ')})
          ORDER BY id ASC
        `,
        stepIds,
      )
      : []

    const hintRows = stepIds.length > 0
      ? selectRows<HintRow>(
        `
          SELECT
            id,
            step_id,
            hint_level,
            hint_text
          FROM hints
          WHERE step_id IN (${stepIds.map(() => '?').join(', ')})
          ORDER BY hint_level ASC, id ASC
        `,
        stepIds,
      )
      : []

    scene.value = nextScene
    steps.value = stepRows
      .map((row) => mapStep(row, optionRows, hintRows))
      .sort((left, right) => left.step_index - right.step_index)
  }

  async function nextStep(): Promise<void> {
    if (isTransitioning.value || currentStepIndex.value >= RESULT_STEP_INDEX) {
      return
    }

    inputLocked.value = true
    isTransitioning.value = true
    showRewardOverlay.value = false

    try {
      await delay(TRANSITION_DURATION_MS)
      currentStepIndex.value = toTrainingFlowIndex(currentStepIndex.value + 1)
    } finally {
      isTransitioning.value = false
      inputLocked.value = false
    }
  }

  function recordError(stepIndex: number): void {
    const normalizedStepIndex = toQuestionStepIndex(stepIndex)
    if (!normalizedStepIndex) {
      console.warn('recordError ignored an out-of-range step index:', stepIndex)
      return
    }

    const nextLevels = [...hintLevelPerStep.value] as HintLevelPerStep
    const currentLevel = nextLevels[normalizedStepIndex - 1] ?? 0
    nextLevels[normalizedStepIndex - 1] = currentLevel + 1
    hintLevelPerStep.value = nextLevels
  }

  function recordAnswer(stepIndex: number, optionId: number): void {
    const normalizedStepIndex = toQuestionStepIndex(stepIndex)
    if (!normalizedStepIndex) {
      console.warn('recordAnswer ignored an out-of-range step index:', stepIndex)
      return
    }

    const step = steps.value.find((item) => item.step_index === normalizedStepIndex)
    if (!step) {
      console.warn('recordAnswer ignored because the step data is not loaded:', stepIndex)
      return
    }

    const optionExists = step.options.some((option) => option.id === optionId)
    if (!optionExists) {
      console.warn('recordAnswer ignored an option that does not belong to the target step:', {
        stepIndex,
        optionId,
      })
      return
    }

    answers.value = {
      ...answers.value,
      [normalizedStepIndex]: optionId,
    }
  }

  function calculateStars(): 1 | 2 | 3 {
    if (totalHintLevel.value <= 0) {
      return 3
    }

    if (totalHintLevel.value <= 2) {
      return 2
    }

    return 1
  }

  async function saveRecord(): Promise<number> {
    if (!scene.value) {
      throw new Error('Cannot save training record before a scene is loaded.')
    }

    if (savedRecordId.value !== null) {
      return savedRecordId.value
    }

    await ensurePrototypeDatabaseReady()

    const stars = calculateStars()
    database.run(
      `
        INSERT INTO training_records (
          scene_id,
          student_id,
          stars,
          hint_level_sum
        ) VALUES (?, ?, ?, ?)
      `,
      [scene.value.id, null, stars, totalHintLevel.value],
    )

    const recordRow = selectRows<{ id: SqlRowValue }>('SELECT last_insert_rowid() AS id LIMIT 1')[0]
    savedRecordId.value = toNumber(recordRow?.id ?? 0)
    return savedRecordId.value
  }

  function toggleExitModal(show: boolean): void {
    isExitModalVisible.value = show
  }

  function resolveSelectorPath(): string {
    return router.currentRoute.value.path.includes('/care-expression')
      ? '/emotional/care-expression/select'
      : '/emotional/emotion-scene/select'
  }

  function exitTraining(): void {
    const nextQuery = { ...router.currentRoute.value.query }

    isExitModalVisible.value = false
    resetRuntimeState()
    void router.push({
      path: resolveSelectorPath(),
      query: nextQuery,
    })
  }

  function forceNext(): void {
    currentStepIndex.value = toTrainingFlowIndex(currentStepIndex.value + 1)
    inputLocked.value = false
    isTransitioning.value = false
    isExitModalVisible.value = false
    showRewardOverlay.value = false
  }

  function forceReset(): void {
    const activeStepIndex = toQuestionStepIndex(currentStepIndex.value)
    if (!activeStepIndex) {
      return
    }

    const nextLevels = [...hintLevelPerStep.value] as HintLevelPerStep
    nextLevels[activeStepIndex - 1] = 0
    hintLevelPerStep.value = nextLevels

    const nextAnswers = { ...answers.value }
    delete nextAnswers[activeStepIndex]
    answers.value = nextAnswers

    inputLocked.value = false
    isTransitioning.value = false
    showRewardOverlay.value = false
    bumpQuestionResetSeed()
  }

  function forceEnd(): void {
    currentStepIndex.value = RESULT_STEP_INDEX
    inputLocked.value = false
    isTransitioning.value = false
    isExitModalVisible.value = false
    showRewardOverlay.value = false
  }

  function restartTraining(): void {
    resetRuntimeState(1)
  }

  return {
    currentStepIndex,
    scene,
    steps,
    hintLevelPerStep,
    answers,
    inputLocked,
    isTransitioning,
    isExitModalVisible,
    showRewardOverlay,
    availableTTSEngine,
    questionResetSeed,
    currentStepData,
    parsedQuestionText,
    loadScene,
    nextStep,
    recordError,
    recordAnswer,
    calculateStars,
    saveRecord,
    toggleExitModal,
    exitTraining,
    forceNext,
    forceReset,
    forceEnd,
    restartTraining,
  }
})
