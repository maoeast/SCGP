export type Cnbsr2016DomainCode = 'gm' | 'fm' | 'ad' | 'la' | 'sb'

export type Cnbsr2016AgeBracketCode = 'a1' | 'a2' | 'a3' | 'a4'

export type Cnbsr2016DqStatus =
  | 'excellent'
  | 'good'
  | 'normal'
  | 'borderline'
  | 'delayed'

export interface Cnbsr2016DomainDefinition {
  code: Cnbsr2016DomainCode
  label: string
}

export interface Cnbsr2016AgeBracketDefinition {
  code: Cnbsr2016AgeBracketCode
  label: string
  minMonths: number
  maxMonths: number
}

export interface Cnbsr2016DqBand {
  status: Cnbsr2016DqStatus
  label: string
  minExclusive?: number
  minInclusive?: number
  maxInclusive?: number
}

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
  { code: 'a4', label: '37~72月', minMonths: 37, maxMonths: 72 },
]

// Official WS/T 580—2017 DQ ranges:
// >130 excellent, 110-129 good, 80-109 normal, 70-79 borderline, <70 delayed
export const CNBSR2016_DQ_BANDS: Cnbsr2016DqBand[] = [
  { status: 'excellent', label: '优秀', minExclusive: 130 },
  { status: 'good', label: '良好', minInclusive: 110, maxInclusive: 129 },
  { status: 'normal', label: '中等', minInclusive: 80, maxInclusive: 109 },
  { status: 'borderline', label: '临界偏低', minInclusive: 70, maxInclusive: 79 },
  { status: 'delayed', label: '智力发育障碍', maxInclusive: 69 },
]

export function resolveCnbsr2016AgeBracket(ageMonths: number): Cnbsr2016AgeBracketCode {
  const normalized = Math.max(0, Math.floor(ageMonths))
  const match = CNBSR2016_AGE_BRACKETS.find(
    (item) => normalized >= item.minMonths && normalized <= item.maxMonths,
  )
  return match?.code || 'a4'
}

export function resolveCnbsr2016DqStatus(dq: number): Cnbsr2016DqStatus {
  if (dq > 130) return 'excellent'
  if (dq >= 110 && dq <= 129) return 'good'
  if (dq >= 80 && dq <= 109) return 'normal'
  if (dq >= 70 && dq <= 79) return 'borderline'
  return 'delayed'
}
