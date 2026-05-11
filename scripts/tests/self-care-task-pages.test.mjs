import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

test('TaskList uses self-care task api and exposes create/edit entry actions', () => {
  const source = readFileSync(resolve(projectRoot, 'src/views/self-care/TaskList.vue'), 'utf8')

  assert.match(source, /SelfCareTaskAPI/)
  assert.match(source, /router\.push/)
  assert.match(source, /SelfCareTaskCreate|\/self-care\/tasks\/new/)
  assert.match(source, /SelfCareTaskEdit|\/self-care\/tasks\/\$\{.*\}\/edit/)
})

test('TaskEditor exists and loads task_training metadata editing flow', () => {
  const source = readFileSync(resolve(projectRoot, 'src/views/self-care/TaskEditor.vue'), 'utf8')

  assert.match(source, /TaskTrainingEditor/)
  assert.match(source, /SelfCareTaskAPI/)
  assert.match(source, /createTaskTrainingEditorModel|normalizeTaskTrainingEditorModel/)
  assert.match(source, /createTask|updateTask/)
})
