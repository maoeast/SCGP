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

function loadResourceCenterBusiness() {
  return jiti('../../src/utils/resource-center-business.ts')
}

test('task_training resource center branches use the self-care contract constants', () => {
  const source = readFileSync(resolve(projectRoot, 'src/utils/resource-center-business.ts'), 'utf8')

  assert.match(source, /resource\.resourceType === TASK_TRAINING_RESOURCE_TYPE/)
  assert.match(source, /return TASK_TRAINING_RESOURCE_DISPLAY_TYPE/)
  assert.match(source, /return TASK_TRAINING_ENTRY_CODE/)
  assert.doesNotMatch(source, /resource\.resourceType === ['"]task_training['"]/)
})

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

test('training resources adapt to capability package access control', () => {
  const { adaptTrainingResourceAccessControlledItem } = loadResourceCenterBusiness()

  assert.deepEqual(
    adaptTrainingResourceAccessControlledItem({
      moduleCode: 'sensory',
      resourceType: 'game',
      category: 'fine-motor',
      metadata: {
        trainingEntryCode: 'fine-motor',
      },
    }),
    {
      accessScope: 'entitlement',
      moduleCode: 'sensory',
      entitlementCode: 'fine_motor',
    },
  )

  assert.deepEqual(
    adaptTrainingResourceAccessControlledItem({
      moduleCode: 'emotional',
      resourceType: 'care_scene',
      category: 'care',
      metadata: {},
    }),
    {
      accessScope: 'entitlement',
      moduleCode: 'emotional',
      entitlementCode: 'emotional',
    },
  )
})
