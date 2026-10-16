/** 教程 04：计划创建、执行与调整。全部配置仅为虚构流程示例。 */
const planName = '演示生甲·软件训练计划'
const adjustedGoal = '在一次口头提示下完成一轮配对，记录完成情况。'

export async function verifyTrainingPlan(page, studentId) {
  const saved = await page.evaluate(({ name }) => {
    const plan = window.db.get('SELECT * FROM sys_training_plan WHERE name = ?', [name])
    const resources = plan ? window.db.all('SELECT * FROM sys_plan_resource_map WHERE plan_id = ?', [plan.id]) : []
    return { plan, resources }
  }, { name: planName })
  if (!saved.plan || saved.plan.student_id !== studentId || saved.plan.status !== 'active'
    || !JSON.parse(saved.plan.short_term_goals || '[]').includes(adjustedGoal)
    || saved.resources.length !== 1 || saved.resources[0].frequency !== 2
    || saved.resources[0].duration_minutes !== 10) {
    throw new Error('训练计划或调整后的目标、资源配置未完整保存')
  }
  return saved
}

export function buildPlanScenes({ showCard, hideCard, sleep, studentId }) {
  const dialog = (page) => page.locator('.el-dialog.plan-dialog:visible')
  const card = (page) => page.locator('.plan-card').filter({ hasText: planName })
  async function fill(page, placeholder, value) {
    const field = dialog(page).getByPlaceholder(placeholder)
    await field.scrollIntoViewIfNeeded()
    await field.hover()
    await sleep(600)
    await field.fill(value)
    await sleep(900)
  }
  async function tab(page, name) {
    await dialog(page).getByRole('tab', { name, exact: true }).click()
    await sleep(700)
  }
  async function configNumber(resource, index, value) {
    const input = resource.getByRole('spinbutton').nth(index)
    await input.fill(String(value))
    await input.press('Tab')
    await sleep(900)
  }
  return [
    {
      id: '01-title',
      narration: '星愿能力发展平台。软件操作教程第四讲：制定与调整训练计划。本节使用虚构目标和训练配置演示操作。',
      caption: '软件操作教程 04\n制定与调整训练计划',
      async act(page) {
        await showCard(page, '软件操作教程 04', '新建计划 · 编排资源 · 保存与调整')
        await sleep(5000)
        await hideCard(page)
      },
    },
    {
      id: '02-new',
      narration: '从左侧进入训练计划。这里可以查看已有计划，并按状态、模块、学生或名称筛选。点击右上角的新建计划。',
      caption: '训练计划 → 新建计划\n可按状态、模块、学生或名称筛选',
      async act(page) {
        await page.locator('.sidebar-nav .nav-item').filter({ hasText: '训练计划' }).first().click()
        await page.locator('.plan-list-page h1').waitFor()
        await sleep(3000)
        await page.getByRole('button', { name: '新建计划', exact: true }).hover()
        await sleep(1800)
        await page.getByRole('button', { name: '新建计划', exact: true }).click()
        await dialog(page).waitFor()
      },
    },
    {
      id: '03-basic',
      narration: '先填写计划名称、归属模块、关联学生和计划周期。示例使用综合计划，并关联演示生甲。计划说明可以补充执行要点，保存前核对学生和日期。',
      caption: '基本信息：名称、模块、学生、周期\n保存前核对关联学生和日期',
      async act(page) {
        await fill(page, '请输入计划名称', planName)
        const student = dialog(page).locator('.el-form-item').filter({ hasText: '关联学生' }).locator('.el-select')
        await student.click()
        await student.getByRole('combobox').fill('演示生甲')
        await page.locator('.el-select-dropdown__item:visible').filter({ hasText: '演示生甲' }).click()
        await sleep(1200)
        await dialog(page).getByPlaceholder('开始日期').click()
        const left = page.locator('.el-date-range-picker:visible .el-date-range-picker__content.is-left')
        const days = left.locator('td.available:not(.prev-month):not(.next-month)')
        await days.filter({ has: page.getByText('1', { exact: true }) }).click()
        await sleep(1000)
        await days.filter({ has: page.getByText('28', { exact: true }) }).click()
        await fill(page, '填写本计划的目标、注意事项或执行说明', '演示计划：按目标开展游戏训练，记录完成情况。')
        await sleep(2000)
      },
    },
    {
      id: '04-goals',
      narration: '切换到目标设定，分别添加长期目标和短期目标。这里演示填写一个参与活动的方向，以及一项具体任务。实际目标应结合学生当前表现制定。',
      caption: '目标设定：添加长期与短期目标\n示例文字用于演示填写方式',
      async act(page) {
        await tab(page, '目标设定')
        await dialog(page).locator('.goal-group').first().getByRole('button', { name: '添加目标' }).click()
        await fill(page, '请输入长期目标，如：提高触觉敏感度', '在清晰提示下参与配对和分类活动。')
        await dialog(page).locator('.goal-group').nth(1).getByRole('button', { name: '添加目标' }).click()
        await fill(page, '请输入短期目标，如：能独立完成大笼球游戏', '在口头提示下完成一轮配对游戏，记录完成情况。')
        await sleep(3000)
      },
    },
    {
      id: '05-resources',
      narration: '切换到资源编排，点击添加资源。可以按模块、类型和名称查找。本节筛选游戏，选择两项软件资源，再点击确认添加。',
      caption: '资源编排 → 添加资源 → 游戏\n选择资源后点击“确认添加”',
      async act(page) {
        await tab(page, '资源编排')
        await dialog(page).getByRole('button', { name: '添加资源', exact: true }).click()
        const picker = page.locator('.el-dialog.resource-selector-dialog:visible')
        await picker.locator('.type-filter').getByText('游戏', { exact: true }).click()
        await picker.locator('.module-filter').getByText('感官训练', { exact: true }).click()
        await picker.locator('.resource-option').nth(1).waitFor()
        await sleep(2000)
        await picker.locator('.resource-option').first().click()
        await sleep(1600)
        await picker.locator('.resource-option').nth(1).click()
        await sleep(1700)
        await picker.getByRole('button', { name: '确认添加', exact: true }).click()
        await picker.waitFor({ state: 'hidden' })
        await sleep(1500)
      },
    },
    {
      id: '06-draft',
      narration: '每项资源可以设置每周频次、单次时长和教学提示。示例保留每周三次、每次十五分钟，并补充提示语。这些数值只展示配置方法。先保存为草稿，方便再次检查。',
      caption: '设置频次、时长和教学提示\n演示配置确认后“保存为草稿”',
      async act(page) {
        const resource = dialog(page).locator('.resource-card').first()
        await resource.getByRole('spinbutton').first().hover()
        await sleep(2300)
        await resource.getByRole('spinbutton').nth(1).hover()
        await sleep(2000)
        await resource.getByPlaceholder('教学提示（可选）').fill('先示范一次，再开始操作。')
        await sleep(2500)
        await dialog(page).getByRole('button', { name: '保存为草稿', exact: true }).click()
        await dialog(page).waitFor({ state: 'hidden', timeout: 20000 })
        await page.getByPlaceholder('搜索计划名称…').fill(planName)
        await card(page).waitFor()
        const count = await page.evaluate((name) => window.db.get('SELECT count(*) AS n FROM sys_plan_resource_map WHERE plan_id = (SELECT id FROM sys_training_plan WHERE name = ?)', [name]).n, planName)
        if (count !== 2) throw new Error('草稿中的两项资源未保存')
        await sleep(2000)
      },
    },
    {
      id: '07-start',
      narration: '保存后，通过名称搜索找到这份草稿。检查无误后点击开始执行，并确认。计划会切换到执行中，点击计划卡片可以查看目标和资源。',
      caption: '找到草稿 → 开始执行 → 确认\n点击计划卡片查看详情',
      async act(page) {
        await sleep(1700)
        await card(page).getByRole('button', { name: '开始执行', exact: true }).click()
        const confirm = page.locator('.el-message-box')
        await confirm.waitFor()
        await sleep(2000)
        await confirm.getByRole('button', { name: '确定', exact: true }).click()
        await card(page).getByText('执行中', { exact: true }).waitFor()
        await sleep(1500)
        await card(page).locator('.plan-card__main').click()
        await page.locator('.el-drawer:visible .plan-detail').waitFor()
        await sleep(3500)
      },
    },
    {
      id: '08-edit',
      narration: '需要调整时，关闭详情，从计划卡片的更多菜单选择编辑。可以修改目标，也可以调整资源频次、时长，或者移除暂不使用的资源。这里演示修改一个短期目标和资源配置。',
      caption: '更多菜单 → 编辑\n修改目标、频次、时长及资源',
      async act(page) {
        await page.locator('.el-drawer:visible .el-drawer__close-btn').click()
        await card(page).locator('.plan-card__menu-button').click()
        await page.getByRole('menuitem', { name: '编辑', exact: true }).click()
        await dialog(page).waitFor()
        await tab(page, '目标设定')
        await fill(page, '请输入短期目标，如：能独立完成大笼球游戏', adjustedGoal)
        await tab(page, '资源编排')
        const resource = dialog(page).locator('.resource-card').first()
        await configNumber(resource, 0, 2)
        await configNumber(resource, 1, 10)
        await dialog(page).locator('.resource-card').nth(1).getByRole('button', { name: '移除' }).click()
        await sleep(2800)
      },
    },
    {
      id: '09-save',
      narration: '点击保存修改。再次打开计划详情，核对更新后的目标，以及每周两次、每次十分钟的示例配置，确认调整已经保存。后续再根据执行情况持续调整。',
      caption: '保存修改 → 重新打开详情\n核对调整后的目标和资源配置',
      async act(page) {
        await dialog(page).getByRole('button', { name: '保存修改', exact: true }).hover()
        await sleep(1500)
        await dialog(page).getByRole('button', { name: '保存修改', exact: true }).click()
        await dialog(page).waitFor({ state: 'hidden', timeout: 20000 })
        await card(page).locator('.plan-card__main').click()
        await page.locator('.el-drawer:visible .plan-detail').waitFor()
        await sleep(2800)
        await page.locator('.el-drawer:visible .detail-resource-list').scrollIntoViewIfNeeded()
        await sleep(3500)
        await verifyTrainingPlan(page, studentId)
        await page.evaluate(async () => window.db.saveNow())
      },
    },
    {
      id: '10-end',
      narration: '本节完成。下一讲将演示游戏训练，以及结束后的记录回查。',
      caption: '本节完成\n下一讲：游戏训练与记录回查',
      async act(page) {
        await showCard(page, '本节完成', '下一讲：游戏训练与记录回查')
        await sleep(4500)
        await hideCard(page)
      },
    },
  ]
}
