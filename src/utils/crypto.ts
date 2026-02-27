// 加密工具模块
import CryptoJS from 'crypto-js'

// 加密配置
const AES_SECRET = 'SPED-PASSWORD-SECURITY-KEY-2025'
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
 * 生成安全的随机字符串
 */
export function generateSecureRandom(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}