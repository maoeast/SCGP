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

function loadSelfCareTaskApi() {
  return jiti('../../src/database/self-care-task-api.ts')
}

test('self-care task api exists and sources task_training contract constants', () => {
  const source = readFileSync(resolve(projectRoot, 'src/database/self-care-task-api.ts'), 'utf8')

  assert.match(source, /TASK_TRAINING_MODULE_CODE/)
  assert.match(source, /TASK_TRAINING_RESOURCE_TYPE/)
  assert.match(source, /normalizeTaskTrainingEditorModel/)
  assert.doesNotMatch(source, /moduleCode:\s*['"]life_skills['"]/)
  assert.doesNotMatch(source, /resourceType:\s*['"]task_training['"]/)
})

test('self-care task api exports list and CRUD-oriented methods', () => {
  const source = readFileSync(resolve(projectRoot, 'src/database/self-care-task-api.ts'), 'utf8')

  assert.match(source, /listTasks\s*\(/)
  assert.match(source, /getTaskById\s*\(/)
  assert.match(source, /createTask\s*\(/)
  assert.match(source, /updateTask\s*\(/)
  assert.match(source, /deleteTask\s*\(/)
  assert.match(source, /restoreTask\s*\(/)
})
