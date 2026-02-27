import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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

export const useSystemConfigStore = defineStore('systemConfig', () => {
  // 系统配置
  const systemName = ref('感官综合训练与评估')
  const schoolName = ref('')
  const logoPath = ref('')
  const loading = ref(false)

  // 计算属性：获取显示用的 Logo 路径（优先使用数据库中的，否则使用默认的）
  const displayLogoPath = computed(() => {
    // 如果数据库中有自定义 logo，使用自定义的
    if (logoPath.value) {
      return logoPath.value
    }
    // 否则使用默认 logo
    return DEFAULT_LOGO
  })

  // 加载系统配置
  const loadConfig = async () => {
    loading.value = true
    try {
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
            systemName.value = value
            // 同步保存到 localStorage 供路由守卫使用
            localStorage.setItem('systemName', value)
            break
          case 'school_name':
            schoolName.value = value
            break
          case 'logo_path':
            logoPath.value = value
            break
        }
      })

      // 更新页面标题
      if (systemName.value) {
        document.title = systemName.value
      }
    } catch (error) {
      console.error('加载系统配置失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 更新系统配置
  const updateConfig = async (key: string, value: string) => {
    try {
      const { initDatabase } = await import('@/database/init')
      const db = await initDatabase()

      // 检查配置是否存在
      const existing = db.get('SELECT id FROM system_config WHERE key = ?', [key])

      if (existing) {
        // 更新现有配置
        db.run('UPDATE system_config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [
          value,
          key,
        ])
      } else {
        // 插入新配置
        db.run(
          'INSERT INTO system_config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [key, value],
        )
      }

      // 更新本地状态
      if (key === 'system_name') {
        systemName.value = value
        // 同步保存到 localStorage 供路由守卫使用
        localStorage.setItem('systemName', value)
        // 更新页面标题
        document.title = value
      } else if (key === 'school_name') {
        schoolName.value = value
      } else if (key === 'logo_path') {
        logoPath.value = value
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
    displayLogoPath,
    loading,
    loadConfig,
    updateConfig,
  }
})
