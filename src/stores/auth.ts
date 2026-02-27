import { defineStore } from 'pinia'
import { UserAPI } from '@/database/api'

interface User {
  id: number
  username: string
  role: 'admin' | 'teacher'
  name: string
  email?: string
  last_login?: string
}

interface ActivationInfo {
  isActivated: boolean
  isInTrial: boolean  // 是否在试用期内
  trialDays: number
  trialUsed: number
  trialEnd?: string  // 试用结束时间
  expiresAt?: string
  machineCode: string
}

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
    } as ActivationInfo
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
    isActivated: (state) => state.activationInfo.isActivated,
    isAdmin: (state) => state.user?.role === 'admin',
    isTeacher: (state) => state.user?.role === 'teacher',
    canAccess: (state) => (roles: string[]) => {
      return state.user && roles.includes(state.user.role)
    }
  },

  actions: {
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
          const failUser = userAPI.queryOne('SELECT id FROM user WHERE username = ?', [username])
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
        const { activationManager } = await import('@/utils/activation-manager')

        // 获取激活信息
        const activation = await activationManager.getCurrentActivation()

        // 更新激活信息
        this.activationInfo.machineCode = activation.machineCode

        // 判断是否已激活：
        // isActivated = true 表示正式激活（非试用期）
        // isInTrial = true 表示在试用期内
        const isTrialActive = activation.isTrial && activation.trialEnd && new Date(activation.trialEnd) > new Date()
        this.activationInfo.isActivated = activation.isActivated && !activation.isTrial
        this.activationInfo.isInTrial = isTrialActive
        this.activationInfo.trialEnd = activation.trialEnd

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

        if (activation.expiresAt) {
          this.activationInfo.expiresAt = activation.expiresAt
        }

        console.log('激活状态检查结果:', {
          machineCode: this.activationInfo.machineCode,
          isActivated: this.activationInfo.isActivated,
          isInTrial: this.activationInfo.isInTrial,
          trialDays: this.activationInfo.trialDays,
          trialUsed: this.activationInfo.trialUsed
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

        // 验证激活码
        const result = await activationManager.validateActivationCode(code)

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

        // 验证激活码
        const result = await activationManager.validateActivationCode(code)

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