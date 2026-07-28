/**
 * 器材图片解析
 *
 * 图片已统一迁出本目录，存放在 assets/resources/images/equipment/，
 * 运行时经 resource:// 协议（Electron 生产）或 BASE_URL/assets/resources（web）解析。
 * 本模块只保留解析逻辑 + 已落地图片 key 清单（用于占位符回退），不再用 import.meta.glob
 * 把图片字节编进 bundle。
 *
 * 命名格式：{category}-{id}.webp（如 tactile-1.webp, visual-44.webp）
 * 新增/删除图片后，需同步更新下方 AVAILABLE_EQUIPMENT_IMAGE_KEYS。
 */

import type { EquipmentCategory } from '@/types/equipment'
import { CATEGORY_COLORS } from '@/types/equipment'
import { resolvePresetResourceUrl } from '@/utils/preset-resource'

// 已落地到 assets/resources/images/equipment/ 的图片 key（{category}-{id}）
// 新增/删除图片后需同步更新本清单。
const AVAILABLE_EQUIPMENT_IMAGE_KEYS = new Set<string>([
  'auditory-46',
  'auditory-47',
  'auditory-48',
  'auditory-49',
  'auditory-50',
  'auditory-51',
  'auditory-52',
  'gustatory-35',
  'gustatory-36',
  'integration-57',
  'integration-58',
  'integration-59',
  'integration-60',
  'integration-61',
  'integration-62',
  'integration-63',
  'olfactory-30',
  'olfactory-31',
  'olfactory-32',
  'olfactory-33',
  'olfactory-34',
  'proprioceptive-53',
  'proprioceptive-54',
  'proprioceptive-55',
  'proprioceptive-56',
  'tactile-1',
  'tactile-2',
  'tactile-3',
  'tactile-4',
  'tactile-5',
  'tactile-6',
  'tactile-7',
  'tactile-8',
  'tactile-9',
  'tactile-10',
  'tactile-11',
  'tactile-12',
  'tactile-13',
  'tactile-14',
  'tactile-15',
  'tactile-16',
  'tactile-17',
  'tactile-18',
  'tactile-19',
  'tactile-20',
  'tactile-21',
  'tactile-22',
  'tactile-23',
  'tactile-24',
  'tactile-25',
  'tactile-26',
  'tactile-27',
  'tactile-28',
  'tactile-29',
  'visual-37',
  'visual-38',
  'visual-39',
  'visual-40',
  'visual-41',
  'visual-42',
  'visual-43',
  'visual-44',
])

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
  const key = `${category}-${id}`

  if (AVAILABLE_EQUIPMENT_IMAGE_KEYS.has(key)) {
    return resolvePresetResourceUrl(`images/equipment/${key}.webp`)
  }

  return generatePlaceholderUrl(category, name)
}
