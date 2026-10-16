/** 教程 15：真实模型配置、咨询与历史回查。凭证只从进程环境读取。 */
import fs from 'node:fs'
import path from 'node:path'

let sessionId
let baseline
let connectionSucceeded = false
const question = '本次为虚构教程演示。为当前关联的演示生甲准备五分钟洗手步骤练习。以下只是演示观察，不是数据库结论：卷袖子需要口头提醒，开水龙头需要协助。请仅依据这些观察，给出目标、三个练习步骤和两个记录点，控制在三百字内，不作诊断，不调用工具或查询数据库。'
const followup = '如果要逐步减少卷袖子时的口头提醒，请把上一条建议改成两个可观察的记录点，控制在一百五十字内。不要把提示完成写成独立完成。'
const correction = '请再核对上一条回答的独立完成判定。本次如果用过口头提醒，就应记为口头提示后完成，不能记为独立完成。请据此修订两个记录点：一是实际用了什么支持，二是有无提醒及如何开始。不要设定完成几次就自动升级的标准。控制在一百五十字内。'

async function waitForAnswer(page, count) {
  await page.waitForFunction(({ id, count }) => window.db.get(
    "SELECT count(*) AS n FROM ai_chat_message WHERE session_id = ? AND role = 'assistant' AND delivery_status = 'completed' AND length(content) > 0", [id],
  ).n >= count, { id: sessionId, count }, { timeout: 180000 })
  await page.getByRole('button', { name: '发送', exact: true }).waitFor({ timeout: 30000 })
}

export async function verifyAiConsultation(page, studentId, output) {
  const saved = await page.evaluate((id) => ({
    session: window.db.get('SELECT id, agent_code, user_id, student_id, title FROM ai_chat_session WHERE id = ?', [id]),
    messages: window.db.all('SELECT id, role, content, delivery_status, tokens_total FROM ai_chat_message WHERE session_id = ? ORDER BY id', [id]),
    count: window.db.get('SELECT count(*) AS n FROM ai_chat_session WHERE user_id = 1').n,
    provider: window.db.get("SELECT code, base_url, default_model, length(api_key_enc) > 0 AS configured FROM ai_provider WHERE code = 'deepseek'"),
  }), sessionId)
  const users = saved.messages.filter((m) => m.role === 'user')
  const answers = saved.messages.filter((m) => m.role === 'assistant')
  if (!connectionSucceeded || saved.session?.student_id !== studentId || saved.session?.agent_code !== 'special_ed_teacher'
    || users.length !== 3 || users[0].content !== question || users[1].content !== followup || users[2].content !== correction
    || answers.length !== 3 || answers.some((m) => m.delivery_status !== 'completed' || !m.content.trim())
    || saved.count !== baseline + 1 || !saved.provider.configured) throw new Error('AI 配置、会话或真实回答保存核验失败')
  const evidence = { studentId, sessionId, agentCode: saved.session.agent_code, provider: saved.provider,
    connectionSucceeded, sessionCountBefore: baseline, sessionCountAfter: saved.count,
    userMessageCount: users.length, assistantMessageCount: answers.length,
    messages: saved.messages, reloaded: true, verified: true }
  fs.writeFileSync(path.join(output, 'ai-consultation-verification.json'), JSON.stringify(evidence, null, 2), 'utf8')
  return evidence
}

export function buildAiScenes({ showCard, hideCard, sleep, studentId, output }) {
  return [
    {
      id: '01-title',
      narration: '星愿能力发展平台。软件操作教程第十五讲：AI 助手配置与学生咨询。本节演示配置服务、测试连接、选择学生、提问追问，以及回查会话。学生资料与观察示例均为虚构。',
      caption: '软件操作教程 15\nAI 助手配置与学生咨询',
      async act(page) {
        baseline = await page.evaluate(() => window.db.get('SELECT count(*) AS n FROM ai_chat_session WHERE user_id = 1').n)
        await showCard(page, '软件操作教程 15', '配置服务 · 提问追问 · 会话回查')
        await sleep(4500)
      },
    },
    {
      id: '02-settings',
      narration: '管理员从系统管理打开 AI 智能体。本例使用 DeepSeek，先核对接口地址。这里需要聊天模型服务的 API Key。语音合成服务的凭证，不能直接作为聊天模型凭证使用。',
      caption: '系统管理 → AI 智能体\n选择聊天模型服务，核对接口地址',
      async act(page) {
        await hideCard(page)
        await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^系统管理$/u }).click()
        await page.getByRole('tab', { name: 'AI 智能体', exact: true }).click()
        const item = page.locator('.ai-agent-config .el-form-item').filter({ hasText: /^模型服务/u }).first()
        await item.locator('.el-select').click()
        await page.locator('.el-select-dropdown__item:visible').filter({ hasText: /^DeepSeek$/u }).click()
        await page.locator('.ai-agent-config .el-form-item').filter({ hasText: /^接口地址/u }).locator('input').fill('https://api.deepseek.com')
        await sleep(3500)
      },
    },
    {
      id: '03-configure',
      narration: '填写本次服务的 API Key，保持密码遮罩，然后保存配置。再核对默认模型。本例按服务商提供的模型标识添加文字对话模型。模型标识与显示名称用途不同，应以服务后台为准。',
      caption: '输入 API Key，保持遮罩并保存\n添加本次模型，选择为默认模型',
      async act(page) {
        const secret = process.env.SCGP_VIDEO_AI_API_KEY
        if (!secret) throw new Error('缺少本机 SCGP_VIDEO_AI_API_KEY')
        const input = page.locator('.ai-agent-config input[type="password"]')
        await input.fill(secret)
        await sleep(1400)
        await page.getByRole('button', { name: '保存配置', exact: true }).first().click()
        await page.getByText('AI 配置已保存', { exact: true }).waitFor()
        await page.locator('.model-list-head').getByRole('button', { name: '新增', exact: true }).click()
        const dialog = page.getByRole('dialog', { name: '新增模型', exact: true })
        await dialog.locator('.model-form .el-form-item').filter({ hasText: /^模型 ID/u }).locator('input').fill(process.env.SCGP_VIDEO_AI_MODEL || 'deepseek-flash')
        await dialog.getByPlaceholder('豆包 Seed Vision').fill('演示文字模型')
        await dialog.getByPlaceholder('doubao_seed_vision').fill('video_demo_15')
        for (const name of ['支持工具调用', '支持图片', '支持思考字段']) {
          if (await dialog.getByRole('checkbox', { name, exact: true }).isChecked()) {
            await dialog.locator('.el-checkbox').filter({ hasText: name }).click()
          }
        }
        await sleep(2200)
        await dialog.getByRole('button', { name: '保存', exact: true }).click()
        await dialog.waitFor({ state: 'hidden' })
        const model = page.locator('.ai-agent-config .el-form-item').filter({ hasText: /^默认模型/u }).first()
        await model.locator('.el-select').click()
        await page.locator('.el-select-dropdown__item:visible').filter({ hasText: '演示文字模型' }).click()
        await page.locator('.provider-card-title').scrollIntoViewIfNeeded()
        await sleep(2000)
      },
    },
    {
      id: '04-test',
      narration: '点击测试连接，等待模型真实返回。连接成功后，再开始咨询。如果失败，核对 Key、接口地址、模型权限和服务额度。这次测试只确认当前配置能够响应。',
      caption: '测试连接 → 等待服务真实响应\n成功后再开始咨询',
      async act(page) {
        await page.getByRole('button', { name: '测试连接', exact: true }).click()
        try {
          await page.locator('.el-message--success').filter({ hasText: '连接成功' }).waitFor({ timeout: 100000 })
          connectionSucceeded = true
        } catch {
          const message = await page.locator('.el-message--error').allTextContents()
          throw new Error(`真实连接测试未成功：${message.join('；') || '未获得成功提示，请检查服务配置'}`)
        }
        await sleep(3500)
      },
    },
    {
      id: '05-student',
      narration: '点击右下角 AI 按钮，选择一人一策，点击新对话，再关联演示生甲。根据工作目标选择智能体，核对学生归属。新任务使用新对话，便于后续回查。',
      caption: '打开 AI → 一人一策 → 新对话\n选择本次对话的学生：演示生甲',
      async act(page) {
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
      id: '06-question',
      narration: '提问时说明目标、观察和条件。本例请助手依据虚构观察，设计五分钟的洗手步骤练习。首次发送如出现外发告知，先阅读再确认。等待真实回答，并逐项核对是否符合现场条件。',
      caption: '输入明确目标、观察与条件，再发送\n阅读外发告知，核对实际返回的建议',
      async act(page) {
        await page.getByPlaceholder('输入问题…', { exact: true }).fill(question)
        await sleep(2500)
        await page.getByRole('button', { name: '发送', exact: true }).click()
        const confirm = page.getByRole('button', { name: '我已知悉，继续发送', exact: true })
        if (await confirm.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
          await sleep(4000)
          await confirm.click()
        }
        await waitForAnswer(page, 1)
        await sleep(6000)
        await page.locator('.ai-msg-scroll .el-scrollbar__wrap').evaluate((element) => { element.scrollTop = 0 })
        await sleep(4000)
      },
    },
    {
      id: '07-followup',
      narration: '在同一会话继续追问，并核对回答。本例进一步强调：用过口头提醒，就不能记为独立完成。要求助手据此修订记录点，再检查修订结果。AI 回答需要工作人员核对，也不会自动建立正式训练计划。',
      caption: '继续追问，并要求核对修订\n有口头提醒就不记独立完成，使用前核对回答',
      async act(page) {
        await page.getByPlaceholder('输入问题…', { exact: true }).fill(followup)
        await sleep(1800)
        await page.getByRole('button', { name: '发送', exact: true }).click()
        await waitForAnswer(page, 2)
        await sleep(3500)
        await page.getByPlaceholder('输入问题…', { exact: true }).fill(correction)
        await sleep(2200)
        await page.getByRole('button', { name: '发送', exact: true }).click()
        await waitForAnswer(page, 3)
        await sleep(7000)
      },
    },
    {
      id: '08-history',
      narration: '点击查看全部历史，进入我的 AI 会话，搜索本次内容并查看问答。重新载入后再次打开，核对提问与追问仍然存在。需要接着讨论时，可以从同一条会话继续对话。',
      caption: '查看全部历史 → 搜索 → 查看问答\n重载后再次回查同一会话',
      async act(page) {
        await page.getByRole('button', { name: '查看全部历史', exact: true }).click()
        await page.locator('.ai-history-page').waitFor()
        await page.getByPlaceholder('搜索会话标题或消息内容').fill('五分钟洗手步骤练习')
        await page.getByRole('button', { name: '搜索', exact: true }).click()
        const row = page.locator('.ai-history-table .el-table__row').first()
        await row.waitFor()
        await sleep(2500)
        await row.getByRole('button', { name: '查看', exact: true }).click()
        await page.locator('.el-drawer:visible .ai-transcript .msg-row').nth(5).waitFor()
        await sleep(4000)
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.locator('.ai-history-page').waitFor()
        await page.getByPlaceholder('搜索会话标题或消息内容').fill('五分钟洗手步骤练习')
        await page.getByRole('button', { name: '搜索', exact: true }).click()
        await row.getByRole('button', { name: '查看', exact: true }).click()
        await page.locator('.el-drawer:visible .ai-transcript .msg-row').nth(5).waitFor()
        await verifyAiConsultation(page, studentId, output)
        await sleep(4000)
      },
    },
    {
      id: '09-end',
      narration: '本节完成了服务配置、连接测试、学生关联、提问追问与会话回查。日常使用时先明确问题，再核对回答，并通过正式业务入口保存确认后的工作安排。',
      caption: '本节完成\n配置服务 · 真实咨询 · 会话回查',
      async act(page) {
        await showCard(page, '本节完成', '配置服务 · 真实咨询 · 会话回查')
        await sleep(5000)
      },
    },
  ]
}
