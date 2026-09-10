/** Reindex screenshot callouts in the manual and rebuild the internal baseline table from the audited plan. */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  USER_MANUAL_SCREENSHOT_COUNT,
  userManualScreenshotPlan,
} from './user-manual-screenshot-plan.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..')
const manualPath = path.join(
  repoRoot,
  'docs',
  'user-manual',
  'SCGP-星愿能力发展平台用户使用手册.md',
)
// 2026-09-10 起截图清单不再进对外手册第 18 章，改维护在内部基线文档的标记区间内
const baselinePath = path.join(
  repoRoot,
  'docs',
  'user-manual',
  'SCGP-用户手册截图采集与维护基线.md',
)
const tableStartMark = '<!-- SCREENSHOT_TABLE_START -->'
const tableEndMark = '<!-- SCREENSHOT_TABLE_END -->'

function reindexManualCallouts(source) {
  let calloutIndex = 0
  const reindexed = source.replace(
    /^(>\s*\[图 )S\d{3}(\])/gmu,
    (_match, prefix, suffix) => {
      const scene = userManualScreenshotPlan[calloutIndex]
      if (!scene) throw new Error('Manual contains more screenshot callouts than the audited plan')
      calloutIndex += 1
      return `${prefix}${scene.id}${suffix}`
    },
  )
  if (calloutIndex !== USER_MANUAL_SCREENSHOT_COUNT) {
    throw new Error(
      `Expected ${USER_MANUAL_SCREENSHOT_COUNT} body callouts, found ${calloutIndex}`,
    )
  }
  return reindexed
}

function rebuildBaselineTable(source) {
  const headingIndex = source.indexOf('## 3.')
  const startIndex = source.indexOf(tableStartMark)
  const endIndex = source.indexOf(tableEndMark)
  if (headingIndex < 0) {
    throw new Error('Baseline document section-3 heading is missing')
  }
  if (startIndex < 0 || endIndex < startIndex) {
    throw new Error('Baseline document table markers are missing or out of order')
  }

  const rows = userManualScreenshotPlan
    .map((scene) => `| ${scene.id} | ${scene.chapter} | ${scene.title} | ${scene.role} | ${scene.crop} | ${scene.priority} / ${scene.status} |`)
    .join('\n')

  // 引言块只保留在标记区间之外（本函数不复制、不搬运），表内不重复注入
  const header = `| 编号 | 章节 | 页面或状态 | 角色 | 建议范围 | 优先级 / 状态 |\n|---|---|---|---|---|---|`
  const nextTable = `${header}\n${rows}\n`

  return `${source.slice(0, startIndex)}${tableStartMark}\n\n${nextTable}${source.slice(endIndex)}`
}

function main() {
  const manual = fs.readFileSync(manualPath, 'utf8').replace(/\r\n/gu, '\n')
  const reindexed = reindexManualCallouts(manual)
  if (reindexed !== manual) {
    fs.writeFileSync(manualPath, reindexed, 'utf8')
    console.log(`Reindexed body callouts in manual (${USER_MANUAL_SCREENSHOT_COUNT})`)
  } else {
    console.log(`Manual callouts already match the plan (${USER_MANUAL_SCREENSHOT_COUNT})`)
  }

  const baseline = fs.readFileSync(baselinePath, 'utf8').replace(/\r\n/gu, '\n')
  const rebuilt = rebuildBaselineTable(baseline)
  fs.writeFileSync(baselinePath, rebuilt, 'utf8')

  const priorities = userManualScreenshotPlan.reduce((counts, scene) => {
    counts[scene.priority] = (counts[scene.priority] || 0) + 1
    return counts
  }, {})
  console.log(
    `Rebuilt baseline table: ${USER_MANUAL_SCREENSHOT_COUNT} rows (P0 ${priorities.P0 || 0} / P1 ${priorities.P1 || 0} / P2 ${priorities.P2 || 0})`,
  )
}

main()
