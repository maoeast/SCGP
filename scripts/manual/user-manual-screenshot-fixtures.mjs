/** Runtime fixture resolution for isolated user-manual screenshot capture. */

import fs from 'node:fs'
import path from 'node:path'

import {
  userManualScreenshotFixtureProfiles,
  userManualScreenshotScenarios,
} from './user-manual-screenshot-scenarios.mjs'

export const USER_MANUAL_SCREENSHOT_WORKSPACE_RELATIVE = path.join(
  'output',
  'manual-screenshot-capture',
)

export const USER_MANUAL_SCREENSHOT_PILOT_IDS = Object.freeze([
  'S001',
  'S003',
  'S005',
  'S017',
  'S023',
  'S057',
  'S123',
  'S174',
  'S197',
  'S209',
])

export const USER_MANUAL_SCREENSHOT_ROUTE_VALUES = Object.freeze({
  studentId: 9001,
  taskId: 9201,
  sceneId: 9301,
  emotionSessionId: 9401,
  gameRecordId: 9501,
  smAssessId: 9101,
  weefimAssessId: 9102,
  csirsAssessId: 9103,
  connersPsqAssessId: 9104,
  connersTrsAssessId: 9105,
  sdqAssessId: 9106,
  srs2AssessId: 9107,
  cbclAssessId: 9108,
  cnbsAssessId: 9109,
  tgmdAssessId: 9110,
  gmfmAssessId: 9111,
  fmdaAssessId: 9112,
  briefAssessId: 9113,
  crtAssessId: 9114,
  cognitiveAssessId: 9115,
})

const USER_MANUAL_SCREENSHOT_SCENARIO_ROUTE_VALUE_OVERRIDES = Object.freeze({
  S046: Object.freeze({ studentId: 9004 }),
})

const FULL_ALLOWED_MODULES = Object.freeze([
  'sensory',
  'emotional',
  'social',
  'life_skills',
  'cognitive',
])

const profile = (account, seedFamilies, options = {}) => Object.freeze({
  activation: 'full',
  account,
  seedFamilies: Object.freeze(seedFamilies),
  allowedModules: FULL_ALLOWED_MODULES,
  pilotReady: false,
  ...options,
})

export const userManualScreenshotFixtureRuntime = Object.freeze({
  unactivated: profile('none', ['base'], {
    activation: 'none',
    allowedModules: Object.freeze([]),
    pilotReady: true,
  }),
  'activated-public': profile('none', ['base'], { pilotReady: true }),
  'admin-full': profile('admin', ['accounts', 'students', 'assessments', 'equipment'], { pilotReady: true }),
  'teacher-full': profile('teacher', ['accounts', 'students', 'assessments', 'equipment']),
  'admin-no-ai': profile('admin', ['accounts', 'students', 'ai-disabled']),
  'admin-no-schedule': profile('admin', ['accounts', 'students', 'no-schedule']),
  students: profile('admin', ['accounts', 'students', 'classes'], { pilotReady: true }),
  classes: profile('admin', ['accounts', 'students', 'classes']),
  assessments: profile('admin', ['accounts', 'students', 'assessments'], { pilotReady: true }),
  plans: profile('admin', ['accounts', 'students', 'plans']),
  emotions: profile('admin', ['accounts', 'students', 'emotions']),
  games: profile('admin', ['accounts', 'students', 'games']),
  equipment: profile('admin', ['accounts', 'students', 'equipment'], { pilotReady: true }),
  'self-care': profile('admin', ['accounts', 'students', 'self-care']),
  records: profile('admin', ['accounts', 'students', 'records']),
  reports: profile('admin', ['accounts', 'students', 'assessments', 'reports']),
  resources: profile('admin', ['accounts', 'students', 'resources']),
  ai: profile('admin', ['accounts', 'students', 'ai'], { pilotReady: true }),
  system: profile('admin', ['accounts', 'students', 'system']),
  backup: profile('admin', ['accounts', 'students', 'backup'], { pilotReady: true }),
  update: profile('admin', ['accounts', 'students', 'update'], { pilotReady: true }),
})

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function isDescendant(parentPath, childPath) {
  const relative = path.relative(parentPath, childPath)
  return relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative)
}

export function assertCaptureWorkspacePath(repoRoot, candidatePath) {
  const requiredRoot = path.resolve(repoRoot, USER_MANUAL_SCREENSHOT_WORKSPACE_RELATIVE)
  const resolvedCandidate = path.resolve(candidatePath)
  assert(
    resolvedCandidate === requiredRoot || isDescendant(requiredRoot, resolvedCandidate),
    `Capture workspace must stay inside ${requiredRoot}: ${resolvedCandidate}`,
  )
  return resolvedCandidate
}

export function createUserManualScreenshotWorkspace(repoRoot, runId) {
  const workspaceRoot = assertCaptureWorkspacePath(
    repoRoot,
    path.join(repoRoot, USER_MANUAL_SCREENSHOT_WORKSPACE_RELATIVE, 'runs', runId),
  )
  const paths = {
    root: workspaceRoot,
    userDataRoot: path.join(workspaceRoot, 'user-data'),
    screenshots: path.join(workspaceRoot, 'screenshots'),
    temporary: path.join(workspaceRoot, 'temporary'),
    logs: path.join(workspaceRoot, 'logs'),
    manifest: path.join(workspaceRoot, 'manifest.json'),
  }

  Object.values(paths)
    .filter((item) => item !== paths.manifest)
    .forEach((directory) => fs.mkdirSync(directory, { recursive: true }))

  return paths
}

export function resolveUserManualScreenshotFixture(fixtureName, workspacePaths, actor) {
  const runtime = userManualScreenshotFixtureRuntime[fixtureName]
  assert(runtime, `Unknown screenshot fixture runtime: ${fixtureName}`)
  const account = actor === 'admin' || actor === 'teacher' ? actor : runtime.account

  const userDataDir = path.resolve(workspacePaths.userDataRoot, fixtureName, account)
  assert(isDescendant(workspacePaths.root, userDataDir),
    `Fixture userData must stay inside the run workspace: ${userDataDir}`)
  fs.mkdirSync(userDataDir, { recursive: true })

  return {
    name: fixtureName,
    ...runtime,
    account,
    userDataDir,
    credentials: account === 'teacher'
      ? { username: 'teacher_demo', password: 'admin123' }
      : account === 'admin'
        ? { username: 'admin', password: 'admin123' }
        : null,
    routeValues: USER_MANUAL_SCREENSHOT_ROUTE_VALUES,
  }
}

export function interpolateUserManualScreenshotRoute(scenario, routeValues = USER_MANUAL_SCREENSHOT_ROUTE_VALUES) {
  const scenarioRouteValues = {
    ...routeValues,
    ...USER_MANUAL_SCREENSHOT_SCENARIO_ROUTE_VALUE_OVERRIDES[scenario.id],
  }
  return scenario.route.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/gu, (_match, variable) => {
    const value = scenarioRouteValues[variable]
    assert(value !== undefined && value !== null && value !== '',
      `Scenario ${scenario.id} has no runtime value for route variable ${variable}`)
    return encodeURIComponent(String(value))
  })
}

export function validateUserManualScreenshotFixtureRuntime() {
  const declaredProfiles = Object.keys(userManualScreenshotFixtureProfiles).sort()
  const runtimeProfiles = Object.keys(userManualScreenshotFixtureRuntime).sort()
  assert(
    JSON.stringify(declaredProfiles) === JSON.stringify(runtimeProfiles),
    'Screenshot fixture runtime profiles do not match declared fixture profiles',
  )

  for (const scenario of userManualScreenshotScenarios) {
    assert(scenario.fixture in userManualScreenshotFixtureRuntime,
      `Scenario ${scenario.id} has no fixture runtime`)
    interpolateUserManualScreenshotRoute(scenario)
  }

  for (const id of USER_MANUAL_SCREENSHOT_PILOT_IDS) {
    const scenario = userManualScreenshotScenarios.find((item) => item.id === id)
    assert(scenario, `Pilot scenario does not exist: ${id}`)
    assert(userManualScreenshotFixtureRuntime[scenario.fixture].pilotReady,
      `Pilot scenario fixture is not marked ready: ${id} (${scenario.fixture})`)
  }

  return {
    profiles: runtimeProfiles.length,
    resolvedScenarios: userManualScreenshotScenarios.length,
    routeVariables: Object.keys(USER_MANUAL_SCREENSHOT_ROUTE_VALUES).length,
    pilotScenarios: USER_MANUAL_SCREENSHOT_PILOT_IDS.length,
    pilotReadyProfiles: runtimeProfiles.filter(
      (key) => userManualScreenshotFixtureRuntime[key].pilotReady,
    ).length,
  }
}
