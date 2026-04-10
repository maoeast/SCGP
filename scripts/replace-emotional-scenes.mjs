import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import initSqlJs from 'sql.js'

const REPO_ROOT = process.cwd()
const APPDATA = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
const MAIN_DB_NAME = 'database.sqlite'
const BACKUP_DB_NAME = 'database_backup.db'

const EMOTION_COLORS = {
  happy: { token: 'green', hex: '#67C23A', label: '绿色区' },
  sad: { token: 'blue', hex: '#409EFF', label: '蓝色区' },
  embarrassed: { token: 'yellow', hex: '#E6A23C', label: '黄色区' },
  angry: { token: 'red', hex: '#F56C6C', label: '红色区' },
  scared: { token: 'red', hex: '#F56C6C', label: '红色区' },
}

const EMOTION_VALUES = new Set(['happy', 'sad', 'embarrassed', 'angry', 'scared'])
const REASONING_TYPES = new Set(['cause', 'need', 'empathy'])
const SOLUTION_RANKS = new Set(['optimal', 'acceptable', 'inappropriate'])
const CARE_TYPES = new Set(['empathy', 'advice', 'action'])
const ABILITY_LEVELS = new Set(['primary', 'middle', 'advanced'])

function log(message, extra) {
  if (extra === undefined) {
    console.log(message)
    return
  }
  console.log(message, extra)
}

function fail(message) {
  throw new Error(message)
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
    .filter((item) => item.length > 0)
}

function normalizeDifficultyLevel(value) {
  return value === 2 || value === 3 ? value : 1
}

function normalizeHintLevel(value) {
  return value === 0 || value === 1 || value === 2 || value === 3 ? value : undefined
}

function normalizeAbilityLevel(value) {
  return ABILITY_LEVELS.has(value) ? value : undefined
}

function normalizeEmotion(value, fallback) {
  return EMOTION_VALUES.has(value) ? value : fallback
}

function normalizeCareType(value, fallback) {
  return CARE_TYPES.has(value) ? value : fallback
}

function normalizeColorToken(value) {
  return (
    value === 'green'
    || value === 'yellow'
    || value === 'blue'
    || value === 'red'
    || value === 'purple'
    || value === 'gold'
    || value === 'magenta'
    || value === 'peach'
  ) ? value : undefined
}

function ensureArrayOfObjects(value, label) {
  if (!Array.isArray(value)) {
    fail(`${label} 不是数组`)
  }
  return value
}

async function readJsonFile(filePath) {
  const text = await fs.readFile(filePath, 'utf8')
  return JSON.parse(text)
}

async function readBrokenTopLevelObjects(filePath) {
  const text = await fs.readFile(filePath, 'utf8')

  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : fail(`${path.basename(filePath)} 不是数组 JSON`)
  } catch {
    const items = []
    let inString = false
    let escaped = false
    let depth = 0
    let start = -1

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i]
      if (escaped) {
        escaped = false
        continue
      }
      if (ch === '\\') {
        escaped = true
        continue
      }
      if (ch === '"') {
        inString = !inString
        continue
      }
      if (inString) {
        continue
      }
      if (ch === '{') {
        if (depth === 0) {
          start = i
        }
        depth += 1
        continue
      }
      if (ch === '}') {
        depth -= 1
        if (depth === 0 && start >= 0) {
          items.push(JSON.parse(text.slice(start, i + 1)))
          start = -1
        }
      }
    }

    if (items.length === 0) {
      fail(`${path.basename(filePath)} 无法修复为对象数组`)
    }

    return items
  }
}

function normalizeEmotionScene(raw) {
  const targetEmotion = normalizeEmotion(raw.targetEmotion, 'happy')
  const color = EMOTION_COLORS[targetEmotion]
  const prompts = ensureArrayOfObjects(raw.prompts, `${raw.sceneCode || raw.title} prompts`).map((prompt, promptIndex) => {
    const options = ensureArrayOfObjects(prompt.options, `${prompt.questionId || `prompt_${promptIndex + 1}`} options`).map((option, optionIndex) => ({
      id: normalizeString(option.id, `option_${optionIndex + 1}`),
      text: normalizeString(option.text, optionIndex === 0 ? '请填写正确选项' : '请填写干扰选项'),
      imageUrl: normalizeOptionalString(option.imageUrl),
      isCorrect: option.isCorrect === true,
      isAcceptable: option.isAcceptable === true ? true : undefined,
      feedbackText: normalizeString(option.feedbackText, '请填写温和反馈'),
    }))

    return {
      questionId: normalizeString(prompt.questionId, `prompt_${promptIndex + 1}`),
      questionType: REASONING_TYPES.has(prompt.questionType) ? prompt.questionType : 'cause',
      questionText: normalizeString(prompt.questionText, '请填写推理问题'),
      options,
    }
  })

  const solutions = ensureArrayOfObjects(raw.solutions, `${raw.sceneCode || raw.title} solutions`).map((solution, solutionIndex) => ({
    id: normalizeString(solution.id, `solution_${solutionIndex + 1}`),
    text: normalizeString(solution.text, '请填写回应选项'),
    imageUrl: normalizeOptionalString(solution.imageUrl),
    suitability: SOLUTION_RANKS.has(solution.suitability) ? solution.suitability : (solutionIndex === 0 ? 'optimal' : 'acceptable'),
    explanation: normalizeString(solution.explanation, '请填写回应解释'),
  }))

  const emotionOptions = Array.from(new Set(
    normalizeStringArray(raw.emotionOptions)
      .filter((item) => EMOTION_VALUES.has(item))
  ))

  if (!emotionOptions.includes(targetEmotion)) {
    emotionOptions.unshift(targetEmotion)
  }

  return {
    sceneCode: normalizeString(raw.sceneCode, `emotion_scene_import_${Date.now()}`),
    title: normalizeString(raw.title, '导入的情绪场景'),
    imageUrl: normalizeString(raw.imageUrl),
    difficultyLevel: normalizeDifficultyLevel(raw.difficultyLevel),
    targetEmotion,
    emotionOptions: emotionOptions.length > 0 ? emotionOptions : ['happy', 'sad', 'embarrassed', 'angry', 'scared'],
    emotionClues: normalizeStringArray(raw.emotionClues),
    prompts,
    solutions,
    recommendedHintCeiling: normalizeHintLevel(raw.recommendedHintCeiling),
    ageRange: normalizeOptionalString(raw.ageRange),
    abilityLevel: normalizeAbilityLevel(raw.abilityLevel),
    tags: normalizeStringArray(raw.tags),
    emotionColorToken: color.token,
    emotionColorHex: color.hex,
    emotionColorLabel: color.label,
  }
}

function normalizeCareScene(raw) {
  const receiverEmotion = normalizeEmotion(raw.receiverEmotion, 'sad')
  const fallbackColor = EMOTION_COLORS[receiverEmotion] || EMOTION_COLORS.sad
  const colorToken = normalizeColorToken(raw.emotionColorToken) || fallbackColor.token
  const color = Object.values(EMOTION_COLORS).find((item) => item.token === colorToken) || fallbackColor

  const utterances = ensureArrayOfObjects(raw.utterances, `${raw.sceneCode || raw.title} utterances`).map((utterance, utteranceIndex) => ({
    id: normalizeString(utterance.id, `utterance_${utteranceIndex + 1}`),
    type: normalizeCareType(utterance.type, utteranceIndex === 0 ? 'empathy' : utteranceIndex === 1 ? 'advice' : 'action'),
    text: normalizeString(utterance.text, '请填写关心表达'),
    effect: normalizeString(utterance.effect, '请填写表达效果'),
    receiverReactionText: normalizeOptionalString(utterance.receiverReactionText),
    receiverReactionEmoji: normalizeOptionalString(utterance.receiverReactionEmoji),
  }))

  const receiverOptions = ensureArrayOfObjects(raw.receiverOptions, `${raw.sceneCode || raw.title} receiverOptions`).map((option, optionIndex) => ({
    id: normalizeString(option.id, `receiver_${optionIndex + 1}`),
    text: normalizeString(option.text, '请填写接收者选项'),
    isComforting: option.isComforting === true,
    reasonText: normalizeString(option.reasonText, '请填写原因说明'),
  }))

  const preferredUtteranceIds = normalizeStringArray(raw.preferredUtteranceIds)
    .filter((item) => utterances.some((utterance) => utterance.id === item))

  const specificEmotionLabel = normalizeOptionalString(raw.specificEmotionLabel)
  const emotionOptions = ensureArrayOfObjects(raw.emotionOptions || [], `${raw.sceneCode || raw.title} emotionOptions`).map((option, optionIndex) => ({
    text: normalizeString(option.text, optionIndex === 0 ? (specificEmotionLabel || '请填写最准确的感受') : `情绪选项 ${optionIndex + 1}`),
    isCorrect: option.isCorrect === true,
    feedbackText: normalizeString(option.feedbackText, option.isCorrect === true ? '太棒啦！你读懂了TA现在的感受。' : '再看看发生了什么，我们再想一想。'),
  }))

  return {
    sceneCode: normalizeString(raw.sceneCode, `care_scene_import_${Date.now()}`),
    name: normalizeOptionalString(raw.name) || normalizeOptionalString(raw.receiverName),
    title: normalizeString(raw.title, '导入的表达关心场景'),
    description: normalizeOptionalString(raw.description),
    imageUrl: normalizeString(raw.imageUrl),
    difficultyLevel: normalizeDifficultyLevel(raw.difficultyLevel),
    careType: normalizeCareType(raw.careType, 'empathy'),
    receiverEmotion,
    specificEmotionToken: normalizeOptionalString(raw.specificEmotionToken),
    specificEmotionLabel,
    emotionOptions: emotionOptions.length > 0 ? emotionOptions : [
      {
        text: specificEmotionLabel || '最准确的感受',
        isCorrect: true,
        feedbackText: '太棒啦！你读懂了TA现在的感受。',
      },
    ],
    speakerPerspectiveText: normalizeString(raw.speakerPerspectiveText, '请填写表达者视角提示'),
    receiverPerspectiveText: normalizeString(raw.receiverPerspectiveText, '请填写接收者视角提示'),
    utterances,
    receiverOptions,
    preferredUtteranceIds: preferredUtteranceIds.length > 0 ? preferredUtteranceIds : utterances.slice(0, 2).map((item) => item.id),
    recommendedHintCeiling: normalizeHintLevel(raw.recommendedHintCeiling),
    ageRange: normalizeOptionalString(raw.ageRange),
    abilityLevel: normalizeAbilityLevel(raw.abilityLevel),
    tags: normalizeStringArray(raw.tags),
    emotionColorToken: colorToken,
    emotionColorHex: color.hex,
    emotionColorLabel: normalizeOptionalString(raw.emotionColorLabel) || color.label,
  }
}

function buildSeedResources(emotionScenes, careScenes) {
  const emotionResources = emotionScenes.map((raw) => {
    const metadata = normalizeEmotionScene(raw)
    return {
      resourceType: 'emotion_scene',
      name: metadata.title,
      category: normalizeStringArray(raw.tags)[0] || 'imported_emotion_scene',
      description: normalizeOptionalString(raw.description) || metadata.title,
      coverImage: metadata.imageUrl || '',
      tags: metadata.tags,
      metadata,
    }
  })

  const careResources = careScenes.map((raw) => {
    const metadata = normalizeCareScene(raw)
    return {
      resourceType: 'care_scene',
      name: metadata.title,
      category: normalizeStringArray(raw.tags)[0] || 'imported_care_scene',
      description: normalizeOptionalString(raw.description) || metadata.title,
      coverImage: metadata.imageUrl || '',
      tags: metadata.tags,
      metadata,
    }
  })

  return [...emotionResources, ...careResources]
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function findCandidateUserDataDirs() {
  const entries = await fs.readdir(APPDATA, { withFileTypes: true })
  const candidates = []

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }
    const dirPath = path.join(APPDATA, entry.name)
    const dbPath = path.join(dirPath, MAIN_DB_NAME)
    if (await fileExists(dbPath)) {
      candidates.push(dirPath)
    }
  }

  if (candidates.length === 0) {
    fail(`在 ${APPDATA} 下没有找到任何 ${MAIN_DB_NAME}`)
  }

  return candidates
}

async function openSqlDb(SQL, filePath) {
  const buffer = await fs.readFile(filePath)
  return new SQL.Database(buffer)
}

function querySingleValue(db, sql) {
  const result = db.exec(sql)
  return result?.[0]?.values?.[0]?.[0]
}

async function pickUserDataDir(SQL) {
  const candidates = await findCandidateUserDataDirs()
  const scored = []

  for (const dirPath of candidates) {
    try {
      const db = await openSqlDb(SQL, path.join(dirPath, MAIN_DB_NAME))
      const hasResourceTable = !!querySingleValue(db, "SELECT name FROM sqlite_master WHERE type='table' AND name='sys_training_resource'")
      const emotionalCount = Number(querySingleValue(
        db,
        "SELECT COUNT(*) FROM sys_training_resource WHERE module_code='emotional' AND resource_type IN ('emotion_scene','care_scene')"
      ) || 0)
      db.close()

      if (hasResourceTable) {
        const stats = await fs.stat(path.join(dirPath, MAIN_DB_NAME))
        scored.push({ dirPath, emotionalCount, mtimeMs: stats.mtimeMs })
      }
    } catch {
      // ignore non-matching sqlite files
    }
  }

  if (scored.length === 0) {
    fail('没有找到包含 sys_training_resource 的有效 SCGP 数据库目录')
  }

  scored.sort((a, b) => {
    if (b.emotionalCount !== a.emotionalCount) {
      return b.emotionalCount - a.emotionalCount
    }
    return b.mtimeMs - a.mtimeMs
  })

  return scored[0].dirPath
}

async function backupFile(filePath, timestampLabel) {
  if (!(await fileExists(filePath))) {
    return null
  }
  const parsed = path.parse(filePath)
  const backupPath = path.join(parsed.dir, `${parsed.name}.pre-emotional-import.${timestampLabel}${parsed.ext}`)
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
  const safeName = name.replace(/'/g, "''")
  const existing = querySingleValue(
    db,
    `SELECT id FROM sys_tags WHERE domain = 'ability' AND name = '${safeName}' LIMIT 1`
  )

  if (existing) {
    return Number(existing)
  }

  db.run(
    'INSERT INTO sys_tags (domain, name, usage_count, is_preset) VALUES (?, ?, ?, ?)',
    ['ability', name, 0, 0]
  )
  return Number(querySingleValue(db, 'SELECT last_insert_rowid()'))
}

function deleteExistingEmotionalResources(db) {
  const oldIdsResult = db.exec(`
    SELECT id FROM sys_training_resource
    WHERE module_code = 'emotional'
      AND resource_type IN ('emotion_scene', 'care_scene')
  `)
  const oldIds = (oldIdsResult?.[0]?.values || []).map((row) => Number(row[0]))

  if (oldIds.length > 0) {
    const placeholders = oldIds.map(() => '?').join(', ')
    db.run(`DELETE FROM sys_resource_tag_map WHERE resource_id IN (${placeholders})`, oldIds)
    db.run(
      `DELETE FROM sys_training_resource WHERE id IN (${placeholders})`,
      oldIds
    )
  }

  return oldIds.length
}

function insertResources(db, resources) {
  let insertedEmotionCount = 0
  let insertedCareCount = 0

  for (const resource of resources) {
    db.run(`
      INSERT INTO sys_training_resource (
        module_code, resource_type, name, category, description,
        cover_image, is_custom, is_active, legacy_source, meta_data, usage_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'emotional',
      resource.resourceType,
      resource.name,
      resource.category,
      resource.description || '',
      resource.coverImage || '',
      1,
      1,
      'emotional_json_replace_2026_04_10',
      JSON.stringify(resource.metadata),
      0,
    ])

    const resourceId = Number(querySingleValue(db, 'SELECT last_insert_rowid()'))
    const uniqueTags = Array.from(new Set(resource.tags.filter((item) => item)))
    for (const tagName of uniqueTags) {
      const tagId = ensureTag(db, tagName)
      db.run(
        'INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id) VALUES (?, ?)',
        [resourceId, tagId]
      )
      db.run('UPDATE sys_tags SET usage_count = usage_count + 1 WHERE id = ?', [tagId])
    }

    if (resource.resourceType === 'emotion_scene') {
      insertedEmotionCount += 1
    } else {
      insertedCareCount += 1
    }
  }

  return {
    insertedEmotionCount,
    insertedCareCount,
  }
}

async function saveDbFiles(db, userDataDir) {
  const bytes = Buffer.from(db.export())
  const mainDbPath = path.join(userDataDir, MAIN_DB_NAME)
  const backupDbPath = path.join(userDataDir, BACKUP_DB_NAME)
  await fs.writeFile(mainDbPath, bytes)
  await fs.writeFile(backupDbPath, bytes)
  return {
    mainDbPath,
    backupDbPath,
    size: bytes.byteLength,
  }
}

async function main() {
  log('开始准备情绪场景替换...')

  const emotionPath = path.join(REPO_ROOT, 'final_emotion_scenes.json')
  const carePath = path.join(REPO_ROOT, 'care_scenes_database.json')

  if (!(await fileExists(emotionPath))) {
    fail(`缺少文件: ${emotionPath}`)
  }
  if (!(await fileExists(carePath))) {
    fail(`缺少文件: ${carePath}`)
  }

  const emotionScenes = ensureArrayOfObjects(await readJsonFile(emotionPath), 'final_emotion_scenes.json')
  const careScenes = ensureArrayOfObjects(await readBrokenTopLevelObjects(carePath), 'care_scenes_database.json')

  log(`情绪场景源文件条数: ${emotionScenes.length}`)
  log(`表达关心源文件条数: ${careScenes.length}`)

  const resources = buildSeedResources(emotionScenes, careScenes)
  log(`标准化后待写入资源总数: ${resources.length}`)

  const wasmPath = path.join(REPO_ROOT, 'node_modules', 'sql.js', 'dist')
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(wasmPath, file),
  })

  const userDataDir = await pickUserDataDir(SQL)
  log(`命中的 SCGP 数据目录: ${userDataDir}`)

  const timestampLabel = new Date().toISOString().replace(/[:.]/g, '-')
  const mainBackup = await backupFile(path.join(userDataDir, MAIN_DB_NAME), timestampLabel)
  const fileBackup = await backupFile(path.join(userDataDir, BACKUP_DB_NAME), timestampLabel)
  log('主库备份:', mainBackup || '无')
  log('备份库备份:', fileBackup || '无')

  const db = await openSqlDb(SQL, path.join(userDataDir, MAIN_DB_NAME))
  db.run('BEGIN TRANSACTION')

  try {
    const deletedCount = deleteExistingEmotionalResources(db)
    const insertStats = insertResources(db, resources)
    db.run('COMMIT')

    const saveStats = await saveDbFiles(db, userDataDir)
    const removedIndexedDb = await removeCacheDir(userDataDir, 'IndexedDB')
    const removedLocalStorage = await removeCacheDir(userDataDir, 'Local Storage')
    const removedSessionStorage = await removeCacheDir(userDataDir, 'Session Storage')

    const finalEmotionCount = Number(querySingleValue(
      db,
      "SELECT COUNT(*) FROM sys_training_resource WHERE module_code='emotional' AND resource_type='emotion_scene' AND is_active=1"
    ) || 0)
    const finalCareCount = Number(querySingleValue(
      db,
      "SELECT COUNT(*) FROM sys_training_resource WHERE module_code='emotional' AND resource_type='care_scene' AND is_active=1"
    ) || 0)

    const summary = {
      userDataDir,
      deletedCount,
      insertedEmotionCount: insertStats.insertedEmotionCount,
      insertedCareCount: insertStats.insertedCareCount,
      finalEmotionCount,
      finalCareCount,
      mainDbPath: saveStats.mainDbPath,
      backupDbPath: saveStats.backupDbPath,
      bytesWritten: saveStats.size,
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
    }

    log('替换完成。结果如下:')
    console.log(JSON.stringify(summary, null, 2))
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
  console.error('替换失败:', error)
  process.exitCode = 1
})
