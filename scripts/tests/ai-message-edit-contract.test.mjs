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
