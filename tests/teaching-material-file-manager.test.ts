/**
 * 教学资料文件管理器 URL 解析 — 单元测试
 *
 * 运行：npx jiti tests/teaching-material-file-manager.test.ts
 *
 * 覆盖（bug 回归：预置视频内嵌播放器 404 静默失败）：
 *  1. assets/ 前缀（预置视频 seed filePath）→ 剥离前缀，与 resource:// 协议 presetRoot 匹配
 *  2. 无前缀（用户托管教学资料）→ 原样，与 userDataRoot 匹配
 *  3. Windows 反斜杠路径归一化后再剥离
 *  4. 嵌套 assets/ 前缀只剥一层（防误伤）
 */
import assert from 'node:assert/strict'
import { createJiti } from 'jiti'

// teaching-material-file-manager 内部使用 `@/` alias（项目约定），jiti CLI 不解析 paths；
// 与 tests/report-center-catalog.test.ts 相同模式：createJiti + alias 自包含配置
const jiti = createJiti(import.meta.url, {
  alias: { '@': `${process.cwd()}/src/` },
})
const { teachingMaterialFileManager } = await jiti.import(
  '../src/utils/teaching-material-file-manager.ts',
)

// 1. 预置视频：assets/ 前缀剥离 → 协议 presetRoot（assets/resources）下命中
{
  const url = teachingMaterialFileManager.getFileUrl(
    'assets/resources/videos/feeding/demo.mp4',
  )
  assert.equal(url, 'resource://videos/feeding/demo.mp4')
}

// 2. 用户托管教学资料：无前缀原样 → userDataRoot 命中
{
  const url = teachingMaterialFileManager.getFileUrl(
    'teaching-materials/feeding/1720000000000-演示视频.mp4',
  )
  assert.equal(url, 'resource://teaching-materials/feeding/1720000000000-演示视频.mp4')
}

// 3. Windows 反斜杠路径：先归一化再剥离
{
  const url = teachingMaterialFileManager.getFileUrl(
    'assets\\resources\\videos\\social\\greeting.mp4',
  )
  assert.equal(url, 'resource://videos/social/greeting.mp4')
}

// 4. 仅剥一层 assets/（videos 目录自身含 assets 子目录的场景不误伤）
{
  const url = teachingMaterialFileManager.getFileUrl(
    'assets/resources/videos/assets/promo.mp4',
  )
  assert.equal(url, 'resource://videos/assets/promo.mp4')
}

console.log('teaching material file manager test passed')
