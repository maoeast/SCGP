import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

test('student detail routes task_training detail to self-care execution by resource_id', () => {
  const source = readFileSync(resolve(projectRoot, 'src/views/StudentDetail.vue'), 'utf8')

  assert.match(source, /TASK_TRAINING_RESOURCE_TYPE/)
  assert.match(source, /record\.resource_type === TASK_TRAINING_RESOURCE_TYPE/)
  assert.match(source, /path:\s*`\/self-care\/execute\/\$\{record\.resource_id\}\/\$\{record\.student_id\}`/)
})
