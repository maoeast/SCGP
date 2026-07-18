import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
})

const {
  classifyResourceUnpackResult,
  failedResourceRestore,
  skippedResourceRestore,
} = jiti('../../src/utils/backup-restore-result.ts')

test('resource restore result classifies full success', () => {
  const result = classifyResourceUnpackResult({
    success: true,
    restored: 3,
    failed: [],
  })

  assert.deepEqual(result, {
    status: 'restored',
    restored: 3,
    failed: [],
  })
})

test('resource restore result classifies partial success', () => {
  const result = classifyResourceUnpackResult({
    success: true,
    restored: 2,
    failed: [{ rel: 'uploaded/missing.png', error: 'EACCES' }],
  })

  assert.equal(result.status, 'partial')
  assert.equal(result.restored, 2)
  assert.equal(result.failed.length, 1)
  assert.equal(result.reason, 'partial_restore')
})

test('resource restore result classifies unpack failure', () => {
  const result = classifyResourceUnpackResult({
    success: false,
    error: 'invalid zip',
  })

  assert.equal(result.status, 'failed')
  assert.equal(result.reason, 'unpack_failed')
  assert.equal(result.failed[0].error, 'invalid zip')
})

test('resource restore result helpers preserve skipped and failed reasons', () => {
  assert.deepEqual(skippedResourceRestore('no_resource_archive'), {
    status: 'skipped',
    restored: 0,
    failed: [],
    reason: 'no_resource_archive',
  })

  assert.deepEqual(failedResourceRestore('checksum_failed', '资源归档校验失败'), {
    status: 'failed',
    restored: 0,
    failed: [{ error: '资源归档校验失败' }],
    reason: 'checksum_failed',
  })
})

test('system restore UI distinguishes resource partial and failed states', () => {
  const source = readFileSync(resolve(projectRoot, 'src/views/System.vue'), 'utf8')

  assert.match(source, /resources\.status === 'partial'/)
  assert.match(source, /资源文件部分恢复/)
  assert.match(source, /请进入资源健康检查核对缺失文件/)
  assert.match(source, /resources\.status === 'failed'/)
  assert.match(source, /数据已恢复，但资源文件恢复失败/)
  assert.match(source, /resources\.reason === 'legacy_without_resource_archive'/)
  assert.match(source, /旧版备份不包含资源归档，仅恢复了数据库/)
  assert.match(source, /providerSecretsIncluded === false/)
  assert.match(source, /AI 模型服务 API Key 未随备份恢复，请重新配置/)
})
