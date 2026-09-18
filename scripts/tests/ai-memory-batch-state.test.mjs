/**
 * AI 学生级长期记忆 · 总结批次状态机行为测试（2026-09-18 修复回归）。
 *
 * 背景：历史 bug——finalizeAssistantTurn 从不调 markBatchSummarizing，批次卡 pending，
 * commitSummaryBatch 的 CAS（仅接受 summarizing）恒败 → 记忆永不写入、单飞索引拖死会话
 * （后续总结被唯一索引拒绝 + bindSessionStudent 永远返回 false "内容正在整理"）。
 *
 * 测试方式：从 src/database/ai-api.ts 源码切取状态机 7 个方法（原文，仅去 TS 注解）构造测试类，
 * 在真 sql.js 内存库上驱动完整状态机（行为验证，非文本 regex）。
 * 表结构与索引（含单飞唯一索引 idx_ai_batch_active）与 init.ts 保持一致。
 *
 * 运行：node --test scripts/tests/ai-memory-batch-state.test.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { after } from 'node:test'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..', '..')

// ---------- 0. 从源码提取状态机方法（构建 ExtractedAIApi） ----------

const SOURCE = readFileSync(resolve(projectRoot, 'src/database/ai-api.ts'), 'utf8')

/**
 * 切取一个方法的完整文本块（含 jsdoc）。
 * 终点锚点用「下一个方法的签名行」而非 jsdoc 文本（advisor #5：对注释编辑不敏感）。
 * @param {string} methodName 方法名
 * @param {string} endAnchor 方法块结束锚点（源码中紧随其后的下一元素开头文本）
 */
function extractBlock(methodName, endAnchor) {
  const classStart = SOURCE.indexOf('export class AIApi')
  const idx = SOURCE.indexOf(`  ${methodName}(`, classStart)
  if (idx < 0) throw new Error(`method not found in ai-api.ts: ${methodName}`)
  const jsdocIdx = SOURCE.lastIndexOf('\n  /**', idx)
  const prevCodeEnd = SOURCE.lastIndexOf('\n\n', idx)
  const start = jsdocIdx > prevCodeEnd && idx - jsdocIdx < 600 ? jsdocIdx + 1 : prevCodeEnd + 2
  const end = SOURCE.indexOf(endAnchor, idx)
  if (end < 0) throw new Error(`end anchor not found for ${methodName}: ${endAnchor}`)
  let text = SOURCE.slice(start, end).replace(/\n\n+$/, '\n')
  text = text
    .replace(/\bprivate\s+/g, '')
    .replace(/: number \| null\b/g, '')
    .replace(/: boolean\b/g, '')
    .replace(/: void\b/g, '')
    .replace(/: number\b/g, '')
    .replace(/: string\b/g, '')
    .replace(/: AiMemorySummaryBatch \| null\b/g, '')
    .replace(/createSummaryBatch\(input: \{[\s\S]*?\n  \}\)\s*\{/, 'createSummaryBatch(input) {')
  return text
}

const blocks = [
  extractBlock('createSummaryBatch', '\n  getSummaryBatch('),
  extractBlock('getSummaryBatch', '\n  markBatchSummarizing('),
  extractBlock('markBatchSummarizing', '\n  commitSummaryBatch('),
  extractBlock('commitSummaryBatch', '\n  failSummaryBatch('),
  extractBlock('failSummaryBatch', '\n  bindSessionStudent('),
  extractBlock('bindSessionStudent', '\n  getSessionStudentId('),
  extractBlock('recoverStaleActiveBatches', '\n  private writeMemoryAudit'),
]

// 生成提取类到系统临时目录（advisor #5：不污染仓库工作区；每次运行重建，勿手编）
const tmpFixtureDir = mkdtempSync(join(tmpdir(), 'scgp-ai-batch-test-'))
const generatedPath = join(tmpFixtureDir, '_extracted-ai-api.mjs')
const generatedCode = `/**
 * ⚠️ 本文件由 scripts/tests/ai-memory-batch-state.test.mjs 自动生成——勿手编。
 * 从 src/database/ai-api.ts 的 class AIApi 中切取批次状态机 7 个方法（源码原文，仅去 TS 类型注解），
 * 用于在真 sql.js 内存库上做行为测试（绕开 ai-api.ts 的渲染进程依赖链）。
 */
class ExtractedAIApi {
  constructor(db) { this.db = db }
  query(sql, params = []) { return this.db.all(sql, params) }
  queryOne(sql, params = []) { return this.db.get(sql, params) }
  execute(sql, params = []) { this.db.run(sql, params); return this.db.changes() }
  mapBatchRow(r) {
    return {
      id: r.id, sessionId: r.session_id, batchId: r.batch_id, studentId: r.student_id,
      fromMessageId: r.from_message_id, toMessageId: r.to_message_id,
      inputHash: r.input_hash, state: r.state, leaseUntil: r.lease_until ?? null,
      attemptCount: Number(r.attempt_count || 0), lastError: r.last_error, createdAt: r.created_at,
    }
  }
${blocks.join('\n')}
}
export { ExtractedAIApi }
`
writeFileSync(generatedPath, generatedCode)
const { ExtractedAIApi } = await import(pathToFileURL(generatedPath).href)

// 评审卫生项：测试结束后清理本次运行的临时目录（rmSync 失败不阻塞退出，交由 OS 兒底）
after(() => {
  try {
    rmSync(tmpFixtureDir, { recursive: true, force: true })
  } catch {
    /* 忽略：tmp 清理失败无碍 */
  }
})

// ---------- 1. sql.js 内存库与最小宿主 ----------

const require = createRequire(import.meta.url)
const sqlJsModule = require(resolve(projectRoot, 'node_modules/sql.js'))
const initSqlJs = sqlJsModule.default || sqlJsModule.initSqlJs
const SQL = await initSqlJs({
  locateFile: (file) => resolve(projectRoot, 'node_modules', 'sql.js', 'dist', file),
})

/** 最小宿主：sql.js 内存库 + DatabaseAPI 同形接口（all/get/run/changes/getRawDB） */
function makeApi() {
  const raw = new SQL.Database()
  raw.run(`
    CREATE TABLE ai_chat_session (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      agent_code TEXT NOT NULL DEFAULT 'test',
      title TEXT NOT NULL DEFAULT '新对话',
      student_id INTEGER,
      memory_watermark INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE ai_chat_message (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      delivery_status TEXT NOT NULL DEFAULT '',
      message_kind TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE ai_memory_summary_batch (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      batch_id TEXT NOT NULL UNIQUE,
      student_id INTEGER NOT NULL,
      from_message_id INTEGER NOT NULL,
      to_message_id INTEGER NOT NULL,
      input_hash TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT 'pending'
        CHECK (state IN ('pending', 'summarizing', 'done', 'failed', 'cancelled')),
      lease_until TEXT,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX idx_ai_batch_active
      ON ai_memory_summary_batch(session_id) WHERE state IN ('pending', 'summarizing');
  `)

  const db = {
    getRawDB: () => raw,
    all: (sql, params = []) => {
      const stmt = raw.prepare(sql)
      try {
        stmt.bind(params)
        const rows = []
        while (stmt.step()) rows.push(stmt.getAsObject())
        return rows
      } finally {
        stmt.free()
      }
    },
    get: (sql, params = []) => db.all(sql, params)[0] ?? null,
    run: (sql, params = []) => raw.run(sql, params),
    changes: () => raw.getRowsModified(),
  }
  return { api: new ExtractedAIApi(db), raw }
}

function batchState(raw, batchId) {
  const stmt = raw.prepare('SELECT state FROM ai_memory_summary_batch WHERE batch_id = ?')
  try {
    stmt.bind([batchId])
    return stmt.step() ? String(stmt.getAsObject().state) : null
  } finally {
    stmt.free()
  }
}

function watermark(raw, sessionId) {
  const stmt = raw.prepare('SELECT memory_watermark FROM ai_chat_session WHERE id = ?')
  try {
    stmt.bind([sessionId])
    if (!stmt.step()) return 0
    const row = stmt.getAsObject()
    return Number(row.memory_watermark ?? 0)
  } finally {
    stmt.free()
  }
}

function insertSession(raw, { studentId = 7 } = {}) {
  raw.run('INSERT INTO ai_chat_session (student_id) VALUES (?)', [studentId])
  const stmt = raw.prepare('SELECT last_insert_rowid() AS id')
  try {
    stmt.step()
    return Number(stmt.getAsObject().id)
  } finally {
    stmt.free()
  }
}

function insertBatch(raw, sessionId, batchId) {
  raw.run(
    `INSERT INTO ai_memory_summary_batch
       (session_id, batch_id, student_id, from_message_id, to_message_id, input_hash, state)
     VALUES (?, ?, 7, 1, 5, 'hash', 'pending')`,
    [sessionId, batchId],
  )
}

// ---------- 2. 行为断言 ----------

test('主路径：pending → markBatchSummarizing → commit 推进水位且批次 done（修复后链路）', () => {
  const { api, raw } = makeApi()
  const sessionId = insertSession(raw)

  assert.ok(
    api.createSummaryBatch({ sessionId, batchId: 'b1', studentId: 7, fromMessageId: 1, toMessageId: 5, inputHash: 'h' }),
    '批次创建成功',
  )
  assert.equal(batchState(raw, 'b1'), 'pending')
  assert.equal(api.markBatchSummarizing('b1'), true, 'pending 可转 summarizing')
  assert.ok(api.commitSummaryBatch('b1', 5), 'summarizing 态 commit 成功')
  assert.equal(batchState(raw, 'b1'), 'done')
  assert.equal(watermark(raw, sessionId), 5, '水位推进到 toMessageId')
})

test('历史 bug 回归：pending 直接 commit 被 CAS 拒绝（水位不动，批次卡 pending）', () => {
  const { api, raw } = makeApi()
  const sessionId = insertSession(raw)
  insertBatch(raw, sessionId, 'b2')

  assert.equal(api.commitSummaryBatch('b2', 5), false, 'pending 态 commit 被 CAS 拒绝')
  assert.equal(watermark(raw, sessionId), 0, '水位不动')
  assert.equal(batchState(raw, 'b2'), 'pending', '批次停在 pending（历史卡死形态）')
})

test('单飞唯一索引：活动批次存在时同会话第二个活动批次被拒', () => {
  const { api, raw } = makeApi()
  const sessionId = insertSession(raw)
  insertBatch(raw, sessionId, 'b3')
  assert.equal(
    api.createSummaryBatch({ sessionId, batchId: 'b4', studentId: 7, fromMessageId: 1, toMessageId: 9, inputHash: 'h' }),
    false,
    '唯一索引拒绝第二个活动批次',
  )
})

test('recoverStaleActiveBatches：仅超时活动批次被 cancel，新鲜批次不动，last_error 留痕', () => {
  const { api, raw } = makeApi()
  const sessionId = insertSession(raw)
  insertBatch(raw, sessionId, 'stale-1')
  insertBatch(raw, sessionId + 1000, 'fresh-1') // 另一会话的新鲜批次

  // SQL 时光机：只把 stale-1 的 updated_at 拨回 30 分钟前
  raw.run(`UPDATE ai_memory_summary_batch SET updated_at = datetime('now', '-30 minutes') WHERE batch_id = 'stale-1'`)

  assert.equal(api.recoverStaleActiveBatches(10), 1, '只恢复 1 个超时批次')
  assert.equal(batchState(raw, 'stale-1'), 'cancelled')
  assert.notEqual(String(api.getSummaryBatch('stale-1')?.lastError || ''), '', 'last_error 留痕可回溯')
  assert.equal(batchState(raw, 'fresh-1'), 'pending', '新鲜批次不受影响')
})

test('恢复闭环：死批次释放后同会话可再建批次，整理完成后改绑学生解锁', () => {
  const { api, raw } = makeApi()
  const sessionId = insertSession(raw)
  insertBatch(raw, sessionId, 'dead')
  // 水位之后有 user 消息 → 活动批次 + 未总结消息双重拒绝
  raw.run(
    `INSERT INTO ai_chat_message (session_id, role, content, delivery_status) VALUES (?, 'user', '孩子今天很配合', '')`,
    [sessionId],
  )

  assert.equal(api.bindSessionStudent(sessionId, 8), false, '活动批次存在时改绑被拒（历史死锁形态）')

  raw.run(`UPDATE ai_memory_summary_batch SET updated_at = datetime('now', '-30 minutes') WHERE batch_id = 'dead'`)
  assert.equal(api.recoverStaleActiveBatches(10), 1)

  assert.equal(
    api.createSummaryBatch({ sessionId, batchId: 'new-1', studentId: 7, fromMessageId: 1, toMessageId: 2, inputHash: 'h' }),
    true,
    '坑位释放后可再建批次',
  )

  // v4.2 语义：水位追平（整理完）→ 改绑放行
  assert.ok(api.markBatchSummarizing('new-1'))
  assert.ok(api.commitSummaryBatch('new-1', 2), '水位推进到 2（追平）')
  assert.equal(api.bindSessionStudent(sessionId, 8), true, '整理完成后改绑解锁')
})
