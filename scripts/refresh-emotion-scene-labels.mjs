import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import initSqlJs from 'sql.js'

const REPO_ROOT = process.cwd()
const APPDATA = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
const MAIN_DB_NAME = 'database.sqlite'
const BACKUP_DB_NAME = 'database_backup.db'
const CSV_PATH = path.join(REPO_ROOT, 'docs', 'references', 'emotion-scene', '鎯呯华鍦烘櫙.csv')

function fail(message) {
  throw new Error(message)
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function parseCsvLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }
    current += ch
  }
  values.push(current)
  return values.map((item) => item.trim())
}

async function readEmotionSceneCsv() {
  const buffer = await fs.readFile(CSV_PATH)
  const text = new TextDecoder('gb18030').decode(buffer)
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length < 2) {
    fail('鎯呯华鍦烘櫙.csv 娌℃湁鍙敤鏁版嵁琛?)
  }

  const header = parseCsvLine(lines[0]).map((item) => item.replace(/^\uFEFF/, ''))
  if (header.length < 6) {
    fail(`鎯呯华鍦烘櫙.csv 鍒楁暟涓嶈冻: ${header.length}`)
  }

  const mapping = new Map()
  for (const line of lines.slice(1)) {
    const row = parseCsvLine(line)
    const sceneNo = row[2]
    const title = row[3]
    const purpose = row[5]
    if (!sceneNo || !title) {
      continue
    }
    mapping.set(`scene-${Number(sceneNo)}`, {
      title,
      description: purpose || title,
    })
  }

  return mapping
}

async function openSqlDb(SQL, filePath) {
  const buffer = await fs.readFile(filePath)
  return new SQL.Database(buffer)
}

function queryRows(db, sql) {
  const result = db.exec(sql)
  const columns = result?.[0]?.columns || []
  const values = result?.[0]?.values || []
  return values.map((row) => Object.fromEntries(columns.map((col, idx) => [col, row[idx]])))
}

async function findUserDataDir(SQL) {
  const entries = await fs.readdir(APPDATA, { withFileTypes: true })
  const candidates = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const dirPath = path.join(APPDATA, entry.name)
    const dbPath = path.join(dirPath, MAIN_DB_NAME)
    if (!(await fileExists(dbPath))) continue

    try {
      const db = await openSqlDb(SQL, dbPath)
      const rows = queryRows(
        db,
        "SELECT COUNT(*) AS count FROM sys_training_resource WHERE module_code='emotional' AND resource_type='emotion_scene' AND is_active=1"
      )
      db.close()
      const count = Number(rows[0]?.count || 0)
      if (count > 0) {
        const stats = await fs.stat(dbPath)
        candidates.push({ dirPath, count, mtimeMs: stats.mtimeMs })
      }
    } catch {
      // ignore
    }
  }

  if (candidates.length === 0) {
    fail('娌℃湁鎵惧埌鍖呭惈 emotion_scene 鏁版嵁鐨?SCGP 鐢ㄦ埛鐩綍')
  }

  candidates.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return b.mtimeMs - a.mtimeMs
  })

  return candidates[0].dirPath
}

async function backupFile(filePath, timestampLabel) {
  if (!(await fileExists(filePath))) return null
  const parsed = path.parse(filePath)
  const backupPath = path.join(parsed.dir, `${parsed.name}.pre-emotion-label-refresh.${timestampLabel}${parsed.ext}`)
  await fs.copyFile(filePath, backupPath)
  return backupPath
}

async function saveDb(db, userDataDir) {
  const bytes = Buffer.from(db.export())
  const mainDbPath = path.join(userDataDir, MAIN_DB_NAME)
  const backupDbPath = path.join(userDataDir, BACKUP_DB_NAME)
  await fs.writeFile(mainDbPath, bytes)
  await fs.writeFile(backupDbPath, bytes)
  return { mainDbPath, backupDbPath, size: bytes.byteLength }
}

async function main() {
  const mapping = await readEmotionSceneCsv()
  console.log(`CSV 鏄犲皠鏉℃暟: ${mapping.size}`)

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(REPO_ROOT, 'node_modules', 'sql.js', 'dist', file),
  })

  const userDataDir = await findUserDataDir(SQL)
  console.log(`鍛戒腑鐨?SCGP 鏁版嵁鐩綍: ${userDataDir}`)

  const timestampLabel = new Date().toISOString().replace(/[:.]/g, '-')
  const mainBackup = await backupFile(path.join(userDataDir, MAIN_DB_NAME), timestampLabel)
  const backupBackup = await backupFile(path.join(userDataDir, BACKUP_DB_NAME), timestampLabel)

  const db = await openSqlDb(SQL, path.join(userDataDir, MAIN_DB_NAME))

  try {
    const rows = queryRows(db, `
      SELECT id, name, description, meta_data
      FROM sys_training_resource
      WHERE module_code='emotional'
        AND resource_type='emotion_scene'
        AND is_active=1
      ORDER BY id ASC
    `)

    let updated = 0
    const missing = []
    const deletedSeedRows = queryRows(db, `
      SELECT id
      FROM sys_training_resource
      WHERE module_code='emotional'
        AND legacy_source='emotional_demo_seed'
    `).map((row) => Number(row.id))

    db.run('BEGIN TRANSACTION')
    if (deletedSeedRows.length > 0) {
      const placeholders = deletedSeedRows.map(() => '?').join(', ')
      db.run(`DELETE FROM sys_resource_tag_map WHERE resource_id IN (${placeholders})`, deletedSeedRows)
      db.run(`DELETE FROM sys_training_resource WHERE id IN (${placeholders})`, deletedSeedRows)
    }

    for (const row of rows) {
      const metadata = JSON.parse(row.meta_data || '{}')
      const sceneCode = String(metadata.sceneCode || '')
      const next = mapping.get(sceneCode)
      if (!next) {
        missing.push(sceneCode)
        continue
      }

      metadata.title = next.title

      db.run(
        `UPDATE sys_training_resource
         SET name = ?, description = ?, meta_data = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [next.title, next.description, JSON.stringify(metadata), row.id]
      )
      updated += 1
    }
    db.run('COMMIT')

    const saveStats = await saveDb(db, userDataDir)
    const samples = queryRows(db, `
      SELECT id, name, description, json_extract(meta_data, '$.sceneCode') AS sceneCode
      FROM sys_training_resource
      WHERE module_code='emotional'
        AND resource_type='emotion_scene'
        AND is_active=1
      ORDER BY id ASC
      LIMIT 5
    `)

    console.log(JSON.stringify({
      userDataDir,
      updated,
      totalEmotionScenes: rows.length,
      deletedSeedRows: deletedSeedRows.length,
      missingSceneCodes: missing,
      backups: {
        mainBackup,
        backupBackup,
      },
      database: saveStats,
      samples,
    }, null, 2))
  } catch (error) {
    try {
      db.run('ROLLBACK')
    } catch {
      // ignore
    }
    throw error
  } finally {
    db.close()
  }
}

main().catch((error) => {
  console.error('鏇存柊澶辫触:', error)
  process.exitCode = 1
})

