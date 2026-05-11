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

function loadSelfCareRoutes() {
  return jiti('../../src/features/self-care/self-care-routes.ts')
}

function loadTaskTrainingContract() {
  return jiti('../../src/features/self-care/task-training-contract.ts')
}

test('self-care route authorization module is sourced from the task training contract', () => {
  const source = readFileSync(resolve(projectRoot, 'src/features/self-care/self-care-routes.ts'), 'utf8')

  assert.match(source, /TASK_TRAINING_MODULE_CODE/)
  assert.doesNotMatch(source, /SELF_CARE_MODULE_CODE = ['"]life_skills['"]/)
})

test('self-care route shell keeps life_skills authorization on menu and tasks routes', () => {
  const {
    selfCareRoutes,
    SELF_CARE_BASE_PATH,
    SELF_CARE_TASKS_PATH,
    SELF_CARE_MODULE_CODE,
  } = loadSelfCareRoutes()
  const { TASK_TRAINING_MODULE_CODE } = loadTaskTrainingContract()

  const baseRoute = selfCareRoutes.find((route) => route.name === 'SelfCareTraining')
  const tasksRoute = selfCareRoutes.find((route) => route.name === 'SelfCareTaskList')

  assert.equal(SELF_CARE_MODULE_CODE, TASK_TRAINING_MODULE_CODE)
  assert.equal(SELF_CARE_BASE_PATH, '/self-care')
  assert.equal(SELF_CARE_TASKS_PATH, '/self-care/tasks')

  assert.equal(baseRoute?.path, 'self-care')
  assert.equal(baseRoute?.redirect, SELF_CARE_TASKS_PATH)
  assert.equal(baseRoute?.meta?.moduleCode, SELF_CARE_MODULE_CODE)

  assert.equal(tasksRoute?.path, 'self-care/tasks')
  assert.equal(tasksRoute?.meta?.moduleCode, SELF_CARE_MODULE_CODE)
  assert.equal(tasksRoute?.meta?.hideInMenu, true)
  assert.equal(typeof tasksRoute?.component, 'function')
})
