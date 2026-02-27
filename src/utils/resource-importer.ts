/**
 * 资源批量导入工具
 * 用于从文件夹和CSV文件批量导入资源到系统
 */

import { ResourceAPI } from '@/database/api'

export interface ImportResource {
  filePath: string
  categoryId: number
  title: string
  tags?: string
  description?: string
  size_kb?: number
}

export class ResourceImporter {
  private api: ResourceAPI

  constructor() {
    this.api = new ResourceAPI()
  }

  /**
   * 从CSV文件导入资源
   */
  async importFromCSV(csvContent: string): Promise<{ success: number; failed: number; errors: string[] }> {
    const lines = csvContent.split('\n').filter(line => line.trim() && !line.startsWith('#'))
    const resources: ImportResource[] = []
    const errors: string[] = []
    let success = 0
    let failed = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      try {
        // 解析CSV行
        const parts = line.split(',').map(part => part.trim().replace(/^"|"$/g, ''))

        if (parts.length < 2) {
          errors.push('Line ' + (i + 1) + ': Format error, at least file path and category ID required')
          failed++
          continue
        }

        const resource: ImportResource = {
          filePath: parts[0],
          categoryId: parseInt(parts[1]),
          title: parts[2] || this.getFileNameFromPath(parts[0]),
          tags: parts[3] || '',
          description: parts[4] || '',
          size_kb: parts[5] ? parseInt(parts[5]) : undefined
        }

        // 验证数据
        if (isNaN(resource.categoryId) || resource.categoryId < 1 || resource.categoryId > 6) {
          errors.push('Line ' + (i + 1) + ': Invalid category ID (' + parts[1] + '), should be 1-6')
          failed++
          continue
        }

        resources.push(resource)
        success++
      } catch (error) {
        errors.push('Line ' + (i + 1) + ': Parse error - ' + error.message)
        failed++
      }
    }

    if (resources.length > 0) {
      console.log('Preparing to import ' + resources.length + ' resources...')
      const importResult = await this.importResources(resources)
      success = importResult.success
      failed += importResult.failed
      errors.push(...importResult.errors)
    }

    return { success, failed, errors }
  }

  /**
   * 从文件夹扫描导入资源
   */
  async importFromFolder(folderPath: string, categoryId: number): Promise<{ success: number; failed: number; errors: string[] }> {
    const resources: ImportResource[] = []
    const errors: string[] = []

    try {
      // 获取文件夹中的所有文件
      if (window.electronAPI && window.electronAPI.readDir) {
        const items = await window.electronAPI.readDir(folderPath)

        for (const item of items) {
          if (item.isFile) {
            const resource: ImportResource = {
              filePath: this.getRelativePath(item.name),
              categoryId,
              title: this.getFileNameFromPath(item.name),
              tags: this.guessTagsFromPath(item.name),
              description: this.getFileNameFromPath(item.name) + ' - ' + this.getFileExtension(item.name).toUpperCase() + ' file',
              size_kb: undefined // 稍后在导入时获取
            }

            resources.push(resource)
          } else if (item.isDirectory) {
            // 可以选择递归导入子目录
            console.log('Found subdirectory: ' + item.name)
          }
        }
      } else {
        errors.push('无法访问文件夹（仅在Electron环境下可用）')
        return { success: 0, failed: 0, errors }
      }
    } catch (error) {
      errors.push('Failed to read folder: ' + error.message)
      return { success: 0, failed: 0, errors }
    }

    if (resources.length > 0) {
      console.log('Preparing to import ' + resources.length + ' resources...')
      const importResult = await this.importResources(resources)
      return importResult
    }

    return { success: 0, failed: 0, errors }
  }

  /**
   * 批量导入资源到数据库
   */
  private async importResources(resources: ImportResource[]): Promise<{ success: number; failed: number; errors: string[] }> {
    const errors: string[] = []
    let success = 0
    let failed = 0

    // 动态导入 resourceManager
    let resourceManager: any = null
    try {
      const managerModule = await import('./resource-manager')
      resourceManager = managerModule.resourceManager
    } catch (error) {
      console.warn('无法导入 resourceManager，将跳过文件存在性检查')
    }

    for (const resource of resources) {
      try {
        // 检查文件是否存在（仅在 Electron 环境下）
        // 注意：即使文件不存在也继续导入，用户可以稍后添加文件
        if (resourceManager) {
          const fullPath = 'assets/resources/' + resource.filePath
          const exists = await resourceManager.fileExists(fullPath)

          if (!exists) {
            console.warn('[WARN] File not found (will import anyway):', resource.filePath)
            // 不再跳过，继续导入，让用户后续添加文件
          }
        }

        // 获取文件大小（如果未指定）
        if (!resource.size_kb) {
          // 这里可以添加获取文件大小的逻辑
          resource.size_kb = 0 // 暂时设为0
        }

        // 保存资源到数据库
        const resourceId = this.api.addResource({
          title: resource.title,
          type: this.getFileExtension(resource.filePath),
          category: resource.categoryId,
          path: resource.filePath,
          size_kb: resource.size_kb,
          tags: resource.tags,
          description: resource.description
        })

        if (resourceId > 0) {
          console.log('[SUCCESS] Imported: ' + resource.title)
          success++
        } else {
          errors.push('Database save failed: ' + resource.title)
          failed++
        }
      } catch (error) {
        console.error('Import failed: ' + resource.filePath, error)
        errors.push('Import failed ' + (resource.title || resource.filePath) + ': ' + error.message)
        failed++
      }
    }

    return { success, failed, errors }
  }

  /**
   * 从文件路径提取文件名（不含扩展名）
   */
  private getFileNameFromPath(filePath: string): string {
    const fileName = filePath.split('/').pop() || filePath
    const nameWithoutExt = fileName.split('.')[0]
    return nameWithoutExt
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(filePath: string): string {
    const fileName = filePath.split('/').pop() || filePath
    const ext = fileName.split('.').pop() || ''
    return ext
  }

  /**
   * 获取相对路径
   */
  private getRelativePath(filePath: string): string {
    // 移除可能的前缀路径
    return filePath.replace(/^.*[/\\]/, '')
  }

  /**
   * 根据路径猜测标签
   */
  private guessTagsFromPath(filePath: string): string {
    const lowerPath = filePath.toLowerCase()
    const tags: string[] = []

    // 根据路径关键词添加标签
    if (lowerPath.includes('评估')) tags.push('评估')
    if (lowerPath.includes('示范')) tags.push('示范')
    if (lowerPath.includes('训练')) tags.push('训练')
    if (lowerPath.includes('技能')) tags.push('技能')
    if (lowerPath.includes('卫生')) tags.push('卫生')
    if (lowerPath.includes('习惯')) tags.push('习惯')
    if (lowerPath.includes('社交')) tags.push('社交')
    if (lowerPath.includes('视频')) tags.push('视频')
    if (lowerPath.includes('图片')) tags.push('图片')
    if (lowerPath.includes('音频')) tags.push('音频')
    if (lowerPath.includes('音乐')) tags.push('背景音乐')

    return tags.join(',')
  }

  /**
   * 导入示例模板
   */
  async importSampleTemplate(): Promise<{ success: number; failed: number; errors: string[] }> {
    const templatePath = 'assets/resources/resource-import-template.csv'

    try {
      let csvContent: string
      if (window.electronAPI && window.electronAPI.readFile) {
        const content = await window.electronAPI.readFile(templatePath)
        const decoder = new TextDecoder('utf-8')
        csvContent = decoder.decode(content)
      } else {
        // 开发环境下，直接返回示例数据
        csvContent = 'docs/S-M量表评估指南.pdf,1,S-M量表评估指南,S-M,评估,S-M量表详细评估指南\n' +
        'docs/WeeFIM评估手册.pdf,1,WeeFIM评估手册,WeeFIM,功能独立性,WeeFIM量表的详细评估方法\n' +
        'videos/洗手七步法示范.mp4,2,洗手七步法示范,洗手,卫生示范,标准洗手七步法完整示范视频\n' +
        'images/洗手步骤图集.zip,5,洗手步骤图集,洗手,步骤图,洗手各个步骤的详细图解\n' +
        'audio/语音提示音库.mp3,6,语音提示音库,语音提示,音频,训练过程中使用的语音提示音合集'
        console.log('使用内置示例模板')
      }

      return await this.importFromCSV(csvContent)
    } catch (error) {
      console.error('读取模板文件失败:', error)
      return { success: 0, failed: 0, errors: ['无法读取模板文件'] }
    }
  }

  /**
   * 生成导入报告
   */
  generateImportReport(result: { success: number; failed: number; errors: string[] }): string {
    const lines: string[] = []

    lines.push('='.repeat(50))
    lines.push('批量导入完成')
    lines.push('='.repeat(50))
    lines.push(`✓ 成功导入: ${result.success} 条`)
    lines.push(`✗ 失败: ${result.failed} 条`)

    if (result.errors.length > 0) {
      lines.push('')
      lines.push('错误详情:')
      lines.push('-'.repeat(50))
      result.errors.forEach((error, index) => {
        lines.push(`${index + 1}. ${error}`)
      })
    }

    if (result.failed === 0) {
      lines.push('')
      lines.push('🎉 所有资源导入成功！')
    } else {
      lines.push('')
      lines.push(`⚠️ 有 ${result.failed} 条资源导入失败，请检查文件路径`)
    }

    lines.push('='.repeat(50))

    return lines.join('\n')
  }
}

// 创建全局实例
export const resourceImporter = new ResourceImporter()