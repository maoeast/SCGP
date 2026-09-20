import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const packageJson = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'))
const viteSource = readFileSync(resolve(projectRoot, 'vite.config.ts'), 'utf8')
const electronMainSource = readFileSync(resolve(projectRoot, 'electron/main.mjs'), 'utf8')
const sanitizerSource = readFileSync(resolve(projectRoot, 'scripts/sanitize-production-build.mjs'), 'utf8')

test('web and electron package builds always run production sanitizer', () => {
  assert.match(packageJson.scripts['build:web'], /vite build && npm run sanitize:production/)
  assert.match(packageJson.scripts['sanitize:production'], /node scripts\/sanitize-production-build\.mjs/)

  for (const scriptName of ['build:electron', 'build:electron:win', 'build:electron:mac', 'build:electron:linux']) {
    assert.match(
      packageJson.scripts[scriptName],
      /npm run build:web/,
      `${scriptName} must go through build:web so sanitizer runs before packaging`,
    )
  }
})

test('production Vite build drops debug statements and excludes Vue DevTools plugin', () => {
  assert.match(viteSource, /const isProductionBuild = command === 'build' && mode === 'production'/)
  assert.match(viteSource, /resolvePlugins\(isProductionBuild\)/)
  assert.match(viteSource, /if \(isProductionBuild\) \{\s*return plugins\s*\}/)
  assert.match(viteSource, /drop_console:\s*true/)
  assert.match(viteSource, /drop_debugger:\s*true/)
})

test('production sanitizer strips debug blocks and fails closed on debug residue', () => {
  assert.match(sanitizerSource, /@debug:start/)
  assert.match(sanitizerSource, /sourceMappingURL/)
  assert.match(sanitizerSource, /console\\\.\(\?:log\|debug\|info\|trace\|warn\|error/)
  assert.match(sanitizerSource, /debugger statement/)
  assert.match(sanitizerSource, /__VUE_DEVTOOLS_GLOBAL_HOOK__\|vite-plugin-vue-devtools/)
  assert.match(sanitizerSource, /production debug residue detected/)
})

test('Electron production disables DevTools surface and common console shortcuts', () => {
  // 生产默认关闭 DevTools：devToolsEnabled 初值取 isDev，仅当打包时显式设置
  // package.json 的 build.extraMetadata.scgpDebugDevtools = true 才允许打开
  assert.match(electronMainSource, /let devToolsEnabled = isDev/)
  assert.match(electronMainSource, /pkg\.scgpDebugDevtools === true/)
  assert.match(electronMainSource, /devTools:\s*devToolsEnabled/)
  assert.match(electronMainSource, /mainWindow\.removeMenu\(\)/)
  // 原 'devtools-opened' 自动关闭监听已移除：生产禁用在 webPreferences.devTools 层完成；
  // F12 切换监听整体包在 devToolsEnabled（仅调试打包）里，生产构建根本不注册。
  assert.match(
    electronMainSource,
    /if \(devToolsEnabled\) \{\s*mainWindow\.webContents\.on\('before-input-event'/,
  )
  assert.match(electronMainSource, /closeDevTools\(\)/)
  assert.match(electronMainSource, /function isDeveloperToolsShortcut/)
  assert.match(electronMainSource, /key === 'f12'/)
  assert.match(electronMainSource, /\['i', 'j', 'c'\]\.includes\(key\)/)
  assert.match(electronMainSource, /!isDev && isDeveloperToolsShortcut\(input\)/)
  assert.match(electronMainSource, /event\.preventDefault\(\)/)
})

test('Electron production suppresses runtime console output by default', () => {
  assert.match(electronMainSource, /function shouldEmitRuntimeLogs\(\)/)
  assert.match(electronMainSource, /isDev \|\| process\.env\.SCGP_ENABLE_PROD_LOGS === '1'/)
  assert.match(electronMainSource, /if \(!shouldEmitRuntimeLogs\(\)\) \{\s*return\s*\}/)
})
