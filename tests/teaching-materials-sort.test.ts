import assert from 'node:assert/strict'

import { compareTeachingMaterials } from '../src/utils/teaching-material-sort.ts'
import type { TeachingMaterialItem } from '../src/database/teaching-materials-api.ts'

function makeMaterial(partial: Partial<TeachingMaterialItem> & { id: number }): TeachingMaterialItem {
  return {
    title: `资料-${partial.id}`,
    dimensionCode: 'sensory-training',
    moduleCode: 'sensory' as TeachingMaterialItem['moduleCode'],
    fileName: `file-${partial.id}.pdf`,
    fileType: 'pdf',
    filePath: `materials/${partial.id}.pdf`,
    fileSizeBytes: 1024,
    tags: [],
    isFavorite: false,
    ...partial,
  }
}

// 1. 业务维度顺序：感官训练 < 情绪调节 < 社交沟通 < ...（按 EQUIPMENT_CATALOG_GROUPS 常量序）
const crossDimension = [
  makeMaterial({ id: 1, dimensionCode: 'cognitive-development' }),
  makeMaterial({ id: 2, dimensionCode: 'emotional-regulation' }),
  makeMaterial({ id: 3, dimensionCode: 'sensory-training' }),
  makeMaterial({ id: 4, dimensionCode: 'life-skills' }),
].sort(compareTeachingMaterials)
assert.deepEqual(
  crossDimension.map((m) => m.dimensionCode),
  ['sensory-training', 'emotional-regulation', 'life-skills', 'cognitive-development'],
)

// 2. 同维度内序号正序（1 在 2 前，3 在 2 后）
const sequenceAsc = [
  makeMaterial({ id: 10, sequenceOrder: 3 }),
  makeMaterial({ id: 11, sequenceOrder: 1 }),
  makeMaterial({ id: 12, sequenceOrder: 2 }),
].sort(compareTeachingMaterials)
assert.deepEqual(
  sequenceAsc.map((m) => m.sequenceOrder),
  [1, 2, 3],
)

// 3. 无序号（辅助资料）排最后
const nullSequenceLast = [
  makeMaterial({ id: 20 }),
  makeMaterial({ id: 21, sequenceOrder: 1 }),
].sort(compareTeachingMaterials)
assert.deepEqual(
  nullSequenceLast.map((m) => m.id),
  [21, 20],
)

// 4. 同维度同序号按 id 升序
const sameSequence = [
  makeMaterial({ id: 31, sequenceOrder: 2 }),
  makeMaterial({ id: 30, sequenceOrder: 2 }),
].sort(compareTeachingMaterials)
assert.deepEqual(
  sameSequence.map((m) => m.id),
  [30, 31],
)

// 5. 未知维度（异常数据）排最后
const unknownDimensionLast = [
  makeMaterial({ id: 41, dimensionCode: 'cognitive-development' }),
  makeMaterial({ id: 42, dimensionCode: 'unknown-dim' as TeachingMaterialItem['dimensionCode'] }),
].sort(compareTeachingMaterials)
assert.deepEqual(
  unknownDimensionLast.map((m) => m.id),
  [41, 42],
)

// 6. 组合场景：维度 → 序号 → id 全链路
const combined = [
  makeMaterial({ id: 50, dimensionCode: 'life-skills', sequenceOrder: 1 }),
  makeMaterial({ id: 51, dimensionCode: 'emotional-regulation' }),
  makeMaterial({ id: 52, dimensionCode: 'emotional-regulation', sequenceOrder: 2 }),
  makeMaterial({ id: 53, dimensionCode: 'emotional-regulation', sequenceOrder: 1 }),
  makeMaterial({ id: 54, dimensionCode: 'sensory-training', sequenceOrder: 9 }),
].sort(compareTeachingMaterials)
assert.deepEqual(
  combined.map((m) => [m.dimensionCode, m.sequenceOrder ?? null, m.id]),
  [
    ['sensory-training', 9, 54],
    ['emotional-regulation', 1, 53],
    ['emotional-regulation', 2, 52],
    ['emotional-regulation', null, 51],
    ['life-skills', 1, 50],
  ],
)

console.log('teaching-materials-sort test passed')
