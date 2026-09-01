/**
 * 随机作答模式检测 — 单元测试（Phase 3）
 *
 * 运行：npx jiti tests/assessment-random-pattern.test.ts
 *
 * 覆盖 detectRandomPattern / mergeSuspiciousNote：
 *  1. 真实作答（rt 波动、答案交替、20+ 题）→ 不标记
 *  2. 直线作答（一路同选项、>=20 题）→ 标记
 *  3. 滑窗重复（周期性重复答案模式）→ 标记
 *  4. rt 漂移（后半程赶进度）→ 标记
 *  5. 纯快但稳定（全程匀速快）→ 漂移信号不触发
 *  6. 数据不足（<10 题）→ 不标记
 *  7. mergeSuspiciousNote 组合语义
 *  8. 守卫：无有效 rt 时漂移信号为 null
 */
import assert from 'node:assert/strict'
import {
  detectRandomPattern,
  mergeSuspiciousNote,
  RANDOM_PATTERN_SCALE_CODES,
  QUALITY_NOTE_SUSPICIOUS,
} from '../src/types/assessment.ts'

/** 构造答题序列的辅助：answers[i] = { value, responseTime(ms), timestamp } */
function seq(entries: Array<[string, number]>): Array<{ value: string; responseTime: number; timestamp: number }> {
  let t = 1000000
  return entries.map(([value, rt]) => {
    const item = { value, responseTime: rt, timestamp: t }
    t += rt
    return item
  })
}

// ---------- 1. 真实作答 → 不标记 ----------
{
  // 24 题：LCG 高位伪随机答案（低位有强周期性，须用高位）、rt 在 3-9s 波动
  const entries: Array<[string, number]> = []
  const options = ['A', 'B', 'C', 'D']
  let seed = 42
  for (let i = 0; i < 24; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648
    const v = options[Math.floor(seed / 1000) % 4]
    const rt = 3000 + (Math.floor(seed / 100) % 6000)
    entries.push([v, rt])
  }
  const r = detectRandomPattern(seq(entries))
  assert.equal(r.suspicious, false, `真实作答不应标记，signals=${JSON.stringify(r.signals)}`)
}

// ---------- 2. 直线作答 → 标记 ----------
{
  const entries: Array<[string, number]> = []
  for (let i = 0; i < 20; i++) entries.push(['A', 4000 + (i % 3) * 500])
  const r = detectRandomPattern(seq(entries))
  assert.equal(r.suspicious, true, '20 题全选 A 应标记')
  assert.ok(r.signals.sameAnswerRate !== null && r.signals.sameAnswerRate >= 0.95)
}

// ---------- 3. 滑窗重复 → 标记 ----------
{
  // 24 题：8 题周期完全重复（A B C D C B A D × 3），rt 正常波动
  const pattern = ['A', 'B', 'C', 'D', 'C', 'B', 'A', 'D']
  const entries: Array<[string, number]> = []
  for (let i = 0; i < 24; i++) entries.push([pattern[i % 8], 4000 + (i % 5) * 400])
  const r = detectRandomPattern(seq(entries))
  assert.equal(r.suspicious, true, '周期重复模式应标记')
  assert.ok(r.signals.repeatedWindowRate !== null && r.signals.repeatedWindowRate > 0.3)
}

// ---------- 4. rt 漂移（赶进度）→ 标记 ----------
{
  // 20 题：前半 10s/题，后半 1s/题（比值 0.1，整体均值 5.5s…需整体 <5s）
  // 调整：前半 8s、后半 1s → 整体 4.5s < 5s
  const entries: Array<[string, number]> = []
  for (let i = 0; i < 20; i++) {
    const v = ['A', 'B', 'C', 'D'][i % 4]
    entries.push([v, i < 10 ? 8000 : 1000])
  }
  const r = detectRandomPattern(seq(entries))
  assert.equal(r.suspicious, true, '后半程明显赶进度应标记')
  assert.ok(r.signals.rtDriftRatio !== null && r.signals.rtDriftRatio < 0.5)
}

// ---------- 5. 纯快但稳定 → 不标记 ----------
{
  // 20 题：全程匀速 1.5s/题，LCG 高位伪随机答案（快速认真作答：低龄儿童/简单题目完全正常）
  const entries: Array<[string, number]> = []
  let seed = 7
  for (let i = 0; i < 20; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648
    entries.push([['A', 'B', 'C', 'D'][Math.floor(seed / 1000) % 4], 1500])
  }
  const r = detectRandomPattern(seq(entries))
  assert.equal(r.suspicious, false, '匀速快作答不应被漂移信号标记')
  assert.equal(r.signals.rtDriftRatio, 1, '匀速时比值为 1')
}

// ---------- 6. 数据不足 → 不标记 ----------
{
  const entries: Array<[string, number]> = []
  for (let i = 0; i < 9; i++) entries.push(['A', 1000])
  const r = detectRandomPattern(seq(entries))
  assert.equal(r.suspicious, false, '<10 题不判定')
  assert.equal(r.signals.sameAnswerRate, null, '数据不足时信号为 null')
}

// ---------- 7. mergeSuspiciousNote 组合语义 ----------
{
  assert.equal(mergeSuspiciousNote(null), 'suspicious')
  assert.equal(mergeSuspiciousNote('very_fast'), 'very_fast+suspicious')
  assert.equal(mergeSuspiciousNote('fast'), 'fast+suspicious')
  assert.equal(mergeSuspiciousNote('very_fast+suspicious'), 'very_fast+suspicious', '重复合并幂等')
}

// ---------- 8. 无有效 rt → 漂移信号 null ----------
{
  // 20 题：LCG 高位伪随机答案（非周期），responseTime 缺失
  const answers: Array<{ value: string; timestamp: number }> = []
  let seed = 99
  for (let i = 0; i < 20; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648
    answers.push({ value: ['A', 'B'][Math.floor(seed / 1000) % 2], timestamp: 1000 + i * 3000 })
  }
  const r = detectRandomPattern(answers)
  assert.equal(r.signals.rtDriftRatio, null, '无 rt 时漂移信号为 null')
  assert.equal(r.suspicious, false, '非周期答案 + 无 rt 不触发任何信号')
}

// ---------- 附：启用范围 ----------
{
  assert.deepEqual([...RANDOM_PATTERN_SCALE_CODES], ['crt', 'cognitive_self'], '仅测验类启用')
  assert.equal(QUALITY_NOTE_SUSPICIOUS, 'suspicious')
}

console.log('✅ assessment-random-pattern.test.ts 全部断言通过（9 组用例）')
