/**
 * 资源文件管理工具
 * 负责处理本地文件系统的读写操作
 */

export interface ResourceFile {
  id: number
  title: string
  type: string
  category: number
  path: string
  size_kb: number
  tags?: string
  description?: string
  is_favorite?: number
  created_at?: string
  updated_at?: string
}

export class ResourceManager {
  private resourcesPath: string = ''

  constructor() {
    this.initializePaths()
  }

  /**
   * 初始化资源路径
   */
  private initializePaths() {
    // 在 Electron 环境中获取应用安装目录下的 resources 文件夹
    if (window.electronAPI && window.electronAPI.getAppPath) {
      console.log('[ResourceManager] 开始初始化 resourcesPath...')
      window.electronAPI.getAppPath().then((resourcesPath: string) => {
        // 直接使用返回的 resources 目录路径
        this.resourcesPath = resourcesPath
        console.log('[ResourceManager] resourcesPath 已设置:', this.resourcesPath)
        this.ensureDirectoryExists()
      }).catch((error) => {
        console.error('[ResourceManager] 获取 resourcesPath 失败:', error)
      })
    } else {
      // 开发环境下的模拟路径
      this.resourcesPath = '/resources'
      console.log('[ResourceManager] 开发环境：使用模拟资源路径', this.resourcesPath)
    }
  }

  /**
   * 确保资源目录存在
   */
  private async ensureDirectoryExists() {
    if (window.electronAPI && window.electronAPI.ensureDir) {
      console.log('[ResourceManager] 开始创建资源目录...')
      // 创建主资源目录
      const mainDirSuccess = await window.electronAPI.ensureDir(this.resourcesPath)
      console.log('[ResourceManager] 主资源目录创建结果:', mainDirSuccess, this.resourcesPath)

      // 创建分类子目录
      const categories = [
        'docs',           // 教学文档
        'videos',         // 示范视频
        'ppt',            // PPT课件
        'cases',          // 案例分析
        'images',         // 图片素材
        'audio',          // 音频资源
        'uploaded'        // 用户上传的资源
      ]

      for (const category of categories) {
        const categoryPath = `${this.resourcesPath}/${category}`
        const success = await window.electronAPI.ensureDir(categoryPath)
        console.log(`[ResourceManager] 目录 ${category} 创建结果:`, success, categoryPath)
      }
    }
  }

  /**
   * 获取分类对应的目录名
   */
  private getCategoryDirectoryName(categoryId: number): string {
    const categoryMap: Record<number, string> = {
      1: 'docs',      // 教学文档
      2: 'videos',    // 示范视频
      3: 'ppt',       // PPT课件
      4: 'cases',     // 案例分析
      5: 'images',    // 图片素材
      6: 'audio'      // 音频资源
    }
    return categoryMap[categoryId] || 'uploaded'
  }

  /**
   * 确保 resourcesPath 已初始化
   */
  private async ensurePathInitialized(): Promise<void> {
    if (!this.resourcesPath) {
      console.log('[ResourceManager] resourcesPath 未初始化，等待初始化完成...')
      let waitCount = 0
      await new Promise<void>((resolve) => {
        const checkPath = () => {
          waitCount++
          if (this.resourcesPath) {
            console.log(`[ResourceManager] resourcesPath 初始化完成，等待了 ${waitCount * 50}ms`)
            resolve()
          } else {
            if (waitCount % 10 === 0) {
              console.log(`[ResourceManager] 仍在等待初始化... (${waitCount * 50}ms)`)
            }
            setTimeout(checkPath, 50)
          }
        }
        checkPath()
      })
    } else {
      console.log('[ResourceManager] resourcesPath 已初始化:', this.resourcesPath)
    }
  }

  /**
   * 获取完整的文件路径
   */
  private getFullPath(relativePath: string): string {
    return `${this.resourcesPath}/${relativePath}`
  }

  /**
   * 保存上传的文件到本地
   */
  async saveFile(file: File, categoryId: number): Promise<string> {
    console.log('[ResourceManager] saveFile 被调用:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      categoryId: categoryId
    })

    // 确保 resourcesPath 已初始化
    await this.ensurePathInitialized()

    return new Promise((resolve, reject) => {
      const categoryDir = this.getCategoryDirectoryName(categoryId)
      const fileName = this.generateUniqueFileName(file.name, categoryDir)
      const relativePath = `${categoryDir}/${fileName}`
      const fullPath = this.getFullPath(relativePath)

      console.log('[ResourceManager] 文件保存信息:', {
        categoryDir,
        fileName,
        relativePath,
        fullPath,
        resourcesPath: this.resourcesPath
      })

      // 读取文件内容
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          console.log('[ResourceManager] 文件读取完成，准备保存...')
          if (window.electronAPI && window.electronAPI.saveFile) {
            // 在 Electron 环境中保存文件
            const arrayBuffer = reader.result as ArrayBuffer
            console.log('[ResourceManager] ArrayBuffer 大小:', arrayBuffer.byteLength, 'bytes')

            const success = await window.electronAPI.saveFile(fullPath, arrayBuffer)
            console.log('[ResourceManager] 文件保存结果:', success, fullPath)

            if (success) {
              resolve(relativePath)
            } else {
              console.error('[ResourceManager] 文件保存失败，saveFile 返回 false')
              reject(new Error('文件保存失败'))
            }
          } else {
            // 开发环境：返回模拟路径
            console.log('[ResourceManager] 开发环境：模拟保存文件', fullPath)
            resolve(relativePath)
          }
        } catch (error) {
          console.error('[ResourceManager] 文件保存过程出错:', error)
          reject(error)
        }
      }
      reader.onerror = () => {
        console.error('[ResourceManager] FileReader 读取出错')
        reject(new Error('文件读取失败'))
      }
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * 生成唯一的文件名（避免重复）
   */
  private generateUniqueFileName(originalName: string, categoryDir: string): string {
    // 获取文件扩展名（最后一个点后的内容）
    const lastDotIndex = originalName.lastIndexOf('.')
    const ext = lastDotIndex > 0 ? originalName.slice(lastDotIndex) : ''
    // 获取不含扩展名的文件名
    const name = lastDotIndex > 0 ? originalName.slice(0, lastDotIndex) : originalName
    const timestamp = Date.now()
    return `${name}_${timestamp}${ext}`
  }

  /**
   * 获取文件的本地URL
   *
   * Phase 2.1: 使用 resource:// 自定义协议
   *
   * 资源路径策略：
   * - 系统预置资源（docs/, images/, videos/, audio/）：开发环境用 Vite 静态服务，生产环境用 resource://
   * - 用户上传资源（uploaded/）：统一使用 resource:// 协议
   */
  async getFileUrl(filePath: string): Promise<string> {
    await this.ensurePathInitialized()

    // 清理路径
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath

    // 判断是否为系统预置资源
    const isPresetResource = this.isPresetResourcePath(cleanPath)

    if (window.electronAPI) {
      // Electron 环境
      if (isPresetResource) {
        // 系统预置资源：使用 resource:// 协议
        // 这些资源在应用启动时会被复制到 userData/resources/ 或在打包时包含
        console.log('[ResourceManager] 系统预置资源，使用 resource:// 协议:', cleanPath)
        return `resource://${cleanPath}`
      } else {
        // 用户上传资源：使用 resource:// 协议
        console.log('[ResourceManager] 用户资源，使用 resource:// 协议:', cleanPath)
        return `resource://${cleanPath}`
      }
    } else {
      // 开发环境：使用 Vite 静态资源服务
      console.log('[ResourceManager] 开发环境：使用 assets 路径')
      return `/assets/resources/${cleanPath}`
    }
  }

  /**
   * 判断是否为系统预置资源路径
   *
   * 系统预置资源目录：docs/, images/, videos/, audio/
   * 用户上传资源目录：uploaded/
   */
  private isPresetResourcePath(path: string): boolean {
    const presetPrefixes = ['docs/', 'images/', 'videos/', 'audio/']
    return presetPrefixes.some(prefix => path.startsWith(prefix))
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(filePath: string): Promise<boolean> {
    await this.ensurePathInitialized()
    if (window.electronAPI && window.electronAPI.fileExists) {
      const fullPath = this.getFullPath(filePath)
      return await window.electronAPI.fileExists(fullPath)
    }
    // 开发环境假设文件存在
    return true
  }

  /**
   * 删除文件
   */
  async deleteFile(filePath: string): Promise<boolean> {
    await this.ensurePathInitialized()
    if (window.electronAPI && window.electronAPI.deleteFile) {
      const fullPath = this.getFullPath(filePath)
      return await window.electronAPI.deleteFile(fullPath)
    }
    // 开发环境模拟删除成功
    return true
  }

  /**
   * 获取文件的 Base64 编码（用于预览）
   */
  async getFileAsBase64(filePath: string): Promise<string> {
    await this.ensurePathInitialized()
    if (window.electronAPI && window.electronAPI.readFileAsBase64) {
      const fullPath = this.getFullPath(filePath)
      return await window.electronAPI.readFileAsBase64(fullPath)
    }
    // 开发环境返回空
    return ''
  }

  /**
   * 使用系统默认程序打开文件
   */
  async openWithSystem(filePath: string): Promise<boolean> {
    await this.ensurePathInitialized()
    if (window.electronAPI && window.electronAPI.openFile) {
      const fullPath = this.getFullPath(filePath)
      return await window.electronAPI.openFile(fullPath)
    }
    // 开发环境：使用完整的资源路径
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath
    const fullUrl = `/assets/resources/${cleanPath}`
    window.open(fullUrl, '_blank')
    return true
  }

  /**
   * 获取资源文件夹路径（用于调试）
   */
  getResourcesPath(): string {
    return this.resourcesPath
  }
}

// 创建全局实例
export const resourceManager = new ResourceManager()