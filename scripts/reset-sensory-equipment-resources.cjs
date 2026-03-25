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
重置感官器材资源脚本

用途:
- 物理删除 sys_training_resource 中当前的感官器材系统资源
- 按仓库里的 EQUIPMENT_DATA 或指定 CSV 重新导入
- 自动迁移器材训练记录、训练计划资源引用、收藏到新的资源 ID

默认范围:
- module_code = 'sensory'
- resource_type = 'equipment'
- 仅处理系统资源（legacy_source in equipment_data/equipment_catalog 或 is_custom = 0）

用法:
  node scripts/reset-sensory-equipment-resources.cjs --yes

可选参数:
  --csv <path>                 指定外部 CSV 文件作为导入源
  --db <path>                  指定数据库文件路径
  --user-data-dir <path>       指定 Electron userData 目录
  --include-custom             连自定义器材资源一起重置
  --dry-run                    只输出计划，不写数据库
  --yes                        确认执行真实写入
  --help                       显示帮助

注意:
- 这是“重置到当前导入源”的脚本，不会保留你对系统器材资源的手工编辑字段
- 若用 CSV 导入，图片路径不是必填；缺图时前端会自动显示占位图
- 若导入源无法覆盖旧资源的 legacy_id / 名称，脚本会停止，避免留下断链记录
`.trim())
}

function parseArgs(argv) {
  const options = {
    csvPath: '',
    dbPath: '',
    userDataDir: '',
    includeCustom: false,
    dryRun: false,
    yes: false,
    help: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '--csv') {
      options.csvPath = argv[i + 1] || ''
      i += 1
      continue
    }

    if (arg === '--db') {
      options.dbPath = argv[i + 1] || ''
      i += 1
      continue
    }

    if (arg === '--user-data-dir') {
      options.userDataDir = argv[i + 1] || ''
      i += 1
      continue
    }

    if (arg === '--include-custom') {
      options.includeCustom = true
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
      const rows = this.query(sql, params)
      return rows[0] || null
    },

    run(sql, params = []) {
      db.run(sql, params)
    },

    lastInsertId() {
      const row = this.get('SELECT last_insert_rowid() AS id')
      return Number(row?.id || 0)
    },
  }
}

function buildInClause(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { clause: '(NULL)', params: [] }
  }

  return {
    clause: `(${ids.map(() => '?').join(', ')})`,
    params: ids,
  }
}

function toNumber(value) {
  return typeof value === 'number' ? value : Number(value || 0)
}

function ensureUniqueNames(equipmentData) {
  const seen = new Set()
  for (const item of equipmentData) {
    if (!item || typeof item.name !== 'string' || item.name.trim().length === 0) {
      throw new Error('EQUIPMENT_DATA 存在缺失 name 的项')
    }

    if (seen.has(item.name)) {
      throw new Error(`EQUIPMENT_DATA 存在重复名称: ${item.name}`)
    }

    seen.add(item.name)
  }
}

function splitAbilityTags(raw) {
  if (typeof raw !== 'string') {
    return []
  }

  return raw
    .split(/[、，,；;|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseCsvLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]

    if (ch === '"') {
      const next = line[i + 1]
      if (inQuotes && next === '"') {
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
  return values.map((value) => value.trim())
}

function normalizeCsvCategory(rowIndex, moduleName, productName, description) {
  const text = `${moduleName} ${productName} ${description}`

  if (moduleName === '触觉材料套装') return 'tactile'
  if (moduleName === '视觉材料套装') return 'visual'
  if (moduleName === '听觉材料套装') return 'auditory'
  if (moduleName === '本体觉材料套装') return 'proprioceptive'
  if (moduleName === '综合训练材料套装') return 'integration'

  if (moduleName === '味嗅觉材料套装') {
    if (text.includes('味觉')) return 'gustatory'
    return 'olfactory'
  }

  return null
}

async function loadEquipmentSeedFromCsv(csvPath) {
  const fullPath = path.resolve(csvPath)
  const content = await fs.readFile(fullPath, 'utf8')
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    throw new Error(`CSV 内容为空: ${fullPath}`)
  }

  const headers = parseCsvLine(lines[0])
  const headerIndex = new Map(headers.map((name, index) => [name, index]))
  const requiredHeaders = ['序号', '类别模块', '产品名称', '教育目标与功能描述', '能力标签']

  for (const header of requiredHeaders) {
    if (!headerIndex.has(header)) {
      throw new Error(`CSV 缺少必需表头: ${header}`)
    }
  }

  const resources = []
  const skipped = []

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i])
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']))
    const moduleName = row['类别模块']
    const name = row['产品名称']
    const description = row['教育目标与功能描述']
    const seqRaw = row['序号']
    const sourceSequence = Number(seqRaw)

    if (!name) {
      skipped.push(`第 ${i + 1} 行缺少产品名称`)
      continue
    }

    if (moduleName === '训练卡') {
      skipped.push(`跳过非器材行: ${name}`)
      continue
    }

    const category = normalizeCsvCategory(i, moduleName, name, description)
    if (!category) {
      skipped.push(`跳过无法识别类别的行: ${name} (${moduleName})`)
      continue
    }

    resources.push({
      category,
      sub_category: moduleName,
      name,
      description: description || '',
      ability_tags: splitAbilityTags(row['能力标签']),
      image_url: '',
      is_active: 1,
      legacy_id: resources.length + 1,
      source_sequence: Number.isFinite(sourceSequence) && sourceSequence > 0 ? sourceSequence : null,
      source_module: moduleName,
    })
  }

  ensureUniqueNames(resources)

  if (resources.length === 0) {
    throw new Error(`CSV 中没有可导入的器材资源: ${fullPath}`)
  }

  return {
    mode: 'csv',
    sourceLabel: fullPath,
    resources,
    skipped,
  }
}

function loadEquipmentSeedFromCode() {
  const jiti = createJiti(__filename, {
    alias: {
      '@': path.join(REPO_ROOT, 'src'),
    },
  })

  const mod = jiti('../src/database/equipment-data.ts')
  const equipmentData = mod?.EQUIPMENT_DATA

  if (!Array.isArray(equipmentData) || equipmentData.length === 0) {
    throw new Error('无法从 src/database/equipment-data.ts 加载 EQUIPMENT_DATA')
  }

  ensureUniqueNames(equipmentData)
  return {
    mode: 'code',
    sourceLabel: 'src/database/equipment-data.ts',
    resources: equipmentData.map((item, index) => ({
      ...item,
      legacy_id: index + 1,
    })),
    skipped: [],
  }
}

function getTargetResources(sql, includeCustom) {
  let sqlText = `
    SELECT id, name, legacy_id, legacy_source, is_custom, usage_count
    FROM sys_training_resource
    WHERE module_code = 'sensory'
      AND resource_type = 'equipment'
  `

  if (!includeCustom) {
    sqlText += `
      AND (
        is_custom = 0
        OR legacy_source IN ('equipment_data', 'equipment_catalog')
      )
    `
  }

  sqlText += ' ORDER BY id'
  return sql.query(sqlText)
}

function indexRowsByName(rows) {
  const map = new Map()
  for (const row of rows) {
    map.set(row.name, row)
  }
  return map
}

function buildTagMap(sql) {
  const rows = sql.query('SELECT id, domain, name FROM sys_tags')
  const tagMap = new Map()
  for (const row of rows) {
    tagMap.set(`${row.domain}:${row.name}`, toNumber(row.id))
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

function captureReferences(sql, targetIds) {
  const { clause, params } = buildInClause(targetIds)

  return {
    planMappings: sql.query(
      `
        SELECT
          prm.plan_id,
          prm.frequency,
          prm.duration_minutes,
          prm.notes,
          prm.sort_order,
          tr.name AS resource_name,
          tr.legacy_id AS legacy_id
        FROM sys_plan_resource_map prm
        INNER JOIN sys_training_resource tr ON tr.id = prm.resource_id
        WHERE prm.resource_id IN ${clause}
        ORDER BY prm.plan_id, prm.sort_order, prm.id
      `,
      params
    ),

    favoriteMappings: sql.query(
      `
        SELECT
          f.user_id,
          tr.name AS resource_name,
          tr.legacy_id AS legacy_id
        FROM sys_favorites f
        INNER JOIN sys_training_resource tr ON tr.id = f.resource_id
        WHERE f.resource_id IN ${clause}
        ORDER BY f.user_id, f.id
      `,
      params
    ),

    trainingRecords: sql.query(
      `
        SELECT
          etr.id AS record_id,
          tr.name AS resource_name,
          tr.legacy_id AS legacy_id
        FROM equipment_training_records etr
        INNER JOIN sys_training_resource tr ON tr.id = etr.equipment_id
        WHERE etr.equipment_id IN ${clause}
        ORDER BY etr.id
      `,
      params
    ),
  }
}

function validateSeedCoverage(targetResources, refs, seedBundle) {
  const seedNames = new Set(seedBundle.resources.map((item) => item.name))
  const seedLegacyIds = new Set(
    seedBundle.resources
      .map((item) => Number(item.legacy_id))
      .filter((value) => Number.isFinite(value) && value > 0)
  )
  const referencedLegacyIds = new Set()
  const referencedNames = new Set()

  for (const row of [...refs.trainingRecords, ...refs.planMappings, ...refs.favoriteMappings]) {
    const legacyId = Number(row.legacy_id)
    if (Number.isFinite(legacyId) && legacyId > 0) {
      referencedLegacyIds.add(legacyId)
    }
    if (typeof row.resource_name === 'string' && row.resource_name.trim().length > 0) {
      referencedNames.add(row.resource_name)
    }
  }

  const missing = targetResources.filter((row) => {
    const isReferenced =
      referencedLegacyIds.has(Number(row.legacy_id)) ||
      referencedNames.has(row.name)

    if (!isReferenced) {
      return false
    }

    const legacyId = Number(row.legacy_id)
    const hasLegacyMatch = Number.isFinite(legacyId) && legacyId > 0 && seedLegacyIds.has(legacyId)
    const hasNameMatch = seedNames.has(row.name)
    return !hasLegacyMatch && !hasNameMatch
  })

  if (missing.length > 0) {
    throw new Error(
      `当前数据库中有 ${missing.length} 条感官器材系统资源无法在新导入源中按 legacy_id 或名称匹配，已停止，避免留下断链引用: ${missing.map((row) => row.name).join(', ')}`
    )
  }
}

function summarizePlan(preview) {
  console.log('计划执行摘要:')
  console.log(`- 目标数据库: ${preview.dbPath}`)
  console.log(`- 目标 userData: ${preview.userDataDir}`)
  console.log(`- 导入源: ${preview.sourceLabel}`)
  console.log(`- 命中旧资源: ${preview.oldResourceCount}`)
  console.log(`- 新导入数量: ${preview.seedCount}`)
  console.log(`- 将迁移训练记录: ${preview.trainingRecordCount}`)
  console.log(`- 将恢复计划引用: ${preview.planMappingCount}`)
  console.log(`- 将恢复收藏: ${preview.favoriteCount}`)
  console.log(`- 包含自定义器材资源: ${preview.includeCustom ? '是' : '否'}`)
  console.log(`- dry-run: ${preview.dryRun ? '是' : '否'}`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const { dbPath, backupDbPath, userDataDir } = resolveDbPaths(options)

  if (!(await fileExists(dbPath))) {
    throw new Error(`数据库文件不存在: ${dbPath}`)
  }

  const seedBundle = options.csvPath
    ? await loadEquipmentSeedFromCsv(options.csvPath)
    : loadEquipmentSeedFromCode()

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(REPO_ROOT, 'node_modules', 'sql.js', 'dist', file),
  })

  const bytes = await fs.readFile(dbPath)
  const db = new SQL.Database(bytes)
  const sql = createSqlHelpers(db)

  const targetResources = getTargetResources(sql, options.includeCustom)
  const targetIds = targetResources.map((row) => toNumber(row.id))
  const refs = captureReferences(sql, targetIds)
  validateSeedCoverage(targetResources, refs, seedBundle)
  const oldByName = indexRowsByName(targetResources)
  const oldByLegacyId = new Map()
  for (const row of targetResources) {
    const legacyId = toNumber(row.legacy_id)
    if (legacyId > 0 && !oldByLegacyId.has(legacyId)) {
      oldByLegacyId.set(legacyId, row)
    }
  }

  summarizePlan({
    dbPath,
    userDataDir,
    sourceLabel: seedBundle.sourceLabel,
    oldResourceCount: targetResources.length,
    seedCount: seedBundle.resources.length,
    trainingRecordCount: refs.trainingRecords.length,
    planMappingCount: refs.planMappings.length,
    favoriteCount: refs.favoriteMappings.length,
    includeCustom: options.includeCustom,
    dryRun: options.dryRun,
  })

  if (seedBundle.skipped.length > 0) {
    console.log(`- 跳过条目: ${seedBundle.skipped.length}`)
    seedBundle.skipped.slice(0, 20).forEach((item) => {
      console.log(`  * ${item}`)
    })
    if (seedBundle.skipped.length > 20) {
      console.log(`  * ... 其余 ${seedBundle.skipped.length - 20} 条已省略`)
    }
  }

  if (options.dryRun) {
    db.close()
    return
  }

  if (!options.yes) {
    db.close()
    throw new Error('这是破坏性写入操作。请加 --yes 确认执行，或先用 --dry-run 预览。')
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const safetyBackupPath = path.join(userDataDir, `database.sqlite.bak.before-sensory-equipment-reset.${timestamp}`)
  await fs.copyFile(dbPath, safetyBackupPath)
  console.log(`已创建安全备份: ${safetyBackupPath}`)

  const tagMap = buildTagMap(sql)
  const newIdByName = new Map()
  const newIdByLegacyId = new Map()

  try {
    sql.run('BEGIN')

    if (targetIds.length > 0) {
      const { clause, params } = buildInClause(targetIds)
      sql.run(`DELETE FROM sys_plan_resource_map WHERE resource_id IN ${clause}`, params)
      sql.run(`DELETE FROM sys_favorites WHERE resource_id IN ${clause}`, params)
      sql.run(`DELETE FROM sys_resource_tag_map WHERE resource_id IN ${clause}`, params)
      sql.run(`DELETE FROM sys_training_resource WHERE id IN ${clause}`, params)
    }

    let legacyIdCounter = 1
    for (const equipment of seedBundle.resources) {
      const oldResource = oldByLegacyId.get(toNumber(equipment.legacy_id)) || oldByName.get(equipment.name)
      const usageCount = toNumber(oldResource?.usage_count)

      sql.run(
        `
          INSERT INTO sys_training_resource (
            module_code,
            resource_type,
            name,
            category,
            description,
            cover_image,
            is_custom,
            is_active,
            legacy_id,
            legacy_source,
            meta_data,
            usage_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          'sensory',
          'equipment',
          equipment.name,
          equipment.category,
          equipment.description || '',
          equipment.image_url || '',
          0,
          equipment.is_active ?? 1,
          toNumber(equipment.legacy_id) || legacyIdCounter,
          'equipment_data',
          JSON.stringify({
            original_category: equipment.category,
            original_sub_category: equipment.sub_category,
            source_sequence: equipment.source_sequence ?? null,
            source_module: equipment.source_module || equipment.sub_category || '',
          }),
          usageCount,
        ]
      )

      const newResourceId = sql.lastInsertId()
      newIdByName.set(equipment.name, newResourceId)
      if (toNumber(equipment.legacy_id) > 0) {
        newIdByLegacyId.set(toNumber(equipment.legacy_id), newResourceId)
      }

      if (Array.isArray(equipment.ability_tags)) {
        for (const tagName of equipment.ability_tags) {
          if (typeof tagName !== 'string' || tagName.trim().length === 0) {
            continue
          }
          const tagId = ensureTag(sql, tagMap, 'ability', tagName)
          sql.run(
            'INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id) VALUES (?, ?)',
            [newResourceId, tagId]
          )
        }
      }

      legacyIdCounter += 1
    }

    for (const row of refs.planMappings) {
      const newResourceId = newIdByLegacyId.get(toNumber(row.legacy_id)) || newIdByName.get(row.resource_name)
      if (!newResourceId) {
        throw new Error(`无法恢复训练计划引用，缺少新资源: ${row.resource_name}`)
      }

      sql.run(
        `
          INSERT OR IGNORE INTO sys_plan_resource_map (
            plan_id,
            resource_id,
            frequency,
            duration_minutes,
            notes,
            sort_order
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          toNumber(row.plan_id),
          newResourceId,
          row.frequency ?? null,
          row.duration_minutes ?? null,
          row.notes ?? null,
          toNumber(row.sort_order),
        ]
      )
    }

    for (const row of refs.favoriteMappings) {
      const newResourceId = newIdByLegacyId.get(toNumber(row.legacy_id)) || newIdByName.get(row.resource_name)
      if (!newResourceId) {
        throw new Error(`无法恢复收藏引用，缺少新资源: ${row.resource_name}`)
      }

      sql.run(
        `
          INSERT OR IGNORE INTO sys_favorites (user_id, resource_id)
          VALUES (?, ?)
        `,
        [toNumber(row.user_id), newResourceId]
      )
    }

    for (const row of refs.trainingRecords) {
      const newResourceId = newIdByLegacyId.get(toNumber(row.legacy_id)) || newIdByName.get(row.resource_name)
      if (!newResourceId) {
        throw new Error(`无法迁移器材训练记录，缺少新资源: ${row.resource_name}`)
      }

      sql.run(
        'UPDATE equipment_training_records SET equipment_id = ? WHERE id = ?',
        [newResourceId, toNumber(row.record_id)]
      )
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
    console.log(`已同步更新备份库: ${backupDbPath}`)
  }

  db.close()

  console.log('感官器材资源已重置完成:')
  console.log(`- 新导入资源: ${seedBundle.resources.length}`)
  console.log(`- 已迁移训练记录: ${refs.trainingRecords.length}`)
  console.log(`- 已恢复计划引用: ${refs.planMappings.length}`)
  console.log(`- 已恢复收藏: ${refs.favoriteMappings.length}`)
}

main().catch((error) => {
  console.error('[reset-sensory-equipment-resources] 失败:', error.message)
  process.exitCode = 1
})
