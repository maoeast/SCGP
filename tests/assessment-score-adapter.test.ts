/**
 * 评估量表纵向分数归一化 — 单元测试
 *
 * 运行：npx jiti tests/assessment-score-adapter.test.ts
 *
 * 覆盖纯函数归一化（无 DB 依赖）：
 *  1. CSIRS 低龄只产出前 3 个维度（learning/executive 受 min_age 门控）
 *  2. CSIRS 学龄产出全部 5 个维度
 *  3. CSIRS 缺失维度补 null（不报错、不当 0 分）
 *  4. Conners 多动指数优先取独立列（权威），t_scores JSON 为辅
 *  5. Conners extra 字段（pi_score/ni_score）正确透出
 *  6. JSON 解析容错（脏数据/对象直传/空值）
 *  7. byDateAsc 升序排序（含日期缺失的稳定处理）
 *  8. normalizeByConfig object 模式（SRS2：dimension_scores 是 {dimCode:{tScore,name}}）
 *  9. normalizeByConfig flat-number 模式（CBCL：factor_t_scores 是 {因子名:tScore} + 宽带 extra）
 * 10. normalizeByConfig 原始分模式（SDQ：dimension_scores 是 {dimCode:{rawScore,name}}）
 * 11. normalizeByConfig 缺失维度补 null（脏/部分数据不报错）
 */
import assert from 'node:assert/strict'
import {
  normalizeCsirs,
  normalizeConners,
  safeParseJsonRecord,
  byDateAsc,
  CONNERS_PSQ_DIMENSIONS,
  CONNERS_TRS_DIMENSIONS,
  type ScoreSnapshot,
} from '../src/services/assessment-score-normalize.ts'

// ---------- 1. CSIRS 低龄：只产出前 3 维 ----------
{
  const row = {
    id: 101,
    age_months: 36, // 3 岁：<6，learning/executive 不适用
    t_scores: JSON.stringify({ vestibular: 45, tactile: 38, proprioception: 42 }),
    total_t_score: 41.7,
    level: '优秀',
    created_at: '2026-01-15T08:00:00Z',
  }
  const snap = normalizeCsirs(row)
  assert.equal(snap.assessId, 101)
  assert.equal(snap.ageMonths, 36)
  assert.equal(snap.totalScore, 41.7)
  assert.equal(snap.level, '优秀')
  assert.equal(snap.date, '2026-01-15T08:00:00Z')
  const dims = Object.keys(snap.dimensionScores)
  assert.equal(dims.length, 3, `3 岁应只产出 3 维，实际 ${dims.join(',')}`)
  assert.equal(snap.dimensionScores['前庭觉调节与运动规划'], 45)
  assert.equal(snap.dimensionScores['触觉调节与情绪行为'], 38)
  assert.equal(snap.dimensionScores['身体感知与动作协调'], 42)
  assert.ok(!('视听知觉与学业表现' in snap.dimensionScores), '6 岁以下不应有 learning 维度')
  assert.ok(!('执行功能与社会适应' in snap.dimensionScores), '10 岁以下不应有 executive 维度')
}

// ---------- 2. CSIRS 学龄（11 岁）：产出全部 5 维 ----------
{
  const row = {
    id: 102,
    age_months: 132, // 11 岁：≥10，全部维度适用
    t_scores: JSON.stringify({
      vestibular: 35, tactile: 30, proprioception: 33, learning: 28, executive: 25,
    }),
    total_t_score: 30.2,
    level: '偏低',
    created_at: '2026-06-20T10:30:00Z',
  }
  const snap = normalizeCsirs(row)
  const dims = Object.keys(snap.dimensionScores)
  assert.equal(dims.length, 5, `11 岁应产出 5 维，实际 ${dims.join(',')}`)
  assert.equal(snap.dimensionScores['视听知觉与学业表现'], 28)
  assert.equal(snap.dimensionScores['执行功能与社会适应'], 25)
}

// ---------- 3. CSIRS 维度缺失补 null ----------
{
  const row = {
    id: 103,
    age_months: 60, // 5 岁：前 3 维适用
    t_scores: JSON.stringify({ vestibular: 40 }), // 只给了 1 个维度，其余 2 个缺失
    total_t_score: 38,
    level: '正常',
    created_at: '2026-03-01T00:00:00Z',
  }
  const snap = normalizeCsirs(row)
  assert.equal(snap.dimensionScores['前庭觉调节与运动规划'], 40)
  assert.equal(snap.dimensionScores['触觉调节与情绪行为'], null, '缺失维度应补 null 而非 0')
  assert.equal(snap.dimensionScores['身体感知与动作协调'], null)
}

// ---------- 4. Conners 多动指数优先取独立列 ----------
{
  const row = {
    id: 201,
    age_months: 96,
    // hyperactivity_index 在 JSON 里是 66，但独立列是 72（权威），应取 72
    t_scores: JSON.stringify({
      conduct: 60, learning: 58, psychosomatic: 50, impulsivity_hyperactivity: 65, anxiety: 55, hyperactivity_index: 66,
    }),
    hyperactivity_index: 72,
    pi_score: 1.2,
    ni_score: 0.8,
    level: 'clinical',
    created_at: '2026-02-10T09:00:00Z',
  }
  const snap = normalizeConners(row, CONNERS_PSQ_DIMENSIONS)
  assert.equal(snap.totalScore, 72, '代表性总分应取独立列 hyperactivity_index')
  assert.equal(snap.level, 'clinical')
  assert.equal(snap.dimensionScores['多动指数'], 72, '维度里的多动指数也应取独立列')
  assert.equal(snap.dimensionScores['品行问题'], 60)
  assert.equal(snap.dimensionScores['学习问题'], 58)
  assert.equal(snap.dimensionScores['焦虑'], 55)
}

// ---------- 5. Conners TRS 维度键 + extra 透出 ----------
{
  const row = {
    id: 202,
    age_months: 84,
    t_scores: JSON.stringify({ conduct: 55, hyperactivity: 62, inattention_passivity: 48, hyperactivity_index: 58 }),
    hyperactivity_index: 58,
    pi_score: 0.5,
    level: 'borderline',
    created_at: '2026-04-05T14:00:00Z',
  }
  const snap = normalizeConners(row, CONNERS_TRS_DIMENSIONS)
  assert.equal(snap.totalScore, 58)
  assert.equal(snap.dimensionScores['多动'], 62)
  assert.equal(snap.dimensionScores['注意力-被动'], 48)
  assert.deepEqual(snap.extra, { pi_score: 0.5 }, 'extra 应含 pi_score')
}

// ---------- 6. JSON 解析容错 ----------
// 脏字符串
assert.deepEqual(safeParseJsonRecord('not-json'), {})
// 空值
assert.deepEqual(safeParseJsonRecord(null), {})
assert.deepEqual(safeParseJsonRecord(undefined), {})
// 数组不应被当作 Record
assert.deepEqual(safeParseJsonRecord('[1,2,3]'), {})
// 正常对象直传
assert.deepEqual(safeParseJsonRecord({ a: 1 }), { a: 1 })
// 正常 JSON 字符串
assert.deepEqual(safeParseJsonRecord('{"x":2}'), { x: 2 })

// ---------- 7. byDateAsc 升序排序 ----------
{
  const snaps: ScoreSnapshot[] = [
    { assessId: 3, date: '2026-03-01', ageMonths: 60, totalScore: 30, level: 'l', dimensionScores: {} },
    { assessId: 1, date: '2026-01-01', ageMonths: 58, totalScore: 35, level: 'l', dimensionScores: {} },
    { assessId: 2, date: '2026-02-01', ageMonths: 59, totalScore: 32, level: 'l', dimensionScores: {} },
  ]
  const sorted = [...snaps].sort(byDateAsc)
  assert.deepEqual(sorted.map((s) => s.assessId), [1, 2, 3], '应按日期升序（最早在前）')
}
// 日期缺失保持稳定（不抛错）
{
  const snaps: ScoreSnapshot[] = [
    { assessId: 1, date: '', ageMonths: 60, totalScore: 30, level: 'l', dimensionScores: {} },
    { assessId: 2, date: '2026-01-01', ageMonths: 60, totalScore: 32, level: 'l', dimensionScores: {} },
  ]
  const sorted = [...snaps].sort(byDateAsc)
  assert.equal(sorted.length, 2, '日期缺失不应导致排序崩溃')
}

// ---------- 8. normalizeByConfig object 模式（SRS2）----------
{
  const { normalizeByConfig } = await import('../src/services/assessment-score-normalize.ts')
  const srs2Config = {
    scaleCode: 'srs2',
    totalScoreField: 'total_t_score',
    levelField: 'total_level',
    dimensionScoresField: 'dimension_scores',
    dimensionMode: 'object' as const,
    dimensionScoreField: 'tScore',
    dimensionNameField: 'name',
    dimensionLabels: { awareness: '社交觉察', cognition: '社交认知' },
  }
  const row = {
    id: 301,
    age_months: 110,
    total_t_score: 68,
    total_level: 'moderate',
    dimension_scores: JSON.stringify({
      awareness: { name: '社交觉察', rawScore: 16, tScore: 62, level: 'mild' },
      cognition: { name: '社交认知', rawScore: 18, tScore: 65, level: 'mild' },
    }),
    created_at: '2026-05-10T09:00:00Z',
  }
  const snap = normalizeByConfig(row, srs2Config)
  assert.equal(snap.assessId, 301)
  assert.equal(snap.totalScore, 68)
  assert.equal(snap.level, 'moderate')
  assert.equal(snap.ageMonths, 110)
  assert.equal(snap.dimensionScores['社交觉察'], 62, 'object 模式应取 tScore 字段')
  assert.equal(snap.dimensionScores['社交认知'], 65)
}

// ---------- 9. normalizeByConfig flat-number 模式（CBCL）+ extra ----------
{
  const { normalizeByConfig } = await import('../src/services/assessment-score-normalize.ts')
  const cbclConfig = {
    scaleCode: 'cbcl',
    totalScoreField: 'total_problems_t_score',
    levelField: 'summary_level',
    dimensionScoresField: 'factor_t_scores',
    dimensionMode: 'flat-number' as const,
    extraFields: ['internalizing_t_score', 'externalizing_t_score'],
  }
  const row = {
    id: 302,
    age_months: 120,
    total_problems_t_score: 68,
    summary_level: 'clinical',
    factor_t_scores: JSON.stringify({ '抑郁': 66, '社交退缩': 63, '多动': 71 }),
    internalizing_t_score: 67,
    externalizing_t_score: 70,
    created_at: '2026-06-01T10:00:00Z',
  }
  const snap = normalizeByConfig(row, cbclConfig)
  assert.equal(snap.totalScore, 68)
  assert.equal(snap.level, 'clinical')
  assert.equal(snap.dimensionScores['抑郁'], 66, 'flat-number 模式 key 直接是维度名')
  assert.equal(snap.dimensionScores['多动'], 71)
  assert.deepEqual(snap.extra, { internalizing_t_score: 67, externalizing_t_score: 70 }, 'extra 应含宽带 T 分')
}

// ---------- 10. normalizeByConfig 原始分模式（SDQ）----------
{
  const { normalizeByConfig } = await import('../src/services/assessment-score-normalize.ts')
  const sdqConfig = {
    scaleCode: 'sdq',
    totalScoreField: 'total_difficulties_score',
    levelField: 'level',
    dimensionScoresField: 'dimension_scores',
    dimensionMode: 'object' as const,
    dimensionScoreField: 'rawScore',
    dimensionNameField: 'name',
  }
  const row = {
    id: 303,
    age_months: 96,
    total_difficulties_score: 16,
    level: 'borderline',
    dimension_scores: JSON.stringify({
      emotional: { name: '情绪症状', rawScore: 4, level: 'normal' },
      prosocial: { name: '亲社会行为', rawScore: 7, level: 'normal' },
    }),
    created_at: '2026-04-15T11:00:00Z',
  }
  const snap = normalizeByConfig(row, sdqConfig)
  assert.equal(snap.totalScore, 16)
  assert.equal(snap.level, 'borderline')
  assert.equal(snap.dimensionScores['情绪症状'], 4, 'SDQ 应取 rawScore 而非 tScore')
  assert.equal(snap.dimensionScores['亲社会行为'], 7)
}

// ---------- 11. normalizeByConfig 脏数据容错 ----------
{
  const { normalizeByConfig } = await import('../src/services/assessment-score-normalize.ts')
  const config = {
    scaleCode: 'test',
    totalScoreField: 'total',
    levelField: 'level',
    dimensionScoresField: 'dims',
    dimensionMode: 'object' as const,
    dimensionScoreField: 'tScore',
    dimensionNameField: 'name',
  }
  // dimension JSON 缺失 + 部分维度无 tScore
  const row = {
    id: 304,
    age_months: 60,
    total: 45,
    level: 'normal',
    dims: JSON.stringify({ a: { name: '维度A' }, b: { name: '维度B', tScore: 50 } }),
    created_at: '2026-07-01T00:00:00Z',
  }
  const snap = normalizeByConfig(row, config)
  assert.equal(snap.totalScore, 45)
  assert.equal(snap.dimensionScores['维度A'], null, '缺失 tScore 应补 null')
  assert.equal(snap.dimensionScores['维度B'], 50)
  assert.equal(snap.extra, undefined, '无 extraFields 时 extra 应 undefined')
}

// ---------- 12. ABC/ATEC flat-number 模式（适配器 config 与 DB 行形状）----------
{
  const { normalizeByConfig } = await import('../src/services/assessment-score-normalize.ts')
  // 模拟 ABC 行：dimension_scores 是 { 维度code: rawScore }
  const abcRow = {
    id: 301,
    age_months: 68,
    dimension_scores: JSON.stringify({ sensory: 15, relating: 20, body_object: 8, language: 11, social_self_help: 10 }),
    total_score: 64,
    level: 'borderline',
    created_at: '2026-08-01T00:00:00Z',
  }
  const abcSnap = normalizeByConfig(abcRow, {
    scaleCode: 'abc',
    totalScoreField: 'total_score',
    levelField: 'level',
    dimensionScoresField: 'dimension_scores',
    dimensionMode: 'flat-number',
  })
  assert.equal(abcSnap.totalScore, 64)
  assert.equal(abcSnap.level, 'borderline')
  assert.equal(abcSnap.dimensionScores.sensory, 15)
  assert.equal(abcSnap.dimensionScores.social_self_help, 10)
  assert.equal(Object.keys(abcSnap.dimensionScores).length, 5)

  // 模拟 ATEC 行：subscale_scores 是 { 分量表code: rawScore }
  const atecRow = {
    id: 302,
    age_months: 68,
    subscale_scores: JSON.stringify({ speech: 10, sociability: 15, sensory: 12, health: 20 }),
    total_score: 57,
    level: 'moderate',
    created_at: '2026-09-01T00:00:00Z',
  }
  const atecSnap = normalizeByConfig(atecRow, {
    scaleCode: 'atec',
    totalScoreField: 'total_score',
    levelField: 'level',
    dimensionScoresField: 'subscale_scores',
    dimensionMode: 'flat-number',
  })
  assert.equal(atecSnap.totalScore, 57)
  assert.equal(atecSnap.dimensionScores.speech, 10)
  assert.equal(atecSnap.dimensionScores.health, 20)
  assert.equal(Object.keys(atecSnap.dimensionScores).length, 4)
}

// ---------- 13. 适配器注册表包含 abc/atec（AI 工具 enum 跟进）----------
{
  // adapters 文件 import @/database/*（jiti 不解析别名，无法直接 import），
  // 对注册表做源码断言：abc/atec 适配器已定义并注册。
  const src = (await import('node:fs')).readFileSync(
    (await import('node:path')).resolve(import.meta.dirname, '../src/services/assessment-score-adapters.ts'),
    'utf8'
  )
  assert.ok(/const abcAdapter: ScoreAdapter/.test(src), 'abcAdapter 应已定义')
  assert.ok(/const atecAdapter: ScoreAdapter/.test(src), 'atecAdapter 应已定义')
  assert.ok(/^\s{2}abc: abcAdapter,$/m.test(src), 'abc 应注册进 SCORE_ADAPTERS')
  assert.ok(/^\s{2}atec: atecAdapter,$/m.test(src), 'atec 应注册进 SCORE_ADAPTERS')
}

console.log('assessment-score-adapter test passed (13 场景)')
