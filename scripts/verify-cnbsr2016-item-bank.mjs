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
  CNBSR2016_DOMAIN_DEFINITIONS,
  CNBSR2016_QUESTIONS,
} = jiti('../src/database/cnbsr2016-questions.ts')
const {
  CNBSR2016_ALLOWED_SCORE_WEIGHTS,
  CNBSR2016_DOMAIN_CODES,
  CNBSR2016_MONTH_GROUPS,
} = jiti('../src/types/cnbsr2016.ts')

const OFFICIAL_TOTAL_ITEMS = 261

function formatDetails(details) {
  return details.length > 0 ? ` ${details.join(' | ')}` : ''
}

function reportCheck(name, passed, details = []) {
  const prefix = passed ? 'PASS' : 'FAIL'
  console.log(`${prefix} ${name}${formatDetails(details)}`)
  return passed
}

function resolveExpectedGroupWeight(ageGroupMonths, itemCount) {
  if (itemCount !== 1 && itemCount !== 2) {
    return null
  }

  let groupWeight = null

  if (ageGroupMonths >= 1 && ageGroupMonths <= 12) {
    groupWeight = 1
  } else if (ageGroupMonths >= 15 && ageGroupMonths <= 36) {
    groupWeight = 3
  } else if (ageGroupMonths >= 42 && ageGroupMonths <= 84) {
    groupWeight = 6
  }

  if (groupWeight === null) {
    return null
  }

  return groupWeight / itemCount
}

function verifyTotalItems() {
  const count = CNBSR2016_QUESTIONS.length
  const passed = count === 0 || count === OFFICIAL_TOTAL_ITEMS
  const details = [count === 0 ? 'mode=stub' : 'mode=full', `count=${count}`]
  if (count > 0) {
    details.push(`expected=${OFFICIAL_TOTAL_ITEMS}`)
  }
  return reportCheck('total-items', passed, details)
}

function verifyDomains() {
  const allowedDomainCodes = new Set(CNBSR2016_DOMAIN_CODES)
  const definitionCodes = CNBSR2016_DOMAIN_DEFINITIONS.map((item) => item.code)
  const invalidDefinitions = definitionCodes.filter((code) => !allowedDomainCodes.has(code))
  const duplicateDefinitions = definitionCodes.filter(
    (code, index) => definitionCodes.indexOf(code) !== index,
  )
  const invalidQuestionDomains = CNBSR2016_QUESTIONS.filter(
    (item) => !allowedDomainCodes.has(item.domain),
  )

  const passed =
    invalidDefinitions.length === 0 &&
    duplicateDefinitions.length === 0 &&
    definitionCodes.length === CNBSR2016_DOMAIN_CODES.length &&
    invalidQuestionDomains.length === 0

  return reportCheck(
    'domains',
    passed,
    passed
      ? [`definitions=${definitionCodes.length}`, `questions=${CNBSR2016_QUESTIONS.length}`]
      : [
          `invalid-definitions=${invalidDefinitions.join(',') || 'none'}`,
          `duplicate-definitions=${duplicateDefinitions.join(',') || 'none'}`,
          `invalid-question-count=${invalidQuestionDomains.length}`,
        ],
  )
}

function verifyMonthGroups() {
  const allowedMonthGroups = new Set(CNBSR2016_MONTH_GROUPS)
  const invalidQuestions = CNBSR2016_QUESTIONS.filter(
    (item) => !allowedMonthGroups.has(item.ageGroupMonths),
  )

  return reportCheck(
    'month-groups',
    invalidQuestions.length === 0,
    invalidQuestions.length === 0
      ? [`questions=${CNBSR2016_QUESTIONS.length}`]
      : invalidQuestions
          .slice(0, 5)
          .map((item) => `${item.itemCode}:${item.ageGroupMonths}`),
  )
}

function verifyScoreWeights() {
  const allowedWeights = new Set(CNBSR2016_ALLOWED_SCORE_WEIGHTS)
  const invalidAllowedWeights = CNBSR2016_QUESTIONS.filter(
    (item) => !allowedWeights.has(item.scoreWeight),
  )

  const groupedItems = new Map()
  for (const item of CNBSR2016_QUESTIONS) {
    const groupKey = `${item.domain}:${item.ageGroupMonths}`
    const existing = groupedItems.get(groupKey) || []
    existing.push(item)
    groupedItems.set(groupKey, existing)
  }

  const mismatches = []
  for (const [groupKey, items] of groupedItems.entries()) {
    const expectedWeight = resolveExpectedGroupWeight(items[0].ageGroupMonths, items.length)
    if (expectedWeight === null) {
      mismatches.push(`${groupKey}:item-count=${items.length}`)
      continue
    }

    const invalidItems = items.filter((item) => item.scoreWeight !== expectedWeight)
    if (invalidItems.length > 0) {
      mismatches.push(
        `${groupKey}:expected=${expectedWeight},actual=${invalidItems
          .map((item) => item.scoreWeight)
          .join(',')}`,
      )
    }
  }

  const passed = invalidAllowedWeights.length === 0 && mismatches.length === 0
  return reportCheck(
    'score-weights',
    passed,
    passed
      ? [`questions=${CNBSR2016_QUESTIONS.length}`, `groups=${groupedItems.size}`]
      : [
          `invalid-weights=${invalidAllowedWeights
            .slice(0, 5)
            .map((item) => `${item.itemCode}:${item.scoreWeight}`)
            .join(',') || 'none'}`,
          `mismatches=${mismatches.slice(0, 5).join(';') || 'none'}`,
        ],
  )
}

const checks = [
  verifyTotalItems(),
  verifyDomains(),
  verifyMonthGroups(),
  verifyScoreWeights(),
]

if (checks.some((passed) => !passed)) {
  process.exit(1)
}
