import { ModuleCode } from '@/types/module'
import type {
  PhysicalEquipmentDomain,
  PhysicalEquipmentImportStatus,
  PhysicalEquipmentResourceMeta,
} from '@/types/physical-equipment'

export const PHYSICAL_EQUIPMENT_SEED_LEGACY_SOURCE = 'physical_equipment_seed_2026_03_26'

export interface PhysicalEquipmentSeedInput {
  domain: PhysicalEquipmentDomain
  sourcePath: string
  raw: string
}

export interface PhysicalEquipmentSeedResource {
  moduleCode: ModuleCode
  resourceType: 'equipment'
  name: string
  category: PhysicalEquipmentDomain
  description: string
  coverImage?: string
  tags: string[]
  metadata: PhysicalEquipmentResourceMeta
}

export interface PhysicalEquipmentSeedSummary {
  totalCount: number
  byDomain: Record<PhysicalEquipmentDomain, number>
  byModule: Record<ModuleCode, number>
}

interface PhysicalEquipmentDraftRow {
  sourceCategory: string
  sourceBox: string
  sourceSequence: number | undefined
  name: string
  description: string
  tags: string[]
  notes?: string
  status?: PhysicalEquipmentImportStatus
  resourceCode?: string
  moduleCode?: ModuleCode
  imageFile?: string
  coverImage?: string
}

const DOMAIN_MODULE_MAP: Record<PhysicalEquipmentDomain, ModuleCode> = {
  'emotional-regulation': ModuleCode.EMOTIONAL,
  'social-communication': ModuleCode.SOCIAL,
  'fine-motor': ModuleCode.SENSORY,
  'soothing-aids': ModuleCode.EMOTIONAL,
  'daily-living': ModuleCode.LIFE_SKILLS,
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      const next = line[index + 1]
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

function normalizeHeader(header: string): string {
  return header.replace(/^\uFEFF/, '').trim()
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeModuleCode(value: string, fallback: ModuleCode): ModuleCode {
  switch (value) {
    case ModuleCode.SENSORY:
    case ModuleCode.EMOTIONAL:
    case ModuleCode.SOCIAL:
    case ModuleCode.COGNITIVE:
    case ModuleCode.LIFE_SKILLS:
    case ModuleCode.RESOURCE:
      return value
    default:
      return fallback
  }
}

function normalizeStatus(value: string): PhysicalEquipmentImportStatus {
  if (value === 'reviewed' || value === 'ready') {
    return value
  }
  return 'draft'
}

function splitTags(raw: string): string[] {
  return Array.from(new Set(
    raw
      .split(/[|、，,；;]/)
      .map((item) => item.trim())
      .filter(Boolean)
  ))
}

function padNumber(value: number | undefined, width: number): string {
  const numberValue = Number.isFinite(value) ? Number(value) : 0
  return String(Math.max(numberValue, 0)).padStart(width, '0')
}

function buildVariantSuffix(variantIndex: number): string {
  if (variantIndex <= 0) {
    return ''
  }

  const letter = LETTERS[variantIndex - 1]
  return letter ? `-${letter}` : `-v${variantIndex + 1}`
}

function buildGeneratedResourceCode(
  domain: PhysicalEquipmentDomain,
  sourceBox: string,
  sourceSequence: number | undefined,
  variantIndex: number,
  fallbackRowNumber: number
): string {
  const boxNumber = Number(sourceBox || 0)
  const sequence = Number.isFinite(sourceSequence) ? Number(sourceSequence) : fallbackRowNumber
  return `${domain}-box${padNumber(boxNumber, 2)}-seq${padNumber(sequence, 3)}${buildVariantSuffix(variantIndex)}`
}

function getSuggestedAssetPath(domain: PhysicalEquipmentDomain, resourceCode: string): string {
  return `src/assets/images/physical-equipment/${domain}/${resourceCode}.webp`
}

function findFirstHeader(
  headerIndex: Map<string, number>,
  candidates: string[]
): string | undefined {
  return candidates.find((candidate) => headerIndex.has(candidate))
}

function getCell(row: Record<string, string>, key?: string): string {
  return key ? normalizeString(row[key]) : ''
}

function isTemplateCsv(headers: string[]): boolean {
  return headers.includes('resourceCode') && headers.includes('moduleCode') && headers.includes('domain')
}

function parseTemplateRows(
  domain: PhysicalEquipmentDomain,
  headers: string[],
  rows: string[][]
): PhysicalEquipmentDraftRow[] {
  const result: PhysicalEquipmentDraftRow[] = []
  const fallbackModule = DOMAIN_MODULE_MAP[domain]

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = Object.fromEntries(
      headers.map((header, index) => [header, normalizeString(rows[rowIndex]?.[index] || '')])
    )

    const name = normalizeString(row.name)
    if (!name) {
      continue
    }

    const resourceCode = normalizeString(row.resourceCode)
    const rowDomain = (normalizeString(row.domain) || domain) as PhysicalEquipmentDomain
    result.push({
      sourceCategory: normalizeString(row.domain) || domain,
      sourceBox: '',
      sourceSequence: undefined,
      name,
      description: normalizeString(row.description),
      tags: splitTags(normalizeString(row.abilityTags)),
      notes: normalizeString(row.notes) || undefined,
      status: normalizeStatus(normalizeString(row.status)),
      resourceCode: resourceCode || undefined,
      moduleCode: normalizeModuleCode(normalizeString(row.moduleCode), fallbackModule),
      imageFile: normalizeString(row.imageFile) || undefined,
      coverImage: normalizeString(row.coverImage) || undefined,
    })

    if (rowDomain !== domain) {
      result[result.length - 1]!.sourceCategory = normalizeString(row.domain) || domain
    }
  }

  return result
}

function parseDraftRows(
  domain: PhysicalEquipmentDomain,
  headers: string[],
  rows: string[][]
): PhysicalEquipmentDraftRow[] {
  const headerIndex = new Map(headers.map((header, index) => [header, index]))
  const categoryHeader = findFirstHeader(headerIndex, ['类别名称', '套装类别', '类别模块']) || ''
  const descriptionHeader = findFirstHeader(headerIndex, ['教育目标与功能描述', '教育目标与功能描述 ']) || ''
  const tagsHeader = findFirstHeader(headerIndex, ['能力标签', '核心能力标签']) || ''

  const result: PhysicalEquipmentDraftRow[] = []
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = Object.fromEntries(
      headers.map((header, index) => [header, normalizeString(rows[rowIndex]?.[index] || '')])
    )

    const name = normalizeString(row['产品名称'])
    const sourceCategory = getCell(row, categoryHeader)
    if (!name || name === '训练卡' || sourceCategory === '训练卡') {
      continue
    }

    const sequenceValue = Number(getCell(row, '序号'))
    result.push({
      sourceCategory,
      sourceBox: getCell(row, '箱号'),
      sourceSequence: Number.isFinite(sequenceValue) && sequenceValue > 0 ? sequenceValue : undefined,
      name,
      description: getCell(row, descriptionHeader),
      tags: splitTags(getCell(row, tagsHeader)),
    })
  }

  return result
}

function parseRows(input: PhysicalEquipmentSeedInput): PhysicalEquipmentDraftRow[] {
  const lines = input.raw
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return []
  }

  const headers = parseCsvLine(lines[0] || '').map(normalizeHeader)
  const rows = lines.slice(1).map((line) => parseCsvLine(line))

  return isTemplateCsv(headers)
    ? parseTemplateRows(input.domain, headers, rows)
    : parseDraftRows(input.domain, headers, rows)
}

function buildResource(
  domain: PhysicalEquipmentDomain,
  sourcePath: string,
  row: PhysicalEquipmentDraftRow,
  rowIndex: number,
  variantIndex: number
): PhysicalEquipmentSeedResource {
  const moduleCode = row.moduleCode || DOMAIN_MODULE_MAP[domain]
  const resourceCode = row.resourceCode || buildGeneratedResourceCode(
    domain,
    row.sourceBox,
    row.sourceSequence,
    variantIndex,
    rowIndex + 1
  )
  const metadata: PhysicalEquipmentResourceMeta = {
    kind: 'physical_equipment',
    resourceCode,
    domain,
    sourceCategory: row.sourceCategory || domain,
    sourceBox: row.sourceBox || undefined,
    sourceSequence: row.sourceSequence,
    sourceVariant: variantIndex > 0 ? buildVariantSuffix(variantIndex).slice(1) : undefined,
    sourceFile: sourcePath,
    sourceRow: rowIndex + 2,
    imageFile: row.imageFile || `${resourceCode}.webp`,
    suggestedAssetPath: getSuggestedAssetPath(domain, resourceCode),
    notes: row.notes,
    status: row.status || 'draft',
  }

  return {
    moduleCode,
    resourceType: 'equipment',
    name: row.name,
    category: domain,
    description: row.description,
    coverImage: row.coverImage,
    tags: row.tags,
    metadata,
  }
}

function createEmptySummary(): PhysicalEquipmentSeedSummary {
  return {
    totalCount: 0,
    byDomain: {
      'emotional-regulation': 0,
      'social-communication': 0,
      'fine-motor': 0,
      'soothing-aids': 0,
      'daily-living': 0,
    },
    byModule: {
      [ModuleCode.SENSORY]: 0,
      [ModuleCode.EMOTIONAL]: 0,
      [ModuleCode.SOCIAL]: 0,
      [ModuleCode.COGNITIVE]: 0,
      [ModuleCode.LIFE_SKILLS]: 0,
      [ModuleCode.RESOURCE]: 0,
    },
  }
}

export function createPhysicalEquipmentSeedResources(inputs: PhysicalEquipmentSeedInput[]): {
  resources: PhysicalEquipmentSeedResource[]
  summary: PhysicalEquipmentSeedSummary
} {
  const resources: PhysicalEquipmentSeedResource[] = []
  const summary = createEmptySummary()

  for (const input of inputs) {
    const rows = parseRows(input)
    const duplicateCounter = new Map<string, number>()

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex]
      if (!row) {
        continue
      }

      const duplicateKey = `${row.sourceBox || '0'}:${row.sourceSequence || rowIndex + 1}`
      const currentVariant = duplicateCounter.get(duplicateKey) || 0
      duplicateCounter.set(duplicateKey, currentVariant + 1)

      const resource = buildResource(input.domain, input.sourcePath, row, rowIndex, currentVariant)
      resources.push(resource)
      summary.totalCount += 1
      summary.byDomain[input.domain] += 1
      summary.byModule[resource.moduleCode] += 1
    }
  }

  return { resources, summary }
}
