import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import initSqlJs from 'sql.js'

const REPO_ROOT = process.cwd()
const APPDATA = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
const MAIN_DB_NAME = 'database.sqlite'
const BACKUP_DB_NAME = 'database_backup.db'
const INPUT_PATH = path.join(REPO_ROOT, 'docs', 'references', 'emotion-scenes-merged-candidate.json')

const FORMAL_EMOTIONS = new Set([
  'calm',
  'happy',
  'sad',
  'angry',
  'scared',
  'embarrassed',
  'shy',
  'proud',
])

const LEGACY_ALIASES = {
  anger: 'angry',
}

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

async function readJson(filePath) {
  const text = await fs.readFile(filePath, 'utf8')
  return JSON.parse(text)
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

function querySingleValue(db, sql, params = []) {
  const rows = queryRows(db, sql, params)
  const firstRow = rows[0]
  if (!firstRow) {
    return null
  }
  const firstKey = Object.keys(firstRow)[0]
  return firstKey ? firstRow[firstKey] : null
}

function normalizeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function normalizeOptionalString(value) {
  const normalized = normalizeString(value)
  return normalized || undefined
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => normalizeString(item))
    .filter(Boolean)
}

function normalizeEmotion(value, fallback = 'happy') {
  const normalized = normalizeString(value).toLowerCase()
  if (!normalized) {
    return fallback
  }
  if (FORMAL_EMOTIONS.has(normalized)) {
    return normalized
  }
  if (normalized in LEGACY_ALIASES) {
    return LEGACY_ALIASES[normalized]
  }
  return fallback
}

function normalizeEmotionOptions(value, targetEmotion) {
  const source = Array.isArray(value) ? value : []
  const unique = Array.from(new Set(
    source
      .map((item) => normalizeEmotion(item, targetEmotion))
      .filter((item) => FORMAL_EMOTIONS.has(item))
  ))

  if (!unique.includes(targetEmotion)) {
    unique.unshift(targetEmotion)
  }

  return unique
}

function normalizePromptOption(option, index) {
  return {
    id: normalizeString(option?.id, `option_${index + 1}`),
    text: normalizeString(option?.text),
    imageUrl: normalizeOptionalString(option?.imageUrl),
    isCorrect: option?.isCorrect === true,
    isAcceptable: option?.isAcceptable === true ? true : undefined,
    feedbackText: normalizeString(option?.feedbackText),
  }
}

function normalizePrompt(prompt, index) {
  return {
    questionId: normalizeString(prompt?.questionId, `prompt_${index + 1}`),
    questionType: normalizeString(prompt?.questionType, 'cause'),
    questionText: normalizeString(prompt?.questionText),
    options: Array.isArray(prompt?.options)
      ? prompt.options.map((option, optionIndex) => normalizePromptOption(option, optionIndex))
      : [],
  }
}

function normalizeSolution(solution, index) {
  return {
    id: normalizeString(solution?.id, `solution_${index + 1}`),
    text: normalizeString(solution?.text),
    imageUrl: normalizeOptionalString(solution?.imageUrl),
    suitability: normalizeString(solution?.suitability, index === 0 ? 'optimal' : 'acceptable'),
    explanation: normalizeString(solution?.explanation),
  }
}

function buildMetadata(scene) {
  const targetEmotion = normalizeEmotion(scene.targetEmotion, 'happy')

  return {
    sceneCode: normalizeString(scene.sceneCode),
    title: normalizeString(scene.title),
    imageUrl: normalizeString(scene.imageUrl),
    difficultyLevel: scene.difficultyLevel === 2 || scene.difficultyLevel === 3 ? scene.difficultyLevel : 1,
    targetEmotion,
    emotionOptions: normalizeEmotionOptions(scene.emotionOptions, targetEmotion),
    emotionClues: normalizeStringArray(scene.emotionClues),
    prompts: Array.isArray(scene.prompts)
      ? scene.prompts.map((prompt, index) => normalizePrompt(prompt, index))
      : [],
    solutions: Array.isArray(scene.solutions)
      ? scene.solutions.map((solution, index) => normalizeSolution(solution, index))
      : [],
    recommendedHintCeiling:
      scene.recommendedHintCeiling === 0 ||
      scene.recommendedHintCeiling === 1 ||
      scene.recommendedHintCeiling === 2 ||
      scene.recommendedHintCeiling === 3
        ? scene.recommendedHintCeiling
        : undefined,
    ageRange: normalizeOptionalString(scene.ageRange),
    abilityLevel: normalizeOptionalString(scene.abilityLevel),
    tags: normalizeStringArray(scene.tags),
  }
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
      const count = Number(querySingleValue(
        db,
        "SELECT COUNT(*) AS count FROM sys_training_resource WHERE module_code='emotional' AND resource_type='emotion_scene' AND is_active=1"
      ) || 0)
      db.close()

      if (count > 0) {
        const stats = await fs.stat(dbPath)
        candidates.push({ dirPath, count, mtimeMs: stats.mtimeMs })
      }
    } catch {
      // ignore unrelated sqlite files
    }
  }

  if (candidates.length === 0) {
    fail('没有找到包含 emotion_scene 数据的 SCGP 用户目录')
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
  const backupPath = path.join(parsed.dir, `${parsed.name}.pre-merged-emotion-update.${timestampLabel}${parsed.ext}`)
  await fs.copyFile(filePath, backupPath)
  return backupPath
}

async function removeCacheDir(userDataDir, dirName) {
  const targetPath = path.join(userDataDir, dirName)
  if (!(await fileExists(targetPath))) {
    return { removed: false, warning: null }
  }

  try {
    await fs.rm(targetPath, { recursive: true, force: true })
    return { removed: true, warning: null }
  } catch (error) {
    return {
      removed: false,
      warning: `${dirName}: ${error.code || error.message}`,
    }
  }
}

function ensureTag(db, name) {
  const existingId = querySingleValue(
    db,
    "SELECT id FROM sys_tags WHERE domain = ? AND name = ? LIMIT 1",
    ['ability', name]
  )

  if (existingId) {
    return Number(existingId)
  }

  db.run(
    'INSERT INTO sys_tags (domain, name, usage_count, is_preset) VALUES (?, ?, ?, ?)',
    ['ability', name, 0, 0]
  )
  return Number(querySingleValue(db, 'SELECT last_insert_rowid() AS id'))
}

function rebuildTagMappings(db, resourceId, tags) {
  db.run('DELETE FROM sys_resource_tag_map WHERE resource_id = ?', [resourceId])

  for (const tagName of Array.from(new Set(tags.filter(Boolean)))) {
    const tagId = ensureTag(db, tagName)
    db.run(
      'INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id) VALUES (?, ?)',
      [resourceId, tagId]
    )
  }
}

function refreshAbilityTagUsageCounts(db) {
  db.run(`
    UPDATE sys_tags
    SET usage_count = COALESCE((
      SELECT COUNT(*)
      FROM sys_resource_tag_map
      WHERE sys_resource_tag_map.tag_id = sys_tags.id
    ), 0)
    WHERE domain = 'ability'
  `)
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
  const scenes = await readJson(INPUT_PATH)
  if (!Array.isArray(scenes) || scenes.length === 0) {
    fail('emotion-scenes-merged-candidate.json 不是有效数组')
  }

  const normalizedScenes = scenes.map((scene) => {
    const metadata = buildMetadata(scene)
    if (!metadata.sceneCode) {
      fail('存在缺少 sceneCode 的场景')
    }
    return {
      sceneCode: metadata.sceneCode,
      name: metadata.title,
      description: normalizeOptionalString(scene.description) || metadata.title,
      coverImage: metadata.imageUrl || '',
      tags: metadata.tags || [],
      metadata,
    }
  })

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
    const resourceRows = queryRows(db, `
      SELECT id, name, description, cover_image, meta_data
      FROM sys_training_resource
      WHERE module_code = 'emotional'
        AND resource_type = 'emotion_scene'
        AND is_active = 1
      ORDER BY id ASC
    `)

    const rowBySceneCode = new Map()
    for (const row of resourceRows) {
      const metadata = row.meta_data ? JSON.parse(row.meta_data) : {}
      const sceneCode = normalizeString(metadata.sceneCode)
      if (sceneCode) {
        rowBySceneCode.set(sceneCode, row)
      }
    }

    const missingSceneCodes = normalizedScenes
      .map((scene) => scene.sceneCode)
      .filter((sceneCode) => !rowBySceneCode.has(sceneCode))

    if (missingSceneCodes.length > 0) {
      fail(`数据库缺少待更新场景: ${missingSceneCodes.join(', ')}`)
    }

    db.run('BEGIN TRANSACTION')

    for (const scene of normalizedScenes) {
      const row = rowBySceneCode.get(scene.sceneCode)
      db.run(`
        UPDATE sys_training_resource
        SET name = ?, description = ?, cover_image = ?, meta_data = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [
        scene.name,
        scene.description,
        scene.coverImage,
        JSON.stringify(scene.metadata),
        row.id,
      ])

      rebuildTagMappings(db, Number(row.id), scene.tags)
    }

    refreshAbilityTagUsageCounts(db)
    db.run('COMMIT')

    const saveStats = await saveDb(db, userDataDir)
    const removedIndexedDb = await removeCacheDir(userDataDir, 'IndexedDB')
    const removedLocalStorage = await removeCacheDir(userDataDir, 'Local Storage')
    const removedSessionStorage = await removeCacheDir(userDataDir, 'Session Storage')

    console.log(JSON.stringify({
      userDataDir,
      dbPath,
      updatedCount: normalizedScenes.length,
      mainBackup,
      backupBackup,
      saved: saveStats,
      cacheCleared: {
        indexedDb: removedIndexedDb.removed,
        localStorage: removedLocalStorage.removed,
        sessionStorage: removedSessionStorage.removed,
      },
      cacheWarnings: [
        removedIndexedDb.warning,
        removedLocalStorage.warning,
        removedSessionStorage.warning,
      ].filter(Boolean),
    }, null, 2))
  } catch (error) {
    try {
      db.run('ROLLBACK')
    } catch {
      // ignore rollback failure
    }
    throw error
  } finally {
    db.close()
  }
}

main().catch((error) => {
  console.error('应用合并场景失败:', error)
  process.exitCode = 1
})
