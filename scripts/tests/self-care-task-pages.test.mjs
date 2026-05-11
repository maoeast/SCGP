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

test('TaskList exposes self-care start-training entry to select student per task', () => {
  const source = readFileSync(resolve(projectRoot, 'src/views/self-care/TaskList.vue'), 'utf8')

  assert.match(source, /开始训练/)
  assert.match(source, /handleStartTraining/)
  assert.match(source, /\/self-care\/tasks\/\$\{.*\}\/select-student/)
})

test('SelectStudent exists and reuses the shared student selector for self-care training', () => {
  const source = readFileSync(resolve(projectRoot, 'src/views/self-care/SelectStudent.vue'), 'utf8')

  assert.match(source, /StudentSelector/)
  assert.match(source, /SelfCareTaskAPI/)
  assert.match(source, /route\.params\.taskId/)
  assert.match(source, /studentId/)
  assert.match(source, /resourceId/)
  assert.match(source, /trainingEntryCode|TASK_TRAINING_ENTRY_CODE/)
})

test('TaskList renders current training workspace placeholder from student and resource context', () => {
  const source = readFileSync(resolve(projectRoot, 'src/views/self-care/TaskList.vue'), 'utf8')

  assert.match(source, /当前训练任务/)
  assert.match(source, /resourceId/)
  assert.match(source, /studentId/)
  assert.match(source, /launchTask/)
  assert.match(source, /metadata\.steps/)
  assert.match(source, /step\.seq/)
  assert.match(source, /step\.text/)
})
