/**
 * 生活自理 5 小游戏贴纸图缩图 + 色键去底脚本
 *
 * 两项工作：
 *   1. 缩图：2k 原图 → 最长边 1024px（1k），与认知游戏一致，降低安装包体积
 *   2. 色键去底：progress/ 目录下的进度状态图，将浅绿背景(#EAF6EE)变为透明
 *      —— 因为 gpt-image-2 经 APIMart 网关不支持透明背景参数，只能在浅绿底上生成，
 *         后续用 nativeImage 逐像素色键去底（零新增依赖）
 *
 * 技术：使用 Electron 内置 nativeImage（getBitmap/createFromBitmap 逐像素操作），零新增依赖
 * 备份：缩图前将 2k 原图复制到 AIimages/selfcare-2k-backup/（gitignore，不污染仓库）
 *
 * 用法：npx electron scripts/resize-selfcare-images.mjs
 * 幂等：最长边 ≤ 1024 的文件自动跳过缩图；色键去底始终执行（可安全重复运行）
 */

import { app, nativeImage } from 'electron'
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MAX_DIM = 1024

const TARGET_DIRS = [
  resolve(projectRoot, 'assets/resources/images/self-care/items'),
  resolve(projectRoot, 'assets/resources/images/self-care/scenes'),
  resolve(projectRoot, 'assets/resources/images/self-care/progress'),
]

// 仅 progress/ 目录做色键去底（进度状态图需要透明背景，用于叠加在场景底图上）
// scenes/ 是全屏背景图，保留底色；characters/ 已随旧游戏删除
const CHROMA_KEY_DIR = resolve(projectRoot, 'assets/resources/images/self-care/progress')

// 浅绿底色 #EAF6EE → RGB(234, 246, 238)
const CHROMA_R = 234
const CHROMA_G = 246
const CHROMA_B = 238
// 色键容差：与目标色的 RGB 差值都在此范围内视为背景
const CHROMA_TOLERANCE = 36

const BACKUP_ROOT = resolve(projectRoot, 'AIimages/selfcare-2k-backup')

function collectPngs(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .map((f) => join(dir, f))
    .filter((p) => statSync(p).size > 0)
}

/**
 * 色键去底：将接近 #EAF6EE 的像素 alpha 设为 0
 * 对边缘像素做线性过渡（半透明），避免锯齿硬边
 *
 * 像素格式说明：nativeImage.toBitmap() 返回 raw bitmap，Electron 文档标注格式
 * "platform-dependent"（Windows 上通常为 BGRA，其它平台 RGBA）。因为目标色
 * #EAF6EE 的 R(234) 与 B(238) 仅差 4，远小于容差 36，无论字节序如何都能正确
 * 识别背景色，所以不需要区分 R/B 通道顺序。
 */
function chromaKey(image, filePath) {
  const size = image.getSize()
  const bitmap = image.toBitmap() // raw 像素 buffer，长度 = width * height * 4
  const { width, height } = size

  for (let i = 0; i < bitmap.length; i += 4) {
    const ch0 = bitmap[i] // R 或 B（视平台）
    const ch1 = bitmap[i + 1] // G
    const ch2 = bitmap[i + 2] // B 或 R

    // 取三通道与目标色对应通道差值的最大值；因 R≈B，字节序不影响判定
    const d0 = Math.abs(ch0 - CHROMA_R)
    const d1 = Math.abs(ch1 - CHROMA_G)
    const d2 = Math.abs(ch2 - CHROMA_B)
    const maxDiff = Math.max(d0, d1, d2)

    if (maxDiff <= CHROMA_TOLERANCE) {
      // 完全背景 → 完全透明
      bitmap[i + 3] = 0
    } else if (maxDiff <= CHROMA_TOLERANCE + 20) {
      // 过渡区 → 半透明（线性渐变，减少边缘锯齿）
      const ratio = (maxDiff - CHROMA_TOLERANCE) / 20
      bitmap[i + 3] = Math.round(ratio * 255)
    }
  }

  // 从处理后的 raw 像素重建图片
  const result = nativeImage.createFromBitmap(bitmap, { width, height })
  return result
}

async function processFile(filePath) {
  const image = nativeImage.createFromPath(filePath)
  if (image.isEmpty()) {
    throw new Error(`无法读取图片: ${filePath}`)
  }

  const originalSize = image.getSize()
  const originalBytes = statSync(filePath).size
  let currentImage = image
  let didResize = false

  // --- 步骤1：缩图 ---
  const maxSide = Math.max(originalSize.width, originalSize.height)
  if (maxSide > MAX_DIM) {
    const scale = MAX_DIM / maxSide
    const targetWidth = Math.round(originalSize.width * scale)
    const targetHeight = Math.round(originalSize.height * scale)
    currentImage = image.resize({ width: targetWidth, height: targetHeight })
    didResize = true

    // 备份 2k 原图（仅首次缩图时备份一次）
    const relative = filePath.slice(projectRoot.length + 1)
    const backupPath = join(BACKUP_ROOT, relative)
    if (!existsSync(backupPath)) {
      mkdirSync(dirname(backupPath), { recursive: true })
      copyFileSync(filePath, backupPath)
    }
  }

  // --- 步骤2：色键去底（仅 characters/ 目录） ---
  const dir = dirname(filePath)
  const isChromaTarget =
    dir === CHROMA_KEY_DIR ||
    resolve(dir) === resolve(CHROMA_KEY_DIR)
  let didChroma = false
  if (isChromaTarget) {
    currentImage = chromaKey(currentImage, filePath)
    didChroma = true
  }

  // --- 步骤3：写回 ---
  const pngBuffer = currentImage.toPNG()
  if (!pngBuffer || pngBuffer.length === 0) {
    throw new Error(`编码失败: ${filePath}`)
  }
  writeFileSync(filePath, pngBuffer)

  const newSize = currentImage.getSize()
  const newBytes = pngBuffer.length
  const sizeInfo = didResize
    ? `${originalSize.width}x${originalSize.height} → ${newSize.width}x${newSize.height}`
    : `${newSize.width}x${newSize.height}（已 ≤${MAX_DIM}px）`
  const bytesInfo = didResize
    ? `${(originalBytes / 1024).toFixed(0)}KB → ${(newBytes / 1024).toFixed(0)}KB`
    : `${(newBytes / 1024).toFixed(0)}KB`

  return {
    didResize,
    didChroma,
    sizeInfo,
    bytesInfo,
  }
}

app.whenReady().then(async () => {
  const allFiles = TARGET_DIRS.flatMap(collectPngs)
  console.log(`[Resize] 发现 ${allFiles.length} 张 PNG，目标最长边 ${MAX_DIM}px，色键目录: progress/`)

  let resized = 0
  let skipped = 0
  let chromaCount = 0
  let savedBytes = 0

  for (const filePath of allFiles) {
    try {
      const result = await processFile(filePath)
      const shortPath = filePath.split(/[\\/]/).slice(-2).join('/')

      const tags = []
      if (result.didResize) {
        tags.push('缩图')
        resized += 1
      } else {
        tags.push('跳过缩图')
        skipped += 1
      }
      if (result.didChroma) {
        tags.push('色键去底')
        chromaCount += 1
      }

      console.log(`[Resize] ✅ ${shortPath} [${tags.join(' + ')}] ${result.sizeInfo}，${result.bytesInfo}`)

      if (result.didResize) {
        // bytesInfo 格式 "原KB → 新KB"，解析节省量
        const match = result.bytesInfo.match(/([\d.]+)KB → ([\d.]+)/)
        if (match) {
          savedBytes += (parseFloat(match[1]) - parseFloat(match[2])) * 1024
        }
      }
    } catch (error) {
      console.error(`[Resize] ❌ ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log(
    `[Resize] 完成：缩图 ${resized} 张，跳过 ${skipped} 张，色键去底 ${chromaCount} 张，共节省 ${(savedBytes / 1024 / 1024).toFixed(1)}MB`,
  )
  if (resized > 0) {
    console.log(`[Resize] 2k 原图已备份至: ${BACKUP_ROOT}`)
  }

  app.quit()
})
