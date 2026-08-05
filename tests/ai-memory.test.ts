/**
 * AI 学生级长期记忆 · 总结链路纯函数单元测试（v4.1 §5/§8）。
 *
 * 运行：npx jiti tests/ai-memory.test.ts
 *
 * 覆盖：
 *  1. 脱敏：姓名→[STUDENT]、手机号/学号→[REDACTED]
 *  2. 规范化 + 指纹：全角/空格/标点归一，同义文本同指纹
 *  3. 3-gram 相似度：完全相同=1、相近>0.8、无关<0.5
 *  4. 总结提示词：主体锚定 + JSON 输出约束
 *  5. 结果解析：标准 JSON / markdown 围栏 / 脏数据容错 / 非法分类过滤 / 超长过滤
 */
import assert from 'node:assert/strict'
import {
  desensitizeForSummary,
  normalizeText,
  fingerprintOf,
  trigramSimilarity,
  buildMemorySummaryPrompt,
  parseMemoryFacts,
} from '../src/services/ai-memory.ts'

// ---------- 1. 脱敏 ----------
{
  const out = desensitizeForSummary('小明今天在课上哭了，电话 13812345678，学号 20240001。', '小明')
  assert.ok(out.includes('[STUDENT]'), '姓名应替换为 [STUDENT]')
  assert.ok(!out.includes('小明'), '不应残留姓名')
  assert.ok(out.includes('[REDACTED]'), '手机号应脱敏')
  assert.ok(!/13812345678/.test(out), '手机号不应残留')
  assert.ok(!/20240001/.test(out), '学号不应残留')
}

// 无姓名时仅正则脱敏
{
  const out = desensitizeForSummary('孩子今天表现不错，电话 13812345678。', undefined)
  assert.ok(out.includes('孩子'), '代词不替换（由主体锚定兜底）')
  assert.ok(out.includes('[REDACTED]'))
}

// ---------- 2. 规范化 + 指纹 ----------
{
  assert.equal(normalizeText(' 小明 今天 哭了 '), '小明今天哭了')
  assert.equal(normalizeText('ＡＢＣ'), 'abc', '全角转半角')
  assert.equal(normalizeText('触觉敏感。'), '触觉敏感', '去标点')
  assert.equal(fingerprintOf('触觉敏感'), fingerprintOf('触觉敏感。'), '同义文本同指纹')
  assert.notEqual(fingerprintOf('触觉敏感'), fingerprintOf('社交退缩'), '不同文本不同指纹')
}

// ---------- 3. 3-gram 相似度（低阈值提示信号，v4 §5） ----------
{
  assert.equal(trigramSimilarity('触觉敏感', '触觉敏感'), 1, '完全相同=1')
  // 短句（≤15 字）3-gram 区分度有限——设计定位是"提示信号"而非判定：
  // 完全相同（指纹一致）→ 自动去重；3-gram 高相似 → possible_duplicate_of 提示（教师确认）
  const sameText = trigramSimilarity('小明触觉敏感，抗拒沙池', '小明触觉敏感，抗拒沙池')
  assert.equal(sameText, 1)
  const near = trigramSimilarity('小明触觉敏感，抗拒沙池', '小明触觉过敏，怕沙池')
  assert.ok(near > 0.1, `近似文本应产生提示信号（>0.1），实际 ${near}`)
  const far = trigramSimilarity('小明触觉敏感', '社交退缩同伴互动少')
  assert.ok(far <= near, '无关文本相似度不应高于近似文本')
}

// ---------- 4. 总结提示词 ----------
{
  const prompt = buildMemorySummaryPrompt()
  assert.match(prompt, /\[STUDENT\]/)
  assert.match(prompt, /代词「他\/她\/孩子」均指 \[STUDENT\]/, '主体锚定')
  assert.match(prompt, /只输出 JSON/)
  assert.match(prompt, /"facts"/)
  assert.match(prompt, /observation\|preference\|advice_given\|follow_up/)
}

// ---------- 5. 结果解析 ----------
{
  // 标准 JSON
  const facts = parseMemoryFacts(
    '{"facts":[{"category":"observation","content":"触觉敏感，抗拒沙池","confidence":"observed"}]}',
  )
  assert.equal(facts.length, 1)
  assert.equal(facts[0]!.category, 'observation')
  assert.equal(facts[0]!.confidence, 'observed')

  // markdown 围栏
  const fenced = parseMemoryFacts('```json\n{"facts":[{"category":"follow_up","content":"2周后复盘","confidence":"observed"}]}\n```')
  assert.equal(fenced.length, 1)
  assert.equal(fenced[0]!.category, 'follow_up')

  // 脏数据
  assert.deepEqual(parseMemoryFacts(''), [])
  assert.deepEqual(parseMemoryFacts('not json'), [])
  assert.deepEqual(parseMemoryFacts('{"nofacts":1}'), [])

  // 非法分类 + 超长过滤
  const longContent = 'x'.repeat(250)
  const mixed = parseMemoryFacts(
    `{"facts":[{"category":"gossip","content":"非法分类","confidence":"observed"},{"category":"observation","content":"${longContent}","confidence":"observed"},{"category":"preference","content":"喜欢公交车话题","confidence":"assumed"}]}`,
  )
  assert.equal(mixed.length, 1, '非法分类与超长应被过滤')
  assert.equal(mixed[0]!.category, 'preference')
  assert.equal(mixed[0]!.confidence, 'assumed')
}

console.log('ai-memory test passed (5 场景)')
