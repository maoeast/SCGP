import test from 'node:test'
import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
})

function loadGalleryModule() {
  return jiti('../../src/features/self-care/task-gallery.ts')
}

test('self-care task gallery exposes the seven category pills with icon mappings', () => {
  const module = loadGalleryModule()

  assert.equal(module.SELF_CARE_CATEGORY_FILTERS.length, 7)
  assert.deepEqual(
    module.SELF_CARE_CATEGORY_FILTERS.map((item) => [item.key, item.label, item.iconName]),
    [
      ['all', '全部', 'Grid'],
      ['feeding', '饮食技能', 'ForkSpoon'],
      ['dressing', '穿着技能', 'SuitcaseLine'],
      ['toileting', '如厕技能', 'ToiletPaper'],
      ['hygiene', '个人卫生', 'Brush'],
      ['home', '居家生活', 'House'],
      ['community', '社区生活', 'MapLocation'],
    ],
  )
})

test('self-care task gallery resolves top-level categories from structured task metadata', () => {
  const module = loadGalleryModule()

  assert.equal(
    module.resolveSelfCareCategoryKey({
      name: '用勺子吃饭',
      metadata: { category: { parentId: 1, parentName: '饮食技能' } },
    }),
    'feeding',
  )
  assert.equal(
    module.resolveSelfCareCategoryKey({
      name: '穿上衣',
      metadata: { category: { parentId: 2, parentName: '穿着技能' } },
    }),
    'dressing',
  )
  assert.equal(
    module.resolveSelfCareCategoryKey({
      name: '表达如厕需求',
      metadata: { category: { parentId: 3, parentName: '如厕技能' } },
    }),
    'toileting',
  )
  assert.equal(
    module.resolveSelfCareCategoryKey({
      name: '洗手',
      metadata: { category: { parentId: 4, parentName: '个人卫生' } },
    }),
    'hygiene',
  )
  assert.equal(
    module.resolveSelfCareCategoryKey({
      name: '整理床铺',
      metadata: { category: { parentId: 5, parentName: '居家生活' } },
    }),
    'home',
  )
  assert.equal(
    module.resolveSelfCareCategoryKey({
      name: '过马路',
      metadata: { category: { parentId: 6, parentName: '社区生活' } },
    }),
    'community',
  )
})

test('self-care task gallery falls back to task names when metadata is missing', () => {
  const module = loadGalleryModule()

  assert.equal(module.resolveSelfCareCategoryKey({ name: '洗澡', metadata: {} }), 'hygiene')
  assert.equal(module.resolveSelfCareCategoryKey({ name: '收拾书包', metadata: {} }), 'home')
  assert.equal(module.resolveSelfCareCategoryKey({ name: '乘坐公交车', metadata: {} }), 'community')
})

test('self-care task gallery builds counts for the category pills including all bucket', () => {
  const module = loadGalleryModule()

  const counts = module.buildSelfCareCategoryCounts([
    { name: '用勺子吃饭', metadata: { category: { parentId: 1, parentName: '饮食技能' } } },
    { name: '洗手', metadata: { category: { parentId: 4, parentName: '个人卫生' } } },
    { name: '过马路', metadata: { category: { parentId: 6, parentName: '社区生活' } } },
    { name: '穿上衣', metadata: { category: { parentId: 2, parentName: '穿着技能' } } },
  ])

  assert.deepEqual(counts, {
    all: 4,
    feeding: 1,
    dressing: 1,
    toileting: 0,
    hygiene: 1,
    home: 0,
    community: 1,
  })
})
