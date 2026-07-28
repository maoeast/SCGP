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

const {
  buildOrphanReport,
  collectReferencedPathsFromRows,
} = jiti('../../src/utils/resource-reconcile-core.ts')

test('resource reconcile collects managed references across resources, materials, AI attachments, and login backgrounds', () => {
  const refs = collectReferencedPathsFromRows({
    resourceRows: [
      {
        cover_image: 'resource:///uploaded/covers/a.png',
        meta_data: JSON.stringify({
          imageUrl: 'resource:///uploaded/ai-scenes/scene-a.webp',
          preset: 'resource:///images/preset.png',
        }),
      },
      {
        cover_image: 'emoji:star',
        meta_data: '{not json',
      },
    ],
    materialRows: [
      { file_path: 'teaching-materials/fine_motor/card.pdf' },
      { file_path: 'images/preset-material.pdf' },
    ],
    messageRows: [
      {
        attachments: JSON.stringify([
          { rel: 'uploaded/ai-attachments/a.png' },
          { rel: 'docs/manual.pdf' },
        ]),
      },
      {
        attachments: 'not json',
      },
    ],
    configRows: [
      {
        value: JSON.stringify({
          'warm-glow': {
            image: 'resource://login-backgrounds/warm-glow/fallback.jpg',
            video: 'resource://login-backgrounds/warm-glow/loop.mp4',
          },
          'calm-blue': { image: '', video: '' },
        }),
      },
    ],
  })

  assert.deepEqual([...refs].sort(), [
    'login-backgrounds/warm-glow/fallback.jpg',
    'login-backgrounds/warm-glow/loop.mp4',
    'teaching-materials/fine_motor/card.pdf',
    'uploaded/ai-attachments/a.png',
    'uploaded/ai-scenes/scene-a.webp',
    'uploaded/covers/a.png',
  ])
})

test('resource reconcile treats soft-deleted resource rows as referenced inputs', () => {
  const refs = collectReferencedPathsFromRows({
    resourceRows: [
      {
        cover_image: 'resource:///uploaded/soft-deleted-still-restorable.png',
        is_active: 0,
      },
    ],
  })

  assert.equal(refs.has('uploaded/soft-deleted-still-restorable.png'), true)
})

test('resource reconcile report is disk minus referenced managed files', () => {
  const report = buildOrphanReport(
    new Set([
      'uploaded/in-use.png',
      'teaching-materials/in-use.pdf',
    ]),
    [
      { rel: 'uploaded/in-use.png', size: 10 },
      { rel: 'uploaded/orphan.png', size: 20 },
      { rel: 'teaching-materials/in-use.pdf', size: 30 },
      { rel: 'teaching-materials/orphan.pdf', size: 40 },
    ],
  )

  assert.deepEqual(report, {
    orphans: [
      { rel: 'uploaded/orphan.png', size: 20 },
      { rel: 'teaching-materials/orphan.pdf', size: 40 },
    ],
    totalBytes: 60,
    totalDiskFiles: 4,
    totalDiskBytes: 100,
  })
})
