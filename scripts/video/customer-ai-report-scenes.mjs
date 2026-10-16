/** 教程 16：真实查库、报告草稿、工具生成 Word 与文件核对。 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'
import JSZip from 'jszip'
import { buildAiScenes } from './customer-ai-scenes.mjs'

let sessionId
let sourceRecords
let baseline
let wordFile
let previewFile
let appUrl
let querySteps = []
let exportSteps = []
let wordText
const firstQuestion = '这是虚构数据库的软件教程演示。请查询演示生甲（学号 DEMO-10002）的学生资料和最近三次统一训练场次。只整理一份“演示生甲训练记录摘要”的文字草稿，逐条列出真实记录的场次ID、任务名称、日期和完成状态，再写明仅为已存记录摘要，不能据此判断训练效果。不要列时长或正确率，不作诊断，不推断能力变化，不查询其他学生。先返回草稿，不生成文件，控制在四百字内。'
const exportQuestion = '已核对学生、三条任务名称、日期和完成状态。请用生成报告功能，将刚才同一批记录导出一份 Word。标题“演示生甲训练记录摘要”，副标题“虚构数据 教程演示草稿”。基本信息写学生及资料来源为本地已存记录。正文包含一个三行表格，列为场次ID、任务名称、日期、完成状态；再加一段“使用说明”，明确是演示草稿，仅汇总已存记录，不代表疗效或正式评估结论，需工作人员核对。不得添加未经记录支持的评分或建议，不重新查询其他学生，导出一次即可。'

export async function prepareAiReportDemo(page, output) {
  const previous = buildAiScenes({ showCard: async () => {}, hideCard: async () => {}, sleep: (ms) => page.waitForTimeout(Math.min(ms, 400)), studentId: 10002, output })
  for (const scene of previous.slice(1, 4)) await scene.act(page)
  const row = page.locator('.model-table .el-table__row').filter({ hasText: '演示文字模型' })
  await row.getByRole('button', { name: '编辑', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '编辑模型', exact: true })
  if (!(await dialog.getByRole('checkbox', { name: '支持工具调用', exact: true }).isChecked())) {
    await dialog.locator('.el-checkbox').filter({ hasText: '支持工具调用' }).click()
  }
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^系统首页$/u }).click()
  await page.locator('.dashboard-hero').waitFor()
  console.log('第 16 讲准备完成：真实连接成功，已在临时副本启用模型工具调用')
}

async function waitForAnswer(page, count) {
  await page.waitForFunction(({ id, count }) => window.db.get("SELECT count(*) AS n FROM ai_chat_message WHERE session_id = ? AND role = 'assistant' AND delivery_status = 'completed' AND length(content) > 0", [id]).n >= count,
    { id: sessionId, count }, { timeout: 240000 })
  await page.getByRole('button', { name: '发送', exact: true }).waitFor({ timeout: 30000 })
}

async function readToolSteps(page) {
  return page.evaluate(async () => {
    const { useAiStore } = await import('/src/stores/ai.ts')
    return useAiStore().toolSteps.map(({ name, label, ok }) => ({ name, label, ok }))
  })
}

async function armDownload(app, output) {
  fs.mkdirSync(path.join(output, 'exports'), { recursive: true })
  const directory = fs.mkdtempSync(path.join(output, 'exports', 'capture-'))
  await app.evaluate(({ BrowserWindow }, directory) => {
    globalThis.__scgpAiReportDownload = { state: 'waiting' }
    BrowserWindow.getAllWindows()[0].webContents.session.once('will-download', (_event, item) => {
      const filename = item.getFilename().replace(/[<>:"/\\|?*]/gu, '_')
      const file = `${directory}/${filename}`
      item.setSavePath(file)
      globalThis.__scgpAiReportDownload = { state: 'progressing', file, filename }
      item.once('done', (_event, state) => { globalThis.__scgpAiReportDownload.state = state })
    })
  }, directory)
}

async function verifyWord(output) {
  if (!wordFile || !fs.existsSync(wordFile)) throw new Error('AI 实际导出的 Word 文件缺失')
  const zip = await JSZip.loadAsync(fs.readFileSync(wordFile))
  const xml = await zip.file('word/document.xml')?.async('string')
  wordText = xml?.replace(/<[^>]+>/gu, '') || ''
  if (!wordText.includes('演示生甲训练记录摘要') || !wordText.includes('草稿')
    || sourceRecords.some((r) => !wordText.includes(r.resource_name) || !wordText.includes(String(r.id)) || !wordText.includes(r.started_at.slice(0, 10)))) {
    throw new Error('AI Word 文件未包含本次查询到的三条记录及草稿标记')
  }
  return { file: path.relative(output, wordFile).replaceAll('\\', '/'), bytes: fs.statSync(wordFile).size, sourceRecordsMatched: 3 }
}

async function runRenderCommand(command, args, timeout) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, timeout, stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    child.stdout.on('data', () => {})
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-1200) })
    child.once('error', reject)
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error(`渲染命令失败 (${code})：${stderr}`)))
  })
}

async function renderWord(output) {
  const directory = path.join(output, 'word-preview')
  fs.mkdirSync(directory, { recursive: true })
  const pdf = path.join(directory, 'actual-export.pdf')
  await runRenderCommand('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.resolve('scripts/video/render-exported-word.ps1'), '-InputDocx', wordFile, '-OutputPdf', pdf], 90000)
  if (!fs.existsSync(pdf)) throw new Error('Word 渲染未生成 PDF')
  const poppler = process.env.SCGP_PDFTOPPM || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe')
  await runRenderCommand(poppler, ['-scale-to', '1600', '-png', pdf, path.join(directory, 'page')], 60000)
  const pages = fs.readdirSync(directory).filter((name) => /^page-\d+\.png$/u.test(name)).sort()
  if (!pages.length) throw new Error('Word 没有渲染出页面')
  previewFile = path.join(directory, '实际导出Word的渲染预览.html')
  fs.writeFileSync(previewFile, `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>实际导出 Word 的渲染预览</title><style>body{margin:0;background:#e9edf3;font-family:'Microsoft YaHei',sans-serif}header{position:sticky;top:0;background:#102548;color:white;padding:16px 30px;font-size:22px;z-index:1}small{display:block;font-size:14px;margin-top:6px;color:#c7d4e7}main{max-width:820px;margin:24px auto}img{display:block;width:100%;margin-bottom:24px;box-shadow:0 4px 18px #18365926}</style><header>实际导出文件核对<small>应用生成的 DOCX → 本机 Word 渲染 → 页面预览 · 虚构数据教程草稿</small></header><main>${pages.map((name, index) => `<img src="${name}" alt="实际导出文件第 ${index + 1} 页">`).join('')}</main></html>`, 'utf8')
  console.log(`实际 Word 渲染通过：${pages.length} 页`)
}

export async function verifyAiReport(page, studentId, output) {
  const saved = await page.evaluate((id) => ({
    session: window.db.get('SELECT id, student_id, agent_code FROM ai_chat_session WHERE id = ?', [id]),
    messages: window.db.all('SELECT id, role, content, delivery_status FROM ai_chat_message WHERE session_id = ? ORDER BY id', [id]),
    count: window.db.get('SELECT count(*) AS n FROM ai_chat_session WHERE user_id = 1').n,
    reports: window.db.get('SELECT count(*) AS n FROM report_record').n,
  }), sessionId)
  const users = saved.messages.filter((m) => m.role === 'user')
  const answers = saved.messages.filter((m) => m.role === 'assistant')
  if (saved.session?.student_id !== studentId || saved.session.agent_code !== 'special_ed_teacher'
    || users.length !== 2 || users[0].content !== firstQuestion || users[1].content !== exportQuestion
    || answers.length !== 2 || answers.some((m) => m.delivery_status !== 'completed' || !m.content.trim())
    || !querySteps.some((s) => ['get_student', 'search_students'].includes(s.name) && s.ok) || !querySteps.some((s) => s.name === 'list_training_sessions' && s.ok)
    || !exportSteps.some((s) => s.name === 'generate_report' && s.ok)
    || saved.count !== baseline.sessions + 1 || saved.reports !== baseline.reports) throw new Error('AI 报告真实查库、导出或会话保存核验失败')
  const word = await verifyWord(output)
  const evidence = { studentId, sessionId, sourceRecords, querySteps, exportSteps, messages: saved.messages, word,
    sessionCountBefore: baseline.sessions, sessionCountAfter: saved.count,
    reportRecordCountBefore: baseline.reports, reportRecordCountAfter: saved.reports,
    wordRenderedPreview: path.relative(output, previewFile).replaceAll('\\', '/'), reloaded: true, verified: true }
  fs.writeFileSync(path.join(output, 'ai-report-verification.json'), JSON.stringify(evidence, null, 2), 'utf8')
  return evidence
}

export function buildAiReportScenes({ showCard, hideCard, sleep, studentId, output }) {
  return [
    {
      id: '01-title',
      narration: '星愿能力发展平台。软件操作教程第十六讲：AI 辅助报告生成与导出。本节从指定学生的已存训练记录整理草稿，核对后生成 Word 文件，再检查文件与会话。全部数据均为虚构演示资料。',
      caption: '软件操作教程 16\nAI 辅助报告生成与导出',
      async act(page) {
        appUrl = page.url().split('#')[0]
        const data = await page.evaluate((id) => ({
          sessions: window.db.get('SELECT count(*) AS n FROM ai_chat_session WHERE user_id = 1').n,
          reports: window.db.get('SELECT count(*) AS n FROM report_record').n,
          records: window.db.all('SELECT ts.id, r.name AS resource_name, ts.started_at, ts.completion_status FROM training_session ts LEFT JOIN sys_training_resource r ON r.id = ts.resource_id WHERE ts.student_id = ? ORDER BY ts.started_at DESC, ts.id DESC LIMIT 3', [id]),
        }), studentId)
        baseline = data
        sourceRecords = data.records
        if (sourceRecords.length !== 3) throw new Error('演示学生没有三条可核对训练场次')
        await showCard(page, '软件操作教程 16', '读取记录 · 核对草稿 · 导出文件')
        await sleep(4500)
      },
    },
    {
      id: '02-student',
      narration: '本节沿用上一讲的模型配置，管理员需确认模型已开启工具调用。打开 AI，选择一人一策，新建对话并关联演示生甲。先确认具体学生和资料范围，再要求读取记录。',
      caption: '前提：模型服务可用并开启工具调用\n一人一策 → 新对话 → 关联演示生甲',
      async act(page) {
        await hideCard(page)
        await page.getByRole('button', { name: '打开 AI 智能体', exact: true }).click()
        await page.locator('.ai-drawer .agent-select').click()
        await page.locator('.el-select-dropdown__item:visible').filter({ hasText: '一人一策' }).click()
        await page.getByRole('button', { name: '新对话', exact: true }).click()
        await page.locator('.ai-memory-bindbar .el-select').click()
        await page.locator('.ai-memory-bindbar input').fill('演示生甲')
        await page.locator('.el-select-dropdown__item:visible').filter({ hasText: '演示生甲' }).click()
        sessionId = await page.evaluate(() => window.db.get('SELECT max(id) AS id FROM ai_chat_session WHERE user_id = 1').id)
        await sleep(3500)
      },
    },
    {
      id: '03-query',
      narration: '明确要求只读取该生最近三次训练，先整理文字草稿，不立即生成文件。系统查询学生和训练记录后，给出摘要。首次发送如出现外发告知，先阅读再确认。等待实际结果，不把模型推测当作已存事实。',
      caption: '限定学生与最近三次训练，先要草稿\n读取真实记录，区分已知事实与模型推测',
      async act(page) {
        await page.getByPlaceholder('输入问题…', { exact: true }).fill(firstQuestion)
        await sleep(2000)
        await page.getByRole('button', { name: '发送', exact: true }).click()
        const confirm = page.getByRole('button', { name: '我已知悉，继续发送', exact: true })
        if (await confirm.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
          await sleep(3500)
          await confirm.click()
        }
        await waitForAnswer(page, 1)
        querySteps = await readToolSteps(page)
        await sleep(4000)
      },
    },
    {
      id: '04-review',
      narration: '先核对学生、任务名称、日期和完成状态。本例只汇总已有记录，不使用时长和正确率判断训练效果，也不生成诊断结论。信息不足或表述不准确时，应先补充、追问或修订，再要求导出。',
      caption: '核对学生、任务、日期、完成状态\n记录摘要不等于效果评价或正式评估结论',
      async act(page) {
        const answer = await page.evaluate((id) => window.db.get("SELECT content FROM ai_chat_message WHERE session_id = ? AND role = 'assistant' ORDER BY id LIMIT 1", [id]).content, sessionId)
        if (sourceRecords.some((r) => !answer.includes(r.resource_name) || !answer.includes(r.started_at.slice(0, 10)))) throw new Error('AI 草稿与本次源记录名称或日期不一致，需要人工核对')
        await page.locator('.ai-msg-scroll .msg-row.is-assistant').first().scrollIntoViewIfNeeded()
        await sleep(6000)
      },
    },
    {
      id: '05-export',
      narration: '核对后，在同一会话要求将这份摘要生成 Word，并保留演示草稿标记。AI 调用生成报告工具，生成后缀为 docx 的文件。这里固定导出 Word，不随评估报告的默认格式切换。请留意文件保存位置。',
      caption: '同一会话确认导出 → 生成报告工具\n实际下载 .docx，保留演示草稿标记',
      async act(page, app) {
        await armDownload(app, output)
        await page.getByPlaceholder('输入问题…', { exact: true }).fill(exportQuestion)
        await sleep(2000)
        await page.getByRole('button', { name: '发送', exact: true }).click()
        await waitForAnswer(page, 2)
        exportSteps = await readToolSteps(page)
        let result
        for (let i = 0; i < 80; i++) {
          result = await app.evaluate(() => globalThis.__scgpAiReportDownload)
          if (['completed', 'cancelled', 'interrupted'].includes(result.state)) break
          await sleep(250)
        }
        if (result?.state !== 'completed' || !result.file?.endsWith('.docx')) throw new Error('AI 工具没有成功下载 Word 文件')
        wordFile = result.file
        await verifyWord(output)
        await renderWord(output)
        await sleep(2500)
      },
    },
    {
      id: '06-preview',
      narration: '现在核对刚才实际导出的文件。这里展示的是该 Word 文件由本机 Word 渲染后的页面。检查标题、学生、三条记录和使用说明。归档或交付前，也要打开实际文件检查，不能只依据聊天中的成功提示。',
      caption: '实际导出 DOCX 经本机 Word 渲染的预览\n核对标题、学生、记录和使用说明',
      async act(page) {
        await page.goto(pathToFileURL(previewFile).href, { waitUntil: 'load' })
        await page.waitForFunction(() => [...document.images].length > 0 && [...document.images].every((img) => img.complete && img.naturalWidth > 0))
        await sleep(4000)
        await page.mouse.wheel(0, 430)
        await sleep(4500)
        await page.evaluate(() => window.scrollTo(0, 0))
        await sleep(2000)
      },
    },
    {
      id: '07-recall',
      narration: '返回软件，在我的 AI 会话中搜索本次提问，查看已保存的草稿与生成结果。重新载入后再次回查。会话和下载文件分别保存；生成文件不会自动新增正式评估记录，确认后的计划仍需按业务流程录入。',
      caption: '返回软件 → 我的 AI 会话 → 搜索与重载回查\n文件导出不会自动新增正式评估记录',
      async act(page) {
        await page.goto(`${appUrl}#/profile/ai-chat-history`, { waitUntil: 'domcontentloaded' })
        await page.locator('.ai-history-page').waitFor()
        await page.getByPlaceholder('搜索会话标题或消息内容').fill('最近三次统一训练场次')
        await page.getByRole('button', { name: '搜索', exact: true }).click()
        const row = page.locator('.ai-history-table .el-table__row').first()
        await row.getByRole('button', { name: '查看', exact: true }).click()
        await page.locator('.el-drawer:visible .ai-transcript .msg-row').nth(3).scrollIntoViewIfNeeded()
        await sleep(3000)
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.locator('.ai-history-page').waitFor()
        await page.getByPlaceholder('搜索会话标题或消息内容').fill('最近三次统一训练场次')
        await page.getByRole('button', { name: '搜索', exact: true }).click()
        await row.getByRole('button', { name: '查看', exact: true }).click()
        await page.locator('.el-drawer:visible .ai-transcript .msg-row').nth(3).scrollIntoViewIfNeeded()
        await verifyAiReport(page, studentId, output)
        await sleep(3500)
      },
    },
    {
      id: '08-end',
      narration: '本节完成。先限定资料范围，再核对 AI 草稿，确认后生成文件，最后打开检查与回查会话。把 AI 作为整理材料的助手，由工作人员确认最终内容。',
      caption: '本节完成\n限定范围 · 核对草稿 · 导出与回查',
      async act(page) {
        await showCard(page, '本节完成', '限定范围 · 核对草稿 · 导出与回查')
        await sleep(4500)
      },
    },
  ]
}
