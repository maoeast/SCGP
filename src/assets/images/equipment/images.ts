/**
 * 器材图片索引文件
 *
 * 使用说明：
 * 1. 将真实图片放入此目录，命名格式：{category}-{id}.webp
 *    例如：tactile-1.webp, visual-30.webp
 * 2. 图片尺寸推荐：96x96px 或 128x128px
 * 3. 图片格式推荐：WebP（或 PNG）
 * 4. 单张图片大小建议 < 20KB
 *
 * 自动生成占位符图片（用于演示）：
 * 如果目录中没有对应图片，将自动生成 SVG 占位符
 */

import type { EquipmentCategory } from '@/types/equipment'
import { CATEGORY_COLORS } from '@/types/equipment'

// 使用 Vite 的 glob 导入，在构建时包含所有 .webp 图片
// @ts-ignore - Vite 的 glob 导入
const imageModules = import.meta.glob('./*.webp', { eager: true })

/**
 * 生成占位符图片 URL（当真实图片不存在时）
 */
function generatePlaceholderUrl(category: EquipmentCategory, name: string): string {
  const color = CATEGORY_COLORS[category] || '#CCCCCC'
  const firstChar = name.charAt(0)

  const svg = `
    <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" fill="${color}"/>
      <text x="64" y="80" font-size="48" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">${firstChar}</text>
    </svg>
  `.trim()

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * 获取器材图片 URL
 *
 * @param category 器材分类（tactile, visual 等）
 * @param id 器材 ID
 * @param name 器材名称（用于占位符）
 * @returns 图片 URL
 */
export function getEquipmentImageUrl(
  category: EquipmentCategory,
  id: number,
  name: string
): string {
  // 构建图片文件名
  const imageName = `./${category}-${id}.webp`

  // 检查 glob 导入中是否有对应图片
  if (imageName in imageModules) {
    // 获取图片的默认导出（URL）
    return imageModules[imageName].default
  }

  // 如果图片不存在，返回占位符
  return generatePlaceholderUrl(category, name)
}

/**
 * 手动导入的图片映射（可选）
 *
 * 如果您希望明确列出所有图片（更好的类型安全），
 * 可以取消注释并添加图片导入：
 *
 * import tactile1Img from './tactile-1.webp'
 * import tactile2Img from './tactile-2.webp'
 * ...
 *
 * export const EQUIPMENT_IMAGES: Record<string, string> = {
 *   'tactile-1': tactile1Img,
 *   'tactile-2': tactile2Img,
 *   ...
 * }
 */
