import test from 'node:test'
import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
    '@element-plus/icons-vue': `${projectRoot}/scripts/tests/fixtures/element-plus-icons-vue.mock.js`,
  },
})

function loadCatalogs() {
  return {
    assessment: jiti('../../src/features/assessment/assessment-scale-catalog.ts'),
    reports: jiti('../../src/features/assessment/report-center-catalog.ts'),
    routes: jiti('../../src/features/assessment/report-routes.ts'),
  }
}

test('report center catalog covers every assessment scale exactly once', () => {
  const { assessment, reports } = loadCatalogs()
  const scaleCodes = [...assessment.ASSESSMENT_SCALE_CODES].sort()
  const reportCodes = reports.ASSESSMENT_REPORT_CATALOG.map((item) => item.code).sort()

  assert.deepEqual(reportCodes, scaleCodes)
  assert.equal(new Set(reportCodes).size, reportCodes.length)

  for (const item of reports.ASSESSMENT_REPORT_CATALOG) {
    assert.ok(item.selectLabel.trim())
    assert.ok(item.cardLabel.trim())
    assert.ok(item.tone)
    assert.ok(item.tagType)
  }
})

test('report statistics count all cognitive draft report types', () => {
  const { reports } = loadCatalogs()
  const counts = reports.deriveAssessmentReportCounts([
    { report_type: 'brief' },
    { report_type: 'brief' },
    { report_type: 'crt' },
    { report_type: 'cognitive_self' },
    { report_type: 'training' },
    { report_type: 'unknown' },
  ])

  assert.equal(counts.brief, 2)
  assert.equal(counts.crt, 1)
  assert.equal(counts.cognitive_self, 1)
  assert.equal(Object.values(counts).reduce((total, value) => total + value, 0), 4)
})

test('every assessment report type resolves to a concrete report route', () => {
  const { reports, routes } = loadCatalogs()

  for (const code of reports.ASSESSMENT_REPORT_CODES) {
    const route = routes.buildAssessmentReportRoute({
      scaleType: code,
      assessId: 42,
      studentId: 7,
    })
    const path = typeof route === 'string' ? route : route.path

    assert.notEqual(path, '/assessment', `${code} should not use the fallback route`)
    assert.match(path, /^\/assessment\//, `${code} should resolve below /assessment`)
  }

  assert.equal(
    routes.buildAssessmentReportRoute({ scaleType: 'brief', assessId: 42 }),
    '/assessment/brief/report/42',
  )
  assert.equal(
    routes.buildAssessmentReportRoute({ scaleType: 'crt', assessId: 42 }),
    '/assessment/crt/report/42',
  )
  assert.equal(
    routes.buildAssessmentReportRoute({ scaleType: 'cognitive_self', assessId: 42 }),
    '/assessment/cognitive-self/report/42',
  )
})
