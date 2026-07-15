// 加密工具模块
import CryptoJS from 'crypto-js'

// 加密配置
const AES_SECRET = 'SPED-PASSWORD-SECURITY-KEY-2025'

/** CryptoJS WordArray 实例类型（crypto-js 默认导入无法在类型位置作命名空间，故取实例类型） */
type WordArray = InstanceType<typeof CryptoJS.lib.WordArray>
const SALT_LENGTH = 32

/**
 * 生成随机盐值
 */
export function generateSalt(): string {
  const array = new Uint8Array(SALT_LENGTH)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * AES-256 加密密码
 */
export function encryptPassword(password: string, salt?: string): { hash: string; salt: string } {
  // 如果没有提供盐值，则生成新的
  const useSalt = salt || generateSalt()

  // 使用 PBKDF2 派生密钥
  const key = CryptoJS.PBKDF2(password, useSalt, {
    keySize: 256/32,
    iterations: 10000
  })

  // 使用 AES-256 加密
  const encrypted = CryptoJS.AES.encrypt(password, key).toString()

  // 组合加密后的密码和盐值
  const combined = btoa(JSON.stringify({
    encrypted,
    salt: useSalt
  }))

  return {
    hash: combined,
    salt: useSalt
  }
}

/**
 * 验证密码
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  try {
    // 解码组合的密码数据
    const decoded = atob(hashedPassword)
    const { encrypted, salt } = JSON.parse(decoded)

    // 使用相同的盐值派生密钥
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    })

    // 解密
    const decrypted = CryptoJS.AES.decrypt(encrypted, key)
    const decryptedPassword = decrypted.toString(CryptoJS.enc.Utf8)

    // 比较密码
    return decryptedPassword === password
  } catch (error) {
    console.error('密码验证失败:', error)
    return false
  }
}

/**
 * 简化的密码哈希（用于向后兼容）
 */
export function hashPasswordSimple(password: string, salt: string): string {
  return btoa(password + salt)
}

/**
 * 简化的密码验证（用于向后兼容）
 */
export function verifyPasswordSimple(password: string, salt: string, hashedPassword: string): boolean {
  return hashPasswordSimple(password, salt) === hashedPassword
}

/**
 * 数据加密
 */
export function encryptData(data: any, key?: string): string {
  const useKey = key || AES_SECRET
  const jsonStr = JSON.stringify(data)
  return CryptoJS.AES.encrypt(jsonStr, useKey).toString()
}

/**
 * 数据解密
 */
export function decryptData(encryptedData: string, key?: string): any {
  try {
    const useKey = key || AES_SECRET
    const decrypted = CryptoJS.AES.decrypt(encryptedData, useKey)
    const jsonStr = decrypted.toString(CryptoJS.enc.Utf8)
    return JSON.parse(jsonStr)
  } catch (error) {
    console.error('数据解密失败:', error)
    return null
  }
}

/**
 * Uint8Array → CryptoJS WordArray：每 4 字节打包成一个 32 位字，保持 big-endian 字节序。
 * 不能直接把 Uint8Array 传给 WordArray.create（会被当成稀疏字数组，导致字节错位膨胀）。
 */
function bytesToWordArray(bytes: Uint8Array): WordArray {
  const words: number[] = []
  for (let i = 0; i < bytes.length; i++) {
    const wordIndex = i >>> 2
    const shift = 24 - (i % 4) * 8
    words[wordIndex] = (((words[wordIndex] ?? 0) | ((bytes[i] ?? 0) << shift))) >>> 0
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length)
}

/**
 * CryptoJS WordArray → Uint8Array：按 sigBytes 截断取回原始字节。
 */
function wordArrayToBytes(wordArray: WordArray): Uint8Array {
  const { words, sigBytes } = wordArray
  const bytes = new Uint8Array(sigBytes)
  for (let i = 0; i < sigBytes; i++) {
    bytes[i] = ((words[i >>> 2] ?? 0) >>> (24 - (i % 4) * 8)) & 0xff
  }
  return bytes
}

/**
 * 加密二进制数据（Uint8Array）→ OpenSSL 格式 base64 字符串。
 * 供备份 zip 归档加密；与 encryptData 共用 AES_SECRET，纯 crypto-js 无新依赖。
 */
export function encryptBytes(bytes: Uint8Array, key?: string): string {
  const useKey = key || AES_SECRET
  return CryptoJS.AES.encrypt(bytesToWordArray(bytes), useKey).toString()
}

/**
 * 解密二进制数据（encryptBytes 的逆操作）。
 * 密钥错误 / 数据损坏 / padding 错误时返回 null，语义与 decryptData 一致。
 */
export function decryptBytes(payload: string, key?: string): Uint8Array | null {
  if (!payload) return null
  try {
    const useKey = key || AES_SECRET
    const decrypted = CryptoJS.AES.decrypt(payload, useKey)
    // crypto-js 对非法/错误密文可能返回负 sigBytes（padding 异常），视为失败而非抛 RangeError
    if (decrypted.sigBytes < 0) return null
    return wordArrayToBytes(decrypted)
  } catch (error) {
    console.error('二进制解密失败:', error)
    return null
  }
}

/**
 * 计算二进制的 MD5（hex），用于备份归档完整性校验（非安全用途）。
 */
export function md5Bytes(bytes: Uint8Array): string {
  return CryptoJS.MD5(bytesToWordArray(bytes)).toString()
}

/**
 * 生成安全的随机字符串
 */
export function generateSecureRandom(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}