import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

function readProjectFile(relativePath) {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8')
}

test('最近一条纯文本用户消息的编辑入口仅在主聊天中启用', () => {
  const transcriptSource = readProjectFile('src/features/ai/components/AiChatTranscript.vue')
  const assistantSource = readProjectFile('src/features/ai/components/AiAssistant.vue')
  const historySource = readProjectFile('src/views/AiChatHistory.vue')
  const adminSource = readProjectFile('src/views/system/AiAgentConfig.vue')

  assert.match(transcriptSource, /editable\?: boolean/)
  assert.match(transcriptSource, /const editableMessageId = computed/)
  assert.match(transcriptSource, /message\.role !== 'user'/)
  assert.match(transcriptSource, /message\.attachments\?\.length\) return null/)
  assert.match(
    transcriptSource,
    /emit\('editMessage', \{ id: message\.id, content: message\.content \}\)/,
  )

  assert.match(
    assistantSource,
    /<AiChatTranscript[\s\S]*?editable[\s\S]*?@edit-message="beginMessageEdit"/,
  )
  assert.match(assistantSource, /editingMessageId/)
  assert.doesNotMatch(historySource, /<AiChatTranscript[^>]*\seditable(?:\s|>)/)
  assert.doesNotMatch(adminSource, /<AiChatTranscript[^>]*\seditable(?:\s|>)/)
})

test('开启报告导出的智能体可直接导出单条已完成回答', () => {
  const transcriptSource = readProjectFile('src/features/ai/components/AiChatTranscript.vue')
  const assistantSource = readProjectFile('src/features/ai/components/AiAssistant.vue')
  const historySource = readProjectFile('src/views/AiChatHistory.vue')

  assert.match(transcriptSource, /exportAssistantMessages\?: boolean/)
  assert.match(transcriptSource, /message\.role === 'assistant'/)
  assert.match(transcriptSource, /!message\.pending/)
  assert.match(transcriptSource, /emit\('exportAssistantMessage', \{ content: message\.content \}\)/)
  assert.match(transcriptSource, /aria-label="导出本条回答为 Word"/)

  assert.match(
    assistantSource,
    /<AiChatTranscript[\s\S]*?:export-assistant-messages="canGenerateReport"[\s\S]*?@export-assistant-message="exportAssistantMessage"/,
  )
  const exportStart = assistantSource.indexOf('async function exportAssistantMessage(')
  const exportEnd = assistantSource.indexOf('async function sendStarterPrompt(', exportStart)
  const exportBlock = assistantSource.slice(exportStart, exportEnd)
  assert.ok(exportStart >= 0 && exportEnd > exportStart, '应存在单条回答 Word 导出实现')
  assert.match(exportBlock, /buildAIReportWordPayload/)
  assert.match(exportBlock, /exportWordDocument/)
  assert.match(exportBlock, /report_type:\s*'general'/)
  assert.match(exportBlock, /text: answer/)
  assert.match(exportBlock, /preserveParagraphText:\s*true/)
  assert.doesNotMatch(exportBlock, /sendChat/)
  assert.doesNotMatch(historySource, /export-assistant-messages/)
})

test('生成报告入口位于附件按钮上方', () => {
  const assistantSource = readProjectFile('src/features/ai/components/AiAssistant.vue')

  assert.match(assistantSource, /<div class="ai-composer">/)
  assert.match(assistantSource, /class="composer-utility-actions"/)
  assert.ok(
    assistantSource.indexOf('aria-label="生成报告"') < assistantSource.indexOf('aria-label="添加图片或文档"'),
    '生成报告应排在附件按钮上方',
  )
})

test('聊天输入区下方显示 AI 回答参考提示', () => {
  const assistantSource = readProjectFile('src/features/ai/components/AiAssistant.vue')

  assert.match(
    assistantSource,
    /<p class="ai-composer-disclaimer">由 AI 助手提供服务，回答仅供参考<\/p>/,
  )
  assert.match(assistantSource, /\.ai-composer-disclaimer\s*\{[\s\S]*?text-align:\s*center/)
})

test('AI 悬浮入口使用独立组件提供固定圆形表情和左侧提示', () => {
  const appSource = readProjectFile('src/App.vue')
  const assistantSource = readProjectFile('src/features/ai/components/AiAssistant.vue')
  const floatingButtonSource = readProjectFile('src/features/ai/components/AiAssistantFloatingButton.vue')

  assert.match(appSource, /import \{ useAuthStore \} from '@\/stores\/auth'/)
  assert.match(appSource, /const authStore = useAuthStore\(\)/)
  assert.match(appSource, /<AiAssistant v-if="authStore\.isLoggedIn" \/>/)
  assert.doesNotMatch(appSource, /<AiAssistant \/>/)
  assert.match(assistantSource, /import AiAssistantFloatingButton from '@\/features\/ai\/components\/AiAssistantFloatingButton\.vue'/)
  assert.match(
    assistantSource,
    /<AiAssistantFloatingButton v-if="!drawerVisible && !isImmersiveRoute" @open="openDrawer\(\)" \/>/,
  )
  assert.doesNotMatch(assistantSource, /class="ai-fab"/)

  assert.doesNotMatch(floatingButtonSource, /SHAPE_ORDER|squircle|sparkle|cycleShape|attributeName="d"/)
  assert.match(floatingButtonSource, /right: 24px/)
  assert.match(floatingButtonSource, /bottom: 24px/)
  assert.match(floatingButtonSource, /z-index: 9999/)
  assert.match(floatingButtonSource, /width: 60px/)
  assert.match(floatingButtonSource, /height: 60px/)
  assert.match(
    floatingButtonSource,
    /<circle[\s\S]*?class="ai-floating-button__background"[\s\S]*?cx="30"[\s\S]*?cy="30"[\s\S]*?r="27"/,
  )
  assert.match(floatingButtonSource, /#C1E3F7/)
  assert.match(floatingButtonSource, /#9FD3EF/)
  assert.match(floatingButtonSource, /#79BFE3/)
  assert.match(floatingButtonSource, /--ai-floating-face-color: #596273/)
  assert.match(floatingButtonSource, /fill: var\(--ai-floating-face-color\)/)
  assert.match(floatingButtonSource, /stroke: var\(--ai-floating-face-color\)/)
  assert.match(floatingButtonSource, /scale\(1\.08\)/)
  assert.match(floatingButtonSource, /right: calc\(100% \+ 12px\)/)
  assert.match(floatingButtonSource, /@keyframes ai-floating-button-float/)
  assert.match(floatingButtonSource, /@keyframes ai-floating-button-tooltip-in/)
  assert.match(floatingButtonSource, /@keyframes ai-floating-button-look/)
  assert.match(floatingButtonSource, /@keyframes ai-floating-button-blink/)
  assert.match(floatingButtonSource, /class="ai-floating-button__eye-dot" cx="21" cy="23"/)
  assert.match(floatingButtonSource, /class="ai-floating-button__eye-dot" cx="39" cy="23"/)
  assert.match(floatingButtonSource, /class="ai-floating-button__happy-eyes"/)
  assert.match(floatingButtonSource, /class="ai-floating-button__mouth"/)
  assert.match(floatingButtonSource, /d="M 20\.5 35 C 24 42\.5, 36 42\.5, 39\.5 35"/)
  assert.match(
    floatingButtonSource,
    /\.ai-floating-button__face\s*\{[\s\S]*?animation: ai-floating-button-look 6\.4s/,
  )
  assert.match(floatingButtonSource, /:hover \.ai-floating-button__happy-eyes/)
  assert.match(floatingButtonSource, /prefers-reduced-motion/)
})

test('编辑 API 校验归属与末条消息，并在事务中更新正文和截断旧回复', () => {
  const apiSource = readProjectFile('src/database/ai-api.ts')
  const start = apiSource.indexOf('editLastUserMessageForUser(')
  const end = apiSource.indexOf('countAttachmentReferences(', start)
  const editBlock = apiSource.slice(start, end)

  assert.ok(start >= 0 && end > start, '应存在受用户归属约束的消息编辑 API')
  assert.match(editBlock, /getSessionForUser\(sessionId, userId\)/)
  assert.match(editBlock, /WHERE session_id = \? AND role = 'user'[\s\S]*ORDER BY id DESC/)
  assert.match(editBlock, /parseAttachmentRefs\(target\.attachments\)/)
  assert.match(editBlock, /rawDb\.run\('BEGIN TRANSACTION'\)/)
  assert.match(editBlock, /UPDATE ai_chat_message[\s\S]*SET content = \?/)
  assert.match(editBlock, /DELETE FROM ai_chat_message WHERE session_id = \? AND id > \?/)
  assert.match(editBlock, /rawDb\.run\('COMMIT'\)/)
  assert.match(editBlock, /rawDb\.run\('ROLLBACK'\)/)

  const updateIndex = editBlock.indexOf('UPDATE ai_chat_message')
  const deleteIndex = editBlock.indexOf('DELETE FROM ai_chat_message')
  const commitIndex = editBlock.indexOf("rawDb.run('COMMIT')")
  assert.ok(updateIndex < deleteIndex && deleteIndex < commitIndex, '必须先更新、再截断、最后提交')
})

test('Store 编辑分支复用原消息并保留新写入消息的真实 ID', () => {
  const storeSource = readProjectFile('src/stores/ai.ts')
  const start = storeSource.indexOf('async function sendChat(')
  const end = storeSource.indexOf('async function resetAllPrivacyAck', start)
  const sendBlock = storeSource.slice(start, end)

  assert.ok(start >= 0 && end > start, '应存在 sendChat 实现')
  assert.match(sendBlock, /options: AiSendChatOptions = \{\}/)
  assert.match(sendBlock, /a\.editLastUserMessageForUser\(sessionId, uid, editMessageId, fullContent\)/)
  assert.match(sendBlock, /currentMessages\.value = a\.listMessagesForUser\(sessionId, uid\)/)
  assert.match(sendBlock, /await loadSessions\(\)/)
  assert.match(sendBlock, /const userMessageId = a\.saveMessage/)
  assert.match(sendBlock, /id: userMessageId/)
  assert.match(sendBlock, /const assistantMessageId = a\.saveMessage/g)
  assert.match(sendBlock, /id: assistantMessageId/g)
  assert.doesNotMatch(sendBlock, /id:\s*0/)
})
