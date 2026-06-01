import test from 'node:test'
import assert from 'node:assert/strict'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)

function loadTrainingRouteAccess() {
  return jiti('../../src/utils/training-route-access.ts')
}

test('games menu should not fall back to sensory module without explicit entry context', () => {
  const { resolveRouteModuleCode } = loadTrainingRouteAccess()

  const moduleCode = resolveRouteModuleCode({
    path: '/games/menu',
    queryEntry: undefined,
    queryModule: undefined,
  })

  assert.equal(moduleCode, '')
})

test('training records menu should not fall back to sensory module without explicit entry context', () => {
  const { resolveRouteModuleCode } = loadTrainingRouteAccess()

  const moduleCode = resolveRouteModuleCode({
    path: '/training-records/menu',
    paramsEntryCode: undefined,
    paramsModuleCode: undefined,
  })

  assert.equal(moduleCode, '')
})

test('games entry route still resolves emotional module when entry is emotional-regulation', () => {
  const { resolveRouteModuleCode } = loadTrainingRouteAccess()

  const moduleCode = resolveRouteModuleCode({
    path: '/games/select-student',
    queryEntry: 'emotional-regulation',
    queryModule: 'emotional',
  })

  assert.equal(moduleCode, 'emotional')
})

test('training records detail route still resolves emotional module when entry code is emotional-regulation', () => {
  const { resolveRouteModuleCode } = loadTrainingRouteAccess()

  const moduleCode = resolveRouteModuleCode({
    path: '/training-records/emotional-regulation',
    paramsEntryCode: 'emotional-regulation',
  })

  assert.equal(moduleCode, 'emotional')
})
