/**
 * 训练计划生成器（recommendation engine → 训练计划草稿）
 *
 * 锁定决策 #3：推荐面板（透明、可增删）+ 一键生成 status=draft 计划，跳 PlanList 审阅激活。
 *
 * 输入：RecommendationResult + 面板内教师增删后的选中器材。
 * 输出：调用 PlanAPI.createPlan（source='assessment' + source_assessment_id）→ batchAddResources 挂载选中器材。
 *
 * 目标来源：
 * - long_term_goals：弱势领域名 + 富信息量表 iepInterventions.intervention.long。
 * - short_term_goals：弱势领域（含 severity）+ iepTargets（题目级未通过项）+ iepInterventions.intervention.short。
 * extraData 形态跨量表异构，采用防御式提取，缺失则降级为领域级目标，不编造。
 *
 * 错误处理：createPlan / batchAddResources 均 try/catch，失败回显（不抛断链路）。
 *
 * @module features/recommendation/plan-generator
 */

import type { PlanAPI, CreatePlanParams } from '@/database/plan-api'
import type { TrainingPlanStoredModuleCode } from '@/utils/training-plan-module'
import type { UnifiedDomain } from './ability-taxonomy'
import { getUnifiedDomainDefinition } from './ability-taxonomy'
import type { RecommendedEquipment, RecommendationResult } from './types'

/** 默认训练频次（次/周）与时长（分钟） */
const DEFAULT_FREQUENCY = 3
const DEFAULT_DURATION_MINUTES = 15

/** 统一领域 → 训练计划 module_code */
const DOMAIN_PLAN_MODULE: Record<UnifiedDomain, TrainingPlanStoredModuleCode> = {
  cognitive: 'cognitive-development',
  language: 'cognitive-development', // 语言无独立计划模块，归认知
  gross_motor: 'all', // 无器材包 → 综合
  fine_motor: 'fine-motor',
  social: 'social-communication',
  emotional: 'emotional-regulation',
  sensory_integration: 'sensory-training',
  life_skills: 'life-skills',
  soothing: 'soothing-aids',
}

export interface PlanGenerationInput {
  result: RecommendationResult
  /** 面板内教师增删后的选中器材 */
  selected: RecommendedEquipment[]
  /** 富信息量表的 extraData（取 iepTargets / iepInterventions；可缺） */
  extraData?: Record<string, any>
  /** 学生名（计划名前缀） */
  studentName?: string
  /** 量表中文名（计划名） */
  scaleName?: string
}

export interface PlanGenerationResult {
  success: boolean
  planId?: number
  attachedCount?: number
  error?: string
}

/** 取主弱势领域对应的计划 module_code（无器材领域兜底 'all'） */
function resolvePlanModuleCode(result: RecommendationResult): TrainingPlanStoredModuleCode {
  const primary = result.weakDomains.find((d) => d.equipmentSupported) || result.weakDomains[0]
  if (!primary) {
    return 'all'
  }
  return DOMAIN_PLAN_MODULE[primary.domain] || 'all'
}

/** 安全取字符串（防御式 extraData 提取） */
function toText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }
  return null
}

/** 从 iepInterventions 提取 short/long 干预目标（防御式，形态跨量表异构） */
function extractInterventionGoals(extraData?: Record<string, any>): {
  short: string[]
  long: string[]
} {
  const short: string[] = []
  const long: string[] = []
  const interventions = extraData?.iepInterventions
  if (!Array.isArray(interventions)) {
    return { short, long }
  }

  for (const entry of interventions) {
    const intervention = entry?.intervention
    if (!intervention || typeof intervention !== 'object') {
      continue
    }
    const shortText = toText(intervention.short)
    if (shortText) {
      short.push(shortText)
    }
    const longText = toText(intervention.long)
    if (longText) {
      long.push(longText)
    }
  }

  return { short, long }
}

/** 从 iepTargets 提取题目级未通过项文本（防御式） */
function extractIepTargets(extraData?: Record<string, any>): string[] {
  const targets = extraData?.iepTargets
  if (!Array.isArray(targets)) {
    return []
  }

  const texts: string[] = []
  for (const target of targets) {
    if (!target || typeof target !== 'object') {
      continue
    }
    // 常见字段：target / target_text / description / name / label
    const text =
      toText(target.target) ||
      toText(target.target_text) ||
      toText(target.description) ||
      toText(target.name) ||
      toText(target.label)
    if (text) {
      texts.push(text)
    }
  }
  return texts
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 由推荐结果 + 选中器材生成训练计划草稿。
 *
 * @param input 推荐结果 + 选中器材 + extraData + 命名上下文
 * @param planApi 注入的 PlanAPI 实例（store 提供）
 */
export function generatePlanFromRecommendation(
  input: PlanGenerationInput,
  planApi: PlanAPI,
): PlanGenerationResult {
  const { result, selected, extraData, studentName, scaleName } = input

  if (!Array.isArray(selected) || selected.length === 0) {
    return { success: false, error: '未选择任何器材，无法生成训练计划' }
  }

  const interventions = extractInterventionGoals(extraData)
  const iepTargets = extractIepTargets(extraData)

  // 长期目标：弱势领域 + iepInterventions.long
  const longTermGoals: string[] = []
  for (const weak of result.weakDomains) {
    longTermGoals.push(`${weak.label}能力提升`)
  }
  for (const longText of interventions.long) {
    if (!longTermGoals.includes(longText)) {
      longTermGoals.push(longText)
    }
  }

  // 短期目标：弱势领域（含 severity）+ iepTargets + iepInterventions.short
  const shortTermGoals: string[] = []
  for (const weak of result.weakDomains) {
    const severityLabel = weak.severity === 'danger' ? '重度弱势' : '弱势'
    shortTermGoals.push(`${weak.label}（${severityLabel}）：针对性训练`)
  }
  for (const targetText of iepTargets.slice(0, 6)) {
    if (!shortTermGoals.includes(targetText)) {
      shortTermGoals.push(targetText)
    }
  }
  for (const shortText of interventions.short.slice(0, 4)) {
    if (!shortTermGoals.includes(shortText)) {
      shortTermGoals.push(shortText)
    }
  }

  // 解析 source_assessment_id（INTEGER）
  const rawAssessmentId = result.assessmentId
  const sourceAssessmentId =
    typeof rawAssessmentId === 'number'
      ? rawAssessmentId
      : typeof rawAssessmentId === 'string' && /^\d+$/.test(rawAssessmentId)
        ? Number(rawAssessmentId)
        : null

  const today = formatDate(new Date())
  const name = `${studentName || '学生'}-${scaleName || result.scaleCode}评估推荐计划-${today}`

  const createParams: CreatePlanParams = {
    name,
    student_id: result.studentId,
    module_code: resolvePlanModuleCode(result),
    start_date: today,
    // 默认 8 周周期
    end_date: formatDate(new Date(new Date().getTime() + 8 * 7 * 24 * 60 * 60 * 1000)),
    status: 'draft',
    long_term_goals: longTermGoals.length > 0 ? longTermGoals : null,
    short_term_goals: shortTermGoals.length > 0 ? shortTermGoals : null,
    description: `由${scaleName || result.scaleCode}评估推荐自动生成，请审阅后激活。`,
    source: 'assessment',
    source_assessment_id: sourceAssessmentId,
  }

  try {
    const planId = planApi.createPlan(createParams)
    if (!planId) {
      return { success: false, error: 'createPlan 未返回有效计划 id' }
    }

    let attachedCount = 0
    try {
      const resources = selected.map((item) => {
        const domainLabel = getUnifiedDomainDefinition(item.domain).label
        const notes =
          item.matchedTags.length > 0
            ? `领域命中：${domainLabel}（${item.matchedTags.join('、')}）`
            : `${domainLabel}领域推荐`
        return {
          resource_id: item.resource.id,
          frequency: DEFAULT_FREQUENCY,
          duration_minutes: DEFAULT_DURATION_MINUTES,
          notes,
        }
      })
      attachedCount = planApi.batchAddResources(planId, resources)
    } catch (attachError) {
      console.error('[Recommendation] 挂载资源失败:', attachError)
      // 计划已建，资源挂载失败不删除计划，回显让教师手动补
      return {
        success: true,
        planId,
        attachedCount: 0,
        error: `计划已创建（id=${planId}），但资源挂载失败：${
          attachError instanceof Error ? attachError.message : String(attachError)
        }`,
      }
    }

    return { success: true, planId, attachedCount }
  } catch (createError) {
    console.error('[Recommendation] 生成训练计划失败:', createError)
    return {
      success: false,
      error: createError instanceof Error ? createError.message : String(createError),
    }
  }
}
