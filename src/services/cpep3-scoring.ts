/**
 * CPEP-3 计分核心纯函数（无数据库依赖，可被 jiti 直接单测）。
 *
 * 从 Cpep3Driver 抽出的纯计算：pg/gn 常模查表、CA 精确计算、月龄区间中值、天花板/超龄警示判定。
 * 驱动器负责作答收集与组装，本模块只做数值变换（与 assessment-score-normalize 同范式）。
 */
import type { Cpep3DomainCode, Cpep3DomainResult, Cpep3DevelopmentalDomainCode } from '@/types/cpep_3'

/** pg 常模行（结构与 cpep3-questions.ts 一致，纯数据） */
export interface PgNormRow {
  domainCode: Cpep3DevelopmentalDomainCode
  domainName: string
  monthRange: string
  passCount: number
}

/** gn 常模行 */
export interface GnNormRow {
  totalPassCount: number
  monthRange: string
}

/** 月龄区间中值："22-29" → 25.5 */
export function monthRangeMidpoint(range: string): number {
  const parts = range.split('-')
  const lo = Number(parts[0])
  const hi = Number(parts[1])
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 0
  return (lo + hi) / 2
}

/** 分能区常模查表：通过数 → 发展当量月龄区间行（未命中返回 undefined） */
export function lookupPgNorm(pgNorms: PgNormRow[], domain: Cpep3DevelopmentalDomainCode, passCount: number): PgNormRow | undefined {
  return pgNorms.find((r) => r.domainCode === domain && r.passCount === passCount)
}

/** 总量常模查表：总通过数 → 总发展当量月龄区间行 */
export function lookupGnNorm(gnNorms: GnNormRow[], totalPassCount: number): GnNormRow | undefined {
  return gnNorms.find((r) => r.totalPassCount === totalPassCount)
}

/** 派生 DQ = DA / CA × 100（保留 1 位小数；CA 非法时返回 0） */
export function deriveDq(developmentalAgeMonths: number, caMonthsDecimal: number): number {
  if (!Number.isFinite(caMonthsDecimal) || caMonthsDecimal <= 0) return 0
  return Number(((developmentalAgeMonths / caMonthsDecimal) * 100).toFixed(1))
}

/** CA 精确计算结果 */
export interface ChronologicalAge {
  year: number
  month: number
  day: number
  monthsDecimal: number
}

/**
 * CA：年月日借位、月按 30 天（设计文档 §2）。
 * 不采用「≥15 天进 1 个月」——PEP-3 手册口径是精确实际年龄，不做向上取整。
 */
export function resolveChronologicalAge(birthday: string, now: Date = new Date()): ChronologicalAge {
  const birth = birthday ? new Date(birthday) : null
  if (!birth || Number.isNaN(birth.getTime())) {
    throw new Error('CPEP-3 需要学生出生日期才能计算实际月龄。')
  }
  let year = now.getFullYear() - birth.getFullYear()
  let month = now.getMonth() - birth.getMonth()
  let day = now.getDate() - birth.getDate()
  if (day < 0) {
    month -= 1
    day += 30
  }
  if (month < 0) {
    year -= 1
    month += 12
  }
  return { year, month, day, monthsDecimal: year * 12 + month + day / 30 }
}

/** 天花板/超龄警示（设计文档 §2）：返回 null 表示无警示。 */
export function buildCeilingWarning(
  caMonthsDecimal: number,
  domainResults: Cpep3DomainResult[],
  domainMaxPass: Record<Cpep3DomainCode, number>,
  normAgeLimitMonths: number,
): string | null {
  if (caMonthsDecimal > normAgeLimitMonths) {
    return `被评者实际年龄（约 ${(caMonthsDecimal / 12).toFixed(1)} 岁）已超出 PEP-3 常模覆盖范围（约 2-7.5 岁），DA/CA 比率型指标存在显著的年龄及天花板效应，不宜作为严重程度或纵向进步的主要指标，请优先解读发展当量月龄与技能剖面。`
  }
  const ceilingDomain = domainResults.find(
    (r) => r.kind === 'developmental' && (r.passCount ?? 0) >= domainMaxPass[r.domainCode],
  )
  if (ceilingDomain) {
    return `${ceilingDomain.domainName}能区通过数已达量表上限，该能区发展当量受测量天花板限制，解释时请谨慎。`
  }
  return null
}
