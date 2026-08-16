/**
 * md → docx 转换脚本（面向《人工录制执行总纲》与 22 支录制包）
 *
 * 用法：node scripts/manual/md-to-docx.mjs
 * 输入：docs/planning/2026-08-15/16-*.md（23 份）
 * 输出：output/video-recording-packages/*.docx（总纲以 00- 前缀便于排序）
 *
 * 支持：标题、段落、加粗/斜体、行内代码、无序/有序列表、表格（含 <br> 单元格）、引用块。
 * 依赖：docx（^9.5.1）、markdown-it（均为项目既有依赖）。
 */
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx')
const MarkdownIt = require('markdown-it')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const SRC_DIR = path.join(REPO_ROOT, 'docs', 'planning')
const OUT_DIR = path.join(REPO_ROOT, 'output', 'video-recording-packages')

const md = new MarkdownIt({ html: true, breaks: false })

// ---------- 中文字体与样式 ----------
const FONT = { ascii: 'Microsoft YaHei', eastAsia: 'Microsoft YaHei', hAnsi: 'Microsoft YaHei' }
const MONO_FONT = { ascii: 'Consolas', eastAsia: 'Microsoft YaHei', hAnsi: 'Consolas' }

const HEADING_OVERRIDES = [
  { id: 'Heading1', size: 36, before: 320, after: 160, color: '1F3864' },
  { id: 'Heading2', size: 28, before: 280, after: 120, color: '2F5496' },
  { id: 'Heading3', size: 24, before: 200, after: 100, color: '2F5496' },
  { id: 'Heading4', size: 22, before: 160, after: 80, color: '404040' },
]
const headingStyles = HEADING_OVERRIDES.map((h) => ({
  id: h.id,
  name: h.id.replace(/Heading/, 'Heading '),
  basedOn: 'Normal',
  next: 'Normal',
  quickFormat: true,
  run: { font: FONT, size: h.size, bold: true, color: h.color },
  paragraph: { spacing: { before: h.before, after: h.after } },
}))

// ---------- 表格列宽（按列数启发式） ----------
function columnWidths(n) {
  if (n === 5) return [8, 12, 32, 28, 20]
  if (n === 4) return [14, 20, 30, 36]
  if (n === 3) return [25, 35, 40]
  return [20, 80]
}

// ---------- 行内渲染 ----------
function renderInline(tokens, container) {
  const stack = []
  let bold = false
  let italic = false
  let code = false
  for (const tok of tokens) {
    if (tok.type === 'text') {
      pushText(tok.content)
    } else if (tok.type === 'strong_open') {
      bold = true
    } else if (tok.type === 'strong_close') {
      bold = false
    } else if (tok.type === 'em_open') {
      italic = true
    } else if (tok.type === 'em_close') {
      italic = false
    } else if (tok.type === 'code_inline') {
      pushCode(tok.content)
    } else if (tok.type === 'html_inline') {
      if (/<br\s*\/?>/i.test(tok.content)) {
        container.push(new TextRun({ text: '', break: 1 }))
      } else {
        pushText(tok.content.replace(/<[^>]+>/g, ''))
      }
    } else if (tok.type === 'softbreak') {
      container.push(new TextRun({ text: ' ' }))
    } else if (tok.type === 'link_open') {
      stack.push(tok)
    } else if (tok.type === 'link_close') {
      stack.pop()
    }
  }
  function pushText(text) {
    container.push(new TextRun({ text, bold, italics: italic, font: code ? MONO_FONT : FONT, size: 22 }))
  }
  function pushCode(text) {
    container.push(new TextRun({ text, font: MONO_FONT, size: 20, shading: { type: 'clear', fill: 'F2F2F2' } }))
  }
}

function inlineParagraph(tokens, options = {}) {
  const runs = []
  renderInline(tokens, runs)
  return new Paragraph({
    children: runs,
    spacing: { after: options.after ?? 80 },
    indent: options.indent,
    border: options.border,
  })
}

// ---------- 块级渲染 ----------
const TABLE_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '8EA9DB' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '8EA9DB' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '8EA9DB' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '8EA9DB' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'BFCDE4' },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'BFCDE4' },
}

function renderTokens(tokens) {
  const children = []
  let i = 0
  let orderedCounter = 0
  let inQuote = false

  const flushQuote = () => {
    if (inQuote) {
      inQuote = false
    }
  }

  while (i < tokens.length) {
    const tok = tokens[i]

    if (tok.type === 'heading_open') {
      flushQuote()
      const level = Number(tok.tag[1])
      const inline = tokens[i + 1]
      const runs = []
      renderInline(inline.children, runs)
      children.push(new Paragraph({
        heading: HeadingLevel[`HEADING_${level}`],
        children: runs,
        spacing: { after: 120 },
      }))
      i += 2
    } else if (tok.type === 'paragraph_open') {
      const inline = tokens[i + 1]
      const indent = inQuote ? { left: 360 } : undefined
      const border = inQuote ? { left: { style: BorderStyle.SINGLE, size: 12, color: '999999' } } : undefined
      children.push(inlineParagraph(inline.children, { indent, border }))
      i += 2
    } else if (tok.type === 'bullet_list_open') {
      flushQuote()
      i += 1
      while (i < tokens.length && tokens[i].type !== 'bullet_list_close') {
        if (tokens[i].type === 'list_item_open') {
          const inline = tokens[i + 2]
          const runs = []
          renderInline(inline.children, runs)
          children.push(new Paragraph({ children: runs, bullet: { level: 0 }, spacing: { after: 40 } }))
        }
        i += 1
      }
    } else if (tok.type === 'ordered_list_open') {
      flushQuote()
      orderedCounter = 1
      i += 1
      while (i < tokens.length && tokens[i].type !== 'ordered_list_close') {
        if (tokens[i].type === 'list_item_open') {
          const inline = tokens[i + 2]
          const runs = []
          renderInline(inline.children, runs)
          children.push(new Paragraph({
            children: [new TextRun({ text: `${orderedCounter}. `, bold: true, font: FONT, size: 22 }), ...runs],
            indent: { left: 360, hanging: 360 },
            spacing: { after: 40 },
          }))
          orderedCounter += 1
        }
        i += 1
      }
    } else if (tok.type === 'table_open') {
      flushQuote()
      const tableTokens = []
      i += 1
      while (i < tokens.length && tokens[i].type !== 'table_close') {
        tableTokens.push(tokens[i])
        i += 1
      }
      children.push(buildTable(tableTokens))
    } else if (tok.type === 'blockquote_open') {
      inQuote = true
      i += 1
    } else if (tok.type === 'blockquote_close') {
      inQuote = false
      i += 1
    } else if (tok.type === 'hr') {
      children.push(new Paragraph({ children: [], border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999' } }, spacing: { before: 120, after: 120 } }))
      i += 1
    } else if (tok.type === 'fence' || tok.type === 'code_block') {
      children.push(new Paragraph({ children: [new TextRun({ text: tok.content, font: MONO_FONT, size: 20 })], spacing: { after: 80 } }))
      i += 1
    } else {
      i += 1
    }
  }
  flushQuote()
  return children
}

function buildTable(tokens) {
  const rows = []
  let i = 0
  let colCount = 0
  let rowIndex = 0
  while (i < tokens.length) {
    if (tokens[i].type === 'tr_open') {
      const cells = []
      const isHeader = rowIndex === 0
      i += 1
      while (i < tokens.length && tokens[i].type !== 'tr_close') {
        if (tokens[i].type === 'th_open' || tokens[i].type === 'td_open') {
          const inline = tokens[i + 1]
          const runs = []
          renderInline(inline.children, runs)
          const cellParagraph = new Paragraph({
            children: runs,
            spacing: { after: 0, line: 276 },
            ...(isHeader ? {} : {}),
          })
          cells.push(new TableCell({
            children: [cellParagraph],
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            shading: isHeader ? { type: 'clear', fill: 'D9E2F3' } : undefined,
          }))
          i += 2
        } else {
          i += 1
        }
      }
      colCount = Math.max(colCount, cells.length)
      rows.push(new TableRow({ tableHeader: isHeader, children: cells }))
      rowIndex += 1
    } else {
      i += 1
    }
  }
  const widths = columnWidths(colCount)
  rows.forEach((row, ri) => {
    row.cells.forEach((cell, ci) => {
      cell.options.width = { size: widths[ci] ?? widths[widths.length - 1], type: WidthType.PERCENTAGE }
    })
  })
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDER,
    rows,
  })
}

// ---------- 主流程 ----------
async function convertFile(srcFile, outFile) {
  const source = fs.readFileSync(srcFile, 'utf8')
  const tokens = md.parse(source, {})
  const children = renderTokens(tokens)
  const doc = new Document({
    title: path.basename(srcFile).replace(/\.md$/, ''),
    styles: { default: { document: { run: { font: FONT, size: 22 } } }, paragraphStyles: headingStyles },
    sections: [{ properties: {}, children }],
  })
  const buffer = await Packer.toBuffer(doc)
  fs.writeFileSync(outFile, buffer)
  return buffer.length
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const files = fs.readdirSync(SRC_DIR)
    .filter((f) => f.endsWith('.md') && (f.includes('录制包') || f.includes('人工录制执行总纲')))
    .sort()
  const results = []
  for (const f of files) {
    const outName = f.includes('人工录制执行总纲') ? '00-人工录制执行总纲.docx' : f.replace(/\.md$/, '.docx')
    const src = path.join(SRC_DIR, f)
    const out = path.join(OUT_DIR, outName)
    const bytes = await convertFile(src, out)
    results.push(`${outName}  ${(bytes / 1024).toFixed(0)} KB`)
  }
  fs.writeFileSync(
    path.join(OUT_DIR, 'README.txt'),
    [
      'SCGP 人工录制包 Word 版（由 docs/planning 下 Markdown 转换生成，生成脚本 scripts/manual/md-to-docx.mjs）',
      '',
      '阅读顺序：',
      '1. 00-人工录制执行总纲.docx（环境准备、批次顺序、SOP、返工自查）',
      '2. 按总纲 §2 批次顺序阅读对应录制包（第 1 支 → 第 22 支）',
      '',
      '每份录制包结构：1 范围 / 2 前置条件（2.1 录制效率提示）/ 3 画面规则 / 4 分镜稿 / 5 执行清单 / 6 门禁 / 7 验收标准 / 8 实现依据',
      '',
      '注意：若 Markdown 源更新，请重新运行 node scripts/manual/md-to-docx.mjs 重新生成。',
      '',
    ].join('\r\n'),
    'utf8'
  )
  console.log(`已生成 ${results.length} 份 Word 文档到 ${path.relative(REPO_ROOT, OUT_DIR)}/`)
  for (const r of results) console.log('  ' + r)
}

main().catch((err) => {
  console.error('转换失败:', err)
  process.exit(1)
})
