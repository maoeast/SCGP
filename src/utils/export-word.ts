import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
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

function cleanText(text: string | undefined): string {
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

  children.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new TextRun({
      text: cleanText(payload.title),
      bold: true,
      font: FONT_FAMILY,
      size: 34,
      color: TEXT_COLOR,
    })],
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
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${payload.filename}.docx`)
}
