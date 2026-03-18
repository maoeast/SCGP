import * as XLSX from 'xlsx'
import type {
  CareSceneResourceMeta,
  CareSceneUtterance,
  CareSceneReceiverOption,
  EmotionScenePrompt,
  EmotionSceneResourceMeta,
  EmotionSceneSolution,
  EmotionalResourceType,
} from '@/types/emotional'
import type { ResourceItem } from '@/types/module'
import {
  normalizeCareSceneEditorModel,
  normalizeEmotionSceneEditorModel,
  validateCareSceneEditorModel,
  validateEmotionSceneEditorModel,
} from '@/views/resource-center/editors/emotional-resource-contract'

export const EMOTIONAL_PACK_SCHEMA_VERSION = 'scgp.emotional-pack.v1' as const
const SHEET_LIST_SEPARATOR = ' | '

export type EmotionalPackFormat = 'json' | 'excel'
export type DuplicateStrategy = 'skip' | 'update' | 'copy'

type EmotionalPackMetadata = EmotionSceneResourceMeta | CareSceneResourceMeta

export interface EmotionalPackResource {
  resourceType: EmotionalResourceType
  name: string
  category: string
  description?: string
  coverImage?: string
  tags: string[]
  metadata: EmotionalPackMetadata
}

export interface EmotionalPackDocument {
  schemaVersion: typeof EMOTIONAL_PACK_SCHEMA_VERSION
  moduleCode: 'emotional'
  exportedAt: string
  resources: EmotionalPackResource[]
}

export interface EmotionalPackImportItem {
  sourceIndex: number
  resourceType: EmotionalResourceType
  name: string
  category: string
  description?: string
  coverImage?: string
  tags: string[]
  sceneCode: string
  metadata: EmotionalPackMetadata
  validationErrors: string[]
}

export interface EmotionalPackImportResult {
  format: EmotionalPackFormat
  schemaVersion: string
  items: EmotionalPackImportItem[]
}

function isEmotionSceneMetadata(value: EmotionalPackMetadata): value is EmotionSceneResourceMeta {
  return Array.isArray((value as EmotionSceneResourceMeta).prompts)
}

function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function normalizeOptionalString(value: unknown): string | undefined {
  const normalized = normalizeString(value)
  return normalized || undefined
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeString(item))
      .filter((item) => item.length > 0)
  }

  if (typeof value === 'string') {
    const delimiter = value.includes(SHEET_LIST_SEPARATOR) ? /\s*\|\s*/ : /\s*,\s*/
    return value
      .split(delimiter)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }

  return []
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase()
    return ['1', 'true', 'yes', 'y', '是'].includes(lowered)
  }
  return false
}

function normalizeHintLevel(value: unknown): 0 | 1 | 2 | 3 | undefined {
  const numeric = Number(value)
  return numeric === 0 || numeric === 1 || numeric === 2 || numeric === 3
    ? (numeric as 0 | 1 | 2 | 3)
    : undefined
}

function normalizeDifficultyLevel(value: unknown): 1 | 2 | 3 {
  const numeric = Number(value)
  return numeric === 2 || numeric === 3 ? (numeric as 2 | 3) : 1
}

function createEmptySheet(headers: string[]) {
  return XLSX.utils.aoa_to_sheet([headers])
}

function joinList(values: string[] | undefined): string {
  return (values || []).filter((item) => item.trim().length > 0).join(SHEET_LIST_SEPARATOR)
}

function ensureEmotionalResourceType(value: unknown): EmotionalResourceType | null {
  return value === 'emotion_scene' || value === 'care_scene' ? value : null
}

function getSheetRows(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  })
}

function getBatchDuplicateKeys(items: EmotionalPackImportItem[]) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  items.forEach((item) => {
    const key = `${item.resourceType}::${item.sceneCode}`
    if (seen.has(key)) {
      duplicates.add(key)
      return
    }
    seen.add(key)
  })

  return duplicates
}

function syncMetadataTags(metadata: EmotionalPackMetadata, tags: string[]): EmotionalPackMetadata {
  return {
    ...metadata,
    tags: [...tags],
  } as EmotionalPackMetadata
}

function buildRawEmotionSceneErrors(metadata: Partial<EmotionSceneResourceMeta> | undefined): string[] {
  const errors: string[] = []

  if (!metadata?.sceneCode || !String(metadata.sceneCode).trim()) {
    errors.push('缺少 sceneCode')
  }

  if (!Array.isArray(metadata?.emotionClues) || metadata.emotionClues.length === 0) {
    errors.push('请至少提供 1 条情绪线索')
  }

  if (!Array.isArray(metadata?.prompts) || metadata.prompts.length === 0) {
    errors.push('请至少提供 1 个社交推理问题')
  }

  if (!Array.isArray(metadata?.solutions) || metadata.solutions.length === 0) {
    errors.push('请至少提供 1 个问题解决方案')
  }

  return errors
}

function buildRawCareSceneErrors(metadata: Partial<CareSceneResourceMeta> | undefined): string[] {
  const errors: string[] = []

  if (!metadata?.sceneCode || !String(metadata.sceneCode).trim()) {
    errors.push('缺少 sceneCode')
  }

  if (!metadata?.speakerPerspectiveText || !String(metadata.speakerPerspectiveText).trim()) {
    errors.push('请填写表达者视角提示')
  }

  if (!metadata?.receiverPerspectiveText || !String(metadata.receiverPerspectiveText).trim()) {
    errors.push('请填写接收者视角提示')
  }

  if (!Array.isArray(metadata?.utterances) || metadata.utterances.length === 0) {
    errors.push('请至少提供 1 条表达者话术')
  }

  if (!Array.isArray(metadata?.receiverOptions) || metadata.receiverOptions.length === 0) {
    errors.push('请至少提供 1 条接收者选项')
  }

  return errors
}

function normalizePackResource(resource: Partial<EmotionalPackResource>, sourceIndex: number): EmotionalPackImportItem {
  const resourceType = ensureEmotionalResourceType(resource.resourceType)
  const tags = Array.from(new Set([
    ...normalizeStringList(resource.tags),
    ...normalizeStringList((resource.metadata as { tags?: string[] } | undefined)?.tags),
  ]))
  const nameFallback = normalizeString((resource.metadata as { title?: string } | undefined)?.title, `导入资源 ${sourceIndex + 1}`)
  const baseErrors: string[] = []

  if (!resourceType) {
    baseErrors.push('资源类型必须为 emotion_scene 或 care_scene')
  }

  const name = normalizeString(resource.name, nameFallback)
  if (!name) {
    baseErrors.push('资源名称不能为空')
  }

  const category = normalizeString(resource.category)
  if (!category) {
    baseErrors.push('资源分类不能为空')
  }

  const description = normalizeOptionalString(resource.description)
  const coverImage = normalizeOptionalString(resource.coverImage)

  if (resourceType === 'care_scene') {
    const rawMetadata = (resource.metadata || {}) as Partial<CareSceneResourceMeta>
    const normalized = syncMetadataTags(
      normalizeCareSceneEditorModel(
        {
          ...rawMetadata,
          title: normalizeString(rawMetadata.title, name),
          tags,
        },
        name
      ),
      tags
    ) as CareSceneResourceMeta

    const validationErrors = Array.from(new Set([
      ...baseErrors,
      ...buildRawCareSceneErrors(rawMetadata),
      ...validateCareSceneEditorModel(normalized),
    ]))

    return {
      sourceIndex,
      resourceType,
      name,
      category,
      description,
      coverImage,
      tags,
      sceneCode: normalized.sceneCode,
      metadata: normalized,
      validationErrors,
    }
  }

  const rawMetadata = (resource.metadata || {}) as Partial<EmotionSceneResourceMeta>
  const normalized = syncMetadataTags(
    normalizeEmotionSceneEditorModel(
      {
        ...rawMetadata,
        title: normalizeString(rawMetadata.title, name),
        tags,
      },
      name
    ),
    tags
  ) as EmotionSceneResourceMeta

  const validationErrors = Array.from(new Set([
    ...baseErrors,
    ...buildRawEmotionSceneErrors(rawMetadata),
    ...validateEmotionSceneEditorModel(normalized),
  ]))

  return {
    sourceIndex,
    resourceType: resourceType || 'emotion_scene',
    name,
    category,
    description,
    coverImage,
    tags,
    sceneCode: normalized.sceneCode,
    metadata: normalized,
    validationErrors,
  }
}

function buildPromptRows(resources: EmotionalPackResource[]) {
  return resources
    .filter((resource) => resource.resourceType === 'emotion_scene')
    .flatMap((resource) => {
      const metadata = resource.metadata as EmotionSceneResourceMeta
      return metadata.prompts.map((prompt) => ({
        sceneCode: metadata.sceneCode,
        questionId: prompt.questionId,
        questionType: prompt.questionType,
        questionText: prompt.questionText,
      }))
    })
}

function buildPromptOptionRows(resources: EmotionalPackResource[]) {
  return resources
    .filter((resource) => resource.resourceType === 'emotion_scene')
    .flatMap((resource) => {
      const metadata = resource.metadata as EmotionSceneResourceMeta
      return metadata.prompts.flatMap((prompt) =>
        prompt.options.map((option) => ({
          sceneCode: metadata.sceneCode,
          questionId: prompt.questionId,
          optionId: option.id,
          text: option.text,
          imageUrl: option.imageUrl || '',
          isCorrect: option.isCorrect ? 1 : 0,
          isAcceptable: option.isAcceptable ? 1 : 0,
          feedbackText: option.feedbackText,
        }))
      )
    })
}

function buildSolutionRows(resources: EmotionalPackResource[]) {
  return resources
    .filter((resource) => resource.resourceType === 'emotion_scene')
    .flatMap((resource) => {
      const metadata = resource.metadata as EmotionSceneResourceMeta
      return metadata.solutions.map((solution) => ({
        sceneCode: metadata.sceneCode,
        solutionId: solution.id,
        text: solution.text,
        imageUrl: solution.imageUrl || '',
        suitability: solution.suitability,
        explanation: solution.explanation,
      }))
    })
}

function buildUtteranceRows(resources: EmotionalPackResource[]) {
  return resources
    .filter((resource) => resource.resourceType === 'care_scene')
    .flatMap((resource) => {
      const metadata = resource.metadata as CareSceneResourceMeta
      return metadata.utterances.map((utterance) => ({
        sceneCode: metadata.sceneCode,
        utteranceId: utterance.id,
        type: utterance.type,
        text: utterance.text,
        effect: utterance.effect,
        receiverReactionText: utterance.receiverReactionText || '',
        receiverReactionEmoji: utterance.receiverReactionEmoji || '',
      }))
    })
}

function buildReceiverOptionRows(resources: EmotionalPackResource[]) {
  return resources
    .filter((resource) => resource.resourceType === 'care_scene')
    .flatMap((resource) => {
      const metadata = resource.metadata as CareSceneResourceMeta
      return metadata.receiverOptions.map((option) => ({
        sceneCode: metadata.sceneCode,
        optionId: option.id,
        text: option.text,
        isComforting: option.isComforting ? 1 : 0,
        reasonText: option.reasonText,
      }))
    })
}

function buildPackResources(resources: ResourceItem[]): EmotionalPackResource[] {
  return resources
    .filter((resource) => isEmotionalResourceItem(resource))
    .map((resource) => {
      if (resource.resourceType === 'care_scene') {
        const metadata = syncMetadataTags(
          normalizeCareSceneEditorModel(resource.metadata, resource.name),
          resource.tags || []
        ) as CareSceneResourceMeta

        return {
          resourceType: 'care_scene',
          name: resource.name,
          category: resource.category || '',
          description: resource.description,
          coverImage: resource.coverImage,
          tags: [...(resource.tags || [])],
          metadata,
        }
      }

      const metadata = syncMetadataTags(
        normalizeEmotionSceneEditorModel(resource.metadata, resource.name),
        resource.tags || []
      ) as EmotionSceneResourceMeta

      return {
        resourceType: 'emotion_scene',
        name: resource.name,
        category: resource.category || '',
        description: resource.description,
        coverImage: resource.coverImage,
        tags: [...(resource.tags || [])],
        metadata,
      }
    })
}

function parsePromptRows(rows: Record<string, unknown>[], optionRows: Record<string, unknown>[], sceneCode: string): EmotionScenePrompt[] {
  return rows
    .filter((row) => normalizeString(row.sceneCode) === sceneCode)
    .map((row) => {
      const questionId = normalizeString(row.questionId)
      return {
        questionId,
        questionType: normalizeString(row.questionType, 'cause') as EmotionScenePrompt['questionType'],
        questionText: normalizeString(row.questionText),
        options: optionRows
          .filter((optionRow) => normalizeString(optionRow.sceneCode) === sceneCode && normalizeString(optionRow.questionId) === questionId)
          .map((optionRow) => ({
            id: normalizeString(optionRow.optionId),
            text: normalizeString(optionRow.text),
            imageUrl: normalizeOptionalString(optionRow.imageUrl),
            isCorrect: normalizeBoolean(optionRow.isCorrect),
            isAcceptable: normalizeBoolean(optionRow.isAcceptable),
            feedbackText: normalizeString(optionRow.feedbackText),
          })),
      }
    })
}

function parseSolutionRows(rows: Record<string, unknown>[], sceneCode: string): EmotionSceneSolution[] {
  return rows
    .filter((row) => normalizeString(row.sceneCode) === sceneCode)
    .map((row) => ({
      id: normalizeString(row.solutionId),
      text: normalizeString(row.text),
      imageUrl: normalizeOptionalString(row.imageUrl),
      suitability: normalizeString(row.suitability, 'acceptable') as EmotionSceneSolution['suitability'],
      explanation: normalizeString(row.explanation),
    }))
}

function parseUtteranceRows(rows: Record<string, unknown>[], sceneCode: string): CareSceneUtterance[] {
  return rows
    .filter((row) => normalizeString(row.sceneCode) === sceneCode)
    .map((row) => ({
      id: normalizeString(row.utteranceId),
      type: normalizeString(row.type, 'empathy') as CareSceneUtterance['type'],
      text: normalizeString(row.text),
      effect: normalizeString(row.effect),
      receiverReactionText: normalizeOptionalString(row.receiverReactionText),
      receiverReactionEmoji: normalizeOptionalString(row.receiverReactionEmoji),
    }))
}

function parseReceiverOptionRows(rows: Record<string, unknown>[], sceneCode: string): CareSceneReceiverOption[] {
  return rows
    .filter((row) => normalizeString(row.sceneCode) === sceneCode)
    .map((row) => ({
      id: normalizeString(row.optionId),
      text: normalizeString(row.text),
      isComforting: normalizeBoolean(row.isComforting),
      reasonText: normalizeString(row.reasonText),
    }))
}

function parseExcelPack(buffer: ArrayBuffer): EmotionalPackImportResult {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const resourceRows = getSheetRows(workbook, 'resources')

  if (resourceRows.length === 0) {
    throw new Error('Excel 资源包缺少 resources sheet 或资源行为空')
  }

  const promptRows = getSheetRows(workbook, 'emotion_prompts')
  const promptOptionRows = getSheetRows(workbook, 'emotion_prompt_options')
  const solutionRows = getSheetRows(workbook, 'emotion_solutions')
  const utteranceRows = getSheetRows(workbook, 'care_utterances')
  const receiverOptionRows = getSheetRows(workbook, 'care_receiver_options')

  const items = resourceRows.map((row, index) => {
    const resourceType = ensureEmotionalResourceType(row.resourceType) || 'emotion_scene'
    const sceneCode = normalizeString(row.sceneCode)

    if (resourceType === 'care_scene') {
      return normalizePackResource({
        resourceType,
        name: normalizeString(row.name),
        category: normalizeString(row.category),
        description: normalizeOptionalString(row.description),
        coverImage: normalizeOptionalString(row.coverImage),
        tags: normalizeStringList(row.tags),
        metadata: {
          sceneCode,
          title: normalizeString(row.title || row.name),
          imageUrl: normalizeString(row.imageUrl),
          difficultyLevel: normalizeDifficultyLevel(row.difficultyLevel),
          careType: normalizeOptionalString(row.careType) as CareSceneResourceMeta['careType'],
          receiverEmotion: normalizeOptionalString(row.receiverEmotion) as CareSceneResourceMeta['receiverEmotion'],
          speakerPerspectiveText: normalizeString(row.speakerPerspectiveText),
          receiverPerspectiveText: normalizeString(row.receiverPerspectiveText),
          utterances: parseUtteranceRows(utteranceRows, sceneCode),
          receiverOptions: parseReceiverOptionRows(receiverOptionRows, sceneCode),
          preferredUtteranceIds: normalizeStringList(row.preferredUtteranceIds),
          recommendedHintCeiling: normalizeHintLevel(row.recommendedHintCeiling),
          ageRange: normalizeOptionalString(row.ageRange),
          abilityLevel: normalizeOptionalString(row.abilityLevel) as CareSceneResourceMeta['abilityLevel'],
          tags: normalizeStringList(row.tags),
        },
      }, index)
    }

    return normalizePackResource({
      resourceType,
      name: normalizeString(row.name),
      category: normalizeString(row.category),
      description: normalizeOptionalString(row.description),
      coverImage: normalizeOptionalString(row.coverImage),
      tags: normalizeStringList(row.tags),
      metadata: {
        sceneCode,
        title: normalizeString(row.title || row.name),
        imageUrl: normalizeString(row.imageUrl),
        difficultyLevel: normalizeDifficultyLevel(row.difficultyLevel),
        targetEmotion: normalizeOptionalString(row.targetEmotion) as EmotionSceneResourceMeta['targetEmotion'],
        emotionOptions: normalizeStringList(row.emotionOptions) as EmotionSceneResourceMeta['emotionOptions'],
        emotionClues: normalizeStringList(row.emotionClues),
        prompts: parsePromptRows(promptRows, promptOptionRows, sceneCode),
        solutions: parseSolutionRows(solutionRows, sceneCode),
        recommendedHintCeiling: normalizeHintLevel(row.recommendedHintCeiling),
        ageRange: normalizeOptionalString(row.ageRange),
        abilityLevel: normalizeOptionalString(row.abilityLevel) as EmotionSceneResourceMeta['abilityLevel'],
        tags: normalizeStringList(row.tags),
      },
    }, index)
  })

  const duplicateKeys = getBatchDuplicateKeys(items)
  items.forEach((item) => {
    if (duplicateKeys.has(`${item.resourceType}::${item.sceneCode}`)) {
      item.validationErrors = Array.from(new Set([
        ...item.validationErrors,
        '导入文件内存在重复的 resourceType + sceneCode 组合',
      ]))
    }
  })

  return {
    format: 'excel',
    schemaVersion: EMOTIONAL_PACK_SCHEMA_VERSION,
    items,
  }
}

export function isEmotionalResourceItem(resource: ResourceItem): resource is ResourceItem & {
  resourceType: EmotionalResourceType
} {
  return resource.resourceType === 'emotion_scene' || resource.resourceType === 'care_scene'
}

export function getSceneCodeFromMetadata(metadata: EmotionalPackMetadata | Record<string, unknown> | undefined): string {
  return normalizeString((metadata as { sceneCode?: string } | undefined)?.sceneCode)
}

export function getSceneCodeFromResource(resource: Pick<ResourceItem, 'metadata'>): string {
  return getSceneCodeFromMetadata(resource.metadata)
}

export function buildCopyIdentity(
  name: string,
  sceneCode: string,
  existingNames: Set<string>,
  existingSceneCodes: Set<string>
) {
  let suffix = 1
  let nextName = `${name}（副本）`
  let nextSceneCode = `${sceneCode}_copy`

  while (existingNames.has(nextName) || existingSceneCodes.has(nextSceneCode)) {
    suffix += 1
    nextName = `${name}（副本${suffix}）`
    nextSceneCode = `${sceneCode}_copy_${suffix}`
  }

  return {
    name: nextName,
    sceneCode: nextSceneCode,
  }
}

export function cloneMetadataForCopy(
  metadata: EmotionalPackMetadata,
  name: string,
  sceneCode: string,
  tags: string[]
): EmotionalPackMetadata {
  return syncMetadataTags(
    {
      ...metadata,
      title: name,
      sceneCode,
    } as EmotionalPackMetadata,
    tags
  )
}

export function createEmotionalJsonPack(resources: ResourceItem[]): EmotionalPackDocument {
  return {
    schemaVersion: EMOTIONAL_PACK_SCHEMA_VERSION,
    moduleCode: 'emotional',
    exportedAt: new Date().toISOString(),
    resources: buildPackResources(resources),
  }
}

export function createEmotionalJsonPackBlob(resources: ResourceItem[]) {
  return new Blob(
    [JSON.stringify(createEmotionalJsonPack(resources), null, 2)],
    { type: 'application/json;charset=utf-8' }
  )
}

export function createEmotionalExcelPackBuffer(resources: ResourceItem[]) {
  const packResources = buildPackResources(resources)
  const workbook = XLSX.utils.book_new()

  const resourceRows = packResources.map((resource) => {
    const metadata = resource.metadata
    const baseRow = {
      resourceType: resource.resourceType,
      sceneCode: metadata.sceneCode,
      name: resource.name,
      title: metadata.title,
      category: resource.category,
      description: resource.description || '',
      coverImage: resource.coverImage || '',
      imageUrl: metadata.imageUrl || '',
      difficultyLevel: metadata.difficultyLevel,
      recommendedHintCeiling: metadata.recommendedHintCeiling ?? '',
      ageRange: metadata.ageRange || '',
      abilityLevel: metadata.abilityLevel || '',
      tags: joinList(resource.tags),
    }

    if (isEmotionSceneMetadata(metadata)) {
      return {
        ...baseRow,
        targetEmotion: metadata.targetEmotion,
        emotionOptions: joinList(metadata.emotionOptions),
        emotionClues: joinList(metadata.emotionClues),
        careType: '',
        receiverEmotion: '',
        speakerPerspectiveText: '',
        receiverPerspectiveText: '',
        preferredUtteranceIds: '',
      }
    }

    return {
      ...baseRow,
      targetEmotion: '',
      emotionOptions: '',
      emotionClues: '',
      careType: metadata.careType || '',
      receiverEmotion: metadata.receiverEmotion || '',
      speakerPerspectiveText: metadata.speakerPerspectiveText,
      receiverPerspectiveText: metadata.receiverPerspectiveText,
      preferredUtteranceIds: joinList(metadata.preferredUtteranceIds),
    }
  })

  XLSX.utils.book_append_sheet(
    workbook,
    resourceRows.length > 0 ? XLSX.utils.json_to_sheet(resourceRows) : createEmptySheet([
      'resourceType', 'sceneCode', 'name', 'title', 'category', 'description', 'coverImage',
      'imageUrl', 'difficultyLevel', 'recommendedHintCeiling', 'ageRange', 'abilityLevel',
      'tags', 'targetEmotion', 'emotionOptions', 'emotionClues', 'careType', 'receiverEmotion',
      'speakerPerspectiveText', 'receiverPerspectiveText', 'preferredUtteranceIds',
    ]),
    'resources'
  )
  XLSX.utils.book_append_sheet(
    workbook,
    buildPromptRows(packResources).length > 0
      ? XLSX.utils.json_to_sheet(buildPromptRows(packResources))
      : createEmptySheet(['sceneCode', 'questionId', 'questionType', 'questionText']),
    'emotion_prompts'
  )
  XLSX.utils.book_append_sheet(
    workbook,
    buildPromptOptionRows(packResources).length > 0
      ? XLSX.utils.json_to_sheet(buildPromptOptionRows(packResources))
      : createEmptySheet(['sceneCode', 'questionId', 'optionId', 'text', 'imageUrl', 'isCorrect', 'isAcceptable', 'feedbackText']),
    'emotion_prompt_options'
  )
  XLSX.utils.book_append_sheet(
    workbook,
    buildSolutionRows(packResources).length > 0
      ? XLSX.utils.json_to_sheet(buildSolutionRows(packResources))
      : createEmptySheet(['sceneCode', 'solutionId', 'text', 'imageUrl', 'suitability', 'explanation']),
    'emotion_solutions'
  )
  XLSX.utils.book_append_sheet(
    workbook,
    buildUtteranceRows(packResources).length > 0
      ? XLSX.utils.json_to_sheet(buildUtteranceRows(packResources))
      : createEmptySheet(['sceneCode', 'utteranceId', 'type', 'text', 'effect', 'receiverReactionText', 'receiverReactionEmoji']),
    'care_utterances'
  )
  XLSX.utils.book_append_sheet(
    workbook,
    buildReceiverOptionRows(packResources).length > 0
      ? XLSX.utils.json_to_sheet(buildReceiverOptionRows(packResources))
      : createEmptySheet(['sceneCode', 'optionId', 'text', 'isComforting', 'reasonText']),
    'care_receiver_options'
  )
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ['SCGP Emotional Resource Pack Template'],
      ['schemaVersion', EMOTIONAL_PACK_SCHEMA_VERSION],
      ['说明', '请先填写 resources sheet，再按 sceneCode 维护其他子表。多值字段用 " | " 分隔。'],
      ['情绪资源类型', 'emotion_scene / care_scene'],
      ['冲突键', 'resourceType + sceneCode'],
    ]),
    'README'
  )

  return XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })
}

export function createEmotionalExcelTemplateBuffer() {
  return createEmotionalExcelPackBuffer([])
}

export async function parseEmotionalPackFile(file: File): Promise<EmotionalPackImportResult> {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  if (extension === 'json') {
    const content = await file.text()
    const parsed = JSON.parse(content) as EmotionalPackDocument | EmotionalPackResource[]
    const schemaVersion = Array.isArray(parsed)
      ? EMOTIONAL_PACK_SCHEMA_VERSION
      : normalizeString(parsed.schemaVersion, EMOTIONAL_PACK_SCHEMA_VERSION)
    const resources = Array.isArray(parsed) ? parsed : parsed.resources

    if (!Array.isArray(resources) || resources.length === 0) {
      throw new Error('JSON 资源包缺少 resources 数组或内容为空')
    }

    const items = resources.map((resource, index) => normalizePackResource(resource, index))
    const duplicateKeys = getBatchDuplicateKeys(items)
    items.forEach((item) => {
      if (duplicateKeys.has(`${item.resourceType}::${item.sceneCode}`)) {
        item.validationErrors = Array.from(new Set([
          ...item.validationErrors,
          '导入文件内存在重复的 resourceType + sceneCode 组合',
        ]))
      }
    })

    return {
      format: 'json',
      schemaVersion,
      items,
    }
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer()
    return parseExcelPack(buffer)
  }

  throw new Error('仅支持导入 .json / .xlsx / .xls 文件')
}
