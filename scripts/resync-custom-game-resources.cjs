#!/usr/bin/env node

const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const initSqlJs = require('sql.js')
const { createJiti } = require('jiti')

const REPO_ROOT = process.cwd()
const DEFAULT_APP_DIR_NAME = 'scgp'
const MAIN_DB_NAME = 'database.sqlite'
const BACKUP_DB_NAME = 'database_backup.db'

function printHelp() {
  console.log(`
重跑自定义小游戏资源同步

用途:
- 将当前仓库定义的自定义小游戏资源重新同步到已安装应用数据库
- 自动覆盖/补齐 sys_training_resource 中的 custom game 资源
- 自动补齐 sys_resource_tag_map 标签关联
- 自动创建数据库备份

用法:
  node scripts/resync-custom-game-resources.cjs --yes

可选参数:
  --db <path>            指定数据库文件路径
  --user-data-dir <path> 指定 Electron userData 目录
  --dry-run              只输出计划，不写数据库
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

function resolveDbPaths(options) {
  if (options.dbPath) {
    const dbPath = path.resolve(options.dbPath)
    return {
      dbPath,
      backupDbPath: path.join(path.dirname(dbPath), BACKUP_DB_NAME),
      userDataDir: path.dirname(dbPath),
    }
  }

  const userDataDir = options.userDataDir
    ? path.resolve(options.userDataDir)
    : getDefaultUserDataDir()

  return {
    dbPath: path.join(userDataDir, MAIN_DB_NAME),
    backupDbPath: path.join(userDataDir, BACKUP_DB_NAME),
    userDataDir,
  }
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

function parseMetadata(raw) {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function buildTagMap(sql) {
  const rows = sql.query('SELECT id, domain, name FROM sys_tags')
  const tagMap = new Map()
  for (const row of rows) {
    tagMap.set(`${row.domain}:${row.name}`, Number(row.id))
  }
  return tagMap
}

function ensureTag(sql, tagMap, domain, name) {
  const key = `${domain}:${name}`
  const existingId = tagMap.get(key)
  if (existingId) {
    return existingId
  }

  sql.run(
    'INSERT INTO sys_tags (domain, name, usage_count, is_preset) VALUES (?, ?, 0, 1)',
    [domain, name]
  )
  const newId = sql.lastInsertId()
  tagMap.set(key, newId)
  return newId
}

function recalculateTagUsage(sql) {
  sql.run(`
    UPDATE sys_tags
    SET usage_count = (
      SELECT COUNT(*)
      FROM sys_resource_tag_map m
      WHERE m.tag_id = sys_tags.id
    )
  `)
}

async function loadSeedResources() {
  const jiti = createJiti(__filename, {
    alias: {
      '@': path.join(REPO_ROOT, 'src'),
    },
  })

  const mod = jiti('../src/data/emotional-game-catalog.ts')
  const seed = Array.isArray(mod?.ALL_CUSTOM_GAME_RESOURCE_SEED) ? mod.ALL_CUSTOM_GAME_RESOURCE_SEED : null
  const legacySource = typeof mod?.EMOTIONAL_GAME_RESOURCE_SEED_LEGACY_SOURCE === 'string'
    ? mod.EMOTIONAL_GAME_RESOURCE_SEED_LEGACY_SOURCE
    : 'emotional_game_seed_2026_03_30'

  if (!seed || seed.length === 0) {
    throw new Error('无法从 src/data/emotional-game-catalog.ts 加载 ALL_CUSTOM_GAME_RESOURCE_SEED')
  }

  return {
    resources: seed,
    legacySource,
  }
}

function summarizeSeed(resources) {
  const counts = new Map()
  for (const resource of resources) {
    const entryCode = String(resource?.metadata?.trainingEntryCode || 'unknown')
    counts.set(entryCode, (counts.get(entryCode) || 0) + 1)
  }
  return Object.fromEntries(counts.entries())
}

async function createBackup(dbPath, backupDbPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const mainBackupPath = path.join(path.dirname(dbPath), `database.sqlite.bak.before-custom-game-resync.${timestamp}`)
  await fs.copyFile(dbPath, mainBackupPath)

  let backupBackupPath = ''
  if (await fileExists(backupDbPath)) {
    backupBackupPath = path.join(path.dirname(backupDbPath), `database_backup.db.bak.before-custom-game-resync.${timestamp}`)
    await fs.copyFile(backupDbPath, backupBackupPath)
  }

  return { mainBackupPath, backupBackupPath }
}

function summarizeCurrentRows(rows) {
  const counts = new Map()

  for (const row of rows) {
    const metadata = parseMetadata(row.meta_data)
    const entryCode = String(metadata?.trainingEntryCode || 'unknown')
    counts.set(entryCode, (counts.get(entryCode) || 0) + 1)
  }

  return Object.fromEntries(counts.entries())
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

  const { dbPath, backupDbPath, userDataDir } = resolveDbPaths(options)

  if (!(await fileExists(dbPath))) {
    throw new Error(`数据库文件不存在: ${dbPath}`)
  }

  const seedBundle = await loadSeedResources()
  const seedSummary = summarizeSeed(seedBundle.resources)

  const SQL = await initSqlJs({
    locateFile: (file) => require.resolve(`sql.js/dist/${file}`),
  })

  const bytes = await fs.readFile(dbPath)
  const db = new SQL.Database(bytes)
  const sql = createSqlHelpers(db)

  const existingRows = sql.query(`
    SELECT id, module_code, name, meta_data
    FROM sys_training_resource
    WHERE resource_type = 'game'
      AND legacy_source = ?
    ORDER BY id
  `, [seedBundle.legacySource])

  const existingByGameCode = new Map()
  const existingByName = new Map()

  for (const row of existingRows) {
    const resourceId = Number(row.id || 0)
    const resourceName = String(row.name || '').trim()
    const metadata = parseMetadata(row.meta_data)
    const gameCode = String(metadata?.gameCode || '').trim()

    if (resourceId > 0 && gameCode) {
      existingByGameCode.set(gameCode, resourceId)
    }

    if (resourceId > 0 && resourceName) {
      existingByName.set(resourceName, resourceId)
    }
  }

  console.log('[custom-game resync] target database:', dbPath)
  console.log('[custom-game resync] userData dir:', userDataDir)
  console.log('[custom-game resync] seed summary:', seedSummary)
  console.log('[custom-game resync] existing synced rows:', existingRows.length)
  console.log('[custom-game resync] existing summary:', summarizeCurrentRows(existingRows))

  if (options.dryRun) {
    db.close()
    return
  }

  const backups = await createBackup(dbPath, backupDbPath)
  console.log('[custom-game resync] backups created:', backups)

  const tagMap = buildTagMap(sql)
  let inserted = 0
  let updated = 0

  try {
    sql.run('BEGIN')

    for (const resource of seedBundle.resources) {
      const gameCode = String(resource?.metadata?.gameCode || '').trim()
      const moduleCode = String(resource?.metadata?.moduleCode || 'emotional').trim()
      const existingId = existingByGameCode.get(gameCode) || existingByName.get(resource.name)

      if (existingId) {
        sql.run(`
          UPDATE sys_training_resource
          SET module_code = ?, resource_type = ?, name = ?, category = ?, description = ?,
              cover_image = ?, is_custom = 0, is_active = 1, legacy_source = ?, meta_data = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          moduleCode,
          'game',
          resource.name,
          resource.category,
          resource.description,
          resource.coverImage || '',
          seedBundle.legacySource,
          JSON.stringify(resource.metadata),
          existingId,
        ])

        sql.run('DELETE FROM sys_resource_tag_map WHERE resource_id = ?', [existingId])
        for (const tagName of resource.tags || []) {
          if (typeof tagName !== 'string' || !tagName.trim()) {
            continue
          }
          const tagId = ensureTag(sql, tagMap, 'ability', tagName.trim())
          sql.run(
            'INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id) VALUES (?, ?)',
            [existingId, tagId]
          )
        }

        updated += 1
        continue
      }

      sql.run(`
        INSERT INTO sys_training_resource (
          module_code, resource_type, name, category, description,
          cover_image, is_custom, is_active, legacy_source, meta_data, usage_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        moduleCode,
        'game',
        resource.name,
        resource.category,
        resource.description,
        resource.coverImage || '',
        0,
        1,
        seedBundle.legacySource,
        JSON.stringify(resource.metadata),
        0,
      ])

      const resourceId = sql.lastInsertId()
      for (const tagName of resource.tags || []) {
        if (typeof tagName !== 'string' || !tagName.trim()) {
          continue
        }
        const tagId = ensureTag(sql, tagMap, 'ability', tagName.trim())
        sql.run(
          'INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id) VALUES (?, ?)',
          [resourceId, tagId]
        )
      }

      inserted += 1
    }

    recalculateTagUsage(sql)
    sql.run('COMMIT')
  } catch (error) {
    try {
      sql.run('ROLLBACK')
    } catch {
      // ignore rollback failure
    }
    throw error
  }

  const exported = Buffer.from(db.export())
  await fs.writeFile(dbPath, exported)

  if (await fileExists(backupDbPath)) {
    await fs.writeFile(backupDbPath, exported)
  }

  db.close()

  const verifyDb = new SQL.Database(await fs.readFile(dbPath))
  const verifySql = createSqlHelpers(verifyDb)
  const syncedRows = verifySql.query(`
    SELECT id, name, meta_data
    FROM sys_training_resource
    WHERE resource_type = 'game'
      AND legacy_source = ?
    ORDER BY id
  `, [seedBundle.legacySource])

  console.log('[custom-game resync] complete:', {
    inserted,
    updated,
    syncedRowCount: syncedRows.length,
    syncedSummary: summarizeCurrentRows(syncedRows),
  })

  verifyDb.close()
}

main().catch((error) => {
  console.error('[custom-game resync] failed:', error.message)
  process.exitCode = 1
})
