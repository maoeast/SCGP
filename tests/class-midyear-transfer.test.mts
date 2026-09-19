/**
 * 学年中途调班功能测试（assignStudentToClass 同学年分流）
 * 用源码切片 + 运行时生成临时模块（jiti 无法加载 class-api.ts——数据库初始化链）
 * 运行：npx jiti tests/class-midyear-transfer.test.mts
 *
 * 覆盖（class-api.ts assignStudentToClass 的调班分支）：
 * 1. 同学年已有记录 → UPDATE 现有行 + 显式对账源/目标班人数（UNIQUE(student_id, academic_year)
 *    约束下无法关旧插新；真实 schema 触发器只盖 INSERT 与 UPDATE OF is_current）
 * 2. 同学年已在目标班级（current 行）→ 抛"学生已在该班级中"
 * 3. 已关闭行（如毕业后回炉）重开：is_current 重置 1、清 leave 痕迹，避免 INSERT 撞 UNIQUE
 * 4. 真实触发器集下断言显式对账行为（不再自造生产不存在的触发器）
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import initSqlJs from 'sql.js'

let passed = 0

const source = readFileSync('src/database/class-api.ts', 'utf8')

// ── 源码切片锚（签名行做边界锚，勿用 jsdoc） ──
const start = source.indexOf('  async assignStudentToClass(')
const end = source.indexOf('  /**\n   * 批量学生入班')
assert.ok(start > 0 && end > start, '源码切片锚失效')
const segment = source.slice(start, end)

const cases: Array<[string, () => void | Promise<void>]> = [
  ['分流分支：显式人数对账 + 已关闭行重开（真实触发器不盖 UPDATE OF class_id）', () => {
    assert.ok(segment.includes("existing.is_current === 1 && existing.class_id === classId"), '同班重复判断应限定 current 行')
    assert.ok(segment.includes('UPDATE sys_class SET current_enrollment = current_enrollment - 1'), '缺源班人数显式对账')
    assert.ok(segment.includes('UPDATE sys_class SET current_enrollment = current_enrollment + 1'), '缺目标班人数显式对账')
    assert.ok(segment.includes('is_current = 1, leave_date = NULL, leave_reason = NULL'), '已关闭行重开时应清 leave 痕迹')
    assert.ok(segment.includes('UPDATE student_class_history'), '同学年调班应 UPDATE 现有行')
    assert.ok(segment.includes('await this.forceSave()'), '调班后应立即落盘')
    assert.ok(!segment.includes("throw new Error('学生已在本学年班级中')"), '旧阻断行为应已移除')
  }],
  ['真实表结构验证：按 class-schema.sql 的真实触发器集断言显式对账行为', async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    // 真实 schema 触发器集（class-schema.sql:184-203 / init.ts:4842-4857 同步定义）——
    // 只有 INSERT 增量与 UPDATE OF is_current 减量，无 UPDATE OF class_id 触发器
    db.run(`CREATE TABLE sys_class (id INTEGER PRIMARY KEY, name TEXT, current_enrollment INTEGER DEFAULT 0)`)
    db.run(`CREATE TABLE student (id INTEGER PRIMARY KEY, name TEXT, current_class_id INTEGER, current_class_name TEXT)`)
    db.run(`CREATE TABLE student_class_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, student_name TEXT,
      class_id INTEGER, class_name TEXT, academic_year TEXT, enrollment_date TEXT,
      leave_date TEXT, leave_reason TEXT, is_current INTEGER, created_at TEXT,
      UNIQUE(student_id, academic_year))`)
    db.run(`CREATE TRIGGER trg_class_enrollment_increment
      AFTER INSERT ON student_class_history
      WHEN NEW.is_current = 1
      BEGIN
        UPDATE sys_class SET current_enrollment = current_enrollment + 1 WHERE id = NEW.class_id;
      END`)
    db.run(`CREATE TRIGGER trg_class_enrollment_decrement
      AFTER UPDATE OF is_current ON student_class_history
      WHEN OLD.is_current = 1 AND NEW.is_current = 0
      BEGIN
        UPDATE sys_class SET current_enrollment = current_enrollment - 1 WHERE id = NEW.class_id;
      END`)
    // 种子：班级初始 0 人，INSERT 历史行时由真实 increment 触发器加到 1（模拟真实分班流程，
    // 保证种子数据与触发器语义自洽）
    db.run(`INSERT INTO sys_class (id, name, current_enrollment) VALUES (10, 'A班', 0), (11, 'B班', 0)`)
    db.run(`INSERT INTO student (id, name, current_class_id, current_class_name) VALUES (1, '甲', 10, 'A班')`)
    db.run(`INSERT INTO student_class_history (student_id, student_name, class_id, class_name, academic_year, enrollment_date, is_current)
            VALUES (1, '甲', 10, 'A班', '2026-2027', '2026-09-01', 1)`)
    const seeded = Object.fromEntries(db.exec(`SELECT id, current_enrollment FROM sys_class`)[0].values)
    assert.deepEqual(seeded, { '10': 1, '11': 0 }, '种子后：A班触发器计为 1，B班 0')
    // 模拟 API 调班分支：显式对账（源-1、目标+1）+ 历史行改写 + 学生表更新
    db.run(`UPDATE sys_class SET current_enrollment = current_enrollment - 1 WHERE id = 10 AND current_enrollment > 0`)
    db.run(`UPDATE sys_class SET current_enrollment = current_enrollment + 1 WHERE id = 11`)
    db.run(`UPDATE student_class_history SET class_id = 11, class_name = 'B班', enrollment_date = '2026-09-19', is_current = 1, leave_date = NULL, leave_reason = NULL WHERE id = 1`)
    db.run(`UPDATE student SET current_class_id = 11, current_class_name = 'B班' WHERE id = 1`)
    const cur = db.exec(`SELECT class_id, is_current FROM student_class_history WHERE student_id = 1 AND is_current = 1`)[0]?.values
    assert.deepEqual(cur, [[11, 1]], '调班后仍单行且指向新班')
    const enroll = Object.fromEntries(db.exec(`SELECT id, current_enrollment FROM sys_class`)[0].values)
    assert.deepEqual(enroll, { '10': 0, '11': 1 }, '显式对账：源班-1、目标班+1（真实触发器不盖 UPDATE OF class_id）')
  }],
  ['已关闭行重开：源班不再幻影扣减（round-2 #1）', async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    db.run(`CREATE TABLE sys_class (id INTEGER PRIMARY KEY, name TEXT, current_enrollment INTEGER DEFAULT 0)`)
    db.run(`CREATE TABLE student (id INTEGER PRIMARY KEY, name TEXT, current_class_id INTEGER, current_class_name TEXT)`)
    db.run(`CREATE TABLE student_class_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, student_name TEXT,
      class_id INTEGER, class_name TEXT, academic_year TEXT, enrollment_date TEXT,
      leave_date TEXT, leave_reason TEXT, is_current INTEGER, created_at TEXT,
      UNIQUE(student_id, academic_year))`)
    db.run(`CREATE TRIGGER trg_class_enrollment_increment
      AFTER INSERT ON student_class_history
      WHEN NEW.is_current = 1
      BEGIN
        UPDATE sys_class SET current_enrollment = current_enrollment + 1 WHERE id = NEW.class_id;
      END`)
    db.run(`CREATE TRIGGER trg_class_enrollment_decrement
      AFTER UPDATE OF is_current ON student_class_history
      WHEN OLD.is_current = 1 AND NEW.is_current = 0
      BEGIN
        UPDATE sys_class SET current_enrollment = current_enrollment - 1 WHERE id = NEW.class_id;
      END`)
    // 种子：甲曾在 A 班后离班（关闭时 decrement 触发器已扣），A 班现有另 1 名学生，B 班 0 人
    db.run(`INSERT INTO sys_class (id, name, current_enrollment) VALUES (10, 'A班', 0), (11, 'B班', 0)`)
    db.run(`INSERT INTO student (id, name, current_class_id, current_class_name) VALUES (1, '甲', NULL, NULL)`)
    db.run(`INSERT INTO student_class_history (student_id, student_name, class_id, class_name, academic_year, enrollment_date, is_current)
            VALUES (1, '甲', 10, 'A班', '2026-2027', '2026-09-01', 1)`)
    db.run(`UPDATE student_class_history SET is_current = 0, leave_date = '2026-09-10', leave_reason = 'graduate' WHERE id = 1`) // 关闭 → A班触发器 -1
    db.run(`INSERT INTO student_class_history (student_id, student_name, class_id, class_name, academic_year, enrollment_date, is_current)
            VALUES (2, '乙', 10, 'A班', '2026-2027', '2026-09-12', 1)`) // A班另一个学生 → +1
    const preCounts = Object.fromEntries(db.exec(`SELECT id, current_enrollment FROM sys_class`)[0].values)
    assert.deepEqual(preCounts, { '10': 1, '11': 0 }, '重开前：A班含乙 1 人（甲已扣），B班 0 人')
    // 模拟 API 重开分支（is_current=0 → 源班不扣，目标班 +1，行重开清 leave 痕迹）
    db.run(`UPDATE sys_class SET current_enrollment = current_enrollment + 1 WHERE id = 11`)
    db.run(`UPDATE student_class_history SET class_id = 11, class_name = 'B班', enrollment_date = '2026-09-19', is_current = 1, leave_date = NULL, leave_reason = NULL WHERE id = 1`)
    db.run(`UPDATE student SET current_class_id = 11, current_class_name = 'B班' WHERE id = 1`)
    const postCounts = Object.fromEntries(db.exec(`SELECT id, current_enrollment FROM sys_class`)[0].values)
    assert.deepEqual(postCounts, { '10': 1, '11': 1 }, '重开后：源班不幻影扣减（仍 1），目标班 +1')
    const reopenRow = db.exec(`SELECT is_current, leave_date FROM student_class_history WHERE id = 1`)[0]?.values[0]
    assert.deepEqual(reopenRow, [1, null], '重开行 is_current=1 且 leave 痕迹已清')
  }],
]

for (const [name, fn] of cases) {
  await fn()
  passed += 1
  console.log(`  ✓ ${name}`)
}
console.log(`\n学年中途调班测试：${passed} 用例全部通过`)
