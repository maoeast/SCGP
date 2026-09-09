/**
 * CPEP-3 报告引擎（规则层，纯函数、无 DB 依赖）——docs/cpep3-report-design-v1.0.md §1。
 *
 * 三层分离：事实层（作答 P/E/F + 分值双存）→ 规则层（本模块：常模查表 / Emerging / 剖面 / IEP / G1-G8 校验）
 * → AI 解释层（只读消费快照，永不回写评分、永不生成常模）。
 *
 * 常模纪律（任务书 §六）：百分位/标准分恒 null（当前无合法常模表，source=not_available）；
 * 发展当量仅来自 pg/gn 常模查表（授权常模 source=authorized_norm_table）；禁止插值/拟合/AI 补表。
 * Emerging 纪律（任务书 §八）：唯一来源 scoreLevel==='E'，AI 不参与判断。
 */
import {
  CPEP3_DEVELOPMENTAL_DOMAIN_CODES,
  CPEP3_PATHOLOGICAL_DOMAIN_CODES,
  type Cpep3DevelopmentalDomainCode,
  type Cpep3DomainCategory,
  type Cpep3DomainCode,
  type Cpep3EmergingSkill,
  type Cpep3IepGoal,
  type Cpep3IepPlan,
  type Cpep3ItemType,
  type Cpep3Level,
  type Cpep3NormativeResult,
  type Cpep3ProfileView,
  type Cpep3ReportSnapshot,
  type Cpep3Strength,
  type Cpep3SubtestResult,
  type Cpep3SupportNeed,
  type Cpep3ValidationIssue,
  type Cpep3ValidationResult,
} from '@/types/cpep_3'

/** 报告版本（任务书 §二十：快照必须携带版本，算法演进后旧报告不可变） */
export const CPEP3_REPORT_VERSION = 'cpep3-report-v1.0'
export const CPEP3_SCORING_VERSION = 'cpep3-scoring-v1.0'

/** ============ 输入合同 ============ */

/** 单题作答事实（事实层唯一输入；level 与 value 必须成对） */
export interface Cpep3ItemAnswer {
  questionId: number
  codeNo: string
  taskName: string
  domainCode: Cpep3DomainCode
  /** 能区显示名（报告措辞用，Driver 从题库填入） */
  domainName: string
  itemType: Cpep3ItemType
  scoreLevel: Cpep3Level
  scoreValue: 0 | 1 | 2
}

/** 常模查表函数形态（Driver 传入 pg/gn 查表，保持本模块无数据依赖） */
export interface Cpep3NormLookup {
  /** 分能区：通过数 → 发展当量月龄区间（仅发展能区有意义） */
  lookupPg(domain: Cpep3DevelopmentalDomainCode, passCount: number): { monthRange: string } | undefined
  /** 总量：总通过数 → 总发展当量月龄区间 */
  lookupGn(totalPassCount: number): { monthRange: string } | undefined
}

/** 报告输入 */
export interface Cpep3ReportInput {
  itemAnswers: Cpep3ItemAnswer[]
  /** 能区题数上限（发展能区=施测题数；适应不良行为=观察题数） */
  domainItemTotals: Record<Cpep3DomainCode, number>
  /** 能区名映射 */
  domainNames: Record<Cpep3DomainCode, string>
  normLookup: Cpep3NormLookup
  /** 总发展当量区间原文（gn 查表） */
  totalMonthRange: string
  /** 总发展当量月中值（gn 区间中值，派生估计） */
  totalDaMidpointMonths: number
  generatedAt?: string
}

/** ============ 常模查询（任务书 §六 getNormativeResult） ============ */

/**
 * 统一常模出口：发展能区按 pg 查表得 DA 区间/中值（source=authorized_norm_table）；
 * 适应不良行为/照顾者能区一律 null + not_available（UI 显示「不适用」）。
 * 百分位/标准分恒 null——当前系统无该指标合法常模表，禁止推算。
 */
export function getNormativeResult(
  domain: Cpep3DomainCode,
  passCount: number,
  normLookup: Cpep3NormLookup,
): Cpep3NormativeResult & { daRange: string | null } {
  const isDevelopmental = (CPEP3_DEVELOPMENTAL_DOMAIN_CODES as readonly string[]).includes(domain)
  if (!isDevelopmental) {
    return { percentile: null, developmentalAgeMonths: null, standardScore: null, source: 'not_available', daRange: null }
  }
  const row = normLookup.lookupPg(domain as Cpep3DevelopmentalDomainCode, passCount)
  if (!row) {
    return { percentile: null, developmentalAgeMonths: null, standardScore: null, source: 'not_available', daRange: null }
  }
  return {
    percentile: null,
    developmentalAgeMonths: monthRangeMidpoint(row.monthRange),
    standardScore: null,
    source: 'authorized_norm_table',
    daRange: row.monthRange,
  }
}

/** 月龄区间中值："22-29" → 25.5（与 cpep3-scoring 同口径，本地实现避免跨模块循环依赖） */
export function monthRangeMidpoint(range: string): number {
  const parts = range.split('-')
  const lo = Number(parts[0])
  const hi = Number(parts[1])
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 0
  return (lo + hi) / 2
}

/** ============ 能区结果归一化（任务书 §四 SubtestResult） ============ */

/**
 * 作答事实 → 12 能区报告合同形态。
 * rawScore 语义全出口统一（任务书 §四/G8 汇总口径）：
 * - 发展能区 rawScore = Σ score_value（P=2/E=1 计入，F=0）；maxRawScore = 题数×2。
 * - 适应不良行为能区 rawScore = 严重度分 Σ(0/1/2)；maxRawScore = 题数×2。
 * - 发展年龄：仅发展能区可查 pg 表；适应不良行为能区强制 null（UI 显示「不适用」，任务书 §五）。
 * 注：常模换算输入仍是 P 通过数（Cpep3Driver 的既有口径）；此处 rawScore 是报告合同汇总口径。
 */
export function buildSubtestResults(input: Cpep3ReportInput): Cpep3SubtestResult[] {
  const byDomain = new Map<Cpep3DomainCode, Cpep3ItemAnswer[]>()
  for (const answer of input.itemAnswers) {
    const list = byDomain.get(answer.domainCode) ?? []
    list.push(answer)
    byDomain.set(answer.domainCode, list)
  }

  const allCodes: Cpep3DomainCode[] = [...CPEP3_DEVELOPMENTAL_DOMAIN_CODES, ...CPEP3_PATHOLOGICAL_DOMAIN_CODES]
  const results: Cpep3SubtestResult[] = []
  for (const code of allCodes) {
    const items = byDomain.get(code) ?? []
    const isDevelopmental = (CPEP3_DEVELOPMENTAL_DOMAIN_CODES as readonly string[]).includes(code)
    let rawScore = 0
    let pCount = 0
    let eCount = 0
    let fCount = 0
    let ratedCounts: { A: number; M: number; S: number } | undefined

    if (isDevelopmental) {
      for (const it of items) {
        if (it.scoreLevel === 'P') { pCount++; rawScore += it.scoreValue }
        else if (it.scoreLevel === 'E') { eCount++; rawScore += it.scoreValue }
        else if (it.scoreLevel === 'F') fCount++
      }
    } else {
      ratedCounts = { A: 0, M: 0, S: 0 }
      for (const it of items) {
        if (it.scoreLevel === 'A') ratedCounts.A++
        else if (it.scoreLevel === 'M') ratedCounts.M++
        else if (it.scoreLevel === 'S') ratedCounts.S++
        rawScore += it.scoreValue
      }
    }

    // rawScore 语义（任务书 §四/G8）：发展能区 = Σ score_value（P=2/E=1，直接来自 item 分值汇总）；
    // 适应不良行为能区 = 严重度分 Σ(0/1/2)。maxRawScore = 满档分值 = 题数×2（完成度剖面仍按 pCount/题数 计算）。
    const normative = getNormativeResult(code, pCount, input.normLookup)
    const rawScoreSum = rawScore
    const maxRawScore = (input.domainItemTotals[code] ?? 0) * 2
    results.push({
      domainCode: code,
      name: input.domainNames[code] ?? code,
      category: isDevelopmental ? 'developmental' : 'maladaptive',
      rawScore: rawScoreSum,
      maxRawScore,
      pCount,
      eCount,
      fCount,
      percentile: normative.percentile,
      developmentalAgeMonths: normative.developmentalAgeMonths,
      developmentalAgeRange: normative.daRange,
      standardScore: normative.standardScore,
      classification: null,
      ratedCounts,
      ratedItemCount: isDevelopmental ? undefined : items.length,
    })
  }
  return results
}

/** ============ Emerging Skills（任务书 §八：唯一来源 scoreLevel==='E'） ============ */

/** 能区 → 教学领域名（报告措辞） */
function teachingDomainOf(domainName: string): string {
  return `${domainName}领域`
}

export function getEmergingSkills(itemAnswers: Cpep3ItemAnswer[]): Cpep3EmergingSkill[] {
  return itemAnswers
    .filter((it) => it.scoreLevel === 'E')
    .map((it) => ({
      questionId: it.questionId,
      codeNo: it.codeNo,
      skillName: it.taskName,
      domainCode: it.domainCode,
      teachingDomain: teachingDomainOf(it.domainName || it.domainCode),
      scoreLevel: 'E' as const,
      suggestedGoal: buildEmergingGoalSuggestion(it),
    }))
}

/** E 项教学意义模板（规则文案，非 AI 生成；任务书 §十六 AI 只做解释不判级） */
function buildEmergingGoalSuggestion(item: Cpep3ItemAnswer): string {
  return `「${item.taskName}」已出现明确萌发表现（在提示或部分支持下可完成），是近期教学介入的最佳切入点，建议优先安排结构化练习并逐步撤除提示。`
}

/** ============ 相对优势（任务书 §十：措辞白名单） ============ */

/** 通过率门槛：≥50% 才列入相对优势；最多 2 个 */
const STRENGTH_MIN_PASS_RATE = 0.5
const STRENGTH_MAX_COUNT = 2

export function getStrengths(subtestResults: Cpep3SubtestResult[]): Cpep3Strength[] {
  // 通过率按「通过数/题数」计算（非分值比——maxRawScore 是满档分值 题数×2）
  const devResults = subtestResults.filter(
    (r) => r.category === 'developmental' && r.ratedItemCount === undefined && r.pCount + r.eCount + r.fCount > 0,
  )
  const ranked = [...devResults]
    .map((r) => ({ result: r, passRate: r.pCount / (r.pCount + r.eCount + r.fCount) }))
    .filter((x) => x.passRate >= STRENGTH_MIN_PASS_RATE)
    .sort((a, b) => b.passRate - a.passRate)
    .slice(0, STRENGTH_MAX_COUNT)

  return ranked.map(({ result, passRate }) => ({
    domainCode: result.domainCode,
    domainName: result.name,
    passRate: Number((passRate * 100).toFixed(1)),
    pCount: result.pCount,
    itemCount: result.pCount + result.eCount + result.fCount,
    summary: `${result.name}领域通过 ${result.pCount}/${result.pCount + result.eCount + result.fCount} 项，当前较稳定掌握，属相对优势能区。`,
  }))
}

/** ============ 需要支持的技能（任务书 §九：F 项，与 E 相邻优先） ============ */

/** 上限：报告页展示条数 */
const SUPPORT_NEEDS_MAX = 12

export function getSupportNeeds(itemAnswers: Cpep3ItemAnswer[], domainNames: Record<Cpep3DomainCode, string>): Cpep3SupportNeed[] {
  const emergingDomains = new Set(
    itemAnswers.filter((it) => it.scoreLevel === 'E').map((it) => it.domainCode),
  )
  const adjacent: Cpep3SupportNeed[] = []
  const general: Cpep3SupportNeed[] = []
  for (const it of itemAnswers) {
    if (it.scoreLevel !== 'F') continue
    const isAdjacent = emergingDomains.has(it.domainCode)
    const need: Cpep3SupportNeed = {
      questionId: it.questionId,
      codeNo: it.codeNo,
      taskName: it.taskName,
      domainCode: it.domainCode,
      domainName: domainNames[it.domainCode] ?? it.domainCode,
      priority: isAdjacent ? 'adjacent_to_emerging' : 'general',
      suggestedGoal: isAdjacent
        ? `与萌发技能相邻，可尝试在密集提示下引入「${it.taskName}」的分解步骤练习。`
        : `「${it.taskName}」当前尚未表现，建议先夯实同能区萌发技能后再引入。`,
    }
    ;(isAdjacent ? adjacent : general).push(need)
  }
  return [...adjacent, ...general].slice(0, SUPPORT_NEEDS_MAX)
}

/** ============ IEP 推荐（任务书 §十四/十五） ============ */

/** 数量边界（任务书 §十四）：优先目标 3-5 个、次级目标 5-8 个；不足时按实际数量给出（下限为软约束，报告页有说明文案） */
const IEP_PRIORITY_MAX = 5
const IEP_SECONDARY_MAX = 8

/** 按能区给出的提示等级模板（规则文案；教学上由浅入深） */
const PROMPT_LEVEL_BY_DOMAIN: Record<string, string> = {
  A: '示范加口语提示',
  B: '口语提示',
  C: '手把手辅助渐退至手势提示',
  D: '示范加肢体引导',
  E: '手势提示渐退至独立完成',
  F: '口语提示',
  G: '示范加口语提示',
}

function buildIepGoal(
  item: Cpep3ItemAnswer,
  domainName: string,
  currentPerformance: string,
): Cpep3IepGoal {
  const setting = item.itemType === 'administered' ? '桌面一对一教学活动' : '日常教学互动情境'
  const promptLevel = PROMPT_LEVEL_BY_DOMAIN[item.domainCode] ?? '口语提示'
  return {
    domainName,
    currentPerformance,
    goalText: `在${setting}中，在${promptLevel}下，儿童能够完成「${item.taskName}」的目标行为。`,
    criteria: '连续 3 次活动达到 80% 正确率（由教师逐次记录）。',
    promptLevel,
    setting,
    sourceQuestionIds: [item.questionId],
  }
}

/**
 * 三级 IEP 计划（任务书 §十四）：
 * - priority：全部源自 E 项（最多 5；不足 3 时按实际数量给出并说明）。
 * - secondary：相邻 F 优先（最多 8；不足 5 时按实际数量给出）。
 * - familyGeneralization：E 项生活情境化改写（照顾者报告未配置，明示局限——data-audit §3）。
 */
export function generateIepRecommendations(
  itemAnswers: Cpep3ItemAnswer[],
  domainNames: Record<Cpep3DomainCode, string>,
): Cpep3IepPlan {
  const emerging = itemAnswers.filter((it) => it.scoreLevel === 'E')
  const emergingDomains = new Set(emerging.map((it) => it.domainCode))
  const failing = itemAnswers.filter((it) => it.scoreLevel === 'F')

  // 同能区内去重聚合：priority 按能区聚合 E 项（一能区一目标，引用全部来源题）
  const emergingByDomain = new Map<Cpep3DomainCode, Cpep3ItemAnswer[]>()
  for (const it of emerging) {
    const list = emergingByDomain.get(it.domainCode) ?? []
    list.push(it)
    emergingByDomain.set(it.domainCode, list)
  }
  const priority: Cpep3IepGoal[] = []
  for (const [code, items] of emergingByDomain) {
    const first = items[0]
    if (!first) continue
    const domainName = domainNames[code] ?? code
    const goal = buildIepGoal(first, domainName, `萌发表现：${items.length} 项技能出现部分/提示下完成`)
    // 聚合目标：目标行为列举全部萌发技能（不只首题），sourceQuestionIds 引用全部来源题
    goal.goalText = `在${goal.setting}中，在${goal.promptLevel}下，儿童能够在下列萌发技能中选择 1-2 项作为本学期目标并完成对应目标行为：${items.map((it) => `「${it.taskName}」`).join('、')}。`
    goal.sourceQuestionIds = items.map((it) => it.questionId)
    priority.push(goal)
  }

  const adjacentFailing = failing.filter((it) => emergingDomains.has(it.domainCode))
  const generalFailing = failing.filter((it) => !emergingDomains.has(it.domainCode))
  const secondary: Cpep3IepGoal[] = []
  for (const it of [...adjacentFailing, ...generalFailing]) {
    if (secondary.length >= IEP_SECONDARY_MAX) break
    const domainName = domainNames[it.domainCode] ?? it.domainCode
    secondary.push(buildIepGoal(it, domainName, '当前尚未表现'))
  }

  const familyGeneralization: string[] = emerging.slice(0, 4).map((it) => {
    return `在家日常情境中自然练习「${it.taskName}」：从孩子已能部分完成的步骤开始，完成后立即具体表扬，每天 1-2 次、每次几分钟即可。`
  })

  return {
    priority: priority.slice(0, IEP_PRIORITY_MAX),
    secondary,
    familyGeneralization,
    caregiverNote: '当前系统未配置 CPEP-3 照顾者报告量表，家庭泛化建议基于萌发技能生活情境化生成，建议结合家长访谈补充。',
  }
}

/** ============ 发展剖面（任务书 §十一：完成度百分比 ≠ 百分位） ============ */

export function buildProfileView(subtestResults: Cpep3SubtestResult[]): Cpep3ProfileView {
  return {
    metric: 'completion_pct',
    domains: subtestResults
      .filter((r) => r.category === 'developmental')
      .map((r) => ({
        domainCode: r.domainCode,
        domainName: r.name,
        // 完成度 = 通过数/已答题数（P+E+F 之和；maxRawScore 是满档分值 题数×2，不作分母）
        completionPct: r.pCount + r.eCount + r.fCount > 0
          ? Number(((r.pCount / (r.pCount + r.eCount + r.fCount)) * 100).toFixed(1))
          : 0,
        developmentalAgeRange: r.developmentalAgeRange,
      })),
  }
}

/** ============ 摘要（任务书 §十七 §3：150-300 字，规则生成） ============ */

export function buildSummary(input: Cpep3ReportInput, subtestResults: Cpep3SubtestResult[], emergingSkills: Cpep3EmergingSkill[], strengths: Cpep3Strength[]): string {
  const totalPass = subtestResults.filter((r) => r.category === 'developmental').reduce((s, r) => s + r.pCount, 0)
  const totalEmerging = subtestResults.filter((r) => r.category === 'developmental').reduce((s, r) => s + r.eCount, 0)
  const topDomains = [...strengths]
  const strongestNames = topDomains.map((s) => s.domainName).join('、')
  const emergingTop = emergingSkills.slice(0, 3).map((s) => `「${s.skillName}」`).join('、')
  const parts = [
    `本次 C-PEP-3 评估中，儿童在 95 个施测项目中共通过 ${totalPass} 项，另有 ${totalEmerging} 项萌发技能，总发展当量约 ${input.totalMonthRange} 个月（常模查表区间）。`,
    strongestNames ? `相对优势：${strongestNames}领域当前较稳定掌握。` : '',
    emergingTop ? `萌发技能如 ${emergingTop} 等，提示这些能力正在发展，是近期教学介入的重点方向。` : '本次评估未发现萌发技能，建议从基础技能入手安排教学。',
    `适应不良行为部分以现场观察记录呈现（见行为观察概况），供教学安排参考。本结果服务于个别化教育计划（IEP）制定，不构成医学诊断。`,
  ]
  return parts.filter(Boolean).join('')
}

/** 评估说明与限制（任务书 §十七 §14 固定声明） */
export const CPEP3_REPORT_LIMITATIONS = '儿童的表现可能受到环境、情绪、熟悉程度、注意状态及评估当天身体状况等因素影响。本结果应结合持续观察、教师记录和照顾者报告综合解释。本评估为教育评估工具，服务于个别化教育计划与教学干预设计，不作为独立医学诊断依据。'

/** ============ G1-G8 自动校验（任务书 §二十一） ============ */

export function validateCpep3Report(
  itemAnswers: Cpep3ItemAnswer[],
  snapshot: Cpep3ReportSnapshot,
): Cpep3ValidationResult {
  const issues: Cpep3ValidationIssue[] = []
  const push = (code: Cpep3ValidationIssue['code'], message: string) => issues.push({ code, message })

  const knownIds = new Set(itemAnswers.map((it) => it.questionId))
  const answerById = new Map(itemAnswers.map((it) => [it.questionId, it]))

  // G2: level 与 value 映射一致（P=2/E=1/F=0；A=0/M=1/S=2）+ itemResults 与事实层逐项比对（防篡改/缺失/重复/替换）
  const ADMIN_EXPECT: Record<string, 0 | 1 | 2> = { P: 2, E: 1, F: 0 }
  const RATED_EXPECT: Record<string, 0 | 1 | 2> = { A: 0, M: 1, S: 2 }
  const seenSnapshotIds = new Set<number>()
  for (const it of snapshot.itemResults) {
    const expected = it.itemType === 'administered' ? ADMIN_EXPECT[it.scoreLevel] : RATED_EXPECT[it.scoreLevel]
    if (expected === undefined || it.scoreValue !== expected) {
      push('G2', `item ${it.codeNo}: scoreLevel=${it.scoreLevel} 与 scoreValue=${it.scoreValue} 不一致`)
    }
    if (seenSnapshotIds.has(it.questionId)) {
      push('G2', `itemResults 含重复 itemId ${it.questionId}（${it.codeNo}）`)
    }
    seenSnapshotIds.add(it.questionId)
    const fact = answerById.get(it.questionId)
    if (!fact) {
      push('G2', `itemResults 含事实层不存在的 itemId ${it.questionId}（${it.codeNo}）`)
    } else if (
      fact.scoreLevel !== it.scoreLevel || fact.scoreValue !== it.scoreValue
      || fact.codeNo !== it.codeNo || fact.itemType !== it.itemType
      || fact.domainCode !== it.domainCode
    ) {
      push('G2', `item ${it.codeNo} 与事实层作答不一致（level/value/codeNo/itemType/domainCode 有出入）`)
    }
  }
  if (snapshot.itemResults.length !== itemAnswers.length) {
    push('G2', `itemResults 题数 ${snapshot.itemResults.length} ≠ 事实层作答题数 ${itemAnswers.length}`)
  }

  // 能区完整性：12 能区必须各出现一次，category 与规范能区一致（防能区缺失/重复/错类）
  const expectedCategory = new Map<Cpep3DomainCode, Cpep3DomainCategory>()
  for (const c of CPEP3_DEVELOPMENTAL_DOMAIN_CODES) expectedCategory.set(c, 'developmental')
  for (const c of CPEP3_PATHOLOGICAL_DOMAIN_CODES) expectedCategory.set(c, 'maladaptive')
  const seenDomains = new Map<string, number>()
  for (const sub of snapshot.subtestResults) {
    seenDomains.set(sub.domainCode, (seenDomains.get(sub.domainCode) ?? 0) + 1)
    const expected = expectedCategory.get(sub.domainCode)
    if (!expected) {
      push('G1', `subtestResults 含规范外能区 ${sub.domainCode}`)
    } else if (sub.category !== expected) {
      push('G1', `能区 ${sub.domainCode} category=${sub.category} ≠ 规范 ${expected}`)
    }
  }
  for (const [code, count] of expectedCategory) {
    const seen = seenDomains.get(code) ?? 0
    if (seen === 0) push('G1', `缺少能区结果 ${code}`)
    else if (seen > 1) push('G1', `能区 ${code} 重复出现 ${seen} 次`)
  }

  // G3: 发展年龄只允许出现在发展能区
  for (const sub of snapshot.subtestResults) {
    if (sub.category !== 'developmental' && sub.developmentalAgeMonths !== null) {
      push('G3', `非发展能区 ${sub.domainCode} 出现发展年龄 ${sub.developmentalAgeMonths}`)
    }
  }

  // G4/G5: 无合法常模来源不得生成 percentile/standardScore
  for (const sub of snapshot.subtestResults) {
    if (sub.percentile !== null) push('G4', `能区 ${sub.domainCode} 在无常模来源下生成 percentile`)
    if (sub.standardScore !== null) push('G5', `能区 ${sub.domainCode} 在无常模来源下生成 standardScore`)
  }

  // G6: Emerging 全部为 E 项
  for (const skill of snapshot.emergingSkills) {
    const item = itemAnswers.find((it) => it.questionId === skill.questionId)
    if (!item || item.scoreLevel !== 'E') {
      push('G6', `emergingSkill ${skill.codeNo} 非 E 项`)
    }
  }

  // G7: IEP 引用的 itemId 必须存在
  for (const goal of [...snapshot.iepPlan.priority, ...snapshot.iepPlan.secondary]) {
    for (const qid of goal.sourceQuestionIds) {
      if (!knownIds.has(qid)) push('G7', `IEP 目标引用不存在的 itemId ${qid}`)
    }
  }

  // G8: 报告 rawScore 与 item 汇总一致（发展能区 pCount、适应不良 severity 两向校验）
  for (const sub of snapshot.subtestResults) {
    const items = itemAnswers.filter((it) => it.domainCode === sub.domainCode)
    if (sub.category === 'developmental') {
      // 分值汇总两向校验（rawScore=Σscore_value，P=2/E=1）
      const valueSum = items.reduce((s, it) => s + it.scoreValue, 0)
      if (valueSum !== sub.rawScore) {
        push('G8', `能区 ${sub.domainCode} rawScore 汇总不一致: 明细分值和 ${valueSum} ≠ 报告 ${sub.rawScore}`)
      }
      const passSum = items.filter((it) => it.scoreLevel === 'P').length
      if (passSum !== sub.pCount) {
        push('G8', `能区 ${sub.domainCode} 通过数汇总不一致: 明细 P 计数 ${passSum} ≠ 报告 ${sub.pCount}`)
      }
      const emergingSum = items.filter((it) => it.scoreLevel === 'E').length
      if (emergingSum !== sub.eCount) {
        push('G8', `能区 ${sub.domainCode} 萌发数汇总不一致: 明细 E 计数 ${emergingSum} ≠ 报告 ${sub.eCount}`)
      }
      const failSum = items.filter((it) => it.scoreLevel === 'F').length
      if (failSum !== sub.fCount) {
        push('G8', `能区 ${sub.domainCode} 未表现数汇总不一致: 明细 F 计数 ${failSum} ≠ 报告 ${sub.fCount}`)
      }
      // G8 补充：满分档时 rawScore 必须等于 maxRawScore（题数×2），不得出现超满分
      if (sub.rawScore > sub.maxRawScore) {
        push('G8', `能区 ${sub.domainCode} rawScore ${sub.rawScore} 超过满分档 ${sub.maxRawScore}`)
      }
    } else {
      const sevSum = items.reduce((s, it) => s + it.scoreValue, 0)
      if (sevSum !== sub.rawScore) {
        push('G8', `能区 ${sub.domainCode} 严重度分汇总不一致: 明细 ${sevSum} ≠ 报告 ${sub.rawScore}`)
      }
    }
  }

  // 防御：快照 total 与能区求和一致（G8 补充：总通过数 + 总萌发数）
  const devSubs = snapshot.subtestResults.filter((r) => r.category === 'developmental')
  const passTotal = devSubs.reduce((s, r) => s + r.pCount, 0)
  if (passTotal !== snapshot.total.passCount) {
    push('G8', `总通过数不一致: 能区求和 ${passTotal} ≠ 快照 ${snapshot.total.passCount}`)
  }
  const emergingTotal = devSubs.reduce((s, r) => s + r.eCount, 0)
  if (emergingTotal !== snapshot.total.emergingCount) {
    push('G8', `总萌发数不一致: 能区求和 ${emergingTotal} ≠ 快照 ${snapshot.total.emergingCount}`)
  }

  return { ok: issues.length === 0, issues }
}

/** ============ 快照组装（任务书 §二十） ============ */

/** G1 校验：作答引用不存在的题目 + 全量施测漏答检查（CPEP-3 无 basal/ceiling，139 题必须全部作答） */
export function validateItemAnswers(
  itemAnswers: Cpep3ItemAnswer[],
  validQuestionIds: Set<number>,
  requireFullCoverage = true,
): Cpep3ValidationIssue[] {
  const issues: Cpep3ValidationIssue[] = []
  const answered = new Set<number>()
  for (const it of itemAnswers) {
    if (!validQuestionIds.has(it.questionId)) {
      issues.push({ code: 'G1', message: `itemId ${it.questionId}（${it.codeNo}）不在题库中` })
    }
    if (answered.has(it.questionId)) {
      issues.push({ code: 'G1', message: `itemId ${it.questionId}（${it.codeNo}）重复作答` })
    }
    answered.add(it.questionId)
  }
  if (requireFullCoverage) {
    for (const qid of validQuestionIds) {
      if (!answered.has(qid)) {
        issues.push({ code: 'G1', message: `itemId ${qid} 未作答（CPEP-3 全量表施测，不允许漏答）` })
      }
    }
  }
  return issues
}

/** 题库全集题数（G1 全量覆盖校验的开关阈值：传入集合达到该值才启用漏答检查，避免单测局部作答误报） */
export const CPEP3_FULL_ITEM_COUNT = 139

/** 报告快照组装入口：作答事实 → 全部报告合同 → G1-G8 校验（失败抛错，调用方不得持久化）。
/** 报告快照组装入口：作答事实 → 全部报告合同 → G1-G8 校验（失败抛错，调用方不得持久化）。
 *  validQuestionIds 传入题库全集时同时做 G1 漏答/重复作答校验（CPEP-3 全量表 139 题施测）；
 *  单测等局部作答场景可不传或传作答子集。 */
export function buildCpep3Report(input: Cpep3ReportInput, validQuestionIds?: Set<number>): Cpep3ReportSnapshot {
  if (validQuestionIds) {
    const fullBank = validQuestionIds.size >= CPEP3_FULL_ITEM_COUNT
    const g1 = validateItemAnswers(input.itemAnswers, validQuestionIds, fullBank)
    if (g1.length > 0) {
      throw new Error(`CPEP-3 报告校验失败: ${g1.map((i) => i.message).join('; ')}`)
    }
  }

  const subtestResults = buildSubtestResults(input)
  const emergingSkills = getEmergingSkills(input.itemAnswers)
  const strengths = getStrengths(subtestResults)
  const supportNeeds = getSupportNeeds(input.itemAnswers, input.domainNames)
  const iepPlan = generateIepRecommendations(input.itemAnswers, input.domainNames)
  const profile = buildProfileView(subtestResults)
  const summary = buildSummary(input, subtestResults, emergingSkills, strengths)

  const totalPassCount = subtestResults.filter((r) => r.category === 'developmental').reduce((s, r) => s + r.pCount, 0)
  const totalEmergingCount = subtestResults.filter((r) => r.category === 'developmental').reduce((s, r) => s + r.eCount, 0)

  const daByDomain: Record<string, { range: string; midpoint: number } | null> = {}
  for (const sub of subtestResults) {
    daByDomain[sub.domainCode] = sub.developmentalAgeRange && sub.developmentalAgeMonths !== null
      ? { range: sub.developmentalAgeRange, midpoint: sub.developmentalAgeMonths }
      : null
  }

  const maladaptiveOverview = subtestResults
    .filter((r) => r.category === 'maladaptive')
    .map((r) => ({
      domainCode: r.domainCode,
      domainName: r.name,
      ratedCounts: r.ratedCounts ?? { A: 0, M: 0, S: 0 },
      severityScore: r.rawScore,
      note: `A 适当 ${r.ratedCounts?.A ?? 0} 项 / M 轻微 ${r.ratedCounts?.M ?? 0} 项 / S 严重 ${r.ratedCounts?.S ?? 0} 项；严重度分 ${r.rawScore}（分值越高表示观察到的适应不良行为越多，需要的教学支持越多）。`,
    }))

  // normative.source 动态判定：至少一个发展能区 DA 查表命中 → authorized_norm_table；否则 not_available（不虚标来源）
  const hasAuthorizedNorm = Object.values(daByDomain).some((v) => v !== null)
  const snapshot: Cpep3ReportSnapshot = {
    reportVersion: CPEP3_REPORT_VERSION,
    scoringVersion: CPEP3_SCORING_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    itemResults: input.itemAnswers.map((it) => ({
      questionId: it.questionId,
      codeNo: it.codeNo,
      itemType: it.itemType,
      domainCode: it.domainCode,
      scoreLevel: it.scoreLevel,
      scoreValue: it.scoreValue,
    })),
    subtestResults,
    total: {
      passCount: totalPassCount,
      emergingCount: totalEmergingCount,
      monthRange: input.totalMonthRange,
      daMidpointMonths: input.totalDaMidpointMonths,
    },
    normative: {
      source: hasAuthorizedNorm ? 'authorized_norm_table' : 'not_available',
      percentile: null,
      standardScore: null,
      daByDomain,
    },
    emergingSkills,
    strengths,
    supportNeeds,
    maladaptiveOverview,
    iepPlan,
    profile,
    summary,
    limitations: CPEP3_REPORT_LIMITATIONS,
  }

  const validation = validateCpep3Report(input.itemAnswers, snapshot)
  if (!validation.ok) {
    throw new Error(`CPEP-3 报告校验失败: ${validation.issues.map((i) => `${i.code}:${i.message}`).join('; ')}`)
  }
  return snapshot
}
