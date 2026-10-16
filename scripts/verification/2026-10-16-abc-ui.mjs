import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'
import JSZip from 'jszip'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const output = path.join(root, 'output', 'product-acceptance', '2026-10-16-abc')
const sourceDb = process.env.SCGP_VIDEO_SOURCE_DB || path.join(process.env.APPDATA || '', 'scgp', 'database.sqlite')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scgp-abc-'))
const userData = path.join(tempRoot, 'user-data')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

async function freePort() {
  const server = net.createServer()
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  return port
}

async function startVite() {
  const port = await freePort()
  const secure = fs.existsSync(path.join(root, 'dev-cert.pem')) && fs.existsSync(path.join(root, 'dev-key.pem'))
  const url = `${secure ? 'https' : 'http'}://127.0.0.1:${port}`
  const child = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--config', path.join(root, 'scripts/video/vite.capture.config.mjs'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root, env: { ...process.env, ELECTRON: 'true' }, stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  child.stdout.on('data', chunk => { log += chunk.toString() })
  child.stderr.on('data', chunk => { log += chunk.toString() })
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`Vite 退出：${log.slice(-1200)}`)
    try {
      const status = await new Promise((resolve, reject) => {
        const request = (secure ? https : http).get(url, { rejectUnauthorized: false }, response => { response.resume(); resolve(response.statusCode || 0) })
        request.on('error', reject)
        request.setTimeout(1500, () => request.destroy(new Error('Vite probe timeout')))
      })
      if (status > 0 && status < 500) return { child, url }
    } catch { /* 等待启动 */ }
    await sleep(500)
  }
  throw new Error(`Vite 启动超时：${log.slice(-1200)}`)
}

async function download(page, app, name) {
  const exportRoot = path.join(output, 'exports')
  fs.mkdirSync(exportRoot, { recursive: true })
  const directory = fs.mkdtempSync(path.join(exportRoot, 'capture-'))
  await app.evaluate(({ BrowserWindow }, target) => {
    globalThis.__abcDownload = { state: 'waiting' }
    BrowserWindow.getAllWindows()[0].webContents.session.once('will-download', (_event, item) => {
      const file = `${target}/${item.getFilename().replace(/[<>:"/\\|?*]/gu, '_')}`
      item.setSavePath(file)
      globalThis.__abcDownload = { state: 'progressing', file }
      item.once('done', (_event, state) => { globalThis.__abcDownload.state = state })
    })
  }, directory)
  await page.getByRole('button', { name: '导出报告', exact: true }).click()
  let result
  for (let i = 0; i < 100; i++) {
    result = await app.evaluate(() => globalThis.__abcDownload)
    if (['completed', 'cancelled', 'interrupted'].includes(result.state)) break
    await sleep(250)
  }
  assert(result?.state === 'completed' && fs.existsSync(result.file), `${name} 实际下载失败：${JSON.stringify(result)}`)
  const target = path.join(exportRoot, `${name}${path.extname(result.file)}`)
  fs.copyFileSync(result.file, target)
  return target
}

async function setFormat(page, format) {
  await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^系统管理$/u }).click()
  await page.getByRole('tab', { name: '系统设置', exact: true }).click()
  const settings = page.locator('.system-settings-section').filter({ has: page.getByRole('heading', { name: '报告设置', exact: true }) })
  await settings.getByText(format, { exact: true }).click()
  await sleep(1200)
}

async function main() {
  fs.mkdirSync(output, { recursive: true })
  assert(fs.existsSync(sourceDb), `源数据库不存在：${sourceDb}`)
  const sourceHashBefore = sha256(sourceDb)
  fs.mkdirSync(userData, { recursive: true })
  fs.copyFileSync(sourceDb, path.join(userData, 'database.sqlite'))
  let vite, app
  try {
    vite = await startVite()
    app = await electron.launch({ args: ['.'], cwd: root, env: { ...process.env, ELECTRON: 'true', SCGP_DEV_SERVER_URL: vite.url, SCGP_TEST_USER_DATA_DIR: userData } })
    const page = await app.firstWindow()
    await page.locator('#app').waitFor({ state: 'visible', timeout: 60000 })
    await page.waitForFunction(() => Boolean(window.electronAPI && window.db), undefined, { timeout: 60000 })
    await app.evaluate(({ BrowserWindow }) => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.closeDevTools()
        win.setBounds({ x: 0, y: 0, width: 1600, height: 900 })
        win.show()
      }
    })
    await page.evaluate(async () => {
      const machineId = await window.electronAPI.getMachineId()
      localStorage.setItem('sic_ads_activation_cache', JSON.stringify({
        version: '1.1', machineCode: String(machineId).slice(0, 16).toUpperCase(),
        activationCode: 'SPED-DEMO-ABC-VERIFY', isActivated: true, isTrial: false,
        licenseType: 'full', allowedModules: ['sensory', 'emotional', 'social', 'life_skills', 'cognitive'], cachedAt: new Date().toISOString(),
      }))
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => Boolean(window.db), undefined, { timeout: 60000 })
    await page.evaluate(async () => {
      const student = window.db.get('SELECT id FROM student WHERE id = 10002')
      if (!student) throw new Error('演示学生不在数据库中')
      window.db.run('UPDATE student SET name = ?, student_no = ? WHERE id = ?', ['演示生甲', 'DEMO-10002', 10002])
      await window.db.saveNow()
    })
    await page.goto(`${vite.url}/#/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('input[autocomplete="username"]').fill('admin')
    await page.locator('input[autocomplete="current-password"]').fill('admin123')
    await page.getByRole('button', { name: '登录系统' }).click()
    await page.waitForURL(/#\/dashboard(?:$|\?)/u)

    await setFormat(page, 'Word')
    await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^能力评估$/u }).click()
    await page.locator('.assessment-category-chip').filter({ hasText: '社交沟通' }).click()
    await page.locator('.assessment-card').filter({ hasText: 'ABC量表' }).getByRole('button', { name: '开始评估', exact: true }).click()
    await page.getByPlaceholder('搜索学生姓名或学号').fill('演示生甲')
    await page.locator('.el-table__row').filter({ hasText: '演示生甲' }).getByRole('button', { name: '选择', exact: true }).click()
    await page.getByRole('button', { name: '我已了解，开始评估', exact: true }).click()
    await page.locator('.question-number').waitFor()
    const questions = await page.evaluate(async () => {
      const { ABCDriver } = await import('/src/strategies/assessment/ABCDriver.ts')
      const { calculateAgeInMonths } = await import('/src/types/assessment.ts')
      const student = window.db.get('SELECT * FROM student WHERE id = 10002')
      return new ABCDriver().getQuestions({ ...student, ageInMonths: calculateAgeInMonths(student.birthday) })
    })
    assert(questions.length === 57, `ABC 题数不符：${questions.length}`)
    const yesIds = new Set(['abc_2', 'abc_14', 'abc_19', 'abc_23', 'abc_31', 'abc_36', 'abc_41', 'abc_45', 'abc_49', 'abc_50', 'abc_55'])
    for (let i = 0; i < questions.length; i++) {
      const previous = (await page.locator('.question-number').innerText()).trim()
      const label = yesIds.has(questions[i].id) ? '是' : '否'
      await page.locator('.answer-options .el-radio, .answer-options .el-radio-button').filter({ has: page.getByText(label, { exact: true }) }).first().click()
      if (i < questions.length - 1) await page.waitForFunction(old => document.querySelector('.question-number')?.textContent?.trim() !== old, previous)
    }
    await page.getByRole('button', { name: '查看报告', exact: true }).waitFor({ timeout: 30000 })
    const saved = await page.evaluate(() => window.db.get('SELECT * FROM abc_assess WHERE student_id = 10002 ORDER BY id DESC LIMIT 1'))
    const dims = JSON.parse(saved.dimension_scores)
    const answers = JSON.parse(saved.raw_answers)
    assert(Object.keys(answers).length === 57 && yesIds.size === 11, '逐题答案数不符')
    assert(JSON.stringify(dims) === JSON.stringify({ sensory: 0, relating: 0, body_object: 0, language: 0, social_self_help: 25 }), `五因子保存不符：${JSON.stringify(dims)}`)
    assert(saved.total_score === 25 && answers.abc_45 === 1 && answers.abc_41 === 1, '总分或自理题保存不符')
    await page.getByRole('button', { name: '查看报告', exact: true }).click()
    await page.locator('.abc-report h2').waitFor()
    const reportUrl = page.url()
    const table = await page.locator('.dimension-scores .el-table__row').allInnerTexts()
    assert(table.length === 5 && table.some(line => line.includes('社会与生活自理') && line.includes('25')), `报告五因子行不符：${JSON.stringify(table)}`)
    await page.screenshot({ path: path.join(output, 'abc-five-factors.png'), fullPage: true })
    const word = await download(page, app, 'abc-word')
    const zip = await JSZip.loadAsync(fs.readFileSync(word))
    const wordText = (await zip.file('word/document.xml')?.async('string'))?.replace(/<[^>]+>/gu, '') || ''
    assert(wordText.includes('社会与生活自理') && wordText.includes('25') && wordText.includes('演示生甲'), 'Word 五因子内容不符')
    assert(wordText.includes('不能仅凭总分判断整体发展情况'), 'Word 仍把低总分直接解释为整体发展良好')
    await setFormat(page, 'HTML')
    await page.goto(reportUrl, { waitUntil: 'domcontentloaded' })
    await page.locator('.abc-report h2').waitFor()
    const html = await download(page, app, 'abc-html')
    const htmlText = fs.readFileSync(html, 'utf8')
    assert(htmlText.includes('社会与生活自理') && htmlText.includes('25') && htmlText.includes('演示生甲'), 'HTML 五因子内容不符')
    assert(htmlText.includes('不能仅凭总分判断整体发展情况'), 'HTML 仍把低总分直接解释为整体发展良好')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('.abc-report h2').waitFor()
    const reloaded = await page.evaluate(id => window.db.get('SELECT raw_answers, dimension_scores, total_score FROM abc_assess WHERE id = ?', [id]), saved.id)
    assert(reloaded.total_score === 25 && JSON.parse(reloaded.dimension_scores).social_self_help === 25 && JSON.parse(reloaded.raw_answers).abc_45 === 1, '重载后数据不符')
    const legacyId = 40005
    await page.goto(`${vite.url}/#/assessment/abc/report/${legacyId}`, { waitUntil: 'domcontentloaded' })
    await page.locator('.abc-report h2').waitFor()
    const legacyNotice = await page.locator('.dimension-scores .el-alert').innerText()
    assert(legacyNotice.includes('五因子分数无法可靠重算'), `旧记录缺失警示：${legacyNotice}`)
    assert(await page.locator('.dimension-scores .el-table__row').count() === 0, '旧四因子记录被套用到新五因子满分')
    await setFormat(page, 'Word')
    await page.goto(`${vite.url}/#/assessment/abc/report/${legacyId}`, { waitUntil: 'domcontentloaded' })
    await page.locator('.abc-report h2').waitFor()
    const legacyWord = await download(page, app, 'abc-legacy-word')
    const legacyZip = await JSZip.loadAsync(fs.readFileSync(legacyWord))
    const legacyWordText = (await legacyZip.file('word/document.xml')?.async('string'))?.replace(/<[^>]+>/gu, '') || ''
    assert(legacyWordText.includes('五因子分数无法可靠重算'), '旧报告 Word 未说明不可重算')
    const sourceHashAfter = sha256(sourceDb)
    assert(sourceHashBefore === sourceHashAfter, '源数据库 SHA-256 已变化')
    const evidence = { verified: true, assessId: saved.id, questionCount: 57, dimensions: dims, totalScore: saved.total_score, abc41: answers.abc_41, abc45: answers.abc_45, reportUrl, word: { file: word, bytes: fs.statSync(word).size }, html: { file: html, bytes: fs.statSync(html).size }, reloaded: true, legacy: { id: legacyId, notice: legacyNotice, word: legacyWord }, sourceHashBefore, sourceHashAfter, tempUserData: userData }
    fs.writeFileSync(path.join(output, 'abc-five-factor-verification.json'), JSON.stringify(evidence, null, 2), 'utf8')
    console.log(`ABC 验收证据：${path.join(output, 'abc-five-factor-verification.json')}`)
  } finally {
    if (app) await app.close().catch(() => {})
    if (vite?.child) vite.child.kill()
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
