/**
 * SCGP 模块注册表
 *
 * Phase 3.2: 模块化基础设施
 *
 * 设计原则：
 * 1. 单例模式：全局唯一实例
 * 2. 模块发现：动态注册和检索模块
 * 3. 策略管理：统一管理 IEP 生成策略
 * 4. 配置管理：持久化模块配置
 */

import { ModuleCode, type ModuleMetadata, type ModuleConfig, type ResourceItem } from '@/types/module'

/**
 * 模块注册表单例类
 */
class ModuleRegistryImpl {
  // ========== 私有状态 ==========

  // 已注册的模块列表
  private modules: Map<ModuleCode, ModuleMetadata> = new Map()

  // 模块配置映射
  private configs: Map<ModuleCode, ModuleConfig> = new Map()

  // 单例实例
  private static instance: ModuleRegistryImpl | null = null

  // ========== 单例模式 ==========

  /**
   * 获取单例实例
   */
  static getInstance(): ModuleRegistryImpl {
    if (!ModuleRegistryImpl.instance) {
      ModuleRegistryImpl.instance = new ModuleRegistryImpl()
    }
    return ModuleRegistryImpl.instance
  }

  /**
   * 私有构造函数，防止外部直接实例化
   */
  private constructor() {
    // 初始化时从 localStorage 加载配置
    this.loadConfigsFromStorage()
  }

  // ========== 模块管理 ==========

  /**
   * 注册模块
   * @param metadata - 模块元数据
   */
  registerModule(metadata: ModuleMetadata): void {
    const { code } = metadata

    // 检查模块代码是否有效
    if (!Object.values(ModuleCode).includes(code)) {
      console.warn(`[ModuleRegistry] 无效的模块代码: ${code}`)
      return
    }

    // 检查是否已注册
    if (this.modules.has(code)) {
      console.warn(`[ModuleRegistry] 模块已注册: ${code}`)
      return
    }

    // 注册模块
    this.modules.set(code, metadata)
    console.log(`[ModuleRegistry] 已注册模块: ${metadata.name} (${code})`)

    // 初始化默认配置（如果不存在）
    if (!this.configs.has(code)) {
      const defaultConfig: ModuleConfig = {
        moduleCode: code,
        config: metadata.features.reduce((acc, feature) => {
          acc[feature.code] = feature.status === 'active'
          return acc
        }, {} as Record<string, any>),
        defaults: {}
      }
      this.configs.set(code, defaultConfig)
    }
  }

  /**
   * 批量注册模块
   * @param metadataList - 模块元数据列表
   */
  registerModules(metadataList: ModuleMetadata[]): void {
    metadataList.forEach(metadata => this.registerModule(metadata))
  }

  /**
   * 获取指定模块的元数据
   * @param code - 模块代码
   * @returns 模块元数据或 undefined
   */
  getModule(code: ModuleCode): ModuleMetadata | undefined {
    return this.modules.get(code)
  }

  /**
   * 获取所有已注册的模块
   * @returns 模块元数据列表
   */
  getAllModules(): ModuleMetadata[] {
    return Array.from(this.modules.values())
  }

  /**
   * 获取活跃的模块（status === 'active'）
   * @returns 活跃模块列表
   */
  getActiveModules(): ModuleMetadata[] {
    return this.getAllModules().filter(m => m.status === 'active')
  }

  /**
   * 检查模块是否已注册
   * @param code - 模块代码
   * @returns 是否已注册
   */
  hasModule(code: ModuleCode): boolean {
    return this.modules.has(code)
  }

  // ========== 配置管理 ==========

  /**
   * 获取模块配置
   * @param moduleCode - 模块代码
   * @returns 模块配置或 undefined
   */
  getModuleConfig(moduleCode: ModuleCode): ModuleConfig | undefined {
    return this.configs.get(moduleCode)
  }

  /**
   * 获取模块配置项
   * @param moduleCode - 模块代码
   * @param key - 配置键
   * @returns 配置值或 undefined
   */
  getConfigValue(moduleCode: ModuleCode, key: string): any {
    const config = this.getModuleConfig(moduleCode)
    return config?.config[key]
  }

  /**
   * 更新模块配置
   * @param moduleCode - 模块代码
   * @param config - 配置键值对
   */
  updateModuleConfig(moduleCode: ModuleCode, config: Record<string, any>): void {
    const currentConfig = this.configs.get(moduleCode)

    if (currentConfig) {
      // 合并配置
      currentConfig.config = {
        ...currentConfig.config,
        ...config
      }
      // 持久化到 localStorage
      this.saveConfigToStorage(moduleCode)
      console.log(`[ModuleRegistry] 已更新配置: ${moduleCode}`, config)
    } else {
      console.warn(`[ModuleRegistry] 模块配置不存在: ${moduleCode}`)
    }
  }

  /**
   * 设置模块配置项
   * @param moduleCode - 模块代码
   * @param key - 配置键
   * @param value - 配置值
   */
  setConfigValue(moduleCode: ModuleCode, key: string, value: any): void {
    this.updateModuleConfig(moduleCode, { [key]: value })
  }

  /**
   * 重置模块配置为默认值
   * @param moduleCode - 模块代码
   */
  resetModuleConfig(moduleCode: ModuleCode): void {
    const config = this.configs.get(moduleCode)
    const module = this.getModule(moduleCode)

    if (config && module) {
      // 重置为默认值
      config.config = { ...config.defaults }
      this.saveConfigToStorage(moduleCode)
      console.log(`[ModuleRegistry] 已重置配置: ${moduleCode}`)
    }
  }

  // ========== 持久化存储 ==========

  /**
   * 保存配置到 localStorage
   * @param moduleCode - 模块代码
   */
  private saveConfigToStorage(moduleCode: ModuleCode): void {
    const config = this.configs.get(moduleCode)
    if (!config) return

    try {
      const storageKey = `module_config_${moduleCode}`
      localStorage.setItem(storageKey, JSON.stringify(config.config))
    } catch (error) {
      console.error(`[ModuleRegistry] 保存配置失败: ${moduleCode}`, error)
    }
  }

  /**
   * 从 localStorage 加载所有配置
   */
  private loadConfigsFromStorage(): void {
    Object.values(ModuleCode).forEach(moduleCode => {
      const storageKey = `module_config_${moduleCode}`
      const stored = localStorage.getItem(storageKey)

      if (stored) {
        try {
          const config = JSON.parse(stored)
          this.configs.set(moduleCode, {
            moduleCode,
            config,
            defaults: {}
          })
        } catch (error) {
          console.error(`[ModuleRegistry] 加载配置失败: ${moduleCode}`, error)
        }
      }
    })
  }

  /**
   * 清除所有配置（用于注销或重置）
   */
  clearAllConfigs(): void {
    Object.values(ModuleCode).forEach(moduleCode => {
      const storageKey = `module_config_${moduleCode}`
      localStorage.removeItem(storageKey)
    })
    this.configs.clear()
    console.log('[ModuleRegistry] 已清除所有配置')
  }

  // ========== 资源查询辅助 ==========

  /**
   * 根据模块代码获取资源类型
   * @param moduleCode - 模块代码
   * @returns 资源类型列表
   */
  getResourceTypes(moduleCode: ModuleCode): string[] {
    const module = this.getModule(moduleCode)
    if (!module) return []

    // 从模块功能中提取资源类型
    const resourceTypes = module.features
      .filter(f => f.route?.startsWith('/resources/'))
      .map(f => f.route?.split('/')[2] || '')

    return [...new Set(resourceTypes)]
  }

  /**
   * 验证资源是否属于模块
   * @param resource - 资源项
   * @returns 是否有效
   */
  isValidResource(resource: ResourceItem): boolean {
    return resource.moduleCode === this.getModule(resource.moduleCode)?.code
  }
}

// ========== 导出单例 ==========

/**
 * 模块注册表单例实例
 *
 * 使用方式：
 * ```typescript
 * import { ModuleRegistry } from '@/core/module-registry'
 *
 * // 注册模块
 * ModuleRegistry.registerModule(metadata)
 *
 * // 获取模块
 * const module = ModuleRegistry.getModule(ModuleCode.SENSORY)
 * ```
 */
export const ModuleRegistry = ModuleRegistryImpl.getInstance()

// ========== 初始化内置模块 ==========

/**
 * 初始化所有内置模块
 * 此函数在应用启动时调用
 */
export function initializeBuiltinModules(): void {
  // 感官统合训练模块（名下含 sensory-integration + fine-motor 两个训练入口）
  ModuleRegistry.registerModule({
    code: ModuleCode.SENSORY,
    name: '感官统合训练',
    description: '感官统合主链：游戏训练、器材训练、训练记录与 S-M 评估',
    icon: 'Sensation',
    themeColor: '#67c23a',
    version: '1.0.0',
    status: 'active',
    features: [
      {
        code: 'games',
        name: '游戏训练',
        description: '感官游戏训练入口',
        status: 'active',
        route: '/games/menu',
        routeName: 'GameTraining'
      },
      {
        code: 'equipment',
        name: '器材训练',
        description: '感官器材训练入口',
        status: 'active',
        route: '/equipment/menu',
        routeName: 'EquipmentTraining'
      },
      {
        code: 'training_records',
        name: '训练记录',
        description: '训练记录汇总入口',
        status: 'active',
        route: '/training-records/menu',
        routeName: 'TrainingRecordsModule'
      },
      {
        code: 'assessment',
        name: '评估',
        description: 'S-M 量表等评估入口',
        status: 'active',
        route: '/assessment',
        routeName: 'Assessment'
      }
    ]
  })

  // 情绪调节模块（名下含 emotional-regulation + soothing-aids 两个训练入口）
  ModuleRegistry.registerModule({
    code: ModuleCode.EMOTIONAL,
    name: '情绪调节',
    description: '情绪调节主链：游戏训练、器材训练与训练记录',
    icon: 'Emotion',
    themeColor: '#e6a23c',
    version: '1.0.0',
    status: 'active',
    menuRouteName: 'EmotionalTraining',
    menuGroup: 'training-and-assessment',
    menuIcon: 'face-smile',
    features: [
      {
        code: 'games',
        name: '游戏训练',
        description: '情绪游戏训练入口',
        status: 'active',
        route: '/games/menu',
        routeName: 'GameTraining'
      },
      {
        code: 'equipment',
        name: '器材训练',
        description: '情绪器材训练入口',
        status: 'active',
        route: '/equipment/menu',
        routeName: 'EquipmentTraining'
      },
      {
        code: 'training_records',
        name: '训练记录',
        description: '训练记录汇总入口',
        status: 'active',
        route: '/training-records/menu',
        routeName: 'TrainingRecordsModule'
      }
    ]
  })

  // 社交沟通模块
  ModuleRegistry.registerModule({
    code: ModuleCode.SOCIAL,
    name: '社交沟通',
    description: '社交沟通训练与评估',
    icon: 'ChatDotRound',
    themeColor: '#409eff',
    version: '1.0.0',
    status: 'active',
    features: [
      {
        code: 'games',
        name: '游戏训练',
        description: '社交游戏训练入口',
        status: 'active',
        route: '/games/menu',
        routeName: 'GameTraining'
      },
      {
        code: 'equipment',
        name: '器材训练',
        description: '社交器材训练入口',
        status: 'active',
        route: '/equipment/menu',
        routeName: 'EquipmentTraining'
      },
      {
        code: 'training_records',
        name: '训练记录',
        description: '社交训练记录汇总',
        status: 'active',
        route: '/training-records/menu',
        routeName: 'TrainingRecordsModule'
      }
    ]
  })

  // 认知发展模块
  ModuleRegistry.registerModule({
    code: ModuleCode.COGNITIVE,
    name: '认知发展',
    description: '认知发展训练与评估',
    icon: 'Cpu',
    themeColor: '#13c2c2',
    version: '1.0.0',
    status: 'active',
    features: [
      {
        code: 'games',
        name: '游戏训练',
        description: '认知游戏训练入口',
        status: 'active',
        route: '/games/menu',
        routeName: 'GameTraining'
      },
      {
        code: 'equipment',
        name: '器材训练',
        description: '认知器材训练入口',
        status: 'active',
        route: '/equipment/menu',
        routeName: 'EquipmentTraining'
      },
      {
        code: 'assessment',
        name: '评估',
        description: '认知评估入口',
        status: 'active',
        route: '/assessment',
        routeName: 'Assessment'
      },
      {
        code: 'training_records',
        name: '训练记录',
        description: '认知训练记录汇总',
        status: 'active',
        route: '/training-records/menu',
        routeName: 'TrainingRecordsModule'
      }
    ]
  })

  // 生活技能模块
  ModuleRegistry.registerModule({
    code: ModuleCode.LIFE_SKILLS,
    name: '生活自理',
    description: '生活自理主链：游戏训练、器材训练与训练记录',
    icon: 'House',
    themeColor: '#d97706',
    version: '1.0.0',
    status: 'active',
    menuRouteName: 'SelfCareTraining',
    menuGroup: 'training-and-assessment',
    menuIcon: 'list-check',
    features: [
      {
        code: 'games',
        name: '游戏训练',
        description: '生活技能游戏训练入口',
        status: 'active',
        route: '/games/menu',
        routeName: 'GameTraining'
      },
      {
        code: 'equipment',
        name: '器材训练',
        description: '生活技能器材训练入口',
        status: 'active',
        route: '/equipment/menu',
        routeName: 'EquipmentTraining'
      },
      {
        code: 'training_records',
        name: '训练记录',
        description: '训练记录汇总入口',
        status: 'active',
        route: '/training-records/menu',
        routeName: 'TrainingRecordsModule'
      }
    ]
  })

  // 资源管理模块（跨模块）
  ModuleRegistry.registerModule({
    code: ModuleCode.RESOURCE,
    name: '资源管理',
    description: '跨模块训练资源与教具统一管理',
    icon: 'Files',
    themeColor: '#909399',
    version: '1.0.0',
    status: 'active',
    menuRouteName: 'ResourceCenter',
    menuGroup: 'records-and-system',
    menuIcon: 'folder-open',
    features: [
      {
        code: 'resource_center',
        name: '资源管理',
        description: '统一资源管理入口',
        status: 'active',
        route: '/resource-center',
        routeName: 'ResourceCenter'
      }
    ]
  })

  console.log('[ModuleRegistry] 已初始化内置模块')
}
