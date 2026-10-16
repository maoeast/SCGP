/** 教程 20：自定义关心情境配置、重载回查与真实训练试用。 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
const title = '演示情境：玩具坏了'
const code = 'video20_care_toy'
const description = '小明喜欢的玩具坏了。观察他的感受，练习表达理解，并从对方角度思考回应。'
const question = '如果你要对小明说一句关心的话，你会怎么说？'
const emotions = ['伤心/心碎', '平静', '开心', '生气']
const emotionFeedback = ['玩具坏了，小明现在感到难过。', '请再观察小明的表情和发生的事情。', '请再看看玩具的状态和小明的感受。', '请结合情境，想想小明此刻更接近哪种感受。']
const utterances = [
  { text: '玩具坏了，你现在一定很难过。', effect: '先表达理解，让对方感到自己的难过被听见。', reaction: '谢谢你理解我。' },
  { text: '我们可以看看能不能修好它。', effect: '提出一个可能的办法，也要留意对方是否想听建议。', reaction: '我想先难过一会儿，再想办法。' },
  { text: '你愿意让我陪你坐一会儿吗？', effect: '先询问是否需要陪伴，尊重对方的选择。', reaction: '我愿意，谢谢你陪着我。' },
]
const receivers = [
  { text: '朋友理解我的难过，也愿意听我说。', reason: '我的感受被理解，可以按自己的节奏表达。' },
  { text: '朋友催我马上别难过了。', reason: '催促可能让我觉得自己的感受没有被听见。' },
]
let resourceId = -1
let baseline, imageUrl, runtime
let reloaded = false
let feedbackSeen = false
export async function verifyPresetEmotionEdit(page, output) {
  const resourceId = 137
  const before = await page.evaluate((id) => window.db.get('SELECT id, name, description, legacy_source, is_custom, meta_data FROM sys_training_resource WHERE id = ?', [id]), resourceId)
  if (!before || before.is_custom !== 0) throw new Error('未找到待核验的预置情绪资源')
  const revisedDescription = `${before.description || ''}。演示核验：保存后重载仍保留。`
  await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^资源管理$/u }).click()
  await page.getByRole('tab', { name: '训练资源', exact: true }).click()
  await page.locator('.training-resources .el-radio-button').filter({ hasText: /^情绪行为$/u }).click()
  await page.getByPlaceholder('搜索资源名称...').fill(before.name)
  const row = page.locator('.resource-table .el-table__row').filter({ hasText: before.name }).first()
  await row.waitFor()
  await row.getByRole('button', { name: '编辑', exact: true }).click()
  const dialog = page.locator('.el-dialog:visible').filter({ hasText: '编辑资源' })
  await dialog.waitFor()
  await dialog.getByPlaceholder('请输入资源描述').fill(revisedDescription)
  await dialog.getByRole('button', { name: '保存修改', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  await page.waitForTimeout(2500)
  const saved = await page.evaluate((id) => window.db.get('SELECT description, legacy_source, meta_data FROM sys_training_resource WHERE id = ?', [id]), resourceId)
  if (saved?.description !== revisedDescription || saved.legacy_source !== 'emotional_user_edited') throw new Error('预置情绪资源编辑未写入持久化标记')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean(window.db))
  const after = await page.evaluate((id) => window.db.get('SELECT description, legacy_source, meta_data FROM sys_training_resource WHERE id = ?', [id]), resourceId)
  if (after?.description !== revisedDescription || after.legacy_source !== 'emotional_user_edited' || after.meta_data !== saved.meta_data) throw new Error('预置情绪资源重载后被种子覆盖')
  fs.writeFileSync(path.join(output, 'preset-emotion-edit-verification.json'), JSON.stringify({ resourceId, name: before.name, originalDescription: before.description, revisedDescription,
    originalLegacySource: before.legacy_source, saved, after, reloaded: true, verified: true }, null, 2), 'utf8')
  await page.screenshot({ path: path.join(output, 'preset-emotion-edit-verification.png') })
  console.log('预置情绪资源真实编辑、保存和重载通过')
}
export async function verifyCustomEmotionResource(page, studentId, output) {
  const sceneCode = 'v10_custom_puzzle_happy'
  const sceneTitle = '演示情绪场景：完成拼图'
  const description = '小明完成拼图后笑了。观察他的表情，再选择合适的回应。'
  const baseline = await page.evaluate((id) => ({
    resources: window.db.get('SELECT count(*) AS n FROM sys_training_resource').n,
    records: window.db.get('SELECT count(*) AS n FROM training_records WHERE student_id = ?', [id]).n,
    sessions: window.db.get('SELECT count(*) AS n FROM emotional_training_session WHERE student_id = ?', [id]).n,
    imageUrl: JSON.parse(window.db.get('SELECT meta_data FROM sys_training_resource WHERE id = 137').meta_data).imageUrl,
  }), studentId)
  await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^资源管理$/u }).click()
  await page.getByRole('tab', { name: '训练资源', exact: true }).click()
  await page.locator('.training-resources .el-radio-button').filter({ hasText: /^情绪行为$/u }).click()
  await page.getByRole('button', { name: '新建资源', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '新建资源', exact: true })
  await dialog.waitFor()
  const field = (label) => dialog.locator('.el-form-item').filter({ has: page.locator('.el-form-item__label').filter({ hasText: new RegExp(`^${label}$`, 'u') }) })
  await field('资源类型').locator('.el-select').click()
  await page.locator('.el-select-dropdown__item:visible').filter({ hasText: /^情绪场景$/u }).click()
  await dialog.getByPlaceholder('请输入资源名称').fill(sceneTitle)
  await field('所属分类').locator('.el-select').click()
  await page.locator('.el-select-dropdown__item:visible').filter({ hasText: /^学校情境$/u }).click()
  await dialog.getByPlaceholder('请输入资源描述（可选）').fill(description)
  const editor = dialog.locator('.emotion-editor')
  await editor.getByPlaceholder('例如 emotion_scene_birthday_001').fill(sceneCode)
  await editor.locator('.el-form-item').filter({ hasText: '场景标题' }).locator('input').fill(sceneTitle)
  await editor.getByPlaceholder('resource:// 或封面图路径').fill(baseline.imageUrl)
  await editor.getByPlaceholder('线索 1').fill('小明笑着看完成的拼图')
  await editor.getByPlaceholder('线索 2').fill('他把拼好的图举起来给同伴看')
  const prompt = editor.locator('.nested-card').first()
  await prompt.getByPlaceholder('请输入问题内容，例如：他为什么会这样？').fill('小明为什么开心？')
  await prompt.getByPlaceholder('请输入选项文字').nth(0).fill('他完成了喜欢的拼图')
  await prompt.getByPlaceholder('请输入选项文字').nth(1).fill('拼图突然不见了')
  await prompt.getByPlaceholder('学生选择该项后展示的温和反馈').nth(0).fill('对，他完成了拼图。')
  await prompt.getByPlaceholder('学生选择该项后展示的温和反馈').nth(1).fill('再看看拼图和小明的表情。')
  const solutions = editor.locator('.nested-card').filter({ has: page.getByPlaceholder('请输入应对方案内容') })
  await solutions.nth(0).getByPlaceholder('请输入应对方案内容').fill('和他一起欣赏拼图')
  await solutions.nth(0).getByPlaceholder('说明为什么这样回应更好或更不合适').fill('回应他的开心，也尊重他的作品。')
  await solutions.nth(1).getByPlaceholder('请输入应对方案内容').fill('马上把拼图拆掉')
  await solutions.nth(1).getByPlaceholder('说明为什么这样回应更好或更不合适').fill('这会打断他分享完成作品的喜悦。')
  await dialog.getByRole('button', { name: '创建资源', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  const resource = await page.evaluate((code) => window.db.get("SELECT * FROM sys_training_resource WHERE json_extract(meta_data, '$.sceneCode') = ?", [code]), sceneCode)
  if (!resource || resource.is_custom !== 1 || resource.resource_type !== 'emotion_scene') throw new Error('自定义情绪场景未通过真实界面保存')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean(window.db))
  const reloaded = await page.evaluate((id) => window.db.get('SELECT * FROM sys_training_resource WHERE id = ?', [id]), resource.id)
  if (!reloaded || reloaded.meta_data !== resource.meta_data || reloaded.description !== description) throw new Error('自定义情绪场景重载后配置丢失')
  await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^情绪调节$/u }).click()
  await page.locator('.module-card').filter({ hasText: '情绪与场景' }).click()
  await page.getByPlaceholder('搜索学生姓名或学号').fill('演示生甲')
  await page.locator('.el-table__row').filter({ hasText: '演示生甲' }).getByRole('button', { name: '选择', exact: true }).click()
  const card = page.locator('.scene-card').filter({ has: page.getByRole('heading', { name: sceneTitle, exact: true }) })
  await card.waitFor()
  await card.click()
  await page.locator('.intro-step').waitFor()
  const intro = await page.locator('.intro-description').innerText()
  if (!intro.includes(description)) throw new Error('自定义情绪场景训练页未显示最终描述')
  await page.getByRole('button', { name: '我准备好了', exact: true }).click()
  await page.locator('.image-option-card, .text-option-card').first().waitFor()
  const choices = []
  for (let index = 0; index < 3; index++) {
    const state = await page.evaluate(async () => {
      const { useTrainingStore } = await import('/src/stores/useTrainingStore.ts')
      const store = useTrainingStore()
      return { code: store.scene?.scene_code, count: store.questionStepCount, step: store.currentStepData }
    })
    if (state.code !== sceneCode || state.count !== 3) throw new Error('自定义情绪场景未按业务资源加载三步')
    const option = state.step?.options.find((item) => item.is_correct)
    if (!option) throw new Error(`自定义情绪场景第 ${index + 1} 步缺少正确选项：${JSON.stringify(state)}`)
    const previousQuestion = (await page.locator('.question-title').innerText()).trim()
    await page.locator('.image-option-card, .text-option-card').filter({ hasText: option.content }).first().click()
    choices.push(option.content)
    await page.waitForFunction((previous) => Boolean(document.querySelector('.result-step')) || Boolean(document.querySelector('.question-title')?.textContent?.trim() && document.querySelector('.question-title')?.textContent?.trim() !== previous), previousQuestion)
    await page.waitForFunction(() => !document.querySelector('.training-main.is-transitioning'))
  }
  await page.locator('.result-step .meta-card').filter({ hasText: '记录状态' }).getByText('已保存', { exact: true }).waitFor()
  const result = await page.evaluate(({ studentId, resourceId }) => {
    const record = window.db.get("SELECT * FROM training_records WHERE student_id = ? AND resource_id = ? AND resource_type = 'emotion_scene' ORDER BY id DESC LIMIT 1", [studentId, resourceId])
    const session = window.db.get('SELECT * FROM emotional_training_session WHERE training_record_id = ?', [record?.id || 0])
    return { record, session, details: window.db.all('SELECT * FROM emotional_training_detail WHERE session_id = ? ORDER BY step_index', [session?.id || 0]),
      unified: window.db.get("SELECT * FROM training_session WHERE source_table = 'training_records' AND source_record_id = ?", [record?.id || 0]),
      resources: window.db.get('SELECT count(*) AS n FROM sys_training_resource').n,
      records: window.db.get('SELECT count(*) AS n FROM training_records WHERE student_id = ?', [studentId]).n,
      sessions: window.db.get('SELECT count(*) AS n FROM emotional_training_session WHERE student_id = ?', [studentId]).n }
  }, { studentId, resourceId: resource.id })
  if (result.session?.correct_count !== 3 || result.details.length !== 3 || result.details.some((item, i) => item.is_correct !== 1 || item.selected_label !== choices[i])
    || result.unified?.completion_status !== 'completed' || result.resources !== baseline.resources + 1 || result.records !== baseline.records + 1 || result.sessions !== baseline.sessions + 1) throw new Error('自定义情绪场景整轮作答或保存不一致')
  await page.getByRole('button', { name: '返回场景选择', exact: true }).click()
  await page.locator('.scene-card').first().waitFor()
  await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^训练记录$/u }).click()
  await page.locator('.module-card').filter({ hasText: '情绪调节' }).click()
  await page.locator('.student-filter').click()
  await page.locator('.el-select-dropdown__item:visible').filter({ hasText: /^演示生甲$/u }).click()
  const row = page.locator('.records-table .el-table__row').filter({ hasText: sceneTitle }).first()
  await row.waitFor()
  await row.getByRole('button', { name: '查看详情', exact: true }).click()
  await page.locator('.summary-wrap').waitFor()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('.summary-wrap').waitFor()
  if (!page.url().includes(`trainingRecordId=${result.record.id}`)) throw new Error('自定义情绪场景回查未指向本次记录')
  fs.writeFileSync(path.join(output, 'custom-emotion-scene-verification.json'), JSON.stringify({ studentId, resourceId: resource.id, sceneCode, sceneTitle,
    recordId: result.record.id, sessionId: result.session.id, unifiedSessionId: result.unified.id, choices, baseline, countsAfter: { resources: result.resources, records: result.records, sessions: result.sessions },
    savedMetadata: JSON.parse(reloaded.meta_data), reloaded: true, verified: true }, null, 2), 'utf8')
  await page.screenshot({ path: path.join(output, 'custom-emotion-scene-recall.png') })
  console.log('自定义情绪场景真实新建、整轮训练、保存和重载回查通过')
}
async function snapshot(page) {
  return page.evaluate((id) => ({
    resource: window.db.get('SELECT * FROM sys_training_resource WHERE id = ?', [id]),
    others: window.db.all('SELECT id,module_code,resource_type,name,category,description,cover_image,is_custom,is_active,meta_data FROM sys_training_resource WHERE id != ? ORDER BY id', [id]),
    counts: Object.fromEntries(['sys_training_resource', 'training_records', 'training_session', 'emotional_training_session', 'emotional_training_detail', 'report_record'].map((table) => [table, window.db.get(`SELECT count(*) AS n FROM ${table}`).n])),
  }), resourceId)
}
export async function verifySceneEditor(page, output) {
  const saved = await snapshot(page)
  const meta = JSON.parse(saved.resource?.meta_data || '{}')
  const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
  const previous = new Map(baseline.others.map((r) => [r.id, r]))
  const startupChanges = saved.others.filter((r) => JSON.stringify(r) !== JSON.stringify(previous.get(r.id))).map((r) => ({ id: r.id, name: r.name, fields: Object.keys(r).filter((key) => r[key] !== previous.get(r.id)?.[key]) }))
  if (!reloaded || !feedbackSeen || !runtime || saved.resource.name !== title || saved.resource.resource_type !== 'care_scene'
    || saved.resource.is_custom !== 1 || saved.resource.description !== description || meta.sceneCode !== code
    || meta.name !== '小明' || meta.specificEmotionLabel !== emotions[0] || meta.receiverEmotion !== 'sad' || meta.imageUrl !== imageUrl
    || meta.emotionOptions.length !== 4 || meta.emotionOptions.some((o, i) => o.text !== emotions[i] || o.feedbackText !== emotionFeedback[i] || o.isCorrect !== (i === 0))
    || meta.utterances.length !== 3 || meta.utterances.some((o, i) => o.text !== utterances[i].text || o.effect !== utterances[i].effect || o.receiverReactionText !== utterances[i].reaction || meta.preferredUtteranceIds.includes(o.id) !== (i !== 1))
    || !meta.emotionChips?.includes(emotions[0]) || meta.emotionChips.some((chip) => chip.includes('请填写'))
    || !meta.comfortTip?.includes('小明') || !meta.generatedFieldsInputSignature
    || meta.receiverOptions.length !== 2 || meta.receiverOptions.some((o, i) => o.text !== receivers[i].text || o.reasonText !== receivers[i].reason || o.isComforting !== (i === 0))
    || JSON.stringify(saved.counts) !== JSON.stringify({ ...baseline.counts, sys_training_resource: baseline.counts.sys_training_resource + 1 })) throw new Error('自定义关心情境保存、回查、试用或业务数据核验失败')
  fs.writeFileSync(path.join(output, 'scene-editor-verification.json'), JSON.stringify({ resourceId, title, code,
    saved: { name: saved.resource.name, description: saved.resource.description, category: saved.resource.category, isCustom: saved.resource.is_custom, metadata: meta },
    countsBefore: baseline.counts, countsAfter: saved.counts, otherResourcesBeforeSha256: hash(baseline.others), otherResourcesAfterSha256: hash(saved.others), startupChanges, runtime, reloaded, feedbackSeen, previewExited: true, verified: true }, null, 2), 'utf8')
}
export function buildSceneEditorScenes({ showCard, hideCard, sleep, output }) {
  const createBox = (page) => page.getByRole('dialog', { name: '新建资源', exact: true })
  const editBox = (page) => page.getByRole('dialog', { name: '编辑资源', exact: true })
  const editor = (page) => page.locator('.el-dialog:visible .care-editor')
  const section = (page, label) => editor(page).locator('.editor-card').filter({ has: page.locator('.card-header > span').filter({ hasText: new RegExp(`^${label}$`, 'u') }) })
  const field = (scope, label) => scope.locator('.el-form-item').filter({ has: scope.page().locator('.el-form-item__label').filter({ hasText: new RegExp(`^${label}$`, 'u') }) })
  async function fill(locator, value) { await locator.scrollIntoViewIfNeeded(); await locator.fill(value); await sleep(650) }
  async function choose(page, scope, label, value) {
    const select = field(scope, label).locator('.el-select'); await select.scrollIntoViewIfNeeded(); await select.click()
    await page.locator('.el-select-dropdown__item:visible').filter({ hasText: new RegExp(`^${value}$`, 'u') }).click()
  }
  async function openCenter(page) {
    await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^资源管理$/u }).click()
    await page.getByRole('tab', { name: '训练资源', exact: true }).click()
    await page.locator('.training-resources .el-radio-button').filter({ hasText: /^情绪行为$/u }).click()
  }
  async function state(page) {
    return page.evaluate(async () => {
      const { useTrainingStore } = await import('/src/stores/useTrainingStore.ts'); const store = useTrainingStore()
      return { index: store.currentStepIndex, count: store.questionStepCount, title: store.scene?.title, description: store.scene?.description, step: store.currentStepData }
    })
  }
  return [
    { id: '01-title', narration: '星愿能力发展平台。软件操作教程第二十讲：自定义关心情境与试用。本节用管理员账号，新建一份表达关心资源，配置感受选项、关心话语和接收者视角，保存回查，再进入训练检查。', caption: '软件操作教程 20\n自定义关心情境与试用', async act(page) {
      resourceId = -1; baseline = await snapshot(page)
      imageUrl = await page.evaluate(() => JSON.parse(window.db.get('SELECT meta_data FROM sys_training_resource WHERE id = 218').meta_data).imageUrl)
      if (!imageUrl) throw new Error('已有演示图片路径缺失')
      await showCard(page, '软件操作教程 20', '自定义关心情境 · 保存回查 · 实际试用'); await sleep(5000); await hideCard(page)
    } },
    { id: '02-find', narration: '进入资源管理、训练资源，选择情绪行为，点击新建资源，类型选择表达关心。填写资源名称和所属分类。本例创建独立的自定义情境，便于后续从编辑入口维护。', caption: '资源管理 → 训练资源 → 情绪行为 → 新建资源\n资源类型选择“表达关心”，填写名称与分类', async act(page) {
      await openCenter(page); await page.getByRole('button', { name: '新建资源', exact: true }).click(); await createBox(page).waitFor()
      await choose(page, createBox(page), '资源类型', '表达关心')
      await fill(createBox(page).getByPlaceholder('请输入资源名称'), title)
      await choose(page, createBox(page), '所属分类', '同伴支持'); await sleep(1500)
    } },
    { id: '03-basics', narration: '先填写唯一的场景编码、情境标题和图片路径。本例复用已有演示图片，围绕小明的玩具坏了来配置。再填写被关心对象、细分情绪、教学目标，以及表达者和接收者的视角提示，替换默认占位文字。', caption: '基础信息：编码、标题、图片、对象、情绪与教学目标\n填写两种视角提示，替换默认占位文字', async act(page) {
      await fill(editor(page).getByPlaceholder('例如 care_scene_exam_fail_001'), code)
      await fill(field(editor(page), '情境标题').locator('input'), title)
      await fill(editor(page).getByPlaceholder('resource:// 或封面图路径'), imageUrl)
      await fill(editor(page).getByPlaceholder('例如：小明、妈妈、老师'), '小明')
      await fill(editor(page).getByPlaceholder('例如：伤心/心碎、极度疲惫'), emotions[0])
      await fill(editor(page).getByPlaceholder('例如：heartbroken'), 'heartbroken')
      await fill(editor(page).getByPlaceholder('请输入本关训练目标、教师提示或行为理解说明'), description)
      await fill(editor(page).getByPlaceholder('请输入表达者视角引导语'), '看到小明的玩具坏了，你会怎样表达关心？')
      await fill(editor(page).getByPlaceholder('请输入接收者视角引导语'), '如果你是小明，你希望朋友怎样回应？'); await sleep(2000)
    } },
    { id: '04-question', narration: '在情绪识别配置中，填写四个感受选项和各自的反馈。本例将伤心、心碎设为当前情境的正确选项，其他选项提供再次观察的提示。这些是情境练习配置，不能作为对真实感受的固定判断。', caption: '情绪识别配置：四个选项及各自反馈\n核对正确项，示例配置不是现实感受的固定标准', async act(page) {
      const cards = section(page, '情绪识别配置').locator('.nested-card')
      for (let i = 0; i < emotions.length; i++) {
        await fill(cards.nth(i).getByPlaceholder('例如：伤心/心碎'), emotions[i])
        await fill(cards.nth(i).getByPlaceholder('学生点这个选项后要看到的反馈'), emotionFeedback[i])
      }
      await sleep(2000)
    } },
    { id: '05-feedback', narration: '表达者视角中，分别配置共情、建议和行动的话语、效果说明与接收者反应。本例把理解感受、询问是否需要陪伴设为推荐话术。关心可以有多种方式，实际沟通仍要了解对方的需要。', caption: '表达者视角：话语、效果说明、接收者反应\n核对推荐话术，实际沟通需了解对方需要', async act(page) {
      const cards = section(page, '表达者视角配置').locator('.nested-card')
      for (let i = 0; i < utterances.length; i++) {
        const card = cards.nth(i)
        await fill(card.getByPlaceholder('请输入老师希望学生练习的话术'), utterances[i].text)
        await fill(card.getByPlaceholder('说明这句话会让对方有什么感受'), utterances[i].effect)
        await fill(card.getByPlaceholder('例如：听到后会觉得被理解'), utterances[i].reaction)
        const checkbox = card.getByRole('checkbox', { name: '推荐话术', exact: true })
        if (await checkbox.isChecked() !== (i !== 1)) await card.locator('.el-checkbox').filter({ hasText: '推荐话术' }).click()
      }
      await sleep(2300)
    } },
    { id: '06-solution', narration: '接收者视角中，填写希望收到的回应与原因解释，再核对是否最舒服。本例选择理解与倾听，另一个选项说明催促带来的压力。填写完所有选项后，再检查是否还有未完成项。', caption: '接收者视角：回应、原因解释与“是否最舒服”\n核对全部选项，检查未完成项', async act(page) {
      const cards = section(page, '接收者视角配置').locator('.nested-card')
      for (let i = 0; i < receivers.length; i++) {
        await fill(cards.nth(i).getByPlaceholder('请输入接收者视角下听到的话'), receivers[i].text)
        await fill(cards.nth(i).getByPlaceholder('说明为什么这句话听起来更舒服或更有压力'), receivers[i].reason)
      }
      await sleep(2300)
    } },
    { id: '07-save', narration: '点击创建资源，等待保存，再重新载入页面。搜索刚才的自定义情境，打开编辑，核对教学目标、感受选项和话语都已保留。资源配置保存成功后，还需要进入训练页实际检查。', caption: '创建资源 → 等待保存 → 重载 → 搜索 → 编辑回查\n核对教学目标与话语，再进入训练检查', async act(page) {
      await createBox(page).getByRole('button', { name: '创建资源', exact: true }).scrollIntoViewIfNeeded(); await sleep(1500)
      await createBox(page).getByRole('button', { name: '创建资源', exact: true }).click(); await createBox(page).waitFor({ state: 'hidden' })
      resourceId = await page.evaluate((name) => window.db.get('SELECT id FROM sys_training_resource WHERE name = ? AND is_custom = 1', [name])?.id, title)
      if (!resourceId) throw new Error('自定义关心情境未创建')
      await sleep(3000); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => Boolean(window.db)); await openCenter(page)
      await page.getByPlaceholder('搜索资源名称...').fill(title)
      const row = page.locator('.resource-table .el-table__row').filter({ hasText: title }); await row.waitFor()
      await row.getByRole('button', { name: '编辑', exact: true }).click(); await editBox(page).waitFor()
      const input = editor(page).getByPlaceholder('请输入本关训练目标、教师提示或行为理解说明'); await input.scrollIntoViewIfNeeded()
      if (await input.inputValue() !== description) throw new Error('自定义关心情境重载后目标未保留')
      const text = section(page, '表达者视角配置').locator('.nested-card').first().getByPlaceholder('请输入老师希望学生练习的话术'); await text.scrollIntoViewIfNeeded()
      if (await text.inputValue() !== utterances[0].text) throw new Error('自定义话语重载后未保留')
      reloaded = true; await sleep(2500)
      await editBox(page).getByRole('button', { name: '取消', exact: true }).click(); await editBox(page).waitFor({ state: 'hidden' })
    } },
    { id: '08-try', narration: '从情绪调节进入表达关心，选择演示生甲，再打开刚才创建的情境。先核对教学目标和根据最终配置生成的关心提示，再试选第一题，确认第二步显示了自己填写的关心话语。', caption: '进入自定义情境，核对目标与自动生成的提示\n试选感受与关心话语', async act(page) {
      await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^情绪调节$/u }).click()
      await page.locator('.module-card').filter({ hasText: '表达关心' }).click()
      await page.getByPlaceholder('搜索学生姓名或学号').fill('演示生甲')
      await page.locator('.el-table__row').filter({ hasText: '演示生甲' }).getByRole('button', { name: '选择', exact: true }).click()
      const card = page.locator('.scene-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
      await card.scrollIntoViewIfNeeded(); await sleep(1500); await card.click(); await page.locator('.intro-step').waitFor()
      const persistedMeta = await page.evaluate((id) => JSON.parse(window.db.get('SELECT meta_data FROM sys_training_resource WHERE id = ?', [id]).meta_data), resourceId)
      const introText = await page.locator('.intro-description').innerText()
      const compiledFields = await page.evaluate(async () => {
        const { useTrainingStore } = await import('/src/stores/useTrainingStore.ts')
        const store = useTrainingStore()
        return { description: store.scene?.description, chips: store.steps[0]?.options[0]?.metadata?.emotion_chips, tip: store.steps[0]?.options[0]?.metadata?.comfort_tip }
      })
      if (!introText.includes(description) || !introText.includes(persistedMeta.comfortTip)
        || !compiledFields.description?.includes(persistedMeta.comfortTip)
        || !compiledFields.chips?.includes(emotions[0]) || compiledFields.tip !== persistedMeta.comfortTip) throw new Error('实际训练未加载最终生成的关心提示')
      await page.screenshot({ path: path.join(output, 'v11-generated-prompt-ui.png') })
      await sleep(2500); await page.getByRole('button', { name: '我准备好了', exact: true }).click()
      await page.locator('.image-option-card').first().waitFor(); await sleep(1800)
      await page.locator('.image-option-card').filter({ hasText: emotions[0] }).first().click()
      await page.waitForFunction((text) => document.querySelector('.question-title')?.textContent?.trim() === text, question, { timeout: 20000 })
      await page.waitForFunction(() => !document.querySelector('.training-main.is-transitioning')); runtime = await state(page)
      if (runtime.count !== 3 || runtime.title !== title || !runtime.step.options.some((o) => o.is_correct && o.content === utterances[0].text && o.feedback_text.includes(utterances[0].reaction))) throw new Error('实际关心话语与配置不一致')
      await sleep(2500)
    } },
    { id: '09-exit', narration: '试选第一句关心的话，查看实际反馈。本次只检查前两步，没有完成整轮训练。结束检查时，点击右上角退出并确认，不把配置试用当作学生已经完成的一次训练。', caption: '试选关心话语 → 查看反馈 → 退出并确认\n本次只检查配置，未完成整轮训练', async act(page) {
      await page.locator('.text-option-card').filter({ hasText: utterances[0].text }).first().click()
      await page.getByText(utterances[0].reaction, { exact: false }).first().waitFor(); feedbackSeen = true
      await page.waitForFunction((text) => { const next = document.querySelector('.question-title')?.textContent?.trim(); return Boolean(next && next !== text) }, question, { timeout: 20000 })
      await page.waitForFunction(() => !document.querySelector('.training-main.is-transitioning'))
      await page.getByRole('button', { name: '退出训练', exact: true }).click(); await page.locator('.exit-card').waitFor(); await sleep(2000)
      await page.getByRole('button', { name: '确认退出', exact: true }).click(); await page.locator('.scene-card').first().waitFor()
      await verifySceneEditor(page, output); await sleep(2500)
    } },
    { id: '10-end', narration: '本节完成。新建自定义关心情境，填写对象与感受，配置两种视角，保存后回查并实际试用。确认显示与反馈符合预期后，再安排学生使用。', caption: '本节完成\n自定义关心情境 · 保存回查 · 实际试用', async act(page) {
      await showCard(page, '本节完成', '自定义关心情境 · 保存回查 · 实际试用'); await sleep(4500)
    } },
  ]
}
