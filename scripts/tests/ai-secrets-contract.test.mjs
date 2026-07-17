import test from 'node:test'
import assert from 'node:assert/strict'
import CryptoJS from 'crypto-js'
import { createAISecretService, SAFE_SECRET_PREFIX } from '../../electron/handlers/ai-secrets.mjs'

const LEGACY_PROVIDER_AES_SECRET = 'SPED-PASSWORD-SECURITY-KEY-2025'

function createFakeSafeStorage(available = true) {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (value) => Buffer.from(`sealed:${value}`, 'utf8'),
    decryptString: (buffer) => {
      const value = Buffer.from(buffer).toString('utf8')
      if (!value.startsWith('sealed:')) throw new Error('bad payload')
      return value.slice('sealed:'.length)
    },
  }
}

function createLegacyPayload(value) {
  return CryptoJS.AES.encrypt(JSON.stringify(value), LEGACY_PROVIDER_AES_SECRET).toString()
}

test('provider API Key 使用 safe:v1 格式保护并可解密', () => {
  const service = createAISecretService(createFakeSafeStorage())
  const protectedResult = service.protectApiKey(' sk-test ')

  assert.equal(protectedResult.success, true)
  assert.match(protectedResult.keyEnc, new RegExp(`^${SAFE_SECRET_PREFIX}`))
  assert.equal(service.decryptApiKey(protectedResult.keyEnc).apiKey, 'sk-test')
})

test('safeStorage 不可用时保护与 safe:v1 解密都失败闭合', () => {
  const service = createAISecretService(createFakeSafeStorage(false))

  assert.equal(service.protectApiKey('sk-test').success, false)
  assert.equal(service.protectApiKey('sk-test').errorKind, 'safe_storage_unavailable')
  assert.equal(service.decryptApiKey(`${SAFE_SECRET_PREFIX}${Buffer.from('sealed:sk-test').toString('base64')}`).success, false)
})

test('非法 safe:v1 载荷不会回退旧 AES', () => {
  const service = createAISecretService(createFakeSafeStorage())
  const result = service.decryptApiKey(`${SAFE_SECRET_PREFIX}${Buffer.from('plain').toString('base64')}`)

  assert.equal(result.success, false)
  assert.equal(result.errorKind, 'decrypt_failed')
})

test('旧 AES provider Key 可迁移到 safe:v1 且迁移结果不暴露明文', () => {
  const service = createAISecretService(createFakeSafeStorage())
  const legacyPayload = createLegacyPayload('legacy-sk')
  const migrated = service.migrateApiKey(legacyPayload)

  assert.equal(migrated.success, true)
  assert.equal(migrated.migrated, true)
  assert.match(migrated.keyEnc, new RegExp(`^${SAFE_SECRET_PREFIX}`))
  assert.equal(Object.prototype.hasOwnProperty.call(migrated, 'apiKey'), false)
  assert.equal(service.decryptApiKey(migrated.keyEnc).apiKey, 'legacy-sk')
})
