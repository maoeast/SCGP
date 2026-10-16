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
import { buildConnersPsqScenes } from '../video/customer-behavior-assessment-scenes.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const output = path.join(root, 'output', 'product-acceptance', '2026-10-15-first-batch')
const sourceDb = process.env.SCGP_VIDEO_SOURCE_DB || path.join(process.env.APPDATA || '', 'scgp', 'database.sqlite')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scgp-first-batch-'))
const userData = path.join(tempRoot, 'user-data')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      server.close(() => resolve(port))
    })
  })
}

async function startVite() {
  const port = await freePort()
  const secure = fs.existsSync(path.join(root, 'dev-cert.pem')) && fs.existsSync(path.join(root, 'dev-key.pem'))
  const url = `${secure ? 'https' : 'http'}://127.0.0.1:${port}`
  const child = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--config', path.join(root, 'scripts/video/vite.capture.config.mjs'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    env: { ...process.env, ELECTRON: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  child.stdout.on('data', chunk => { log += chunk.toString() })
  child.stderr.on('data', chunk => { log += chunk.toString() })
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`Vite 退出：${log.slice(-1200)}`)
    try {
      const status = await new Promise((resolve, reject) => {
        const request = (secure ? https : http).get(url, { rejectUnauthorized: false }, response => {
          response.resume()
          resolve(response.statusCode || 0)
        })
        request.on('error', reject)
        request.setTimeout(1500, () => request.destroy(new Error('Vite probe timeout')))
      })
      if (status > 0 && status < 500) return { child, url }
    } catch { /* 等待服务启动 */ }
    await sleep(500)
  }
  throw new Error(`Vite 启动超时：${log.slice(-1200)}`)
}

async function downloadFromUi(page, app, name) {
  const exportRoot = path.join(output, 'exports')
  fs.mkdirSync(exportRoot, { recursive: true })
  const directory = fs.mkdtempSync(path.join(exportRoot, 'capture-'))
  await app.evaluate(({ BrowserWindow }, target) => {
    globalThis.__firstBatchDownload = { state: 'waiting' }
    BrowserWindow.getAllWindows()[0].webContents.session.once('will-download', (_event, item) => {
      const file = `${target}/${item.getFilename().replace(/[<>:"/\\|?*]/gu, '_')}`
      item.setSavePath(file)
      globalThis.__firstBatchDownload = { state: 'progressing', file }
      item.once('done', (_event, state) => { globalThis.__firstBatchDownload.state = state })
    })
  }, directory)
  await page.getByRole('button', { name: '导出报告', exact: true }).click()
  let result
  for (let i = 0; i < 100; i++) {
    result = await app.evaluate(() => globalThis.__firstBatchDownload)
    if (['completed', 'cancelled', 'interrupted'].includes(result.state)) break
    await sleep(250)
  }
  assert(result?.state === 'completed' && fs.existsSync(result.file), `${name} 实际下载失败：${JSON.stringify(result)}`)
  const destination = path.join(exportRoot, `${name}${path.extname(result.file)}`)
  fs.copyFileSync(result.file, destination)
  return destination
}

async function setFormat(page, format) {
  await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^系统管理$/u }).click()
  await page.getByRole('tab', { name: '系统设置', exact: true }).click()
  const settings = page.locator('.system-settings-section').filter({ has: page.getByRole('heading', { name: '报告设置', exact: true }) })
  await settings.getByText(format, { exact: true }).click()
  await sleep(1200)
}

async function wordText(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file))
  return (await zip.file('word/document.xml')?.async('string'))?.replace(/<[^>]+>/gu, '') || ''
}

async function runConners(page, app, url) {
  const scenes = buildConnersPsqScenes({
    showCard: async () => {}, hideCard: async () => {}, sleep: ms => sleep(Math.min(ms, 100)), studentId: 10002, output,
  })
  for (const scene of scenes.slice(0, 10)) {
    console.log(`PSQ: ${scene.id}`)
    await scene.act(page, app)
  }
  const reportUrl = page.url()
  const row = await page.evaluate(() => window.db.get('SELECT * FROM conners_psq_assess WHERE student_id = 10002 ORDER BY id DESC LIMIT 1'))
  const t = JSON.parse(row.t_scores)
  const reportText = await page.locator('.conners-psq-report').innerText()
  assert(row.pi_score === null && row.ni_score === null && row.is_valid === null, 'PSQ 新记录的效度占位仍被存成零或有效')
  assert(reportText.includes('PI、NI 与问卷效度未评估'), 'PSQ 页面未标明未评估')
  assert(reportText.includes('心身障碍 T 分 102.9') && reportText.includes('品行问题（T 分 69.4'), 'PSQ 页面维度与总览未按 T 分一致解读')
  assert(!reportText.includes('均处于常模的平均范围内'), 'PSQ 页面仍把各维度概括为正常')
  await page.screenshot({ path: path.join(output, 'psq-report.png'), fullPage: true })
  const word = await downloadFromUi(page, app, 'psq-word')
  const text = await wordText(word)
  assert(text.includes('效度状态未评估') && text.includes('心身障碍 T 分 102.9') && !text.includes('效度状态有效'), 'PSQ Word 内容与页面不一致')
  await setFormat(page, 'HTML')
  await page.goto(reportUrl, { waitUntil: 'domcontentloaded' })
  await page.locator('.conners-psq-report h2').waitFor()
  const html = await downloadFromUi(page, app, 'psq-html')
  const htmlText = fs.readFileSync(html, 'utf8')
  assert(htmlText.includes('效度状态') && htmlText.includes('未评估') && htmlText.includes('心身障碍 T 分 102.9'), 'PSQ HTML 内容与页面不一致')
  const reloaded = await page.evaluate(id => window.db.get('SELECT pi_score, ni_score, is_valid, t_scores FROM conners_psq_assess WHERE id = ?', [id]), row.id)
  assert(reloaded.pi_score === null && JSON.parse(reloaded.t_scores).psychosomatic === t.psychosomatic, 'PSQ 重载后结果丢失')
  return { id: row.id, ageMonths: row.age_months, pi: row.pi_score, ni: row.ni_score, validity: row.is_valid, tScores: t, reportUrl, word, html }
}

async function runConnersTrs(page, app) {
  await setFormat(page, 'Word')
  const before = await page.evaluate(() => window.db.get('SELECT count(*) AS n FROM conners_trs_assess WHERE student_id = 10002').n)
  await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^能力评估$/u }).click()
  await page.locator('.assessment-category-chip').filter({ hasText: '情绪调节' }).click()
  await page.locator('.assessment-card').filter({ hasText: 'Conners 教师用问卷' }).getByRole('button', { name: '开始评估', exact: true }).click()
  await page.getByPlaceholder('搜索学生姓名或学号').fill('演示生甲')
  await page.locator('.el-table__row').filter({ hasText: '演示生甲' }).getByRole('button', { name: '选择', exact: true }).click()
  await page.getByRole('button', { name: '我已了解，开始评估', exact: true }).click()
  await page.locator('.question-number').waitFor()
  const questions = await page.evaluate(async () => {
    const { ConnersTRSDriver } = await import('/src/strategies/assessment/ConnersTRSDriver.ts')
    const { calculateAgeInMonths } = await import('/src/types/assessment.ts')
    const student = window.db.get('SELECT * FROM student WHERE id = 10002')
    return new ConnersTRSDriver().getQuestions({ ...student, ageInMonths: calculateAgeInMonths(student.birthday) })
  })
  assert(questions.length === 28, `TRS 题数 ${questions.length}，预期 28`)
  for (let i = 0; i < questions.length; i++) {
    const previous = (await page.locator('.question-number').innerText()).trim()
    const name = ['A. 无', 'B. 稍有', 'C. 相当多', 'D. 很多'][i % 4]
    await page.locator('.answer-options .el-radio, .answer-options .el-radio-button').filter({ has: page.getByText(name, { exact: true }) }).first().click()
    if (i < questions.length - 1) await page.waitForFunction(old => document.querySelector('.question-number')?.textContent?.trim() !== old, previous)
  }
  await page.getByRole('button', { name: '查看报告', exact: true }).waitFor()
  const row = await page.evaluate(() => window.db.get('SELECT * FROM conners_trs_assess WHERE student_id = 10002 ORDER BY id DESC LIMIT 1'))
  assert(row.pi_score === null && row.ni_score === null && row.is_valid === null, 'TRS 新记录的效度占位仍被存成零或有效')
  const t = JSON.parse(row.t_scores)
  await page.getByRole('button', { name: '查看报告', exact: true }).click()
  await page.locator('.conners-trs-report h2').waitFor()
  const reportUrl = page.url()
  const reportText = await page.locator('.conners-trs-report').innerText()
  assert(reportText.includes('PI、NI 与问卷效度未评估'), 'TRS 页面未标明效度未评估')
  assert(reportText.includes(`多动指数 T 分 ${t.hyperactivity_index}`) && reportText.includes(`品行问题（T 分 ${t.conduct}`), 'TRS 页面总览与偏高维度不一致')
  assert(!reportText.includes('各维度均处于常模的平均范围内'), 'TRS 总览仍错误概括各维度')
  await page.screenshot({ path: path.join(output, 'trs-report.png'), fullPage: true })
  const word = await downloadFromUi(page, app, 'trs-word')
  const wordContent = await wordText(word)
  assert(wordContent.includes('效度状态未评估') && !wordContent.includes('效度状态有效') && wordContent.includes(`品行问题（T 分 ${t.conduct}`), 'TRS Word 效度或维度描述不一致')
  await setFormat(page, 'HTML')
  await page.goto(reportUrl, { waitUntil: 'domcontentloaded' })
  await page.locator('.conners-trs-report h2').waitFor()
  const html = await downloadFromUi(page, app, 'trs-html')
  const htmlContent = fs.readFileSync(html, 'utf8')
  assert(htmlContent.includes('效度状态') && htmlContent.includes('未评估') && htmlContent.includes(`品行问题（T 分 ${t.conduct}`), 'TRS HTML 效度或维度描述不一致')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('.conners-trs-report h2').waitFor()
  const after = await page.evaluate(() => window.db.get('SELECT count(*) AS n FROM conners_trs_assess WHERE student_id = 10002').n)
  assert(after === before + 1, 'TRS 重载后记录数不一致')
  const reloaded = await page.evaluate(id => window.db.get('SELECT pi_score, ni_score, is_valid, t_scores FROM conners_trs_assess WHERE id = ?', [id]), row.id)
  assert(reloaded.pi_score === null && JSON.parse(reloaded.t_scores).hyperactivity_index === t.hyperactivity_index, 'TRS 重载后结果丢失')
  return { id: row.id, ageMonths: row.age_months, questionCount: questions.length, pi: row.pi_score, ni: row.ni_score, validity: row.is_valid, tScores: t, reportUrl, word, html }
}

async function runCsirs(page, app, url, studentId, expectedCount, label) {
  const student = await page.evaluate(id => window.db.get('SELECT id, name, birthday FROM student WHERE id = ?', [id]), studentId)
  const before = await page.evaluate(id => window.db.get('SELECT count(*) AS n FROM csirs_assess WHERE student_id = ?', [id]).n, studentId)
  await setFormat(page, 'Word')
  await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^能力评估$/u }).click()
  await page.locator('.assessment-category-chip').filter({ hasText: '感官统合' }).click()
  await page.locator('.assessment-card').filter({ hasText: 'CSIRS' }).getByRole('button', { name: '开始评估', exact: true }).click()
  await page.getByPlaceholder('搜索学生姓名或学号').fill(student.name)
  await page.locator('.el-table__row').filter({ hasText: student.name }).getByRole('button', { name: '选择', exact: true }).click()
  await page.getByRole('button', { name: '我已了解，开始评估', exact: true }).click()
  await page.locator('.question-number').waitFor()
  const questions = await page.evaluate(async id => {
    const { CSIRSDriver } = await import('/src/strategies/assessment/CSIRSDriver.ts')
    const { calculateAgeInMonths } = await import('/src/types/assessment.ts')
    const student = window.db.get('SELECT * FROM student WHERE id = ?', [id])
    const ageInMonths = calculateAgeInMonths(student.birthday)
    return { ageInMonths, questions: new CSIRSDriver().getQuestions({ ...student, ageInMonths }) }
  }, studentId)
  assert(questions.questions.length === expectedCount, `${label} 题数 ${questions.questions.length}，预期 ${expectedCount}`)
  const answerScores = []
  for (let i = 0; i < questions.questions.length; i++) {
    const previous = (await page.locator('.question-number').innerText()).trim()
    const score = [3, 4, 5, 2][i % 4]
    answerScores.push(score)
    const name = { 3: '有时候', 4: '很少这样', 5: '从不这样', 2: '经常这样' }[score]
    const option = page.locator('.answer-options .el-radio, .answer-options .el-radio-button').filter({ has: page.getByText(name, { exact: true }) }).first()
    await option.click()
    if (i < questions.questions.length - 1) {
      await page.waitForFunction(old => document.querySelector('.question-number')?.textContent?.trim() !== old, previous)
    }
  }
  await page.getByRole('button', { name: '查看报告', exact: true }).waitFor()
  const row = await page.evaluate(id => window.db.get('SELECT * FROM csirs_assess WHERE student_id = ? ORDER BY id DESC LIMIT 1', [id]), studentId)
  assert(row && row.age_months === questions.ageInMonths, `${label} 保存的年龄不一致`)
  const details = await page.evaluate(id => window.db.all('SELECT question_id, dimension, score FROM csirs_assess_detail WHERE assess_id = ? ORDER BY question_id', [id]), row.id)
  assert(details.length === expectedCount && details.every((item, i) => item.question_id === questions.questions[i].id && item.score === answerScores[i]), `${label} 逐题保存不一致`)
  const raw = JSON.parse(row.raw_scores)
  const t = JSON.parse(row.t_scores)
  const expectedDimensions = expectedCount === 47 ? 3 : 4
  assert(Object.keys(raw).length === expectedDimensions && Object.keys(t).length === expectedDimensions, `${label} 计分维度不一致`)
  assert(!('executive' in t), `${label} 执行功能被伪装为 T 分`)
  assert(row.total_t_score === Math.round(Object.values(t).reduce((sum, value) => sum + value, 0) / expectedDimensions), `${label} 总 T 分与参与维度不一致`)
  await page.getByRole('button', { name: '查看报告', exact: true }).click()
  await page.locator('.csirs-report h2').waitFor()
  const reportUrl = page.url()
  const reportText = await page.locator('.csirs-report').innerText()
  assert(expectedCount !== 47 || !reportText.includes('视听知觉与学业表现'), `${label} 页面出现未施测维度`)
  assert(!reportText.includes('编程机器人') && !reportText.includes('神经系统调节能力卓越'), `${label} 页面仍使用与年龄或证据不符的固定建议`)
  await page.screenshot({ path: path.join(output, `${label}-report.png`), fullPage: true })
  const word = await downloadFromUi(page, app, `${label}-word`)
  const wordContent = await wordText(word)
  assert(wordContent.includes(String(row.total_t_score)) && (expectedCount !== 47 || !wordContent.includes('视听知觉与学业表现')), `${label} Word 内容不一致`)
  assert(!wordContent.includes('编程机器人'), `${label} Word 仍使用高龄固定建议`)
  await setFormat(page, 'HTML')
  await page.goto(reportUrl, { waitUntil: 'domcontentloaded' })
  await page.locator('.csirs-report h2').waitFor()
  const html = await downloadFromUi(page, app, `${label}-html`)
  const htmlContent = fs.readFileSync(html, 'utf8')
  assert(htmlContent.includes(String(row.total_t_score)) && (expectedCount !== 47 || !htmlContent.includes('视听知觉与学业表现')), `${label} HTML 内容不一致`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('.csirs-report h2').waitFor()
  const after = await page.evaluate(id => window.db.get('SELECT count(*) AS n FROM csirs_assess WHERE student_id = ?', [id]).n, studentId)
  assert(after === before + 1, `${label} 重载后记录数不一致`)
  return { id: row.id, ageMonths: row.age_months, count: details.length, raw, tScores: t, totalTScore: row.total_t_score, reportUrl, word, html }
}

async function main() {
  fs.mkdirSync(output, { recursive: true })
  assert(fs.existsSync(sourceDb), `演示数据库不存在：${sourceDb}`)
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
        activationCode: 'SPED-DEMO-FIRST-BATCH', isActivated: true, isTrial: false,
        licenseType: 'full', allowedModules: ['sensory', 'emotional', 'social', 'life_skills', 'cognitive'], cachedAt: new Date().toISOString(),
      }))
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => Boolean(window.db), undefined, { timeout: 60000 })
    await page.evaluate(async () => {
      for (const [id, name] of [[10002, '演示生甲'], [10014, '演示生乙']]) {
        const student = window.db.get('SELECT id FROM student WHERE id = ?', [id])
        if (!student) throw new Error(`演示学生 ${id} 不在数据库中`)
        window.db.run('UPDATE student SET name = ?, student_no = ? WHERE id = ?', [name, `DEMO-${id}`, id])
      }
      await window.db.saveNow()
    })
    await page.goto(`${vite.url}/#/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('input[autocomplete="username"]').fill('admin')
    await page.locator('input[autocomplete="current-password"]').fill('admin123')
    await page.getByRole('button', { name: '登录系统' }).click()
    await page.waitForURL(/#\/dashboard(?:$|\?)/u)
    const boundaries = await page.evaluate(async () => {
      const { getQuestionsByAge, getDimensionsByAge } = await import('/src/database/csirs-questions.ts')
      const { CSIRSDriver } = await import('/src/strategies/assessment/CSIRSDriver.ts')
      const ages = [35, 36, 43, 71, 72, 85, 119, 120, 155, 156]
      const counts = Object.fromEntries(ages.map(age => [age, {
        questions: getQuestionsByAge(age).length,
        dimensions: getDimensionsByAge(age).map(dimension => dimension.name_en),
      }]))
      const driver = new CSIRSDriver()
      const context = { id: -1, name: '边界样本', ageInMonths: 120, gender: '女' }
      const questions = driver.getQuestions(context)
      const answers = Object.fromEntries(questions.map(question => [question.id, { score: 3 }]))
      const score = driver.calculateScore(answers, context)
      const executive = score.dimensions.find(dimension => dimension.code === 'executive')
      return { counts, driverRange: driver.ageRange, age120: {
        count: questions.length,
        totalTScore: score.tScore,
        executiveHasTScore: executive?.standardScore !== undefined,
      } }
    })
    const expectedCounts = { 35: 0, 36: 47, 43: 47, 71: 47, 72: 55, 85: 55, 119: 55, 120: 58, 155: 58, 156: 0 }
    assert(Object.entries(expectedCounts).every(([age, count]) => boundaries.counts[age].questions === count), 'CSIRS 年龄边界题数不一致')
    assert(boundaries.driverRange.max === 155 && !boundaries.age120.executiveHasTScore, 'CSIRS 上限或执行功能 T 分口径不一致')
    fs.writeFileSync(path.join(output, 'boundary-verification.json'), JSON.stringify(boundaries, null, 2), 'utf8')
    if (process.argv.includes('--boundary-only')) return
    if (process.argv.includes('--trs-only')) {
      const trs = await runConnersTrs(page, app)
      const sourceHashAfter = sha256(sourceDb)
      assert(sourceHashBefore === sourceHashAfter, '源数据库 SHA-256 发生变化')
      fs.writeFileSync(path.join(output, 'trs-verification.json'), JSON.stringify({ verified: true, sourceHashBefore, sourceHashAfter, trs }, null, 2), 'utf8')
      console.log(`TRS 验收证据：${path.join(output, 'trs-verification.json')}`)
      return
    }
    const previous = path.join(output, 'first-batch-verification.json')
    const psq = process.argv.includes('--csirs-only') && fs.existsSync(previous)
      ? JSON.parse(fs.readFileSync(previous, 'utf8')).psq
      : await runConners(page, app, vite.url)
    console.log(process.argv.includes('--csirs-only') ? 'PSQ 沿用上一轮真实 UI 核验' : 'PSQ 通过')
    const csirs43 = await runCsirs(page, app, vite.url, 10002, 47, 'csirs-43m')
    console.log('CSIRS 43 月龄通过')
    const csirs85 = await runCsirs(page, app, vite.url, 10014, 55, 'csirs-85m')
    console.log('CSIRS 85 月龄通过')
    const sourceHashAfter = sha256(sourceDb)
    assert(sourceHashBefore === sourceHashAfter, '源数据库 SHA-256 发生变化')
    const evidence = { verified: true, sourceHashBefore, sourceHashAfter, userData, psq, csirs43, csirs85 }
    fs.writeFileSync(path.join(output, 'first-batch-verification.json'), JSON.stringify(evidence, null, 2), 'utf8')
    console.log(`验收证据：${path.join(output, 'first-batch-verification.json')}`)
  } finally {
    if (app) await app.close().catch(() => {})
    if (vite?.child) vite.child.kill()
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
