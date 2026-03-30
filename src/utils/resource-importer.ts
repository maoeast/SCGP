import { TeachingMaterialsAPI } from '@/database/teaching-materials-api'
import { teachingMaterialFileManager } from '@/utils/teaching-material-file-manager'
import {
  normalizeTeachingMaterialDimensionCode,
  type TeachingMaterialDimensionCode,
} from '@/utils/resource-center-business'

interface ParsedImportRow {
  relativePath: string
  dimensionCode: TeachingMaterialDimensionCode
  title: string
  tags: string[]
  description: string
}

interface HeaderMap {
  relativePath: number | null
  dimensionCode: number | null
  title: number | null
  tags: number | null
  description: number | null
}

interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

export class ResourceImporter {
  private api: TeachingMaterialsAPI

  constructor() {
    this.api = new TeachingMaterialsAPI()
  }

  async importFromCSV(csvContent: string, sourceFolderPath?: string): Promise<ImportResult> {
    const rows = parseCsv(csvContent)
    if (rows.length === 0) {
      return {
        success: 0,
        failed: 1,
        errors: ['CSV 文件为空'],
      }
    }

    const headerRow = rows[0] || []
    const headerMap = buildHeaderMap(headerRow)
    const parsedRows: ParsedImportRow[] = []
    const errors: string[] = []
    let failed = 0

    if (headerMap.relativePath === null || headerMap.dimensionCode === null) {
      return {
        success: 0,
        failed: 1,
        errors: ['CSV 缺少必要列：relativePath / dimensionCode'],
      }
    }

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || []
      if (row.every((field) => !String(field || '').trim())) {
        continue
      }

      const rawRelativePath = readColumn(row, headerMap.relativePath)
      const rawDimensionCode = readColumn(row, headerMap.dimensionCode)
      const dimensionCode = normalizeTeachingMaterialDimensionCode(rawDimensionCode)

      if (!rawRelativePath) {
        errors.push(`第 ${rowIndex + 1} 行缺少 relativePath`)
        failed += 1
        continue
      }

      if (!dimensionCode) {
        errors.push(`第 ${rowIndex + 1} 行 dimensionCode 无效: ${rawDimensionCode || '(空)'}`)
        failed += 1
        continue
      }

      const fileName = getFileName(rawRelativePath)

      parsedRows.push({
        relativePath: normalizeRelativePath(rawRelativePath),
        dimensionCode,
        title: readColumn(row, headerMap.title) || getFileNameWithoutExtension(fileName),
        tags: splitTagField(readColumn(row, headerMap.tags)),
        description: readColumn(row, headerMap.description),
      })
    }

    const importResult = await this.importRows(parsedRows, sourceFolderPath)
    return {
      success: importResult.success,
      failed: failed + importResult.failed,
      errors: [...errors, ...importResult.errors],
    }
  }

  async importSampleTemplate(): Promise<ImportResult> {
    return {
      success: 0,
      failed: 1,
      errors: ['示例导入已下线，请使用“外部文件目录 + CSV”方式导入'],
    }
  }

  createTemplateCsv(): string {
    return [
      'relativePath,dimensionCode,title,tags,description',
      '"documents/sensory-guide.pdf","sensory-training","感官训练指导手册","感官,评估","用于感官训练课程的基础指导材料"',
      '"videos/emotion-demo.mp4","emotional-regulation","情绪调节示范课","情绪调节,示范","客户侧批量导入示例"',
    ].join('\n')
  }

  generateImportReport(result: ImportResult): string {
    const lines: string[] = [
      '==================================================',
      '批量导入完成',
      '==================================================',
      `成功导入: ${result.success}`,
      `导入失败: ${result.failed}`,
    ]

    if (result.errors.length > 0) {
      lines.push('')
      lines.push('错误详情:')
      result.errors.forEach((error, index) => {
        lines.push(`${index + 1}. ${error}`)
      })
    }

    return lines.join('\n')
  }

  private async importRows(rows: ParsedImportRow[], sourceFolderPath?: string): Promise<ImportResult> {
    const errors: string[] = []
    let success = 0
    let failed = 0

    for (const row of rows) {
      try {
        const sourceAbsolutePath = resolveSourceAbsolutePath(sourceFolderPath, row.relativePath)
        const storedFile = await teachingMaterialFileManager.importExternalFile(
          sourceAbsolutePath,
          row.dimensionCode,
          getFileName(sourceAbsolutePath)
        )

        try {
          const materialId = this.api.addMaterial({
            title: row.title,
            dimensionCode: row.dimensionCode,
            fileName: storedFile.fileName,
            fileType: storedFile.fileType,
            filePath: storedFile.filePath,
            fileSizeBytes: storedFile.fileSizeBytes,
            tags: row.tags,
            description: row.description || undefined,
          })

          if (!materialId) {
            await teachingMaterialFileManager.deleteManagedFile(storedFile.filePath)
            throw new Error('数据库写入失败')
          }
        } catch (saveError) {
          await teachingMaterialFileManager.deleteManagedFile(storedFile.filePath)
          throw saveError
        }

        success += 1
      } catch (importError) {
        failed += 1
        errors.push(`${row.relativePath}: ${getErrorMessage(importError)}`)
      }
    }

    return { success, failed, errors }
  }
}

function parseCsv(csvContent: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  const normalizedContent = csvContent.replace(/^\uFEFF/, '')

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
      currentRow.push(currentField.trim())
      currentField = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1
      }

      currentRow.push(currentField.trim())
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ''
      continue
    }

    currentField += char
  }

  currentRow.push(currentField.trim())
  if (currentRow.some((field) => field.length > 0)) {
    rows.push(currentRow)
  }

  return rows
}

function buildHeaderMap(headerRow: string[]): HeaderMap {
  const map: HeaderMap = {
    relativePath: null,
    dimensionCode: null,
    title: null,
    tags: null,
    description: null,
  }

  headerRow.forEach((header, index) => {
    const normalizedHeader = normalizeHeader(header)
    switch (normalizedHeader) {
      case 'relativePath':
      case 'dimensionCode':
      case 'title':
      case 'tags':
      case 'description':
        map[normalizedHeader] = index
        break
      default:
        break
    }
  })

  return map
}

function normalizeHeader(header: string): string {
  const normalized = header.trim().replace(/[\s_-]+/g, '').toLowerCase()

  if (normalized === 'relativepath' || normalized === 'filepath' || normalized === 'path') {
    return 'relativePath'
  }

  if (normalized === 'dimensioncode' || normalized === 'dimension') {
    return 'dimensionCode'
  }

  if (normalized === 'title' || normalized === 'name') {
    return 'title'
  }

  if (normalized === 'tags' || normalized === 'tag') {
    return 'tags'
  }

  if (normalized === 'description' || normalized === 'desc') {
    return 'description'
  }

  return normalized
}

function readColumn(row: string[], index: number | null): string {
  if (index === null || index < 0) {
    return ''
  }

  return String(row[index] || '').trim()
}

function splitTagField(value: string): string[] {
  if (!value) {
    return []
  }

  return value
    .split(/[|;,]/)
    .map((tag) => tag.trim())
    .filter((tag, index, array) => tag.length > 0 && array.indexOf(tag) === index)
}

function resolveSourceAbsolutePath(sourceFolderPath: string | undefined, relativePath: string): string {
  if (isAbsolutePath(relativePath)) {
    return relativePath
  }

  if (!sourceFolderPath) {
    throw new Error('尚未选择素材目录')
  }

  return joinFileSystemPath(sourceFolderPath, relativePath)
}

function normalizeRelativePath(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
}

function joinFileSystemPath(basePath: string, relativePath: string): string {
  const separator = basePath.includes('\\') ? '\\' : '/'
  const cleanedBase = basePath.replace(/[\\/]+$/, '')
  const cleanedRelative = relativePath
    .replace(/^[\\/]+/, '')
    .replace(/[\\/]+/g, separator)

  return `${cleanedBase}${separator}${cleanedRelative}`
}

function isAbsolutePath(filePath: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(filePath) || filePath.startsWith('/')
}

function getFileName(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/')
  const segments = normalizedPath.split('/')
  return segments[segments.length - 1] || 'material.bin'
}

function getFileNameWithoutExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot <= 0) {
    return fileName
  }

  return fileName.slice(0, lastDot)
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误'
}

export const resourceImporter = new ResourceImporter()
