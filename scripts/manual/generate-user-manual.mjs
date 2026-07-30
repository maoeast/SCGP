/**
 * Generate the current SCGP user manual from its Markdown source.
 *
 * Source: docs/user-manual/SCGP-星愿能力发展平台用户使用手册.md
 * Output: docs/user-manual/SCGP-星愿能力发展平台用户使用手册.docx
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
  LevelFormat,
  LineRuleType,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  SectionType,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip,
} from 'docx'
import { hashFile, loadScreenshotApprovals } from './user-manual-screenshot-approvals.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..')
const manualDir = path.join(repoRoot, 'docs', 'user-manual')
const sourcePath = path.join(manualDir, 'SCGP-星愿能力发展平台用户使用手册.md')
const outputPath = path.join(manualDir, 'SCGP-星愿能力发展平台用户使用手册.docx')
const approvalIndexPath = path.join(manualDir, 'screenshot-approvals.json')
const coverAssetsDir = path.join(manualDir, 'cover-assets')
const coverAssets = {
  top: path.join(coverAssetsDir, 'enterprise-cover-top.png'),
  bottom: path.join(coverAssetsDir, 'enterprise-cover-bottom.png'),
}

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
const CONTENT_WIDTH = 9600
const COLORS = {
  ink: '17323D',
  body: '344B55',
  muted: '667B84',
  teal: '258D81',
  blue: '2F78A8',
  gold: 'B88619',
  coral: 'B6604C',
  line: 'D7E1E4',
  paleTeal: 'E8F5F1',
  paleBlue: 'E9F2FB',
  paleGold: 'FFF4D6',
  paleCoral: 'FBE9E5',
  paleGray: 'F4F7F7',
  white: 'FFFFFF',
}

const thinBorder = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: COLORS.line,
}

function textRun(text, options = {}) {
  return new TextRun({
    text,
    font: options.code ? MONO_FONT : FONT,
    size: options.size ?? 21,
    color: options.color ?? COLORS.body,
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
      runs.push(textRun(token.slice(1, -1), { ...options, code: true, color: COLORS.ink }))
    }
    cursor = index + token.length
  }
  if (cursor < normalized.length) {
    runs.push(textRun(normalized.slice(cursor), options))
  }
  return runs.length > 0 ? runs : [textRun('', options)]
}

function paragraph(text, options = {}) {
  return new Paragraph({
    children: parseInline(text, options),
    alignment: options.alignment,
    spacing: options.spacing ?? { after: 150, line: 330, lineRule: LineRuleType.AUTO },
    indent: options.indent,
    keepNext: options.keepNext,
    keepLines: options.keepLines,
  })
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] })
}

function coverImage(assetPath, width, height, description) {
  if (!fs.existsSync(assetPath)) throw new Error(`Cover asset is missing: ${assetPath}`)
  return new ImageRun({
    type: 'png',
    data: fs.readFileSync(assetPath),
    transformation: { width, height },
    altText: {
      title: '企业文档封面装饰',
      description,
      name: path.basename(assetPath),
    },
  })
}

function heading(text, level) {
  return new Paragraph({
    text,
    heading: level,
  })
}

function calloutBox(label, body) {
  const isFigure = /^图\s+S\d+/u.test(label)
  const isWarning = /重要|警告|过渡态/u.test(label)
  const fill = isFigure ? COLORS.paleBlue : isWarning ? COLORS.paleCoral : COLORS.paleGold
  const accent = isFigure ? COLORS.blue : isWarning ? COLORS.coral : COLORS.gold
  const cell = new TableCell({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill, color: 'auto' },
    margins: { top: 140, bottom: 140, left: 180, right: 180 },
    borders: {
      top: thinBorder,
      bottom: thinBorder,
      right: thinBorder,
      left: { style: BorderStyle.SINGLE, size: 16, color: accent },
    },
    children: [
      new Paragraph({
        children: [
          textRun(`${label}：`, { bold: true, color: accent }),
          ...parseInline(body),
        ],
        spacing: { after: 0, line: 310, lineRule: LineRuleType.AUTO },
      }),
    ],
  })
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    layout: TableLayoutType.FIXED,
    rows: [new TableRow({ cantSplit: true, children: [cell] })],
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  })
}

function parseCallout(line) {
  const match = line.match(/^>\s*\[([^\]]+)\]\s*(.*)$/u)
  if (match) {
    return calloutBox(match[1].trim(), match[2].trim())
  }
  return calloutBox('提示', line.replace(/^>\s*/u, '').trim())
}

function approvedScreenshotBlock(entry, label, body, screenshotDir) {
  const imagePath = path.join(screenshotDir, `${entry.id}.png`)
  if (!fs.existsSync(imagePath)) throw new Error(`Approved screenshot is not promoted: ${entry.id}`)
  if (hashFile(imagePath) !== entry.sha256) throw new Error(`Promoted screenshot hash mismatch: ${entry.id}`)
  const data = fs.readFileSync(imagePath)
  const width = data.readUInt32BE(16)
  const height = data.readUInt32BE(20)
  const scale = Math.min(640 / width, 430 / height, 1)
  const image = new ImageRun({
    type: 'png',
    data,
    transformation: { width: Math.round(width * scale), height: Math.round(height * scale) },
    altText: { title: label, description: body, name: `${entry.id}.png` },
  })
  return [
    new Paragraph({ children: [image], alignment: AlignmentType.CENTER, spacing: { before: 80, after: 60 }, keepLines: true }),
    new Paragraph({ children: [textRun(`${label}：${body}`, { size: 18, color: COLORS.muted, italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 180 }, keepNext: true }),
  ]
}

function getColumnWidths(headers) {
  const joined = headers.join('|')
  if (headers.length === 2) return [2400, 7200]
  if (headers.length === 3) return [2000, 3600, 4000]
  if (headers.length === 4 && joined.includes('功能域')) return [1800, 1600, 2100, 4100]
  if (headers.length === 4) return [2100, 1700, 2200, 3600]
  if (headers.length === 5) return [2550, 1650, 1350, 1350, 2700]
  if (headers.length === 6) return [700, 700, 2550, 900, 3450, 1300]
  const width = Math.floor(CONTENT_WIDTH / headers.length)
  return headers.map((_, index) => index === headers.length - 1
    ? CONTENT_WIDTH - width * (headers.length - 1)
    : width)
}

function cellParagraphs(value, options = {}) {
  return String(value)
    .split(/<br\s*\/?>/iu)
    .map((part) => new Paragraph({
      children: parseInline(part.trim(), {
        size: options.header ? 18 : 17,
        color: options.header ? COLORS.ink : COLORS.body,
        bold: options.header,
      }),
      alignment: options.header ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 0, line: 270, lineRule: LineRuleType.AUTO },
    }))
}

function markdownTable(headers, rows) {
  const columnWidths = getColumnWidths(headers)
  const allRows = [headers, ...rows].map((row, rowIndex) => new TableRow({
    tableHeader: rowIndex === 0,
    cantSplit: true,
    children: headers.map((_, columnIndex) => new TableCell({
      width: { size: columnWidths[columnIndex], type: WidthType.DXA },
      shading: {
        type: ShadingType.CLEAR,
        fill: rowIndex === 0 ? COLORS.paleTeal : rowIndex % 2 === 0 ? COLORS.paleGray : COLORS.white,
        color: 'auto',
      },
      margins: { top: 105, bottom: 105, left: 105, right: 105 },
      borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
      children: cellParagraphs(row[columnIndex] ?? '', { header: rowIndex === 0 }),
    })),
  }))

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths,
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
    .map((cell) => cell.trim())
}

function imageBlock(alt, relativePath) {
  const svgPath = path.resolve(manualDir, relativePath)
  const pngPath = svgPath.replace(/\.svg$/iu, '.png')
  if (!fs.existsSync(svgPath) || !fs.existsSync(pngPath)) {
    return calloutBox('图像缺失', `${alt}（${relativePath}）`)
  }

  const image = new ImageRun({
    type: 'svg',
    data: fs.readFileSync(svgPath),
    transformation: { width: 640, height: 384 },
    fallback: {
      type: 'png',
      data: fs.readFileSync(pngPath),
      transformation: { width: 640, height: 384 },
    },
    altText: {
      title: alt,
      description: alt,
      name: path.basename(relativePath),
    },
  })

  return [
    new Paragraph({
      children: [image],
      alignment: AlignmentType.CENTER,
      spacing: { before: 140, after: 70 },
      keepLines: true,
    }),
    new Paragraph({
      children: [textRun(alt, { size: 18, color: COLORS.muted, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      keepNext: true,
    }),
  ]
}

function parseMarkdownBody(markdown, approvedScreenshots, screenshotDir) {
  const lines = markdown.replace(/\r\n/gu, '\n').split('\n')
  const firstChapter = lines.findIndex((line) => /^#\s+1\./u.test(line.trim()))
  if (firstChapter < 0) throw new Error('Manual source does not contain chapter 1')

  const elements = []
  let index = firstChapter
  let listInstance = 0
  let previousListType = null

  while (index < lines.length) {
    const raw = lines[index]
    const line = raw.trim()

    if (!line) {
      previousListType = null
      index += 1
      continue
    }

    if (line === '<!-- pagebreak -->') {
      elements.push(pageBreak())
      previousListType = null
      index += 1
      continue
    }

    const imageMatch = line.match(/^!\[([^\]]+)\]\(([^)]+)\)$/u)
    if (imageMatch) {
      elements.push(...imageBlock(imageMatch[1].trim(), imageMatch[2].trim()))
      previousListType = null
      index += 1
      continue
    }

    if (line.startsWith('|')) {
      const rows = []
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        rows.push(parseTableRow(lines[index]))
        index += 1
      }
      const headers = rows[0]
      const bodyRows = rows.slice(1).filter((row) => !row.every((cell) => /^:?-{3,}:?$/u.test(cell)))
      elements.push(markdownTable(headers, bodyRows))
      elements.push(new Paragraph({ spacing: { after: 120 } }))
      previousListType = null
      continue
    }

    if (line.startsWith('# ')) {
      elements.push(heading(line.slice(2).trim(), HeadingLevel.HEADING_1))
      previousListType = null
      index += 1
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(heading(line.slice(3).trim(), HeadingLevel.HEADING_2))
      previousListType = null
      index += 1
      continue
    }
    if (line.startsWith('### ')) {
      elements.push(heading(line.slice(4).trim(), HeadingLevel.HEADING_3))
      previousListType = null
      index += 1
      continue
    }

    if (line.startsWith('>')) {
      const calloutMatch = line.match(/^>\s*\[(图 (S\d{3}))\]\s*(.*)$/u)
      const approval = calloutMatch ? approvedScreenshots.get(calloutMatch[2]) : undefined
      if (calloutMatch && approval) {
        elements.push(...approvedScreenshotBlock(approval, calloutMatch[1], calloutMatch[3].trim(), screenshotDir))
      } else {
        elements.push(parseCallout(line))
      }
      elements.push(new Paragraph({ spacing: { after: 110 } }))
      previousListType = null
      index += 1
      continue
    }

    if (/^[-*]\s+/u.test(line)) {
      elements.push(new Paragraph({
        children: parseInline(line.replace(/^[-*]\s+/u, '')),
        numbering: { reference: 'manual-bullets', level: 0 },
        spacing: { after: 70, line: 310, lineRule: LineRuleType.AUTO },
      }))
      previousListType = 'bullet'
      index += 1
      continue
    }

    if (/^\d+\.\s+/u.test(line)) {
      if (previousListType !== 'number') listInstance += 1
      elements.push(new Paragraph({
        children: parseInline(line.replace(/^\d+\.\s+/u, '')),
        numbering: { reference: 'manual-numbering', level: 0, instance: listInstance },
        spacing: { after: 70, line: 310, lineRule: LineRuleType.AUTO },
      }))
      previousListType = 'number'
      index += 1
      continue
    }

    if (/^\*\*适用角色：/u.test(line)) {
      elements.push(new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [CONTENT_WIDTH],
        layout: TableLayoutType.FIXED,
        rows: [new TableRow({
          cantSplit: true,
          children: [new TableCell({
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: COLORS.paleTeal, color: 'auto' },
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
            children: [new Paragraph({
              children: parseInline(line, { color: COLORS.teal }),
              spacing: { after: 0 },
              keepNext: true,
            })],
          })],
        })],
      }))
      elements.push(new Paragraph({ spacing: { after: 90 } }))
      previousListType = null
      index += 1
      continue
    }

    elements.push(paragraph(line))
    previousListType = null
    index += 1
  }

  return elements
}

function parseArgs(argv) {
  const options = { includeApprovedScreenshots: false, screenshotDir: path.join(manualDir, 'screenshots'), output: outputPath }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--include-approved-screenshots') options.includeApprovedScreenshots = true
    else if (value === '--screenshot-dir') options.screenshotDir = path.resolve(repoRoot, argv[++index] || '')
    else if (value === '--output') options.output = path.resolve(repoRoot, argv[++index] || '')
    else throw new Error(`Unknown argument: ${value}`)
  }
  return options
}

function coverChildren() {
  return [
    new Paragraph({
      children: [coverImage(coverAssets.top, 370, 206, '企业文档模板黄绿色顶部装饰')],
      alignment: AlignmentType.RIGHT,
      spacing: { before: 20, after: 120 },
    }),
    new Paragraph({
      children: [textRun('SCGP / 星愿能力发展平台', { size: 30, bold: true, color: COLORS.teal })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
    }),
    new Paragraph({
      children: [textRun('用户使用手册', { size: 58, bold: true, color: COLORS.ink })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 150 },
    }),
    new Paragraph({
      children: [textRun('教师与管理员合订本', { size: 24, color: COLORS.blue })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 340 },
    }),
    new Table({
      width: { size: 6600, type: WidthType.DXA },
      columnWidths: [6600],
      layout: TableLayoutType.FIXED,
      alignment: AlignmentType.CENTER,
      rows: [new TableRow({
        children: [new TableCell({
          width: { size: 6600, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: COLORS.paleTeal, color: 'auto' },
          borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
          margins: { top: 220, bottom: 220, left: 260, right: 260 },
          children: [
            paragraph('文档版本：1.2', { alignment: AlignmentType.CENTER, spacing: { after: 70 } }),
            paragraph('适用软件基线：SCGP 1.0.7', { alignment: AlignmentType.CENTER, spacing: { after: 70 } }),
            paragraph('编写日期：2026-07-30', { alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
          ],
        })],
      })],
    }),
    new Paragraph({
      children: [coverImage(coverAssets.bottom, 620, 274, '企业文档模板绿色底部装饰')],
      alignment: AlignmentType.CENTER,
      spacing: { before: 260, after: 0 },
    }),
  ]
}

function backCoverChildren() {
  return [
    new Paragraph({
      children: [coverImage(coverAssets.top, 340, 189, '企业文档模板黄绿色顶部装饰')],
      alignment: AlignmentType.LEFT,
      spacing: { before: 20, after: 300 },
    }),
    new Paragraph({
      children: [textRun('SCGP / 星愿能力发展平台', { size: 30, bold: true, color: COLORS.teal })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [textRun('用户使用手册', { size: 28, bold: true, color: COLORS.ink })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [textRun('本手册由杭州炫灿科技有限公司编制', { size: 20, color: COLORS.muted })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 70 },
    }),
    new Paragraph({
      children: [textRun('以当前代码、生产路由和有效文档为准', { size: 18, color: COLORS.muted })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
    }),
    new Paragraph({
      children: [coverImage(coverAssets.bottom, 620, 274, '企业文档模板绿色底部装饰')],
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 0 },
    }),
  ]
}

function frontMatterChildren() {
  return [
    new Paragraph({
      children: [textRun('目录', { size: 38, bold: true, color: COLORS.ink })],
      spacing: { before: 80, after: 240 },
    }),
    new TableOfContents('SCGP 用户使用手册目录', {
      hyperlink: true,
      headingStyleRange: '1-3',
    }),
    new Paragraph({ spacing: { before: 240 } }),
    calloutBox('目录提示', 'Word 首次打开时会自动更新目录域；如页码未刷新，可在目录上右键选择“更新域”。'),
    pageBreak(),
  ]
}

function createDocument(bodyChildren) {
  return new Document({
    creator: 'SCGP Documentation',
    title: 'SCGP / 星愿能力发展平台用户使用手册',
    description: '教师与管理员合订本，依据当前代码、路由与有效文档编制。',
    keywords: 'SCGP, 星愿能力发展平台, 用户手册, 教师, 管理员',
    features: { updateFields: true },
    numbering: {
      config: [
        {
          reference: 'manual-bullets',
          levels: [{
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 520, hanging: 260 } } },
          }],
        },
        {
          reference: 'manual-numbering',
          levels: [{
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 560, hanging: 300 } } },
          }],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 21, color: COLORS.body },
          paragraph: { spacing: { after: 150, line: 330, lineRule: LineRuleType.AUTO } },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font: FONT, size: 32, bold: true, color: COLORS.ink },
          paragraph: {
            pageBreakBefore: true,
            keepNext: true,
            spacing: { before: 0, after: 220 },
            outlineLevel: 0,
          },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font: FONT, size: 26, bold: true, color: COLORS.teal },
          paragraph: { keepNext: true, spacing: { before: 300, after: 150 }, outlineLevel: 1 },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font: FONT, size: 22, bold: true, color: COLORS.blue },
          paragraph: { keepNext: true, spacing: { before: 220, after: 110 }, outlineLevel: 2 },
        },
      ],
    },
    sections: [
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            margin: {
              top: convertInchesToTwip(0.7),
              bottom: convertInchesToTwip(0.7),
              left: convertInchesToTwip(0.8),
              right: convertInchesToTwip(0.8),
            },
          },
          titlePage: true,
        },
        children: coverChildren(),
      },
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.72),
              bottom: convertInchesToTwip(0.72),
              left: convertInchesToTwip(0.8),
              right: convertInchesToTwip(0.8),
              header: convertInchesToTwip(0.3),
              footer: convertInchesToTwip(0.35),
            },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              children: [textRun('SCGP / 星愿能力发展平台用户使用手册', { size: 16, color: COLORS.muted })],
              alignment: AlignmentType.RIGHT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.line } },
              spacing: { after: 70 },
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              children: [
                textRun('教师与管理员合订本  |  第 ', { size: 16, color: COLORS.muted }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: COLORS.muted }),
                textRun(' 页', { size: 16, color: COLORS.muted }),
              ],
              alignment: AlignmentType.CENTER,
            })],
          }),
        },
        children: [...frontMatterChildren(), ...bodyChildren],
      },
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            margin: {
              top: convertInchesToTwip(0.5),
              bottom: convertInchesToTwip(0.5),
              left: convertInchesToTwip(0.55),
              right: convertInchesToTwip(0.55),
            },
          },
          titlePage: true,
        },
        children: backCoverChildren(),
      },
    ],
  })
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!fs.existsSync(sourcePath)) throw new Error(`Manual source not found: ${sourcePath}`)
  const markdown = fs.readFileSync(sourcePath, 'utf8')
  const approvedScreenshots = options.includeApprovedScreenshots
    ? new Map(loadScreenshotApprovals(repoRoot, approvalIndexPath).map((entry) => [entry.id, entry]))
    : new Map()
  const bodyChildren = parseMarkdownBody(markdown, approvedScreenshots, options.screenshotDir)
  const document = createDocument(bodyChildren)
  const buffer = await Packer.toBuffer(document)
  fs.mkdirSync(path.dirname(options.output), { recursive: true })
  fs.writeFileSync(options.output, buffer)
  console.log(`Generated ${options.output}`)
  console.log(`Elements: ${bodyChildren.length}; size: ${(buffer.length / 1024).toFixed(1)} KiB`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
