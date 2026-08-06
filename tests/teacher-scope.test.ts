/**
 * teacher-scope（教师数据隔离范围）单元测试
 *
 * 覆盖：
 * 1. buildTeacherStudentScope 纯函数：admin 全量 / teacher 过滤 / 无身份防御 / alias 防注入
 * 2. SQL 语义（sql.js 内存库）：teacher 仅见任教班级学生、未分班学生不可见、
 *    训练记录/统计查询按学生过滤后结果正确
 *
 * 运行：npx jiti tests/teacher-scope.test.ts
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import initSqlJs from 'sql.js'
import { buildTeacherStudentScope } from '../src/database/teacher-scope.ts'

const require = createRequire(import.meta.url)

async function main() {
  // ---------- 1. 纯函数断言 ----------

  // admin：全量（空过滤）
  assert.deepEqual(buildTeacherStudentScope('s', { role: 'admin', userId: 1 }), { sql: '', params: [] })
  // teacher 但无 userId（防御）：空过滤
  assert.deepEqual(buildTeacherStudentScope('s', { role: 'teacher', userId: null }), { sql: '', params: [] })
  assert.deepEqual(buildTeacherStudentScope('s', { role: 'teacher', userId: undefined }), { sql: '', params: [] })
  // 未知角色：空过滤
  assert.deepEqual(buildTeacherStudentScope('s', { role: 'other', userId: 1 }), { sql: '', params: [] })

  // teacher：生成 EXISTS 过滤，参数为当前用户 id
  const scope = buildTeacherStudentScope('s', { role: 'teacher', userId: 7 })
  assert.ok(scope.sql.includes('EXISTS'), 'SQL 应包含 EXISTS 子查询')
  assert.ok(scope.sql.includes('s.current_class_id'), 'SQL 应引用学生当前班级列')
  assert.ok(scope.sql.includes('ct.teacher_id = ?'), 'SQL 应按教师 id 匹配')
  assert.deepEqual(scope.params, [7])

  // 自定义 alias 生效
  const scopeSt = buildTeacherStudentScope('st', { role: 'teacher', userId: 7 })
  assert.ok(scopeSt.sql.includes('st.current_class_id'), 'SQL 应使用自定义表别名')

  // 非法 alias（注入防御）抛错
  assert.throws(() => buildTeacherStudentScope('s; DROP TABLE student', { role: 'teacher', userId: 1 }))
  assert.throws(() => buildTeacherStudentScope('s ) --', { role: 'teacher', userId: 1 }))

  // ---------- 2. SQL 语义（sql.js 内存库） ----------

  const SQL: any = await initSqlJs({ locateFile: (file: string) => require.resolve(`sql.js/dist/${file}`) })
  const db = new SQL.Database()
  db.run('CREATE TABLE student (id INTEGER PRIMARY KEY, name TEXT, current_class_id INTEGER)')
  db.run('CREATE TABLE sys_class_teachers (class_id INTEGER, teacher_id INTEGER)')
  db.run('CREATE TABLE training_records (id INTEGER PRIMARY KEY, student_id INTEGER, accuracy_rate REAL, created_at TEXT)')
  // S1 在班级 1、S2 在班级 2、S3 未分班（current_class_id 为 NULL）
  db.run(`INSERT INTO student (id, name, current_class_id) VALUES (1, 'S1', 1), (2, 'S2', 2), (3, 'S3', NULL)`)
  // 教师 7 任教班级 1；教师 8 任教班级 2
  db.run('INSERT INTO sys_class_teachers (class_id, teacher_id) VALUES (1, 7), (2, 8)')
  // 三名学生各有 1 条训练记录
  db.run(`INSERT INTO training_records (id, student_id, accuracy_rate, created_at)
          VALUES (1, 1, 0.3, '2026-08-01'), (2, 2, 0.3, '2026-08-01'), (3, 3, 0.3, '2026-08-01')`)

  const run = (sql: string, params: unknown[]) => {
    const stmt = db.prepare(sql)
    stmt.bind(params as any[])
    const rows: any[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    return rows
  }

  // admin：3 名学生全量可见
  let sc = buildTeacherStudentScope('s', { role: 'admin', userId: 1 })
  assert.equal(run(`SELECT id FROM student s WHERE 1=1${sc.sql} ORDER BY id`, sc.params).length, 3)

  // teacher 7（任教班级 1）：仅 S1 可见；班级 2 学生与未分班学生不可见
  sc = buildTeacherStudentScope('s', { role: 'teacher', userId: 7 })
  assert.deepEqual(
    run(`SELECT id FROM student s WHERE 1=1${sc.sql} ORDER BY id`, sc.params).map((r) => r.id),
    [1],
  )

  // teacher 8（任教班级 2）：仅 S2 可见
  sc = buildTeacherStudentScope('s', { role: 'teacher', userId: 8 })
  assert.deepEqual(
    run(`SELECT id FROM student s WHERE 1=1${sc.sql} ORDER BY id`, sc.params).map((r) => r.id),
    [2],
  )

  // 训练记录统计（getWeeklyTrainingTrend 同构）：teacher 7 仅统计 S1 的 1 条
  sc = buildTeacherStudentScope('s', { role: 'teacher', userId: 7 })
  assert.equal(
    run(
      `SELECT COUNT(*) AS count FROM training_records tr LEFT JOIN student s ON s.id = tr.student_id WHERE 1=1${sc.sql}`,
      sc.params,
    )[0].count,
    1,
  )

  // 训练记录统计：admin 全量 3 条
  sc = buildTeacherStudentScope('s', { role: 'admin', userId: 1 })
  assert.equal(
    run(
      `SELECT COUNT(*) AS count FROM training_records tr LEFT JOIN student s ON s.id = tr.student_id WHERE 1=1${sc.sql}`,
      sc.params,
    )[0].count,
    3,
  )

  // 报告列表（getReportList 同构）：LEFT JOIN + 过滤 + 额外条件（student_id）参数顺序正确
  db.run('CREATE TABLE report_record (id INTEGER PRIMARY KEY, student_id INTEGER, title TEXT)')
  db.run(`INSERT INTO report_record (id, student_id, title) VALUES (1, 1, 'R1'), (2, 2, 'R2'), (3, 3, 'R3')`)
  sc = buildTeacherStudentScope('s', { role: 'teacher', userId: 7 })
  const reports = run(
    `SELECT r.id FROM report_record r LEFT JOIN student s ON r.student_id = s.id WHERE 1=1${sc.sql} AND r.student_id = ? ORDER BY r.id`,
    [...sc.params, 1],
  )
  assert.deepEqual(reports.map((r) => r.id), [1])
  // teacher 7 不传 student_id：仅见 S1 的报告（班级 2 与未分班学生的报告不可见）
  const allReports = run(
    `SELECT r.id FROM report_record r LEFT JOIN student s ON r.student_id = s.id WHERE 1=1${sc.sql} ORDER BY r.id`,
    sc.params,
  )
  assert.deepEqual(allReports.map((r) => r.id), [1])
  // admin 全量
  sc = buildTeacherStudentScope('s', { role: 'admin', userId: 1 })
  const adminReports = run(
    `SELECT r.id FROM report_record r LEFT JOIN student s ON r.student_id = s.id WHERE 1=1${sc.sql} ORDER BY r.id`,
    sc.params,
  )
  assert.deepEqual(adminReports.map((r) => r.id), [1, 2, 3])

  // 计划列表（getAllPlans 同构）：tp 表 + is_active + status 额外条件 + scope 参数顺序
  db.run('CREATE TABLE sys_training_plan (id INTEGER PRIMARY KEY, student_id INTEGER, status TEXT, is_active INTEGER)')
  db.run(`INSERT INTO sys_training_plan (id, student_id, status, is_active)
          VALUES (1, 1, 'active', 1), (2, 2, 'active', 1), (3, 3, 'active', 1)`)
  sc = buildTeacherStudentScope('s', { role: 'teacher', userId: 7 })
  const plans = run(
    `SELECT tp.id FROM sys_training_plan tp LEFT JOIN student s ON tp.student_id = s.id
     WHERE tp.is_active = 1${sc.sql} AND tp.status = ? ORDER BY tp.id`,
    [...sc.params, 'active'],
  )
  assert.deepEqual(plans.map((r) => r.id), [1])
  // teacher 7 不传额外条件：仅 S1 的计划
  const allPlans = run(
    `SELECT tp.id FROM sys_training_plan tp LEFT JOIN student s ON tp.student_id = s.id
     WHERE tp.is_active = 1${sc.sql} ORDER BY tp.id`,
    sc.params,
  )
  assert.deepEqual(allPlans.map((r) => r.id), [1])
  // admin 全量
  sc = buildTeacherStudentScope('s', { role: 'admin', userId: 1 })
  const adminPlans = run(
    `SELECT tp.id FROM sys_training_plan tp LEFT JOIN student s ON tp.student_id = s.id
     WHERE tp.is_active = 1${sc.sql} ORDER BY tp.id`,
    sc.params,
  )
  assert.deepEqual(adminPlans.map((r) => r.id), [1, 2, 3])

  console.log('teacher-scope 测试全部通过')
}

main().catch((error) => {
  console.error('teacher-scope 测试失败:', error)
  process.exit(1)
})
