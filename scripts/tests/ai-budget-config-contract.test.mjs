import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

function readProjectFile(relativePath) {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8')
}

test('AI 月度额度上限为 1000 万 Tokens，并在界面与持久化层一致生效', () => {
  const apiSource = readProjectFile('src/database/ai-api.ts')
  const viewSource = readProjectFile('src/views/system/AiAgentConfig.vue')

  assert.match(apiSource, /const MAX_MONTHLY_BUDGET_TOKENS = DEFAULTS\.monthlyBudgetTokens/)
  assert.match(apiSource, /Math\.min\(MAX_MONTHLY_BUDGET_TOKENS, Math\.floor\(value\)\)/)
  assert.match(apiSource, /Math\.min\(MAX_MONTHLY_BUDGET_TOKENS, Math\.max\(0, Math\.floor\(input\.monthlyBudgetTokens\)\)\)/)
  assert.match(viewSource, /const MAX_MONTHLY_BUDGET_TOKENS = 10_000_000/)
  assert.match(viewSource, /:max="MAX_MONTHLY_BUDGET_TOKENS"/)
  assert.match(viewSource, /configForm\.monthlyBudgetTokens = MAX_MONTHLY_BUDGET_TOKENS/)
})

test('AI 超预算截断在未配置时默认开启，显式关闭仍可生效', () => {
  const apiSource = readProjectFile('src/database/ai-api.ts')
  const viewSource = readProjectFile('src/views/system/AiAgentConfig.vue')

  assert.match(apiSource, /blockOnOverage: true/)
  assert.match(apiSource, /this\.getConfig\(CONFIG_KEY\.blockOnOverage\) !== '0'/)
  assert.match(viewSource, /blockOnOverage: true/)
})
