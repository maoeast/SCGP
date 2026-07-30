/**
 * AI 结构化报告 → Word 导出载荷映射层。
 *
 * 配套 generate_report 工具（src/services/ai-tools.ts）：模型把报告结构填进工具参数，
 * 本文件把「AI 友好的扁平结构（AIReportInput）」映射为 export-word.ts 的 WordExportPayload，
 * 并对所有不可控的模型输出做兜底与体量截断（防 token 爆炸 / 防 docx 生成失败）。
 *
 * 设计取舍：不直接把 WordExportPayload 的判别联合当作工具 schema（模型对判别联合遵循度低），
 * 改用更扁平的 AIReportSection（type + 平铺字段），由本层分派 + 校验 + 兜底。
 */
import type { WordExportPayload, WordSection } from './export-word'

// ==================== AI 输入契约（= generate_report 工具参数）====================

export type AIReportType = 'general' | 'iep_plan' | 'training_plan' | 'assessment_summary'

export type AIReportSectionType = 'paragraph' | 'list' | 'table' | 'kv_table'

/** 基本信息键值对（meta 与 kv_table 通用） */
export interface AIReportKV {
  label: string
  value: string
}

export interface AIReportSection {
  type: AIReportSectionType
  heading?: string
  /** paragraph 用 */
  text?: string
  /** list 用 */
  items?: string[]
  /** table 用 */
  columns?: string[]
  /** table 用（二维字符串数组） */
  rows?: string[][]
  /** kv_table 用 */
  rows_kv?: AIReportKV[]
}

export interface AIReportInput {
  title: string
  subtitle?: string
  /** 预留：MVP 一律按 general 处理，仅影响文件名前缀 */
  report_type?: AIReportType
  /** 用于文件名 */
  student_name?: string
  meta?: AIReportKV[]
  sections: AIReportSection[]
}

export interface BuildAIReportWordPayloadOptions {
  /** 已保存的回答再次导出时保留全文；模型工具调用仍使用默认截断。 */
  preserveParagraphText?: boolean
}

// ==================== 体量护栏 ====================

const MAX_SECTIONS = 8
const MAX_TABLE_ROWS = 20
const MAX_LIST_ITEMS = 30
const MAX_KV_ROWS = 30
const MAX_PARAGRAPH_CHARS = 500
const MAX_FIELD_CHARS = 200
const MAX_TITLE_CHARS = 60

// ==================== 工具函数（与 assessment-word-builders 同源，本文件私有副本）====================

/** 去除模型可能混入的 HTML/Markdown 标记 */
function cleanText(text: unknown): string {
  if (text == null) return ''
  return String(text)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\r/g, '')
    .trim()
}

/** 清洗 + 限长，超出加省略号 */
function clampText(text: unknown, max: number): string {
  const cleaned = cleanText(text)
  if (cleaned.length <= max) return cleaned
  return cleaned.slice(0, max) + '…'
}

/** 生成日期戳 YYYY-MM-DD（与全项目 Word 文件名约定一致） */
function isoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 文件名标准：${前缀}_${学生名}_${ISO日期}（对齐 assessment-word-builders.buildFilename） */
function buildFilename(prefix: string, studentName: string): string {
  const name = (studentName || '').trim() || '未署名'
  const forbid = /[\\/:*?"<>|]/g
  return `${prefix.replace(forbid, '_')}_${name.replace(forbid, '_')}_${isoDate()}`
}

/** report_type / title → 文件名前缀 */
function prefixForReportType(reportType?: AIReportType, title?: string): string {
  const fromTitle = cleanText(title)
  if (fromTitle) return fromTitle.length > 20 ? fromTitle.slice(0, 20) : fromTitle
  switch (reportType) {
    case 'iep_plan':
      return 'IEP计划'
    case 'training_plan':
      return '训练计划'
    case 'assessment_summary':
      return '评估总结'
    default:
      return 'AI报告'
  }
}

function toStringArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return []
  return arr.map((v) => cleanText(v)).filter((s) => s.length > 0)
}

function toKVArray(arr: unknown): AIReportKV[] {
  if (!Array.isArray(arr)) return []
  return arr
    .map((item) => {
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>
        const label = clampText(obj.label, MAX_FIELD_CHARS)
        const value = clampText(obj.value, MAX_FIELD_CHARS)
        return label ? { label, value } : null
      }
      return null
    })
    .filter((kv): kv is AIReportKV => kv !== null)
}

/** 二维字符串数组：每格清洗，空行剔除，行数截断 */
function toStringMatrix(arr: unknown): string[][] {
  if (!Array.isArray(arr)) return []
  return arr
    .map((row) =>
      Array.isArray(row) ? row.map((cell) => clampText(cell, MAX_FIELD_CHARS)) : [],
    )
    .filter((row) => row.length > 0)
    .slice(0, MAX_TABLE_ROWS)
}

// ==================== section 映射 ====================

function mapSection(
  raw: AIReportSection,
  options: BuildAIReportWordPayloadOptions,
): WordSection | null {
  const heading = clampText(raw.heading, MAX_FIELD_CHARS) || undefined

  switch (raw.type) {
    case 'list': {
      const items = toStringArray(raw.items).slice(0, MAX_LIST_ITEMS)
      if (items.length === 0) return null
      return { type: 'list', heading, items }
    }

    case 'table': {
      const columns = toStringArray(raw.columns)
      const rows = toStringMatrix(raw.rows)
      if (columns.length === 0 || rows.length === 0) return null
      const colCount = columns.length
      const columnWidths = Array.from({ length: colCount }, () => Math.floor(100 / colCount))
      // 行内列数对齐 columns（多则截、少则补空串）
      const alignedRows = rows.map((row) => {
        if (row.length === colCount) return row
        const fixed = row.slice(0, colCount)
        while (fixed.length < colCount) fixed.push('')
        return fixed
      })
      return { type: 'table', heading, columns, rows: alignedRows, columnWidths }
    }

    case 'kv_table': {
      const rows = toKVArray(raw.rows_kv).slice(0, MAX_KV_ROWS)
      if (rows.length === 0) return null
      return { type: 'kv-table', heading, rows }
    }

    case 'paragraph':
    default: {
      // 非法 type 一并降级为 paragraph；text 内多个换行拆成多段
      const text = options.preserveParagraphText
        ? cleanText(raw.text)
        : clampText(raw.text, MAX_PARAGRAPH_CHARS)
      const paragraphs = text
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      if (paragraphs.length === 0) return null
      return { type: 'paragraph', heading, paragraphs }
    }
  }
}

// ==================== 主入口 ====================

/**
 * 把 generate_report 工具参数映射为 WordExportPayload。
 * 全量防御：字段缺失兜底、类型不符降级、超长截断，保证 exportWordDocument 不会因模型输出而崩。
 */
export function buildAIReportWordPayload(
  input: AIReportInput,
  options: BuildAIReportWordPayloadOptions = {},
): WordExportPayload {
  const title = clampText(input.title, MAX_TITLE_CHARS) || 'AI 生成报告'
  const studentName = cleanText(input.student_name)
  const filename = buildFilename(prefixForReportType(input.report_type, input.title), studentName)

  const meta = toKVArray(input.meta).slice(0, MAX_KV_ROWS)

  const rawSections = Array.isArray(input.sections) ? input.sections : []
  const sections: WordSection[] = []
  for (const raw of rawSections) {
    if (sections.length >= MAX_SECTIONS) break
    if (!raw || typeof raw !== 'object') continue
    const mapped = mapSection(raw as AIReportSection, options)
    if (mapped) sections.push(mapped)
  }

  // 兜底：完全没有可用 section → 放一个占位段落，保证生成非空
  if (sections.length === 0) {
    sections.push({ type: 'paragraph', paragraphs: ['（报告内容为空）'] })
  }

  const payload: WordExportPayload = { title, filename, sections }
  const subtitle = clampText(input.subtitle, 80)
  if (subtitle) payload.subtitle = subtitle
  if (meta.length > 0) payload.meta = meta
  return payload
}
