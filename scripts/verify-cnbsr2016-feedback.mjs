#!/usr/bin/env node

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': path.join(projectRoot, 'src'),
  },
})

const {
  CNBSR2016_AGE_BRACKETS,
  CNBSR2016_DQ_BANDS,
} = jiti('../src/config/cnbsr2016-thresholds.ts')
const {
  SCGP_CNBS_R2016_Feedback_Config,
} = jiti('../src/config/CNBSR2016FeedbackConfig.js')
const {
  CNBSR2016_AGE_BRACKET_CODES,
  CNBSR2016_DOMAIN_CODES,
  CNBSR2016_DQ_STATUS_CODES,
} = jiti('../src/types/cnbsr2016.ts')

const OFFICIAL_DQ_BANDS = [
  { status: 'excellent', label: '优秀', minInclusive: 130 },
  { status: 'good', label: '良好', minInclusive: 110, maxInclusive: 129 },
  { status: 'normal', label: '中等', minInclusive: 80, maxInclusive: 109 },
  { status: 'borderline', label: '临界偏低', minInclusive: 70, maxInclusive: 79 },
  { status: 'delayed', label: '智力发育障碍', maxInclusive: 69 },
]

const OFFICIAL_DQ_TEXT_BY_STATUS = {
  excellent: 'DQ ≥ 130',
  good: 'DQ 110~129',
  normal: 'DQ 80~109',
  borderline: 'DQ 70~79',
  delayed: 'DQ < 70',
}

function formatDetails(details) {
  return details.length > 0 ? ` ${details.join(' | ')}` : ''
}

function reportCheck(name, passed, details = []) {
  const prefix = passed ? 'PASS' : 'FAIL'
  console.log(`${prefix} ${name}${formatDetails(details)}`)
  return passed
}

function verifyDqThresholds() {
  const thresholdBandsPass = JSON.stringify(CNBSR2016_DQ_BANDS) === JSON.stringify(OFFICIAL_DQ_BANDS)
  const overallRules = SCGP_CNBS_R2016_Feedback_Config?.overall_rules || {}
  const invalidOverallRules = []

  for (const ageBracket of CNBSR2016_AGE_BRACKET_CODES) {
    const bracketRules = overallRules[ageBracket] || {}
    for (const status of CNBSR2016_DQ_STATUS_CODES) {
      const actualDqText = bracketRules[status]?.dq
      if (actualDqText !== OFFICIAL_DQ_TEXT_BY_STATUS[status]) {
        invalidOverallRules.push(`${ageBracket}.${status}=${actualDqText || 'missing'}`)
      }
    }
  }

  return reportCheck(
    'dq-thresholds',
    thresholdBandsPass && invalidOverallRules.length === 0,
    thresholdBandsPass && invalidOverallRules.length === 0
      ? [`bands=${CNBSR2016_DQ_BANDS.length}`, `overall-rules=${CNBSR2016_AGE_BRACKET_CODES.length * CNBSR2016_DQ_STATUS_CODES.length}`]
      : [
          `threshold-bands=${thresholdBandsPass ? 'ok' : 'drifted'}`,
          `config=${invalidOverallRules.slice(0, 5).join(',') || 'missing'}`,
        ],
  )
}

function verifyAgeBrackets() {
  const thresholdCodes = CNBSR2016_AGE_BRACKETS.map((item) => item.code)
  const overallRuleCodes = Object.keys(SCGP_CNBS_R2016_Feedback_Config?.overall_rules || {})
  const missingThresholdCodes = CNBSR2016_AGE_BRACKET_CODES.filter(
    (code) => !thresholdCodes.includes(code),
  )
  const missingOverallRuleCodes = CNBSR2016_AGE_BRACKET_CODES.filter(
    (code) => !overallRuleCodes.includes(code),
  )

  return reportCheck(
    'age-brackets',
    missingThresholdCodes.length === 0 && missingOverallRuleCodes.length === 0,
    missingThresholdCodes.length === 0 && missingOverallRuleCodes.length === 0
      ? [`thresholds=${thresholdCodes.join(',')}`, `feedback=${overallRuleCodes.join(',')}`]
      : [
          `threshold-missing=${missingThresholdCodes.join(',') || 'none'}`,
          `feedback-missing=${missingOverallRuleCodes.join(',') || 'none'}`,
        ],
  )
}

function verifyDomainFeedback() {
  const dimensions = SCGP_CNBS_R2016_Feedback_Config?.dimensions || {}
  const missingDomains = CNBSR2016_DOMAIN_CODES.filter((code) => !dimensions[code])
  const coverageGaps = []

  for (const domainCode of CNBSR2016_DOMAIN_CODES) {
    const domainConfig = dimensions[domainCode] || {}
    for (const ageBracket of CNBSR2016_AGE_BRACKET_CODES) {
      const ageBracketConfig = domainConfig[ageBracket] || {}
      for (const status of CNBSR2016_DQ_STATUS_CODES) {
        if (!ageBracketConfig[status]) {
          coverageGaps.push(`${domainCode}.${ageBracket}.${status}`)
        }
      }
    }
  }

  return reportCheck(
    'domain-feedback',
    missingDomains.length === 0 && coverageGaps.length === 0,
    missingDomains.length === 0 && coverageGaps.length === 0
      ? [`domains=${CNBSR2016_DOMAIN_CODES.length}`, `entries=${CNBSR2016_DOMAIN_CODES.length * CNBSR2016_AGE_BRACKET_CODES.length * CNBSR2016_DQ_STATUS_CODES.length}`]
      : [
          `missing-domains=${missingDomains.join(',') || 'none'}`,
          `coverage-gaps=${coverageGaps.slice(0, 5).join(',') || 'none'}`,
        ],
  )
}

const checks = [
  verifyDqThresholds(),
  verifyAgeBrackets(),
  verifyDomainFeedback(),
]

if (checks.some((passed) => !passed)) {
  process.exit(1)
}
