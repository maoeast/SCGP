/**
 * License manager backed by an embedded RSA public key.
 * The client no longer depends on a separate public-key.pem file at runtime.
 */

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
  t: 'trial' | 'full'
  v: string
  m: string
  c: number
  e: number | null
  am: string[]
  p?: boolean
}

export type LicenseInfo = {
  isValid: boolean
  type: 'trial' | 'full'
  machineId: string
  createdAt: Date
  expireAt: Date | null
  allowedModules: string[]
  isPermanent: boolean
  isExpired: boolean
  daysRemaining: number | null
}

export class LicenseManager {
  private publicKey = EMBEDDED_PUBLIC_KEY
  private licenseCache: Map<string, LicenseInfo> = new Map()

  private isSecureContext(): boolean {
    return window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  }

  private isCryptoSubtleAvailable(): boolean {
    return typeof crypto !== 'undefined' && crypto.subtle !== undefined
  }

  private async ensurePublicKeyLoaded(): Promise<void> {
    if (!this.publicKey || !this.publicKey.includes('BEGIN PUBLIC KEY')) {
      throw new Error('Public key is not initialized')
    }
  }

  private unformatLicenseKey(formattedKey: string): string {
    return formattedKey.replace(/^SPED-/i, '').replace(/-/g, '')
  }

  private async verifySignature(data: string, signature: BufferSource): Promise<boolean> {
    await this.ensurePublicKeyLoaded()

    if (!this.isCryptoSubtleAvailable()) {
      const isSecure = this.isSecureContext()
      if (!isSecure) {
        console.warn('Web Crypto API is unavailable in an insecure context')
        console.warn('访问地址:', window.location.href)
        console.warn('请使用 localhost 或 HTTPS 访问以启用激活码校验')
        throw new Error(
          '当前访问环境不支持激活码验证。\n' +
          '原因：浏览器在非安全上下文中禁用了 Web Crypto API。\n\n' +
          '解决方案：\n' +
          '1. 使用 http://localhost:5173/ 访问\n' +
          '2. 或配置 HTTPS 证书后使用 HTTPS 访问'
        )
      }

      console.error('crypto.subtle is unavailable in a secure context')
      throw new Error('当前浏览器不支持 Web Crypto API')
    }

    try {
      const cryptoKey = await this.importPublicKey(this.publicKey)

      return await crypto.subtle.verify(
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256',
        },
        cryptoKey,
        signature,
        new TextEncoder().encode(data)
      )
    } catch (error) {
      console.error('签名验证失败:', error)
      return false
    }
  }

  private async importPublicKey(pem: string): Promise<CryptoKey> {
    const pemContents = pem
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\n/g, '')

    const binaryDerString = atob(pemContents)
    const binaryDer = new Uint8Array(binaryDerString.length)
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i)
    }

    return await crypto.subtle.importKey(
      'spki',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['verify']
    )
  }

  async verifyLicense(formattedKey: string, machineId: string): Promise<LicenseInfo> {
    await this.ensurePublicKeyLoaded()

    try {
      if (this.licenseCache.has(formattedKey)) {
        const cached = this.licenseCache.get(formattedKey)!
        if (!cached.isExpired) {
          return cached
        }
      }

      const base64 = this.unformatLicenseKey(formattedKey)
      const binaryString = atob(base64)
      const combined = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        combined[i] = binaryString.charCodeAt(i)
      }

      const dataLength = new DataView(combined.buffer).getUint32(0)
      const dataStart = 4
      const dataEnd = 4 + dataLength
      const dataBytes = combined.slice(dataStart, dataEnd)
      const jsonData = new TextDecoder().decode(dataBytes)
      const signature = combined.slice(dataEnd)

      const licenseData: LicenseData = JSON.parse(jsonData)
      const isValidSignature = await this.verifySignature(jsonData, signature)
      if (!isValidSignature) {
        throw new Error('签名验证失败，激活码可能已被篡改')
      }

      if (licenseData.v !== '1.0') {
        throw new Error(`不支持的许可证版本: ${licenseData.v}`)
      }

      if (!Array.isArray(licenseData.am)) {
        throw new Error('激活码缺少 am 授权模块字段')
      }

      const allowedModules = licenseData.am
        .filter((moduleCode): moduleCode is string => typeof moduleCode === 'string')
        .map((moduleCode) => moduleCode.trim())
        .filter(Boolean)

      if (licenseData.m !== '*' && licenseData.m !== machineId) {
        throw new Error('激活码与当前机器码不匹配')
      }

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
        allowedModules,
        isPermanent,
        isExpired,
        daysRemaining,
      }

      this.licenseCache.set(formattedKey, licenseInfo)
      return licenseInfo
    } catch (error) {
      console.error('激活码验证失败:', error)
      throw error
    }
  }

  validateFormat(formattedKey: string): boolean {
    if (!formattedKey || !formattedKey.startsWith('SPED-')) {
      return false
    }

    const remaining = formattedKey.substring(5)
    if (remaining.length < 10) {
      return false
    }

    const pattern = /^[A-Za-z0-9+/=]+$/
    const withoutHyphens = remaining.replace(/-/g, '')
    return pattern.test(withoutHyphens) && withoutHyphens.length >= 10
  }

  clearCache(): void {
    this.licenseCache.clear()
  }
}

export const licenseManager = new LicenseManager()
