/** 教程 19：情绪模块汇总报告、真实 Word/HTML 下载与文件核对。 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import JSZip from 'jszip'
import { buildEmotionSceneScenes, verifyEmotionScene } from './customer-emotion-scene-scenes.mjs'
import { buildCareScenes, verifyCareTraining } from './customer-care-scenes.mjs'

let baseline
let report
let sourceSessions
let wordFile
let htmlFile
let reloaded = false
const header = '演示机构情绪训练报告'

export async function prepareEmotionalReportDemo(page, studentId, output) {
  const options = { showCard: async () => {}, hideCard: async () => {}, sleep: (ms) => page.waitForTimeout(Math.min(ms, 300)), studentId, output }
  for (const scene of buildEmotionSceneScenes(options).slice(0, 7)) await scene.act(page)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('.scene-card').first().waitFor()
  await verifyEmotionScene(page, studentId, output)
  for (const scene of buildCareScenes(options).slice(0, 7)) await scene.act(page)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('.scene-card').first().waitFor()
  await verifyCareTraining(page, studentId, output)
  await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^系统首页$/u }).click()
  await page.locator('.dashboard-hero').waitFor()
  console.log('报告示例准备完成：临时副本真实完成情绪场景与表达关心各一次，保留原历史记录')
}

async function readReport(page, studentId) {
  return page.evaluate(async (id) => {
    const { EmotionalTrainingAPI } = await import('/src/database/emotional-api.ts')
    return new EmotionalTrainingAPI().getStudentReportPayload(id)
  }, studentId)
}

async function counts(page) {
  return page.evaluate(() => Object.fromEntries(['training_records', 'emotional_training_session', 'emotional_training_detail', 'report_record'].map((table) => [table, window.db.get(`SELECT count(*) AS n FROM ${table}`).n])))
}

export async function verifyEmotionalReport(page, studentId, output) {
  const after = await counts(page)
  const current = await readReport(page, studentId)
  if (JSON.stringify(after) !== JSON.stringify(baseline) || JSON.stringify(current) !== JSON.stringify(report) || !reloaded) throw new Error('报告回查数据或业务表计数发生变化')
  if (!wordFile || !htmlFile) throw new Error('未完成 Word 和 HTML 两次实际导出')
  const zip = await JSZip.loadAsync(fs.readFileSync(wordFile))
  const xml = await zip.file('word/document.xml')?.async('string')
  const wordText = xml?.replace(/<[^>]+>/gu, '') || ''
  const html = fs.readFileSync(htmlFile, 'utf8')
  const headings = ['情绪行为模块报告', '演示生甲', '报告总览', '统计覆盖', '情绪识别趋势', '不同情绪类型识别表现', '关心表达类型记录分布', '各类场景掌握情况分布', '各场域场景掌握情况分布', '统计解读与核对']
  for (const text of headings) if (!wordText.includes(text) || !html.includes(text)) throw new Error(`实际导出缺少章节：${text}`)
  // 校验各节实际表格值，避免仅检查标题就认定数据正确。
  const expectedValues = [report.studentName, report.totalSessions, `${report.averageAccuracy.toFixed(1)}%`, report.averageHintLevel ?? '未评估', `${report.totalDurationMinutes} 分钟`, report.coverageText,
    ...report.trend.flatMap((p) => [p.label, `${p.accuracy.toFixed(1)}%`]),
    ...report.emotionPerformance.flatMap((p) => [p.emotion, `${p.accuracy.toFixed(1)}%`, p.averageHintLevel ?? '未评估']),
    ...report.carePreference.flatMap((p) => [p.name, p.value]),
    ...report.sceneMastery.flatMap((p) => [p.category, `${p.accuracy.toFixed(1)}%`]),
    ...report.sceneDomainMastery.flatMap((p) => [p.category, `${p.accuracy.toFixed(1)}%`]), ...report.suggestions].map(String)
  if (expectedValues.some((value) => !wordText.includes(value) || !html.includes(value))) throw new Error('实际文件中的统计值与报告源数据不一致')
  if (wordText.includes('“害怕”情绪识别上的正确率约为 0%') || html.includes('“害怕”情绪识别上的正确率约为 0%')
    || wordText.includes('“未分类”式关心表达') || html.includes('“未分类”式关心表达')) throw new Error('导出仍把缺失明细当作表现')
  const headers = await Promise.all(Object.keys(zip.files).filter((name) => /^word\/header\d+\.xml$/u.test(name)).map((name) => zip.file(name).async('string')))
  if (!headers.some((xml) => xml.includes(header)) || !html.includes(header)) throw new Error('实际导出未带上演示页眉')
  const evidence = { studentId, report, sourceSessions, baseline, after, word: { file: path.relative(output, wordFile).replaceAll('\\', '/'), bytes: fs.statSync(wordFile).size },
    html: { file: path.relative(output, htmlFile).replaceAll('\\', '/'), bytes: fs.statSync(htmlFile).size }, header, reloaded, verified: true }
  fs.writeFileSync(path.join(output, 'emotional-report-verification.json'), JSON.stringify(evidence, null, 2), 'utf8')
  return evidence
}

export function buildEmotionalReportScenes({ showCard, hideCard, sleep, studentId, output }) {
  const settings = (page) => page.locator('.system-settings-section').filter({ has: page.getByRole('heading', { name: '报告设置', exact: true }) })
  async function setFormat(page, format) {
    await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^系统管理$/u }).click()
    await page.getByRole('tab', { name: '系统设置', exact: true }).click()
    await settings(page).scrollIntoViewIfNeeded()
    await sleep(1400)
    await settings(page).getByText(format, { exact: true }).click()
    const avatar = settings(page).getByRole('switch')
    if (await avatar.getAttribute('aria-checked') !== 'true') await avatar.click()
    const input = settings(page).getByPlaceholder('请输入报告页眉文字')
    await input.fill(header)
    await input.press('Tab')
    await sleep(1800)
  }
  async function openReport(page) {
    await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^训练记录$/u }).click()
    await page.locator('.module-card').filter({ hasText: '情绪调节' }).click()
    await page.locator('.student-filter').click()
    await page.locator('.el-select-dropdown__item:visible').filter({ hasText: /^演示生甲$/u }).click()
    const row = page.locator('.records-table .el-table__row').first()
    await row.waitFor()
    await row.hover()
    await sleep(2200)
    await row.getByRole('button', { name: '查看详情', exact: true }).click()
    await page.locator('.summary-wrap').waitFor()
    await page.getByRole('button', { name: '查看我的进步报告', exact: true }).scrollIntoViewIfNeeded()
    await sleep(1700)
    await page.getByRole('button', { name: '查看我的进步报告', exact: true }).click()
    await page.getByRole('heading', { name: '模块报告', exact: true }).waitFor()
    await page.locator('.summary-value--text').filter({ hasText: '演示生甲' }).waitFor()
    await sleep(2000)
  }
  async function download(page, app, extension) {
    fs.mkdirSync(path.join(output, 'exports'), { recursive: true })
    const directory = fs.mkdtempSync(path.join(output, 'exports', 'capture-'))
    await app.evaluate(({ BrowserWindow }, directory) => {
      globalThis.__scgpEmotionalReportDownload = { state: 'waiting' }
      BrowserWindow.getAllWindows()[0].webContents.session.once('will-download', (_event, item) => {
        const file = `${directory}/${item.getFilename().replace(/[<>:"/\\|?*]/gu, '_')}`
        item.setSavePath(file)
        globalThis.__scgpEmotionalReportDownload = { state: 'progressing', file }
        item.once('done', (_event, state) => { globalThis.__scgpEmotionalReportDownload.state = state })
      })
    }, directory)
    await page.getByRole('heading', { name: '模块报告', exact: true }).scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: '导出报告', exact: true }).hover()
    await sleep(1500)
    await page.getByRole('button', { name: '导出报告', exact: true }).click()
    let result
    for (let i = 0; i < 100; i++) {
      result = await app.evaluate(() => globalThis.__scgpEmotionalReportDownload)
      if (['completed', 'cancelled', 'interrupted'].includes(result.state)) break
      await sleep(250)
    }
    if (result?.state !== 'completed' || !result.file.endsWith(extension) || !fs.existsSync(result.file)) throw new Error('情绪模块报告实际下载失败')
    console.log(`实际下载：${path.basename(result.file)}，${fs.statSync(result.file).size} 字节`)
    return result.file
  }
  const chart = (page, title) => page.locator('.chart-card').filter({ has: page.getByText(title, { exact: true }) })
  return [
    { id: '01-title', narration: '星愿能力发展平台。软件操作教程第十九讲：情绪模块报告与导出。本节从已有训练记录进入报告，核对学生和统计，导出文件后打开检查。示例使用虚构的演示数据。', caption: '软件操作教程 19\n情绪模块报告与导出', async act(page) {
      baseline = await counts(page)
      report = await readReport(page, studentId)
      sourceSessions = await page.evaluate((id) => window.db.all('SELECT s.id, s.training_record_id, s.sub_module, s.question_count, s.correct_count, s.accuracy_rate, s.duration_ms, s.created_at, (SELECT count(*) FROM emotional_training_detail d WHERE d.session_id = s.id) AS detail_count FROM emotional_training_session s WHERE s.student_id = ? ORDER BY s.id', [id]), studentId)
      const accuracy = Math.round(sourceSessions.reduce((sum, r) => sum + r.accuracy_rate, 0) / sourceSessions.length * 1000) / 10
      if (!sourceSessions.length || report.totalSessions !== sourceSessions.length || report.averageAccuracy !== accuracy || !report.trend.length || !report.carePreference.length
        || report.coverage.emotionChoiceSamples !== 1 || report.coverage.emotionChoiceMissing !== 1
        || report.coverage.classifiedCareSessions !== 1 || report.coverage.unclassifiedCareSessions !== 3
        || report.emotionPerformance.some((point) => point.emotion === '害怕') || report.carePreference.some((point) => point.name === '未分类')) throw new Error('情绪报告有效样本、缺失覆盖或汇总统计核验失败')
      await showCard(page, '软件操作教程 19', '选择学生 · 阅读统计 · 导出与核对')
      await sleep(5000)
      await hideCard(page)
    } },
    { id: '02-settings', narration: '管理员先进入系统管理、系统设置，找到报告设置。本例选择 Word，填写演示页眉，并保留学生头像。报告会按这里的默认格式导出，普通使用者可请管理员配置。', caption: '系统管理 → 系统设置 → 报告设置\n先选 Word，核对页眉与头像设置', async act(page) { await setFormat(page, 'Word') } },
    { id: '03-entry', narration: '从训练记录进入情绪调节，筛选演示生甲。打开一条已存记录的会话摘要，再点击查看我的进步报告。这里进入的是该学生的汇总报告，并非只分析刚才打开的一次训练。', caption: '训练记录 → 情绪调节 → 筛选学生 → 查看详情\n会话摘要 → 查看我的进步报告', async act(page) { await openReport(page) } },
    { id: '04-overview', narration: '先确认右上角所选学生，再看训练总次数、会话平均正确率和有逐题明细的平均提示层级。这里汇总情绪与场景、表达关心的会话，不包含热气球小游戏。覆盖说明会列出哪些记录能用于逐题统计，缺明细的历史会话不会被当作零提示。', caption: '会话平均正确率与有明细的平均提示层级\n先读统计覆盖范围，缺失不等于零提示', async act(page) {
      await page.locator('.header-right .el-select').click()
      await page.locator('.el-select-dropdown__item:visible').filter({ hasText: /^演示生甲$/u }).click()
      await page.locator('.summary-row').hover()
      await sleep(4000)
      const text = await page.locator('.summary-row').innerText()
      if (!text.includes(String(report.totalSessions)) || !text.includes(`${report.averageAccuracy}%`)) throw new Error('报告总览显示与源数据不一致')
      if (!(await page.getByText('统计覆盖范围').locator('..').innerText()).includes('逐题情绪识别 1/2 次可核验')) throw new Error('页面没有显示逐题统计覆盖范围')
    } },
    { id: '05-charts', narration: '查看趋势、情绪类型表现和关心表达类型记录。趋势沿用已存的场景会话汇总；情绪柱图只统计有逐题答案的识别步骤。本例旧害怕会话缺明细，所以不显示虚构的零正确率。关心表达只统计可分类会话，未分类记录保留在覆盖说明里。', caption: '会话趋势与逐题识别是不同口径\n缺明细不计零正确率；未分类不计入类型分布', async act(page) {
      await chart(page, '情绪识别正确率趋势').scrollIntoViewIfNeeded()
      await sleep(3500)
      await chart(page, '不同情绪类型识别表现').hover()
      await sleep(2200)
      await chart(page, '关心表达类型记录分布').scrollIntoViewIfNeeded()
      await sleep(4000)
    } },
    { id: '06-context', narration: '继续查看主题、场域和统计解读。本例保留四次旧演示会话，另有两次真实操作。主题与场域仍使用已存会话汇总；逐题识别只有一次可核验，关心表达只有一次可分类，因此不生成学生偏好或能力结论。重新载入后，再确认同一学生的报告。', caption: '旧会话保留，图表各有统计口径与覆盖数\n样本不足时不生成偏好结论；重载后回查', async act(page) {
      await chart(page, '各场域场景掌握情况分布').scrollIntoViewIfNeeded()
      await sleep(3300)
      await page.locator('.suggestion-card').scrollIntoViewIfNeeded()
      await sleep(3300)
      await page.getByRole('heading', { name: '模块报告', exact: true }).scrollIntoViewIfNeeded()
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('.summary-value--text').filter({ hasText: '演示生甲' }).waitFor()
      const current = await readReport(page, studentId)
      if (JSON.stringify(current) !== JSON.stringify(report)) throw new Error('重载后报告统计不一致')
      reloaded = true
      await sleep(2500)
    } },
    { id: '07-word', narration: '回到顶部，点击导出报告。当前生成 Word 文件，后缀为 docx。文件包含总览、统计覆盖、各项数据和核对说明，页面图表以表格呈现。留意实际保存位置，打开后核对学生、数字与缺失范围。', caption: '导出报告 → Word（.docx）\n核对学生、数据、统计覆盖与缺失说明', async act(page, app) { wordFile = await download(page, app, '.docx'); await sleep(4000) } },
    { id: '08-html', narration: '如需用浏览器查看，可把默认格式改为 HTML，再返回同一学生的模块报告并导出。同一个导出按钮会按设置生成相应文件，不需要另找一个 HTML 导出入口。', caption: '报告设置改为 HTML → 回到同一学生报告\n导出 HTML（.html）文件', async act(page, app) {
      await setFormat(page, 'HTML')
      await openReport(page)
      htmlFile = await download(page, app, '.html')
      await verifyEmotionalReport(page, studentId, output)
      await sleep(2000)
    } },
    { id: '09-preview', narration: '现在打开实际导出的 HTML 文件。先核对页眉、学生、统计覆盖和导出日期，再向下检查表格与核对说明。正式使用时，也请打开 Word 文件核对内容和分页。完成文件检查后再交付，避免把不同学生或旧版本报告混在一起。', caption: '打开实际 HTML，核对学生、统计覆盖与表格\nWord 使用兼容软件另行核对分页', async act(page) {
      await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' })
      await page.getByRole('heading', { name: '情绪行为模块报告', exact: true }).waitFor()
      if (!(await page.locator('body').innerText()).includes('演示生甲')) throw new Error('实际 HTML 预览学生不一致')
      await sleep(3500)
      await page.getByRole('heading', { name: '不同情绪类型识别表现', exact: true }).scrollIntoViewIfNeeded()
      await sleep(3500)
      await page.getByRole('heading', { name: '各场域场景掌握情况分布', exact: true }).scrollIntoViewIfNeeded()
      await sleep(3500)
      await page.evaluate(() => window.scrollTo(0, 0))
      await sleep(2000)
    } },
    { id: '10-end', narration: '本节完成。先核对学生与统计覆盖，再阅读图表和核对说明，选择格式导出，最后打开文件检查。情绪模块的训练、记录回查和汇总导出，到这里完成一条完整的软件操作流程。', caption: '本节完成\n核对学生与覆盖 · 阅读统计 · 导出后打开检查', async act(page) {
      await showCard(page, '本节完成', '核对学生与范围 · 阅读统计 · 导出后检查')
      await sleep(4500)
    } },
  ]
}
