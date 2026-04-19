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

const OFFICIAL_TOTAL_ITEMS = 261
const OFFICIAL_DOMAIN_DEFINITIONS = [
  { code: 'gm', label: '大运动' },
  { code: 'fm', label: '精细动作' },
  { code: 'ad', label: '适应能力' },
  { code: 'la', label: '语言' },
  { code: 'sb', label: '社会行为' },
]
const OFFICIAL_DOMAIN_CODES = OFFICIAL_DOMAIN_DEFINITIONS.map((item) => item.code)
const OFFICIAL_MONTH_GROUPS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
  15, 18, 21, 24, 27, 30, 33, 36,
  42, 48, 54, 60, 66, 72, 78, 84,
]
const OFFICIAL_ALLOWED_SCORE_WEIGHTS = [0.5, 1, 1.5, 3, 6]
const ALLOWED_SOURCE_STATUSES = ['digitized', 'verified']

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
  return reportCheck('total-items', count === OFFICIAL_TOTAL_ITEMS, [
    `count=${count}`,
    `expected=${OFFICIAL_TOTAL_ITEMS}`,
  ])
}

function verifyIdentifiers() {
  const duplicateIds = []
  const duplicateItemCodes = []
  const idSet = new Set()
  const itemCodeSet = new Set()
  const sequenceMismatches = []

  for (const [index, item] of CNBSR2016_QUESTIONS.entries()) {
    const expectedId = index + 1
    const expectedItemCode = `cnbsr2016_${String(expectedId).padStart(3, '0')}`

    if (idSet.has(item.id)) {
      duplicateIds.push(item.id)
    }
    if (itemCodeSet.has(item.itemCode)) {
      duplicateItemCodes.push(item.itemCode)
    }

    idSet.add(item.id)
    itemCodeSet.add(item.itemCode)

    if (item.id !== expectedId || item.itemCode !== expectedItemCode) {
      sequenceMismatches.push(
        `${expectedId}:actual-id=${item.id},actual-code=${item.itemCode}`,
      )
    }
  }

  const passed =
    duplicateIds.length === 0 &&
    duplicateItemCodes.length === 0 &&
    sequenceMismatches.length === 0

  return reportCheck(
    'identifiers',
    passed,
    passed
      ? [`range=1..${CNBSR2016_QUESTIONS.length}`]
      : [
          `duplicate-ids=${duplicateIds.slice(0, 5).join(',') || 'none'}`,
          `duplicate-codes=${duplicateItemCodes.slice(0, 5).join(',') || 'none'}`,
          `mismatches=${sequenceMismatches.slice(0, 5).join(';') || 'none'}`,
        ],
  )
}

function verifyDomains() {
  const allowedDomainCodes = new Set(OFFICIAL_DOMAIN_CODES)
  const expectedDomainLabelMap = new Map(
    OFFICIAL_DOMAIN_DEFINITIONS.map((item) => [item.code, item.label]),
  )
  const definitionsPass =
    JSON.stringify(CNBSR2016_DOMAIN_DEFINITIONS) === JSON.stringify(OFFICIAL_DOMAIN_DEFINITIONS)
  const invalidQuestionDomains = CNBSR2016_QUESTIONS.filter(
    (item) => !allowedDomainCodes.has(item.domain),
  )
  const invalidQuestionDomainNames = CNBSR2016_QUESTIONS.filter(
    (item) => expectedDomainLabelMap.get(item.domain) !== item.domainName,
  )

  const passed =
    definitionsPass &&
    invalidQuestionDomains.length === 0 &&
    invalidQuestionDomainNames.length === 0

  return reportCheck(
    'domains',
    passed,
    passed
      ? [`definitions=${OFFICIAL_DOMAIN_DEFINITIONS.length}`, `questions=${CNBSR2016_QUESTIONS.length}`]
      : [
          `definitions=${definitionsPass ? 'ok' : 'drifted'}`,
          `invalid-question-count=${invalidQuestionDomains.length}`,
          `invalid-question-labels=${invalidQuestionDomainNames
            .slice(0, 5)
            .map((item) => `${item.itemCode}:${item.domainName}`)
            .join(',') || 'none'}`,
        ],
  )
}

function verifyMonthGroups() {
  const allowedMonthGroups = new Set(OFFICIAL_MONTH_GROUPS)
  const invalidQuestions = CNBSR2016_QUESTIONS.filter(
    (item) => !allowedMonthGroups.has(item.ageGroupMonths),
  )
  const observedMonthGroups = new Set(CNBSR2016_QUESTIONS.map((item) => item.ageGroupMonths))
  const missingMonthGroups = OFFICIAL_MONTH_GROUPS.filter((monthGroup) => !observedMonthGroups.has(monthGroup))

  return reportCheck(
    'month-groups',
    invalidQuestions.length === 0 && missingMonthGroups.length === 0,
    invalidQuestions.length === 0 && missingMonthGroups.length === 0
      ? [`questions=${CNBSR2016_QUESTIONS.length}`, `groups=${OFFICIAL_MONTH_GROUPS.length}`]
      : invalidQuestions
          .slice(0, 5)
          .map((item) => `${item.itemCode}:${item.ageGroupMonths}`)
          .concat(
            missingMonthGroups.length > 0
              ? [`missing=${missingMonthGroups.slice(0, 5).join(',')}`]
              : [],
          ),
  )
}

function verifyScoreWeights() {
  const allowedWeights = new Set(OFFICIAL_ALLOWED_SCORE_WEIGHTS)
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

  const missingGroups = []
  for (const domainCode of OFFICIAL_DOMAIN_CODES) {
    for (const monthGroup of OFFICIAL_MONTH_GROUPS) {
      const groupKey = `${domainCode}:${monthGroup}`
      if (!groupedItems.has(groupKey)) {
        missingGroups.push(groupKey)
      }
    }
  }

  const passed =
    invalidAllowedWeights.length === 0 &&
    mismatches.length === 0 &&
    missingGroups.length === 0
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
          `missing-groups=${missingGroups.slice(0, 5).join(',') || 'none'}`,
        ],
  )
}

function verifySourceTraceability() {
  const allowedSourceStatuses = new Set(ALLOWED_SOURCE_STATUSES)
  const invalidStatuses = CNBSR2016_QUESTIONS.filter(
    (item) => !allowedSourceStatuses.has(item.sourceStatus),
  )
  const missingNotes = CNBSR2016_QUESTIONS.filter(
    (item) => typeof item.sourceNotes !== 'string' || item.sourceNotes.trim().length === 0,
  )
  const invalidPages = CNBSR2016_QUESTIONS.filter(
    (item) => !Number.isInteger(item.sourcePage) || item.sourcePage < 1,
  )
  const invalidSourceOrders = CNBSR2016_QUESTIONS.filter(
    (item) => !Number.isInteger(item.sourceOrder) || item.sourceOrder < 1,
  )

  const sourceOrderCounts = new Map()
  for (const item of CNBSR2016_QUESTIONS) {
    sourceOrderCounts.set(item.sourceOrder, (sourceOrderCounts.get(item.sourceOrder) || 0) + 1)
  }
  const duplicateSourceOrders = Array.from(sourceOrderCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([sourceOrder]) => sourceOrder)
  const missingSourceOrders = Array.from(
    { length: OFFICIAL_TOTAL_ITEMS },
    (_, index) => index + 1,
  ).filter((sourceOrder) => !sourceOrderCounts.has(sourceOrder))
  const statusCounts = ALLOWED_SOURCE_STATUSES.map(
    (status) => `${status}=${CNBSR2016_QUESTIONS.filter((item) => item.sourceStatus === status).length}`,
  )

  const passed =
    invalidStatuses.length === 0 &&
    missingNotes.length === 0 &&
    invalidPages.length === 0 &&
    invalidSourceOrders.length === 0 &&
    duplicateSourceOrders.length === 0 &&
    missingSourceOrders.length === 0

  return reportCheck(
    'source-traceability',
    passed,
    passed
      ? statusCounts
      : [
          `invalid-statuses=${invalidStatuses
            .slice(0, 5)
            .map((item) => `${item.itemCode}:${item.sourceStatus}`)
            .join(',') || 'none'}`,
          `missing-notes=${missingNotes
            .slice(0, 5)
            .map((item) => item.itemCode)
            .join(',') || 'none'}`,
          `invalid-pages=${invalidPages
            .slice(0, 5)
            .map((item) => `${item.itemCode}:${item.sourcePage}`)
            .join(',') || 'none'}`,
          `invalid-orders=${invalidSourceOrders
            .slice(0, 5)
            .map((item) => `${item.itemCode}:${item.sourceOrder}`)
            .join(',') || 'none'}`,
          `duplicate-orders=${duplicateSourceOrders.slice(0, 5).join(',') || 'none'}`,
          `missing-orders=${missingSourceOrders.slice(0, 5).join(',') || 'none'}`,
        ],
  )
}

const checks = [
  verifyTotalItems(),
  verifyIdentifiers(),
  verifyDomains(),
  verifyMonthGroups(),
  verifyScoreWeights(),
  verifySourceTraceability(),
]

if (checks.some((passed) => !passed)) {
  process.exit(1)
}
