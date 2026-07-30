/** Validate the generated SCGP manual without mutating the document. */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mammoth from 'mammoth'
import {
  USER_MANUAL_SCREENSHOT_COUNT,
  userManualScreenshotPlan,
} from './user-manual-screenshot-plan.mjs'
import { validateUserManualScreenshotScenarios } from './user-manual-screenshot-scenario-contract.mjs'
import { validateUserManualScreenshotFixtureRuntime } from './user-manual-screenshot-fixtures.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..')
const manualDir = path.join(repoRoot, 'docs', 'user-manual')
const markdownPath = path.join(manualDir, 'SCGP-星愿能力发展平台用户使用手册.md')
const docxPath = path.join(manualDir, 'SCGP-星愿能力发展平台用户使用手册.docx')
const expectedScreenshotCount = USER_MANUAL_SCREENSHOT_COUNT

const chapterTitles = [
  '1. 阅读说明与角色边界',
  '2. 首次使用、激活与登录',
  '3. 界面导航、首页与个人资料',
  '4. 学生管理',
  '5. 班级、学年与学生分班',
  '6. 能力评估',
  '7. 训练计划',
  '8. 情绪行为训练',
  '9. 游戏训练',
  '10. 器材训练',
  '11. 自理训练',
  '12. 训练记录',
  '13. 报告中心与导出',
  '14. 资源中心',
  '15. AI 智能体助手',
  '16. 系统管理',
  '17. 数据安全、日常维护与常见问题',
  '18. 附录',
]

const requiredBoundaryText = [
  '批量导入支持 .xlsx 和 .xls 文件',
  '尚未接入可验证的定时备份执行主链',
  'BRIEF 和综合认知自测的报告页面明确标为 DRAFT',
  '不要承诺所有 15 项评估都能直接导出 Word',
  '训练资源收藏尚未接入资源中心页面',
  '备份不包含 AI 模型服务 API Key',
]

const requiredCoverText = [
  'SCGP',
  '星愿能力发展平台',
  '用户使用手册',
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  assert(fs.existsSync(markdownPath), `Missing Markdown: ${markdownPath}`)
  assert(fs.existsSync(docxPath), `Missing Word document: ${docxPath}`)

  const markdown = fs.readFileSync(markdownPath, 'utf8')
  const screenshotScenarioMetrics = validateUserManualScreenshotScenarios(markdown)
  const screenshotRuntimeMetrics = validateUserManualScreenshotFixtureRuntime()
  const extraction = await mammoth.extractRawText({ path: docxPath })
  const text = extraction.value

  for (const title of chapterTitles) {
    assert(text.includes(title), `DOCX is missing chapter heading: ${title}`)
  }

  const roleCount = (text.match(/适用角色：/gu) ?? []).length
  assert(roleCount >= 18, `Expected at least 18 role annotations, found ${roleCount}`)

  const bodySource = markdown.split('## 18.2 截图清单')[0]
  const screenshotSection = markdown.split('## 18.2 截图清单')[1]?.split('## 18.3 截图采集验收标准')[0] ?? ''
  const bodyScreenshotIds = [...bodySource.matchAll(/^>\s*\[图 (S\d{3})\]/gmu)].map((match) => match[1])
  const screenshotRows = [...screenshotSection.matchAll(
    /^\| (S\d{3}) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| (P[012]) \/ 待采集 \|$/gmu,
  )]
  const listScreenshotIds = screenshotRows.map((match) => match[1])
  const screenshotIds = new Set(text.match(/S\d{3}/gu) ?? [])
  const figureCaptionIds = [...text.matchAll(/(?:^|\n)图 (S\d{3})：/gu)].map((match) => match[1])
  const screenshotPlaceholderCount = (text.match(/(?:^|\n)截图 S\d{3}：/gu) ?? []).length

  assert(bodyScreenshotIds.length === expectedScreenshotCount,
    `Expected ${expectedScreenshotCount} body screenshot placeholders, found ${bodyScreenshotIds.length}`)
  assert(listScreenshotIds.length === expectedScreenshotCount,
    `Expected ${expectedScreenshotCount} screenshot-list rows, found ${listScreenshotIds.length}`)
  assert(new Set(bodyScreenshotIds).size === expectedScreenshotCount, 'Body screenshot IDs are not unique')
  assert(new Set(listScreenshotIds).size === expectedScreenshotCount, 'Screenshot-list IDs are not unique')
  assert(figureCaptionIds.length === expectedScreenshotCount,
    `Expected ${expectedScreenshotCount} DOCX figure captions, found ${figureCaptionIds.length}`)
  assert(screenshotPlaceholderCount === 0,
    `DOCX still contains ${screenshotPlaceholderCount} screenshot description placeholders`)
  assert(!/\bS\d{2}\b/u.test(markdown), 'Manual still contains a legacy two-digit screenshot ID')
  assert(!markdown.includes('S000'), 'Manual still contains a temporary screenshot ID')

  for (let index = 1; index <= expectedScreenshotCount; index += 1) {
    const id = `S${String(index).padStart(3, '0')}`
    assert(bodyScreenshotIds[index - 1] === id, `Manual body screenshot order mismatch at ${id}`)
    assert(listScreenshotIds[index - 1] === id, `Screenshot list order mismatch at ${id}`)
    assert(figureCaptionIds[index - 1] === id, `DOCX figure caption order mismatch at ${id}`)
    assert(screenshotIds.has(id), `DOCX is missing screenshot ID ${id}`)

    const scene = userManualScreenshotPlan[index - 1]
    const row = screenshotRows[index - 1]
    assert(row[2].trim() === scene.chapter, `Screenshot ${id} chapter mismatch`)
    assert(row[3].trim() === scene.title, `Screenshot ${id} title mismatch`)
    assert(row[4].trim() === scene.role, `Screenshot ${id} role mismatch`)
    assert(row[5].trim() === scene.crop, `Screenshot ${id} crop mismatch`)
    assert(row[6] === scene.priority, `Screenshot ${id} priority mismatch`)
  }

  const screenshotPriorities = screenshotRows.reduce((counts, row) => {
    counts[row[6]] += 1
    return counts
  }, { P0: 0, P1: 0, P2: 0 })

  for (const required of requiredBoundaryText) {
    assert(text.includes(required), `DOCX is missing boundary statement: ${required}`)
  }

  for (const required of requiredCoverText) {
    assert(text.includes(required), `DOCX is missing cover or back-cover text: ${required}`)
  }

  const imageReferences = [...markdown.matchAll(/!\[[^\]]+\]\(([^)]+\.svg)\)/gu)]
  assert(imageReferences.length === 4, `Expected 4 SVG references, found ${imageReferences.length}`)
  for (const [, relative] of imageReferences) {
    const svgPath = path.resolve(manualDir, relative)
    const pngPath = svgPath.replace(/\.svg$/iu, '.png')
    assert(fs.existsSync(svgPath), `Missing SVG: ${relative}`)
    assert(fs.existsSync(pngPath), `Missing PNG fallback: ${path.relative(manualDir, pngPath)}`)
  }

  assert(text.length > 15000, `Extracted text is unexpectedly short: ${text.length}`)
  assert(!text.includes('系统每天自动备份'), 'DOCX contains an unsupported automatic-backup claim')
  assert(!text.includes('所有评估报告均可导出 Word'), 'DOCX contains an unsupported report-export claim')
  assert(!text.includes('学生批量导入界面当前仅作占位'), 'DOCX contains a stale batch-import placeholder claim')
  assert(!text.includes('当前批量导入尚未形成实际写入闭环'), 'DOCX contains a stale batch-import unavailable claim')
  assert(!text.includes('批量导入为过渡态'), 'DOCX contains a stale batch-import transition claim')

  console.log(JSON.stringify({
    markdownBytes: fs.statSync(markdownPath).size,
    docxBytes: fs.statSync(docxPath).size,
    extractedCharacters: text.length,
    chapters: chapterTitles.length,
    roleAnnotations: roleCount,
    screenshotIds: screenshotIds.size,
    bodyScreenshotPlaceholders: bodyScreenshotIds.length,
    docxFigureCaptions: figureCaptionIds.length,
    docxScreenshotPlaceholders: screenshotPlaceholderCount,
    screenshotListRows: listScreenshotIds.length,
    screenshotPriorities,
    screenshotScenarios: screenshotScenarioMetrics,
    screenshotRuntime: screenshotRuntimeMetrics,
    diagramPairs: imageReferences.length,
    coverStatements: requiredCoverText.length,
    mammothMessages: extraction.messages.length,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
