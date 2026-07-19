import { ASSESSMENT_SCALE_CATALOG } from '@/features/assessment/assessment-scale-catalog'
import type {
  AssessmentScaleCode,
  AssessmentReportTone,
  AssessmentReportTagType,
} from '@/features/assessment/assessment-scale-catalog'

// 类型真源已移至 assessment-scale-catalog；此处保留导出以兼容现有消费方
export type { AssessmentReportTone, AssessmentReportTagType } from '@/features/assessment/assessment-scale-catalog'

export interface AssessmentReportCatalogItem {
  code: AssessmentScaleCode
  selectLabel: string
  cardLabel: string
  tone: AssessmentReportTone
  tagType: AssessmentReportTagType
}

// 退化为 catalog 派生层：selectLabel/cardLabel/tone/tagType 全部来自单一真源
export const ASSESSMENT_REPORT_CATALOG: ReadonlyArray<AssessmentReportCatalogItem> = ASSESSMENT_SCALE_CATALOG.map((item) => ({
  code: item.code,
  selectLabel: item.reportSelectLabel,
  cardLabel: item.reportCardLabel,
  tone: item.reportTone,
  tagType: item.reportTagType,
}))

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
