#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import initSqlJs from 'sql.js'
import createJiti from 'jiti'

const REPO_ROOT = process.cwd()
const DEFAULT_APP_DIR_NAME = 'scgp'
const MAIN_DB_NAME = 'database.sqlite'
const DEFAULT_INPUT_PATH = path.join(
  REPO_ROOT,
  '.tmp',
  'self-care-ats',
  'task-seed-inventory.json',
)

function printHelp() {
  console.log(`
导入 Self-Care ATS 任务种子到 SCGP task_training 主链

用途:
- 读取 .tmp/self-care-ats/task-seed-inventory.json
- 按 legacy_id + legacy_source + legacyTaskCode 幂等 upsert 到 sys_training_resource
- 固定写入 life_skills / task_training 契约

用法:
  node scripts/import-self-care-ats-seeds.mjs --dry-run
  node scripts/import-self-care-ats-seeds.mjs --yes

可选参数:
  --input <path>         指定任务 seed 清单 JSON
  --db <path>            指定数据库文件路径
  --user-data-dir <path> 指定 Electron userData 目录
  --dry-run              只输出导入计划，不写数据库
  --yes                  确认真正写入
  --help                 显示帮助
`.trim())
}

function parseArgs(argv) {
  const options = {
    inputPath: DEFAULT_INPUT_PATH,
    dbPath: '',
    userDataDir: '',
    dryRun: false,
    yes: false,
    help: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--input') {
      options.inputPath = path.resolve(argv[index + 1] || '')
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

async function createBackup(dbPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(
    path.dirname(dbPath),
    `database.self-care-ats-import.${timestamp}.sqlite`,
  )

  await fs.copyFile(dbPath, backupPath)
  return backupPath
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

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNullableString(value) {
  const normalized = normalizeString(value)
  return normalized || null
}

function normalizeOptionalNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeCategoryLabel(value) {
  const normalized = normalizeString(value)
  return normalized || '未分类'
}

function normalizeStepMediaPath(value) {
  return null
}

function normalizeStep(seedStep, index) {
  return {
    id: normalizeString(seedStep?.id) || `step_${index + 1}`,
    seq: index + 1,
    text: normalizeString(seedStep?.text),
    imagePath: normalizeStepMediaPath(seedStep?.imagePath),
    videoPath: normalizeStepMediaPath(seedStep?.videoPath),
    audioPath: normalizeStepMediaPath(seedStep?.audioPath),
  }
}

function loadSelfCareReferenceData() {
  const jiti = createJiti(import.meta.url)
  const atsDatabaseDir = path.resolve(REPO_ROOT, '..', 'Self-Care ATS', 'self-care-ats', 'src', 'database')
  const { TASK_CATEGORIES, ABILITY_ITEMS } = jiti(path.join(atsDatabaseDir, 'training-categories.ts'))

  const childCategoryById = new Map()
  const parentCategoryById = new Map()
  for (const parentCategory of TASK_CATEGORIES) {
    parentCategoryById.set(Number(parentCategory.id), parentCategory)
    const children = Array.isArray(parentCategory.children) ? parentCategory.children : []
    for (const childCategory of children) {
      childCategoryById.set(Number(childCategory.id), {
        child: childCategory,
        parent: parentCategory,
      })
    }
  }

  const abilityItemById = new Map()
  for (const abilityItem of ABILITY_ITEMS) {
    const abilityId = normalizeString(abilityItem.id)
    if (abilityId) {
      abilityItemById.set(abilityId, abilityItem)
    }
  }

  return {
    childCategoryById,
    parentCategoryById,
    abilityItemById,
  }
}

function buildTaskMetadata(task, referenceData) {
  const categoryId = normalizeOptionalNumber(task.categoryId)
  const categoryRecord = categoryId === null
    ? null
    : referenceData.childCategoryById.get(categoryId) || null

  const abilityItemId = normalizeString(task.abilityItem)
  const abilityItemRecord = abilityItemId
    ? referenceData.abilityItemById.get(abilityItemId) || null
    : null

  const sourceSteps = Array.isArray(task.steps) ? task.steps : []

  return {
    trainingMode: 'step_task',
    trainingEntryCode: 'life-skills',
    legacyTaskCode: normalizeNullableString(task.legacyTaskCode),
    category: categoryRecord
      ? {
          parentId: Number(categoryRecord.parent.id),
          parentName: normalizeString(categoryRecord.parent.name) || null,
          childId: Number(categoryRecord.child.id),
          childName: normalizeString(categoryRecord.child.name) || null,
        }
      : null,
    abilityItem: abilityItemId
      ? {
          id: abilityItemId,
          name: abilityItemRecord ? normalizeString(abilityItemRecord.name) : '',
        }
      : null,
    steps: sourceSteps.map((step, index) => normalizeStep(step, index)),
  }
}

function buildImportRows(seedInventory, referenceData) {
  const tasks = Array.isArray(seedInventory?.tasks) ? seedInventory.tasks : []

  return tasks.map((task) => {
    const metadata = buildTaskMetadata(task, referenceData)
    const category = normalizeCategoryLabel(metadata.category?.childName)
    const description = normalizeNullableString(task.description)
    const legacyTaskCode = normalizeString(task.legacyTaskCode)

    return {
      moduleCode: 'life_skills',
      resourceType: 'task_training',
      name: normalizeString(task.name),
      category,
      description,
      coverImage: null,
      isCustom: 0,
      isActive: 1,
      legacyId: Number(task.legacyId),
      legacySource: normalizeString(task.legacySource) || 'self_care_ats_task',
      legacyTaskCode,
      metadata,
    }
  })
}

function validateSeedInventory(seedInventory) {
  if (!seedInventory || typeof seedInventory !== 'object') {
    throw new Error('seed 清单不是合法 JSON 对象')
  }

  if (!Array.isArray(seedInventory.tasks) || seedInventory.tasks.length === 0) {
    throw new Error('seed 清单 tasks 为空')
  }

  for (const task of seedInventory.tasks) {
    if (!Number.isFinite(Number(task?.legacyId))) {
      throw new Error(`存在缺少 legacyId 的任务: ${JSON.stringify(task)}`)
    }

    if (!normalizeString(task?.name)) {
      throw new Error(`存在缺少 name 的任务: legacyId=${task?.legacyId ?? 'unknown'}`)
    }

    const taskSteps = Array.isArray(task?.steps) ? task.steps : []
    if (taskSteps.length === 0) {
      throw new Error(`任务缺少步骤: legacyId=${task.legacyId}`)
    }

    const invalidStep = taskSteps.find((step) => !normalizeString(step?.text))
    if (invalidStep) {
      throw new Error(`任务存在空白步骤: legacyId=${task.legacyId}`)
    }
  }
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

function getExistingResource(sql, row) {
  const byLegacy = sql.get(
    `
      SELECT id, meta_data
      FROM sys_training_resource
      WHERE legacy_id = ? AND legacy_source = ? AND resource_type = ? AND module_code = ?
    `,
    [row.legacyId, row.legacySource, row.resourceType, row.moduleCode],
  )

  if (byLegacy) {
    return byLegacy
  }

  if (!row.legacyTaskCode) {
    return null
  }

  const candidates = sql.query(
    `
      SELECT id, meta_data
      FROM sys_training_resource
      WHERE resource_type = ? AND module_code = ? AND legacy_source = ?
    `,
    [row.resourceType, row.moduleCode, row.legacySource],
  )

  return candidates.find((candidate) => {
    const metadata = parseMetadata(candidate.meta_data)
    return normalizeString(metadata?.legacyTaskCode) === row.legacyTaskCode
  }) || null
}

function upsertTaskTrainingResource(sql, row) {
  const existing = getExistingResource(sql, row)

  if (existing) {
    sql.run(
      `
        UPDATE sys_training_resource
        SET
          module_code = ?,
          resource_type = ?,
          name = ?,
          category = ?,
          description = ?,
          cover_image = ?,
          is_custom = ?,
          is_active = ?,
          legacy_id = ?,
          legacy_source = ?,
          meta_data = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        row.moduleCode,
        row.resourceType,
        row.name,
        row.category,
        row.description,
        row.coverImage,
        row.isCustom,
        row.isActive,
        row.legacyId,
        row.legacySource,
        JSON.stringify(row.metadata),
        Number(existing.id),
      ],
    )

    return {
      action: 'updated',
      resourceId: Number(existing.id),
    }
  }

  sql.run(
    `
      INSERT INTO sys_training_resource (
        module_code, resource_type, name, category, description,
        cover_image, is_custom, is_active, legacy_id, legacy_source,
        meta_data, usage_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      row.moduleCode,
      row.resourceType,
      row.name,
      row.category,
      row.description,
      row.coverImage,
      row.isCustom,
      row.isActive,
      row.legacyId,
      row.legacySource,
      JSON.stringify(row.metadata),
      0,
    ],
  )

  return {
    action: 'inserted',
    resourceId: sql.lastInsertId(),
  }
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
  if (!await fileExists(dbPath)) {
    throw new Error(`数据库文件不存在: ${dbPath}`)
  }
  if (!await fileExists(options.inputPath)) {
    throw new Error(`seed 清单不存在: ${options.inputPath}`)
  }

  const inventoryText = await fs.readFile(options.inputPath, 'utf8')
  const seedInventory = JSON.parse(inventoryText)
  validateSeedInventory(seedInventory)

  const referenceData = loadSelfCareReferenceData()
  const importRows = buildImportRows(seedInventory, referenceData)

  const SQL = await initSqlJs({
    locateFile: (file) => require.resolve(`sql.js/dist/${file}`),
  })

  const dbBuffer = await fs.readFile(dbPath)
  const db = new SQL.Database(dbBuffer)
  const sql = createSqlHelpers(db)

  const summary = {
    total: importRows.length,
    inserted: 0,
    updated: 0,
  }

  if (options.dryRun) {
    for (const row of importRows) {
      const existing = getExistingResource(sql, row)
      if (existing) {
        summary.updated += 1
      } else {
        summary.inserted += 1
      }
    }

    console.log('[self-care-ats-import] dry-run summary:', summary)
    return
  }

  const backupPath = await createBackup(dbPath)

  try {
    db.run('BEGIN TRANSACTION')

    for (const row of importRows) {
      const result = upsertTaskTrainingResource(sql, row)
      if (result.action === 'inserted') {
        summary.inserted += 1
      } else {
        summary.updated += 1
      }
    }

    db.run('COMMIT')
  } catch (error) {
    try {
      db.run('ROLLBACK')
    } catch {
      // ignore rollback errors
    }
    throw error
  }

  await fs.writeFile(dbPath, Buffer.from(db.export()))

  console.log('[self-care-ats-import] import summary:', summary)
  console.log('[self-care-ats-import] backup created:', backupPath)
}

const require = await import('node:module').then(({ createRequire }) => createRequire(import.meta.url))

main().catch((error) => {
  console.error('[self-care-ats-import] import failed:', error)
  process.exitCode = 1
})
