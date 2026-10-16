/**
 * Generate Word (.docx) documents for SCGP Bidding Specifications.
 *
 * Inputs:
 * - docs/bidding/SCGP-星愿能力发展平台-投标技术参数与规格说明书(特教学校版).md
 * - docs/bidding/SCGP-星愿能力发展平台-投标技术规格偏离表.md
 *
 * Outputs:
 * - docs/bidding/SCGP-星愿能力发展平台-投标技术参数与规格说明书(特教学校版).docx
 * - docs/bidding/SCGP-星愿能力发展平台-投标技术规格偏离表.docx
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LineRuleType,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const biddingDir = path.join(repoRoot, 'docs', 'bidding')

const FONT = {
  ascii: 'Arial',
  hAnsi: 'Arial',
  eastAsia: 'Microsoft YaHei',
  cs: 'Arial',
}

const MONO_FONT = {
  ascii: 'Consolas',
  hAnsi: 'Consolas',
  eastAsia: 'Microsoft YaHei',
  cs: 'Consolas',
}

const CONTENT_WIDTH = 9600 // twips (~ 6.67 inches on A4)

const COLORS = {
  primary: '1F4E79', // Navy
  primaryDark: '143654',
  text: '262626',
  muted: '595959',
  border: 'D9D9D9',
  tableHeaderBg: 'EAF2F8', // Light navy tint
  tableAltBg: 'F9FAFB',
  white: 'FFFFFF',
  starColor: 'C00000', // Red for ★
  triangleColor: 'ED7D31', // Orange for ▲
  calloutBg: 'F2F4F7',
}

const thinBorder = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: COLORS.border,
}

function textRun(text, options = {}) {
  let color = options.color ?? COLORS.text
  if (text.includes('★')) {
    color = COLORS.starColor
  } else if (text.includes('▲')) {
    color = COLORS.triangleColor
  }

  return new TextRun({
    text,
    font: options.code ? MONO_FONT : FONT,
    size: options.size ?? 21, // 10.5pt
    color,
    bold: options.bold,
    italics: options.italics,
    underline: options.underline,
  })
}

function parseInline(text, options = {}) {
  const normalized = text.replace(/\s{2,}$/u, '')
  const runs = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/gu
  let cursor = 0
  for (const match of normalized.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > cursor) {
      runs.push(textRun(normalized.slice(cursor, index), options))
    }
    const token = match[0]
    if (token.startsWith('**')) {
      runs.push(textRun(token.slice(2, -2), { ...options, bold: true }))
    } else {
      runs.push(textRun(token.slice(1, -1), { ...options, code: true, color: COLORS.primaryDark }))
    }
    cursor = index + token.length
  }
  if (cursor < normalized.length) {
    runs.push(textRun(normalized.slice(cursor), options))
  }
  return runs.length > 0 ? runs : [textRun('', options)]
}

function getColumnWidths(headers) {
  const len = headers.length
  const joined = headers.join('|')

  if (len === 2) {
    return [3800, 5800]
  }
  if (len === 3) {
    return [2400, 2400, 4800]
  }
  if (len === 4) {
    return [700, 1800, 4700, 2400]
  }
  if (len === 5) {
    if (joined.includes('指标名称')) {
      return [700, 1700, 4700, 900, 1600]
    }
    if (joined.includes('招标文件核心条款要求')) {
      return [700, 2500, 3800, 1000, 1600]
    }
    return [800, 2000, 4200, 1000, 1600]
  }
  if (len === 6) {
    return [600, 1800, 800, 2600, 2800, 1000]
  }

  const width = Math.floor(CONTENT_WIDTH / len)
  return headers.map((_, i) => (i === len - 1 ? CONTENT_WIDTH - width * (len - 1) : width))
}

function cellParagraphs(value, options = {}) {
  return String(value)
    .split(/<br\s*\/?>/iu)
    .map((part) => {
      const trimmed = part.trim()
      let alignment = options.header ? AlignmentType.CENTER : AlignmentType.LEFT
      if (trimmed === '★' || trimmed === '▲' || trimmed === '通用' || trimmed === '无偏离' || trimmed === '正偏离' || trimmed === '完全满足') {
        alignment = AlignmentType.CENTER
      }

      return new Paragraph({
        children: parseInline(trimmed, {
          size: options.header ? 19 : 17, // ~9-9.5pt in tables
          color: options.header ? COLORS.primaryDark : COLORS.text,
          bold: options.header,
        }),
        alignment,
        spacing: { after: 40, before: 40, line: 260, lineRule: LineRuleType.AUTO },
      })
    })
}

function renderTable(headers, rows) {
  const colWidths = getColumnWidths(headers)

  const allRows = [headers, ...rows].map((row, rowIndex) => {
    return new TableRow({
      tableHeader: rowIndex === 0,
      cantSplit: true,
      children: headers.map((_, colIndex) => {
        const isHeader = rowIndex === 0
        const isEven = rowIndex % 2 === 0
        const fill = isHeader ? COLORS.tableHeaderBg : isEven ? COLORS.tableAltBg : COLORS.white

        return new TableCell({
          width: { size: colWidths[colIndex], type: WidthType.DXA },
          shading: {
            type: ShadingType.CLEAR,
            fill,
            color: 'auto',
          },
          margins: { top: 90, bottom: 90, left: 110, right: 110 },
          borders: {
            top: isHeader ? { style: BorderStyle.SINGLE, size: 8, color: COLORS.primary } : thinBorder,
            bottom: isHeader ? { style: BorderStyle.SINGLE, size: 8, color: COLORS.primary } : thinBorder,
            left: thinBorder,
            right: thinBorder,
          },
          children: cellParagraphs(row[colIndex] ?? '', { header: isHeader }),
        })
      }),
    })
  })

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colWidths,
    layout: TableLayoutType.FIXED,
    rows: allRows,
  })
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/u, '')
    .replace(/\|$/u, '')
    .split('|')
    .map((c) => c.trim())
}

function renderCallout(text) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: COLORS.calloutBg, color: 'auto' },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            borders: {
              top: thinBorder,
              bottom: thinBorder,
              right: thinBorder,
              left: { style: BorderStyle.SINGLE, size: 16, color: COLORS.primary },
            },
            children: [
              new Paragraph({
                children: parseInline(text, { size: 19, color: COLORS.muted }),
                spacing: { after: 0, line: 300, lineRule: LineRuleType.AUTO },
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

export async function convertMarkdownToDocx(mdPath, docxPath, docTitle) {
  const content = fs.readFileSync(mdPath, 'utf8')
  const lines = content.split(/\r?\n/u)

  const elements = []
  let tableHeaders = null
  let tableRows = []
  let inTable = false
  let inCodeBlock = false

  function flushTable() {
    if (inTable && tableHeaders) {
      elements.push(renderTable(tableHeaders, tableRows))
      elements.push(new Paragraph({ spacing: { after: 120 } }))
      tableHeaders = null
      tableRows = []
      inTable = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    // Handle code blocks
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) {
      continue
    }

    // Handle table
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = parseTableRow(trimmed)
      // Check if separator line
      if (cells.every((c) => /^:?-+:?$/u.test(c))) {
        continue
      }
      if (!inTable) {
        inTable = true
        tableHeaders = cells
        tableRows = []
      } else {
        tableRows.push(cells)
      }
      continue
    } else {
      flushTable()
    }

    if (!trimmed) {
      continue
    }

    // Markdown Image: ![alt](path)
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/u)
    if (imgMatch) {
      const alt = imgMatch[1].trim()
      const rawPath = imgMatch[2].trim()
      const imgFullPath = path.resolve(path.dirname(mdPath), rawPath)
      if (fs.existsSync(imgFullPath)) {
        const data = fs.readFileSync(imgFullPath)
        let width = 1240
        let height = 880
        if (data.length > 24 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
          width = data.readUInt32BE(16)
          height = data.readUInt32BE(20)
        }
        const targetWidth = 450 // pt, fits perfectly within A4 margins (451 pt max)
        const targetHeight = Math.round(targetWidth * (height / width))
        const image = new ImageRun({
          type: 'png',
          data,
          transformation: { width: targetWidth, height: targetHeight },
          altText: { title: alt, description: alt, name: path.basename(imgFullPath) },
        })

        elements.push(
          new Paragraph({
            children: [image],
            alignment: AlignmentType.CENTER,
            spacing: { before: 140, after: 60 },
            keepLines: true,
          })
        )

        if (alt) {
          elements.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: alt,
                  font: FONT,
                  size: 18, // 9pt
                  color: COLORS.muted,
                  italics: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 180 },
              keepNext: true,
            })
          )
        }
        continue
      }
    }

    // Horizontal Rule
    if (trimmed === '---') {
      elements.push(
        new Paragraph({
          spacing: { before: 100, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border } },
        })
      )
      continue
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const body = trimmed.replace(/^>\s*/u, '')
      elements.push(renderCallout(body))
      elements.push(new Paragraph({ spacing: { after: 80 } }))
      continue
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.slice(2), font: FONT, size: 36, bold: true, color: COLORS.primary })],
          spacing: { before: 300, after: 180 },
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        })
      )
      continue
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.slice(3), font: FONT, size: 28, bold: true, color: COLORS.primary })],
          spacing: { before: 280, after: 140 },
          heading: HeadingLevel.HEADING_1,
        })
      )
      continue
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.slice(4), font: FONT, size: 24, bold: true, color: COLORS.primaryDark })],
          spacing: { before: 220, after: 100 },
          heading: HeadingLevel.HEADING_2,
        })
      )
      continue
    }

    if (trimmed.startsWith('#### ')) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.slice(5), font: FONT, size: 22, bold: true, color: COLORS.text })],
          spacing: { before: 160, after: 80 },
          heading: HeadingLevel.HEADING_3,
        })
      )
      continue
    }

    // Normal paragraph or list
    const isList = /^[*-]\s+/u.test(trimmed) || /^\d+\.\s+/u.test(trimmed)
    const lineText = isList ? trimmed : trimmed

    elements.push(
      new Paragraph({
        children: parseInline(lineText, { size: 21, color: COLORS.text }),
        spacing: { before: 40, after: 80, line: 320, lineRule: LineRuleType.AUTO },
        indent: isList ? { left: 360 } : undefined,
      })
    )
  }

  flushTable()

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: 21,
            color: COLORS.text,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `SCGP 星愿能力发展平台 | ${docTitle}`,
                    font: FONT,
                    size: 17,
                    color: COLORS.muted,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
                spacing: { after: 120 },
                border: {
                  bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
                },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: '第 ', font: FONT, size: 17, color: COLORS.muted }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 17, color: COLORS.muted }),
                  new TextRun({ text: ' 页，共 ', font: FONT, size: 17, color: COLORS.muted }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 17, color: COLORS.muted }),
                  new TextRun({ text: ' 页', font: FONT, size: 17, color: COLORS.muted }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 120 },
              }),
            ],
          }),
        },
        children: elements,
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  try {
    fs.writeFileSync(docxPath, buffer)
    console.log(`Successfully generated: ${docxPath} (${buffer.length} bytes)`)
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.warn(`[WARN] File is locked by another program (Word/WPS): ${docxPath}. Please close it to overwrite.`)
    } else {
      throw err
    }
  }
}

async function run() {
  const file1Md = path.join(biddingDir, 'SCGP-星愿能力发展平台-投标技术参数与规格说明书(特教学校版).md')
  const file1Docx = path.join(biddingDir, 'SCGP-星愿能力发展平台-投标技术参数与规格说明书(特教学校版).docx')
  await convertMarkdownToDocx(file1Md, file1Docx, '投标技术参数与规格说明书（特教学校版）')

  const file2Md = path.join(biddingDir, 'SCGP-星愿能力发展平台-投标技术规格偏离表.md')
  const file2Docx = path.join(biddingDir, 'SCGP-星愿能力发展平台-投标技术规格偏离表.docx')
  await convertMarkdownToDocx(file2Md, file2Docx, '投标技术规格偏离表')

  const file3Md = path.join(biddingDir, 'SCGP-星愿能力发展平台-产品功能参数与采购选型说明书(教学实用版).md')
  const file3Docx = path.join(biddingDir, 'SCGP-星愿能力发展平台-产品功能参数与采购选型说明书(教学实用版).docx')
  await convertMarkdownToDocx(file3Md, file3Docx, '产品功能参数与采购选型说明书（教学实用版）')

  const file4Md = path.join(biddingDir, 'SCGP-星愿能力发展平台-设备分项投标技术参数(精炼条款版).md')
  const file4Docx = path.join(biddingDir, 'SCGP-星愿能力发展平台-设备分项投标技术参数(精炼条款版).docx')
  await convertMarkdownToDocx(file4Md, file4Docx, '设备分项投标技术参数（精炼条款版）')

  const file5Md = path.join(biddingDir, 'SCGP-星愿能力发展平台-设备分项详细技术规范(无表格版).md')
  const file5Docx = path.join(biddingDir, 'SCGP-星愿能力发展平台-设备分项详细技术规范(无表格版).docx')
  await convertMarkdownToDocx(file5Md, file5Docx, '设备分项详细技术规范（无表格版）')
}

run().catch((err) => {
  console.error('Failed to generate bidding docx files:', err)
  process.exit(1)
})
