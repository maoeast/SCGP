/**
 * 推荐引擎类型定义（recommendation engine）
 *
 * 评估结果 → 弱势领域 → 器材推荐（受授权能力包约束）→ 训练计划草稿 的数据契约。
 * 引擎本体为纯函数（recommendation-engine.ts），I/O 与授权由 store 注入。
 *
 * @module features/recommendation/types
 */

import type { ScoreResult } from '@/types/assessment'
import type { EntitlementCode } from '@/features/entitlements/entitlement-catalog'
import type { ResourceItem } from '@/types/module'
import type { UnifiedDomain } from './ability-taxonomy'

/** 弱势严重程度（取自 DimensionScore.severity 的 'warning'|'danger'） */
export type WeaknessSeverity = 'warning' | 'danger'

/** 弱势维度命中溯源（展示与计划目标来源） */
export interface WeakDimensionSource {
  /** 原始 dimension code */
  code: string
  /** 原始 dimension 名称 */
  name: string
  /** 原始 severity */
  severity?: string
}

/** 弱势领域（评估结果按统一领域聚合后） */
export interface WeakDomain {
  /** 统一障碍领域 */
  domain: UnifiedDomain
  /** 展示名称 */
  label: string
  /** 最高严重程度（同域多维度聚合取最重） */
  severity: WeaknessSeverity
  /** 命中的原始 dimension（溯源） */
  sourceDimensions: WeakDimensionSource[]
  /** 是否有配套器材 */
  equipmentSupported: boolean
}

/** 推荐器材 */
export interface RecommendedEquipment {
  /** 资源（ResourceItem） */
  resource: ResourceItem
  /** 所属统一领域 */
  domain: UnifiedDomain
  /** 命中的 ability_tag 关键词（命中理由展示） */
  matchedTags: string[]
  /** 打分（命中关键词数 × severity 权重，域内降序依据） */
  score: number
  /** 对应 entitlement code（面板可见） */
  entitlement: EntitlementCode
  /** 面板默认勾选 */
  selected: boolean
}

/** 推荐引擎输入 */
export interface RecommendationInput {
  /** 评估结果（含 scaleCode/studentId/dimensions/extraData） */
  scoreResult: ScoreResult
  /** 关联评估记录 id（生成计划时回链 source_assessment_id） */
  assessmentId?: number | string
}

/** 注入的 entitlement 判定（store 传 authStore.hasEntitlementAccess） */
export type EntitlementChecker = (code: string) => boolean

/** 候选器材（store 已按弱势领域粗筛、按 domain 标注） */
export interface EquipmentCandidate {
  resource: ResourceItem
  domain: UnifiedDomain
}

/** 引擎上下文（store 注入 I/O 与授权） */
export interface RecommendationContext {
  /** entitlement 硬过滤判定 */
  hasEntitlement: EntitlementChecker
  /** 已粗筛的候选器材池（store 用 ResourceAPI 按 DOMAIN_EQUIPMENT_QUERY 取得） */
  candidatePool: EquipmentCandidate[]
}

/** 推荐引擎结果 */
export interface RecommendationResult {
  scaleCode: string
  studentId: number
  assessmentId?: number | string
  /** 弱势领域列表（已含 equipmentSupported 标记，severity 降序） */
  weakDomains: WeakDomain[]
  /** 推荐器材（已 entitlement 过滤 + 打分排序，按领域分组顺序） */
  recommendations: RecommendedEquipment[]
  /** 是否有任一可推荐器材 */
  hasAnyEquipment: boolean
}
