import type { ScaleOption } from './assessment'

/**
 * CPEP-3（PEP-3 心理教育量表·中文修订版）类型定义。
 * 能区结构：7 发展能区（施测题，P/E/F）+ 5 适应不良行为能区（观察题，A/M/S，题库原文历史名「病理」），共 139 题。
 * 数据源：export/CPEP-3/（协康会 12 能区修订结构，非 WPS 官方 10 副测验结构，不做映射）。
 *
 * 三层分离（docs/cpep3-report-design-v1.0.md）：
 *  事实层 = P/E/F 原始档位 + score_value 双存（score_level 不得被数值覆盖丢失）；
 *  规则层 = cpep3-report-engine 纯函数（常模查表/Emerging/剖面/IEP/G1-G8 校验）；
 *  AI 解释层 = 只读消费，永不回写评分、永不生成常模。
 */

export const CPEP3_DEVELOPMENTAL_DOMAIN_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const

export type Cpep3DevelopmentalDomainCode = typeof CPEP3_DEVELOPMENTAL_DOMAIN_CODES[number]

export const CPEP3_PATHOLOGICAL_DOMAIN_CODES = ['H', 'I', 'J', 'K', 'L'] as const

export type Cpep3PathologicalDomainCode = typeof CPEP3_PATHOLOGICAL_DOMAIN_CODES[number]

export type Cpep3DomainCode = Cpep3DevelopmentalDomainCode | Cpep3PathologicalDomainCode

export type Cpep3ItemType = 'administered' | 'rated'

/** 施测题评分档（4 道非标准档题可能只有 P 或 P,E） */
export type Cpep3AdministeredLevel = 'P' | 'E' | 'F'

/** 观察题评分档：A 适当 / M 轻微 / S 严重 */
export type Cpep3RatedLevel = 'A' | 'M' | 'S'

export type Cpep3Level = Cpep3AdministeredLevel | Cpep3RatedLevel

export interface Cpep3DomainMeta {
  code: Cpep3DomainCode
  name: string
  /** 'pathological' 为持久化 JSON 既有值（历史名）；UI/报告层统一呈现为「适应不良行为」（任务书 §三） */
  kind: 'developmental' | 'pathological'
}

export interface Cpep3ScoreLevelOption {
  level: Cpep3Level
  desc: string
  /** 施测题: P=2 / E=1 / F=0（任务书 §2.2 固定映射；规则层常模换算输入仍为 P 通过计数，E 不计入通过数）；观察题严重度分: A=0 / M=1 / S=2 */
  score: 0 | 1 | 2
}

/** 任务书 §2.2 统一数值映射（规则层唯一真源，禁止散落硬编码） */
export const CPEP3_ADMINISTERED_SCORE: Record<Cpep3AdministeredLevel, 0 | 1 | 2> = { P: 2, E: 1, F: 0 }
/** 观察题严重度分（docs/maladaptive-score-direction-audit.md：方向已核实，分值越高观察到的适应不良行为越多） */
export const CPEP3_RATED_SCORE: Record<Cpep3RatedLevel, 0 | 1 | 2> = { A: 0, M: 1, S: 2 }

export interface Cpep3QuestionData {
  id: number
  /** 题号（带 * 前缀的为手册「学能测试项目」标记，保留原样） */
  codeNo: string
  domainCode: Cpep3DomainCode
  domainName: string
  itemType: Cpep3ItemType
  taskName: string
  materialDesc: string
  procedureDesc: string
  standardDesc: string
  /** 按题动态给档（91 题 P/E/F、1 题 P、3 题 P/E、44 题 A/M/S） */
  scoreLevels: Cpep3ScoreLevelOption[]
}

/** 分能区常模行：通过项目数 → 发展当量月龄区间 */
export interface Cpep3PgNormRow {
  domainCode: Cpep3DevelopmentalDomainCode
  domainName: string
  /** 如 "22-29"（月），区间相互搭接属设计，取中值为 DA */
  monthRange: string
  passCount: number
}

/** 总量常模行：总通过项目数（0-95）→ 总发展当量月龄区间。
 *  源字段名 developmentalQuotient 是误称（值域 0-95 连续递增即总通过数），入库时已纠正语义。 */
export interface Cpep3GnNormRow {
  totalPassCount: number
  monthRange: string
}

export interface Cpep3DomainResult {
  domainCode: Cpep3DomainCode
  domainName: string
  kind: 'developmental' | 'pathological'
  /** 施测题通过数（P 计数） */
  passCount?: number
  /** 萌发技能数（E 计数，不计入通过数） */
  emergingCount?: number
  /** 发展当量月龄区间原文（如 "22-29"）——协康会中文版源表原样保留 */
  monthRange?: string
  /** 区间下界（月） */
  daLowerMonths?: number | null
  /** 区间上界（月） */
  daUpperMonths?: number | null
  /** DA 取值方法：区间中值 = 派生估计，非官方精确 DA */
  daMethod?: 'INTERVAL_MIDPOINT'
  /** 区间中值（DA，月）——派生估计；无常模档命中时为 null（不落 0，任务书 §六口径） */
  developmentalAgeMonths?: number | null
  /** 派生 DQ = DA / CA_months × 100（非官方规范分数）；DA 为 null 时同为 null（不虚算） */
  dq?: number | null
  /** A/M/S 计数（仅适应不良行为能区） */
  ratedCounts?: { A: number; M: number; S: number }
  /** 观察题严重度分 Σ(0/1/2)（仅适应不良行为能区） */
  severityScore?: number
}

export type Cpep3ScoreLevelValue = 0 | 1 | 2

/** ============ 报告数据合同（docs/cpep3-report-design-v1.0.md §2，任务书 §四） ============ */

/** 能区大类：发展 / 适应不良行为 / 照顾者报告（照顾者暂无数据源，见 data-audit §3，保留合同扩展位） */
export type Cpep3DomainCategory = 'developmental' | 'maladaptive' | 'caregiver'

/** 能区结果的规则层视图（= Cpep3DomainResult + 报告合同字段，normalize 后的统一形态） */
export interface Cpep3SubtestResult {
  domainCode: Cpep3DomainCode
  name: string
  category: Cpep3DomainCategory
  /** 原始分（任务书 G8 汇总口径）：发展能区=Σ score_value（P=2/E=1 计入，F=0）；适应不良行为能区=严重度分 Σ(0/1/2) */
  rawScore: number
  /** 满档分值 = 该能区题数 × 2（发展/适应不良同式）；完成度剖面按 pCount/已答数 另算 */
  maxRawScore: number
  pCount: number
  eCount: number
  fCount: number
  /** 恒 null 直至录入合法百分位常模（getNormativeResult source=not_available） */
  percentile: number | null
  /** 发展当量月中值（pg 区间中值，派生估计）；适应不良行为/照顾者能区恒 null（前端显示「不适用」） */
  developmentalAgeMonths: number | null
  /** 发展当量月龄区间原文（如 "22-29"），无则 null */
  developmentalAgeRange: string | null
  standardScore: number | null
  classification: string | null
  /** A/M/S 计数（仅适应不良行为能区） */
  ratedCounts?: { A: number; M: number; S: number }
  /** 观察题题数（仅适应不良行为能区） */
  ratedItemCount?: number
}

/** Emerging Skill（任务书 §八）：唯一来源 scoreLevel==='E'，AI 不参与判断 */
export interface Cpep3EmergingSkill {
  questionId: number
  codeNo: string
  skillName: string
  domainCode: Cpep3DomainCode
  teachingDomain: string
  scoreLevel: 'E'
  suggestedGoal: string
}

/** 相对优势（任务书 §十，措辞白名单约束） */
export interface Cpep3Strength {
  domainCode: Cpep3DomainCode
  domainName: string
  passRate: number
  pCount: number
  itemCount: number
  /** 白名单措辞描述 */
  summary: string
}

/** 需要支持的技能（任务书 §九：F 项，与 E 相邻优先） */
export interface Cpep3SupportNeed {
  questionId: number
  codeNo: string
  taskName: string
  domainCode: Cpep3DomainCode
  domainName: string
  /** 排序来源：同能区存在 E 项（相邻优先）或一般 F 项 */
  priority: 'adjacent_to_emerging' | 'general'
  suggestedGoal: string
}

/** IEP 目标（任务书 §十四/十五，可测量句式） */
export interface Cpep3IepGoal {
  domainName: string
  currentPerformance: string
  goalText: string
  criteria: string
  promptLevel: string
  setting: string
  sourceQuestionIds: number[]
}

/** IEP 三级结构（任务书 §十四：A 优先 3-5 / B 次级 5-8 / C 家庭泛化） */
export interface Cpep3IepPlan {
  priority: Cpep3IepGoal[]
  secondary: Cpep3IepGoal[]
  familyGeneralization: string[]
  /** 照顾者报告未配置时的明示局限说明（data-audit §3） */
  caregiverNote: string
}

/** 发展剖面视图数据（任务书 §十一：完成度百分比 ≠ 百分位） */
export interface Cpep3ProfileView {
  /** metric: 'completion_pct' 固定——UI 标注「完成度/得分比例」，禁止冒充百分位 */
  metric: 'completion_pct'
  domains: Array<{
    domainCode: Cpep3DomainCode
    domainName: string
    completionPct: number
    developmentalAgeRange: string | null
  }>
}

/** 常模查询统一出口（任务书 §六） */
export interface Cpep3NormativeResult {
  percentile: number | null
  developmentalAgeMonths: number | null
  standardScore: number | null
  source: 'authorized_norm_table' | 'not_available'
}

/** 报告快照（任务书 §二十）：persist 时冻结，历史报告不可变 */
export interface Cpep3ReportSnapshot {
  reportVersion: string
  scoringVersion: string
  generatedAt: string
  itemResults: Array<{
    questionId: number
    codeNo: string
    itemType: Cpep3ItemType
    domainCode: Cpep3DomainCode
    scoreLevel: Cpep3Level
    scoreValue: 0 | 1 | 2
  }>
  subtestResults: Cpep3SubtestResult[]
  total: {
    passCount: number
    emergingCount: number
    monthRange: string
    daMidpointMonths: number
  }
  normative: {
    source: 'authorized_norm_table' | 'not_available'
    percentile: null
    standardScore: null
    daByDomain: Record<string, { range: string; midpoint: number } | null>
  }
  emergingSkills: Cpep3EmergingSkill[]
  strengths: Cpep3Strength[]
  supportNeeds: Cpep3SupportNeed[]
  maladaptiveOverview: Array<{
    domainCode: Cpep3DomainCode
    domainName: string
    ratedCounts: { A: number; M: number; S: number }
    severityScore: number
    note: string
  }>
  iepPlan: Cpep3IepPlan
  profile: Cpep3ProfileView
  summary: string
  limitations: string
}

/** G1-G8 自动校验结果（任务书 §二十一） */
export interface Cpep3ValidationIssue {
  code: 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7' | 'G8'
  message: string
}

export interface Cpep3ValidationResult {
  ok: boolean
  issues: Cpep3ValidationIssue[]
}

/** 作答选项（ScaleOption 兼容：value=档位序号, score=计分） */
export interface Cpep3AnswerOption extends ScaleOption {
  value: number
  score: Cpep3ScoreLevelValue
  level: Cpep3Level
}
