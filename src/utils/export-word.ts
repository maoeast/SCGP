import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  HeadingLevel,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  TextWrappingSide,
  TextWrappingType,
  VerticalPositionRelativeFrom,
  WidthType,
  convertInchesToTwip,
} from 'docx'
import { saveAs } from 'file-saver'

export interface WordMetaItem {
  label: string
  value: string
}

export interface WordParagraphSection {
  type: 'paragraph'
  heading?: string
  paragraphs: string[]
}

export interface WordListSection {
  type: 'list'
  heading?: string
  items: string[]
}

export interface WordTableSection {
  type: 'table'
  heading?: string
  columns: string[]
  rows: string[][]
  columnWidths?: number[]
}

export interface WordKeyValueTableSection {
  type: 'kv-table'
  heading?: string
  rows: WordMetaItem[]
}

export type WordSection =
  | WordParagraphSection
  | WordListSection
  | WordTableSection
  | WordKeyValueTableSection

export interface WordExportPayload {
  title: string
  subtitle?: string
  filename: string
  meta?: WordMetaItem[]
  sections: WordSection[]
  /** 报告页眉文字（来自系统设置 report_header；空值不渲染页眉） */
  headerText?: string
  /** 学生头像图片 URL（已过 resolveStudentAvatarUrl 过滤；导出层负责取字节嵌入，失败静默跳过） */
  avatarUrl?: string
}

export type WordExportReceiver = (blob: Blob, fileName: string) => void | Promise<void>

/** 手册截图拦截钩子（window.__SCGP_MANUAL_CAPTURE_EXPORT_WORD__）；HTML 导出与测试复用同一钩子 */
export function getWordExportReceiver(): WordExportReceiver | null {
  if (typeof window === 'undefined') return null
  const captureWindow = window as Window & {
    __SCGP_MANUAL_CAPTURE_EXPORT_WORD__?: WordExportReceiver
  }
  return typeof captureWindow.__SCGP_MANUAL_CAPTURE_EXPORT_WORD__ === 'function'
    ? captureWindow.__SCGP_MANUAL_CAPTURE_EXPORT_WORD__
    : null
}

const FONT_FAMILY = 'Microsoft YaHei'
const TEXT_COLOR = '333333'
const MUTED_COLOR = '666666'
const HEADER_FILL = 'F5F7FA'

const BORDER = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: 'CCCCCC',
}

export function cleanText(text: string | undefined): string {
  if (!text) return ''

  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\r/g, '')
    .trim()
}

function createTextRun(text: string, options?: { bold?: boolean; color?: string }) {
  return new TextRun({
    text,
    bold: options?.bold,
    color: options?.color || TEXT_COLOR,
    font: FONT_FAMILY,
    size: 22,
  })
}

function createParagraph(
  text: string,
  options?: {
    heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel]
    bold?: boolean
    color?: string
    align?: (typeof AlignmentType)[keyof typeof AlignmentType]
    bullet?: boolean
  }
) {
  return new Paragraph({
    heading: options?.heading,
    alignment: options?.align,
    bullet: options?.bullet ? { level: 0 } : undefined,
    spacing: {
      after: options?.heading ? 180 : 120,
      before: options?.heading ? 180 : 0,
      line: 360,
    },
    children: [createTextRun(cleanText(text), { bold: options?.bold, color: options?.color })],
  })
}

function createCellParagraphs(
  text: string,
  options?: {
    bold?: boolean
    align?: (typeof AlignmentType)[keyof typeof AlignmentType]
    color?: string
  }
) {
  const normalized = cleanText(text)
  const lines = normalized ? normalized.split('\n').filter(Boolean) : ['']

  return lines.map((line) => new Paragraph({
    alignment: options?.align,
    spacing: { after: 60, line: 300 },
    children: [createTextRun(line, { bold: options?.bold, color: options?.color })],
  }))
}

// 头像证件照尺寸：2.5cm 宽（94px @96dpi），1 寸照比例 25:35
const AVATAR_WIDTH_PX = 94
const AVATAR_HEIGHT_PX = 132

function detectImageType(bytes: Uint8Array): 'png' | 'jpg' | null {
  if (bytes.length < 4) return null
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg'
  return null
}

async function loadImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return new Uint8Array(await response.arrayBuffer())
  } catch {
    return null
  }
}

/** 取头像字节并构建右浮证件照 ImageRun；任何一步失败（无 URL/加载失败/非图片）都静默跳过 */
async function createAvatarImageRun(url?: string): Promise<ImageRun | null> {
  const trimmed = url?.trim() || ''
  if (!trimmed) return null
  const bytes = await loadImageBytes(trimmed)
  if (!bytes) return null
  const type = detectImageType(bytes)
  if (!type) return null
  return new ImageRun({
    type,
    data: bytes,
    transformation: { width: AVATAR_WIDTH_PX, height: AVATAR_HEIGHT_PX },
    floating: {
      horizontalPosition: {
        relative: HorizontalPositionRelativeFrom.MARGIN,
        align: HorizontalPositionAlign.RIGHT,
      },
      verticalPosition: {
        relative: VerticalPositionRelativeFrom.MARGIN,
        offset: 0,
      },
      wrap: { type: TextWrappingType.SQUARE, side: TextWrappingSide.LEFT },
    },
  })
}

/** 报告页眉：小号灰字居中 + 底部分隔线（页眉文字为空时调用方不注入 header） */
function createDocumentHeader(text: string) {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
        children: [new TextRun({ text, font: FONT_FAMILY, size: 18, color: MUTED_COLOR })],
      }),
    ],
  })
}

function createMetaTable(rows: WordMetaItem[]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((row) => new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          shading: { fill: HEADER_FILL, type: ShadingType.CLEAR },
          borders: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
          children: createCellParagraphs(row.label, { bold: true }),
        }),
        new TableCell({
          width: { size: 72, type: WidthType.PERCENTAGE },
          borders: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
          children: createCellParagraphs(row.value),
        }),
      ],
    })),
  })
}

function createTable(section: WordTableSection) {
  const columnWidths = section.columnWidths && section.columnWidths.length === section.columns.length
    ? section.columnWidths
    : section.columns.map(() => Math.floor(100 / section.columns.length))

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: section.columns.map((column, index) => new TableCell({
          width: { size: columnWidths[index] || 20, type: WidthType.PERCENTAGE },
          shading: { fill: HEADER_FILL, type: ShadingType.CLEAR },
          borders: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
          children: createCellParagraphs(column, { bold: true, align: AlignmentType.CENTER }),
        })),
      }),
      ...section.rows.map((row) => new TableRow({
        children: row.map((cell, index) => new TableCell({
          width: { size: columnWidths[index] || 20, type: WidthType.PERCENTAGE },
          borders: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
          children: createCellParagraphs(cell),
        })),
      })),
    ],
  })
}

export async function exportWordDocument(payload: WordExportPayload): Promise<void> {
  const children: Array<Paragraph | Table> = []
  const headerText = cleanText(payload.headerText || '')
  const avatarRun = await createAvatarImageRun(payload.avatarUrl)

  children.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [
      new TextRun({
        text: cleanText(payload.title),
        bold: true,
        font: FONT_FAMILY,
        size: 34,
        color: TEXT_COLOR,
      }),
      ...(avatarRun ? [avatarRun] : []),
    ],
  }))

  if (payload.subtitle) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({
        text: cleanText(payload.subtitle),
        color: MUTED_COLOR,
        font: FONT_FAMILY,
        size: 20,
      })],
    }))
  }

  if (payload.meta && payload.meta.length > 0) {
    children.push(createParagraph('基本信息', { heading: HeadingLevel.HEADING_1 }))
    children.push(createMetaTable(payload.meta))
  }

  payload.sections.forEach((section) => {
    if (section.heading) {
      children.push(createParagraph(section.heading, { heading: HeadingLevel.HEADING_1 }))
    }

    if (section.type === 'paragraph') {
      section.paragraphs
        .map((paragraph) => cleanText(paragraph))
        .filter(Boolean)
        .forEach((paragraph) => {
          children.push(createParagraph(paragraph))
        })
      return
    }

    if (section.type === 'list') {
      section.items
        .map((item) => cleanText(item))
        .filter(Boolean)
        .forEach((item) => {
          children.push(createParagraph(item, { bullet: true }))
        })
      return
    }

    if (section.type === 'kv-table') {
      children.push(createMetaTable(section.rows))
      return
    }

    children.push(createTable(section))
  })

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            size: 22,
            color: TEXT_COLOR,
          },
          paragraph: {
            spacing: {
              line: 360,
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        // 页眉文字为空不注入 header（不产生空页眉）
        headers: headerText ? { default: createDocumentHeader(headerText) } : undefined,
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const fileName = `${payload.filename}.docx`
  const receiver = getWordExportReceiver()
  if (receiver) {
    await receiver(blob, fileName)
    return
  }
  saveAs(blob, fileName)
}
