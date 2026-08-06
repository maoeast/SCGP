/**
 * AI 学生级长期记忆 · M1 数据层与消息状态机契约测试（v4.1）。
 *
 * 静态源码契约（读文件 + regex 断言），验证 M1 交付物：
 * 1. 三张新表（ai_student_memory / ai_memory_summary_batch / ai_student_memory_audit）
 *    与关键约束（CHECK/FK/唯一索引/单飞索引）；
 * 2. 消息表状态机列（delivery_status / completed_at / message_kind）与会话扩展
 *    （student_id / memory_watermark）及迁移防回灌；
 * 3. ai-api 状态机三 API + 记忆 CRUD + 批次两段式 + 绑定锁定；
 * 4. stores/ai.ts 两条发送路径写入 completed/final 状态。
 * 运行：node --test scripts/tests/ai-memory-data-contract.test.mjs
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

// ==================== 1. 数据层（init.ts） ====================

test('三张记忆表创建且约束完整', () => {
  const src = readProjectFile('src/database/init.ts')
  const start = src.indexOf('CREATE TABLE IF NOT EXISTS ai_student_memory')
  const end = src.indexOf('// 索引\n  const indexStatements', start)
  const block = src.slice(start, end)
  assert.ok(start >= 0 && end > start, '应存在记忆表创建区')

  // 记忆表：核心 CHECK + FK + 软删除 + 确认来源
  assert.match(block, /CREATE TABLE IF NOT EXISTS ai_student_memory/)
  assert.match(block, /category TEXT NOT NULL DEFAULT 'observation'[\s\S]*CHECK \(category IN/)
  assert.match(block, /status TEXT NOT NULL DEFAULT 'pending'[\s\S]*CHECK \(status IN/)
  assert.match(block, /priority TEXT NOT NULL DEFAULT 'normal'[\s\S]*CHECK \(priority IN/)
  assert.match(block, /content TEXT NOT NULL CHECK \(length\(content\) BETWEEN 1 AND 200\)/)
  assert.match(block, /deleted_at TEXT/)
  assert.match(block, /confirmed_by_user_id INTEGER/)
  assert.match(block, /possible_duplicate_of INTEGER/)
  assert.match(block, /REFERENCES student\(id\) ON DELETE CASCADE/)
  assert.match(block, /REFERENCES ai_chat_message\(id\) ON DELETE SET NULL/)

  // 批次表：唯一 batch_id + 状态 CHECK + 单飞唯一索引
  assert.match(block, /CREATE TABLE IF NOT EXISTS ai_memory_summary_batch/)
  assert.match(block, /batch_id TEXT NOT NULL UNIQUE/)
  assert.match(block, /state TEXT NOT NULL DEFAULT 'pending'[\s\S]*CHECK \(state IN \('pending', 'summarizing', 'done', 'failed', 'cancelled'\)\)/)
  assert.match(block, /CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_batch_active[\s\S]*WHERE state IN \('pending', 'summarizing'\)/)

  // 审计表：不级联删除
  assert.match(block, /CREATE TABLE IF NOT EXISTS ai_student_memory_audit/)
  assert.match(block, /action TEXT NOT NULL CHECK \(action IN \('create', 'confirm', 'reject', 'update', 'delete', 'expire', 'promote', 'mark_priority'\)\)/)
})

test('消息表状态机列与会话扩展 + 迁移防回灌', () => {
  const src = readProjectFile('src/database/init.ts')

  // 消息表列
  assert.match(src, /safeAddColumn\(rawDb, 'ai_chat_message', `delivery_status TEXT NOT NULL DEFAULT ''`\)/)
  assert.match(src, /safeAddColumn\(rawDb, 'ai_chat_message', 'completed_at TEXT'\)/)
  assert.match(src, /safeAddColumn\(rawDb, 'ai_chat_message', `message_kind TEXT NOT NULL DEFAULT ''`\)/)

  // 会话表列
  assert.match(src, /safeAddColumn\(rawDb, 'ai_chat_session', 'student_id INTEGER'\)/)
  assert.match(src, /safeAddColumn\(rawDb, 'ai_chat_session', 'memory_watermark INTEGER NOT NULL DEFAULT 0'\)/)

  // 迁移防回灌：历史会话水位初始化为现有最大消息 id
  assert.match(src, /SET memory_watermark = \([\s\S]*SELECT COALESCE\(MAX\(id\), 0\) FROM ai_chat_message/)
  assert.match(src, /WHERE memory_watermark = 0[\s\S]*EXISTS \(SELECT 1 FROM ai_chat_message/)
})

// ==================== 2. ai-api CRUD（ai-api.ts） ====================

test('消息状态机三 API 存在且语义正确', () => {
  const src = readProjectFile('src/database/ai-api.ts')
  const start = src.indexOf('createAssistantMessage(')
  const end = src.indexOf('// ==================== 学生记忆 CRUD', start)
  const block = src.slice(start, end)
  assert.ok(start >= 0 && end > start, '应存在状态机 API 区')

  assert.match(block, /createAssistantMessage\(/)
  assert.match(block, /'streaming'/)
  assert.match(block, /updateAssistantChunk\(/)
  assert.match(block, /WHERE id = \? AND delivery_status = 'streaming'/)
  assert.match(block, /finalizeAssistantMessage\(/)
  assert.match(block, /'completed' \| 'cancelled' \| 'failed'/)
})

test('记忆 CRUD 与批次两段式存在', () => {
  const src = readProjectFile('src/database/ai-api.ts')

  // CRUD
  assert.match(src, /listStudentMemories\(/)
  assert.match(src, /addStudentMemory\(/)
  assert.match(src, /confirmStudentMemory\(/)
  assert.match(src, /markMemoryPriority\(/)
  assert.match(src, /deleteStudentMemory\(/)

  // 批次两段式
  assert.match(src, /createSummaryBatch\(/)
  assert.match(src, /markBatchSummarizing\(/)
  assert.match(src, /commitSummaryBatch\(/)
  assert.match(src, /failSummaryBatch\(/)
  // CAS：水位条件推进 + changes() 语义
  assert.match(src, /UPDATE ai_chat_session SET memory_watermark = \? WHERE id = \? AND memory_watermark = \?/)
  // 审计
  assert.match(src, /writeMemoryAudit\(/)
})

test('绑定/更换学生：整理中（活动批次或未总结消息）拒绝，整理完可改绑（库级）', () => {
  const src = readProjectFile('src/database/ai-api.ts')
  assert.match(src, /bindSessionStudent\(/)
  assert.match(src, /state IN \('pending', 'summarizing'\)/)
  assert.match(src, /m\.id > \(/)
  assert.match(src, /memory_watermark FROM ai_chat_session/)
})

test('saveMessage 默认落 completed/final（兼容既有调用）', () => {
  const src = readProjectFile('src/database/ai-api.ts')
  assert.match(src, /const deliveryStatus = input\.deliveryStatus \?\? \(input\.role === 'assistant' \? 'completed' : ''\)/)
  assert.match(src, /const messageKind = input\.messageKind \?\? 'final'/)
})

// ==================== 3. stores/ai.ts 状态机接入 ====================

test('sendChat 两条路径写入 completed/final 状态', () => {
  const src = readProjectFile('src/stores/ai.ts')
  // tool 循环路径 + 流式路径
  const toolPush = src.indexOf("deliveryStatus: 'completed'")
  const streamPush = src.indexOf("deliveryStatus: 'completed'", toolPush + 1)
  assert.ok(toolPush > 0 && streamPush > toolPush, '两条路径都应写入 completed')
  // user 消息无状态
  assert.match(src, /deliveryStatus: '',/)
})

// ==================== 4. AiChatMessage 类型 ====================

test('AiChatMessage 类型含 deliveryStatus/messageKind 且 listMessages 映射', () => {
  const src = readProjectFile('src/database/ai-api.ts')
  assert.match(src, /deliveryStatus: string/)
  assert.match(src, /messageKind: string/)
  assert.match(src, /deliveryStatus: r\.delivery_status \?\? ''/)
  assert.match(src, /messageKind: r\.message_kind \?\? ''/)
})
