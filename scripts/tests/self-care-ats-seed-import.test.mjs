import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const scriptPath = resolve(projectRoot, 'scripts/import-self-care-ats-seeds.mjs')
const sysTablesSql = readFileSync(
  resolve(projectRoot, 'src/database/schema/sys-tables.sql'),
  'utf8',
)
const require = createRequire(import.meta.url)

async function createDatabaseFile(dbPath) {
  const SQL = await initSqlJs({
    locateFile: (file) => require.resolve(`sql.js/dist/${file}`),
  })
  const db = new SQL.Database()
  db.run(sysTablesSql)
  writeFileSync(dbPath, Buffer.from(db.export()))
  db.close()
}

async function queryImportedResources(dbPath) {
  const SQL = await initSqlJs({
    locateFile: (file) => require.resolve(`sql.js/dist/${file}`),
  })
  const dbBuffer = readFileSync(dbPath)
  const db = new SQL.Database(dbBuffer)
  const statement = db.prepare(`
    SELECT
      id,
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
      meta_data
    FROM sys_training_resource
    ORDER BY legacy_id ASC
  `)

  const rows = []
  try {
    while (statement.step()) {
      rows.push(statement.getAsObject())
    }
  } finally {
    statement.free()
    db.close()
  }

  return rows
}

function buildInventory(tasks) {
  return {
    generatedAt: '2026-05-11T06:00:00.000Z',
    sourceProject: 'E:\\VSC\\H5\\Self-Care ATS\\self-care-ats',
    resourceType: 'task_training',
    entryCode: 'life-skills',
    totalTasks: tasks.length,
    totalSteps: tasks.reduce((sum, task) => sum + task.stepCount, 0),
    tasks,
  }
}

test('self-care ATS import script upserts task_training seeds into sys_training_resource idempotently', async (t) => {
  const tempDir = mkdtempSync(join(tmpdir(), 'scgp-self-care-import-'))
  t.after(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  const dbPath = join(tempDir, 'database.sqlite')
  const inputPath = join(tempDir, 'task-seed-inventory.json')

  await createDatabaseFile(dbPath)

  writeFileSync(
    inputPath,
    JSON.stringify(
      buildInventory([
        {
          legacyId: 1,
          legacySource: 'self_care_ats_task',
          legacyTaskCode: 'EAT_SPOON_001',
          name: '用勺子吃饭',
          description: '初始描述',
          moduleCode: 'life_skills',
          resourceType: 'task_training',
          trainingEntryCode: 'life-skills',
          trainingMode: 'step_task',
          coverImage: 'tasks/EAT_SPOON_001_cover.jpg',
          categoryId: 11,
          abilityItem: 'feed_01',
          stepCount: 2,
          steps: [
            {
              id: 'legacy_step_1001',
              seq: 1,
              text: '拿勺子',
              imagePath: null,
              videoPath: null,
              audioPath: null,
            },
            {
              id: 'legacy_step_1002',
              seq: 2,
              text: '送入口中',
              imagePath: null,
              videoPath: null,
              audioPath: null,
            },
          ],
        },
        {
          legacyId: 4,
          legacySource: 'self_care_ats_task',
          legacyTaskCode: 'WASH_HANDS_001',
          name: '洗手',
          description: '洗手任务',
          moduleCode: 'life_skills',
          resourceType: 'task_training',
          trainingEntryCode: 'life-skills',
          trainingMode: 'step_task',
          coverImage: 'tasks/WASH_HANDS_001_cover.jpg',
          categoryId: 42,
          abilityItem: 'hygiene_02',
          stepCount: 2,
          steps: [
            {
              id: 'legacy_step_4001',
              seq: 1,
              text: '打开水龙头',
              imagePath: null,
              videoPath: null,
              audioPath: null,
            },
            {
              id: 'legacy_step_4002',
              seq: 2,
              text: '冲洗双手',
              imagePath: null,
              videoPath: null,
              audioPath: null,
            },
          ],
        },
      ]),
      null,
      2,
    ),
    'utf8',
  )

  let result = spawnSync(
    process.execPath,
    [scriptPath, '--db', dbPath, '--input', inputPath, '--yes'],
    {
      cwd: projectRoot,
      encoding: 'utf8',
    },
  )

  assert.equal(result.status, 0, result.stderr || result.stdout)

  let rows = await queryImportedResources(dbPath)
  assert.equal(rows.length, 2)

  const firstRow = rows[0]
  assert.equal(firstRow.module_code, 'life_skills')
  assert.equal(firstRow.resource_type, 'task_training')
  assert.equal(firstRow.name, '用勺子吃饭')
  assert.equal(firstRow.category, '使用勺子')
  assert.equal(firstRow.description, '初始描述')
  assert.equal(firstRow.cover_image, null)
  assert.equal(firstRow.is_custom, 0)
  assert.equal(firstRow.is_active, 1)
  assert.equal(firstRow.legacy_id, 1)
  assert.equal(firstRow.legacy_source, 'self_care_ats_task')

  const firstMeta = JSON.parse(String(firstRow.meta_data))
  assert.equal(firstMeta.trainingMode, 'step_task')
  assert.equal(firstMeta.trainingEntryCode, 'life-skills')
  assert.equal(firstMeta.legacyTaskCode, 'EAT_SPOON_001')
  assert.deepEqual(firstMeta.category, {
    parentId: 1,
    parentName: '饮食技能',
    childId: 11,
    childName: '使用勺子',
  })
  assert.deepEqual(firstMeta.abilityItem, {
    id: 'feed_01',
    name: '独立进食',
  })
  assert.equal(firstMeta.steps.length, 2)
  assert.equal(firstMeta.steps[0].text, '拿勺子')

  writeFileSync(
    inputPath,
    JSON.stringify(
      buildInventory([
        {
          legacyId: 1,
          legacySource: 'self_care_ats_task',
          legacyTaskCode: 'EAT_SPOON_001',
          name: '用勺子吃饭（更新）',
          description: '更新后的描述',
          moduleCode: 'life_skills',
          resourceType: 'task_training',
          trainingEntryCode: 'life-skills',
          trainingMode: 'step_task',
          coverImage: 'tasks/EAT_SPOON_001_cover.jpg',
          categoryId: 11,
          abilityItem: 'feed_01',
          stepCount: 2,
          steps: [
            {
              id: 'legacy_step_1001',
              seq: 1,
              text: '握住勺子',
              imagePath: null,
              videoPath: null,
              audioPath: null,
            },
            {
              id: 'legacy_step_1002',
              seq: 2,
              text: '稳住送入口中',
              imagePath: null,
              videoPath: null,
              audioPath: null,
            },
          ],
        },
        {
          legacyId: 4,
          legacySource: 'self_care_ats_task',
          legacyTaskCode: 'WASH_HANDS_001',
          name: '洗手',
          description: '洗手任务',
          moduleCode: 'life_skills',
          resourceType: 'task_training',
          trainingEntryCode: 'life-skills',
          trainingMode: 'step_task',
          coverImage: 'tasks/WASH_HANDS_001_cover.jpg',
          categoryId: 42,
          abilityItem: 'hygiene_02',
          stepCount: 2,
          steps: [
            {
              id: 'legacy_step_4001',
              seq: 1,
              text: '打开水龙头',
              imagePath: null,
              videoPath: null,
              audioPath: null,
            },
            {
              id: 'legacy_step_4002',
              seq: 2,
              text: '冲洗双手',
              imagePath: null,
              videoPath: null,
              audioPath: null,
            },
          ],
        },
      ]),
      null,
      2,
    ),
    'utf8',
  )

  result = spawnSync(
    process.execPath,
    [scriptPath, '--db', dbPath, '--input', inputPath, '--yes'],
    {
      cwd: projectRoot,
      encoding: 'utf8',
    },
  )

  assert.equal(result.status, 0, result.stderr || result.stdout)

  rows = await queryImportedResources(dbPath)
  assert.equal(rows.length, 2)

  const updatedFirstRow = rows[0]
  const updatedFirstMeta = JSON.parse(String(updatedFirstRow.meta_data))

  assert.equal(updatedFirstRow.name, '用勺子吃饭（更新）')
  assert.equal(updatedFirstRow.description, '更新后的描述')
  assert.equal(updatedFirstMeta.steps[0].text, '握住勺子')
  assert.equal(updatedFirstMeta.steps[1].text, '稳住送入口中')
})
