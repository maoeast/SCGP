import { SCGP_CNBS_R2016_Feedback_Config } from '@/config/CNBSR2016FeedbackConfig'
import {
  CNBSR2016_AGE_BRACKETS,
  CNBSR2016_DOMAIN_DEFINITIONS,
  CNBSR2016_DQ_BANDS,
  CNBSR2016_SUPPORTED_AGE_RANGE_TEXT,
  isCnbsr2016AgeSupported,
} from '@/config/cnbsr2016-thresholds'
import { CNBSR2016_QUESTIONS } from '@/database/cnbsr2016-questions'
import type { Cnbsr2016AgeBracketCode, Cnbsr2016DomainCode, Cnbsr2016DqStatus } from '@/types/cnbsr2016'

function isCnbsr2016InterventionStatus(
  status: Cnbsr2016DqStatus,
): status is Extract<Cnbsr2016DqStatus, 'borderline' | 'delayed'> {
  return status === 'borderline' || status === 'delayed'
}

export interface DomainResult {
  code: Cnbsr2016DomainCode
  name: string
  itemCount: number
  passedCount: number
  failedCount: number
  autoFilledPassedCount: number
  autoFilledFailedCount: number
  mentalAge: number
  maxMentalAge: number
  achievementRate: number
  dq: number
  dqStatus: Cnbsr2016DqStatus
  level: string
}

export interface DomainAdvice {
  tag: string
  text: string
}

export interface DomainFeedback {
  domain: Cnbsr2016DomainCode
  domainName: string
  dqStatus: Cnbsr2016DqStatus
  headline: string
  content: string
  advice: DomainAdvice[]
}

export interface OverallRule {
  label?: string
  summary?: string
  strengths?: string
  suggestions?: string
}

export interface ExpertClinical {
  clinical?: string
  risk?: string
  followup?: string
  referral?: string
}

export interface InterventionPayload {
  short?: string
  long?: string
  methods?: string[]
  home?: string[]
  freq?: string
}

export interface InterventionRecord {
  domain: Cnbsr2016DomainCode
  domainName: string
  intervention: InterventionPayload
}

export interface Cnbsr2016AssessmentRecord {
  id: number
  student_id: number
  student_name: string
  student_gender: string
  age_months: number
  total_mental_age: number
  dq: number
  dq_status: Cnbsr2016DqStatus
  age_bracket: Cnbsr2016AgeBracketCode
  level: string
  level_code?: string | null
  domain_results?: DomainResult[]
  domain_feedback?: DomainFeedback[]
  iep_targets?: unknown[]
  iep_interventions?: InterventionRecord[]
  overall_rule?: OverallRule | null
  expert_clinical?: ExpertClinical | null
  start_time?: string
  end_time?: string
  created_at?: string
}

export interface RawAssessmentDetail {
  question_id: number
  dimension: Cnbsr2016DomainCode
  age_group_months: number
  score_weight: number
  score: number
  answer_time: number
  is_auto_filled: boolean | number
  auto_fill_reason: 'basal' | 'ceiling' | null
  item_code?: string | null
  title?: string | null
  dimension_name?: string | null
  age_band?: string | null
  prompt?: string | null
  pass_criteria?: string | null
}

export interface AssessmentDetail {
  question_id: number
  dimension: Cnbsr2016DomainCode
  age_group_months: number
  score_weight: number
  score: number
  answer_time: number
  is_auto_filled: boolean
  auto_fill_reason: 'basal' | 'ceiling' | null
  item_code: string | null
  title: string
  dimension_name: string
  age_band: string | null
  prompt: string | null
  pass_criteria: string | null
}

export interface DomainRow {
  code: Cnbsr2016DomainCode
  name: string
  mentalAge: number
  maxMentalAge: number
  dq: number
  dqStatus: Cnbsr2016DqStatus
  level: string
  passedCount: number
  failedCount: number
  manualFailedCount: number
  autoFilledFailedCount: number
  autoFilledPassedCount: number
  headline: string
  content: string
  advice: DomainAdvice[]
}

export interface IepTargetItem {
  questionId: number
  itemCode: string | null
  title: string
  domain: Cnbsr2016DomainCode
  domainName: string
  ageGroupMonths: number
  ageBand: string | null
  prompt: string | null
  passCriteria: string | null
  autoFillReason: 'basal' | 'ceiling' | null
}

export interface Cnbsr2016ReportViewModel {
  ageBracketLabel: string
  dqBandRangeText: string
  supportedAgeRangeText: string
  isAgeSupported: boolean
  ageSupportWarning: string | null
  overallConclusionLabel: string
  overallRule: OverallRule | null
  expertClinical: ExpertClinical | null
  hasExpertClinical: boolean
  domainRows: DomainRow[]
  manualIepTargets: IepTargetItem[]
  autoFilledFailedItems: IepTargetItem[]
  interventions: Array<{
    domain: Cnbsr2016DomainCode
    domainName: string
    dqStatus: Cnbsr2016DqStatus
    intervention: InterventionPayload
  }>
}

const CNBSR2016_QUESTION_MAP = new Map(
  CNBSR2016_QUESTIONS.map((question) => [question.id, question]),
)

function formatCnbsr2016Age(ageMonths: number) {
  const normalized = Math.max(0, Math.floor(Number(ageMonths) || 0))
  const years = Math.floor(normalized / 12)
  const months = normalized % 12

  if (years <= 0) return `${months}个月`
  if (months === 0) return `${years}岁`
  return `${years}岁${months}个月`
}

export function getCnbsr2016DqStatusLabel(status: Cnbsr2016DqStatus | string | null | undefined) {
  if (!status) return '-'
  return CNBSR2016_DQ_BANDS.find((item) => item.status === status)?.label || String(status)
}

export function getCnbsr2016DqBandRangeText(status: Cnbsr2016DqStatus | string | null | undefined) {
  const band = CNBSR2016_DQ_BANDS.find((item) => item.status === status)
  if (!band) return '-'

  if (band.minInclusive !== undefined && band.maxInclusive !== undefined) {
    return `[${band.minInclusive}, ${band.maxInclusive + 1})`
  }
  if (band.minInclusive !== undefined) {
    return `>=${band.minInclusive}`
  }
  if (band.maxInclusive !== undefined) {
    return `<${band.maxInclusive + 1}`
  }
  return '-'
}

export function hydrateCnbsr2016AssessmentDetails(details: RawAssessmentDetail[]): AssessmentDetail[] {
  return details.map((detail) => {
    const question = CNBSR2016_QUESTION_MAP.get(Number(detail.question_id))

    return {
      question_id: Number(detail.question_id),
      dimension: detail.dimension,
      age_group_months: Number(detail.age_group_months || question?.ageGroupMonths || 0),
      score_weight: Number(detail.score_weight || question?.scoreWeight || 0),
      score: Number(detail.score || 0),
      answer_time: Number(detail.answer_time || 0),
      is_auto_filled: detail.is_auto_filled === true || Number(detail.is_auto_filled) === 1,
      auto_fill_reason: detail.auto_fill_reason || null,
      item_code: detail.item_code || question?.itemCode || null,
      title: detail.title || question?.title || '',
      dimension_name: detail.dimension_name || question?.domainName || detail.dimension,
      age_band: detail.age_band || question?.ageBand?.label || null,
      prompt: detail.prompt || question?.prompt || null,
      pass_criteria: detail.pass_criteria || question?.passCriteria || null,
    }
  })
}

export function buildCnbsr2016ReportViewModel({
  assessment,
  details,
}: {
  assessment: Cnbsr2016AssessmentRecord
  details: AssessmentDetail[]
}): Cnbsr2016ReportViewModel {
  const domainResultMap = new Map<Cnbsr2016DomainCode, DomainResult>()
  for (const item of assessment.domain_results || []) {
    domainResultMap.set(item.code, item)
  }

  const domainFeedbackMap = new Map<Cnbsr2016DomainCode, DomainFeedback>()
  for (const item of assessment.domain_feedback || []) {
    domainFeedbackMap.set(item.domain, item)
  }

  const isAgeSupported = isCnbsr2016AgeSupported(assessment.age_months)
  const ageBracketLabel = isAgeSupported
    ? CNBSR2016_AGE_BRACKETS.find((item) => item.code === assessment.age_bracket)?.label || assessment.age_bracket
    : '超出适用范围'
  const ageSupportWarning = isAgeSupported
    ? null
    : `该记录评估时年龄为${formatCnbsr2016Age(assessment.age_months)}（${assessment.age_months}个月），已超出儿心量表Ⅱ标准常模覆盖的${CNBSR2016_SUPPORTED_AGE_RANGE_TEXT}。请勿按有效常模结论继续使用，必要时优先考虑 Conners 评定量表或 Achenbach 儿童行为量表（CBCL）。`

  const overallRule = isAgeSupported
    ? assessment.overall_rule
      || SCGP_CNBS_R2016_Feedback_Config.overall_rules?.[assessment.age_bracket]?.[assessment.dq_status]
      || null
    : null

  const expertClinical = isAgeSupported
    ? assessment.expert_clinical
      || SCGP_CNBS_R2016_Feedback_Config.expert_clinical?.[assessment.age_bracket]?.[assessment.dq_status]
      || null
    : null

  const hasExpertClinical = Boolean(
    expertClinical?.clinical
      || expertClinical?.risk
      || expertClinical?.followup
      || expertClinical?.referral,
  )

  const domainRows = CNBSR2016_DOMAIN_DEFINITIONS.map((domain) => {
    const result = domainResultMap.get(domain.code)
    const feedback = domainFeedbackMap.get(domain.code)
      || {
        domain: domain.code,
        domainName: domain.label,
        dqStatus: result?.dqStatus || 'normal',
        headline:
          SCGP_CNBS_R2016_Feedback_Config.dimensions?.[domain.code]?.[assessment.age_bracket]?.[result?.dqStatus || 'normal']?.headline || '',
        content:
          SCGP_CNBS_R2016_Feedback_Config.dimensions?.[domain.code]?.[assessment.age_bracket]?.[result?.dqStatus || 'normal']?.content || '',
        advice:
          SCGP_CNBS_R2016_Feedback_Config.dimensions?.[domain.code]?.[assessment.age_bracket]?.[result?.dqStatus || 'normal']?.advice || [],
      }

    const domainDetails = details.filter((item) => item.dimension === domain.code)
    const manualFailedCount = domainDetails.filter((item) => item.score === 0 && item.is_auto_filled !== true).length

    return {
      code: domain.code,
      name: result?.name || domain.label,
      mentalAge: Number(result?.mentalAge || 0),
      maxMentalAge: Number(result?.maxMentalAge || 0),
      dq: Number(result?.dq || 0),
      dqStatus: result?.dqStatus || 'normal',
      level: result?.level || getCnbsr2016DqStatusLabel(result?.dqStatus || 'normal'),
      passedCount: Number(result?.passedCount || 0),
      failedCount: Number(result?.failedCount || 0),
      manualFailedCount,
      autoFilledFailedCount: Number(result?.autoFilledFailedCount || 0),
      autoFilledPassedCount: Number(result?.autoFilledPassedCount || 0),
      headline: feedback?.headline || '',
      content: feedback?.content || '',
      advice: Array.isArray(feedback?.advice) ? feedback.advice : [],
    }
  })

  const manualIepTargets = details
    .filter((item) => item.score === 0 && item.is_auto_filled !== true)
    .map((item) => ({
      questionId: Number(item.question_id),
      itemCode: item.item_code,
      title: item.title,
      domain: item.dimension,
      domainName: item.dimension_name,
      ageGroupMonths: Number(item.age_group_months || 0),
      ageBand: item.age_band,
      prompt: item.prompt,
      passCriteria: item.pass_criteria,
      autoFillReason: item.auto_fill_reason,
    }))
    .sort((left, right) => {
      const domainOrder = CNBSR2016_DOMAIN_DEFINITIONS.findIndex((item) => item.code === left.domain)
        - CNBSR2016_DOMAIN_DEFINITIONS.findIndex((item) => item.code === right.domain)
      if (domainOrder !== 0) {
        return domainOrder
      }
      return left.questionId - right.questionId
    })

  const autoFilledFailedItems = details
    .filter((item) => item.score === 0 && item.is_auto_filled === true)
    .map((item) => ({
      questionId: Number(item.question_id),
      itemCode: item.item_code,
      title: item.title,
      domain: item.dimension,
      domainName: item.dimension_name,
      ageGroupMonths: Number(item.age_group_months || 0),
      ageBand: item.age_band,
      prompt: item.prompt,
      passCriteria: item.pass_criteria,
      autoFillReason: item.auto_fill_reason,
    }))
    .sort((left, right) => left.questionId - right.questionId)

  const interventionMap = new Map(
    ((assessment.iep_interventions || []) as InterventionRecord[]).map((item) => [item.domain, item]),
  )

  const interventions = domainRows
    .map((domain) => {
      if (!isCnbsr2016InterventionStatus(domain.dqStatus)) {
        return null
      }

      return {
        domain: domain.code,
        domainName: domain.name,
        dqStatus: domain.dqStatus,
        intervention:
          interventionMap.get(domain.code)?.intervention
          || SCGP_CNBS_R2016_Feedback_Config.iep_interventions?.[domain.code]?.[assessment.age_bracket]?.[domain.dqStatus]
          || null,
      }
    })
    .filter((item): item is {
      domain: Cnbsr2016DomainCode
      domainName: string
      dqStatus: Extract<Cnbsr2016DqStatus, 'borderline' | 'delayed'>
      intervention: InterventionPayload
    } => Boolean(item?.intervention))

  return {
    ageBracketLabel,
    dqBandRangeText: isAgeSupported ? getCnbsr2016DqBandRangeText(assessment.dq_status) : '-',
    supportedAgeRangeText: CNBSR2016_SUPPORTED_AGE_RANGE_TEXT,
    isAgeSupported,
    ageSupportWarning,
    overallConclusionLabel: isAgeSupported
      ? assessment.level || getCnbsr2016DqStatusLabel(assessment.dq_status)
      : '超出适用范围',
    overallRule,
    expertClinical,
    hasExpertClinical,
    domainRows,
    manualIepTargets,
    autoFilledFailedItems,
    interventions,
  }
}
