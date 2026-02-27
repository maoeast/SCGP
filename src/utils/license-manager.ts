/**
 * 许可证管理器
 * 使用RSA公钥验证激活码
 * 对应 license-generator-dist 的生成逻辑
 */

// 内嵌公钥（为了在 Electron 打包后能正常工作）
const EMBEDDED_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAszkuP/7VBZN7PAy8PDoG
V91MMyq8q5qHFY/qv4eyrGeoTUTLFTr030/bIDZCkU/Z2VZc6VQeLKK+0UpqFFnZ
RmPReS8Mx0NAlpFjy3pp8NAgeUROxJatlkZd9qSCKHCBiNp7RrH4XVU22ImXMcsz
VXCWF4401walKJxwQdIn9Ydcsc98oKrKcKFzUvrhuiHDodgnwVdY71/QjQXvlY22
Nj4tpXN0hnfKN0VwCMaaHfP3bFqOLqk0NcdFHDj9ATau6Y7UQBWJMaknTY7tmcZA
0wXV6Wivu5tncouACPqJgGBXqHlf2HsSETEJqA5g3OIOkwG3oJWVVvWeT9AkjDri
qQIDAQAB
-----END PUBLIC KEY-----`

export type LicenseData = {
  t: 'trial' | 'full'  // type: 试用版或正式版
  v: string             // version: 版本号
  m: string             // machineId: 机器码 (试用码为 '*')
  c: number             // createdAt: 创建时间戳
  e: number | null      // expireAt: 过期时间戳 (null表示永久)
  p?: boolean           // permanent: 是否永久激活
}

export type LicenseInfo = {
  isValid: boolean
  type: 'trial' | 'full'
  machineId: string
  createdAt: Date
  expireAt: Date | null
  isPermanent: boolean
  isExpired: boolean
  daysRemaining: number | null
}

export class LicenseManager {
  private publicKey: string = ''
  private licenseCache: Map<string, LicenseInfo> = new Map()
  private publicKeyLoadPromise: Promise<void> | null = null

  constructor() {
    // 直接使用内嵌的公钥
    this.publicKey = EMBEDDED_PUBLIC_KEY
    console.log('✅ 使用内嵌公钥')
  }

  /**
   * 检查是否在安全上下文中运行（HTTPS 或 localhost）
   */
  private isSecureContext(): boolean {
    return window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  }

  /**
   * 检查 crypto.subtle 是否可用
   */
  private isCryptoSubtleAvailable(): boolean {
    return typeof crypto !== 'undefined' && crypto.subtle !== undefined
  }

  /**
   * 加载公钥（从文件或使用内嵌公钥）
   */
  private async loadPublicKeyFromFile(): Promise<void> {
    if (this.publicKeyLoadPromise) {
      return this.publicKeyLoadPromise
    }

    this.publicKeyLoadPromise = (async () => {
      try {
        let publicKeyContent = ''

        // 检测运行环境
        const isElectron = !!(window as any).electronAPI

        if (isElectron) {
          // Electron 环境：直接使用内嵌公钥（因为 require 在打包后的 ES 模块中不可用）
          console.log('⚠️ Electron 环境 - 使用内嵌公钥')
          publicKeyContent = EMBEDDED_PUBLIC_KEY
        } else {
          // 浏览器环境：使用 fetch
          try {
            const response = await fetch('/public-key.pem')
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            publicKeyContent = await response.text()
            console.log('✅ 浏览器环境 - 从文件加载公钥成功')
          } catch (error) {
            console.log('⚠️ 浏览器加载公钥文件失败，使用内嵌公钥:', error)
            publicKeyContent = EMBEDDED_PUBLIC_KEY
          }
        }

        this.publicKey = publicKeyContent

        if (!this.publicKey || !this.publicKey.includes('BEGIN PUBLIC KEY')) {
          throw new Error('公钥内容无效')
        }
      } catch (error) {
        console.error('❌ 公钥加载失败:', error)
        // 最后的备用方案：使用内嵌公钥
        this.publicKey = EMBEDDED_PUBLIC_KEY
        console.log('✅ 使用内嵌公钥作为备用方案')
      }
    })()

    return this.publicKeyLoadPromise
  }

  /**
   * 确保公钥已加载
   */
  private async ensurePublicKeyLoaded(): Promise<void> {
    // 公钥已在构造函数中设置，这里只做验证
    if (!this.publicKey) {
      throw new Error('公钥未初始化')
    }
  }

  /**
   * 反格式化激活码（移除 SPED- 和分隔符）
   */
  private unformatLicenseKey(formattedKey: string): string {
    const base64 = formattedKey
      .replace(/^SPED-/i, '')
      .replace(/-/g, '')
    return base64
  }

  /**
   * 使用 RSA 公钥验证签名
   */
  private async verifySignature(data: string, signature: ArrayBuffer): Promise<boolean> {
    await this.ensurePublicKeyLoaded()

    // 检查 crypto.subtle 是否可用
    if (!this.isCryptoSubtleAvailable()) {
      const isSecure = this.isSecureContext()
      if (!isSecure) {
        console.warn('⚠️ 当前运行在非安全上下文中，Web Crypto API 不可用')
        console.warn('访问地址:', window.location.href)
        console.warn('提示: 请使用 localhost 访问，或配置 HTTPS')
        throw new Error(
          '当前访问环境不支持激活码验证。\n' +
          '原因：浏览器在非安全上下文（非 HTTPS、非 localhost）中禁用了 Web Crypto API。\n\n' +
          '解决方案：\n' +
          '1. 使用本机访问：http://localhost:5173/\n' +
          '2. 或配置 HTTPS 证书后使用 HTTPS 访问'
        )
      } else {
        console.error('❌ crypto.subtle 不可用，但运行在安全上下文中')
        throw new Error('当前浏览器不支持 Web Crypto API')
      }
    }

    try {
      // 将公钥导入为 CryptoKey
      const cryptoKey = await this.importPublicKey(this.publicKey)

      // 验证签名
      const isValid = await crypto.subtle.verify(
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256'
        },
        cryptoKey,
        signature,
        new TextEncoder().encode(data)
      )

      return isValid
    } catch (error) {
      console.error('签名验证失败:', error)
      return false
    }
  }

  /**
   * 导入 PEM 格式的公钥
   */
  private async importPublicKey(pem: string): Promise<CryptoKey> {
    // 移除 PEM 头尾和换行符
    const pemContents = pem
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\n/g, '')

    // Base64 解码
    const binaryDerString = atob(pemContents)
    const binaryDer = new Uint8Array(binaryDerString.length)
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i)
    }

    // 导入为 CryptoKey
    return await crypto.subtle.importKey(
      'spki',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['verify']
    )
  }

  /**
   * 解析并验证激活码
   */
  async verifyLicense(formattedKey: string, machineId: string): Promise<LicenseInfo> {
    await this.ensurePublicKeyLoaded()

    try {
      // 1. 检查缓存
      if (this.licenseCache.has(formattedKey)) {
        const cached = this.licenseCache.get(formattedKey)!
        if (!cached.isExpired) {
          return cached
        }
      }

      // 2. 反格式化激活码
      const base64 = this.unformatLicenseKey(formattedKey)

      // 3. Base64 解码
      const binaryString = atob(base64)
      const combined = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        combined[i] = binaryString.charCodeAt(i)
      }

      // 4. 提取数据长度（前4字节）
      const dataLength = new DataView(combined.buffer).getUint32(0)

      // 5. 提取数据
      const dataStart = 4
      const dataEnd = 4 + dataLength
      const dataBytes = combined.slice(dataStart, dataEnd)
      const jsonData = new TextDecoder().decode(dataBytes)

      // 6. 提取签名
      const signature = combined.slice(dataEnd)

      // 7. 解析许可证数据
      const licenseData: LicenseData = JSON.parse(jsonData)

      // 8. 验证签名
      const isValidSignature = await this.verifySignature(jsonData, signature)
      if (!isValidSignature) {
        throw new Error('签名验证失败，激活码可能已被篡改')
      }

      // 9. 验证版本
      if (licenseData.v !== '1.0') {
        throw new Error(`不支持的许可证版本: ${licenseData.v}`)
      }

      // 10. 验证机器码（试用码除外）
      if (licenseData.m !== '*' && licenseData.m !== machineId) {
        throw new Error('激活码与当前机器码不匹配')
      }

      // 11. 构建许可证信息
      const createdAt = new Date(licenseData.c)
      const expireAt = licenseData.e ? new Date(licenseData.e) : null
      const isPermanent = licenseData.p === true || licenseData.e === null
      const now = new Date()
      const isExpired = expireAt ? now > expireAt : false
      const daysRemaining = expireAt
        ? Math.max(0, Math.ceil((expireAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
        : null

      const licenseInfo: LicenseInfo = {
        isValid: !isExpired,
        type: licenseData.t,
        machineId: licenseData.m,
        createdAt,
        expireAt,
        isPermanent,
        isExpired,
        daysRemaining
      }

      // 12. 缓存结果
      this.licenseCache.set(formattedKey, licenseInfo)

      return licenseInfo
    } catch (error) {
      console.error('激活码验证失败:', error)
      throw error
    }
  }

  /**
   * 验证激活码格式
   */
  validateFormat(formattedKey: string): boolean {
    if (!formattedKey || !formattedKey.startsWith('SPED-')) {
      return false
    }
    // 检查基本格式：SPED- 后面跟 Base64 字符（可能包含连字符分隔）
    // 移除 SPED- 前缀后，剩余部分应该是有效的 Base64 字符（可能带连字符）
    const remaining = formattedKey.substring(5)
    if (remaining.length < 10) {
      return false // 太短，不可能是有效的激活码
    }
    // 检查是否只包含 Base64 字符和连字符
    const pattern = /^[A-Za-z0-9+/=]+$/
    const withoutHyphens = remaining.replace(/-/g, '')
    return pattern.test(withoutHyphens) && withoutHyphens.length >= 10
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.licenseCache.clear()
  }
}

// 导出单例
export const licenseManager = new LicenseManager()
