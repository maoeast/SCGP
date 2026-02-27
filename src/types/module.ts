/**
 * SIC-ADS 模块系统类型定义
 *
 * Phase 3.1: 模块化基础设施
 *
 * 设计原则：
 * 1. 扩展性：支持未来模块（情绪调节、社交沟通等）
 * 2. 类型安全：使用常量和联合类型
 * 3. 模块隔离：每个模块有独立的代码空间
 * 4. 统一接口：所有模块遵循相同的资源访问模式
 */

// ========== 模块代码常量 ==========

/**
 * 所有支持的模块代码
 *
 * 扩展指南：
 * 1. 添加新模块时，在此处添加新常量
 * 2. 模块代码使用小写下划线命名（kebab-case）
 * 3. 每个模块对应一个独立的目录结构
 */
export enum ModuleCode {
  // 感官统合训练
  SENSORY = 'sensory',

  // 情绪调节
  // 示例：放松训练、情绪识别
  EMOTIONAL = 'emotional',

  // 社交沟通
  // 示例：对话练习、社交故事
  SOCIAL = 'social',

  // 认知训练
  // 示例：记忆游戏、逻辑推理
  COGNITIVE = 'cognitive',

  // 生活技能
  // 示例：日常生活技能训练
  LIFE_SKILLS = 'life_skills',

  // 资源管理（跨模块）
  // 示例：通用资源库
  RESOURCE = 'resource'
}

// ========== 模块元数据 ==========

/**
 * 模块元数据接口
 *
 * 每个模块应提供此信息，用于系统导航和功能发现
 */
export interface ModuleMetadata {
  // 模块代码（唯一标识符）
  code: ModuleCode

  // 模块显示名称（中文）
  name: string

  // 模块描述
  description: string

  // 模块图标（Element Plus 图标名或自定义路径）
  icon: string

  // 模块颜色主题（用于 UI 突出显示）
  themeColor: string

  // 模块版本
  version: string

  // 模块状态
  status: 'active' | 'deprecated' | 'experimental'

  // 依赖的其他模块
  dependencies?: ModuleCode[]

  // 模块功能列表
  features: ModuleFeature[]
}

/**
 * 模块功能定义
 */
export interface ModuleFeature {
  // 功能代码（唯一标识符）
  code: string

  // 功能显示名称
  name: string

  // 功能描述
  description: string

  // 功能状态
  status: 'active' | 'coming_soon' | 'deprecated'

  // 关联的页面路由
  route?: string

  // 所需权限
  permissions?: string[]
}

// ========== 资源查询选项 ==========

/**
 * 跨模块的资源查询选项
 *
 * 所有模块的资源查询应使用此统一接口
 */
export interface ResourceQueryOptions {
  // 模块代码（如果不指定，则查询所有模块）
  moduleCode?: ModuleCode

  // 资源类型（equipment, flashcard, game 等）
  resourceType?: string

  // 分类筛选
  category?: string

  // 标签筛选
  tags?: string[]

  // 关键词搜索（匹配名称、描述、标签）
  keyword?: string

  // 是否只返回收藏资源
  favoritesOnly?: boolean

  // 是否包含自定义资源
  includeCustom?: boolean

  // 分页选项
  offset?: number
  limit?: number

  // 排序选项
  sortBy?: 'name' | 'created_at' | 'usage_count'
  sortOrder?: 'asc' | 'desc'
}

// ========== 资源项类型 ==========

/**
 * 统一的资源项接口
 *
 * 适配不同类型的资源（器材、闪卡、游戏等）
 */
export interface ResourceItem {
  // 资源 ID
  id: number

  // 模块代码
  moduleCode: ModuleCode

  // 资源类型
  resourceType: string

  // 资源名称
  name: string

  // 资源描述
  description?: string

  // 分类
  category?: string

  // 标签列表
  tags: string[]

  // 封面图片
  coverImage?: string

  // 是否为用户自定义
  isCustom: boolean

  // 是否活跃
  isActive: boolean

  // 使用次数（热度）
  usageCount?: number

  // 创建时间
  createdAt?: string

  // 扩展字段（用于特定资源类型的额外属性）
  // 例如：器材的难度等级、游戏的适用年龄等
  metadata?: Record<string, any>

  // 迁移溯源字段（用于图片加载和兼容性）
  legacyId?: number
  legacySource?: string
}

// ========== 模块配置接口 ==========

/**
 * 模块配置接口
 *
 * 每个模块可以有自己的配置项
 */
export interface ModuleConfig {
  // 模块代码
  moduleCode: ModuleCode

  // 配置键值对
  config: Record<string, any>

  // 默认配置
  defaults?: Record<string, any>
}

// ========== IEP 策略相关类型 ==========

/**
 * IEP 生成策略接口
 *
 * Phase 3.3: 业务逻辑策略化
 *
 * 每个模块可以实现自己的 IEP 生成策略
 */
export interface IEPStrategy {
  // 策略名称（唯一标识符）
  name: string

  // 策略显示名称
  displayName: string

  // 支持的模块代码列表
  supportedModules: ModuleCode[]

  // 生成 IEP
  generateIEP(data: any): Promise<IEPResult>
}

/**
 * IEP 生成结果
 */
export interface IEPResult {
  // 是否成功
  success: boolean

  // 生成的 IEP 内容
  content?: string

  // IEP 类型（html, docx, pdf 等）
  format?: string

  // 错误信息
  error?: string
}

// ========== 模块注册表 ==========

/**
 * 模块注册表
 *
 * 应用启动时，所有模块应在此注册
 */
export interface ModuleRegistry {
  // 获取所有已注册的模块
  getAllModules(): ModuleMetadata[]

  // 获取指定模块的元数据
  getModule(code: ModuleCode): ModuleMetadata | undefined

  // 注册模块
  registerModule(metadata: ModuleMetadata): void

  // 获取模块的 IEP 策略
  getIEPSstrategy(moduleCode: ModuleCode): IEPStrategy | undefined

  // 注册 IEP 策略
  registerIEPSstrategy(strategy: IEPStrategy): void

  // 获取模块配置
  getModuleConfig(moduleCode: ModuleCode): ModuleConfig | undefined

  // 更新模块配置
  updateModuleConfig(moduleCode: ModuleCode, config: Record<string, any>): void
}

// ========== 类型守卫 ==========

/**
 * 检查是否为有效的模块代码
 */
export function isValidModuleCode(code: string): code is ModuleCode {
  return Object.values(ModuleCode).includes(code as ModuleCode)
}

/**
 * 检查是否为有效的资源查询选项
 */
export function isValidResourceQueryOptions(options: any): options is ResourceQueryOptions {
  // 基本类型检查
  if (typeof options !== 'object' || options === null) {
    return false
  }

  // moduleCode 可选校验
  if (options.moduleCode !== undefined) {
    if (!isValidModuleCode(options.moduleCode)) {
      return false
    }
  }

  return true
}

/**
 * 资源项类型守卫
 */
export function isResourceItem(item: any): item is ResourceItem {
  return (
    typeof item === 'object' &&
    typeof item.id === 'number' &&
    typeof item.name === 'string' &&
    typeof item.moduleCode === 'string' &&
    isValidModuleCode(item.moduleCode)
  )
}

/**
 * IEP 策略类型守卫
 */
export function isIEPSstrategy(strategy: any): strategy is IEPStrategy {
  return (
    typeof strategy === 'object' &&
    typeof strategy.name === 'string' &&
    typeof strategy.displayName === 'string' &&
    Array.isArray(strategy.supportedModules) &&
    typeof strategy.generateIEP === 'function'
  )
}
