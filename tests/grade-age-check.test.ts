/**
 * 月龄-年级对应性核对工具函数测试
 * 运行：npx jiti tests/grade-age-check.test.ts
 */
import assert from 'node:assert/strict'
import {
  getAgeAtAcademicYearStart,
  getExpectedGradeLevel,
  checkGradeAgeMatch,
  COMPULSORY_EDUCATION_ENTRY_AGE
} from '../src/types/class'

let passed = 0
function test(name: string, fn: () => void) {
  fn()
  passed += 1
  console.log(`  ✓ ${name}`)
}

// ═══════════ 学年初年龄计算（8/31 截止口径） ═══════════

test('COMPULSORY_EDUCATION_ENTRY_AGE = 6（义务教育法第十一条）', () => {
  assert.equal(COMPULSORY_EDUCATION_ENTRY_AGE, 6)
})

test('8 月 31 日出生：2024-2025 学年按 6 岁计（资格日当天已满 6 周岁）', () => {
  // 2018-08-31 出生 → 截至 2024-08-31 恰好满 6 周岁 → 可入学
  assert.equal(getAgeAtAcademicYearStart('2018-08-31', '2024-2025'), 6)
})

test('9 月 1 日出生：2024-2025 学年按 5 岁计（资格日未过生日）', () => {
  // 2018-09-01 出生 → 截至 2024-08-31 还没过 6 岁生日 → 5 岁，晚一年入学
  assert.equal(getAgeAtAcademicYearStart('2018-09-01', '2024-2025'), 5)
})

test('6 月出生：学年初 6 岁', () => {
  assert.equal(getAgeAtAcademicYearStart('2018-06-15', '2024-2025'), 6)
})

test('无效生日返回 null', () => {
  assert.equal(getAgeAtAcademicYearStart('', '2024-2025'), null)
  assert.equal(getAgeAtAcademicYearStart('not-a-date', '2024-2025'), null)
})

// ═══════════ 应读年级推算（value 口径：4 = 一年级，12 = 九年级） ═══════════

test('6 岁 → 一年级（value 4）', () => {
  assert.equal(getExpectedGradeLevel('2018-08-31', '2024-2025'), 4)
})

test('5 岁 → 大班（value 3；幼儿园映射：3岁小班/4岁中班/5岁大班）', () => {
  assert.equal(getExpectedGradeLevel('2019-06-01', '2024-2025'), 3)
})

test('2 岁 → 小班（value 1，未达幼儿园年龄下限钳制）', () => {
  // 2 岁：expected = 4 + (2-6) = 0 → 钳到 1
  assert.equal(getExpectedGradeLevel('2022-06-01', '2024-2025'), 1)
})

test('15 岁 → 九年级（value 12，上限钳制）', () => {
  assert.equal(getExpectedGradeLevel('2009-06-01', '2024-2025'), 12)
})

test('13 岁 → 八年级/初二（value 11）；12 岁 → 七年级/初一（value 10）', () => {
  assert.equal(getExpectedGradeLevel('2011-03-01', '2024-2025'), 11)
  // 12 月出生：截至 8/31 资格日未过生日 → 12 岁 → 初一
  assert.equal(getExpectedGradeLevel('2011-12-01', '2024-2025'), 10)
})

// ═══════════ 软提示核对（不对称阈值：跳级 ≥1 级、留级 ≥2 级才提示） ═══════════

test('5 岁读大班：相符不提示', () => {
  // 2019-06-01 → 宜读大班（3）；在读大班（3）→ gap = 0
  const r = checkGradeAgeMatch('2019-06-01', 3, '2024-2025')
  assert.equal(r.shouldWarn, false)
  assert.equal(r.gap, 0)
})

test('4 岁读一年级：差 2 级（跳级）→ 提示“疑似跳级”', () => {
  // 2020-06-01 出生 → 按 4 岁计 → 宜读中班（2）；在读一年级（4）→ gap = +2（跳级）
  const r = checkGradeAgeMatch('2020-06-01', 4, '2024-2025')
  assert.equal(r.shouldWarn, true)
  assert.equal(r.gap, 2)
  assert.ok(r.message.includes('中班'))
  assert.ok(r.message.includes('跳级'))
})

test('5 岁读一年级：差 1 级跳级 → 也提示（不对称阈值，跳级 ≥+1 即报）', () => {
  // 2019-06-01 出生 → 宜读大班（3）；在读一年级（4）→ gap = +1 → 跳级即提示
  const r = checkGradeAgeMatch('2019-06-01', 4, '2024-2025')
  assert.equal(r.shouldWarn, true)
  assert.equal(r.gap, 1)
  assert.ok(r.message.includes('跳级'))
})

test('7 岁读一年级：留级 1 级 → 不提示（特教常态）', () => {
  // 2017-06-01 出生 → 按 7 岁计 → 宜读二年级（5）；在读一年级（4）→ gap = -1 → 不提示
  const r = checkGradeAgeMatch('2017-06-01', 4, '2024-2025')
  assert.equal(r.shouldWarn, false)
  assert.equal(r.gap, -1)
})

test('8 岁读一年级：留级 2 级 → 提示', () => {
  // 2016-06-01 出生 → 按 8 岁计 → 宜读三年级（6）；在读一年级（4）→ gap = -2 → 提示
  const r = checkGradeAgeMatch('2016-06-01', 4, '2024-2025')
  assert.equal(r.shouldWarn, true)
  assert.equal(r.gap, -2)
  assert.ok(r.message.includes('延迟入学'))
})

test('16 岁读大班：差 9 级 → 提示', () => {
  // 2008-06-01 出生 → 按 16 岁计 → 宜读高一以上（钳到 12）；在读大班（3）→ gap = -9
  const r = checkGradeAgeMatch('2008-06-01', 3, '2024-2025')
  assert.equal(r.shouldWarn, true)
  assert.equal(r.gap, -9)
})

test('年级相符 → 不提示', () => {
  const r = checkGradeAgeMatch('2018-03-01', 4, '2024-2025') // 6 岁读一年级
  assert.equal(r.shouldWarn, false)
  assert.equal(r.gap, 0)
})

test('未分班（gradeLevel 为空）→ 不提示', () => {
  const r = checkGradeAgeMatch('2019-09-01', null, '2024-2025')
  assert.equal(r.shouldWarn, false)
})

test('缺省学年参数 → 用当前学年不抛错', () => {
  const r = checkGradeAgeMatch('2018-03-01', 4)
  assert.equal(typeof r.gap, 'number')
})

console.log(`\n月龄-年级核对测试：${passed} 用例全部通过`)
