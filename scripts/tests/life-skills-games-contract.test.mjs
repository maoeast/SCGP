import test from 'node:test'
import assert from 'node:assert/strict'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url, {
  alias: { '@/': new URL('../../src/', import.meta.url).pathname },
})

function loadRegistry() {
  return jiti('../../src/data/custom-game-registry.ts')
}

function loadNormalizer() {
  return jiti('../../src/utils/game-performance-normalizer.ts')
}

const NEW_CODES = ['L06_STEADY_SPOON', 'L07_BODY_SIGNAL', 'L08_TOWEL_TWIST', 'L09_HOME_SOUND', 'L10_MARKET_PAY']

test('L06–L10 注册表合同：单人、life-skills 入口、无权限、/life-skills/games 路由、徽章齐全', () => {
  const { getCustomGameDefinition } = loadRegistry()

  for (const code of NEW_CODES) {
    const definition = getCustomGameDefinition(code)
    assert.ok(definition, `注册表应包含 ${code}`)
    assert.equal(definition.moduleCode, 'life_skills', `${code} moduleCode 应为 life_skills`)
    assert.equal(definition.trainingEntryCode, 'life-skills', `${code} trainingEntryCode 应为 life-skills`)
    assert.equal(definition.maxPlayers, 1, `${code} 应为单人游戏`)
    assert.deepEqual(definition.requiredPermissions, [], `${code} 不应申请摄像头/麦克风`)
    assert.equal(definition.permissionPolicy, 'all_required', `${code} permissionPolicy 应为 all_required`)
    assert.ok(definition.entryPath.startsWith('/life-skills/games/'), `${code} entryPath 应使用 /life-skills/games/ 前缀`)
    assert.ok(definition.badge.badgeCode.startsWith('BADGE_'), `${code} 应配置徽章`)
    assert.ok(definition.name.length > 0, `${code} 应有中文名`)
  }
})

test('大厅可通过 life-skills trainingEntryCode 查询到五款新游戏', () => {
  const { getCustomGamesByTrainingEntry } = loadRegistry()
  const codes = getCustomGamesByTrainingEntry('life-skills').map((game) => game.gameCode)
  for (const code of NEW_CODES) {
    assert.ok(codes.includes(code), `life-skills 大厅应包含 ${code}`)
  }
})

test('注册表 gameCode 不应重复', () => {
  const { CUSTOM_GAME_REGISTRY } = loadRegistry()
  const allCodes = CUSTOM_GAME_REGISTRY.map((game) => game.gameCode)
  assert.equal(new Set(allCodes).size, allCodes.length)
})

test('L06 稳稳送一勺：稳定采样占比作正确率、平均送达作反应时、total_duration_seconds 作时长', () => {
  const { normalizeGameMetrics } = loadNormalizer()
  const metrics = normalizeGameMetrics('L06_STEADY_SPOON', {
    event: 'game_complete',
    target_scoops: 4,
    delivered_scoops: 4,
    stable_motion_ratio: 0.82,
    path_deviation_ratio: 0.11,
    average_delivery_ms: 1400,
    total_duration_seconds: 88,
  }, 100000)
  assert.equal(metrics.hasRealData, true)
  assert.equal(metrics.accuracy, 0.82)
  assert.equal(metrics.avgResponseTimeMs, 1400)
  assert.equal(metrics.durationSec, 88)
})

test('L07 身体信号小灯塔：派生 recognized/(recognized+wrong)', () => {
  const { normalizeGameMetrics } = loadNormalizer()
  const metrics = normalizeGameMetrics('L07_BODY_SIGNAL', {
    recognized_signals: 3,
    wrong_signal_choices: 1,
    average_response_ms: 2600,
    total_duration_seconds: 60,
  }, 100000)
  assert.equal(metrics.hasRealData, true)
  assert.equal(metrics.accuracy, 0.75)
  assert.equal(metrics.avgResponseTimeMs, 2600)
  assert.equal(metrics.durationSec, 60)
})

test('L08 毛巾拧拧工坊：协调占比作正确率', () => {
  const { normalizeGameMetrics } = loadNormalizer()
  const metrics = normalizeGameMetrics('L08_TOWEL_TWIST', {
    target_twists: 3,
    completed_twists: 3,
    coordinated_motion_ratio: 0.9,
    average_twist_ms: 3100,
    total_duration_seconds: 45,
  }, 100000)
  assert.equal(metrics.hasRealData, true)
  assert.equal(metrics.accuracy, 0.9)
  assert.equal(metrics.avgResponseTimeMs, 3100)
  assert.equal(metrics.durationSec, 45)
})

test('L09 家里声音小侦探：sumCorrect 合并 (source_matches + safe_responses) / 全部来源与行动选择', () => {
  const { normalizeGameMetrics } = loadNormalizer()
  const metrics = normalizeGameMetrics('L09_HOME_SOUND', {
    source_matches: 3,
    wrong_source_choices: 1,
    safe_responses: 2,
    unsafe_response_choices: 1,
    average_response_ms: 3200,
    total_duration_seconds: 70,
  }, 100000)
  assert.equal(metrics.hasRealData, true)
  assert.equal(metrics.accuracy, 5 / 7)
  assert.equal(metrics.avgResponseTimeMs, 3200)
  assert.equal(metrics.durationSec, 70)
})

test('L10 超市付款小能手：派生 exact/(exact+incorrect)', () => {
  const { normalizeGameMetrics } = loadNormalizer()
  const metrics = normalizeGameMetrics('L10_MARKET_PAY', {
    target_purchases: 3,
    completed_purchases: 3,
    exact_payments: 2,
    incorrect_payment_checks: 2,
    average_payment_ms: 5200,
    total_duration_seconds: 95,
  }, 100000)
  assert.equal(metrics.hasRealData, true)
  assert.equal(metrics.accuracy, 0.5)
  assert.equal(metrics.avgResponseTimeMs, 5200)
  assert.equal(metrics.durationSec, 95)
})

test('空壳数据应判为非真实数据（hasRealData false）', () => {
  const { normalizeGameMetrics } = loadNormalizer()
  for (const code of NEW_CODES) {
    const metrics = normalizeGameMetrics(code, { event: 'game_complete' }, 5000)
    assert.equal(metrics.hasRealData, false, `${code} 空壳数据 hasRealData 应为 false`)
  }
})
