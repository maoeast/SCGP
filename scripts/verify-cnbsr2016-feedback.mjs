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

const OFFICIAL_AGE_BRACKETS = [
  { code: 'a1', label: '0~12月', minMonths: 0, maxMonths: 12 },
  { code: 'a2', label: '13~24月', minMonths: 13, maxMonths: 24 },
  { code: 'a3', label: '25~36月', minMonths: 25, maxMonths: 36 },
  { code: 'a4', label: '37~72月', minMonths: 37, maxMonths: 72 },
]
const OFFICIAL_AGE_BRACKET_CODES = OFFICIAL_AGE_BRACKETS.map((item) => item.code)
const OFFICIAL_DOMAIN_CODES = ['gm', 'fm', 'ad', 'la', 'sb']
const OFFICIAL_DQ_STATUS_CODES = [
  'excellent',
  'good',
  'normal',
  'borderline',
  'delayed',
]
const OFFICIAL_INTERVENTION_STATUS_CODES = ['borderline', 'delayed']
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
const OFFICIAL_SEVERITY_BY_STATUS = {
  excellent: 'success',
  good: 'success',
  normal: 'info',
  borderline: 'warning',
  delayed: 'danger',
}
const SORTED_OFFICIAL_DQ_STATUS_CODES = [...OFFICIAL_DQ_STATUS_CODES].sort()
const SORTED_OFFICIAL_INTERVENTION_STATUS_CODES = [...OFFICIAL_INTERVENTION_STATUS_CODES].sort()

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isNonEmptyStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => isNonEmptyString(item))
}

function isNonEmptyAdviceArray(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => isNonEmptyString(item?.tag) && isNonEmptyString(item?.text))
  )
}

function sameMembers(actualValues, expectedValues) {
  return actualValues.length === expectedValues.length &&
    actualValues.every((value, index) => value === expectedValues[index])
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

  for (const ageBracket of OFFICIAL_AGE_BRACKET_CODES) {
    const bracketRules = overallRules[ageBracket] || {}
    for (const status of OFFICIAL_DQ_STATUS_CODES) {
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
      ? [`bands=${CNBSR2016_DQ_BANDS.length}`, `overall-rules=${OFFICIAL_AGE_BRACKET_CODES.length * OFFICIAL_DQ_STATUS_CODES.length}`]
      : [
          `threshold-bands=${thresholdBandsPass ? 'ok' : 'drifted'}`,
          `config=${invalidOverallRules.slice(0, 5).join(',') || 'missing'}`,
        ],
  )
}

function verifyAgeBrackets() {
  const thresholdPass = JSON.stringify(CNBSR2016_AGE_BRACKETS) === JSON.stringify(OFFICIAL_AGE_BRACKETS)
  const thresholdCodes = CNBSR2016_AGE_BRACKETS.map((item) => item.code)
  const overallRuleCodes = Object.keys(SCGP_CNBS_R2016_Feedback_Config?.overall_rules || {})
  const missingThresholdCodes = OFFICIAL_AGE_BRACKET_CODES.filter(
    (code) => !thresholdCodes.includes(code),
  )
  const missingOverallRuleCodes = OFFICIAL_AGE_BRACKET_CODES.filter(
    (code) => !overallRuleCodes.includes(code),
  )

  return reportCheck(
    'age-brackets',
    thresholdPass && missingThresholdCodes.length === 0 && missingOverallRuleCodes.length === 0,
    thresholdPass && missingThresholdCodes.length === 0 && missingOverallRuleCodes.length === 0
      ? [`thresholds=${thresholdCodes.join(',')}`, `feedback=${overallRuleCodes.join(',')}`]
      : [
          `thresholds=${thresholdPass ? 'ok' : 'drifted'}`,
          `threshold-missing=${missingThresholdCodes.join(',') || 'none'}`,
          `feedback-missing=${missingOverallRuleCodes.join(',') || 'none'}`,
        ],
  )
}

function verifyOverallRules() {
  const overallRules = SCGP_CNBS_R2016_Feedback_Config?.overall_rules || {}
  const invalidEntries = []
  let entryCount = 0

  for (const ageBracket of OFFICIAL_AGE_BRACKET_CODES) {
    const bracketRules = overallRules[ageBracket] || {}
    for (const status of OFFICIAL_DQ_STATUS_CODES) {
      const entry = bracketRules[status]
      if (
        !isNonEmptyString(entry?.label) ||
        !isNonEmptyString(entry?.summary) ||
        !isNonEmptyString(entry?.strengths) ||
        !isNonEmptyString(entry?.suggestions) ||
        entry?.severity !== OFFICIAL_SEVERITY_BY_STATUS[status]
      ) {
        invalidEntries.push(`${ageBracket}.${status}`)
        continue
      }
      entryCount += 1
    }
  }

  const expectedCount = OFFICIAL_AGE_BRACKET_CODES.length * OFFICIAL_DQ_STATUS_CODES.length
  const passed = invalidEntries.length === 0 && entryCount === expectedCount

  return reportCheck(
    'overall-content',
    passed,
    passed
      ? [`entries=${entryCount}`]
      : [
          `invalid=${invalidEntries.slice(0, 5).join(',') || 'none'}`,
          `entries=${entryCount}`,
          `expected=${expectedCount}`,
        ],
  )
}

function verifyDomainFeedback() {
  const dimensions = SCGP_CNBS_R2016_Feedback_Config?.dimensions || {}
  const missingDomains = OFFICIAL_DOMAIN_CODES.filter((code) => !dimensions[code])
  const coverageGaps = []
  let entryCount = 0

  for (const domainCode of OFFICIAL_DOMAIN_CODES) {
    const domainConfig = dimensions[domainCode] || {}
    for (const ageBracket of OFFICIAL_AGE_BRACKET_CODES) {
      const ageBracketConfig = domainConfig[ageBracket] || {}
      for (const status of OFFICIAL_DQ_STATUS_CODES) {
        const entry = ageBracketConfig[status]
        if (
          !isNonEmptyString(entry?.headline) ||
          !isNonEmptyString(entry?.content) ||
          !isNonEmptyAdviceArray(entry?.advice)
        ) {
          coverageGaps.push(`${domainCode}.${ageBracket}.${status}`)
          continue
        }
        entryCount += 1
      }
    }
  }

  const expectedCount =
    OFFICIAL_DOMAIN_CODES.length * OFFICIAL_AGE_BRACKET_CODES.length * OFFICIAL_DQ_STATUS_CODES.length

  return reportCheck(
    'domain-feedback',
    missingDomains.length === 0 && coverageGaps.length === 0 && entryCount === expectedCount,
    missingDomains.length === 0 && coverageGaps.length === 0 && entryCount === expectedCount
      ? [`domains=${OFFICIAL_DOMAIN_CODES.length}`, `entries=${entryCount}`]
      : [
          `missing-domains=${missingDomains.join(',') || 'none'}`,
          `coverage-gaps=${coverageGaps.slice(0, 5).join(',') || 'none'}`,
          `entries=${entryCount}`,
          `expected=${expectedCount}`,
        ],
  )
}

function verifyIepInterventions() {
  const interventions = SCGP_CNBS_R2016_Feedback_Config?.iep_interventions || {}
  const missingDomains = OFFICIAL_DOMAIN_CODES.filter((code) => !interventions[code])
  const coverageGaps = []
  const invalidStatusSets = []
  let entryCount = 0

  for (const domainCode of OFFICIAL_DOMAIN_CODES) {
    const domainConfig = interventions[domainCode] || {}
    for (const ageBracket of OFFICIAL_AGE_BRACKET_CODES) {
      const ageBracketConfig = domainConfig[ageBracket] || {}
      const statuses = Object.keys(ageBracketConfig).sort()
      if (!sameMembers(statuses, SORTED_OFFICIAL_INTERVENTION_STATUS_CODES)) {
        invalidStatusSets.push(`${domainCode}.${ageBracket}=${statuses.join(',') || 'none'}`)
      }

      for (const status of OFFICIAL_INTERVENTION_STATUS_CODES) {
        const entry = ageBracketConfig[status]
        if (
          !isNonEmptyString(entry?.short) ||
          !isNonEmptyString(entry?.long) ||
          !isNonEmptyString(entry?.freq) ||
          !isNonEmptyStringArray(entry?.methods) ||
          !isNonEmptyStringArray(entry?.home)
        ) {
          coverageGaps.push(`${domainCode}.${ageBracket}.${status}`)
          continue
        }
        entryCount += 1
      }
    }
  }

  const expectedCount =
    OFFICIAL_DOMAIN_CODES.length *
    OFFICIAL_AGE_BRACKET_CODES.length *
    OFFICIAL_INTERVENTION_STATUS_CODES.length
  const passed =
    missingDomains.length === 0 &&
    coverageGaps.length === 0 &&
    invalidStatusSets.length === 0 &&
    entryCount === expectedCount

  return reportCheck(
    'iep-interventions',
    passed,
    passed
      ? [`domains=${OFFICIAL_DOMAIN_CODES.length}`, `entries=${entryCount}`]
      : [
          `missing-domains=${missingDomains.join(',') || 'none'}`,
          `invalid-statuses=${invalidStatusSets.slice(0, 5).join(',') || 'none'}`,
          `coverage-gaps=${coverageGaps.slice(0, 5).join(',') || 'none'}`,
          `entries=${entryCount}`,
          `expected=${expectedCount}`,
        ],
  )
}

function verifyExpertClinical() {
  const expertClinical = SCGP_CNBS_R2016_Feedback_Config?.expert_clinical || {}
  const coverageGaps = []
  let entryCount = 0

  for (const ageBracket of OFFICIAL_AGE_BRACKET_CODES) {
    const ageBracketConfig = expertClinical[ageBracket] || {}
    for (const status of OFFICIAL_DQ_STATUS_CODES) {
      const entry = ageBracketConfig[status]
      if (
        !isNonEmptyString(entry?.clinical) ||
        !isNonEmptyString(entry?.risk) ||
        !isNonEmptyString(entry?.followup) ||
        !isNonEmptyString(entry?.referral)
      ) {
        coverageGaps.push(`${ageBracket}.${status}`)
        continue
      }
      entryCount += 1
    }
  }

  const expectedCount = OFFICIAL_AGE_BRACKET_CODES.length * OFFICIAL_DQ_STATUS_CODES.length
  const passed = coverageGaps.length === 0 && entryCount === expectedCount

  return reportCheck(
    'expert-clinical',
    passed,
    passed
      ? [`entries=${entryCount}`]
      : [
          `coverage-gaps=${coverageGaps.slice(0, 5).join(',') || 'none'}`,
          `entries=${entryCount}`,
          `expected=${expectedCount}`,
        ],
  )
}

function verifyCommentaryLibrary() {
  const commentaryLibrary = SCGP_CNBS_R2016_Feedback_Config?.commentary_library || {}
  const missingDomains = OFFICIAL_DOMAIN_CODES.filter((code) => !commentaryLibrary[code])
  const coverageGaps = []
  const invalidStatusSets = []
  let entryCount = 0

  for (const domainCode of OFFICIAL_DOMAIN_CODES) {
    const domainConfig = commentaryLibrary[domainCode] || {}
    const statuses = Object.keys(domainConfig).sort()
    if (!sameMembers(statuses, SORTED_OFFICIAL_DQ_STATUS_CODES)) {
      invalidStatusSets.push(`${domainCode}=${statuses.join(',') || 'none'}`)
    }

    for (const status of OFFICIAL_DQ_STATUS_CODES) {
      const entry = domainConfig[status]
      if (
        !isNonEmptyString(entry?.title) ||
        !isNonEmptyString(entry?.content) ||
        !isNonEmptyAdviceArray(entry?.advice)
      ) {
        coverageGaps.push(`${domainCode}.${status}`)
        continue
      }
      entryCount += 1
    }
  }

  const expectedCount = OFFICIAL_DOMAIN_CODES.length * OFFICIAL_DQ_STATUS_CODES.length
  const passed =
    missingDomains.length === 0 &&
    invalidStatusSets.length === 0 &&
    coverageGaps.length === 0 &&
    entryCount === expectedCount

  return reportCheck(
    'commentary-library',
    passed,
    passed
      ? [`domains=${OFFICIAL_DOMAIN_CODES.length}`, `entries=${entryCount}`]
      : [
          `missing-domains=${missingDomains.join(',') || 'none'}`,
          `invalid-statuses=${invalidStatusSets.slice(0, 5).join(',') || 'none'}`,
          `coverage-gaps=${coverageGaps.slice(0, 5).join(',') || 'none'}`,
          `entries=${entryCount}`,
          `expected=${expectedCount}`,
        ],
  )
}

const checks = [
  verifyDqThresholds(),
  verifyAgeBrackets(),
  verifyOverallRules(),
  verifyDomainFeedback(),
  verifyIepInterventions(),
  verifyExpertClinical(),
  verifyCommentaryLibrary(),
]

if (checks.some((passed) => !passed)) {
  process.exit(1)
}
