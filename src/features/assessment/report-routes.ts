import type { RouteLocationRaw } from 'vue-router'
import { getAssessmentScaleCatalogItem } from '@/features/assessment/assessment-scale-catalog'
import type { AssessmentScaleCode } from '@/features/assessment/assessment-scale-catalog'

export type AssessmentReportScaleType = AssessmentScaleCode

export interface AssessmentReportRouteInput {
  scaleType: AssessmentReportScaleType
  assessId: number | string
  studentId?: number | string | null
}

function normalizeId(value: number | string | null | undefined): string {
  return String(value ?? '').trim()
}

export function buildAssessmentReportRoute({
  scaleType,
  assessId,
  studentId,
}: AssessmentReportRouteInput): RouteLocationRaw {
  const normalizedAssessId = normalizeId(assessId)
  const normalizedStudentId = normalizeId(studentId)

  // 单一真源：urlSlug + reportPathParamStyle 全部来自 catalog
  const catalogItem = getAssessmentScaleCatalogItem(scaleType)
  if (!catalogItem) {
    return '/assessment'
  }

  const reportPath = `/assessment/${catalogItem.urlSlug}/report`

  // sm/weefim 历史用 query 形态（保外链/书签兼容），其余用 path params
  if (catalogItem.reportPathParamStyle === 'query') {
    return {
      path: reportPath,
      query: {
        assessId: normalizedAssessId,
        studentId: normalizedStudentId,
      },
    }
  }

  return `${reportPath}/${normalizedAssessId}`
}
