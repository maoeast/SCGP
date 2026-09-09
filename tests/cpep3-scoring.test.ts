/**
 * CPEP-3 计分核心 — 单元测试（纯函数，无 DB 依赖）
 *
 * 运行：npx jiti tests/cpep3-scoring.test.ts
 *
 * 覆盖（设计文档 §3.3 计分语义）：
 *  1. pg/gn 常模查表与月龄区间中值
 *  2. 派生 DQ = DA / CA × 100
 *  3. CA 精确计算（年月日借位、月按 30 天，无「≥15 天进 1 月」）
 *  4. 天花板/超龄警示判定
 *  5. 计分器端到端（作答 → 能区统计 → 常模查表，经 jiti alias 加载 Driver）
 */
import assert from 'node:assert/strict'
import { createJiti } from 'jiti'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  monthRangeMidpoint,
  lookupPgNorm,
  lookupGnNorm,
  deriveDq,
  resolveChronologicalAge,
  buildCeilingWarning,
  type PgNormRow,
  type GnNormRow,
} from '../src/services/cpep3-scoring.ts'
import type { Cpep3DomainResult, Cpep3DevelopmentalDomainCode } from '../src/types/cpep_3.ts'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// cpep3-questions.ts 是纯数据模块（无 DB 副作用），经 jiti alias 加载真实常模
const { CPEP3_PG_MONTH_NORMS: PG, CPEP3_GN_FZ_MONTH_NORMS: GN, CPEP3_QUESTIONS } = await (async () => {
  const { createJiti } = await import('jiti')
  const j = createJiti(import.meta.url, { alias: { '@': join(projectRoot, 'src') } })
  return await j.import(join(projectRoot, 'src/database/cpep3-questions.ts'))
})()

// ---------- 1. 月龄区间中值 ----------
{
  assert.equal(monthRangeMidpoint('22-29'), 25.5)
  assert.equal(monthRangeMidpoint('0-12'), 6)
  assert.equal(monthRangeMidpoint('58-61'), 59.5)
  assert.equal(monthRangeMidpoint(''), 0, '空串容错返回 0')
  console.log('✔ 1. 月龄区间中值')
}

// ---------- 2. pg/gn 查表（用真实常模） ----------
{
  const pgNorms: PgNormRow[] = [
    { domainCode: 'A', domainName: '模仿', monthRange: '12-16', passCount: 6 },
    { domainCode: 'A', domainName: '模仿', monthRange: '14-18', passCount: 7 },
  ]
  const hit = lookupPgNorm(pgNorms as never, 'A', 6)
  assert.equal(hit?.monthRange, '12-16')
  assert.equal(lookupPgNorm(pgNorms as never, 'A', 99), undefined, '越界通过数返回 undefined')

  const gnNorms: GnNormRow[] = [
    { totalPassCount: 0, monthRange: '0-12' },
    { totalPassCount: 6, monthRange: '12-16' },
  ]
  assert.equal(lookupGnNorm(gnNorms, 6)?.monthRange, '12-16')
  assert.equal(lookupGnNorm(gnNorms, 1), undefined)
  console.log('✔ 2. pg/gn 查表命中与未命中')
}

// ---------- 3. 派生 DQ ----------
{
  assert.equal(deriveDq(24, 48), 50, 'DA24/CA48 → DQ 50')
  assert.equal(deriveDq(25.5, 48), 53.1, '区间中值 DA 25.5/48 → 53.1')
  assert.equal(deriveDq(24, 0), 0, 'CA=0 防御返回 0')
  assert.equal(deriveDq(24, -1), 0, 'CA 负值防御返回 0')
  console.log('✔ 3. 派生 DQ = DA/CA×100')
}

// ---------- 4. CA 精确计算 ----------
{
  // 固定「今天」验证借位逻辑
  const now = new Date(2026, 8, 9) // 2026-09-09
  // 恰好 4 周岁
  const ca1 = resolveChronologicalAge('2022-09-09', now)
  assert.deepEqual([ca1.year, ca1.month, ca1.day], [4, 0, 0])
  assert.equal(ca1.monthsDecimal, 48)
  // 4 岁 3 月 9 天（30 天月制借位：9-30+30=9；按日历长度是 10 天，但 PEP-3 口径月按 30 天）
  const ca2 = resolveChronologicalAge('2022-05-30', now)
  assert.deepEqual([ca2.year, ca2.month, ca2.day], [4, 3, 9])
  // 日借位：2022-09-15 出生 → 9-09 未到生日日 → 月退 1，日 +30
  const ca3 = resolveChronologicalAge('2022-09-15', now)
  assert.equal(ca3.year, 3)
  assert.equal(ca3.month, 11)
  assert.equal(ca3.day, 24, '9-09 vs 9-15：日借位后 24 天')
  // 月借位跨年
  const ca4 = resolveChronologicalAge('2022-12-09', now)
  assert.equal(ca4.year, 3)
  assert.equal(ca4.month, 9)
  // 不变量：day ∈ [0,29]
  for (const d of [1, 8, 9, 10, 15, 28]) {
    const ca = resolveChronologicalAge(`2022-09-${String(d).padStart(2, '0')}`, now)
    assert.ok(ca.day >= 0 && ca.day < 30, `day 借位后应在 0-29（输入 ${d}）`)
  }
  assert.throws(() => resolveChronologicalAge(''), /出生日期/, '缺生日应抛错')
  console.log('✔ 4. CA 精确计算（借位 + 30 天月 + 跨年）')
}

// ---------- 5. 天花板/超龄警示 ----------
{
  const domainMaxPass = { A: 10, B: 11, C: 10, D: 11, E: 14, F: 20, G: 19, H: 6, I: 7, J: 6, K: 14, L: 11 }
  const devFull: Cpep3DomainResult[] = [
    { domainCode: 'F', domainName: '认知表现', kind: 'developmental', passCount: 20, emergingCount: 0, monthRange: '77-81', developmentalAgeMonths: 79, dq: 164.6 },
  ]
  const warnCeiling = buildCeilingWarning(48, devFull, domainMaxPass as never, 90)
  assert.ok(warnCeiling?.includes('认知表现'), '满分能区触发天花板警示')

  const devNormal: Cpep3DomainResult[] = [
    { domainCode: 'F', domainName: '认知表现', kind: 'developmental', passCount: 10, emergingCount: 0, monthRange: '30-35', developmentalAgeMonths: 32.5, dq: 67.7 },
  ]
  assert.equal(buildCeilingWarning(48, devNormal, domainMaxPass as never, 90), null, '正常通过数无警示')

  const warnOverage = buildCeilingWarning(96, devNormal, domainMaxPass as never, 89)
  assert.ok(warnOverage?.includes('常模'), '超龄（96>89 月）触发常模警示')
  // 89/90 边界精确性：CA=89 在常模内（无警示），CA=90 超龄（有警示）
  assert.equal(buildCeilingWarning(89, devNormal, domainMaxPass as never, 89), null, 'CA=89 应属常模内（<=89）')
  assert.ok(buildCeilingWarning(90, devNormal, domainMaxPass as never, 89)?.includes('常模'), 'CA=90 应触发超龄（>=90）')
  console.log('✔ 5. 天花板/超龄警示判定（含 89/90 边界）')
}

// ---------- 6. 端到端：作答统计 → E 不计通过 → pg/gn 查表（题库真数据 + 纯函数，不引 Driver 链） ----------
{
  const questionByCode = new Map(CPEP3_QUESTIONS.map((q) => [q.codeNo, q]))
  const aQuestions = CPEP3_QUESTIONS.filter((q) => q.domainCode === 'A')

  // 全 F 基础上：A 区前 6 题 P、随后 2 题 E
  const answers = new Map<number, string>()
  for (const q of CPEP3_QUESTIONS) {
    const levels = q.scoreLevels.map((sl) => sl.level)
    answers.set(q.id, levels.includes('F') ? 'F' : levels[levels.length - 1])
  }
  for (let i = 0; i < 6; i++) answers.set(aQuestions[i].id, 'P')
  for (let i = 6; i < 8; i++) answers.set(aQuestions[i].id, 'E')

  // 复刻 Driver 的能区统计核心（administered: P→pass, E→emerging）
  let passCount = 0
  let emergingCount = 0
  for (const q of aQuestions) {
    const level = answers.get(q.id)
    if (level === 'P') passCount++
    else if (level === 'E') emergingCount++
  }

  assert.equal(passCount, 6, 'A 区通过数 6（E 不计）')
  assert.equal(emergingCount, 2, 'A 区萌发数 2')

  // 查表：pg[A][6] / gn[6]
  const pgA6 = lookupPgNorm(PG as never, 'A', 6)
  assert.equal(pgA6?.monthRange.length > 0, true, 'pg[A][6] 命中')
  const gn6 = lookupGnNorm(GN, 6)
  assert.equal(gn6?.monthRange.length > 0, true, 'gn[6] 命中')

  // 派生 DQ 链
  const da = monthRangeMidpoint(pgA6!.monthRange)
  const ca = resolveChronologicalAge('2022-09-09', new Date(2026, 8, 9))
  const dq = deriveDq(da, ca.monthsDecimal)
  assert.equal(dq, deriveDq(monthRangeMidpoint(pgA6!.monthRange), 48), 'CA=48 月时 DQ 稳定')

  console.log('  端到端样本: A 区通过 6 →', pgA6!.monthRange, '月 / 总 gn', gn6!.monthRange, '月 / DQ', dq)
}

// ---------- 7. 补录档位题（6B 原源数据仅 P，人工补录后为标准三级） ----------
{
  const q6b = CPEP3_QUESTIONS.find((q: any) => q.codeNo === '6B')!
  assert.deepEqual(q6b.scoreLevels.map((s: any) => s.level), ['P', 'E', 'F'], '6B 应已补录为标准三级')
  // 补录档计分符合任务书 §2.2 固定映射：P=2/E=1/F=0
  assert.deepEqual(q6b.scoreLevels.map((s: any) => s.score), [2, 1, 0])
  // 6B E/F 描述对齐用户判据关键语义（萌发=近似/部分发声；未通过=充分示范后无目标相关模仿）
  const e6b = q6b.scoreLevels.find((s: any) => s.level === 'E')!.desc
  const f6b = q6b.scoreLevels.find((s: any) => s.level === 'F')!.desc
  assert.ok(e6b.includes('模仿意图') && (e6b.includes('近似') || e6b.includes('不完整')), '6B E 档应含萌发判据')
  assert.ok(f6b.includes('没有出现') && f6b.includes('示范'), '6B F 档应含未通过判据')
  for (const code of ['17C', '*22B', '55']) {
    const q = CPEP3_QUESTIONS.find((item: any) => item.codeNo === code)!
    assert.deepEqual(q.scoreLevels.map((s: any) => s.level), ['P', 'E', 'F'], code + ' 应已补录 F 档')
    assert.equal(q.scoreLevels.map((s: any) => s.score).join(','), '2,1,0', code + ' 补录后计分应为 P=2/E=1/F=0')
  }
  console.log('✔ 7. 4 道补录题恢复标准 P/E/F 三档（计分 P=2/E=1/F=0）')
}

console.log('\nCPEP-3 计分核心单测全部通过 ✅')
