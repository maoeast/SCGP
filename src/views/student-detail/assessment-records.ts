import type { RouteLocationRaw } from 'vue-router'
import {
  CBCLAssessmentAPI,
  Cnbsr2016AssessmentAPI,
  ConnersPSQAPI,
  ConnersTRSAPI,
  CSIRSAPI,
  FineMotorAssessmentAPI,
  Gmfm88AssessmentAPI,
  SMAssessmentAPI,
  Tgmd3AssessmentAPI,
  WeeFIMAPI,
} from '@/database/api'
import { getDatabase } from '@/database/init'
import {
  buildAssessmentReportRoute as buildSharedAssessmentReportRoute,
} from '@/features/assessment/report-routes'

export type AssessmentScaleType =
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
  cnbsr2016: '儿心量表Ⅱ',
  fine_motor: '小肌肉功能发展评估量表',
  gmfm_88: 'GMFM-88粗大运动功能评定量表',
  tgmd_3: 'TGMD-3大肌肉动作发展测验',
}

const LEVEL_LABEL_MAP: Record<string, string> = {
  normal: '正常',
  mild: '轻度',
  moderate: '中度',
  severe: '重度',
  borderline: '临界',
  clinical: '临床',
  excellent: '优秀',
  good: '良好',
  delayed: '智力发育障碍',
  intensive_support: '基础筑巢期',
  transitional_growth: '破茧探索期',
  functional_independence: '展翅飞跃期',
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
  const cnbsr2016Api = new Cnbsr2016AssessmentAPI()
  const fineMotorApi = new FineMotorAssessmentAPI()
  const gmfm88Api = new Gmfm88AssessmentAPI()
  const tgmd3Api = new Tgmd3AssessmentAPI()

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

  const cnbsr2016Records = cnbsr2016Api.getStudentAssessments(studentId).map((record: any) => ({
    id: `cnbsr2016-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'cnbsr2016' as const,
    scaleLabel: SCALE_LABEL_MAP.cnbsr2016,
    scoreText: `MA ${formatNullableNumber(record.total_mental_age)}月 / DQ ${formatNullableNumber(record.dq)}`,
    levelText: formatLevel(record.level_code || record.level),
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

  const gmfm88Records = gmfm88Api.getStudentAssessments(studentId).map((record: any) => ({
    id: `gmfm_88-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'gmfm_88' as const,
    scaleLabel: SCALE_LABEL_MAP.gmfm_88,
    scoreText: `总分 ${formatNullableNumber(record.total_score)}% / 原始 ${formatNullableNumber(record.raw_total_score)}`,
    levelText: formatLevel(record.level_code || record.level),
    createdAt: record.end_time || record.created_at || record.start_time || '',
  }))

  const tgmd3Records = tgmd3Api.getStudentAssessments(studentId).map((record: any) => ({
    id: `tgmd_3-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'tgmd_3' as const,
    scaleLabel: SCALE_LABEL_MAP.tgmd_3,
    scoreText: `总分 ${formatNullableNumber(record.total_score)} / 常模 ${formatNullableNumber(record.total_level)}级`,
    levelText: formatLevel(record.level_code || record.level),
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
    ...cnbsr2016Records,
    ...fineMotorRecords,
    ...gmfm88Records,
    ...tgmd3Records,
  ].sort((left, right) => getSortTime(right.createdAt) - getSortTime(left.createdAt))
}

export function buildAssessmentReportRoute(
  record: Pick<StudentAssessmentRecord, 'scaleType' | 'assessId' | 'studentId'>,
): RouteLocationRaw {
  return buildSharedAssessmentReportRoute({
    scaleType: record.scaleType,
    assessId: record.assessId,
    studentId: record.studentId,
  })
}
