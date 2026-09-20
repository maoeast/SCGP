/**
 * ABC 维度分数详情 — 回归测试
 *
 * 运行：npx jiti tests/abc-dimension-rows.test.ts
 *
 * 背景（2026-09-20 修复）：报告页把 dimension_scores 的维度分当数字用，
 * 而演示数据曾写成对象 { name, rawScore }（真实 Driver 写的是数字），
 * 结果「得分」列把对象渲染成 JSON、「占比」列算出 NaN%。
 * 同时报告页硬编码的满分（60/48/72/52）与题库权重真值（38/34/52/34）不符，
 * 占比分母被放大——本次改为从题库派生。
 *
 * 覆盖：
 *  1. ABC_SUBSCALE_MAX_SCORES 由题库权重派生（38/34/52/34），总分满分 158
 *  2. normalizeABCDimensionScores：真实写入形状（数字）
 *  3. normalizeABCDimensionScores：历史演示数据形状（{ name, rawScore } 对象）
 *  4. 脏数据兜底（null / 字符串 / 缺维度）不抛出、不产生 NaN
 *  5. 占比计算：以真实库行（学生 10013 袁梓睿）为例，17/38 = 44.7%
 *  6. 演示数据生成器与题库满分两处一致（防漂移），且不再产出「生活自理」虚维度
 *  7. 演示数据生成结果：维度分为纯数字、不超满分、总分等于各维度之和
 *  8. 演示判级函数 abcLevelFromTotal 与源码 getABCLevel 阈值一致（防两处漂移）
 */
import assert from 'node:assert/strict'
import {
  ABC_QUESTIONS,
  ABC_SUBSCALE_MAX_SCORES,
  ABC_TOTAL_MAX_SCORE,
  getABCLevel,
  normalizeABCDimensionScores,
} from '../src/database/abc-questions.ts'
import {
  ABC_SUBSCALE_MAXES,
  abcLevelFromTotal,
  makeAbcAssessment,
} from '../scripts/seed-demo-data/data.mjs'

const DIMENSION_CODES = ['sensory', 'relating', 'body_object', 'language', 'social_self_help'] as const

/** 库里 dump 出来的真实 JSON（学生 10013 袁梓睿，2026-08-21，演示数据遗留对象形状） */
const LEGACY_DEMO_JSON =
  '{"sensory":{"name":"感觉","rawScore":17},"relating":{"name":"交往","rawScore":21},' +
  '"body_object":{"name":"躯体运动","rawScore":15},"language":{"name":"语言","rawScore":18},' +
  '"social_self_help":{"name":"生活自理","rawScore":17}}'

// ---------- 1. 满分常量由题库权重派生 ----------
{
  assert.deepEqual(ABC_SUBSCALE_MAX_SCORES, {
    sensory: 38,
    relating: 34,
    body_object: 52,
    language: 34,
    social_self_help: 0,
  })
  assert.equal(ABC_TOTAL_MAX_SCORE, 158)

  // 派生值必须等于题库权重求和（手写常量漂移会在此暴露）
  const derived: Record<string, number> = {}
  for (const question of ABC_QUESTIONS) {
    derived[question.dimension] = (derived[question.dimension] ?? 0) + question.weight
  }
  for (const code of DIMENSION_CODES) {
    assert.equal(
      ABC_SUBSCALE_MAX_SCORES[code],
      derived[code] ?? 0,
      `${code} 满分应等于题库权重之和`,
    )
  }
  assert.equal(ABC_QUESTIONS.length, 57, '题库应为 57 题')
}

// ---------- 2. 真实写入形状：{ 维度code: 数字 } ----------
{
  const scores = normalizeABCDimensionScores({
    sensory: 38,
    relating: 34,
    body_object: 48,
    language: 34,
    social_self_help: 0,
  })
  assert.deepEqual(scores, {
    sensory: 38,
    relating: 34,
    body_object: 48,
    language: 34,
    social_self_help: 0,
  })
}

// ---------- 3. 历史演示数据形状：{ 维度code: { name, rawScore } } ----------
{
  const scores = normalizeABCDimensionScores(JSON.parse(LEGACY_DEMO_JSON))
  assert.deepEqual(scores, {
    sensory: 17,
    relating: 21,
    body_object: 15,
    language: 18,
    social_self_help: 17,
  })
  for (const code of DIMENSION_CODES) {
    assert.equal(typeof scores[code], 'number', `${code} 归一化后必须是数字`)
  }
}

// ---------- 4. 脏数据兜底 ----------
{
  const zeros = { sensory: 0, relating: 0, body_object: 0, language: 0, social_self_help: 0 }
  assert.deepEqual(normalizeABCDimensionScores(null), zeros)
  assert.deepEqual(normalizeABCDimensionScores('not-an-object'), zeros)
  assert.equal(normalizeABCDimensionScores({ sensory: 'abc' }).sensory, 0)
  assert.equal(normalizeABCDimensionScores({ sensory: null }).sensory, 0)
  assert.equal(normalizeABCDimensionScores({ sensory: Number.NaN }).sensory, 0)
  assert.equal(normalizeABCDimensionScores({ sensory: { rawScore: 'x' } }).sensory, 0)
  // 缺失维度补 0，不抛错
  assert.equal(normalizeABCDimensionScores({ language: 12 }).language, 12)
  assert.equal(normalizeABCDimensionScores({ language: 12 }).sensory, 0)
}

// ---------- 5. 占比：以历史演示行（袁梓睿）为例 ----------
{
  const scores = normalizeABCDimensionScores(JSON.parse(LEGACY_DEMO_JSON))
  const percentageOf = (code: (typeof DIMENSION_CODES)[number]) =>
    ((scores[code] / ABC_SUBSCALE_MAX_SCORES[code]) * 100).toFixed(1)

  assert.equal(percentageOf('sensory'), '44.7') // 17/38
  assert.equal(percentageOf('relating'), '61.8') // 21/34
  assert.equal(percentageOf('body_object'), '28.8') // 15/52
  assert.equal(percentageOf('language'), '52.9') // 18/34
  for (const code of DIMENSION_CODES.slice(0, 4)) {
    assert.equal(Number.isNaN(Number(percentageOf(code))), false, `${code} 占比不应为 NaN`)
  }
  // 满分 0 的维度不该参与占比（报告页会把它过滤掉）
  assert.equal(ABC_SUBSCALE_MAX_SCORES.social_self_help, 0)
}

// ---------- 6. 演示数据生成器与题库满分一致 ----------
{
  assert.deepEqual(ABC_SUBSCALE_MAXES, {
    sensory: ABC_SUBSCALE_MAX_SCORES.sensory,
    relating: ABC_SUBSCALE_MAX_SCORES.relating,
    body_object: ABC_SUBSCALE_MAX_SCORES.body_object,
    language: ABC_SUBSCALE_MAX_SCORES.language,
  })
  assert.equal(
    'social_self_help' in ABC_SUBSCALE_MAXES,
    false,
    '演示数据不应再声明题库里没有题目的「生活自理」维度',
  )
}

// ---------- 7. 演示数据生成结果：数字形状 + 不超满分 + 总分自洽 ----------
{
  const rng = {
    rand: () => 0.5,
    float: (min: number, max: number) => (min + max) / 2,
    int: (min: number) => min,
  }
  const student = { id: 10013, ageMonths: 74, disorder: '孤独症谱系障碍' }
  const { table, row } = makeAbcAssessment(student, rng, {
    date: new Date('2026-08-21T00:00:00Z'),
    improvement: 1,
  })

  assert.equal(table, 'abc_assess')
  const dimensionScores = JSON.parse(row.dimension_scores)
  assert.deepEqual(Object.keys(dimensionScores).sort(), [
    'body_object',
    'language',
    'relating',
    'sensory',
  ])

  let sum = 0
  for (const [code, value] of Object.entries(dimensionScores)) {
    assert.equal(typeof value, 'number', `${code} 必须是数字（不能是对象）`)
    const max = ABC_SUBSCALE_MAX_SCORES[code as keyof typeof ABC_SUBSCALE_MAX_SCORES]
    assert.ok(
      Number(value) >= 0 && Number(value) <= max,
      `${code}=${value} 应在 0-${max}（题库满分）之间`,
    )
    sum += Number(value)
  }
  assert.equal(row.total_score, sum, '总分应等于各维度分之和')
  assert.equal(row.level, abcLevelFromTotal(sum))
}

// ---------- 8. 演示判级函数与源码判级阈值一致（防两处漂移） ----------
{
  for (const total of [0, 1, 48, 49, 61, 62, 79, 80, 99, 100, 120, 158]) {
    assert.equal(
      abcLevelFromTotal(total),
      getABCLevel(total),
      `总分 ${total} 的判级应与源码 getABCLevel 一致`,
    )
  }
}

console.log('✓ abc-dimension-rows: all assertions passed')
