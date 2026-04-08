import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import initSqlJs from 'sql.js'

const REPO_ROOT = process.cwd()
const APPDATA = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
const MAIN_DB_NAME = 'database.sqlite'
const BACKUP_DB_NAME = 'database_backup.db'
const EMOTION_SCENE_REFERENCE_DIR = path.join(REPO_ROOT, 'docs', 'references', 'emotion-scene')

const TAXONOMY = {
  'scene-1': { themeCategory: '平静专注', sceneDomain: '校园' },
  'scene-2': { themeCategory: '平静专注', sceneDomain: '自然生态' },
  'scene-3': { themeCategory: '平静专注', sceneDomain: '校园' },
  'scene-4': { themeCategory: '平静专注', sceneDomain: '校园' },
  'scene-5': { themeCategory: '平静专注', sceneDomain: '公共商业与社区' },
  'scene-6': { themeCategory: '快乐体验', sceneDomain: '公共商业与社区' },
  'scene-7': { themeCategory: '快乐体验', sceneDomain: '公共商业与社区' },
  'scene-8': { themeCategory: '快乐体验', sceneDomain: '家庭' },
  'scene-9': { themeCategory: '快乐体验', sceneDomain: '校园' },
  'scene-10': { themeCategory: '快乐体验', sceneDomain: '家庭' },
  'scene-11': { themeCategory: '快乐体验', sceneDomain: '公共商业与社区' },
  'scene-12': { themeCategory: '快乐体验', sceneDomain: '校园' },
  'scene-13': { themeCategory: '快乐体验', sceneDomain: '交通出行' },
  'scene-14': { themeCategory: '失落挫折', sceneDomain: '公共商业与社区' },
  'scene-15': { themeCategory: '失落挫折', sceneDomain: '公共商业与社区' },
  'scene-16': { themeCategory: '害怕与安全', sceneDomain: '公共商业与社区' },
  'scene-17': { themeCategory: '失落挫折', sceneDomain: '校园' },
  'scene-18': { themeCategory: '失落挫折', sceneDomain: '家庭' },
  'scene-19': { themeCategory: '失落挫折', sceneDomain: '校园' },
  'scene-20': { themeCategory: '失落挫折', sceneDomain: '校园' },
  'scene-21': { themeCategory: '失落挫折', sceneDomain: '校园' },
  'scene-22': { themeCategory: '同伴冲突与边界', sceneDomain: '校园' },
  'scene-23': { themeCategory: '同伴冲突与边界', sceneDomain: '公共商业与社区' },
  'scene-24': { themeCategory: '同伴冲突与边界', sceneDomain: '数字虚拟' },
  'scene-25': { themeCategory: '同伴冲突与边界', sceneDomain: '校园' },
  'scene-26': { themeCategory: '同伴冲突与边界', sceneDomain: '校园' },
  'scene-27': { themeCategory: '同伴冲突与边界', sceneDomain: '校园' },
  'scene-28': { themeCategory: '同伴冲突与边界', sceneDomain: '校园' },
  'scene-29': { themeCategory: '同伴冲突与边界', sceneDomain: '校园' },
  'scene-30': { themeCategory: '害怕与安全', sceneDomain: '自然生态' },
  'scene-31': { themeCategory: '害怕与安全', sceneDomain: '自然生态' },
  'scene-32': { themeCategory: '害怕与安全', sceneDomain: '医疗康复' },
  'scene-33': { themeCategory: '害怕与安全', sceneDomain: '公共商业与社区' },
  'scene-34': { themeCategory: '害怕与安全', sceneDomain: '数字虚拟' },
  'scene-35': { themeCategory: '害怕与安全', sceneDomain: '公共商业与社区' },
  'scene-36': { themeCategory: '害怕与安全', sceneDomain: '校园' },
  'scene-37': { themeCategory: '社交尴尬', sceneDomain: '校园' },
  'scene-38': { themeCategory: '社交尴尬', sceneDomain: '校园' },
  'scene-39': { themeCategory: '社交尴尬', sceneDomain: '校园' },
  'scene-40': { themeCategory: '社交尴尬', sceneDomain: '校园' },
  'scene-41': { themeCategory: '社交尴尬', sceneDomain: '校园' },
  'scene-42': { themeCategory: '社交尴尬', sceneDomain: '校园' },
  'scene-43': { themeCategory: '社交尴尬', sceneDomain: '公共商业与社区' },
  'scene-44': { themeCategory: '害羞与被关注', sceneDomain: '家庭' },
  'scene-45': { themeCategory: '害羞与被关注', sceneDomain: '校园' },
  'scene-46': { themeCategory: '害羞与被关注', sceneDomain: '校园' },
  'scene-47': { themeCategory: '害羞与被关注', sceneDomain: '校园' },
  'scene-48': { themeCategory: '害羞与被关注', sceneDomain: '校园' },
  'scene-49': { themeCategory: '害羞与被关注', sceneDomain: '校园' },
  'scene-50': { themeCategory: '同伴冲突与边界', sceneDomain: '公共商业与社区' },
  'scene-51': { themeCategory: '失落挫折', sceneDomain: '公共商业与社区' },
  'scene-52': { themeCategory: '害怕与安全', sceneDomain: '自然生态' },
  'scene-53': { themeCategory: '社交尴尬', sceneDomain: '公共商业与社区' },
  'scene-54': { themeCategory: '害羞与被关注', sceneDomain: '家庭' },
  'scene-55': { themeCategory: '害羞与被关注', sceneDomain: '校园' },
  'scene-56': { themeCategory: '害怕与安全', sceneDomain: '医疗康复' },
  'scene-57': { themeCategory: '成长成就', sceneDomain: '家庭' },
  'scene-58': { themeCategory: '成长成就', sceneDomain: '校园' },
  'scene-59': { themeCategory: '成长成就', sceneDomain: '校园' },
  'scene-60': { themeCategory: '成长成就', sceneDomain: '家庭' },
  'scene-61': { themeCategory: '成长成就', sceneDomain: '校园' },
  'scene-62': { themeCategory: '成长成就', sceneDomain: '校园' },
  'scene-63': { themeCategory: '成长成就', sceneDomain: '家庭' },
  'scene-64': { themeCategory: '同伴冲突与边界', sceneDomain: '校园' },
  'scene-65': { themeCategory: '失落挫折', sceneDomain: '公共商业与社区' },
  'scene-66': { themeCategory: '成长成就', sceneDomain: '家庭' },
  'scene-67': { themeCategory: '社交尴尬', sceneDomain: '公共商业与社区' },
  'scene-68': { themeCategory: '害羞与被关注', sceneDomain: '家庭' },
  'scene-69': { themeCategory: '快乐体验', sceneDomain: '家庭' },
  'scene-70': { themeCategory: '同伴冲突与边界', sceneDomain: '公共商业与社区' },
  'scene-71': { themeCategory: '社交尴尬', sceneDomain: '校园' },
  'scene-72': { themeCategory: '失落挫折', sceneDomain: '校园' },
  'scene-73': { themeCategory: '成长成就', sceneDomain: '交通出行' },
  'scene-74': { themeCategory: '快乐体验', sceneDomain: '校园' },
  'scene-75': { themeCategory: '平静专注', sceneDomain: '自然生态' },
  'scene-76': { themeCategory: '同伴冲突与边界', sceneDomain: '校园' },
  'scene-77': { themeCategory: '社交尴尬', sceneDomain: '校园' },
  'scene-78': { themeCategory: '害怕与安全', sceneDomain: '自然生态' },
  'scene-79': { themeCategory: '失落挫折', sceneDomain: '自然生态' },
  'scene-80': { themeCategory: '成长成就', sceneDomain: '校园' },
}

const REFERENCE_FILES = [
  path.join(REPO_ROOT, 'docs', 'references', 'current-emotion-scenes-export.json'),
  path.join(EMOTION_SCENE_REFERENCE_DIR, 'emotion-scenes-merged-candidate.json'),
]

const OUTPUT_CSV_PATH = path.join(EMOTION_SCENE_REFERENCE_DIR, 'emotion-scene-taxonomy-2026-03-24.csv')
const OUTPUT_MD_PATH = path.join(EMOTION_SCENE_REFERENCE_DIR, 'emotion-scene-taxonomy-2026-03-24.md')
const AGE_RANGE_BY_DIFFICULTY = {
  1: '4-6',
  2: '7-12',
  3: '13-17',
}
const AGE_RANGE_ALIASES = {
  '4-8': '4-6',
}

function normalizeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function normalizeOptionalString(value) {
  const normalized = normalizeString(value)
  return normalized || undefined
}

function normalizeAgeRange(value) {
  const normalized = normalizeOptionalString(value)
  if (!normalized) {
    return undefined
  }

  return AGE_RANGE_ALIASES[normalized] || normalized
}

function normalizeDifficultyLevel(value) {
  return value === 2 || value === 3 ? value : 1
}

function resolveAgeRange(metadata, fallbackDifficultyLevel = 1) {
  const existingAgeRange = normalizeAgeRange(metadata?.ageRange)
  if (existingAgeRange) {
    return existingAgeRange
  }

  const difficultyLevel = normalizeDifficultyLevel(metadata?.difficultyLevel ?? fallbackDifficultyLevel)
  return AGE_RANGE_BY_DIFFICULTY[difficultyLevel] || AGE_RANGE_BY_DIFFICULTY[1]
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

function escapeCsv(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

async function openSqlDb(SQL, filePath) {
  const buffer = await fs.readFile(filePath)
  return new SQL.Database(buffer)
}

function queryRows(db, sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length > 0) {
    stmt.bind(params)
  }

  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
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
        `SELECT COUNT(*) AS count
         FROM sys_training_resource
         WHERE module_code='emotional'
           AND resource_type='emotion_scene'
           AND is_active=1`
      )
      db.close()

      const count = Number(rows[0]?.count || 0)
      if (count > 0) {
        const stats = await fs.stat(dbPath)
        candidates.push({ dirPath, count, mtimeMs: stats.mtimeMs })
      }
    } catch {
      // ignore unrelated sqlite files
    }
  }

  if (candidates.length === 0) {
    throw new Error('没有找到包含 emotion_scene 数据的 SCGP 用户目录')
  }

  candidates.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count
    }
    return b.mtimeMs - a.mtimeMs
  })

  return candidates[0].dirPath
}

async function backupFile(filePath, timestampLabel) {
  if (!(await fileExists(filePath))) return null
  const parsed = path.parse(filePath)
  const backupPath = path.join(parsed.dir, `${parsed.name}.pre-scene-taxonomy.${timestampLabel}${parsed.ext}`)
  await fs.copyFile(filePath, backupPath)
  return backupPath
}

function buildSummaryTable(rows, key) {
  const counts = new Map()
  rows.forEach((row) => {
    const value = String(row[key] || '未分类')
    counts.set(value, (counts.get(value) || 0) + 1)
  })
  return Array.from(counts.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'zh-CN'))
}

async function writeAuditFiles(rows, dbPath) {
  const themeSummary = buildSummaryTable(rows, 'themeCategory')
  const domainSummary = buildSummaryTable(rows, 'sceneDomain')
  const ageSummary = buildSummaryTable(rows, 'ageRange')

  const csvLines = [
    'sceneCode,title,themeCategory,sceneDomain,ageRange',
    ...rows.map((row) => [
      row.sceneCode,
      row.title,
      row.themeCategory,
      row.sceneDomain,
      row.ageRange,
    ].map(escapeCsv).join(',')),
  ]
  await fs.writeFile(OUTPUT_CSV_PATH, `${csvLines.join('\n')}\n`, 'utf8')

  const mdLines = [
    '# Emotion Scene Taxonomy (2026-03-24)',
    '',
    `- Source DB: \`${dbPath}\``,
    `- Total active emotion_scene rows: ${rows.length}`,
    '',
    '## Theme Summary',
    '',
    '| Theme Category | Count |',
    '|---|---:|',
    ...themeSummary.map(([value, count]) => `| ${value} | ${count} |`),
    '',
    '## Domain Summary',
    '',
    '| Scene Domain | Count |',
    '|---|---:|',
    ...domainSummary.map(([value, count]) => `| ${value} | ${count} |`),
    '',
    '## Age Summary',
    '',
    '| Age Range | Count |',
    '|---|---:|',
    ...ageSummary.map(([value, count]) => `| ${value} | ${count} |`),
    '',
    '## Scene List',
    '',
    '| sceneCode | Title | Theme Category | Scene Domain | Age Range |',
    '|---|---|---|---|---|',
    ...rows.map((row) => `| ${row.sceneCode} | ${String(row.title).replace(/\|/g, '\\|')} | ${row.themeCategory} | ${row.sceneDomain} | ${row.ageRange} |`),
    '',
  ]
  await fs.writeFile(OUTPUT_MD_PATH, `${mdLines.join('\n')}\n`, 'utf8')
}

async function updateReferenceFiles() {
  for (const filePath of REFERENCE_FILES) {
    if (!(await fileExists(filePath))) continue

    const scenes = await readJson(filePath)
    if (!Array.isArray(scenes)) continue

    const nextScenes = scenes.map((scene) => {
      const sceneCode = normalizeString(scene.sceneCode)
      const taxonomy = TAXONOMY[sceneCode]
      if (!taxonomy) {
        return scene
      }

      const ageRange = resolveAgeRange(scene, scene.difficultyLevel)

      return {
        ...scene,
        sceneDomain: taxonomy.sceneDomain,
        ageRange,
      }
    })

    await fs.writeFile(filePath, `${JSON.stringify(nextScenes, null, 2)}\n`, 'utf8')
  }
}

async function main() {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(REPO_ROOT, 'node_modules', 'sql.js', 'dist', file),
  })

  const userDataDir = await findUserDataDir(SQL)
  const dbPath = path.join(userDataDir, MAIN_DB_NAME)
  const timestampLabel = new Date().toISOString().replace(/[:.]/g, '-')

  const mainBackup = await backupFile(dbPath, timestampLabel)
  const backupBackup = await backupFile(path.join(userDataDir, BACKUP_DB_NAME), timestampLabel)
  const db = await openSqlDb(SQL, dbPath)

  try {
    const rows = queryRows(db, `
      SELECT id, name, category, meta_data
      FROM sys_training_resource
      WHERE module_code='emotional'
        AND resource_type='emotion_scene'
        AND is_active=1
      ORDER BY CAST(REPLACE(json_extract(meta_data, '$.sceneCode'), 'scene-', '') AS INTEGER) ASC
    `)

    if (rows.length !== 80) {
      throw new Error(`预期 80 条 emotion_scene，实际读取到 ${rows.length} 条`)
    }

    const appliedRows = []
    db.run('BEGIN TRANSACTION')

    for (const row of rows) {
      const metadata = row.meta_data ? JSON.parse(row.meta_data) : {}
      const sceneCode = normalizeString(metadata.sceneCode)
      const taxonomy = TAXONOMY[sceneCode]
      if (!taxonomy) {
        throw new Error(`缺少场景分类映射: ${sceneCode}`)
      }

      metadata.sceneDomain = taxonomy.sceneDomain
      metadata.ageRange = resolveAgeRange(metadata, metadata.difficultyLevel)

      db.run(
        `UPDATE sys_training_resource
         SET category = ?, meta_data = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [taxonomy.themeCategory, JSON.stringify(metadata), row.id]
      )

      appliedRows.push({
        sceneCode,
        title: row.name,
        themeCategory: taxonomy.themeCategory,
        sceneDomain: taxonomy.sceneDomain,
        ageRange: metadata.ageRange,
      })
    }

    db.run('COMMIT')

    const bytes = Buffer.from(db.export())
    await fs.writeFile(dbPath, bytes)
    await fs.writeFile(path.join(userDataDir, BACKUP_DB_NAME), bytes)

    await updateReferenceFiles()
    await writeAuditFiles(appliedRows, dbPath)

    console.log(JSON.stringify({
      dbPath,
      updatedCount: appliedRows.length,
      mainBackup,
      backupBackup,
      outputCsv: OUTPUT_CSV_PATH,
      outputMd: OUTPUT_MD_PATH,
      themeSummary: buildSummaryTable(appliedRows, 'themeCategory'),
      domainSummary: buildSummaryTable(appliedRows, 'sceneDomain'),
      ageSummary: buildSummaryTable(appliedRows, 'ageRange'),
    }, null, 2))
  } catch (error) {
    try {
      db.run('ROLLBACK')
    } catch {
      // ignore rollback failures
    }
    throw error
  } finally {
    db.close()
  }
}

main().catch((error) => {
  console.error('应用情绪场景双维分类失败:', error)
  process.exitCode = 1
})
