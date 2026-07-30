/** Reindex screenshot callouts and rebuild the manual appendix from the audited plan. */

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
const appendixHeading = '## 18.2 截图清单'
const nextHeading = '## 18.3 截图采集验收标准'

function main() {
  const source = fs.readFileSync(manualPath, 'utf8').replace(/\r\n/gu, '\n')
  const appendixIndex = source.indexOf(appendixHeading)
  const nextIndex = source.indexOf(nextHeading)
  if (appendixIndex < 0 || nextIndex < appendixIndex) {
    throw new Error('Manual screenshot appendix markers are missing or out of order')
  }

  const body = source.slice(0, appendixIndex)
  let calloutIndex = 0
  const reindexedBody = body.replace(
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

  const priorities = userManualScreenshotPlan.reduce((counts, scene) => {
    counts[scene.priority] = (counts[scene.priority] || 0) + 1
    return counts
  }, {})
  const rows = userManualScreenshotPlan
    .map((scene) => `| ${scene.id} | ${scene.chapter} | ${scene.title} | ${scene.role} | ${scene.crop} | ${scene.priority} / ${scene.status} |`)
    .join('\n')
  const appendix = `${appendixHeading}\n\n正文结构稳定后统一采集。本版经逐项代码审核，按用户任务和单一可复现界面状态拆分为 **${USER_MANUAL_SCREENSHOT_COUNT} 张**：\`P0\` 为跟随操作必需截图，\`P1\` 为补充说明截图，\`P2\` 为异常、风险或过渡态截图。当前分布为 P0 ${priorities.P0 || 0} 张、P1 ${priorities.P1 || 0} 张、P2 ${priorities.P2 || 0} 张。所有截图应使用脱敏演示数据，隐藏真实姓名、电话、证件、诊断详情、API Key、激活码和机器码。业务截图优先使用已激活 Electron 生产式环境；不得把 404、开发者调试页或与正文无关的未授权页误作业务截图。\n\n| 编号 | 章节 | 页面或状态 | 角色 | 建议范围 | 优先级 / 状态 |\n|---|---|---|---|---|---|\n${rows}\n\n`

  const next = `${reindexedBody}${appendix}${source.slice(nextIndex)}`
  fs.writeFileSync(manualPath, next, 'utf8')
  console.log(`Synchronized ${USER_MANUAL_SCREENSHOT_COUNT} screenshot callouts and appendix rows`)
}

main()
