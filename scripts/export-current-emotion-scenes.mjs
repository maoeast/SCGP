import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import initSqlJs from 'sql.js'

const REPO_ROOT = process.cwd()
const APPDATA = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
const MAIN_DB_NAME = 'database.sqlite'
const OUTPUT_PATH = path.join(REPO_ROOT, 'docs', 'references', 'emotion-scene', 'current-emotion-scenes-export.json')

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
  const unique = Array.from(
    new Set(
      source
        .map((item) => normalizeEmotion(item, targetEmotion))
        .filter((item) => FORMAL_EMOTIONS.has(item))
    )
  )

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

function normalizeSceneExport(row) {
  const metadata = row.meta_data ? JSON.parse(row.meta_data) : {}
  const targetEmotion = normalizeEmotion(metadata.targetEmotion, 'happy')

  return {
    sceneCode: normalizeString(metadata.sceneCode, `emotion_scene_${row.id}`),
    title: normalizeString(metadata.title || row.name),
    description: normalizeOptionalString(row.description),
    imageUrl: normalizeString(metadata.imageUrl),
    difficultyLevel: metadata.difficultyLevel === 2 || metadata.difficultyLevel === 3 ? metadata.difficultyLevel : 1,
    targetEmotion,
    sceneDomain: normalizeOptionalString(metadata.sceneDomain),
    emotionOptions: normalizeEmotionOptions(metadata.emotionOptions, targetEmotion),
    emotionClues: normalizeStringArray(metadata.emotionClues),
    prompts: Array.isArray(metadata.prompts)
      ? metadata.prompts.map((prompt, index) => normalizePrompt(prompt, index))
      : [],
    solutions: Array.isArray(metadata.solutions)
      ? metadata.solutions.map((solution, index) => normalizeSolution(solution, index))
      : [],
    recommendedHintCeiling:
      metadata.recommendedHintCeiling === 0 ||
      metadata.recommendedHintCeiling === 1 ||
      metadata.recommendedHintCeiling === 2 ||
      metadata.recommendedHintCeiling === 3
        ? metadata.recommendedHintCeiling
        : undefined,
    ageRange: normalizeOptionalString(metadata.ageRange),
    abilityLevel: normalizeOptionalString(metadata.abilityLevel),
    tags: normalizeStringArray(metadata.tags),
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

async function main() {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(REPO_ROOT, 'node_modules', 'sql.js', 'dist', file),
  })

  const userDataDir = await findUserDataDir(SQL)
  const dbPath = path.join(userDataDir, MAIN_DB_NAME)
  const db = await openSqlDb(SQL, dbPath)

  try {
    const rows = queryRows(db, `
      SELECT id, name, description, meta_data
      FROM sys_training_resource
      WHERE module_code='emotional'
        AND resource_type='emotion_scene'
        AND is_active=1
      ORDER BY id ASC
    `)

    const scenes = rows.map(normalizeSceneExport)
    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(scenes, null, 2)}\n`, 'utf8')

    console.log(JSON.stringify({
      userDataDir,
      dbPath,
      outputPath: OUTPUT_PATH,
      count: scenes.length,
      firstSceneCode: scenes[0]?.sceneCode || null,
      lastSceneCode: scenes[scenes.length - 1]?.sceneCode || null,
    }, null, 2))
  } finally {
    db.close()
  }
}

main().catch((error) => {
  console.error('导出失败:', error)
  process.exitCode = 1
})
