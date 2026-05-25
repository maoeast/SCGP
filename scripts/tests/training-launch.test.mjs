import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const require = createRequire(import.meta.url)
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
})

function loadTrainingLaunch() {
  const resourceApiPath = resolve(projectRoot, 'src/database/resource-api.ts')
  require.cache[resourceApiPath] = {
    id: resourceApiPath,
    filename: resourceApiPath,
    loaded: true,
    exports: {
      ResourceAPI: class {
        getResourceById() {
          return null
        }
      },
    },
  }

  return jiti('../../src/utils/training-launch.ts')
}

test('task_training launch branch uses the self-care contract constant', () => {
  const source = readFileSync(resolve(projectRoot, 'src/utils/training-launch.ts'), 'utf8')

  assert.match(source, /case TASK_TRAINING_RESOURCE_TYPE:/)
  assert.doesNotMatch(source, /case ['"]task_training['"]:/)
})

test('task_training launches to the self-care execution route', () => {
  const { buildTrainingLaunchRoute } = loadTrainingLaunch()

  const route = buildTrainingLaunchRoute({
    studentId: 7,
    studentName: '测试学生',
    planId: 12,
    source: 'plan',
    moduleCode: 'life_skills',
    resourceId: 34,
    resourceType: 'task_training',
    resourceName: '穿衣练习',
  })

  assert.equal(route?.path, '/self-care/execute/34/7')
  assert.deepEqual(route?.query, {
    entry: 'life-skills',
    from: 'plan',
    module: 'life_skills',
    planId: '12',
    resourceName: '穿衣练习',
    studentName: '测试学生',
  })
})

test('training launch authorization prefers entry entitlement over top-level module access', () => {
  const { resolveTrainingLaunch } = loadTrainingLaunch()

  const blocked = resolveTrainingLaunch(
    {
      studentId: 7,
      moduleCode: 'sensory',
      resourceId: 99,
      resourceType: 'game',
    },
    (moduleCode) => moduleCode === 'sensory',
    (entitlementCode) => entitlementCode !== 'sensory_integration',
  )

  assert.equal(blocked.authorized, false)
  assert.equal(blocked.route, null)
  assert.equal(blocked.requiredModuleCode, 'sensory')
  assert.equal(blocked.requiredEntitlementCode, 'sensory_integration')

  const allowed = resolveTrainingLaunch(
    {
      studentId: 7,
      moduleCode: 'sensory',
      resourceId: 99,
      resourceType: 'game',
    },
    () => false,
    (entitlementCode) => entitlementCode === 'sensory_integration',
  )

  assert.equal(allowed.authorized, true)
  assert.equal(allowed.requiredEntitlementCode, 'sensory_integration')
  assert.equal(allowed.route?.path, '/games/play')
})
