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

function loadTaskTrainingContract() {
  return jiti('../../src/features/self-care/task-training-contract.ts')
}

test('task_training contract can create normalized metadata for resource-center editing', () => {
  const {
    TASK_TRAINING_ENTRY_CODE,
    TASK_TRAINING_MODE,
    createTaskTrainingEditorModel,
  } = loadTaskTrainingContract()

  const metadata = createTaskTrainingEditorModel('穿衣练习')

  assert.equal(metadata.trainingMode, TASK_TRAINING_MODE)
  assert.equal(metadata.trainingEntryCode, TASK_TRAINING_ENTRY_CODE)
  assert.equal(metadata.steps.length, 1)
  assert.equal(metadata.steps[0]?.seq, 1)
  assert.equal(metadata.steps[0]?.text, '')
})

test('task_training contract normalizes sparse metadata into contiguous steps', () => {
  const {
    normalizeTaskTrainingEditorModel,
  } = loadTaskTrainingContract()

  const metadata = normalizeTaskTrainingEditorModel({
    legacyTaskCode: 'TASK_001',
    category: {
      parentName: '进食技能',
    },
    abilityItem: {
      name: '独立进食',
    },
    steps: [
      { id: 'step-b', seq: 9, text: '放下勺子', imagePath: 'images/self-care/spoon-step-2.png' },
      { text: '拿起勺子', audioPath: 'audio/self-care/spoon-step-1.mp3' },
    ],
  }, '使用勺子')

  assert.equal(metadata.legacyTaskCode, 'TASK_001')
  assert.equal(metadata.category?.parentName, '进食技能')
  assert.equal(metadata.abilityItem?.name, '独立进食')
  assert.equal(metadata.steps.length, 2)
  assert.deepEqual(metadata.steps.map((step) => step.seq), [1, 2])
  assert.equal(metadata.steps[0]?.imagePath, 'resource://images/self-care/spoon-step-2.png')
  assert.equal(metadata.steps[1]?.audioPath, 'resource://audio/self-care/spoon-step-1.mp3')
})

test('task_training contract validation rejects empty or malformed step-task metadata', () => {
  const {
    createTaskTrainingEditorModel,
    validateTaskTrainingEditorModel,
  } = loadTaskTrainingContract()

  const empty = createTaskTrainingEditorModel('穿衣练习')
  const emptyErrors = validateTaskTrainingEditorModel(empty)

  assert.ok(emptyErrors.some((message) => message.includes('至少')))

  const malformedErrors = validateTaskTrainingEditorModel({
    ...empty,
    steps: [
      { ...empty.steps[0], seq: 2, text: '第一步' },
      { ...empty.steps[0], id: 'step-2', seq: 2, text: '' },
    ],
  })

  assert.ok(malformedErrors.some((message) => message.includes('连续')))
  assert.ok(malformedErrors.some((message) => message.includes('步骤')))
})

test('TrainingResources integrates a dedicated task-training editor path', () => {
  const source = readFileSync(resolve(projectRoot, 'src/views/resource-center/TrainingResources.vue'), 'utf8')

  assert.match(source, /TaskTrainingEditor/)
  assert.match(source, /taskTrainingMeta/)
  assert.match(source, /TASK_TRAINING_RESOURCE_TYPE/)
})
