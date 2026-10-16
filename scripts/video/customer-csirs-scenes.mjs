/** 教程 21：CSIRS 真实作答、报告、Word 导出及持久回查。 */
import fs from 'node:fs'
import path from 'node:path'
import JSZip from 'jszip'
let before, questions, context, assessId, wordFile
let reloaded = false
const answers = new Map()
const labels = { 5: '从不这样', 4: '很少这样', 3: '有时候', 2: '经常这样', 1: '总是这样' }

export async function verifyCsirs(page, studentId, output) {
  const saved = await page.evaluate(({ studentId, assessId }) => ({
    assessment: window.db.get('SELECT * FROM csirs_assess WHERE id = ?', [assessId]),
    details: window.db.all('SELECT question_id, dimension, score FROM csirs_assess_detail WHERE assess_id = ? ORDER BY question_id', [assessId]),
    count: window.db.get('SELECT count(*) AS n FROM csirs_assess WHERE student_id = ?', [studentId]).n,
    reports: window.db.all("SELECT id, assess_id, student_id FROM report_record WHERE report_type = 'csirs' AND assess_id = ?", [assessId]),
  }), { studentId, assessId })
  const expectedRaw = {}
  for (const q of questions) expectedRaw[q.metadata.dimension_en] = (expectedRaw[q.metadata.dimension_en] || 0) + answers.get(q.id)
  const raw = JSON.parse(saved.assessment?.raw_scores || '{}')
  if (!reloaded || !wordFile || saved.assessment?.student_id !== studentId || saved.assessment.age_months !== context.ageInMonths
    || saved.count !== before + 1 || saved.details.length !== questions.length || saved.reports.length !== 1 || saved.reports[0].student_id !== studentId
    || saved.details.some((d, i) => d.question_id !== questions[i].id || d.score !== answers.get(d.question_id) || d.dimension !== questions[i].dimension)
    || Object.keys(expectedRaw).some((key) => raw[key] !== expectedRaw[key])) throw new Error('CSIRS 主记录、逐题结果、分维度原始分或报告关联核验失败')
  const zip = await JSZip.loadAsync(fs.readFileSync(wordFile))
  const xml = await zip.file('word/document.xml')?.async('string')
  const text = xml?.replace(/<[^>]+>/gu, '') || ''
  if (!text.includes('演示生甲') || !text.includes('CSIRS') || !text.includes(String(saved.assessment.total_t_score)) || !text.includes('前庭')) throw new Error('实际 Word 缺少学生、报告类型或评估结果')
  const evidence = { studentId, assessId, ageMonths: context.ageInMonths, questionCount: questions.length,
    assessment: saved.assessment, details: saved.details, expectedRaw, reportIds: saved.reports.map((r) => r.id),
    countBefore: before, countAfter: saved.count, word: { file: path.relative(output, wordFile).replaceAll('\\', '/'), bytes: fs.statSync(wordFile).size }, reloaded, verified: true }
  fs.writeFileSync(path.join(output, 'csirs-assessment-verification.json'), JSON.stringify(evidence, null, 2), 'utf8')
}

export function buildCsirsScenes({ showCard, hideCard, sleep, studentId, output }) {
  async function answer(page, score, modify = false) {
    const old = (await page.locator('.question-number').innerText()).trim()
    const number = Number(old.match(/\d+/u)?.[0])
    const q = questions[number - 1]
    if (!q) throw new Error(`未能对应当前题目：${old}`)
    const option = page.locator('.answer-options .el-radio, .answer-options .el-radio-button').filter({ has: page.getByText(labels[score], { exact: true }) }).first()
    await option.scrollIntoViewIfNeeded(); await option.click(); answers.set(q.id, score)
    if (modify) { await sleep(700); return }
    await page.waitForFunction((previous) => {
      const current = document.querySelector('.question-number')?.textContent?.trim()
      return Boolean(current && current !== previous) || Array.from(document.querySelectorAll('button')).some((b) => b.textContent?.trim() === '查看报告')
    }, old, { timeout: 30000 })
    await sleep(120)
  }
  async function openFromStudent(page) {
    await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^学生管理$/u }).click()
    await page.locator('input[placeholder*="搜索学生姓名"]').fill('演示生甲')
    await page.locator('.student-card').filter({ hasText: '演示生甲' }).getByRole('link', { name: '查看详情', exact: true }).click()
    const row = page.locator('.records-table .el-table__row').filter({ hasText: 'CSIRS' }).first()
    await row.scrollIntoViewIfNeeded(); await row.hover(); await sleep(2000)
    await row.getByRole('button', { name: '查看报告', exact: true }).click()
    await page.locator('.csirs-report h2').waitFor()
    if (Number(page.url().split('?')[0].split('/').at(-1)) !== assessId) throw new Error('学生档案打开的不是本次 CSIRS 报告')
  }
  return [
    { id: '01-title', narration: '星愿能力发展平台。软件操作教程第二十一讲：CSIRS 感觉统合评估与报告。本节演示选择学生、按频度作答、修改答案、查看报告、导出和回查。学生与评分均为虚构流程样例。', caption: '软件操作教程 21\nCSIRS 感觉统合评估与报告', async act(page) {
      answers.clear()
      const data = await page.evaluate(async (id) => {
        const { CSIRSDriver } = await import('/src/strategies/assessment/CSIRSDriver.ts')
        const { calculateAgeInMonths } = await import('/src/types/assessment.ts')
        const student = window.db.get('SELECT * FROM student WHERE id = ?', [id])
        const context = { ...student, ageInMonths: calculateAgeInMonths(student.birthday) }
        return { context, questions: new CSIRSDriver().getQuestions(context), before: window.db.get('SELECT count(*) AS n FROM csirs_assess WHERE student_id = ?', [id]).n }
      }, studentId)
      context = data.context; questions = data.questions; before = data.before
      if (context.ageInMonths < 72 || context.ageInMonths >= 120) throw new Error('本讲仅验证 6–9 岁学龄段，请使用现有演示学生 10014；其他年龄段需独立验证')
      await showCard(page, '软件操作教程 21', '按频度作答 · 查看报告 · 导出与回查'); await sleep(5000); await hideCard(page)
    } },
    { id: '02-format', narration: '本例先由管理员在系统管理、系统设置中，将默认报告格式设为 Word。后面的导出按钮会按此设置生成文件。普通使用者可以请管理员按机构要求配置。', caption: '系统管理 → 系统设置 → 报告设置\n本例将默认报告格式设为 Word', async act(page) {
      await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^系统管理$/u }).click()
      await page.getByRole('tab', { name: '系统设置', exact: true }).click()
      const settings = page.locator('.system-settings-section').filter({ has: page.getByRole('heading', { name: '报告设置', exact: true }) })
      await settings.scrollIntoViewIfNeeded(); await settings.getByText('Word', { exact: true }).click(); await sleep(3000)
    } },
    { id: '03-scale', narration: '进入能力评估，在感官统合分类中找到 CSIRS，点击开始评估。可见的量表取决于账号与授权。本节介绍当前软件版本的操作，实际施测按机构采用的量表版本和规范执行。', caption: '能力评估 → 感官统合 → CSIRS → 开始评估\n本节演示当前软件版本的操作', async act(page) {
      await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^能力评估$/u }).click()
      await page.locator('.assessment-category-chip').filter({ hasText: '感官统合' }).click()
      const card = page.locator('.assessment-card').filter({ hasText: 'CSIRS' }); await card.scrollIntoViewIfNeeded(); await card.hover(); await sleep(2500)
      await card.getByRole('button', { name: '开始评估', exact: true }).click(); await page.getByPlaceholder('搜索学生姓名或学号').waitFor()
    } },
    { id: '04-student', narration: '本例使用现有演示库中的学龄学生。搜索演示生甲，核对姓名和出生日期后选择。阅读评估说明，再开始作答。当前适用题数以实际进度栏显示为准。其他年龄段的题目配置需要分别核对。', caption: '本例选择学龄学生 → 核对出生日期 → 阅读说明 → 开始\n本讲只验证学龄段，适用题数以实际进度栏为准', async act(page) {
      await page.getByPlaceholder('搜索学生姓名或学号').fill('演示生甲')
      const row = page.locator('.el-table__row').filter({ hasText: '演示生甲' }); await row.hover(); await sleep(2500)
      await row.getByRole('button', { name: '选择', exact: true }).click()
      await page.getByRole('button', { name: '我已了解，开始评估', exact: true }).waitFor(); await sleep(3500)
      await page.getByRole('button', { name: '我已了解，开始评估', exact: true }).click()
      await page.locator('.question-number').waitFor(); await sleep(2000)
    } },
    { id: '05-answer', narration: '先读题目，再按行为出现频度选择。这里从从不这样到总是这样，共五档，不是完成能力的等级。首次选择后自动进入下一题；需要修改时返回上一题，重新选择，再点击下一题继续。', caption: '按行为频度选择，五档含义以页面文字为准\n首次选择自动下一题；返回修改后点击下一题', async act(page) {
      await page.locator('.answer-options').hover(); await sleep(2800); await answer(page, 4)
      await page.getByRole('button', { name: '上一题', exact: true }).click(); await page.locator('.question-number').filter({ hasText: '第 1 题' }).waitFor()
      await sleep(1500); await answer(page, 3, true); await sleep(1500)
      await page.getByRole('button', { name: '下一题', exact: true }).click(); await sleep(600)
    } },
    { id: '06-remaining', narration: '下面压缩展示剩余作答。所有选择仅用于操作演示，实际评估应逐项依据观察填写，不能照抄示例分数，也不要按视频速度作答。最后一题完成后，等待系统生成结果。', caption: '压缩展示剩余作答，分数均为流程样例\n实际评估逐项观察填写，等待结果生成', async act(page) {
      const compact = await page.addStyleTag({ content: '.assessment-container { zoom: 0.72; }' })
      await page.locator('.assessment-header').scrollIntoViewIfNeeded()
      for (let i = 1; i < questions.length; i++) await answer(page, [4, 5, 3, 4, 2, 4, 5][i % 7])
      await page.getByRole('button', { name: '查看报告', exact: true }).waitFor({ timeout: 30000 }); await compact.evaluate((el) => el.remove())
      assessId = await page.evaluate((id) => window.db.get('SELECT max(id) AS id FROM csirs_assess WHERE student_id = ?', [id]).id, studentId)
      await sleep(3000)
    } },
    { id: '07-report', narration: '确认评估完成后，打开报告。先核对学生和评估日期，再查看总览、雷达图与各维度原始分、T 分。这里的结果来自演示填写，仅说明软件怎样呈现，不是对学生的实际评价。', caption: '查看报告 → 核对学生与日期 → 总览及分维度结果\n示例结果仅用于讲解软件输出', async act(page) {
      await page.getByRole('button', { name: '查看报告', exact: true }).click(); await page.locator('.csirs-report h2').waitFor()
      await page.locator('.student-info-card').hover(); await sleep(2500)
      await page.locator('.radar-card').scrollIntoViewIfNeeded(); await sleep(3000)
      await page.locator('.dimensions-card').scrollIntoViewIfNeeded(); await sleep(3000)
      await page.locator('.csirs-report h2').scrollIntoViewIfNeeded(); await sleep(1500)
    } },
    { id: '08-export', narration: '核对报告后点击导出报告。本次生成 Word 文件，后缀为 docx。留意保存位置，使用 Word 或兼容软件打开，再检查学生、日期和内容。实际使用时，报告建议也需要由工作人员结合观察核对。', caption: '导出报告 → Word（.docx）\n留意保存位置，打开后核对学生、日期与内容', async act(page, app) {
      fs.mkdirSync(path.join(output, 'exports'), { recursive: true }); const directory = fs.mkdtempSync(path.join(output, 'exports', 'capture-'))
      await app.evaluate(({ BrowserWindow }, directory) => {
        globalThis.__scgpCsirsDownload = { state: 'waiting' }
        BrowserWindow.getAllWindows()[0].webContents.session.once('will-download', (_event, item) => {
          const file = `${directory}/${item.getFilename().replace(/[<>:"/\\|?*]/gu, '_')}`; item.setSavePath(file)
          globalThis.__scgpCsirsDownload = { state: 'progressing', file }; item.once('done', (_event, state) => { globalThis.__scgpCsirsDownload.state = state })
        })
      }, directory)
      await page.getByRole('button', { name: '导出报告', exact: true }).hover(); await sleep(1500)
      await page.getByRole('button', { name: '导出报告', exact: true }).click()
      let result
      for (let i = 0; i < 100; i++) { result = await app.evaluate(() => globalThis.__scgpCsirsDownload); if (['completed', 'cancelled', 'interrupted'].includes(result.state)) break; await sleep(250) }
      if (result.state !== 'completed' || !result.file.endsWith('.docx') || !fs.existsSync(result.file)) throw new Error('CSIRS 实际 Word 下载失败')
      wordFile = result.file; await sleep(3000)
    } },
    { id: '09-recall', narration: '从学生管理打开演示生甲，在评估记录中找到本次 CSIRS 报告。核对量表和日期，再点击查看报告。重新载入后再次确认结果，完成评估、保存、导出与回查的操作闭环。', caption: '学生详情 → 评估记录 → CSIRS → 查看报告\n核对量表与日期，重载后再次回查', async act(page) {
      await openFromStudent(page); await sleep(2500); await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('.csirs-report h2').waitFor(); await page.locator('.result-card').waitFor(); reloaded = true
      await verifyCsirs(page, studentId, output); await sleep(3000)
    } },
    { id: '10-end', narration: '本节完成。核对评估对象，按频度作答，查看和导出报告，再回到学生档案查验。下一讲继续介绍 S-M 社会生活能力量表的软件操作。', caption: '本节完成\n按频度作答 · 报告导出 · 档案回查', async act(page) {
      await showCard(page, '本节完成', 'CSIRS 评估 · 导出与回查'); await sleep(4500)
    } },
  ]
}
