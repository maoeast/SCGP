import type { ScaleOption } from './assessment'

export const CNBSR2016_DOMAIN_CODES = ['gm', 'fm', 'ad', 'la', 'sb'] as const

export type Cnbsr2016DomainCode = typeof CNBSR2016_DOMAIN_CODES[number]

export const CNBSR2016_MONTH_GROUPS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
  15, 18, 21, 24, 27, 30, 33, 36,
  42, 48, 54, 60, 66, 72, 78, 84,
] as const

export type Cnbsr2016MonthGroup = typeof CNBSR2016_MONTH_GROUPS[number]

export const CNBSR2016_ALLOWED_SCORE_WEIGHTS = [0.5, 1, 1.5, 3, 6] as const

export type Cnbsr2016ScoreWeight = typeof CNBSR2016_ALLOWED_SCORE_WEIGHTS[number]

export const CNBSR2016_AGE_BRACKET_CODES = ['a1', 'a2', 'a3', 'a4'] as const

export type Cnbsr2016AgeBracketCode = typeof CNBSR2016_AGE_BRACKET_CODES[number]

export const CNBSR2016_DQ_STATUS_CODES = [
  'excellent',
  'good',
  'normal',
  'borderline',
  'delayed',
] as const

export type Cnbsr2016DqStatus = typeof CNBSR2016_DQ_STATUS_CODES[number]

export type Cnbsr2016QuestionSourceStatus = 'stub' | 'digitized' | 'verified'

export interface Cnbsr2016DomainDefinition {
  code: Cnbsr2016DomainCode
  label: string
}

export interface Cnbsr2016AgeBand {
  label: string
  minMonths: number
  maxMonths: number
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

export interface Cnbsr2016PassFailOption extends ScaleOption {
  value: 0 | 1
  score: 0 | 1
}

export interface Cnbsr2016QuestionData {
  id: number
  itemCode: string
  domain: Cnbsr2016DomainCode
  domainName: string
  ageGroupMonths: Cnbsr2016MonthGroup
  ageBand: Cnbsr2016AgeBand
  scoreWeight: Cnbsr2016ScoreWeight
  title: string
  prompt: string
  passCriteria: string
  sourcePage: number
  sourceOrder: number
  sourceStatus: Cnbsr2016QuestionSourceStatus
  sourceNotes?: string | null
}
