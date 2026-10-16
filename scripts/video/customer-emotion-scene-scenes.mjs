/** 教程 17：情绪与场景真实作答、保存和回查。 */
import fs from 'node:fs'
import path from 'node:path'

const sceneTitle = '幼儿园绘本角安静看书'
let baseline
let resourceId
let trainingRecordId
let questionCount
let choices = []

async function readStep(page) {
  return page.evaluate(async () => {
    const { useTrainingStore } = await import('/src/stores/useTrainingStore.ts')
    const store = useTrainingStore()
    return { index: store.currentStepIndex, count: store.questionStepCount, step: store.currentStepData,
      sceneTitle: store.scene?.title, locked: store.inputLocked }
  })
}

async function answerCurrent(page, sleep) {
  const state = await readStep(page)
  const option = state.step?.options.find((item) => item.is_correct)
  if (!option) throw new Error('当前场景问题没有可演示的正确选项')
  const card = page.locator('.image-option-card, .text-option-card').filter({ hasText: option.content }).first()
  const previousQuestion = (await page.locator('.question-title').innerText()).trim()
  await card.hover()
  await sleep(1600)
  await card.click()
  choices.push({ stepIndex: state.index, stepType: state.step.step_type, selectedLabel: option.content })
  await page.waitForFunction((previousQuestion) => {
    const title = document.querySelector('.question-title')?.textContent?.trim()
    return Boolean(document.querySelector('.result-step')) || Boolean(title && title !== previousQuestion)
  }, previousQuestion, { timeout: 20000 })
  await page.waitForFunction(() => !document.querySelector('.training-main.is-transitioning'))
  await sleep(1000)
}

export async function verifyEmotionScene(page, studentId, output) {
  const saved = await page.evaluate(({ id, studentId }) => {
    const session = window.db.get('SELECT * FROM emotional_training_session WHERE training_record_id = ?', [id])
    return {
      record: window.db.get('SELECT * FROM training_records WHERE id = ?', [id]), session,
      unified: window.db.get("SELECT * FROM training_session WHERE source_table = 'training_records' AND source_record_id = ?", [id]),
      details: window.db.all('SELECT step_index, step_type, selected_label, is_correct, hint_level, retry_count FROM emotional_training_detail WHERE session_id = ? ORDER BY step_index', [session?.id || 0]),
      records: window.db.get('SELECT count(*) AS n FROM training_records WHERE student_id = ?', [studentId]).n,
      sessions: window.db.get('SELECT count(*) AS n FROM emotional_training_session WHERE student_id = ?', [studentId]).n,
    }
  }, { id: trainingRecordId, studentId })
  if (saved.record?.student_id !== studentId || saved.record.resource_id !== resourceId || saved.record.resource_type !== 'emotion_scene'
    || saved.session?.sub_module !== 'emotion_scene' || saved.session.completion_status !== 'completed'
    || saved.session.question_count !== questionCount || saved.session.correct_count !== questionCount
    || saved.session.hint_count !== 0 || saved.session.retry_count !== 0 || saved.details.length !== questionCount
    || saved.details.some((item, index) => item.is_correct !== 1 || item.selected_label !== choices[index]?.selectedLabel)
    || saved.unified?.completion_status !== 'completed' || saved.unified.student_id !== studentId
    || saved.records !== baseline.records + 1 || saved.sessions !== baseline.sessions + 1) throw new Error('情绪场景作答、保存与统一场次核验失败')
  const evidence = { studentId, sceneTitle, resourceId, trainingRecordId, emotionalSessionId: saved.session.id,
    unifiedSessionId: saved.unified.id, questionCount, correctCount: saved.session.correct_count,
    hintCount: saved.session.hint_count, retryCount: saved.session.retry_count, durationMs: saved.session.duration_ms,
    choices, details: saved.details, recordsBefore: baseline.records, recordsAfter: saved.records,
    sessionsBefore: baseline.sessions, sessionsAfter: saved.sessions, reloaded: true, verified: true }
  fs.writeFileSync(path.join(output, 'emotion-scene-verification.json'), JSON.stringify(evidence, null, 2), 'utf8')
  return evidence
}

export function buildEmotionSceneScenes({ showCard, hideCard, sleep, studentId, output }) {
  return [
    {
      id: '01-title',
      narration: '星愿能力发展平台。软件操作教程第十七讲：情绪与场景训练及记录回查。本节演示选择学生和生活场景、按题目完成选择、确认保存，再回查本次记录。全部选择都是虚构流程演示。',
      caption: '软件操作教程 17\n情绪与场景训练及记录回查',
      async act(page) {
        choices = []
        baseline = await page.evaluate((id) => ({
          records: window.db.get('SELECT count(*) AS n FROM training_records WHERE student_id = ?', [id]).n,
          sessions: window.db.get('SELECT count(*) AS n FROM emotional_training_session WHERE student_id = ?', [id]).n,
        }), studentId)
        await showCard(page, '软件操作教程 17', '选择场景 · 逐步作答 · 保存与回查')
        await sleep(4500)
      },
    },
    {
      id: '02-entry',
      narration: '从左侧情绪调节入口，选择情绪与场景。这里练习观察人物情绪和生活线索，与调节小游戏不同。选择演示生甲，先核对姓名，保证本次训练写入正确档案。',
      caption: '情绪调节 → 情绪与场景 → 选择学生\n本次选择演示生甲',
      async act(page) {
        await hideCard(page)
        await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^情绪调节$/u }).click()
        await page.locator('.module-card').filter({ hasText: '情绪与场景' }).click()
        await page.getByPlaceholder('搜索学生姓名或学号').fill('演示生甲')
        const row = page.locator('.el-table__row').filter({ hasText: '演示生甲' })
        await row.waitFor()
        await sleep(2200)
        await row.getByRole('button', { name: '选择', exact: true }).click()
        await page.locator('.scene-card').first().waitFor()
        await sleep(2000)
      },
    },
    {
      id: '03-scene',
      narration: '场景列表可以按年龄、场域和主题筛选。本例选择幼儿园绘本角安静看书。先看场景说明、难度与适用范围，再进入训练。实际安排应结合学生当前需要，不能只按标签决定。',
      caption: '查看场景说明、难度与适用标签\n本例：幼儿园绘本角安静看书',
      async act(page) {
        const card = page.locator('.scene-card').filter({ has: page.getByRole('heading', { name: sceneTitle, exact: true }) })
        await card.scrollIntoViewIfNeeded()
        await card.hover()
        await sleep(3000)
        await card.click()
        await page.locator('.intro-step').waitFor()
        resourceId = Number(new URL(page.url().split('#')[1], 'http://demo').searchParams.get('resourceId'))
        const state = await readStep(page)
        questionCount = state.count
        if (state.sceneTitle !== sceneTitle || !resourceId || questionCount <= 0) throw new Error('场景、资源或题目加载失败')
        await sleep(2000)
      },
    },
    {
      id: '04-prepare',
      narration: '进入沉浸式训练后，先观察背景人物和场景，阅读教学目标。准备好后点击我准备好了。顶部显示当前场景和步骤进度，右上角可退出。作答前先留出观察和理解的时间。',
      caption: '观察场景与目标 → 我准备好了\n查看当前场景、题目及步骤进度',
      async act(page) {
        await page.locator('.intro-description').hover()
        await sleep(3500)
        await page.getByRole('button', { name: '我准备好了', exact: true }).click()
        await page.locator('.image-option-card').first().waitFor()
        await sleep(3000)
      },
    },
    {
      id: '05-emotion',
      narration: '第一步按画面和问题选择人物的情绪。点击选项后，系统给出反馈，再进入下一步。本例演示选择平静。不要把演示答案当作真实学生的表现，也不要替学生预先确定答案。',
      caption: '观察人物与问题 → 选择情绪 → 查看反馈\n本例演示选择“平静”',
      async act(page) {
        await answerCurrent(page, sleep)
        await sleep(3500)
      },
    },
    {
      id: '06-continue',
      narration: '后续按页面问题继续选择，逐步观察相关线索、理解原因和回应方式。每一步先阅读问题，再作答。本段连续展示后续操作，只说明软件流程，不代表实际训练应采用相同速度。',
      caption: '按当前场景问题逐步作答\n连续操作仅为流程演示，不代表训练速度',
      async act(page) {
        for (let index = 1; index < questionCount; index++) await answerCurrent(page, sleep)
        await page.locator('.result-step').waitFor()
        await sleep(3000)
      },
    },
    {
      id: '07-save',
      narration: '完成后，先确认记录状态显示已保存，再决定返回或再练一次。星级是本次软件练习的反馈，不能当作临床结论或实际能力等级。本节返回场景选择，随后查看刚才保存的记录。',
      caption: '完成页：确认记录状态“已保存”\n星级是本次练习反馈，不等于能力或诊断结论',
      async act(page) {
        await page.locator('.result-step .meta-card').filter({ hasText: '记录状态' }).getByText('已保存', { exact: true }).waitFor()
        trainingRecordId = await page.evaluate((id) => window.db.get("SELECT max(id) AS id FROM training_records WHERE student_id = ? AND resource_type = 'emotion_scene'", [id]).id, studentId)
        await sleep(4500)
        await page.getByRole('button', { name: '返回场景选择', exact: true }).click()
        await page.locator('.scene-card').first().waitFor()
        await sleep(1500)
      },
    },
    {
      id: '08-recall',
      narration: '从训练记录进入情绪调节，按学生筛选，找到本次场景，核对学生、任务和时间，再查看详情。当前摘要页展示简要结果。重新载入后再次回查，确认记录仍然存在；需要综合回顾时，可再查看模块报告。',
      caption: '训练记录 → 情绪调节 → 筛选学生 → 查看详情\n先核对列表任务与时间，再重载回查摘要',
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
        if (id !== trainingRecordId) throw new Error('回查摘要不是本次场景记录')
        await sleep(3000)
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.locator('.summary-wrap').waitFor()
        await verifyEmotionScene(page, studentId, output)
        await sleep(3500)
      },
    },
    {
      id: '09-end',
      narration: '本节完成。先选对学生和场景，再观察、作答，完成后确认保存，最后按学生和任务回查。不同学生的安排和表现应分别记录，软件反馈需要结合现场观察理解。',
      caption: '本节完成\n选择场景 · 逐步作答 · 保存与回查',
      async act(page) {
        await showCard(page, '本节完成', '选择场景 · 逐步作答 · 保存与回查')
        await sleep(4500)
      },
    },
  ]
}
