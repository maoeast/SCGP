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

  // ===== 量表级 level_code 英文键 → 中文标签（避免技术术语直出；delayed 等键各量表语义不同须局部映射） =====
  // cognitive_self（视知觉图形匹配筛查）
  const COGNITIVE_SELF_LEVEL_LABELS: Record<string, string> = {
    stable: '整体稳定',
    boundary: '较难题目吃力',
    inconsistent: '表现不稳定',
    unreadable: '结果不参考',
    floor_risk: '基础未完成',
    ceiling_risk: '上限未测出',
  }
  // CRT（瑞文推理）：中文标签取自 crt-data 的 level 字段
  const CRT_LEVEL_LABELS: Record<string, string> = {
    delayed: '明显落后',
    borderline: '边缘水平',
    average: '典型水平',
    high_average: '中上水平',
    superior: '优秀',
    very_superior: '极优秀',
  }
  // BRIEF（执行功能）：中文标签取自 brief-data 的 level 字段
  const BRIEF_LEVEL_LABELS: Record<string, string> = {
    typical: '良好',
    slightly_elevated: '轻度风险',
    elevated: '中度风险',
    clinically_significant: '显著风险',
  }
  // TGMD-3（粗大动作）：中文标签取自 feedbackConfig 的 title 字段
  const TGMD3_LEVEL_LABELS: Record<string, string> = {
    emerging_skills: '技能萌芽期',
    developing_skills: '稳步成长期',
    proficient_skills: '展翅飞跃期',
  }
  function formatMappedLevel(value: unknown, map: Record<string, string>): string {
    if (!value) return '-'
    const normalized = String(value)
    return map[normalized] || normalized
  }
  function formatCognitiveSelfLevel(value: unknown): string {
    return formatMappedLevel(value, COGNITIVE_SELF_LEVEL_LABELS)
  }
  function formatCognitiveSelfAccuracy(value: unknown): string {
    const number = Number(value)
    if (Number.isNaN(number)) return String(value)
    // 库内为 0~1 小数；防御：若已存百分数（>1）则直接用
    const percent = number <= 1 ? Math.round(number * 100) : Math.round(number)
    return `${percent}%`
  }
  function formatCognitiveSelfRt(value: unknown): string {
    const number = Number(value)
    if (Number.isNaN(number)) return String(value)
    // 库内为毫秒；防御：若已存秒（<1 或明显偏小）则直接用
    const seconds = number >= 100 ? number / 1000 : number
    return `${seconds.toFixed(1)}s`
  }

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
    levelText: formatMappedLevel(record.level_code || record.level, TGMD3_LEVEL_LABELS),
    createdAt: record.end_time || record.created_at || record.start_time || '',
  }))

  const briefRecords = briefApi.getStudentAssessments(studentId).map((record: any) => ({
    id: `brief-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'brief' as const,
    scaleLabel: SCALE_LABEL_MAP.brief,
    scoreText: `原始 ${formatNullableNumber(record.total_raw_score)} / T ${formatNullableNumber(record.total_t_score)}`,
    levelText: formatMappedLevel(record.level_code || record.level, BRIEF_LEVEL_LABELS),
    createdAt: record.end_time || record.created_at || record.start_time || '',
  }))

  const crtRecords = crtApi.getStudentAssessments(studentId).map((record: any) => ({
    id: `crt-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'crt' as const,
    scaleLabel: SCALE_LABEL_MAP.crt,
    scoreText: `原始 ${formatNullableNumber(record.total_raw_score)}/${formatNullableNumber(record.total_questions)} / IQ ${formatNullableNumber(record.iq_estimate)}`,
    levelText: formatMappedLevel(record.level_code || record.level, CRT_LEVEL_LABELS),
    createdAt: record.end_time || record.created_at || record.start_time || '',
  }))

  const cognitiveSelfRecords = cognitiveSelfApi.getStudentAssessments(studentId).map((record: any) => ({
    id: `cognitive_self-${record.id}`,
    studentId,
    assessId: record.id,
    scaleType: 'cognitive_self' as const,
    scaleLabel: SCALE_LABEL_MAP.cognitive_self,
    scoreText: `正确率 ${formatCognitiveSelfAccuracy(record.accuracy_rate)} / 反应时 ${formatCognitiveSelfRt(record.avg_response_time)}`,
    levelText: formatCognitiveSelfLevel(record.level_code || record.level),
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
    abc: [], // TODO: 实现 ABC 记录查询
    atec: [], // TODO: 实现 ATEC 记录查询
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
