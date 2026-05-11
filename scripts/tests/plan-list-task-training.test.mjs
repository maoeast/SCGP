import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

function readPlanListSource() {
  return readFileSync(resolve(projectRoot, 'src/views/plan/PlanList.vue'), 'utf8')
}

test('plan resource selector exposes task_training for self-care resources', () => {
  const source = readPlanListSource()

  assert.match(source, /<el-radio-button value="task_training">自理任务<\/el-radio-button>/)
  assert.match(source, /task_training:\s*'自理任务'/)
  assert.match(source, /ModuleCode\.LIFE_SKILLS/)
})
