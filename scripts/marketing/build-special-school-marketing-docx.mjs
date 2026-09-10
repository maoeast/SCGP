/**
 * 特校营销文案全集 → 5 份 DOCX（复用 generate-user-manual 同款 docx 库与样式基调）
 *
 * 源：docs/marketing/2026-09-10-scgp-special-school-marketing.md
 * 切分：按一级标题（# 第X部分 / # SCGP 星愿…）切成 5 份；末尾「事实校对说明」不单独出 docx（内部用）。
 * 输出：output/scgp-marketing-docx-20260910/
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle,
} = require('docx')

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..')
const srcPath = path.join(repoRoot, 'docs', 'marketing', '2026-09-10-scgp-special-school-marketing.md')
const outDir = path.join(repoRoot, 'output', 'scgp-marketing-docx-20260910')

const CJK_FONT = '微软雅黑'

function textRun(text, { bold = false } = {}) {
  return new TextRun({ text, bold, font: { ascii: 'Calibri', eastAsia: CJK_FONT }, size: 22 })
}

function addRich(children, text) {
  for (const part of text.split(/(\*\*.+?\*\*)/)) {
    if (!part) continue
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      children.push(new Paragraph({ children: [textRun(part.slice(2, -2), { bold: true })] }))
    } else {
      children.push(new Paragraph({ children: [textRun(part)] }))
    }
  }
}

function addTable(children, rows) {
  const ncol = Math.max(...rows.map((r) => r.length))
  const border = { style: BorderStyle.SINGLE, size: 4, color: '999999' }
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((row, i) =>
      new TableRow({
        children: Array.from({ length: ncol }, (_, j) =>
          new TableCell({
            borders: { top: border, bottom: border, left: border, right: border },
            children: [new Paragraph({
              children: [textRun(row[j] ?? '', { bold: i === 0 })],
            })],
          })),
      })),
  })
  children.push(table)
  children.push(new Paragraph({ children: [] }))
}

function markdownToDocx(mdText) {
  const children = []
  let tableBuf = []
  const flushTable = () => {
    if (tableBuf.length) addTable(children, tableBuf)
    tableBuf = []
  }
  for (const raw of mdText.split('\n')) {
    const s = raw.trim()
    if (s.startsWith('|')) {
      const cells = s.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      if (cells.every((c) => /^:?-+:?$/.test(c) || c === '')) continue
      tableBuf.push(cells)
      continue
    }
    flushTable()
    if (s === '') continue
    if (s.startsWith('#### ')) children.push(new Paragraph({ text: s.slice(5), heading: HeadingLevel.HEADING_4 }))
    else if (s.startsWith('### ')) children.push(new Paragraph({ text: s.slice(4), heading: HeadingLevel.HEADING_3 }))
    else if (s.startsWith('## ')) children.push(new Paragraph({ text: s.slice(3), heading: HeadingLevel.HEADING_2 }))
    else if (s.startsWith('# ')) children.push(new Paragraph({ text: s.slice(2), heading: HeadingLevel.HEADING_1 }))
    else if (/^\d+\.\s/.test(s)) addRich(children, s)
    else if (s.startsWith('- ') || s.startsWith('* ')) {
      const inner = s.slice(2).trim()
      const runs = []
      for (const part of inner.split(/(\*\*.+?\*\*)/)) {
        if (!part) continue
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) runs.push(textRun(part.slice(2, -2), { bold: true }))
        else runs.push(textRun(part))
      }
      children.push(new Paragraph({ children: runs, bullet: { level: 0 } }))
    } else if (s.startsWith('> ')) {
      const runs = []
      for (const part of s.slice(2).split(/(\*\*.+?\*\*)/)) {
        if (!part) continue
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) runs.push(textRun(part.slice(2, -2), { bold: true }))
        else runs.push(textRun(part))
      }
      children.push(new Paragraph({ children: runs, indent: { left: 360 }, spacing: { after: 60 } }))
    } else {
      addRich(children, s)
    }
  }
  flushTable()
  return new Document({ sections: [{ children }] })
}

const source = fs.readFileSync(srcPath, 'utf8')
// 切分：一级标题处断开
const sections = []
let current = null
for (const line of source.split('\n')) {
  if (/^# 第.+部分/.test(line)) {
    if (current) sections.push(current)
    current = { title: line.slice(2).trim(), lines: [line] }
  } else if (current) {
    current.lines.push(line)
  }
}
if (current) sections.push(current)

fs.mkdirSync(outDir, { recursive: true })
const SKIP = ['事实校对说明']
let count = 0
for (const section of sections) {
  if (SKIP.some((k) => section.title.includes(k))) {
    console.log('skip (internal):', section.title)
    continue
  }
  const name = section.title
    .replace(/^第[一二三四五六七八九十]+部分\s*·\s*/, '')
    .replace(/[（(].*?[)）]/g, '')
    .replace(/[\\/:*?"<>|\s]+/g, '_')
    .slice(0, 40)
  const outPath = path.join(outDir, `SCGP_${name}.docx`)
  const doc = markdownToDocx(section.lines.join('\n'))
  const buf = await Packer.toBuffer(doc)
  fs.writeFileSync(outPath, buf)
  count += 1
  console.log(`saved: ${path.relative(repoRoot, outPath)} (${(buf.length / 1024).toFixed(0)} KB)`)
}
console.log('ALL DONE:', count, 'files')
