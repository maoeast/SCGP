/**
 * 评估报告 Word builder 单元测试（node --test）
 *
 * 覆盖 9 个 builder 的关键输出合同：
 *  - section 结构合法（type ∈ paragraph/list/table/kv-table）
 *  - 关键段落存在（页面有、导出必有的段）
 *  - 无重复「基本信息」kv-table（payload.meta 已自动渲染基本信息，builder 不得再推同名段）
 *  - [儿童姓名] 占位符在渲染文本中零残留（studentName 替换口径）
 *  - 用时单位为秒（非毫秒：数值 < 60 才合理，> 100 视为单位错误）
 *
 * 运行：node --test scripts/tests/assessment-word-builders.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const require = createRequire(import.meta.url)
// builders 无副作用、纯数据转换，经 jiti 已验证可加载；此处用 jiti 直载以支持 @ alias
const { createJiti } = require('jiti')
const jiti = createJiti(import.meta.url, { alias: { '@': join(projectRoot, 'src') } })
const builders = await jiti.import(join(projectRoot, 'src/utils/assessment-word-builders.ts'))

const VALID_TYPES = new Set(['paragraph', 'list', 'table', 'kv-table'])

/** 通用断言：结构合法 + 无重复基本信息 + 全文本无占位符残留 */
function assertCommon(name, payload) {
  assert.ok(payload.title, `${name}: title 必填`)
  assert.ok(payload.filename, `${name}: filename 必填`)
  assert.ok(Array.isArray(payload.sections) && payload.sections.length > 0, `${name}: sections 非空`)
  const basicCount = payload.sections.filter((s) => s.heading === '基本信息').length
  assert.equal(basicCount, 0, `${name}: 不得含「基本信息」kv-table（meta 已自动渲染，重复段）`)
  for (const s of payload.sections) {
    assert.ok(VALID_TYPES.has(s.type), `${name}: 非法 section type ${s.type}`)
    if (s.type === 'table') {
      assert.ok(s.columns?.length > 0, `${name}: table 缺 columns`)
      assert.ok(Array.isArray(s.rows), `${name}: table rows 非数组`)
    }
  }
  // 占位符零残留（收集所有渲染文本）
  const texts = []
  for (const s of payload.sections) {
    if (s.type === 'paragraph') texts.push(...s.paragraphs)
    if (s.type === 'list') texts.push(...s.items)
    if (s.type === 'table') texts.push(...s.rows.flat())
    if (s.type === 'kv-table') texts.push(...s.rows.map((r) => r.value))
  }
  for (const t of texts) {
    assert.ok(!String(t).includes('[儿童姓名]'), `${name}: 渲染文本残留 [儿童姓名] 占位符: ${String(t).slice(0, 50)}`)
  }
}

test('buildAbcWordPayload：等级分档解释 + 维度明细 + 工具说明', () => {
  const p = builders.buildAbcWordPayload({
    studentName: '测试儿童', assessmentDate: '2026-09-10T10:00:00Z', ageMonths: 48,
    totalScore: 70, totalMaxScore: 158, levelText: '轻度',
    dimensionRows: [{ name: '感觉', score: 30, maxScore: 60, percentage: '50.0', description: '对感觉刺激的异常反应' }],
    summary: '总分 70 分，提示轻度孤独症症状（62-79分）。建议尽快启动早期干预，重点关注评分较高的维度。',
    recommendations: ['建议专业评估'],
  })
  assertCommon('ABC', p)
  const headings = p.sections.map((s) => s.heading)
  for (const h of ['评估结果总览', '结果解释', '维度得分明细', '建议', '工具说明']) {
    assert.ok(headings.includes(h), `ABC 缺段「${h}」`)
  }
  // 等级分档解释须含分档区间（非一行套话）
  const summary = p.sections.find((s) => s.heading === '结果解释').paragraphs[0]
  assert.ok(summary.includes('62-79'), 'ABC 结果解释应含等级分档区间')
})

test('buildAtecWordPayload：分量表明细含计分方向 + 等级分档解释', () => {
  const p = builders.buildAtecWordPayload({
    studentName: '测试儿童', assessmentDate: '2026-09-10T10:00:00Z', ageMonths: 48,
    totalScore: 80, totalMaxScore: 179, levelText: '中度',
    subscaleRows: [{ name: '社交能力', score: 40, maxScore: 60, percentage: '66.7', description: '社交互动', scoringNote: '正向计分：分数越高表示问题越多' }],
    summary: '总分 80/179 分，提示中度孤独症症状。干预重点：社交能力（40/60）得分较高。',
    recommendations: ['每 3 个月复测'],
  })
  assertCommon('ATEC', p)
  const subscale = p.sections.find((s) => s.heading === '分量表得分明细')
  assert.ok(subscale.columns.includes('计分方向'), 'ATEC 分量表表须含计分方向列')
  const summary = p.sections.find((s) => s.heading === '结果解释').paragraphs[0]
  assert.ok(summary.includes('179'), 'ATEC 结果解释应含满分')
})

test('buildCrtWordPayload：IQ/百分位/五组明细/免责', () => {
  const p = builders.buildCrtWordPayload({
    studentName: '测试儿童', gender: '男', assessmentDate: '2026/9/10', ageText: '4岁0个月',
    iqEstimate: 95, percentileRank: 40, totalRawScore: 30, totalQuestions: 60, level: '典型水平',
    resultDescription: '表现为典型水平。',
    unitRows: [{ name: 'A 知觉辨别', correct: 8, total: 12, rate: 67, description: '知觉辨别' }],
    strengths: ['图形辨识好'], weaknesses: ['系列推理弱'], recommendations: ['多做拼图'], trainingFocus: '推理训练',
  })
  assertCommon('CRT', p)
  const headings = p.sections.map((s) => s.heading)
  for (const h of ['评估结果总览', '结果解释', '五组答对情况（SPM A–E）', '重要提示']) {
    assert.ok(headings.includes(h), `CRT 缺段「${h}」`)
  }
})

test('buildFineMotorWordPayload：总体解读占位符已替换（学生姓名）', () => {
  const p = builders.buildFineMotorWordPayload({
    studentName: '小明', gender: '女', assessmentDate: '2026-09-10', ageText: '4岁2个月',
    totalScore: 50, totalMaxScore: 84, masteryPercent: 60, overallTitle: '发展萌芽',
    // 模拟配置原文含占位符（导出方负责替换为姓名；builder 层再兜底校验）
    overallSummary: '[儿童姓名]的精细动作整体水平略微落后于同龄预期。',
    overallAdvice: '建议引入专业支持。',
    domainRows: [{ name: '手部抓握与力量', rawScore: 8, maxScore: 12, masteryPercent: 67, statusLabel: '发展萌芽', title: '抓握过渡', summary: '[儿童姓名]抓握过渡中。', expertAdvice: '多做夹取练习' }],
    iepTargets: [{ title: '镊子夹豆', dimensionName: '手指灵活性', priorityLabel: '优先突破（萌发）', iepGoal: '连续夹起 5 颗豆', expertAdvice: '每日练习' }],
  })
  assertCommon('FineMotor', p)
  const headings = p.sections.map((s) => s.heading)
  for (const h of ['总体发展水平', '各维度表现', 'IEP 目标建议（萌发与未掌握项，需教师确认后纳入正式 IEP）']) {
    assert.ok(headings.includes(h), `FineMotor 缺段「${h}」`)
  }
})

test('buildTgmd3WordPayload：预警带级别 + 保存明细含器材与指导语', () => {
  const p = builders.buildTgmd3WordPayload({
    studentName: '测试儿童', gender: '男', assessmentDate: '2026/9/10', ageText: '5岁0个月',
    totalScore: 46, level: '发展中', overallTitle: '稳步成长期', overallSummary: '动作发展中。', overallAdvice: ['拆解动作'],
    domainRows: [{ name: '位移技能', rawScore: 20, maxScore: 46, percentage: 43.5, normLabel: '低于常模', level: '需关注' }],
    domainFeedback: [{ title: '位移技能', label: '需节奏辅助', content: '节奏感缺失。', advice: '用节拍器' }],
    iepTargets: [{ itemCode: 'L1', title: '单脚跳', dimensionName: '位移技能', priorityLabel: '优先突破', rationale: '得分率低', advice: '分解练习' }],
    flags: [{ title: 'DCD 预警', severityLabel: '高风险', content: '协调障碍信号。', advice: '转介 OT' }],
    detailRows: [{ itemCode: 'L1', dimensionName: '位移技能', title: '单脚跳', scoreText: '1 / 2', equipment: '标志桶', guidance: '按口令完成' }],
  })
  assertCommon('TGMD-3', p)
  const flagHead = p.sections.find((s) => s.heading?.startsWith('预警提示'))
  assert.ok(flagHead.heading.includes('高风险'), 'TGMD-3 预警标题须含级别')
  const detail = p.sections.find((s) => s.heading === '保存明细')
  assert.deepEqual(detail.columns, ['项目', '分测验', '技能', '录入分', '器材准备', '场地路线与测试指导语'], 'TGMD-3 保存明细列须完整')
})

test('buildBriefWordPayload：草稿声明 + 性别 meta', () => {
  const p = builders.buildBriefWordPayload({
    studentName: '测试儿童', gender: '男', assessmentDate: '2026-09-10T10:00:00Z', ageMonths: 60,
    versionLabel: '学龄版 BRIEF-2', totalTScore: 62, totalRawScore: 100, level: '轻度升高',
    dimensionRows: [{ name: '抑制', rawScore: 20, tScore: 65, levelName: '临床升高' }],
  })
  assertCommon('BRIEF', p)
  assert.ok(p.meta.some((m) => m.label === '性别' && m.value === '男'), 'BRIEF meta 缺性别')
  assert.ok(p.sections.some((s) => s.heading === '重要提示' && s.paragraphs[0].includes('草稿版')), 'BRIEF 缺草稿版声明')
})

test('buildCognitiveSelfWordPayload：用时单位为秒（非毫秒）', () => {
  const p = builders.buildCognitiveSelfWordPayload({
    studentName: '测试儿童', assessmentDate: '2026-09-10T10:00:00Z', ageMonths: 48,
    totalRawScore: 12, totalQuestions: 16, accuracyPercent: 75, verdictLabel: '本次表现稳定',
    overallMedianRtSeconds: 2.4, // 毫秒值 2400 换算后的秒——若传 2400 则此断言拦截
    omittedCount: 1, anticipatoryCount: 0, practicePassed: true,
    layerRows: [{ name: '一星难度', correct: 4, total: 4, rate: 100, medianRtSeconds: 2 }],
    errorRows: [{ label: '颜色', errors: 2, opportunities: 5, note: '选择了不同颜色的选项' }],
  })
  assertCommon('CognitiveSelf', p)
  const overview = p.sections.find((s) => s.heading?.startsWith('总体表现'))
  const rtRow = overview.rows.find((r) => r.label === '答对平均用时')
  assert.ok(rtRow, 'CognitiveSelf 缺答对平均用时行')
  const seconds = Number(String(rtRow.value).replace(/[^0-9.]/g, ''))
  assert.ok(seconds > 0 && seconds < 60, `CognitiveSelf 用时疑似毫秒未换算: ${rtRow.value}`)
})

test('buildCpep3WordPayload（回归）：meta 并入基本信息、无重复段', () => {
  const p = builders.buildCpep3WordPayload({
    studentName: '测试儿童', gender: '男', birthday: '2021-03-15', assessmentDate: '2026-09-10T10:00:00Z',
    caAgeText: '5岁5个月', reportVersion: 'cpep3-report-v1.0', scoringNote: 'P=2', summary: 'ok',
    developmentalRows: [], maladaptiveRows: [], caregiverNote: '', strengths: [], emergingSkills: [], supportNeeds: [],
    iepPriority: [], iepSecondary: [], familyGeneralization: [], limitations: [], dynamicDisclaimer: '', ageApplicabilityWarning: '',
    detailRows: [],
  })
  assertCommon('CPEP-3', p)
  assert.ok(p.meta.length >= 6, 'CPEP-3 meta 应并入性别/出生日期/CA/版本/口径')
})

test('buildCnbsr2016WordPayload（回归）：干预段仅常模内、超龄含常模说明', () => {
  const base = {
    studentName: '测试儿童', gender: '女', assessmentDate: '2026-09-10T10:00:00Z', ageMonths: 30,
    ageBracketLabel: '24-35月龄', supportedAgeRangeText: '24-83月龄',
    domainRows: [{ name: '大运动', mentalAge: '28', dq: '93', level: '发育正常', passedCount: 10, failedCount: 2, manualFailedCount: 1, autoFilledFailedCount: 1, content: '良好', advice: [] }],
    overallSummary: '发育正常', overallStrengths: '优势', overallSuggestions: '保持', expertClinical: [],
    interventions: [{ domainName: '大运动', dqStatusLabel: '临界', short: '加强训练', long: '', freq: '每周 3 次', methods: ['平衡木'], home: ['户外活动'] }],
    overallConclusionLabel: '发育临界', dqStatusLabel: '发育临界', totalMentalAge: '28', dq: '93',
    manualIepTargets: [], autoFilledFailedItems: [],
  }
  const inNorm = builders.buildCnbsr2016WordPayload({ ...base, isAgeSupported: true })
  assertCommon('CNBSR', inNorm)
  assert.ok(inNorm.sections.some((s) => s.heading?.startsWith('重点干预建议：大运动')), 'CNBSR 常模内缺干预段')

  const overAge = builders.buildCnbsr2016WordPayload({ ...base, isAgeSupported: false, ageMonths: 90 })
  assert.ok(!overAge.sections.some((s) => s.heading?.startsWith('重点干预建议')), 'CNBSR 超龄不应有干预段')
  assert.ok(overAge.sections.some((s) => s.heading === '常模范围说明'), 'CNBSR 超龄缺常模说明')
})
