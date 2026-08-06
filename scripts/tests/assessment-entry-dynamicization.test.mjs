import test from 'node:test'
import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
    '@element-plus/icons-vue': `${projectRoot}/scripts/tests/fixtures/element-plus-icons-vue.mock.js`,
  },
})

function loadModules() {
  return {
    catalog: jiti('../../src/features/assessment/assessment-scale-catalog.ts'),
    reportRoutes: jiti('../../src/features/assessment/report-routes.ts'),
    assessmentReportRoutes: jiti('../../src/features/assessment/assessment-report-routes.ts'),
    assessmentTrendRoutes: jiti('../../src/features/assessment/assessment-trend-routes.ts'),
  }
}

// 历史路由名（router/index.ts 原手写值），防 catalog reportRouteName 回归
const EXPECTED_REPORT_ROUTE_NAMES = [
  'SMReport', 'WeeFIMReport', 'CSIRSReport', 'ConnersPSQReport', 'ConnersTRSReport',
  'SDQReport', 'SRS2Report', 'CBCLReport', 'FineMotorReport', 'Cnbsr2016Report',
  'Gmfm88Report', 'Tgmd3Report', 'BRIEFReport', 'CRTReport', 'CognitiveSelfReport',
]

const REQUIRED_REPORT_FIELDS = [
  'urlSlug', 'reportRouteName', 'reportPathParamStyle', 'reportComponentFolder',
  'reportMetaTitle', 'reportTone', 'reportTagType', 'reportSelectLabel',
  'reportCardLabel', 'recordsLabel', 'isDraft',
]

test('1. catalog 每条量表含全部报告派生字段（15 条）', () => {
  const { catalog } = loadModules()
  assert.equal(catalog.ASSESSMENT_SCALE_CATALOG.length, 15)
  for (const item of catalog.ASSESSMENT_SCALE_CATALOG) {
    for (const field of REQUIRED_REPORT_FIELDS) {
      assert.ok(field in item, `${item.code} 缺字段 ${field}`)
    }
    assert.ok(['params', 'query'].includes(item.reportPathParamStyle), `${item.code} reportPathParamStyle 非法`)
    assert.equal(typeof item.isDraft, 'boolean', `${item.code} isDraft 非 boolean`)
    assert.ok(item.urlSlug && item.reportRouteName && item.reportComponentFolder, `${item.code} 关键字段空`)
  }
})

test('2. urlSlug 唯一 + cognitive_self 特例 + 下划线量表保下划线', () => {
  const { catalog } = loadModules()
  const slugs = catalog.ASSESSMENT_SCALE_CATALOG.map((i) => i.urlSlug)
  assert.equal(new Set(slugs).size, slugs.length, 'urlSlug 重复')
  const byCode = Object.fromEntries(catalog.ASSESSMENT_SCALE_CATALOG.map((i) => [i.code, i.urlSlug]))
  assert.equal(byCode.cognitive_self, 'cognitive-self', 'cognitive_self→cognitive-self 特例')
  // 下划线量表 urlSlug 须保下划线（与 D report-routes 历史路径逐字一致）
  assert.equal(byCode.fine_motor, 'fine_motor')
  assert.equal(byCode.gmfm_88, 'gmfm_88')
  assert.equal(byCode.tgmd_3, 'tgmd_3')
})

test('3. reportRouteName 唯一 + 与历史名一致（防回归）', () => {
  const { catalog } = loadModules()
  const names = catalog.ASSESSMENT_SCALE_CATALOG.map((i) => i.reportRouteName)
  assert.equal(new Set(names).size, names.length, 'reportRouteName 重复')
  assert.deepEqual([...names].sort(), [...EXPECTED_REPORT_ROUTE_NAMES].sort())
})

test('4. driverRegistry key 集合 === catalog ASSESSMENT_SCALE_CODES', () => {
  const { catalog } = loadModules()
  const source = readFileSync(resolve(projectRoot, 'src/strategies/assessment/index.ts'), 'utf8')
  const registryMatch = source.match(/const driverRegistry = \{([\s\S]*?)\} as const satisfies/)
  assert.ok(registryMatch, '未找到 driverRegistry as const satisfies 声明')
  const keys = [...registryMatch[1].matchAll(/'([^']+)'\s*:/g)].map((m) => m[1])
  assert.deepEqual([...keys].sort(), [...catalog.ASSESSMENT_SCALE_CODES].sort())
})

test('5. buildAssessmentReportRoute 黄金样本逐字锁 URL（含 sm/weefim query 形态）', () => {
  const { reportRoutes } = loadModules()
  const { buildAssessmentReportRoute } = reportRoutes
  // path params 形态
  assert.equal(buildAssessmentReportRoute({ scaleType: 'csirs', assessId: 42 }), '/assessment/csirs/report/42')
  assert.equal(buildAssessmentReportRoute({ scaleType: 'brief', assessId: 42 }), '/assessment/brief/report/42')
  assert.equal(buildAssessmentReportRoute({ scaleType: 'cognitive_self', assessId: 42 }), '/assessment/cognitive-self/report/42')
  assert.equal(buildAssessmentReportRoute({ scaleType: 'fine_motor', assessId: 42 }), '/assessment/fine_motor/report/42')
  // query 形态（sm/weefim，保外链/书签兼容）
  const sm = buildAssessmentReportRoute({ scaleType: 'sm', assessId: 42, studentId: 7 })
  assert.equal(sm.path, '/assessment/sm/report')
  assert.equal(sm.query.assessId, '42')
  assert.equal(sm.query.studentId, '7')
  const weefim = buildAssessmentReportRoute({ scaleType: 'weefim', assessId: 99 })
  assert.equal(weefim.path, '/assessment/weefim/report')
  // 未知量表 fallback
  assert.equal(buildAssessmentReportRoute({ scaleType: 'unknown_scale', assessId: 1 }), '/assessment')
})

test('6. G 源 student-detail 覆盖所有 catalog 量表的 builder（含补齐的 brief/crt/cognitive_self）', () => {
  const { catalog } = loadModules()
  const source = readFileSync(resolve(projectRoot, 'src/views/student-detail/assessment-records.ts'), 'utf8')
  for (const code of catalog.ASSESSMENT_SCALE_CODES) {
    const re = new RegExp(`scaleType: '${code}' as const`)
    assert.ok(re.test(source), `G 源缺 ${code} builder（scaleType: '${code}' as const）`)
  }
  assert.ok(/ASSESSMENT_SCALE_CATALOG\s*\.flatMap/.test(source), 'G 源未用 catalog flatMap 合并')
})

test('6a. cognitive_self 关键信息：正确率 ×100 / 反应时转秒 / 结论中文化（防回归）', () => {
  const source = readFileSync(resolve(projectRoot, 'src/views/student-detail/assessment-records.ts'), 'utf8')
  // 正确率：0~1 小数转百分数（×100），不再直接拼 %
  assert.match(source, /const percent = number <= 1 \? Math\.round\(number \* 100\) : Math\.round\(number\)/)
  assert.doesNotMatch(source, /formatNullableNumber\(record\.accuracy_rate\)%/)
  // 反应时：毫秒转秒（÷1000），单位 s
  assert.match(source, /const seconds = number >= 100 \? number \/ 1000 : number/)
  assert.doesNotMatch(source, /avg_response_time\)\}ms/)
  // 结论：英文判定键 → 中文标签（Ceiling/inconsistent 等不直出）
  assert.match(source, /ceiling_risk: '上限未测出'/)
  assert.match(source, /inconsistent: '表现不稳定'/)
  assert.match(source, /floor_risk: '基础未完成'/)
  assert.match(source, /formatCognitiveSelfLevel\(record\.level_code \|\| record\.level\)/)
})

test('6b. CRT/BRIEF/TGMD-3 结论中文化（high_average/typical/emerging_skills 等不直出）', () => {
  const source = readFileSync(resolve(projectRoot, 'src/views/student-detail/assessment-records.ts'), 'utf8')
  // CRT：6 级全映射 + delayed 用 CRT 语义（非通用"智力发育障碍"）
  assert.match(source, /high_average: '中上水平'/)
  assert.match(source, /superior: '优秀'/)
  assert.match(source, /very_superior: '极优秀'/)
  assert.match(source, /delayed: '明显落后'/)
  assert.match(source, /average: '典型水平'/)
  // BRIEF：4 级全映射
  assert.match(source, /typical: '良好'/)
  assert.match(source, /slightly_elevated: '轻度风险'/)
  assert.match(source, /elevated: '中度风险'/)
  assert.match(source, /clinically_significant: '显著风险'/)
  // TGMD-3：3 级全映射
  assert.match(source, /emerging_skills: '技能萌芽期'/)
  assert.match(source, /developing_skills: '稳步成长期'/)
  assert.match(source, /proficient_skills: '展翅飞跃期'/)
  // 三个 builder 均走局部映射，不再用通用 formatLevel 直出 level_code
  assert.match(source, /levelText: formatMappedLevel\(record\.level_code \|\| record\.level, CRT_LEVEL_LABELS\)/)
  assert.match(source, /levelText: formatMappedLevel\(record\.level_code \|\| record\.level, BRIEF_LEVEL_LABELS\)/)
  assert.match(source, /levelText: formatMappedLevel\(record\.level_code \|\| record\.level, TGMD3_LEVEL_LABELS\)/)
})

test('7. 报告路由 name 集合 === catalog reportRouteName 集合，CSIRSHistory 不在生成集', () => {
  const { catalog, assessmentReportRoutes } = loadModules()
  const recordNames = assessmentReportRoutes.assessmentReportRouteRecords.map((r) => r.name).sort()
  const catalogNames = catalog.ASSESSMENT_SCALE_CATALOG.map((i) => i.reportRouteName).sort()
  assert.deepEqual(recordNames, catalogNames)
  assert.ok(!recordNames.includes('CSIRSHistory'), 'CSIRSHistory 不应在生成报告路由集中')
  for (const r of assessmentReportRoutes.assessmentReportRouteRecords) {
    assert.ok(r.path.startsWith('assessment/'), `${r.name} path 异常: ${r.path}`)
  }
})

test('8. 趋势路由：仅 trendSupported 量表生成，name === trendRouteName，crt/cognitive_self 排除', () => {
  const { catalog, assessmentTrendRoutes } = loadModules()
  const trendItems = catalog.ASSESSMENT_SCALE_CATALOG.filter((i) => i.trendSupported)
  // 支持纵向的量表恰好 13 个
  assert.equal(trendItems.length, 13, 'trendSupported 量表应为 13 个')
  // 每个支持的量表必须有 trendRouteName
  for (const item of trendItems) {
    assert.ok(item.trendRouteName, `${item.code} trendSupported=true 但缺 trendRouteName`)
  }
  // 趋势路由 name 集合 === 支持量表的 trendRouteName 集合
  const routeNames = assessmentTrendRoutes.assessmentTrendRouteRecords.map((r) => r.name).sort()
  const catalogNames = trendItems.map((i) => i.trendRouteName).sort()
  assert.deepEqual(routeNames, catalogNames, '趋势路由 name 集合与 catalog 不一致')
  // 路径形态：assessment/{urlSlug}/trend/:studentId
  for (const r of assessmentTrendRoutes.assessmentTrendRouteRecords) {
    assert.match(r.path, /^assessment\/[\w-]+\/trend\/:studentId$/, `${r.name} path 异常: ${r.path}`)
  }
  // crt / cognitive_self 必须被排除
  const unsupported = catalog.ASSESSMENT_SCALE_CATALOG.filter((i) => !i.trendSupported).map((i) => i.code)
  assert.deepEqual([...unsupported].sort(), ['cognitive_self', 'crt'], '不支持的量表应只有 crt / cognitive_self')
  assert.ok(!routeNames.includes('CRTTrend'), 'CRT 不应有趋势路由')
  assert.ok(!routeNames.includes('CognitiveSelfTrend'), 'cognitive_self 不应有趋势路由')
})

test('9. trendRouteName 唯一', () => {
  const { catalog } = loadModules()
  const names = catalog.ASSESSMENT_SCALE_CATALOG.filter((i) => i.trendRouteName).map((i) => i.trendRouteName)
  assert.equal(new Set(names).size, names.length, 'trendRouteName 重复')
})
