/** 教程 23/24：真实界面作答、实际报告下载与持久回查。只读核对业务数据库。 */
import fs from 'node:fs'
import path from 'node:path'
import JSZip from 'jszip'

const state = new Map()
const configs = {
  psq: {
    chapter: '23', code: 'conners-psq', table: 'conners_psq_assess', title: 'Conners 父母问卷与报告',
    card: 'Conners 父母用问卷', category: '情绪调节', record: 'Conners PSQ', root: '.conners-psq-report', count: 48,
    labels: ['A. 无', 'B. 稍有', 'C. 相当多', 'D. 很多'],
    intro: '第二十三讲：Conners 父母问卷与报告。演示选择问卷、四档作答、返回修改、报告查看、Word 导出和档案回查。学生资料和分数均为虚构流程样例。',
    entry: '进入能力评估，在情绪调节分类中找到 Conners 父母用问卷。本讲使用 PSQ。教师用问卷 TRS 是独立入口，不能将家长与教师的答案混填，或把两份分数合并。',
    entryCaption: '能力评估 → 情绪调节 → Conners 父母用问卷（PSQ）\n教师问卷 TRS 独立填写，不混填或合并得分',
    student: '搜索演示生甲，核对姓名、性别和出生日期后选择。这些资料会参与结果计算。开始前确认本次信息来自父母或主要照护者，再阅读说明并开始作答。',
    answer: '每题从无、稍有、相当多、很多四档中选择，以页面文字为准。首次选择后自动进入下一题。需要修改时，点击上一题，重新选择，再点击下一题继续。本例把首题从无改为稍有。',
    answerCaption: '无 / 稍有 / 相当多 / 很多，按页面含义选择\n首次选择自动推进；返回修改后点击下一题',
    note: '完成后打开报告，先核对学生和评估日期。问卷质量检查处明确写着 PI、NI 与问卷效度未评估。本版本没有计算这些指标，不能把未评估理解成问卷已通过效度检查。',
    noteCaption: 'PI / NI 与问卷效度：未评估\n不能将未评估理解为已通过效度检查',
    report: '查看总览、雷达图和各维度。总览的总分是多动指数 T 分，不是四十八题相加；维度原始分是对应题目的平均分。本例多动指数为五十二点一，按当前软件阈值属于正常范围，但品行和心身维度的 T 分分别为六十九点四、一百零二点九，仍需逐项核对。页面与导出现在使用同一套 T 分等级和解释口径，不能只看总览替其他维度下结论。',
    reportCaption: '总览＝多动指数 T 分；其他维度须分别查看\n页面与导出按同一 T 分口径解释',
    end: '本节完成。选择正确的问卷和学生，按四档作答，查看、导出并从档案回查报告。PI、NI 效度仍未评估，分数和建议需结合实际观察核对。下一讲介绍 ABC 行为评定与报告的软件操作。',
  },
  abc: {
    chapter: '24', code: 'abc', table: 'abc_assess', title: 'ABC 行为评定与报告',
    card: 'ABC量表', category: '社交沟通', record: 'ABC', root: '.abc-report', count: 57,
    labels: ['否', '是'],
    intro: '第二十四讲：ABC 行为评定与报告。演示选择学生、是与否作答、修改答案、查看加权结果、导出与回查。学生与评分均为虚构流程样例，本节只讲当前软件操作。',
    entry: '进入能力评估，在社交沟通分类中找到孤独症儿童行为评定量表，缩写 ABC，再点击开始评估。可见入口取决于账号和授权。请先确认机构采用的量表版本与实际软件配置。',
    entryCaption: '能力评估 → 社交沟通 → 孤独症儿童行为评定量表（ABC）\n确认机构采用的版本与软件配置',
    student: '搜索演示生甲，核对姓名和出生日期后选择。阅读说明，再开始作答。本节演示怎样操作，不提供真实施测结论，也不把筛查分数当作诊断。',
    answer: '先读当前题目的行为描述，再选择是或否。这里的是，表示该项描述符合，不是技能已经掌握。首次选择自动进入下一题。需要更正时返回上一题，重新选择，再点击下一题。本例把首题从否改为是。',
    answerCaption: '按行为描述选择“是 / 否”，“是”不表示能力掌握\n首次选择自动推进；返回修改后点击下一题',
    note: '完成后打开报告，先核对学生、日期和总分。ABC 在当前软件中按题目权重累加，不是把选择是的题数直接当分数。页面的等级文字是软件输出，不等于已经获得医学诊断。',
    noteCaption: '总分按题目权重累加，不等于“是”的题数\n软件等级与建议不能代替专业诊断',
    report: '下滑查看五个分因子：感觉、交往、躯体运动、语言，以及社会与生活自理。题目四十五“没人帮忙就不会自己穿衣服”和题目四十一的大小便训练，都计入社会与生活自理。五因子满分依次为二十六、三十八、三十八、三十一和二十五，总满分一百五十八。这里演示的是软件作答与报告流程，正式施测仍需核对机构采用的中文题本和解释依据。',
    reportCaption: '五因子：感觉 / 交往 / 躯体运动 / 语言 / 社会与生活自理\n穿衣与大小便训练归社会与生活自理；总满分 158',
    end: '本节完成。按描述选择是或否，核对加权总分与当前分因子，导出报告，再回到学生档案查验。量表专项的这组操作教程到这里完成，实际使用时仍需按机构规范核对版本、数据与建议。',
  },
}

async function verifyBehavior(page, studentId, output, kind) {
  const cfg = configs[kind], s = state.get(kind)
  const saved = await page.evaluate(({ table, code, studentId, assessId }) => ({
    assessment: window.db.get(`SELECT * FROM ${table} WHERE id = ?`, [assessId]),
    count: window.db.get(`SELECT count(*) AS n FROM ${table} WHERE student_id = ?`, [studentId]).n,
    reports: window.db.all('SELECT id, student_id FROM report_record WHERE report_type = ? AND assess_id = ?', [code, assessId]),
  }), { ...cfg, studentId, assessId: s.assessId })
  const expectedRaw = {}, expectedT = {}
  if (s.answers.size !== cfg.count || !s.reloaded || saved.count !== s.before + 1 || saved.assessment?.student_id !== studentId
    || saved.assessment.age_months !== s.context.ageInMonths || saved.reports.length !== 1 || saved.reports[0].student_id !== studentId) throw new Error(`${cfg.code} 作答数量、保存、报告关联或重载核验失败`)
  if (kind === 'psq') {
    const storedRaw = JSON.parse(saved.assessment.raw_scores), storedT = JSON.parse(saved.assessment.t_scores)
    for (const [dim, ids] of Object.entries(s.dimensionQuestions)) {
      expectedRaw[dim] = Math.round(ids.reduce((sum, id) => sum + s.answers.get(id), 0) / ids.length * 100) / 100
      const norm = s.norms[dim]
      expectedT[dim] = Math.round((50 + 10 * (expectedRaw[dim] - norm.mean) / norm.sd) * 10) / 10
      if (storedRaw[dim] !== expectedRaw[dim] || storedT[dim] !== expectedT[dim]) throw new Error(`PSQ ${dim} 平均分或 T 分与实际点击不一致`)
    }
    if (saved.assessment.hyperactivity_index !== expectedT.hyperactivity_index) throw new Error('PSQ 多动指数存储不一致')
    if (saved.assessment.pi_score !== null || saved.assessment.ni_score !== null || saved.assessment.is_valid !== null) throw new Error('PSQ 未计算效度仍被保存为有效')
    const displayed = Number(await page.locator('.result-card .score-value').innerText())
    if (displayed !== expectedT.hyperactivity_index) throw new Error('PSQ 页面总览与保存结果不一致')
    if (!(await page.locator(cfg.root).innerText()).includes('PI、NI 与问卷效度未评估')) throw new Error('PSQ 页面未标明效度未评估')
  } else {
    const storedRaw = JSON.parse(saved.assessment.raw_answers), dims = JSON.parse(saved.assessment.dimension_scores)
    for (const dim of Object.keys(s.maxScores)) expectedRaw[dim] = 0
    for (const q of s.questions) {
      const score = s.answers.get(q.id)
      if (storedRaw[q.id] !== score) throw new Error(`ABC ${q.id} 保存答案与实际点击不一致`)
      expectedRaw[q.dimension] += score
    }
    if (Object.keys(storedRaw).length !== cfg.count || Object.keys(expectedRaw).some(dim => dims[dim] !== expectedRaw[dim])
      || saved.assessment.total_score !== Object.values(expectedRaw).reduce((a, b) => a + b, 0)) throw new Error('ABC 加权总分或分因子不一致')
    if (Object.keys(dims).length !== 5 || s.maxScores.social_self_help !== 25) throw new Error('ABC 仍未显示完整五因子')
    if (Number(await page.locator('.result-overview .score-value').first().innerText()) !== saved.assessment.total_score) throw new Error('ABC 页面与保存结果不一致')
    if (await page.locator('.dimension-scores .el-table__row').count() !== 5) throw new Error('ABC 页面不是五因子报告')
  }
  const zip = await JSZip.loadAsync(fs.readFileSync(s.wordFile))
  const xml = await zip.file('word/document.xml')?.async('string'), text = xml?.replace(/<[^>]+>/gu, '') || ''
  const total = kind === 'psq' ? saved.assessment.hyperactivity_index : saved.assessment.total_score
  if (!text.includes('演示生甲') || !text.includes(kind === 'psq' ? 'Conners 父母问卷' : 'ABC') || !text.includes(String(total))) throw new Error(`${cfg.code} Word 标题、学生或结果核验失败`)
  if (kind === 'psq' && (!text.includes('效度状态未评估') || !text.includes(`心身障碍 T 分 ${expectedT.psychosomatic}`))) throw new Error('PSQ Word 效度或维度解释不一致')
  if (kind === 'abc' && (!text.includes('社会与生活自理') || !text.includes('25'))) throw new Error('ABC Word 未显示修正后的第五因子')
  const evidence = { studentId, ageMonths: s.context.ageInMonths, assessId: s.assessId, questionCount: cfg.count,
    clickedAnswers: Object.fromEntries(s.answers), expectedRaw, expectedT,
    assessment: saved.assessment, countBefore: s.before, countAfter: saved.count, reportIds: saved.reports.map(r => r.id),
    persistenceScope: kind === 'psq' ? '仅汇总与维度分，不含逐题答案；clickedAnswers 是录制实际点击证据' : 'raw_answers 保存逐题加权值，并保存维度与总分',
    currentLimitations: kind === 'psq' ? ['PI/NI 与问卷效度未评估', '逐题答案未持久保存', '常模来源未独立审核'] : ['五因子归属已按公开研究附录修正；中文题干及机构采用版本未逐题审核', '常模与分界未独立审核'],
    maxScores: s.maxScores, word: { file: path.relative(output, s.wordFile).replaceAll('\\', '/'), bytes: fs.statSync(s.wordFile).size }, reloaded: s.reloaded, verified: true }
  fs.writeFileSync(path.join(output, `${cfg.code}-assessment-verification.json`), JSON.stringify(evidence, null, 2), 'utf8')
}
export const verifyConnersPsq = (page, studentId, output) => verifyBehavior(page, studentId, output, 'psq')
export const verifyAbc = (page, studentId, output) => verifyBehavior(page, studentId, output, 'abc')

function buildBehaviorScenes({ showCard, hideCard, sleep, studentId, output }, kind) {
  const cfg = configs[kind]
  const s = { answers: new Map(), reloaded: false }; state.set(kind, s)
  async function answer(page, value, modify = false) {
    const old = (await page.locator('.question-number').innerText()).trim()
    const number = Number(old.match(/\d+/u)?.[0]), q = s.questions[number - 1]
    if (!q) throw new Error(`无法对应题目：${old}`)
    const option = page.locator('.answer-options .el-radio, .answer-options .el-radio-button').filter({ has: page.getByText(cfg.labels[value], { exact: true }) }).first()
    await option.scrollIntoViewIfNeeded(); await option.click()
    s.answers.set(q.id, q.options.find(o => o.value === value).score)
    if (modify) { await sleep(700); return }
    await page.waitForFunction((previous) => {
      const current = document.querySelector('.question-number')?.textContent?.trim()
      return Boolean(current && current !== previous) || Array.from(document.querySelectorAll('button')).some(b => b.textContent?.trim() === '查看报告')
    }, old, { timeout: 30000 }); await sleep(120)
  }
  return [
    { id: '01-title', narration: `星愿能力发展平台。软件操作教程${cfg.intro}`, caption: `软件操作教程 ${cfg.chapter}\n${cfg.title}`, async act(page) {
      const data = await page.evaluate(async ({ kind, id, table }) => {
        const { calculateAgeInMonths } = await import('/src/types/assessment.ts')
        const student = window.db.get('SELECT * FROM student WHERE id = ?', [id])
        const context = { ...student, ageInMonths: calculateAgeInMonths(student.birthday) }
        const common = { context, before: window.db.get(`SELECT count(*) AS n FROM ${table} WHERE student_id = ?`, [id]).n }
        if (kind === 'psq') {
          const { ConnersPSQDriver } = await import('/src/strategies/assessment/ConnersPSQDriver.ts')
          const { PSQ_DIMENSION_QUESTIONS_EN } = await import('/src/database/conners-psq-questions.ts')
          const { connersPSQNorms, getAgeGroup } = await import('/src/database/conners-norms.ts')
          return { ...common, questions: new ConnersPSQDriver().getQuestions(context), dimensionQuestions: PSQ_DIMENSION_QUESTIONS_EN, norms: connersPSQNorms[context.gender === '男' ? 'male' : 'female'][getAgeGroup(context.ageInMonths)] }
        }
        const { ABCDriver } = await import('/src/strategies/assessment/ABCDriver.ts')
        const { ABC_SUBSCALE_MAX_SCORES } = await import('/src/database/abc-questions.ts')
        return { ...common, questions: new ABCDriver().getQuestions(context), maxScores: ABC_SUBSCALE_MAX_SCORES }
      }, { kind, id: studentId, table: cfg.table })
      Object.assign(s, data)
      if (s.questions.length !== cfg.count) throw new Error('当前题目数量与分镜不一致')
      await showCard(page, `软件操作教程 ${cfg.chapter}`, cfg.title); await sleep(5000); await hideCard(page)
    } },
    { id: '02-format', narration: '本例先由管理员进入系统管理、系统设置，将默认报告格式设为 Word。后续导出会按这个设置生成文件。普通使用者可请管理员按机构要求配置。', caption: '系统管理 → 系统设置 → 报告设置\n本例选择默认 Word 格式', async act(page) {
      await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^系统管理$/u }).click()
      await page.getByRole('tab', { name: '系统设置', exact: true }).click()
      const settings = page.locator('.system-settings-section').filter({ has: page.getByRole('heading', { name: '报告设置', exact: true }) })
      await settings.scrollIntoViewIfNeeded(); await settings.getByText('Word', { exact: true }).click(); await sleep(3000)
    } },
    { id: '03-scale', narration: cfg.entry, caption: cfg.entryCaption, async act(page) {
      await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^能力评估$/u }).click()
      await page.locator('.assessment-category-chip').filter({ hasText: cfg.category }).click()
      const card = page.locator('.assessment-card').filter({ hasText: cfg.card }); await card.scrollIntoViewIfNeeded(); await card.hover(); await sleep(2500)
      await card.getByRole('button', { name: '开始评估', exact: true }).click(); await page.getByPlaceholder('搜索学生姓名或学号').waitFor()
    } },
    { id: '04-student', narration: cfg.student, caption: '搜索学生 → 核对资料 → 阅读说明 → 开始评估\n学生与评分均为虚构流程样例', async act(page) {
      await page.getByPlaceholder('搜索学生姓名或学号').fill('演示生甲')
      const row = page.locator('.el-table__row').filter({ hasText: '演示生甲' }); await row.hover(); await sleep(2200)
      await row.getByRole('button', { name: '选择', exact: true }).click()
      await page.getByRole('button', { name: '我已了解，开始评估', exact: true }).waitFor(); await sleep(3000)
      await page.getByRole('button', { name: '我已了解，开始评估', exact: true }).click(); await page.locator('.question-number').waitFor(); await sleep(1500)
    } },
    { id: '05-answer', narration: cfg.answer, caption: cfg.answerCaption, async act(page) {
      await page.locator('.answer-options').hover(); await sleep(2500); await answer(page, 0)
      await page.getByRole('button', { name: '上一题', exact: true }).click(); await page.locator('.question-number').filter({ hasText: '第 1 题' }).waitFor(); await sleep(1200)
      await answer(page, 1, true); await sleep(1200); await page.getByRole('button', { name: '下一题', exact: true }).click(); await sleep(500)
    } },
    { id: '06-remaining', narration: `下面压缩展示剩余作答，完成全部${kind === 'psq' ? '四十八' : '五十七'}题。本例选择只用于演示流程，实际填写应逐项依据已核实的观察信息，不能照抄示例或按视频速度作答。完成后等待系统保存并生成结果。`, caption: `压缩展示剩余作答，完成 ${cfg.count} 题后等待结果\n分数与速度仅供操作演示，实际填写逐项核对`, async act(page) {
      const compact = await page.addStyleTag({ content: '.assessment-container { zoom: 0.75; }' })
      await page.locator('.assessment-header').scrollIntoViewIfNeeded()
      for (let i = 1; i < s.questions.length; i++) await answer(page, kind === 'psq' ? [0, 1, 2, 1, 0, 3, 0, 1][i % 8] : (i % 4 === 0 ? 1 : 0))
      await page.getByRole('button', { name: '查看报告', exact: true }).waitFor({ timeout: 30000 }); await compact.evaluate(el => el.remove())
      s.assessId = await page.evaluate(({ table, id }) => window.db.get(`SELECT max(id) AS id FROM ${table} WHERE student_id = ?`, [id]).id, { table: cfg.table, id: studentId })
      await sleep(3000)
    } },
    { id: '07-note', narration: cfg.note, caption: cfg.noteCaption, async act(page) {
      await page.getByRole('button', { name: '查看报告', exact: true }).click(); await page.locator(`${cfg.root} h2`).waitFor()
      const focus = page.locator(kind === 'psq' ? '.validity-card' : '.result-overview')
      await focus.scrollIntoViewIfNeeded(); await focus.hover(); await sleep(5000)
    } },
    { id: '08-report', narration: cfg.report, caption: cfg.reportCaption, async act(page) {
      if (kind === 'psq') {
        await page.locator('.result-card').scrollIntoViewIfNeeded(); await sleep(3000)
        await page.locator('.radar-card').scrollIntoViewIfNeeded(); await sleep(3000)
        await page.locator('.dimensions-card').scrollIntoViewIfNeeded(); await sleep(2500)
        const psychosomatic = page.locator('.dimension-detail').filter({ has: page.getByText('心身障碍', { exact: true }) })
        await psychosomatic.scrollIntoViewIfNeeded(); await psychosomatic.hover(); await sleep(6000)
      } else {
        await page.locator('.dimension-scores').scrollIntoViewIfNeeded(); await sleep(7000)
      }
    } },
    { id: '09-export', narration: '回到报告顶部，点击导出报告。本次生成 Word 文件，后缀是 docx。留意保存位置，用 Word 或兼容软件打开，核对学生、日期与结果。自动解释和建议仍需由工作人员结合实际情况复核。', caption: '导出报告 → Word（.docx）→ 留意保存位置\n打开后核对学生、日期、结果及自动建议', async act(page, app) {
      await page.locator(`${cfg.root} h2`).scrollIntoViewIfNeeded()
      fs.mkdirSync(path.join(output, 'exports'), { recursive: true }); const directory = fs.mkdtempSync(path.join(output, 'exports', 'capture-'))
      await app.evaluate(({ BrowserWindow }, directory) => {
        globalThis.__scgpBehaviorDownload = { state: 'waiting' }
        BrowserWindow.getAllWindows()[0].webContents.session.once('will-download', (_event, item) => {
          const file = `${directory}/${item.getFilename().replace(/[<>:"/\\|?*]/gu, '_')}`; item.setSavePath(file)
          globalThis.__scgpBehaviorDownload = { state: 'progressing', file }; item.once('done', (_event, state) => { globalThis.__scgpBehaviorDownload.state = state })
        })
      }, directory)
      await page.getByRole('button', { name: '导出报告', exact: true }).hover(); await sleep(1500); await page.getByRole('button', { name: '导出报告', exact: true }).click()
      let result
      for (let i = 0; i < 100; i++) { result = await app.evaluate(() => globalThis.__scgpBehaviorDownload); if (['completed', 'cancelled', 'interrupted'].includes(result.state)) break; await sleep(250) }
      if (result.state !== 'completed' || !result.file.endsWith('.docx') || !fs.existsSync(result.file)) throw new Error(`${cfg.code} 实际 Word 下载失败`)
      s.wordFile = result.file; await sleep(3000)
    } },
    { id: '10-recall', narration: `从学生管理打开演示生甲，在评估记录里找到本次${kind === 'psq' ? ' Conners PSQ ' : ' ABC '}报告。核对量表和日期，再点击查看报告。重载页面后再次确认本次结果，完成作答、保存、导出和回查。`, caption: `学生详情 → 评估记录 → ${cfg.record} → 查看报告\n核对量表与日期，重载后再次查验`, async act(page) {
      await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^学生管理$/u }).click()
      await page.locator('input[placeholder*="搜索学生姓名"]').fill('演示生甲')
      await page.locator('.student-card').filter({ hasText: '演示生甲' }).getByRole('link', { name: '查看详情', exact: true }).click()
      const row = page.locator('.records-table .el-table__row').filter({ hasText: cfg.record }).first(); await row.scrollIntoViewIfNeeded(); await row.hover(); await sleep(1800)
      await row.getByRole('button', { name: '查看报告', exact: true }).click(); await page.locator(`${cfg.root} h2`).waitFor()
      if (Number(page.url().split('?')[0].split('/').at(-1)) !== s.assessId) throw new Error('档案打开的不是本次评估')
      await sleep(2200); await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator(`${cfg.root} h2`).waitFor()
      await page.locator(kind === 'psq' ? '.result-card .score-value' : '.result-overview .score-value').first().waitFor()
      s.reloaded = true; await verifyBehavior(page, studentId, output, kind); await sleep(3000)
    } },
    { id: '11-end', narration: cfg.end, caption: '本节完成\n作答 · 报告导出 · 档案回查', async act(page) {
      await showCard(page, '本节完成', cfg.title); await sleep(4500)
    } },
  ]
}
export const buildConnersPsqScenes = options => buildBehaviorScenes(options, 'psq')
export const buildAbcScenes = options => buildBehaviorScenes(options, 'abc')
