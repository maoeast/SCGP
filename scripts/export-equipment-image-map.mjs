#!/usr/bin/env node
/**
 * 导出器材产品名称 → 图片文件名映射表
 * 用法: node scripts/export-equipment-image-map.mjs
 * 输出: docs/references/physical-equipment/image-filename-map.csv
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const CSV_FILES = [
  { domain: 'emotional-regulation', label: '情绪调节', file: 'docs/references/physical-equipment/emotional-regulation/2026-03-26-emotional-regulation-equipment-draft.csv' },
  { domain: 'social-communication', label: '社交沟通', file: 'docs/references/physical-equipment/social-communication/2026-03-26-social-communication-equipment-draft.csv' },
  { domain: 'fine-motor', label: '精细动作', file: 'docs/references/physical-equipment/fine-motor/2026-03-26-fine-motor-equipment-draft.csv' },
  { domain: 'soothing-aids', label: '安抚教具', file: 'docs/references/physical-equipment/soothing-aids/2026-03-26-soothing-aids-equipment-draft.csv' },
]

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

function parseCsvLine(line) {
  const values = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue }
    current += ch
  }
  values.push(current.trim())
  return values
}

function normalizeHeader(h) { return h.replace(/^\uFEFF/, '').trim() }

function pad(n, w) { return String(Math.max(Number.isFinite(n) ? n : 0, 0)).padStart(w, '0') }

function buildResourceCode(domain, box, seq, variant, fallbackRow) {
  const boxNum = Number(box || 0)
  const seqNum = Number.isFinite(seq) ? Number(seq) : fallbackRow
  const suffix = variant > 0 ? (LETTERS[variant - 1] ? `-${LETTERS[variant - 1]}` : `-v${variant + 1}`) : ''
  return `${domain}-box${pad(boxNum, 2)}-seq${pad(seqNum, 3)}${suffix}`
}

function processCsv(csvInfo) {
  const raw = readFileSync(resolve(ROOT, csvInfo.file), 'utf-8')
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map(normalizeHeader)
  const headerMap = new Map(headers.map((h, i) => [h, i]))

  // find column names
  const categoryCol = ['类别名称', '套装类别', '类别模块'].find(c => headerMap.has(c)) || ''
  const descCol = ['教育目标与功能描述', '教育目标与功能描述 '].find(c => headerMap.has(c)) || ''
  const tagsCol = ['能力标签', '核心能力标签'].find(c => headerMap.has(c)) || ''

  const results = []
  const duplicateCounter = new Map()

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    const row = Object.fromEntries(headers.map((h, idx) => [h, (cells[idx] || '').trim()]))

    const name = (row['产品名称'] || '').trim()
    const sourceCategory = (row[categoryCol] || '').trim()
    if (!name || name === '训练卡' || sourceCategory === '训练卡') continue

    const seqVal = Number(row['序号'])
    const sourceBox = (row['箱号'] || '').trim()
    const sourceSequence = Number.isFinite(seqVal) && seqVal > 0 ? seqVal : undefined

    const dupKey = `${sourceBox || '0'}:${sourceSequence || results.length + 1}`
    const variant = duplicateCounter.get(dupKey) || 0
    duplicateCounter.set(dupKey, variant + 1)

    const resourceCode = buildResourceCode(csvInfo.domain, sourceBox, sourceSequence, variant, results.length + 1)
    const imageFile = `${csvInfo.domain}/${resourceCode}.webp`

    results.push({
      domain: csvInfo.domain,
      domainLabel: csvInfo.label,
      sourceCategory,
      box: sourceBox,
      sequence: sourceSequence ?? '',
      productName: name,
      resourceCode,
      imageFilename: `${resourceCode}.webp`,
      assetPath: `src/assets/images/physical-equipment/${imageFile}`,
    })
  }
  return results
}

// main
const allRows = []
for (const csv of CSV_FILES) {
  const rows = processCsv(csv)
  allRows.push(...rows)
}

// output CSV
const header = '分类,分类名称,箱号,序号,产品名称,resourceCode,图片文件名,图片存放路径'
const csvLines = allRows.map(r =>
  `${r.domain},${r.domainLabel},${r.box},${r.sequence},"${r.productName}",${r.resourceCode},${r.imageFilename},${r.assetPath}`
)

const output = [header, ...csvLines].join('\n')
const outPath = resolve(ROOT, 'docs/references/physical-equipment/image-filename-map.csv')
writeFileSync(outPath, '\uFEFF' + output, 'utf-8')

console.log(`已导出 ${allRows.length} 条映射到: ${outPath}`)
console.log()

// also print summary table
for (const csv of CSV_FILES) {
  const domainRows = allRows.filter(r => r.domain === csv.domain)
  console.log(`\n=== ${csv.label} (${csv.domain}) — ${domainRows.length} 项 ===`)
  console.log('图片文件名 | 产品名称')
  console.log('---|---')
  for (const r of domainRows) {
    console.log(`${r.imageFilename} | ${r.productName}`)
  }
}
