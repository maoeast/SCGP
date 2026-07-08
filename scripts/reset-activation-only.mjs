import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function formatTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-')
}

function buildBackupPath(basePath, label, timestamp) {
  return `${basePath}.${label}-${timestamp}.bak`
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

function resolveSqlJsLocateFile(file) {
  const sqlJsEntry = require.resolve('sql.js')
  return path.join(path.dirname(sqlJsEntry), '..', 'dist', file)
}

async function loadSqlJs() {
  const sqlJsModule = await import('sql.js')
  const initSqlJs = sqlJsModule.default || sqlJsModule.initSqlJs

  if (typeof initSqlJs !== 'function') {
    throw new Error('无法初始化 sql.js')
  }

  return initSqlJs({
    locateFile: resolveSqlJsLocateFile,
  })
}

function getSingleNumberFromDb(db, sql, params = []) {
  const stmt = db.prepare(sql, params)
  try {
    if (!stmt.step()) return 0
    const row = stmt.getAsObject()
    const value = Object.values(row)[0]
    return typeof value === 'number' ? value : Number(value || 0)
  } finally {
    stmt.free()
  }
}

function resolveDefaultUserDataDir() {
  const appDataDir = process.env.APPDATA
  if (!appDataDir) {
    throw new Error('未找到 APPDATA 环境变量，请显式传入 --user-data-dir')
  }

  return path.join(appDataDir, 'scgp')
}

async function moveDirectoryToBackup(directoryPath, timestamp) {
  if (!await pathExists(directoryPath)) {
    return null
  }

  let backupPath = buildBackupPath(directoryPath, 'activation-reset', timestamp)
  let suffix = 1
  while (await pathExists(backupPath)) {
    backupPath = `${buildBackupPath(directoryPath, 'activation-reset', timestamp)}-${suffix}`
    suffix += 1
  }

  await fs.rename(directoryPath, backupPath)
  return backupPath
}

export async function resetActivationOnly(options = {}) {
  const timestamp = options.timestamp || formatTimestamp()
  const userDataDir = path.resolve(options.userDataDir || resolveDefaultUserDataDir())
  const dbPath = path.join(userDataDir, 'database.sqlite')
  const localStorageDir = path.join(userDataDir, 'Local Storage')
  const resetTrial = options.resetTrial === true

  if (!await pathExists(dbPath)) {
    throw new Error(`未找到数据库文件: ${dbPath}`)
  }

  const SQL = await loadSqlJs()
  const dbBuffer = await fs.readFile(dbPath)
  const db = new SQL.Database(new Uint8Array(dbBuffer))

  const activationRowsBefore = getSingleNumberFromDb(
    db,
    'SELECT COUNT(*) FROM activation WHERE is_valid = 1'
  )
  const firstRunTimeRowsBefore = getSingleNumberFromDb(
    db,
    "SELECT COUNT(*) FROM system_config WHERE key = 'first_run_time'"
  )

  db.run(
    'UPDATE activation SET is_valid = 0, updated_at = CURRENT_TIMESTAMP WHERE is_valid = 1'
  )

  if (resetTrial) {
    db.run("DELETE FROM system_config WHERE key = 'first_run_time'")
  }

  const updatedBuffer = Buffer.from(db.export())
  db.close()

  const dbBackupPath = buildBackupPath(dbPath, 'activation-reset', timestamp)
  await fs.copyFile(dbPath, dbBackupPath)
  await fs.writeFile(dbPath, updatedBuffer)

  const localStorageBackupPath = await moveDirectoryToBackup(localStorageDir, timestamp)

  const verificationDb = new SQL.Database(new Uint8Array(await fs.readFile(dbPath)))
  const activationRowsAfter = getSingleNumberFromDb(
    verificationDb,
    'SELECT COUNT(*) FROM activation WHERE is_valid = 1'
  )
  const firstRunTimeRowsAfter = getSingleNumberFromDb(
    verificationDb,
    "SELECT COUNT(*) FROM system_config WHERE key = 'first_run_time'"
  )
  verificationDb.close()

  return {
    userDataDir,
    dbPath,
    dbBackupPath,
    localStorageDir,
    localStorageBackupPath,
    resetTrial,
    activationRowsBefore,
    activationRowsAfter,
    firstRunTimeRowsBefore,
    firstRunTimeRowsAfter,
  }
}

function parseArgs(argv) {
  const options = {
    userDataDir: '',
    resetTrial: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]

    if (current === '--user-data-dir') {
      options.userDataDir = argv[index + 1] || ''
      index += 1
      continue
    }

    if (current === '--reset-trial') {
      options.resetTrial = true
      continue
    }
  }

  return options
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const summary = await resetActivationOnly(options)

  console.log('激活信息已清除（未删除业务数据）')
  console.log(`用户数据目录: ${summary.userDataDir}`)
  console.log(`数据库备份: ${summary.dbBackupPath}`)
  console.log(`激活记录: ${summary.activationRowsBefore} -> ${summary.activationRowsAfter}`)
  console.log(
    `first_run_time: ${summary.firstRunTimeRowsBefore} -> ${summary.firstRunTimeRowsAfter}${
      summary.resetTrial ? '（已重置试用起点）' : '（已保留试用起点）'
    }`
  )
  if (summary.localStorageBackupPath) {
    console.log(`Local Storage 备份: ${summary.localStorageBackupPath}`)
  } else {
    console.log('Local Storage: 未找到，无需清理')
  }
}

if (import.meta.url === `file://${__filename.replace(/\\/g, '/')}`) {
  main().catch((error) => {
    console.error('清除激活信息失败:', error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
