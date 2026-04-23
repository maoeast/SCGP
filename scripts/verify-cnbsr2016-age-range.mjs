import path from 'node:path'
import { createJiti } from 'jiti'

const rootDir = process.cwd()
const srcDir = path.join(rootDir, 'src').replace(/\\/g, '/')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@/database/api': path.join(rootDir, 'scripts/stubs/cnbsr2016-database-api-stub.mjs'),
    '@/': `${srcDir}/`,
    '@': srcDir,
  },
})

const { Cnbsr2016Driver } = await jiti.import(path.join(rootDir, 'src/strategies/assessment/Cnbsr2016Driver.ts'))
const {
  CNBSR2016_SUPPORTED_AGE_RANGE,
  isCnbsr2016AgeSupported,
} = await jiti.import(path.join(rootDir, 'src/config/cnbsr2016-thresholds.ts'))

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function createStudentContext(ageInMonths) {
  return {
    id: 1,
    name: '验证学生',
    gender: '男',
    birthday: '2010-01-01',
    ageInMonths,
  }
}

function buildAllPassAnswers(questions) {
  const now = Date.now()
  return Object.fromEntries(
    questions.map((question, index) => [
      String(question.id),
      {
        questionId: question.id,
        value: 1,
        score: 1,
        timestamp: now + index,
        responseTime: 0,
      },
    ]),
  )
}

const driver = new Cnbsr2016Driver()
const supportedContext = createStudentContext(CNBSR2016_SUPPORTED_AGE_RANGE.maxMonths)
const supportedQuestions = driver.getQuestions(supportedContext)
const allPassAnswers = buildAllPassAnswers(supportedQuestions)
const supportedResult = driver.calculateScore(allPassAnswers, supportedContext)

assert(driver.ageRange.max === CNBSR2016_SUPPORTED_AGE_RANGE.maxMonths, 'driver.ageRange.max 应收口到 84 月')
assert(supportedQuestions.length === 261, '支持题目数应保留 261 题')
assert(
  supportedQuestions.every((question) => Number(question.metadata?.age_group_months || 0) <= CNBSR2016_SUPPORTED_AGE_RANGE.maxMonths),
  '题目列表不应包含 84 月以上题项',
)
assert(supportedResult.extraData?.dq === 100, '84 月全通过时总 DQ 应为 100')
assert(supportedResult.levelCode === 'normal', '84 月全通过时结论应处于正常范围')
assert(isCnbsr2016AgeSupported(84) === true, '84 月应仍在支持范围内')
assert(isCnbsr2016AgeSupported(181) === false, '181 月应被判定为超出适用范围')

let unsupportedError = null
try {
  driver.calculateScore(allPassAnswers, createStudentContext(181))
} catch (error) {
  unsupportedError = error
}

assert(unsupportedError instanceof Error, '181 月 calculateScore 应显式失败')
assert(
  unsupportedError.message.includes('0-7岁') && unsupportedError.message.includes('84个月'),
  '181 月失败信息应明确说明支持年龄范围',
)

console.log('[verify-cnbsr2016-age-range] passed')
