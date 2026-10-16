/** 教程 22：S-M 真实作答、报告、Word 导出及持久回查。 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import JSZip from 'jszip'
let before, questions, context, assessId, wordFile
let htmlFile
let reloaded = false
const answers = new Map()
const labels = { 1: '通过', 0: '不通过' }
let firstQuestionId

export async function verifySm(page, studentId, output, app) {
  const saved = await page.evaluate(({ studentId, assessId }) => ({
    assessment: window.db.get('SELECT * FROM sm_assess WHERE id = ?', [assessId]),
    details: window.db.all('SELECT question_id, score FROM sm_assess_detail WHERE assess_id = ? ORDER BY question_id', [assessId]),
    count: window.db.get('SELECT count(*) AS n FROM sm_assess WHERE student_id = ?', [studentId]).n,
    reports: window.db.all("SELECT id, assess_id, student_id FROM report_record WHERE report_type = 'sm' AND assess_id = ?", [assessId]),
  }), { studentId, assessId })
  const startIndex = questions.findIndex(q => q.id === firstQuestionId)
  const expectedRaw = startIndex + 10
  if (!reloaded || !wordFile || saved.assessment?.student_id !== studentId
    || saved.count !== before + 1 || saved.details.length !== 20 || answers.size !== 20
    || saved.reports.length !== 1 || saved.reports[0].student_id !== studentId
    || saved.details.some((d, i) => d.question_id !== questions[startIndex + i].id || d.score !== (i < 10 ? 1 : 0) || d.score !== answers.get(d.question_id))
    || saved.assessment.raw_score !== expectedRaw) throw new Error('S-M 保存、逐题结果、顺向基线粗分或报告关联核验失败')
  const displayed = await page.locator('.result-card .score-value').allTextContents()
  if (Number(displayed[0]) !== expectedRaw || Number(displayed[1]) !== saved.assessment.sq_score) throw new Error('S-M 页面结果与保存值不一致')
  const zip = await JSZip.loadAsync(fs.readFileSync(wordFile))
  const xml = await zip.file('word/document.xml')?.async('string')
  const text = xml?.replace(/<[^>]+>/gu, '') || ''
  if (!text.includes('演示生甲') || !text.includes('社会生活能力量表') || !text.includes(String(expectedRaw)) || !text.includes(String(saved.assessment.sq_score)) || !text.includes('粗分') || !text.includes('标准分')) throw new Error('实际 Word 缺少学生、报告类型或评估结果')
  if (!text.includes('评定等级正常') || text.includes('学习职业规划技能') || text.includes('normal')) throw new Error('S-M Word 等级或适龄说明仍不一致')
  const pageAdvice = await page.locator('.suggestions-card').innerText()
  if (!pageAdvice.includes('结果使用说明') || pageAdvice.includes('学习职业规划技能')) throw new Error('S-M 页面仍显示不适龄建议')
  if (process.env.SCGP_VIDEO_VERIFY_HTML === '1' && !htmlFile) {
    if (!app) throw new Error('S-M HTML 实际导出核验需要 Electron 应用实例')
    const reportUrl = page.url()
    await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^系统管理$/u }).click()
    await page.getByRole('tab', { name: '系统设置', exact: true }).click()
    const settings = page.locator('.system-settings-section').filter({ has: page.getByRole('heading', { name: '报告设置', exact: true }) })
    await settings.scrollIntoViewIfNeeded()
    await settings.getByText('HTML', { exact: true }).click()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => Boolean(window.db))
    const format = await page.evaluate(() => window.db.get('SELECT value FROM system_config WHERE key = ?', ['default_report_format'])?.value)
    if (format !== 'html') throw new Error('S-M HTML 设置未持久保存')
    await page.goto(reportUrl, { waitUntil: 'domcontentloaded' })
    await page.locator('.sm-report h2').waitFor()
    const directory = fs.mkdtempSync(path.join(output, 'exports', 'capture-html-'))
    await app.evaluate(({ BrowserWindow }, directory) => {
      globalThis.__scgpSmHtmlDownload = { state: 'waiting' }
      BrowserWindow.getAllWindows()[0].webContents.session.once('will-download', (_event, item) => {
        const file = `${directory}/${item.getFilename().replace(/[<>:"/\\|?*]/gu, '_')}`
        item.setSavePath(file)
        globalThis.__scgpSmHtmlDownload = { state: 'progressing', file }
        item.once('done', (_event, state) => { globalThis.__scgpSmHtmlDownload.state = state })
      })
    }, directory)
    await page.getByRole('button', { name: '导出报告', exact: true }).click()
    let result
    for (let i = 0; i < 100; i++) {
      result = await app.evaluate(() => globalThis.__scgpSmHtmlDownload)
      if (['completed', 'cancelled', 'interrupted'].includes(result.state)) break
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    if (result?.state !== 'completed' || !result.file.endsWith('.html') || !fs.existsSync(result.file)) throw new Error('S-M HTML 实际下载失败')
    htmlFile = result.file
    await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' })
    const htmlText = await page.locator('body').innerText()
    if (!htmlText.includes('演示生甲') || !htmlText.includes('评定等级') || !htmlText.includes('正常')
      || htmlText.includes('学习职业规划技能') || htmlText.includes('normal')) throw new Error('S-M HTML 等级或适龄说明仍不一致')
    await page.goto(reportUrl, { waitUntil: 'domcontentloaded' })
    await page.locator('.sm-report h2').waitFor()
  }
  const evidence = { studentId, assessId, ageMonths: context.ageInMonths, questionCount: questions.length, firstQuestionId, answeredCount: answers.size,
    assessment: saved.assessment, details: saved.details, expectedRaw, reportIds: saved.reports.map((r) => r.id),
    countBefore: before, countAfter: saved.count, word: { file: path.relative(output, wordFile).replaceAll('\\', '/'), bytes: fs.statSync(wordFile).size },
    html: htmlFile ? { file: path.relative(output, htmlFile).replaceAll('\\', '/'), bytes: fs.statSync(htmlFile).size } : null,
    reloaded, verified: true }
  fs.writeFileSync(path.join(output, 'sm-assessment-verification.json'), JSON.stringify(evidence, null, 2), 'utf8')
}

export function buildSmScenes({ showCard, hideCard, sleep, studentId, output }) {
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
    const row = page.locator('.records-table .el-table__row').filter({ hasText: 'S-M' }).first()
    await row.scrollIntoViewIfNeeded(); await row.hover(); await sleep(2000)
    await row.getByRole('button', { name: '查看报告', exact: true }).click()
    await page.locator('.sm-report h2').waitFor()
    if (Number(new URLSearchParams(page.url().split('?')[1]).get('assessId')) !== assessId) throw new Error('学生档案打开的不是本次 S-M 报告')
  }
  return [
    { id: '01-title', narration: '星愿能力发展平台。软件操作教程第二十二讲：S-M 社会生活能力评估与报告。本节演示选择学生、年龄起点、自动结束、查看报告、导出和回查。学生与评分均为虚构流程样例。', caption: '软件操作教程 22\nS-M 社会生活能力评估与报告', async act(page) {
      answers.clear()
      const data = await page.evaluate(async (id) => {
        const { SMDriver } = await import('/src/strategies/assessment/SMDriver.ts')
        const { calculateAgeInMonths } = await import('/src/types/assessment.ts')
        const student = window.db.get('SELECT * FROM student WHERE id = ?', [id])
        const context = { ...student, ageInMonths: calculateAgeInMonths(student.birthday) }
        return { context, questions: new SMDriver().getQuestions(context), before: window.db.get('SELECT count(*) AS n FROM sm_assess WHERE student_id = ?', [id]).n }
      }, studentId)
      context = data.context; questions = data.questions; before = data.before
      await showCard(page, '软件操作教程 22', '年龄起点 · 自动结束 · 导出与回查'); await sleep(5000); await hideCard(page)
    } },
    { id: '02-format', narration: '本例先由管理员在系统管理、系统设置中，将默认报告格式设为 Word。后面的导出按钮会按此设置生成文件。普通使用者可以请管理员按机构要求配置。', caption: '系统管理 → 系统设置 → 报告设置\n本例将默认报告格式设为 Word', async act(page) {
      await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^系统管理$/u }).click()
      await page.getByRole('tab', { name: '系统设置', exact: true }).click()
      const settings = page.locator('.system-settings-section').filter({ has: page.getByRole('heading', { name: '报告设置', exact: true }) })
      await settings.scrollIntoViewIfNeeded(); await settings.getByText('Word', { exact: true }).click(); await sleep(3000)
    } },
    { id: '03-scale', narration: '进入能力评估，在生活自理分类中找到 S-M，点击开始评估。可见的量表取决于账号与授权。本节介绍当前软件版本的操作，实际施测按机构采用的量表版本和规范执行。', caption: '能力评估 → 生活自理 → S-M → 开始评估\n本节演示当前软件版本的操作', async act(page) {
      await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^能力评估$/u }).click()
      await page.locator('.assessment-category-chip').filter({ hasText: '生活自理' }).click()
      const card = page.locator('.assessment-card').filter({ hasText: 'S-M' }); await card.scrollIntoViewIfNeeded(); await card.hover(); await sleep(2500)
      await card.getByRole('button', { name: '开始评估', exact: true }).click(); await page.getByPlaceholder('搜索学生姓名或学号').waitFor()
    } },
    { id: '04-student', narration: '搜索演示生甲，核对姓名和出生日期后选择。出生日期会影响年龄起点，应先确认准确。阅读说明后开始，本讲只展示当前软件的顺向操作路径。', caption: '选择学生 → 核对出生日期 → 阅读说明 → 开始\n本讲展示顺向路径，年龄会影响起始题', async act(page) {
      await page.getByPlaceholder('搜索学生姓名或学号').fill('演示生甲')
      const row = page.locator('.el-table__row').filter({ hasText: '演示生甲' }); await row.hover(); await sleep(2500)
      await row.getByRole('button', { name: '选择', exact: true }).click()
      await page.getByRole('button', { name: '我已了解，开始评估', exact: true }).waitFor(); await sleep(3500)
      await page.getByRole('button', { name: '我已了解，开始评估', exact: true }).click()
      await page.locator('.question-number').waitFor(); await sleep(2000)
    } },
    { id: '05-answer', narration: '开始后先看实际题号。系统根据年龄选择起点，所以不一定从第一题开始。每题有通过和不通过两项，首次选择后自动进入下一题。本例先演示通过。题目与评分只用于操作示范。', caption: '根据年龄确定起始题，不一定从第 1 题开始\n每题选择“通过”或“不通过”，首次选择后自动推进', async act(page) {
      firstQuestionId = questions[Number((await page.locator('.question-number').innerText()).match(/\d+/u)[0]) - 1].id
      await page.locator('.answer-options').hover(); await sleep(2500)
      await answer(page, 1); await sleep(1800); await answer(page, 1); await sleep(1800)
    } },
    { id: '06-remaining', narration: '下面压缩展示后续作答。本例先在起始区间连续十项通过，建立基线，再继续向后作答。随后连续十项不通过，系统自动结束。请等待完成页，不用为了进度条达到百分之百，继续填写全部一百三十二题。实际评估不能照抄示例或按视频速度作答。', caption: '压缩演示：连续 10 项通过建立基线 → 连续 10 项不通过自动结束\n等待完成页；示例分数与速度不能用于实际评估', async act(page) {
      const compact = await page.addStyleTag({ content: '.assessment-container { zoom: 0.78; }' })
      await page.locator('.assessment-header').scrollIntoViewIfNeeded()
      for (let i = 0; i < 8; i++) await answer(page, 1)
      for (let i = 0; i < 10; i++) await answer(page, 0)
      await page.getByRole('button', { name: '查看报告', exact: true }).waitFor({ timeout: 30000 }); await compact.evaluate((el) => el.remove())
      assessId = await page.evaluate((id) => window.db.get('SELECT max(id) AS id FROM sm_assess WHERE student_id = ?', [id]).id, studentId)
      await sleep(3000)
    } },
    { id: '07-report', narration: '确认评估完成后，打开报告。先核对学生和评估日期，再查看粗分、标准分、雷达图及各维度结果。分维度通过率按实际作答项目统计，不等于该能力的完整掌握率。报告末尾只给结果使用和观察核对说明，具体支持目标需结合年龄与逐题表现确定。', caption: '查看粗分、标准分、维度与结果使用说明\n通过率按已作答项目统计，示例结果不代表实际能力', async act(page) {
      await page.getByRole('button', { name: '查看报告', exact: true }).click(); await page.locator('.sm-report h2').waitFor()
      await page.locator('.student-info-card').hover(); await sleep(2500)
      await page.locator('.radar-card').scrollIntoViewIfNeeded(); await sleep(3000)
      await page.locator('.dimensions-card').scrollIntoViewIfNeeded(); await sleep(3000)
      await page.locator('.suggestions-card').scrollIntoViewIfNeeded(); await sleep(3000)
      await page.locator('.sm-report h2').scrollIntoViewIfNeeded(); await sleep(1500)
    } },
    { id: '08-export', narration: '核对报告后点击导出报告。本次生成 Word 文件，后缀为 docx。留意保存位置，使用 Word 或兼容软件打开，再检查学生、日期、中文等级与结果使用说明。本例的建议仅提示怎样核对，具体支持目标需结合年龄、逐题作答和日常观察确定。', caption: '导出报告 → Word（.docx）\n核对学生、日期、中文等级与结果使用说明', async act(page, app) {
      fs.mkdirSync(path.join(output, 'exports'), { recursive: true }); const directory = fs.mkdtempSync(path.join(output, 'exports', 'capture-'))
      await app.evaluate(({ BrowserWindow }, directory) => {
        globalThis.__scgpSmDownload = { state: 'waiting' }
        BrowserWindow.getAllWindows()[0].webContents.session.once('will-download', (_event, item) => {
          const file = `${directory}/${item.getFilename().replace(/[<>:"/\\|?*]/gu, '_')}`; item.setSavePath(file)
          globalThis.__scgpSmDownload = { state: 'progressing', file }; item.once('done', (_event, state) => { globalThis.__scgpSmDownload.state = state })
        })
      }, directory)
      await page.getByRole('button', { name: '导出报告', exact: true }).hover(); await sleep(1500)
      await page.getByRole('button', { name: '导出报告', exact: true }).click()
      let result
      for (let i = 0; i < 100; i++) { result = await app.evaluate(() => globalThis.__scgpSmDownload); if (['completed', 'cancelled', 'interrupted'].includes(result.state)) break; await sleep(250) }
      if (result.state !== 'completed' || !result.file.endsWith('.docx') || !fs.existsSync(result.file)) throw new Error('S-M 实际 Word 下载失败')
      wordFile = result.file; await sleep(3000)
    } },
    { id: '09-recall', narration: '从学生管理打开演示生甲，在评估记录中找到本次 S-M 报告。核对量表和日期，再点击查看报告。重新载入后再次确认结果，完成评估、保存、导出与回查的操作闭环。', caption: '学生详情 → 评估记录 → S-M → 查看报告\n核对量表与日期，重载后再次回查', async act(page, app) {
      await openFromStudent(page); await sleep(2500); await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('.sm-report h2').waitFor(); await page.locator('.result-card').waitFor(); reloaded = true
      await verifySm(page, studentId, output, app); await sleep(3000)
    } },
    { id: '10-end', narration: '本节完成。核对学生与生日，按题目选择通过或不通过，等待自动结束，再查看、导出并回查报告。下一讲介绍 Conners 家长问卷的软件操作。', caption: '本节完成\n年龄起点 · 自动结束 · 档案回查', async act(page) {
      await showCard(page, '本节完成', 'S-M 评估 · 导出与回查'); await sleep(4500)
    } },
  ]
}
