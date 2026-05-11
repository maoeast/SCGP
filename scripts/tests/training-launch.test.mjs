import test from 'node:test'
import assert from 'node:assert/strict'
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

test('task_training launches to the self-care task shell', () => {
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

  assert.equal(route?.path, '/self-care/tasks')
  assert.deepEqual(route?.query, {
    from: 'plan',
    module: 'life_skills',
    planId: '12',
    resourceId: '34',
    resourceName: '穿衣练习',
    studentId: '7',
    studentName: '测试学生',
  })
})
