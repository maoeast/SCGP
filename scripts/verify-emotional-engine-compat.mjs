import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'

const DEFAULT_DB_PATH = 'C:/Users/maoea/AppData/Roaming/scgp/database.sqlite'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

function printUsage() {
  console.log('Usage: node scripts/verify-emotional-engine-compat.mjs [--db <path>]')
}

function parseArgs(argv) {
  let dbPath = DEFAULT_DB_PATH
  let repairReportPointers = false

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--help' || arg === '-h') {
      printUsage()
      process.exit(0)
    }

    if (arg === '--db') {
      const next = argv[index + 1]
      if (!next) {
        throw new Error('Missing value after --db')
      }
      dbPath = next
      index += 1
      continue
    }

    if (arg === '--repair-report-pointers') {
      repairReportPointers = true
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return { dbPath, repairReportPointers }
}

async function loadDatabase(dbPath) {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database not found: ${dbPath}`)
  }

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(projectRoot, 'node_modules', 'sql.js', 'dist', file),
  })

  return new SQL.Database(fs.readFileSync(dbPath))
}

function saveDatabase(db, dbPath) {
  fs.writeFileSync(dbPath, Buffer.from(db.export()))
}

function queryRows(db, sql, params = []) {
  const statement = db.prepare(sql)
  statement.bind(params)

  const rows = []
  while (statement.step()) {
    rows.push(statement.getAsObject())
  }

  statement.free()
  return rows
}

function readTextFile(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath)
  return fs.readFileSync(absolutePath, 'utf8')
}

function formatDetails(details) {
  return details.length > 0 ? ` ${details.join(' | ')}` : ''
}

function reportCheck(name, passed, details = []) {
  const prefix = passed ? 'PASS' : 'FAIL'
  console.log(`${prefix} ${name}${formatDetails(details)}`)
  return passed
}

function verifyShellRouteLiterals() {
  const sourceText = [
    readTextFile('src/views/emotional/EmotionSceneTraining.vue'),
    readTextFile('src/views/emotional/CareExpressionTraining.vue'),
    readTextFile('src/features/emotional/runtime/useEmotionalTrainingShell.ts'),
  ].join('\n')

  const requiredLiterals = [
    '/emotional/session-summary',
    '/dashboard',
    '/training-plan',
    '/emotional/emotion-scene/select',
    '/emotional/care-expression/select',
  ]

  const missing = requiredLiterals.filter((literal) => !sourceText.includes(literal))
  return reportCheck(
    'shell-route-literals',
    missing.length === 0,
    missing.length === 0 ? [`count=${requiredLiterals.length}`] : [`missing=${missing.join(',')}`],
  )
}

function verifyResourceCount(db) {
  const rows = queryRows(
    db,
    `SELECT resource_type, COUNT(*) AS count
     FROM sys_training_resource
     WHERE module_code = 'emotional' AND is_active = 1
     GROUP BY resource_type`,
  )

  const counts = new Map(rows.map((row) => [String(row.resource_type), Number(row.count || 0)]))
  const emotionSceneCount = counts.get('emotion_scene') || 0
  const careSceneCount = counts.get('care_scene') || 0

  return reportCheck(
    'resource-count',
    emotionSceneCount > 0 && careSceneCount > 0,
    [`emotion_scene=${emotionSceneCount}`, `care_scene=${careSceneCount}`],
  )
}

function verifyPersistenceChain(db) {
  const rows = queryRows(
    db,
    `SELECT
       ets.id AS session_id,
       ets.student_id,
       ets.sub_module,
       ets.resource_type AS session_resource_type,
       ets.completion_status,
       tr.id AS training_record_id,
       tr.resource_type AS training_resource_type,
       tr.session_type,
       (
         SELECT COUNT(*)
         FROM emotional_training_detail d
         WHERE d.session_id = ets.id
       ) AS detail_count
     FROM emotional_training_session ets
     INNER JOIN training_records tr ON tr.id = ets.training_record_id
     WHERE ets.module_code = 'emotional'
     ORDER BY ets.id DESC
     LIMIT 20`,
  )

  if (rows.length === 0) {
    return reportCheck('persistence-chain', false, ['no emotional sessions found'])
  }

  const failures = rows.filter((row) => {
    const sessionResourceType = String(row.session_resource_type || '')
    const trainingResourceType = String(row.training_resource_type || '')
    const sessionType = String(row.session_type || '')
    const subModule = String(row.sub_module || '')
    const detailCount = Number(row.detail_count || 0)

    return (
      sessionResourceType !== trainingResourceType ||
      sessionType !== subModule ||
      detailCount <= 0
    )
  })

  return reportCheck(
    'persistence-chain',
    failures.length === 0,
    failures.length === 0
      ? [`checked=${rows.length}`]
      : failures.slice(0, 5).map((row) => `session=${row.session_id},record=${row.training_record_id}`),
  )
}

function collectCompletedReportPointerState(db) {
  const completedRows = queryRows(
    db,
    `SELECT student_id, training_record_id, id AS session_id
     FROM emotional_training_session
     WHERE module_code = 'emotional' AND completion_status = 'completed'
     ORDER BY id DESC`,
  )

  if (completedRows.length === 0) {
    return {
      latestCompletedByStudent: new Map(),
      reportsByStudent: new Map(),
      mismatches: ['no completed emotional sessions found'],
    }
  }

  const latestCompletedByStudent = new Map()
  for (const row of completedRows) {
    const studentId = Number(row.student_id || 0)
    if (!latestCompletedByStudent.has(studentId)) {
      latestCompletedByStudent.set(studentId, {
        trainingRecordId: Number(row.training_record_id || 0),
        sessionId: Number(row.session_id || 0),
      })
    }
  }

  const reportRows = queryRows(
    db,
    `SELECT id, student_id, training_record_id
     FROM report_record
     WHERE report_type = 'emotional'`,
  )
  const reportsByStudent = new Map(
    reportRows.map((row) => [
      Number(row.student_id || 0),
      {
        reportId: Number(row.id || 0),
        trainingRecordId: Number(row.training_record_id || 0),
      },
    ]),
  )

  const mismatches = []
  for (const [studentId, latestCompleted] of latestCompletedByStudent.entries()) {
    const report = reportsByStudent.get(studentId)
    if (!report || report.trainingRecordId !== latestCompleted.trainingRecordId) {
      mismatches.push(
        `student=${studentId},expected=${latestCompleted.trainingRecordId},actual=${report?.trainingRecordId || 'none'}`,
      )
    }
  }

  return {
    latestCompletedByStudent,
    reportsByStudent,
    mismatches,
  }
}

function repairCompletedReportPointers(db) {
  const state = collectCompletedReportPointerState(db)
  if (state.mismatches.length === 0) {
    return { repaired: 0, state }
  }

  db.run('BEGIN TRANSACTION')
  try {
    let repaired = 0

    for (const [studentId, latestCompleted] of state.latestCompletedByStudent.entries()) {
      const report = state.reportsByStudent.get(studentId)
      if (report?.trainingRecordId === latestCompleted.trainingRecordId) {
        continue
      }

      const trainingRecord = queryRows(
        db,
        `SELECT tr.class_id, tr.class_name, st.name AS student_name
         FROM training_records tr
         LEFT JOIN student st ON st.id = tr.student_id
         WHERE tr.id = ?
         LIMIT 1`,
        [latestCompleted.trainingRecordId],
      )[0]

      const reportTitle = `${trainingRecord?.student_name || `学生${studentId}`} - 情绪行为调节训练报告`
      const classId = trainingRecord?.class_id || null
      const className = trainingRecord?.class_name || null

      if (report?.reportId) {
        db.run(
          `UPDATE report_record
           SET training_record_id = ?, title = ?, class_id = ?, class_name = ?,
               module_code = 'emotional', created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [latestCompleted.trainingRecordId, reportTitle, classId, className, report.reportId],
        )
      } else {
        db.run(
          `INSERT INTO report_record (
             student_id, report_type, training_record_id, title,
             class_id, class_name, module_code, created_at, updated_at
           ) VALUES (?, 'emotional', ?, ?, ?, ?, 'emotional', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [studentId, latestCompleted.trainingRecordId, reportTitle, classId, className],
        )
      }

      repaired += 1
    }

    db.run('COMMIT')
    return { repaired, state }
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  }
}

function verifyCompletedReportPointer(db) {
  const state = collectCompletedReportPointerState(db)

  return reportCheck(
    'completed-report-pointer',
    state.mismatches.length === 0,
    state.mismatches.length === 0
      ? [`students=${state.latestCompletedByStudent.size}`]
      : state.mismatches.slice(0, 5),
  )
}

async function main() {
  const { dbPath, repairReportPointers } = parseArgs(process.argv)
  const db = await loadDatabase(dbPath)

  console.log(`DB ${dbPath}`)

  if (repairReportPointers) {
    const repairResult = repairCompletedReportPointers(db)
    if (repairResult.repaired > 0) {
      saveDatabase(db, dbPath)
      console.log(`PASS repaired-report-pointers count=${repairResult.repaired}`)
    }
  }

  const checks = [
    verifyShellRouteLiterals(),
    verifyResourceCount(db),
    verifyPersistenceChain(db),
    verifyCompletedReportPointer(db),
  ]

  db.close()

  if (checks.every(Boolean)) {
    process.exit(0)
  }

  process.exit(1)
}

main().catch((error) => {
  console.error(`FAIL verifier ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
