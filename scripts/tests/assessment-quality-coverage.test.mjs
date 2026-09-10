import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

// 评估质量追踪对齐契约：
// 1. QUALITY_TABLES 必须覆盖 catalog 全部量表（新量表接入漏注册 → 看板漏汇总，CPEP-3 曾漏）
// 2. 表名约定 = `${code}_assess`，清单外的历史不一致表名必须单列在 EXPECTED_TABLE_OVERRIDES
// 3. 质量看板必须有系统管理页入口（System.vue 的 quality tab），不允许退回「仅 URL 直达」

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: { '@': `${projectRoot}/src` },
})

const readRepoFile = (rel) => readFileSync(resolve(projectRoot, rel), 'utf8')

// 表名与量表码不一致的历史特例（cpep3_assess ↔ cpep_3：目录码带下划线、表名不带）
const EXPECTED_TABLE_OVERRIDES = new Map([
  ['cpep3_assess', 'cpep_3'],
])

test('1. QUALITY_TABLES 覆盖 assessment catalog 全部量表（18 项）', () => {
  const apiSource = readRepoFile('src/database/assessment-quality-api.ts')
  const catalog = jiti('../../src/features/assessment/assessment-scale-catalog.ts')

  const rows = [...apiSource.matchAll(/\{\s*table:\s*'([a-z0-9_]+_assess)',\s*code:\s*'([a-z0-9_-]+)'\s*\}/g)]
  const tableByCode = new Map(rows.map((m) => [m[2], m[1]]))
  const catalogCodes = catalog.ASSESSMENT_SCALE_CATALOG.map((item) => item.code)

  assert.equal(catalogCodes.length, 18, `catalog 量表数应为 18，实际 ${catalogCodes.length}`)
  for (const code of catalogCodes) {
    assert.ok(tableByCode.has(code), `QUALITY_TABLES 缺少量表 ${code} 的质量表注册`)
  }
  assert.equal(rows.length, catalogCodes.length, 'QUALITY_TABLES 存在 catalog 之外的冗余表注册')
})

test('2. 表名遵循「量表码连字符转下划线 + _assess」约定（cpep3 为唯一特例）', () => {
  const apiSource = readRepoFile('src/database/assessment-quality-api.ts')
  const rows = [...apiSource.matchAll(/\{\s*table:\s*'([a-z0-9_]+_assess)',\s*code:\s*'([a-z0-9_-]+)'\s*\}/g)]

  for (const [, table, code] of rows) {
    if (EXPECTED_TABLE_OVERRIDES.has(table)) {
      assert.equal(code, EXPECTED_TABLE_OVERRIDES.get(table), `${table} 的特例映射须与 EXPECTED_TABLE_OVERRIDES 一致`)
      continue
    }
    assert.equal(table, `${code.replace(/-/g, '_')}_assess`, `表名 ${table} 与量表码 ${code} 不符合下划线转换约定；如是新的历史特例，请单列进 EXPECTED_TABLE_OVERRIDES`)
  }
})

test('3. 质量表清单与 ensureAssessmentQualityColumns 的建列清单一致', () => {
  const apiSource = readRepoFile('src/database/assessment-quality-api.ts')
  const initSource = readRepoFile('src/database/init.ts')

  const apiTables = [...apiSource.matchAll(/table:\s*'([a-z0-9_]+_assess)'/g)].map((m) => m[1]).sort()
  const initBlock = initSource.match(/function ensureAssessmentQualityColumns[\s\S]*?\n\}/)
  assert.ok(initBlock, 'init.ts 缺少 ensureAssessmentQualityColumns')
  const initTables = [...initBlock[0].matchAll(/'([a-z0-9_]+_assess)'/g)].map((m) => m[1])

  const uniqueInit = [...new Set(initTables)].sort()
  assert.deepEqual(apiTables, uniqueInit, 'QUALITY_TABLES 与质量列迁移清单表集不一致')
})

test('4. 质量看板已接入系统管理页（quality tab），不再依赖 URL 直达', () => {
  const systemSource = readRepoFile('src/views/System.vue')

  assert.match(systemSource, /<el-tab-pane[^>]*name="quality"/, 'System.vue 缺少评估质量 tab')
  assert.match(systemSource, /import AssessmentQualityBoard from '\.\/system\/AssessmentQualityBoard\.vue'/)
  assert.match(systemSource, /<AssessmentQualityBoard \/>/)
})
