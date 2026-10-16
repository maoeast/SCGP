/** 教程 02 的真实界面操作。数据库写入只发生于录制引擎创建的临时副本。 */
export function buildStudentAddScenes({ showCard, hideCard, sleep }) {
  const name = '演示生乙'
  let createdId
  async function fill(page, selector, value) {
    const input = page.locator(selector)
    await input.scrollIntoViewIfNeeded()
    await input.hover()
    await sleep(500)
    await input.fill(value)
    await sleep(800)
  }
  return [
    {
      id: '01-title',
      narration: '星愿能力发展平台。软件操作教程第二讲：新增学生档案与回查。本节使用虚构资料演示。',
      caption: '软件操作教程 02\n新增学生档案与回查',
      async act(page) {
        await showCard(page, '软件操作教程 02', '新增学生档案 · 保存 · 搜索回查')
        await sleep(5000)
        await hideCard(page)
      },
    },
    {
      id: '02-open',
      narration: '进入学生管理，点击右上角的添加学生。带星号的姓名、性别和出生日期是必填项。',
      caption: '学生管理 → 添加学生\n带 * 的项目必须填写',
      async act(page) {
        await page.getByRole('button', { name: '添加学生' }).hover()
        await sleep(1000)
        await page.getByRole('button', { name: '添加学生' }).click()
        await page.locator('.dialog-content h2').getByText('添加学生', { exact: true }).waitFor()
        await page.mouse.move(1400, 720)
        await sleep(2500)
      },
    },
    {
      id: '03-basic',
      narration: '输入演示生乙，选择性别，再从日期选择器中选择出生日期。学号可以自行填写，也可以留空，由系统在保存时自动生成。',
      caption: '填写姓名、性别和出生日期\n学号留空时由系统自动生成',
      async act(page) {
        await fill(page, '#name', name)
        await page.locator('#gender').selectOption('男')
        await sleep(700)
        await page.locator('#birthday').click()
        const panel = page.locator('.el-picker-panel:visible')
        await panel.locator('.el-date-picker__header-label').first().click()
        await sleep(800)
        await panel.getByText('2020', { exact: true }).click()
        await sleep(700)
        await panel.locator('.el-month-table td').nth(8).click()
        await sleep(700)
        await panel.locator('.el-date-table td.available').filter({ has: page.getByText('18', { exact: true }) }).click()
        await page.locator('#studentNo').hover()
        await sleep(2500)
      },
    },
    {
      id: '04-extra',
      narration: '诊断类型按已有资料选择，所属班级可以暂不分班。这里还可以补充监护人、医学状态和照护要求。没有资料的选填项可以先留空，之后再编辑。',
      caption: '按已有资料填写选填项\n所属班级可选择“暂不分班”',
      async act(page) {
        await page.locator('#disorder').selectOption('发育迟缓')
        await page.locator('#classId').selectOption('')
        await page.locator('#classId').hover()
        await sleep(1700)
        await fill(page, '#guardian_name', '演示监护人')
        await page.locator('#guardian_relation').selectOption('监护人')
        await fill(page, '#care_instructions', '操作前说明步骤，提供清晰提示。')
        await sleep(2200)
      },
    },
    {
      id: '05-save',
      narration: '可以选择一个预置头像。确认信息后点击保存，表单关闭，学生列表会更新。下一步我们通过搜索确认档案已经保存。',
      caption: '选择预置头像 → 保存\n保存后回到学生列表',
      async act(page) {
        const avatar = page.locator('.avatar-picker__preset[title="小学生男生"]')
        await avatar.scrollIntoViewIfNeeded()
        await avatar.hover()
        await sleep(2200)
        await avatar.click()
        await sleep(2200)
        const save = page.locator('.dialog-footer').getByRole('button', { name: '保存', exact: true })
        await save.scrollIntoViewIfNeeded()
        await save.hover()
        await sleep(2200)
        await save.click()
        await page.locator('.dialog-overlay').waitFor({ state: 'hidden', timeout: 20000 })
        const saved = await page.evaluate((name) => window.db.get('SELECT id, birthday, gender, student_no FROM student WHERE name = ?', [name]), name)
        if (!saved || saved.birthday !== '2020-09-18' || saved.gender !== '男' || !saved.student_no) {
          throw new Error('新增学生资料未完整保存')
        }
        createdId = saved.id
        await page.evaluate(async () => window.db.saveNow())
        await sleep(2200)
      },
    },
    {
      id: '06-search',
      narration: '在搜索框输入演示生乙。找到新增的学生后，点击查看详情，打开刚才保存的档案。',
      caption: '搜索“演示生乙” → 查看详情\n回查新增的学生档案',
      async act(page) {
        await fill(page, 'input[placeholder*="搜索学生姓名"]', name)
        const card = page.locator('.student-card').filter({ hasText: name }).first()
        await card.waitFor({ state: 'visible', timeout: 15000 })
        await sleep(2300)
        await card.getByRole('link', { name: '查看详情' }).hover()
        await sleep(1500)
        await card.getByRole('link', { name: '查看详情' }).click()
        await page.waitForURL(new RegExp(`#\\/students\\/${createdId}(?:$|\\?)`, 'u'))
        await sleep(1000)
      },
    },
    {
      id: '07-detail',
      narration: '在详情页核对姓名、性别、出生日期和监护人信息。新建档案还没有评估与训练记录，后续开展业务后会逐步积累。需要补充资料时，点击编辑信息。',
      caption: '核对基本资料\n后续可通过“编辑信息”补充',
      async act(page) {
        await page.getByText(name, { exact: true }).first().waitFor({ state: 'visible' })
        await page.getByText(name, { exact: true }).first().hover()
        await sleep(3500)
        await page.getByRole('button', { name: '编辑信息' }).hover()
        await sleep(2500)
        await sleep(1800)
      },
    },
    {
      id: '08-end',
      narration: '本节完成。你已经完成新增、保存和回查。下一讲将演示一次量表评估。',
      caption: '本节完成\n下一讲：量表评估与结果查看',
      async act(page) {
        await showCard(page, '本节完成', '下一讲：量表评估与结果查看')
        await sleep(4500)
        await hideCard(page)
      },
    },
  ]
}
