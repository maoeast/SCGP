import test from 'node:test'
import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
})

function loadResourceCenterBusiness() {
  return jiti('../../src/utils/resource-center-business.ts')
}

test('task_training resources are visible in the training resource mainline', () => {
  const { isVisibleTrainingResource, resolveTrainingResourceDisplayType } = loadResourceCenterBusiness()

  const resource = {
    resourceType: 'task_training',
  }

  assert.equal(resolveTrainingResourceDisplayType(resource), 'game')
  assert.equal(isVisibleTrainingResource(resource), true)
})

test('task_training resources are grouped under life-skills', () => {
  const { resolveTrainingResourceBusinessGroupCode } = loadResourceCenterBusiness()

  const resource = {
    moduleCode: 'life_skills',
    resourceType: 'task_training',
    category: 'selfcare',
    metadata: {
      trainingEntryCode: 'life-skills',
    },
  }

  assert.equal(resolveTrainingResourceBusinessGroupCode(resource), 'life-skills')
})
