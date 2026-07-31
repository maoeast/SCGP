/**
 * 认知游戏贴纸图批量缩小脚本（2k → 1k）
 *
 * 背景：AI 生成的贴纸图是 2k 分辨率（2048px 起），而游戏内最大显示尺寸仅 180px（@2x 也就 360px），
 * 2k 图导致安装包体积冗余（16+37 张约 150MB）。本脚本统一缩到最长边 1024px（1k），
 * 显示清晰度不受影响（1k = 360px 显示需求的 2.8 倍余量），体积预计降 70%+。
 *
 * 技术：使用 Electron 内置 nativeImage（createFromPath → resize → toPNG），零新增依赖。
 * 备份：缩图前将 2k 原图复制到 AIimages/cognitive-2k-backup/（gitignore，不污染仓库）。
 *
 * 用法：npx electron scripts/resize-cognitive-images.mjs
 * 幂等：最长边 ≤ 1024 的文件自动跳过。
 */

import { app, nativeImage } from 'electron'
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MAX_DIM = 1024

const TARGET_DIRS = [
  resolve(projectRoot, 'assets/resources/images/cognitive/size-order'),
  resolve(projectRoot, 'assets/resources/images/cognitive/items'),
]

const BACKUP_ROOT = resolve(projectRoot, 'AIimages/cognitive-2k-backup')

function collectPngs(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .map((f) => join(dir, f))
    .filter((p) => {
      const size = statSync(p).size
      return size > 0
    })
}

async function resizePng(filePath) {
  const image = nativeImage.createFromPath(filePath)
  if (image.isEmpty()) {
    throw new Error(`无法读取图片: ${filePath}`)
  }

  const size = image.getSize()
  const maxSide = Math.max(size.width, size.height)
  if (maxSide <= MAX_DIM) {
    return { skipped: true, width: size.width, height: size.height }
  }

  const scale = MAX_DIM / maxSide
  const targetWidth = Math.round(size.width * scale)
  const targetHeight = Math.round(size.height * scale)

  const resized = image.resize({ width: targetWidth, height: targetHeight })
  const pngBuffer = resized.toPNG()
  if (!pngBuffer || pngBuffer.length === 0) {
    throw new Error(`缩放后编码失败: ${filePath}`)
  }

  // 备份 2k 原图（仅首次缩图时备份一次）
  const relative = filePath.slice(projectRoot.length + 1)
  const backupPath = join(BACKUP_ROOT, relative)
  if (!existsSync(backupPath)) {
    mkdirSync(dirname(backupPath), { recursive: true })
    copyFileSync(filePath, backupPath)
  }

  // 写回缩图
  await import('node:fs').then(({ writeFileSync }) => writeFileSync(filePath, pngBuffer))

  return {
    skipped: false,
    width: targetWidth,
    height: targetHeight,
    originalBytes: statSync(backupPath).size,
    resizedBytes: pngBuffer.length,
  }
}

app.whenReady().then(async () => {
  const allFiles = TARGET_DIRS.flatMap(collectPngs)
  console.log(`[Resize] 发现 ${allFiles.length} 张 PNG，目标最长边 ${MAX_DIM}px`)

  let resized = 0
  let skipped = 0
  let savedBytes = 0

  for (const filePath of allFiles) {
    try {
      const result = await resizePng(filePath)
      if (result.skipped) {
        skipped += 1
        console.log(`[Resize] ⏭ 跳过（已 ≤${MAX_DIM}px）: ${filePath.split(/[\\/]/).slice(-2).join('/')}`)
        continue
      }
      resized += 1
      const saved = result.originalBytes - result.resizedBytes
      savedBytes += saved
      const pct = result.originalBytes > 0
        ? Math.round((1 - result.resizedBytes / result.originalBytes) * 100)
        : 0
      console.log(
        `[Resize] ✅ ${filePath.split(/[\\/]/).slice(-2).join('/')} `
        + `${result.width}x${result.height}，${(result.originalBytes / 1024).toFixed(0)}KB → ${(result.resizedBytes / 1024).toFixed(0)}KB (-${pct}%)`,
      )
    } catch (error) {
      console.error(`[Resize] ❌ ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log(
    `[Resize] 完成：缩放 ${resized} 张，跳过 ${skipped} 张，共节省 ${(savedBytes / 1024 / 1024).toFixed(1)}MB`,
  )
  if (resized > 0) {
    console.log(`[Resize] 2k 原图已备份至: ${BACKUP_ROOT}`)
  }

  app.quit()
})
