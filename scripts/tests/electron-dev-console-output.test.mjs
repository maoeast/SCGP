import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const launcherSource = readFileSync(resolve(projectRoot, 'scripts/electron-dev-start.js'), 'utf8')

// 断言只针对真实代码，注释里允许出现任意字样（例如解释为什么不能直连控制台）；
// 行尾注释一并剥离，`://` 形式的 URL 用后向断言排除
const launcherCode = launcherSource
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(?<!:)\/\/.*$/gm, '')

// Windows 控制台按系统代码页（中文系统 GBK/936）解码直连进程写出的字节，而 Electron
// 主进程日志是 UTF-8 字节：子进程直连控制台会把整段中文显示成乱码，必须 pipe 到本
// 进程（Node）转发，由 Node 走控制台宽字符写入。
test('electron:dev launcher pipes child output through the parent process', () => {
  assert.doesNotMatch(
    launcherCode,
    /stdio:\s*['"]inherit['"]/,
    '子进程不得以 stdio: inherit 直连控制台（Windows 中文会乱码）',
  )

  assert.match(launcherCode, /function forwardChildOutput\(childProcess\) \{/)
  assert.match(launcherCode, /\.setEncoding\('utf8'\)/)
  assert.match(launcherCode, /process\.stdout\.write\(text\)/)
  assert.match(launcherCode, /process\.stderr\.write\(text\)/)

  assert.match(launcherCode, /stdio: \['inherit', 'pipe', 'pipe'\]/)
  assert.match(launcherCode, /stdio: \['ignore', 'pipe', 'pipe'\]/)
  assert.match(launcherCode, /forwardChildOutput\(electronProcess\)/)
  assert.match(launcherCode, /forwardChildOutput\(viteProcess\)/)

  // 退出前等转发数据落地，避免丢掉子进程最后几行日志
  assert.match(launcherCode, /await waitForForwardedOutput\(\)/)
})
