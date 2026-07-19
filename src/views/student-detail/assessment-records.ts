import type { RouteLocationRaw } from 'vue-router'
import {
  BRIEFAssessmentAPI,
  CBCLAssessmentAPI,
  CRTAssessmentAPI,
  CognitiveSelfAssessmentAPI,
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
  ASSESSMENT_SCALE_CATALOG,
  type AssessmentScaleCode,
} from '@/features/assessment/assessment-scale-catalog'
import {
  buildAssessmentReportRoute as buildSharedAssessmentReportRoute,
} from '@/features/assessment/report-routes'

// 保守保留别名：直接别名到 catalog 的 AssessmentScaleCode（全 15 量表白名单），
// 不再维护第 7 处并行枚举；加量表时 catalog 即真源
export type AssessmentScaleType = AssessmentScaleCode

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

// scaleLabel 从 catalog recordsLabel 派生（单一真源），覆盖全 15 量表
const SCALE_LABEL_MAP: Record<AssessmentScaleCode, string> = Object.fromEntries(
  ASSESSMENT_SCALE_CATALOG.map((item) => [item.code, item.recordsLabel]),
) as Record<AssessmentScaleCode, string>

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
  const briefApi = new BRIEFAssessmentAPI()
  const crtApi = new CRTAssessmentAPI()
  const cognitiveSelfApi = new CognitiveSelfAssessmentAPI()

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

  const briefRecords = briefApi.getStudentAssessments(studentId).map((record: any) => ({
    id: `brief-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'brief' as const,
    scaleLabel: SCALE_LABEL_MAP.brief,
    scoreText: `原始 ${formatNullableNumber(record.total_raw_score)} / T ${formatNullableNumber(record.total_t_score)}`,
    levelText: formatLevel(record.level_code || record.level),
    createdAt: record.end_time || record.created_at || record.start_time || '',
  }))

  const crtRecords = crtApi.getStudentAssessments(studentId).map((record: any) => ({
    id: `crt-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'crt' as const,
    scaleLabel: SCALE_LABEL_MAP.crt,
    scoreText: `原始 ${formatNullableNumber(record.total_raw_score)}/${formatNullableNumber(record.total_questions)} / IQ ${formatNullableNumber(record.iq_estimate)}`,
    levelText: formatLevel(record.level_code || record.level),
    createdAt: record.end_time || record.created_at || record.start_time || '',
  }))

  const cognitiveSelfRecords = cognitiveSelfApi.getStudentAssessments(studentId).map((record: any) => ({
    id: `cognitive_self-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'cognitive_self' as const,
    scaleLabel: SCALE_LABEL_MAP.cognitive_self,
    scoreText: `正确率 ${formatNullableNumber(record.accuracy_rate)}% / 反应时 ${formatNullableNumber(record.avg_response_time)}ms`,
    levelText: formatLevel(record.level_code || record.level),
    createdAt: record.end_time || record.created_at || record.start_time || '',
  }))

  // catalog 驱动合并：迭代顺序跟随 catalog；加量表须在 recordsByScale 补 builder
  const recordsByScale: Record<AssessmentScaleCode, StudentAssessmentRecord[]> = {
    sm: smRecords,
    weefim: weefimRecords,
    csirs: csirsRecords,
    'conners-psq': connersPSQRecords,
    'conners-trs': connersTRSRecords,
    sdq: sdqRecords,
    srs2: srs2Records,
    cbcl: cbclRecords,
    cnbsr2016: cnbsr2016Records,
    fine_motor: fineMotorRecords,
    gmfm_88: gmfm88Records,
    tgmd_3: tgmd3Records,
    brief: briefRecords,
    crt: crtRecords,
    cognitive_self: cognitiveSelfRecords,
  }

  return ASSESSMENT_SCALE_CATALOG
    .flatMap((item) => recordsByScale[item.code] ?? [])
    .sort((left, right) => getSortTime(right.createdAt) - getSortTime(left.createdAt))
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
