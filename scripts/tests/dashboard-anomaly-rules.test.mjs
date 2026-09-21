import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

// 首页看板「本周异常预警」契约：
// 1. 扫描源必须是统一训练主表 `training_session`（统一训练记录计划 Phase C 口径）。
//    历史事故：旧实现直扫 `training_records` + `emotional_training_session` 两张旧表，
//    漏掉只写统一主表的入口（cognitive_game_inline 实测 20 条），并把器材/情绪游戏的
//    得分率当成答对率（实测 55 条器材行会被误标为「正确率低」）。
// 2. 阈值与状态枚举只在 `training-anomaly-rules` 里定义一次，dashboard-api 不得内联字面量。
// 3. 判定必须走纯函数 evaluateTrainingAnomaly（规则单一真源，可单测）。

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: { '@': `${projectRoot}/src` },
})

const readRepoFile = (rel) => readFileSync(resolve(projectRoot, rel), 'utf8')

/** 取出异常查询方法的源码体（其余查询可合法直扫 legacy 表，不能整文件断言） */
function readAnomalyMethodSource() {
  const source = readRepoFile('src/database/dashboard-api.ts')
  const match = source.match(/async getWeeklyAnomalies\(\)[\s\S]*?\n  \}/)
  assert.ok(match, 'dashboard-api 中未找到 getWeeklyAnomalies 方法')
  return match[0]
}

test('1. 异常扫描以统一主表 training_session 为唯一数据源', () => {
  const method = readAnomalyMethodSource()

  assert.match(method, /FROM training_session ts/, '异常查询必须以 training_session 为主表')
  assert.doesNotMatch(method, /FROM training_records\b/, '异常查询不得再直扫 legacy 表 training_records')
  assert.doesNotMatch(method, /FROM emotional_training_session\b/, '异常查询不得再直扫 emotional_training_session')
  assert.doesNotMatch(method, /emotional_training_detail/, '不得再依赖空的明细表算提示依赖')
})

test('2. 规则常量单一真源：dashboard-api 不得内联阈值或状态枚举', () => {
  const source = readRepoFile('src/database/dashboard-api.ts')
  const method = readAnomalyMethodSource()
  const rules = jiti('../../src/database/training-anomaly-rules.ts')

  assert.match(method, /ANOMALY_WINDOW_DAYS/, '窗口天数必须来自规则模块常量')
  assert.match(method, /evaluateTrainingAnomaly\(/, '判定必须走纯函数 evaluateTrainingAnomaly')
  assert.match(method, /anomalySeverityRank\(/, '排序必须用规则模块的严重度口径')
  assert.doesNotMatch(method, /accuracy_rate\s*<\s*0\.5/, 'SQL 内不得内联正确率阈值')
  assert.doesNotMatch(source, /average_hint_level/, '旧提示层级字段不得残留')
  assert.doesNotMatch(method, /'interrupted'|'aborted'|'cancelled'/, '状态枚举不得内联在异常查询里')

  assert.equal(typeof rules.ANOMALY_WINDOW_DAYS, 'number', '窗口天数必须是数字常量')
  assert.equal(typeof rules.ACCURACY_ANOMALY_THRESHOLD, 'number', '正确率阈值必须是数字常量')
  assert.equal(typeof rules.HINT_RATIO_ANOMALY_THRESHOLD, 'number', '提示比阈值必须是数字常量')
  assert.equal(typeof rules.EQUIPMENT_PROMPT_LEVEL_THRESHOLD, 'number', '器材提示层级阈值必须是数字常量')
})
test('3. 答对率白名单显式排除「得分率」家族', () => {
  const rules = jiti('../../src/database/training-anomaly-rules.ts')
  const families = rules.ACCURACY_RATIO_FAMILIES

  assert.ok(Array.isArray(families) && families.length > 0, '白名单必须是非空数组')
  for (const excluded of ['equipment', 'emotional_game']) {
    assert.ok(
      !families.includes(excluded),
      `家族 ${excluded} 的 accuracy_rate 是得分率（源表无 accuracy 列），不得参与低正确率判定`,
    )
  }
  for (const included of ['game', 'task_training', 'care_scene', 'emotion_scene']) {
    assert.ok(families.includes(included), `家族 ${included} 的 accuracy_rate 是答对率，应在白名单内`)
  }
});

test('4. 未完成状态枚举与统一训练链文档口径一致', () => {
  const rules = jiti('../../src/database/training-anomaly-rules.ts')
  assert.deepEqual(
    [...rules.INCOMPLETE_COMPLETION_STATUSES].sort(),
    ['aborted', 'cancelled', 'interrupted'],
    '未完成枚举须与 unified-training-record-schema-plan §7.2 的 completed/cancelled/interrupted/aborted 一致',
  )
  assert.ok(
    !rules.INCOMPLETE_COMPLETION_STATUSES.includes('completed'),
    'completed 不得算作未完成',
  )
})
