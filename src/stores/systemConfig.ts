import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  DEFAULT_LOGIN_PRIMARY_COLOR,
  DEFAULT_LOGIN_THEME_VARIANT,
  applyLoginThemeVariables,
  normalizeHexColor,
  normalizeLoginThemeVariant,
  type LoginThemeVariant,
} from '@/utils/login-theme'

// 默认 Logo 路径（使用 public 目录下的图片）
// 在 Electron 环境中，需要使用相对路径，因为打包后使用 file:// 协议
const getDefaultLogo = () => {
  // 检测是否在 Electron 环境中
  const isElectron = !!(window as any).electronAPI

  if (isElectron) {
    // Electron 环境：使用相对路径
    // 打包后的文件结构：dist/index.html 和 dist/xcatslogo.png
    return './xcatslogo.png'
  } else {
    // Web 开发环境：使用绝对路径
    return '/xcatslogo.png'
  }
}

const DEFAULT_LOGO = getDefaultLogo()
const LEGACY_SYSTEM_NAME = '生活自理适应综合训练'
const LEGACY_SYSTEM_NAME_ALT = '感官综合训练与评估'
const CURRENT_SYSTEM_NAME = '星愿能力发展训练系统'
const DEFAULT_BRAND_PANEL_DESCRIPTION = '统一进入学生管理、能力评估、训练计划、训练记录与报告生成，让一线工作更聚焦。'

function normalizeSystemName(value: string) {
  return value === LEGACY_SYSTEM_NAME || value === LEGACY_SYSTEM_NAME_ALT
    ? CURRENT_SYSTEM_NAME
    : value
}

export const useSystemConfigStore = defineStore('systemConfig', () => {
  // 系统配置
  const systemName = ref(CURRENT_SYSTEM_NAME)
  const schoolName = ref('')
  const logoPath = ref('')
  const loginLogoPath = ref('')
  const loginThemeVariant = ref<LoginThemeVariant>(DEFAULT_LOGIN_THEME_VARIANT)
  const themePrimaryColor = ref(DEFAULT_LOGIN_PRIMARY_COLOR)
  const brandPanelDescription = ref(DEFAULT_BRAND_PANEL_DESCRIPTION)
  const loading = ref(false)

  // 计算属性：获取显示用的 Logo 路径（优先使用数据库中的，否则使用默认的）
  const displayLogoPath = computed(() => {
    if (logoPath.value) {
      return logoPath.value
    }
    return DEFAULT_LOGO
  })

  const displayLoginLogoPath = computed(() => {
    if (loginLogoPath.value) {
      return loginLogoPath.value
    }
    return DEFAULT_LOGO
  })

  const applyTheme = () => {
    applyLoginThemeVariables({
      variant: loginThemeVariant.value,
      primaryColor: themePrimaryColor.value,
    })
  }

  // 加载系统配置
  const loadConfig = async () => {
    loading.value = true
    try {
      systemName.value = CURRENT_SYSTEM_NAME
      schoolName.value = ''
      logoPath.value = ''
      loginLogoPath.value = ''
      loginThemeVariant.value = DEFAULT_LOGIN_THEME_VARIANT
      themePrimaryColor.value = DEFAULT_LOGIN_PRIMARY_COLOR
      brandPanelDescription.value = DEFAULT_BRAND_PANEL_DESCRIPTION

      const { initDatabase } = await import('@/database/init')
      const db = await initDatabase()

      // 从数据库加载配置
      const configs = db.all(`
        SELECT key, value FROM system_config
      `)

      configs.forEach((config: any) => {
        const key = config.key
        const value = config.value

        switch (key) {
          case 'system_name':
            systemName.value = normalizeSystemName(value)
            // 同步保存到 localStorage 供路由守卫使用
            localStorage.setItem('systemName', systemName.value)
            if (systemName.value !== value) {
              db.run('UPDATE system_config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [
                systemName.value,
                key,
              ])
            }
            break
          case 'school_name':
            schoolName.value = value
            break
          case 'logo_path':
            logoPath.value = value
            break
          case 'login_logo_path':
            loginLogoPath.value = value
            break
          case 'login_theme_variant':
            loginThemeVariant.value = normalizeLoginThemeVariant(value)
            break
          case 'theme_primary_color':
            themePrimaryColor.value = normalizeHexColor(value, DEFAULT_LOGIN_PRIMARY_COLOR)
            break
          case 'brand_panel_description':
            brandPanelDescription.value = value || DEFAULT_BRAND_PANEL_DESCRIPTION
            break
        }
      })

      // 更新页面标题
      if (systemName.value) {
        document.title = systemName.value
      }

      applyTheme()
    } catch (error) {
      console.error('加载系统配置失败:', error)
      applyTheme()
    } finally {
      loading.value = false
    }
  }

  // 更新系统配置
  const updateConfig = async (key: string, value: string) => {
    try {
      const { initDatabase } = await import('@/database/init')
      const db = await initDatabase()
      let normalizedValue = value

      if (key === 'system_name') {
        normalizedValue = normalizeSystemName(value)
      } else if (key === 'login_theme_variant') {
        normalizedValue = normalizeLoginThemeVariant(value)
      } else if (key === 'theme_primary_color') {
        normalizedValue = normalizeHexColor(value, DEFAULT_LOGIN_PRIMARY_COLOR)
      }

      // 检查配置是否存在
      const existing = db.get('SELECT id FROM system_config WHERE key = ?', [key])

      if (existing) {
        // 更新现有配置
        db.run('UPDATE system_config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [
          normalizedValue,
          key,
        ])
      } else {
        // 插入新配置
        db.run(
          'INSERT INTO system_config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [key, normalizedValue],
        )
      }

      // 更新本地状态
      if (key === 'system_name') {
        systemName.value = normalizedValue
        // 同步保存到 localStorage 供路由守卫使用
        localStorage.setItem('systemName', normalizedValue)
        // 更新页面标题
        document.title = normalizedValue
      } else if (key === 'school_name') {
        schoolName.value = normalizedValue
      } else if (key === 'logo_path') {
        logoPath.value = normalizedValue
      } else if (key === 'login_logo_path') {
        loginLogoPath.value = normalizedValue
      } else if (key === 'login_theme_variant') {
        loginThemeVariant.value = normalizeLoginThemeVariant(normalizedValue)
        applyTheme()
      } else if (key === 'theme_primary_color') {
        themePrimaryColor.value = normalizeHexColor(normalizedValue, DEFAULT_LOGIN_PRIMARY_COLOR)
        applyTheme()
      } else if (key === 'brand_panel_description') {
        brandPanelDescription.value = normalizedValue || DEFAULT_BRAND_PANEL_DESCRIPTION
      }
    } catch (error) {
      console.error('更新系统配置失败:', error)
      throw error
    }
  }

  return {
    systemName,
    schoolName,
    logoPath,
    loginLogoPath,
    loginThemeVariant,
    themePrimaryColor,
    brandPanelDescription,
    displayLogoPath,
    displayLoginLogoPath,
    loading,
    applyTheme,
    loadConfig,
    updateConfig,
  }
})
