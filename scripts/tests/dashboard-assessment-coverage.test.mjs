import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

// 首页看板评估覆盖契约：
// 1. 覆盖范围必须与 assessment catalog 一致（18 个量表）——历史上这里硬编码 8 张表，
//    其后新增的 ABC/ATEC/PEP-3 等 10 个量表长期未同步，只在那些量表建过基线的学生
//    被误判为「尚无评估记录」（真实库实测复现）。
// 2. 表清单只能从 assessment-quality-api 的 QUALITY_TABLES 派生（单一真源），
//    禁止在 dashboard-api 里再抄一份硬编码表名。
// 3. 每个量表要么注册了分数适配器（参与强弱判定），要么在 assessment-gap-analysis
//    里显式声明为「仅计覆盖」——新增量表不得静默漏判。

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: { '@': `${projectRoot}/src` },
})

const readRepoFile = (rel) => readFileSync(resolve(projectRoot, rel), 'utf8')

/** 从 QUALITY_TABLES 源码清单里抽出 { table, code } 行。 */
function readQualityTableRows() {
  const source = readRepoFile('src/database/assessment-quality-api.ts')
  return [...source.matchAll(/\{\s*table:\s*'([a-z0-9_]+_assess)',\s*code:\s*'([a-z0-9_-]+)'\s*\}/g)].map(
    (match) => ({ table: match[1], code: match[2] }),
  )
}

/** 已注册适配器的量表码（SCORE_ADAPTERS 注册表键）。 */
function readRegisteredAdapterCodes() {
  const source = readRepoFile('src/services/assessment-score-adapters.ts')
  const block = source.match(/export const SCORE_ADAPTERS[\s\S]*?\n\}/)
  assert.ok(block, 'assessment-score-adapters 缺少 SCORE_ADAPTERS 注册表')
  return [...block[0].matchAll(/^\s{2}([a-z0-9_]+):/gm)].map((match) => match[1])
}

/** 显式声明为「仅计覆盖」的量表码。 */
function readCoverageOnlyCodes() {
  const source = readRepoFile('src/services/assessment-gap-analysis.ts')
  const block = source.match(/COVERAGE_ONLY_SCALE_CODES[^=]*=\s*\[([^\]]*)\]/)
  assert.ok(block, 'assessment-gap-analysis 缺少 COVERAGE_ONLY_SCALE_CODES')
  return [...block[1].matchAll(/'([a-z0-9_]+)'/g)].map((match) => match[1])
}

test('1. 待评估聚合覆盖 catalog 全部量表（18 张主表，漏一个即误报）', () => {
  const catalog = jiti('../../src/features/assessment/assessment-scale-catalog.ts')
  const catalogCodes = catalog.ASSESSMENT_SCALE_CATALOG.map((item) => item.code)
  const rows = readQualityTableRows()
  const registeredCodes = new Set(rows.map((row) => row.code))

  assert.equal(catalogCodes.length, 18, `catalog 量表数应为 18，实际 ${catalogCodes.length}`)
  for (const code of catalogCodes) {
    assert.ok(
      registeredCodes.has(code),
      `评估聚合缺少量表 ${code} 的主表注册（该量表建过基线的学生会被误判「尚无评估记录」）`,
    )
  }
  assert.equal(rows.length, catalogCodes.length, '清单存在 catalog 之外的冗余表注册')
})

test('2. 表清单从 QUALITY_TABLES 派生，dashboard-api 不得硬编码表名', () => {
  const dashboardSource = readRepoFile('src/database/dashboard-api.ts')

  assert.match(
    dashboardSource,
    /for \(const \{ table, code \} of QUALITY_TABLES\)/,
    '评估聚合必须逐条遍历 QUALITY_TABLES（单一真源）',
  )
  assert.match(
    dashboardSource,
    /FROM \$\{table\} t/,
    '每张量表主表必须由清单动态拼进 SQL（不得写死表名）',
  )

  const bareTableNames = [...dashboardSource.matchAll(/'([a-z0-9_]+_assess)'/g)].map((match) => match[1])
  assert.deepEqual(bareTableNames, [], `dashboard-api 出现硬编码量表表名：${bareTableNames.join(', ')}`)
})

test('3. 每个量表要么有适配器，要么显式声明为仅计覆盖（防静默漏判）', () => {
  const registered = new Set(readRegisteredAdapterCodes())
  const coverageOnly = new Set(readCoverageOnlyCodes())

  for (const { code } of readQualityTableRows()) {
    const adapterKey = code.replace(/-/g, '_')
    assert.ok(
      registered.has(adapterKey) || coverageOnly.has(adapterKey),
      `量表 ${code} 既未注册分数适配器，也未在 COVERAGE_ONLY_SCALE_CODES 声明仅计覆盖`,
    )
  }
})

test('4. 表名白名单：全部形如 `<code>_assess`（拼进 SQL 前的基本面）', () => {
  for (const { table } of readQualityTableRows()) {
    assert.match(
      table,
      /^[a-z][a-z0-9_]*_assess$/,
      `表名 ${table} 不符合 <code>_assess 形状，不得拼进 SQL`,
    )
  }
})
