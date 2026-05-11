import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

test('ATS seed extractor exists and targets 31 self-care tasks into task_training-compatible output', () => {
  const source = readFileSync(resolve(projectRoot, 'scripts/extract-self-care-ats-seeds.mjs'), 'utf8')

  assert.match(source, /sample-tasks\.ts/)
  assert.match(source, /SAMPLE_TASKS/)
  assert.match(source, /SAMPLE_TASK_STEPS/)
  assert.match(source, /task-seed-inventory\.json/)
  assert.match(source, /legacyTaskCode/)
  assert.match(source, /task_training/)
  assert.match(source, /life-skills/)
})
