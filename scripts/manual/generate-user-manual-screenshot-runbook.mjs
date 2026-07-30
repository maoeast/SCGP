/** Generate the human-readable screenshot execution runbook from the scenario source. */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  USER_MANUAL_SCREENSHOT_VIEWPORT,
  userManualScreenshotCaptureTargets,
  userManualScreenshotFixtureProfiles,
  userManualScreenshotScenarios,
} from './user-manual-screenshot-scenarios.mjs'
import { validateUserManualScreenshotScenarios } from './user-manual-screenshot-scenario-contract.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..')
const manualDir = path.join(repoRoot, 'docs', 'user-manual')
const manualPath = path.join(manualDir, 'SCGP-星愿能力发展平台用户使用手册.md')
const outputPath = path.join(manualDir, 'SCGP-用户手册截图执行清单.md')

const actorLabels = {
  admin: '管理员',
  teacher: '教师',
  either: '教师或管理员',
  implementation: '管理员或实施人员',
  public: '未登录用户',
}

const modeLabels = {
  auto: 'Electron 自动',
  assisted: 'Electron 辅助',
  native: '原生人工',
}

const safetyLabels = {
  'read-only': '只读',
  'demo-write': '演示写入',
  'isolated-state': '隔离状态',
}

function escapeCell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', '<br>')
}

function listCell(values) {
  return escapeCell(values.join('；'))
}

function countBy(field) {
  return userManualScreenshotScenarios.reduce((counts, scenario) => {
    const value = field(scenario)
    counts[value] = (counts[value] ?? 0) + 1
    return counts
  }, {})
}

function renderCounts(counts, labels = {}) {
  return Object.entries(counts)
    .map(([key, value]) => `${labels[key] ?? key} ${value}`)
    .join('，')
}

function renderFixtureProfiles() {
  const lines = [
    '| 配置代码 | 前置条件 |',
    '|---|---|',
  ]
  for (const [key, conditions] of Object.entries(userManualScreenshotFixtureProfiles)) {
    lines.push(`| \`${key}\` | ${listCell(conditions)} |`)
  }
  return lines.join('\n')
}

function renderCaptureTargets() {
  const lines = [
    '| 目标代码 | 选择器候选 | 含义 |',
    '|---|---|---|',
  ]
  for (const [key, target] of Object.entries(userManualScreenshotCaptureTargets)) {
    lines.push(`| \`${key}\` | ${escapeCell(target.selector ?? '整窗口/桌面')} | ${escapeCell(target.description)} |`)
  }
  return lines.join('\n')
}

function renderScenarioTable(scenarios) {
  const lines = [
    '| ID | 优先级 / 状态 | 页面状态 | 路由模板 | 执行角色 | 数据配置 | 操作步骤 | 可见断言 | 采集 | 安全 | 裁切 | 输出与插入 |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
  ]

  for (const scenario of scenarios) {
    lines.push([
      `| **${scenario.id}**`,
      `${scenario.priority} / ${scenario.status}`,
      escapeCell(scenario.title),
      `\`${escapeCell(scenario.route)}\``,
      actorLabels[scenario.actor],
      `\`${scenario.fixture}\``,
      listCell(scenario.actions),
      listCell(scenario.assertions),
      modeLabels[scenario.capture.mode],
      safetyLabels[scenario.capture.safety],
      `\`${scenario.capture.target}\``,
      `\`${scenario.filename}\` → \`${escapeCell(scenario.placement.markdownToken)}\` |`,
    ].join(' | '))
  }

  return lines.join('\n')
}

function main() {
  const markdown = fs.readFileSync(manualPath, 'utf8')
  const metrics = validateUserManualScreenshotScenarios(markdown)
  const unorderedPriorityCounts = countBy((scenario) => scenario.priority)
  const unorderedModeCounts = countBy((scenario) => scenario.capture.mode)
  const unorderedSafetyCounts = countBy((scenario) => scenario.capture.safety)
  const priorityCounts = Object.fromEntries(['P0', 'P1', 'P2'].map((key) => [key, unorderedPriorityCounts[key] ?? 0]))
  const modeCounts = Object.fromEntries(['auto', 'assisted', 'native'].map((key) => [key, unorderedModeCounts[key] ?? 0]))
  const safetyCounts = Object.fromEntries(['read-only', 'demo-write', 'isolated-state'].map((key) => [key, unorderedSafetyCounts[key] ?? 0]))
  const chapterGroups = userManualScreenshotScenarios.reduce((groups, scenario) => {
    const chapter = scenario.chapter.split('.')[0]
    const chapterScenarios = groups.get(chapter) ?? []
    chapterScenarios.push(scenario)
    groups.set(chapter, chapterScenarios)
    return groups
  }, new Map())

  const lines = [
    '# SCGP 用户手册截图执行清单',
    '',
    '> 状态：212 项场景已编排、审核并嵌入正式 Word 用户手册。本文件由 `scripts/manual/generate-user-manual-screenshot-runbook.mjs` 生成，请勿手工维护表格。',
    '',
    '## 1. 执行基线',
    '',
    `- 总场景：${metrics.scenarios}；${renderCounts(priorityCounts)}。`,
    `- 采集方式：${renderCounts(modeCounts, modeLabels)}。`,
    `- 安全分级：${renderCounts(safetyCounts, safetyLabels)}。`,
    `- 固定视口：${USER_MANUAL_SCREENSHOT_VIEWPORT.width}×${USER_MANUAL_SCREENSHOT_VIEWPORT.height}，DPR ${USER_MANUAL_SCREENSHOT_VIEWPORT.deviceScaleFactor}。`,
    '- 每项只允许生成一个同名文件；不得把同一图片复制到多个编号。',
    '- `auto` 使用 Playwright Electron 自动导航与截图；`assisted` 允许人工完成设备、文件选择、长流程或脚本化响应准备，再由 Playwright 截图；`native` 使用 Windows 桌面级截图。',
    '- `demo-write` 只能写入可丢弃演示数据库；`isolated-state` 必须使用独立 `userData`、临时资源和受控状态，禁止触碰当前开发数据、正式更新源或真实安装流程。',
    '- 路由模板中的 `{studentId}`、`{taskId}`、`{...AssessId}` 等变量由对应数据配置加载后解析，不得硬编码正式业务数据。',
    '- 图片写入 `docs/user-manual/screenshots/Sxxx.png`，正文生成时按唯一的 `[图 Sxxx]` 锚点替换，不依赖模糊标题匹配。',
    '- 当前 `capture-user-manual-screenshots.mjs` 只实现 S001、S003、S005、S017、S023、S057、S123、S174、S197、S209 的实际处理器；其余场景需按优先级逐批补齐处理器后再执行。',
    '- 现有 `screenshot-scenes.mjs` 与 `capture-*-screenshots.mjs` 属旧说明书脚本，不得作为本清单的当前执行器。',
    '',
    '## 2. 运行命令与产物',
    '',
    '```powershell',
    'npm run manual:screenshots:check',
    'npm run manual:screenshots:pilot',
    'node scripts/manual/capture-user-manual-screenshots.mjs --ids S017 --run-id audit-s017',
    '```',
    '',
    '- 默认产物位于 `output/manual-screenshot-capture/runs/<run-id>/`，包含截图、隔离 `userData`、临时文件、日志和 `manifest.json`。',
    '- 逐图审核通过后，先写入 `docs/user-manual/screenshot-approvals.json`，再由 `promote-user-manual-screenshots.mjs` 校验 SHA-256 后写入 `docs/user-manual/screenshots/`；Word 生成时使用 `--include-approved-screenshots` 嵌入已批准图片。',
    '',
    '## 3. 数据配置',
    '',
    renderFixtureProfiles(),
    '',
    '## 4. 裁切目标',
    '',
    renderCaptureTargets(),
    '',
    '## 5. 分章执行清单',
    '',
  ]

  for (const [chapter, scenarios] of chapterGroups) {
    lines.push(`### 第 ${chapter} 章`, '', renderScenarioTable(scenarios), '')
  }

  fs.writeFileSync(outputPath, `${lines.join('\n').trim()}\n`, 'utf8')
  console.log(JSON.stringify({
    output: path.relative(repoRoot, outputPath).replaceAll('\\', '/'),
    ...metrics,
    priorities: priorityCounts,
  }, null, 2))
}

main()
