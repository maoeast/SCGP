import CryptoJS from 'crypto-js'

export const SAFE_SECRET_PREFIX = 'safe:v1:'

// TODO(1.0.8): 删除旧 AES provider Key 迁移入口。只允许用于把 1.0.7 前的 api_key_enc 迁到 safe:v1。
const LEGACY_PROVIDER_AES_SECRET = 'SPED-PASSWORD-SECURITY-KEY-2025'

function decryptLegacyProviderSecret(encryptedData) {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, LEGACY_PROVIDER_AES_SECRET)
    const jsonStr = decrypted.toString(CryptoJS.enc.Utf8)
    const parsed = JSON.parse(jsonStr)
    return typeof parsed === 'string' && parsed.trim() ? parsed : null
  } catch {
    return null
  }
}

function toErrorResult(errorKind, error) {
  return { success: false, errorKind, error }
}

export function isSafeSecretPayload(value) {
  return typeof value === 'string' && value.startsWith(SAFE_SECRET_PREFIX)
}

export function createAISecretService(safeStorageAdapter) {
  function isEncryptionAvailable() {
    try {
      return !!safeStorageAdapter?.isEncryptionAvailable?.()
    } catch {
      return false
    }
  }

  function protectApiKey(plainKey) {
    const normalized = typeof plainKey === 'string' ? plainKey.trim() : ''
    if (!normalized) return { success: true, keyEnc: '' }
    if (!isEncryptionAvailable()) {
      return toErrorResult('safe_storage_unavailable', '当前系统不可用安全存储，请检查操作系统凭据服务后重新配置 API Key。')
    }

    try {
      const encrypted = safeStorageAdapter.encryptString(normalized)
      return { success: true, keyEnc: `${SAFE_SECRET_PREFIX}${Buffer.from(encrypted).toString('base64')}` }
    } catch {
      return toErrorResult('safe_storage_encrypt_failed', 'API Key 安全加密失败，请重新配置。')
    }
  }

  function decryptApiKey(encKey) {
    if (!encKey || typeof encKey !== 'string') {
      return toErrorResult('no_key', '尚未配置 API Key，请先在系统设置中配置。')
    }

    if (isSafeSecretPayload(encKey)) {
      if (!isEncryptionAvailable()) {
        return toErrorResult('safe_storage_unavailable', '当前系统不可用安全存储，请重新配置 API Key。')
      }

      try {
        const rawBase64 = encKey.slice(SAFE_SECRET_PREFIX.length)
        const decrypted = safeStorageAdapter.decryptString(Buffer.from(rawBase64, 'base64'))
        return typeof decrypted === 'string' && decrypted.trim()
          ? { success: true, apiKey: decrypted.trim(), legacy: false }
          : toErrorResult('decrypt_failed', 'API Key 解密失败，请重新配置。')
      } catch {
        return toErrorResult('decrypt_failed', 'API Key 解密失败，请重新配置。')
      }
    }

    const legacyKey = decryptLegacyProviderSecret(encKey)
    if (!legacyKey) {
      return toErrorResult('decrypt_failed', 'API Key 解密失败，请重新配置。')
    }
    return { success: true, apiKey: legacyKey, legacy: true }
  }

  function migrateApiKey(encKey) {
    if (!encKey || typeof encKey !== 'string') {
      return { success: true, keyEnc: '', migrated: false }
    }
    if (isSafeSecretPayload(encKey)) {
      return { success: true, keyEnc: encKey, migrated: false }
    }

    const decrypted = decryptApiKey(encKey)
    if (!decrypted.success) return decrypted

    const protectedResult = protectApiKey(decrypted.apiKey)
    if (!protectedResult.success) return protectedResult
    return { success: true, keyEnc: protectedResult.keyEnc, migrated: true }
  }

  return {
    isEncryptionAvailable,
    protectApiKey,
    decryptApiKey,
    migrateApiKey,
  }
}

export function registerAISecretHandlers(ipcMain, safeStorageAdapter) {
  const service = createAISecretService(safeStorageAdapter)

  ipcMain.handle('ai:protect-api-key', async (_event, plainKey) => {
    return service.protectApiKey(plainKey)
  })

  ipcMain.handle('ai:migrate-api-key', async (_event, encKey) => {
    return service.migrateApiKey(encKey)
  })

  return service
}
