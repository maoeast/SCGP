import assert from 'node:assert/strict'
import createJiti from 'jiti'

const projectRoot = '/home/DONG/Mycode/SCGP'
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
})

const {
  buildAssessmentReportRoute,
} = await jiti.import(`${projectRoot}/src/features/assessment/report-routes.ts`)

const {
  buildCnbsr2016ReportViewModel,
  getCnbsr2016DqStatusLabel,
  hydrateCnbsr2016AssessmentDetails,
} = await jiti.import(`${projectRoot}/src/features/assessment/cnbsr2016/report-model.ts`)

const {
  CNBSR2016_QUESTIONS,
} = await jiti.import(`${projectRoot}/src/database/cnbsr2016-questions.ts`)

function serializeRouteLocation(route) {
  if (typeof route === 'string') {
    return route
  }

  const url = new URL('https://scgp.local')
  url.pathname = route.path || ''
  const query = route.query || {}
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') {
      continue
    }
    url.searchParams.set(key, String(value))
  }

  const search = url.searchParams.toString()
  return `${url.pathname}${search ? `?${search}` : ''}`
}

function getQuestionIdsByDomain() {
  const domains = ['gm', 'fm', 'ad', 'la', 'sb']
  return Object.fromEntries(
    domains.map((domain) => {
      const question = CNBSR2016_QUESTIONS.find((item) => item.domain === domain)
      if (!question) {
        throw new Error(`Missing CNBS-R2016 question for domain ${domain}`)
      }
      return [domain, question.id]
    }),
  )
}

function summarizeDomainRows(domainRows) {
  return domainRows.map((row) => ({
    code: row.code,
    mentalAge: row.mentalAge,
    dq: row.dq,
    level: row.level,
    headline: row.headline,
    manualFailedCount: row.manualFailedCount,
    autoFilledFailedCount: row.autoFilledFailedCount,
  }))
}

const questionIds = getQuestionIdsByDomain()
const sampleAssessId = 20260404
const sampleStudentId = 91001

const completionRoute = buildAssessmentReportRoute({
  scaleType: 'cnbsr2016',
  assessId: sampleAssessId,
  studentId: sampleStudentId,
})

const reportCenterRoute = buildAssessmentReportRoute({
  scaleType: 'cnbsr2016',
  assessId: sampleAssessId,
  studentId: sampleStudentId,
})

const studentDetailRoute = buildAssessmentReportRoute({
  scaleType: 'cnbsr2016',
  assessId: sampleAssessId,
  studentId: sampleStudentId,
})

const serializedCompletionRoute = serializeRouteLocation(completionRoute)
const serializedReportCenterRoute = serializeRouteLocation(reportCenterRoute)
const serializedStudentDetailRoute = serializeRouteLocation(studentDetailRoute)

assert.equal(serializedCompletionRoute, `/assessment/cnbsr2016/report/${sampleAssessId}`)
assert.equal(serializedCompletionRoute, serializedReportCenterRoute)
assert.equal(serializedCompletionRoute, serializedStudentDetailRoute)

const rawDetails = [
  {
    question_id: questionIds.gm,
    dimension: 'gm',
    age_group_months: 1,
    score_weight: 0.5,
    score: 0,
    answer_time: 12,
    is_auto_filled: false,
    auto_fill_reason: null,
  },
  {
    question_id: questionIds.fm,
    dimension: 'fm',
    age_group_months: 1,
    score_weight: 0.5,
    score: 0,
    answer_time: 0,
    is_auto_filled: true,
    auto_fill_reason: 'ceiling',
  },
  {
    question_id: questionIds.ad,
    dimension: 'ad',
    age_group_months: 1,
    score_weight: 0.5,
    score: 1,
    answer_time: 10,
    is_auto_filled: false,
    auto_fill_reason: null,
  },
  {
    question_id: questionIds.la,
    dimension: 'la',
    age_group_months: 1,
    score_weight: 0.5,
    score: 0,
    answer_time: 8,
    is_auto_filled: false,
    auto_fill_reason: null,
  },
  {
    question_id: questionIds.sb,
    dimension: 'sb',
    age_group_months: 1,
    score_weight: 0.5,
    score: 0,
    answer_time: 0,
    is_auto_filled: true,
    auto_fill_reason: 'basal',
  },
]

const hydratedDetails = hydrateCnbsr2016AssessmentDetails(rawDetails)

const sampleAssessment = {
  id: sampleAssessId,
  student_id: sampleStudentId,
  student_name: 'Phase20 QA Child',
  student_gender: '男',
  age_months: 24,
  total_mental_age: 18,
  dq: 75,
  dq_status: 'borderline',
  age_bracket: 'a2',
  level: getCnbsr2016DqStatusLabel('borderline'),
  level_code: 'borderline',
  domain_results: [
    {
      code: 'gm',
      name: '大运动',
      itemCount: 10,
      passedCount: 8,
      failedCount: 2,
      autoFilledPassedCount: 0,
      autoFilledFailedCount: 0,
      mentalAge: 21,
      maxMentalAge: 24,
      achievementRate: 87.5,
      dq: 88,
      dqStatus: 'normal',
      level: getCnbsr2016DqStatusLabel('normal'),
    },
    {
      code: 'fm',
      name: '精细动作',
      itemCount: 10,
      passedCount: 5,
      failedCount: 5,
      autoFilledPassedCount: 0,
      autoFilledFailedCount: 1,
      mentalAge: 16,
      maxMentalAge: 24,
      achievementRate: 66.7,
      dq: 65,
      dqStatus: 'delayed',
      level: getCnbsr2016DqStatusLabel('delayed'),
    },
    {
      code: 'ad',
      name: '适应能力',
      itemCount: 10,
      passedCount: 9,
      failedCount: 1,
      autoFilledPassedCount: 0,
      autoFilledFailedCount: 0,
      mentalAge: 27,
      maxMentalAge: 24,
      achievementRate: 112.5,
      dq: 112,
      dqStatus: 'good',
      level: getCnbsr2016DqStatusLabel('good'),
    },
    {
      code: 'la',
      name: '语言',
      itemCount: 10,
      passedCount: 6,
      failedCount: 4,
      autoFilledPassedCount: 0,
      autoFilledFailedCount: 0,
      mentalAge: 19,
      maxMentalAge: 24,
      achievementRate: 79.2,
      dq: 78,
      dqStatus: 'borderline',
      level: getCnbsr2016DqStatusLabel('borderline'),
    },
    {
      code: 'sb',
      name: '社会行为',
      itemCount: 10,
      passedCount: 7,
      failedCount: 3,
      autoFilledPassedCount: 0,
      autoFilledFailedCount: 1,
      mentalAge: 20,
      maxMentalAge: 24,
      achievementRate: 83.3,
      dq: 82,
      dqStatus: 'normal',
      level: getCnbsr2016DqStatusLabel('normal'),
    },
  ],
  domain_feedback: [],
  iep_targets: [],
  iep_interventions: [],
  overall_rule: null,
  expert_clinical: null,
}

const viewModel = buildCnbsr2016ReportViewModel({
  assessment: sampleAssessment,
  details: hydratedDetails,
})

assert.equal(sampleAssessment.age_months, 24)
assert.equal(sampleAssessment.total_mental_age, 18)
assert.equal(sampleAssessment.dq, 75)
assert.equal(viewModel.ageBracketLabel, '13~24月')
assert.equal(viewModel.dqBandRangeText, '[70, 80)')
assert.equal(viewModel.domainRows.length, 5)
assert.ok(viewModel.overallRule?.summary)
assert.ok(viewModel.expertClinical?.clinical)

const fineMotorRow = viewModel.domainRows.find((row) => row.code === 'fm')
assert.ok(fineMotorRow)
assert.equal(fineMotorRow.mentalAge, 16)
assert.equal(fineMotorRow.dq, 65)
assert.equal(fineMotorRow.level, '智力发育障碍')
assert.equal(fineMotorRow.autoFilledFailedCount, 1)
assert.ok(fineMotorRow.headline)
assert.ok(fineMotorRow.content)

const languageRow = viewModel.domainRows.find((row) => row.code === 'la')
assert.ok(languageRow)
assert.equal(languageRow.mentalAge, 19)
assert.equal(languageRow.dq, 78)
assert.equal(languageRow.level, '临界偏低')
assert.equal(languageRow.manualFailedCount, 1)
assert.ok(languageRow.headline)

assert.deepEqual(
  viewModel.manualIepTargets.map((item) => item.questionId),
  [questionIds.gm, questionIds.la],
)
assert.deepEqual(
  viewModel.autoFilledFailedItems.map((item) => item.questionId),
  [questionIds.fm, questionIds.sb],
)
assert.equal(
  viewModel.manualIepTargets.some((item) => viewModel.autoFilledFailedItems.some((autoItem) => autoItem.questionId === item.questionId)),
  false,
)

assert.ok(viewModel.manualIepTargets.every((item) => item.autoFillReason === null))
assert.deepEqual(
  viewModel.autoFilledFailedItems.map((item) => item.autoFillReason),
  ['ceiling', 'basal'],
)

const result = {
  routeConsistency: {
    completion: serializedCompletionRoute,
    reportCenter: serializedReportCenterRoute,
    studentDetail: serializedStudentDetailRoute,
  },
  reportSnapshot: {
    caMonths: sampleAssessment.age_months,
    totalMentalAge: sampleAssessment.total_mental_age,
    totalDq: sampleAssessment.dq,
    ageBracketLabel: viewModel.ageBracketLabel,
    dqBandRangeText: viewModel.dqBandRangeText,
    overallSummary: viewModel.overallRule?.summary,
    domainRows: summarizeDomainRows(viewModel.domainRows),
    manualIepQuestionIds: viewModel.manualIepTargets.map((item) => item.questionId),
    autoFilledFailedQuestionIds: viewModel.autoFilledFailedItems.map((item) => item.questionId),
  },
}

console.log('CNBS-R2016 Phase20 runtime verification passed.')
console.log(JSON.stringify(result, null, 2))
