export const TRAINING_RESOURCE_COPY_HEADERS = [
  'resourceKey',
  'origin',
  'moduleCode',
  'resourceType',
  'name',
  'description',
  'previewDescription',
  'repeatPlayHint',
] as const

export type TrainingResourceCopyHeader = typeof TRAINING_RESOURCE_COPY_HEADERS[number]

export type TrainingResourceCopyOrigin =
  | 'sensory-equipment'
  | 'sensory-game'
  | 'emotional-game'
  | 'emotion-scene'
  | 'care-scene'
  | 'physical-equipment'

export interface TrainingResourceCopyRow {
  resourceKey: string
  origin: TrainingResourceCopyOrigin | string
  moduleCode: string
  resourceType: string
  name: string
  description: string
  previewDescription: string
  repeatPlayHint: string
}

export interface ParsedTrainingResourceCopyKey {
  origin: TrainingResourceCopyOrigin
  identifier: string
}

export function buildSensoryEquipmentResourceCopyKey(legacyId: number): string {
  return `sensory-equipment:${legacyId}`
}

export function buildSensoryGameResourceCopyKey(taskId: number): string {
  return `sensory-game:${taskId}`
}

export function buildEmotionalGameResourceCopyKey(gameCode: string): string {
  return `emotional-game:${String(gameCode || '').trim()}`
}

export function buildEmotionSceneResourceCopyKey(sceneCode: string): string {
  return `emotion-scene:${String(sceneCode || '').trim()}`
}

export function buildCareSceneResourceCopyKey(sceneCode: string): string {
  return `care-scene:${String(sceneCode || '').trim()}`
}

export function buildPhysicalEquipmentResourceCopyKey(resourceCode: string): string {
  return `physical-equipment:${String(resourceCode || '').trim()}`
}

export function parseTrainingResourceCopyKey(resourceKey: string): ParsedTrainingResourceCopyKey | null {
  const trimmed = String(resourceKey || '').trim()
  const separatorIndex = trimmed.indexOf(':')
  if (separatorIndex <= 0 || separatorIndex === trimmed.length - 1) {
    return null
  }

  const origin = trimmed.slice(0, separatorIndex) as TrainingResourceCopyOrigin
  const identifier = trimmed.slice(separatorIndex + 1).trim()
  if (!identifier) {
    return null
  }

  switch (origin) {
    case 'sensory-equipment':
    case 'sensory-game':
    case 'emotional-game':
    case 'emotion-scene':
    case 'care-scene':
    case 'physical-equipment':
      return { origin, identifier }
    default:
      return null
  }
}

export function parseTrainingResourceCopyCsv(csvContent: string): TrainingResourceCopyRow[] {
  const rows = parseCsv(csvContent)
  if (rows.length === 0) {
    return []
  }

  const [headerRow, ...dataRows] = rows
  const headerMap = buildHeaderMap(headerRow || [])

  return dataRows
    .map((row) => ({
      resourceKey: readColumn(row, headerMap.resourceKey),
      origin: readColumn(row, headerMap.origin),
      moduleCode: readColumn(row, headerMap.moduleCode),
      resourceType: readColumn(row, headerMap.resourceType),
      name: readColumn(row, headerMap.name),
      description: readColumn(row, headerMap.description),
      previewDescription: readColumn(row, headerMap.previewDescription),
      repeatPlayHint: readColumn(row, headerMap.repeatPlayHint),
    }))
    .filter((row) => row.resourceKey.length > 0)
}

export function serializeTrainingResourceCopyCsv(rows: TrainingResourceCopyRow[]): string {
  const normalizedRows = [...rows].sort((left, right) =>
    left.resourceKey.localeCompare(right.resourceKey, 'zh-CN')
  )

  const lines = [
    TRAINING_RESOURCE_COPY_HEADERS.join(','),
    ...normalizedRows.map((row) =>
      TRAINING_RESOURCE_COPY_HEADERS
        .map((header) => escapeCsvValue(String(row[header] || '')))
        .join(',')
    ),
  ]

  return `${lines.join('\n')}\n`
}

export function indexTrainingResourceCopyRows(rows: TrainingResourceCopyRow[]): Map<string, TrainingResourceCopyRow> {
  return new Map(
    rows
      .filter((row) => row.resourceKey.length > 0)
      .map((row) => [row.resourceKey, row] as const)
  )
}

function parseCsv(csvContent: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  const normalizedContent = String(csvContent || '').replace(/^\uFEFF/, '')

  for (let index = 0; index < normalizedContent.length; index += 1) {
    const char = normalizedContent[index]
    const nextChar = normalizedContent[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField)
      currentField = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1
      }

      currentRow.push(currentField)
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow.map((field) => field.trim()))
      }
      currentRow = []
      currentField = ''
      continue
    }

    currentField += char
  }

  currentRow.push(currentField)
  if (currentRow.some((field) => field.length > 0)) {
    rows.push(currentRow.map((field) => field.trim()))
  }

  return rows
}

function buildHeaderMap(headerRow: string[]): Record<TrainingResourceCopyHeader, number | null> {
  const map: Record<TrainingResourceCopyHeader, number | null> = {
    resourceKey: null,
    origin: null,
    moduleCode: null,
    resourceType: null,
    name: null,
    description: null,
    previewDescription: null,
    repeatPlayHint: null,
  }

  headerRow.forEach((header, index) => {
    const normalized = normalizeHeader(header)
    if (normalized in map) {
      map[normalized as TrainingResourceCopyHeader] = index
    }
  })

  return map
}

function normalizeHeader(header: string): string {
  const normalized = String(header || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/[\s_-]+/g, '')
    .toLowerCase()

  switch (normalized) {
    case 'resourcekey':
    case 'key':
      return 'resourceKey'
    case 'origin':
    case 'source':
      return 'origin'
    case 'modulecode':
    case 'module':
      return 'moduleCode'
    case 'resourcetype':
    case 'type':
      return 'resourceType'
    case 'name':
    case 'title':
      return 'name'
    case 'description':
    case 'desc':
      return 'description'
    case 'previewdescription':
    case 'preview':
      return 'previewDescription'
    case 'repeatplayhint':
    case 'repeathint':
    case 'hint':
      return 'repeatPlayHint'
    default:
      return normalized
  }
}

function readColumn(row: string[], index: number | null): string {
  if (index === null || index < 0) {
    return ''
  }

  return String(row[index] || '').trim()
}

function escapeCsvValue(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}
