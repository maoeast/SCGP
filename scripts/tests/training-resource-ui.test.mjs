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

function loadTrainingResourceUi() {
  return jiti('../../src/views/resource-center/training-resource-ui.ts')
}

function loadModuleTypes() {
  return jiti('../../src/types/module.ts')
}

test('task_training resource UI branches use the self-care contract constants', () => {
  const source = readFileSync(resolve(projectRoot, 'src/views/resource-center/training-resource-ui.ts'), 'utf8')

  assert.match(source, /TASK_TRAINING_RESOURCE_TYPE/)
  assert.match(source, /TASK_TRAINING_ENTRY_CODE/)
  assert.match(source, /TASK_TRAINING_MODULE_CODE/)
  assert.doesNotMatch(source, /code:\s*['"]task_training['"]/)
  assert.doesNotMatch(source, /return ['"]task_training['"]/)
  assert.doesNotMatch(source, /resourceType === ['"]task_training['"]/)
  assert.doesNotMatch(source, /businessGroupCode === ['"]life-skills['"]/)
})

test('life-skills create options expose task_training and default to it', () => {
  const { getTrainingResourceTypeOptions, resolveTrainingResourceDefaultCreateType } = loadTrainingResourceUi()
  const { ModuleCode } = loadModuleTypes()

  const options = getTrainingResourceTypeOptions(ModuleCode.LIFE_SKILLS)

  assert.equal(options.some((option) => option.code === 'task_training' && option.name === '自理任务'), true)
  assert.equal(resolveTrainingResourceDefaultCreateType({
    businessGroupCode: 'life-skills',
    displayType: '',
    moduleCode: ModuleCode.LIFE_SKILLS,
    isEmotionalBusinessGroup: false,
  }), 'task_training')
})

test('non-life-skills create options keep task_training hidden', () => {
  const { getTrainingResourceTypeOptions } = loadTrainingResourceUi()
  const { ModuleCode } = loadModuleTypes()

  const options = getTrainingResourceTypeOptions(ModuleCode.SENSORY)

  assert.equal(options.some((option) => option.code === 'task_training'), false)
})

test('task_training uses a dedicated icon and style class in the resource list', () => {
  const { getTrainingResourceTypeIcon, getTrainingResourceTypeIconClass } = loadTrainingResourceUi()

  assert.notEqual(
    getTrainingResourceTypeIcon('task_training'),
    getTrainingResourceTypeIcon('default'),
  )
  assert.equal(getTrainingResourceTypeIconClass('task_training'), 'type-task-training')
})
