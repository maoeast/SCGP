/**
 * 评估量表纵向分数的纯归一化逻辑（无数据库依赖，可被 jiti 直接加载单测）。
 *
 * 这里只做「原始行 → 统一快照」的数据变换；查库由 assessment-score-adapters.ts
 * 的适配器负责。这样把可纯函数测试的归一化与带 DB 副作用的查询层分离。
 *
 * 注意：本文件不得 import 任何 `@/` 别名或 DB API，只用相对路径 import 纯数据模块。
 */
// 相对路径 import 纯数据模块（csirs-questions 仅含常量，无 DB 副作用）
import { getDimensionsByAge } from '../database/csirs-questions'

// ==================== 统一输出类型 ====================

/** 单次评估的归一化快照（升序序列的一项）。 */
export interface ScoreSnapshot {
  /** 评估记录 id。 */
  assessId: number
  /** 评估日期（ISO 字符串，取自 created_at）。 */
  date: string
  /** 评估时的年龄（月）。 */
  ageMonths: number
  /** 总分（量表的代表性总分）。 */
  totalScore: number
  /** 评定等级（保留量表原文）。 */
  level: string
  /** 各维度分数，键为维度中文标签（模型可直接读懂）；null 表示该维度本次未测。 */
  dimensionScores: Record<string, number | null>
  /** 量表自带的额外汇总指标（可选）。 */
  extra?: Record<string, number>
}

/** 纵向快照载荷（get_assessment_trend 的返回结构）。 */
export interface LongitudinalScorePayload {
  /** 量表代码。 */
  scaleCode: string
  /** 量表中文名。 */
  scaleName: string
  /** 评估次数。 */
  count: number
  /** 升序快照（最早在前），便于模型按时间轴解读。 */
  snapshots: ScoreSnapshot[]
  /** 量表的总分语义说明（提示模型该分数高低含义，避免误读）。 */
  scoreNote: string
}

// ==================== 声明式归一化配置类型 ====================

/**
 * 维度分提取策略：
 * - 'object': dimensionScores JSON 是 { dimCode: { tScore/rawScore/score, name, ... } }，取 scoreField
 * - 'flat-number': JSON 是 { 维度中文名: number }，值直接是分数
 */
export type DimensionExtractionMode = 'object' | 'flat-number'

/**
 * 声明式归一化配置：描述如何从数据库行提取总分/等级/维度分。
 * 绝大多数量表都能用这套配置覆盖，无需写独立 normalize 函数。
 */
export interface NormalizeConfig {
  /** 量表代码。 */
  scaleCode: string
  /** 总分所在列名（如 total_t_score / total_problems_t_score / hyperactivity_index）。 */
  totalScoreField: string
  /** 等级所在列名（如 level / total_level / summary_level / dq_status）。 */
  levelField: string
  /** 存维度分 JSON 的列名（如 t_scores / dimension_scores / factor_t_scores / domain_results）。 */
  dimensionScoresField: string
  /** 维度 JSON 的提取模式。 */
  dimensionMode: DimensionExtractionMode
  /** object 模式：从维度对象里取哪个字段作为分数（如 'tScore' / 'rawScore' / 'score'）。 */
  dimensionScoreField?: string
  /** object 模式：从维度对象里取哪个字段作为维度显示名（缺省则用维度标签映射）。 */
  dimensionNameField?: string
  /** 维度 code → 中文名 的映射（flat-number 模式下，JSON 的 key 直接是维度名时可为空）。 */
  dimensionLabels?: Record<string, string>
  /** 额外指标列（如 Conners 的 pi_score/ni_score，CBCL 的 internalizing/externalizing）。 */
  extraFields?: string[]
}

// ==================== 通用归一化函数 ====================

/**
 * 通用声明式归一化：按 config 从数据库行提取总分/等级/维度分。
 * 绝大多数量表都用这个；CSIRS 因维度随年龄变化单独处理。
 */
export function normalizeByConfig(row: any, config: NormalizeConfig): ScoreSnapshot {
  const totalScore = numOrZero(row[config.totalScoreField])
  const level = strOrEmpty(row[config.levelField])
  const dimRaw = safeParseJsonRecord(row[config.dimensionScoresField])
  const dimensionScores = extractDimensions(dimRaw, config)
  const extra = extractExtra(row, config.extraFields)
  return {
    assessId: row.id,
    date: row.created_at,
    ageMonths: numOrZero(row.age_months),
    totalScore,
    level,
    dimensionScores,
    extra,
  }
}

/** 从维度 JSON 按模式提取维度分。 */
function extractDimensions(
  dimRaw: Record<string, any>,
  config: NormalizeConfig,
): Record<string, number | null> {
  const result: Record<string, number | null> = {}
  if (config.dimensionMode === 'flat-number') {
    // JSON 是 { 维度名: number }
    for (const [key, val] of Object.entries(dimRaw)) {
      result[key] = val == null ? null : Number(val)
    }
    return result
  }
  // object 模式：{ dimCode: { scoreField, name?, ... } }
  const scoreField = config.dimensionScoreField ?? 'tScore'
  const nameField = config.dimensionNameField
  for (const [dimCode, dimObj] of Object.entries(dimRaw)) {
    if (!dimObj || typeof dimObj !== 'object') continue
    const label = nameField ? String(dimObj[nameField] ?? '') : (config.dimensionLabels?.[dimCode] ?? dimCode)
    const rawVal = dimObj[scoreField]
    result[label || dimCode] = rawVal == null ? null : Number(rawVal)
  }
  return result
}

/** 提取额外指标列。 */
function extractExtra(row: any, fields?: string[]): Record<string, number> | undefined {
  if (!fields || fields.length === 0) return undefined
  const extra: Record<string, number> = {}
  for (const f of fields) {
    if (row[f] != null) extra[f] = Number(row[f])
  }
  return Object.keys(extra).length ? extra : undefined
}

// ==================== CSIRS 专用归一化（维度随年龄变化）====================

/**
 * 从原始行解析出 CSIRS 维度分。维度随年龄变化（getDimensionsByAge），
 * 缺失维度补 null 让模型看到「该年龄段未测」，而不是当成 0 分。
 */
export function normalizeCsirs(row: any): ScoreSnapshot {
  const tScores = safeParseJsonRecord(row.t_scores)
  // 以该次评估的年龄确定适用维度，保证序列内维度集合与量表口径一致
  const dims = getDimensionsByAge(row.age_months ?? 0)
  const dimensionScores: Record<string, number | null> = {}
  for (const d of dims) {
    const v = tScores[d.name_en]
    dimensionScores[d.name] = v == null ? null : Number(v)
  }
  return {
    assessId: row.id,
    date: row.created_at,
    ageMonths: Number(row.age_months) || 0,
    totalScore: Number(row.total_t_score) || 0,
    level: String(row.level ?? ''),
    dimensionScores,
  }
}

// ==================== Conners 专用归一化（多动指数优先独立列）====================

// Conners PSQ / TRS 维度标签（与各自 Report.vue 的 DIMENSION_NAMES 对齐）
export const CONNERS_PSQ_DIMENSIONS: Record<string, string> = {
  conduct: '品行问题',
  learning: '学习问题',
  psychosomatic: '心身障碍',
  impulsivity_hyperactivity: '冲动性',
  anxiety: '焦虑',
  hyperactivity_index: '多动指数',
}

export const CONNERS_TRS_DIMENSIONS: Record<string, string> = {
  conduct: '品行问题',
  hyperactivity: '多动',
  inattention_passivity: '注意力-被动',
  hyperactivity_index: '多动指数',
}

/**
 * Conners（PSQ / TRS 通用）归一化。两者维度键不同，由调用方传入维度标签映射。
 * 多动指数作为代表性总分；其余维度从 t_scores JSON 取。
 */
export function normalizeConners(
  row: any,
  dimensionLabels: Record<string, string>,
): ScoreSnapshot {
  const tScores = safeParseJsonRecord(row.t_scores)
  const dimensionScores: Record<string, number | null> = {}
  for (const [key, label] of Object.entries(dimensionLabels)) {
    // hyperactivity_index 同时存在独立列与 t_scores 键，优先用独立列（权威）
    if (key === 'hyperactivity_index') {
      const v = row.hyperactivity_index ?? tScores[key]
      dimensionScores[label] = v == null ? null : Number(v)
    } else {
      const v = tScores[key]
      dimensionScores[label] = v == null ? null : Number(v)
    }
  }
  const extra: Record<string, number> = {}
  if (row.pi_score != null) extra.pi_score = Number(row.pi_score)
  if (row.ni_score != null) extra.ni_score = Number(row.ni_score)
  return {
    assessId: row.id,
    date: row.created_at,
    ageMonths: Number(row.age_months) || 0,
    totalScore: Number(row.hyperactivity_index) || 0,
    level: String(row.level ?? ''),
    dimensionScores,
    extra: Object.keys(extra).length ? extra : undefined,
  }
}

// ==================== 工具函数 ====================

/** 容错解析 JSON 字符串为 Record，脏数据返回空对象。 */
export function safeParseJsonRecord(raw: any): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, any>
  try {
    const parsed = JSON.parse(String(raw))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, any>)
      : {}
  } catch {
    return {}
  }
}

/** 按日期升序排序（最早的在前）。日期缺失或相同则保持稳定。 */
export function byDateAsc(a: ScoreSnapshot, b: ScoreSnapshot): number {
  const ta = a.date ? Date.parse(a.date) : 0
  const tb = b.date ? Date.parse(b.date) : 0
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 0
  return ta - tb
}

/** 安全转 number，无效则 0。 */
function numOrZero(v: any): number {
  return v == null ? 0 : Number(v) || 0
}

/** 安全转 string，空值则 ''。 */
function strOrEmpty(v: any): string {
  return v == null ? '' : String(v)
}
