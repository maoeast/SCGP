/**
 * AI 学生级长期记忆 · M3 权限 / M4 审核 UI 契约测试（v4.1 §9/§10/§8）。
 *
 * 静态源码契约（读文件 + regex 断言），验证：
 * 1. 实时权限：canAccessStudentMemory（admin 全量 / teacher 同班 / 不存快照）；
 * 2. 确认来源：getMemoryConfirmerNames；
 * 3. 学校级开关：getMemoryEnabled/setMemoryEnabled（system_config KV，默认关）；
 * 4. 会话绑定：listSessions/AllSessions 带 studentId；
 * 5. 审核 UI：StudentMemoryPanel（pending 确认流/priority 依据/删除）+ StudentDetail 接入。
 * 运行：node --test scripts/tests/ai-memory-permission-contract.test.mjs
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

// ==================== 1. 实时权限（M3） ====================

test('canAccessStudentMemory 实时计算：admin 全量 / teacher 同班 / 无快照', () => {
  const src = readProjectFile('src/database/ai-api.ts')
  const start = src.indexOf('canAccessStudentMemory(')
  const end = src.indexOf('getMemoryConfirmerNames(', start)
  const block = src.slice(start, end)
  assert.ok(start >= 0 && end > start, '应存在权限方法')

  // admin 全量
  assert.match(block, /user\.role === 'admin'/)
  // teacher：同班（student.current_class_id JOIN sys_class_teachers）
  assert.match(block, /JOIN sys_class_teachers ct ON ct\.class_id = s\.current_class_id AND ct\.teacher_id = \?/)
  // 实时：每次查询现算（方法体无缓存字段）
  assert.doesNotMatch(block, /cache|snapshot|权限快照/)
})

test('getMemoryConfirmerNames 返回确认教师名映射', () => {
  const src = readProjectFile('src/database/ai-api.ts')
  assert.match(src, /getMemoryConfirmerNames\(memoryIds/)
  assert.match(src, /LEFT JOIN user u ON u\.id = m\.confirmed_by_user_id/)
})

test('store 层权限门控：listStudentMemories 越权返回空', () => {
  const src = readProjectFile('src/stores/ai.ts')
  assert.match(src, /if \(!uid \|\| !api\(\)\.canAccessStudentMemory\(uid, studentId\)\) return \[\]/)
  assert.match(src, /canAccessStudentMemory: \(studentId: number\) =>/)
})

// ==================== 2. 学校级开关（M4） ====================

test('记忆开关持久化 system_config KV（默认关）', () => {
  const src = readProjectFile('src/database/ai-api.ts')
  assert.match(src, /getMemoryEnabled\(\): boolean \{[\s\S]*ai:memory_enabled/)
  assert.match(src, /setMemoryEnabled\(enabled: boolean\): void \{[\s\S]*ai:memory_enabled/)
  // store 加载 + 持久化
  const storeSrc = readProjectFile('src/stores/ai.ts')
  assert.match(storeSrc, /memoryEnabled\.value = a\.getMemoryEnabled\(\)/)
  assert.match(storeSrc, /setMemoryEnabled: \(v: boolean\) => \{[\s\S]*api\(\)\.setMemoryEnabled\(v\)/)
})

// ==================== 3. 会话绑定（M4） ====================

test('会话列表带 studentId（listSessions / listAllSessions）', () => {
  const src = readProjectFile('src/database/ai-api.ts')
  assert.match(src, /studentId\?: number \| null/)
  assert.match(src, /studentId: r\.student_id \?\? null/)
  assert.match(src, /s\.student_id,/)
})

// ==================== 4. 审核 UI（M4） ====================

test('StudentMemoryPanel 提供 pending 确认流 + priority 依据 + 删除', () => {
  const src = readProjectFile('src/views/student-detail/components/StudentMemoryPanel.vue')
  assert.match(src, /defineProps<\{ studentId: number \}>/)
  assert.match(src, /canAccessStudentMemory/)
  // pending 确认流（经 confirmMemory 包装，store 参数化）
  assert.match(src, /aiStore\.confirmStudentMemory\(memory\.id, status\)/)
  assert.match(src, /@click="confirmMemory\(memory, 'confirmed'\)"/)
  assert.match(src, /@click="confirmMemory\(memory, 'rejected'\)"/)
  // priority 须填依据
  assert.match(src, /markMemoryPriority\(memory\.id, priority, note\)/)
  assert.match(src, /inputValidator/)
  // 软删除
  assert.match(src, /deleteStudentMemory\(memory\.id\)/)
  // 确认来源展示
  assert.match(src, /confirmerNames\[memory\.id\]/)
  // 权限门控 UI
  assert.match(src, /您不是该学生的服务团队教师/)
})

test('StudentDetail 接入 AI 记忆 tab + 指标卡', () => {
  const src = readProjectFile('src/views/StudentDetail.vue')
  assert.match(src, /StudentMemoryPanel/)
  assert.match(src, /name="memory" lazy/)
  assert.match(src, /type DetailTab = 'assessments' \| 'equipment' \| 'games' \| 'memory'/)
  assert.match(src, /memoryPendingCount/)
  assert.match(src, /listStudentMemories\(studentId, \['pending'\]\)/)
})
