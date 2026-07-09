import { defineStore } from 'pinia'
import { UserAPI } from '@/database/api'
import {
  canAccessModuleByEntitlements,
  ENTITLEMENT_CODES,
  type EntitlementCode,
  isEntitlementCode,
  resolveEffectiveEntitlementDetails,
} from '@/features/entitlements/entitlement-catalog'

export interface User {
  id: number
  username: string
  role: 'admin' | 'teacher'
  name: string
  email?: string
  last_login?: string
}

export interface ActivationInfo {
  isActivated: boolean
  isInTrial: boolean  // 是否在试用期内
  trialDays: number
  trialUsed: number
  trialEnd?: string  // 试用结束时间
  expiresAt?: string
  machineCode: string
}

type EntitlementSource = 'license' | 'dev-mock' | 'none'

export interface EntitlementsInfo {
  allowedModules: string[]
  source: EntitlementSource
  isFullAccess: boolean
  effectiveEntitlements: EntitlementCode[]
  entitlementDebugOrigins: Partial<Record<EntitlementCode, string[]>>
  debugOrigin?: string
}

const DEV_MOCK_ALLOWED_MODULES = ['sensory', 'emotional', 'social', 'life_skills', 'cognitive'] as const
const BUSINESS_MODULE_CODES = ['sensory', 'emotional', 'social', 'cognitive', 'life_skills'] as const
const ENABLE_DEV_ACTIVATION_BYPASS =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_ACTIVATION_BYPASS === 'true'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: null as string | null,
    isLoggingIn: false,
    activationInfo: {
      isActivated: false,
      isInTrial: false,
      trialDays: 7,
      trialUsed: 0,
      trialEnd: undefined,
      machineCode: '',
      expiresAt: undefined
    } as ActivationInfo,
    entitlements: {
      allowedModules: [],
      source: 'none',
      isFullAccess: false,
      effectiveEntitlements: [],
      entitlementDebugOrigins: {},
      debugOrigin: undefined
    } as EntitlementsInfo
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
    isActivated: (state) => state.activationInfo.isActivated,
    allowedModules: (state) => state.entitlements.allowedModules,
    effectiveEntitlements: (state) => state.entitlements.effectiveEntitlements,
    isAdmin: (state) => state.user?.role === 'admin',
    isTeacher: (state) => state.user?.role === 'teacher',
    canAccess: (state) => (roles: string[]) => {
      return state.user && roles.includes(state.user.role)
    },
    hasModuleAccess: (state) => (moduleCode: string) => {
      if (!(BUSINESS_MODULE_CODES as readonly string[]).includes(moduleCode)) {
        return true
      }
      return canAccessModuleByEntitlements(
        moduleCode,
        state.entitlements.effectiveEntitlements
      )
    },
    hasEntitlementAccess: (state) => (entitlementCode: string) => {
      if (!isEntitlementCode(entitlementCode)) {
        return false
      }

      if (state.entitlements.isFullAccess) {
        return true
      }

      return state.entitlements.effectiveEntitlements.includes(entitlementCode)
    }
  },

  actions: {
    applyEntitlements(
      allowedModules: string[],
      source: EntitlementSource,
      debugOrigin?: string
    ) {
      const normalizedAllowedModules = Array.isArray(allowedModules)
        ? allowedModules.filter((moduleCode): moduleCode is string => typeof moduleCode === 'string')
        : []
      const isFullAccess = (BUSINESS_MODULE_CODES as readonly string[]).every((moduleCode) =>
        normalizedAllowedModules.includes(moduleCode)
      )
      const resolution = resolveEffectiveEntitlementDetails(normalizedAllowedModules)

      this.entitlements.allowedModules = [...normalizedAllowedModules]
      this.entitlements.source = source
      this.entitlements.isFullAccess = isFullAccess
      this.entitlements.effectiveEntitlements = isFullAccess
        ? [...ENTITLEMENT_CODES]
        : resolution.effectiveEntitlements

      if (import.meta.env.DEV) {
        this.entitlements.debugOrigin = debugOrigin
        this.entitlements.entitlementDebugOrigins = isFullAccess
          ? Object.fromEntries(
              ENTITLEMENT_CODES.map((code) => [
                code,
                resolution.entitlementDebugOrigins[code] || ['direct_license_entitlement'],
              ])
            ) as Partial<Record<EntitlementCode, string[]>>
          : resolution.entitlementDebugOrigins

        if (resolution.unknownCodes.length > 0) {
          console.warn('检测到未知授权 code，已按默认拒绝忽略:', resolution.unknownCodes)
        }
      } else {
        this.entitlements.debugOrigin = undefined
        this.entitlements.entitlementDebugOrigins = {}
      }
    },

    // 登录
    async login(username: string, password: string): Promise<boolean> {
      try {
        this.isLoggingIn = true

        const userAPI = new UserAPI()
        const user = await userAPI.login(username, password)

        if (user) {
          this.user = user
          // 生成token（简单示例，实际应该更安全）
          this.token = btoa(`${user.id}:${Date.now()}`)

          // 保存到localStorage
          localStorage.setItem('auth_token', this.token)
          localStorage.setItem('user_info', JSON.stringify(user))

          // 记录登录日志
          try {
            await userAPI.addLoginLog({
              userId: user.id,
              username: user.username,
              status: 'success',
              ipAddress: this.getClientIP(),
              userAgent: navigator.userAgent
            })
          } catch (logError) {
            console.error('记录登录日志出错:', logError)
          }

          return true
        }

        // 登录失败，记录失败日志
        try {
          const failUser = (userAPI as any).queryOne('SELECT id FROM user WHERE username = ?', [username])
          if (failUser) {
            await userAPI.addLoginLog({
              userId: failUser.id,
              username: username,
              status: 'failed',
              failureReason: '密码错误',
              ipAddress: this.getClientIP(),
              userAgent: navigator.userAgent
            })
          }
        } catch (logError) {
          console.error('记录登录失败日志出错:', logError)
        }

        return false
      } catch (error) {
        console.error('登录失败:', error)
        return false
      } finally {
        this.isLoggingIn = false
      }
    },

    // 获取客户端IP（简化版，实际应该从服务端获取）
    getClientIP(): string {
      // 本地环境返回本地IP
      return '127.0.0.1'
    },

    // 退出登录
    logout() {
      this.user = null
      this.token = null
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_info')
    },

    // 从localStorage恢复登录状态
    restoreAuth() {
      const token = localStorage.getItem('auth_token')
      const userInfo = localStorage.getItem('user_info')

      if (token && userInfo) {
        try {
          const user = JSON.parse(userInfo)
          // 验证用户数据是否完整（必须有 id, username, role）
          if (user && user.id && user.username && user.role) {
            this.user = user
            this.token = token
          } else {
            console.warn('localStorage 中的用户数据不完整，清除缓存')
            this.logout()
          }
        } catch (error) {
          console.error('恢复登录状态失败:', error)
          this.logout()
        }
      }
    },

    // 检查激活状态
    async checkActivation(): Promise<void> {
      try {
        if (ENABLE_DEV_ACTIVATION_BYPASS) {
          this.activationInfo.machineCode = 'DEV-BYPASS'
          this.activationInfo.isActivated = true
          this.activationInfo.isInTrial = false
          this.activationInfo.trialEnd = undefined
          this.activationInfo.expiresAt = undefined
          this.activationInfo.trialDays = 0
          this.activationInfo.trialUsed = 0

          this.applyEntitlements([...DEV_MOCK_ALLOWED_MODULES], 'dev-mock', 'dev_activation_bypass')

          console.log('开发环境已绕过激活校验', {
            machineCode: this.activationInfo.machineCode,
            allowedModules: this.entitlements.allowedModules,
            effectiveEntitlements: this.entitlements.effectiveEntitlements
          })
          return
        }

        const { activationManager } = await import('@/utils/activation-manager')

        // 获取激活信息
        const activation = await activationManager.getCurrentActivation()

        // 更新激活信息
        this.activationInfo.machineCode = activation.machineCode

        // 判断是否已激活：
        // isActivated = true 表示正式激活（非试用期）
        // isInTrial = true 表示在试用期内
        const isTrialActive = Boolean(
          activation.isTrial &&
          activation.trialEnd &&
          new Date(activation.trialEnd) > new Date()
        )
        this.activationInfo.isActivated = activation.isActivated && !activation.isTrial
        this.activationInfo.isInTrial = isTrialActive
        this.activationInfo.trialEnd = activation.trialEnd
        this.activationInfo.expiresAt = activation.expiresAt
        this.activationInfo.trialDays = 0
        this.activationInfo.trialUsed = 0

        if (activation.isTrial && activation.trialEnd) {
          const trialStart = new Date(activation.trialStart || '')
          const trialEnd = new Date(activation.trialEnd)
          const now = new Date()

          // 计算总试用天数
          const totalDays = Math.ceil((trialEnd.getTime() - trialStart.getTime()) / (24 * 60 * 60 * 1000))

          // 计算已使用天数（从开始到现在）
          const usedDays = Math.max(0, Math.ceil((now.getTime() - trialStart.getTime()) / (24 * 60 * 60 * 1000)))

          this.activationInfo.trialDays = totalDays
          this.activationInfo.trialUsed = Math.min(usedDays, totalDays)
        }

        const allowedModules = Array.isArray(activation.allowedModules)
          ? activation.allowedModules
          : []

        this.applyEntitlements(
          allowedModules,
          activation.activationCode ? 'license' : 'none',
          activation.activationCode ? 'license_signature_verified' : 'activation_not_present'
        )

        console.log('激活状态检查结果:', {
          machineCode: this.activationInfo.machineCode,
          isActivated: this.activationInfo.isActivated,
          isInTrial: this.activationInfo.isInTrial,
          trialDays: this.activationInfo.trialDays,
          trialUsed: this.activationInfo.trialUsed,
          entitlementSource: this.entitlements.source,
          allowedModules: this.entitlements.allowedModules,
          effectiveEntitlements: this.entitlements.effectiveEntitlements
        })
      } catch (error) {
        console.error('检查激活状态失败:', error)
      }
    },

    // 获取机器码
    async getMachineCode(): Promise<string> {
      const { activationManager } = await import('@/utils/activation-manager')
      return await activationManager.getMachineCode()
    },

    // 验证激活码
    async validateActivationCode(code: string): Promise<boolean> {
      try {
        const { activationManager } = await import('@/utils/activation-manager')
        const normalizedCode = code.trim()

        // 验证激活码
        const result = await activationManager.validateActivationCode(normalizedCode)

        if (result.success) {
          // 重新检查激活状态
          await this.checkActivation()
          return true
        } else {
          console.error('激活失败:', result.message)
          return false
        }
      } catch (error) {
        console.error('激活码验证失败:', error)
        return false
      }
    },

    // 验证激活码（返回详细错误信息）
    async validateActivationCodeWithMessage(code: string): Promise<{ success: boolean; message: string }> {
      try {
        const { activationManager } = await import('@/utils/activation-manager')
        const normalizedCode = code.trim()

        // 验证激活码
        const result = await activationManager.validateActivationCode(normalizedCode)

        if (result.success) {
          // 重新检查激活状态
          await this.checkActivation()
          return { success: true, message: '激活成功！' }
        } else {
          console.error('激活失败:', result.message)
          return { success: false, message: result.message }
        }
      } catch (error) {
        console.error('激活码验证失败:', error)
        return { success: false, message: error instanceof Error ? error.message : '未知错误' }
      }
    },

    // 修改密码
    async changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
      if (!this.user) return false

      try {
        const userAPI = new UserAPI()
        const success = await userAPI.changePassword(this.user.id, oldPassword, newPassword)

        if (success) {
          // 修改成功后退出登录
          this.logout()
        }

        return success
      } catch (error) {
        console.error('修改密码失败:', error)
        return false
      }
    }
  }
})
