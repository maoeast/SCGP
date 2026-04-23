import type {
  Cnbsr2016AgeBracketCode,
  Cnbsr2016AgeBracketDefinition,
  Cnbsr2016DomainCode,
  Cnbsr2016DomainDefinition,
  Cnbsr2016DqBand,
  Cnbsr2016DqStatus,
} from '@/types/cnbsr2016'

export const CNBSR2016_SUPPORTED_AGE_RANGE = {
  minMonths: 0,
  maxMonths: 84,
} as const

export const CNBSR2016_SUPPORTED_AGE_RANGE_TEXT = '0-7岁（0-84个月）'

export const CNBSR2016_DOMAIN_DEFINITIONS: Cnbsr2016DomainDefinition[] = [
  { code: 'gm', label: '大运动' },
  { code: 'fm', label: '精细动作' },
  { code: 'ad', label: '适应能力' },
  { code: 'la', label: '语言' },
  { code: 'sb', label: '社会行为' },
]

export const CNBSR2016_AGE_BRACKETS: Cnbsr2016AgeBracketDefinition[] = [
  { code: 'a1', label: '0~12月', minMonths: 0, maxMonths: 12 },
  { code: 'a2', label: '13~24月', minMonths: 13, maxMonths: 24 },
  { code: 'a3', label: '25~36月', minMonths: 25, maxMonths: 36 },
  { code: 'a4', label: '37~84月', minMonths: 37, maxMonths: 84 },
]

// Runtime implementation uses a fully-covered interval model:
// >=130 excellent, [110,130) good, [80,110) normal, [70,80) borderline, <70 delayed
export const CNBSR2016_DQ_BANDS: Cnbsr2016DqBand[] = [
  { status: 'excellent', label: '优秀', minInclusive: 130 },
  { status: 'good', label: '良好', minInclusive: 110, maxInclusive: 129 },
  { status: 'normal', label: '中等', minInclusive: 80, maxInclusive: 109 },
  { status: 'borderline', label: '临界偏低', minInclusive: 70, maxInclusive: 79 },
  { status: 'delayed', label: '智力发育障碍', maxInclusive: 69 },
]

export function normalizeCnbsr2016AgeMonths(ageMonths: number): number {
  return Math.max(0, Math.floor(ageMonths))
}

export function isCnbsr2016AgeSupported(ageMonths: number): boolean {
  const normalized = normalizeCnbsr2016AgeMonths(ageMonths)
  return normalized >= CNBSR2016_SUPPORTED_AGE_RANGE.minMonths
    && normalized <= CNBSR2016_SUPPORTED_AGE_RANGE.maxMonths
}

export function isCnbsr2016QuestionSupported(ageGroupMonths: number): boolean {
  return ageGroupMonths <= CNBSR2016_SUPPORTED_AGE_RANGE.maxMonths
}

export function getCnbsr2016UnsupportedAgeMessage(ageMonths: number): string {
  const normalized = normalizeCnbsr2016AgeMonths(ageMonths)
  return `儿心量表Ⅱ标准常模仅覆盖${CNBSR2016_SUPPORTED_AGE_RANGE_TEXT}儿童，当前月龄为${normalized}个月。请优先使用 Conners 评定量表或 Achenbach 儿童行为量表（CBCL）进行测评。`
}

export function assertCnbsr2016AgeSupported(ageMonths: number): number {
  const normalized = normalizeCnbsr2016AgeMonths(ageMonths)
  if (!isCnbsr2016AgeSupported(normalized)) {
    throw new Error(getCnbsr2016UnsupportedAgeMessage(normalized))
  }

  return normalized
}

export function resolveCnbsr2016AgeBracket(ageMonths: number): Cnbsr2016AgeBracketCode | null {
  const normalized = normalizeCnbsr2016AgeMonths(ageMonths)
  const match = CNBSR2016_AGE_BRACKETS.find(
    (item) => normalized >= item.minMonths && normalized <= item.maxMonths,
  )
  return match?.code || null
}

export function resolveCnbsr2016DqStatus(dq: number): Cnbsr2016DqStatus {
  if (dq >= 130) return 'excellent'
  if (dq >= 110 && dq <= 129) return 'good'
  if (dq >= 80 && dq <= 109) return 'normal'
  if (dq >= 70 && dq <= 79) return 'borderline'
  return 'delayed'
}
