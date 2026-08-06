/**
 * 教学资料排序：业务维度顺序（EQUIPMENT_CATALOG_GROUPS）→ 序号升序 → id 升序。
 * 无序号（辅助资料）与无维度（异常数据）排最后。
 *
 * 注意：教学资料维度顺序与 TEACHING_MATERIAL_DIMENSION_CODES（= EQUIPMENT_CATALOG_GROUPS）
 * 保持一致；此处直接引用 leaf 常量文件，避免 jiti 测试链路加载 @/ alias。
 */
import type { TeachingMaterialItem } from '../database/teaching-materials-api'
import { EQUIPMENT_CATALOG_GROUPS } from './equipment-catalog-group'

// 业务维度固定顺序索引（未匹配的异常数据排最后）
const DIMENSION_ORDER_INDEX = new Map<string, number>(
  EQUIPMENT_CATALOG_GROUPS.map((code, index) => [code, index]),
)

export function compareTeachingMaterials(a: TeachingMaterialItem, b: TeachingMaterialItem): number {
  const dimA = DIMENSION_ORDER_INDEX.get(a.dimensionCode) ?? Number.MAX_SAFE_INTEGER
  const dimB = DIMENSION_ORDER_INDEX.get(b.dimensionCode) ?? Number.MAX_SAFE_INTEGER
  if (dimA !== dimB) {
    return dimA - dimB
  }

  const seqA = a.sequenceOrder ?? Number.MAX_SAFE_INTEGER
  const seqB = b.sequenceOrder ?? Number.MAX_SAFE_INTEGER
  if (seqA !== seqB) {
    return seqA - seqB
  }

  return a.id - b.id
}
