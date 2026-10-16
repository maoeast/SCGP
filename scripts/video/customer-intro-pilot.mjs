/**
 * 客户交付教程录制引擎：01 登录与查找，02 新增学生，03 量表评估，04 训练计划，05 游戏训练，06 器材录入，07 报告导出，08 备份恢复，09 用户管理，10 资源管理，11 班级分班，12 授权更新，13 情绪调节，14 生活自理，15 AI 咨询，16 AI 报告，17 情绪场景，18 表达关心，19 情绪报告，20 关心情境编辑，21 CSIRS 评估，22 S-M 评估，23 Conners PSQ，24 ABC。
 *
 * 将当前演示数据库复制到临时目录，在真实 Electron 界面录屏并合成中文旁白。
 * 用法：node scripts/video/customer-intro-pilot.mjs [--chapter=02|03|04|05|06|07|08|09|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24] [--dry-run]
 * 配额受限时 --visual-only 生成无旁白预览；第 12 讲可在音频补齐后 --reuse-raw 复用已录画面合成。
 * 可选：SCGP_VIDEO_SOURCE_DB、SCGP_VIDEO_STUDENT_ID、GEMINI_API_KEY。
 */

import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, randomUUID } from 'node:crypto'
import { _electron as electron } from 'playwright'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { buildStudentAddScenes } from './customer-student-add-scenes.mjs'
import { buildAssessmentScenes } from './customer-assessment-scenes.mjs'
import { buildPlanScenes, verifyTrainingPlan } from './customer-plan-scenes.mjs'
import { buildGameScenes, verifyGameRecording } from './customer-game-scenes.mjs'
import { buildEquipmentScenes, verifyEquipmentRecording } from './customer-equipment-scenes.mjs'
import { buildReportScenes, verifyReportExports } from './customer-report-scenes.mjs'
import { buildBackupScenes, prepareBackupDemo, verifyBackupRestore } from './customer-backup-scenes.mjs'
import { buildUserScenes, verifyUserManagement } from './customer-user-scenes.mjs'
import { buildResourceScenes, prepareResourceDemo, verifyResourceManagement } from './customer-resource-scenes.mjs'
import { buildClassScenes, verifyClassManagement } from './customer-class-scenes.mjs'
import { buildLicenseUpdateScenes, verifyLicenseUpdate } from './customer-license-update-scenes.mjs'
import { buildEmotionalScenes, verifyEmotionalTraining } from './customer-emotional-scenes.mjs'
import { buildSelfCareScenes, verifySelfCareTraining } from './customer-self-care-scenes.mjs'
import { buildAiScenes, verifyAiConsultation } from './customer-ai-scenes.mjs'
import { buildAiReportScenes, prepareAiReportDemo, verifyAiReport } from './customer-ai-report-scenes.mjs'
import { buildEmotionSceneScenes, verifyEmotionScene } from './customer-emotion-scene-scenes.mjs'
import { buildCareScenes, verifyCareTraining } from './customer-care-scenes.mjs'
import { buildEmotionalReportScenes, prepareEmotionalReportDemo } from './customer-emotional-report-scenes.mjs'
import { buildSceneEditorScenes, verifySceneEditor, verifyPresetEmotionEdit, verifyCustomEmotionResource } from './customer-scene-editor-scenes.mjs'
import { buildConnersPsqScenes, verifyConnersPsq, buildAbcScenes, verifyAbc } from './customer-behavior-assessment-scenes.mjs'
import { buildSmScenes, verifySm } from './customer-sm-scenes.mjs'
import { buildCsirsScenes, verifyCsirs } from './customer-csirs-scenes.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const chapter = process.argv.includes('--chapter=24') ? '24' : process.argv.includes('--chapter=23') ? '23' : process.argv.includes('--chapter=22') ? '22' : process.argv.includes('--chapter=21') ? '21' : process.argv.includes('--chapter=20') ? '20' : process.argv.includes('--chapter=19') ? '19' : process.argv.includes('--chapter=18') ? '18' : process.argv.includes('--chapter=17') ? '17' : process.argv.includes('--chapter=16') ? '16' : process.argv.includes('--chapter=15') ? '15' : process.argv.includes('--chapter=14') ? '14' : process.argv.includes('--chapter=13') ? '13' : process.argv.includes('--chapter=12') ? '12' : process.argv.includes('--chapter=11') ? '11' : process.argv.includes('--chapter=10') ? '10' : process.argv.includes('--chapter=09') ? '09' : process.argv.includes('--chapter=08') ? '08' : process.argv.includes('--chapter=07') ? '07' : process.argv.includes('--chapter=06') ? '06' : process.argv.includes('--chapter=05') ? '05' : process.argv.includes('--chapter=04') ? '04' : process.argv.includes('--chapter=03') ? '03' : process.argv.includes('--chapter=02') ? '02' : '01'
const output = path.join(root, 'output', 'videos', `customer-guide-${chapter}`)
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scgp-customer-video-'))
const userData = path.join(tempRoot, 'user-data')
const ffmpeg = process.env.SCGP_FFMPEG || 'C:/Program Files/FFmpeg/bin/ffmpeg.exe'
const ffprobe = ffmpeg.replace(/ffmpeg\.exe$/iu, 'ffprobe.exe')
const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const packageInfo = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const dryRun = process.argv.includes('--dry-run')
const visualOnly = process.argv.includes('--visual-only')
const reuseRaw = process.argv.includes('--reuse-raw')
const packagedCheck = chapter === '12' && process.argv.includes('--packaged-check')
const rerecordScene = process.argv.find((argument) => argument.startsWith('--rerecord-scene='))?.slice('--rerecord-scene='.length)
const rerecordScenes = new Set(rerecordScene?.split(',') || [])
const sourceDb = process.env.SCGP_VIDEO_SOURCE_DB || path.join(process.env.APPDATA || '', 'scgp', 'database.sqlite')
const demoStudentId = Number(process.env.SCGP_VIDEO_STUDENT_ID || (chapter === '21' ? 10014 : 10002))
const ttsMode = process.env.SCGP_VIDEO_TTS || 'gemini'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const introScenes = [
  {
    id: '01-title',
    narration: '星愿能力发展平台。软件操作教程第一讲：登录、首页导航与查找学生。',
    caption: '软件操作教程 01\n登录、首页导航与查找学生',
    async act(page) {
      await showCard(page, '软件操作教程 01', '登录 · 首页导航 · 查找学生')
      await sleep(4000)
      await hideCard(page)
    },
  },
  {
    id: '02-login',
    narration: '使用分配给你的账号和密码登录。登录后看到的菜单，会随账号角色和授权能力包变化。',
    caption: '输入账号和密码，点击登录系统\n菜单由角色和授权决定',
    async act(page) {
      const username = page.locator('input[autocomplete="username"]')
      const password = page.locator('input[autocomplete="current-password"]')
      await username.hover()
      await sleep(450)
      await username.fill('admin')
      await sleep(500)
      await password.hover()
      await sleep(450)
      await password.fill('admin123')
      await sleep(650)
      await page.getByRole('button', { name: '登录系统' }).hover()
      await sleep(400)
      await page.getByRole('button', { name: '登录系统' }).click()
      await page.waitForURL(/#\/dashboard(?:$|\?)/u, { timeout: 30000 })
      await page.locator('.dashboard-hero').waitFor({ state: 'visible', timeout: 30000 })
      await sleep(1000)
    },
  },
  {
    id: '03-dashboard',
    narration: '登录后进入系统首页。这里汇总学生、训练和近期工作数据，可以先从概览了解当前机构的使用情况。',
    caption: '系统首页：学生、训练与近期工作概览',
    async act(page) {
      await page.locator('.dashboard-hero').hover()
      await sleep(1300)
      await page.getByText('学生总数', { exact: false }).first().hover().catch(() => {})
      await sleep(1600)
      await page.locator('.sidebar-nav').hover()
      await sleep(1100)
    },
  },
  {
    id: '04-students',
    narration: '从左侧进入学生管理。这里可以查看学生列表，并按姓名、学号或诊断类型搜索。',
    caption: '左侧导航 → 学生管理\n支持姓名、学号和诊断类型搜索',
    async act(page) {
      const nav = page.locator('.sidebar-nav .nav-item').filter({ hasText: '学生管理' }).first()
      await nav.hover()
      await sleep(550)
      await nav.click()
      await page.locator('.student-management-page h1').first().waitFor({ state: 'visible', timeout: 20000 })
      await page.locator('.student-card').first().waitFor({ state: 'visible', timeout: 20000 })
      await sleep(1000)
      await page.locator('input[placeholder*="搜索学生姓名"]').hover()
      await sleep(700)
    },
  },
  {
    id: '05-search',
    narration: '在搜索框输入虚构学生“演示生甲”。列表随输入更新，找到结果后点击查看详情。',
    caption: '输入“演示生甲”筛选列表\n点击“查看详情”打开档案',
    async act(page) {
      await page.locator('input[placeholder*="搜索学生姓名"]').hover()
      await sleep(700)
      await page.locator('input[placeholder*="搜索学生姓名"]').fill('演示生甲')
      const card = page.locator('.student-card').filter({ hasText: '演示生甲' }).first()
      await card.waitFor({ state: 'visible', timeout: 15000 })
      await sleep(3000)
      await card.getByRole('link', { name: '查看详情' }).hover()
      await sleep(1400)
      await card.getByRole('link', { name: '查看详情' }).click()
      await page.waitForURL(new RegExp(`#\\/students\\/${demoStudentId}(?:$|\\?)`, 'u'), { timeout: 20000 })
      await sleep(900)
    },
  },
  {
    id: '06-detail',
    narration: '学生详情集中呈现基本档案和后续业务记录。查看完毕后，可以返回学生管理继续查找。',
    caption: '学生详情：档案与业务记录\n演示数据均为虚构信息',
    async act(page) {
      await page.getByText('演示生甲', { exact: false }).first().hover()
      await sleep(4800)
      await page.locator('.sidebar-nav .nav-item').filter({ hasText: '学生管理' }).first().hover()
      await sleep(900)
      await page.locator('.sidebar-nav .nav-item').filter({ hasText: '学生管理' }).first().click()
      await page.locator('.student-management-page h1').first().waitFor({ state: 'visible', timeout: 20000 })
      await page.mouse.move(1390, 720)
      await sleep(1000)
    },
  },
  {
    id: '07-end',
    narration: '本节完成。下一讲将演示如何新增学生档案。',
    caption: '本节完成\n下一讲：新增学生档案',
    async act(page) {
      await showCard(page, '本节完成', '下一讲：新增学生档案')
      await sleep(3000)
      await hideCard(page)
    },
  },
]

const scenes = chapter === '24' ? buildAbcScenes({ showCard, hideCard, sleep, studentId: demoStudentId, output })
  : chapter === '23' ? buildConnersPsqScenes({ showCard, hideCard, sleep, studentId: demoStudentId, output })
  : chapter === '22' ? buildSmScenes({ showCard, hideCard, sleep, studentId: demoStudentId, output })
  : chapter === '21' ? buildCsirsScenes({ showCard, hideCard, sleep, studentId: demoStudentId, output })
  : chapter === '20' ? buildSceneEditorScenes({ showCard, hideCard, sleep, studentId: demoStudentId, output })
  : chapter === '19' ? buildEmotionalReportScenes({ showCard, hideCard, sleep, studentId: demoStudentId, output })
  : chapter === '18' ? buildCareScenes({ showCard, hideCard, sleep, studentId: demoStudentId, output })
  : chapter === '17' ? buildEmotionSceneScenes({ showCard, hideCard, sleep, studentId: demoStudentId, output })
  : chapter === '16' ? buildAiReportScenes({ showCard, hideCard, sleep, studentId: demoStudentId, output })
  : chapter === '15' ? buildAiScenes({ showCard, hideCard, sleep, studentId: demoStudentId, output })
  : chapter === '14' ? buildSelfCareScenes({ showCard, hideCard, sleep, studentId: demoStudentId, output })
  : chapter === '13' ? buildEmotionalScenes({ showCard, hideCard, sleep, studentId: demoStudentId, output })
  : chapter === '12' ? buildLicenseUpdateScenes({ showCard, hideCard, sleep, output })
  : chapter === '11' ? buildClassScenes({ showCard, hideCard, sleep, studentId: demoStudentId, output })
  : chapter === '10' ? buildResourceScenes({ showCard, hideCard, sleep, output })
  : chapter === '09' ? buildUserScenes({ showCard, hideCard, sleep, output })
  : chapter === '08' ? buildBackupScenes({ showCard, hideCard, sleep, studentId: demoStudentId, output, sourceDb })
  : chapter === '07' ? buildReportScenes({ showCard, hideCard, sleep, studentId: demoStudentId, output })
  : chapter === '06' ? buildEquipmentScenes({ showCard, hideCard, sleep, studentId: demoStudentId })
  : chapter === '05' ? buildGameScenes({ showCard, hideCard, sleep, studentId: demoStudentId, output })
  : chapter === '04' ? buildPlanScenes({ showCard, hideCard, sleep, studentId: demoStudentId })
  : chapter === '03' ? buildAssessmentScenes({ showCard, hideCard, sleep, studentId: demoStudentId })
  : chapter === '02' ? buildStudentAddScenes({ showCard, hideCard, sleep }) : introScenes

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', ...options })
  if (result.status !== 0) {
    throw new Error(`${command} 失败：${(result.stderr || result.stdout || '').slice(-1200)}`)
  }
  return result.stdout.trim()
}

function duration(file) {
  return Number(run(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]))
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = address.port
      server.close(() => resolve(port))
    })
  })
}

async function startVite() {
  const port = await freePort()
  const secure = fs.existsSync(path.join(root, 'dev-cert.pem')) && fs.existsSync(path.join(root, 'dev-key.pem'))
  const url = `${secure ? 'https' : 'http'}://127.0.0.1:${port}`
  const child = spawn(process.execPath, [viteCli, '--config', path.join(root, 'scripts/video/vite.capture.config.mjs'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    env: { ...process.env, ELECTRON: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  child.stdout.on('data', (chunk) => { log += chunk.toString() })
  child.stderr.on('data', (chunk) => { log += chunk.toString() })
  child.on('exit', (code) => { if (code !== null && code !== 0) console.error(`Vite 退出（${code}）：${log.slice(-1200)}`) })
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`Vite 提前退出：${log.slice(-1000)}`)
    try {
      const status = await new Promise((resolve, reject) => {
        const client = secure ? https : http
        const request = client.get(url, { rejectUnauthorized: false }, (response) => {
          response.resume()
          resolve(response.statusCode || 0)
        })
        request.on('error', reject)
        request.setTimeout(1500, () => request.destroy(new Error('probe timeout')))
      })
      if (status > 0 && status < 500) return { child, url }
    } catch { /* wait for Vite */ }
    await sleep(500)
  }
  throw new Error(`Vite 启动超时：${log.slice(-1000)}`)
}

async function prepareApp(url) {
  fs.mkdirSync(userData, { recursive: true })
  if (!fs.existsSync(sourceDb)) throw new Error(`演示数据库不存在：${sourceDb}`)
  const dbFile = path.join(userData, 'database.sqlite')
  fs.copyFileSync(sourceDb, dbFile)
  if (chapter === '08') {
    const sourceResources = path.join(path.dirname(sourceDb), 'resources')
    if (fs.existsSync(sourceResources)) fs.cpSync(sourceResources, path.join(userData, 'resources'), { recursive: true })
  }
  if (fs.readFileSync(dbFile).subarray(0, 16).toString() !== 'SQLite format 3\0') {
    throw new Error(`复制的数据库不是 SQLite 文件：${sourceDb}`)
  }
  console.log(`演示数据库副本就绪：${fs.statSync(dbFile).size} 字节`)
  if (chapter === '12') {
    fs.writeFileSync(path.join(userData, 'update-config.json'), JSON.stringify({
      provider: 'generic', url: 'https://maohedong.top/scgp/win', channel: 'latest',
      useMultipleRangeRequest: false, autoUpdate: !process.argv.includes('--verify-auto-config-off'), skippedVersion: '',
    }))
  }
  const executablePath = chapter === '12'
    ? path.resolve(process.env.SCGP_VIDEO_PACKAGE_EXE || path.join(root, packagedCheck
      ? 'output/acceptance-package-2026-10-16/win-unpacked/星愿能力发展训练系统.exe'
      : 'release/win-unpacked/星愿能力发展训练系统.exe'))
    : undefined
  const app = await electron.launch({
    ...(executablePath ? { executablePath } : {}),
    args: chapter === '12' ? [] : ['.'], cwd: root,
    env: packagedCheck
      ? { ...process.env, NODE_ENV: 'production', ELECTRON: 'true', SCGP_TEST_USER_DATA_DIR: userData }
      : { ...process.env, ...(chapter === '12' ? { NODE_ENV: 'development' } : {}), ELECTRON: 'true', SCGP_DEV_SERVER_URL: url, SCGP_TEST_USER_DATA_DIR: userData },
  })
  const page = await app.firstWindow()
  if (chapter === '12') {
    const runtime = await app.evaluate(({ app }) => ({ packaged: app.isPackaged, userData: app.getPath('userData'), version: app.getVersion() }))
    if (!runtime.packaged || path.resolve(runtime.userData) !== path.resolve(userData)) throw new Error('更新录制未使用隔离的已打包主进程')
    console.log(`发布包主进程就绪：${runtime.version}，隔离目录已核对`)
  }
  await page.locator('#app').waitFor({ state: 'visible', timeout: 60000 })
  await page.waitForFunction(() => Boolean(window.electronAPI && window.db), undefined, { timeout: 60000 })
  await app.evaluate(({ BrowserWindow }) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.on('devtools-opened', () => win.webContents.closeDevTools())
      win.webContents.closeDevTools()
      win.webContents.setBackgroundThrottling(false)
      win.setFullScreen(false)
      win.setBounds({ x: 0, y: 0, width: 1600, height: 900 })
      win.show()
      win.focus()
    }
  })
  await page.waitForTimeout(800)
  await page.evaluate(async () => {
    const machineId = await window.electronAPI.getMachineId()
    localStorage.setItem('sic_ads_activation_cache', JSON.stringify({
      version: '1.1', machineCode: String(machineId).slice(0, 16).toUpperCase(),
      activationCode: 'SPED-DEMO-VIDEO-CAPTURE', isActivated: true, isTrial: false,
      licenseType: 'full', allowedModules: ['sensory', 'emotional', 'social', 'life_skills', 'cognitive'],
      cachedAt: new Date().toISOString(),
    }))
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean(window.db), undefined, { timeout: 60000 })
  await page.evaluate(async (studentId) => {
    const db = window.db
    db.run(
      `INSERT INTO system_config (key, value, description) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      ['school_name', '演示机构', '客户教程虚构机构'],
    )
    const student = db.get('SELECT id FROM student WHERE id = ?', [studentId])
    if (!student) throw new Error(`演示学生 ${studentId} 不在数据库中`)
    db.run('UPDATE student SET name = ?, student_no = ?, guardian_name = ?, guardian_phone = ? WHERE id = ?',
      ['演示生甲', `DEMO-${studentId}`, '演示监护人', '', studentId])
    await db.saveNow()
  }, demoStudentId)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.goto(packagedCheck ? `${page.url().split('#')[0]}#/login` : `${url}/#/login`, { waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: `
    #__vue-devtools-container__, #vue-devtools-iframe,
    [data-vue-devtools], .vue-devtools__anchor { display: none !important; visibility: hidden !important; }
  ` })
  await page.locator('input[autocomplete="username"]').waitFor({ state: 'visible', timeout: 30000 })
  await page.addInitScript(installCapturePointer)
  await page.evaluate(installCapturePointer)
  return { app, page }
}

function installCapturePointer() {
  function attach() {
    if (!document.body || document.getElementById('scgp-video-pointer')) return
    const captureStyle = document.createElement('style')
    captureStyle.textContent = '#__vue-devtools-container__, #vue-devtools-iframe, [data-vue-devtools], .vue-devtools__anchor { display: none !important; visibility: hidden !important; }'
    document.head.appendChild(captureStyle)
    const pointer = document.createElement('div')
    pointer.id = 'scgp-video-pointer'
    pointer.style.cssText = 'position:fixed;left:-50px;top:-50px;width:16px;height:16px;border:3px solid white;border-radius:50%;background:#247bdf;box-shadow:0 1px 5px #153b70;pointer-events:none;z-index:2147483646;transform:translate(-50%,-50%);'
    document.body.appendChild(pointer)
    document.addEventListener('pointermove', (event) => {
      pointer.style.left = `${event.clientX}px`
      pointer.style.top = `${event.clientY}px`
    })
    document.addEventListener('pointerdown', () => { pointer.style.background = '#ffad33' })
    document.addEventListener('pointerup', () => { pointer.style.background = '#247bdf' })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, { once: true })
  else attach()
}

async function showCard(page, title, subtitle) {
  await page.evaluate(({ title, subtitle, version }) => {
    document.getElementById('scgp-customer-video-card')?.remove()
    const card = document.createElement('div')
    card.id = 'scgp-customer-video-card'
    card.innerHTML = `<div class="scgp-video-mark">SCGP / 星愿能力发展平台</div><h1></h1><p></p><small></small>`
    card.querySelector('h1').textContent = title
    card.querySelector('p').textContent = subtitle
    card.querySelector('small').textContent = `制作样片 · 当前代码版本 ${version} · 演示数据均为虚构`
    Object.assign(card.style, {
      position: 'fixed', inset: '0', zIndex: '2147483647', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontFamily: 'Microsoft YaHei, sans-serif',
      background: 'linear-gradient(135deg, #102548, #153b70 58%, #2b83aa)',
      textAlign: 'center', pointerEvents: 'none',
    })
    card.querySelector('.scgp-video-mark').style.cssText = 'font-size:22px;letter-spacing:3px;opacity:.75;margin-bottom:34px'
    card.querySelector('h1').style.cssText = 'font-size:60px;margin:0 50px 20px;font-weight:700'
    card.querySelector('p').style.cssText = 'font-size:31px;margin:0;opacity:.9'
    card.querySelector('small').style.cssText = 'position:absolute;bottom:60px;font-size:18px;opacity:.65'
    document.body.appendChild(card)
  }, { title, subtitle, version: packageInfo.version })
}

async function hideCard(page) {
  await page.evaluate(() => document.getElementById('scgp-customer-video-card')?.remove())
}

async function synthesize(scene) {
  const voice = ttsMode === 'doubao' ? process.env.DOUBAOYY_SPEAKER : process.env.SCGP_VIDEO_GEMINI_VOICE || 'Sulafat'
  const fingerprint = createHash('sha256').update(`${ttsMode}:${voice}:${scene.narration}`).digest('hex').slice(0, 10)
  const file = path.join(output, `${scene.id}.${ttsMode}.${fingerprint}.mp3`)
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return file
  if (ttsMode === 'doubao') {
    const apiKey = process.env.DOUBAOYY_API_KEY
    if (!apiKey || !voice) throw new Error('豆包 TTS 需要 DOUBAOYY_API_KEY 和 DOUBAOYY_SPEAKER')
    // 官方 V3 SSE 接口：仅发旁白文本，按事件拼接 MP3，确认结束事件后才保存。
    const response = await fetch('https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey,
        'X-Api-Resource-Id': 'seed-tts-2.0', 'X-Api-Request-Id': randomUUID() },
      body: JSON.stringify({ user: { uid: 'scgp-customer-training' }, req_params: {
        text: scene.narration, speaker: voice,
        audio_params: { format: 'mp3', sample_rate: 24000, bit_rate: 128000, speech_rate: 0 },
      } }), signal: AbortSignal.timeout(120000),
    })
    const payload = await response.text()
    if (!response.ok) throw new Error(`豆包 TTS 请求失败：HTTP ${response.status}，${payload.replaceAll(apiKey, '[redacted]').slice(0, 500)}`)
    const chunks = []
    let complete = false
    for (const line of payload.split(/\r?\n/u)) {
      if (!line.startsWith('data:')) continue
      const event = JSON.parse(line.slice(5).trim())
      if (event.code === 20000000) complete = true
      else if (event.code !== 0) throw new Error(`豆包 TTS 合成失败：${event.code}，${String(event.message).replaceAll(apiKey, '[redacted]').slice(0, 500)}`)
      if (event.data) chunks.push(Buffer.from(event.data, 'base64'))
    }
    if (!complete || !chunks.length) throw new Error(`豆包 TTS 未完整返回音频：${scene.id}`)
    fs.writeFileSync(file, Buffer.concat(chunks))
    if (duration(file) <= 0) throw new Error(`豆包 TTS 音频无有效时长：${scene.id}`)
    return file
  }
  if (ttsMode === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) throw new Error('Gemini TTS 需要 GEMINI_API_KEY 环境变量')
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: 'gemini-3.8-flash-tts',
        input: [{ type: 'user_input', content: [{
          type: 'text', text: scene.narration,
          annotations: [{ type: 'speech_metadata', style: 'Warm, clear Mandarin Chinese narration for a professional software tutorial. Natural pace and precise enunciation.' }],
        }] }],
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice }] },
      }),
      signal: AbortSignal.timeout(120000),
    })
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}))
      const message = String(detail.error?.message || '').replaceAll(apiKey, '[redacted]').slice(0, 800)
      throw new Error(`Gemini TTS 请求失败：HTTP ${response.status}，镜头 ${scene.id}。${message}`)
    }
    const result = await response.json()
    const audio = result.steps?.filter((step) => step.type === 'model_output')
      .flatMap((step) => step.content || []).findLast((item) => item.type === 'audio')?.data
    if (!audio) throw new Error(`Gemini TTS 未返回音频：镜头 ${scene.id}`)
    const wav = path.join(output, `${scene.id}.${ttsMode}.${fingerprint}.wav`)
    fs.writeFileSync(wav, Buffer.from(audio, 'base64'))
    if (fs.readFileSync(wav).subarray(0, 4).toString() !== 'RIFF') {
      throw new Error(`Gemini TTS 返回的不是 WAV 音频：镜头 ${scene.id}`)
    }
    run(ffmpeg, ['-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '128k', file])
    return file
  }
  if (ttsMode === 'edge') {
    const tts = new MsEdgeTTS()
    await tts.setMetadata('zh-CN-XiaoxiaoNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
      sentenceBoundaryEnabled: false,
    })
    const { audioStream } = tts.toStream(scene.narration)
    const chunks = []
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`旁白超时：${scene.id}`)), 45000)
      audioStream.on('data', (chunk) => chunks.push(chunk))
      audioStream.on('end', () => { clearTimeout(timer); resolve() })
      audioStream.on('error', (error) => { clearTimeout(timer); reject(error) })
    })
    if (!chunks.length) throw new Error(`旁白为空：${scene.id}`)
    fs.writeFileSync(file, Buffer.concat(chunks))
    return file
  }
  if (ttsMode !== 'offline') throw new Error(`不支持的配音模式：${ttsMode}`)
  const textFile = path.join(output, `${scene.id}.txt`)
  const wavFile = path.join(output, `${scene.id}.wav`)
  fs.writeFileSync(textFile, scene.narration, 'utf8')
  run('pwsh', [
    '-NoProfile', '-File', path.join(root, 'scripts', 'video', 'speak-offline.ps1'),
    '-TextFile', textFile, '-OutFile', wavFile,
  ])
  run(ffmpeg, ['-y', '-i', wavFile, '-c:a', 'libmp3lame', '-b:a', '128k', file])
  return file
}

function formatSrtTime(seconds) {
  const ms = Math.round(seconds * 1000)
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor(ms / 60000) % 60
  const secs = Math.floor(ms / 1000) % 60
  const fraction = ms % 1000
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(fraction).padStart(3, '0')}`
}

async function captureScene(app, page, scene, targetSeconds) {
  const raw = path.join(output, `${scene.id}.raw.mp4`)
  const isCard = scene.id.endsWith('-title') || scene.id.endsWith('-end')
  const fitWidth = isCard ? 1600 : 1480
  const padY = isCard ? '(oh-ih)/2' : '0'
  const args = [
    '-y', '-f', 'image2pipe', '-framerate', '15', '-vcodec', 'mjpeg', '-i', 'pipe:0',
    '-vf', `scale=${fitWidth}:-2,pad=1600:900:(ow-iw)/2:${padY}:color=0x102548`,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '22',
    '-pix_fmt', 'yuv420p', raw,
  ]
  const child = spawn(ffmpeg, args, { cwd: root, stdio: ['pipe', 'ignore', 'pipe'] })
  let errorLog = ''
  child.stderr.on('data', (chunk) => { errorLog += chunk.toString(); if (errorLog.length > 4000) errorLog = errorLog.slice(-4000) })
  const closed = new Promise((resolve) => child.once('close', resolve))
  let captureError
  child.on('error', (error) => { captureError = error })
  child.stdin.on('error', (error) => { captureError = error })
  const start = Date.now()
  let recording = true
  let frameIndex = 0
  // 从 Chromium 页面直接采集，避免其他桌面窗口遮挡或进入录屏。
  const frames = (async () => {
    await sleep(100)
    while (recording && !captureError) {
      const frame = await page.screenshot({ type: 'jpeg', quality: 88, timeout: 15000 })
      const targetFrame = Math.max(frameIndex + 1, Math.ceil((Date.now() - start) * 15 / 1000))
      while (frameIndex < targetFrame) {
        await new Promise((resolve, reject) => child.stdin.write(frame, (error) => error ? reject(error) : resolve()))
        frameIndex++
      }
      await sleep(Math.max(0, frameIndex * 1000 / 15 - (Date.now() - start)))
    }
  })().catch((error) => { captureError = error })
  let actionError
  try {
    await scene.act(page, app)
    await sleep(Math.max(0, targetSeconds * 1000 - (Date.now() - start)))
  } catch (error) {
    actionError = error
  }
  recording = false
  await frames
  child.stdin.end()
  const exit = await closed
  if (actionError) throw actionError
  if (captureError) throw captureError
  if (exit !== 0 || !fs.existsSync(raw)) throw new Error(`录屏失败 ${scene.id}：${errorLog.slice(-800)}`)
  return raw
}

function composeScene(scene, raw, audio, index) {
  const seconds = Math.max(duration(raw), duration(audio) + 1.5)
  const srtName = `${scene.id}.srt`
  fs.writeFileSync(path.join(output, srtName),
    `1\n${formatSrtTime(0.4)} --> ${formatSrtTime(seconds - 0.35)}\n${scene.caption}\n`, 'utf8')
  const final = path.join(output, `${String(index + 1).padStart(2, '0')}-${scene.id}.mp4`)
  const isCard = scene.id.endsWith('-title') || scene.id.endsWith('-end')
  const subtitleFilter = isCard ? '' : `,subtitles=filename=${srtName}:force_style='FontName=Microsoft YaHei,FontSize=12,PrimaryColour=&HFFFFFF&,Outline=0,Shadow=0,BorderStyle=1,Alignment=2,MarginV=8'`
  const filter = `[0:v]tpad=stop_mode=clone:stop_duration=${Math.max(3, seconds - duration(raw) + 0.1)}${subtitleFilter}[v];[1:a]adelay=500|500,apad[a]`
  run(ffmpeg, [
    '-y', '-i', raw, '-i', audio, '-filter_complex', filter,
    '-map', '[v]', '-map', '[a]', '-t', String(seconds),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', final,
  ], { cwd: output })
  return final
}

async function main() {
  fs.mkdirSync(output, { recursive: true })
  if (process.argv.includes('--tts-only')) {
    const selected = process.argv.find((arg) => arg.startsWith('--scene='))?.slice('--scene='.length)
    for (const scene of scenes.filter((item) => !selected || item.id === selected)) {
      console.log(`旁白就绪：${await synthesize(scene)}`)
    }
    return
  }
  let vite
  let app
  try {
    const audioByScene = new Map()
    if (!dryRun) {
      for (const scene of scenes) {
        if (visualOnly) {
          const silentAudio = path.join(output, `${scene.id}.silent.wav`)
          run(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(scene.narration.length / 5), silentAudio])
          audioByScene.set(scene.id, silentAudio)
        } else {
          audioByScene.set(scene.id, await synthesize(scene))
          console.log(`旁白就绪：${scene.id}`)
        }
      }
    }
    if (reuseRaw) {
      if (chapter !== '12' || dryRun || visualOnly) throw new Error('--reuse-raw 当前仅用于第 12 讲恢复配音合成')
      const clips = scenes.map((scene, index) => composeScene(scene, path.join(output, `${scene.id}.raw.mp4`), audioByScene.get(scene.id), index))
      const list = path.join(output, 'concat.txt')
      fs.writeFileSync(list, clips.map((file) => `file '${path.basename(file)}'`).join('\n'))
      const final = path.join(output, 'SCGP-软件操作教程12-授权信息与软件更新.mp4')
      run(ffmpeg, ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', final], { cwd: output })
      console.log(`成片：${final}（${duration(final).toFixed(1)} 秒）`)
      return
    }
    if (!packagedCheck) {
      vite = await startVite()
      console.log(`Vite 就绪：${vite.url}`)
    }
    const session = await prepareApp(vite?.url)
    app = session.app
    const { page } = session
    if (chapter === '13') page.on('pageerror', (error) => console.error(`训练页面错误：${error.message}`))
    if (chapter === '08') await prepareBackupDemo(page, output, app)
    if (chapter === '10') await prepareResourceDemo(app, output)
    if (chapter !== '01') {
      await introScenes[1].act(page)
    }
    if (chapter === '12' && process.argv.includes('--verify-auto-config-off')) {
      await page.locator('.sidebar-nav .nav-item').filter({ hasText: '系统管理' }).click()
      await page.getByRole('tab', { name: '关于', exact: true }).click()
      await page.locator('.update-panel').waitFor()
      const checked = await page.locator('.update-panel').getByRole('switch').isChecked()
      const stored = JSON.parse(fs.readFileSync(path.join(userData, 'update-config.json'), 'utf8')).autoUpdate
      if (checked || stored !== false) throw new Error('启动前关闭自动检查后，界面与配置不同步')
      fs.writeFileSync(path.join(output, 'auto-update-config-off-verification.json'), JSON.stringify({ packagedCheck, stored, checked, verified: true }, null, 2))
      console.log('打包环境启动配置为关闭时，自动检查开关与持久配置一致')
      return
    }
    if (process.argv.includes('--verify-preset-edit')) {
      await verifyPresetEmotionEdit(page, output)
      return
    }
    if (process.argv.includes('--verify-custom-emotion')) {
      await verifyCustomEmotionResource(page, demoStudentId, output)
      return
    }
    if (chapter === '16') await prepareAiReportDemo(page, output)
    if (chapter === '19') await prepareEmotionalReportDemo(page, demoStudentId, output)
    if (chapter === '02') {
      await introScenes[3].act(page)
    }
    if (chapter === '07') {
      const count = await page.evaluate((studentId) => window.db.get('SELECT count(*) AS n FROM weefim_assess WHERE student_id = ?', [studentId]).n, demoStudentId)
      if (!count) {
        console.log('录制前准备：通过第 03 讲的真实界面流程，在临时副本创建 WeeFIM 演示评估')
        for (const scene of buildAssessmentScenes({ showCard, hideCard, sleep: (ms) => sleep(Math.min(ms, 1000)), studentId: demoStudentId }).slice(1, 7)) {
          await scene.act(page)
        }
      }
    }
    if (dryRun) {
      await page.screenshot({ path: path.join(output, '00-login-preflight.png') })
    }
    const finalScenes = []
    for (const [index, scene] of scenes.entries()) {
      console.log(`执行镜头：${scene.id}`)
      if (dryRun) {
        await scene.act(page, app)
        await page.screenshot({ path: path.join(output, `${scene.id}.dry-run.png`) })
      } else {
        if (rerecordScene && !rerecordScenes.has(scene.id)) {
          const existing = path.join(output, `${String(index + 1).padStart(2, '0')}-${scene.id}.mp4`)
          if (!fs.existsSync(existing)) throw new Error(`局部复录缺少已有镜头：${existing}`)
          await scene.act(page, app)
          finalScenes.push(existing)
          continue
        }
        const audio = audioByScene.get(scene.id)
        const raw = await captureScene(app, page, scene, duration(audio) + 1.5)
        finalScenes.push(composeScene(scene, raw, audio, index))
      }
    }
    if (chapter === '02') {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => Boolean(window.db), undefined, { timeout: 30000 })
      const persisted = await page.evaluate(() => window.db.get('SELECT birthday, gender, student_no, avatar_path FROM student WHERE name = ?', ['演示生乙']))
      if (!persisted || persisted.birthday !== '2020-09-18' || persisted.gender !== '男' || !persisted.student_no || !persisted.avatar_path) {
        throw new Error('重载后未能回查完整学生资料')
      }
      console.log('重载后回查通过：新增档案已持久保存')
    }
    if (chapter === '03') {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => Boolean(window.db), undefined, { timeout: 30000 })
      const count = await page.evaluate((studentId) => window.db.get(
        'SELECT count(*) AS n FROM weefim_assess_detail WHERE assess_id = (SELECT max(id) FROM weefim_assess WHERE student_id = ?)', [studentId]).n, demoStudentId)
      if (count !== 18) throw new Error('重载后未能回查 18 条 WeeFIM 答题记录')
      console.log('重载回查通过：评估及 18 条答题记录已保存')
    }
    if (chapter === '04') {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => Boolean(window.db), undefined, { timeout: 30000 })
      await verifyTrainingPlan(page, demoStudentId)
      console.log('重载回查通过：计划、目标及调整后的资源配置已保存')
    }
    if (chapter === '05') {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => Boolean(window.db), undefined, { timeout: 30000 })
      await verifyGameRecording(page, demoStudentId, output)
      console.log('重载回查通过：游戏记录、5 轮作答和关联报告已保存')
    }
    if (chapter === '06') {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => Boolean(window.db), undefined, { timeout: 30000 })
      await verifyEquipmentRecording(page, demoStudentId)
      console.log('重载回查通过：两条器材记录、评分、辅助等级、时长和备注已保存')
    }
    if (chapter === '07') {
      await verifyReportExports(output)
      console.log('实际导出文件检查通过：Word / HTML 均包含学生信息、页眉与内嵌头像')
    }
    if (chapter === '08') {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => Boolean(window.db), undefined, { timeout: 30000 })
      await verifyBackupRestore(page, demoStudentId, output)
      console.log('重载回查通过：恢复后的学生、关键业务记录与托管资源保持一致')
    }
    if (chapter === '09') {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => Boolean(window.db), undefined, { timeout: 30000 })
      await verifyUserManagement(page, output)
      console.log('重载回查通过：演示账号资料、管理员角色和启用状态已保存')
    }
    if (chapter === '10') {
      await verifyResourceManagement(page, output)
      console.log('最终核对通过：受管文件、资料条目及当前账号收藏一致')
    }
    if (chapter === '11') {
      await verifyClassManagement(page, demoStudentId, output)
      console.log('最终核对通过：班级、教师、学生当前归属及在籍人数一致')
    }
    if (chapter === '12') {
      await verifyLicenseUpdate(page, app, output)
      console.log('最终核对通过：授权信息、机器码复制与更新设置回查')
    }
    if (chapter === '13') {
      await verifyEmotionalTraining(page, demoStudentId, output)
      console.log('最终核对通过：情绪小游戏完成状态、原始表现与详情已保存')
    }
    if (chapter === '14') {
      await verifySelfCareTraining(page, demoStudentId, output)
      console.log('最终核对通过：自理训练记录、全部步骤及备注修订已保存')
    }
    if (chapter === '15') {
      await verifyAiConsultation(page, demoStudentId, output)
      console.log('最终核对通过：AI 配置、三轮真实问答及修订与会话重载回查')
    }
    if (chapter === '16') {
      await verifyAiReport(page, demoStudentId, output)
      console.log('最终核对通过：AI 真实查库、实际 Word 导出、Word 渲染及历史回查')
    }
    if (chapter === '17') {
      await verifyEmotionScene(page, demoStudentId, output)
      console.log('最终核对通过：情绪场景逐题作答、原始明细、统一场次与摘要回查')
    }
    if (chapter === '18') {
      await verifyCareTraining(page, demoStudentId, output)
      console.log('最终核对通过：表达关心三步选择、关心方式、接收者视角与摘要回查')
    }
    if (chapter === '20') {
      await verifySceneEditor(page, output)
      console.log('最终核对通过：场景编辑、重载、真实训练题目与反馈；试用退出未新增训练记录')
    }
    if (chapter === '23') await verifyConnersPsq(page, demoStudentId, output)
    if (chapter === '24') await verifyAbc(page, demoStudentId, output)
    if (chapter === '22') {
      await verifySm(page, demoStudentId, output, app)
      console.log('最终核对通过：S-M 顺向基线、自动结束、报告、Word 与重载回查')
    }
    if (chapter === '21') {
      await verifyCsirs(page, demoStudentId, output)
      console.log('最终核对通过：CSIRS 全部适用题目、原始分、报告关联、Word 下载与重载回查')
    }
    if (!dryRun) {
      const concatList = path.join(output, 'concat.txt')
      fs.writeFileSync(concatList, finalScenes.map((file) => `file '${path.basename(file)}'`).join('\n'), 'utf8')
      const final = path.join(output, chapter === '24'
        ? 'SCGP-软件操作教程24-ABC行为评定与报告.mp4'
        : chapter === '23'
        ? 'SCGP-软件操作教程23-Conners父母问卷与报告.mp4'
        : chapter === '22'
        ? 'SCGP-软件操作教程22-S-M社会生活能力评估与报告.mp4'
        : chapter === '21'
        ? 'SCGP-软件操作教程21-CSIRS感觉统合评估与报告.mp4'
        : chapter === '20'
        ? 'SCGP-软件操作教程20-自定义关心情境与试用.mp4'
        : chapter === '19'
        ? 'SCGP-软件操作教程19-情绪模块报告与导出.mp4'
        : chapter === '18'
        ? 'SCGP-软件操作教程18-表达关心训练与记录回查.mp4'
        : chapter === '17'
        ? 'SCGP-软件操作教程17-情绪与场景训练及记录回查.mp4'
        : chapter === '16'
        ? 'SCGP-软件操作教程16-AI辅助报告生成与导出.mp4'
        : chapter === '15'
        ? 'SCGP-软件操作教程15-AI助手配置与学生咨询.mp4'
        : chapter === '14'
        ? 'SCGP-软件操作教程14-生活自理训练与记录回查.mp4'
        : chapter === '13'
        ? 'SCGP-软件操作教程13-情绪调节训练与记录回查.mp4'
        : chapter === '12'
        ? visualOnly ? 'SCGP-软件操作教程12-授权信息与软件更新-无旁白预览.mp4' : 'SCGP-软件操作教程12-授权信息与软件更新.mp4'
        : chapter === '11'
        ? 'SCGP-软件操作教程11-班级与学生分班.mp4'
        : chapter === '10'
        ? 'SCGP-软件操作教程10-资源查找与管理.mp4'
        : chapter === '09'
        ? 'SCGP-软件操作教程09-用户账号与角色管理.mp4'
        : chapter === '08'
        ? 'SCGP-软件操作教程08-数据备份与恢复.mp4'
        : chapter === '07'
        ? 'SCGP-软件操作教程07-报告查看与导出.mp4'
        : chapter === '06'
        ? 'SCGP-软件操作教程06-器材训练与快速录入.mp4'
        : chapter === '05'
        ? 'SCGP-软件操作教程05-游戏训练与记录回查.mp4'
        : chapter === '04'
        ? 'SCGP-软件操作教程04-制定与调整训练计划.mp4'
        : chapter === '03'
        ? 'SCGP-软件操作教程03-量表评估与结果查看.mp4'
        : chapter === '02'
        ? 'SCGP-软件操作教程02-新增学生档案与回查.mp4'
        : 'SCGP-软件操作教程01-登录首页与查找学生.mp4')
      run(ffmpeg, ['-y', '-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', final], { cwd: output })
      console.log(`成片：${final}（${duration(final).toFixed(1)} 秒）`)
    } else {
      console.log(`操作链通过，截图目录：${output}`)
    }
  } finally {
    await app?.close().catch(() => {})
    vite?.child.kill()
    if (path.dirname(tempRoot) === os.tmpdir() && path.basename(tempRoot).startsWith('scgp-customer-video-')) {
      try { fs.rmSync(tempRoot, { recursive: true, force: true }) }
      catch (error) { console.warn(`临时录制目录清理失败：${error.message}`) }
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
