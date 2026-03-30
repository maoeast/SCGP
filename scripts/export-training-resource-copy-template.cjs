#!/usr/bin/env node

const fs = require('node:fs/promises')
const path = require('node:path')
const { createJiti } = require('jiti')

const REPO_ROOT = process.cwd()
const DEFAULT_OUTPUT_PATH = path.join(
  REPO_ROOT,
  'docs',
  'references',
  'resource-copy',
  '2026-03-30-training-resource-copy.csv'
)

function parseArgs(argv) {
  const options = {
    outputPath: DEFAULT_OUTPUT_PATH,
    force: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--out') {
      options.outputPath = path.resolve(argv[index + 1] || '')
      index += 1
      continue
    }

    if (arg === '--force') {
      options.force = true
      continue
    }

    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }

    throw new Error(`未知参数: ${arg}`)
  }

  return options
}

function printHelp() {
  console.log(`
导出训练资源文案主 CSV 模板

用途:
- 从当前代码里的训练资源 seed 导出一份完整 CSV
- 作为统一文案主表的初始模板

用法:
  node scripts/export-training-resource-copy-template.cjs --force
  node scripts/export-training-resource-copy-template.cjs --out <path> --force
`.trim())
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function parseJsonArray(raw, label) {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    // fall through
  }

  const items = []
  let inString = false
  let escaped = false
  let depth = 0
  let start = -1

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) {
      continue
    }
    if (char === '{') {
      if (depth === 0) {
        start = index
      }
      depth += 1
      continue
    }
    if (char === '}') {
      depth -= 1
      if (depth === 0 && start >= 0) {
        items.push(JSON.parse(raw.slice(start, index + 1)))
        start = -1
      }
    }
  }

  if (items.length === 0) {
    throw new Error(`${label} is not a valid JSON array`)
  }

  return items
}

function normalizeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

async function loadPhysicalEquipmentRows(jiti, helpers, overrides) {
  const parser = jiti('../src/database/physical-equipment-parser.ts')
  const {
    createPhysicalEquipmentSeedResources,
  } = parser

  const sourceInputs = [
    {
      domain: 'emotional-regulation',
      sourcePath: 'docs/references/physical-equipment/emotional-regulation/2026-03-26-emotional-regulation-equipment-draft.csv',
    },
    {
      domain: 'social-communication',
      sourcePath: 'docs/references/physical-equipment/social-communication/2026-03-26-social-communication-equipment-draft.csv',
    },
    {
      domain: 'fine-motor',
      sourcePath: 'docs/references/physical-equipment/fine-motor/2026-03-26-fine-motor-equipment-draft.csv',
    },
    {
      domain: 'soothing-aids',
      sourcePath: 'docs/references/physical-equipment/soothing-aids/2026-03-26-soothing-aids-equipment-draft.csv',
    },
  ]

  const inputs = []
  for (const item of sourceInputs) {
    inputs.push({
      ...item,
      raw: await fs.readFile(path.join(REPO_ROOT, item.sourcePath), 'utf8'),
    })
  }

  const parsed = createPhysicalEquipmentSeedResources(inputs)
  return parsed.resources.map((resource) => {
    const resourceKey = helpers.buildPhysicalEquipmentResourceCopyKey(resource.metadata.resourceCode)
    const override = overrides.getTrainingResourceCopyOverride(resourceKey)

    return {
      resourceKey,
      origin: 'physical-equipment',
      moduleCode: resource.moduleCode,
      resourceType: resource.resourceType,
      name: override?.name || resource.name,
      description: override ? override.description : resource.description,
      previewDescription: '',
      repeatPlayHint: '',
    }
  })
}

async function loadEmotionalSceneRows(helpers, overrides) {
  const emotionRaw = await fs.readFile(
    path.join(REPO_ROOT, 'docs', 'references', 'emotion-scene', 'current-emotion-scenes-export.json'),
    'utf8'
  )
  const careRaw = await fs.readFile(
    path.join(REPO_ROOT, 'care_scenes_database.json'),
    'utf8'
  )

  const emotionRows = parseJsonArray(emotionRaw, 'current-emotion-scenes-export.json').map((row) => {
    const sceneCode = normalizeString(row.sceneCode)
    const resourceKey = helpers.buildEmotionSceneResourceCopyKey(sceneCode)
    const override = overrides.getTrainingResourceCopyOverride(resourceKey)
    const title = normalizeString(row.title, sceneCode)

    return {
      resourceKey,
      origin: 'emotion-scene',
      moduleCode: 'emotional',
      resourceType: 'emotion_scene',
      name: override?.name || title,
      description: override ? override.description : normalizeString(row.description, title),
      previewDescription: '',
      repeatPlayHint: '',
    }
  })

  const careRows = parseJsonArray(careRaw, 'care_scenes_database.json').map((row) => {
    const sceneCode = normalizeString(row.sceneCode)
    const resourceKey = helpers.buildCareSceneResourceCopyKey(sceneCode)
    const override = overrides.getTrainingResourceCopyOverride(resourceKey)
    const title = normalizeString(row.title, sceneCode)

    return {
      resourceKey,
      origin: 'care-scene',
      moduleCode: 'emotional',
      resourceType: 'care_scene',
      name: override?.name || title,
      description: override ? override.description : normalizeString(row.description, title),
      previewDescription: '',
      repeatPlayHint: '',
    }
  })

  return [...emotionRows, ...careRows]
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!options.force && await fileExists(options.outputPath)) {
    throw new Error(`输出文件已存在，使用 --force 覆盖: ${path.relative(REPO_ROOT, options.outputPath)}`)
  }

  const jiti = createJiti(__filename, {
    alias: {
      '@': path.join(REPO_ROOT, 'src'),
    },
  })

  const helpers = jiti('../src/utils/training-resource-copy.ts')
  const overrides = jiti('../src/data/generated-training-resource-copy.ts')
  const { EQUIPMENT_DATA } = jiti('../src/database/equipment-data.ts')
  const { SENSORY_GAME_SEED } = jiti('../src/data/sensory-game-seed.ts')
  const { EMOTIONAL_GAME_CATALOG_SEED } = jiti('../src/data/emotional-game-catalog.ts')

  const rows = []

  EQUIPMENT_DATA.forEach((resource, index) => {
    rows.push({
      resourceKey: helpers.buildSensoryEquipmentResourceCopyKey(index + 1),
      origin: 'sensory-equipment',
      moduleCode: 'sensory',
      resourceType: 'equipment',
      name: resource.name,
      description: resource.description || '',
      previewDescription: '',
      repeatPlayHint: '',
    })
  })

  SENSORY_GAME_SEED.forEach((resource) => {
    rows.push({
      resourceKey: helpers.buildSensoryGameResourceCopyKey(resource.taskId),
      origin: 'sensory-game',
      moduleCode: 'sensory',
      resourceType: 'game',
      name: resource.name,
      description: resource.description,
      previewDescription: '',
      repeatPlayHint: '',
    })
  })

  EMOTIONAL_GAME_CATALOG_SEED.forEach((resource) => {
    rows.push({
      resourceKey: helpers.buildEmotionalGameResourceCopyKey(resource.metadata.gameCode),
      origin: 'emotional-game',
      moduleCode: 'emotional',
      resourceType: 'game',
      name: resource.name,
      description: resource.description,
      previewDescription: normalizeString(resource.metadata.previewDescription),
      repeatPlayHint: normalizeString(resource.metadata.repeatPlayHint),
    })
  })

  rows.push(...await loadEmotionalSceneRows(helpers, overrides))
  rows.push(...await loadPhysicalEquipmentRows(jiti, helpers, overrides))

  await fs.mkdir(path.dirname(options.outputPath), { recursive: true })
  await fs.writeFile(options.outputPath, helpers.serializeTrainingResourceCopyCsv(rows), 'utf8')
  console.log(`[training-resource-copy] exported template to ${path.relative(REPO_ROOT, options.outputPath)}`)
}

main().catch((error) => {
  console.error('[training-resource-copy] export failed:', error)
  process.exit(1)
})
