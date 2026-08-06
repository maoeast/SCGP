#!/usr/bin/env node
/**
 * SCGP 模拟演示数据：生成（seed）/ 导出（export）/ 导入（import）
 *
 * 用法：
 *   node scripts/seed-demo-data.mjs seed   --db <database.sqlite> [--seed <number>] [--dry-run] [--summary]
 *   node scripts/seed-demo-data.mjs export --db <database.sqlite> --out <file.json>
 *   node scripts/seed-demo-data.mjs import --db <database.sqlite> --in <file.json> [--dry-run]
 *
 * 说明：
 * - seed：向目标 DB（应用 userData/database.sqlite）写入演示数据。
 *   演示数据使用固定高段位 id（见 data.mjs ID_RANGES），可重复执行（先清理旧演示数据）。
 * - export：从 DB 导出演示数据（按 id 区间识别）为 JSON 文件，供跨环境导入。
 * - import：把导出的 JSON 导入到另一台机器的 DB。
 * - 数据规模：22 名学生 / 7 个班（大班~初三）/ 5 名教师 / 每生 2-4 个量表评估
 *   （含纵向前后测体现训练进步）/ 训练计划 / 近 3 个月训练记录。
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

import {
  ACADEMIC_YEARS,
  CLASSES,
  CLASS_TEACHER_MAP,
  DEMO_DATE,
  DIAGNOSIS_PROFILES,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_ENVIRONMENTS,
  EMOTION_SCENE_SUB_MODULES,
  GAME_CODES_BY_STAGE,
  ID_RANGES,
  PLAN_TEMPLATES,
  SCALE_GENERATORS,
  SCALE_REPORT_MODULE,
  SCALE_TITLES,
  STUDENTS,
  TEACHERS,
  TRAINING_COMMENTS,
  buildAssessmentPlan,
  buildPlansForStudent,
  createRng,
  isoToDate,
  pickAssessmentDate,
  pickTrainingDate,
  stageOf,
  toIso,
} from './seed-demo-data/data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')

// ============================================================================
// CLI 解析
// ============================================================================

function parseArgs(argv) {
  const args = { command: null, db: null, out: null, in: null, seed: 20260806, dryRun: false, summary: false }
  const positional = []
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--db') args.db = argv[++i]
    else if (arg === '--out') args.out = argv[++i]
    else if (arg === '--in') args.in = argv[++i]
    else if (arg === '--seed') args.seed = Number(argv[++i])
    else if (arg === '--dry-run') args.dryRun = true
    else if (arg === '--summary') args.summary = true
    else if (arg.startsWith('--')) throw new Error(`未知参数: ${arg}`)
    else positional.push(arg)
  }
  args.command = positional[0] || null
  return args
}

// ============================================================================
// sql.js 初始化与 DB 打开
// ============================================================================

let SQL = null

async function initSql() {
  if (SQL) return SQL
  const initSqlJs = (await import('sql.js')).default
  const wasmPath = path.join(REPO_ROOT, 'node_modules', 'sql.js', 'dist')
  SQL = await initSqlJs({ locateFile: (file) => path.join(wasmPath, file) })
  return SQL
}

function openDb(sql, dbPath) {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`数据库文件不存在: ${dbPath}\n请先启动应用完成初始化，或用截图系统的 fixture 生成一份空库。`)
  }
  const buffer = fs.readFileSync(dbPath)
  return new sql.Database(buffer)
}

function closeDb(db, dbPath) {
  const data = db.export()
  fs.writeFileSync(dbPath, Buffer.from(data))
  db.close()
}

function checkTables(db, tableNames) {
  const missing = tableNames.filter((name) => {
    const row = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`)
    return !row.length || row[0].values.length === 0
  })
  if (missing.length) {
    throw new Error(`目标库缺少表: ${missing.join(', ')}\n请确认 --db 指向的是 SCGP 应用初始化过的 database.sqlite。`)
  }
}

// ============================================================================
// 密码（与 src/utils/password-security.ts 同算法：PBKDF2-SHA256 600k 次）
// ============================================================================

function hashPassword(password, saltHex) {
  const derived = crypto.pbkdf2Sync(password, Buffer.from(saltHex, 'hex'), 600_000, 32, 'sha256')
  return `pbkdf2-sha256-v1$600000$${derived.toString('hex')}`
}

function randomSaltHex() {
  return crypto.randomBytes(16).toString('hex')
}

// ============================================================================
// 工具
// ============================================================================

function nowSql() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function ageInMonths(birthdayIso, refIso = DEMO_DATE) {
  const birth = isoToDate(birthdayIso)
  const ref = isoToDate(refIso)
  let months = (ref.getFullYear() - birth.getFullYear()) * 12 + (ref.getMonth() - birth.getMonth())
  if (ref.getDate() < birth.getDate()) months -= 1
  return months
}

function enrichStudents() {
  return STUDENTS.map((student) => {
    const classRow = CLASSES.find((c) => c.id === student.class_id)
    return {
      ...student,
      ageMonths: ageInMonths(student.birthday),
      gradeLevel: classRow.grade_level,
      className: classRow.name,
    }
  })
}

function quote(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

function insertRow(db, table, row) {
  const keys = Object.keys(row)
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map((k) => quote(row[k])).join(', ')})`
  db.run(sql)
  return db.exec('SELECT last_insert_rowid() AS id')[0]?.values[0]?.[0] ?? null
}

function countTable(db, table) {
  const result = db.exec(`SELECT COUNT(*) FROM ${table}`)
  return result[0]?.values[0]?.[0] ?? 0
}

function demoIdIn(values) {
  return values.join(', ')
}

/** 区间 → BETWEEN 条件（ID_RANGES 每项是 [start, end]） */
function between(ids) {
  return `BETWEEN ${ids[0]} AND ${ids[1]}`
}

// ============================================================================
// 幂等清理（先子表后主表；只清演示 id 区间）
// ============================================================================

function clearDemoData(db, rng) {
  const studentIds = demoIdIn(ID_RANGES.student)
  const studentBetween = between(ID_RANGES.student)
  const plans = between(ID_RANGES.plan)
  const classes = between(ID_RANGES.class)
  const users = between(ID_RANGES.user)
  const reports = between(ID_RANGES.report)
  const assesses = between(ID_RANGES.assess)
  const records = between(ID_RANGES.trainingRecord)
  const equipment = between(ID_RANGES.equipmentRecord)
  const emotion = between(ID_RANGES.emotionSession)
  const games = between(ID_RANGES.gameRecord)
  const sessions = between(ID_RANGES.trainingSession)

  // 训练链路
  db.run(`DELETE FROM training_session WHERE id ${sessions}`)
  db.run(`DELETE FROM game_session_participants WHERE student_id ${studentBetween}`)
  db.run(`DELETE FROM game_emotion_records WHERE id ${games}`)
  db.run(`DELETE FROM emotional_training_detail WHERE session_id IN (SELECT id FROM emotional_training_session WHERE id ${emotion})`)
  db.run(`DELETE FROM emotional_training_session WHERE id ${emotion}`)
  db.run(`DELETE FROM equipment_training_records WHERE id ${equipment}`)
  db.run(`DELETE FROM training_records WHERE id ${records}`)

  // 报告与评估
  db.run(`DELETE FROM report_record WHERE id ${reports} OR student_id ${studentBetween}`)
  const detailTables = ['sm_assess_detail', 'weefim_assess_detail', 'csirs_assess_detail', 'cnbsr2016_assess_detail', 'fine_motor_assess_detail']
  for (const detailTable of detailTables) {
    db.run(`DELETE FROM ${detailTable} WHERE assess_id ${assesses}`)
  }
  const assessTables = ['sm_assess', 'weefim_assess', 'csirs_assess', 'cnbsr2016_assess', 'fine_motor_assess', 'crt_assess', 'srs2_assess', 'conners_psq_assess', 'sdq_assess', 'cbcl_assess', 'brief_assess']
  for (const table of assessTables) {
    db.run(`DELETE FROM ${table} WHERE id ${assesses} OR student_id ${studentBetween}`)
  }

  // 计划
  db.run(`DELETE FROM sys_plan_resource_map WHERE plan_id ${plans}`)
  db.run(`DELETE FROM sys_training_plan WHERE id ${plans} OR student_id ${studentBetween}`)

  // 班级与学生
  db.run(`DELETE FROM student_class_history WHERE student_id ${studentBetween}`)
  db.run(`DELETE FROM sys_class_teachers WHERE class_id ${classes}`)
  db.run(`DELETE FROM student WHERE id ${studentBetween}`)
  db.run(`DELETE FROM sys_class WHERE id ${classes}`)
  db.run(`DELETE FROM user WHERE id ${users}`)

  // 学年：INSERT OR IGNORE 保幂等，不清理（避免误伤其他学年数据）
}

// ============================================================================
// seed 各段
// ============================================================================

function seedAcademicYears(db) {
  for (const year of ACADEMIC_YEARS) {
    db.run(
      `INSERT OR IGNORE INTO sys_academic_year (academic_year, start_date, end_date, is_active)
       VALUES (${quote(year.academic_year)}, ${quote(year.start_date)}, ${quote(year.end_date)}, ${year.is_active})`,
    )
  }
}

function seedClasses(db) {
  for (const classRow of CLASSES) {
    db.run(
      `INSERT INTO sys_class (id, name, grade_level, class_number, academic_year, max_students, current_enrollment, status)
       VALUES (${classRow.id}, ${quote(classRow.name)}, ${classRow.grade_level}, ${classRow.class_number},
               ${quote(classRow.academic_year)}, ${classRow.max_students}, 0, 1)`,
    )
  }
}

function seedUsers(db) {
  for (const teacher of TEACHERS) {
    const salt = randomSaltHex()
    const passwordHash = hashPassword('admin123', salt)
    db.run(
      `INSERT INTO user (id, username, password_hash, salt, role, name, email, is_active, created_at, updated_at)
       VALUES (${teacher.id}, ${quote(teacher.username)}, ${quote(passwordHash)}, ${quote(salt)}, 'teacher',
               ${quote(teacher.name)}, ${quote(teacher.email)}, 1, ${quote(nowSql())}, ${quote(nowSql())})`,
    )
  }
}

function seedStudents(db, students) {
  for (const student of students) {
    const classRow = CLASSES.find((c) => c.id === student.class_id)
    db.run(
      `INSERT INTO student (id, name, gender, birthday, student_no, disorder, avatar_path,
                            current_class_id, current_class_name, created_at, updated_at)
       VALUES (${student.id}, ${quote(student.name)}, ${quote(student.gender)}, ${quote(student.birthday)},
               ${quote(student.student_no)}, ${quote(student.disorder)}, NULL,
               ${classRow.id}, ${quote(classRow.name)}, ${quote(nowSql())}, ${quote(nowSql())})`,
    )
    // 入班（触发器自动更新 current_enrollment）
    db.run(
      `INSERT INTO student_class_history (student_id, student_name, class_id, class_name, academic_year, enrollment_date, is_current)
       VALUES (${student.id}, ${quote(student.name)}, ${classRow.id}, ${quote(classRow.name)},
               ${quote(classRow.academic_year)}, '2026-09-01', 1)`,
    )
  }
}

function seedClassTeachers(db) {
  for (const [classId, teacherIds] of Object.entries(CLASS_TEACHER_MAP)) {
    for (const teacherId of teacherIds) {
      db.run(
        `INSERT INTO sys_class_teachers (class_id, teacher_id, assigned_by)
         VALUES (${Number(classId)}, ${teacherId}, 1)`,
      )
    }
  }
}

// CSIRS 58 题维度分布（与 csirs-questions.ts 一致：1-14 前庭 / 15-35 触觉 / 36-47 身体感知 / 48-55 视听 / 56-58 执行）
const CSIRS_CODE_BY_NAME = Object.freeze({
  前庭觉调节与运动规划: 'vestibular',
  触觉调节与情绪行为: 'tactile',
  身体感知与动作协调: 'proprioception',
  视听知觉与学业表现: 'learning',
  执行功能与社会适应: 'executive',
})

function csirsDimensionForQuestion(qid) {
  if (qid <= 14) return '前庭觉调节与运动规划'
  if (qid <= 35) return '触觉调节与情绪行为'
  if (qid <= 47) return '身体感知与动作协调'
  if (qid <= 55) return '视听知觉与学业表现'
  return '执行功能与社会适应'
}

function seedAssessmentDetails(db, scale, assessId, student, rng) {
  if (scale === 'csirs') {
    const row = db.exec(`SELECT t_scores FROM csirs_assess WHERE id = ${assessId}`)
    if (!row.length) return
    const tScores = JSON.parse(row[0].values[0][0])
    for (let qid = 1; qid <= 58; qid += 1) {
      const dim = csirsDimensionForQuestion(qid)
      const code = CSIRS_CODE_BY_NAME[dim]
      const t = tScores[code] ?? 50
      const score = clampInt(1, 5, Math.round((t - 15) / 11) + 1)
      db.run(
        `INSERT INTO csirs_assess_detail (assess_id, question_id, dimension, score, answer_time)
         VALUES (${assessId}, ${qid}, ${quote(dim)}, ${score}, ${rng.int(1500, 8000)})`,
      )
    }
  } else if (scale === 'weefim') {
    const row = db.exec(`SELECT adl_score, cognitive_score FROM weefim_assess WHERE id = ${assessId}`)
    if (!row.length) return
    const adl = row[0].values[0][0]
    const cognitive = row[0].values[0][1]
    for (let qid = 1; qid <= 13; qid += 1) {
      const score = clampInt(1, 7, Math.round(adl / 13))
      db.run(
        `INSERT INTO weefim_assess_detail (assess_id, question_id, score, answer_time)
         VALUES (${assessId}, ${qid}, ${score}, ${rng.int(1000, 6000)})`,
      )
    }
    for (let qid = 14; qid <= 18; qid += 1) {
      const score = clampInt(1, 7, Math.round(cognitive / 5))
      db.run(
        `INSERT INTO weefim_assess_detail (assess_id, question_id, score, answer_time)
         VALUES (${assessId}, ${qid}, ${score}, ${rng.int(1000, 6000)})`,
      )
    }
  }
}

function clampInt(min, max, value) {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function seedAssessments(db, students, rng) {
  const results = [] // { student, scale, assessId, reportId, date }
  let assessSeq = ID_RANGES.assess[0]
  let reportSeq = ID_RANGES.report[0]

  for (const student of students) {
    const plan = buildAssessmentPlan(student, rng)
    const studentAssessments = []
    for (const { scale, times } of plan) {
      const generator = SCALE_GENERATORS[scale]
      const occurrences = times === 2
        ? [
            { longitudinal: true, isFollowUp: false, improvement: 1 },
            { longitudinal: true, isFollowUp: true, improvement: 0.35 },
          ]
        : [{ longitudinal: false, isFollowUp: false, improvement: 1 }]
      for (const occurrence of occurrences) {
        const date = pickAssessmentDate(rng, occurrence)
        const generated = generator(student, rng, { date, improvement: occurrence.improvement })
        const row = { id: assessSeq, ...generated.row }
        insertRow(db, generated.table, row)
        seedAssessmentDetails(db, scale, assessSeq, student, rng)
        const moduleCode = SCALE_REPORT_MODULE[scale]
        const classRow = CLASSES.find((c) => c.id === student.class_id)
        db.run(
          `INSERT INTO report_record (id, student_id, report_type, assess_id, title, class_id, class_name, module_code, created_at, updated_at)
           VALUES (${reportSeq}, ${student.id}, ${quote(scale)}, ${assessSeq},
                   ${quote(`${student.name} - ${SCALE_TITLES[scale]}评估报告`)},
                   ${classRow.id}, ${quote(classRow.name)}, ${quote(moduleCode)},
                   ${quote(nowSql())}, ${quote(nowSql())})`,
        )
        studentAssessments.push({ scale, assessId: assessSeq, reportId: reportSeq, date: toIso(date) })
        assessSeq += 1
        reportSeq += 1
      }
    }
    results.push({ student, assessments: studentAssessments })
  }
  return results
}

function pickResourcesByType(db, types, limit = 30) {
  const placeholders = types.map(() => '?').join(', ')
  const result = db.exec(
    `SELECT id, name, resource_type FROM sys_training_resource
     WHERE is_active = 1 AND resource_type IN (${placeholders})
     ORDER BY id LIMIT ${limit}`,
    types,
  )
  if (!result.length) return []
  return result[0].values.map(([id, name, type]) => ({ id, name, type }))
}

function pickResourcesByModule(db, modules, limit = 30) {
  const placeholders = modules.map(() => '?').join(', ')
  const result = db.exec(
    `SELECT id, name, module_code FROM sys_training_resource
     WHERE is_active = 1 AND module_code IN (${placeholders})
     ORDER BY id LIMIT ${limit}`,
    modules,
  )
  if (!result.length) return []
  return result[0].values.map(([id, name, module]) => ({ id, name, module }))
}

const PLAN_RESOURCE_TYPES = ['equipment', 'game', 'flashcard', 'emotion_scene', 'care_scene', 'self_care_task']

const PLAN_NOTES = [
  '训练时先示范，再辅助完成，逐步撤除辅助',
  '完成后给予即时正强化，注意观察儿童情绪状态',
  '如遇抗拒可降低难度，分步完成',
  '每次训练后记录完成情况，及时反馈',
  '可结合家庭环境开展泛化练习',
]

function seedPlans(db, students, assessmentResults, rng) {
  let planSeq = ID_RANGES.plan[0]
  const resourcePool = pickResourcesByType(db, PLAN_RESOURCE_TYPES, 40)
  if (!resourcePool.length) {
    throw new Error('目标库没有可用训练资源（sys_training_resource），无法生成训练计划')
  }
  for (const { student, assessments } of assessmentResults) {
    const plans = buildPlansForStudent(student, rng, assessments)
    for (const plan of plans) {
      const template = plan.template
      db.run(
        `INSERT INTO sys_training_plan (id, name, student_id, module_code, start_date, end_date, status,
                                        long_term_goals, short_term_goals, description, source, source_assessment_id, is_active,
                                        created_at, updated_at)
         VALUES (${planSeq}, ${quote(template.name(student.name))}, ${student.id}, ${quote(template.module_code)},
                 ${quote(plan.start_date)}, ${quote(plan.end_date)}, ${quote(plan.status)},
                 ${quote(JSON.stringify(template.goals(student.disorder)))},
                 ${quote(JSON.stringify(template.shortGoals(student.disorder)))},
                 ${quote(`基于 ${student.name} 的能力评估结果制定的个性化训练计划`)},
                 ${plan.source_assessment_id ? quote('assessment') : 'NULL'},
                 ${plan.source_assessment_id ?? 'NULL'}, 1, ${quote(nowSql())}, ${quote(nowSql())})`,
      )
      // 计划资源：随机 2-4 个
      const resourceCount = rng.int(2, Math.min(4, resourcePool.length))
      const chosen = rng.shuffle(resourcePool).slice(0, resourceCount)
      let sortOrder = 0
      for (const resource of chosen) {
        db.run(
          `INSERT INTO sys_plan_resource_map (plan_id, resource_id, frequency, duration_minutes, notes, sort_order, created_at)
           VALUES (${planSeq}, ${resource.id}, ${rng.int(3, 5)}, ${rng.int(15, 30)},
                   ${quote(rng.pick(PLAN_NOTES))}, ${sortOrder}, ${quote(nowSql())})`,
        )
        sortOrder += 1
      }
      planSeq += 1
    }
  }
  return planSeq
}

// ============================================================================
// 训练记录
// ============================================================================

function seedTrainingRecords(db, students, rng) {
  let recordSeq = ID_RANGES.trainingRecord[0]
  let equipmentSeq = ID_RANGES.equipmentRecord[0]
  let emotionSeq = ID_RANGES.emotionSession[0]
  let gameSeq = ID_RANGES.gameRecord[0]
  let sessionSeq = ID_RANGES.trainingSession[0]

  // 资源池
  const equipmentPool = pickResourcesByType(db, ['equipment'], 40)
  const emotionScenePool = pickResourcesByType(db, ['emotion_scene', 'care_scene'], 40)
  const sensoryGames = pickResourcesByModule(db, ['sensory', 'cognitive'], 60)

  for (const student of students) {
    const stage = stageOf(student)
    const gameCodes = GAME_CODES_BY_STAGE[stage]
    const className = CLASSES.find((c) => c.id === student.class_id).name

    // ---- 感官/游戏训练（training_records + training_session）----
    const sensoryCount = rng.int(8, 14)
    for (let i = 0; i < sensoryCount; i += 1) {
      const { date, iso, timestampMs } = pickTrainingDate(rng)
      const accuracy = clampNumber(0.55, 1, 0.78 + rng.float(-0.12, 0.12) - (DIAGNOSIS_PROFILES[student.disorder]?.crt || 0) * 0.003)
      const duration = rng.int(60, 240)
      const entryCode = rng.pick(gameCodes)
      const roundCount = rng.int(5, 15)
      const correctCount = Math.round(roundCount * accuracy)
      const rawData = {
        rounds: roundCount,
        correctCount,
        totalCount: roundCount,
        hintsUsed: rng.int(0, 4),
        errors: roundCount - correctCount,
        avgTimePerRound: rng.int(800, 4000),
      }
      const trainingRecordId = recordSeq
      db.run(
        `INSERT INTO training_records (id, student_id, task_id, resource_id, resource_type, session_type,
                                       entry_code, timestamp, duration, accuracy_rate, avg_response_time, raw_data,
                                       class_id, class_name, module_code, created_at)
         VALUES (${recordSeq}, ${student.id}, NULL, NULL, 'game', 'game', ${quote(entryCode)},
                 ${timestampMs}, ${duration}, ${accuracy.toFixed(4)}, ${rng.int(900, 4500)},
                 ${quote(JSON.stringify(rawData))}, ${student.class_id}, ${quote(className)}, 'sensory', ${quote(nowSql())})`,
      )
      db.run(
        `INSERT INTO training_session (id, student_id, module_code, entry_code, session_family, resource_id, resource_type,
                                       task_id, task_name_snapshot, class_id, class_name, started_at, ended_at, duration_ms,
                                       completion_status, accuracy_rate, avg_response_time_ms, summary_payload,
                                       source_table, source_record_id, created_at, updated_at)
         VALUES (${sessionSeq}, ${student.id}, 'sensory', ${quote(entryCode)}, 'game', NULL, 'game',
                 NULL, ${quote(entryCode)}, ${student.class_id}, ${quote(className)},
                 '${iso} 10:00:00', '${iso} 10:05:00', ${duration * 1000},
                 'completed', ${accuracy.toFixed(4)}, ${rng.int(900, 4500)},
                 ${quote(JSON.stringify(rawData))}, 'training_records', ${trainingRecordId},
                 ${quote(nowSql())}, ${quote(nowSql())})`,
      )
      recordSeq += 1
      sessionSeq += 1
    }

    // ---- 器材训练（equipment_training_records + training_session）----
    if (equipmentPool.length) {
      const equipmentCount = rng.int(3, 6)
      for (let i = 0; i < equipmentCount; i += 1) {
        const { date, iso } = pickTrainingDate(rng)
        const equipment = rng.pick(equipmentPool)
        const score = rng.int(2, 5)
        const promptLevel = clampInt(1, 5, 6 - score + rng.int(0, 1))
        const equipmentId = equipmentSeq
        const teacher = TEACHERS[rng.int(0, TEACHERS.length - 1)]
        db.run(
          `INSERT INTO equipment_training_records (id, student_id, equipment_id, entry_code, score, prompt_level,
                                                   duration_seconds, notes, generated_comment, training_date,
                                                   teacher_name, environment, batch_id, module_code, created_at)
           VALUES (${equipmentSeq}, ${student.id}, ${equipment.id}, 'equipment', ${score}, ${promptLevel},
                   ${rng.int(300, 1200)}, ${quote('器材训练')}, ${quote(rng.pick(TRAINING_COMMENTS))},
                   ${quote(iso)}, ${quote(teacher.name)}, ${quote(rng.pick(EQUIPMENT_ENVIRONMENTS))}, NULL, 'sensory',
                   ${quote(nowSql())})`,
        )
        db.run(
          `INSERT INTO training_session (id, student_id, module_code, entry_code, session_family, resource_id, resource_type,
                                         task_id, task_name_snapshot, class_id, class_name, started_at, ended_at, duration_ms,
                                         completion_status, accuracy_rate, avg_response_time_ms, summary_payload,
                                         source_table, source_record_id, created_at, updated_at)
           VALUES (${sessionSeq}, ${student.id}, 'sensory', 'equipment', 'equipment', ${equipment.id}, 'equipment',
                   NULL, ${quote(equipment.name)}, ${student.class_id}, ${quote(className)},
                   '${iso} 09:00:00', '${iso} 09:10:00', ${rng.int(300, 1200) * 1000},
                   'completed', ${(score / 5).toFixed(4)}, ${rng.int(800, 3000)},
                   ${quote(JSON.stringify({ score, promptLevel }))}, 'equipment_training_records', ${equipmentId},
                   ${quote(nowSql())}, ${quote(nowSql())})`,
        )
        equipmentSeq += 1
        sessionSeq += 1
      }
    }

    // ---- 情绪场景训练（training_records + emotional_training_session + training_session）----
    if (emotionScenePool.length && stage !== 'middle') {
      const emotionCount = rng.int(3, 5)
      for (let i = 0; i < emotionCount; i += 1) {
        const { date, iso, timestampMs } = pickTrainingDate(rng)
        const scene = rng.pick(emotionScenePool)
        const subModule = rng.pick(EMOTION_SCENE_SUB_MODULES)
        const questionCount = rng.int(3, 8)
        const accuracy = clampNumber(0.5, 1, 0.7 + rng.float(-0.1, 0.15))
        const correctCount = Math.round(questionCount * accuracy)
        const hintCount = rng.int(0, 3)
        const retryCount = rng.int(0, 2)
        const rawData = { questionCount, correctCount, hintCount, retryCount }
        const trainingRecordId = recordSeq
        db.run(
          `INSERT INTO training_records (id, student_id, task_id, resource_id, resource_type, session_type,
                                         entry_code, timestamp, duration, accuracy_rate, avg_response_time, raw_data,
                                         class_id, class_name, module_code, created_at)
           VALUES (${recordSeq}, ${student.id}, NULL, ${scene.id}, ${quote(scene.type)}, ${quote(subModule)},
                 ${quote(`E_${scene.type.toUpperCase()}_${scene.id}`)}, ${timestampMs}, ${rng.int(120, 600)},
                 ${accuracy.toFixed(4)}, ${rng.int(1200, 6000)}, ${quote(JSON.stringify(rawData))},
                 ${student.class_id}, ${quote(className)}, 'emotional', ${quote(nowSql())})`,
        )
        db.run(
          `INSERT INTO emotional_training_session (id, training_record_id, student_id, module_code, sub_module,
                                                   resource_id, resource_type, start_time, end_time, duration_ms,
                                                   question_count, correct_count, accuracy_rate, hint_count, retry_count,
                                                   completion_status, created_at)
           VALUES (${emotionSeq}, ${trainingRecordId}, ${student.id}, 'emotional', ${quote(subModule)},
                   ${scene.id}, ${quote(scene.type)}, '${iso} 14:00:00', '${iso} 14:10:00', ${rng.int(120, 600) * 1000},
                   ${questionCount}, ${correctCount}, ${accuracy.toFixed(4)}, ${hintCount}, ${retryCount},
                   'completed', ${quote(nowSql())})`,
        )
        db.run(
          `INSERT INTO training_session (id, student_id, module_code, entry_code, session_family, resource_id, resource_type,
                                         task_id, task_name_snapshot, class_id, class_name, started_at, ended_at, duration_ms,
                                         completion_status, accuracy_rate, avg_response_time_ms, summary_payload,
                                         source_table, source_record_id, created_at, updated_at)
           VALUES (${sessionSeq}, ${student.id}, 'emotional', ${quote(`E_${scene.type.toUpperCase()}_${scene.id}`)}, ${quote(subModule)},
                   ${scene.id}, ${quote(scene.type)}, NULL, ${quote(scene.name)}, ${student.class_id}, ${quote(className)},
                   '${iso} 14:00:00', '${iso} 14:10:00', ${rng.int(120, 600) * 1000},
                   'completed', ${accuracy.toFixed(4)}, ${rng.int(1200, 6000)},
                   ${quote(JSON.stringify(rawData))}, 'training_records', ${trainingRecordId},
                   ${quote(nowSql())}, ${quote(nowSql())})`,
        )
        recordSeq += 1
        emotionSeq += 1
        sessionSeq += 1
      }
    }

    // ---- 情绪游戏（game_emotion_records + training_session，部分学生）----
    if (stage !== 'middle' && rng.rand() < 0.7) {
      const gameCount = rng.int(1, 3)
      for (let i = 0; i < gameCount; i += 1) {
        const { date, iso } = pickTrainingDate(rng)
        const gameCode = rng.pick(GAME_CODES_BY_STAGE[stage])
        const difficulty = rng.int(1, 2)
        const performance = {
          score: rng.int(40, 100),
          maxScore: 100,
          rounds: rng.int(3, 10),
          stars: rng.int(1, 3),
          difficulty,
        }
        const gameId = gameSeq
        db.run(
          `INSERT INTO game_emotion_records (id, student_id, game_code, start_time, duration_ms, difficulty_level,
                                             completion_status, performance_data, exit_trigger, created_at)
           VALUES (${gameSeq}, ${student.id}, ${quote(gameCode)}, '${iso} 15:00:00', ${rng.int(120000, 600000)},
                   ${difficulty}, 'completed', ${quote(JSON.stringify(performance))}, 'game_complete', ${quote(nowSql())})`,
        )
        db.run(
          `INSERT INTO training_session (id, student_id, module_code, entry_code, session_family, resource_id, resource_type,
                                         task_id, task_name_snapshot, class_id, class_name, started_at, ended_at, duration_ms,
                                         completion_status, accuracy_rate, avg_response_time_ms, summary_payload,
                                         source_table, source_record_id, created_at, updated_at)
           VALUES (${sessionSeq}, ${student.id}, 'emotional', ${quote(gameCode)}, 'game', NULL, 'game',
                   NULL, ${quote(gameCode)}, ${student.class_id}, ${quote(className)},
                   '${iso} 15:00:00', '${iso} 15:10:00', ${rng.int(120000, 600000)},
                   'completed', ${(performance.score / 100).toFixed(4)}, ${rng.int(800, 4000)},
                   ${quote(JSON.stringify(performance))}, 'game_emotion_records', ${gameId},
                   ${quote(nowSql())}, ${quote(nowSql())})`,
        )
        gameSeq += 1
        sessionSeq += 1
      }
    }
  }

  return { recordSeq, equipmentSeq, emotionSeq, gameSeq, sessionSeq }
}

function clampNumber(min, max, value) {
  return Math.min(max, Math.max(min, value))
}

// ============================================================================
// seed 主流程
// ============================================================================

function runSeed(db, args) {
  const rng = createRng(args.seed)
  const students = enrichStudents()

  checkTables(db, [
    'student', 'user', 'sys_class', 'student_class_history', 'sys_class_teachers', 'sys_academic_year',
    'sm_assess', 'weefim_assess', 'csirs_assess', 'cnbsr2016_assess', 'fine_motor_assess', 'crt_assess',
    'srs2_assess', 'conners_psq_assess', 'sdq_assess', 'cbcl_assess', 'brief_assess',
    'report_record', 'sys_training_plan', 'sys_plan_resource_map', 'sys_training_resource',
    'training_records', 'equipment_training_records', 'emotional_training_session', 'game_emotion_records',
    'training_session',
  ])

  db.run('BEGIN')
  try {
    clearDemoData(db)
    seedAcademicYears(db)
    seedClasses(db)
    seedUsers(db)
    seedStudents(db, students)
    seedClassTeachers(db)
    const assessmentResults = seedAssessments(db, students, rng)
    const planEnd = seedPlans(db, students, assessmentResults, rng)
    const recordEnds = seedTrainingRecords(db, students, rng)
    db.run('COMMIT')

    const summary = {
      academicYears: countTable(db, 'sys_academic_year'),
      classes: countTable(db, 'sys_class'),
      users: countTable(db, 'user'),
      students: countTable(db, 'student'),
      assessments: assessmentResults.reduce((s, r) => s + r.assessments.length, 0),
      reports: countTable(db, 'report_record'),
      plans: planEnd - ID_RANGES.plan[0],
      planResourceMaps: countTable(db, 'sys_plan_resource_map'),
      trainingRecords: recordEnds.recordSeq - ID_RANGES.trainingRecord[0],
      equipmentRecords: recordEnds.equipmentSeq - ID_RANGES.equipmentRecord[0],
      emotionSessions: recordEnds.emotionSeq - ID_RANGES.emotionSession[0],
      gameRecords: recordEnds.gameSeq - ID_RANGES.gameRecord[0],
      trainingSessions: recordEnds.sessionSeq - ID_RANGES.trainingSession[0],
    }
    return summary
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  }
}

// ============================================================================
// export / import
// ============================================================================

const EXPORT_TABLES = [
  'sys_academic_year',
  'sys_class',
  'user',
  'student',
  'student_class_history',
  'sys_class_teachers',
  'sm_assess', 'weefim_assess', 'csirs_assess', 'cnbsr2016_assess', 'fine_motor_assess', 'crt_assess',
  'srs2_assess', 'conners_psq_assess', 'sdq_assess', 'cbcl_assess', 'brief_assess',
  'sm_assess_detail', 'weefim_assess_detail', 'csirs_assess_detail',
  'report_record',
  'sys_training_plan', 'sys_plan_resource_map',
  'training_records', 'equipment_training_records', 'emotional_training_session', 'game_emotion_records',
  'training_session',
]

function selectRows(db, sql) {
  const result = db.exec(sql)
  if (!result.length) return []
  const columns = result[0].columns
  return result[0].values.map((values) => Object.fromEntries(columns.map((col, i) => [col, values[i]])))
}

function runExport(db, outPath) {
  const studentBetween = between(ID_RANGES.student)
  const tables = {}
  for (const table of EXPORT_TABLES) {
    let sql
    if (table === 'sys_academic_year') {
      sql = 'SELECT * FROM sys_academic_year'
    } else if (table === 'sys_class') {
      sql = `SELECT * FROM sys_class WHERE id ${between(ID_RANGES.class)}`
    } else if (table === 'user') {
      sql = `SELECT * FROM user WHERE id ${between(ID_RANGES.user)}`
    } else if (table === 'student') {
      sql = `SELECT * FROM student WHERE id ${studentBetween}`
    } else if (table === 'student_class_history') {
      sql = `SELECT * FROM student_class_history WHERE student_id ${studentBetween}`
    } else if (table === 'sys_class_teachers') {
      sql = `SELECT * FROM sys_class_teachers WHERE class_id ${between(ID_RANGES.class)}`
    } else if (table === 'report_record') {
      sql = `SELECT * FROM report_record WHERE id ${between(ID_RANGES.report)} OR student_id ${studentBetween}`
    } else if (table === 'sys_training_plan') {
      sql = `SELECT * FROM sys_training_plan WHERE id ${between(ID_RANGES.plan)}`
    } else if (table === 'sys_plan_resource_map') {
      sql = `SELECT * FROM sys_plan_resource_map WHERE plan_id ${between(ID_RANGES.plan)}`
    } else if (table === 'training_records') {
      sql = `SELECT * FROM training_records WHERE id ${between(ID_RANGES.trainingRecord)}`
    } else if (table === 'equipment_training_records') {
      sql = `SELECT * FROM equipment_training_records WHERE id ${between(ID_RANGES.equipmentRecord)}`
    } else if (table === 'emotional_training_session') {
      sql = `SELECT * FROM emotional_training_session WHERE id ${between(ID_RANGES.emotionSession)}`
    } else if (table === 'game_emotion_records') {
      sql = `SELECT * FROM game_emotion_records WHERE id ${between(ID_RANGES.gameRecord)}`
    } else if (table === 'training_session') {
      sql = `SELECT * FROM training_session WHERE id ${between(ID_RANGES.trainingSession)}`
    } else if (table === 'sm_assess_detail' || table === 'weefim_assess_detail' || table === 'csirs_assess_detail') {
      sql = `SELECT * FROM ${table} WHERE assess_id ${between(ID_RANGES.assess)}`
    } else {
      // 量表评估表：id 区间或学生维度
      sql = `SELECT * FROM ${table} WHERE id ${between(ID_RANGES.assess)} OR student_id ${studentBetween}`
    }
    tables[table] = selectRows(db, sql)
  }
  const payload = {
    app: 'SCGP',
    kind: 'demo-seed-data',
    version: 1,
    exportedAt: new Date().toISOString(),
    seed: { students: ID_RANGES.student, classes: ID_RANGES.class, plans: ID_RANGES.plan },
    tables,
  }
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2))
  return payload
}

function runImport(db, inPath, dryRun) {
  const payload = JSON.parse(fs.readFileSync(inPath, 'utf8'))
  if (payload.app !== 'SCGP' || payload.kind !== 'demo-seed-data') {
    throw new Error(`不是合法的演示数据文件: ${inPath}`)
  }
  const tables = payload.tables || {}
  if (dryRun) {
    const total = Object.values(tables).reduce((sum, rows) => sum + rows.length, 0)
    return { dryRun: true, totalRows: total, tables: Object.keys(tables).length }
  }
  // 幂等：先按主键区间清理（与 seed 清理逻辑一致）
  const rng = createRng(20260806)
  db.run('BEGIN')
  try {
    clearDemoData(db, rng)
    const order = [
      'sys_academic_year',
      'sys_class',
      'user',
      'student',
      'student_class_history',
      'sys_class_teachers',
      'sm_assess', 'weefim_assess', 'csirs_assess', 'cnbsr2016_assess', 'fine_motor_assess', 'crt_assess',
      'srs2_assess', 'conners_psq_assess', 'sdq_assess', 'cbcl_assess', 'brief_assess',
      'sm_assess_detail', 'weefim_assess_detail', 'csirs_assess_detail',
      'report_record',
      'sys_training_plan',
      'sys_plan_resource_map',
      'training_records',
      'equipment_training_records',
      'emotional_training_session',
      'game_emotion_records',
      'training_session',
    ]
    for (const table of order) {
      const rows = tables[table]
      if (!rows?.length) continue
      if (table === 'sys_academic_year') {
        // 学年是全局配置表：剥离主键、按 academic_year 唯一约束去重（幂等）
        for (const row of rows) {
          const { id: _ignored, ...rest } = row
          const keys = Object.keys(rest)
          db.run(
            `INSERT OR IGNORE INTO sys_academic_year (${keys.join(', ')})
             VALUES (${keys.map((k) => quote(rest[k])).join(', ')})`,
          )
        }
        continue
      }
      for (const row of rows) {
        insertRow(db, table, row)
      }
    }
    db.run('COMMIT')
    const total = order.reduce((sum, table) => sum + (tables[table]?.length || 0), 0)
    return { totalRows: total, tables: Object.keys(tables).length }
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  }
}

// ============================================================================
// main
// ============================================================================

function printSummary(summary, db) {
  console.log('模拟演示数据生成完成：')
  console.log(`  班级: ${summary.classes}（含演示 ${ID_RANGES.class[1] - ID_RANGES.class[0] + 1} 个）`)
  console.log(`  教师: ${summary.users}（演示教师 ${TEACHERS.length} 人，密码 admin123）`)
  console.log(`  学生: ${summary.students}（演示 ${ID_RANGES.student[1] - ID_RANGES.student[0] + 1} 人）`)
  console.log(`  评估: ${summary.assessments} 次（报告 ${summary.reports} 条，含纵向前后测）`)
  console.log(`  计划: ${summary.plans} 个（关联资源 ${summary.planResourceMaps} 条）`)
  console.log(`  训练记录: 感官 ${summary.trainingRecords} + 器材 ${summary.equipmentRecords} + 情绪 ${summary.emotionSessions} + 游戏 ${summary.gameRecords}`)
  console.log(`  统一训练主表: ${summary.trainingSessions} 条`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.command) {
    console.log(`用法：
  node scripts/seed-demo-data.mjs seed   --db <database.sqlite> [--seed <number>] [--dry-run]
  node scripts/seed-demo-data.mjs export --db <database.sqlite> --out <file.json>
  node scripts/seed-demo-data.mjs import --db <database.sqlite> --in <file.json> [--dry-run]`)
    process.exit(1)
  }
  if (!args.db) throw new Error('缺少 --db <database.sqlite> 参数')
  if (args.command === 'export' && !args.out) throw new Error('export 需要 --out <file.json>')
  if (args.command === 'import' && !args.in) throw new Error('import 需要 --in <file.json>')

  const sql = await initSql()
  const db = openDb(sql, args.db)
  try {
    if (args.command === 'seed') {
      if (args.dryRun) {
        console.log(`[dry-run] 目标库: ${args.db}（不写入）`)
        const summary = runSeed(db, args)
        printSummary(summary, db)
      } else {
        const summary = runSeed(db, args)
        closeDb(db, args.db)
        printSummary(summary, db)
        console.log(`\n已写入: ${args.db}`)
      }
    } else if (args.command === 'export') {
      const payload = runExport(db, args.out)
      console.log(`已导出 ${Object.values(payload.tables).reduce((s, rows) => s + rows.length, 0)} 行 → ${args.out}`)
    } else if (args.command === 'import') {
      if (args.dryRun) {
        const result = runImport(db, args.in, true)
        console.log(`[dry-run] ${args.in}：${result.tables} 张表 / ${result.totalRows} 行（不写入）`)
      } else {
        const result = runImport(db, args.in, false)
        closeDb(db, args.db)
        console.log(`已导入 ${result.tables} 张表 / ${result.totalRows} 行 → ${args.db}`)
      }
    } else {
      throw new Error(`未知命令: ${args.command}`)
    }
  } catch (error) {
    console.error(`[seed-demo-data] 失败: ${error.message}`)
    if (process.env.SEED_DEBUG) console.error(error.stack)
    try { db.close() } catch { /* ignore */ }
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(`[seed-demo-data] 失败: ${error.message}`)
  process.exit(1)
})
