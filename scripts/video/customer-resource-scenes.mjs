/** 教程 10：训练资源检索、教学资料上传与收藏回查。 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

const materialTitle = '演示活动观察记录表'
const description = '软件教程演示材料：用于记录活动、提示、参与表现与后续调整，不含真实学生信息。'
let fixtureFile
let baselineCount
let trainingCount
let materialId
let userData
let equipmentName

export async function prepareResourceDemo(app, output) {
  const fixtureDirectory = path.join(output, 'fixtures')
  fs.mkdirSync(fixtureDirectory, { recursive: true })
  fixtureFile = path.join(fixtureDirectory, `${materialTitle}.pdf`)
  const rendered = await app.evaluate(async ({ BrowserWindow }) => {
    const win = new BrowserWindow({ show: false, width: 900, height: 1100 })
    try {
      const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>
        body{font:18px 'Microsoft YaHei';margin:54px;color:#20354c}h1{text-align:center;font-size:28px}
        p{font-size:14px;color:#596c7c;line-height:1.8}table{width:100%;border-collapse:collapse;margin-top:28px}
        th,td{border:1px solid #bac8d2;padding:18px;text-align:left}th{width:28%;background:#f1f5f8}td{height:55px}
        footer{margin-top:35px;font-size:12px;color:#596c7c}</style><h1>演示活动观察记录表</h1>
        <p>仅用于软件教程。不含真实学生或评估信息，不是评分量表。</p><table>
        ${['日期与活动名称','本次活动目标','提供的提示','参与表现与观察','调整与下一步'].map((label) => `<tr><th>${label}</th><td></td></tr>`).join('')}
        </table><footer>SCGP 软件操作演示材料 · 请按机构实际工作要求填写</footer></html>`
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      return { pdf: Array.from(await win.webContents.printToPDF({ pageSize: 'A4', printBackground: true })),
        preview: Array.from((await win.webContents.capturePage()).toPNG()) }
    } finally { win.destroy() }
  })
  fs.writeFileSync(fixtureFile, Buffer.from(rendered.pdf))
  fs.writeFileSync(path.join(fixtureDirectory, '记录表预览.png'), Buffer.from(rendered.preview))
  console.log('演示资料准备完成：自制活动观察记录表 PDF，无真实学生信息')
}

export async function verifyResourceManagement(page, output) {
  const saved = await page.evaluate((title) => ({
    row: window.db.get('SELECT * FROM teaching_material WHERE title = ?', [title]),
    materialCount: window.db.get('SELECT count(*) AS n FROM teaching_material').n,
    trainingCount: window.db.get('SELECT count(*) AS n FROM sys_training_resource').n,
  }), materialTitle)
  const favorite = saved.row && await page.evaluate((id) => window.db.get('SELECT id FROM teaching_material_favorite WHERE material_id = ? AND user_id = 1', [id]), saved.row.id)
  if (!saved.row || saved.row.description !== description || saved.row.dimension_code !== 'sensory-training'
    || saved.row.file_type !== 'pdf' || saved.materialCount !== baselineCount + 1 || saved.trainingCount !== trainingCount || !favorite) throw new Error('资料上传、分类、收藏或训练资源数量验证未通过')
  const storedFile = path.resolve(userData, 'resources', saved.row.file_path)
  if (!storedFile.startsWith(path.resolve(userData, 'resources') + path.sep) || !fs.existsSync(storedFile)) throw new Error('受管文件未保存到隔离资源目录')
  const original = fs.readFileSync(fixtureFile)
  const stored = fs.readFileSync(storedFile)
  const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
  if (sha(original) !== sha(stored) || saved.row.file_size_bytes !== stored.length || !stored.subarray(0, 4).equals(Buffer.from('%PDF'))) throw new Error('上传后文件字节不一致')
  const evidence = { materialId: saved.row.id, title: saved.row.title, dimension: saved.row.dimension_code,
    fileType: saved.row.file_type, bytes: stored.length, fileHash: sha(stored),
    materialCountBefore: baselineCount, materialCountAfter: saved.materialCount, favoriteForUser: 1,
    trainingResourcesUnchanged: saved.trainingCount === trainingCount, verified: true }
  fs.writeFileSync(path.join(output, 'resource-management-verification.json'), JSON.stringify(evidence, null, 2), 'utf8')
  return evidence
}

export function buildResourceScenes({ showCard, hideCard, sleep, output }) {
  const training = (page) => page.locator('.training-resources')
  const teaching = (page) => page.locator('.teaching-materials')
  const card = (page) => teaching(page).locator('.material-card').filter({ has: page.getByText(materialTitle, { exact: true }) })
  async function filterUploaded(page) {
    await page.getByRole('tab', { name: '教学资料', exact: true }).click()
    await teaching(page).getByPlaceholder('搜索教学资料...').fill(materialTitle)
    await teaching(page).locator('.dimension-item').filter({ has: page.getByText('感官训练', { exact: true }) }).click()
    await teaching(page).locator('.file-category-filter .el-radio-button').filter({ hasText: /^文档/u }).click()
    await card(page).waitFor()
    await sleep(1500)
  }
  return [
    {
      id: '01-title',
      narration: '星愿能力发展平台。软件操作教程第十讲：资源查找与管理。本节演示训练资源检索、教学资料上传、详情查看和收藏回查，使用的是虚构演示材料。',
      caption: '软件操作教程 10\n资源查找与管理',
      async act(page, app) {
        userData = await app.evaluate(({ app }) => app.getPath('userData'))
        baselineCount = await page.evaluate(() => window.db.get('SELECT count(*) AS n FROM teaching_material').n)
        trainingCount = await page.evaluate(() => window.db.get('SELECT count(*) AS n FROM sys_training_resource').n)
        await showCard(page, '软件操作教程 10', '搜索筛选 · 上传资料 · 收藏与回查')
        await sleep(4500)
        await hideCard(page)
      },
    },
    {
      id: '02-resource-center',
      narration: '从左侧进入资源管理。这里分为训练资源和教学资料。训练资源用于查找训练项目，教学资料用于管理文档、视频等材料。当前演示使用管理员账号，可见相应维护入口。',
      caption: '资源管理：训练资源与教学资料\n管理员可见维护入口，按实际授权使用',
      async act(page) {
        await page.locator('.sidebar-nav .nav-item').filter({ hasText: '资源管理' }).first().click()
        await training(page).waitFor()
        await page.getByRole('tab', { name: '训练资源', exact: true }).hover()
        await sleep(1800)
        await page.getByRole('tab', { name: '教学资料', exact: true }).hover()
        await sleep(1800)
      },
    },
    {
      id: '03-search-training',
      narration: '在训练资源左侧，先选择业务分组，再选择展示类型，最后按名称搜索。本次查找感官训练中的器材，输入豆包。若结果为空，可以检查名称、分组、类型和状态筛选是否合适。',
      caption: '训练资源：感官训练 → 器材 → 搜索“豆包”\n无结果时检查名称与各项筛选条件',
      async act(page) {
        await training(page).locator('.el-radio-button').filter({ hasText: /^感官训练$/u }).click()
        await sleep(1400)
        await training(page).locator('.el-radio-button').filter({ hasText: /^器材$/u }).click()
        await sleep(1400)
        await training(page).getByPlaceholder('搜索资源名称...').fill('豆包')
        const first = training(page).locator('.resource-table .el-table__row').first()
        await first.waitFor()
        equipmentName = (await first.locator('.resource-name').innerText()).trim()
        await first.hover()
        await sleep(3000)
      },
    },
    {
      id: '04-view-resource',
      narration: '点击封面可以放大查看器材图片。管理员也可以从编辑入口查看资源说明和标签。系统预置资源的部分字段会锁定，维护前先确认资源来源。这里查看后取消，继续演示教学资料管理。',
      caption: '点击封面预览图片，编辑入口查看说明与标签\n核对来源，留意系统预置字段的锁定状态',
      async act(page) {
        const row = training(page).locator('.resource-table .el-table__row').filter({ hasText: equipmentName }).first()
        await row.locator('.thumbnail-cell').click()
        await page.locator('.resource-cover-preview-dialog').waitFor()
        await sleep(2800)
        await page.locator('.resource-cover-preview-dialog .el-dialog__headerbtn').click()
        await row.getByRole('button', { name: '编辑', exact: true }).click()
        const box = page.locator('.el-dialog:visible')
        await box.waitFor()
        await sleep(3200)
        await box.getByRole('button', { name: '取消', exact: true }).click()
        await box.waitFor({ state: 'hidden' })
      },
    },
    {
      id: '05-upload',
      narration: '切换到教学资料，点击上传资料。填写标题，选择适用的业务维度，再选择本地文件。本次使用自制的演示活动观察记录表。补充标签和描述后上传，便于后续查找和了解用途。',
      caption: '教学资料 → 上传资料\n填写标题、业务维度、文件、标签与描述',
      async act(page) {
        await page.getByRole('tab', { name: '教学资料', exact: true }).click()
        await teaching(page).getByRole('button', { name: '上传资料', exact: true }).click()
        const box = page.locator('.el-dialog:visible').filter({ hasText: '上传教学资料' })
        await box.getByPlaceholder('请输入资料标题').fill(materialTitle)
        await sleep(1200)
        await box.locator('.el-form-item').filter({ hasText: '业务维度' }).locator('.el-select').click()
        await page.locator('.el-select-dropdown__item:visible').filter({ hasText: /^感官训练$/u }).click()
        await sleep(1200)
        await box.locator('input[type="file"]').setInputFiles(fixtureFile)
        await sleep(1400)
        await box.getByPlaceholder('多个标签用逗号分隔').fill('操作演示,活动观察')
        await sleep(1000)
        await box.getByPlaceholder('请输入资料描述').fill(description)
        await sleep(2200)
        await box.getByRole('button', { name: '上传', exact: true }).click()
        await box.waitFor({ state: 'hidden' })
        const material = await page.evaluate((title) => window.db.get('SELECT id FROM teaching_material WHERE title = ?', [title]), materialTitle)
        if (!material) throw new Error('上传资料条目未保存')
        materialId = material.id
        await sleep(1800)
      },
    },
    {
      id: '06-find-detail',
      narration: '上传后，按感官训练维度和文档类型筛选，再搜索刚才的标题。点击资料卡片上的详情图标，可以核对标题、描述、文件类型、大小与标签。确认找到的是需要的那一份材料。',
      caption: '按维度、资料类型和标题查找\n详情中核对文件类型、大小、描述与标签',
      async act(page) {
        await filterUploaded(page)
        await card(page).locator('.material-actions button').nth(1).hover()
        await sleep(1700)
        await card(page).locator('.material-actions button').nth(1).click()
        const box = page.locator('.el-dialog:visible').filter({ hasText: '教学资料详情' })
        await box.waitFor()
        if (!(await box.innerText()).includes(description)) throw new Error('详情描述不一致')
        await sleep(4000)
        await box.getByRole('button', { name: '关闭', exact: true }).click()
      },
    },
    {
      id: '07-favorite',
      narration: '常用资料可以点击卡片上的星标收藏，再点击我的收藏，集中查看已收藏内容。收藏是当前账号的快捷查找方式。搜索和维度筛选仍会影响结果，查找时注意这些条件。',
      caption: '点击星标 → 我的收藏\n收藏视图仍受搜索、维度和类型筛选影响',
      async act(page) {
        await card(page).locator('.favorite-icon').hover()
        await sleep(1500)
        await card(page).locator('.favorite-icon').click()
        await page.waitForFunction((id) => Boolean(window.db.get('SELECT id FROM teaching_material_favorite WHERE material_id = ? AND user_id = 1', [id])), materialId)
        await teaching(page).getByRole('button', { name: '我的收藏', exact: true }).click()
        await card(page).waitFor()
        await sleep(3000)
        await verifyResourceManagement(page, output)
      },
    },
    {
      id: '08-recall',
      narration: '重新载入页面后，再从我的收藏查找这份材料，条目和收藏状态仍在。详情可以再次打开。这样就完成了资源查找、资料上传和收藏回查。需要批量维护时，页面还提供素材目录与批量导入入口。',
      caption: '重载后重新查找，核对资料和收藏仍在\n批量维护可使用素材目录与批量导入入口',
      async act(page) {
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.waitForFunction(() => Boolean(window.db))
        await filterUploaded(page)
        const favorites = teaching(page).getByRole('button', { name: '我的收藏', exact: true })
        if (await favorites.count()) await favorites.click()
        await card(page).waitFor()
        await verifyResourceManagement(page, output)
        await card(page).hover()
        await sleep(3300)
        await card(page).locator('.material-actions button').nth(1).click()
        await page.locator('.el-dialog:visible').filter({ hasText: '教学资料详情' }).waitFor()
        await sleep(2500)
        await page.locator('.el-dialog:visible').getByRole('button', { name: '关闭', exact: true }).click()
        console.log('资源闭环通过：上传条目、文件字节、收藏及重载回查通过，训练资源未改')
      },
    },
    {
      id: '09-end',
      narration: '本节完成。先用分组、类型和名称查找，再核对详情；机构资料上传后，可以收藏并回查。下一讲将介绍班级与学生分班，主要供使用班级流程的客户参考。',
      caption: '本节完成\n下一讲：班级与学生分班（按需选看）',
      async act(page) {
        await showCard(page, '本节完成', '下一讲：班级与学生分班 · 按需选看')
        await sleep(4500)
        await hideCard(page)
      },
    },
  ]
}
