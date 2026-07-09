/**
 * 推荐引擎（recommendation engine）—— 纯函数
 *
 * 评估结果 → 弱势领域提取 → entitlement 预筛 → 标签打分 → 推荐器材。
 *
 * 设计：引擎本体无 I/O。器材候选池（candidatePool，已按弱势领域粗筛）与
 * entitlement 判定（hasEntitlement）由 store 注入；DB 查询在 store 层完成。
 *
 * 算法（锁定决策 #1 混合匹配 + #4 entitlement 硬过滤）：
 *   1. 提取弱势领域：取 dimensions 中 severity='warning'|'danger'（兜底 levelCode/percentile），
 *      按 scale-dimension-mapping 映射到统一领域，同域取最重 severity 聚合 → WeakDomain[]。
 *   2. 粗筛：由 store 已按 DOMAIN_EQUIPMENT_QUERY 取得 candidatePool（按 domain 标注）。
 *   3. entitlement 预筛：candidate.filter(hasEntitlement(resolveEquipmentEntitlement))，硬卡 7 包。
 *   4. 标签打分：score = matchDomainKeywords ∩ resource.tags 命中数（danger 域 +1 加权）。
 *   5. 域内降序取 top-N（默认每域 8），跨域按 resource.id 去重，产出 RecommendedEquipment[]。
 *
 * @module features/recommendation/recommendation-engine
 */

import type { DimensionScore } from '@/types/assessment'
import { getUnifiedDomainDefinition, isUnifiedDomain, type UnifiedDomain } from './ability-taxonomy'
import { resolveDimensionDomains } from './scale-dimension-mapping'
import { matchDomainKeywords } from './domain-tag-keywords'
import { resolveEquipmentEntitlement } from './equipment-entitlement'
import type {
  RecommendationContext,
  RecommendationInput,
  RecommendationResult,
  RecommendedEquipment,
  WeakDimensionSource,
  WeakDomain,
  WeaknessSeverity,
} from './types'

/** 每个领域最多推荐的器材数 */
const PER_DOMAIN_CAP = 8
/** 每个领域默认勾选的器材数（面板可增删） */
const DEFAULT_SELECTED_PER_DOMAIN = 2

/** levelCode 兜底：含这些 token 视为 danger（重度弱势） */
const DANGER_LEVEL_TOKENS = ['severe', 'delayed', 'abnormal', 'verylow', 'extreme']
/** levelCode 兜底：含这些 token 视为 warning（轻度弱势） */
const WARNING_LEVEL_TOKENS = ['borderline', 'mild', 'moderate', 'low', 'below', 'delay']

/**
 * 分值兜底规则（字段 + 方向感知）。
 *
 * 部分「缺陷型」量表（CSIRS/WeeFIM）不在 dimension 上写 severity/levelCode/percentile，
 * 仅写某个分值字段。此处按量表配置读对应字段做方向感知兜底：
 * - direction:'low' —— 低分=弱势（CSIRS T 分；WeeFIM 每题均分）
 * - direction:'high' —— 高分=弱势（问题行为型；此类量表通常已写 severity，不会走到这里）
 *
 * 已写 severity/levelCode 的量表（sdq/srs2/conners/cbcl/cnbsr/fine_motor/gmfm/tgmd/sm）
 * 不会进入此分支，规则仅补充缺失信号。
 */
const SCORE_WEAKNESS_RULES: Record<
  string,
  { field: 'standardScore' | 'averageScore'; direction: 'low' | 'high'; warning: number; danger: number }
> = {
  // CSIRS T 分（总体均数 50，SD≈10）：T<40 偏低(warning)，T<30 严重偏低(danger)
  csirs: { field: 'standardScore', direction: 'low', warning: 40, danger: 30 },
  // WeeFIM 每题均分（0-7，7=完全独立）：<3 中度+依赖(warning)，<1.5 重度依赖(danger)
  weefim: { field: 'averageScore', direction: 'low', warning: 3, danger: 1.5 },
}

/**
 * 判定单个 dimension 的弱势严重程度。
 *
 * 信号优先级：
 *   1. DimensionScore.severity（'warning'|'danger'）—— 多数量表直接写
 *   2. levelCode 含异常 token（cnbsr dqStatus / fine_motor status / gmfm levelCode 等）
 *   3. percentile < 16（底线 16%）
 *   4. 按量表规则读 standardScore/averageScore 兜底（CSIRS T 分 / WeeFIM 均分；方向感知）
 */
function resolveWeakSeverity(scaleCode: string, dim: DimensionScore): WeaknessSeverity | null {
  if (dim.severity === 'danger' || dim.severity === 'warning') {
    return dim.severity
  }

  const levelCode = String(dim.levelCode || '').toLowerCase()
  if (levelCode) {
    if (DANGER_LEVEL_TOKENS.some((token) => levelCode.includes(token))) {
      return 'danger'
    }
    if (WARNING_LEVEL_TOKENS.some((token) => levelCode.includes(token))) {
      return 'warning'
    }
  }

  if (typeof dim.percentile === 'number' && dim.percentile > 0 && dim.percentile < 16) {
    return 'warning'
  }

  const rule = SCORE_WEAKNESS_RULES[scaleCode]
  if (rule) {
    const value = dim[rule.field]
    if (typeof value === 'number') {
      if (rule.direction === 'low') {
        if (value < rule.danger) return 'danger'
        if (value < rule.warning) return 'warning'
      } else {
        if (value > rule.danger) return 'danger'
        if (value > rule.warning) return 'warning'
      }
    }
  }

  return null
}

function severityRank(severity: WeaknessSeverity): number {
  return severity === 'danger' ? 2 : 1
}

interface DomainAggregate {
  severity: WeaknessSeverity
  sources: WeakDimensionSource[]
}

/**
 * 提取弱势领域（步骤 1）。
 * 按 scale-dimension-mapping 把弱势 dimension 聚合到统一领域，同域取最重 severity。
 *
 * 导出供 store 在打分前预取器材池（候选池需按弱势领域粗筛）。
 */
export function extractWeakDomains(
  scaleCode: string,
  dimensions: DimensionScore[],
): WeakDomain[] {
  const aggregate = new Map<UnifiedDomain, DomainAggregate>()

  for (const dim of dimensions) {
    const severity = resolveWeakSeverity(scaleCode, dim)
    if (!severity) {
      continue
    }

    const domains = resolveDimensionDomains(scaleCode, dim)
    if (domains.length === 0) {
      // 未分类维度（如临床行为量表的非器材维度）忽略，不阻塞
      continue
    }

    const source: WeakDimensionSource = {
      code: dim.code,
      name: dim.name,
      severity: dim.severity,
    }

    for (const domain of domains) {
      if (!isUnifiedDomain(domain)) {
        continue
      }
      const existing = aggregate.get(domain)
      if (!existing) {
        aggregate.set(domain, { severity, sources: [source] })
      } else {
        if (severityRank(severity) > severityRank(existing.severity)) {
          existing.severity = severity
        }
        existing.sources.push(source)
      }
    }
  }

  return Array.from(aggregate.entries())
    .map(([domain, agg]) => {
      const definition = getUnifiedDomainDefinition(domain)
      return {
        domain,
        label: definition.label,
        severity: agg.severity,
        sourceDimensions: agg.sources,
        equipmentSupported: definition.equipmentSupported,
      } satisfies WeakDomain
    })
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
}

/**
 * 推荐引擎入口（纯函数）。
 *
 * @param input 评估结果 + 关联评估记录 id
 * @param ctx 注入的 entitlement 判定 + 已粗筛的候选器材池
 * @returns 推荐结果（弱势领域 + 推荐器材 + hasAnyEquipment）
 */
export function generateRecommendation(
  input: RecommendationInput,
  ctx: RecommendationContext,
): RecommendationResult {
  const { scoreResult, assessmentId } = input
  const { hasEntitlement, candidatePool } = ctx
  const scaleCode = scoreResult.scaleCode
  const studentId = scoreResult.studentId

  // 步骤 1：弱势领域
  const weakDomains = extractWeakDomains(scaleCode, scoreResult.dimensions || [])

  // 步骤 2-4：逐领域 entitlement 预筛 + 标签打分
  const byDomain = new Map<UnifiedDomain, RecommendedEquipment[]>()
  for (const weak of weakDomains) {
    if (!weak.equipmentSupported) {
      continue
    }

    const scored: RecommendedEquipment[] = []
    for (const candidate of candidatePool) {
      if (candidate.domain !== weak.domain) {
        continue
      }

      // 步骤 3：entitlement 硬过滤（category-driven）
      const entitlement = resolveEquipmentEntitlement(candidate.resource)
      if (!entitlement) {
        continue
      }
      if (!hasEntitlement(entitlement)) {
        continue
      }

      // 步骤 4：标签打分
      const matchedTags = matchDomainKeywords(weak.domain, candidate.resource.tags || [])
      const severityBonus = weak.severity === 'danger' ? 1 : 0

      scored.push({
        resource: candidate.resource,
        domain: weak.domain,
        matchedTags,
        score: matchedTags.length + severityBonus,
        entitlement,
        selected: false,
      })
    }

    scored.sort(
      (a, b) =>
        b.score - a.score ||
        (b.resource.usageCount || 0) - (a.resource.usageCount || 0),
    )

    const capped = scored.slice(0, PER_DOMAIN_CAP)
    // 默认勾选域内 top-N（面板可增删）
    capped.forEach((item, index) => {
      item.selected = index < DEFAULT_SELECTED_PER_DOMAIN
    })
    byDomain.set(weak.domain, capped)
  }

  // 步骤 5：组装（按弱势领域顺序）+ 跨域 resource.id 去重
  const seenIds = new Set<number>()
  const recommendations: RecommendedEquipment[] = []
  for (const weak of weakDomains) {
    const items = byDomain.get(weak.domain) || []
    for (const item of items) {
      if (seenIds.has(item.resource.id)) {
        continue
      }
      seenIds.add(item.resource.id)
      recommendations.push(item)
    }
  }

  return {
    scaleCode,
    studentId,
    assessmentId,
    weakDomains,
    recommendations,
    hasAnyEquipment: recommendations.length > 0,
  }
}
