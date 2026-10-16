/** 教程 14：生活自理图文分步登记、完成保存及列表回查。 */
import fs from 'node:fs'
import path from 'node:path'

const taskName = '洗手'
const revisedNote = '演示修订：口头提醒后卷起袖子。'
let baseline
let taskId
let recordId
let stepCount

export async function verifySelfCareTraining(page, studentId, output) {
  const saved = await page.evaluate(({ id, studentId }) => ({
    record: window.db.get('SELECT * FROM training_records WHERE id = ?', [id]),
    session: window.db.get('SELECT * FROM training_session WHERE source_table = ? AND source_record_id = ?', ['training_records', id]),
    count: window.db.get('SELECT count(*) AS n FROM training_records WHERE student_id = ?', [studentId]).n,
  }), { id: recordId, studentId })
  const raw = JSON.parse(saved.record?.raw_data || '{}')
  const summary = JSON.parse(saved.session?.summary_payload || '{}')
  if (saved.count !== baseline + 1 || saved.record?.student_id !== studentId
    || saved.record?.resource_id !== taskId || saved.record?.resource_type !== 'task_training'
    || saved.record?.entry_code !== 'life-skills' || saved.session?.completion_status !== 'completed'
    || raw.stepResults?.length !== stepCount || raw.completedStepCount !== stepCount
    || raw.stepResults[0].completionLevel !== 'prompt' || raw.stepResults[0].errorType !== 1
    || raw.stepResults[0].teacherNotes !== revisedNote || raw.stepResults[1].completionLevel !== 'assist'
    || raw.stepResults[1].errorType !== 2 || raw.completionBreakdown.independent !== stepCount - 2
    || Math.abs(saved.session.duration_ms / 1000 - saved.record.duration) > 0.5
    || JSON.stringify(summary.stepResults) !== JSON.stringify(raw.stepResults)) throw new Error('自理训练记录、分步结果或统一会话保存不一致')
  const evidence = { studentId, taskId, taskName, trainingRecordId: recordId, sessionId: saved.session.id,
    completionStatus: saved.session.completion_status, stepCount, completedStepCount: raw.completedStepCount,
    completionBreakdown: raw.completionBreakdown, maxErrorType: raw.errorType, revisedFirstStepNote: revisedNote,
    durationSeconds: saved.record.duration, durationMs: saved.session.duration_ms,
    countBefore: baseline, countAfter: saved.count, verified: true }
  fs.writeFileSync(path.join(output, 'self-care-training-verification.json'), JSON.stringify(evidence, null, 2), 'utf8')
  return evidence
}

export function buildSelfCareScenes({ showCard, hideCard, sleep, studentId, output }) {
  const workspace = (page) => page.locator('.task-execution-page')
  async function choose(page, completion, error, note) {
    await workspace(page).getByRole('button', { name: completion, exact: true }).click()
    await sleep(650)
    await workspace(page).getByRole('button', { name: error, exact: true }).click()
    if (note !== undefined) await page.getByPlaceholder('记录本步提示、错误点或行为观察').fill(note)
    await sleep(1000)
  }
  async function filterStudent(page) {
    await page.locator('.student-filter').click()
    await page.locator('.el-select-dropdown__item:visible').filter({ hasText: /^演示生甲$/u }).click()
    await page.locator('.records-table .el-table__row').filter({ hasText: taskName }).first().waitFor()
  }
  return [
    {
      id: '01-title',
      narration: '星愿能力发展平台。软件操作教程第十四讲：生活自理训练与记录回查。本节以洗手任务为例，演示选择学生、逐步登记、返回修订，以及完成保存。画面中的表现和备注均为虚构操作示例。',
      caption: '软件操作教程 14\n生活自理训练与记录回查',
      async act(page) {
        baseline = await page.evaluate((id) => window.db.get('SELECT count(*) AS n FROM training_records WHERE student_id = ?', [id]).n, studentId)
        await showCard(page, '软件操作教程 14', '图文步骤 · 表现登记 · 完成与回查')
        await sleep(4500)
      },
    },
    {
      id: '02-select-task',
      narration: '从左侧生活自理进入自理训练，按个人卫生分类找到洗手。点击任务卡片，搜索并选择演示生甲。进入执行页后，先核对任务名称和正在训练的学生，确保登记到正确档案。',
      caption: '生活自理 → 个人卫生 → 洗手 → 选择学生\n进入后先核对任务和学生',
      async act(page) {
        await hideCard(page)
        await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^生活自理$/u }).click()
        await page.locator('.self-care-task-list-page').waitFor()
        await page.locator('.task-gallery-pill').filter({ hasText: '个人卫生' }).click()
        await page.locator('.task-gallery-card').filter({ has: page.getByRole('heading', { name: taskName, exact: true }) }).click()
        await page.getByPlaceholder('搜索学生姓名或学号').fill('演示生甲')
        await sleep(2200)
        await page.locator('.el-table__row').filter({ hasText: '演示生甲' }).getByRole('button', { name: '选择', exact: true }).click()
        await workspace(page).getByRole('heading', { name: taskName, exact: true }).waitFor()
        await workspace(page).locator('.task-sidebar-student').filter({ hasText: '演示生甲' }).waitFor()
        taskId = Number(new URL(page.url()).hash.match(/execute\/(\d+)/u)?.[1])
        stepCount = await page.locator('.task-step-nav__item').count()
        if (stepCount < 3) throw new Error('示例任务步骤不足')
        await page.waitForFunction(() => { const img = document.querySelector('.task-stage-figure__image'); return img?.complete && img.naturalWidth > 0 })
        await sleep(2400)
      },
    },
    {
      id: '03-workspace',
      narration: '左侧显示当前步骤的图片、文字和步骤导航，右侧显示执行概览、完成等级、错误等级和教师备注。根据观察登记当前一步，再点击下一步。这里展示的是软件登记流程，不是一次真实学生训练。',
      caption: '左侧查看图文步骤，右侧登记实际表现\n完成等级、错误等级与备注按观察填写',
      async act(page) {
        await page.locator('.task-stage-caption').hover()
        await sleep(2300)
        await page.getByRole('heading', { name: '完成等级', exact: true }).hover()
        await sleep(2300)
      },
    },
    {
      id: '04-first-step',
      narration: '第一步，示例选择口头提示，错误等级选轻度，再写一条备注。点击下一步后，执行概览会更新已记录步骤。等级和备注应反映本步发生的情况，不需要为了完成流程而统一选择独立完成。',
      caption: '示例：口头提示 / 轻度 / 教师备注\n点击“下一步”，查看执行概览更新',
      async act(page) {
        await choose(page, '口头提示', '轻度', '演示：口头提醒后卷好袖子。')
        await sleep(2400)
        await page.getByRole('button', { name: '下一步', exact: true }).click()
        await page.locator('.task-stage-caption__step').filter({ hasText: /^步骤 2$/u }).waitFor()
        await sleep(2200)
      },
    },
    {
      id: '05-other-steps',
      narration: '第二步示例登记协助完成和中度，并补充观察。后续步骤连续录入独立完成、无错误。这段是为展示连续登记而安排的虚构记录，不代表实际训练速度，也不是学生能力评价。',
      caption: '第二步：协助完成 / 中度；后续连续登记\n以下为虚构流程示例，不代表真实训练速度',
      async act(page) {
        await choose(page, '协助完成', '中度', '演示：协助打开水龙头。')
        await page.getByRole('button', { name: '下一步', exact: true }).click()
        for (let step = 3; step < stepCount; step++) {
          await page.locator('.task-stage-caption__step').filter({ hasText: new RegExp(`^步骤 ${step}$`, 'u') }).waitFor()
          await choose(page, '独立完成', '无', '')
          await page.getByRole('button', { name: '下一步', exact: true }).click()
        }
        await choose(page, '独立完成', '无', '')
        await sleep(1700)
      },
    },
    {
      id: '06-review-save',
      narration: '保存前，可以通过步骤导航返回前面的步骤，核对并修订登记。本次修改第一步的备注，再回到最后一步。检查执行概览后点击完成训练，系统保存本次结果并进入生活自理训练记录。',
      caption: '步骤导航返回核对，修订第一步备注\n回到最后一步 → 完成训练 → 保存记录',
      async act(page) {
        await page.locator('.task-step-nav__item').first().click()
        const firstNote = page.getByPlaceholder('记录本步提示、错误点或行为观察')
        if ((await firstNote.inputValue()) !== '演示：口头提醒后卷好袖子。') throw new Error('返回第一步后备注未保留')
        await firstNote.fill(revisedNote)
        await sleep(2600)
        await page.locator('.task-step-nav__item').last().click()
        await sleep(2600)
        await page.getByRole('button', { name: '完成训练', exact: true }).click()
        await page.waitForURL(/training-records\/life-skills/u)
        await page.locator('.records-table').waitFor()
        recordId = Number(new URL(page.url()).hash.match(/trainingRecordId=(\d+)/u)?.[1])
        await verifySelfCareTraining(page, studentId, output)
        await sleep(2200)
      },
    },
    {
      id: '07-recall',
      narration: '在生活自理的游戏训练记录中，按学生筛选，核对任务名称、实际时长和本次时间。重新载入后，记录仍在，列表时长与已存会话一致。本例完成比例包含提示或协助，不等于独立完成率。',
      caption: '筛选学生，核对任务与实际时长；重载回查\n完成比例包含提示或协助，不等于独立完成率',
      async act(page) {
        await filterStudent(page)
        await page.locator('.records-table .el-table__row').filter({ hasText: taskName }).first().hover()
        await sleep(3800)
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.locator('.records-table').waitFor()
        await filterStudent(page)
        await verifySelfCareTraining(page, studentId, output)
        const row = page.locator('.records-table .el-table__row').filter({ hasText: taskName }).first()
        const evidence = JSON.parse(fs.readFileSync(path.join(output, 'self-care-training-verification.json'), 'utf8'))
        const seconds = evidence.durationSeconds
        const durationLabel = seconds >= 60 ? `${Math.floor(seconds / 60)}分 ${seconds % 60}秒` : `${seconds}秒`
        if (!(await row.innerText()).includes(durationLabel)) throw new Error('自理训练列表时长与持久化时长不一致')
        await row.hover()
        await sleep(4000)
        console.log('生活自理列表回查通过：时长、分步结果、备注修订及统一会话一致')
      },
    },
    {
      id: '08-detail',
      narration: '点击这条记录的查看详情，进入只读的历史页面。这里能核对本次十步的完成等级、错误等级和教师备注。步骤文字取自当前任务，若任务后来修改，应以历史保存的等级和备注为准。重新载入详情，也不会新建一次训练。',
      caption: '查看详情 → 历史十步结果与备注\n只读回查，重载不会新增训练',
      async act(page) {
        const row = page.locator('.records-table .el-table__row').filter({ hasText: taskName }).first()
        await row.getByRole('button', { name: '查看详情', exact: true }).click()
        await page.getByRole('heading', { name: '自理训练记录详情', exact: true }).waitFor()
        if (!page.url().includes(`/self-care/records/${recordId}`)) throw new Error('历史详情错误进入新任务执行页')
        const detail = page.locator('.record-detail-page')
        const content = await detail.innerText()
        if (!content.includes(revisedNote) || !content.includes('第 10 步') || !content.includes('口头提示') || !content.includes('协助完成')) throw new Error('历史详情缺少保存的逐步结果')
        await detail.locator('.step-item').first().scrollIntoViewIfNeeded()
        await sleep(4000)
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.getByRole('heading', { name: '自理训练记录详情', exact: true }).waitFor()
        if ((await detail.locator('.step-item').count()) !== stepCount) throw new Error('重载后历史步骤数量不一致')
        await verifySelfCareTraining(page, studentId, output)
        await detail.locator('.step-item').last().scrollIntoViewIfNeeded()
        await sleep(4000)
      },
    },
    {
      id: '09-end',
      narration: '本节完成。先确认任务和学生，再逐步登记实际表现，必要时返回修订，最后完成保存并核对记录。感谢观看。',
      caption: '本节完成\n感谢观看',
      async act(page) {
        await showCard(page, '本节完成', '选择任务 · 逐步登记 · 保存与回查')
        await sleep(4500)
      },
    },
  ]
}
