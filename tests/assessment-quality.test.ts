/**
 * 评估作答质量指标 — 单元测试
 *
 * 运行：npx jiti tests/assessment-quality.test.ts
 *
 * 覆盖 computeAssessmentQualityMetrics 纯函数（宽松质控口径）：
 *  1. 快速作答（<3秒/题）→ very_fast
 *  2. 偏快作答（3-5秒/题）→ fast
 *  3. 正常作答（≥5秒/题）→ qualityNote null
 *  4. 边界值：恰好 3 秒/题 → fast；恰好 5 秒/题 → null
 *  5. 0 题守卫：answeredCount <= 0 → null
 *  6. 时间缺失/异常守卫：startTime/endTime 缺失或 end < start → null
 *  7. totalDuration / avgResponseTime 数值正确性
 *  8. CompleteDialog 提示阈值独立于 qualityNote（2 秒提示线 vs 3 秒标记线）
 */
import assert from 'node:assert/strict'
import {
  computeAssessmentQualityMetrics,
  QUALITY_NOTE_VERY_FAST_THRESHOLD_SEC,
  QUALITY_NOTE_FAST_THRESHOLD_SEC,
} from '../src/types/assessment.ts'

// ---------- 1. 快速作答 → very_fast ----------
{
  // 10 题 20 秒 = 2 秒/题
  const m = computeAssessmentQualityMetrics(1000000, 1020000, 10)
  assert.ok(m, '正常输入应返回指标对象')
  assert.equal(m.totalDuration, 20)
  assert.equal(m.avgResponseTime, 2)
  assert.equal(m.qualityNote, 'very_fast')
}

// ---------- 2. 偏快作答 → fast ----------
{
  // 10 题 40 秒 = 4 秒/题
  const m = computeAssessmentQualityMetrics(0, 40000, 10)
  assert.ok(m)
  assert.equal(m.avgResponseTime, 4)
  assert.equal(m.qualityNote, 'fast')
}

// ---------- 3. 正常作答 → null ----------
{
  // 10 题 60 秒 = 6 秒/题
  const m = computeAssessmentQualityMetrics(0, 60000, 10)
  assert.ok(m)
  assert.equal(m.avgResponseTime, 6)
  assert.equal(m.qualityNote, null)
}

// ---------- 4. 边界值 ----------
{
  // 恰好 3 秒/题：不满足 <3，落入 fast
  const m3 = computeAssessmentQualityMetrics(0, 30000, 10)
  assert.equal(m3.avgResponseTime, 3)
  assert.equal(m3.qualityNote, 'fast')

  // 恰好 5 秒/题：不满足 <5，为 null
  const m5 = computeAssessmentQualityMetrics(0, 50000, 10)
  assert.equal(m5.avgResponseTime, 5)
  assert.equal(m5.qualityNote, null)
}

// ---------- 5. 0 题守卫 ----------
{
  assert.equal(computeAssessmentQualityMetrics(0, 60000, 0), null, '0 题应返回 null')
  assert.equal(computeAssessmentQualityMetrics(0, 60000, -1), null, '负题数应返回 null')
}

// ---------- 6. 时间缺失/异常守卫 ----------
{
  assert.equal(computeAssessmentQualityMetrics(undefined, 1000, 5), null, '缺 startTime → null')
  assert.equal(computeAssessmentQualityMetrics(1000, undefined, 5), null, '缺 endTime → null')
  assert.equal(computeAssessmentQualityMetrics(2000, 1000, 5), null, 'end < start → null')
  assert.equal(computeAssessmentQualityMetrics(Number.NaN, 1000, 5), null, 'NaN → null')
  assert.equal(computeAssessmentQualityMetrics(Infinity, 1000, 5), null, 'Infinity → null')
}

// ---------- 7. 数值正确性 ----------
{
  // 25 题 8 分 20 秒 = 500 秒，20 秒/题
  const m = computeAssessmentQualityMetrics(
    new Date('2026-01-01T08:00:00Z').getTime(),
    new Date('2026-01-01T08:08:20Z').getTime(),
    25
  )
  assert.ok(m)
  assert.equal(m.totalDuration, 500)
  assert.equal(m.avgResponseTime, 20)
  assert.equal(m.qualityNote, null)
}

// ---------- 8. 阈值常量与提示线关系 ----------
{
  // 标记线：very_fast < 3 秒/题；fast < 5 秒/题
  assert.equal(QUALITY_NOTE_VERY_FAST_THRESHOLD_SEC, 3)
  assert.equal(QUALITY_NOTE_FAST_THRESHOLD_SEC, 5)
  // CompleteDialog 的提示线是独立常量（2 秒/题），比 very_fast 标记线更严：
  // avg ∈ [2,3) 时只标记 very_fast 入库、不弹提示
  const m = computeAssessmentQualityMetrics(0, 25000, 10) // 2.5 秒/题
  assert.equal(m.qualityNote, 'very_fast')
  // 提示条件在 CompleteDialog 内联为 avg > 0 && avg < 2，此处验证数据口径一致（秒）
  assert.equal(typeof m.avgResponseTime, 'number')
  assert.ok(m.avgResponseTime >= 2, '2.5 秒/题 ≥ 2 秒提示线，不应触发 CompleteDialog 提示')
}

console.log('✅ assessment-quality.test.ts 全部断言通过（8 组用例）')
