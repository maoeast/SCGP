import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// 本测试是 C09（ModuleRegistry 事实修正）的源码契约层验证。
//
// 为何用源码解析而非 jiti 运行时加载：ModuleRegistry 是单例，构造时调
// loadConfigsFromStorage() → localStorage.getItem，在 node:test 下 localStorage
// 未定义会抛错。因此本测试锁定「initializeBuiltinModules 声明结构本身」——
// 运行时是否真的注册成功，由 build:web 与桌面启动兜底。

const here = dirname(fileURLToPath(import.meta.url))
const registryPath = resolve(here, '..', '..', 'src', 'core', 'module-registry.ts')
const source = readFileSync(registryPath, 'utf8')

// ModuleCode enum 全集（src/types/module.ts）。registry 必须全部注册。
const EXPECTED_MODULE_CODES = [
  'SENSORY',
  'EMOTIONAL',
  'SOCIAL',
  'COGNITIVE',
  'LIFE_SKILLS',
  'RESOURCE',
]

// feature.route 只允许引用当前真实存在的通用入口（router/index.ts 已核实）。
const ALLOWED_ROUTES = new Set([
  '/games/menu',
  '/equipment/menu',
  '/training-records/menu',
  '/assessment',
  '/resource-center',
])

// C09 删除的模块专属旧路径——路由表中零存在，不得再出现。
const FORBIDDEN_ROUTES = [
  '/sensory/training-records',
  '/sensory/assessment',
  '/sensory/iep',
  '/emotional/relaxation',
  '/emotional/recognition',
  '/social/conversation',
  '/social/stories',
]

// 截取 initializeBuiltinModules 函数体（文件末尾的导出函数）。
const initStart = source.indexOf('export function initializeBuiltinModules')
assert.ok(initStart !== -1, '未找到 initializeBuiltinModules 导出函数')
const initBody = source.slice(initStart)

// 按 registerModule({ 切片，每片对应一个模块的 metadata 字面量。
// 模块级 status 在 features 数组之前，故首个 status 匹配即为模块状态。
const moduleBlocks = initBody
  .split(/ModuleRegistry\.registerModule\(\{/)
  .slice(1)
  .map((block) => {
    const codeMatch = block.match(/code:\s*ModuleCode\.(\w+)/)
    const statusMatch = block.match(/status:\s*'(\w+)'/)
    const routes = [...block.matchAll(/route:\s*'([^']+)'/g)].map((m) => m[1])
    return {
      code: codeMatch ? codeMatch[1] : null,
      status: statusMatch ? statusMatch[1] : null,
      routes,
    }
  })

test('initializeBuiltinModules registers every ModuleCode exactly once', () => {
  const codes = moduleBlocks.map((m) => m.code)
  assert.equal(
    moduleBlocks.length,
    EXPECTED_MODULE_CODES.length,
    '注册的模块数量与 ModuleCode 全集不一致',
  )
  assert.deepEqual(
    [...new Set(codes)].sort(),
    [...EXPECTED_MODULE_CODES].sort(),
    '注册的模块 code 与 ModuleCode 全集不一致（缺注册或有重复）',
  )
})

test('every declared feature route points to a real generic entry', () => {
  const allRoutes = moduleBlocks.flatMap((m) => m.routes)
  assert.ok(allRoutes.length > 0, '未提取到任何 feature route，解析可能失效')
  const offenders = allRoutes.filter((r) => !ALLOWED_ROUTES.has(r))
  assert.deepEqual(
    offenders,
    [],
    `存在非通用入口的 feature route：${offenders.join(', ')}`,
  )
})

test('removed module-specific legacy routes do not reappear', () => {
  const allRoutes = moduleBlocks.flatMap((m) => m.routes)
  const regressions = FORBIDDEN_ROUTES.filter((r) => allRoutes.includes(r))
  assert.deepEqual(
    regressions,
    [],
    `已删除的模块专属旧路径回归：${regressions.join(', ')}`,
  )
})

test('all six modules stay active', () => {
  const statusByCode = new Map(moduleBlocks.map((m) => [m.code, m.status]))
  for (const code of EXPECTED_MODULE_CODES) {
    assert.equal(statusByCode.get(code), 'active', `${code} 必须为 active`)
  }
})
