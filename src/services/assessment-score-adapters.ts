/**
 * 评估量表纵向分数适配器（DB 查询层）。
 *
 * 目的：把每个量表各自的结构化评分记录归一化成统一形状的「纵向快照序列」，
 * 供 AI 工具 get_assessment_trend 读取，让模型能对「同一学生同一量表的历次评测」做纵向解读。
 *
 * 架构分层（为了可测试性）：
 * - assessment-score-normalize.ts：纯归一化函数 + 类型，无 DB / @/ 依赖，jiti 可直接单测。
 * - 本文件：ScoreAdapter 接口 + 适配器注册表，复用既有 XxxAPI.getStudentAssessments 查库，
 *   再委托纯函数归一化。新增量表只需实现适配器并注册到 SCORE_ADAPTERS。
 *
 * 分数提取策略（三种模式）：
 * 1. 专用函数：CSIRS（维度随年龄变化）、Conners（多动指数优先独立列）
 * 2. 声明式 object 模式：dimensionScores JSON 是 { dimCode: { scoreField, ... } }（srs2/sdq/brief/cbcl/tgmd/gmfm/cnbsr/fine_motor）
 * 3. 声明式 column 模式：无维度 JSON，分项在独立列（weefim 的 adl_score/cognitive_score）
 *
 * 不支持的量表（crt / cognitive_self）：为实验性占位常模，纵向"进步"可能是常模漂移假象，
 * 不接入纵向分析，避免误导教师。如模型请求这些量表，工具返回明确拒绝信息。
 */
import {
  CSIRSAPI,
  ConnersPSQAPI,
  ConnersTRSAPI,
  SDQAssessmentAPI,
  SRS2AssessmentAPI,
  CBCLAssessmentAPI,
  BRIEFAssessmentAPI,
  WeeFIMAPI,
  Cnbsr2016AssessmentAPI,
  FineMotorAssessmentAPI,
  Gmfm88AssessmentAPI,
  Tgmd3AssessmentAPI,
  SMAssessmentAPI,
} from '@/database/api'
import { getDatabase } from '@/database/init'
import {
  normalizeCsirs,
  normalizeConners,
  normalizeByConfig,
  byDateAsc,
  CONNERS_PSQ_DIMENSIONS,
  CONNERS_TRS_DIMENSIONS,
  type ScoreSnapshot,
  type LongitudinalScorePayload,
  type NormalizeConfig,
} from './assessment-score-normalize'

// 纯函数与类型 re-export，保持对外单一入口
export {
  normalizeCsirs,
  normalizeConners,
  normalizeByConfig,
  type ScoreSnapshot,
  type LongitudinalScorePayload,
  type NormalizeConfig,
}

// ==================== 适配器接口 ====================

/** 量表分数适配器。 */
export interface ScoreAdapter {
  /** 量表代码（与 ASSESSMENT_SCALE_CATALOG 对齐）。 */
  scaleCode: string
  /** 量表中文名。 */
  scaleName: string
  /** 总分语义说明：分高代表好还是差、典型区间。 */
  scoreNote: string
  /** 按学生 id 取历次评估的归一化升序快照。 */
  getLongitudinalScores(studentId: number): ScoreSnapshot[]
}

// ==================== 心理/行为量表（T 分/标准分，分高=问题突出）====================

const connersScoreNote =
  '多动指数（hyperactivity_index）为代表性 T 分，分越高问题越突出：>70 临床显著、66–70 临界、<66 正常范围。各维度同为 T 分。'

// ---------- 已有专用函数：CSIRS / Conners ----------
const csirsAdapter: ScoreAdapter = {
  scaleCode: 'csirs',
  scaleName: '儿童感觉统合能力发展评估量表',
  scoreNote:
    '总分（total_t_score）为 T 分，≥40 为优秀、30–39 正常、<30 偏低；分越高越好。各维度同为 T 分，含义一致。',
  getLongitudinalScores(studentId: number): ScoreSnapshot[] {
    const rows = new CSIRSAPI().getStudentAssessments(studentId) ?? []
    return rows.map(normalizeCsirs).sort(byDateAsc)
  },
}

const connersPsqAdapter: ScoreAdapter = {
  scaleCode: 'conners_psq',
  scaleName: 'Conners 父母症状问卷（PSQ）',
  scoreNote: connersScoreNote,
  getLongitudinalScores(studentId: number): ScoreSnapshot[] {
    const rows = new ConnersPSQAPI().getStudentAssessments(studentId) ?? []
    return rows.map((r: any) => normalizeConners(r, CONNERS_PSQ_DIMENSIONS)).sort(byDateAsc)
  },
}

const connersTrsAdapter: ScoreAdapter = {
  scaleCode: 'conners_trs',
  scaleName: 'Conners 教师评定量表（TRS）',
  scoreNote: connersScoreNote,
  getLongitudinalScores(studentId: number): ScoreSnapshot[] {
    const rows = new ConnersTRSAPI().getStudentAssessments(studentId) ?? []
    return rows.map((r: any) => normalizeConners(r, CONNERS_TRS_DIMENSIONS)).sort(byDateAsc)
  },
}

// ---------- 声明式 object 模式：SRS2 ----------
const srs2Config: NormalizeConfig = {
  scaleCode: 'srs2',
  totalScoreField: 'total_t_score',
  levelField: 'total_level',
  dimensionScoresField: 'dimension_scores',
  dimensionMode: 'object',
  dimensionScoreField: 'tScore',
  dimensionNameField: 'name',
  dimensionLabels: { awareness: '社交觉察', cognition: '社交认知', communication: '社交沟通', motivation: '社交动机', repetitive: '刻板行为' },
}
const srs2Adapter: ScoreAdapter = {
  scaleCode: 'srs2',
  scaleName: '社交反应量表（SRS-2）',
  scoreNote:
    '总分（total_t_score）为 T 分，分越高社交缺损越严重：≥76 重度、66–75 中度、60–65 轻度、<60 正常。各维度同为 T 分。',
  getLongitudinalScores(studentId: number): ScoreSnapshot[] {
    const rows = new SRS2AssessmentAPI().getStudentAssessments(studentId) ?? []
    return rows.map((r: any) => normalizeByConfig(r, srs2Config)).sort(byDateAsc)
  },
}

// ---------- 声明式 object 模式：SDQ（维度用 rawScore，非 T 分）----------
const sdqConfig: NormalizeConfig = {
  scaleCode: 'sdq',
  totalScoreField: 'total_difficulties_score',
  levelField: 'level',
  dimensionScoresField: 'dimension_scores',
  dimensionMode: 'object',
  dimensionScoreField: 'rawScore',
  dimensionNameField: 'name',
  dimensionLabels: { emotional: '情绪症状', conduct: '品行问题', hyperactivity: '多动/注意力', peer: '同伴交往', prosocial: '亲社会行为', total_difficulties: '困难总分' },
}
const sdqAdapter: ScoreAdapter = {
  scaleCode: 'sdq',
  scaleName: '长处和困难问卷（SDQ）',
  scoreNote:
    '困难总分（total_difficulties_score）为原始分（0–40），分越高困难越突出：≥20 异常、16–19 临界、<16 正常。亲社会行为反向（分越高越好）。各维度为原始分（0–10）。',
  getLongitudinalScores(studentId: number): ScoreSnapshot[] {
    const rows = new SDQAssessmentAPI().getStudentAssessments(studentId) ?? []
    return rows.map((r: any) => normalizeByConfig(r, sdqConfig)).sort(byDateAsc)
  },
}

// ---------- 声明式 object 模式：CBCL（factor_t_scores 扁平 + 宽带独立列）----------
const cbclConfig: NormalizeConfig = {
  scaleCode: 'cbcl',
  totalScoreField: 'total_problems_t_score',
  levelField: 'summary_level',
  dimensionScoresField: 'factor_t_scores',
  dimensionMode: 'flat-number', // factor_t_scores 是 { 因子中文名: tScore }
  extraFields: ['internalizing_t_score', 'externalizing_t_score'],
}
const cbclAdapter: ScoreAdapter = {
  scaleCode: 'cbcl',
  scaleName: 'Achenbach 儿童行为量表（CBCL）',
  scoreNote:
    '总分（total_problems_t_score）为 T 分，分越高问题越突出：≥64 临床、60–63 临界、<60 正常。各因子同为 T 分。extra 含内化（internalizing）/外化（externalizing）宽带 T 分。',
  getLongitudinalScores(studentId: number): ScoreSnapshot[] {
    const rows = new CBCLAssessmentAPI().getStudentAssessments(studentId) ?? []
    return rows.map((r: any) => normalizeByConfig(r, cbclConfig)).sort(byDateAsc)
  },
}

// ---------- 声明式 object 模式：BRIEF ----------
const briefConfig: NormalizeConfig = {
  scaleCode: 'brief',
  totalScoreField: 'total_t_score',
  levelField: 'level',
  dimensionScoresField: 'dimension_scores',
  dimensionMode: 'object',
  dimensionScoreField: 'tScore',
  dimensionNameField: 'name',
}
const briefAdapter: ScoreAdapter = {
  scaleCode: 'brief',
  scaleName: '执行功能行为评定量表（BRIEF）',
  scoreNote:
    '总分（total_t_score，全局执行复合 GEC）为 T 分，分越高执行功能问题越突出：≥65 临床、60–64 临界、<60 正常。各维度同为 T 分。',
  getLongitudinalScores(studentId: number): ScoreSnapshot[] {
    const rows = new BRIEFAssessmentAPI().getStudentAssessments(studentId) ?? []
    return rows.map((r: any) => normalizeByConfig(r, briefConfig)).sort(byDateAsc)
  },
}

// ==================== 发展/运动量表（分高=能力越好）====================

// ---------- 声明式 column 模式：WeeFIM（无维度 JSON，分项在独立列）----------
const weefimAdapter: ScoreAdapter = {
  scaleCode: 'weefim',
  scaleName: '儿童功能独立性评定量表（WeeFIM）',
  scoreNote:
    '总分（total_score，18–126）为原始分，分越高独立性越好。运动分（adl_score）与认知分（cognitive_score）为分项，分越高越好。',
  getLongitudinalScores(studentId: number): ScoreSnapshot[] {
    const rows = new WeeFIMAPI().getStudentAssessments(studentId) ?? []
    // WeeFIM 无 age_months 列，用 0 占位（年龄需从学生档案另查）
    return rows.map((r: any) => ({
      assessId: r.id,
      date: r.created_at,
      ageMonths: 0,
      totalScore: Number(r.total_score) || 0,
      level: String(r.level ?? ''),
      dimensionScores: { 运动功能: Number(r.adl_score) || 0, 认知功能: Number(r.cognitive_score) || 0 },
    })).sort(byDateAsc)
  },
}

// ---------- 声明式 object 模式：CNBS-R2016（DQ 发育商）----------
const cnbsr2016Config: NormalizeConfig = {
  scaleCode: 'cnbsr2016',
  totalScoreField: 'dq',
  levelField: 'dq_status',
  dimensionScoresField: 'domain_results',
  dimensionMode: 'object',
  dimensionScoreField: 'dq', // domain_results 每项含 dq 或 score
  dimensionNameField: 'name',
  dimensionLabels: { gm: '大运动', fm: '精细动作', ad: '适应能力', la: '语言', sb: '社会行为' },
}
const cnbsr2016Adapter: ScoreAdapter = {
  scaleCode: 'cnbsr2016',
  scaleName: '0–6 岁儿童神经心理发育量表（CNBS-R2016）',
  scoreNote:
    '总分（dq，发育商）均值 100、标准差 15：≥130 优秀、115–129 中上、85–114 中等、70–84 边缘、<70 发育迟缓。分越高发育越好。各能区同为 DQ。',
  getLongitudinalScores(studentId: number): ScoreSnapshot[] {
    const rows = new Cnbsr2016AssessmentAPI().getStudentAssessments(studentId) ?? []
    return rows.map((r: any) => normalizeByConfig(r, cnbsr2016Config)).sort(byDateAsc)
  },
}

// ---------- 声明式 object 模式：小肌肉功能 fine_motor ----------
const fineMotorConfig: NormalizeConfig = {
  scaleCode: 'fine_motor',
  totalScoreField: 'standard_score',
  levelField: 'level',
  dimensionScoresField: 'domain_results',
  dimensionMode: 'object',
  dimensionScoreField: 'masteryRate', // domain_results 每项含 masteryRate 或 standardScore
  dimensionNameField: 'name',
  dimensionLabels: { hand_grasp: '手部抓握', finger_dexterity: '手指灵活性', bilateral_coordination: '双手协调', vmi: '视动整合', pre_writing: '前书写技能', self_care: '生活自理精细动作' },
}
const fineMotorAdapter: ScoreAdapter = {
  scaleCode: 'fine_motor',
  scaleName: '小肌肉功能发展评估',
  scoreNote:
    '总分（standard_score）为标准分，分越高越好。total_mastery_rate 为总体掌握率（0–1，越高越好）。各维度为掌握率。',
  getLongitudinalScores(studentId: number): ScoreSnapshot[] {
    const rows = new FineMotorAssessmentAPI().getStudentAssessments(studentId) ?? []
    return rows.map((r: any) => normalizeByConfig(r, fineMotorConfig)).sort(byDateAsc)
  },
}

// ---------- 声明式 object 模式：GMFM-88 ----------
const gmfm88Config: NormalizeConfig = {
  scaleCode: 'gmfm_88',
  totalScoreField: 'total_score',
  levelField: 'level',
  dimensionScoresField: 'domain_results',
  dimensionMode: 'object',
  dimensionScoreField: 'percentage', // domain_results 每项含 percentage（各能区百分比得分）
  dimensionNameField: 'dimensionName',
  dimensionLabels: { A: 'A区 卧位与翻身', B: 'B区 坐位', C: 'C区 爬与跪', D: 'D区 站立', E: 'E区 走、跑、跳' },
}
const gmfm88Adapter: ScoreAdapter = {
  scaleCode: 'gmfm_88',
  scaleName: '粗大运动功能评估量表（GMFM-88）',
  scoreNote:
    '总分（total_score，0–100%）为百分比得分，分越高运动能力越好。各能区（A 卧位与翻身 / B 坐位 / C 爬与跪 / D 站立 / E 走跑跳）同为百分比，分越高越好。',
  getLongitudinalScores(studentId: number): ScoreSnapshot[] {
    const rows = new Gmfm88AssessmentAPI().getStudentAssessments(studentId) ?? []
    return rows.map((r: any) => normalizeByConfig(r, gmfm88Config)).sort(byDateAsc)
  },
}

// ---------- 声明式 column + object 混合：TGMD-3 ----------
const tgmd3Adapter: ScoreAdapter = {
  scaleCode: 'tgmd_3',
  scaleName: '大肌肉运动发展评估（TGMD-3）',
  scoreNote:
    '总分（total_score）为原始分标准分，分越高越好。位移技能（locomotor）与球类技能（ball_skills）为分项标准分。total_percent 为百分位（越高越好）。',
  getLongitudinalScores(studentId: number): ScoreSnapshot[] {
    const rows = new Tgmd3AssessmentAPI().getStudentAssessments(studentId) ?? []
    // TGMD-3 分项在独立列，维度详情在 domain_results JSON
    return rows.map((r: any) => ({
      assessId: r.id,
      date: r.created_at,
      ageMonths: Number(r.age_months) || 0,
      totalScore: Number(r.total_score) || 0,
      level: String(r.level ?? ''),
      dimensionScores: { 位移技能: Number(r.locomotor_score) || 0, 球类技能: Number(r.ball_skills_score) || 0 },
      extra: { total_percent: Number(r.total_percent) || 0, locomotor_percent: Number(r.locomotor_percent) || 0, ball_skills_percent: Number(r.ball_skills_percent) || 0 },
    })).sort(byDateAsc)
  },
}

// ---------- SM（社会成熟）：只有总分，无维度 ----------
const smAdapter: ScoreAdapter = {
  scaleCode: 'sm',
  scaleName: '婴儿-初中生社会生活能力量表（S-M）',
  scoreNote:
    '总分（sq_score，标准分）为标准化得分，分越高社会生活能力越强。注意：按年龄阶段分段评定，跨年龄段对比需结合年龄变化解读。',
  getLongitudinalScores(studentId: number): ScoreSnapshot[] {
    const rows = new SMAssessmentAPI().getStudentAssessments(studentId) ?? []
    // SM 无独立维度分，无 age_months（按 age_stage 分段）
    return rows.map((r: any) => ({
      assessId: r.id,
      date: r.created_at,
      ageMonths: 0,
      totalScore: Number(r.sq_score) || 0,
      level: String(r.level ?? ''),
      dimensionScores: {},
    })).sort(byDateAsc)
  },
}

// ---------- ABC（孤独症行为量表）：dimension_scores 是 { 维度code: 原始分 } ----------
// ABC/ATEC 无独立 API 类（Driver 直接 SQL 写入），适配器内直接查库（db.all 返回对象数组）。
const abcConfig: NormalizeConfig = {
  scaleCode: 'abc',
  totalScoreField: 'total_score',
  levelField: 'level',
  dimensionScoresField: 'dimension_scores',
  dimensionMode: 'flat-number', // { sensory: 15, relating: 20, ... }
}
const abcAdapter: ScoreAdapter = {
  scaleCode: 'abc',
  scaleName: '孤独症行为量表（ABC）',
  scoreNote:
    '总分（total_score，0–157）为加权原始分，分越高孤独症相关行为越突出：≥67 筛查界值、总分配套 normal/borderline/mild/moderate/severe。五维度 key 对照：sensory=感觉、relating=交往、body_object=躯体运动、language=语言、social_self_help=生活自理，各维度分越高该类行为越突出。',
  getLongitudinalScores(studentId: number): ScoreSnapshot[] {
    const db = getDatabase()
    const rows = db.all(
      'SELECT id, student_id, age_months, dimension_scores, total_score, level, created_at FROM abc_assess WHERE student_id = ? ORDER BY created_at ASC',
      [studentId]
    ) ?? []
    return rows.map((r: any) => normalizeByConfig(r, abcConfig)).sort(byDateAsc)
  },
}

// ---------- ATEC（孤独症治疗评估量表）：subscale_scores 是 { 分量表code: 原始分 } ----------
const atecConfig: NormalizeConfig = {
  scaleCode: 'atec',
  totalScoreField: 'total_score',
  levelField: 'level',
  dimensionScoresField: 'subscale_scores',
  dimensionMode: 'flat-number', // { speech: 10, sociability: 15, ... }
}
const atecAdapter: ScoreAdapter = {
  scaleCode: 'atec',
  scaleName: '孤独症治疗评估量表（ATEC）',
  scoreNote:
    '总分（total_score，0–179）为四分量表原始分之和，分越高症状越重（干预后总分下降=改善）：≤30 minimal、31–50 mild、51–80 moderate、>80 severe。四分量表 key 对照：speech=表达/语言沟通、sociability=社交能力、sensory=感知/认知能力、health=健康/生理/行为，各分越高该领域症状越重。适合干预前后纵向对比。',
  getLongitudinalScores(studentId: number): ScoreSnapshot[] {
    const db = getDatabase()
    const rows = db.all(
      'SELECT id, student_id, age_months, subscale_scores, total_score, level, created_at FROM atec_assess WHERE student_id = ? ORDER BY created_at ASC',
      [studentId]
    ) ?? []
    return rows.map((r: any) => normalizeByConfig(r, atecConfig)).sort(byDateAsc)
  },
}

// ==================== 适配器注册表 ====================

/** 适配器注册表。新增量表在此注册即可被 get_assessment_trend 工具发现。 */
export const SCORE_ADAPTERS: Record<string, ScoreAdapter> = {
  csirs: csirsAdapter,
  conners_psq: connersPsqAdapter,
  conners_trs: connersTrsAdapter,
  srs2: srs2Adapter,
  sdq: sdqAdapter,
  cbcl: cbclAdapter,
  brief: briefAdapter,
  weefim: weefimAdapter,
  cnbsr2016: cnbsr2016Adapter,
  fine_motor: fineMotorAdapter,
  gmfm_88: gmfm88Adapter,
  tgmd_3: tgmd3Adapter,
  sm: smAdapter,
  abc: abcAdapter,
  atec: atecAdapter,
}

/** 当前已支持纵向读取的量表代码列表（供工具 schema enum 用）。 */
export const SUPPORTED_SCALE_CODES = Object.keys(SCORE_ADAPTERS)

/**
 * 明确不支持的量表（实验性占位常模）：纵向"进步"可能是常模漂移而非真实变化。
 * 工具层在请求这些量表时返回明确拒绝信息，避免误导教师。
 */
export const UNSUPPORTED_SCALE_CODES = ['crt', 'cognitive_self']
