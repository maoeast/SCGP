import type { RouteLocationRaw } from 'vue-router'
import {
  CBCLAssessmentAPI,
  ConnersPSQAPI,
  ConnersTRSAPI,
  CSIRSAPI,
  FineMotorAssessmentAPI,
  SMAssessmentAPI,
  WeeFIMAPI,
} from '@/database/api'
import { getDatabase } from '@/database/init'

export type AssessmentScaleType =
  | 'sm'
  | 'weefim'
  | 'csirs'
  | 'conners-psq'
  | 'conners-trs'
  | 'sdq'
  | 'srs2'
  | 'cbcl'
  | 'fine_motor'

export interface StudentAssessmentRecord {
  id: string
  studentId: number
  assessId: number
  scaleType: AssessmentScaleType
  scaleLabel: string
  scoreText: string
  levelText: string
  createdAt: string
}

const SCALE_LABEL_MAP: Record<AssessmentScaleType, string> = {
  sm: 'S-M量表',
  weefim: 'WeeFIM量表',
  csirs: 'CSIRS量表',
  'conners-psq': 'Conners PSQ',
  'conners-trs': 'Conners TRS',
  sdq: 'SDQ量表',
  srs2: 'SRS-2量表',
  cbcl: 'CBCL量表',
  fine_motor: '小肌肉功能发展评估量表',
}

const LEVEL_LABEL_MAP: Record<string, string> = {
  normal: '正常',
  mild: '轻度',
  moderate: '中度',
  severe: '重度',
  borderline: '临界',
  clinical: '临床',
}

function formatNullableNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'

  const number = Number(value)
  if (Number.isNaN(number)) {
    return String(value)
  }

  return Number.isInteger(number) ? String(number) : number.toFixed(1)
}

function formatLevel(value: unknown): string {
  if (!value) return '-'
  const normalized = String(value)
  return LEVEL_LABEL_MAP[normalized] || normalized
}

function getSortTime(value: string) {
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export function getStudentAssessmentRecords(studentId: number): StudentAssessmentRecord[] {
  if (!studentId) {
    return []
  }

  const db = getDatabase()
  const smApi = new SMAssessmentAPI()
  const weefimApi = new WeeFIMAPI()
  const csirsApi = new CSIRSAPI()
  const connersPSQApi = new ConnersPSQAPI()
  const connersTRSApi = new ConnersTRSAPI()
  const cbclApi = new CBCLAssessmentAPI()
  const fineMotorApi = new FineMotorAssessmentAPI()

  const smRecords = smApi.getStudentAssessments(studentId).map((record: any) => ({
    id: `sm-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'sm' as const,
    scaleLabel: SCALE_LABEL_MAP.sm,
    scoreText: `SQ ${formatNullableNumber(record.sq_score)} / 原始 ${formatNullableNumber(record.raw_score)}`,
    levelText: formatLevel(record.level),
    createdAt: record.end_time || record.created_at || record.start_time || '',
  }))

  const weefimRecords = weefimApi.getStudentAssessments(studentId).map((record: any) => ({
    id: `weefim-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'weefim' as const,
    scaleLabel: SCALE_LABEL_MAP.weefim,
    scoreText: `总分 ${formatNullableNumber(record.total_score)}`,
    levelText: formatLevel(record.level),
    createdAt: record.end_time || record.created_at || record.start_time || '',
  }))

  const csirsRecords = csirsApi.getStudentAssessments(studentId).map((record: any) => ({
    id: `csirs-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'csirs' as const,
    scaleLabel: SCALE_LABEL_MAP.csirs,
    scoreText: `总T分 ${formatNullableNumber(record.total_t_score)}`,
    levelText: formatLevel(record.level),
    createdAt: record.end_time || record.created_at || record.start_time || '',
  }))

  const connersPSQRecords = connersPSQApi.getStudentAssessments(studentId).map((record: any) => ({
    id: `conners-psq-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'conners-psq' as const,
    scaleLabel: SCALE_LABEL_MAP['conners-psq'],
    scoreText: `PI ${formatNullableNumber(record.pi_score)} / NI ${formatNullableNumber(record.ni_score)}`,
    levelText: formatLevel(record.level),
    createdAt: record.end_time || record.created_at || record.start_time || '',
  }))

  const connersTRSRecords = connersTRSApi.getStudentAssessments(studentId).map((record: any) => ({
    id: `conners-trs-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'conners-trs' as const,
    scaleLabel: SCALE_LABEL_MAP['conners-trs'],
    scoreText: `PI ${formatNullableNumber(record.pi_score)} / NI ${formatNullableNumber(record.ni_score)}`,
    levelText: formatLevel(record.level),
    createdAt: record.end_time || record.created_at || record.start_time || '',
  }))

  const sdqRecords = db.all(
    `
      SELECT
        id,
        student_id,
        total_difficulties_score,
        prosocial_score,
        level,
        start_time,
        end_time,
        created_at
      FROM sdq_assess
      WHERE student_id = ?
      ORDER BY created_at DESC
    `,
    [studentId],
  ).map((record: any) => ({
    id: `sdq-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'sdq' as const,
    scaleLabel: SCALE_LABEL_MAP.sdq,
    scoreText: `困难 ${formatNullableNumber(record.total_difficulties_score)} / 亲社会 ${formatNullableNumber(record.prosocial_score)}`,
    levelText: formatLevel(record.level),
    createdAt: record.end_time || record.created_at || record.start_time || '',
  }))

  const srs2Records = db.all(
    `
      SELECT
        id,
        student_id,
        total_t_score,
        total_level,
        start_time,
        end_time,
        created_at
      FROM srs2_assess
      WHERE student_id = ?
      ORDER BY created_at DESC
    `,
    [studentId],
  ).map((record: any) => ({
    id: `srs2-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'srs2' as const,
    scaleLabel: SCALE_LABEL_MAP.srs2,
    scoreText: `总T分 ${formatNullableNumber(record.total_t_score)}`,
    levelText: formatLevel(record.total_level),
    createdAt: record.end_time || record.created_at || record.start_time || '',
  }))

  const cbclRecords = cbclApi.getStudentAssessments(studentId).map((record: any) => ({
    id: `cbcl-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'cbcl' as const,
    scaleLabel: SCALE_LABEL_MAP.cbcl,
    scoreText: `问题总分 ${formatNullableNumber(record.total_problems_score)}`,
    levelText: formatLevel(record.summary_level),
    createdAt: record.end_time || record.created_at || record.start_time || '',
  }))

  const fineMotorRecords = fineMotorApi.getStudentAssessments(studentId).map((record: any) => ({
    id: `fine_motor-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'fine_motor' as const,
    scaleLabel: SCALE_LABEL_MAP.fine_motor,
    scoreText: `总分 ${formatNullableNumber(record.total_score)} / 掌握率 ${formatNullableNumber(record.standard_score)}%`,
    levelText: formatLevel(record.level),
    createdAt: record.end_time || record.created_at || record.start_time || '',
  }))

  return [
    ...smRecords,
    ...weefimRecords,
    ...csirsRecords,
    ...connersPSQRecords,
    ...connersTRSRecords,
    ...sdqRecords,
    ...srs2Records,
    ...cbclRecords,
    ...fineMotorRecords,
  ].sort((left, right) => getSortTime(right.createdAt) - getSortTime(left.createdAt))
}

export function buildAssessmentReportRoute(
  record: Pick<StudentAssessmentRecord, 'scaleType' | 'assessId' | 'studentId'>,
): RouteLocationRaw {
  switch (record.scaleType) {
    case 'sm':
      return {
        path: '/assessment/sm/report',
        query: {
          assessId: String(record.assessId),
          studentId: String(record.studentId),
        },
      }
    case 'weefim':
      return {
        path: '/assessment/weefim/report',
        query: {
          assessId: String(record.assessId),
          studentId: String(record.studentId),
        },
      }
    case 'csirs':
      return `/assessment/csirs/report/${record.assessId}`
    case 'conners-psq':
      return `/assessment/conners-psq/report/${record.assessId}`
    case 'conners-trs':
      return `/assessment/conners-trs/report/${record.assessId}`
    case 'sdq':
      return `/assessment/sdq/report/${record.assessId}`
    case 'srs2':
      return `/assessment/srs2/report/${record.assessId}`
    case 'cbcl':
      return `/assessment/cbcl/report/${record.assessId}`
    case 'fine_motor':
      return `/assessment/fine_motor/report/${record.assessId}`
    default:
      return '/assessment'
  }
}
