import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// 侧栏「记录与系统」菜单契约：
// 1. 固定顺序 = 训练记录 → 报告生成 → 资源管理 → 系统管理（menuGroupConfigs 为唯一顺序真源）
// 2. 模块托管条目（训练记录 / 资源管理）必须由 ModuleRegistry 提供，不得手写固定条目绕过模块体系
// 3. 统一授权过滤（entitlement-first + 角色）在固定排序前生效，固定条目不得弱化访问控制
// 4. 「资源中心」命名收口为「资源管理」（feature / 路由标题 / 页面标题一致）

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..', '..')
const readRepoFile = (rel) => readFileSync(resolve(projectRoot, rel), 'utf8')

const layoutSource = readRepoFile('src/views/Layout.vue')
const registrySource = readRepoFile('src/core/module-registry.ts')
const routerSource = readRepoFile('src/router/index.ts')
const resourceCenterSource = readRepoFile('src/views/admin/ResourceCenter.vue')

// 截取 records-and-system 分组（menuGroupConfigs 内的固定顺序）
const recordsBlock = layoutSource.match(/id: 'records-and-system'[\s\S]*?items: \[([\s\S]*?)\],/)
assert.ok(recordsBlock, '未找到 records-and-system 分组')

const fixedItems = [...recordsBlock[1].matchAll(/routeName: '([^']+)'[\s\S]*?displayTitle: '([^']+)'/g)].map(
  (m) => ({ routeName: m[1], displayTitle: m[2] }),
)
const moduleManagedNames = [...recordsBlock[1].matchAll(/routeName: '([^']+)'[^\n]*moduleManaged: true/g)].map(
  (m) => m[1],
)

test('records-and-system shows 训练记录 → 报告生成 → 资源管理 → 系统管理', () => {
  assert.deepEqual(
    fixedItems.map((item) => item.routeName),
    ['TrainingRecordsModule', 'Reports', 'ResourceCenter', 'System'],
  )
  assert.deepEqual(
    fixedItems.map((item) => item.displayTitle),
    ['训练记录', '报告生成', '资源管理', '系统管理'],
  )
})

test('module-managed entries (训练记录 / 资源管理) require ModuleRegistry admission', () => {
  assert.deepEqual(moduleManagedNames.sort(), ['ResourceCenter', 'TrainingRecordsModule'])
})

test('fixed order does not bypass shared-feature generation for training records', () => {
  // 训练记录入口由共享 feature 生成（training_records → TrainingRecordsModule → records-and-system）
  assert.match(layoutSource, /featureCode: 'training_records'[\s\S]*?routeName: 'TrainingRecordsModule'[\s\S]*?groupId: 'records-and-system'/)
})

test('menu filtering keeps authorization checks before the fixed order is applied', () => {
  // 统一过滤链：route 准入 → entitlement/module 过滤 → 角色过滤
  assert.match(layoutSource, /filterVisibleAccessControlledItems\(/)
  assert.match(layoutSource, /authStore\.hasModuleAccess/)
  assert.match(layoutSource, /authStore\.hasEntitlementAccess/)
  assert.match(layoutSource, /hasRole\(item\.meta\.roles\)/)
  // 防重复：已由模块自有入口注册的 routeName 不再经共享 feature 二次添加
  assert.match(layoutSource, /registeredRouteNames\.has\(cfg\.routeName\)/)
})

test('resource entry naming is unified as 资源管理', () => {
  // ModuleRegistry feature：code 与路由契约不变，仅名称收口
  const resourceFeature = registrySource.match(/code: 'resource_center'[\s\S]*?routeName: 'ResourceCenter'/)
  assert.ok(resourceFeature, 'resource_center feature 契约缺失')
  assert.match(resourceFeature[0], /name: '资源管理'/)
  assert.match(resourceFeature[0], /route: '\/resource-center'/)

  // 路由标题（子路由 path 为相对路径）
  const resourceRoute = routerSource.match(/path: 'resource-center'[\s\S]*?name: 'ResourceCenter'[\s\S]*?\}/)
  assert.ok(resourceRoute, 'ResourceCenter 路由缺失')
  assert.match(resourceRoute[0], /title: '资源管理'/)

  // 页面标题
  assert.match(resourceCenterSource, /<h1>资源管理<\/h1>/)
  assert.doesNotMatch(resourceCenterSource, /<h1>资源中心<\/h1>/)
})
