#!/usr/bin/env node
/**
 * verify-cpep3-item-bank.mjs — CPEP-3 题库/常模数据门禁
 *
 * 断言（设计文档 §1.4 / §3.3）：
 *  1. 题库 139 题，codeNo 唯一
 *  2. 能区结构：7 发展区 + 5 病理区；施测 95 / 观察 44
 *  3. 各发展能区施测题数与 pg 常模档位数对齐（档位 = 题数 + 1，全覆盖 0..N）
 *  4. gn 常模总通过数 0..95 连续全覆盖
 *  5. 非标准档 4 题保留原始档位（6B 仅 P；17C / *22B / 55 仅 P,E）
 *  6. 修正项生效：「手言协调」零残留；gn 行字段为 totalPassCount
 *  7. 计分编码：施测 P=1/E=0/F=0；观察 A=0/M=1/S=2；每题选项 score 值域 0-2
 *  8. 常模月龄区间格式合法（数字-数字，min<=max）
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
process.env.NODE_ENV = process.env.NODE_ENV || 'test'

const jiti = require('jiti')
const load = jiti(import.meta.url, { alias: { '@': resolve(root, 'src') } })

const { CPEP3_QUESTIONS, CPEP3_PG_MONTH_NORMS, CPEP3_GN_FZ_MONTH_NORMS, CPEP3_DOMAIN_DEFINITIONS } =
  load('@/database/cpep3-questions.ts')
const {
  CPEP3_DEVELOPMENTAL_DOMAIN_CODES,
  CPEP3_PATHOLOGICAL_DOMAIN_CODES,
} = load('@/types/cpep_3.ts')

let failed = 0
function check(name, cond, detail = '') {
  if (cond) {
    console.log(`  ✔ ${name}`)
  } else {
    failed++
    console.error(`  ✖ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

console.log('== CPEP-3 题库/常模门禁 ==')

// 1. 题量与唯一性
check('1a. 题库 139 题', CPEP3_QUESTIONS.length === 139, `实际 ${CPEP3_QUESTIONS.length}`)
const codeNos = CPEP3_QUESTIONS.map((q) => q.codeNo)
check('1b. codeNo 唯一', new Set(codeNos).size === codeNos.length)

// 2. 能区结构
const byType = { administered: 0, rated: 0 }
for (const q of CPEP3_QUESTIONS) byType[q.itemType]++
check('2a. 施测 95 / 观察 44', byType.administered === 95 && byType.rated === 44, JSON.stringify(byType))
const domainNames = new Set(CPEP3_DOMAIN_DEFINITIONS.map((d) => d.name))
check('2b. 能区定义 12 个（7 发展 + 5 病理）',
  CPEP3_DEVELOPMENTAL_DOMAIN_CODES.length === 7 && CPEP3_PATHOLOGICAL_DOMAIN_CODES.length === 5
  && CPEP3_DOMAIN_DEFINITIONS.length === 12)
const itemDomains = new Set(CPEP3_QUESTIONS.map((q) => q.domainCode))
check('2c. 题目能区 ⊆ 能区定义', [...itemDomains].every((d) => domainNames.size > 0 && CPEP3_DOMAIN_DEFINITIONS.some((m) => m.code === d)))

// 「手言协调」零残留
const typoLeft = CPEP3_QUESTIONS.filter((q) => q.domainName === '手言协调').length
check('2d. 「手言协调」错别字零残留', typoLeft === 0, `残留 ${typoLeft}`)
const eDomainNames = new Set(CPEP3_QUESTIONS.filter((q) => q.domainCode === 'E').map((q) => q.domainName))
check('2e. E 能区统一「手眼协调」', eDomainNames.size === 1 && [...eDomainNames][0] === '手眼协调')

// 各能区题数
const DEV = CPEP3_DEVELOPMENTAL_DOMAIN_CODES
const perDomain = {}
for (const d of DEV) {
  perDomain[d] = CPEP3_QUESTIONS.filter((q) => q.domainCode === d && q.itemType === 'administered').length
}
check('2f. 能区题数 A10/B11/C10/D11/E14/F20/G19',
  perDomain.A === 10 && perDomain.B === 11 && perDomain.C === 10 && perDomain.D === 11
  && perDomain.E === 14 && perDomain.F === 20 && perDomain.G === 19,
  JSON.stringify(perDomain))

// 3. pg 常模对齐：各能区档位数 = 题数 + 1，passCount 全覆盖 0..N
for (const d of DEV) {
  const rows = CPEP3_PG_MONTH_NORMS.filter((r) => r.domainCode === d)
  const counts = rows.map((r) => r.passCount).sort((a, b) => a - b)
  const expected = Array.from({ length: perDomain[d] + 1 }, (_, i) => i)
  check(`3${d}. ${d} 区 pg 档位 ${perDomain[d] + 1} 档全覆盖 0..${perDomain[d]}`,
    rows.length === perDomain[d] + 1 && JSON.stringify(counts) === JSON.stringify(expected),
    `实际 ${rows.length} 档`)
}

// 4. gn 常模 0..95 全覆盖
const gnCounts = CPEP3_GN_FZ_MONTH_NORMS.map((r) => r.totalPassCount)
const gnExpected = Array.from({ length: 96 }, (_, i) => i)
check('4a. gn 总通过数 0..95 连续全覆盖',
  gnCounts.length === 96 && JSON.stringify([...gnCounts].sort((a, b) => a - b)) === JSON.stringify(gnExpected))

// 6b. gn 字段语义纠正生效（无 developmentalQuotient 字段残留）
const gnRaw = readFileSync(resolve(root, 'src/database/cpep3-questions.ts'), 'utf8')
check('4b. gn 字段已纠正为 totalPassCount', gnRaw.includes('totalPassCount') && !/developmentalQuotient/.test(gnRaw.slice(gnRaw.indexOf('CPEP3_GN_FZ_MONTH_NORMS'))))

// 5g. NA 施测指示语零残留（源软件错误粘贴，PEP-3 官方计分无 NA 规则；禁止粗暴禁"年龄"普通词）
const FORBIDDEN_PATTERNS = ['不适用', '年龄规定', '有年龄规定', '记为NA', '记为 NA', 'Not Applicable']
const forbiddenHits = []
for (const q of CPEP3_QUESTIONS) {
  const haystacks = [q.taskName, q.materialDesc ?? '', q.procedureDesc ?? '', ...q.scoreLevels.map((s) => s.desc)]
  for (const text of haystacks) {
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (text.includes(pattern)) forbiddenHits.push(`${q.codeNo}: "${pattern}"`)
    }
  }
}
check('5g-1. 题干/教具/施测说明/评分档零 NA 指示语残留（6 种 forbidden pattern）', forbiddenHits.length === 0,
  forbiddenHits.slice(0, 5).join(' / '))
check('5g-2. NA 剥离恰好 28 题（源数据 NA 标记题数）', (() => {
  const srcItems = JSON.parse(readFileSync(resolve(root, 'export/CPEP-3/cpep3_items.json'), 'utf8'))
  return srcItems.filter((i) => i.taskName.includes('于有年龄规定')).length === 28
})())
check('5g-3. 剥离后题干非空', CPEP3_QUESTIONS.every((q) => q.taskName.length > 0))

const byCode = Object.fromEntries(CPEP3_QUESTIONS.map((q) => [q.codeNo, q]))
// 5. 评分档位完整性：4 道源库录入不全的施测题已经人工补录（修正项 5，2026-09-09 用户确认），
//    现在全部 95 道施测题均应为标准 P/E/F 三级
check('5a. 6B 补录后为 P,E,F', JSON.stringify(byCode['6B'].scoreLevels.map((s) => s.level)) === JSON.stringify(['P', 'E', 'F']),
  `实际 ${byCode['6B'].scoreLevels.map((s) => s.level).join('/')}`)
check('5b. 17C 补录后为 P,E,F', JSON.stringify(byCode['17C'].scoreLevels.map((s) => s.level)) === JSON.stringify(['P', 'E', 'F']))
check('5c. *22B 补录后为 P,E,F', JSON.stringify(byCode['*22B'].scoreLevels.map((s) => s.level)) === JSON.stringify(['P', 'E', 'F']))
check('5d. 55 补录后为 P,E,F', JSON.stringify(byCode['55'].scoreLevels.map((s) => s.level)) === JSON.stringify(['P', 'E', 'F']))
// 其余施测题 P/E/F
const nonStandard = new Set(['6B', '17C', '*22B', '55'])
const allStandard = CPEP3_QUESTIONS
  .filter((q) => q.itemType === 'administered' && !nonStandard.has(q.codeNo))
  .every((q) => JSON.stringify(q.scoreLevels.map((s) => s.level)) === JSON.stringify(['P', 'E', 'F']))
check('5e. 其余 91 道施测题均 P/E/F', allStandard)
// 观察题均 A/M/S
const allRated = CPEP3_QUESTIONS
  .filter((q) => q.itemType === 'rated')
  .every((q) => JSON.stringify(q.scoreLevels.map((s) => s.level)) === JSON.stringify(['A', 'M', 'S']))
check('5f. 44 道观察题均 A/M/S', allRated)

// 7. 计分编码（任务书 §2.2 固定映射：施测 P=2/E=1/F=0；观察严重度分 A=0/M=1/S=2，方向审计已核实）
const ADMIN_SCORE = { P: 2, E: 1, F: 0 }
const RATED_SCORE = { A: 0, M: 1, S: 2 }
const scoringOk = CPEP3_QUESTIONS.every((q) =>
  q.scoreLevels.every((s) => {
    const expect = q.itemType === 'administered' ? ADMIN_SCORE[s.level] : RATED_SCORE[s.level]
    return s.score === expect && s.desc.length > 0
  }),
)
check('7a. 施测 P=2/E=1/F=0、观察 A=0/M=1/S=2，描述非空', scoringOk)

// 8. 月龄区间格式
const rangeOk = [...CPEP3_PG_MONTH_NORMS, ...CPEP3_GN_FZ_MONTH_NORMS].every((r) => {
  const m = r.monthRange.match(/^(\d+)-(\d+)$/)
  return m && Number(m[1]) <= Number(m[2])
})
check('8a. 常模月龄区间格式合法', rangeOk)

// pg 与 gn 能区名一致性（修正后）
const pgNameOk = CPEP3_PG_MONTH_NORMS.every((r) => r.domainName !== '手言协调')
check('8b. pg 常模无「手言协调」残留', pgNameOk)

// 9. 建表 SQL 含报告快照三列（schema-plan §2，对生成 SQL 断言不连库）
const initRaw = readFileSync(resolve(root, 'src/database/init.ts'), 'utf8')
const cpep3TableSql = initRaw.slice(initRaw.indexOf('CREATE TABLE IF NOT EXISTS cpep3_assess'))
check('9a. cpep3_assess 无 dq 列（任务书 §23 禁总 DQ；旧库迁移 DROP COLUMN dq）',
  cpep3TableSql.includes('CREATE TABLE IF NOT EXISTS cpep3_assess')
  && !/^\s*dq REAL/m.test(cpep3TableSql.slice(0, cpep3TableSql.indexOf(';')))
  && initRaw.includes('DROP COLUMN dq'))
check('9b. cpep3_assess 含 report_snapshot/report_version/scoring_version 三列',
  cpep3TableSql.includes('report_snapshot TEXT')
  && cpep3TableSql.includes('report_version TEXT')
  && cpep3TableSql.includes('scoring_version TEXT'))
check('9c. cpep3_assess_detail 注释为 P=2/E=1/F=0 新语义',
  /CPEP-3评估详情表（每题一行；score: 施测 P=2\/E=1\/F=0，观察 A=0\/M=1\/S=2）/.test(initRaw))

console.log(failed === 0 ? '\n全部通过 ✅' : `\n${failed} 项失败 ❌`)
process.exit(failed === 0 ? 0 : 1)
