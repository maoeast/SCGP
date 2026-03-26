#!/usr/bin/env node

const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const initSqlJs = require('sql.js')
const { createJiti } = require('jiti')

const REPO_ROOT = process.cwd()
const DEFAULT_APP_DIR_NAME = 'scgp'
const MAIN_DB_NAME = 'database.sqlite'

function printHelp() {
  console.log(`
导入 physical-equipment 资源脚本

用途:
- 读取 docs/references/physical-equipment/ 下四份 CSV 草稿
- 规范化为 sys_training_resource 系统资源
- 对现有数据库执行按 resourceCode 的安全 upsert

用法:
  node scripts/import-physical-equipment-resources.cjs --yes

可选参数:
  --db <path>            指定数据库文件路径
  --user-data-dir <path> 指定 Electron userData 目录
  --dry-run              只输出导入计划，不写数据库
  --yes                  确认执行真实写入
  --help                 显示帮助
`.trim())
}

function parseArgs(argv) {
  const options = {
    dbPath: '',
    userDataDir: '',
    dryRun: false,
    yes: false,
    help: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

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
      options.help = true
      continue
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

    get(sql, params = []) {
      return this.query(sql, params)[0] || null
    },

    run(sql, params = []) {
      db.run(sql, params)
    },

    lastInsertId() {
      return Number(this.get('SELECT last_insert_rowid() AS id')?.id || 0)
    },
  }
}

async function loadSeedResources() {
  const jiti = createJiti(__filename, {
    alias: {
      '@': path.join(REPO_ROOT, 'src'),
    },
  })

  const parser = jiti('../src/database/physical-equipment-parser.ts')
  const {
    createPhysicalEquipmentSeedResources,
    PHYSICAL_EQUIPMENT_SEED_LEGACY_SOURCE,
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
    const fullPath = path.join(REPO_ROOT, item.sourcePath)
    const raw = await fs.readFile(fullPath, 'utf8')
    inputs.push({
      domain: item.domain,
      sourcePath: item.sourcePath,
      raw,
    })
  }

  const result = createPhysicalEquipmentSeedResources(inputs)
  return {
    resources: result.resources,
    summary: result.summary,
    legacySource: PHYSICAL_EQUIPMENT_SEED_LEGACY_SOURCE,
  }
}

function extractResourceCode(metadataRaw) {
  if (typeof metadataRaw !== 'string' || metadataRaw.trim().length === 0) {
    return ''
  }

  try {
    const metadata = JSON.parse(metadataRaw)
    return typeof metadata?.resourceCode === 'string' ? metadata.resourceCode.trim() : ''
  } catch {
    return ''
  }
}

function buildInClause(ids) {
  return ids.map(() => '?').join(', ')
}

function getReferenceCount(sql, tableName, columnName, ids) {
  if (!ids.length) {
    return 0
  }

  const row = sql.get(
    `SELECT COUNT(*) AS count FROM ${tableName} WHERE ${columnName} IN (${buildInClause(ids)})`,
    ids
  )

  return Number(row?.count || 0)
}

async function createBackup(dbPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(
    path.dirname(dbPath),
    `database.physical-equipment-import.${timestamp}.sqlite`
  )

  await fs.copyFile(dbPath, backupPath)
  return backupPath
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  if (!options.dryRun && !options.yes) {
    throw new Error('真实写入需要显式传入 --yes')
  }

  const dbPath = resolveDbPath(options)
  if (!(await fileExists(dbPath))) {
    throw new Error(`数据库文件不存在: ${dbPath}`)
  }

  const seed = await loadSeedResources()
  console.log('[physical-equipment import] seed summary:', seed.summary)

  const SQL = await initSqlJs({
    locateFile: (file) => require.resolve(`sql.js/dist/${file}`),
  })

  const dbBuffer = await fs.readFile(dbPath)
  const db = new SQL.Database(dbBuffer)
  const sql = createSqlHelpers(db)

  const existingRows = sql.query(`
    SELECT id, module_code, name, category, meta_data
    FROM sys_training_resource
    WHERE resource_type = 'equipment'
      AND module_code IN ('sensory', 'emotional', 'social')
  `)

  const existingByCode = new Map()
  const existingByName = new Map()
  const rowsByCode = new Map()
  const duplicateIdsToRemove = new Set()

  for (const row of existingRows) {
    const rowId = Number(row.id || 0)
    const resourceCode = extractResourceCode(row.meta_data)

    if (rowId > 0 && resourceCode) {
      const bucket = rowsByCode.get(resourceCode) || []
      bucket.push(row)
      rowsByCode.set(resourceCode, bucket)
    }
  }

  let dedupedCodes = 0
  let removedDuplicateRows = 0

  for (const [resourceCode, rows] of rowsByCode.entries()) {
    if (rows.length <= 1) {
      continue
    }

    const sortedRows = [...rows].sort((left, right) => Number(right.id || 0) - Number(left.id || 0))
    const canonicalRow = sortedRows[0]
    const duplicateIds = sortedRows.slice(1).map((row) => Number(row.id || 0)).filter((id) => id > 0)

    const trainingRefs = getReferenceCount(sql, 'equipment_training_records', 'equipment_id', duplicateIds)
    const planRefs = getReferenceCount(sql, 'sys_plan_resource_map', 'resource_id', duplicateIds)

    if (trainingRefs > 0 || planRefs > 0) {
      throw new Error(
        `resourceCode ${resourceCode} 存在重复记录且仍被引用，无法安全自动去重`
      )
    }

    dedupedCodes += 1
    removedDuplicateRows += duplicateIds.length

    for (const duplicateId of duplicateIds) {
      duplicateIdsToRemove.add(duplicateId)
    }

    if (!options.dryRun && duplicateIds.length > 0) {
      const placeholders = buildInClause(duplicateIds)
      sql.run(`DELETE FROM sys_resource_tag_map WHERE resource_id IN (${placeholders})`, duplicateIds)
      sql.run(`DELETE FROM sys_favorites WHERE resource_id IN (${placeholders})`, duplicateIds)
      sql.run(`DELETE FROM sys_training_resource WHERE id IN (${placeholders})`, duplicateIds)
    }

    existingByCode.set(resourceCode, Number(canonicalRow.id || 0))
  }

  for (const row of existingRows) {
    const rowId = Number(row.id || 0)
    if (rowId <= 0 || duplicateIdsToRemove.has(rowId)) {
      continue
    }

    const moduleCode = String(row.module_code || '')
    const name = String(row.name || '')
    const category = String(row.category || '')
    const resourceCode = extractResourceCode(row.meta_data)

    if (moduleCode && name) {
      existingByName.set(`${moduleCode}:${category}:${name}`, rowId)
    }

    if (resourceCode && !existingByCode.has(resourceCode)) {
      existingByCode.set(resourceCode, rowId)
    }
  }

  const ensureTag = (tagName) => {
    const existing = sql.get(
      'SELECT id FROM sys_tags WHERE domain = ? AND name = ?',
      ['ability', tagName]
    )

    if (existing?.id) {
      return Number(existing.id)
    }

    sql.run(
      'INSERT INTO sys_tags (domain, name, usage_count, is_preset) VALUES (?, ?, ?, ?)',
      ['ability', tagName, 0, 1]
    )

    return sql.lastInsertId()
  }

  let inserted = 0
  let updated = 0

  for (const resource of seed.resources) {
    const resourceCode = resource.metadata.resourceCode
    const existingId = existingByCode.get(resourceCode) || existingByName.get(`${resource.moduleCode}:${resource.category}:${resource.name}`)

    if (existingId) {
      updated += 1

      if (!options.dryRun) {
        sql.run(`
          UPDATE sys_training_resource
          SET module_code = ?, resource_type = ?, name = ?, category = ?, description = ?,
              cover_image = ?, is_custom = 0, is_active = 1, legacy_source = ?, meta_data = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          resource.moduleCode,
          resource.resourceType,
          resource.name,
          resource.category,
          resource.description,
          resource.coverImage || '',
          seed.legacySource,
          JSON.stringify(resource.metadata),
          existingId,
        ])

        sql.run('DELETE FROM sys_resource_tag_map WHERE resource_id = ?', [existingId])
        for (const tagName of resource.tags) {
          const tagId = ensureTag(tagName)
          sql.run(
            'INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id) VALUES (?, ?)',
            [existingId, tagId]
          )
        }
      }

      existingByCode.set(resourceCode, existingId)
      continue
    }

    inserted += 1

    if (options.dryRun) {
      continue
    }

    sql.run(`
      INSERT INTO sys_training_resource (
        module_code, resource_type, name, category, description,
        cover_image, is_custom, is_active, legacy_source, meta_data, usage_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      resource.moduleCode,
      resource.resourceType,
      resource.name,
      resource.category,
      resource.description,
      resource.coverImage || '',
      0,
      1,
      seed.legacySource,
      JSON.stringify(resource.metadata),
      0,
    ])

    const resourceId = sql.lastInsertId()
    existingByCode.set(resourceCode, resourceId)
    existingByName.set(`${resource.moduleCode}:${resource.category}:${resource.name}`, resourceId)

    for (const tagName of resource.tags) {
      const tagId = ensureTag(tagName)
      sql.run(
        'INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id) VALUES (?, ?)',
        [resourceId, tagId]
      )
    }
  }

  if (options.dryRun) {
    console.log('[physical-equipment import] dry-run complete:', {
      inserted,
      updated,
      dedupedCodes,
      removedDuplicateRows,
      dbPath,
    })
    db.close()
    return
  }

  const backupPath = await createBackup(dbPath)
  const exported = db.export()
  await fs.writeFile(dbPath, Buffer.from(exported))
  db.close()

  console.log('[physical-equipment import] complete:', {
    inserted,
    updated,
    dedupedCodes,
    removedDuplicateRows,
    dbPath,
    backupPath,
  })
}

main().catch((error) => {
  console.error('[physical-equipment import] failed:', error.message)
  process.exitCode = 1
})
