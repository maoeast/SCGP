import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

function readProjectFile(relativePath) {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8')
}

test('AI 会话删除必须先提交 DB 事务，再清理无引用附件文件', () => {
  const storeSource = readProjectFile('src/stores/ai.ts')
  const apiSource = readProjectFile('src/database/ai-api.ts')

  assert.match(apiSource, /export interface AiSessionDeleteResult/)
  assert.match(apiSource, /deleteSession\(id: number\): AiSessionDeleteResult[\s\S]*BEGIN TRANSACTION/)
  assert.match(apiSource, /DELETE FROM ai_chat_message WHERE session_id = \?[\s\S]*DELETE FROM ai_chat_session WHERE id = \?/)
  assert.match(apiSource, /rawDb\.run\('COMMIT'\)[\s\S]*return \{ deleted, attachments \}/)
  assert.match(apiSource, /rawDb\.run\('ROLLBACK'\)/)

  assert.match(apiSource, /countAttachmentReferences\(rel: string\): number/)
  assert.match(storeSource, /cleanupDeletedSessionAttachments/)
  assert.match(storeSource, /countAttachmentReferences\(ref\.rel\) > 0[\s\S]*continue[\s\S]*deleteAttachment\(ref\)/)

  const myDeleteStart = storeSource.indexOf('async function deleteMySession')
  const adminDeleteStart = storeSource.indexOf('async function deleteSession')
  const resultDeleteForUser = storeSource.indexOf('const result = a.deleteSessionForUser', myDeleteStart)
  const cleanupForUser = storeSource.indexOf('cleanupDeletedSessionAttachments(a, result.attachments)', myDeleteStart)
  const resultDeleteAdmin = storeSource.indexOf('const result = a.deleteSession(id)', adminDeleteStart)
  const cleanupAdmin = storeSource.indexOf('cleanupDeletedSessionAttachments(a, result.attachments)', adminDeleteStart)

  assert.ok(resultDeleteForUser > myDeleteStart, '个人删除应先调用 DB 删除')
  assert.ok(cleanupForUser > resultDeleteForUser, '个人删除应在 DB 删除后清理附件')
  assert.ok(resultDeleteAdmin > adminDeleteStart, '管理员删除应先调用 DB 删除')
  assert.ok(cleanupAdmin > resultDeleteAdmin, '管理员删除应在 DB 删除后清理附件')

  assert.doesNotMatch(storeSource, /删除会话前清理其附件物理文件/)
})
