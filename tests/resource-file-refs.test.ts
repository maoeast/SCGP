import assert from 'node:assert/strict'

import {
  MANAGED_PREFIXES,
  PRESET_PREFIXES,
  normalizeResourceUrl,
  isManagedResourcePath,
  isPresetResourcePath,
  extractResourceFileRefs,
} from '../src/utils/resource-file-refs.ts'

// ---- normalizeResourceUrl ----
assert.equal(normalizeResourceUrl('resource://uploaded/a.png'), 'uploaded/a.png')
assert.equal(normalizeResourceUrl('resource:///uploaded/ai-scenes/x.png'), 'uploaded/ai-scenes/x.png')
assert.equal(normalizeResourceUrl('resource:///teaching-materials/fine_motor/1-t.pdf'), 'teaching-materials/fine_motor/1-t.pdf')
assert.equal(normalizeResourceUrl('/uploaded/leading.png'), 'uploaded/leading.png')
assert.equal(normalizeResourceUrl('images/emotional-scenes/scene1.png'), 'images/emotional-scenes/scene1.png')
assert.equal(normalizeResourceUrl('uploaded\\backslash.png'), 'uploaded/backslash.png')
assert.equal(normalizeResourceUrl('  resource:///uploaded/trim.png  '), 'uploaded/trim.png')

// 非资源引用归一为空
assert.equal(normalizeResourceUrl('emoji:😀'), '')
assert.equal(normalizeResourceUrl('https://example.com/x.png'), '')
assert.equal(normalizeResourceUrl('data:image/png;base64,iVBOR==='), '')
assert.equal(normalizeResourceUrl('blob:http://localhost/x'), '')
assert.equal(normalizeResourceUrl('file:///C:/x.png'), '')
assert.equal(normalizeResourceUrl(''), '')
assert.equal(normalizeResourceUrl('   '), '')
assert.equal(normalizeResourceUrl(null as unknown as string), '')
assert.equal(normalizeResourceUrl(undefined as unknown as string), '')
assert.equal(normalizeResourceUrl(123 as unknown as string), '')

// 原始 emoji 字符归一后原样透传（下游 isManagedResourcePath 会排除）
assert.equal(normalizeResourceUrl('😀'), '😀')

// ---- 前缀常量 ----
assert.deepEqual([...MANAGED_PREFIXES], ['uploaded/', 'teaching-materials/'])
assert.deepEqual([...PRESET_PREFIXES], ['docs/', 'images/', 'videos/', 'audio/'])

// ---- isManagedResourcePath ----
assert.equal(isManagedResourcePath('uploaded/a.png'), true)
assert.equal(isManagedResourcePath('uploaded/ai-scenes/emotion_scene/s1/1.png'), true)
assert.equal(isManagedResourcePath('teaching-materials/fine_motor/1-t.pdf'), true)
assert.equal(isManagedResourcePath('images/a.png'), false)
assert.equal(isManagedResourcePath('docs/a.pdf'), false)
assert.equal(isManagedResourcePath('uploadeded/x.png'), false) // 必须精确前缀 uploaded/
assert.equal(isManagedResourcePath(''), false)

// ---- isPresetResourcePath ----
assert.equal(isPresetResourcePath('images/a.png'), true)
assert.equal(isPresetResourcePath('docs/a.pdf'), true)
assert.equal(isPresetResourcePath('videos/a.mp4'), true)
assert.equal(isPresetResourcePath('audio/a.mp3'), true)
assert.equal(isPresetResourcePath('uploaded/a.png'), false)
assert.equal(isPresetResourcePath(''), false)

// ---- extractResourceFileRefs ----
// emoji 封面 → 无托管引用
assert.deepEqual(extractResourceFileRefs({ cover_image: 'emoji:😀' }), [])
assert.deepEqual(extractResourceFileRefs({ cover_image: '😀' }), [])

// 预置封面不进托管集
assert.deepEqual(extractResourceFileRefs({ cover_image: 'images/emotional-scenes/scene1.png' }), [])
assert.deepEqual(extractResourceFileRefs({ cover_image: 'resource:///images/x.png' }), [])

// 托管封面
assert.deepEqual(extractResourceFileRefs({ cover_image: 'resource:///uploaded/a.png' }), ['uploaded/a.png'])

// meta_data 为 JSON 字符串，含嵌套 imageUrl（AI 场景图）
assert.deepEqual(
  extractResourceFileRefs({
    cover_image: 'emoji:😀',
    meta_data: JSON.stringify({ imageUrl: 'resource:///uploaded/ai-scenes/emotion_scene/s1/x.png', title: '标题' }),
  }),
  ['uploaded/ai-scenes/emotion_scene/s1/x.png']
)

// meta_data 为已解析对象
assert.deepEqual(
  extractResourceFileRefs({ meta_data: { imageUrl: 'resource:///uploaded/b.png' } }),
  ['uploaded/b.png']
)

// 托管 + 预置混合 → 只返回托管，去重
assert.deepEqual(
  extractResourceFileRefs({
    cover_image: 'resource:///uploaded/shared.png',
    meta_data: JSON.stringify({
      imageUrl: 'resource:///uploaded/shared.png',
      presetRef: 'resource:///images/scene2.png',
    }),
  }),
  ['uploaded/shared.png']
)

// 空 / 缺失
assert.deepEqual(extractResourceFileRefs(null), [])
assert.deepEqual(extractResourceFileRefs(undefined), [])
assert.deepEqual(extractResourceFileRefs({}), [])
assert.deepEqual(extractResourceFileRefs({ cover_image: null, meta_data: null }), [])

// 非法 JSON meta_data 不抛
assert.deepEqual(extractResourceFileRefs({ meta_data: '{not json' }), [])

console.log('resource-file-refs test passed')
