/**
 * CPEP-3 报告引擎（规则层）— 单元测试（纯函数，无 DB 依赖）
 *
 * 运行：npx jiti tests/cpep3-report-engine.test.ts
 *
 * 覆盖（任务书 §二十二 Test1-6 + §二十一 G1-G8 + §二十 快照版本）：
 *  Test1 P/E/F → 2/1/0 映射一致性（含 G2）
 *  Test2 E 项准确进入 Emerging Skills
 *  Test3 P/F 项绝不进入 Emerging Skills
 *  Test4 无常模时 percentile/DA 为 null（不是 0）
 *  Test5 快照版本字段存在 + 冻结不变（重新计算产生新对象，旧 JSON 不受影响）
 *  Test6 报告文案禁词（诊断/智商/总DQ/失败/正常儿童水平…）
 *  G1-G8 校验器逐条正反用例
 *  IEP 数量边界（priority ≤5 / secondary ≤8）与可测量句式
 */
import assert from 'node:assert/strict'
import { createJiti } from 'jiti'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// 引擎含值导入（@/types/cpep_3 常量数组），需带 @ alias 的 jiti 加载
const { buildCpep3Report, ...engine } = await (async () => {
  const j = createJiti(import.meta.url, { alias: { '@': join(projectRoot, 'src') } })
  return await j.import(join(projectRoot, 'src/services/cpep3-report-engine.ts'))
})()
const {
  buildSubtestResults,
  getEmergingSkills,
  getNormativeResult,
  getStrengths,
  getSupportNeeds,
  generateIepRecommendations,
  validateCpep3Report,
  CPEP3_REPORT_VERSION,
  CPEP3_SCORING_VERSION,
} = engine as {
  buildSubtestResults: typeof import('../src/services/cpep3-report-engine.ts')['buildSubtestResults']
  getEmergingSkills: typeof import('../src/services/cpep3-report-engine.ts')['getEmergingSkills']
  getNormativeResult: typeof import('../src/services/cpep3-report-engine.ts')['getNormativeResult']
  getStrengths: typeof import('../src/services/cpep3-report-engine.ts')['getStrengths']
  getSupportNeeds: typeof import('../src/services/cpep3-report-engine.ts')['getSupportNeeds']
  generateIepRecommendations: typeof import('../src/services/cpep3-report-engine.ts')['generateIepRecommendations']
  validateCpep3Report: typeof import('../src/services/cpep3-report-engine.ts')['validateCpep3Report']
  CPEP3_REPORT_VERSION: string
  CPEP3_SCORING_VERSION: string
}
import type { Cpep3ItemAnswer, Cpep3NormLookup } from '../src/services/cpep3-report-engine.ts'
import type { Cpep3DomainCode } from '../src/types/cpep_3.ts'

// ============ 测试夹具 ============

/** 微型假能区结构：A/B 两个发展能区 + H 一个适应不良行为能区 */
const DOMAIN_NAMES: Record<Cpep3DomainCode, string> = {
  A: '模仿', B: '知觉', C: '精细动作', D: '粗大动作', E: '手眼协调', F: '认知表现', G: '口语认知',
  H: '情感', I: '人际关系', J: '物品喜好', K: '感觉', L: '语言',
}
const DOMAIN_TOTALS = { A: 4, B: 2, C: 10, D: 11, E: 14, F: 20, G: 19, H: 3, I: 7, J: 6, K: 14, L: 11 } as Record<Cpep3DomainCode, number>

const NORM_LOOKUP: Cpep3NormLookup = {
  lookupPg: (domain, passCount) => {
    // 假常模：A 区通过 n → 10+2n 月；B 区通过 n → 8+3n 月
    if (domain === 'A' && passCount >= 0 && passCount <= 4) return { monthRange: `${10 + 2 * passCount}-${12 + 2 * passCount}` }
    if (domain === 'B' && passCount >= 0 && passCount <= 2) return { monthRange: `${8 + 3 * passCount}-${10 + 3 * passCount}` }
    return undefined
  },
  lookupGn: (totalPassCount) => ({ monthRange: `${12 + totalPassCount}-${14 + totalPassCount}` }),
}

let idSeq = 1
function item(domainCode: Cpep3DomainCode, level: 'P' | 'E' | 'F' | 'A' | 'M' | 'S', overrides: Partial<Cpep3ItemAnswer> = {}): Cpep3ItemAnswer {
  const administered = ['P', 'E', 'F'].includes(level)
  const value = administered ? ({ P: 2, E: 1, F: 0 } as const)[level as 'P' | 'E' | 'F'] : ({ A: 0, M: 1, S: 2 } as const)[level as 'A' | 'M' | 'S']
  return {
    questionId: idSeq++,
    codeNo: `${domainCode}${idSeq}`,
    taskName: `${DOMAIN_NAMES[domainCode]}任务${idSeq}`,
    domainCode,
    domainName: DOMAIN_NAMES[domainCode],
    itemType: administered ? 'administered' : 'rated',
    scoreLevel: level,
    scoreValue: value,
    ...overrides,
  }
}

/** 标准作答集：A 区 2P+1E+1F，B 区 1P+1F，H 区 2A+1M */
function standardAnswers(): Cpep3ItemAnswer[] {
  idSeq = 1
  return [
    item('A', 'P'), item('A', 'P'), item('A', 'E'), item('A', 'F'),
    item('B', 'P'), item('B', 'F'),
    item('H', 'A'), item('H', 'A'), item('H', 'M'),
  ]
}

const REPORT_INPUT_BASE = {
  domainItemTotals: DOMAIN_TOTALS,
  domainNames: DOMAIN_NAMES,
  normLookup: NORM_LOOKUP,
  totalMonthRange: '20-22',
  totalDaMidpointMonths: 21,
}

// ============ Test 1: P/E/F → 2/1/0 映射（事实层双存 + G2） ============
{
  const answers = standardAnswers()
  const snapshot = buildCpep3Report({ ...REPORT_INPUT_BASE, itemAnswers: answers })

  // 映射正确性：每个 itemResults 的 level/value 成对
  const expectedValue: Record<string, number> = { P: 2, E: 1, F: 0, A: 0, M: 1, S: 2 }
  for (const it of snapshot.itemResults) {
    assert.equal(it.scoreValue, expectedValue[it.scoreLevel], `level ${it.scoreLevel} 应映射 value ${expectedValue[it.scoreLevel]}`)
  }
  // 分值双存不丢失语义
  const pItems = snapshot.itemResults.filter((it) => it.scoreLevel === 'P')
  assert.ok(pItems.length === 3 && pItems.every((it) => it.scoreValue === 2))
  console.log('✔ Test1. P=2/E=1/F=0 固定映射，level+value 双存一致（G2 通过）')
}

// ============ Test 2/3: E 项进入 Emerging，P/F 绝不进入 ============
{
  const answers = standardAnswers()
  const snapshot = buildCpep3Report({ ...REPORT_INPUT_BASE, itemAnswers: answers })

  const emergingIds = snapshot.emergingSkills.map((s) => s.questionId)
  assert.deepEqual(emergingIds, [answers[2].questionId], '恰好 1 个 E 项进入 Emerging')
  assert.equal(snapshot.emergingSkills[0].scoreLevel, 'E')
  assert.ok(snapshot.emergingSkills[0].teachingDomain.includes('模仿'))

  // P/F 不进入
  const pOrFIds = answers.filter((a) => a.scoreLevel === 'P' || a.scoreLevel === 'F').map((a) => a.questionId)
  for (const qid of pOrFIds) {
    assert.ok(!emergingIds.includes(qid), `P/F 项 ${qid} 不得进入 Emerging`)
  }
  console.log('✔ Test2/3. Emerging Skills 恰好等于 E 项集合')
}

// ============ Test 4: 无常模 → null（不是 0） ============
{
  // 适应不良行为能区：DA/百分位/标准分恒 null
  const norm = getNormativeResult('H', 0, NORM_LOOKUP)
  assert.equal(norm.percentile, null)
  assert.equal(norm.developmentalAgeMonths, null)
  assert.equal(norm.standardScore, null)
  assert.equal(norm.source, 'not_available')

  // 发展能区但通过数越界（无对应常模档）：null 而非 0
  const outOfRange = getNormativeResult('A', 99, NORM_LOOKUP)
  assert.equal(outOfRange.percentile, null)
  assert.equal(outOfRange.developmentalAgeMonths, null)
  assert.equal(outOfRange.source, 'not_available')

  // 合法发展能区查表：百分位仍为 null（系统无百分位常模），DA 有值
  const okNorm = getNormativeResult('A', 2, NORM_LOOKUP)
  assert.equal(okNorm.source, 'authorized_norm_table')
  assert.equal(okNorm.developmentalAgeMonths, 15)
  assert.equal(okNorm.percentile, null, '百分位必须 null（无合法常模表）')

  // subtestResults 落表后适应不良行为 DA 强制 null
  const answers = standardAnswers()
  const subtests = buildSubtestResults({ ...REPORT_INPUT_BASE, itemAnswers: answers })
  const hSub = subtests.find((s) => s.domainCode === 'H')!
  assert.equal(hSub.developmentalAgeMonths, null, '适应不良行为能区 DA 必须 null（UI 显示「不适用」）')
  assert.equal(hSub.rawScore, 1, 'H 区严重度分 = 2A(0)+1M(1) = 1')
  console.log('✔ Test4. 无常模时 percentile/DA 为 null 而非 0；适应不良行为 DA 恒 null')
}

// ============ Test 5: 快照版本 + 冻结不变性 ============
{
  const answers = standardAnswers()
  const snapshot1 = buildCpep3Report({ ...REPORT_INPUT_BASE, itemAnswers: answers, generatedAt: '2026-09-09T10:00:00.000Z' })

  // 版本字段存在且合法
  assert.equal(snapshot1.reportVersion, CPEP3_REPORT_VERSION)
  assert.equal(snapshot1.scoringVersion, CPEP3_SCORING_VERSION)
  assert.ok(CPEP3_REPORT_VERSION.startsWith('cpep3-report-v'))
  assert.ok(CPEP3_SCORING_VERSION.startsWith('cpep3-scoring-v'))

  // 冻结不变性：序列化后（模拟落库），后续修改引擎输入/重算不影响已存快照
  const frozenJson = JSON.stringify(snapshot1)
  const answers2 = standardAnswers() // 相同结构的新作答（questionId 相同、对象不同）
  const snapshot2 = buildCpep3Report({ ...REPORT_INPUT_BASE, itemAnswers: answers2, generatedAt: '2027-01-01T00:00:00.000Z' })
  assert.notEqual(JSON.stringify(snapshot2), frozenJson, 'generatedAt 不同则快照不同（证明两次独立生成）')
  assert.equal(JSON.parse(frozenJson).total.passCount, snapshot2.total.passCount, '冻结 JSON 内容稳定')

  // G8 不变性：同一作答重算，total 求和一致
  assert.equal(snapshot1.total.passCount, 3)
  assert.equal(snapshot1.total.emergingCount, 1)
  console.log('✔ Test5. 快照版本字段 + 冻结不变（重新生成不改变已序列化快照）')
}

// ============ Test 6: 报告禁词 ============
{
  const answers = standardAnswers()
  const snapshot = buildCpep3Report({ ...REPORT_INPUT_BASE, itemAnswers: answers })

  // 收集快照内全部面向用户的文案
  const texts: string[] = [snapshot.summary, snapshot.limitations]
  for (const s of snapshot.strengths) texts.push(s.summary)
  for (const s of snapshot.emergingSkills) texts.push(s.suggestedGoal)
  for (const s of snapshot.supportNeeds) texts.push(s.suggestedGoal)
  for (const m of snapshot.maladaptiveOverview) texts.push(m.note)
  for (const g of [...snapshot.iepPlan.priority, ...snapshot.iepPlan.secondary]) {
    texts.push(g.goalText, g.currentPerformance, g.criteria)
  }
  texts.push(snapshot.iepPlan.caregiverNote)

  const forbidden = ['诊断为自闭症', '确诊', '病情严重', '智商', '总发展商', '总DQ', '总 DQ', '失败', '能力缺陷', '低能', '智力低下', '严重异常', '病理性', '正常儿童水平']
  for (const text of texts) {
    for (const word of forbidden) {
      assert.ok(!text.includes(word), `报告文案不得出现禁词「${word}」: ${text.slice(0, 60)}`)
    }
  }
  console.log('✔ Test6. 报告文案零禁词（诊断/智商/总DQ/失败/病理…）')
}

// ============ G1: itemId 不存在 ============
{
  const answers = standardAnswers()
  answers[0].questionId = 99999 // 篡改为不存在的题号
  assert.throws(
    () => buildCpep3Report({ ...REPORT_INPUT_BASE, itemAnswers: answers }, new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])),
    /G1|不在题库中/,
    'G1: 引用题库外 itemId 必须抛错',
  )
  console.log('✔ G1. itemId 不存在 → FAIL')
}

// ============ G1b: 全量覆盖（139 题库全集传入时，漏答必须 FAIL；补齐后通过） ============
{
  const fullBank = new Set(Array.from({ length: 139 }, (_, i) => i + 1))
  // 9 题作答 < 139 题全集 → 漏答检查生效，必须抛错
  const partial = standardAnswers()
  assert.throws(
    () => buildCpep3Report({ ...REPORT_INPUT_BASE, itemAnswers: partial }, fullBank),
    /漏答/,
    'G1b: 传题库全集时漏答必须抛错',
  )
  // 重复作答必须 FAIL
  const dup = standardAnswers()
  dup.push({ ...dup[0] })
  assert.throws(
    () => buildCpep3Report({ ...REPORT_INPUT_BASE, itemAnswers: dup }, fullBank),
    /重复作答/,
    'G1b: 重复作答必须抛错',
  )
  // 局部题库集合（<139）不触发漏答检查——单测局部作答场景不受影响
  const subset = buildCpep3Report({ ...REPORT_INPUT_BASE, itemAnswers: standardAnswers() }, new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]))
  assert.ok(subset.total.passCount >= 0, '局部集合路径可用')
  console.log('✔ G1b. 全量覆盖：漏答/重复作答 FAIL；局部集合不误报')
}

// ============ G2: level/value 不一致 ============
{
  const answers = standardAnswers()
  const snapshot = buildCpep3Report({ ...REPORT_INPUT_BASE, itemAnswers: answers })
  // 篡改快照内一个 item 的 value（模拟落库数据损坏或手工构造错误）
  snapshot.itemResults[0].scoreValue = 0 // P 应为 2
  const validation = validateCpep3Report(answers, snapshot)
  assert.ok(validation.issues.some((i) => i.code === 'G2'), 'P 项 value=0 必须触发 G2')
  assert.equal(validation.ok, false)
  console.log('✔ G2. scoreLevel 与 scoreValue 不一致 → FAIL')
}

// ============ G3: 非发展能区出现发展年龄 ============
{
  const answers = standardAnswers()
  const snapshot = buildCpep3Report({ ...REPORT_INPUT_BASE, itemAnswers: answers })
  snapshot.subtestResults.find((s) => s.domainCode === 'H')!.developmentalAgeMonths = 24
  const validation = validateCpep3Report(answers, snapshot)
  assert.ok(validation.issues.some((i) => i.code === 'G3'), '适应不良行为能区不得有 DA')
  console.log('✔ G3. 发展年龄出现在不允许的能区 → FAIL')
}

// ============ G4/G5: 无常模来源生成 percentile/standardScore ============
{
  const answers = standardAnswers()
  const snapshot = buildCpep3Report({ ...REPORT_INPUT_BASE, itemAnswers: answers })
  snapshot.subtestResults[0].percentile = 75
  snapshot.subtestResults[1].standardScore = 11
  const validation = validateCpep3Report(answers, snapshot)
  assert.ok(validation.issues.some((i) => i.code === 'G4'))
  assert.ok(validation.issues.some((i) => i.code === 'G5'))
  console.log('✔ G4/G5. 无常模来源生成 percentile/standardScore → FAIL')
}

// ============ G6: Emerging 中混入非 E 项 ============
{
  const answers = standardAnswers()
  const snapshot = buildCpep3Report({ ...REPORT_INPUT_BASE, itemAnswers: answers })
  snapshot.emergingSkills.push({
    questionId: answers[0].questionId, // P 项
    codeNo: answers[0].codeNo,
    skillName: answers[0].taskName,
    domainCode: 'A',
    teachingDomain: '模仿领域',
    scoreLevel: 'E', // 伪造
    suggestedGoal: '伪造',
  })
  const validation = validateCpep3Report(answers, snapshot)
  assert.ok(validation.issues.some((i) => i.code === 'G6'), '非 E 项混入 Emerging 必须 FAIL')
  console.log('✔ G6. Emerging 中存在非 E 项 → FAIL')
}

// ============ G7: IEP 引用不存在的 itemId ============
{
  const answers = standardAnswers()
  const snapshot = buildCpep3Report({ ...REPORT_INPUT_BASE, itemAnswers: answers })
  snapshot.iepPlan.priority[0]?.sourceQuestionIds.push(424242)
  const validation = validateCpep3Report(answers, snapshot)
  assert.ok(validation.issues.some((i) => i.code === 'G7'))
  console.log('✔ G7. IEP 引用不存在的 itemId → FAIL')
}

// ============ G8: rawScore 与 item 汇总不一致 ============
{
  const answers = standardAnswers()
  const snapshot = buildCpep3Report({ ...REPORT_INPUT_BASE, itemAnswers: answers })
  // 篡改能区 pCount
  const subA = snapshot.subtestResults.find((s) => s.domainCode === 'A')!
  subA.pCount = 4 // 实际 2P
  const validation = validateCpep3Report(answers, snapshot)
  assert.ok(validation.issues.some((i) => i.code === 'G8' && i.message.includes('A')))
  // 篡改总通过数
  snapshot.subtestResults.find((s) => s.domainCode === 'A')!.pCount = 2
  snapshot.total.passCount = 99
  const validation2 = validateCpep3Report(answers, snapshot)
  assert.ok(validation2.issues.some((i) => i.code === 'G8' && i.message.includes('总通过数')))
  console.log('✔ G8. 报告 rawScore/总通过数与明细汇总不一致 → FAIL')
}

// ============ IEP 结构：数量边界 + 可测量句式 + E 优先 ============
{
  // 多 E 项场景：A 区 3E + B 区 2E + 相邻 F 若干
  idSeq = 1
  const manyEmerging: Cpep3ItemAnswer[] = [
    item('A', 'E'), item('A', 'E'), item('A', 'E'), item('A', 'F'),
    item('B', 'E'), item('B', 'E'), item('B', 'F'),
  ]
  const plan = generateIepRecommendations(manyEmerging, DOMAIN_NAMES)
  assert.ok(plan.priority.length >= 1 && plan.priority.length <= 5, `priority 数量 ${plan.priority.length} ∈ [1,5]`)
  assert.ok(plan.secondary.length >= 1 && plan.secondary.length <= 8, `secondary 数量 ${plan.secondary.length} ∈ [1,8]`)
  // priority 全部源自 E 项能区
  for (const goal of plan.priority) {
    assert.ok(goal.currentPerformance.includes('萌发'), 'priority 目标必须来自 E 项')
    // 可测量句式：聚合目标列举萌发技能清单（「」）+ 含场景/提示/达成标准
    assert.ok(goal.goalText.includes('儿童能够') && goal.goalText.includes('「') && goal.criteria.includes('80%'), '目标必须含行为描述+达成标准（可测量）')
    assert.ok(goal.promptLevel.length > 0 && goal.setting.length > 0)
  }
  // 相邻 F 排在一般 F 前
  assert.ok(plan.secondary[0].currentPerformance === '当前尚未表现')
  // 家庭泛化基于 E 项
  assert.ok(plan.familyGeneralization.length >= 1 && plan.familyGeneralization.length <= 4)
  assert.ok(plan.caregiverNote.includes('未配置'), '照顾者报告缺席必须明示局限')
  console.log('✔ IEP. 三级结构数量边界 + 可测量句式 + 相邻 F 优先 + 照顾者局限声明')
}

// ============ 优势措辞白名单 + 支持需求排序 ============
{
  idSeq = 1
  const answers = [
    item('A', 'P'), item('A', 'P'), item('A', 'P'), item('A', 'F'), // A 通过率 75%
    item('B', 'E'), item('B', 'F'),
  ]
  const subtests = buildSubtestResults({ ...REPORT_INPUT_BASE, itemAnswers: answers })
  const strengths = getStrengths(subtests)
  assert.equal(strengths.length, 1)
  assert.equal(strengths[0].domainCode, 'A')
  assert.ok(strengths[0].summary.includes('相对优势'), '措辞用「相对优势」')
  assert.ok(!strengths[0].summary.includes('正常'), '禁「正常」')

  const needs = getSupportNeeds(answers, DOMAIN_NAMES)
  assert.equal(needs[0].priority, 'adjacent_to_emerging', 'B 区 F 项（与 E 相邻）必须排第一')
  assert.equal(needs[1].priority, 'general', 'A 区 F 项排其后')
  console.log('✔ 优势/支持. 措辞白名单 + 相邻 F 优先排序')
}

// ============ 快照 G1-G8 全绿冒烟：buildCpep3Report 对合法输入零抛错 ============
{
  const answers = standardAnswers()
  const snapshot = buildCpep3Report({ ...REPORT_INPUT_BASE, itemAnswers: answers }, new Set(answers.map((a) => a.questionId)))
  const validation = validateCpep3Report(answers, snapshot)
  assert.equal(validation.ok, true, `合法作答应零 issue: ${JSON.stringify(validation.issues)}`)

  // 剖面：完成度百分比 + metric 标注
  assert.equal(snapshot.profile.metric, 'completion_pct')
  const aProfile = snapshot.profile.domains.find((d) => d.domainCode === 'A')!
  assert.equal(aProfile.completionPct, 50)
  assert.equal(aProfile.developmentalAgeRange, '14-16')
  console.log('✔ 冒烟. 合法输入 → G1-G8 全绿 + 剖面完成度正确（50%）')
}

console.log('\nCPEP-3 报告引擎单测全部通过 ✅')
