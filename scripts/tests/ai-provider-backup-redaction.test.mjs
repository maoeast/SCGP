import test from 'node:test'
import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
})

const { redactBackupTableRows } = jiti('../../src/utils/backup-redaction.ts')

test('备份导出会清空 ai_provider.api_key_enc', () => {
  const rows = [
    { code: 'deepseek', api_key_enc: 'safe:v1:secret', base_url: 'https://example.test' },
    { code: 'doubao', api_key_enc: '', base_url: 'https://ark.example.test' },
  ]

  assert.deepEqual(redactBackupTableRows('ai_provider', rows), [
    { code: 'deepseek', api_key_enc: '', base_url: 'https://example.test' },
    { code: 'doubao', api_key_enc: '', base_url: 'https://ark.example.test' },
  ])
})

test('备份脱敏不会复制或改写非 provider 表', () => {
  const rows = [{ id: 1, api_key_enc: 'unrelated' }]

  assert.equal(redactBackupTableRows('ai_chat_message', rows), rows)
})
