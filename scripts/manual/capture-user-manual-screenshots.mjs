/**
 * Isolated, scenario-driven screenshot runner for the SCGP user manual.
 *
 * The output is a disposable workspace under output/. Approved screenshots are
 * promoted separately through the approval index. Risk-bearing scenarios also
 * require explicit safety flags.
 */

import { _electron as electron } from 'playwright'
import { execFile, spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

import {
  userManualScreenshotCaptureTargets,
  userManualScreenshotScenarios,
} from './user-manual-screenshot-scenarios.mjs'
import {
  USER_MANUAL_SCREENSHOT_PILOT_IDS,
  assertCaptureWorkspacePath,
  createUserManualScreenshotWorkspace,
  interpolateUserManualScreenshotRoute,
  resolveUserManualScreenshotFixture,
  validateUserManualScreenshotFixtureRuntime,
} from './user-manual-screenshot-fixtures.mjs'

const execFileAsync = promisify(execFile)
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..')
const defaultManualScreenshotDir = path.join(repoRoot, 'docs', 'user-manual', 'screenshots')

const FULL_ALLOWED_MODULES = ['sensory', 'emotional', 'social', 'life_skills', 'cognitive']
const SPECIALIZED_AUTOMATION_IDS = new Set([
  'S001',
  'S002',
  'S003',
  'S004',
  'S005',
  'S006',
  'S007',
  'S008',
  'S009',
  'S010',
  'S011',
  'S012',
  'S013',
  'S014',
  'S015',
  'S016',
  'S017',
  'S018',
  'S019',
  'S020',
  'S021',
  'S022',
  'S023',
  'S024',
  'S025',
  'S026',
  'S027',
  'S028',
  'S029',
  'S030',
  'S031',
  'S032',
  'S033',
  'S034',
  'S035',
  'S036',
  'S037',
  'S038',
  'S039',
  'S040',
  'S041',
  'S042',
  'S043',
  'S044',
  'S045',
  'S046',
  'S047',
  'S048',
  'S049',
  'S050',
  'S051',
  'S052',
  'S053',
  'S054',
  'S055',
  'S056',
  'S057',
  'S058',
  'S059',
  'S060',
  'S061',
  'S062',
  'S063',
  'S064',
  'S065',
  'S066',
  'S067',
  'S068',
  'S069',
  'S070',
  'S071',
  'S072',
  'S073',
  'S074',
  'S075',
  'S076',
  'S077',
  'S078',
  'S079',
  'S080',
  'S081',
  'S082',
  'S083',
  'S084',
  'S085',
  'S086',
  'S087',
  'S088',
  'S089',
  'S090',
  'S091',
  'S092',
  'S093',
  'S094',
  'S095',
  'S096',
  'S097',
  'S098',
  'S099',
  'S100',
  'S101',
  'S102',
  'S103',
  'S104',
  'S105',
  'S106',
  'S107',
  'S108',
  'S109',
  'S110',
  'S111',
  'S112',
  'S113',
  'S114',
  'S115',
  'S116',
  'S117',
  'S118',
  'S119',
  'S120',
  'S121',
  'S122',
  'S123',
  'S124',
  'S125',
  'S126',
  'S127',
  'S128',
  'S129',
  'S130',
  'S131',
  'S132',
  'S133',
  'S134',
  'S135',
  'S136',
  'S137',
  'S138',
  'S139',
  'S140',
  'S141',
  'S142',
  'S143',
  'S144',
  'S145',
  'S146',
  'S147',
  'S148',
  'S149',
  'S150',
  'S151',
  'S152',
  'S153',
  'S154',
  'S155',
  'S156',
  'S157',
  'S158',
  'S159',
  'S160',
  'S161',
  'S162',
  'S163',
  'S164',
  'S165',
  'S166',
  'S167',
  'S168',
  'S169',
  'S170',
  'S171',
  'S172',
  'S173',
  'S174',
  'S175',
  'S176',
  'S177',
  'S178',
  'S179',
  'S180',
  'S181',
  'S182',
  'S183',
  'S184',
  'S185',
  'S186',
  'S187',
  'S188',
  'S189',
  'S190',
  'S191',
  'S192',
  'S193',
  'S194',
  'S195',
  'S196',
  'S198',
  'S199',
  'S200',
  'S201',
  'S202',
  'S203',
  'S204',
  'S205',
  'S206',
  'S207',
  'S208',
  'S210',
  'S211',
  'S212',
  'S197',
  'S209',
])
const DOCUMENTED_AUTOMATION_IDS = new Set(userManualScreenshotScenarios.map((scenario) => scenario.id))
const SPECIAL_CAPTURE_AUTOMATION_IDS = new Set(['S004', 'S197'])
const DEMO_STUDENTS = Object.freeze([
  {
    id: 9001,
    name: '星愿一号',
    gender: '男',
    birthday: '2017-05-18',
    student_no: 'DEMO-2026-001',
    disorder: '发育迟缓',
    current_class_name: '星光一班',
  },
  {
    id: 9002,
    name: '星愿二号',
    gender: '女',
    birthday: '2018-09-08',
    student_no: 'DEMO-2026-002',
    disorder: '言语和语言发育障碍',
    current_class_name: '星光一班',
  },
  {
    id: 9003,
    name: '星愿三号',
    gender: '男',
    birthday: '2016-11-23',
    student_no: 'DEMO-2026-003',
    disorder: '注意缺陷多动障碍',
    current_class_name: null,
  },
  {
    id: 9004,
    name: '星愿幼儿',
    gender: '女',
    birthday: '2023-05-18',
    student_no: 'DEMO-2026-004',
    disorder: '发育迟缓',
    current_class_name: null,
  },
])

function timestampId() {
  return new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, 'Z')
}

function parseArgs(argv) {
  const options = {
    ids: [],
    dryRun: false,
    pilot: false,
    finalOutput: false,
    allowDemoWrite: false,
    allowIsolatedState: false,
    allowNative: false,
    runId: timestampId(),
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--pilot') options.pilot = true
    else if (arg === '--final-output') throw new Error(
      'Direct final output is disabled; use screenshot-approvals.json and promote-user-manual-screenshots.mjs',
    )
    else if (arg === '--allow-demo-write') options.allowDemoWrite = true
    else if (arg === '--allow-isolated-state') options.allowIsolatedState = true
    else if (arg === '--allow-native') options.allowNative = true
    else if (arg === '--ids') {
      options.ids.push(...String(argv[index + 1] || '').split(',').map((item) => item.trim()).filter(Boolean))
      index += 1
    } else if (arg.startsWith('--ids=')) {
      options.ids.push(...arg.slice('--ids='.length).split(',').map((item) => item.trim()).filter(Boolean))
    } else if (arg === '--run-id') {
      options.runId = argv[index + 1] || options.runId
      index += 1
    } else if (arg.startsWith('--run-id=')) {
      options.runId = arg.slice('--run-id='.length) || options.runId
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!/^[A-Za-z0-9._-]+$/u.test(options.runId)) {
    throw new Error(`Invalid run id: ${options.runId}`)
  }

  return options
}

function printHelp() {
  console.log(`Usage:
  node scripts/manual/capture-user-manual-screenshots.mjs --dry-run
  node scripts/manual/capture-user-manual-screenshots.mjs --pilot \
    --allow-demo-write --allow-isolated-state --allow-native
  node scripts/manual/capture-user-manual-screenshots.mjs --ids S001,S005

Options:
  --dry-run                 Validate all selected scenarios without launching Electron
  --pilot                   Select the 10 representative pilot scenarios
  --ids <S001,S002>         Select explicit screenshot IDs
  --allow-demo-write        Permit writes to the disposable demonstration database
  --allow-isolated-state    Permit controlled state changes inside isolated userData
  --allow-native            Permit OS-level capture for native-dialog scenarios
  --final-output            Unsupported; approved images must use the promotion script
  --run-id <id>             Stable run workspace name`)
}

function selectScenarios(options) {
  const ids = options.pilot
    ? USER_MANUAL_SCREENSHOT_PILOT_IDS
    : options.ids.length > 0
      ? options.ids
      : userManualScreenshotScenarios.map((scenario) => scenario.id)
  const selected = ids.map((id) => {
    const scenario = userManualScreenshotScenarios.find((item) => item.id === id)
    if (!scenario) throw new Error(`Unknown screenshot scenario: ${id}`)
    return scenario
  })
  if (new Set(selected.map((item) => item.id)).size !== selected.length) {
    throw new Error('Duplicate screenshot IDs were selected')
  }
  return selected
}

function assertSafetyAuthorization(scenario, options) {
  if (scenario.capture.safety === 'demo-write' && !options.allowDemoWrite) {
    throw new Error(`${scenario.id} requires --allow-demo-write`)
  }
  if (scenario.capture.safety === 'isolated-state' && !options.allowIsolatedState) {
    throw new Error(`${scenario.id} requires --allow-isolated-state`)
  }
  if (scenario.capture.mode === 'native' && !options.allowNative) {
    throw new Error(`${scenario.id} requires --allow-native`)
  }
}

function getScenarioOperationInstruction(scenario) {
  return {
    tier: SPECIALIZED_AUTOMATION_IDS.has(scenario.id) ? 'specialized' : 'documented',
    route: scenario.route,
    fixture: scenario.fixture,
    actions: scenario.actions,
    assertions: scenario.assertions,
    capture: {
      mode: scenario.capture.mode,
      target: scenario.capture.target,
      safety: scenario.capture.safety,
    },
  }
}

function validateScenarioOperationInstructions() {
  const scenarioIds = new Set()
  for (const scenario of userManualScreenshotScenarios) {
    if (scenarioIds.has(scenario.id)) {
      throw new Error(`Duplicate operation instruction: ${scenario.id}`)
    }
    scenarioIds.add(scenario.id)

    if (!DOCUMENTED_AUTOMATION_IDS.has(scenario.id)) {
      throw new Error(`Scenario ${scenario.id} has no documented operation instruction`)
    }

    const instruction = getScenarioOperationInstruction(scenario)
    if (!instruction.route || !instruction.fixture || instruction.actions.length === 0 || instruction.assertions.length === 0) {
      throw new Error(`Scenario ${scenario.id} has an incomplete operation instruction`)
    }
  }

  for (const id of SPECIALIZED_AUTOMATION_IDS) {
    if (!scenarioIds.has(id)) {
      throw new Error(`Specialized handler has no scenario instruction: ${id}`)
    }
    if (!SPECIAL_CAPTURE_AUTOMATION_IDS.has(id) && !prepareHandlers.has(id)) {
      throw new Error(`Specialized scenario has no registered automation handler: ${id}`)
    }
  }

  return {
    documented: DOCUMENTED_AUTOMATION_IDS.size,
    specialized: SPECIALIZED_AUTOMATION_IDS.size,
    pendingSpecialization: DOCUMENTED_AUTOMATION_IDS.size - SPECIALIZED_AUTOMATION_IDS.size,
  }
}

function createManifest(options, workspace, scenarios, screenshotDir) {
  return {
    schemaVersion: 1,
    runId: options.runId,
    createdAt: new Date().toISOString(),
    mode: options.dryRun ? 'dry-run' : options.pilot ? 'pilot' : 'selected',
    finalOutput: options.finalOutput,
    workspace: path.relative(repoRoot, workspace.root),
    screenshotDir: path.relative(repoRoot, screenshotDir),
    viewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
    isolation: {
      userDataRoot: path.relative(repoRoot, workspace.userDataRoot),
      realUserDataAccess: false,
      realUpdateSourceAccess: false,
      finalInstallAction: false,
    },
    scenarios: scenarios.map((scenario) => ({
      id: scenario.id,
      fixture: scenario.fixture,
      route: interpolateUserManualScreenshotRoute(scenario),
      finalOutputPath: scenario.outputPath,
      mode: scenario.capture.mode,
      safety: scenario.capture.safety,
      target: scenario.capture.target,
      operation: getScenarioOperationInstruction(scenario),
      status: options.dryRun ? 'validated' : 'pending',
    })),
  }
}

function writeManifest(workspace, manifest) {
  fs.writeFileSync(workspace.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

async function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close((error) => error ? reject(error) : resolve(port))
    })
  })
}

function requestUrl(urlString) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString)
    const client = url.protocol === 'https:' ? https : http
    const request = client.request({
      hostname: url.hostname,
      port: url.port,
      path: '/',
      method: 'GET',
      rejectUnauthorized: false,
    }, (response) => {
      response.resume()
      const statusCode = response.statusCode || 0
      if (statusCode > 0 && statusCode < 500) resolve()
      else reject(new Error(`Unexpected status code ${statusCode}`))
    })
    request.on('error', reject)
    request.setTimeout(3000, () => request.destroy(new Error('Dev server probe timed out')))
    request.end()
  })
}

async function waitForUrl(urlString, processHandle, timeoutMs = 60_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (processHandle.exitCode !== null) {
      throw new Error(`Vite exited early with code ${processHandle.exitCode}`)
    }
    try {
      await requestUrl(urlString)
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  throw new Error(`Timed out waiting for ${urlString}`)
}

async function startVite(workspace) {
  const port = await findAvailablePort()
  const useHttps = fs.existsSync(path.join(repoRoot, 'dev-cert.pem'))
    && fs.existsSync(path.join(repoRoot, 'dev-key.pem'))
  const url = `${useHttps ? 'https' : 'http'}://127.0.0.1:${port}`
  const viteCli = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js')
  const stdoutLog = fs.createWriteStream(path.join(workspace.logs, 'vite.log'), { flags: 'a' })
  const processHandle = spawn(process.execPath, [
    viteCli,
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ], {
    cwd: repoRoot,
    env: { ...process.env, ELECTRON: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  processHandle.stdout.pipe(stdoutLog)
  processHandle.stderr.pipe(stdoutLog)
  await waitForUrl(url, processHandle)
  return { processHandle, stdoutLog, url }
}

async function waitForApp(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await page.locator('#app').waitFor({ state: 'visible', timeout: 60_000 })
  await page.waitForFunction(() => Boolean(window.electronAPI && window.db), undefined, { timeout: 60_000 })
  await page.waitForTimeout(800)
}

async function stabilizePage(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0.001s !important;
        caret-color: transparent !important;
        transition-duration: 0.001s !important;
      }
      #__vue-devtools-container__,
      #vue-devtools-iframe {
        display: none !important;
        visibility: hidden !important;
      }
    `,
  }).catch(() => {})
  await page.evaluate(() => {
    document.documentElement.style.setProperty('scroll-behavior', 'auto')
    document.getElementById('__vue-devtools-container__')?.style.setProperty('display', 'none', 'important')
  }).catch(() => {})
}

async function configureElectronWindow(app, page) {
  const browserWindow = await app.browserWindow(page)
  await browserWindow.evaluate((window) => {
    window.webContents.closeDevTools()
    window.setFullScreen(true)
    window.show()
    window.focus()
  }).catch(() => {})
  await page.setViewportSize({ width: 1920, height: 1080 }).catch(() => {})
  await stabilizePage(page)
}

async function installActivationFixture(page, fixture) {
  if (fixture.activation !== 'full') return
  await page.evaluate(async ({ allowedModules }) => {
    const machineId = await window.electronAPI.getMachineId()
    const machineCode = String(machineId).slice(0, 16).toUpperCase()
    localStorage.setItem('sic_ads_activation_cache', JSON.stringify({
      version: '1.1',
      machineCode,
      activationCode: 'SPED-DEMO-MANUAL-CAPTURE',
      isActivated: true,
      isTrial: false,
      licenseType: 'full',
      allowedModules,
      cachedAt: new Date().toISOString(),
    }))
  }, { allowedModules: fixture.allowedModules })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await waitForApp(page)
  await stabilizePage(page)
}

async function seedFixture(page, fixture) {
  await page.evaluate(async ({ seedFamilies, students }) => {
    const db = window.db
    const hasSeed = (name) => seedFamilies.includes(name)

    if (hasSeed('accounts')) {
      const { hashPasswordV1 } = await import('/src/utils/password-security.ts')
      const { passwordHash, salt } = await hashPasswordV1('admin123')
      db.run('DELETE FROM user WHERE id = ? OR username = ?', [9002, 'teacher_demo'])
      db.run(
        `INSERT INTO user (id, username, password_hash, salt, role, name, email, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [9002, 'teacher_demo', passwordHash, salt, 'teacher', '演示教师', 'teacher@example.invalid', 1],
      )
      db.run('DELETE FROM user WHERE id = ? OR username = ?', [9004, 'delete_demo'])
      db.run(
        `INSERT INTO user (id, username, password_hash, salt, role, name, email, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [9004, 'delete_demo', passwordHash, salt, 'teacher', '可删除演示账号', 'delete-demo@example.invalid', 1],
      )
    }

    if (hasSeed('students')) {
      const columns = new Set(db.all('PRAGMA table_info(student)').map((row) => row.name))
      for (const student of students) {
        db.run('DELETE FROM student WHERE id = ? OR student_no = ?', [student.id, student.student_no])
        const values = {
          id: student.id,
          name: student.name,
          gender: student.gender,
          birthday: student.birthday,
          student_no: student.student_no,
          disorder: student.disorder,
          avatar_path: null,
          current_class_id: null,
          current_class_name: student.current_class_name,
          created_at: '2026-07-01 09:00:00',
          updated_at: '2026-07-28 09:00:00',
        }
        const names = Object.keys(values).filter((name) => columns.has(name))
        db.run(
          `INSERT INTO student (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
          names.map((name) => values[name]),
        )
      }
    }

    if (hasSeed('classes')) {
      const academicYear = '2026-2027'
      const previousAcademicYear = '2025-2026'
      const classRows = [
        [9201, '星光一班', 1, 1, academicYear, 12],
        [9202, '星光二班', 1, 2, academicYear, 12],
        [9203, '晨曦一班', 1, 1, previousAcademicYear, 12],
      ]
      db.run('DELETE FROM student_class_history WHERE student_id IN (?, ?, ?)', [9001, 9002, 9003])
      db.run('DELETE FROM sys_class_teachers WHERE class_id IN (?, ?, ?)', [9201, 9202, 9203])
      db.run('DELETE FROM sys_class WHERE id IN (?, ?, ?)', [9201, 9202, 9203])
      db.run('DELETE FROM sys_academic_year WHERE academic_year = ?', [academicYear])
      db.run('DELETE FROM sys_academic_year WHERE academic_year = ?', [previousAcademicYear])
      db.run(
        `INSERT INTO sys_academic_year (academic_year, start_date, end_date, is_active)
         VALUES (?, ?, ?, 0)`,
        [previousAcademicYear, '2025-09-01', '2026-07-31'],
      )
      db.run(
        `INSERT INTO sys_academic_year (academic_year, start_date, end_date, is_active)
         VALUES (?, ?, ?, 1)`,
        [academicYear, '2026-09-01', '2027-07-31'],
      )
      for (const [id, name, gradeLevel, classNumber, year, maxStudents] of classRows) {
        db.run(
          `INSERT INTO sys_class
            (id, name, grade_level, class_number, academic_year, max_students, current_enrollment, status)
           VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
          [id, name, gradeLevel, classNumber, year, maxStudents],
        )
      }
      db.run(
        `INSERT INTO student_class_history
          (student_id, student_name, class_id, class_name, academic_year, enrollment_date, leave_date, leave_reason, is_current)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [9001, students[0].name, 9203, '晨曦一班', previousAcademicYear, '2025-09-01', '2026-07-15', 'upgrade'],
      )
      db.run(
        `INSERT INTO student_class_history
          (student_id, student_name, class_id, class_name, academic_year, enrollment_date, is_current)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [9001, students[0].name, 9201, '星光一班', academicYear, '2026-09-01'],
      )
      db.run(
        `INSERT INTO student_class_history
          (student_id, student_name, class_id, class_name, academic_year, enrollment_date, is_current)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [9002, students[1].name, 9201, '星光一班', academicYear, '2026-09-01'],
      )
      db.run(
        'INSERT INTO sys_class_teachers (class_id, teacher_id, assigned_by) VALUES (?, ?, ?)',
        [9201, 9002, 1],
      )
      db.run('UPDATE student SET current_class_id = ?, current_class_name = ? WHERE id = ?', [9201, '星光一班', 9001])
      db.run('UPDATE student SET current_class_id = ?, current_class_name = ? WHERE id = ?', [9201, '星光一班', 9002])
      db.run('UPDATE student SET current_class_id = NULL, current_class_name = NULL WHERE id = ?', [9003])
    }

    if (hasSeed('plans')) {
      const resource = db.get(
        `SELECT id FROM sys_training_resource
         WHERE is_active = 1
           AND resource_type IN ('equipment', 'game', 'flashcard', 'emotion_scene', 'care_scene', 'self_care_task')
         ORDER BY id
         LIMIT 1`,
      )
      if (!resource?.id) {
        throw new Error('Plans fixture requires at least one active launchable training resource')
      }
      const today = new Date().toISOString().slice(0, 10)
      db.run('DELETE FROM sys_plan_resource_map WHERE plan_id IN (?, ?, ?)', [9601, 9602, 9603])
      db.run('DELETE FROM sys_training_plan WHERE id IN (?, ?, ?)', [9601, 9602, 9603])
      db.run(
        `INSERT INTO sys_training_plan
          (id, name, student_id, module_code, start_date, end_date, status, long_term_goals, short_term_goals, description, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          9601,
          '星愿一号今日训练计划',
          9001,
          'sensory',
          today,
          today,
          'active',
          JSON.stringify(['提升感官调节与训练参与度']),
          JSON.stringify(['完成一项演示训练资源']),
          '截图采集隔离演示计划',
        ],
      )
      db.run(
        `INSERT INTO sys_training_plan
          (id, name, student_id, module_code, start_date, end_date, status, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [9602, '已完成演示计划', 9002, 'sensory', today, today, 'completed'],
      )
      db.run(
        `INSERT INTO sys_training_plan
          (id, name, student_id, module_code, start_date, end_date, status, long_term_goals, short_term_goals, description, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          9603,
          '星愿一号草稿训练计划',
          9001,
          'sensory',
          today,
          today,
          'draft',
          JSON.stringify(['提升感官调节与训练参与度']),
          JSON.stringify(['完成一项演示训练资源']),
          '截图采集隔离草稿计划',
        ],
      )
      db.run(
        `INSERT INTO sys_plan_resource_map
          (plan_id, resource_id, frequency, duration_minutes, notes, sort_order)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [9601, resource.id, 3, 15, '截图采集演示资源'],
      )
      db.run(
        `INSERT INTO sys_plan_resource_map
          (plan_id, resource_id, frequency, duration_minutes, notes, sort_order)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [9603, resource.id, 2, 10, '草稿计划的演示教学提示'],
      )
    }

    if (hasSeed('assessments')) {
      const { smQuestions } = await import('/src/database/sm-questions.ts')
      smQuestions.forEach((question) => {
        db.run(
          `INSERT OR REPLACE INTO sm_question
            (id, dimension, age_stage, age_min, age_max, title, audio)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            question.id,
            question.dimension,
            question.age_stage,
            question.age_min,
            question.age_max,
            question.title,
            question.audio || null,
          ],
        )
      })
      db.run('DELETE FROM sm_assess_detail WHERE assess_id = ?', [9101])
      db.run('DELETE FROM sm_assess WHERE id = ?', [9101])
      db.run(
        `INSERT INTO sm_assess
          (id, student_id, age_stage, raw_score, sq_score, level, start_time, end_time, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [9101, 9001, 5, 88, 96, 'normal', '2026-07-20 09:00:00', '2026-07-20 09:35:00', '2026-07-20 09:35:00'],
      )
      const questions = smQuestions.slice(80, 96)
      questions.forEach((question, index) => {
        db.run(
          'INSERT INTO sm_assess_detail (assess_id, question_id, score, answer_time) VALUES (?, ?, ?, ?)',
          [9101, question.id, index % 2 === 0 ? 1 : 0, 900 + (index % 5) * 120],
        )
      })

      const weefimCategories = [
        [1, '自我照顾', '进食、个人清洁、洗澡、穿衣和如厕'],
        [2, '括约肌控制', '排尿和排便控制'],
        [3, '转移', '床椅、轮椅和浴室转移'],
        [4, '行走', '步行、上下楼梯和轮椅使用'],
        [5, '交流', '理解和表达'],
        [6, '社会认知', '社会交往、解决问题和记忆'],
      ]
      weefimCategories.forEach(([id, name, description]) => {
        db.run(
          'INSERT OR REPLACE INTO weefim_category (id, name, description) VALUES (?, ?, ?)',
          [id, name, description],
        )
      })

      const weefimQuestions = [
        [1, 1, '进食', 'selfcare'],
        [2, 1, '梳洗修饰', 'selfcare'],
        [3, 1, '洗澡', 'selfcare'],
        [4, 1, '穿上衣', 'selfcare'],
        [5, 1, '穿裤子', 'selfcare'],
        [6, 1, '上厕所', 'selfcare'],
        [7, 2, '排尿控制', 'sphincter'],
        [8, 2, '排便控制', 'sphincter'],
        [9, 3, '床椅转移', 'transfer'],
        [10, 3, '轮椅转移', 'transfer'],
        [11, 3, '进出浴盆/淋浴间', 'transfer'],
        [12, 4, '步行/上下楼梯', 'locomotion'],
        [13, 4, '使用轮椅', 'locomotion'],
        [14, 5, '理解', 'communication'],
        [15, 5, '表达', 'communication'],
        [16, 6, '社会交往', 'social_cognition'],
        [17, 6, '解决问题', 'social_cognition'],
        [18, 6, '记忆', 'social_cognition'],
      ]
      weefimQuestions.forEach(([id, categoryId, title, dimension]) => {
        db.run(
          'INSERT OR REPLACE INTO weefim_question (id, category_id, title, dimension, audio) VALUES (?, ?, ?, ?, NULL)',
          [id, categoryId, title, dimension],
        )
      })
      db.run('DELETE FROM weefim_assess_detail WHERE assess_id = ?', [9102])
      db.run('DELETE FROM weefim_assess WHERE id = ?', [9102])
      db.run(
        `INSERT INTO weefim_assess
          (id, student_id, total_score, adl_score, cognitive_score, level, start_time, end_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [9102, 9001, 97, 70, 27, '轻度依赖', '2026-07-21 10:00:00', '2026-07-21 10:28:00'],
      )
      const weefimScores = [6, 6, 6, 6, 5, 5, 6, 6, 5, 5, 5, 5, 4, 6, 6, 5, 5, 5]
      weefimScores.forEach((score, index) => {
        db.run(
          'INSERT INTO weefim_assess_detail (assess_id, question_id, score, answer_time) VALUES (?, ?, ?, ?)',
          [9102, index + 1, score, 720 + (index % 6) * 90],
        )
      })

      db.run('DELETE FROM csirs_assess_detail WHERE assess_id = ?', [9103])
      db.run('DELETE FROM csirs_assess WHERE id = ?', [9103])
      db.run(
        `INSERT INTO csirs_assess
          (id, student_id, age_months, raw_scores, t_scores, total_t_score, level, flags, start_time, end_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9103,
          9001,
          110,
          JSON.stringify({ vestibular: 39, tactile: 58, proprioception: 32, learning: 25, executive: 8 }),
          JSON.stringify({ vestibular: 45, tactile: 52, proprioception: 48, learning: 54, executive: 53.3 }),
          47,
          '正常',
          JSON.stringify([]),
          '2026-07-22 09:00:00',
          '2026-07-22 09:32:00',
        ],
      )

      const connersPsqRawScores = {
        conduct: 1.8,
        learning: 2.4,
        psychosomatic: 1.2,
        impulsivity_hyperactivity: 2.6,
        anxiety: 1.9,
        hyperactivity_index: 2.2,
      }
      const connersPsqTScores = {
        conduct: 58,
        learning: 64,
        psychosomatic: 56,
        impulsivity_hyperactivity: 66,
        anxiety: 60,
        hyperactivity_index: 64,
      }
      db.run('DELETE FROM conners_psq_assess WHERE id = ?', [9104])
      db.run(
        `INSERT INTO conners_psq_assess
          (id, student_id, gender, age_months, raw_scores, dimension_scores, t_scores,
           pi_score, ni_score, is_valid, invalid_reason, hyperactivity_index, level, start_time, end_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9104,
          9001,
          '男',
          110,
          JSON.stringify(connersPsqRawScores),
          JSON.stringify(connersPsqRawScores),
          JSON.stringify(connersPsqTScores),
          1.4,
          1.1,
          1,
          null,
          connersPsqTScores.hyperactivity_index,
          'borderline',
          '2026-07-23 14:00:00',
          '2026-07-23 14:25:00',
        ],
      )

      const connersTrsRawScores = {
        conduct: 2.1,
        hyperactivity: 2.8,
        inattention_passivity: 2.4,
        hyperactivity_index: 2.6,
      }
      const connersTrsTScores = {
        conduct: 62,
        hyperactivity: 74,
        inattention_passivity: 68,
        hyperactivity_index: 71,
      }
      db.run('DELETE FROM conners_trs_assess WHERE id = ?', [9105])
      db.run(
        `INSERT INTO conners_trs_assess
          (id, student_id, gender, age_months, raw_scores, dimension_scores, t_scores,
           pi_score, ni_score, is_valid, invalid_reason, hyperactivity_index, level, start_time, end_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9105,
          9001,
          '男',
          110,
          JSON.stringify(connersTrsRawScores),
          JSON.stringify(connersTrsRawScores),
          JSON.stringify(connersTrsTScores),
          0.8,
          1.4,
          1,
          null,
          connersTrsTScores.hyperactivity_index,
          'clinical',
          '2026-07-24 10:00:00',
          '2026-07-24 10:20:00',
        ],
      )

      const sdqDimensionScores = {
        emotional: { name: '情绪症状', rawScore: 4, level: 'normal', levelName: '正常' },
        conduct: { name: '品行问题', rawScore: 3, level: 'normal', levelName: '正常' },
        hyperactivity: { name: '多动/注意力不集中', rawScore: 5, level: 'borderline', levelName: '边缘' },
        peer: { name: '同伴交往问题', rawScore: 4, level: 'normal', levelName: '正常' },
        prosocial: { name: '亲社会行为', rawScore: 7, level: 'normal', levelName: '优秀' },
        total_difficulties: { name: '困难总分', rawScore: 16, level: 'borderline', levelName: '边缘' },
      }
      db.run('DELETE FROM sdq_assess WHERE id = ?', [9106])
      db.run(
        `INSERT INTO sdq_assess
          (id, student_id, age_months, raw_scores, dimension_scores, total_difficulties_score,
           prosocial_score, level, is_valid, start_time, end_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9106,
          9001,
          110,
          JSON.stringify({}),
          JSON.stringify(sdqDimensionScores),
          16,
          7,
          'borderline',
          1,
          '2026-07-25 09:00:00',
          '2026-07-25 09:18:00',
        ],
      )

      const srs2DimensionScores = {
        awareness: { name: '社交觉察', rawScore: 16, itemCount: 8, tScore: 62, level: 'mild', levelName: '轻度' },
        cognition: { name: '社交认知', rawScore: 18, itemCount: 12, tScore: 65, level: 'mild', levelName: '轻度' },
        communication: { name: '社交沟通', rawScore: 20, itemCount: 22, tScore: 69, level: 'moderate', levelName: '中度' },
        motivation: { name: '社交动机', rawScore: 17, itemCount: 11, tScore: 67, level: 'moderate', levelName: '中度' },
        repetitive: { name: '刻板行为', rawScore: 15, itemCount: 12, tScore: 63, level: 'mild', levelName: '轻度' },
      }
      db.run('DELETE FROM srs2_assess WHERE id = ?', [9107])
      db.run(
        `INSERT INTO srs2_assess
          (id, student_id, age_months, gender, raw_answers, dimension_scores, total_raw_score,
           total_t_score, total_level, start_time, end_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9107,
          9001,
          110,
          'male',
          JSON.stringify({}),
          JSON.stringify(srs2DimensionScores),
          86,
          68,
          'moderate',
          '2026-07-26 10:00:00',
          '2026-07-26 10:24:00',
        ],
      )

      const cbclBehaviorRawScores = {
        '抑郁': 9,
        '社交退缩': 7,
        '体诉': 6,
        '交往不良': 10,
        '强迫性': 8,
        '多动': 13,
        '攻击性': 12,
        '违纪': 8,
      }
      const cbclFactorTScores = {
        '抑郁': 66,
        '社交退缩': 63,
        '体诉': 61,
        '交往不良': 67,
        '强迫性': 64,
        '多动': 71,
        '攻击性': 70,
        '违纪': 66,
      }
      db.run('DELETE FROM cbcl_assess WHERE id = ?', [9108])
      db.run(
        `INSERT INTO cbcl_assess (
          id, student_id, age_months, gender, social_competence_data,
          social_activity_score, social_social_score, social_school_score,
          raw_answers, behavior_raw_scores, factor_t_scores,
          total_problems_score, total_problems_t_score, internalizing_t_score,
          externalizing_t_score, summary_level, start_time, end_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9108,
          9001,
          110,
          'male',
          JSON.stringify({ reporter: '演示教师', sports: {}, hobbies: {}, organizations: {}, labor: {} }),
          3.5,
          3.0,
          2.5,
          JSON.stringify({}),
          JSON.stringify(cbclBehaviorRawScores),
          JSON.stringify(cbclFactorTScores),
          73,
          68,
          67,
          70,
          'clinical',
          '2026-07-27 09:00:00',
          '2026-07-27 09:30:00',
        ],
      )

      const cnbsDomainResults = [
        { code: 'gm', name: '大运动', itemCount: 6, passedCount: 5, failedCount: 1, autoFilledPassedCount: 0, autoFilledFailedCount: 0, mentalAge: 72, maxMentalAge: 84, achievementRate: 85.7, dq: 92, dqStatus: 'normal', level: '中等' },
        { code: 'fm', name: '精细动作', itemCount: 6, passedCount: 5, failedCount: 1, autoFilledPassedCount: 0, autoFilledFailedCount: 0, mentalAge: 70, maxMentalAge: 84, achievementRate: 83.3, dq: 90, dqStatus: 'normal', level: '中等' },
        { code: 'ad', name: '适应能力', itemCount: 6, passedCount: 4, failedCount: 2, autoFilledPassedCount: 0, autoFilledFailedCount: 0, mentalAge: 67, maxMentalAge: 84, achievementRate: 78.6, dq: 86, dqStatus: 'normal', level: '中等' },
        { code: 'la', name: '语言', itemCount: 6, passedCount: 4, failedCount: 2, autoFilledPassedCount: 0, autoFilledFailedCount: 0, mentalAge: 64, maxMentalAge: 84, achievementRate: 76.2, dq: 82, dqStatus: 'normal', level: '中等' },
        { code: 'sb', name: '社会行为', itemCount: 6, passedCount: 3, failedCount: 3, autoFilledPassedCount: 0, autoFilledFailedCount: 0, mentalAge: 60, maxMentalAge: 84, achievementRate: 71.4, dq: 77, dqStatus: 'borderline', level: '临界偏低' },
      ]
      const cnbsDomainFeedback = [
        { domain: 'gm', domainName: '大运动', dqStatus: 'normal', headline: '大运动发展处于当前年龄段的中等范围。', content: '可继续通过平衡、跳跃和路线游戏巩固动作计划能力。', advice: [{ tag: '训练建议', text: '每周安排 2-3 次平衡与协调活动。' }] },
        { domain: 'fm', domainName: '精细动作', dqStatus: 'normal', headline: '精细动作表现稳定。', content: '可在生活活动中增加剪贴、串珠和双手协作任务。', advice: [{ tag: '训练建议', text: '保持短时、重复的手部操作练习。' }] },
        { domain: 'ad', domainName: '适应能力', dqStatus: 'normal', headline: '适应能力处于中等范围。', content: '在日常流程中使用视觉提示，逐步增加独立完成步骤。', advice: [{ tag: '训练建议', text: '将复杂任务拆分为清晰的连续步骤。' }] },
        { domain: 'la', domainName: '语言', dqStatus: 'normal', headline: '语言能力达到当前年龄段的基本要求。', content: '建议在自然对话中扩展描述和复述机会。', advice: [{ tag: '训练建议', text: '结合绘本与情境提问扩展表达。' }] },
        { domain: 'sb', domainName: '社会行为', dqStatus: 'borderline', headline: '社会行为需要持续观察与支持。', content: '可通过轮流、规则和同伴合作活动强化社交参与。', advice: [{ tag: '训练建议', text: '从一对一合作任务逐步过渡到小组活动。' }] },
      ]
      db.run('DELETE FROM cnbsr2016_assess_detail WHERE assess_id = ?', [9109])
      db.run('DELETE FROM cnbsr2016_assess WHERE id = ?', [9109])
      db.run(
        `INSERT INTO cnbsr2016_assess (
          id, student_id, age_months, total_mental_age, dq, dq_status, age_bracket,
          level, level_code, domain_results, domain_feedback, iep_targets,
          iep_interventions, overall_rule, expert_clinical, start_time, end_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9109,
          9001,
          78,
          67,
          86,
          'normal',
          'a4',
          '中等',
          'normal',
          JSON.stringify(cnbsDomainResults),
          JSON.stringify(cnbsDomainFeedback),
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify({ summary: '总体发育商处于中等范围，能区之间存在一定差异。', strengths: '大运动与精细动作是当前相对优势。', suggestions: '持续关注社会行为与同伴互动中的主动参与。' }),
          JSON.stringify({ clinical: '本结果用于教育支持与训练规划，不替代医学诊断。', followup: '建议结合课堂与家庭观察，每 3-6 个月复评。' }),
          '2026-07-28 10:00:00',
          '2026-07-28 10:26:00',
        ],
      )

      const tgmdSkillResults = [
        { questionId: 1, itemCode: 'A1', dimensionName: '位移技能', name: '快速跑', score: 7, maxScore: 8, percentage: 87.5, criteria: ['手臂与腿协调摆动', '跑动中出现腾空阶段'] },
        { questionId: 2, itemCode: 'A2', dimensionName: '位移技能', name: '马步跳', score: 6, maxScore: 8, percentage: 75, criteria: ['保持前后脚顺序', '双臂配合节奏摆动'] },
        { questionId: 3, itemCode: 'A3', dimensionName: '位移技能', name: '单脚连续跳', score: 5, maxScore: 6, percentage: 83.3, criteria: ['保持单脚连续起跳', '落地时维持平衡'] },
        { questionId: 4, itemCode: 'A4', dimensionName: '位移技能', name: '跨步跳', score: 7, maxScore: 8, percentage: 87.5, criteria: ['左右脚交替跨步', '手臂协调摆动'] },
        { questionId: 5, itemCode: 'A5', dimensionName: '位移技能', name: '立定跳远', score: 6, maxScore: 8, percentage: 75, criteria: ['起跳前屈膝蓄力', '双脚同时落地'] },
        { questionId: 6, itemCode: 'A6', dimensionName: '位移技能', name: '侧滑步', score: 7, maxScore: 8, percentage: 87.5, criteria: ['身体保持侧向', '侧跨与并步连贯'] },
        { questionId: 7, itemCode: 'B1', dimensionName: '球类技能', name: '双手持棒击定位球', score: 6, maxScore: 8, percentage: 75, criteria: ['双手正确握棒', '击球后完整随挥'] },
        { questionId: 8, itemCode: 'B2', dimensionName: '球类技能', name: '单手持拍击反弹球', score: 5, maxScore: 8, percentage: 62.5, criteria: ['向后引拍', '击球时迈步'] },
        { questionId: 9, itemCode: 'B3', dimensionName: '球类技能', name: '单手原地拍球', score: 6, maxScore: 8, percentage: 75, criteria: ['以手指控制球', '连续拍球并接住'] },
        { questionId: 10, itemCode: 'B4', dimensionName: '球类技能', name: '双手接球', score: 5, maxScore: 6, percentage: 83.3, criteria: ['提前准备双手', '主动迎球缓冲'] },
        { questionId: 11, itemCode: 'B5', dimensionName: '球类技能', name: '踢定位球', score: 6, maxScore: 8, percentage: 75, criteria: ['助跑后支撑脚定位', '用脚背击球'] },
        { questionId: 12, itemCode: 'B6', dimensionName: '球类技能', name: '过肩投球', score: 5, maxScore: 8, percentage: 62.5, criteria: ['侧身蓄力', '跨步后过肩投掷'] },
        { questionId: 13, itemCode: 'B7', dimensionName: '球类技能', name: '下手抛球', score: 6, maxScore: 8, percentage: 75, criteria: ['手臂后摆', '向前跨步抛出'] },
      ]
      const tgmdDomainResults = [
        { code: 'locomotor', name: '位移技能', rawScore: 38, maxScore: 46, percentage: 82.6, normLevel: 3, normLabel: '平均水平（稳步发展）', level: '发展良好', severity: 'success' },
        { code: 'ball_skills', name: '球类技能', rawScore: 39, maxScore: 54, percentage: 72.2, normLevel: 2, normLabel: '中度偏差（需关注与支持）', level: '需要支持', severity: 'warning' },
      ]
      const tgmdDomainFeedback = [
        { code: 'locomotor', title: '位移技能发展稳定', label: '结果解读', content: '跑、跳与移动中的身体协调性表现较稳定。', advice: '在障碍路线和节奏变化中继续练习动作计划。' },
        { code: 'ball_skills', title: '球类技能需要强化', label: '结果解读', content: '接、拍、踢和投掷动作可继续在分解练习中建立稳定性。', advice: '从大目标、慢速度开始，逐步增加距离和合作要求。' },
      ]
      db.run('DELETE FROM tgmd_3_assess_detail WHERE assess_id = ?', [9110])
      db.run('DELETE FROM tgmd_3_assess WHERE id = ?', [9110])
      db.run(
        `INSERT INTO tgmd_3_assess (
          id, student_id, age_months, gender, locomotor_score, locomotor_percent,
          locomotor_level, ball_skills_score, ball_skills_percent, ball_skills_level,
          total_score, total_percent, total_level, level, level_code, domain_results,
          domain_feedback, skill_results, norm_summary, iep_targets, flags, overall_rule,
          start_time, end_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9110,
          9001,
          110,
          'male',
          38,
          82.6,
          3,
          39,
          72.2,
          2,
          77,
          77,
          2,
          '需要支持',
          'support',
          JSON.stringify(tgmdDomainResults),
          JSON.stringify(tgmdDomainFeedback),
          JSON.stringify(tgmdSkillResults),
          JSON.stringify({ locomotorLevel: 3, locomotorLabel: '平均水平（稳步发展）', ballLevel: 2, ballLabel: '中度偏差（需关注与支持）', totalLevel: 2, totalLabel: '中度偏差（需关注与支持）' }),
          JSON.stringify([
            { questionId: 8, itemCode: 'B2', title: '单手持拍击反弹球', dimensionName: '球类技能', score: 5, maxScore: 8, priority: 1, rationale: '反弹球击打的动作衔接仍需稳定。', advice: '使用大球和固定落点开展短距离练习。' },
            { questionId: 12, itemCode: 'B6', title: '过肩投球', dimensionName: '球类技能', score: 5, maxScore: 8, priority: 2, rationale: '投掷中的侧身与跨步配合需要强化。', advice: '采用目标墙和地面脚印提示练习。' },
          ]),
          JSON.stringify([]),
          JSON.stringify({ id: 'tgmd3-demo', title: '总体运动能力', severity: 'warning', summary: '整体动作发展具备良好基础，球类技能是近期训练重点。', content: '建议在安全、可预测的运动情境中，增加接球、拍球和投掷的重复练习。', advice: ['每周安排 2-3 次球类协调练习。', '从单项动作逐步过渡到连续组合动作。'] }),
          '2026-07-29 09:00:00',
          '2026-07-29 09:24:00',
        ],
      )
      tgmdSkillResults.forEach((skill) => {
        db.run(
          `INSERT INTO tgmd_3_assess_detail (
            assess_id, question_id, item_code, dimension, score, max_score,
            raw_value, criteria_snapshot, answer_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            9110,
            skill.questionId,
            skill.itemCode,
            skill.dimensionName === '位移技能' ? 'locomotor' : 'ball_skills',
            skill.score,
            skill.maxScore,
            String(skill.score),
            JSON.stringify(skill.criteria),
            60 + skill.questionId * 10,
          ],
        )
      })

      const gmfmDomainResults = [
        { code: 'A', name: '卧位与翻身', rawScore: 45, maxScore: 51, percentage: 88.2, ntCount: 0, itemCount: 17, level: '表现稳定', severity: 'success' },
        { code: 'B', name: '坐位', rawScore: 52, maxScore: 60, percentage: 86.7, ntCount: 0, itemCount: 20, level: '表现稳定', severity: 'success' },
        { code: 'C', name: '爬与跪', rawScore: 34, maxScore: 42, percentage: 81, ntCount: 0, itemCount: 14, level: '继续巩固', severity: 'success' },
        { code: 'D', name: '站立', rawScore: 28, maxScore: 39, percentage: 71.8, ntCount: 0, itemCount: 13, level: '需要支持', severity: 'warning' },
        { code: 'E', name: '走、跑、跳', rawScore: 50, maxScore: 72, percentage: 69.4, ntCount: 1, itemCount: 24, level: '需要支持', severity: 'warning' },
      ]
      const gmfmDomainFeedback = [
        { code: 'A', title: '卧位与翻身基础稳定', label: '结果解读', content: '基础姿势转换表现稳定，可在游戏中保持活动参与。', advice: '继续在日常活动中练习左右侧转换。' },
        { code: 'B', title: '坐位控制良好', label: '结果解读', content: '静态与动态坐位控制已具备良好基础。', advice: '增加坐位下的手部操作与重心转移。' },
        { code: 'C', title: '爬与跪需要巩固', label: '结果解读', content: '爬行与跪姿转换可继续强化稳定性和耐力。', advice: '采用软垫路线和分段目标提高持续时间。' },
        { code: 'D', title: '站立需要支持', label: '结果解读', content: '无支撑站立与单脚平衡是近期练习重点。', advice: '从短时站立开始，逐步减少外部支撑。' },
        { code: 'E', title: '走、跑、跳需持续训练', label: '结果解读', content: '动态平衡、跨越和连续跳跃表现仍有提升空间。', advice: '在安全路线游戏中安排走、跑、跳的连续练习。' },
      ]
      db.run('DELETE FROM gmfm_88_assess_detail WHERE assess_id = ?', [9111])
      db.run('DELETE FROM gmfm_88_assess WHERE id = ?', [9111])
      db.run(
        `INSERT INTO gmfm_88_assess (
          id, student_id, age_months, total_score, raw_total_score, total_max_score,
          level, level_code, domain_results, domain_feedback, iep_targets, flags,
          overall_rule, start_time, end_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9111,
          9001,
          110,
          79.2,
          209,
          264,
          '需要持续支持',
          'support',
          JSON.stringify(gmfmDomainResults),
          JSON.stringify(gmfmDomainFeedback),
          JSON.stringify([
            { questionId: 56, itemCode: 'D5', title: '站立：无支撑，抬起一脚10秒（左）', dimensionName: '站立', score: 1, isNt: false, priority: 1, rationale: '单脚平衡尚未稳定。', advice: '使用扶持物和地面标记进行短时单脚平衡练习。' },
            { questionId: 77, itemCode: 'E13', title: '无支撑：右脚单脚跳10次', dimensionName: '走、跑、跳', score: 0, isNt: true, priority: 2, rationale: '该项目本次未完成测试。', advice: '先从双脚连续跳和单脚原地起跳开始准备。' },
          ]),
          JSON.stringify([{ code: 'dynamic-balance', title: '动态平衡需持续观察', severity: 'warning', content: '站立与走跑跳能区的动态平衡表现存在差异。', advice: '结合课堂、家庭和训练场景持续观察。' }]),
          JSON.stringify({ id: 'gmfm88-demo', title: '总体运动能力', severity: 'warning', summary: '粗大运动功能具备良好基础，站立及走、跑、跳能区需要持续支持。', content: '建议以动态平衡、重心转移和连续动作衔接为近期训练重点。', advice: ['每周安排 2-3 次平衡与移动路线练习。', '从可预测的单项动作逐步增加连续任务。'] }),
          '2026-07-30 09:00:00',
          '2026-07-30 09:32:00',
        ],
      )

      const { FINE_MOTOR_QUESTIONS } = await import('/src/database/fine-motor-questions.ts')
      const fineMotorPartialQuestionIds = new Set([20, 55, 70])
      const fineMotorDomainResults = [
        { code: 'hand_grasp', rawScore: 30, maxScore: 30, masteryRate: 1, status: 'age_appropriate', severity: 'success', level: '发展适龄' },
        { code: 'finger_dexterity', rawScore: 31, maxScore: 32, masteryRate: 0.9688, status: 'age_appropriate', severity: 'success', level: '发展适龄' },
        { code: 'bilateral_coordination', rawScore: 30, maxScore: 30, masteryRate: 1, status: 'age_appropriate', severity: 'success', level: '发展适龄' },
        { code: 'vmi', rawScore: 39, maxScore: 40, masteryRate: 0.975, status: 'age_appropriate', severity: 'success', level: '发展适龄' },
        { code: 'pre_writing', rawScore: 23, maxScore: 24, masteryRate: 0.9583, status: 'age_appropriate', severity: 'success', level: '发展适龄' },
        { code: 'self_care', rawScore: 20, maxScore: 20, masteryRate: 1, status: 'age_appropriate', severity: 'success', level: '发展适龄' },
      ]
      db.run('DELETE FROM fine_motor_assess_detail WHERE assess_id = ?', [9112])
      db.run('DELETE FROM fine_motor_assess WHERE id = ?', [9112])
      db.run(
        `INSERT INTO fine_motor_assess (
          id, student_id, age_months, total_score, standard_score, level, level_code,
          total_max_score, total_mastery_rate, domain_results, iep_targets, start_time, end_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9112,
          9001,
          110,
          173,
          115,
          '发展适龄',
          'age_appropriate',
          176,
          0.983,
          JSON.stringify(fineMotorDomainResults),
          JSON.stringify([]),
          '2026-07-31 10:00:00',
          '2026-07-31 10:28:00',
        ],
      )
      FINE_MOTOR_QUESTIONS.forEach((question) => {
        const score = fineMotorPartialQuestionIds.has(question.id) ? 1 : 2
        db.run(
          `INSERT INTO fine_motor_assess_detail (
            assess_id, question_id, dimension, score, answer_time, is_auto_filled, auto_fill_reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [9112, question.id, question.dimension, score, 40 + question.id, 0, null],
        )
      })

      const briefDimensionScores = {
        inhibit: { name: '抑制', rawScore: 16, tScore: 61, levelName: '轻度升高' },
        shift: { name: '转换', rawScore: 14, tScore: 57, levelName: '典型范围' },
        emotional_control: { name: '情绪控制', rawScore: 18, tScore: 64, levelName: '轻度升高' },
        working_memory: { name: '工作记忆', rawScore: 20, tScore: 67, levelName: '需关注' },
        plan_organize: { name: '计划与组织', rawScore: 17, tScore: 62, levelName: '轻度升高' },
      }
      db.run('DELETE FROM brief_assess WHERE id = ?', [9113])
      db.run(
        `INSERT INTO brief_assess (
          id, student_id, age_months, gender, version, raw_answers, dimension_scores,
          total_raw_score, total_t_score, level, level_code, extra_data, start_time, end_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9113,
          9001,
          110,
          'male',
          'school',
          JSON.stringify({}),
          JSON.stringify(briefDimensionScores),
          85,
          63,
          '轻度升高',
          'elevated',
          JSON.stringify({ gec: 63, draftNorm: true }),
          '2026-08-01 09:00:00',
          '2026-08-01 09:22:00',
        ],
      )

      const crtUnitScores = {
        unit_a: { name: 'A组 知觉辨别', correct: 11, total: 12 },
        unit_b: { name: 'B组 类同比较', correct: 10, total: 12 },
        unit_c: { name: 'C组 比较推理', correct: 9, total: 12 },
        unit_d: { name: 'D组 系列关系', correct: 8, total: 12 },
        unit_e: { name: 'E组 抽象推理', correct: 7, total: 12 },
      }
      db.run('DELETE FROM crt_assess WHERE id = ?', [9114])
      db.run(
        `INSERT INTO crt_assess (
          id, student_id, age_months, gender, raw_answers, total_raw_score, total_questions,
          percentile_rank, iq_estimate, level, level_code, unit_scores, extra_data, start_time, end_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9114,
          9001,
          110,
          'male',
          JSON.stringify({}),
          45,
          60,
          68,
          107,
          '中等偏上',
          'above_average',
          JSON.stringify(crtUnitScores),
          JSON.stringify({ draftNorm: true, strengths: ['知觉辨别与类同比较表现稳定'], weaknesses: ['抽象推理可继续强化'] }),
          '2026-08-02 10:00:00',
          '2026-08-02 10:20:00',
        ],
      )

      const cognitiveUnitScores = {
        basic: { name: '基础图形匹配', correct: 9, total: 10 },
        detail: { name: '细节辨别', correct: 8, total: 10 },
      }
      db.run('DELETE FROM cognitive_self_assess WHERE id = ?', [9115])
      db.run(
        `INSERT INTO cognitive_self_assess (
          id, student_id, age_months, gender, raw_answers, total_raw_score, total_questions,
          percentile_rank, iq_estimate, level, level_code, unit_scores, accuracy_rate,
          avg_response_time, extra_data, start_time, end_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9115,
          9001,
          110,
          'male',
          JSON.stringify({}),
          17,
          20,
          64,
          106,
          '中等偏上',
          'above_average',
          JSON.stringify(cognitiveUnitScores),
          0.85,
          2180,
          JSON.stringify({ draftNorm: true, accuracyAvailable: true, reactionAvailable: true, hasRealData: true }),
          '2026-08-03 09:00:00',
          '2026-08-03 09:08:00',
        ],
      )
    }

    if (hasSeed('games')) {
      db.run('DELETE FROM training_session WHERE source_table = ? AND source_record_id = ?', ['training_records', 9501])
      db.run('DELETE FROM training_records WHERE id = ?', [9501])
      db.run(
        `INSERT INTO training_records (
          id, student_id, resource_type, session_type, entry_code,
          timestamp, duration, accuracy_rate, avg_response_time, raw_data,
          class_id, class_name, module_code, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9501,
          9001,
          'game',
          'custom_game',
          'social-communication',
          Date.parse('2026-07-25T10:00:00.000Z'),
          246_000,
          0.875,
          1360,
          JSON.stringify({
            gameCode: 'S01_BURGER',
            durationMs: 246_000,
            performanceData: {
              accuracy: 0.875,
              turnCount: 8,
              correctTurns: 7,
              partnerSupport: '提示后可稳定轮流完成配料',
              average_response_ms: 1360,
            },
          }),
          9201,
          '星光一班',
          'social',
          '2026-07-25 10:04:06',
        ],
      )
      db.run('DELETE FROM game_emotion_records WHERE id = ?', [9501])
      db.run(
        `INSERT INTO game_emotion_records (
          id, student_id, game_code, start_time, duration_ms, difficulty_level,
          completion_status, performance_data, session_group_id, exit_trigger, session_participants, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9501,
          9001,
          'G01_BALLOON',
          '2026-07-26T09:30:00.000Z',
          184_000,
          2,
          'completed',
          JSON.stringify({
            successful_cycles: 4,
            perfect_cycles: 3,
            failed_releases: 1,
            longest_inhale_ms: 4200,
            accuracy_ratio: 0.8,
            average_response_ms: 1180,
            event: 'game_complete',
          }),
          null,
          'game_complete',
          JSON.stringify([9001]),
          '2026-07-26 09:33:04',
        ],
      )
      db.run(
        `DELETE FROM training_session
         WHERE source_table = ? AND source_record_id IN (?, ?)`,
        ['manual_screenshot_fixture', 9516, 9517],
      )
      const sessions = [
        [
          9516,
          '2026-07-28T10:20:00.000Z',
          '2026-07-28T10:21:12.000Z',
          72_000,
          'aborted',
          0.5,
          1680,
          JSON.stringify({
            gameCode: 'K03_PATTERN_NEXT',
            trainingEntryCode: 'cognitive',
            exitTrigger: 'teacher_exit',
            metrics: { completed_rounds: 1, target_round_count: 3 },
          }),
        ],
        [
          9517,
          '2026-07-27T09:10:00.000Z',
          '2026-07-27T09:12:05.000Z',
          125_000,
          'completed',
          1,
          1240,
          JSON.stringify({
            gameCode: 'K03_PATTERN_NEXT',
            trainingEntryCode: 'cognitive',
            exitTrigger: 'game_complete',
            metrics: { completed_rounds: 3, target_round_count: 3 },
          }),
        ],
      ]
      for (const [sourceRecordId, startedAt, endedAt, durationMs, completionStatus, accuracyRate, averageResponseMs, summaryPayload] of sessions) {
        db.run(
          `INSERT INTO training_session (
            student_id, module_code, entry_code, session_family,
            resource_type, task_name_snapshot, class_id, class_name,
            started_at, ended_at, duration_ms, completion_status,
            accuracy_rate, avg_response_time_ms, summary_payload,
            source_table, source_record_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            9001,
            'cognitive',
            'cognitive',
            'cognitive_game',
            'game',
            '图形找规律',
            9201,
            '星光一班',
            startedAt,
            endedAt,
            durationMs,
            completionStatus,
            accuracyRate,
            averageResponseMs,
            summaryPayload,
            'manual_screenshot_fixture',
            sourceRecordId,
          ],
        )
      }
    }

    if (hasSeed('equipment')) {
      const equipment = db.get(
        `SELECT id FROM sys_training_resource
         WHERE module_code = 'sensory'
           AND resource_type = 'equipment'
           AND is_active = 1
         ORDER BY id
         LIMIT 1`,
      )
      if (!equipment?.id) {
        throw new Error('Equipment fixture requires an active sensory equipment resource')
      }
      const columns = new Set(db.all('PRAGMA table_info(equipment_training_records)').map((row) => row.name))
      const values = {
        id: 9524,
        student_id: 9001,
        equipment_id: equipment.id,
        entry_code: 'sensory-integration',
        score: 4,
        prompt_level: 2,
        duration_seconds: 720,
        notes: '演示器材训练记录：在口头提示下完成。',
        generated_comment: '本次训练表现稳定。',
        training_date: '2026-07-24T09:30:00.000Z',
        teacher_name: '演示教师',
        environment: '训练室',
        batch_id: null,
        class_id: 9201,
        class_name: '星光一班',
        module_code: 'sensory',
      }
      const names = Object.keys(values).filter((name) => columns.has(name))
      db.run('DELETE FROM equipment_training_records WHERE id = ?', [values.id])
      db.run(
        `INSERT INTO equipment_training_records (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
        names.map((name) => values[name]),
      )
    }

    if (hasSeed('self-care')) {
      const taskMetadata = JSON.stringify({
        trainingMode: 'step_task',
        trainingEntryCode: 'life-skills',
        legacyTaskCode: 'MANUAL_BRUSH_TEETH_001',
        category: {
          parentId: 4,
          parentName: '个人卫生',
          childId: 41,
          childName: '口腔清洁',
        },
        abilityItem: {
          id: 'hygiene_01',
          name: '口腔清洁',
        },
        steps: [
          {
            id: 'manual_brush_teeth_step_1',
            seq: 1,
            text: '取出牙刷并挤上适量牙膏',
            imagePath: 'images/tasks/BRUSH_TEETH_001/1.png',
          },
          {
            id: 'manual_brush_teeth_step_2',
            seq: 2,
            text: '按顺序清洁牙齿内外侧',
            imagePath: 'images/tasks/BRUSH_TEETH_001/2.png',
          },
        ],
      })
      db.run('DELETE FROM sys_resource_tag_map WHERE resource_id = ?', [9201])
      db.run('DELETE FROM sys_training_resource WHERE id = ?', [9201])
      db.run(
        `INSERT INTO sys_training_resource (
          id, module_code, resource_type, name, category, description,
          cover_image, is_custom, is_active, legacy_id, legacy_source,
          meta_data, usage_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9201,
          'life_skills',
          'task_training',
          '演示刷牙任务',
          '口腔清洁',
          '演示用两步骤口腔清洁训练任务。',
          'images/tasks/BRUSH_TEETH_001_cover.jpg',
          0,
          1,
          9201,
          'manual_screenshot_fixture',
          taskMetadata,
          0,
        ],
      )
    }

    if (hasSeed('records')) {
      const game = db.get(
        `SELECT id FROM sys_training_resource
         WHERE module_code = 'sensory'
           AND resource_type = 'game'
           AND is_active = 1
         ORDER BY id
         LIMIT 1`,
      )
      const equipment = db.get(
        `SELECT id FROM sys_training_resource
         WHERE module_code = 'sensory'
           AND resource_type = 'equipment'
           AND is_active = 1
         ORDER BY id
         LIMIT 1`,
      )
      if (!game?.id || !equipment?.id) {
        throw new Error('Records fixture requires active sensory game and equipment resources')
      }
      db.run(
        `DELETE FROM training_session
         WHERE source_table = ? AND source_record_id IN (?, ?)`,
        ['training_records', 9530, 9531],
      )
      db.run('DELETE FROM training_records WHERE id IN (?, ?)', [9530, 9531])
      const gameRows = [
        [9530, '2026-07-28T10:00:00.000Z', 180, 0.88, 1160],
        [9531, '2026-07-26T14:30:00.000Z', 240, 0.75, 1480],
      ]
      for (const [id, timestamp, duration, accuracyRate, averageResponseTime] of gameRows) {
        db.run(
          `INSERT INTO training_records (
            id, student_id, resource_id, resource_type, session_type, entry_code,
            timestamp, duration, accuracy_rate, avg_response_time, raw_data,
            class_id, class_name, module_code, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            9001,
            game.id,
            'game',
            'sensory_game',
            'sensory-integration',
            Date.parse(timestamp),
            duration,
            accuracyRate,
            averageResponseTime,
            JSON.stringify({ gameCode: 'SENSORY_DEMO', source: 'manual_screenshot_fixture' }),
            null,
            '星光一班',
            'sensory',
            timestamp.replace('T', ' ').replace('.000Z', ''),
          ],
        )
      }

      const columns = new Set(db.all('PRAGMA table_info(equipment_training_records)').map((row) => row.name))
      const equipmentRows = [
        [9532, '2026-07-27T09:20:00.000Z', 4, 2, 660, '演示器材记录：口头提示后完成。'],
        [9533, '2026-07-25T15:10:00.000Z', 5, 1, 780, '演示器材记录：独立完成训练。'],
      ]
      db.run('DELETE FROM equipment_training_records WHERE id IN (?, ?)', [9532, 9533])
      for (const [id, trainingDate, score, promptLevel, durationSeconds, notes] of equipmentRows) {
        const values = {
          id,
          student_id: 9001,
          equipment_id: equipment.id,
          entry_code: 'sensory-integration',
          score,
          prompt_level: promptLevel,
          duration_seconds: durationSeconds,
          notes,
          generated_comment: '隔离演示记录，用于训练记录筛选。',
          training_date: trainingDate,
          teacher_name: '演示教师',
          environment: '训练室',
          batch_id: null,
          class_id: null,
          class_name: '星光一班',
          module_code: 'sensory',
        }
        const names = Object.keys(values).filter((name) => columns.has(name))
        db.run(
          `INSERT INTO equipment_training_records (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
          names.map((name) => values[name]),
        )
      }
    }

    if (hasSeed('reports')) {
      const emotionResource = db.get(
        `SELECT id FROM sys_training_resource
         WHERE module_code = 'emotional'
           AND resource_type = 'emotion_scene'
           AND is_active = 1
         ORDER BY id
         LIMIT 1`,
      )
      if (!emotionResource?.id) {
        throw new Error('Reports fixture requires an active emotional scene resource')
      }

      db.run(
        `DELETE FROM emotional_training_detail
         WHERE session_id IN (
           SELECT id FROM emotional_training_session WHERE training_record_id = ?
         )`,
        [9540],
      )
      db.run('DELETE FROM emotional_training_session WHERE training_record_id = ?', [9540])
      db.run('DELETE FROM training_session WHERE source_table = ? AND source_record_id = ?', ['training_records', 9540])
      db.run('DELETE FROM training_records WHERE id = ?', [9540])
      db.run(
        `INSERT INTO training_records (
          id, student_id, resource_id, resource_type, session_type, entry_code,
          timestamp, duration, accuracy_rate, avg_response_time, raw_data,
          class_id, class_name, module_code, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9540,
          9001,
          emotionResource.id,
          'emotion_scene',
          'emotion_scene',
          'emotional-regulation',
          Date.parse('2026-07-27T10:00:00.000Z'),
          180,
          0.8,
          1400,
          JSON.stringify({ source: 'manual_screenshot_fixture' }),
          null,
          '星光一班',
          'emotional',
          '2026-07-27 10:03:00',
        ],
      )
      db.run(
        `INSERT INTO emotional_training_session (
          training_record_id, student_id, module_code, sub_module,
          resource_id, resource_type, start_time, end_time, duration_ms,
          question_count, correct_count, accuracy_rate, hint_count,
          retry_count, completion_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          9540,
          9001,
          'emotional',
          'emotion_scene',
          emotionResource.id,
          'emotion_scene',
          '2026-07-27T10:00:00.000Z',
          '2026-07-27T10:03:00.000Z',
          180_000,
          5,
          4,
          0.8,
          1,
          0,
          'completed',
          '2026-07-27 10:03:00',
        ],
      )

      db.run('DELETE FROM report_record WHERE id IN (?, ?, ?)', [9541, 9542, 9543])
      const reports = [
        [9541, 9001, 'sm', 9101, null, null, 'S-M 量表演示报告', 'life_skills', '2026-07-28 09:30:00'],
        [9542, 9001, 'emotional', null, null, 9540, '情绪行为调节演示报告', 'emotional', '2026-07-27 10:05:00'],
        [9543, 9002, 'training', null, null, null, '训练计划演示报告', 'sensory', '2026-07-26 14:20:00'],
      ]
      for (const [id, studentId, reportType, assessId, planId, trainingRecordId, title, moduleCode, createdAt] of reports) {
        db.run(
          `INSERT INTO report_record (
            id, student_id, report_type, assess_id, plan_id, training_record_id,
            title, class_id, class_name, module_code, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            studentId,
            reportType,
            assessId,
            planId,
            trainingRecordId,
            title,
            null,
            '星光一班',
            moduleCode,
            createdAt,
            createdAt,
          ],
        )
      }
    }

    if (hasSeed('resources')) {
      const sourceEquipment = db.get(
        `SELECT cover_image FROM sys_training_resource
         WHERE module_code = 'sensory'
           AND resource_type = 'equipment'
           AND is_active = 1
           AND TRIM(COALESCE(cover_image, '')) != ''
         ORDER BY id
         LIMIT 1`,
      )
      if (!sourceEquipment?.cover_image) {
        throw new Error('Resources fixture requires a sensory equipment cover image')
      }
      const fixtureResources = [
        [9550, '演示平衡训练器材', '隔离截图夹具：用于平衡、姿势控制与前庭觉训练。', 1],
        [9551, '演示可删除训练器材', '隔离截图夹具：仅用于软删除确认。', 1],
        [9552, '演示可恢复训练器材', '隔离截图夹具：已禁用，等待恢复。', 0],
      ]
      for (const [id, name, description, isActive] of fixtureResources) {
        db.run('DELETE FROM sys_resource_tag_map WHERE resource_id = ?', [id])
        db.run('DELETE FROM sys_training_resource WHERE id = ?', [id])
        db.run(
          `INSERT INTO sys_training_resource (
            id, module_code, resource_type, name, category, description,
            cover_image, is_custom, is_active, legacy_id, legacy_source,
            meta_data, usage_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            'sensory',
            'equipment',
            name,
            'vestibular',
            description,
            sourceEquipment.cover_image,
            1,
            isActive,
            id,
            'manual_screenshot_fixture',
            JSON.stringify({ fixture: 'resources' }),
            0,
          ],
        )
      }
      for (const tagName of ['平衡能力', '前庭刺激', '姿势控制']) {
        db.run(
          `INSERT OR IGNORE INTO sys_tags (domain, name, usage_count, is_preset)
           VALUES (?, ?, 0, 0)`,
          ['ability', tagName],
        )
        const tag = db.get('SELECT id FROM sys_tags WHERE domain = ? AND name = ?', ['ability', tagName])
        if (tag?.id) {
          for (const resourceId of fixtureResources.map(([id]) => id)) {
            db.run('INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id) VALUES (?, ?)', [resourceId, tag.id])
          }
        }
      }

      const teachingMaterials = [
        [9560, '演示感官训练指导手册', 'sensory-training', '演示感官训练指导手册.pdf', 'pdf', 'teaching-materials/fixtures/demo-sensory-guide.pdf', 32_768, '隔离截图夹具：包含训练目标、操作提示与观察记录。', '感官训练,操作指导', 10],
        [9561, '演示情绪调节活动卡', 'emotional-regulation', '演示情绪调节活动卡.docx', 'docx', 'teaching-materials/fixtures/demo-emotion-card.docx', 16_384, '隔离截图夹具：用于情绪识别与调节活动。', '情绪调节,活动卡', 9],
      ]
      db.run('DELETE FROM teaching_material_favorite WHERE material_id IN (?, ?)', [9560, 9561])
      db.run('DELETE FROM teaching_material WHERE id IN (?, ?)', [9560, 9561])
      for (const [id, title, dimensionCode, fileName, fileType, filePath, fileSizeBytes, description, tags, sequenceOrder] of teachingMaterials) {
        const moduleCode = dimensionCode === 'emotional-regulation' ? 'emotional' : 'sensory'
        db.run(
          `INSERT INTO teaching_material (
            id, title, dimension_code, module_code, file_name, file_type, file_path,
            file_size_bytes, description, tags, sequence_order, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            title,
            dimensionCode,
            moduleCode,
            fileName,
            fileType,
            filePath,
            fileSizeBytes,
            description,
            tags,
            sequenceOrder,
            '2026-07-28 10:00:00',
            '2026-07-28 10:00:00',
          ],
        )
      }
      const admin = db.get("SELECT id FROM user WHERE username = 'admin' LIMIT 1")
      if (!admin?.id) {
        throw new Error('Resources fixture requires the default administrator account')
      }
      db.run(
        'INSERT INTO teaching_material_favorite (user_id, material_id, created_at) VALUES (?, ?, ?)',
        [admin.id, 9560, '2026-07-28 10:00:00'],
      )
    }

    if (hasSeed('ai-disabled')) {
      db.run('UPDATE ai_agent SET enabled = 0')
    }

    if (hasSeed('ai')) {
      const admin = db.get("SELECT id FROM user WHERE username = 'admin' LIMIT 1")
      const primaryAgent = db.get("SELECT code FROM ai_agent WHERE code = 'special_ed_teacher' AND enabled = 1 LIMIT 1")
      const supportAgent = db.get(
        "SELECT code FROM ai_agent WHERE code != 'special_ed_teacher' AND enabled = 1 ORDER BY sort, id LIMIT 1",
      )
      if (!admin?.id || !primaryAgent?.code || !supportAgent?.code) {
        throw new Error('AI fixture requires administrator and two enabled built-in agents')
      }

      db.run("UPDATE ai_provider SET api_key_enc = ?, enabled = 1 WHERE code = 'deepseek'", [
        'manual-screenshot-fixture',
      ])
      db.run("UPDATE ai_provider_model SET enabled = 1 WHERE provider_code = 'deepseek'")
      db.run(
        `INSERT INTO system_config (key, value, description)
         VALUES ('ai_active_provider', 'deepseek', '用户手册隔离截图夹具')
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      db.run(
        `INSERT INTO system_config (key, value, description)
         VALUES ('ai_enabled', '1', '用户手册隔离截图夹具')
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      db.run("DELETE FROM system_config WHERE key LIKE 'ai:privacy_ack:user:%'")

      const customAgentCode = 'manual_capture_training_support'
      db.run(
        'DELETE FROM ai_agent_skill WHERE agent_id IN (SELECT id FROM ai_agent WHERE code = ?)',
        [customAgentCode],
      )
      db.run('DELETE FROM ai_agent WHERE code = ?', [customAgentCode])
      db.run(
        `INSERT INTO ai_agent (code, name, system_prompt, enabled, sort, created_at, updated_at)
         VALUES (?, ?, ?, 1, 99, ?, ?)`,
        [
          customAgentCode,
          '演示自定义训练助手',
          '这是用户手册隔离截图夹具中的自定义训练支持智能体。',
          '2026-07-28 08:00:00',
          '2026-07-28 08:00:00',
        ],
      )
      const customAgent = db.get('SELECT id FROM ai_agent WHERE code = ?', [customAgentCode])
      const knowledgeSkill = db.all(
        `SELECT id, knowledge_payload FROM ai_skill
         WHERE kind = 'knowledge' AND enabled = 1
         ORDER BY sort, id`,
      ).find((skill) => {
        try {
          const references = JSON.parse(String(skill.knowledge_payload || '{}')).references
          return Array.isArray(references) && references.length > 0
        } catch {
          return false
        }
      })
      if (!customAgent?.id || !knowledgeSkill?.id) {
        throw new Error('AI fixture requires a custom agent and an enabled knowledge skill')
      }
      db.run(
        `INSERT INTO ai_agent_skill (agent_id, skill_id, enabled, sort, config)
         VALUES (?, ?, 1, 0, ?)`,
        [customAgent.id, knowledgeSkill.id, JSON.stringify({ referenceIds: [] })],
      )

      db.run('DELETE FROM ai_chat_message WHERE session_id IN (?, ?)', [9701, 9702])
      db.run('DELETE FROM ai_chat_session WHERE id IN (?, ?)', [9701, 9702])
      const sessions = [
        [9701, admin.id, primaryAgent.code, '资源教室训练安排', '2026-07-28 09:15:00', '2026-07-28 09:20:00'],
        [9702, admin.id, supportAgent.code, '课堂沟通支持记录', '2026-07-27 14:10:00', '2026-07-27 14:16:00'],
      ]
      for (const [id, userId, agentCode, title, createdAt, updatedAt] of sessions) {
        db.run(
          `INSERT INTO ai_chat_session (id, user_id, agent_code, title, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, userId, agentCode, title, createdAt, updatedAt],
        )
      }
      const messages = [
        [9711, 9701, 'user', '请帮我安排一节 20 分钟的资源教室训练。', 0, 0, 0, 0, '2026-07-28 09:15:00'],
        [9712, 9701, 'assistant', '可以先确认训练目标、学生当前表现和可用材料，再安排活动步骤。', 246, 134, 112, 0, '2026-07-28 09:20:00'],
        [9721, 9702, 'user', '请记录今天课堂中的沟通支持策略。', 0, 0, 0, 0, '2026-07-27 14:10:00'],
        [9722, 9702, 'assistant', '已按等待时间、视觉提示和替代表达三个观察点整理。', 182, 96, 86, 0, '2026-07-27 14:16:00'],
      ]
      for (const [id, sessionId, role, content, tokensTotal, tokensPrompt, tokensCompletion, estCostYuan, createdAt] of messages) {
        db.run(
          `INSERT INTO ai_chat_message (
            id, session_id, role, content, tokens_total, tokens_prompt,
            tokens_completion, est_cost_yuan, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, sessionId, role, content, tokensTotal, tokensPrompt, tokensCompletion, estCostYuan, createdAt],
        )
      }
    }

    await db.saveNow()
  }, {
    seedFamilies: fixture.seedFamilies,
    students: DEMO_STUDENTS,
  })
}

async function loginFixture(page, fixture) {
  if (!fixture.credentials) return
  await page.locator('input[autocomplete="username"]').fill(fixture.credentials.username)
  await page.locator('input[autocomplete="current-password"]').fill(fixture.credentials.password)
  await page.getByRole('button', { name: '登录系统' }).click()
  await page.waitForURL(/#\/dashboard(?:$|\?)/u, { timeout: 30_000 })
  await page.getByText('首页看板', { exact: false }).first().waitFor({ state: 'visible', timeout: 30_000 })
}

async function launchFixtureSession(viteUrl, workspace, fixtureName, actor) {
  const fixture = resolveUserManualScreenshotFixture(fixtureName, workspace, actor)
  const app = await electron.launch({
    args: ['.'],
    cwd: repoRoot,
    env: {
      ...process.env,
      ELECTRON: 'true',
      SCGP_DEV_SERVER_URL: viteUrl,
      SCGP_MANUAL_SCREENSHOT_CAPTURE: 'true',
      SCGP_TEST_USER_DATA_DIR: fixture.userDataDir,
    },
  })
  const page = await app.firstWindow()
  await waitForApp(page)
  await configureElectronWindow(app, page)
  await installActivationFixture(page, fixture)
  await seedFixture(page, fixture)
  await loginFixture(page, fixture)
  return { app, page, fixture }
}

async function navigateHash(page, route) {
  await page.evaluate((nextRoute) => {
    window.location.hash = `#${nextRoute}`
  }, route)
  await page.waitForTimeout(150)
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await page.waitForTimeout(900)
  await stabilizePage(page)
}

async function redactSensitiveValues(page) {
  await page.evaluate(() => {
    const machineCode = document.querySelector('.machine-code-text')
    if (machineCode) machineCode.textContent = 'SCGP-DEMO-0000001'
    document.querySelectorAll('.system-about-list__row').forEach((row) => {
      if (row.querySelector('dt')?.textContent?.trim() === '机器码') {
        const value = row.querySelector('dd')
        if (value) value.textContent = 'SCGP-DEMO-0000001'
      }
    })
    document.querySelectorAll('input').forEach((input) => {
      const placeholder = input.getAttribute('placeholder') || ''
      if (/API Key|激活码/u.test(placeholder) && input.value) input.value = '••••••••••••'
    })
  })
}

async function expectText(page, textValue, timeout = 20_000) {
  await page.getByText(textValue, { exact: false }).first().waitFor({ state: 'visible', timeout })
}

async function prepareS001(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '首页看板')
  await page.locator('.ai-floating-button').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS002(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '首页看板')
  await page.locator('.user-role').filter({ hasText: '教师' }).waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('.sidebar-nav .nav-item').filter({ hasText: '学生管理' }).first()
    .waitFor({ state: 'visible', timeout: 20_000 })

  for (const adminOnlyLabel of ['系统管理', '班级管理', '学生分班']) {
    const adminOnlyItem = page.locator('.sidebar-nav .nav-item').filter({ hasText: adminOnlyLabel })
    if (await adminOnlyItem.count() > 0) {
      throw new Error(`Teacher navigation must not expose ${adminOnlyLabel}`)
    }
  }
}

async function prepareS003(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '软件未激活')
  await expectText(page, '您的机器码')
}

async function prepareS005(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '用户登录')
  await page.locator('input[autocomplete="username"]').waitFor({ state: 'visible' })
}

async function prepareS006(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '用户登录')
  await page.locator('input[autocomplete="username"]').fill('manual-demo-invalid')
  await page.locator('input[autocomplete="current-password"]').fill('invalid-password')
  await page.getByRole('button', { name: '登录系统' }).click()
  await expectText(page, '用户名或密码错误，请检查后重试。')
}

async function prepareS007(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '首页看板')
  await page.getByRole('button', { name: '打开用户菜单' }).click()
  await page.getByText('个人资料', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
  await page.getByText('AI 聊天记录', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
  await page.getByText('退出登录', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareDashboard(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '首页看板')
}

async function prepareS008(page, scenario, fixture) {
  await prepareDashboard(page, scenario, fixture)
  await page.locator('.dashboard-hero').waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(page, '待评估提醒')
  await page.locator('.home-agent-card').first().waitFor({ state: 'visible', timeout: 30_000 })
}

async function prepareS009(page, scenario, fixture) {
  await prepareDashboard(page, scenario, fixture)
  const schedule = page.locator('.schedule-item').filter({ hasText: '星愿一号今日训练计划' }).first()
  await schedule.waitFor({ state: 'visible', timeout: 30_000 })
  await schedule.getByRole('button', { name: '开始训练' }).waitFor({ state: 'visible', timeout: 20_000 })
  await schedule.scrollIntoViewIfNeeded()
}

async function prepareS010(page, scenario, fixture) {
  await prepareDashboard(page, scenario, fixture)
  await page.locator('.dashboard-surface').filter({ hasText: 'AI 助手' }).getByText('暂无已启用的 AI 智能体，请联系学校管理员')
    .waitFor({ state: 'visible', timeout: 30_000 })
}

async function prepareS011(page, scenario, fixture) {
  await prepareDashboard(page, scenario, fixture)
  const schedulePanel = page.locator('.schedule-panel')
  await schedulePanel.getByText('今日暂无训练安排').waitFor({ state: 'visible', timeout: 30_000 })
  await schedulePanel.scrollIntoViewIfNeeded()
  await page.locator('.dashboard-hero').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS012(page, scenario, fixture) {
  await navigateHash(page, '/dashboard')
  await expectText(page, '首页看板')
  await page.getByRole('button', { name: '打开用户菜单' }).click()
  await page.getByText('个人资料', { exact: true }).click()
  await page.waitForURL(/#\/profile(?:$|\?)/u, { timeout: 20_000 })
  await expectText(page, '基本信息')
  await page.locator('.profile-avatar-field').waitFor({ state: 'visible', timeout: 20_000 })
  await page.getByRole('button', { name: '本地上传' }).waitFor({ state: 'visible', timeout: 20_000 })
  await page.getByRole('button', { name: '拍照' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS013(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const logs = page.locator('.profile-panel--logs')
  await logs.scrollIntoViewIfNeeded()
  await expectText(page, '登录日志')
  await logs.locator('.profile-log-table').waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(page, '默认显示最近 20 条登录记录')
}

async function prepareS014(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const passwordForm = page.locator('.password-form')
  await passwordForm.scrollIntoViewIfNeeded()
  await passwordForm.locator('input[placeholder="请输入当前密码"]').waitFor({ state: 'visible', timeout: 20_000 })
  await passwordForm.locator('input[placeholder="请输入新密码（至少6位）"]').waitFor({ state: 'visible', timeout: 20_000 })
  await passwordForm.getByRole('button', { name: '修改密码' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareStudentsPage(page, scenario, fixture) {
  const openDialog = page.locator('.dialog-content').first()
  if (await openDialog.isVisible().catch(() => false)) {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForApp(page)
  }
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '学生管理')
}

async function openStudentDialog(page, scenario, fixture) {
  await prepareStudentsPage(page, scenario, fixture)
  await page.getByRole('button', { name: '添加学生' }).click()
  await page.locator('.dialog-content').waitFor({ state: 'visible', timeout: 20_000 })
}

async function selectElementPlusOption(page, selectLocator, label) {
  await selectLocator.locator('.el-select__wrapper').click()
  await page.locator('.el-select-dropdown:visible .el-select-dropdown__item')
    .filter({ hasText: label }).last().click()
}

async function prepareS015(page, scenario, fixture) {
  await prepareStudentsPage(page, scenario, fixture)
  await page.locator('.student-card').filter({ hasText: DEMO_STUDENTS[0].name }).waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForFunction(() => document.querySelectorAll('.student-card').length >= 3, undefined, { timeout: 20_000 })
  await page.locator('.student-filter-section').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS016(page, scenario, fixture) {
  await prepareStudentsPage(page, scenario, fixture)
  await page.locator('input[placeholder="搜索学生姓名、学号、诊断类型..."]').fill('星愿')
  await page.getByRole('button', { name: '男', exact: true }).click()
  await selectElementPlusOption(page, page.locator('.compact-select').nth(0), '发育迟缓')
  await selectElementPlusOption(page, page.locator('.compact-select').nth(1), '星光一班')
  const card = page.locator('.student-card').filter({ hasText: DEMO_STUDENTS[0].name }).first()
  await card.waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForFunction(() => document.querySelectorAll('.student-card').length === 1, undefined, { timeout: 20_000 })
}

async function prepareS018(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const records = page.locator('.records-shell')
  await records.scrollIntoViewIfNeeded()
  await records.getByRole('tab', { name: /评估记录/u }).waitFor({ state: 'visible', timeout: 20_000 })
  await records.getByRole('tab', { name: /器材训练/u }).waitFor({ state: 'visible', timeout: 20_000 })
  await records.getByRole('tab', { name: /游戏训练/u }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS019(page, scenario, fixture) {
  await openStudentDialog(page, scenario, fixture)
  await expectText(page, '添加学生')
  await page.locator('input#name').waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('input#studentNo').waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('select#gender').waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('#birthday').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS020(page, scenario, fixture) {
  await openStudentDialog(page, scenario, fixture)
  const avatarPicker = page.locator('.avatar-picker')
  await avatarPicker.scrollIntoViewIfNeeded()
  await avatarPicker.getByRole('radiogroup', { name: '学生预置头像' }).waitFor({ state: 'visible', timeout: 20_000 })
  await avatarPicker.getByRole('button', { name: '本地上传' }).waitFor({ state: 'visible', timeout: 20_000 })
  await avatarPicker.getByRole('button', { name: '拍照' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS021(page, scenario, fixture) {
  await openStudentDialog(page, scenario, fixture)
  const dialog = page.locator('.dialog-content')
  await dialog.locator('select#disorder').scrollIntoViewIfNeeded()
  await dialog.locator('select#disorder').waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.locator('select#classId').waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.locator('.avatar-picker').waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByRole('button', { name: '保存' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS022(page, scenario, fixture) {
  await prepareStudentsPage(page, scenario, fixture)
  const card = page.locator('.student-card').filter({ hasText: DEMO_STUDENTS[0].name }).first()
  await card.locator('.student-card__menu-button').click()
  await page.getByRole('menuitem', { name: '编辑' }).click()
  await expectText(page, '编辑学生')
  await page.locator('input#name').waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('.avatar-picker').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS024(page, scenario, fixture) {
  await prepareStudentsPage(page, scenario, fixture)
  await page.getByRole('button', { name: '批量导入' }).click()
  await expectText(page, '批量导入学生')
  await page.getByRole('button', { name: '下载模板' }).waitFor({ state: 'visible', timeout: 20_000 })
  await page.getByRole('button', { name: '选择文件' }).waitFor({ state: 'visible', timeout: 20_000 })
  await page.getByRole('button', { name: '开始导入' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareClassesPage(page, scenario, fixture) {
  const openDialog = page.getByRole('dialog').first()
  if (await openDialog.isVisible().catch(() => false)) {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForApp(page)
  }
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '班级管理')
}

async function prepareS025(page, scenario, fixture) {
  await prepareClassesPage(page, scenario, fixture)
  await page.locator('.year-filter').waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('.class-card').filter({ hasText: '星光一班' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS026(page, scenario, fixture) {
  await prepareClassesPage(page, scenario, fixture)
  await page.getByRole('button', { name: '新建班级' }).click()
  await page.getByRole('dialog', { name: '新建班级' }).waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(page, '学年')
  await expectText(page, '年级')
}

async function prepareS027(page, scenario, fixture) {
  await prepareClassesPage(page, scenario, fixture)
  await page.getByRole('button', { name: '批量创建' }).click()
  const dialog = page.getByRole('dialog', { name: '批量创建班级' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(page, '每个年级班数')
  await dialog.getByRole('button', { name: '确定' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS028(page, scenario, fixture) {
  await prepareClassesPage(page, scenario, fixture)
  const card = page.locator('.class-card').filter({ hasText: '星光一班' }).first()
  await card.getByRole('button', { name: '编辑' }).click()
  await page.getByRole('dialog', { name: '编辑班级' }).waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(page, '星光一班')
}

async function prepareS029(page, scenario, fixture) {
  await prepareClassesPage(page, scenario, fixture)
  const card = page.locator('.class-card').filter({ hasText: '星光二班' }).first()
  await card.locator('.class-card__menu-button').click()
  await page.getByRole('menuitem', { name: '删除' }).click()
  await expectText(page, '确认删除')
  await expectText(page, '星光二班')
}

async function prepareS030(page, scenario, fixture) {
  await prepareClassesPage(page, scenario, fixture)
  await page.getByRole('button', { name: '学年管理' }).click()
  const dialog = page.getByRole('dialog', { name: '学年管理' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByRole('button', { name: '新增学年' }).waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(page, '当前学年')
}

async function prepareS031(page, scenario, fixture) {
  await prepareClassesPage(page, scenario, fixture)
  await page.getByRole('button', { name: '学年管理' }).click()
  const managementDialog = page.getByRole('dialog', { name: '学年管理' })
  await managementDialog.waitFor({ state: 'visible', timeout: 20_000 })
  await managementDialog.getByRole('button', { name: '新增学年' }).click()
  const formDialog = page.getByRole('dialog', { name: '新增学年' })
  await formDialog.waitFor({ state: 'visible', timeout: 20_000 })
  await formDialog.locator('input[placeholder="例如 2026-2027"]').waitFor({ state: 'visible', timeout: 20_000 })
  await formDialog.getByText('设为当前学年').waitFor({ state: 'visible', timeout: 20_000 })
  await formDialog.getByRole('button', { name: '确定' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS032(page, scenario, fixture) {
  await prepareClassesPage(page, scenario, fixture)
  const card = page.locator('.class-card').filter({ hasText: '星光一班' }).first()
  await card.getByRole('button', { name: '学生' }).click()
  const dialog = page.getByRole('dialog', { name: /星光一班 - 学生列表/u })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByText(DEMO_STUDENTS[0].name).waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByRole('button', { name: '添加学生' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS033(page, scenario, fixture) {
  await prepareClassesPage(page, scenario, fixture)
  const card = page.locator('.class-card').filter({ hasText: '星光二班' }).first()
  await card.getByRole('button', { name: '分配老师' }).click()
  const dialog = page.getByRole('dialog', { name: /星光二班 - 分配老师/u })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByText('已分配老师').waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByText('添加老师').waitFor({ state: 'visible', timeout: 20_000 })
  await selectElementPlusOption(page, dialog.locator('.el-select'), '演示教师 (teacher_demo)')
}

async function prepareStudentClassAssignment(page, scenario, fixture) {
  const openDialog = page.getByRole('dialog').first()
  if (await openDialog.isVisible().catch(() => false)) {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForApp(page)
  }
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const assignmentPage = page.locator('.student-class-page')
  await assignmentPage.waitFor({ state: 'visible', timeout: 20_000 })
  await assignmentPage.getByRole('heading', { name: '学生分班' }).waitFor({ state: 'visible', timeout: 20_000 })
  const assignTab = assignmentPage.getByRole('tab', { name: '分班管理' })
  if (await assignTab.getAttribute('aria-selected') !== 'true') {
    await assignTab.click()
  }
  await assignmentPage.locator('.student-list-card').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS034(page, scenario, fixture) {
  await prepareStudentClassAssignment(page, scenario, fixture)
  await page.getByRole('button', { name: '未分班', exact: true }).click()
  await page.getByText(DEMO_STUDENTS[2].name, { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('.compact-select').nth(1).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS035(page, scenario, fixture) {
  await prepareStudentClassAssignment(page, scenario, fixture)
  await page.getByRole('button', { name: '未分班', exact: true }).click()
  const studentRow = page.locator('.el-table__row').filter({ hasText: DEMO_STUDENTS[2].name }).first()
  await studentRow.getByRole('button', { name: '分班' }).click()
  const dialog = page.getByRole('dialog', { name: '学生分班' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByText('选择班级').waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByRole('button', { name: '确定' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS036(page, scenario, fixture) {
  await prepareStudentClassAssignment(page, scenario, fixture)
  const selectionBoxes = page.locator('.student-list-card .el-table__body-wrapper .el-checkbox')
  await selectionBoxes.nth(0).click()
  await selectionBoxes.nth(1).click()
  await page.getByRole('button', { name: /批量分班 \(2\)/u }).click()
  const dialog = page.getByRole('dialog', { name: '批量分班' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByText('已选择 2 名学生').waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByText('选择班级').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS037(page, scenario, fixture) {
  await prepareStudentClassAssignment(page, scenario, fixture)
  await page.getByRole('tab', { name: '班级视图' }).click()
  await selectElementPlusOption(page, page.locator('.compact-select').nth(1), '2026-2027')
  await page.locator('.class-view-card').waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('.class-view-card .class-card').filter({ hasText: '星光一班' }).waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(page, '2 名学生在籍')
}

async function prepareS038(page, scenario, fixture) {
  await prepareStudentClassAssignment(page, scenario, fixture)
  await page.getByRole('button', { name: '学年升级' }).click()
  const dialog = page.getByRole('dialog', { name: '学年升级' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByText('升级说明').waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByText('自动创建班级').waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByRole('button', { name: '取消' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS039(page, scenario, fixture) {
  await prepareStudentClassAssignment(page, scenario, fixture)
  const studentRow = page.locator('.el-table__row').filter({ hasText: DEMO_STUDENTS[0].name }).first()
  await studentRow.getByRole('button', { name: '班级历史' }).click()
  const dialog = page.getByRole('dialog', { name: '班级变更历史' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByText('晨曦一班').waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByText('星光一班').waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByText('2025-2026').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareAssessmentCatalog(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '评估中心')
  await page.getByRole('group', { name: '评估分类' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS040(page, scenario, fixture) {
  await prepareAssessmentCatalog(page, scenario, fixture)
  await page.getByRole('button', { name: /生活自理/u }).waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('.assessment-card').first().waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(page, '已按授权过滤')
}

async function prepareS041(page, scenario, fixture) {
  await prepareAssessmentCatalog(page, scenario, fixture)
  const category = page.getByRole('button', { name: /认知发展/u })
  await category.click()
  await page.waitForFunction(() => document.querySelector('.assessment-category-chip.is-active')?.textContent?.includes('认知发展') === true, undefined, { timeout: 20_000 })
  await page.locator('.assessment-card').filter({ hasText: '瑞文图形推理测验' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS042(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '选择评估学生 - S-M量表')
  const studentRow = page.locator('.student-row').filter({ hasText: DEMO_STUDENTS[0].name }).first()
  await studentRow.waitFor({ state: 'visible', timeout: 20_000 })
  await studentRow.getByRole('button').waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(page, '年龄')
}

async function prepareS043(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '选择评估学生 - 儿心量表Ⅱ')
  const studentRow = page.locator('.student-row').filter({ hasText: DEMO_STUDENTS[0].name }).first()
  await studentRow.click()
  await page.locator('.el-message').filter({ hasText: DEMO_STUDENTS[0].name }).waitFor({ state: 'visible', timeout: 20_000 })
  await studentRow.waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS044(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const dialog = page.getByRole('dialog')
  await dialog.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(page, 'S-M量表')
  await expectText(page, DEMO_STUDENTS[0].name)
  await dialog.getByRole('button', { name: '我已了解，开始评估' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function startAssessmentAtFirstQuestion(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const dialog = page.getByRole('dialog')
  await dialog.waitFor({ state: 'visible', timeout: 30_000 })
  await dialog.getByRole('button', { name: '我已了解，开始评估' }).click()
  await page.locator('.assessment-header').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS045(page, scenario, fixture) {
  await startAssessmentAtFirstQuestion(page, scenario, fixture)
  await page.locator('.question-card').waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('.answer-options').waitFor({ state: 'visible', timeout: 20_000 })
  await page.getByRole('button', { name: '下一题' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS046(page, scenario, fixture) {
  await startAssessmentAtFirstQuestion(page, scenario, fixture)
  const question = page.locator('.question-card')
  await question.waitFor({ state: 'visible', timeout: 20_000 })
  await question.locator('.cnbs-title').waitFor({ state: 'visible', timeout: 20_000 })
  await question.locator('.cnbs-option-pass').waitFor({ state: 'visible', timeout: 20_000 })
  await question.locator('.cnbs-option-fail').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS047(page, scenario, fixture) {
  await startAssessmentAtFirstQuestion(page, scenario, fixture)
  const question = page.locator('.question-card')
  await question.waitFor({ state: 'visible', timeout: 20_000 })
  await question.locator('.tgmd-title').waitFor({ state: 'visible', timeout: 20_000 })
  await question.locator('.tgmd-criteria-list').waitFor({ state: 'visible', timeout: 20_000 })
  await question.locator('.tgmd-score-chip').first().waitFor({ state: 'visible', timeout: 20_000 })
  await page.getByRole('button', { name: '下一题' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS048(page, scenario, fixture) {
  await startAssessmentAtFirstQuestion(page, scenario, fixture)
  const question = page.locator('.question-card')
  await question.waitFor({ state: 'visible', timeout: 20_000 })
  await question.locator('.question-image-stem img').waitFor({ state: 'visible', timeout: 20_000 })
  const firstOption = question.locator('.image-option').first()
  await firstOption.waitFor({ state: 'visible', timeout: 20_000 })
  await firstOption.click()
  await question.locator('.image-option.is-selected').waitFor({ state: 'visible', timeout: 20_000 })
  await page.getByRole('button', { name: '下一题' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS049(page, scenario, fixture) {
  await startAssessmentAtFirstQuestion(page, scenario, fixture)
  await expectText(page, 'DRAFT')
  const board = page.locator('.performance-board')
  await board.waitFor({ state: 'visible', timeout: 20_000 })
  await board.locator('.question-image-stem img').waitFor({ state: 'visible', timeout: 20_000 })
  const options = board.locator('.image-options-grid.cols-2')
  await options.waitFor({ state: 'visible', timeout: 20_000 })
  const firstOption = options.locator('.image-option').first()
  await firstOption.waitFor({ state: 'visible', timeout: 20_000 })
  await firstOption.click()
  await options.locator('.image-option.is-selected').waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('.assessment-header .progress-text').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS050(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const dialog = page.getByRole('dialog')
  await dialog.waitFor({ state: 'visible', timeout: 30_000 })
  await dialog.getByRole('button', { name: '我已了解，开始评估' }).click()
  const form = page.locator('.cbcl-social-form')
  await form.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(form, '社会能力评估')
  await form.getByText('填表者', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
  const submit = form.getByRole('button', { name: '保存并进入下一步' })
  await submit.waitFor({ state: 'visible', timeout: 20_000 })
  await submit.click()
  await form.locator('.el-form-item__error').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function openAssessmentWithSeededProgress(page, scenario, fixture, seedProgress, assessmentRoute = interpolateUserManualScreenshotRoute(scenario, fixture.routeValues)) {
  await navigateHash(page, '/assessment')
  await expectText(page, '评估中心')
  await page.waitForTimeout(250)
  await seedProgress()
  await navigateHash(page, assessmentRoute)
}

async function prepareS051(page, scenario, fixture) {
  const studentId = fixture.routeValues.studentId
  await openAssessmentWithSeededProgress(page, scenario, fixture, async () => {
    await page.evaluate(({ scaleCode, studentId: id }) => {
      localStorage.setItem(`assessment_progress_${scaleCode}_${id}`, JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        phase: 'assessing',
        currentIndex: 0,
        answers: {},
        startTime: Date.now() - 60_000,
        metadata: {},
        cbclStep: 'social',
        socialFormData: null,
        currentPage: 1,
      }))
    }, { scaleCode: 'sm', studentId })
  }, `/assessment/unified/sm/${studentId}`)
  const dialog = page.getByRole('dialog').filter({ hasText: '恢复评估进度' })
  await dialog.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(dialog, '发现该学生此量表有未完成的评估进度')
  await dialog.getByRole('button', { name: '继续评估' }).waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByRole('button', { name: '重新开始' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS052(page, scenario, fixture) {
  const studentId = fixture.routeValues.studentId
  await openAssessmentWithSeededProgress(page, scenario, fixture, async () => {
    await page.evaluate(({ scaleCode, studentId: id }) => {
      localStorage.setItem(`assessment_progress_${scaleCode}_${id}`, JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        phase: 'assessing',
        currentIndex: 131,
        answers: {},
        startTime: Date.now() - 60_000,
        metadata: {
          startIndex: 131,
          startStage: 7,
          direction: 'forward',
          basalEstablished: true,
          basalStage: 7,
          basalWindowStartIndex: 121,
          basalWindowEndIndex: 130,
          forwardResumeIndex: 131,
          totalQuestions: 1,
        },
        cbclStep: 'social',
        socialFormData: null,
        currentPage: 1,
      }))
    }, { scaleCode: 'sm', studentId })
  }, `/assessment/unified/sm/${studentId}`)
  const resumeDialog = page.getByRole('dialog').filter({ hasText: '恢复评估进度' })
  await resumeDialog.waitFor({ state: 'visible', timeout: 30_000 })
  await resumeDialog.getByRole('button', { name: '继续评估' }).click()
  const question = page.locator('.question-card')
  await question.waitFor({ state: 'visible', timeout: 20_000 })
  await question.locator('.el-radio').filter({ hasText: /^通过/u }).click()
  const completeDialog = page.getByRole('dialog').filter({ hasText: '评估已完成' })
  await completeDialog.waitFor({ state: 'visible', timeout: 30_000 })
  await completeDialog.getByRole('button', { name: '返回列表' }).waitFor({ state: 'visible', timeout: 20_000 })
  await completeDialog.getByRole('button', { name: '查看报告' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS053(page, scenario, fixture) {
  await prepareS052(page, scenario, fixture)
  const completeDialog = page.getByRole('dialog').filter({ hasText: '评估已完成' })
  await completeDialog.getByRole('button', { name: /推荐/u }).click()
  const drawer = page.locator('.el-drawer.recommendation-drawer')
  await drawer.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(drawer, '评估器材推荐')
  await drawer.locator('.rec-content').waitFor({ state: 'visible', timeout: 20_000 })
  await drawer.getByRole('button', { name: '生成训练计划(草稿)' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS054(page, scenario, fixture) {
  await prepareS053(page, scenario, fixture)
  const drawer = page.locator('.el-drawer.recommendation-drawer')
  await drawer.getByRole('button', { name: '生成训练计划(草稿)' }).click()
  const confirmDialog = page.getByRole('dialog').filter({ hasText: '已生成训练计划草稿' })
  await confirmDialog.waitFor({ state: 'visible', timeout: 30_000 })
  await confirmDialog.getByRole('button', { name: '稍后' }).click()
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '训练计划')
  const plan = page.locator('.plan-card').filter({ hasText: '由评估生成' }).filter({ hasText: '草稿' }).first()
  await plan.waitFor({ state: 'visible', timeout: 30_000 })
  await plan.locator('.plan-card__title').waitFor({ state: 'visible', timeout: 20_000 })
  await plan.getByText('由评估生成', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS055(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const records = page.locator('.records-shell')
  await records.scrollIntoViewIfNeeded()
  await records.getByRole('tab', { name: /评估记录/u }).click()
  const panel = records.locator('.records-panel')
  await panel.waitFor({ state: 'visible', timeout: 20_000 })
  await panel.locator('.records-table').waitFor({ state: 'visible', timeout: 20_000 })
  await panel.locator('.detail-pill-button').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS056(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.sm-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(report, 'S-M量表评估报告', 30_000)
  const result = report.locator('.result-card')
  await result.waitFor({ state: 'visible', timeout: 30_000 })
  await result.locator('.score-item').nth(2).waitFor({ state: 'visible', timeout: 20_000 })
  await result.locator('.result-description').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS058(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.weefim-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  const overview = report.locator('.result-overview-card')
  await overview.waitFor({ state: 'visible', timeout: 30_000 })
  await overview.locator('.score-card').nth(2).waitFor({ state: 'visible', timeout: 20_000 })
  const independence = report.locator('.independence-card')
  await independence.waitFor({ state: 'visible', timeout: 20_000 })
  await independence.locator('.level-badge').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS059(page, scenario, fixture) {
  await page.setViewportSize({ width: 1920, height: 1600 }).catch(() => {})
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const domains = page.locator('.weefim-report .domains-card')
  await domains.waitFor({ state: 'visible', timeout: 30_000 })
  await domains.scrollIntoViewIfNeeded()
  await domains.locator('.category-section').nth(5).waitFor({ state: 'visible', timeout: 20_000 })
  await domains.locator('.category-score').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS060(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.csirs-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(report, 'CSIRS感觉统合评估报告', 30_000)
  const result = report.locator('.result-card')
  await result.waitFor({ state: 'visible', timeout: 30_000 })
  await result.locator('.score-item').waitFor({ state: 'visible', timeout: 20_000 })
  await result.locator('.evaluation-content').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS061(page, scenario, fixture) {
  await page.setViewportSize({ width: 1920, height: 1600 }).catch(() => {})
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.csirs-report')
  const radar = report.locator('.radar-card')
  await radar.waitFor({ state: 'visible', timeout: 30_000 })
  await radar.locator('.radar-chart canvas').waitFor({ state: 'visible', timeout: 30_000 })
  await radar.scrollIntoViewIfNeeded()
  const dimensions = report.locator('.dimensions-card')
  await dimensions.waitFor({ state: 'visible', timeout: 20_000 })
  await dimensions.locator('.dimension-detail').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS062(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.conners-psq-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  const validity = report.locator('.validity-card')
  await validity.waitFor({ state: 'visible', timeout: 30_000 })
  await validity.locator('.validity-item').nth(1).waitFor({ state: 'visible', timeout: 20_000 })
  const result = report.locator('.result-card')
  await result.waitFor({ state: 'visible', timeout: 20_000 })
  await result.locator('.evaluation-content').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS063(page, scenario, fixture) {
  await page.setViewportSize({ width: 1920, height: 1600 }).catch(() => {})
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.conners-psq-report')
  const radar = report.locator('.radar-card')
  await radar.waitFor({ state: 'visible', timeout: 30_000 })
  await radar.locator('.radar-chart canvas').waitFor({ state: 'visible', timeout: 30_000 })
  await radar.scrollIntoViewIfNeeded()
  const dimensions = report.locator('.dimensions-card')
  await dimensions.waitFor({ state: 'visible', timeout: 20_000 })
  await dimensions.locator('.dimension-detail').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS064(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.conners-trs-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  const validity = report.locator('.validity-card')
  await validity.waitFor({ state: 'visible', timeout: 30_000 })
  await validity.locator('.validity-item').nth(1).waitFor({ state: 'visible', timeout: 20_000 })
  const result = report.locator('.result-card')
  await result.waitFor({ state: 'visible', timeout: 20_000 })
  await result.locator('.evaluation-content').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS065(page, scenario, fixture) {
  await page.setViewportSize({ width: 1920, height: 1600 }).catch(() => {})
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.conners-trs-report')
  const radar = report.locator('.radar-card')
  await radar.waitFor({ state: 'visible', timeout: 30_000 })
  await radar.locator('.radar-chart canvas').waitFor({ state: 'visible', timeout: 30_000 })
  await radar.scrollIntoViewIfNeeded()
  const dimensions = report.locator('.dimensions-card')
  await dimensions.waitFor({ state: 'visible', timeout: 20_000 })
  await dimensions.locator('.dimension-detail').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS066(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.sdq-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  await report.locator('.report-header').scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  const overview = report.locator('.result-overview')
  await overview.waitFor({ state: 'visible', timeout: 20_000 })
  await overview.locator('.score-item.total').waitFor({ state: 'visible', timeout: 20_000 })
  await overview.locator('.score-item.prosocial').waitFor({ state: 'visible', timeout: 20_000 })
  await report.locator('.overall-assessment .assessment-content').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS067(page, scenario, fixture) {
  await page.setViewportSize({ width: 1920, height: 1600 }).catch(() => {})
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const dimensions = page.locator('.sdq-report .dimension-scores')
  await dimensions.waitFor({ state: 'visible', timeout: 30_000 })
  await dimensions.scrollIntoViewIfNeeded()
  const expand = dimensions.locator('.el-table__expand-icon').first()
  await expand.waitFor({ state: 'visible', timeout: 20_000 })
  await expand.click()
  await dimensions.locator('.dimension-detail').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS068(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.srs2-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  const overview = report.locator('.result-overview')
  await overview.waitFor({ state: 'visible', timeout: 20_000 })
  await overview.locator('.score-item.total').waitFor({ state: 'visible', timeout: 20_000 })
  await overview.locator('.score-item.raw').waitFor({ state: 'visible', timeout: 20_000 })
  await report.locator('.overall-assessment .assessment-content').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS069(page, scenario, fixture) {
  await page.setViewportSize({ width: 1920, height: 1600 }).catch(() => {})
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.srs2-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  const dimensions = report.locator('.dimension-scores')
  await dimensions.waitFor({ state: 'visible', timeout: 20_000 })
  await dimensions.scrollIntoViewIfNeeded()
  const expand = dimensions.locator('.el-table__expand-icon').first()
  await expand.waitFor({ state: 'visible', timeout: 20_000 })
  await expand.click()
  await dimensions.locator('.dimension-detail').first().waitFor({ state: 'visible', timeout: 20_000 })
  await report.locator('.disclaimer').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS070(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.cbcl-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  await report.locator('.disclaimer-alert').waitFor({ state: 'visible', timeout: 20_000 })
  const social = report.locator('.social-competence-card')
  await social.waitFor({ state: 'visible', timeout: 20_000 })
  await social.locator('.score-card').nth(2).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS071(page, scenario, fixture) {
  await page.setViewportSize({ width: 1920, height: 1600 }).catch(() => {})
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.cbcl-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  const chart = report.locator('.clinical-profile-card')
  await chart.waitFor({ state: 'visible', timeout: 20_000 })
  await chart.locator('.profile-chart canvas').waitFor({ state: 'visible', timeout: 30_000 })
  await chart.scrollIntoViewIfNeeded()
  const factors = report.locator('.syndrome-table-card')
  await factors.waitFor({ state: 'visible', timeout: 20_000 })
  await factors.locator('.el-table__body tr').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS072(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.cnbsr-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  await report.locator('.student-info').waitFor({ state: 'visible', timeout: 20_000 })
  const overview = report.locator('.overview-card')
  await overview.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(overview, '总智龄 MA')
  await expectText(overview, '发育商 DQ')
  await report.locator('.overall-card').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS073(page, scenario, fixture) {
  await page.setViewportSize({ width: 1920, height: 1600 }).catch(() => {})
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const domains = page.locator('.cnbsr-report .domain-table-card')
  await domains.waitFor({ state: 'visible', timeout: 30_000 })
  await domains.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => document.querySelectorAll('.cnbsr-report .domain-table-card .el-table__body tr').length === 5, undefined, { timeout: 20_000 })
}

async function prepareS074(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.tgmd3-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  const overview = report.locator('.overview-card')
  await overview.waitFor({ state: 'visible', timeout: 20_000 })
  await overview.locator('.summary-tile').nth(2).waitFor({ state: 'visible', timeout: 20_000 })
  const domains = report.locator('.domains-card')
  await domains.waitFor({ state: 'visible', timeout: 20_000 })
  await domains.locator('.domain-item').nth(1).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS075(page, scenario, fixture) {
  await page.setViewportSize({ width: 1920, height: 1600 }).catch(() => {})
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const skills = page.locator('.tgmd3-report .skills-card')
  await skills.waitFor({ state: 'visible', timeout: 30_000 })
  await skills.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => document.querySelectorAll('.tgmd3-report .skills-card .el-table__body tr').length === 13, undefined, { timeout: 20_000 })
}

async function prepareS076(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.gmfm-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  const overview = report.locator('.overview-card')
  await overview.waitFor({ state: 'visible', timeout: 20_000 })
  await overview.locator('.summary-tile').nth(2).waitFor({ state: 'visible', timeout: 20_000 })
  await overview.locator('.overall-summary').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS077(page, scenario, fixture) {
  await page.setViewportSize({ width: 1920, height: 1600 }).catch(() => {})
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const domains = page.locator('.gmfm-report .domains-card')
  await domains.waitFor({ state: 'visible', timeout: 30_000 })
  await domains.scrollIntoViewIfNeeded()
  await domains.locator('.domain-item').nth(4).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS078(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.fine-motor-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  const overview = report.locator('.result-overview')
  await overview.waitFor({ state: 'visible', timeout: 20_000 })
  await overview.locator('.score-item.total').waitFor({ state: 'visible', timeout: 20_000 })
  const radar = report.locator('.radar-card')
  await radar.waitFor({ state: 'visible', timeout: 20_000 })
  await radar.locator('.radar-chart canvas').waitFor({ state: 'visible', timeout: 30_000 })
}

async function prepareS079(page, scenario, fixture) {
  await page.setViewportSize({ width: 1920, height: 1600 }).catch(() => {})
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.fine-motor-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  const domains = report.locator('.domains-card')
  await domains.waitFor({ state: 'visible', timeout: 20_000 })
  await domains.scrollIntoViewIfNeeded()
  await domains.locator('.domain-item').first().waitFor({ state: 'visible', timeout: 20_000 })
  const iep = report.locator('.iep-card')
  await iep.waitFor({ state: 'visible', timeout: 20_000 })
  await iep.scrollIntoViewIfNeeded()
}

async function prepareS080(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.brief-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  await report.locator('.draft-tag').waitFor({ state: 'visible', timeout: 20_000 })
  const overview = report.locator('.overview')
  await overview.waitFor({ state: 'visible', timeout: 20_000 })
  await overview.locator('.score-item').nth(1).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS081(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.crt-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  const result = report.locator('.result-card')
  await result.waitFor({ state: 'visible', timeout: 20_000 })
  await result.locator('.overview .score-item').nth(2).waitFor({ state: 'visible', timeout: 20_000 })
  await report.locator('.dimension-card').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS082(page, scenario, fixture) {
  await page.setViewportSize({ width: 1920, height: 1600 }).catch(() => {})
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.crt-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  const disclaimer = report.locator('.disclaimer')
  await disclaimer.waitFor({ state: 'visible', timeout: 20_000 })
  await disclaimer.scrollIntoViewIfNeeded()
}

async function prepareS083(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.cognitive-self-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  await report.locator('.draft-tag').waitFor({ state: 'visible', timeout: 20_000 })
  const overview = report.locator('.overview')
  await overview.waitFor({ state: 'visible', timeout: 20_000 })
  await overview.locator('.score-item').nth(2).waitFor({ state: 'visible', timeout: 20_000 })
  await report.locator('.dimension-card').waitFor({ state: 'visible', timeout: 20_000 })
}

function getPlanDetailDrawer(page) {
  return page.locator('.el-drawer:visible').filter({ has: page.locator('.plan-detail') })
}

async function preparePlanListPage(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '训练计划')
  const confirmation = page.locator('.el-message-box:visible')
  if (await confirmation.isVisible().catch(() => false)) {
    await confirmation.getByRole('button', { name: '取消', exact: true }).click()
    await confirmation.waitFor({ state: 'hidden', timeout: 20_000 })
  }
  const detailDrawer = getPlanDetailDrawer(page)
  if (await detailDrawer.isVisible().catch(() => false)) {
    await detailDrawer.locator('.el-drawer__close-btn').click()
    await detailDrawer.waitFor({ state: 'hidden', timeout: 20_000 })
  }
  const resourceSelector = page.locator('.resource-selector-dialog')
  if (await resourceSelector.isVisible().catch(() => false)) {
    await resourceSelector.getByRole('button', { name: '取消', exact: true }).click()
    await resourceSelector.waitFor({ state: 'hidden', timeout: 20_000 })
  }
  const existingDialog = page.locator('.plan-dialog')
  if (await existingDialog.isVisible().catch(() => false)) {
    await existingDialog.getByRole('button', { name: '取消', exact: true }).click()
    await existingDialog.waitFor({ state: 'hidden', timeout: 20_000 })
  }
}

async function openNewPlanDialog(page, scenario, fixture) {
  await preparePlanListPage(page, scenario, fixture)
  const createButton = page.getByRole('button', { name: '新建计划' }).first()
  await createButton.waitFor({ state: 'visible', timeout: 20_000 })
  await createButton.click()
  const dialog = page.locator('.plan-dialog')
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.locator('.el-tabs__item.is-active').filter({ hasText: '基本信息' }).waitFor({ state: 'visible', timeout: 20_000 })
  return dialog
}

async function prepareS084(page, scenario, fixture) {
  await preparePlanListPage(page, scenario, fixture)
  const pageRoot = page.locator('.plan-list-page')
  await pageRoot.waitFor({ state: 'visible', timeout: 30_000 })
  await pageRoot.locator('.stats-row').waitFor({ state: 'visible', timeout: 20_000 })
  await pageRoot.locator('.stats-row .summary-card').nth(3).waitFor({ state: 'visible', timeout: 20_000 })
  await pageRoot.locator('.filter-section').waitFor({ state: 'visible', timeout: 20_000 })
  await pageRoot.locator('.plan-cards .plan-card').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS085(page, scenario, fixture) {
  await preparePlanListPage(page, scenario, fixture)
  const filter = page.locator('.plan-filter-section')
  await filter.waitFor({ state: 'visible', timeout: 30_000 })
  await filter.getByRole('button', { name: '执行中', exact: true }).click()
  const selects = filter.locator('.compact-selects .compact-select')
  await selectElementPlusOption(page, selects.nth(0), '感官训练')
  await selectElementPlusOption(page, selects.nth(1), DEMO_STUDENTS[0].name)
  const search = filter.locator('.plan-search input')
  await search.fill('星愿一号今日训练计划')
  await search.press('Enter')

  const cards = page.locator('.plan-cards .plan-card')
  await page.waitForFunction(() => document.querySelectorAll('.plan-cards .plan-card').length === 1, undefined, { timeout: 20_000 })
  await cards.filter({ hasText: '星愿一号今日训练计划' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS086(page, scenario, fixture) {
  const dialog = await openNewPlanDialog(page, scenario, fixture)
  const form = dialog.locator('.el-form')
  await form.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(form, '计划名称')
  await expectText(form, '归属模块')
  await expectText(form, '关联学生')
  await expectText(form, '计划周期')
}

async function prepareS087(page, scenario, fixture) {
  const dialog = await openNewPlanDialog(page, scenario, fixture)
  await dialog.getByRole('tab', { name: '目标设定' }).click()
  const goals = dialog.locator('.goals-section')
  await goals.waitFor({ state: 'visible', timeout: 20_000 })
  const longTerm = goals.locator('.goal-group').nth(0)
  const shortTerm = goals.locator('.goal-group').nth(1)
  await longTerm.getByRole('button', { name: '添加目标', exact: true }).click()
  await shortTerm.getByRole('button', { name: '添加目标', exact: true }).click()
  await longTerm.locator('.goal-item input').fill('在提示下完成 10 分钟感官调节训练')
  await shortTerm.locator('.goal-item input').fill('独立完成一项演示训练资源')
}

async function prepareS088(page, scenario, fixture) {
  const dialog = await openNewPlanDialog(page, scenario, fixture)
  await dialog.getByRole('tab', { name: '资源编排' }).click()
  const resources = dialog.locator('.resources-section')
  await resources.waitFor({ state: 'visible', timeout: 20_000 })
  await resources.getByRole('button', { name: '添加资源', exact: true }).click()
  const selector = page.locator('.resource-selector-dialog')
  await selector.waitFor({ state: 'visible', timeout: 20_000 })
  await selector.locator('.module-filter').waitFor({ state: 'visible', timeout: 20_000 })
  await selector.locator('.type-filter').waitFor({ state: 'visible', timeout: 20_000 })
  await selector.locator('.resource-search').waitFor({ state: 'visible', timeout: 20_000 })
  const options = selector.locator('.resource-grid .resource-option')
  await options.first().waitFor({ state: 'visible', timeout: 30_000 })
  await options.nth(0).click()
  await options.nth(1).click()
  await selector.locator('.selected-count').filter({ hasText: '已选择 2 个资源' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS089(page, scenario, fixture) {
  const dialog = await openNewPlanDialog(page, scenario, fixture)
  await dialog.getByRole('tab', { name: '资源编排' }).click()
  const resources = dialog.locator('.resources-section')
  await resources.waitFor({ state: 'visible', timeout: 20_000 })
  await resources.getByRole('button', { name: '添加资源', exact: true }).click()
  const selector = page.locator('.resource-selector-dialog')
  await selector.waitFor({ state: 'visible', timeout: 20_000 })
  const options = selector.locator('.resource-grid .resource-option')
  await options.nth(0).click()
  await options.nth(1).click()
  await selector.getByRole('button', { name: '确认添加' }).click()
  await resources.locator('.resource-cards .resource-card').nth(1).waitFor({ state: 'visible', timeout: 20_000 })
  await resources.locator('.resource-config').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS090(page, scenario, fixture) {
  await preparePlanListPage(page, scenario, fixture)
  const draftCard = page.locator('.plan-card').filter({ has: page.locator('.plan-primary-action') }).first()
  await draftCard.waitFor({ state: 'visible', timeout: 30_000 })
  await draftCard.locator('.plan-card__main').click()
  const drawer = getPlanDetailDrawer(page)
  await drawer.waitFor({ state: 'visible', timeout: 20_000 })
  await drawer.locator('.plan-detail').waitFor({ state: 'visible', timeout: 20_000 })
  if (await drawer.getByRole('button', { name: '编辑' }).isVisible().catch(() => false)) {
    throw new Error('Draft plan detail drawer must not show an edit button')
  }
}

async function prepareS091(page, scenario, fixture) {
  await preparePlanListPage(page, scenario, fixture)
  const draftCard = page.locator('.plan-card').filter({ has: page.locator('.plan-primary-action') }).first()
  await draftCard.waitFor({ state: 'visible', timeout: 30_000 })
  await draftCard.locator('.plan-card__menu-button').click()
  const menu = page.locator('.plan-card__menu-dropdown:visible')
  await menu.waitFor({ state: 'visible', timeout: 20_000 })
  await menu.getByText('编辑', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS092(page, scenario, fixture) {
  await preparePlanListPage(page, scenario, fixture)
  const draftCard = page.locator('.plan-card').filter({ has: page.locator('.plan-primary-action') }).first()
  await draftCard.waitFor({ state: 'visible', timeout: 30_000 })
  await draftCard.getByRole('button', { name: '开始执行' }).click()
  await page.getByText('设为执行中').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS093(page, scenario, fixture) {
  await preparePlanListPage(page, scenario, fixture)
  const activeCard = page.locator('.plan-card--active').first()
  await activeCard.waitFor({ state: 'visible', timeout: 30_000 })
  const training = activeCard.locator('.today-training-section')
  await training.waitFor({ state: 'visible', timeout: 20_000 })
  await training.locator('.resource-recommendations .resource-recommendation-item').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS094(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '情绪行为')
  const grid = page.locator('.module-grid')
  await grid.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(grid, '情绪与场景')
  await expectText(grid, '表达关心')
  await grid.locator('.module-card').nth(1).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS095(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const root = page.locator('.student-selector-page')
  await root.waitFor({ state: 'visible', timeout: 30_000 })
  await root.locator('.module-info .el-tag').waitFor({ state: 'visible', timeout: 20_000 })
  await root.locator('.student-row').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function openAdvancedSceneFilters(page, root) {
  const summary = root.locator('.filter-summary-card')
  await summary.waitFor({ state: 'visible', timeout: 20_000 })
  await summary.getByRole('button', { name: /高级筛选/u }).click()
  const drawer = page.locator('.filter-drawer:visible')
  await drawer.waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('.ai-floating-button').waitFor({ state: 'hidden', timeout: 20_000 })
  return drawer
}

async function selectSceneFilterOption(section, label) {
  const option = section.locator('.el-checkbox-button').filter({ hasText: label }).first()
  await option.waitFor({ state: 'visible', timeout: 20_000 })
  await option.click()
}

async function applyEmotionSceneFilters(page, root) {
  const drawer = await openAdvancedSceneFilters(page, root)
  const sections = drawer.locator('.filter-section')
  await selectSceneFilterOption(sections.nth(1), '校园')
  await selectSceneFilterOption(sections.nth(2), '平静专注')
  await drawer.getByRole('button', { name: '完成', exact: true }).dispatchEvent('click')
  await drawer.waitFor({ state: 'hidden', timeout: 20_000 })
  const summary = root.locator('.filter-summary-card')
  await expectText(summary, '场域 校园')
  await expectText(summary, '主题 平静专注')
}

async function prepareS096(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const root = page.locator('.page-container')
  await root.waitFor({ state: 'visible', timeout: 30_000 })
  const toolbar = root.locator('.toolbar')
  await toolbar.waitFor({ state: 'visible', timeout: 20_000 })
  await toolbar.locator('.el-tag').first().waitFor({ state: 'visible', timeout: 20_000 })
  await applyEmotionSceneFilters(page, root)
  await root.locator('.scene-count').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS097(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const root = page.locator('.page-container')
  await root.waitFor({ state: 'visible', timeout: 30_000 })
  const toolbar = root.locator('.toolbar')
  await toolbar.waitFor({ state: 'visible', timeout: 20_000 })
  await toolbar.locator('.el-tag').first().waitFor({ state: 'visible', timeout: 20_000 })
  const drawer = await openAdvancedSceneFilters(page, root)
  const sections = drawer.locator('.filter-section')
  await selectSceneFilterOption(sections.nth(1), '难过')
  await selectSceneFilterOption(sections.nth(2), '共情式')
  await drawer.getByRole('button', { name: '完成', exact: true }).dispatchEvent('click')
  await drawer.waitFor({ state: 'hidden', timeout: 20_000 })
  const summary = root.locator('.filter-summary-card')
  await expectText(summary, '情绪 难过')
  await expectText(summary, '方式 共情式')
  await root.locator('.scene-count').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS098(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const root = page.locator('.page-container')
  await root.waitFor({ state: 'visible', timeout: 30_000 })
  await applyEmotionSceneFilters(page, root)
  const card = root.locator('.gallery-grid .scene-card').first()
  await card.waitFor({ state: 'visible', timeout: 30_000 })
  await card.locator('.scene-cover').waitFor({ state: 'visible', timeout: 20_000 })
  await card.locator('.scene-title').waitFor({ state: 'visible', timeout: 20_000 })
  await card.locator('.emotion-badge').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function launchEmotionSceneTraining(page, routeValues) {
  await navigateHash(page, `/emotional/emotion-scene/select?studentId=${routeValues.studentId}`)
  const card = page.locator('.gallery-grid .scene-card').first()
  await card.waitFor({ state: 'visible', timeout: 30_000 })
  await card.click()
  const intro = page.locator('.intro-step')
  await intro.waitFor({ state: 'visible', timeout: 30_000 })
  await intro.locator('.ready-button').click()
  const question = page.locator('.question-step')
  await question.waitFor({ state: 'visible', timeout: 30_000 })
  await question.locator('.question-presenter').waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('.ai-floating-button').waitFor({ state: 'hidden', timeout: 20_000 })
  return question
}

async function prepareS099(page, scenario, fixture) {
  const question = await launchEmotionSceneTraining(page, fixture.routeValues)
  await question.locator('.question-title').waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('.option-board, .text-step-board').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS100(page, scenario, fixture) {
  await launchEmotionSceneTraining(page, fixture.routeValues)
  const toggle = page.locator('.annotation-button').first()
  await toggle.waitFor({ state: 'visible', timeout: 20_000 })
  await toggle.click()
  const layer = page.locator('.annotation-layer.is-active')
  await layer.waitFor({ state: 'visible', timeout: 20_000 })
  const canvas = layer.locator('.annotation-canvas')
  await canvas.waitFor({ state: 'visible', timeout: 20_000 })
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Annotation canvas has no bounding box')
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 8 })
  await page.mouse.up()
  await expectText(page, '退出')
}

async function prepareS101(page, scenario, fixture) {
  await launchEmotionSceneTraining(page, fixture.routeValues)
  await page.keyboard.press('Control+Alt+S')
  const panel = page.locator('.teacher-panel')
  await panel.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(panel, '当前仅用于现场干预')
  await panel.getByRole('button', { name: '跳过本题' }).waitFor({ state: 'visible', timeout: 20_000 })
  await panel.getByRole('button', { name: '关闭教师控制台' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS102(page, scenario, fixture) {
  await launchEmotionSceneTraining(page, fixture.routeValues)
  await page.keyboard.press('Control+Alt+S')
  const panel = page.locator('.teacher-panel')
  await panel.waitFor({ state: 'visible', timeout: 20_000 })
  await panel.getByRole('button', { name: '强制结算' }).click()
  const result = page.locator('.result-step')
  await result.waitFor({ state: 'visible', timeout: 20_000 })
  await panel.getByRole('button', { name: '关闭教师控制台' }).click()
  await panel.waitFor({ state: 'hidden', timeout: 20_000 })
  await result.locator('.star-stage').waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(result, '记录状态')
  await result.getByRole('button', { name: '返回场景选择' }).waitFor({ state: 'visible', timeout: 20_000 })
  await result.getByRole('button', { name: '再练一次' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS103(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '模块报告')
  const main = page.locator('.main-content')
  await main.waitFor({ state: 'visible', timeout: 30_000 })
  await main.locator('.summary-row .summary-card').nth(3).waitFor({ state: 'visible', timeout: 20_000 })
  await main.locator('.chart-grid .chart-card').first().waitFor({ state: 'visible', timeout: 20_000 })
  await page.getByRole('button', { name: '导出Word' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS104(page, scenario, fixture) {
  await page.setViewportSize({ width: 1920, height: 1600 }).catch(() => {})
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const main = page.locator('.main-content')
  await main.waitFor({ state: 'visible', timeout: 30_000 })
  const charts = main.locator('.chart-grid')
  await charts.waitFor({ state: 'visible', timeout: 20_000 })
  await charts.scrollIntoViewIfNeeded()
  await charts.locator('.chart-card').nth(4).waitFor({ state: 'visible', timeout: 20_000 })
  await main.locator('.suggestion-card').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS105(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '游戏训练')
  const grid = page.locator('.module-grid')
  await grid.waitFor({ state: 'visible', timeout: 30_000 })
  await grid.locator('.module-card').first().waitFor({ state: 'visible', timeout: 20_000 })
  await grid.locator('.resource-count').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS106(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const selector = page.locator('.student-selector-page')
  await selector.waitFor({ state: 'visible', timeout: 30_000 })
  await selector.locator('.module-info').waitFor({ state: 'visible', timeout: 20_000 })
  await selector.locator('.student-table-shell .student-row').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareSensoryGameLobby(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const lobby = page.locator('.workspace-page')
  await lobby.waitFor({ state: 'visible', timeout: 30_000 })
  await lobby.locator('.resource-selector').waitFor({ state: 'visible', timeout: 20_000 })
  const firstGame = lobby.locator('.resource-list .resource-item').first()
  await firstGame.waitFor({ state: 'visible', timeout: 30_000 })
  await firstGame.click()
  await lobby.locator('.game-preview-card').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS107(page, scenario, fixture) {
  await prepareSensoryGameLobby(page, scenario, fixture)
  const lobby = page.locator('.workspace-page')
  const startButton = lobby.locator('.game-preview-card').getByRole('button', { name: '进入全屏训练' })
  await startButton.scrollIntoViewIfNeeded()
  await startButton.waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS108(page, scenario, fixture) {
  await prepareSensoryGameLobby(page, scenario, fixture)
  const lobby = page.locator('.workspace-page')
  const preview = lobby.locator('.game-preview-card')
  await preview.waitFor({ state: 'visible', timeout: 20_000 })
  await preview.locator('.config-card').first().waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(preview, '开始前设置')
  await expectText(preview, '网格大小')
  await expectText(preview, '时间限制')
  await expectText(preview, '训练轮次')
}

async function prepareS109(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const lobby = page.locator('.workspace-page')
  await lobby.waitFor({ state: 'visible', timeout: 30_000 })
  const games = lobby.locator('.emotion-selector .emotion-game-card')
  await games.first().waitFor({ state: 'visible', timeout: 30_000 })
  const preview = lobby.locator('.emotion-preview-card')
  await preview.waitFor({ state: 'visible', timeout: 20_000 })
  await preview.locator('.el-radio-group').waitFor({ state: 'visible', timeout: 20_000 })
  await preview.getByRole('button', { name: '开始游戏' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function forceDeniedMediaPermission(app, page, deniedPermission) {
  await app.evaluate(({ ipcMain }, permission) => {
    ipcMain.removeHandler('get-media-permission-status')
    ipcMain.handle('get-media-permission-status', async (_event, requestedPermission) => ({
      success: true,
      permission: requestedPermission,
      status: requestedPermission === permission ? 'denied' : 'unknown',
      platform: 'manual-screenshot-isolated',
      canOpenSettings: true,
    }))

    ipcMain.removeHandler('open-media-permission-settings')
    ipcMain.handle('open-media-permission-settings', async (_event, requestedPermission) => ({
      success: requestedPermission === permission,
      opened: false,
      platform: 'manual-screenshot-isolated',
      error: 'simulated-system-denial',
    }))
  }, deniedPermission)

  const status = await page.evaluate(async (permission) => {
    return window.electronAPI.getMediaPermissionStatus(permission)
  }, deniedPermission)
  if (!status?.success || status.status !== 'denied') {
    throw new Error(`Cannot install isolated ${deniedPermission} permission denial`)
  }
}

async function prepareS110(page, scenario, fixture, _workspace, app) {
  await forceDeniedMediaPermission(app, page, 'camera')
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const gate = page.locator('.permission-gate')
  await gate.waitFor({ state: 'visible', timeout: 30_000 })
  const card = gate.locator('.permission-card[data-state="blocked_system"]')
  await card.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(card, '摄像头')
  await card.getByRole('button', { name: '打开系统设置' }).waitFor({ state: 'visible', timeout: 20_000 })
  await card.getByRole('button', { name: '我已完成设置，重新检测' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS111(page, scenario, fixture, _workspace, app) {
  await forceDeniedMediaPermission(app, page, 'microphone')
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const gate = page.locator('.permission-gate')
  await gate.waitFor({ state: 'visible', timeout: 30_000 })
  const card = gate.locator('.permission-card[data-state="blocked_system"]')
  await card.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(card, '麦克风')
  await card.getByRole('button', { name: '我已完成设置，重新检测' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS112(page, scenario, fixture) {
  const first = DEMO_STUDENTS[0]
  const second = DEMO_STUDENTS[1]
  await navigateHash(
    page,
    `/emotional/games/burger?studentId=${first.id}&participantStudentIds=${first.id},${second.id}&participantStudentNames=${encodeURIComponent(first.name)},${encodeURIComponent(second.name)}`,
  )
  const game = page.locator('.burger-coop-game')
  await game.waitFor({ state: 'visible', timeout: 30_000 })
  const participants = game.locator('.participant-grid .participant-card')
  await participants.nth(1).waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(participants.first(), first.name)
  await expectText(participants.nth(1), second.name)
}

async function prepareS113(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const game = page.locator('.pattern-next-game')
  await game.waitFor({ state: 'visible', timeout: 30_000 })
  await game.locator('.sequence-stage').waitFor({ state: 'visible', timeout: 20_000 })
  await game.locator('.options-grid .option-card').first().waitFor({ state: 'visible', timeout: 20_000 })
  await game.locator('.hud-panel').waitFor({ state: 'visible', timeout: 20_000 })
}

async function readPatternNextTokens(locator, selector) {
  return locator.locator(selector).evaluateAll((elements) => elements.map((element) => {
    const tokenGroup = element.querySelector('g.seq-token') || element.querySelector('svg > g')
    const tokenShape = tokenGroup?.querySelector(':scope > circle, :scope > rect, :scope > polygon')
    if (!tokenGroup || !tokenShape) {
      return null
    }

    const transform = tokenGroup.getAttribute('transform') || ''
    const scaleMatch = /scale\(([^)]+)\)/u.exec(transform)
    const rawScale = Number(scaleMatch?.[1] || 1)
    const tagName = tokenShape.tagName.toLowerCase()
    const shape = tagName === 'polygon'
      ? `${tagName}:${tokenShape.getAttribute('points') || ''}`
      : tagName

    return {
      shape,
      color: tokenShape.getAttribute('fill') || '',
      scale: Number(rawScale.toFixed(3)),
    }
  }))
}

function patternNextTokenMatches(left, right) {
  return left
    && right
    && left.shape === right.shape
    && left.color === right.color
    && Math.abs(left.scale - right.scale) < 0.002
}

async function pickPatternNextCorrectOption(game) {
  const status = await game.locator('.status-strip span').textContent()
  const sequence = await readPatternNextTokens(game, '.sequence-strip > g')
  const blankIndex = sequence.findIndex((token) => token === null)
  if (blankIndex < 0) {
    throw new Error('Pattern Next round has no unresolved blank token')
  }

  const tokenAt = (index) => sequence[index] || null
  let expected = null
  if (status?.includes('两种交替')) {
    expected = tokenAt(sequence.findIndex((token, index) => token && index % 2 === blankIndex % 2))
  } else if (status?.includes('两同一换') || status?.includes('三段循环') || status?.includes('大小递进')) {
    expected = tokenAt(sequence.findIndex((token, index) => token && index % 3 === blankIndex % 3))
  } else if (status?.includes('复合规律')) {
    const shapeToken = tokenAt(sequence.findIndex((token, index) => token && index % 2 === blankIndex % 2))
    const colorToken = tokenAt(sequence.findIndex((token, index) => token && index % 3 === blankIndex % 3))
    if (shapeToken && colorToken) {
      expected = { shape: shapeToken.shape, color: colorToken.color, scale: shapeToken.scale }
    }
  }

  if (!expected) {
    throw new Error(`Cannot derive Pattern Next answer from status: ${status || '(empty)'}`)
  }

  const options = game.locator('.options-grid .option-card')
  const optionTokens = await readPatternNextTokens(game, '.options-grid .option-card')
  const correctIndex = optionTokens.findIndex((token) => token && patternNextTokenMatches(
    { ...token, scale: Number((token.scale / 1.1).toFixed(3)) },
    expected,
  ))
  if (correctIndex < 0) {
    throw new Error(
      `Cannot match Pattern Next answer for ${status || 'current round'}: `
      + `expected=${JSON.stringify(expected)}, options=${JSON.stringify(optionTokens)}, sequence=${JSON.stringify(sequence)}`,
    )
  }

  await options.nth(correctIndex).click()
}

async function prepareS114(page, scenario, fixture) {
  await prepareS113(page, scenario, fixture)
  const game = page.locator('.pattern-next-game')
  const progress = await game.locator('.hud-card').nth(1).textContent()
  const targetRoundCount = Number(/\/\s*(\d+)/u.exec(progress || '')?.[1] || 0)
  if (targetRoundCount <= 0) {
    throw new Error(`Cannot determine Pattern Next round count: ${progress || '(empty)'}`)
  }

  for (let completed = 0; completed < targetRoundCount; completed += 1) {
    await game.locator('.options-grid .option-card:not(:disabled)').first().waitFor({
      state: 'visible',
      timeout: 20_000,
    })
    await pickPatternNextCorrectOption(game)
  }

  await game.locator('.badge-modal').waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(game, '本轮已完成')
  await expectText(page.locator('.persistence-banner'), '已静默保存本次训练')
  await page.getByRole('button', { name: '安静退出' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS115(page, scenario, fixture) {
  await prepareS113(page, scenario, fixture)
  await page.locator('.settings-button').click()
  const menu = page.locator('.game-settings-menu')
  await menu.waitFor({ state: 'visible', timeout: 20_000 })
  await menu.getByRole('button', { name: '教师结束本局' }).click()
  const dialog = page.getByRole('dialog').filter({ hasText: '确认教师结束' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(dialog, '已中断 / teacher_exit')
  await dialog.getByRole('button', { name: '结束本局' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS116(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const panel = page.locator('.records-panel')
  await panel.waitFor({ state: 'visible', timeout: 30_000 })
  const studentFilter = panel.locator('.student-filter')
  await studentFilter.click()
  await page.getByRole('option', { name: DEMO_STUDENTS[0].name }).click()
  const recordRow = panel.locator('.el-table__body tr').filter({
    hasText: '图形找规律',
  }).filter({
    hasText: '已中断',
  }).first()
  await recordRow.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(recordRow, '图形找规律')
  await expectText(recordRow, '已中断')
}

async function prepareS117(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const detail = page.locator('.emotional-game-record-page')
  await detail.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(detail, '深呼吸热气球')
  await expectText(detail, DEMO_STUDENTS[0].name)
  await expectText(detail, '训练状态')
  await expectText(detail, '已完成')
  await expectText(detail, '成功循环')
}

async function prepareS118(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.iep-report-container')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  await report.locator('.report-content').waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(report, 'IEP 评估报告')
  await expectText(report, DEMO_STUDENTS[0].name)
  await expectText(report, '合作造汉堡')
  await expectText(report, '训练数据')
  await report.getByRole('button', { name: '导出 Word' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS119(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '器材训练')
  const grid = page.locator('.module-grid')
  await grid.waitFor({ state: 'visible', timeout: 30_000 })
  const entryCard = grid.locator('.module-card').first()
  await entryCard.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(entryCard, '已激活')
  await entryCard.locator('.resource-count').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS120(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const selector = page.locator('.student-selector-page')
  await selector.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(selector, '选择学生 - 感官统合训练')
  await selector.locator('.module-info').waitFor({ state: 'visible', timeout: 20_000 })
  await selector.locator('.student-table-shell .student-row').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS121(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const workspace = page.locator('.workspace-page')
  await workspace.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(workspace, '感官统合训练 - 快速录入')
  const selector = workspace.locator('.resource-selector')
  await selector.waitFor({ state: 'visible', timeout: 20_000 })
  const resource = selector.locator('.resource-list .resource-item').first()
  await resource.waitFor({ state: 'visible', timeout: 30_000 })
  await resource.locator('.resource-image').waitFor({ state: 'visible', timeout: 20_000 })
  await resource.locator('.resource-description').waitFor({ state: 'visible', timeout: 20_000 })
  await resource.locator('.resource-tags .resource-tag').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS122(page, scenario, fixture) {
  await prepareS121(page, scenario, fixture)
  const firstResource = page.locator('.resource-selector .resource-item').first()
  await firstResource.click()
  const form = page.locator('.form-card form')
  await form.waitFor({ state: 'visible', timeout: 20_000 })
  await form.locator('.el-rate__item').nth(3).click()
  await form.locator('.el-radio').filter({ hasText: '视觉提示' }).click()
  await form.getByRole('spinbutton').fill('12')
  await form.locator('textarea').fill('演示记录：在视觉提示下完成器材训练。')
  await expectText(form, '训练评分')
  await expectText(form, '辅助等级')
  await expectText(form, '训练时长')
  if (await form.locator('input[type="date"]').count() > 0) {
    throw new Error('Equipment quick entry form must not expose a date input')
  }
}

async function prepareS017(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '学生详情')
  await expectText(page, DEMO_STUDENTS[0].name)
}

async function prepareS023(page, scenario, fixture) {
  await prepareStudentsPage(page, scenario, fixture)
  const card = page.locator('.student-card').filter({ hasText: DEMO_STUDENTS[2].name }).first()
  await card.waitFor({ state: 'visible', timeout: 20_000 })
  await card.locator('.student-card__menu-button').click()
  await page.getByRole('menuitem', { name: '删除' }).click()
  await expectText(page, '确认删除')
  await expectText(page, DEMO_STUDENTS[2].name)
}

async function prepareS057(page, scenario, fixture) {
  await page.setViewportSize({ width: 1920, height: 1600 }).catch(() => {})
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '能力雷达图', 30_000)
  await page.locator('.radar-chart canvas').waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForFunction(() => {
    const rows = Array.from(document.querySelectorAll('.dimensions-card .el-table__body tr'))
    return rows.length === 6 && rows.some((row) => {
      const passCount = Number(row.querySelectorAll('td')[1]?.textContent?.trim() || 0)
      return passCount > 0
    })
  }, undefined, { timeout: 30_000 })
  await page.locator('.radar-card').scrollIntoViewIfNeeded()
  await page.waitForTimeout(1000)
}

async function prepareS123(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const firstResource = page.locator('.resource-item').first()
  await firstResource.waitFor({ state: 'visible', timeout: 30_000 })
  await firstResource.click()
  await page.getByRole('button', { name: '保存并继续' }).waitFor({ state: 'visible', timeout: 20_000 })
  await page.getByRole('button', { name: '保存并继续' }).click()
  await page.locator('.el-message').filter({ hasText: '保存成功' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS124(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const records = page.locator('.records-list')
  await records.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(page, '器材训练记录')
  const card = records.locator('.record-card').filter({ hasText: '演示器材训练记录' }).first()
  await card.waitFor({ state: 'visible', timeout: 30_000 })
  await card.locator('.equipment-icon').waitFor({ state: 'visible', timeout: 20_000 })
  await card.getByRole('button', { name: '查看评语' }).waitFor({ state: 'visible', timeout: 20_000 })
  await card.getByRole('button', { name: '删除' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS125(page, scenario, fixture) {
  await prepareS124(page, scenario, fixture)
  const card = page.locator('.record-card').filter({ hasText: '演示器材训练记录' }).first()
  await card.getByRole('button', { name: '查看评语' }).click()
  const dialog = page.getByRole('dialog', { name: 'IEP 训练评语' })
  await dialog.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(dialog, '表现评估')
  await expectText(dialog, '训练建议')
  await dialog.getByRole('button', { name: '导出' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS126(page, scenario, fixture) {
  await prepareS124(page, scenario, fixture)
  const card = page.locator('.record-card').filter({ hasText: '演示器材训练记录' }).first()
  await card.getByRole('button', { name: '删除' }).click()
  const confirmation = page.locator('.el-message-box').filter({ hasText: '确定要删除这条训练记录吗？' }).first()
  await confirmation.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(confirmation, '提示')
  await confirmation.getByRole('button', { name: '取消' }).waitFor({ state: 'visible', timeout: 20_000 })
  await confirmation.getByRole('button', { name: '确定' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS127(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const taskList = page.locator('.self-care-task-list-page')
  await taskList.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(taskList, '自理训练')
  await taskList.locator('.task-gallery-pill').first().waitFor({ state: 'visible', timeout: 30_000 })
  const card = taskList.locator('.task-gallery-card').filter({ hasText: '演示刷牙任务' }).first()
  await card.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(card, '个人卫生')
}

async function prepareS128(page, scenario, fixture) {
  await prepareS127(page, scenario, fixture)
  const taskList = page.locator('.self-care-task-list-page')
  const personalHygiene = taskList.locator('.task-gallery-pill').filter({ hasText: '个人卫生' }).first()
  await personalHygiene.click()
  await personalHygiene.locator('xpath=..').waitFor({ state: 'visible', timeout: 20_000 })
  const card = taskList.locator('.task-gallery-card').filter({ hasText: '演示刷牙任务' }).first()
  await card.waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS129(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const editor = page.locator('.self-care-task-editor-page')
  await editor.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(editor, '新建自理任务')
  const basic = editor.locator('.editor-card').first()
  await expectText(basic, '资源基础信息')
  await basic.getByText('任务名称', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
  await basic.getByText('任务描述', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
  await basic.getByText('封面路径', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS130(page, scenario, fixture) {
  await prepareS129(page, scenario, fixture)
  const taskEditor = page.locator('.task-training-editor')
  await taskEditor.scrollIntoViewIfNeeded()
  await expectText(taskEditor, '一级分类名称')
  await expectText(taskEditor, '能力项名称')
  await expectText(taskEditor, '结构化元数据')
}

async function prepareS131(page, scenario, fixture) {
  await prepareS130(page, scenario, fixture)
  const taskEditor = page.locator('.task-training-editor')
  await taskEditor.getByRole('button', { name: '新增步骤' }).click()
  await taskEditor.locator('.step-list .step-card').nth(1).waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(taskEditor, '步骤说明')
  await expectText(taskEditor, '图片路径')
}

async function prepareS132(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const editor = page.locator('.self-care-task-editor-page')
  await editor.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(editor, '编辑自理任务')
  const form = editor.locator('.self-care-task-editor-form')
  await form.locator('input').first().waitFor({ state: 'visible', timeout: 20_000 })
  const taskName = await form.locator('input').first().inputValue()
  if (taskName !== '演示刷牙任务') {
    throw new Error(`Self-care task editor did not load the fixture task: ${taskName}`)
  }
  const firstStepText = await editor.locator('input[placeholder="例如 拿起勺子"]').first().inputValue()
  if (firstStepText !== '取出牙刷并挤上适量牙膏') {
    throw new Error(`Self-care task editor did not load the fixture first step: ${firstStepText}`)
  }
  await editor.getByRole('button', { name: '保存修改' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS133(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const selector = page.locator('.student-selector-page')
  await selector.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(selector, '演示刷牙任务 · 选择学生')
  await expectText(selector, '生活自理')
  await selector.locator('.student-table-shell .student-row').first().waitFor({ state: 'visible', timeout: 30_000 })
}

async function prepareS134(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const execution = page.locator('.task-execution-page')
  await execution.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(execution, '演示刷牙任务')
  await expectText(execution, '步骤 1')
  await expectText(execution, '取出牙刷并挤上适量牙膏')
  await execution.locator('.task-stage-figure__image').waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(execution, '完成等级')
  await execution.getByRole('button', { name: '独立完成' }).waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(execution, '错误等级')
  await execution.getByRole('button', { name: '下一步' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS135(page, scenario, fixture) {
  await prepareS134(page, scenario, fixture)
  const execution = page.locator('.task-execution-page')
  await execution.getByRole('button', { name: '口头提示' }).click()
  await execution.getByRole('button', { name: '轻度' }).click()
  await execution.locator('.task-notes-input textarea').fill('演示：口头提示后完成第一个步骤。')
  await execution.getByRole('button', { name: '下一步' }).click()
  await expectText(execution, '步骤 2')
  await expectText(execution, '按顺序清洁牙齿内外侧')
  await execution.getByRole('button', { name: '完成训练' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS136(page, scenario, fixture) {
  await prepareS135(page, { ...scenario, route: '/self-care/execute/{taskId}/{studentId}' }, fixture)
  const execution = page.locator('.task-execution-page')
  await execution.getByRole('button', { name: '独立完成' }).click()
  await execution.getByRole('button', { name: '无', exact: true }).click()
  await execution.locator('.task-notes-input textarea').fill('演示：独立完成最后一个步骤。')
  await execution.getByRole('button', { name: '完成训练' }).click()
  await page.waitForURL(/#\/training-records\/life-skills\?type=game/u, { timeout: 30_000 })
  const records = page.locator('.records-panel')
  await records.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(page, '自理训练已完成并保存')
  await expectText(records, '演示刷牙任务')
}

async function prepareS137(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const menu = page.locator('.module-grid')
  await menu.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(page, '训练记录')
  const sensoryCard = menu.locator('.module-card').filter({ hasText: '感官统合训练' }).first()
  await sensoryCard.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(sensoryCard, '游戏记录')
  await expectText(sensoryCard, '器材记录')
}

async function prepareS138(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const panel = page.locator('.records-panel')
  await panel.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(page, '感官统合训练')
  await expectText(page, '游戏训练记录')
  await expectText(panel, '任务名称')
  const rows = panel.locator('.records-table tbody tr')
  await rows.nth(1).waitFor({ state: 'visible', timeout: 30_000 })
}

async function prepareS139(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const panel = page.locator('.records-panel')
  await panel.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(page, '器材训练记录')
  await expectText(panel, '器材名称')
  const rows = panel.locator('.records-table tbody tr')
  await rows.nth(1).waitFor({ state: 'visible', timeout: 30_000 })
}

async function prepareS140(page, scenario, fixture) {
  await prepareS138(page, scenario, fixture)
  const panel = page.locator('.records-panel')
  await panel.locator('.student-filter').click()
  await page.locator('.el-select-dropdown__item').filter({ hasText: DEMO_STUDENTS[0].name }).last().click()
  await panel.getByRole('button', { name: '本周' }).click()
  await panel.locator('.records-table tbody tr').first().waitFor({ state: 'visible', timeout: 30_000 })
}

async function prepareS141(page, scenario, fixture) {
  await prepareS139(page, scenario, fixture)
  const panel = page.locator('.records-panel')
  await panel.locator('.student-filter').click()
  await page.locator('.el-select-dropdown__item').filter({ hasText: DEMO_STUDENTS[0].name }).last().click()
  await panel.locator('.category-filter').click()
  await page.locator('.el-select-dropdown__item:not(.is-disabled)').last().click()
  await panel.getByRole('button', { name: '本周' }).click()
  await panel.locator('.records-table tbody tr').first().waitFor({ state: 'visible', timeout: 30_000 })
}

async function prepareS142(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const reports = page.locator('.reports-page')
  await reports.waitFor({ state: 'visible', timeout: 30_000 })
  await reports.getByRole('button', { name: '重置' }).click()
  await expectText(reports, '报告中心')
  await reports.locator('.reports-filters').waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(reports, '评估报告')
  await expectText(reports, '训练与干预报告')
  const rows = reports.locator('.reports-table tbody tr')
  await rows.nth(2).waitFor({ state: 'visible', timeout: 30_000 })
}

async function prepareS143(page, scenario, fixture) {
  await prepareS142(page, scenario, fixture)
  const reports = page.locator('.reports-page')
  const filterFields = reports.locator('.reports-filter-field')
  await filterFields.nth(0).locator('.el-select').click()
  await page.locator('.el-select-dropdown__item').filter({ hasText: DEMO_STUDENTS[0].name }).last().click()
  await filterFields.nth(1).locator('.el-select').click()
  await page.locator('.el-select-dropdown__item').filter({ hasText: 'S-M 评估报告' }).last().click()
  await reports.getByRole('button', { name: '本月' }).click()
  const row = reports.locator('.reports-table tbody tr').filter({ hasText: 'S-M 量表演示报告' }).first()
  await row.waitFor({ state: 'visible', timeout: 30_000 })
}

async function prepareS144(page, scenario, fixture) {
  await prepareS142(page, scenario, fixture)
  const row = page.locator('.reports-table tbody tr').filter({ hasText: 'S-M 量表演示报告' }).first()
  await row.waitFor({ state: 'visible', timeout: 30_000 })
  await row.getByRole('button', { name: '查看' }).waitFor({ state: 'visible', timeout: 20_000 })
  await row.getByRole('button', { name: '下载' }).waitFor({ state: 'visible', timeout: 20_000 })
  await row.getByRole('button', { name: '删除' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS145(page, scenario, fixture) {
  await prepareS144(page, scenario, fixture)
  const row = page.locator('.reports-table tbody tr').filter({ hasText: 'S-M 量表演示报告' }).first()
  await row.getByRole('button', { name: '删除' }).click()
  const confirmation = page.locator('.el-message-box').filter({ hasText: '确定要删除报告“S-M 量表演示报告”吗？' }).first()
  await confirmation.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(confirmation, '删除确认')
  await confirmation.getByRole('button', { name: '取消' }).waitFor({ state: 'visible', timeout: 20_000 })
  await confirmation.getByRole('button', { name: '确定' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS146(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.sm-report')
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(report, 'S-M量表评估报告')
  await expectText(report, '婴儿-初中生社会生活能力量表评估报告')
  await report.getByRole('button', { name: '导出Word' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS147(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const report = page.locator('.page-container').filter({ hasText: '模块报告' }).first()
  await report.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(report, '模块报告')
  await expectText(report, DEMO_STUDENTS[0].name)
  await expectText(report, '训练总次数')
  await report.getByRole('button', { name: '导出Word' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS148(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const reports = page.locator('.reports-page')
  await reports.waitFor({ state: 'visible', timeout: 30_000 })
  await reports.getByRole('button', { name: '迁移历史数据' }).waitFor({ state: 'visible', timeout: 20_000 })
  if (/devtools|migration/iu.test(new URL(page.url()).hash)) {
    throw new Error(`Historical report scenario must remain in the report center: ${page.url()}`)
  }
}

async function prepareS149(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const center = page.locator('.resource-center-page')
  await center.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(center, '资源中心')
  await center.getByText('训练资源', { exact: true }).first().waitFor({ state: 'visible', timeout: 20_000 })
  const resources = center.locator('.training-resources')
  await resources.locator('.filter-panel').waitFor({ state: 'visible', timeout: 30_000 })
  await resources.locator('.resource-table').waitFor({ state: 'visible', timeout: 30_000 })
  if (await resources.getByRole('button', { name: '新建资源' }).count() > 0) {
    throw new Error('Teacher resource-center view must not expose administrator maintenance controls')
  }
}

async function prepareS150(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const resources = page.locator('.training-resources')
  await resources.waitFor({ state: 'visible', timeout: 30_000 })
  const filterPanel = resources.locator('.filter-panel')
  await filterPanel.locator('.el-radio-button').filter({ hasText: '器材' }).click()
  const firstResource = resources.locator('.resource-table .resource-name').first()
  await firstResource.waitFor({ state: 'visible', timeout: 30_000 })
  const keyword = (await firstResource.innerText()).trim()
  await filterPanel.getByPlaceholder('搜索资源名称...').fill(keyword)
  await page.waitForTimeout(400)
  await resources.locator('.resource-table tbody tr').first().waitFor({ state: 'visible', timeout: 30_000 })
}

async function prepareS151(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const resources = page.locator('.training-resources')
  await resources.waitFor({ state: 'visible', timeout: 30_000 })
  const filterPanel = resources.locator('.filter-panel')
  await filterPanel.locator('.el-radio-button').filter({ hasText: '器材' }).click()
  await filterPanel.getByPlaceholder('搜索资源名称...').fill('演示平衡训练器材')
  await page.waitForTimeout(400)
  const row = resources.locator('.resource-table tbody tr').filter({ hasText: '演示平衡训练器材' }).first()
  await row.waitFor({ state: 'visible', timeout: 30_000 })
  await row.locator('.thumbnail-cell').waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(row, '隔离截图夹具')
  await row.locator('.tag-item').first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS152(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const resources = page.locator('.training-resources')
  await resources.waitFor({ state: 'visible', timeout: 30_000 })
  await resources.getByRole('button', { name: '新建资源' }).click()
  const dialog = page.getByRole('dialog', { name: '新建资源' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(dialog, '业务模块')
  await expectText(dialog, '资源类型')
  await expectText(dialog, '资源名称')
  await dialog.getByRole('button', { name: '创建资源' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS153(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const resources = page.locator('.training-resources')
  await resources.waitFor({ state: 'visible', timeout: 30_000 })
  const createDialog = page.getByRole('dialog', { name: '新建资源' })
  if (await createDialog.isVisible().catch(() => false)) {
    await createDialog.getByRole('button', { name: '取消' }).click()
    await createDialog.waitFor({ state: 'hidden', timeout: 20_000 })
  }
  const systemRow = resources.locator('.resource-table tbody tr').filter({ hasText: '系统' }).first()
  await systemRow.waitFor({ state: 'visible', timeout: 30_000 })
  await systemRow.getByRole('button', { name: '编辑' }).click()
  const dialog = page.getByRole('dialog', { name: '编辑资源（系统预置）' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.locator('input:disabled').first().waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(dialog, '详细描述')
  await expectText(dialog, '能力标签')
  await dialog.getByRole('button', { name: '保存修改' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function selectEmotionalResourceBusinessGroup(page) {
  const resources = page.locator('.training-resources')
  await resources.waitFor({ state: 'visible', timeout: 30_000 })
  await resources.locator('.filter-panel').locator('.el-radio-button').filter({ hasText: '情绪行为' }).click()
  await expectText(resources.locator('.toolbar'), '情绪行为')
  return resources
}

async function selectSensoryResourceBusinessGroup(page) {
  const resources = page.locator('.training-resources')
  await resources.waitFor({ state: 'visible', timeout: 30_000 })
  await resources.locator('.filter-panel').locator('.el-radio-button').filter({ hasText: '感官训练' }).click()
  await expectText(resources.locator('.toolbar'), '感官训练')
  return resources
}

async function closeVisibleResourceDialogs(page) {
  const dialogs = page.locator('.el-dialog:visible')
  while (await dialogs.count() > 0) {
    const dialog = dialogs.last()
    const cancel = dialog.getByRole('button', { name: '取消' })
    if (await cancel.count() > 0) {
      await cancel.click()
    } else {
      await dialog.locator('.el-dialog__headerbtn').click()
    }
    await dialog.waitFor({ state: 'hidden', timeout: 20_000 })
  }
}

async function prepareS154(page, scenario, fixture, workspace) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const resources = await selectEmotionalResourceBusinessGroup(page)
  await resources.getByRole('button', { name: '导入资源包' }).click()
  const dialog = page.getByRole('dialog', { name: '导入情绪资源包' })
  await dialog.waitFor({ state: 'visible', timeout: 30_000 })
  const packContent = await page.evaluate(async () => {
    const { ResourceAPI } = await import('/src/database/resource-api.ts')
    const { createEmotionalJsonPack } = await import('/src/utils/emotional-resource-pack.ts')
    const resources = new ResourceAPI().getAllResourcesForAdmin({ moduleCode: 'emotional' })
      .filter((resource) => resource.resourceType === 'emotion_scene' || resource.resourceType === 'care_scene')
      .slice(0, 1)
    if (resources.length === 0) throw new Error('No emotional resource is available for the import preview fixture')
    return JSON.stringify(createEmotionalJsonPack(resources), null, 2)
  })
  const packPath = path.join(workspace.temporary, 'SCGP-情绪资源包预览.json')
  fs.writeFileSync(packPath, packContent, 'utf8')
  await dialog.locator('input.hidden-file-input[type="file"]').setInputFiles(packPath)
  await dialog.locator('.summary-row').waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(dialog, 'JSON Pack')
  await expectText(dialog, '可执行')
  await dialog.getByRole('button', { name: '开始导入' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS155(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await closeVisibleResourceDialogs(page)
  const resources = await selectEmotionalResourceBusinessGroup(page)
  await resources.getByRole('button', { name: '导出资源包' }).click()
  const dialog = page.getByRole('dialog', { name: '导出情绪资源包' })
  await dialog.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(dialog, '导出当前筛选范围内的情绪资源')
  await expectText(dialog, '情绪场景')
  await dialog.getByRole('button', { name: '导出资源包' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS156(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await closeVisibleResourceDialogs(page)
  const resources = await selectSensoryResourceBusinessGroup(page)
  await resources.locator('.filter-panel').getByPlaceholder('搜索资源名称...').fill('演示平衡训练器材')
  await page.waitForTimeout(400)
  const row = resources.locator('.resource-table tbody tr').filter({ hasText: '演示平衡训练器材' }).first()
  await row.waitFor({ state: 'visible', timeout: 30_000 })
  await row.locator('.el-switch').click()
  await page.locator('.el-message').filter({ hasText: '已禁用: 演示平衡训练器材' }).waitFor({ state: 'visible', timeout: 20_000 })
  const filterPanel = resources.locator('.filter-panel')
  await filterPanel.locator('.el-checkbox').filter({ hasText: '启用中' }).click()
  await filterPanel.locator('.el-checkbox').filter({ hasText: '已禁用' }).click()
  await row.waitFor({ state: 'visible', timeout: 30_000 })
  await row.getByRole('button', { name: '恢复' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS157(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await closeVisibleResourceDialogs(page)
  const resources = await selectSensoryResourceBusinessGroup(page)
  await resources.locator('.filter-panel').getByPlaceholder('搜索资源名称...').fill('演示可删除训练器材')
  await page.waitForTimeout(400)
  const row = resources.locator('.resource-table tbody tr').filter({ hasText: '演示可删除训练器材' }).first()
  await row.waitFor({ state: 'visible', timeout: 30_000 })
  await row.getByRole('button', { name: '删除' }).click()
  const dialog = page.getByRole('dialog', { name: '确认删除' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(dialog, '演示可删除训练器材')
  await expectText(dialog, '可在筛选"已禁用"后恢复')
  await dialog.getByRole('button', { name: '取消' }).waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByRole('button', { name: '确认删除' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS158(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await closeVisibleResourceDialogs(page)
  const resources = await selectSensoryResourceBusinessGroup(page)
  const filterPanel = resources.locator('.filter-panel')
  await filterPanel.locator('.el-checkbox').filter({ hasText: '启用中' }).click()
  await filterPanel.locator('.el-checkbox').filter({ hasText: '已禁用' }).click()
  await filterPanel.getByPlaceholder('搜索资源名称...').fill('演示可恢复训练器材')
  await page.waitForTimeout(400)
  const row = resources.locator('.resource-table tbody tr').filter({ hasText: '演示可恢复训练器材' }).first()
  await row.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(row, '禁用')
  await row.getByRole('button', { name: '恢复' }).waitFor({ state: 'visible', timeout: 20_000 })
}

const TEACHING_MATERIAL_FIXTURE_TITLE = '演示感官训练指导手册'

function createTeachingMaterialImportFixture(workspace) {
  const sourceFolder = path.join(workspace.temporary, 'teaching-material-import-source')
  const materialFileName = 'SCGP-批量导入演示资料.txt'
  const materialPath = path.join(sourceFolder, materialFileName)
  const csvPath = path.join(workspace.temporary, 'SCGP-教学资料批量导入.csv')
  fs.mkdirSync(sourceFolder, { recursive: true })
  fs.writeFileSync(materialPath, 'SCGP teaching material import fixture\n', 'utf8')
  fs.writeFileSync(csvPath, [
    'relativePath,dimensionCode,title,tags,description',
    `"${materialFileName}","sensory-training","演示批量导入资料","批量导入|隔离截图","仅用于隔离截图批量导入演示。"`,
  ].join('\n'), 'utf8')
  return { sourceFolder, csvPath, materialFileName }
}

async function prepareTeachingMaterialsPage(page, scenario, fixture, sourceFolderPath) {
  if (sourceFolderPath) {
    await page.evaluate((folderPath) => {
      localStorage.setItem('teaching-material-source-folder', folderPath)
    }, sourceFolderPath)
    await navigateHash(page, '/resource-center?tab=training')
    await page.locator('.training-resources').waitFor({ state: 'visible', timeout: 30_000 })
  }
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await closeVisibleResourceDialogs(page)
  const materials = page.locator('.teaching-materials')
  await materials.waitFor({ state: 'visible', timeout: 30_000 })
  return materials
}

async function getTeachingMaterialCard(page) {
  const card = page.locator('.material-card').filter({ hasText: TEACHING_MATERIAL_FIXTURE_TITLE }).first()
  await card.waitFor({ state: 'visible', timeout: 30_000 })
  return card
}

async function prepareS159(page, scenario, fixture) {
  const materials = await prepareTeachingMaterialsPage(page, scenario, fixture)
  await materials.locator('.toolbar').waitFor({ state: 'visible', timeout: 20_000 })
  await materials.locator('.file-category-filter').waitFor({ state: 'visible', timeout: 20_000 })
  await materials.locator('.material-grid').waitFor({ state: 'visible', timeout: 30_000 })
  await getTeachingMaterialCard(page)
}

async function prepareS160(page, scenario, fixture) {
  await prepareTeachingMaterialsPage(page, scenario, fixture)
  const card = await getTeachingMaterialCard(page)
  await card.locator('.material-actions .el-button').nth(0).waitFor({ state: 'visible', timeout: 20_000 })
  await card.locator('.material-actions .el-button').nth(1).waitFor({ state: 'visible', timeout: 20_000 })
  const favorite = card.locator('.favorite-icon')
  await favorite.click()
  await favorite.click()
  const isFavorite = await favorite.evaluate((element) => element.classList.contains('active'))
  if (!isFavorite) {
    throw new Error('Teaching material favorite must remain visible after the demo toggle')
  }
}

async function prepareS161(page, scenario, fixture) {
  await prepareTeachingMaterialsPage(page, scenario, fixture)
  const card = await getTeachingMaterialCard(page)
  await card.locator('.material-actions .el-button').nth(1).click()
  const dialog = page.getByRole('dialog', { name: '教学资料详情' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(dialog, TEACHING_MATERIAL_FIXTURE_TITLE)
  await expectText(dialog, '受管路径')
  await expectText(dialog, '感官训练')
  await expectText(dialog, '操作指导')
  await dialog.getByRole('button', { name: '打开资料' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS162(page, scenario, fixture) {
  const materials = await prepareTeachingMaterialsPage(page, scenario, fixture)
  await materials.getByRole('button', { name: '我的收藏' }).click()
  await expectText(materials.locator('.content-header'), '当前显示收藏教学资料')
  await getTeachingMaterialCard(page)
  await materials.getByRole('button', { name: '全部资料' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS163(page, scenario, fixture, workspace) {
  const importFixture = createTeachingMaterialImportFixture(workspace)
  const materials = await prepareTeachingMaterialsPage(page, scenario, fixture, importFixture.sourceFolder)
  await materials.getByRole('button', { name: '更换素材目录' }).waitFor({ state: 'visible', timeout: 20_000 })
  await materials.getByRole('button', { name: '下载CSV模板' }).waitFor({ state: 'visible', timeout: 20_000 })
  await materials.getByRole('button', { name: '上传资料' }).waitFor({ state: 'visible', timeout: 20_000 })
  await materials.getByRole('button', { name: '批量导入' }).waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(materials.locator('.source-folder'), importFixture.sourceFolder)
}

async function prepareS164(page, scenario, fixture, workspace) {
  const uploadPath = path.join(workspace.temporary, 'SCGP-上传教学资料演示.txt')
  fs.writeFileSync(uploadPath, 'SCGP teaching material upload fixture\n', 'utf8')
  const materials = await prepareTeachingMaterialsPage(page, scenario, fixture)
  await materials.getByRole('button', { name: '上传资料' }).click()
  const dialog = page.getByRole('dialog', { name: '上传教学资料' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.locator('input[placeholder="请输入资料标题"]').fill('演示上传教学资料')
  await selectElementPlusOption(page, dialog.locator('.el-select'), '感官训练')
  await dialog.locator('input[type="file"]').setInputFiles(uploadPath)
  await expectText(dialog, '已选择：SCGP-上传教学资料演示.txt')
  await dialog.getByRole('button', { name: '上传' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS165(page, scenario, fixture, workspace) {
  const importFixture = createTeachingMaterialImportFixture(workspace)
  const materials = await prepareTeachingMaterialsPage(page, scenario, fixture, importFixture.sourceFolder)
  await materials.getByRole('button', { name: '批量导入' }).click()
  const dialog = page.getByRole('dialog', { name: '批量导入教学资料' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.locator('input[type="file"]').setInputFiles(importFixture.csvPath)
  await expectText(dialog, importFixture.sourceFolder)
  await expectText(dialog, `已选择：${path.basename(importFixture.csvPath)}`)
  await dialog.getByRole('button', { name: '开始导入' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS166(page, scenario, fixture, workspace) {
  const importFixture = createTeachingMaterialImportFixture(workspace)
  const materials = await prepareTeachingMaterialsPage(page, scenario, fixture, importFixture.sourceFolder)
  await materials.getByRole('button', { name: '批量导入' }).click()
  const dialog = page.getByRole('dialog', { name: '批量导入教学资料' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.locator('input[type="file"]').setInputFiles(importFixture.csvPath)
  await dialog.getByRole('button', { name: '开始导入' }).click()
  await page.locator('.el-message').filter({ hasText: '批量导入完成，共导入 1 条资料' })
    .waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(dialog, '成功导入：1')
  await dialog.getByText('失败数量：0', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('.material-card').filter({ hasText: '演示批量导入资料' })
    .waitFor({ state: 'visible', timeout: 30_000 })
}

async function closeAiAssistantDrawer(page) {
  const existingDrawer = page.getByRole('dialog', { name: 'AI 智能体' })
  if (await existingDrawer.isVisible().catch(() => false)) {
    const cancelEdit = existingDrawer.getByRole('button', { name: '取消编辑' })
    if (await cancelEdit.isVisible().catch(() => false)) {
      await cancelEdit.evaluate((button) => button.click())
      await cancelEdit.waitFor({ state: 'hidden', timeout: 20_000 })
    }
    await existingDrawer.getByRole('button', { name: '关闭会话面板' }).click()
    await existingDrawer.waitFor({ state: 'hidden', timeout: 20_000 })
  }
}

async function dismissAiPrivacyDialog(page) {
  const dialog = page.getByRole('dialog', { name: 'AI 外发隐私告知' })
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole('button', { name: '取消发送' }).click()
    await dialog.waitFor({ state: 'hidden', timeout: 20_000 })
  }
}

async function openAiAssistantDrawer(page, scenario, fixture) {
  await dismissAiPrivacyDialog(page)
  await closeAiAssistantDrawer(page)
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const launcher = page.locator('.ai-floating-button')
  await launcher.waitFor({ state: 'visible', timeout: 30_000 })
  await launcher.click()
  const drawer = page.getByRole('dialog', { name: 'AI 智能体' })
  await drawer.waitFor({ state: 'visible', timeout: 30_000 })
  await launcher.waitFor({ state: 'hidden', timeout: 20_000 })
  return drawer
}

async function prepareS167(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const launcher = page.locator('.ai-floating-button')
  await launcher.waitFor({ state: 'visible', timeout: 30_000 })
  const box = await launcher.boundingBox()
  if (!box || Math.abs(box.width - 60) > 1 || Math.abs(box.height - 60) > 1) {
    throw new Error('AI floating launcher must keep its 60px circular hit area')
  }
  await launcher.getByRole('img').count().catch(() => 0)
  await launcher.getByText('打开 AI 助手', { exact: true }).waitFor({ state: 'attached', timeout: 20_000 })
}

async function prepareS168(page, scenario, fixture) {
  const drawer = await openAiAssistantDrawer(page, scenario, fixture)
  await drawer.locator('.ai-body').waitFor({ state: 'visible', timeout: 20_000 })
  await drawer.locator('.ai-msg-scroll').waitFor({ state: 'visible', timeout: 20_000 })
  await drawer.locator('.ai-composer').waitFor({ state: 'visible', timeout: 20_000 })
  await drawer.getByRole('button', { name: '关闭会话面板' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS169(page, scenario, fixture) {
  const drawer = await openAiAssistantDrawer(page, scenario, fixture)
  await drawer.locator('.agent-select .el-select__wrapper').click()
  const options = page.locator('.el-select-dropdown:visible').last()
  await options.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(options, '一人一策')
  await expectText(options, '沟通有方')
}

async function prepareS170(page, scenario, fixture) {
  const drawer = await openAiAssistantDrawer(page, scenario, fixture)
  await drawer.getByRole('button', { name: '模型与设置' }).click()
  const panel = page.locator('.ai-model-panel')
  await panel.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(panel, '当前模型')
  await panel.locator('.model-select .el-select__wrapper').click()
  const options = page.locator('.el-select-dropdown:visible').last()
  await options.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(options, 'DeepSeek V4 Flash')
  await expectText(options, 'DeepSeek V4 Pro')
}

async function prepareS171(page, scenario, fixture) {
  const drawer = await openAiAssistantDrawer(page, scenario, fixture)
  await selectElementPlusOption(page, drawer.locator('.agent-select'), '一人一策')
  await drawer.getByRole('button', { name: '新对话' }).click()
  await expectText(drawer, '向「一人一策」提问吧')
  await drawer.locator('.starter-prompts').waitFor({ state: 'visible', timeout: 20_000 })
  await drawer.getByRole('button', { name: '生成报告' }).waitFor({ state: 'visible', timeout: 20_000 })
  await drawer.getByRole('button', { name: '添加图片或文档' }).waitFor({ state: 'visible', timeout: 20_000 })
  await drawer.getByPlaceholder('输入问题，Enter 发送 / Shift+Enter 换行').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS172(page, scenario, fixture) {
  const drawer = await openAiAssistantDrawer(page, scenario, fixture)
  const sessions = drawer.locator('.ai-session-collapse')
  await sessions.waitFor({ state: 'visible', timeout: 20_000 })
  await sessions.locator('.el-collapse-item__header').click()
  await sessions.locator('.ai-session-list').waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(sessions, '最近会话 (2)')
  await expectText(sessions, '资源教室训练安排')
  await expectText(sessions, '课堂沟通支持记录')
  const primarySession = sessions.locator('.ai-session-item').filter({ hasText: '资源教室训练安排' })
  await expectText(primarySession, '07-28 09:20')
  await primarySession.getByRole('button', { name: '继续' }).waitFor({ state: 'visible', timeout: 20_000 })
  await sessions.getByRole('button', { name: '查看全部历史', exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS173(page, scenario, fixture) {
  await closeAiAssistantDrawer(page)
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const history = page.locator('.ai-history-page')
  await history.waitFor({ state: 'visible', timeout: 30_000 })
  await history.locator('.ai-history-filters').waitFor({ state: 'visible', timeout: 20_000 })
  const row = history.locator('.ai-history-table .el-table__body tr').filter({
    hasText: '资源教室训练安排',
  }).first()
  await row.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(row, '一人一策')
  await row.getByRole('button', { name: '查看' }).waitFor({ state: 'visible', timeout: 20_000 })
  await row.getByRole('button', { name: '继续对话' }).waitFor({ state: 'visible', timeout: 20_000 })
  await row.getByRole('button', { name: '删除' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS174(page, scenario, fixture, workspace) {
  const drawer = await openAiAssistantDrawer(page, scenario, fixture)
  const attachmentPath = path.join(workspace.temporary, 'SCGP-演示附件.pdf')
  fs.writeFileSync(attachmentPath, 'SCGP manual screenshot fixture\n', 'utf8')
  await drawer.locator('.ai-file-input').setInputFiles(attachmentPath)
  await drawer.locator('.ai-pending-doc-name').filter({ hasText: 'SCGP-演示附件.pdf' })
    .waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS175(page, scenario, fixture) {
  const drawer = await openAiAssistantDrawer(page, scenario, fixture)
  await drawer.getByRole('button', { name: '新对话' }).click()
  const input = drawer.getByPlaceholder('输入问题，Enter 发送 / Shift+Enter 换行')
  await input.fill('这是一条仅用于隐私告知演示的消息。')
  await drawer.getByRole('button', { name: '发送' }).click()
  const dialog = page.getByRole('dialog', { name: 'AI 外发隐私告知' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(dialog, '外部 AI 模型服务')
  await expectText(dialog, '学生身份、诊断结论、评估结果')
  await dialog.getByRole('button', { name: '取消发送' }).waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByRole('button', { name: '我已知悉，继续发送' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS176(page, scenario, fixture) {
  const drawer = await openAiAssistantDrawer(page, scenario, fixture)
  const sessions = drawer.locator('.ai-session-collapse')
  await sessions.waitFor({ state: 'visible', timeout: 20_000 })
  const sessionList = sessions.locator('.ai-session-list')
  if (!await sessionList.isVisible().catch(() => false)) {
    await sessions.locator('.el-collapse-item__header').click()
    await sessionList.waitFor({ state: 'visible', timeout: 20_000 })
  }
  await sessionList.locator('.ai-session-item').filter({ hasText: '资源教室训练安排' }).click()
  const transcript = drawer.locator('.ai-transcript')
  await transcript.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(transcript, '可以先确认训练目标')
  await transcript.getByRole('button', { name: '编辑这条消息' }).waitFor({ state: 'visible', timeout: 20_000 })
  await transcript.getByRole('button', { name: '导出本条回答为 Word' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS177(page, scenario, fixture) {
  const drawer = await openAiAssistantDrawer(page, scenario, fixture)
  await drawer.getByRole('button', { name: '编辑这条消息' }).click()
  await expectText(drawer, '正在编辑上一条消息')
  const input = drawer.getByPlaceholder('修改消息内容')
  await input.waitFor({ state: 'visible', timeout: 20_000 })
  const value = await input.inputValue()
  if (value !== '请帮我安排一节 20 分钟的资源教室训练。') {
    throw new Error(`Unexpected AI message edit value: ${value}`)
  }
  const saveButton = drawer.getByRole('button', { name: '保存并重新生成' })
  await saveButton.waitFor({ state: 'visible', timeout: 20_000 })
  await saveButton.hover()
  await page.getByText('保存并重新生成', { exact: true }).last()
    .waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS178(page, scenario, fixture) {
  const drawer = await openAiAssistantDrawer(page, scenario, fixture)
  const reportButton = drawer.getByRole('button', { name: '生成报告' })
  const attachmentButton = drawer.getByRole('button', { name: '添加图片或文档' })
  await reportButton.waitFor({ state: 'visible', timeout: 20_000 })
  await attachmentButton.waitFor({ state: 'visible', timeout: 20_000 })
  const [reportBox, attachmentBox] = await Promise.all([
    reportButton.boundingBox(),
    attachmentButton.boundingBox(),
  ])
  if (!reportBox || !attachmentBox || reportBox.y >= attachmentBox.y) {
    throw new Error('AI report action must remain above the attachment action')
  }
  await reportButton.hover()
  await page.getByText('生成报告（导出 Word）', { exact: true }).last()
    .waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS179(page, scenario, fixture) {
  await page.evaluate(() => {
    document.documentElement.dataset.scgpManualAiScriptedReport = '1'
    window.__SCGP_MANUAL_CAPTURE_EXPORT_WORD__ = async (_blob, fileName) => {
      document.body.dataset.scgpManualExportedWord = fileName
    }
    const admin = window.db.get("SELECT id FROM user WHERE username = 'admin' LIMIT 1")
    if (!admin?.id) throw new Error('Manual AI report fixture requires the administrator account')
    window.db.run(
      `INSERT INTO system_config (key, value, description)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [`ai:privacy_ack:user:${admin.id}`, new Date().toISOString(), '用户手册隔离截图夹具'],
    )
  })
  const drawer = await openAiAssistantDrawer(page, scenario, fixture)
  await drawer.getByRole('button', { name: '新对话' }).click()
  await drawer.getByRole('button', { name: '生成报告' }).click()
  await expectText(drawer.locator('.ai-transcript'), '报告工具已执行')
  await page.waitForFunction(
    () => /^资源教室训练支持报告_星愿一号_\d{4}-\d{2}-\d{2}\.docx$/u.test(
      document.body.dataset.scgpManualExportedWord || '',
    ),
    undefined,
    { timeout: 30_000 },
  )
  await expectText(drawer.locator('.ai-transcript'), '隔离导出接收器')
}

const CUSTOM_AI_AGENT_NAME = '演示自定义训练助手'

async function openAiAgentConfiguration(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await closeVisibleResourceDialogs(page)
  const configuration = page.locator('.ai-agent-config')
  await configuration.waitFor({ state: 'visible', timeout: 30_000 })
  return configuration
}

async function prepareS180(page, scenario, fixture) {
  const configuration = await openAiAgentConfiguration(page, scenario, fixture)
  const configCard = configuration.locator('.config-card').first()
  await expectText(configCard, '模型服务配置')
  await expectText(configCard, '已配置 Key')
  await configCard.locator('input[type="password"]').waitFor({ state: 'visible', timeout: 20_000 })
  await configCard.getByText('API Key 加密存储于本地数据库', { exact: false })
    .waitFor({ state: 'visible', timeout: 20_000 })
  await configCard.getByText('默认模型', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS181(page, scenario, fixture) {
  const configuration = await openAiAgentConfiguration(page, scenario, fixture)
  const modelTable = configuration.locator('.model-table')
  await modelTable.waitFor({ state: 'visible', timeout: 30_000 })
  const row = modelTable.locator('.el-table__body tr').first()
  await row.waitFor({ state: 'visible', timeout: 20_000 })
  await row.getByRole('button', { name: '编辑' }).click()
  const dialog = page.getByRole('dialog', { name: '编辑模型' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(dialog, '模型编号')
  await expectText(dialog, '模型 ID')
  await expectText(dialog, '支持工具调用')
  await dialog.getByRole('button', { name: '保存' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS182(page, scenario, fixture) {
  const configuration = await openAiAgentConfiguration(page, scenario, fixture)
  const configCard = configuration.locator('.config-card').first()
  await configCard.getByText('AI 总开关', { exact: true }).scrollIntoViewIfNeeded()
  await expectText(configCard, '月度额度')
  await expectText(configCard, '超预算截断')
  await expectText(configCard, 'AI 总开关')
  await configCard.getByRole('button', { name: '保存配置' }).waitFor({ state: 'visible', timeout: 20_000 })
  await configCard.getByRole('button', { name: '测试连接' }).waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(configCard, '每位教师首次向 AI 发送内容前会弹出')
}

async function prepareS183(page, scenario, fixture) {
  const configuration = await openAiAgentConfiguration(page, scenario, fixture)
  const agents = configuration.locator('.agent-management-card')
  await agents.scrollIntoViewIfNeeded()
  await agents.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(agents, '智能体管理')
  await agents.getByRole('button', { name: '新增' }).waitFor({ state: 'visible', timeout: 20_000 })
  const cards = agents.locator('.agent-card')
  await cards.first().waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(agents, '已启用')
}

async function openCustomAiAgentEditor(page, scenario, fixture) {
  const configuration = await openAiAgentConfiguration(page, scenario, fixture)
  const card = configuration.locator('.agent-card').filter({ hasText: CUSTOM_AI_AGENT_NAME }).first()
  await card.waitFor({ state: 'visible', timeout: 30_000 })
  await card.getByRole('button', { name: '编辑' }).click()
  const dialog = page.getByRole('dialog', { name: '编辑智能体' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  return dialog
}

async function prepareS184(page, scenario, fixture) {
  const dialog = await openCustomAiAgentEditor(page, scenario, fixture)
  await expectText(dialog, '编号')
  await expectText(dialog, '名称')
  await expectText(dialog, '挂载技能')
  const nameInput = dialog.locator('input[placeholder="如 特教老师"]')
  await nameInput.waitFor({ state: 'visible', timeout: 20_000 })
  const nameValue = await nameInput.inputValue()
  if (nameValue !== CUSTOM_AI_AGENT_NAME) {
    throw new Error(`Unexpected custom AI agent name: ${nameValue}`)
  }
  await dialog.getByRole('button', { name: '保存' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS185(page, scenario, fixture) {
  const dialog = await openCustomAiAgentEditor(page, scenario, fixture)
  await expectText(dialog, '引用资料')
  const injectAllReferences = dialog.getByText('注入全部引用资料', { exact: true })
  await injectAllReferences.scrollIntoViewIfNeeded()
  await injectAllReferences.waitFor({ state: 'visible', timeout: 20_000 })
  const prompt = dialog.getByPlaceholder('定义该智能体的角色、专长、回答风格与边界……')
  await prompt.scrollIntoViewIfNeeded()
  await prompt.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(dialog, '提示词')
  await expectText(dialog, '工具」控制可调用功能；「知识」注入专业方法论')
}

async function prepareS186(page, scenario, fixture) {
  const configuration = await openAiAgentConfiguration(page, scenario, fixture)
  const sessionCard = configuration.locator('.config-card').filter({
    hasText: '全部会话（管理员视图）',
  }).first()
  await sessionCard.scrollIntoViewIfNeeded()
  await sessionCard.waitFor({ state: 'visible', timeout: 20_000 })
  const row = sessionCard.locator('.el-table__body tr').filter({ hasText: '资源教室训练安排' }).first()
  await row.waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(row, 'admin')
  await row.getByRole('button', { name: '查看' }).click()
  const dialog = page.getByRole('dialog', { name: '资源教室训练安排' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(dialog, '可以先确认训练目标')
}

async function openSystemUserManagement(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await closeVisibleResourceDialogs(page)
  const users = page.locator('.system-user-management')
  await users.waitFor({ state: 'visible', timeout: 30_000 })
  return users
}

async function getSystemUserRow(users, name) {
  const row = users.locator('.system-user-table__inner .el-table__body tr').filter({ hasText: name }).first()
  await row.waitFor({ state: 'visible', timeout: 30_000 })
  return row
}

async function prepareS187(page, scenario, fixture) {
  const users = await openSystemUserManagement(page, scenario, fixture)
  await expectText(users, '用户管理')
  await users.locator('.system-user-stats').waitFor({ state: 'visible', timeout: 20_000 })
  const table = users.locator('.system-user-table__inner')
  await table.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(table, '用户名')
  await expectText(table, '角色')
  await expectText(table, '状态')
  await expectText(table, '操作')
}

async function prepareS188(page, scenario, fixture) {
  const users = await openSystemUserManagement(page, scenario, fixture)
  await users.getByRole('button', { name: '新增用户' }).click()
  const dialog = page.getByRole('dialog', { name: '新增用户' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByPlaceholder('请输入用户名').waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByPlaceholder('请输入姓名').waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByPlaceholder('请输入密码').waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(dialog, '角色')
  await dialog.getByRole('button', { name: '确定' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS189(page, scenario, fixture) {
  const users = await openSystemUserManagement(page, scenario, fixture)
  const row = await getSystemUserRow(users, 'teacher_demo')
  await row.getByRole('button', { name: '编辑' }).click()
  const dialog = page.getByRole('dialog', { name: '编辑用户' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  const username = dialog.getByPlaceholder('请输入用户名')
  await username.waitFor({ state: 'visible', timeout: 20_000 })
  if (await username.inputValue() !== 'teacher_demo') {
    throw new Error('Unexpected username in the demo teacher editor')
  }
  if (!await username.isDisabled()) {
    throw new Error('Username must remain locked while editing the demo teacher')
  }
  const name = dialog.getByPlaceholder('请输入姓名')
  await name.waitFor({ state: 'visible', timeout: 20_000 })
  if (await name.inputValue() !== '演示教师') {
    throw new Error('Unexpected name in the demo teacher editor')
  }
  await dialog.getByRole('button', { name: '确定' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS190(page, scenario, fixture) {
  const users = await openSystemUserManagement(page, scenario, fixture)
  const row = await getSystemUserRow(users, 'teacher_demo')
  await row.getByRole('button', { name: '重置密码' }).click()
  const dialog = page.getByRole('dialog', { name: '重置密码' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  const newPassword = dialog.getByPlaceholder('请输入新密码')
  await newPassword.waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByPlaceholder('请再次输入新密码').waitFor({ state: 'visible', timeout: 20_000 })
  await newPassword.fill('123')
  await newPassword.press('Tab')
  await expectText(dialog, '密码长度不能少于 6 个字符')
  await dialog.getByRole('button', { name: '确定' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS191(page, scenario, fixture) {
  const users = await openSystemUserManagement(page, scenario, fixture)
  const row = await getSystemUserRow(users, 'teacher_demo')
  await row.locator('.system-user-actions__more').click()
  const menu = page.locator('.el-dropdown-menu:visible').last()
  await menu.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(menu, '禁用账号')
  await expectText(menu, '删除账号')
}

async function prepareS192(page, scenario, fixture) {
  const users = await openSystemUserManagement(page, scenario, fixture)
  const row = await getSystemUserRow(users, 'delete_demo')
  await row.locator('.system-user-actions__more').click()
  const menu = page.locator('.el-dropdown-menu:visible').last()
  await menu.getByText('删除账号', { exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '删除确认' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(dialog, '可删除演示账号')
  await expectText(dialog, '此操作不可恢复')
  await dialog.getByRole('button', { name: '取消' }).waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByRole('button', { name: '确定' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function openBackupManagement(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const panel = page.locator('.system-tab-panel').filter({ hasText: '数据备份与恢复' }).first()
  await panel.waitFor({ state: 'visible', timeout: 30_000 })
  return panel
}

async function prepareBackupFileInfo(page, scenario, fixture, workspace) {
  const panel = await openBackupManagement(page, scenario, fixture)
  const { backupPath, password } = await createBackupFixture(page, workspace)
  await panel.locator('input[type="file"][accept=".dat"]').setInputFiles(backupPath)
  const prompt = page.getByRole('dialog', { name: '请输入备份口令以读取文件信息' })
  await prompt.waitFor({ state: 'visible', timeout: 30_000 })
  await prompt.locator('input').fill(password)
  await prompt.getByRole('button', { name: '确定' }).click()
  await panel.locator('.system-backup-info').waitFor({ state: 'visible', timeout: 30_000 })
  return { panel, password }
}

async function ensureBackupOrphanFixture(workspace, fixture) {
  const orphanPath = path.join(
    workspace.userDataRoot,
    fixture.name,
    'resources',
    'uploaded',
    'manual-screenshot-orphan.txt',
  )
  fs.mkdirSync(path.dirname(orphanPath), { recursive: true })
  fs.writeFileSync(orphanPath, 'SCGP resource health fixture\n', 'utf8')
  return orphanPath
}

async function prepareS193(page, scenario, fixture) {
  const panel = await openBackupManagement(page, scenario, fixture)
  await panel.getByRole('button', { name: '立即备份' }).waitFor({ state: 'visible', timeout: 20_000 })
  await panel.getByRole('button', { name: '选择备份文件' }).waitFor({ state: 'visible', timeout: 20_000 })
  await panel.locator('.resource-health-card').waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(panel, '恢复数据将覆盖当前所有数据')
}

async function prepareS194(page, scenario, fixture) {
  const panel = await openBackupManagement(page, scenario, fixture)
  await panel.getByRole('button', { name: '立即备份' }).click()
  const prompt = page.getByRole('dialog', { name: '请设置本次备份口令' })
  await prompt.waitFor({ state: 'visible', timeout: 20_000 })
  await prompt.locator('input[placeholder*="至少"]').waitFor({ state: 'visible', timeout: 20_000 })
  await prompt.getByRole('button', { name: '确定' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS195(page, scenario, fixture) {
  const panel = await openBackupManagement(page, scenario, fixture)
  const firstPrompt = page.getByRole('dialog', { name: '请设置本次备份口令' })
  if (!(await firstPrompt.isVisible())) {
    await panel.getByRole('button', { name: '立即备份' }).click()
    await firstPrompt.waitFor({ state: 'visible', timeout: 20_000 })
  }
  await firstPrompt.locator('input').fill('SCGP manual backup 2026')
  await firstPrompt.getByRole('button', { name: '确定' }).click()
  const confirmation = page.getByRole('dialog', { name: '请再次输入备份口令' })
  await confirmation.waitFor({ state: 'visible', timeout: 20_000 })
  await confirmation.locator('input[placeholder*="至少"]').waitFor({ state: 'visible', timeout: 20_000 })
  await confirmation.getByRole('button', { name: '取消' }).waitFor({ state: 'visible', timeout: 20_000 })
  await confirmation.getByRole('button', { name: '确定' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS196(page, scenario, fixture, workspace) {
  const { panel } = await prepareBackupFileInfo(page, scenario, fixture, workspace)
  const info = panel.locator('.system-backup-info')
  await expectText(info, '备份版本')
  await expectText(info, '记录数')
  await expectText(info, '表数量')
  await info.getByText('系统：', { exact: false }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS198(page, scenario, fixture, workspace) {
  const { panel } = await prepareBackupFileInfo(page, scenario, fixture, workspace)
  const confirmation = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Restore confirmation dialog did not open')), 20_000)
    page.once('dialog', async (nativeDialog) => {
      try {
        if (!nativeDialog.message().includes('恢复数据将覆盖当前所有数据')) {
          throw new Error(`Unexpected restore confirmation: ${nativeDialog.message()}`)
        }
        await nativeDialog.accept()
        clearTimeout(timer)
        resolve()
      } catch (error) {
        clearTimeout(timer)
        reject(error)
      }
    })
  })
  await panel.getByRole('button', { name: '恢复数据' }).click({ noWaitAfter: true })
  await confirmation
  await page.locator('.el-message').filter({ hasText: /数据(?:已恢复|恢复成功)/u }).waitFor({
    state: 'visible',
    timeout: 60_000,
  })
}

async function prepareS199(page, scenario, fixture, workspace) {
  await ensureBackupOrphanFixture(workspace, fixture)
  const panel = await openBackupManagement(page, scenario, fixture)
  const health = panel.locator('.resource-health-card')
  await health.getByRole('button', { name: '开始体检' }).click()
  await health.locator('.resource-health-stats').waitFor({ state: 'visible', timeout: 30_000 })
  await expectText(health, '磁盘托管文件')
  await expectText(health, '孤儿文件')
  await health.locator('.el-table__body tr').filter({ hasText: 'manual-screenshot-orphan.txt' })
    .waitFor({ state: 'visible', timeout: 30_000 })
}

async function prepareS200(page, scenario, fixture, workspace) {
  await prepareS199(page, scenario, fixture, workspace)
  const health = page.locator('.resource-health-card')
  await health.getByRole('button', { name: /清理选中/ }).click()
  const dialog = page.getByRole('dialog', { name: '确认清理孤儿文件' })
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(dialog, '操作不可恢复')
  await dialog.getByRole('button', { name: '取消' }).waitFor({ state: 'visible', timeout: 20_000 })
  await dialog.getByRole('button', { name: '删除' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS201(page, scenario, fixture, workspace) {
  await prepareS199(page, scenario, fixture, workspace)
  const health = page.locator('.resource-health-card')
  await health.getByRole('button', { name: /清理选中/ }).click()
  const dialog = page.getByRole('dialog', { name: '确认清理孤儿文件' })
  await dialog.getByRole('button', { name: '删除' }).click()
  await page.locator('.el-message').filter({ hasText: '已清理 1 个文件' }).waitFor({
    state: 'visible',
    timeout: 30_000,
  })
  await expectText(health, '未发现孤儿文件')
}

async function createBackupFixture(page, workspace) {
  const password = 'SCGP manual backup 2026'
  const content = await page.evaluate(async (fixturePassword) => {
    const { backupManager } = await import('/src/utils/backup.ts')
    return backupManager.exportData(fixturePassword, true, false)
  }, password)
  const backupPath = path.join(workspace.temporary, 'SCGP-演示备份.dat')
  fs.writeFileSync(backupPath, content, 'utf8')
  return { backupPath, password }
}

function escapePowerShellLiteral(value) {
  return value.replace(/'/gu, "''")
}

async function captureScreenRegion(outputPath, bounds) {
  const x = Math.round(bounds.x)
  const y = Math.round(bounds.y)
  const width = Math.round(bounds.width)
  const height = Math.round(bounds.height)
  if (width < 240 || height < 160) {
    throw new Error(`Invalid native capture bounds: ${JSON.stringify(bounds)}`)
  }
  const script = [
    "$ErrorActionPreference = 'Stop'",
    'Add-Type -AssemblyName System.Drawing',
    `$origin = New-Object System.Drawing.Point(${x}, ${y})`,
    `$size = New-Object System.Drawing.Size(${width}, ${height})`,
    `$bitmap = New-Object System.Drawing.Bitmap(${width}, ${height})`,
    '$graphics = [System.Drawing.Graphics]::FromImage($bitmap)',
    '$graphics.CopyFromScreen($origin, [System.Drawing.Point]::Empty, $size)',
    `$bitmap.Save('${escapePowerShellLiteral(outputPath)}', [System.Drawing.Imaging.ImageFormat]::Png)`,
    '$graphics.Dispose()',
    '$bitmap.Dispose()',
  ].join('; ')
  await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    cwd: repoRoot,
    timeout: 20_000,
  })
}

async function prepareAndCaptureS004(app, page, scenario, fixture, outputPath) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '软件未激活')
  await page.locator('input[placeholder*="激活码"]').fill('SPED-DEMO-INVALID')
  await redactSensitiveValues(page)

  const browserWindow = await app.browserWindow(page)
  const windowBounds = await browserWindow.evaluate((window) => window.getBounds())
  const viewport = page.viewportSize()
  const captureBounds = {
    x: windowBounds.x,
    y: windowBounds.y,
    width: viewport?.width || windowBounds.width,
    height: viewport?.height || windowBounds.height,
  }

  let nativeDialogCaptured = false
  const dialogResult = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Activation failure dialog did not open')), 20_000)
    page.once('dialog', async (dialog) => {
      try {
        if (!dialog.message().startsWith('激活失败：')) {
          throw new Error(`Unexpected activation dialog: ${dialog.message()}`)
        }
        await new Promise((wait) => setTimeout(wait, 500))
        await captureScreenRegion(outputPath, captureBounds)
        nativeDialogCaptured = true
        await dialog.dismiss()
        clearTimeout(timer)
        resolve()
      } catch (error) {
        clearTimeout(timer)
        reject(error)
      }
    })
  })

  await page.getByRole('button', { name: '验证激活码' }).click({ noWaitAfter: true })
  await dialogResult
  if (!nativeDialogCaptured) throw new Error('Activation failure dialog screen capture was not produced')
}

async function prepareAndCaptureS197(app, page, scenario, fixture, workspace, outputPath) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '数据备份与恢复')
  const { backupPath, password } = await createBackupFixture(page, workspace)
  await page.locator('input[type="file"][accept=".dat"]').setInputFiles(backupPath)
  const prompt = page.locator('.el-message-box').first()
  await prompt.waitFor({ state: 'visible', timeout: 30_000 })
  await prompt.locator('input').fill(password)
  await prompt.getByRole('button', { name: '确定' }).click()
  await expectText(page, '备份文件信息', 30_000)
  const browserWindow = await app.browserWindow(page)
  const windowBounds = await browserWindow.evaluate((window) => window.getBounds())
  const viewport = page.viewportSize()
  const captureBounds = {
    x: windowBounds.x,
    y: windowBounds.y,
    width: viewport?.width || windowBounds.width,
    height: viewport?.height || windowBounds.height,
  }

  let nativeDialogCaptured = false
  const dialogResult = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Native confirmation dialog did not open')), 20_000)
    page.once('dialog', async (dialog) => {
      try {
        await new Promise((wait) => setTimeout(wait, 500))
        await captureScreenRegion(outputPath, captureBounds)
        nativeDialogCaptured = true
        await dialog.dismiss()
        clearTimeout(timer)
        resolve()
      } catch (error) {
        clearTimeout(timer)
        reject(error)
      }
    })
  })
  await page.getByRole('button', { name: '恢复数据' }).click({ noWaitAfter: true })
  await dialogResult
  if (!nativeDialogCaptured) throw new Error('Native dialog screen capture was not produced')
  return { captured: true, captureTarget: 'native-dialog' }
}

async function prepareS209(page, scenario, fixture) {
  await setUpdateFixtureState(page, {
    currentVersion: '1.0.7',
    latestVersion: '1.1.0-demo',
    updateAvailable: true,
    isChecking: false,
    isDownloading: false,
    downloadProgress: 0,
    downloadSpeed: '',
    updateDownloaded: false,
    error: null,
    autoUpdate: false,
    skippedVersion: '',
    releaseNotes: '### 本次更新\n- 优化评估报告展示\n- 完善训练记录检索',
    releaseDate: '2026-07-28',
  })
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await expectText(page, '发现新版本 1.1.0-demo', 30_000)
  await expectText(page, '下载更新')
}

async function openSystemSettings(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const settings = page.locator('.system-settings-page')
  await settings.waitFor({ state: 'visible', timeout: 30_000 })
  return settings
}

async function prepareS202(page, scenario, fixture) {
  const settings = await openSystemSettings(page, scenario, fixture)
  await expectText(settings, '基本设置')
  await settings.getByLabel('系统名称').waitFor({ state: 'visible', timeout: 20_000 })
  await settings.getByLabel('学校名称').waitFor({ state: 'visible', timeout: 20_000 })
  await settings.getByRole('button', { name: '保存设置' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS203(page, scenario, fixture) {
  const settings = await openSystemSettings(page, scenario, fixture)
  const branding = settings.locator('.system-settings-section').filter({ hasText: '登录页品牌与主题' })
  await branding.scrollIntoViewIfNeeded()
  await expectText(branding, '主题预设')
  await expectText(branding, '背景视频（MP4）')
  await expectText(branding, '图片兜底')
}

async function prepareS204(page, scenario, fixture) {
  const settings = await openSystemSettings(page, scenario, fixture)
  const branding = settings.locator('.system-settings-section').filter({ hasText: '登录页品牌与主题' })
  await branding.getByLabel('品牌说明').scrollIntoViewIfNeeded()
  await expectText(branding, '主色')
  await expectText(branding, '卡片透明度')
  await branding.getByLabel('品牌说明').waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS205(page, scenario, fixture) {
  const settings = await openSystemSettings(page, scenario, fixture)
  const backup = settings.locator('.system-settings-section').filter({ hasText: '备份设置' })
  const report = settings.locator('.system-settings-section').filter({ hasText: '报告设置' })
  await backup.scrollIntoViewIfNeeded()
  await expectText(backup, '开启后将按设定间隔自动备份数据')
  await report.scrollIntoViewIfNeeded()
  await expectText(report, '默认报告格式')
  await expectText(report, '报告页眉')
}

async function openSystemAbout(page, scenario, fixture) {
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  await page.getByRole('tab', { name: '关于', exact: true }).click()
  const about = page.locator('.system-about-card')
  await about.waitFor({ state: 'visible', timeout: 30_000 })
  return about
}

async function prepareS206(page, scenario, fixture) {
  const about = await openSystemAbout(page, scenario, fixture)
  await expectText(about, 'SCGP / 星愿能力发展平台')
  await expectText(about, '版本')
  await expectText(about, '激活状态')
  await expectText(about, '能力包授权')
}

async function prepareS207(page, scenario, fixture) {
  const about = await openSystemAbout(page, scenario, fixture)
  await about.getByRole('button', { name: '重新激活 / 更新授权' }).click()
  const refreshPanel = about.locator('.system-license-panel').filter({ hasText: '更新当前机器授权' })
  await refreshPanel.waitFor({ state: 'visible', timeout: 20_000 })
  await refreshPanel.getByPlaceholder('请输入新的激活码，例如 SPED-XXXX-XXXX...').waitFor({
    state: 'visible',
    timeout: 20_000,
  })
  await refreshPanel.getByRole('button', { name: '提交并刷新授权' }).waitFor({
    state: 'visible',
    timeout: 20_000,
  })
}

async function setUpdateFixtureState(page, values) {
  await page.evaluate(async (nextState) => {
    const { updateState } = await import('/src/services/UpdateService.ts')
    Object.assign(updateState, nextState)
  }, values)
}

async function openUpdatePanel(page, scenario, fixture, values) {
  await setUpdateFixtureState(page, values)
  await navigateHash(page, interpolateUserManualScreenshotRoute(scenario, fixture.routeValues))
  const panel = page.locator('.update-panel')
  await panel.waitFor({ state: 'visible', timeout: 30_000 })
  return panel
}

async function prepareS208(page, scenario, fixture) {
  const panel = await openUpdatePanel(page, scenario, fixture, {
    currentVersion: '1.0.7', latestVersion: '', updateAvailable: false, isChecking: false,
    isDownloading: false, downloadProgress: 0, downloadSpeed: '', updateDownloaded: false,
    error: null, autoUpdate: false, skippedVersion: '', releaseNotes: '', releaseDate: '',
  })
  await expectText(panel, '当前版本')
  await expectText(panel, '自动检查更新（启动时）')
  await panel.getByRole('button', { name: '检查更新' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS210(page, scenario, fixture) {
  const panel = await openUpdatePanel(page, scenario, fixture, {
    currentVersion: '1.0.7', latestVersion: '1.1.0-demo', updateAvailable: true, isChecking: false,
    isDownloading: true, downloadProgress: 58, downloadSpeed: '2.4 MB/s', updateDownloaded: false,
    error: null, autoUpdate: false, skippedVersion: '', releaseNotes: '', releaseDate: '2026-07-28',
  })
  await expectText(panel, '正在下载更新... 58%')
  await expectText(panel, '2.4 MB/s')
}

async function prepareS211(page, scenario, fixture) {
  const panel = await openUpdatePanel(page, scenario, fixture, {
    currentVersion: '1.0.7', latestVersion: '1.1.0-demo', updateAvailable: true, isChecking: false,
    isDownloading: false, downloadProgress: 100, downloadSpeed: '', updateDownloaded: true,
    error: null, autoUpdate: false, skippedVersion: '', releaseNotes: '', releaseDate: '2026-07-28',
  })
  await expectText(panel, '更新已下载完成')
  await panel.getByRole('button', { name: '立即重启' }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function prepareS212(page, scenario, fixture) {
  const panel = await openUpdatePanel(page, scenario, fixture, {
    currentVersion: '1.0.7', latestVersion: '1.1.0-demo', updateAvailable: true, isChecking: false,
    isDownloading: false, downloadProgress: 0, downloadSpeed: '', updateDownloaded: false,
    error: null, autoUpdate: false, skippedVersion: '1.1.0-demo', releaseNotes: '', releaseDate: '2026-07-28',
  })
  await expectText(panel, '已跳过版本 1.1.0-demo')
  await panel.locator('.el-collapse-item__header').click()
  await panel.locator('.el-collapse-item__wrap').waitFor({ state: 'visible', timeout: 20_000 })
  await expectText(panel, '操作日志')
}

const prepareHandlers = new Map([
  ['S001', prepareS001],
  ['S002', prepareS002],
  ['S003', prepareS003],
  ['S005', prepareS005],
  ['S006', prepareS006],
  ['S007', prepareS007],
  ['S008', prepareS008],
  ['S009', prepareS009],
  ['S010', prepareS010],
  ['S011', prepareS011],
  ['S012', prepareS012],
  ['S013', prepareS013],
  ['S014', prepareS014],
  ['S015', prepareS015],
  ['S016', prepareS016],
  ['S017', prepareS017],
  ['S018', prepareS018],
  ['S019', prepareS019],
  ['S020', prepareS020],
  ['S021', prepareS021],
  ['S022', prepareS022],
  ['S023', prepareS023],
  ['S024', prepareS024],
  ['S025', prepareS025],
  ['S026', prepareS026],
  ['S027', prepareS027],
  ['S028', prepareS028],
  ['S029', prepareS029],
  ['S030', prepareS030],
  ['S031', prepareS031],
  ['S032', prepareS032],
  ['S033', prepareS033],
  ['S034', prepareS034],
  ['S035', prepareS035],
  ['S036', prepareS036],
  ['S037', prepareS037],
  ['S038', prepareS038],
  ['S039', prepareS039],
  ['S040', prepareS040],
  ['S041', prepareS041],
  ['S042', prepareS042],
  ['S043', prepareS043],
  ['S044', prepareS044],
  ['S045', prepareS045],
  ['S046', prepareS046],
  ['S047', prepareS047],
  ['S048', prepareS048],
  ['S049', prepareS049],
  ['S050', prepareS050],
  ['S051', prepareS051],
  ['S052', prepareS052],
  ['S053', prepareS053],
  ['S054', prepareS054],
  ['S055', prepareS055],
  ['S056', prepareS056],
  ['S057', prepareS057],
  ['S058', prepareS058],
  ['S059', prepareS059],
  ['S060', prepareS060],
  ['S061', prepareS061],
  ['S062', prepareS062],
  ['S063', prepareS063],
  ['S064', prepareS064],
  ['S065', prepareS065],
  ['S066', prepareS066],
  ['S067', prepareS067],
  ['S068', prepareS068],
  ['S069', prepareS069],
  ['S070', prepareS070],
  ['S071', prepareS071],
  ['S072', prepareS072],
  ['S073', prepareS073],
  ['S074', prepareS074],
  ['S075', prepareS075],
  ['S076', prepareS076],
  ['S077', prepareS077],
  ['S078', prepareS078],
  ['S079', prepareS079],
  ['S080', prepareS080],
  ['S081', prepareS081],
  ['S082', prepareS082],
  ['S083', prepareS083],
  ['S084', prepareS084],
  ['S085', prepareS085],
  ['S086', prepareS086],
  ['S087', prepareS087],
  ['S088', prepareS088],
  ['S089', prepareS089],
  ['S090', prepareS090],
  ['S091', prepareS091],
  ['S092', prepareS092],
  ['S093', prepareS093],
  ['S094', prepareS094],
  ['S095', prepareS095],
  ['S096', prepareS096],
  ['S097', prepareS097],
  ['S098', prepareS098],
  ['S099', prepareS099],
  ['S100', prepareS100],
  ['S101', prepareS101],
  ['S102', prepareS102],
  ['S103', prepareS103],
  ['S104', prepareS104],
  ['S105', prepareS105],
  ['S106', prepareS106],
  ['S107', prepareS107],
  ['S108', prepareS108],
  ['S109', prepareS109],
  ['S110', prepareS110],
  ['S111', prepareS111],
  ['S112', prepareS112],
  ['S113', prepareS113],
  ['S114', prepareS114],
  ['S115', prepareS115],
  ['S116', prepareS116],
  ['S117', prepareS117],
  ['S118', prepareS118],
  ['S119', prepareS119],
  ['S120', prepareS120],
  ['S121', prepareS121],
  ['S122', prepareS122],
  ['S123', prepareS123],
  ['S124', prepareS124],
  ['S125', prepareS125],
  ['S126', prepareS126],
  ['S127', prepareS127],
  ['S128', prepareS128],
  ['S129', prepareS129],
  ['S130', prepareS130],
  ['S131', prepareS131],
  ['S132', prepareS132],
  ['S133', prepareS133],
  ['S134', prepareS134],
  ['S135', prepareS135],
  ['S136', prepareS136],
  ['S137', prepareS137],
  ['S138', prepareS138],
  ['S139', prepareS139],
  ['S140', prepareS140],
  ['S141', prepareS141],
  ['S142', prepareS142],
  ['S143', prepareS143],
  ['S144', prepareS144],
  ['S145', prepareS145],
  ['S146', prepareS146],
  ['S147', prepareS147],
  ['S148', prepareS148],
  ['S149', prepareS149],
  ['S150', prepareS150],
  ['S151', prepareS151],
  ['S152', prepareS152],
  ['S153', prepareS153],
  ['S154', prepareS154],
  ['S155', prepareS155],
  ['S156', prepareS156],
  ['S157', prepareS157],
  ['S158', prepareS158],
  ['S159', prepareS159],
  ['S160', prepareS160],
  ['S161', prepareS161],
  ['S162', prepareS162],
  ['S163', prepareS163],
  ['S164', prepareS164],
  ['S165', prepareS165],
  ['S166', prepareS166],
  ['S167', prepareS167],
  ['S168', prepareS168],
  ['S169', prepareS169],
  ['S170', prepareS170],
  ['S171', prepareS171],
  ['S172', prepareS172],
  ['S173', prepareS173],
  ['S174', prepareS174],
  ['S175', prepareS175],
  ['S176', prepareS176],
  ['S177', prepareS177],
  ['S178', prepareS178],
  ['S179', prepareS179],
  ['S180', prepareS180],
  ['S181', prepareS181],
  ['S182', prepareS182],
  ['S183', prepareS183],
  ['S184', prepareS184],
  ['S185', prepareS185],
  ['S186', prepareS186],
  ['S187', prepareS187],
  ['S188', prepareS188],
  ['S189', prepareS189],
  ['S190', prepareS190],
  ['S191', prepareS191],
  ['S192', prepareS192],
  ['S193', prepareS193],
  ['S194', prepareS194],
  ['S195', prepareS195],
  ['S196', prepareS196],
  ['S198', prepareS198],
  ['S199', prepareS199],
  ['S200', prepareS200],
  ['S201', prepareS201],
  ['S202', prepareS202],
  ['S203', prepareS203],
  ['S204', prepareS204],
  ['S205', prepareS205],
  ['S206', prepareS206],
  ['S207', prepareS207],
  ['S208', prepareS208],
  ['S209', prepareS209],
  ['S210', prepareS210],
  ['S211', prepareS211],
  ['S212', prepareS212],
])

async function captureUnion(page, selectors, outputPath, padding = 18) {
  const boxes = []
  for (const selector of selectors) {
    const locator = page.locator(selector).first()
    if (await locator.isVisible().catch(() => false)) {
      const box = await locator.boundingBox()
      if (box) boxes.push(box)
    }
  }
  if (boxes.length === 0) throw new Error(`No capture region is visible: ${selectors.join(', ')}`)
  const left = Math.max(0, Math.min(...boxes.map((box) => box.x)) - padding)
  const top = Math.max(0, Math.min(...boxes.map((box) => box.y)) - padding)
  const right = Math.max(...boxes.map((box) => box.x + box.width)) + padding
  const bottom = Math.max(...boxes.map((box) => box.y + box.height)) + padding
  await page.screenshot({
    path: outputPath,
    animations: 'disabled',
    clip: { x: left, y: top, width: right - left, height: bottom - top },
  })
}

async function combinePngFiles(partPaths, outputPath, gap = 16) {
  const imageLoads = partPaths.map((partPath, index) => (
    `$image${index + 1} = [System.Drawing.Image]::FromFile('${escapePowerShellLiteral(partPath)}')`
  ))
  const widthExpression = partPaths
    .map((_, index) => `$image${index + 1}.Width`)
    .reduce((maximum, width) => `[Math]::Max(${maximum}, ${width})`)
  const heightExpression = partPaths.map((_, index) => `$image${index + 1}.Height`).join(' + ')
  const drawCommands = []
  let yExpression = '0'
  partPaths.forEach((_, index) => {
    drawCommands.push(`$graphics.DrawImage($image${index + 1}, 0, ${yExpression})`)
    yExpression = `${yExpression} + $image${index + 1}.Height + ${gap}`
  })
  const disposeCommands = partPaths.map((_, index) => `$image${index + 1}.Dispose()`)
  const script = [
    "$ErrorActionPreference = 'Stop'",
    'Add-Type -AssemblyName System.Drawing',
    ...imageLoads,
    `$width = ${widthExpression}`,
    `$height = ${heightExpression} + ${gap * Math.max(0, partPaths.length - 1)}`,
    '$bitmap = New-Object System.Drawing.Bitmap($width, $height)',
    '$graphics = [System.Drawing.Graphics]::FromImage($bitmap)',
    '$graphics.Clear([System.Drawing.Color]::White)',
    ...drawCommands,
    `$bitmap.Save('${escapePowerShellLiteral(outputPath)}', [System.Drawing.Imaging.ImageFormat]::Png)`,
    '$graphics.Dispose()',
    '$bitmap.Dispose()',
    ...disposeCommands,
  ].join('; ')
  await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    cwd: repoRoot,
    timeout: 20_000,
  })
}

async function captureStackedCards(page, selectors, outputPath, gap = 16) {
  const partPaths = selectors.map((_, index) => `${outputPath}.part-${index + 1}.png`)
  try {
    for (let index = 0; index < selectors.length; index += 1) {
      const locator = page.locator(selectors[index]).first()
      await locator.waitFor({ state: 'visible', timeout: 30_000 })
      await locator.screenshot({ path: partPaths[index], animations: 'disabled' })
    }
    await combinePngFiles(partPaths, outputPath, gap)
  } finally {
    partPaths.forEach((partPath) => fs.rmSync(partPath, { force: true }))
  }
}

async function captureScenarioRegion(page, scenario, outputPath) {
  if (scenario.id === 'S003') {
    await page.locator('.activation-card').screenshot({ path: outputPath, animations: 'disabled' })
    return
  }
  if (scenario.id === 'S017') {
    await captureUnion(page, ['.student-detail-header', '.detail-hero'], outputPath, 0)
    return
  }
  if (scenario.id === 'S016') {
    await captureUnion(page, ['.student-filter-section', '.student-card'], outputPath)
    return
  }
  if (scenario.id === 'S034') {
    await captureUnion(page, ['.student-filter-section', '.student-list-card'], outputPath)
    return
  }
  if (scenario.id === 'S050') {
    await captureStackedCards(page, ['.form-header', '.social-form .section-card'], outputPath)
    return
  }
  if (scenario.id === 'S043') {
    await captureUnion(page, [`.student-row:has-text("${DEMO_STUDENTS[0].name}")`, '.el-message'], outputPath)
    return
  }
  if (scenario.id === 'S057' || scenario.id === 'S061' || scenario.id === 'S063' || scenario.id === 'S065') {
    await captureStackedCards(page, ['.radar-card', '.dimensions-card'], outputPath)
    return
  }
  if (scenario.id === 'S067') {
    await page.locator('.sdq-report .dimension-scores').screenshot({ path: outputPath, animations: 'disabled' })
    return
  }
  if (scenario.id === 'S069') {
    await captureStackedCards(page, ['.srs2-report .dimension-scores', '.srs2-report .disclaimer'], outputPath)
    return
  }
  if (scenario.id === 'S070') {
    await captureStackedCards(page, ['.cbcl-report .report-header', '.cbcl-report .disclaimer-alert', '.cbcl-report .social-competence-card'], outputPath)
    return
  }
  if (scenario.id === 'S071') {
    await captureStackedCards(page, ['.cbcl-report .clinical-profile-card', '.cbcl-report .syndrome-table-card'], outputPath)
    return
  }
  if (scenario.id === 'S072') {
    await captureStackedCards(page, ['.cnbsr-report .report-header', '.cnbsr-report .overview-card', '.cnbsr-report .overall-card'], outputPath)
    return
  }
  if (scenario.id === 'S073') {
    await page.locator('.cnbsr-report .domain-table-card').screenshot({ path: outputPath, animations: 'disabled' })
    return
  }
  if (scenario.id === 'S074') {
    await captureStackedCards(page, ['.tgmd3-report .overview-card', '.tgmd3-report .domains-card'], outputPath)
    return
  }
  if (scenario.id === 'S075') {
    await page.locator('.tgmd3-report .skills-card').screenshot({ path: outputPath, animations: 'disabled' })
    return
  }
  if (scenario.id === 'S076') {
    await captureStackedCards(page, ['.gmfm-report .report-header', '.gmfm-report .overview-card'], outputPath)
    return
  }
  if (scenario.id === 'S077') {
    await page.locator('.gmfm-report .domains-card').screenshot({ path: outputPath, animations: 'disabled' })
    return
  }
  if (scenario.id === 'S078') {
    await captureStackedCards(page, ['.fine-motor-report .result-overview', '.fine-motor-report .radar-card'], outputPath)
    return
  }
  if (scenario.id === 'S079') {
    await captureStackedCards(page, ['.fine-motor-report .domains-card .domain-item', '.fine-motor-report .iep-card'], outputPath)
    return
  }
  if (scenario.id === 'S080') {
    await captureStackedCards(page, ['.brief-report .report-header', '.brief-report .dimension-card', '.brief-report .disclaimer'], outputPath)
    return
  }
  if (scenario.id === 'S081') {
    await captureStackedCards(page, ['.crt-report .report-header', '.crt-report .result-card', '.crt-report .dimension-card'], outputPath)
    return
  }
  if (scenario.id === 'S082') {
    await captureStackedCards(page, ['.crt-report .dimension-card', '.crt-report .disclaimer'], outputPath)
    return
  }
  if (scenario.id === 'S083') {
    await captureStackedCards(page, ['.cognitive-self-report .report-header', '.cognitive-self-report .dimension-card', '.cognitive-self-report .disclaimer'], outputPath)
    return
  }
  if (scenario.id === 'S084') {
    await captureStackedCards(page, ['.plan-filter-section', '.stats-row', '.plan-list'], outputPath)
    return
  }
  if (scenario.id === 'S085') {
    await captureStackedCards(page, ['.plan-filter-section', '.plan-list'], outputPath)
    return
  }
  if (scenario.id === 'S086' || scenario.id === 'S087') {
    await page.locator('.plan-dialog').screenshot({ path: outputPath, animations: 'disabled' })
    return
  }
  if (scenario.id === 'S088') {
    await page.locator('.resource-selector-dialog').screenshot({ path: outputPath, animations: 'disabled' })
    return
  }
  if (scenario.id === 'S089') {
    await page.locator('.plan-dialog').screenshot({ path: outputPath, animations: 'disabled' })
    return
  }
  if (scenario.id === 'S090') {
    await getPlanDetailDrawer(page).screenshot({ path: outputPath, animations: 'disabled' })
    return
  }
  if (scenario.id === 'S091') {
    await captureUnion(page, ['.plan-card:has(.plan-primary-action)', '.plan-card__menu-dropdown:visible'], outputPath)
    return
  }
  if (scenario.id === 'S092') {
    await captureUnion(page, ['.plan-card:has(.plan-primary-action)', '.el-message-box'], outputPath)
    return
  }
  if (scenario.id === 'S093') {
    await page.locator('.plan-card--active').screenshot({ path: outputPath, animations: 'disabled' })
    return
  }
  if (scenario.id === 'S096' || scenario.id === 'S097') {
    await captureStackedCards(page, ['.toolbar', '.filter-summary-card'], outputPath)
    return
  }
  if (scenario.id === 'S098') {
    await captureStackedCards(page, ['.filter-summary-card', '.gallery-grid .scene-card'], outputPath)
    return
  }
  if (scenario.id === 'S123') {
    await page.screenshot({ path: outputPath, animations: 'disabled' })
    return
  }
  if (scenario.id === 'S142') {
    await captureStackedCards(page, [
      '.reports-filters',
      '.reports-distribution-panel >> nth=0',
      '.reports-distribution-panel >> nth=1',
      '.reports-table-panel',
    ], outputPath)
    return
  }
  if (scenario.id === 'S143') {
    await captureStackedCards(page, ['.reports-filters', '.reports-table-panel'], outputPath)
    return
  }
  if (scenario.id === 'S144') {
    await page.locator('.reports-table-panel').screenshot({ path: outputPath, animations: 'disabled' })
    return
  }
  if (scenario.id === 'S132') {
    await captureStackedCards(page, [
      '.self-care-task-editor-form > .editor-card >> nth=0',
      '.self-care-task-editor-form > .editor-card >> nth=1',
      '.self-care-task-editor-form > .editor-actions',
    ], outputPath)
    return
  }
  if (scenario.id === 'S007' || scenario.id === 'S009' || scenario.id === 'S011' || scenario.id === 'S136' || scenario.id === 'S198' || scenario.id === 'S201') {
    await page.screenshot({ path: outputPath, animations: 'disabled' })
    return
  }
  if (scenario.id === 'S014') {
    await page.locator('.password-form').screenshot({ path: outputPath, animations: 'disabled' })
    return
  }
  if (scenario.id === 'S209') {
    await page.locator('.update-panel .el-card').screenshot({ path: outputPath, animations: 'disabled' })
    return
  }
  if (scenario.id === 'S156') {
    await captureUnion(page, ['.filter-panel', '.resource-table'], outputPath)
    return
  }
  if (scenario.id === 'S167') {
    await page.screenshot({ path: outputPath, animations: 'disabled' })
    return
  }
  if (scenario.id === 'S169' || scenario.id === 'S170') {
    await captureUnion(page, ['.el-drawer:visible', '.el-select-dropdown:visible'], outputPath)
    return
  }
  if (scenario.id === 'S191') {
    await captureUnion(page, ['.system-user-management', '.el-dropdown-menu:visible'], outputPath)
    return
  }

  const target = userManualScreenshotCaptureTargets[scenario.capture.target]
  if (target?.selector) {
    const locator = page.locator(target.selector).first()
    if (await locator.isVisible().catch(() => false)) {
      await locator.screenshot({ path: outputPath, animations: 'disabled' })
      return
    }
  }
  await page.screenshot({ path: outputPath, animations: 'disabled' })
}

function inspectPng(outputPath) {
  const buffer = fs.readFileSync(outputPath)
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`Invalid PNG file: ${outputPath}`)
  }
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  if (width < 240 || height < 160 || buffer.length < 8_000) {
    throw new Error(`Screenshot is unexpectedly small: ${width}x${height}, ${buffer.length} bytes`)
  }
  return {
    width,
    height,
    bytes: buffer.length,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  }
}

async function prepareAndCaptureS166(page, scenario, fixture, workspace, outputPath) {
  const partPaths = ['message', 'result', 'material']
    .map((name) => `${outputPath}.${name}.png`)
  try {
    await prepareS166(page, scenario, fixture, workspace)
    await redactSensitiveValues(page)
    await page.waitForTimeout(150)

    const dialog = page.getByRole('dialog', { name: '批量导入教学资料' })
    await page.locator('.el-message').filter({ hasText: '批量导入完成，共导入 1 条资料' })
      .screenshot({ path: partPaths[0], animations: 'disabled' })
    await dialog.screenshot({ path: partPaths[1], animations: 'disabled' })
    await dialog.getByRole('button', { name: '取消' }).click()
    await dialog.waitFor({ state: 'hidden', timeout: 20_000 })
    await page.locator('.material-card').filter({ hasText: '演示批量导入资料' }).first()
      .screenshot({ path: partPaths[2], animations: 'disabled' })
    await combinePngFiles(partPaths, outputPath)
  } finally {
    partPaths.forEach((partPath) => fs.rmSync(partPath, { force: true }))
  }
}

async function runScenario(app, page, scenario, fixture, workspace, screenshotDir) {
  const outputPath = path.join(screenshotDir, scenario.filename)
  if (scenario.id === 'S004') {
    await prepareAndCaptureS004(app, page, scenario, fixture, outputPath)
  } else if (scenario.id === 'S197') {
    await prepareAndCaptureS197(app, page, scenario, fixture, workspace, outputPath)
  } else if (scenario.id === 'S166') {
    await prepareAndCaptureS166(page, scenario, fixture, workspace, outputPath)
  } else {
    const prepare = prepareHandlers.get(scenario.id)
    if (!prepare) throw new Error(`Scenario automation is not implemented yet: ${scenario.id}`)
    await prepare(page, scenario, fixture, workspace, app)
    await redactSensitiveValues(page)
    await page.waitForTimeout(150)
    await captureScenarioRegion(page, scenario, outputPath)
  }
  return { outputPath, ...inspectPng(outputPath) }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const runtimeMetrics = validateUserManualScreenshotFixtureRuntime()
  const automationMetrics = validateScenarioOperationInstructions()
  const scenarios = selectScenarios(options)
  if (!options.dryRun) {
    for (const scenario of scenarios) {
      assertSafetyAuthorization(scenario, options)
      if (!SPECIALIZED_AUTOMATION_IDS.has(scenario.id)) {
        throw new Error(`${scenario.id} has a documented operation instruction but no specialized automation handler yet`)
      }
    }
  }

  const workspace = createUserManualScreenshotWorkspace(repoRoot, options.runId)
  const screenshotDir = workspace.screenshots
  assertCaptureWorkspacePath(repoRoot, screenshotDir)

  const manifest = createManifest(options, workspace, scenarios, screenshotDir)
  manifest.runtimeMetrics = runtimeMetrics
  writeManifest(workspace, manifest)

  if (options.dryRun) {
    console.log(JSON.stringify({
      status: 'validated',
      selectedScenarios: scenarios.length,
      runtimeMetrics,
      automationMetrics,
      manifest: path.relative(repoRoot, workspace.manifest),
    }, null, 2))
    return
  }

  const vite = await startVite(workspace)
  manifest.devServer = vite.url
  writeManifest(workspace, manifest)

  try {
    const groups = new Map()
    scenarios.forEach((scenario) => {
      const fixture = resolveUserManualScreenshotFixture(scenario.fixture, workspace, scenario.actor)
      const groupKey = `${scenario.fixture}::${fixture.account}`
      const group = groups.get(groupKey) || []
      group.push(scenario)
      groups.set(groupKey, group)
    })

    for (const fixtureScenarios of groups.values()) {
      const firstScenario = fixtureScenarios[0]
      if (!firstScenario) continue
      let session
      try {
        session = await launchFixtureSession(
          vite.url,
          workspace,
          firstScenario.fixture,
          firstScenario.actor,
        )
        for (const scenario of fixtureScenarios) {
          const manifestScenario = manifest.scenarios.find((item) => item.id === scenario.id)
          try {
            const artifact = await runScenario(
              session.app,
              session.page,
              scenario,
              session.fixture,
              workspace,
              screenshotDir,
            )
            Object.assign(manifestScenario, {
              status: 'captured',
              artifact: {
                path: path.relative(repoRoot, artifact.outputPath),
                width: artifact.width,
                height: artifact.height,
                bytes: artifact.bytes,
                sha256: artifact.sha256,
              },
            })
            console.log(`CAPTURED ${scenario.id} ${artifact.width}x${artifact.height}`)
          } catch (error) {
            Object.assign(manifestScenario, {
              status: 'failed',
              error: error instanceof Error ? error.message : String(error),
            })
            console.error(`FAILED ${scenario.id}: ${manifestScenario.error}`)
          } finally {
            writeManifest(workspace, manifest)
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        for (const scenario of fixtureScenarios) {
          const manifestScenario = manifest.scenarios.find((item) => item.id === scenario.id)
          if (manifestScenario?.status === 'pending') {
            Object.assign(manifestScenario, { status: 'failed', error: message })
          }
        }
        console.error(`FAILED ${firstScenario.fixture}/${firstScenario.actor} fixture session: ${message}`)
        writeManifest(workspace, manifest)
      } finally {
        await session?.app.close().catch(() => {})
      }
    }
  } finally {
    vite.processHandle.kill()
    vite.stdoutLog.end()
  }

  const captured = manifest.scenarios.filter((item) => item.status === 'captured').length
  const failed = manifest.scenarios.filter((item) => item.status === 'failed').length
  manifest.completedAt = new Date().toISOString()
  manifest.summary = { captured, failed, selected: scenarios.length }
  writeManifest(workspace, manifest)
  console.log(JSON.stringify({
    ...manifest.summary,
    screenshotDir: path.relative(repoRoot, screenshotDir),
    manifest: path.relative(repoRoot, workspace.manifest),
  }, null, 2))
  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
