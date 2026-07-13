import type { RouteLocationRaw } from 'vue-router'

export type AssessmentReportScaleType =
  | 'sm'
  | 'weefim'
  | 'csirs'
  | 'conners-psq'
  | 'conners-trs'
  | 'sdq'
  | 'srs2'
  | 'cbcl'
  | 'cnbsr2016'
  | 'fine_motor'
  | 'gmfm_88'
  | 'tgmd_3'
  | 'brief'
  | 'crt'
  | 'cognitive_self'

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

  switch (scaleType) {
    case 'sm':
      return {
        path: '/assessment/sm/report',
        query: {
          assessId: normalizedAssessId,
          studentId: normalizedStudentId,
        },
      }
    case 'weefim':
      return {
        path: '/assessment/weefim/report',
        query: {
          assessId: normalizedAssessId,
          studentId: normalizedStudentId,
        },
      }
    case 'csirs':
      return `/assessment/csirs/report/${normalizedAssessId}`
    case 'conners-psq':
      return `/assessment/conners-psq/report/${normalizedAssessId}`
    case 'conners-trs':
      return `/assessment/conners-trs/report/${normalizedAssessId}`
    case 'sdq':
      return `/assessment/sdq/report/${normalizedAssessId}`
    case 'srs2':
      return `/assessment/srs2/report/${normalizedAssessId}`
    case 'cbcl':
      return `/assessment/cbcl/report/${normalizedAssessId}`
    case 'cnbsr2016':
      return `/assessment/cnbsr2016/report/${normalizedAssessId}`
    case 'fine_motor':
      return `/assessment/fine_motor/report/${normalizedAssessId}`
    case 'gmfm_88':
      return `/assessment/gmfm_88/report/${normalizedAssessId}`
    case 'tgmd_3':
      return `/assessment/tgmd_3/report/${normalizedAssessId}`
    case 'brief':
      return `/assessment/brief/report/${normalizedAssessId}`
    case 'crt':
      return `/assessment/crt/report/${normalizedAssessId}`
    case 'cognitive_self':
      return `/assessment/cognitive-self/report/${normalizedAssessId}`
    default:
      return '/assessment'
  }
}
