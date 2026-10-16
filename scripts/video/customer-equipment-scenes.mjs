/** 教程 06：器材训练结果快速录入与档案回查。所有参数均为虚构流程示例。 */
const firstNote = '流程演示：在口头提示下参与活动，后段注意力有波动。'
const secondNote = '流程演示：加入视觉提示后继续参与活动。'
let baselineCount
let equipmentName
let firstId
let secondId

export async function verifyEquipmentRecording(page, studentId) {
  const result = await page.evaluate(({ studentId, notes }) => ({
    count: window.db.get('SELECT count(*) AS n FROM equipment_training_records WHERE student_id = ?', [studentId]).n,
    records: notes.map((note) => window.db.get('SELECT * FROM equipment_training_records WHERE student_id = ? AND notes = ? ORDER BY id DESC LIMIT 1', [studentId, note])),
  }), { studentId, notes: [firstNote, secondNote] })
  const [first, second] = result.records
  if (result.count !== baselineCount + 2 || !first || !second || first.equipment_id !== second.equipment_id
    || first.score !== 4 || first.prompt_level !== 2 || first.duration_seconds !== 300
    || second.score !== 3 || second.prompt_level !== 3 || second.duration_seconds !== 180
    || first.entry_code !== 'sensory-integration' || second.entry_code !== 'sensory-integration') {
    throw new Error('两次器材录入的评分、辅助等级、时长或训练入口未完整保存')
  }
  firstId = first.id
  secondId = second.id
  return result
}

export function buildEquipmentScenes({ showCard, hideCard, sleep, studentId }) {
  const form = (page) => page.locator('.form-section .el-form')
  async function chooseEquipment(page) {
    await page.locator('.resource-selector').getByPlaceholder('搜索...').fill(equipmentName)
    const resource = page.locator('.resource-item').filter({ has: page.getByText(equipmentName, { exact: true }) }).first()
    await resource.waitFor()
    await resource.hover()
    await sleep(1100)
    await resource.click()
    await form(page).waitFor()
  }
  async function durationAndNotes(page, minutes, notes) {
    const duration = form(page).getByRole('spinbutton')
    await duration.hover()
    await sleep(650)
    await duration.fill(String(minutes))
    await duration.press('Tab')
    const textarea = form(page).getByPlaceholder('记录训练过程中的观察、学生反应、调整策略等...')
    await textarea.hover()
    await sleep(650)
    await textarea.fill(notes)
    await sleep(1500)
  }
  return [
    {
      id: '01-title',
      narration: '星愿能力发展平台。软件操作教程第六讲：器材训练与快速录入。本节演示在线下训练后，用软件登记结果，再从学生档案回查。学生、评分和观察记录均为虚构示例。',
      caption: '软件操作教程 06\n器材训练与快速录入',
      async act(page) {
        await showCard(page, '软件操作教程 06', '选择器材 · 录入结果 · 保存与回查')
        await sleep(5000)
        await hideCard(page)
      },
    },
    {
      id: '02-entry-student',
      narration: '从左侧进入器材训练，选择感官统合训练。搜索演示生甲，核对学生后点击选择，即可进入快速录入页。训练入口和学生决定了这条记录的归属。',
      caption: '器材训练 → 感官统合训练 → 选择学生\n核对学生后进入快速录入页',
      async act(page) {
        await page.locator('.sidebar-nav .nav-item').filter({ hasText: '器材训练' }).first().click()
        const entry = page.locator('.module-card').filter({ hasText: '感官统合训练' })
        await entry.hover()
        await sleep(1600)
        await entry.click()
        await page.getByPlaceholder('搜索学生姓名或学号').fill('演示生甲')
        const row = page.locator('.el-table__row').filter({ hasText: '演示生甲' })
        await row.waitFor()
        await sleep(1700)
        await row.getByRole('button', { name: '选择', exact: true }).click()
        await page.locator('.resource-item').first().waitFor()
        baselineCount = await page.evaluate((id) => window.db.get('SELECT count(*) AS n FROM equipment_training_records WHERE student_id = ?', [id]).n, studentId)
        await sleep(1800)
      },
    },
    {
      id: '03-resource',
      narration: '左侧是当前入口下的器材目录，可以按分类筛选，也可以搜索名称。点击本次使用的器材，右侧出现它的图片、说明和录入表单。填写之前，核对当前学生与器材名称。',
      caption: '左侧搜索并选择器材，右侧填写结果\n先核对当前学生和器材名称',
      async act(page) {
        equipmentName = (await page.locator('.resource-item .resource-name').first().innerText()).trim()
        console.log(`本讲演示器材：${equipmentName}`)
        await page.locator('.resource-selector .category-select').hover()
        await sleep(1700)
        await chooseEquipment(page)
        await page.locator('.equipment-display').hover()
        await sleep(2500)
      },
    },
    {
      id: '04-score-support',
      narration: '训练评分和辅助等级需要分别填写。这里示例选择四分，再选择口头提示。评分反映本次表现，辅助等级记录完成活动时实际用到的支持。请根据真实观察填写，示例分数不是评分标准。',
      caption: '训练评分与辅助等级分别填写\n示例：4 分、口头提示；按实际观察记录',
      async act(page) {
        const star = form(page).locator('.el-rate__item').nth(3)
        await star.hover()
        await sleep(1200)
        await star.click()
        await form(page).getByText('口头提示', { exact: true }).hover()
        await sleep(1200)
        await form(page).getByText('口头提示', { exact: true }).click()
        await sleep(2600)
      },
    },
    {
      id: '05-duration-notes',
      narration: '接着填写本次训练时长，界面单位是分钟。本次示例填五分钟。备注可以记录使用了什么提示、学生如何回应，以及中途做过哪些调整，方便下次训练时回看。',
      caption: '训练时长单位：分钟\n备注记录提示、学生反应与调整过程',
      async act(page) {
        await durationAndNotes(page, 5, firstNote)
        await form(page).getByRole('button', { name: '保存记录', exact: true }).hover()
        await sleep(2000)
      },
    },
    {
      id: '06-save',
      narration: '核对后点击保存记录，看到录入成功提示，说明这次结果已保存。可以返回学生列表，也可以继续为该生录入。这里选择继续录入，保留同一名学生，再登记下一次示例结果。',
      caption: '保存记录 → 录入成功\n“继续为该生录入”保留当前学生',
      async act(page) {
        await form(page).getByRole('button', { name: '保存记录', exact: true }).click()
        const dialog = page.locator('.el-dialog:visible').filter({ hasText: '录入成功' })
        await dialog.waitFor()
        const saved = await page.evaluate(({ studentId, note }) => window.db.get('SELECT * FROM equipment_training_records WHERE student_id = ? AND notes = ?', [studentId, note]), { studentId, note: firstNote })
        if (!saved || saved.duration_seconds !== 300 || saved.score !== 4 || saved.prompt_level !== 2) throw new Error('首次录入未保存完整')
        firstId = saved.id
        await sleep(4200)
        await dialog.getByRole('button', { name: /继续为该生录入/u }).hover()
        await sleep(1500)
        await dialog.getByRole('button', { name: /继续为该生录入/u }).click()
        await page.getByText('请从左侧选择一个器材', { exact: true }).waitFor()
        await sleep(1200)
      },
    },
    {
      id: '07-save-continue',
      narration: '再次选择器材，填写另一条示例记录：三分、视觉提示、三分钟，并补充备注。点击保存并继续，会保存本条结果并清空器材选择，便于连续登记。每次保存都会新增一条记录，请按实际训练次数录入。',
      caption: '另一条示例：3 分、视觉提示、3 分钟\n保存并继续：保存本条，清空器材选择',
      async act(page) {
        await chooseEquipment(page)
        await form(page).locator('.el-rate__item').nth(2).click()
        await form(page).getByText('视觉提示', { exact: true }).click()
        await sleep(1200)
        await durationAndNotes(page, 3, secondNote)
        const button = form(page).getByRole('button', { name: '保存并继续', exact: true })
        await button.hover()
        await sleep(1600)
        await button.click()
        await page.getByText('请从左侧选择一个器材', { exact: true }).waitFor()
        await verifyEquipmentRecording(page, studentId)
        console.log(`两条器材记录保存通过：${firstId}、${secondId}，时长 300 / 180 秒`)
        await sleep(1800)
      },
    },
    {
      id: '08-find-records',
      narration: '从学生管理打开演示生甲的详情，切换到器材训练。这里可以按分类和日期筛选。核对器材、评分、时长和辅助等级。两条示例分别显示口头提示与视觉提示；点击最新一条的查看详情，再核对完整记录。',
      caption: '学生详情 → 器材训练 → 查看详情\n列表核对口头提示与视觉提示，再进详情',
      async act(page) {
        await page.locator('.sidebar-nav .nav-item').filter({ hasText: '学生管理' }).first().click()
        await page.locator('input[placeholder*="搜索学生姓名"]').fill('演示生甲')
        await page.locator('.student-card').filter({ hasText: '演示生甲' }).getByRole('link', { name: '查看详情' }).click()
        await page.getByRole('tab', { name: /器材训练/u }).click()
        const rows = page.locator('.el-tab-pane:visible .records-table .el-table__row').filter({ hasText: equipmentName })
        await rows.nth(1).scrollIntoViewIfNeeded()
        if (!(await rows.first().innerText()).includes('视觉提示') || !(await rows.nth(1).innerText()).includes('口头提示')) throw new Error('器材列表辅助等级与保存值不一致')
        await rows.first().hover()
        await sleep(5000)
        await page.screenshot({ path: 'output/videos/customer-guide-06/08-record-list.png' })
        await rows.first().getByRole('button', { name: '查看详情', exact: true }).click()
        await page.waitForURL(/#\/equipment\/records\//u)
        const reopened = Number(new URL(page.url().split('#')[1], 'http://demo').searchParams.get('recordId'))
        if (reopened !== secondId) throw new Error('未回查到本次最新器材记录')
        await sleep(1800)
      },
    },
    {
      id: '09-details',
      narration: '详情页会定位到选中的记录。核对评分、辅助等级和刚才填写的备注，再查看另一条记录，确认两次结果分别保存。这样就完成了器材训练结果的录入和档案回查。',
      caption: '定位本次记录，核对评分、辅助等级和备注\n两条记录分别保存，回查闭环完成',
      async act(page) {
        const second = page.locator(`#equipment-record-${secondId}`)
        await second.scrollIntoViewIfNeeded()
        await second.hover()
        if (!(await second.innerText()).includes(secondNote)) throw new Error('详情未显示本次备注')
        await sleep(4200)
        const first = page.locator(`#equipment-record-${firstId}`)
        await first.scrollIntoViewIfNeeded()
        await first.hover()
        if (!(await first.innerText()).includes(firstNote)) throw new Error('首次录入备注未回查')
        await sleep(4200)
      },
    },
    {
      id: '10-end',
      narration: '本节完成。先选对学生与器材，再按观察填写结果，保存后回查。下一讲将演示报告查看与导出。',
      caption: '本节完成\n下一讲：报告查看与导出',
      async act(page) {
        await showCard(page, '本节完成', '下一讲：报告查看与导出')
        await sleep(4500)
        await hideCard(page)
      },
    },
  ]
}
