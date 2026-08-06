/**
 * AI 学生级长期记忆 · M5 治理与绑定 UI 契约测试（v4.1 §11/§13）。
 *
 * 静态源码契约（读文件 + regex 断言），验证：
 * 1. 治理 SQL：pending 30 天归档 / confirmed 配额淘汰（关键项保护）/
 *    非有效状态 365 天 + 每生 500 清理 / 批次保留（30/90/180 + 每会话 20）；
 * 2. store 治理编排：runMemoryGovernance 随补偿任务运行 + 导出；
 * 3. AI 抽屉绑定 UI：选择器 + 锁定提示 + 学生加载。
 * 运行：node --test scripts/tests/ai-memory-governance-contract.test.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

function readProjectFile(relativePath) {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8')
}

// ==================== 1. 治理 SQL（ai-api.ts） ====================

test('pending 30 天自动归档（可回溯不删除）', () => {
  const src = readProjectFile('src/database/ai-api.ts')
  assert.match(src, /archiveStalePending\(days = 30\)/)
  assert.match(src, /SET status = 'archived'/)
  assert.match(src, /status = 'pending' AND deleted_at IS NULL/)
  assert.match(src, /created_at < datetime\('now', \?\)/)
})

test('confirmed 配额淘汰：分类配额 + 关键项保护', () => {
  const src = readProjectFile('src/database/ai-api.ts')
  const start = src.indexOf('enforceConfirmedQuota(')
  const end = src.indexOf('purgeInactiveMemories(', start)
  const block = src.slice(start, end)
  assert.ok(start >= 0 && end > start, '应存在配额方法')

  // 分类配额默认值
  assert.match(block, /observation: 100/)
  assert.match(block, /preference: 50/)
  assert.match(block, /follow_up: 50/)
  // 关键项保护（仅 normal 参与淘汰）
  assert.match(block, /priority = 'normal'/)
  // 最旧优先（effective_at ASC）
  assert.match(block, /ORDER BY effective_at ASC/)
  // 淘汰为 archived（非物理删除）
  assert.match(block, /SET status = 'archived'/)
})

test('非有效状态清理：365 天 + 每生 500 条上限', () => {
  const src = readProjectFile('src/database/ai-api.ts')
  const start = src.indexOf('purgeInactiveMemories(')
  const end = src.indexOf('purgeSummaryBatches(', start)
  const block = src.slice(start, end)
  assert.ok(start >= 0 && end > start, '应存在清理方法')

  assert.match(block, /days = 365, perStudentCap = 500/)
  assert.match(block, /IN \('rejected', 'superseded', 'archived'\)/)
  assert.match(block, /updated_at < datetime\('now', \?\)/)
  assert.match(block, /HAVING COUNT\(\*\) > \?/)
})

test('批次保留：cancelled 30 / failed 90 / done 180 + 每会话 20 批', () => {
  const src = readProjectFile('src/database/ai-api.ts')
  const start = src.indexOf('purgeSummaryBatches()')
  const end = src.indexOf('private writeMemoryAudit', start)
  const block = src.slice(start, end)
  assert.ok(start >= 0 && end > start, '应存在批次清理方法')

  assert.match(block, /state = 'cancelled' AND updated_at < datetime\('now', '-30 days'\)/)
  assert.match(block, /state = 'failed' AND updated_at < datetime\('now', '-90 days'\)/)
  assert.match(block, /state = 'done' AND updated_at < datetime\('now', '-180 days'\)/)
  assert.match(block, /HAVING COUNT\(\*\) > 20/)
})

// ==================== 2. store 治理编排（stores/ai.ts） ====================

test('runMemoryGovernance 随补偿任务运行并导出', () => {
  const src = readProjectFile('src/stores/ai.ts')
  assert.match(src, /function runMemoryGovernance\(\)/)
  assert.match(src, /a\.archiveStalePending\(30\)/)
  assert.match(src, /a\.enforceConfirmedQuota\(\)/)
  assert.match(src, /a\.purgeInactiveMemories\(365, 500\)/)
  assert.match(src, /a\.purgeSummaryBatches\(\)/)
  // 随补偿任务运行
  assert.match(src, /runMemoryGovernance\(\)/)
  // 导出
  assert.match(src, /runMemoryGovernance,/)
  // 开关门控
  assert.match(src, /if \(!memoryEnabled\.value\) return/)
})

// ==================== 3. 绑定 UI（AiAssistant.vue） ====================

test('AI 抽屉会话绑定选择器：选择学生 + 可随时更换 + 学生加载', () => {
  const src = readProjectFile('src/features/ai/components/AiAssistant.vue')
  assert.match(src, /ai-memory-bindbar/)
  assert.match(src, /placeholder="选择本次对话的学生"/)
  assert.match(src, /不选择也能对话（不会记录长期记忆）/)
  assert.match(src, /bindSessionStudent\(sid, studentId\)/)
  assert.match(src, /getSessionStudentId\(sid\)/)
  assert.match(src, /studentStore\.loadStudents\(\)/)
  assert.match(src, /refreshBoundStudent\(\)/)
  // v4.2：不再有「有消息即锁定」的 UI 状态（下拉始终可操作）
  assert.ok(!/sessionLocked/.test(src), '不应残留 sessionLocked 锁定逻辑')
  assert.ok(!/绑定已锁定/.test(src), '不应残留「绑定已锁定」文案')
})
