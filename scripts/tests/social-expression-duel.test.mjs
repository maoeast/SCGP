import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
})

test('custom game registry includes expression duel under social communication as a 2-player camera game', () => {
  const { getRequiredCustomGameDefinition } = jiti('../../src/data/custom-game-registry.ts')
  const definition = getRequiredCustomGameDefinition('S06_EXPRESSION_DUEL')

  assert.equal(definition.trainingEntryCode, 'social-communication')
  assert.equal(definition.moduleCode, 'social')
  assert.equal(definition.entryPath, '/emotional/games/expression-duel')
  assert.equal(definition.maxPlayers, 2)
  assert.deepEqual(definition.requiredPermissions, ['camera'])
})

test('router wires the expression duel immersive page', () => {
  const source = readFileSync(resolve(projectRoot, 'src/router/index.ts'), 'utf8')

  assert.match(source, /const ExpressionDuelPage = \(\) => import\('@\/views\/emotional\/games\/ExpressionDuelPage\.vue'\)/)
  assert.match(source, /path: 'emotional\/games\/expression-duel'/)
  assert.match(source, /name: 'ExpressionDuelGame'/)
  assert.match(source, /component: ExpressionDuelPage/)
  assert.match(source, /immersiveShell: true/)
})

test('expression duel helper sorts shared-camera faces, computes similarity, and summarizes duel results', () => {
  const {
    assignDuelFacesByHorizontalOrder,
    computeExpressionDuelSimilarity,
    buildExpressionDuelPerformanceData,
  } = jiti('../../src/components/emotional/games/expression-duel.ts')

  const assigned = assignDuelFacesByHorizontalOrder([
    { centerX: 0.76, label: 'right-face' },
    { centerX: 0.22, label: 'left-face' },
  ])

  assert.equal(assigned.left?.label, 'left-face')
  assert.equal(assigned.right?.label, 'right-face')

  const identical = computeExpressionDuelSimilarity(
    { mouthSmileLeft: 0.7, mouthSmileRight: 0.7, jawOpen: 0.1, browInnerUp: 0.1 },
    { mouthSmileLeft: 0.7, mouthSmileRight: 0.7, jawOpen: 0.1, browInnerUp: 0.1 },
  )
  const mismatch = computeExpressionDuelSimilarity(
    { mouthSmileLeft: 0.8, mouthSmileRight: 0.8, jawOpen: 0.1, browInnerUp: 0.05 },
    { mouthSmileLeft: 0.05, mouthSmileRight: 0.05, jawOpen: 0.8, browInnerUp: 0.7 },
  )

  assert.equal(identical, 100)
  assert.equal(mismatch < 55, true)

  const summary = buildExpressionDuelPerformanceData({
    rounds: [
      {
        setterSide: 'left',
        mimicSide: 'right',
        setterName: '小明',
        mimicName: '小红',
        similarityRatio: 0.82,
        score: 100,
        mimicDurationMs: 2400,
        earlySuccess: true,
      },
      {
        setterSide: 'right',
        mimicSide: 'left',
        setterName: '小红',
        mimicName: '小明',
        similarityRatio: 0.64,
        score: 70,
        mimicDurationMs: 3100,
        earlySuccess: false,
      },
    ],
    participantNames: ['小明', '小红'],
    participantStudentIds: [101, 202],
    totalRounds: 2,
    scores: { left: 70, right: 100 },
    teacherBonuses: { left: 10, right: 0 },
    cameraMode: 'shared',
    cameraDeviceLabel: '前置摄像头',
    detectedCameraCount: 1,
  })

  assert.equal(summary.completed_rounds, 2)
  assert.equal(summary.target_round_count, 2)
  assert.equal(summary.average_similarity_ratio, 0.73)
  assert.equal(summary.best_similarity_ratio, 0.82)
  assert.equal(summary.early_success_rounds, 1)
  assert.equal(summary.average_mimic_duration_ms, 2750)
  assert.deepEqual(summary.participant_names, ['小明', '小红'])
  assert.deepEqual(summary.participant_scores, { left: 80, right: 100 })
  assert.equal(summary.camera_mode, 'shared')
})

test('emotion game persistence and record detail expose expression duel summary fields', () => {
  const apiSource = readFileSync(resolve(projectRoot, 'src/database/emotional-games-api.ts'), 'utf8')
  const detailSource = readFileSync(resolve(projectRoot, 'src/views/emotional/GameRecordDetail.vue'), 'utf8')

  assert.match(apiSource, /case 'S06_EXPRESSION_DUEL':/)
  assert.match(apiSource, /average_similarity_ratio/)
  assert.match(apiSource, /average_mimic_duration_ms/)
  assert.match(detailSource, /case 'S06_EXPRESSION_DUEL':/)
  assert.match(detailSource, /平均相似度/)
  assert.match(detailSource, /最高相似度/)
  assert.match(detailSource, /参与学生/)
  assert.match(detailSource, /轮次记录/)
})
