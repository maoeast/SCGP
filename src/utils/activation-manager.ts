/**
 * 激活管理器
 * 整合新的 RSA 签名验证系统和数据库存储
 */

import { DatabaseAPI } from '@/database/api'
import { licenseManager } from './license-manager'
import type { LicenseInfo } from './license-manager'

// localStorage 缓存相关常量
const CACHE_KEY = 'sic_ads_activation_cache'
const CACHE_VERSION = '1.0'

/**
 * localStorage 缓存的激活数据结构
 */
interface ActivationCache {
  version: string
  machineCode: string
  activationCode?: string
  isActivated: boolean
  isTrial: boolean
  trialStart?: string
  trialEnd?: string
  expiresAt?: string
  licenseType: 'trial' | 'full'
  cachedAt: string
}

export interface ActivationInfo {
  machineCode: string
  activationCode?: string
  isActivated: boolean
  isTrial: boolean
  trialStart?: string
  trialEnd?: string
  expiresAt?: string
  licenseType: 'trial' | 'full'
}

export interface ActivationResult {
  success: boolean
  message: string
  data?: ActivationInfo
}

export class ActivationManager {
  private readonly TRIAL_DAYS = 7

  private get api(): DatabaseAPI {
    return new DatabaseAPI()
  }

  constructor() {
    // 延迟初始化，避免在构造时访问数据库
  }

  /**
   * 从 localStorage 读取缓存的激活信息
   */
  private getCache(): ActivationCache | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return null

      const data: ActivationCache = JSON.parse(cached)

      // 验证版本
      if (data.version !== CACHE_VERSION) {
        this.clearCache()
        return null
      }

      return data
    } catch {
      return null
    }
  }

  /**
   * 保存激活信息到 localStorage
   */
  private setCache(info: ActivationInfo): void {
    const cache: ActivationCache = {
      version: CACHE_VERSION,
      machineCode: info.machineCode,
      activationCode: info.activationCode,
      isActivated: info.isActivated,
      isTrial: info.isTrial,
      trialStart: info.trialStart,
      trialEnd: info.trialEnd,
      expiresAt: info.expiresAt,
      licenseType: info.licenseType,
      cachedAt: new Date().toISOString()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  }

  /**
   * 清除 localStorage 中的缓存
   */
  private clearCache(): void {
    localStorage.removeItem(CACHE_KEY)
  }

  /**
   * 验证缓存数据是否仍然有效（未过期）
   */
  private verifyCache(cache: ActivationCache): boolean {
    const now = new Date()

    // 如果是正式激活且已过期
    if (cache.isActivated && !cache.isTrial && cache.expiresAt) {
      const expireDate = new Date(cache.expiresAt)
      if (expireDate < now) {
        return false
      }
    }

    // 如果是试用期且已过期
    if (cache.isTrial && cache.trialEnd) {
      const trialEndDate = new Date(cache.trialEnd)
      if (trialEndDate < now) {
        return false
      }
    }

    return true
  }

  /**
   * 获取机器码
   */
  async getMachineCode(): Promise<string> {
    // 优先使用 Electron 提供的机器码（更可靠）
    if ((window as any).electronAPI) {
      try {
        const electronMachineId = await (window as any).electronAPI.getMachineId()
        if (electronMachineId) {
          // 使用前16位作为机器码
          return electronMachineId.substring(0, 16).toUpperCase()
        }
      } catch (error) {
        console.warn('获取 Electron 机器码失败，使用备用方案:', error)
      }
    }

    // 备用方案：使用浏览器指纹生成机器码
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillText('Self-Care ATS Machine ID', 2, 2)
      const fingerprint = canvas.toDataURL()

      // 生成哈希
      let hash = 0
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
      }

      return Math.abs(hash).toString(16).toUpperCase().padStart(16, '0')
    }

    // 最后的备用方案
    const nav = navigator as any
    const userAgent = nav.userAgent || ''
    const platform = nav.platform || ''
    const language = nav.language || ''
    const combined = `${userAgent}|${platform}|${language}|${screen.width}x${screen.height}`

    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }

    return Math.abs(hash).toString(16).toUpperCase().padStart(16, '0')
  }

  /**
   * 获取当前激活信息
   * 优先从 localStorage 缓存读取，缓存无效时再从数据库读取
   */
  async getCurrentActivation(): Promise<ActivationInfo> {
    const machineCode = await this.getMachineCode()

    // 1. 优先从 localStorage 缓存读取（快速路径）
    const cache = this.getCache()
    if (cache && cache.machineCode === machineCode && this.verifyCache(cache)) {
      // 缓存有效且机器码匹配，直接返回
      return {
        machineCode: cache.machineCode,
        activationCode: cache.activationCode,
        isActivated: cache.isActivated,
        isTrial: cache.isTrial,
        trialStart: cache.trialStart,
        trialEnd: cache.trialEnd,
        expiresAt: cache.expiresAt,
        licenseType: cache.licenseType
      }
    }

    // 2. 缓存无效或不存在，从数据库读取
    // 查询数据库中的激活记录
    const activationRecords = this.api.query(
      `SELECT * FROM activation WHERE machine_code = ? AND is_valid = 1 ORDER BY created_at DESC LIMIT 1`,
      [machineCode]
    )

    if (activationRecords.length > 0) {
      const record = activationRecords[0]
      const licenseData = JSON.parse(record.license_data)

      // 检查是否过期
      if (record.expires_at && new Date(record.expires_at) < new Date()) {
        // 过期了，更新为无效
        this.api.execute(
          `UPDATE activation SET is_valid = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [record.id]
        )

        // 返回试用期信息
        return this.getTrialActivation(machineCode)
      }

      const result = {
        machineCode,
        activationCode: record.activation_code,
        isActivated: true,
        isTrial: licenseData.type === 'trial',
        trialStart: licenseData.trialStart,
        trialEnd: licenseData.trialEnd,
        expiresAt: record.expires_at,
        licenseType: licenseData.type
      }

      // 保存到 localStorage 缓存
      this.setCache(result)

      return result
    }

    // 没有激活记录，返回试用期
    const trialResult = this.getTrialActivation(machineCode)
    // 保存试用期信息到缓存
    this.setCache(trialResult)
    return trialResult
  }

  /**
   * 获取试用期信息
   */
  private getTrialActivation(machineCode: string): ActivationInfo {
    // 查询系统配置中的首次运行时间
    const config = this.api.query(
      `SELECT value FROM system_config WHERE key = 'first_run_time'`
    )

    let firstRunTime: string

    if (config.length === 0) {
      // 首次运行，记录时间
      firstRunTime = new Date().toISOString()
      this.api.execute(
        `INSERT INTO system_config (key, value, description) VALUES (?, ?, ?)`,
        ['first_run_time', firstRunTime, '首次运行时间']
      )
    } else {
      firstRunTime = config[0].value
    }

    const trialStart = new Date(firstRunTime)
    const trialEnd = new Date(trialStart.getTime() + this.TRIAL_DAYS * 24 * 60 * 60 * 1000)
    const now = new Date()

    return {
      machineCode,
      isActivated: false,
      isTrial: true,
      trialStart: trialStart.toISOString(),
      trialEnd: trialEnd.toISOString(),
      licenseType: 'trial'
    }
  }

  /**
   * 验证激活码（使用新的 RSA 验证系统）
   */
  async validateActivationCode(code: string): Promise<ActivationResult> {
    try {
      // 1. 验证格式
      if (!licenseManager.validateFormat(code)) {
        return {
          success: false,
          message: '激活码格式错误，正确格式：SPED-XXXX-XXXX...'
        }
      }

      // 2. 获取机器码
      const machineCode = await this.getMachineCode()

      // 3. 使用新的 licenseManager 验证
      const licenseInfo: LicenseInfo = await licenseManager.verifyLicense(code, machineCode)

      // 4. 检查是否过期
      if (licenseInfo.isExpired) {
        return {
          success: false,
          message: '激活码已过期'
        }
      }

      // 5. 检查是否已被使用
      const existingActivation = this.api.query(
        `SELECT * FROM activation WHERE activation_code = ? AND is_valid = 1`,
        [code]
      )

      if (existingActivation.length > 0) {
        const record = existingActivation[0]
        if (record.machine_code !== machineCode) {
          return {
            success: false,
            message: '该激活码已被其他机器使用'
          }
        }

        // 已激活，返回成功
        const existingData = {
          machineCode,
          activationCode: code,
          isActivated: true,
          isTrial: licenseInfo.type === 'trial',
          expiresAt: licenseInfo.expireAt?.toISOString(),
          licenseType: licenseInfo.type
        }

        // 保存到 localStorage 缓存
        this.setCache(existingData)

        return {
          success: true,
          message: '激活成功！',
          data: existingData
        }
      }

      // 6. 新激活 - 保存到数据库
      const licenseData = {
        type: licenseInfo.type,
        machineCode,
        activationCode: code,
        createdAt: licenseInfo.createdAt.toISOString(),
        isPermanent: licenseInfo.isPermanent,
        version: '1.0'
      }

      this.api.execute(
        `INSERT INTO activation (machine_code, activation_code, license_data, expires_at, is_valid)
         VALUES (?, ?, ?, ?, 1)`,
        [
          machineCode,
          code,
          JSON.stringify(licenseData),
          licenseInfo.expireAt ? licenseInfo.expireAt.toISOString() : null
        ]
      )

      const newData = {
        machineCode,
        activationCode: code,
        isActivated: true,
        isTrial: licenseInfo.type === 'trial',
        expiresAt: licenseInfo.expireAt?.toISOString(),
        licenseType: licenseInfo.type
      }

      // 保存到 localStorage 缓存
      this.setCache(newData)

      return {
        success: true,
        message: '激活成功！',
        data: newData
      }
    } catch (error) {
      console.error('激活验证失败:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      return {
        success: false,
        message: `激活失败: ${errorMessage}`
      }
    }
  }

  /**
   * 检查激活状态
   */
  async checkActivationStatus(): Promise<{
    canUse: boolean
    type: 'trial' | 'full'
    daysRemaining?: number
    message: string
  }> {
    const activation = await this.getCurrentActivation()
    const now = new Date()

    if (activation.isActivated && !activation.isTrial) {
      // 已激活
      if (activation.expiresAt) {
        const expireDate = new Date(activation.expiresAt)
        const daysRemaining = Math.ceil((expireDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

        if (daysRemaining <= 0) {
          return {
            canUse: false,
            type: 'trial',
            message: '许可证已过期，请重新激活'
          }
        }

        return {
          canUse: true,
          type: activation.licenseType,
          daysRemaining,
          message: `已激活（${activation.licenseType}），剩余 ${daysRemaining} 天`
        }
      } else {
        // 永久激活
        return {
          canUse: true,
          type: activation.licenseType,
          message: `已激活（${activation.licenseType}）`
        }
      }
    } else {
      // 试用期
      if (activation.trialEnd) {
        const trialEndDate = new Date(activation.trialEnd)
        const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

        if (daysRemaining <= 0) {
          return {
            canUse: false,
            type: 'trial',
            message: '试用期已结束，请激活后继续使用'
          }
        }

        return {
          canUse: true,
          type: 'trial',
          daysRemaining,
          message: `试用期剩余 ${daysRemaining} 天`
        }
      }
    }

    return {
      canUse: true,
      type: 'trial',
      message: '试用期'
    }
  }

  /**
   * 清除所有激活数据（数据库 + localStorage 缓存）
   */
  async clearActivation(): Promise<void> {
    const machineCode = await this.getMachineCode()

    // 清除 localStorage 缓存
    this.clearCache()

    // 设置当前机器的激活记录为无效
    this.api.execute(
      `UPDATE activation SET is_valid = 0, updated_at = CURRENT_TIMESTAMP
       WHERE machine_code = ?`,
      [machineCode]
    )

    // 清除首次运行时间
    this.api.execute(
      `DELETE FROM system_config WHERE key = 'first_run_time'`
    )
  }

  /**
   * 生成测试激活码（已废弃，请使用 license-generator-dist 工具）
   * @deprecated 请使用 license-generator-dist/generate-license.js 工具生成激活码
   */
  async generateTestCode(type: 'full' | 'education' | 'enterprise' = 'full'): Promise<string> {
    console.warn('⚠️ 此方法已废弃，请使用 license-generator-dist 工具生成激活码')
    throw new Error('请使用 license-generator-dist/generate-license.js 工具生成激活码')
  }
}

// 导出单例
export const activationManager = new ActivationManager()
