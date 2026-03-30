#!/usr/bin/env node

const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const initSqlJs = require('sql.js')
const { createJiti } = require('jiti')

const REPO_ROOT = process.cwd()
const DEFAULT_APP_DIR_NAME = 'scgp'
const MAIN_DB_NAME = 'database.sqlite'
const DEFAULT_CSV_PATH = path.join(
  REPO_ROOT,
  'docs',
  'references',
  'resource-copy',
  '2026-03-30-training-resource-copy.csv'
)

function printHelp() {
  console.log(`
同步训练资源文案到现有数据库

用途:
- 读取 docs/references/resource-copy/2026-03-30-training-resource-copy.csv
- 按稳定 resourceKey 批量更新现有 sys_training_resource 文案字段

用法:
  node scripts/sync-training-resource-copy.cjs --dry-run
  node scripts/sync-training-resource-copy.cjs --yes

可选参数:
  --csv <path>           指定文案 CSV
  --db <path>            指定数据库文件路径
  --user-data-dir <path> 指定 Electron userData 目录
  --dry-run              只输出计划，不写数据库
  --yes                  确认执行真实写入
  --help                 显示帮助
`.trim())
}

function parseArgs(argv) {
  const options = {
    csvPath: DEFAULT_CSV_PATH,
    dbPath: '',
    userDataDir: '',
    dryRun: false,
    yes: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--csv') {
      options.csvPath = path.resolve(argv[index + 1] || '')
      index += 1
      continue
    }

    if (arg === '--db') {
      options.dbPath = argv[index + 1] || ''
      index += 1
      continue
    }

    if (arg === '--user-data-dir') {
      options.userDataDir = argv[index + 1] || ''
      index += 1
      continue
    }

    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }

    if (arg === '--yes') {
      options.yes = true
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

function getDefaultUserDataDir() {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    return path.join(appData, DEFAULT_APP_DIR_NAME)
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', DEFAULT_APP_DIR_NAME)
  }

  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
  return path.join(configHome, DEFAULT_APP_DIR_NAME)
}

function resolveDbPath(options) {
  if (options.dbPath) {
    return path.resolve(options.dbPath)
  }

  const userDataDir = options.userDataDir
    ? path.resolve(options.userDataDir)
    : getDefaultUserDataDir()

  return path.join(userDataDir, MAIN_DB_NAME)
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function createSqlHelpers(db) {
  return {
    query(sql, params = []) {
      const stmt = db.prepare(sql, params)
      const rows = []
      try {
        while (stmt.step()) {
          rows.push(stmt.getAsObject())
        }
      } finally {
        stmt.free()
      }
      return rows
    },
    run(sql, params = []) {
      db.run(sql, params)
    },
  }
}

async function createBackup(dbPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(path.dirname(dbPath), `database.training-resource-copy.${timestamp}.sqlite`)
  await fs.copyFile(dbPath, backupPath)
  return backupPath
}

function parseMetadata(raw) {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!options.dryRun && !options.yes) {
    throw new Error('真实写入需要显式传入 --yes')
  }

  const dbPath = resolveDbPath(options)
  if (!await fileExists(dbPath)) {
    throw new Error(`数据库文件不存在: ${dbPath}`)
  }
  if (!await fileExists(options.csvPath)) {
    throw new Error(`文案 CSV 不存在: ${options.csvPath}`)
  }

  const jiti = createJiti(__filename, {
    alias: {
      '@': path.join(REPO_ROOT, 'src'),
    },
  })

  const {
    parseTrainingResourceCopyCsv,
    parseTrainingResourceCopyKey,
    buildSensoryEquipmentResourceCopyKey,
    buildSensoryGameResourceCopyKey,
    buildEmotionalGameResourceCopyKey,
    buildEmotionSceneResourceCopyKey,
    buildCareSceneResourceCopyKey,
    buildPhysicalEquipmentResourceCopyKey,
  } = jiti('../src/utils/training-resource-copy.ts')

  const csvContent = await fs.readFile(options.csvPath, 'utf8')
  const copyRows = parseTrainingResourceCopyCsv(csvContent)

  const SQL = await initSqlJs({
    locateFile: (file) => require.resolve(`sql.js/dist/${file}`),
  })

  const dbBuffer = await fs.readFile(dbPath)
  const db = new SQL.Database(dbBuffer)
  const sql = createSqlHelpers(db)

  const resources = sql.query(`
    SELECT id, module_code, resource_type, name, description, legacy_id, legacy_source, meta_data
    FROM sys_training_resource
  `)

  const resourceByKey = new Map()
  for (const row of resources) {
    const metadata = parseMetadata(row.meta_data)
    const legacyId = Number(row.legacy_id || 0)
    const resourceType = String(row.resource_type || '')
    const legacySource = String(row.legacy_source || '')
    const moduleCode = String(row.module_code || '')

    if (resourceType === 'equipment' && legacySource === 'equipment_data' && legacyId > 0) {
      resourceByKey.set(buildSensoryEquipmentResourceCopyKey(legacyId), row)
    }

    if (resourceType === 'game' && legacySource === 'games_menu' && legacyId > 0) {
      resourceByKey.set(buildSensoryGameResourceCopyKey(legacyId), row)
    }

    if (resourceType === 'game' && moduleCode === 'emotional') {
      const gameCode = typeof metadata?.gameCode === 'string' ? metadata.gameCode.trim() : ''
      if (gameCode) {
        resourceByKey.set(buildEmotionalGameResourceCopyKey(gameCode), row)
      }
    }

    if (resourceType === 'emotion_scene') {
      const sceneCode = typeof metadata?.sceneCode === 'string' ? metadata.sceneCode.trim() : ''
      if (sceneCode) {
        resourceByKey.set(buildEmotionSceneResourceCopyKey(sceneCode), row)
      }
    }

    if (resourceType === 'care_scene') {
      const sceneCode = typeof metadata?.sceneCode === 'string' ? metadata.sceneCode.trim() : ''
      if (sceneCode) {
        resourceByKey.set(buildCareSceneResourceCopyKey(sceneCode), row)
      }
    }

    if (resourceType === 'equipment') {
      const resourceCode = typeof metadata?.resourceCode === 'string' ? metadata.resourceCode.trim() : ''
      if (resourceCode) {
        resourceByKey.set(buildPhysicalEquipmentResourceCopyKey(resourceCode), row)
      }
    }
  }

  const summary = {
    changed: 0,
    missing: 0,
    skipped: 0,
  }
  const missingKeys = []

  for (const copyRow of copyRows) {
    if (!parseTrainingResourceCopyKey(copyRow.resourceKey)) {
      throw new Error(`未知 resourceKey: ${copyRow.resourceKey}`)
    }

    const resourceRow = resourceByKey.get(copyRow.resourceKey)
    if (!resourceRow) {
      summary.missing += 1
      missingKeys.push(copyRow.resourceKey)
      continue
    }

    const metadata = parseMetadata(resourceRow.meta_data) || {}
    const nextName = copyRow.name || String(resourceRow.name || '')
    const nextDescription = copyRow.description

    if (copyRow.origin === 'emotional-game') {
      metadata.previewDescription = copyRow.previewDescription
      metadata.repeatPlayHint = copyRow.repeatPlayHint
    }

    if (copyRow.origin === 'emotion-scene' || copyRow.origin === 'care-scene') {
      metadata.title = nextName
    }

    const nextMetadataRaw = JSON.stringify(metadata)
    const currentDescription = String(resourceRow.description || '')
    const currentName = String(resourceRow.name || '')
    const currentMetadataRaw = typeof resourceRow.meta_data === 'string' ? resourceRow.meta_data : JSON.stringify(parseMetadata(resourceRow.meta_data) || {})

    if (
      currentName === nextName
      && currentDescription === nextDescription
      && currentMetadataRaw === nextMetadataRaw
    ) {
      summary.skipped += 1
      continue
    }

    summary.changed += 1

    if (!options.dryRun) {
      sql.run(`
        UPDATE sys_training_resource
        SET name = ?, description = ?, meta_data = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        nextName,
        nextDescription,
        nextMetadataRaw,
        Number(resourceRow.id),
      ])
    }
  }

  if (options.dryRun) {
    console.log('[training-resource-copy] dry-run summary:', summary)
    if (missingKeys.length > 0) {
      console.log('[training-resource-copy] missing resource keys:')
      missingKeys.slice(0, 20).forEach((key) => console.log(`  - ${key}`))
      if (missingKeys.length > 20) {
        console.log(`  ... and ${missingKeys.length - 20} more`)
      }
    }
    db.close()
    return
  }

  const backupPath = await createBackup(dbPath)
  const exported = db.export()
  await fs.writeFile(dbPath, Buffer.from(exported))
  db.close()

  console.log('[training-resource-copy] sync summary:', summary)
  console.log('[training-resource-copy] backup created:', backupPath)
  if (missingKeys.length > 0) {
    console.warn('[training-resource-copy] some resource keys were not found in the current database:')
    missingKeys.slice(0, 20).forEach((key) => console.warn(`  - ${key}`))
    if (missingKeys.length > 20) {
      console.warn(`  ... and ${missingKeys.length - 20} more`)
    }
  }
}

main().catch((error) => {
  console.error('[training-resource-copy] sync failed:', error)
  process.exit(1)
})
