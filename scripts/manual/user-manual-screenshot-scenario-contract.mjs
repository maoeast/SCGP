/** Contract checks shared by the screenshot runbook generator and manual validator. */

import {
  userManualScreenshotCaptureTargets,
  userManualScreenshotFixtureProfiles,
  userManualScreenshotScenarios,
} from './user-manual-screenshot-scenarios.mjs'
import { userManualScreenshotPlan } from './user-manual-screenshot-plan.mjs'

const CAPTURE_MODES = new Set(['auto', 'assisted', 'native'])
const SAFETY_LEVELS = new Set(['read-only', 'demo-write', 'isolated-state'])
const ACTORS = new Set(['admin', 'teacher', 'either', 'implementation', 'public'])
const ROLE_ACTORS_MAP = new Map([
  ['管理员', new Set(['admin'])],
  ['教师', new Set(['teacher'])],
  ['全部', new Set(['either', 'public'])],
  ['管理员/实施', new Set(['implementation'])],
])
const ROUTE_VARIABLES = new Set([
  'studentId',
  'taskId',
  'sceneId',
  'emotionSessionId',
  'gameRecordId',
  'smAssessId',
  'weefimAssessId',
  'csirsAssessId',
  'connersPsqAssessId',
  'connersTrsAssessId',
  'sdqAssessId',
  'srs2AssessId',
  'cbclAssessId',
  'cnbsAssessId',
  'tgmdAssessId',
  'gmfmAssessId',
  'fmdaAssessId',
  'briefAssessId',
  'crtAssessId',
  'cognitiveAssessId',
])
const PRODUCTION_ROUTE_PATTERNS = [
  /^\/(?:activation|login|dashboard|profile|assessment|reports|resource-center|training-plan|system|class-management|student-class-assignment)$/u,
  /^\/profile\/ai-chat-history$/u,
  /^\/students(?:\/\{studentId\})?$/u,
  /^\/assessment\/select-student$/u,
  /^\/assessment\/unified\/[a-z0-9_-]+\/\{studentId\}$/u,
  /^\/assessment\/(?:sm|weefim)\/report$/u,
  /^\/assessment\/[a-z0-9_-]+\/report\/\{[A-Za-z][A-Za-z0-9]*\}$/u,
  /^\/emotional\/(?:menu|emotion-scene\/select|emotion-scene|care-expression\/select|care-expression|session-summary|game-record|report)$/u,
  /^\/emotional\/games\/[a-z0-9-]+$/u,
  /^\/games\/(?:menu|select-student|report)$/u,
  /^\/games\/lobby\/\{studentId\}$/u,
  /^\/training-records\/(?:menu|[a-z0-9-]+)$/u,
  /^\/equipment\/(?:menu|select-student)$/u,
  /^\/equipment\/(?:quick-entry|records)\/\{studentId\}$/u,
  /^\/self-care\/tasks(?:\/new|\/\{taskId\}\/edit|\/\{taskId\}\/select-student)?$/u,
  /^\/self-care\/execute\/\{taskId\}\/\{studentId\}$/u,
]
const FORBIDDEN_ROUTE_PARTS = [
  '/sql-test',
  '/weefim-test',
  '/worker-test',
  '/schema-migration',
  '/migration-verification',
  '/module-devtools',
  '/benchmark-runner',
  '/class-management-test',
  '/class-snapshot-verification',
  '/class-test-lite',
  '/activation-admin',
]

const RISK_ACTION_PATTERN = /触发删除|点击删除|确认清理|完成恢复|点击恢复|输入无效.*激活码|点击重新激活|切换状态|执行.*导入|提交一条|拒绝.*权限|注入.*状态|点击启用|点击新建|点击编辑/u

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function collectManualPlaceholders(markdown) {
  const body = markdown.split('## 18.2 截图清单')[0]
  return [...body.matchAll(/^>\s*\[图 (S\d{3})\]/gmu)].map((match) => match[1])
}

function isKnownProductionRoute(route) {
  const routePath = route.split('?')[0]
  return PRODUCTION_ROUTE_PATTERNS.some((pattern) => pattern.test(routePath))
}

export function validateUserManualScreenshotScenarios(markdown) {
  assert(typeof markdown === 'string' && markdown.length > 0, 'Manual Markdown is required')
  assert(userManualScreenshotScenarios.length === userManualScreenshotPlan.length,
    `Scenario count ${userManualScreenshotScenarios.length} does not match plan count ${userManualScreenshotPlan.length}`)

  const manualPlaceholders = collectManualPlaceholders(markdown)
  const filenames = new Set()
  const outputPaths = new Set()
  const counts = {
    captureModes: { auto: 0, assisted: 0, native: 0 },
    safety: { 'read-only': 0, 'demo-write': 0, 'isolated-state': 0 },
    actors: { admin: 0, teacher: 0, either: 0, implementation: 0, public: 0 },
  }

  assert(manualPlaceholders.length === userManualScreenshotScenarios.length,
    `Manual placeholder count ${manualPlaceholders.length} does not match scenario count ${userManualScreenshotScenarios.length}`)

  userManualScreenshotScenarios.forEach((scenario, index) => {
    const plan = userManualScreenshotPlan[index]
    assert(scenario.id === plan.id, `Scenario order mismatch at ${plan.id}`)
    assert(manualPlaceholders[index] === scenario.id, `Manual placeholder order mismatch at ${scenario.id}`)
    assert(scenario.title === plan.title, `Scenario ${scenario.id} title mismatch`)
    assert(scenario.chapter === plan.chapter, `Scenario ${scenario.id} chapter mismatch`)
    assert(scenario.role === plan.role, `Scenario ${scenario.id} role mismatch`)
    assert(scenario.priority === plan.priority, `Scenario ${scenario.id} priority mismatch`)
    assert(scenario.filename === `${scenario.id}.png`, `Scenario ${scenario.id} filename mismatch`)
    assert(scenario.outputPath === `docs/user-manual/screenshots/${scenario.id}.png`,
      `Scenario ${scenario.id} output path mismatch`)
    assert(!filenames.has(scenario.filename), `Duplicate filename: ${scenario.filename}`)
    assert(!outputPaths.has(scenario.outputPath), `Duplicate output path: ${scenario.outputPath}`)
    filenames.add(scenario.filename)
    outputPaths.add(scenario.outputPath)

    assert(scenario.route.startsWith('/'), `Scenario ${scenario.id} route must start with /`)
    assert(isKnownProductionRoute(scenario.route),
      `Scenario ${scenario.id} does not match a known production route: ${scenario.route}`)
    assert(!FORBIDDEN_ROUTE_PARTS.some((part) => scenario.route.startsWith(part)),
      `Scenario ${scenario.id} uses a development-only route: ${scenario.route}`)
    assert(ACTORS.has(scenario.actor), `Scenario ${scenario.id} has invalid actor: ${scenario.actor}`)
    assert(ROLE_ACTORS_MAP.get(scenario.role)?.has(scenario.actor),
      `Scenario ${scenario.id} actor ${scenario.actor} does not match manual role ${scenario.role}`)
    assert(scenario.routeVariables.every((variable) => ROUTE_VARIABLES.has(variable)),
      `Scenario ${scenario.id} has an unknown route variable`)
    assert(scenario.fixture in userManualScreenshotFixtureProfiles,
      `Scenario ${scenario.id} has unknown fixture: ${scenario.fixture}`)
    assert(scenario.preconditions.length > 0, `Scenario ${scenario.id} has no preconditions`)
    assert(scenario.actions.length > 0, `Scenario ${scenario.id} has no actions`)
    assert(scenario.assertions.length > 0, `Scenario ${scenario.id} has no assertions`)
    assert(CAPTURE_MODES.has(scenario.capture.mode),
      `Scenario ${scenario.id} has invalid capture mode: ${scenario.capture.mode}`)
    assert(SAFETY_LEVELS.has(scenario.capture.safety),
      `Scenario ${scenario.id} has invalid safety level: ${scenario.capture.safety}`)
    assert(scenario.capture.target in userManualScreenshotCaptureTargets,
      `Scenario ${scenario.id} has unknown capture target: ${scenario.capture.target}`)
    assert(scenario.placement.markdownToken === `[图 ${scenario.id}]`,
      `Scenario ${scenario.id} placement token mismatch`)
    assert(scenario.placement.chapter === scenario.chapter,
      `Scenario ${scenario.id} placement chapter mismatch`)
    assert(scenario.placement.caption === scenario.title,
      `Scenario ${scenario.id} placement caption mismatch`)

    if (scenario.capture.mode === 'native') {
      assert(scenario.capture.target === 'native-dialog',
        `Native scenario ${scenario.id} must use native-dialog target`)
      assert(scenario.capture.safety === 'isolated-state',
        `Native scenario ${scenario.id} must use isolated-state safety`)
    }

    if (RISK_ACTION_PATTERN.test(scenario.actions.join(' '))) {
      assert(scenario.capture.safety !== 'read-only' || /查看|列表|入口|结果|日志|信息|摘要|报告/u.test(scenario.title),
        `Risk-bearing scenario ${scenario.id} is incorrectly marked read-only`)
    }

    counts.captureModes[scenario.capture.mode] += 1
    counts.safety[scenario.capture.safety] += 1
    counts.actors[scenario.actor] += 1
  })

  return {
    scenarios: userManualScreenshotScenarios.length,
    filenames: filenames.size,
    outputPaths: outputPaths.size,
    fixtureProfiles: Object.keys(userManualScreenshotFixtureProfiles).length,
    captureTargets: Object.keys(userManualScreenshotCaptureTargets).length,
    ...counts,
  }
}
