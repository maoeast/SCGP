/**
 * 首页看板「评估缺口与优先建议」分析 — 单元测试（纯函数，无 DB 依赖）
 *
 * 运行：npx jiti tests/assessment-gap-analysis.test.ts
 *
 * 覆盖：
 *  1. 从未评估 → never 标签 + 入列 + 优先级档位
 *  2. 结果偏弱：danger（重度类）与 warning（轻度类）分别入列，建议句引用真实量表与等级
 *  3. 评估缺口达阈值（缺 ≥3 域）→ 入列；未达阈值（缺 2 域）→ 不入列
 *  4. 超期未复评（>6 个月）→ overdue 标签 + 入列
 *  5. 覆盖但不参与强弱判定的量表（cpep_3 等）不产生偏弱结论
 *  6. 优先级次序：明显偏弱 > 从未评估 > 偏弱需关注 > 缺口 > 超期
 *  7. 无任何信号的学生不入列（面板是待办清单，不是花名册）
 *  8. 同域多量表时，溯源引用必须是触发判定的那条等级（不得拿「正常」当偏弱证据）
 *  9. 危险词单独命中即可判定明显偏弱（不受 strengthFromLevel 负向词表覆盖面影响）
 * 10. 优先档判定（面板角标「优先 N · 共 M」）
 */
import assert from 'node:assert/strict'
import {
  analyzeAssessmentGaps,
  isPriorityInsight,
  COVERAGE_ONLY_SCALE_CODES,
  DEFAULT_OVERDUE_MONTHS,
  MIN_MISSING_DOMAINS_FOR_BASELINE_INSIGHT,
  type ScaleLatestSnapshot,
  type StudentAssessmentInput,
} from '../src/services/assessment-gap-analysis.ts'

const NOW = new Date('2026-09-21T09:00:00+08:00')
const iso = (daysAgo: number) =>
  new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

/** 造一条量表快照。 */
function snap(
  scaleCode: string,
  level: string,
  daysAgo = 10,
  scaleName = `${scaleCode} 量表`,
): ScaleLatestSnapshot {
  return { scaleCode, scaleName, date: iso(daysAgo), level }
}

/** 造一名学生。 */
function student(
  id: number,
  snapshots: ScaleLatestSnapshot[],
  extra: Partial<StudentAssessmentInput> = {},
): StudentAssessmentInput {
  return {
    studentId: id,
    studentName: `学生${id}`,
    avatarPath: null,
    disorder: null,
    createdAt: iso(200),
    snapshots,
    ...extra,
  }
}

const analyze = (students: StudentAssessmentInput[]) =>
  analyzeAssessmentGaps(students, { now: NOW })

// ---------- 1. 从未评估 ----------
{
  const result = analyze([student(1, [])])
  assert.equal(result.length, 1, '从未评估的学生应入列')
  const item = result[0]!
  assert.equal(item.lastAssessmentAt, null)
  assert.equal(item.daysSinceLastAssessment, null)
  assert.ok(
    item.tags.some((tag) => tag.kind === 'never'),
    '应带 never 标签',
  )
  assert.match(item.suggestion, /建立基线评估/, '建议句应提示建立基线')
  assert.ok(item.priority >= 500, `从未评估优先级应 ≥500，实际 ${item.priority}`)
}

// ---------- 2. 结果偏弱：明显偏弱（danger） vs 偏弱（warning） ----------
{
  const result = analyze([
    student(2, [
      snap('sdq', '重度异常', 5, '长处和困难问卷（SDQ）'),
      snap('csirs', '正常', 5, '儿童感觉统合能力发展评估量表'),
    ]),
  ])
  const item = result[0]!
  assert.ok(
    item.tags.some((tag) => tag.kind === 'weak' && tag.label.includes('社交')),
    `重度等级应带「社交 明显偏弱」标签，实际 ${JSON.stringify(item.tags)}`,
  )
  assert.match(item.suggestion, /长处和困难问卷/, '建议句应引用触发的真实量表')
  assert.match(item.suggestion, /重度异常/, '建议句应引用真实等级')
  assert.match(item.suggestion, /优先安排干预/, '明显偏弱应给优先干预建议')
  assert.ok(item.priority >= 1000, `明显偏弱优先级应 ≥1000，实际 ${item.priority}`)
}

// 轻度/中度类等级归为「偏弱需关注」，不占用最高优先级
{
  const result = analyze([
    student(21, [
      snap('sdq', '轻度', 5, '长处和困难问卷（SDQ）'),
      snap('csirs', '正常', 5, '儿童感觉统合能力发展评估量表'),
    ]),
  ])
  const item = result[0]!
  assert.ok(
    item.tags.some((tag) => tag.kind === 'watch' && tag.label.includes('社交')),
    `轻度等级应带「社交 偏弱」关注标签，实际 ${JSON.stringify(item.tags)}`,
  )
  assert.match(item.suggestion, /交叉验证/, '偏弱（warning）应给交叉验证建议')
  assert.ok(
    item.priority >= 300 && item.priority < 500,
    `偏弱（warning）优先级应在 300–499，实际 ${item.priority}`,
  )
}

// ---------- 3. 缺口阈值 ----------
{
  // 只测过 2 个领域（sensory + social）→ 缺 emotional/cognitive/life_skills = 3 → 入列
  const atThreshold = analyze([
    student(3, [snap('csirs', '正常'), snap('sdq', '正常')]),
  ])
  assert.equal(atThreshold.length, 1, `缺 ${MIN_MISSING_DOMAINS_FOR_BASELINE_INSIGHT} 个领域应入列`)
  assert.ok(
    atThreshold[0]!.tags.some((tag) => tag.kind === 'gap'),
    '应带 gap 标签',
  )
  assert.match(atThreshold[0]!.suggestion, /评估缺口/, '建议句应指出评估缺口')

  // 测过 3 个领域（sensory + social + emotional）→ 只缺 2 → 不入列
  const belowThreshold = analyze([
    student(4, [snap('csirs', '正常'), snap('sdq', '正常'), snap('cbcl', '正常')]),
  ])
  assert.equal(belowThreshold.length, 0, '缺口未达阈值不应单独入列')
}

// ---------- 4. 超期未复评 ----------
{
  const overdueDays = (DEFAULT_OVERDUE_MONTHS + 2) * 31
  const result = analyze([
    student(5, [snap('csirs', '正常', overdueDays), snap('sdq', '正常', overdueDays)]),
  ])
  assert.equal(result.length, 1, '超期未复评应入列')
  const item = result[0]!
  assert.ok(
    item.tags.some((tag) => tag.kind === 'overdue'),
    `应带 overdue 标签，实际 ${JSON.stringify(item.tags)}`,
  )
  assert.match(item.suggestion, /复评/, '建议句应提示复评')
  assert.ok(
    item.daysSinceLastAssessment !== null && item.daysSinceLastAssessment > 180,
    '距今天数应真实反映超期',
  )
}

// ---------- 5. 覆盖但不参与强弱判定的量表 ----------
{
  assert.ok(
    COVERAGE_ONLY_SCALE_CODES.includes('cpep_3'),
    'cpep_3 应声明为仅覆盖量表（等级是发展当量月龄，不是强弱等级）',
  )
  // cpep_3 等级文本塞入负向词，也不应产生「社交 偏弱」（该判断被显式排除）
  const result = analyze([
    student(6, [snap('cpep_3', 'severe', 3, 'PEP-3 心理教育量表'), snap('csirs', '正常')]),
  ])
  const weakTags = analyze([
    student(7, [snap('cpep_3', 'severe', 3, 'PEP-3 心理教育量表'), snap('csirs', '正常')]),
  ])[0]?.tags ?? []
  assert.equal(
    weakTags.some((tag) => tag.kind === 'weak'),
    false,
    `cpep_3 不应产生偏弱结论，实际 ${JSON.stringify(weakTags)}`,
  )
  // 但它仍计入社交领域覆盖 → 缺口只剩 3 个（emotional/cognitive/life_skills）→ 恰达阈值入列
  assert.equal(result.length, 1, 'cpep_3 记录仍应计入领域覆盖')
}

// ---------- 6. 优先级次序：明显偏弱 > 从未评估 > 偏弱需关注 > 缺口 > 超期 ----------
{
  const overdueDays = (DEFAULT_OVERDUE_MONTHS + 2) * 31
  const result = analyze([
    // 超期但覆盖完整（5 域都有）→ 只有超期这一个信号
    student(10, [
      snap('csirs', '正常', overdueDays), // sensory
      snap('sdq', '正常', overdueDays), // social
      snap('cbcl', '正常', overdueDays), // emotional
      snap('brief', '正常', overdueDays), // cognitive
      snap('sm', '正常', overdueDays), // life_skills
    ]),
    // 缺口（缺 3 域，未超期）
    student(11, [snap('csirs', '正常', 3), snap('sdq', '正常', 3)]),
    // 明显偏弱
    student(12, [snap('sdq', '重度异常', 3), snap('csirs', '正常', 3)]),
    // 从未评估
    student(13, []),
    // 偏弱（轻度，需关注）
    student(14, [snap('sdq', '轻度', 3), snap('csirs', '正常', 3)]),
  ])
  const order = result.map((item) => item.studentId)
  assert.equal(order[0], 12, `明显偏弱学生应排最前，实际顺序 ${order.join(',')}`)
  assert.equal(order[1], 13, `从未评估应排第二，实际顺序 ${order.join(',')}`)
  assert.equal(order[2], 14, `偏弱（需关注）应排第三，实际顺序 ${order.join(',')}`)
  assert.equal(order[3], 11, `评估缺口应排在超期之前，实际顺序 ${order.join(',')}`)
  assert.equal(order[4], 10, `超期应排最后，实际顺序 ${order.join(',')}`)
}

// ---------- 7. 信号齐备的学生不入列 ----------
{
  const healthy = analyze([
    student(20, [
      snap('csirs', '正常', 3), // sensory
      snap('sdq', '正常', 3), // social
      snap('cbcl', '正常', 3), // emotional
      snap('brief', '正常', 3), // cognitive
      snap('sm', '正常', 3), // life_skills
    ]),
  ])
  assert.equal(healthy.length, 0, '无任何信号的学生不应出现在待办清单里')
}

// ---------- 8. 同域多量表：溯源必须是触发判定的那条等级（不得引用「正常」当证据）----------
{
  const result = analyze([
    student(30, [
      // 情绪调节域：CBCL 较旧且等级「临床」= 触发危险判定；Conners PSQ 最新但「正常」
      snap('cbcl', '临床', 40, 'Achenbach 儿童行为量表（CBCL）'),
      snap('conners_psq', '正常', 3, 'Conners 父母症状问卷（PSQ）'),
      snap('csirs', '正常', 3),
      snap('sdq', '正常', 3),
      snap('brief', '正常', 3),
      snap('sm', '正常', 3),
    ]),
  ])
  const item = result[0]!
  assert.ok(
    item.tags.some((tag) => tag.kind === 'weak' && tag.label.includes('情绪')),
    `情绪调节域应判为明显偏弱（CBCL 临床），实际 ${JSON.stringify(item.tags)}`,
  )
  assert.match(item.suggestion, /CBCL/, '溯源应引用触发判定的量表（CBCL）')
  assert.doesNotMatch(
    item.suggestion,
    /Conners/,
    '不得引用该域内未触发判定、只是日期更新的量表',
  )
  assert.doesNotMatch(item.suggestion, /等级「正常」/, '不得把「正常」等级当作偏弱证据')
}

// ---------- 9. 危险词单独命中即判定明显偏弱（不靠聚合门兜底）----------
// 个别危险词（extreme / verylow）不在 strengthFromLevel 的负向词表里，聚合会判 normal；
// 若把危险词判定放在聚合门之后，这类等级会被漏报。
{
  const result = analyze([
    student(40, [
      snap('atec', 'extreme', 3, '孤独症治疗评估量表（ATEC）'), // social
      snap('csirs', '正常', 3), // sensory
      snap('cbcl', '正常', 3), // emotional
      snap('brief', '正常', 3), // cognitive
      snap('sm', '正常', 3), // life_skills
    ]),
  ])
  assert.equal(result.length, 1, '危险词命中的学生应入列')
  const item = result[0]!
  assert.ok(
    item.tags.some((tag) => tag.kind === 'weak' && tag.label.includes('社交')),
    `应判为「社交沟通 明显偏弱」，实际 ${JSON.stringify(item.tags)}`,
  )
  assert.match(item.suggestion, /ATEC/, '溯源应引用命中危险词的那条快照')
  assert.match(item.suggestion, /extreme/, '建议句应引用等级原文')
  assert.ok(item.priority >= 1000, `优先级应 ≥1000，实际 ${item.priority}`)
}

// ---------- 10. 优先档判定（面板角标「优先 N · 共 M」的口径）----------
{
  const result = analyze([
    student(50, [snap('sdq', '重度异常', 3), snap('csirs', '正常', 3)]), // 明显偏弱 → 优先
    student(51, []), // 从未评估 → 优先
    student(52, [snap('sdq', '轻度', 3), snap('csirs', '正常', 3)]), // 偏弱需关注 → 非优先
    student(53, [snap('csirs', '正常', 3), snap('sdq', '正常', 3)]), // 仅评估缺口 → 非优先
  ])
  assert.equal(result.length, 4, '四名学生都应入列')
  const priorityIds = result.filter(isPriorityInsight).map((item) => item.studentId).sort((a, b) => a - b)
  assert.deepEqual(priorityIds, [50, 51], `优先档应为明显偏弱 + 从未评估，实际 ${priorityIds.join(',')}`)
  const baselineCount = result.filter((item) => !isPriorityInsight(item)).length
  assert.equal(baselineCount, 2, `待补齐基线档应为 2，实际 ${baselineCount}`)
}

console.log('assessment-gap-analysis test passed (10 场景)')
