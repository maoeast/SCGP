/**
 * 推荐引擎 Pinia store
 *
 * 职责：把推荐引擎的纯函数与 DB I/O / 授权桥接起来。
 * - generate()：提取弱势领域 → 按 DOMAIN_EQUIPMENT_QUERY 预取器材候选池 → 调引擎打分。
 * - createDraftPlan()：按面板选中器材调 plan-generator 生成 status=draft 计划。
 *
 * store 拥有 I/O（ResourceAPI / PlanAPI）与授权注入（authStore.hasEntitlementAccess），
 * 引擎本体保持纯函数（recommendation-engine.ts）。
 *
 * @module stores/recommendation
 */

import { defineStore } from 'pinia'
import { ResourceAPI } from '@/database/resource-api'
import { PlanAPI } from '@/database/plan-api'
import { useAuthStore } from './auth'
import {
  extractWeakDomains,
  generateRecommendation,
} from '@/features/recommendation/recommendation-engine'
import { generatePlanFromRecommendation } from '@/features/recommendation/plan-generator'
import {
  collectEquipmentFetchGroups,
  type UnifiedDomain,
} from '@/features/recommendation/ability-taxonomy'
import type {
  EquipmentCandidate,
  RecommendationInput,
  RecommendationResult,
} from '@/features/recommendation/types'

export interface RecommendationGenerateOptions {
  /** 量表中文名（计划名 + 徽标） */
  scaleName?: string
  /** 学生名（计划名前缀） */
  studentName?: string
}

export interface DraftPlanOutcome {
  success: boolean
  planId?: number
  attachedCount?: number
  error?: string
}

export const useRecommendationStore = defineStore('recommendation', {
  state: () => ({
    /** 抽屉可见性 */
    visible: false,
    /** 生成中（DB 查询为同步，此标志主要用于语义与未来异步化） */
    loading: false,
    /** 最近一次推荐结果 */
    result: null as RecommendationResult | null,
    /** 错误信息 */
    error: null as string | null,
    /** 命名上下文（生成计划时复用） */
    lastScaleName: null as string | null,
    lastStudentName: null as string | null,
    /** 富信息量表的 extraData（生成计划目标时复用） */
    lastExtraData: null as Record<string, any> | null,
    /** 最近一次生成计划结果 */
    lastPlanOutcome: null as DraftPlanOutcome | null,
  }),

  getters: {
    hasResult: (state) => state.result !== null,
    weakDomains: (state) => state.result?.weakDomains ?? [],
    recommendations: (state) => state.result?.recommendations ?? [],
    selectedEquipment: (state) =>
      (state.result?.recommendations ?? []).filter((item) => item.selected),
    selectedCount(): number {
      return this.selectedEquipment.length
    },
  },

  actions: {
    open() {
      this.visible = true
    },
    close() {
      this.visible = false
    },

    /** 切换某器材的选中态（面板内增删） */
    toggleSelection(resourceId: number) {
      const item = this.result?.recommendations.find((r) => r.resource.id === resourceId)
      if (item) {
        item.selected = !item.selected
      }
    },

    /**
     * 生成推荐：弱势领域 → 预取器材池 → 引擎打分。
     * 同步执行（ResourceAPI 为同步 SQL 查询）。
     */
    generate(
      input: RecommendationInput,
      options: RecommendationGenerateOptions = {},
    ): RecommendationResult | null {
      this.loading = true
      this.error = null
      try {
        const { scoreResult } = input

        // 1. 提取弱势领域（引擎步骤 1，提前做以便按域预取器材）
        const weakDomains = extractWeakDomains(
          scoreResult.scaleCode,
          scoreResult.dimensions || [],
        )
        const equipmentDomains = Array.from(
          new Set(
            weakDomains
              .filter((d) => d.equipmentSupported)
              .map((d) => d.domain),
          ),
        ) as UnifiedDomain[]

        // 2. 预取候选器材池（按 moduleCode+category 去重，共享 category 多域各挂一份）
        const candidatePool = this.fetchCandidatePool(equipmentDomains)

        // 3. 引擎：entitlement 硬过滤 + 标签打分
        const authStore = useAuthStore()
        const result = generateRecommendation(
          { scoreResult, assessmentId: input.assessmentId },
          {
            hasEntitlement: (code) => authStore.hasEntitlementAccess(code),
            candidatePool,
          },
        )

        this.result = result
        this.lastScaleName = options.scaleName ?? null
        this.lastStudentName = options.studentName ?? null
        this.lastExtraData = scoreResult.extraData ?? null
        this.lastPlanOutcome = null
        this.visible = true
        return result
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
        console.error('[RecommendationStore] generate 失败:', e)
        return null
      } finally {
        this.loading = false
      }
    },

    /** 按 DOMAIN_EQUIPMENT_QUERY 预取候选器材（粗筛，store 层 I/O） */
    fetchCandidatePool(domains: readonly UnifiedDomain[]): EquipmentCandidate[] {
      const api = new ResourceAPI()
      const pool: EquipmentCandidate[] = []
      const seen = new Set<string>()
      const groups = collectEquipmentFetchGroups(domains)

      for (const group of groups) {
        try {
          const items = api.getResources({
            moduleCode: group.moduleCode,
            resourceType: 'equipment',
            category: group.category,
          })
          for (const resource of items) {
            for (const domain of group.domains) {
              const key = `${resource.id}::${domain}`
              if (seen.has(key)) {
                continue
              }
              seen.add(key)
              pool.push({ resource, domain })
            }
          }
        } catch (e) {
          console.warn(
            `[RecommendationStore] 取器材失败 ${group.moduleCode}/${group.category}:`,
            e,
          )
        }
      }

      return pool
    },

    /** 按面板选中器材生成训练计划草稿 */
    createDraftPlan(): DraftPlanOutcome {
      if (!this.result) {
        return { success: false, error: '无推荐结果' }
      }
      const selected = (this.result.recommendations ?? []).filter((item) => item.selected)
      const planApi = new PlanAPI()
      const outcome = generatePlanFromRecommendation(
        {
          result: this.result,
          selected,
          extraData: this.lastExtraData ?? undefined,
          studentName: this.lastStudentName ?? undefined,
          scaleName: this.lastScaleName ?? undefined,
        },
        planApi,
      )
      this.lastPlanOutcome = outcome
      return outcome
    },

    reset() {
      this.result = null
      this.error = null
      this.lastPlanOutcome = null
      this.visible = false
    },
  },
})
