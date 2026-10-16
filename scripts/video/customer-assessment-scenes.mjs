/** 教程 03：WeeFIM 操作流程。所有评分均为流程演示样例。 */
export function buildAssessmentScenes({ showCard, hideCard, sleep, studentId }) {
  let previousCount
  let assessId
  async function answer(page, score, pause = 650) {
    const option = page.locator('.answer-options .el-radio, .answer-options .el-radio-button').nth(7 - score)
    await option.scrollIntoViewIfNeeded()
    if (pause >= 1800) { await option.hover(); await sleep(1800) }
    await option.click()
    await sleep(pause)
  }
  async function next(page, label = '下一题') {
    const button = page.getByRole('button', { name: label, exact: true })
    await button.scrollIntoViewIfNeeded()
    await button.click()
    await sleep(250)
  }
  return [
    {
      id: '01-title',
      narration: '星愿能力发展平台。软件操作教程第三讲：量表评估与结果查看。本节以 WeeFIM 量表演示，学生和评分均为虚构样例。',
      caption: '软件操作教程 03\n量表评估与结果查看',
      async act(page) {
        await showCard(page, '软件操作教程 03', '选择量表 · 作答 · 查看报告 · 回查')
        await sleep(5000)
        await hideCard(page)
      },
    },
    {
      id: '02-scale',
      narration: '从左侧进入能力评估。按分类查找量表，本节选择生活自理分类中的 WeeFIM。实际可见的量表取决于账号和已授权能力包。',
      caption: '能力评估 → 生活自理 → WeeFIM\n可见量表由账号和授权决定',
      async act(page) {
        const nav = page.locator('.sidebar-nav .nav-item').filter({ hasText: '能力评估' }).first()
        await nav.hover()
        await sleep(800)
        await nav.click()
        await page.locator('.assessment-category-chip').first().waitFor()
        await page.locator('.assessment-category-chip').filter({ hasText: '生活自理' }).click()
        const card = page.locator('.assessment-card').filter({ hasText: 'WeeFIM' })
        await card.waitFor({ state: 'visible' })
        await card.scrollIntoViewIfNeeded()
        await sleep(3500)
        await card.getByRole('button', { name: '开始评估' }).hover()
        await sleep(2200)
        await card.getByRole('button', { name: '开始评估' }).click()
        await page.locator('input[placeholder="搜索学生姓名或学号"]').waitFor()
      },
    },
    {
      id: '03-student',
      narration: '搜索并选择演示生甲。开始前核对姓名、性别和出生日期，确保评估记录归到正确的学生档案。',
      caption: '搜索并选择“演示生甲”\n开始前核对评估对象',
      async act(page) {
        previousCount = await page.evaluate((id) => window.db.get('SELECT count(*) AS n FROM weefim_assess WHERE student_id = ?', [id]).n, studentId)
        await page.locator('input[placeholder="搜索学生姓名或学号"]').fill('演示生甲')
        const row = page.locator('.el-table__row').filter({ hasText: '演示生甲' })
        await row.waitFor()
        await row.hover()
        await sleep(3500)
        await row.getByRole('button', { name: '选择', exact: true }).click()
        await page.getByRole('button', { name: '我已了解，开始评估' }).waitFor()
        await sleep(2000)
      },
    },
    {
      id: '04-welcome',
      narration: '阅读评估说明，了解本量表的作答方式。确认准备完成后，点击我已了解，开始评估。不同量表的评分方式可能不同，应以各自说明为准。',
      caption: '阅读本量表说明 → 开始评估\n按量表要求进行观察和作答',
      async act(page) {
        await sleep(4500)
        const start = page.getByRole('button', { name: '我已了解，开始评估' })
        await start.hover()
        await sleep(1700)
        await start.click()
        await page.locator('.question-number').waitFor()
        await sleep(2800)
      },
    },
    {
      id: '05-answer',
      narration: '逐项阅读题目和评分选项，按实际观察选择。首次选择后会自动进入下一题。需要修改时，可以返回上一题，重新选择，再点击下一题继续。本次评分仅用于演示操作。',
      caption: '首次选择后自动进入下一题\n返回修改后点击“下一题”继续',
      async act(page) {
        await answer(page, 4, 1800)
        await page.locator('.question-number').scrollIntoViewIfNeeded()
        await sleep(1800)
        await next(page, '上一题')
        await answer(page, 5, 1800)
        await next(page)
        await page.locator('.question-number').scrollIntoViewIfNeeded()
        await sleep(1800)
      },
    },
    {
      id: '06-remaining',
      narration: '下面压缩展示剩余作答过程。实际评估应按量表要求逐项观察和填写，不按视频速度作答。最后一题作答后，系统自动完成评估并生成结果。',
      caption: '压缩展示剩余作答，评分均为示例\n实际评估按量表要求逐项填写',
      async act(page) {
        const compact = await page.addStyleTag({ content: '.assessment-container { zoom: 0.72; }' })
        await page.locator('.assessment-header').scrollIntoViewIfNeeded()
        await sleep(1800)
        const scores = [4, 3, 5, 4, 3, 4, 5, 4, 3, 5, 4, 3, 4, 5, 4, 3, 4]
        for (const score of scores) {
          await answer(page, score, 850)
        }
        await page.getByRole('button', { name: '查看报告', exact: true }).waitFor({ timeout: 20000 })
        await compact.evaluate((element) => element.remove())
        const saved = await page.evaluate((id) => ({
          count: window.db.get('SELECT count(*) AS n FROM weefim_assess WHERE student_id = ?', [id]).n,
          latest: window.db.get('SELECT id FROM weefim_assess WHERE student_id = ? ORDER BY id DESC LIMIT 1', [id]),
        }), studentId)
        if (saved.count !== previousCount + 1) throw new Error('评估主记录未新增')
        assessId = saved.latest.id
        await page.evaluate(async () => window.db.saveNow())
      },
    },
    {
      id: '07-complete',
      narration: '完成后，系统生成结果和建议。先确认评估已经完成，再点击查看报告。示例中的分数和建议只展示软件输出形式。',
      caption: '结果已生成 → 查看报告\n示例分数用于演示软件输出',
      async act(page) {
        await sleep(5000)
        const report = page.getByRole('button', { name: '查看报告', exact: true })
        await report.hover()
        await sleep(1700)
        await report.click()
        await page.locator('.weefim-report h2').waitFor({ state: 'visible', timeout: 20000 })
        await sleep(2000)
      },
    },
    {
      id: '08-report',
      narration: '报告包含学生信息、总分、分项结果和详细内容。可以向下查看各部分。报告顶部也有查看历史和导出入口，导出操作会在后续专题中演示。',
      caption: '报告：基本信息、结果与详细内容\n顶部提供历史和导出入口',
      async act(page) {
        await page.locator('.result-overview-card').scrollIntoViewIfNeeded()
        await sleep(4300)
        await page.mouse.wheel(0, 540)
        await sleep(4000)
        await page.locator('.weefim-report h2').scrollIntoViewIfNeeded()
        await sleep(2500)
      },
    },
    {
      id: '09-recall',
      narration: '之后还可以从学生管理打开这名学生，在评估记录中找到本次 WeeFIM 记录，点击查看报告重新打开。这样就完成了评估、保存和回查的完整流程。',
      caption: '学生详情 → 评估记录 → 查看报告\n回查本次保存的评估',
      async act(page) {
        const nav = page.locator('.sidebar-nav .nav-item').filter({ hasText: '学生管理' }).first()
        await nav.click()
        await page.locator('input[placeholder*="搜索学生姓名"]').fill('演示生甲')
        await page.locator('.student-card').filter({ hasText: '演示生甲' }).getByRole('link', { name: '查看详情' }).click()
        const row = page.locator('.records-table .el-table__row').filter({ hasText: 'WeeFIM' }).first()
        await row.waitFor({ state: 'visible', timeout: 20000 })
        await row.scrollIntoViewIfNeeded()
        await sleep(4500)
        await row.getByRole('button', { name: '查看报告' }).hover()
        await sleep(2200)
        await row.getByRole('button', { name: '查看报告' }).click()
        await page.locator('.weefim-report h2').waitFor()
        if (!new URL(page.url()).hash.includes(String(assessId))) throw new Error('回查报告与本次评估不一致')
        await sleep(2500)
      },
    },
    {
      id: '10-end',
      narration: '本节完成。下一讲将演示训练计划的制定与调整。',
      caption: '本节完成\n下一讲：制定与调整训练计划',
      async act(page) {
        await showCard(page, '本节完成', '下一讲：制定与调整训练计划')
        await sleep(4500)
        await hideCard(page)
      },
    },
  ]
}
