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
