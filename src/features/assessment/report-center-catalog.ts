import type { AssessmentScaleCode } from '@/features/assessment/assessment-scale-catalog'

export type AssessmentReportTone = 'blue' | 'teal' | 'amber' | 'coral'
export type AssessmentReportTagType = 'warning' | 'success' | 'danger' | 'primary' | 'info'

export interface AssessmentReportCatalogItem {
  code: AssessmentScaleCode
  selectLabel: string
  cardLabel: string
  tone: AssessmentReportTone
  tagType: AssessmentReportTagType
}

export const ASSESSMENT_REPORT_CATALOG = [
  { code: 'sm', selectLabel: 'S-M 评估报告', cardLabel: 'S-M', tone: 'blue', tagType: 'warning' },
  { code: 'weefim', selectLabel: 'WeeFIM 评估报告', cardLabel: 'WeeFIM', tone: 'teal', tagType: 'success' },
  { code: 'csirs', selectLabel: 'CSIRS 评估报告', cardLabel: 'CSIRS', tone: 'coral', tagType: 'danger' },
  { code: 'conners-psq', selectLabel: 'Conners PSQ 报告', cardLabel: 'Conners PSQ', tone: 'amber', tagType: 'primary' },
  { code: 'conners-trs', selectLabel: 'Conners TRS 报告', cardLabel: 'Conners TRS', tone: 'blue', tagType: 'info' },
  { code: 'sdq', selectLabel: 'SDQ 评估报告', cardLabel: 'SDQ', tone: 'amber', tagType: 'warning' },
  { code: 'srs2', selectLabel: 'SRS-2 评估报告', cardLabel: 'SRS-2', tone: 'teal', tagType: 'primary' },
  { code: 'cbcl', selectLabel: 'CBCL 评估报告', cardLabel: 'CBCL', tone: 'coral', tagType: 'success' },
  { code: 'cnbsr2016', selectLabel: '儿心量表Ⅱ评估报告', cardLabel: '儿心量表Ⅱ', tone: 'teal', tagType: 'success' },
  { code: 'fine_motor', selectLabel: '小肌肉功能发展评估报告', cardLabel: 'FMDA', tone: 'blue', tagType: 'primary' },
  { code: 'gmfm_88', selectLabel: 'GMFM-88 评估报告', cardLabel: 'GMFM-88', tone: 'coral', tagType: 'danger' },
  { code: 'tgmd_3', selectLabel: 'TGMD-3 评估报告', cardLabel: 'TGMD-3', tone: 'amber', tagType: 'warning' },
  { code: 'brief', selectLabel: 'BRIEF 执行功能报告（草案）', cardLabel: 'BRIEF（草案）', tone: 'blue', tagType: 'primary' },
  { code: 'crt', selectLabel: 'CRT 图形推理报告（草案）', cardLabel: 'CRT（草案）', tone: 'teal', tagType: 'primary' },
  { code: 'cognitive_self', selectLabel: '综合认知自测报告（草案）', cardLabel: '认知自测（草案）', tone: 'amber', tagType: 'primary' },
] as const satisfies ReadonlyArray<AssessmentReportCatalogItem>

export type AssessmentReportCounts = Record<AssessmentScaleCode, number>

export const ASSESSMENT_REPORT_CODES: ReadonlyArray<AssessmentScaleCode> =
  ASSESSMENT_REPORT_CATALOG.map((item) => item.code)

const ASSESSMENT_REPORT_CATALOG_MAP = new Map<AssessmentScaleCode, AssessmentReportCatalogItem>(
  ASSESSMENT_REPORT_CATALOG.map((item) => [item.code, item]),
)

export function isAssessmentReportScaleType(value: unknown): value is AssessmentScaleCode {
  return typeof value === 'string'
    && ASSESSMENT_REPORT_CATALOG_MAP.has(value as AssessmentScaleCode)
}

export function getAssessmentReportCatalogItem(
  code: AssessmentScaleCode,
): AssessmentReportCatalogItem {
  return ASSESSMENT_REPORT_CATALOG_MAP.get(code)!
}

export function createEmptyAssessmentReportCounts(): AssessmentReportCounts {
  return Object.fromEntries(
    ASSESSMENT_REPORT_CODES.map((code) => [code, 0]),
  ) as AssessmentReportCounts
}

export function deriveAssessmentReportCounts(
  records: ReadonlyArray<{ report_type?: unknown }>,
): AssessmentReportCounts {
  const counts = createEmptyAssessmentReportCounts()

  records.forEach((record) => {
    if (isAssessmentReportScaleType(record.report_type)) {
      counts[record.report_type] += 1
    }
  })

  return counts
}
