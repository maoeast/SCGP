import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

test('dashboard schedule launch resource whitelist includes task_training', () => {
  const source = readFileSync(resolve(projectRoot, 'src/database/dashboard-api.ts'), 'utf8')
  const whitelistMatches = [...source.matchAll(/resource_type IN \(([^)]+)\)/g)]

  assert.equal(whitelistMatches.length, 4)
  for (const match of whitelistMatches) {
    assert.match(match[1], /'task_training'/)
  }
})
