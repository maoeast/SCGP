import type {
  Cnbsr2016AgeBracketCode,
  Cnbsr2016DomainCode,
  Cnbsr2016DqStatus,
} from './cnbsr2016'

export type Cnbsr2016FeedbackSeverity = 'success' | 'info' | 'warning' | 'danger'

export type Cnbsr2016InterventionStatus = Extract<Cnbsr2016DqStatus, 'borderline' | 'delayed'>

export interface Cnbsr2016FeedbackAdviceItem {
  tag: string
  text: string
}

export interface Cnbsr2016OverallRuleEntry {
  label: string
  dq: string
  severity: Cnbsr2016FeedbackSeverity
  summary: string
  strengths: string
  suggestions: string
}

export interface Cnbsr2016DomainFeedbackLibraryEntry {
  headline: string
  content: string
  advice: Cnbsr2016FeedbackAdviceItem[]
}

export interface Cnbsr2016InterventionEntry {
  short: string
  long: string
  methods: string[]
  home: string[]
  freq: string
}

export interface Cnbsr2016ExpertClinicalEntry {
  clinical: string
  risk: string
  followup: string
  referral: string
}

export interface Cnbsr2016CommentaryEntry {
  title: string
  content: string
  advice: Cnbsr2016FeedbackAdviceItem[]
}

export type Cnbsr2016DqStatusRecord<T> = Record<Cnbsr2016DqStatus, T>

export type Cnbsr2016AgeBracketStatusRecord<T> = Record<Cnbsr2016AgeBracketCode, Cnbsr2016DqStatusRecord<T>>

export type Cnbsr2016DomainAgeBracketStatusRecord<T> = Record<
  Cnbsr2016DomainCode,
  Cnbsr2016AgeBracketStatusRecord<T>
>

export type Cnbsr2016InterventionStatusRecord<T> = Record<Cnbsr2016InterventionStatus, T>

export type Cnbsr2016DomainAgeBracketInterventionRecord<T> = Record<
  Cnbsr2016DomainCode,
  Record<Cnbsr2016AgeBracketCode, Cnbsr2016InterventionStatusRecord<T>>
>

export type Cnbsr2016DomainStatusRecord<T> = Record<Cnbsr2016DomainCode, Cnbsr2016DqStatusRecord<T>>

export interface Cnbsr2016FeedbackConfig {
  overall_rules: Cnbsr2016AgeBracketStatusRecord<Cnbsr2016OverallRuleEntry>
  dimensions: Cnbsr2016DomainAgeBracketStatusRecord<Cnbsr2016DomainFeedbackLibraryEntry>
  iep_interventions: Cnbsr2016DomainAgeBracketInterventionRecord<Cnbsr2016InterventionEntry>
  expert_clinical: Cnbsr2016AgeBracketStatusRecord<Cnbsr2016ExpertClinicalEntry>
  commentary_library: Cnbsr2016DomainStatusRecord<Cnbsr2016CommentaryEntry>
}
