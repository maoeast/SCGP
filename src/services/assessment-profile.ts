/**
 * 跨量表学生画像聚合（路线 D：横向立体画像）。
 *
 * 与纵向趋势（assessment-score-adapters，同量表多次）正交：本模块在单一时间点
 * 横跨多个量表，把同一学生「各发展领域」的最近评估聚合为统一画像，
 * 供 AI 工具 get_student_profile 读取 + 生成雷达图富产物。
 *
 * 约束处理：
 * - 授权差异：前端评估入口已按 entitlement 物理隔离，未授权量表测不了 → DB 无记录 → 自动跳过。
 * - 部分测试：只聚合有评估记录的量表，未测领域明确列出（avoid 基于不全数据下全局结论）。
 *
 * 本文件刻意不 import 任何 @/ DB API，只接收已查好的 ScoreSnapshot[]，保持可纯函数测试。
 * 查库由 ai-tools.ts 的 dispatchTool 负责（同 assessment-score-adapters 的分层模式）。
 */
import type { ScoreSnapshot, ScoreAdapter } from './assessment-score-adapters'

// ==================== 领域映射 ====================

/** 五大发展领域（与 BUSINESS_MODULE_CODES 对齐）。 */
export type DevelopmentDomain = 'sensory' | 'emotional' | 'social' | 'cognitive' | 'life_skills'

/** 发展领域中文标签。 */
export const DOMAIN_LABELS: Record<DevelopmentDomain, string> = {
  sensory: '感觉统合',
  emotional: '情绪调节',
  social: '社交沟通',
  cognitive: '认知发展',
  life_skills: '生活自理',
}

/**
 * 量表代码 → 发展领域映射（单一真源）。
 *
 * scaleCode 用 adapter 口径（下划线，如 conners_psq），与 catalog 的连字符口径（conners-psq）不同；
 * 这里直接硬编码映射，避免在工具层做连字符归一化 + 反查 catalog 的脆弱链路。
 * 新增量表时同步更新此映射。
 */
export const SCALE_DOMAIN_MAP: Record<string, DevelopmentDomain> = {
  // 感觉统合
  csirs: 'sensory',
  cnbsr2016: 'sensory',
  fine_motor: 'sensory',
  gmfm_88: 'sensory',
  tgmd_3: 'sensory',
  // 情绪调节
  conners_psq: 'emotional',
  conners_trs: 'emotional',
  cbcl: 'emotional',
  // 社交沟通
  srs2: 'social',
  sdq: 'social',
  abc: 'social',
  atec: 'social',
  // 认知发展
  brief: 'cognitive',
  // 生活自理
  sm: 'life_skills',
  weefim: 'life_skills',
}

// ==================== 画像输出类型 ====================

/**
 * 单量表在画像中的条目：最近一次评估 + 由分数/等级生成的结论。
 * 结论由 buildScaleConclusion 生成（非 DB 持久化字段，实时计算）。
 */
export interface ProfileScaleItem {
  scaleCode: string
  scaleName: string
  /** 最近一次评估的归一化快照（升序序列的末项）。 */
  latestSnapshot: ScoreSnapshot
  /** 由 scoreNote + level + 分数生成的简明结论。 */
  conclusion: { summary: string; advice: string[] }
}

/** 一个发展领域的聚合条目。 */
export interface ProfileDomainItem {
  domain: DevelopmentDomain
  domainLabel: string
  scales: ProfileScaleItem[]
  /** 领域级强弱：由本领域各量表等级聚合推算。 */
  strength: DomainStrength
}

/** 画像完整结构。 */
export interface StudentProfile {
  student: { id: number; name: string; gender: string }
  /** 纳入画像的领域（仅有评估记录的量表所属领域）。 */
  domains: ProfileDomainItem[]
  /** 已支持但该学生未测的量表代码（透明列出覆盖盲区）。 */
  untestedScales: string[]
  /** 画像基于的评估时间范围。 */
  asOfDate: string
}

// ==================== 领域强弱推算 ====================

export type DomainStrength = 'strong' | 'normal' | 'weak' | 'mixed'

/**
 * 由等级文本推算单量表强弱倾向。
 *
 * 量表等级语义不统一（有的分高=好，有的分高=差），但等级文本的关键词可做粗分：
 * - 正向词（优秀/正常/良好/中等/中上）→ strong/normal
 * - 负向词（偏低/迟缓/异常/临床/轻度/中度/重度/临界/边缘/问题）→ weak
 *
 * 这是保守的启发式：判不出时归 normal，宁可保守不夸大。
 */
function strengthFromLevel(level: string): DomainStrength {
  const l = (level || '').toLowerCase()
  if (!l) return 'normal'
  // 明确正向
  if (/优秀|非常优秀|excellent|良好|good|正常|normal|中等|middle|中上|above/i.test(level)) return 'strong'
  // 明确负向
  if (/严重|重度|severe|moderate|中度|临床|clinical|迟缓|delayed|异常|abnormal|偏低|below|边缘|borderline|轻度|light|mild|临界|critical|问题|problem/i.test(level)) {
    return 'weak'
  }
  return 'normal'
}

/**
 * 聚合领域强弱：取该领域各量表 strength 的「最差值」。
 * 一个领域只要有一个量表偏弱，整体就标 weak/mixed（保守原则：不掩盖短板）。
 */
function aggregateDomainStrength(items: ProfileScaleItem[]): DomainStrength {
  const strengths = items.map((i) => strengthFromLevel(i.latestSnapshot.level))
  const hasWeak = strengths.includes('weak')
  const hasStrong = strengths.includes('strong')
  if (hasWeak && hasStrong) return 'mixed'
  if (hasWeak) return 'weak'
  if (hasStrong) return 'strong'
  return 'normal'
}

/**
 * 领域强弱 → 雷达量化分（0-100，50=正常，>50 偏强，<50 偏弱）。
 * strong=80 / normal=60 / weak=30 / mixed=50（混合取中性值，避免掩盖内部不一致）。
 */
export function strengthToScore(strength: DomainStrength): number {
  switch (strength) {
    case 'strong': return 80
    case 'normal': return 60
    case 'weak': return 30
    case 'mixed': return 50
  }
}

/** 领域强弱 → 中文标签（雷达图 tooltip / 图例用）。 */
export function strengthLabel(strength: DomainStrength): string {
  switch (strength) {
    case 'strong': return '偏强'
    case 'normal': return '正常'
    case 'weak': return '偏弱'
    case 'mixed': return '混合'
  }
}

// ==================== 结论生成 ====================

/**
 * 由 scoreNote + 最近快照生成单量表简明结论。
 *
 * 不调用各量表专属规则函数（如 csirs 的 getEvaluationLevel）——那些函数签名/返回结构
 * 各不相同，统一调用成本高且易碎。改用 adapter 自带的 scoreNote（已含分数语义说明）+
 * snapshot.level + totalScore 拼装统一结论。深度建议由 AI 在 prompt 层基于这些字段生成。
 *
 * 这是方案 X 的「统一口径」分支：所有量表一视同仁，结论深度取决于 adapter 的 scoreNote 质量。
 */
export function buildScaleConclusion(
  scaleCode: string,
  scaleName: string,
  scoreNote: string,
  latest: ScoreSnapshot,
): { summary: string; advice: string[] } {
  const levelText = latest.level || '未评定'
  const score = latest.totalScore
  const dateText = latest.date ? new Date(latest.date).toLocaleDateString('zh-CN') : '未知日期'

  const summary = `${scaleName}（${scaleCode}）：最近评估 ${dateText}，总分 ${score}，等级「${levelText}」。${scoreNote}`

  // 通用建议：按强弱倾向给方向性提示（具体训练建议由 AI 基于画像综合给出）
  const advice: string[] = []
  const s = strengthFromLevel(latest.level)
  if (s === 'weak') {
    advice.push(`${scaleName}结果显示该领域可能存在短板，建议结合其他量表交叉验证，必要时安排针对性干预。`)
  } else if (s === 'strong') {
    advice.push(`${scaleName}结果在正常/良好范围，该领域为该生相对优势。`)
  } else {
    advice.push(`${scaleName}结果在边界/临界范围，建议持续观察并结合后续评估动态判断。`)
  }

  return { summary, advice }
}

// ==================== 主聚合函数 ====================

/**
 * 把「各量表的纵向快照序列」聚合为横向画像。
 *
 * 纯函数：不查库，只接收已查好的 adapters 输入。查库由调用方（dispatchTool）负责。
 * 只取每个量表的最近一次（升序末项）；无快照的量表计入 untestedScales。
 *
 * @param student 学生基本信息
 * @param scaleData 各量表的 adapter + 已查好的纵向快照（仅含有数据的量表）
 */
export function buildStudentProfile(
  student: { id: number; name: string; gender: string },
  scaleData: Array<{ scaleCode: string; adapter: ScoreAdapter; snapshots: ScoreSnapshot[] }>,
  allSupportedCodes: string[],
): StudentProfile {
  const testedCodes = new Set(scaleData.map((s) => s.scaleCode))
  const untestedScales = allSupportedCodes.filter((c) => !testedCodes.has(c))

  // 按领域分组聚合
  const domainMap = new Map<DevelopmentDomain, ProfileScaleItem[]>()
  for (const { scaleCode, adapter, snapshots } of scaleData) {
    if (!snapshots || snapshots.length === 0) continue
    const latest = snapshots[snapshots.length - 1]
    if (!latest) continue // 防御：索引访问收缩
    const domain = SCALE_DOMAIN_MAP[scaleCode]
    if (!domain) continue // 未在领域映射中的量表跳过（防御）

    const item: ProfileScaleItem = {
      scaleCode,
      scaleName: adapter.scaleName,
      latestSnapshot: latest,
      conclusion: buildScaleConclusion(scaleCode, adapter.scaleName, adapter.scoreNote, latest),
    }

    if (!domainMap.has(domain)) domainMap.set(domain, [])
    domainMap.get(domain)!.push(item)
  }

  // 组装领域条目（按 DOMAIN_LABELS 固定顺序，保证雷达图轴顺序稳定）
  const domainOrder: DevelopmentDomain[] = ['sensory', 'emotional', 'social', 'cognitive', 'life_skills']
  const domains: ProfileDomainItem[] = domainOrder
    .filter((d) => domainMap.has(d))
    .map((d) => {
      const scales = domainMap.get(d)!
      return {
        domain: d,
        domainLabel: DOMAIN_LABELS[d],
        scales,
        strength: aggregateDomainStrength(scales),
      }
    })

  return {
    student,
    domains,
    untestedScales,
    asOfDate: new Date().toISOString(),
  }
}
