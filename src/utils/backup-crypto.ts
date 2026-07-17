export const BACKUP_ENVELOPE_FORMAT = 'scgp-backup'
export const BACKUP_CRYPTO_VERSION = 1
export const BACKUP_KDF_ITERATIONS = 310000
export const BACKUP_MIN_PASSWORD_LENGTH = 12

const SALT_BYTES = 16
const IV_BYTES = 12

export type BackupCryptoErrorCode =
  | 'missing_password'
  | 'weak_password'
  | 'invalid_envelope'
  | 'decrypt_failed'
  | 'unsupported_version'

export class BackupCryptoError extends Error {
  constructor(
    public readonly code: BackupCryptoErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'BackupCryptoError'
  }
}

export interface BackupCryptoEnvelope {
  format: typeof BACKUP_ENVELOPE_FORMAT
  cryptoVersion: typeof BACKUP_CRYPTO_VERSION
  kdf: 'PBKDF2-SHA-256'
  cipher: 'AES-256-GCM'
  iterations: number
  salt: string
  iv: string
  ciphertext: string
}

function assertPassword(password: string): void {
  if (!password) {
    throw new BackupCryptoError('missing_password', '请输入备份口令')
  }

  if (password.length < BACKUP_MIN_PASSWORD_LENGTH) {
    throw new BackupCryptoError('weak_password', `备份口令至少需要 ${BACKUP_MIN_PASSWORD_LENGTH} 个字符`)
  }
}

function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new BackupCryptoError('unsupported_version', '当前环境不支持 Web Crypto，无法处理 v4 备份')
  }
  return subtle
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function isBackupCryptoEnvelope(value: unknown): value is BackupCryptoEnvelope {
  if (!value || typeof value !== 'object') return false
  const envelope = value as Partial<BackupCryptoEnvelope>
  return (
    envelope.format === BACKUP_ENVELOPE_FORMAT &&
    envelope.cryptoVersion === BACKUP_CRYPTO_VERSION &&
    envelope.kdf === 'PBKDF2-SHA-256' &&
    envelope.cipher === 'AES-256-GCM' &&
    typeof envelope.iterations === 'number' &&
    typeof envelope.salt === 'string' &&
    typeof envelope.iv === 'string' &&
    typeof envelope.ciphertext === 'string'
  )
}

function hasBackupCryptoEnvelopeFormat(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  return (value as Partial<BackupCryptoEnvelope>).format === BACKUP_ENVELOPE_FORMAT
}

export function looksLikeBackupCryptoEnvelope(payload: string): boolean {
  try {
    return hasBackupCryptoEnvelopeFormat(JSON.parse(payload))
  } catch {
    return false
  }
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const subtle = getSubtleCrypto()
  const baseKey = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveKey',
  ])

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      iterations,
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptBackupEnvelope(plaintext: string, password: string): Promise<string> {
  assertPassword(password)

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(password, salt, BACKUP_KDF_ITERATIONS)
  const ciphertext = await getSubtleCrypto().encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
    },
    key,
    new TextEncoder().encode(plaintext),
  )

  const envelope: BackupCryptoEnvelope = {
    format: BACKUP_ENVELOPE_FORMAT,
    cryptoVersion: BACKUP_CRYPTO_VERSION,
    kdf: 'PBKDF2-SHA-256',
    cipher: 'AES-256-GCM',
    iterations: BACKUP_KDF_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  }

  return JSON.stringify(envelope)
}

export async function decryptBackupEnvelope(payload: string, password: string): Promise<string> {
  assertPassword(password)

  let parsed: unknown
  try {
    parsed = JSON.parse(payload)
  } catch {
    throw new BackupCryptoError('invalid_envelope', '备份文件格式错误')
  }

  if (hasBackupCryptoEnvelopeFormat(parsed) && (parsed as Partial<BackupCryptoEnvelope>).cryptoVersion !== BACKUP_CRYPTO_VERSION) {
    throw new BackupCryptoError('unsupported_version', '不支持的备份加密版本')
  }

  if (!isBackupCryptoEnvelope(parsed)) {
    throw new BackupCryptoError('invalid_envelope', '备份文件格式错误')
  }

  try {
    const salt = base64ToBytes(parsed.salt)
    const iv = base64ToBytes(parsed.iv)
    const ciphertext = base64ToBytes(parsed.ciphertext)
    const key = await deriveKey(password, salt, parsed.iterations)
    const plaintext = await getSubtleCrypto().decrypt(
      {
        name: 'AES-GCM',
        iv: toArrayBuffer(iv),
      },
      key,
      toArrayBuffer(ciphertext),
    )

    return new TextDecoder().decode(plaintext)
  } catch (error) {
    if (error instanceof BackupCryptoError) {
      throw error
    }
    throw new BackupCryptoError('decrypt_failed', '备份口令错误或文件已损坏')
  }
}
