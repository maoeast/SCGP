import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

function readProjectFile(relativePath) {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8')
}

test('AI provider 记录学校专属 Key 交付治理元信息', () => {
  const initSource = readProjectFile('src/database/init.ts')
  const apiSource = readProjectFile('src/database/ai-api.ts')
  const storeSource = readProjectFile('src/stores/ai.ts')
  const viewSource = readProjectFile('src/views/system/AiAgentConfig.vue')

  for (const column of ['key_owner_name', 'key_label', 'key_expires_at']) {
    assert.match(initSource, new RegExp(column))
    assert.match(apiSource, new RegExp(column))
  }

  for (const field of ['keyOwnerName', 'keyLabel', 'keyExpiresAt']) {
    assert.match(apiSource, new RegExp(`${field}: string`))
    assert.match(storeSource, new RegExp(`${field}\\?: string`))
    assert.match(viewSource, new RegExp(field))
  }

  assert.match(viewSource, /每所学校单独创建 Key/)
  assert.match(viewSource, /后台设置额度/)
  assert.match(viewSource, /账单核对与泄露停用/)
  assert.match(viewSource, /轮换提醒/)
})

test('AI provider Key 明文仍只进入 safeStorage 保护路径', () => {
  const storeSource = readProjectFile('src/stores/ai.ts')
  const backupSource = readProjectFile('src/utils/backup-redaction.ts')

  assert.match(storeSource, /window\.electronAPI\.protectAiApiKey\(plainKey\)/)
  assert.match(storeSource, /providerInput\.apiKeyEnc = result\.keyEnc/)
  assert.match(backupSource, /ai_provider[\s\S]*api_key_enc/)
})
