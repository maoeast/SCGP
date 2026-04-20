export const PASSWORD_HASH_VERSION = 'pbkdf2-sha256-v1'
export const PASSWORD_PBKDF2_ITERATIONS = 600_000
export const PASSWORD_SALT_BYTES = 16
export const PASSWORD_HASH_BYTES = 32

export interface PasswordHashPayload {
  passwordHash: string
  salt: string
}

export interface PasswordVerificationResult {
  valid: boolean
  needsUpgrade: boolean
}

function ensureCryptoSupport(): Crypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API 不可用，无法处理密码哈希')
  }

  return crypto
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.trim().toLowerCase()

  if (!/^[0-9a-f]+$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error('无效的十六进制字符串')
  }

  const bytes = new Uint8Array(normalized.length / 2)

  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16)
  }

  return bytes
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }

  let mismatch = 0

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return mismatch === 0
}

function parseCurrentPasswordHash(passwordHash: string): { iterations: number; digestHex: string } | null {
  const [version, iterationsText, digestHex] = passwordHash.split('$')

  if (version !== PASSWORD_HASH_VERSION || !iterationsText || !digestHex) {
    return null
  }

  const iterations = Number.parseInt(iterationsText, 10)

  if (!Number.isFinite(iterations) || iterations <= 0 || !/^[0-9a-f]+$/i.test(digestHex)) {
    return null
  }

  return {
    iterations,
    digestHex: digestHex.toLowerCase(),
  }
}

async function derivePasswordDigest(password: string, salt: string, iterations: number): Promise<string> {
  const cryptoApi = ensureCryptoSupport()
  const passwordBytes = new TextEncoder().encode(password)
  const saltBytes = hexToBytes(salt)
  const keyMaterial = await cryptoApi.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveBits'])
  const derivedBits = await cryptoApi.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(saltBytes),
      iterations,
    },
    keyMaterial,
    PASSWORD_HASH_BYTES * 8,
  )

  return bytesToHex(new Uint8Array(derivedBits))
}

export function generatePasswordSalt(byteLength = PASSWORD_SALT_BYTES): string {
  if (!Number.isInteger(byteLength) || byteLength <= 0) {
    throw new Error('盐值长度必须是正整数')
  }

  const cryptoApi = ensureCryptoSupport()
  const bytes = new Uint8Array(byteLength)
  cryptoApi.getRandomValues(bytes)
  return bytesToHex(bytes)
}

export async function hashPasswordV1(
  password: string,
  salt = generatePasswordSalt(),
): Promise<PasswordHashPayload> {
  const digestHex = await derivePasswordDigest(password, salt, PASSWORD_PBKDF2_ITERATIONS)

  return {
    passwordHash: `${PASSWORD_HASH_VERSION}$${PASSWORD_PBKDF2_ITERATIONS}$${digestHex}`,
    salt,
  }
}

export function isLegacyPasswordHash(passwordHash: string): boolean {
  return !passwordHash.startsWith(`${PASSWORD_HASH_VERSION}$`)
}

export function needsPasswordHashUpgrade(passwordHash: string): boolean {
  const parsed = parseCurrentPasswordHash(passwordHash)

  if (!parsed) {
    return true
  }

  return parsed.iterations < PASSWORD_PBKDF2_ITERATIONS
}

export async function verifyPasswordRecord(
  password: string,
  passwordHash: string,
  salt: string,
): Promise<PasswordVerificationResult> {
  const parsed = parseCurrentPasswordHash(passwordHash)

  if (!parsed || isLegacyPasswordHash(passwordHash)) {
    return {
      valid: false,
      needsUpgrade: false,
    }
  }

  const computedDigest = await derivePasswordDigest(password, salt, parsed.iterations)

  return {
    valid: safeEqual(computedDigest, parsed.digestHex),
    needsUpgrade: parsed.iterations < PASSWORD_PBKDF2_ITERATIONS,
  }
}
