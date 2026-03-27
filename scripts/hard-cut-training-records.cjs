#!/usr/bin/env node

const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const initSqlJs = require('sql.js')

const DEFAULT_APP_DIR_NAME = 'scgp'
const MAIN_DB_NAME = 'database.sqlite'
const CHUNK_SIZE = 400

function printHelp() {
  console.log(`Hard-cut legacy training records.

Deletes rows that still do not have an entry_code:
- training_records
- equipment_training_records
- report_record rows linked to deleted training_records
- emotional_training_session/detail rows linked to deleted training_records

Usage:
  node scripts/hard-cut-training-records.cjs --dry-run
  node scripts/hard-cut-training-records.cjs --yes

Options:
  --db <path>            Use a specific database file
  --user-data-dir <path> Use a specific Electron userData dir
  --dry-run              Preview counts only
  --yes                  Confirm destructive write
  --help                 Show help
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

    throw new Error(`Unknown argument: ${arg}`)
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

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

function queryAll(db, sql, params = []) {
  const statement = db.prepare(sql)
  try {
    if (params.length > 0) {
      statement.bind(params)
    }

    const rows = []
    while (statement.step()) {
      rows.push(statement.getAsObject())
    }
    return rows
  } finally {
    statement.free()
  }
}

function queryOne(db, sql, params = []) {
  return queryAll(db, sql, params)[0] || null
}

function tableExists(db, tableName) {
  return Boolean(
    queryOne(
      db,
      'SELECT name FROM sqlite_master WHERE type = ? AND name = ?',
      ['table', tableName],
    ),
  )
}

function tableHasColumn(db, tableName, columnName) {
  if (!tableExists(db, tableName)) {
    return false
  }

  return queryAll(db, `PRAGMA table_info(${tableName})`).some((row) => row.name === columnName)
}

function getLegacyIds(db, tableName) {
  if (!tableHasColumn(db, tableName, 'entry_code')) {
    return []
  }

  return queryAll(
    db,
    `SELECT id FROM ${tableName} WHERE entry_code IS NULL OR TRIM(entry_code) = '' ORDER BY id ASC`,
  )
    .map((row) => Number(row.id))
    .filter((value) => Number.isFinite(value) && value > 0)
}

function buildInClause(ids) {
  return `(${ids.map(() => '?').join(', ')})`
}

function chunkArray(values, size) {
  const chunks = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

function deleteByIds(db, tableName, ids) {
  for (const chunk of chunkArray(ids, CHUNK_SIZE)) {
    if (chunk.length === 0) continue
    db.run(`DELETE FROM ${tableName} WHERE id IN ${buildInClause(chunk)}`, chunk)
  }
}

function deleteLinkedGameArtifacts(db, legacyTrainingIds) {
  if (legacyTrainingIds.length === 0) {
    return
  }

  for (const chunk of chunkArray(legacyTrainingIds, CHUNK_SIZE)) {
    if (chunk.length === 0) continue
    const clause = buildInClause(chunk)

    if (tableExists(db, 'emotional_training_detail') && tableExists(db, 'emotional_training_session')) {
      db.run(
        `DELETE FROM emotional_training_detail
         WHERE session_id IN (
           SELECT id FROM emotional_training_session
           WHERE training_record_id IN ${clause}
         )`,
        chunk,
      )
    }

    if (tableExists(db, 'emotional_training_session')) {
      db.run(
        `DELETE FROM emotional_training_session
         WHERE training_record_id IN ${clause}`,
        chunk,
      )
    }

    if (tableExists(db, 'report_record')) {
      db.run(
        `DELETE FROM report_record
         WHERE training_record_id IN ${clause}`,
        chunk,
      )
    }
  }
}

function getSummary(db) {
  const legacyTrainingIds = getLegacyIds(db, 'training_records')
  const legacyEquipmentIds = getLegacyIds(db, 'equipment_training_records')

  const linkedReportCount = tableExists(db, 'report_record')
    ? Number(
        queryOne(
          db,
          `SELECT COUNT(*) AS count
           FROM report_record
           WHERE training_record_id IN (
             SELECT id FROM training_records
             WHERE entry_code IS NULL OR TRIM(entry_code) = ''
           )`,
        )?.count || 0,
      )
    : 0

  const linkedSessionCount = tableExists(db, 'emotional_training_session')
    ? Number(
        queryOne(
          db,
          `SELECT COUNT(*) AS count
           FROM emotional_training_session
           WHERE training_record_id IN (
             SELECT id FROM training_records
             WHERE entry_code IS NULL OR TRIM(entry_code) = ''
           )`,
        )?.count || 0,
      )
    : 0

  const orphanReportCount = tableExists(db, 'report_record')
    ? Number(
        queryOne(
          db,
          `SELECT COUNT(*) AS count
           FROM report_record
           WHERE training_record_id IS NOT NULL
             AND NOT EXISTS (
               SELECT 1 FROM training_records tr
               WHERE tr.id = report_record.training_record_id
             )`,
        )?.count || 0,
      )
    : 0

  return {
    legacyTrainingIds,
    legacyEquipmentIds,
    linkedReportCount,
    linkedSessionCount,
    orphanReportCount,
  }
}

function printSummary(dbPath, summary) {
  console.log(`Database: ${dbPath}`)
  console.log(`Legacy game records without entry_code: ${summary.legacyTrainingIds.length}`)
  console.log(`Legacy equipment records without entry_code: ${summary.legacyEquipmentIds.length}`)
  console.log(`Linked report rows to delete: ${summary.linkedReportCount}`)
  console.log(`Linked emotional session rows to delete: ${summary.linkedSessionCount}`)
  console.log(`Existing orphan report rows: ${summary.orphanReportCount}`)

  if (summary.legacyTrainingIds.length > 0) {
    console.log(`Sample training record ids: ${summary.legacyTrainingIds.slice(0, 10).join(', ')}`)
  }

  if (summary.legacyEquipmentIds.length > 0) {
    console.log(`Sample equipment record ids: ${summary.legacyEquipmentIds.slice(0, 10).join(', ')}`)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const dbPath = resolveDbPath(options)
  if (!(await fileExists(dbPath))) {
    throw new Error(`Database not found: ${dbPath}`)
  }

  const SQL = await initSqlJs()
  const input = await fs.readFile(dbPath)
  const db = new SQL.Database(new Uint8Array(input))

  try {
    if (!tableHasColumn(db, 'training_records', 'entry_code') || !tableHasColumn(db, 'equipment_training_records', 'entry_code')) {
      throw new Error('entry_code columns are missing. Refusing to run hard-cut cleanup.')
    }

    const summary = getSummary(db)
    printSummary(dbPath, summary)

    const hasWork =
      summary.legacyTrainingIds.length > 0 ||
      summary.legacyEquipmentIds.length > 0 ||
      summary.orphanReportCount > 0

    if (!hasWork) {
      console.log('No legacy entry-less records found. Nothing to do.')
      return
    }

    if (options.dryRun) {
      console.log('Dry run only. No changes were written.')
      return
    }

    if (!options.yes) {
      throw new Error('This is destructive. Re-run with --yes or preview with --dry-run.')
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(path.dirname(dbPath), `database.sqlite.bak.before-training-hard-cut.${timestamp}`)
    await fs.copyFile(dbPath, backupPath)
    console.log(`Backup created: ${backupPath}`)

    db.run('BEGIN')
    try {
      deleteLinkedGameArtifacts(db, summary.legacyTrainingIds)
      deleteByIds(db, 'training_records', summary.legacyTrainingIds)
      deleteByIds(db, 'equipment_training_records', summary.legacyEquipmentIds)

      if (tableExists(db, 'report_record')) {
        db.run(
          `DELETE FROM report_record
           WHERE training_record_id IS NOT NULL
             AND NOT EXISTS (
               SELECT 1 FROM training_records tr
               WHERE tr.id = report_record.training_record_id
             )`,
        )
      }

      db.run('COMMIT')
    } catch (error) {
      try {
        db.run('ROLLBACK')
      } catch {
        // ignore rollback failure
      }
      throw error
    }

    await fs.writeFile(dbPath, Buffer.from(db.export()))
    console.log('Legacy entry-less records were deleted successfully.')
  } finally {
    db.close()
  }
}

main().catch((error) => {
  console.error('[hard-cut-training-records] Failed:', error.message)
  process.exitCode = 1
})
