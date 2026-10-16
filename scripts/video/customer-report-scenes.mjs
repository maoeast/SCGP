/** 教程 07：报告设置、实际文件导出与 HTML 文件回看。 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import JSZip from 'jszip'

const reportHeader = '演示机构能力发展报告'
let assessmentId
let wordFile
let htmlFile
let exportDirectory

export async function verifyReportExports(output) {
  if (!wordFile || !htmlFile || !fs.existsSync(wordFile) || !fs.existsSync(htmlFile)) throw new Error('报告导出文件缺失')
  const zip = await JSZip.loadAsync(fs.readFileSync(wordFile))
  const document = await zip.file('word/document.xml')?.async('string')
  const headers = await Promise.all(Object.keys(zip.files).filter((name) => /^word\/header\d+\.xml$/u.test(name)).map((name) => zip.file(name).async('string')))
  const images = Object.keys(zip.files).filter((name) => /^word\/media\/.+\.(png|jpe?g)$/iu.test(name))
  const html = fs.readFileSync(htmlFile, 'utf8')
  if (!document?.includes('演示生甲') || !document.includes('改良儿童功能独立性评估量表报告') || !headers.some((item) => item.includes(reportHeader))
    || images.length === 0 || !html.includes(reportHeader) || !html.includes('演示生甲') || !html.includes('data:image/')
    || !document.includes('统一评估报告') || !html.includes('统一评估报告') || html.includes('Word 导出版')) {
    throw new Error('导出报告的学生、标题、页眉或内嵌头像缺失')
  }
  const evidence = { assessmentId, word: { file: path.relative(output, wordFile).replaceAll('\\', '/'), bytes: fs.statSync(wordFile).size, embeddedImages: images.length },
    html: { file: path.relative(output, htmlFile).replaceAll('\\', '/'), bytes: fs.statSync(htmlFile).size }, header: reportHeader, verified: true }
  fs.writeFileSync(path.join(output, 'export-verification.json'), JSON.stringify(evidence, null, 2), 'utf8')
  return evidence
}

export function buildReportScenes({ showCard, hideCard, sleep, output }) {
  const reportSettings = (page) => page.locator('.system-settings-section').filter({ has: page.getByRole('heading', { name: '报告设置', exact: true }) })
  async function openSettings(page) {
    await page.locator('.sidebar-nav .nav-item').filter({ hasText: '系统管理' }).first().click()
    await page.getByRole('tab', { name: '系统设置', exact: true }).click()
    await reportSettings(page).scrollIntoViewIfNeeded()
    await sleep(1400)
  }
  async function openReport(page) {
    await page.locator('.sidebar-nav .nav-item').filter({ hasText: '学生管理' }).first().click()
    await page.locator('input[placeholder*="搜索学生姓名"]').fill('演示生甲')
    await page.locator('.student-card').filter({ hasText: '演示生甲' }).getByRole('link', { name: '查看详情' }).click()
    const row = page.locator('.records-table .el-table__row').filter({ hasText: 'WeeFIM' }).first()
    await row.scrollIntoViewIfNeeded()
    await row.hover()
    await sleep(2100)
    await row.getByRole('button', { name: '查看报告' }).click()
    await page.locator('.weefim-report h2').waitFor()
    const id = new URL(page.url().split('#')[1], 'http://demo').searchParams.get('assessId')
    if (assessmentId && id !== assessmentId) throw new Error('两次导出未使用同一份评估报告')
    assessmentId = id
    await sleep(1200)
  }
  async function exportFile(page, app, extension) {
    fs.mkdirSync(path.join(output, 'exports'), { recursive: true })
    const directory = exportDirectory ||= fs.mkdtempSync(path.join(output, 'exports', 'capture-'))
    await app.evaluate(({ BrowserWindow }, { directory }) => {
      globalThis.__scgpVideoDownload = { state: 'waiting' }
      BrowserWindow.getAllWindows()[0].webContents.session.once('will-download', (_event, item) => {
        const fileName = item.getFilename().replace(/[<>:"/\\|?*]/gu, '_')
        const file = `${directory}/${fileName}`
        item.setSavePath(file)
        globalThis.__scgpVideoDownload = { state: 'progressing', file, fileName }
        item.once('done', (_event, state) => { globalThis.__scgpVideoDownload.state = state })
      })
    }, { directory })
    const button = page.getByRole('button', { name: '导出报告', exact: true })
    await button.hover()
    await sleep(1500)
    await button.click()
    let result
    for (let i = 0; i < 80; i++) {
      result = await app.evaluate(() => globalThis.__scgpVideoDownload)
      if (['completed', 'cancelled', 'interrupted'].includes(result.state)) break
      await sleep(250)
    }
    if (result?.state !== 'completed' || !result.file?.endsWith(extension) || !fs.existsSync(result.file)) {
      throw new Error(`实际下载失败或格式不匹配：${JSON.stringify(result)}`)
    }
    console.log(`实际文件下载完成：${result.fileName}，${fs.statSync(result.file).size} 字节`)
    return result.file
  }
  return [
    {
      id: '01-title',
      narration: '星愿能力发展平台。软件操作教程第七讲：报告查看与导出。本节使用一份已有的演示评估，查看报告，设置输出格式，再导出文件并核对内容。',
      caption: '软件操作教程 07\n报告查看与导出',
      async act(page) {
        await showCard(page, '软件操作教程 07', '查看报告 · 设置格式 · 导出与核对')
        await sleep(5000)
        await hideCard(page)
      },
    },
    {
      id: '02-settings',
      narration: '管理员可从系统管理进入系统设置，找到报告设置。本次先选择 Word，开启包含学生头像，并填写演示页眉。报告设置会随选项变更保存。普通使用者可以请管理员按机构要求配置。',
      caption: '系统管理 → 系统设置 → 报告设置\n选择 Word、包含头像、填写页眉',
      async act(page) {
        await openSettings(page)
        await reportSettings(page).getByText('Word', { exact: true }).click()
        await sleep(1000)
        const avatar = reportSettings(page).getByRole('switch')
        if ((await avatar.getAttribute('aria-checked')) !== 'true') await avatar.click()
        await sleep(1100)
        const header = reportSettings(page).getByPlaceholder('请输入报告页眉文字')
        await header.hover()
        await sleep(700)
        await header.fill(reportHeader)
        await header.press('Tab')
        await sleep(2200)
        const config = await page.evaluate(() => Object.fromEntries(window.db.all("SELECT key,value FROM system_config WHERE key IN ('default_report_format','include_student_avatar','report_header')").map((row) => [row.key, row.value])))
        if (config.default_report_format !== 'word' || config.include_student_avatar !== 'true' || config.report_header !== reportHeader) throw new Error('Word 报告设置未保存')
      },
    },
    {
      id: '03-find-report',
      narration: '从学生管理找到演示生甲，打开详情，在评估记录中找到需要的 WeeFIM 记录。先核对量表名称和评估日期，再点击查看报告，避免导出错误的一次评估。',
      caption: '学生详情 → 评估记录 → 查看报告\n核对量表和日期，选择需要的那次评估',
      async act(page) { await openReport(page) },
    },
    {
      id: '04-read-report',
      narration: '报告打开后，先确认学生基本信息和评估日期，再查看总分、分项和详细结果。页面可以上下滚动。这里展示的是虚构评估，分数和建议仅用于说明软件操作。核对完成后回到顶部。',
      caption: '核对学生、日期、总分与详细结果\n示例分数仅用于演示软件操作',
      async act(page) {
        await page.locator('.student-info-card').hover()
        await sleep(2300)
        await page.locator('.result-overview-card').scrollIntoViewIfNeeded()
        await sleep(2300)
        await page.mouse.wheel(0, 550)
        await sleep(3000)
        await page.locator('.weefim-report h2').scrollIntoViewIfNeeded()
        await sleep(1300)
      },
    },
    {
      id: '05-export-word',
      narration: '点击顶部的导出报告。当前默认格式为 Word，因此生成的是后缀为 docx 的文件。本次演示已将文件保存到教程输出目录。实际使用时，留意保存位置，使用 Word 或兼容软件打开，再核对学生、日期和报告内容。',
      caption: '导出报告 → Word 文件（.docx）\n留意保存位置，打开后再次核对学生和日期',
      async act(page, app) {
        wordFile = await exportFile(page, app, '.docx')
        await sleep(3800)
      },
    },
    {
      id: '06-html-setting',
      narration: '如果需要用浏览器查看，可将默认报告格式切换为 HTML。这里返回报告设置，选择 HTML，然后重新打开同一份评估报告。页眉和头像设置继续保留。',
      caption: '报告设置：默认格式切换为 HTML\n重新打开同一份评估报告',
      async act(page) {
        await openSettings(page)
        await reportSettings(page).getByText('HTML', { exact: true }).hover()
        await sleep(1500)
        await reportSettings(page).getByText('HTML', { exact: true }).click()
        await sleep(1500)
        console.log(`HTML 设置回查页面：${page.url()}`)
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.waitForFunction(() => Boolean(window.db))
        const saved = await page.evaluate(() => window.db.get('SELECT value FROM system_config WHERE key = ?', ['default_report_format'])?.value)
        if (saved !== 'html') throw new Error('HTML 默认格式重载后未保留')
        await openReport(page)
      },
    },
    {
      id: '07-export-html',
      narration: '再次点击导出报告，这次生成后缀为 html 的文件。同一个导出按钮，会根据默认格式输出相应文件。文件生成后，还需要打开检查，不能仅凭成功提示就结束。',
      caption: '同一份报告，再次点击导出报告\n当前生成 HTML 文件（.html）',
      async act(page, app) {
        htmlFile = await exportFile(page, app, '.html')
        await verifyReportExports(output)
        await sleep(3500)
      },
    },
    {
      id: '08-preview-file',
      narration: '现在打开刚才实际导出的 HTML 文件。可以看到设置的页眉、学生头像和报告基本信息。向下查看，核对结果和明细是否完整。交付或归档前，也要确认文件对应正确的学生与评估日期。',
      caption: '实际导出的 HTML 文件预览\n核对页眉、头像、学生、日期及报告内容',
      async act(page) {
        await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' })
        await page.locator('.report-header').waitFor()
        if ((await page.locator('.report-header').innerText()) !== reportHeader || !(await page.locator('body').innerText()).includes('演示生甲')) throw new Error('实际 HTML 预览内容不完整')
        if ((await page.locator('.subtitle').innerText()).trim() !== '统一评估报告') throw new Error('HTML 副标题仍与导出格式不符')
        await page.waitForFunction(() => document.querySelector('.avatar')?.naturalWidth > 0)
        await page.locator('h1').first().hover()
        await sleep(4300)
        await page.mouse.wheel(0, 520)
        await sleep(3500)
        await page.mouse.wheel(0, 500)
        await sleep(3000)
        await page.screenshot({ path: path.join(output, '08-actual-html-detail.png') })
        await page.evaluate(() => window.scrollTo(0, 0))
        await sleep(2500)
      },
    },
    {
      id: '09-end',
      narration: '本节完成。选择正确的报告，确认输出格式，导出后打开核对。通用操作教程到这里告一段落，后续可以按岗位和已购功能，继续学习相应专题。',
      caption: '本节完成\n查看报告 · 确认格式 · 导出后核对',
      async act(page) {
        await showCard(page, '本节完成', '查看报告 · 确认格式 · 导出后核对')
        await sleep(4500)
        await hideCard(page)
      },
    },
  ]
}
