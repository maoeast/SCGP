import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../../src/utils/activation-manager.ts', import.meta.url), 'utf8')

test('activation verification returns a safe message when license parsing fails', () => {
  assert.match(
    source,
    /catch \(error\) \{\s*console\.error\('激活验证失败:', error\)\s*return \{\s*success: false,\s*message: '激活码无效或已损坏，请核对后重试'/s,
  )
  assert.doesNotMatch(source, /message:\s*`激活失败:\s*\$\{errorMessage\}`/)
})
