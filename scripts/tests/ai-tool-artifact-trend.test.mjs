/**
 * 路线 C 契约测试：AI 对话内嵌评估趋势图（工具结果驱动出图）。
 *
 * 本测试为静态源码契约（读文件 + regex 断言），不启动运行时 DB。
 * 验证四层链路完整：捕获 → 传输 → 存储 → 渲染。
 * 运行：node --test scripts/tests/ai-tool-artifact-trend.test.mjs
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

// ==================== 第 1 层：捕获（ai-tools.ts）====================

test('ToolResult.artifact 字段 + AssessmentTrendArtifact 类型定义存在', () => {
  const src = readProjectFile('src/services/ai-tools.ts')
  assert.match(src, /artifact\?: ToolArtifact/)
  assert.match(src, /export type ToolArtifact = AssessmentTrendArtifact/)
  assert.match(src, /export interface AssessmentTrendArtifact/)
  assert.match(src, /kind: 'assessment_trend'/)
  // snapshots 复用 LongitudinalScorePayload 类型，保证与工具结果同构
  assert.match(src, /snapshots: LongitudinalScorePayload\['snapshots'\]/)
})

test('get_assessment_trend 在快照≥2 时产 artifact，单点不产', () => {
  const src = readProjectFile('src/services/ai-tools.ts')
  const start = src.indexOf("case 'get_assessment_trend'")
  const end = src.indexOf("case 'list_training_sessions'", start)
  const block = src.slice(start, end)
  assert.ok(start >= 0 && end > start, '应存在 get_assessment_trend 分支')
  // 阈值判定：单点无法成趋势线
  assert.match(block, /snapshots\.length >= 2/)
  assert.match(block, /kind: 'assessment_trend'/)
})

test('serialize 透传 artifact（含截断分支）', () => {
  const src = readProjectFile('src/services/ai-tools.ts')
  const start = src.indexOf('function serialize(')
  const end = src.indexOf('function fail(', start)
  const block = src.slice(start, end)
  assert.ok(start >= 0 && end > start, '应存在 serialize 函数')
  assert.match(block, /artifact\?: ToolArtifact\)/)
  // 截断分支也带 artifact（富产物体积独立于 content 文本）
  assert.match(block.slice(block.indexOf('MAX_RESULT_CHARS')), /artifact,/)
})

// ==================== 第 2 层：传输（ai-tool-loop.ts）====================

test('RunToolLoopResult.artifacts 字段 + 循环内收集逻辑', () => {
  const src = readProjectFile('src/services/ai-tool-loop.ts')
  assert.match(src, /artifacts: ToolArtifact\[\]/)
  // 循环内：dispatchTool 后收集 artifact
  assert.match(src, /if \(result\.artifact\) artifacts\.push\(result\.artifact\)/)
  // 两个返回点都带 artifacts
  const loopStart = src.indexOf('export async function runToolLoop')
  const loopBlock = src.slice(loopStart)
  const returnCount = (loopBlock.match(/\bartifacts,\n\s*\}/g) || []).length
  assert.ok(returnCount >= 2, `应有两个返回点带 artifacts，实际 ${returnCount}`)
})

// ==================== 第 3 层：存储（schema + ai-api.ts）====================

test('ai_chat_message 新增 tool_artifacts 列（safeAddColumn 幂等模式）', () => {
  const src = readProjectFile('src/database/init.ts')
  assert.match(src, /safeAddColumn\(rawDb, 'ai_chat_message', 'tool_artifacts TEXT'\)/)
})

test('AiChatMessage 类型 + saveMessage + listMessages 完成持久化往返', () => {
  const src = readProjectFile('src/database/ai-api.ts')
  // 类型字段
  assert.match(src, /toolArtifacts: ToolArtifact\[\] \| null/)
  // 写入：saveMessage 接收并序列化
  assert.match(src, /toolArtifacts\?: ToolArtifact\[\] \| null/)
  assert.match(src, /toolArtifacts && input\.toolArtifacts\.length > 0 \? JSON\.stringify/)
  assert.match(src, /INSERT INTO ai_chat_message[\s\S]*tool_artifacts\)/)
  assert.match(src, /toolArtifactsJson\]/)
  // 读出：listMessages 反序列化
  assert.match(src, /parseToolArtifacts\(r\.tool_artifacts\)/)
  // 解析函数容错
  const parseStart = src.indexOf('function parseToolArtifacts(')
  const parseEnd = src.indexOf('export interface AiChatMessage', parseStart)
  const parseBlock = src.slice(parseStart, parseEnd)
  assert.match(parseBlock, /return null/)
  assert.match(parseBlock, /return Array\.isArray\(parsed\)/)
})

// ==================== 第 4 层：渲染（AiChatTranscript + AiTrendChart）====================

test('AiTrendChart 组件接收 AssessmentTrendArtifact 并渲染 echarts', () => {
  const src = readProjectFile('src/features/ai/components/AiTrendChart.vue')
  assert.match(src, /defineProps<\{ artifact: AssessmentTrendArtifact \}>/)
  assert.match(src, /import \* as echarts from 'echarts'/)
  // 总分线 + 维度线（与 AssessmentTrendPage 对齐）
  assert.match(src, /name: '总分'/)
  assert.match(src, /type: 'dashed' as const/)
  // 卸载时释放 echarts 实例
  assert.match(src, /chart\.dispose\(\)/)
})

test('AiChatTranscript 在非 pending 的 assistant 回复下方渲染趋势图', () => {
  const src = readProjectFile('src/features/ai/components/AiChatTranscript.vue')
  // 接口扩展
  assert.match(src, /toolArtifacts\?: ToolArtifact\[\] \| null/)
  // 类型守卫提取 assessment_trend 产物
  assert.match(src, /a is AssessmentTrendArtifact/)
  // 模板：仅 assistant 且非 pending 时渲染
  assert.match(src, /v-if="msg\.role === 'assistant' && !msg\.pending"/)
  assert.match(src, /<AiTrendChart/)
})

test('AiAssistant displayMessages 透传 toolArtifacts 到 transcript', () => {
  const src = readProjectFile('src/features/ai/components/AiAssistant.vue')
  assert.match(src, /toolArtifacts\?: ToolArtifact\[\] \| null/)
  assert.match(src, /toolArtifacts: m\.toolArtifacts,/)
})

// ==================== 端到端 store 链路 ====================

test('store tool 循环分支把 artifacts 持久化到 assistant 消息', () => {
  const src = readProjectFile('src/stores/ai.ts')
  // 从 runToolLoop 结果取 artifacts
  assert.match(src, /const artifacts = result\.artifacts && result\.artifacts\.length > 0 \? result\.artifacts : null/)
  // 传入 saveMessage
  assert.match(src, /toolArtifacts: artifacts,/)
  // 推入 currentMessages（assistant 消息带 toolArtifacts）
  const sendStart = src.indexOf('async function sendChat(')
  const sendEnd = src.indexOf('async function resetAllPrivacyAck', sendStart)
  const sendBlock = src.slice(sendStart, sendEnd)
  assert.match(sendBlock, /toolArtifacts: artifacts/)
})
