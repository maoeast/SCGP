/**
 * 首页看板「本周异常预警」判定口径 — 单元测试（纯函数，无 DB 依赖）
 *
 * 运行：npx jiti tests/training-anomaly-rules.test.ts
 *
 * 覆盖：
 *  1. 低正确率：答对率语义家族命中；非语义家族（器材/情绪游戏）不命中
 *  2. 提示依赖：平均每题提示次数 > 0.5 才命中，等于阈值不命中
 *  3. 器材高辅助：提示层级 ≥ 4 命中（含中文等级标签）
 *  4. 未完成：interrupted / aborted / cancelled 命中，completed 不命中
 *  5. 多信号叠加：文案用「；」连接，且 accuracyRate 只在语义家族透出
 *  6. 边界：无数据不猜 0（题数 0 / 缺字段 → hintRatio 为 null）
 *  7. 严重度排序：中断 < 低正确率 < 提示依赖 < 器材高辅助（多信号取最紧急）
 */
import assert from 'node:assert/strict'
import {
  ACCURACY_ANOMALY_THRESHOLD,
  ACCURACY_RATIO_FAMILIES,
  anomalySeverityRank,
  computeHintRatio,
  EQUIPMENT_PROMPT_LEVEL_THRESHOLD,
  evaluateTrainingAnomaly,
  HINT_RATIO_ANOMALY_THRESHOLD,
  INCOMPLETE_COMPLETION_STATUSES,
  isAccuracyRatioFamily,
  type TrainingAnomalyRow,
} from '../src/database/training-anomaly-rules.ts'

/** 造一行统一主表数据（默认：普通游戏、已完成、无提示数据）。 */
function row(overrides: Partial<TrainingAnomalyRow> = {}): TrainingAnomalyRow {
  return {
    sessionFamily: 'game',
    accuracyRate: 0.8,
    completionStatus: 'completed',
    hintCount: null,
    questionCount: null,
    promptLevel: null,
    ...overrides,
  }
}

// ---------- 1. 低正确率 ----------
{
  const hit = evaluateTrainingAnomaly(row({ accuracyRate: 0.42 }))
  assert.ok(hit, '答对率家族低于阈值应命中')
  assert.deepEqual(hit!.kinds, ['low_accuracy'])
  assert.match(hit!.reason, /正确率低于 50%/, `文案应说明阈值，实际 ${hit!.reason}`)
  assert.equal(hit!.accuracyRate, 0.42, '语义家族应透出正确率')

  const atThreshold = evaluateTrainingAnomaly(row({ accuracyRate: ACCURACY_ANOMALY_THRESHOLD }))
  assert.equal(atThreshold, null, '等于阈值不算异常（严格小于）')

  // 器材：源表无 accuracy_rate 列，统一行的值是得分率 → 不得按正确率判定
  const equipment = evaluateTrainingAnomaly(row({ sessionFamily: 'equipment', accuracyRate: 0.4, promptLevel: 3 }))
  assert.equal(equipment, null, '器材家族的得分率不得判为低正确率')
  // 情绪游戏：同理（score/maxScore 得分率）
  const emotionalGame = evaluateTrainingAnomaly(row({ sessionFamily: 'emotional_game', accuracyRate: 0.42 }))
  assert.equal(emotionalGame, null, '情绪游戏家族的得分率不得判为低正确率')

  assert.equal(isAccuracyRatioFamily('equipment'), false, '器材不在答对率家族白名单')
  assert.equal(isAccuracyRatioFamily('emotional_game'), false, '情绪游戏不在答对率家族白名单')
  assert.equal(
    ACCURACY_RATIO_FAMILIES.includes('equipment') || ACCURACY_RATIO_FAMILIES.includes('emotional_game'),
    false,
    '白名单必须显式排除得分率家族',
  )
}

// ---------- 2. 提示依赖（情绪场景） ----------
{
  const hit = evaluateTrainingAnomaly(row({ sessionFamily: 'care_scene', accuracyRate: 0.7, hintCount: 6, questionCount: 10 }))
  assert.ok(hit, '平均每题 0.6 次提示应命中')
  assert.deepEqual(hit!.kinds, ['high_hint_ratio'])
  assert.equal(hit!.hintRatio, 0.6)
  assert.match(hit!.reason, /提示依赖较高/, `文案应说明提示依赖，实际 ${hit!.reason}`)

  const atThreshold = evaluateTrainingAnomaly(row({ sessionFamily: 'care_scene', hintCount: 5, questionCount: 10 }))
  assert.equal(atThreshold, null, `等于 ${HINT_RATIO_ANOMALY_THRESHOLD} 不算异常（严格大于）`)

  // 器材家族即使带 hint 数据也不走该规则（提示数据在 promptLevel 里）
  const equipment = evaluateTrainingAnomaly(row({ sessionFamily: 'equipment', hintCount: 9, questionCount: 10 }))
  assert.equal(equipment, null, '器材家族无情绪会话提示计数，不应命中提示依赖')
}

// ---------- 3. 器材高辅助 ----------
{
  const hit = evaluateTrainingAnomaly(row({ sessionFamily: 'equipment', accuracyRate: 0.4, promptLevel: 5 }))
  assert.ok(hit, '提示层级 5 应命中')
  assert.deepEqual(hit!.kinds, ['high_prompt_level'])
  assert.match(hit!.reason, /身体辅助/, `文案应带等级标签，实际 ${hit!.reason}`)
  assert.equal(hit!.accuracyRate, null, '器材不得透出「正确率」')
  assert.equal(hit!.promptLevel, 5)

  const below = evaluateTrainingAnomaly(row({ sessionFamily: 'equipment', promptLevel: EQUIPMENT_PROMPT_LEVEL_THRESHOLD - 1 }))
  assert.equal(below, null, `提示层级 < ${EQUIPMENT_PROMPT_LEVEL_THRESHOLD} 不算高辅助`)

  // 非器材家族即使 payload 里有同名字段也不判
  const game = evaluateTrainingAnomaly(row({ sessionFamily: 'game', promptLevel: 5 }))
  assert.equal(game, null, '非器材家族不适用器材高辅助规则')
}

// ---------- 4. 未完成 ----------
{
  for (const status of INCOMPLETE_COMPLETION_STATUSES) {
    const hit = evaluateTrainingAnomaly(row({ completionStatus: status }))
    assert.ok(hit, `${status} 应命中未完成`)
    assert.ok(hit!.kinds.includes('incomplete'), `${status} 应带 incomplete 信号`)
  }
  const completed = evaluateTrainingAnomaly(row({ completionStatus: 'completed' }))
  assert.equal(completed, null, 'completed 不算异常')
}

// ---------- 5. 多信号叠加 ----------
{
  const hit = evaluateTrainingAnomaly(row({
    sessionFamily: 'emotion_scene',
    accuracyRate: 0.3,
    hintCount: 8,
    questionCount: 10,
    completionStatus: 'aborted',
  }))
  assert.ok(hit, '多信号应命中')
  assert.deepEqual(hit!.kinds, ['low_accuracy', 'high_hint_ratio', 'incomplete'])
  assert.equal(hit!.reason.split('；').length, 3, `多信号文案应用「；」连接，实际 ${hit!.reason}`)
}

// ---------- 6. 边界：不猜 0 ----------
{
  assert.equal(computeHintRatio(row({ hintCount: 3, questionCount: 0 })), null, '题数 0 不得除零，应返回 null')
  assert.equal(computeHintRatio(row({ hintCount: null, questionCount: 10 })), null, '缺提示次数返回 null')
  assert.equal(computeHintRatio(row({ hintCount: 3, questionCount: null })), null, '缺题数返回 null')
  assert.equal(
    evaluateTrainingAnomaly(row({ sessionFamily: 'care_scene', hintCount: 0, questionCount: 0 })),
    null,
    '无有效题数时不产生提示依赖结论',
  )
}

// ---------- 7. 严重度排序 ----------
{
  const incomplete = anomalySeverityRank(['incomplete'])
  const lowAccuracy = anomalySeverityRank(['low_accuracy'])
  const hintRatio = anomalySeverityRank(['high_hint_ratio'])
  const promptLevel = anomalySeverityRank(['high_prompt_level'])

  assert.ok(incomplete < lowAccuracy, '训练中断应比低正确率更紧急')
  assert.ok(lowAccuracy < hintRatio, '低正确率应比提示依赖更紧急')
  assert.ok(hintRatio < promptLevel, '提示依赖应比器材高辅助更紧急（器材高辅助是常态）')
  assert.equal(
    anomalySeverityRank(['high_prompt_level', 'low_accuracy']),
    lowAccuracy,
    '多信号取最紧急的那条',
  )
}

console.log('training-anomaly-rules test passed (7 场景)')
