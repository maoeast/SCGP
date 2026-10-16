/** 教程 18：表达关心三步真实选择与保存回查。 */
import fs from 'node:fs'
import path from 'node:path'

const sceneTitle = '好朋友的玩具不小心摔坏了'
let baseline
let resourceId
let trainingRecordId
let choices = []

async function readState(page) {
  return page.evaluate(async () => {
    const { useTrainingStore } = await import('/src/stores/useTrainingStore.ts')
    const store = useTrainingStore()
    return { index: store.currentStepIndex, count: store.questionStepCount, step: store.currentStepData, title: store.scene?.title }
  })
}

async function selectPreferred(page, sleep) {
  const state = await readState(page)
  const option = state.step?.options.find((item) => item.is_correct)
  if (!option) throw new Error('当前关心情境未加载可用示例选项')
  const previousQuestion = (await page.locator('.question-title').innerText()).trim()
  const card = page.locator('.image-option-card, .text-option-card').filter({ hasText: option.content }).first()
  await card.hover()
  await sleep(2200)
  await card.click()
  choices.push({ stepIndex: state.index, stepType: state.step.step_type, selectedLabel: option.content })
  await page.waitForFunction((text) => {
    const next = document.querySelector('.question-title')?.textContent?.trim()
    return Boolean(document.querySelector('.result-step')) || Boolean(next && next !== text)
  }, previousQuestion, { timeout: 20000 })
  await page.waitForFunction(() => !document.querySelector('.training-main.is-transitioning'))
  await sleep(1000)
}

export async function verifyCareTraining(page, studentId, output) {
  const saved = await page.evaluate(({ id, studentId }) => {
    const session = window.db.get('SELECT * FROM emotional_training_session WHERE training_record_id = ?', [id])
    return {
      record: window.db.get('SELECT * FROM training_records WHERE id = ?', [id]), session,
      unified: window.db.get("SELECT * FROM training_session WHERE source_table = 'training_records' AND source_record_id = ?", [id]),
      details: window.db.all('SELECT step_index, step_type, selected_label, is_correct, is_acceptable, hint_level, retry_count, perspective FROM emotional_training_detail WHERE session_id = ? ORDER BY step_index', [session?.id || 0]),
      records: window.db.get('SELECT count(*) AS n FROM training_records WHERE student_id = ?', [studentId]).n,
      sessions: window.db.get('SELECT count(*) AS n FROM emotional_training_session WHERE student_id = ?', [studentId]).n,
    }
  }, { id: trainingRecordId, studentId })
  const summary = JSON.parse(saved.record?.raw_data || '{}')
  if (saved.record?.student_id !== studentId || saved.record.resource_id !== resourceId || saved.record.resource_type !== 'care_scene'
    || saved.session?.sub_module !== 'care_scene' || saved.session.completion_status !== 'completed'
    || saved.session.question_count !== 3 || saved.session.correct_count !== 3 || saved.session.hint_count !== 0 || saved.session.retry_count !== 0
    || saved.details.length !== 3 || saved.details.some((item, index) => item.is_correct !== 1 || item.selected_label !== choices[index]?.selectedLabel)
    || summary.dominantChoiceType !== 'empathy' || summary.preferredPerspective !== 'receiver'
    || saved.unified?.completion_status !== 'completed' || saved.unified.student_id !== studentId
    || saved.records !== baseline.records + 1 || saved.sessions !== baseline.sessions + 1) throw new Error('表达关心三步选择、汇总或保存回查核验失败')
  const evidence = { studentId, sceneTitle, resourceId, trainingRecordId, emotionalSessionId: saved.session.id,
    unifiedSessionId: saved.unified.id, questionCount: 3, correctCount: saved.session.correct_count,
    hintCount: saved.session.hint_count, retryCount: saved.session.retry_count, durationMs: saved.session.duration_ms,
    dominantChoiceType: summary.dominantChoiceType, preferredPerspective: summary.preferredPerspective,
    choices, details: saved.details, recordsBefore: baseline.records, recordsAfter: saved.records,
    sessionsBefore: baseline.sessions, sessionsAfter: saved.sessions, reloaded: true, verified: true }
  fs.writeFileSync(path.join(output, 'care-training-verification.json'), JSON.stringify(evidence, null, 2), 'utf8')
  return evidence
}

export function buildCareScenes({ showCard, hideCard, sleep, studentId, output }) {
  return [
    {
      id: '01-title',
      narration: '星愿能力发展平台。软件操作教程第十八讲：表达关心训练与记录回查。本节演示选择关心情境、识别对方感受、选择回应，再换到对方的角度思考，最后确认保存与回查。全部作答均为虚构流程示例。',
      caption: '软件操作教程 18\n表达关心训练与记录回查',
      async act(page) {
        choices = []
        baseline = await page.evaluate((id) => ({
          records: window.db.get('SELECT count(*) AS n FROM training_records WHERE student_id = ?', [id]).n,
          sessions: window.db.get('SELECT count(*) AS n FROM emotional_training_session WHERE student_id = ?', [id]).n,
        }), studentId)
        await showCard(page, '软件操作教程 18', '识别感受 · 选择回应 · 换位思考与回查')
        await sleep(4500)
      },
    },
    {
      id: '02-entry',
      narration: '从情绪调节进入表达关心，再选择本次训练的学生。这里与情绪场景识别使用不同的情境和问题。本例选择演示生甲，进入后先核对学生姓名。',
      caption: '情绪调节 → 表达关心 → 选择学生\n核对本次学生：演示生甲',
      async act(page) {
        await hideCard(page)
        await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^情绪调节$/u }).click()
        await page.locator('.module-card').filter({ hasText: '表达关心' }).click()
        await page.getByPlaceholder('搜索学生姓名或学号').fill('演示生甲')
        const row = page.locator('.el-table__row').filter({ hasText: '演示生甲' })
        await row.waitFor()
        await sleep(2000)
        await row.getByRole('button', { name: '选择', exact: true }).click()
        await page.locator('.scene-card').first().waitFor()
        await sleep(2000)
      },
    },
    {
      id: '03-context',
      narration: '查看情境说明、难度和标签。本例选择好朋友的玩具不小心摔坏了。进入后先观察画面，读一读对方发生了什么、当前需要怎样的关心，再点击我准备好了。',
      caption: '选择“好朋友的玩具不小心摔坏了”\n观察情境和目标 → 我准备好了',
      async act(page) {
        const card = page.locator('.scene-card').filter({ has: page.getByRole('heading', { name: sceneTitle, exact: true }) })
        await card.scrollIntoViewIfNeeded()
        await card.hover()
        await sleep(3000)
        await card.click()
        await page.locator('.intro-step').waitFor()
        resourceId = Number(new URL(page.url().split('#')[1], 'http://demo').searchParams.get('resourceId'))
        const state = await readState(page)
        if (state.title !== sceneTitle || state.count !== 3 || !resourceId) throw new Error('表达关心情境或三步题目加载失败')
        await sleep(4000)
        await page.getByRole('button', { name: '我准备好了', exact: true }).click()
        await page.locator('.image-option-card').first().waitFor()
        await sleep(2000)
      },
    },
    {
      id: '04-feeling',
      narration: '第一步识别对方的感受。本例选择伤心、心碎。系统给出反馈，再进入下一步。这里应围绕当下情境理解人物，演示选择不代表真实学生的表现。',
      caption: '观察人物感受 → 本例选择“伤心/心碎”\n查看反馈后进入下一步',
      async act(page) {
        await selectPreferred(page, sleep)
        await sleep(2500)
      },
    },
    {
      id: '05-response',
      narration: '第二步选择关心的话。本例先表达理解对方的难过，再看这句话带来的回应。情境中可能有不止一种合适方式，不必把某一句话当作所有人的固定答案，实际沟通要了解对方的需要。',
      caption: '选择关心的话 → 查看对方回应\n本例先表达理解，不把一句话当成固定答案',
      async act(page) {
        await selectPreferred(page, sleep)
        await sleep(2500)
      },
    },
    {
      id: '06-perspective',
      narration: '第三步换到对方的角度，想一想怎样的回应会更舒服。本例选择陪伴的情境选项。实际表达前，应先了解对方愿意接受的方式。选择完成后，系统进入结果页。',
      caption: '站在对方角度思考 → 选择希望收到的回应\n真实沟通先了解对方愿意接受的方式',
      async act(page) {
        await selectPreferred(page, sleep)
        await page.locator('.result-step').waitFor()
        await sleep(2500)
      },
    },
    {
      id: '07-save',
      narration: '完成后，核对本次关心方式、对方感受与记录状态。本例显示共情式，并确认已保存。页面反馈只描述这次软件练习，不是学生的能力等级或现实关系评价。确认后返回场景选择。',
      caption: '核对本次关心方式、感受与“已保存”\n练习反馈不等于现实能力或关系评价',
      async act(page) {
        await page.locator('.result-step .meta-card').filter({ hasText: '记录状态' }).getByText('已保存', { exact: true }).waitFor()
        await page.locator('.result-step .meta-card').filter({ hasText: '本次关心方式' }).getByText('共情式', { exact: true }).waitFor()
        trainingRecordId = await page.evaluate((id) => window.db.get("SELECT max(id) AS id FROM training_records WHERE student_id = ? AND resource_type = 'care_scene'", [id]).id, studentId)
        await sleep(4500)
        await page.getByRole('button', { name: '返回场景选择', exact: true }).click()
        await page.locator('.scene-card').first().waitFor()
        await sleep(1500)
      },
    },
    {
      id: '08-recall',
      narration: '从训练记录进入情绪调节，按学生筛选，找到本次关心情境。先核对学生、任务和时间，再查看详情。当前入口打开会话摘要，展示简要结果。重新载入后再次回查，确认本次记录已经保存。',
      caption: '训练记录 → 情绪调节 → 筛选学生与任务\n查看会话摘要，重载后再次回查',
      async act(page) {
        await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^训练记录$/u }).click()
        await page.locator('.module-card').filter({ hasText: '情绪调节' }).click()
        await page.locator('.student-filter').click()
        await page.locator('.el-select-dropdown__item:visible').filter({ hasText: /^演示生甲$/u }).click()
        const row = page.locator('.records-table .el-table__row').filter({ hasText: sceneTitle }).first()
        await row.waitFor()
        await row.hover()
        await sleep(3000)
        await row.getByRole('button', { name: '查看详情', exact: true }).click()
        await page.locator('.summary-wrap').waitFor()
        const id = Number(new URL(page.url().split('#')[1], 'http://demo').searchParams.get('trainingRecordId'))
        if (id !== trainingRecordId) throw new Error('回查摘要不是本次表达关心记录')
        await sleep(3000)
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.locator('.summary-wrap').waitFor()
        await verifyCareTraining(page, studentId, output)
        await sleep(3500)
      },
    },
    {
      id: '09-end',
      narration: '本节完成。先理解情境与对方感受，再选择表达方式，并从对方角度思考。完成后确认保存，按学生和任务回查，把软件练习与实际观察结合起来。',
      caption: '本节完成\n识别感受 · 选择回应 · 换位思考与回查',
      async act(page) {
        await showCard(page, '本节完成', '识别感受 · 选择回应 · 换位思考与回查')
        await sleep(4500)
      },
    },
  ]
}
