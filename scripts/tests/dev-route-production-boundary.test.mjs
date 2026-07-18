import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// 本测试是 C08（开发路由生产隔离）的源码契约层验证。
//
// 为何用源码解析而非 jiti 运行时加载：dev-routes.ts 依赖 `import.meta.env.DEV`，
// Vite 在构建期静态替换该标识，jiti 运行时转译无法还原该语义（且会触发
// `import.meta.env` 未定义）。因此本测试锁定「隔离结构本身」——
// 生产构建是否真的移除了对应 chunk，由配套的 `rg dist/assets` 在构建产物层兜底。

const here = dirname(fileURLToPath(import.meta.url))
const routerDir = resolve(here, '..', '..', 'src', 'router')
const indexSource = readFileSync(resolve(routerDir, 'index.ts'), 'utf8')
const devRoutesSource = readFileSync(resolve(routerDir, 'dev-routes.ts'), 'utf8')

// 生产构建必须从路由树与 chunk 中隔离的开发专用路由 name 基线。
const EXPECTED_DEV_ROUTE_NAMES = [
  'SQLTest',
  'WeeFIMTest',
  'WorkerTest',
  'SchemaMigration',
  'MigrationVerification',
  'ModuleDevTools',
  'BenchmarkRunner',
  'ClassManagementTest',
  'ClassSnapshotVerification',
  'ClassSnapshotTestLite',
  'ActivationAdmin',
]

// 仅匹配 devRoutes 三元 DEV 分支里的 route record：`name: 'XXX',` 紧跟 `component:`。
// 这样不会误捕 DEV_ROUTE_NAMES 字面量集合中的同名字符串。
function extractDevRouteNames(source) {
  const re = /name:\s*'(\w+)'\s*,\s*component:/g
  const names = new Set()
  let match
  while ((match = re.exec(source)) !== null) {
    names.add(match[1])
  }
  return names
}

test('devRoutes DEV branch declares every expected dev route name', () => {
  const declared = extractDevRouteNames(devRoutesSource)
  assert.deepEqual(
    [...declared].sort(),
    [...EXPECTED_DEV_ROUTE_NAMES].sort(),
    'devRoutes DEV 分支声明的 name 与基线不一致',
  )
})

test('DEV_ROUTE_NAMES literal stays in sync with devRoutes declarations', () => {
  const declared = extractDevRouteNames(devRoutesSource)

  const setLiteralMatch = devRoutesSource.match(
    /DEV_ROUTE_NAMES[^=]*=\s*new\s+Set(?:<[^>]*>)?\s*\(\s*\[([^\]]*)\]/,
  )
  assert.ok(setLiteralMatch, '未找到 DEV_ROUTE_NAMES 字面量集合')
  const literalNames = new Set(
    [...setLiteralMatch[1].matchAll(/'(\w+)'/g)].map((m) => m[1]),
  )

  assert.deepEqual(
    [...literalNames].sort(),
    [...declared].sort(),
    'DEV_ROUTE_NAMES 字面量与 devRoutes 声明漂移；新增 dev 路由时两处都要改',
  )
})

test('devRoutes is gated by import.meta.env.DEV so production tree-shakes the chunk', () => {
  assert.match(
    devRoutesSource,
    /import\.meta\.env\.DEV\s*\?/,
    'devRoutes 必须用 import.meta.env.DEV 三元包裹，否则生产构建不会移除 chunk',
  )
})

test('index.ts no longer statically references any dev-only component', () => {
  const forbiddenImports = [
    '@/views/SQLTest.vue',
    '@/views/WeeFIMTest.vue',
    '@/views/ActivationAdmin.vue',
    '@/views/devtools/WorkerTest.vue',
    '@/views/devtools/SchemaMigration.vue',
    '@/views/devtools/MigrationVerification.vue',
    '@/views/devtools/ModuleDevTools.vue',
    '@/views/devtools/BenchmarkRunner.vue',
    '@/views/devtools/ClassManagementTest.vue',
    '@/views/devtools/ClassSnapshotVerification.vue',
    '@/views/devtools/ClassSnapshotTestLite.vue',
  ]
  const leaked = forbiddenImports.filter((spec) => indexSource.includes(spec))
  assert.deepEqual(
    leaked,
    [],
    `index.ts 仍直接引用开发专用组件，会进入生产 chunk：${leaked.join(', ')}`,
  )
})

test('index.ts mounts dev-routes through spread, not inline records', () => {
  assert.match(
    indexSource,
    /\.\.\.devRoutes\b/,
    'index.ts 必须展开 ...devRoutes 注册开发路由',
  )
})

test('index.ts keeps DEV_ROUTE_NAMES as defense-in-depth guard', () => {
  assert.match(
    indexSource,
    /!import\.meta\.env\.DEV[^\n]*DEV_ROUTE_NAMES\.has/,
    '全局守卫应保留 DEV_ROUTE_NAMES 作为纵深保护',
  )
})

test('production admin routes are not swept into dev isolation', () => {
  // ClassManagement / StudentClassAssignment / ResourceManager 是正式管理能力，必须留在生产路由
  for (const keeper of ['ClassManagement', 'StudentClassAssignment', 'ResourceManager']) {
    assert.match(
      indexSource,
      new RegExp(`name:\\s*'${keeper}'`),
      `${keeper} 是正式管理路由，不应被移入 dev 隔离`,
    )
  }
})
