#!/usr/bin/env node
/**
 * 缩略图复制脚本：将外部缩略图映射到项目资源目录
 *
 * 源目录: G:\SCGP_Rec\Video\thumbnails
 * 目标目录: E:\VSC\H5\SIC-ADS\assets\resources\images\teaching-materials
 *
 * 映射策略:
 * 1. 从运行中的应用数据库读取教学资料记录（通过 IPC 或直接读 userData 下的数据库）
 * 2. 根据 dimension_code 定位对应的维度文件夹
 * 3. 根据 title 或 file_name 匹配缩略图文件名
 * 4. 复制到目标目录，命名为 `{dimension_code}/{id}.jpg`
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sourceThumbnailRoot = 'G:\\SCGP_Rec\\Video\\thumbnails'
const targetThumbnailRoot = path.join(__dirname, '../assets/resources/images/teaching-materials')

// 维度代码映射到中文文件夹名
const dimensionMap = {
  'sensory-training': '感官训练',
  'emotional-regulation': '情绪调节',
  'social-communication': '社交沟通',
  'life-skills': '生活自理',
  'fine-motor': '精细动作',
  'soothing-aids': '安抚教具',
  'cognitive-development': '认知发展',
}

console.log('========================================')
console.log('教学资料缩略图复制工具')
console.log('========================================')
console.log('源目录:', sourceThumbnailRoot)
console.log('目标目录:', targetThumbnailRoot)
console.log()

// 检查源目录是否存在
if (!fs.existsSync(sourceThumbnailRoot)) {
  console.error('❌ 源缩略图目录不存在:', sourceThumbnailRoot)
  process.exit(1)
}

// 创建目标目录
if (!fs.existsSync(targetThumbnailRoot)) {
  fs.mkdirSync(targetThumbnailRoot, { recursive: true })
  console.log('✓ 创建目标目录:', targetThumbnailRoot)
}

console.log()
console.log('⚠️  注意：本脚本需要从运行中的应用数据库读取数据')
console.log('请按以下步骤操作：')
console.log('1. 启动应用: npm run dev')
console.log('2. 在浏览器开发者工具中运行以下代码导出教学资料数据:')
console.log()
console.log('```javascript')
console.log('// 在应用的开发者工具 Console 中运行')
console.log('const { materialsStore } = await import("@/stores/materials-store")')
console.log('await materialsStore.loadTeachingMaterials()')
console.log('const materials = materialsStore.teachingMaterials')
console.log('console.log(JSON.stringify(materials, null, 2))')
console.log('// 复制输出的 JSON，保存为 scripts/teaching-materials-export.json')
console.log('```')
console.log()
console.log('3. 或者，如果你已经有导出的 JSON 文件，请将其命名为:')
console.log('   scripts/teaching-materials-export.json')
console.log()

const exportPath = path.join(__dirname, 'teaching-materials-export.json')

if (!fs.existsSync(exportPath)) {
  console.log('❌ 未找到教学资料导出文件:', exportPath)
  console.log()
  console.log('正在生成目录结构预览...')
  console.log()

  // 列出所有可用的缩略图文件
  for (const [dimensionCode, dimensionFolder] of Object.entries(dimensionMap)) {
    const dimensionPath = path.join(sourceThumbnailRoot, dimensionFolder)
    if (!fs.existsSync(dimensionPath)) continue

    console.log(`\n[${dimensionCode}] ${dimensionFolder}:`)
    const thumbnails = listThumbnails(dimensionPath)
    console.log(`  找到 ${thumbnails.length} 个缩略图`)
    thumbnails.slice(0, 5).forEach(t => {
      console.log(`    - ${path.relative(sourceThumbnailRoot, t)}`)
    })
    if (thumbnails.length > 5) {
      console.log(`    ... 还有 ${thumbnails.length - 5} 个`)
    }
  }

  process.exit(0)
}

console.log('✓ 找到教学资料导出文件')
console.log()

// 读取导出的教学资料数据
const materials = JSON.parse(fs.readFileSync(exportPath, 'utf-8'))
console.log(`找到 ${materials.length} 条教学资料记录`)
console.log()

let copied = 0
let notFound = 0
let skipped = 0

for (const material of materials) {
  const dimensionFolder = dimensionMap[material.dimension_code]
  if (!dimensionFolder) {
    console.warn(`⚠️  未知维度代码: ${material.dimension_code}`)
    skipped++
    continue
  }

  // 尝试根据 fileName 或 title 匹配缩略图
  const baseName = path.basename(material.file_name, path.extname(material.file_name))
  const thumbnailName = `${baseName}.jpg`

  // 在源目录中递归查找缩略图
  const sourcePath = findThumbnail(sourceThumbnailRoot, dimensionFolder, thumbnailName, material.title)

  if (!sourcePath) {
    console.log(`❌ 未找到: ${material.title}`)
    console.log(`   期望文件名: ${thumbnailName}`)
    notFound++
    continue
  }

  // 构建目标路径: teaching-materials/{dimension-code}/{id}.jpg
  const targetDir = path.join(targetThumbnailRoot, material.dimension_code)
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  const targetPath = path.join(targetDir, `${material.id}.jpg`)

  // 复制文件
  try {
    fs.copyFileSync(sourcePath, targetPath)
    console.log(`✓ ${material.title}`)
    console.log(`  ${path.relative(sourceThumbnailRoot, sourcePath)} → ${material.dimension_code}/${material.id}.jpg`)
    copied++
  } catch (err) {
    console.error(`❌ 复制失败: ${err.message}`)
    skipped++
  }
}

console.log()
console.log('========================================')
console.log('复制完成')
console.log('========================================')
console.log(`✓ 成功复制: ${copied}`)
console.log(`❌ 未找到: ${notFound}`)
console.log(`⚠️  跳过: ${skipped}`)
console.log()

if (notFound > 0) {
  console.log('提示：部分缩略图未找到，可能的原因：')
  console.log('1. 缩略图文件名与资料文件名不匹配')
  console.log('2. 缩略图文件不在预期的维度文件夹中')
  console.log('3. 缩略图文件扩展名不是 .jpg')
}

/**
 * 递归列出目录下所有 .jpg 文件
 */
function listThumbnails(dir) {
  const results = []

  function walk(currentDir) {
    const files = fs.readdirSync(currentDir)

    for (const file of files) {
      const fullPath = path.join(currentDir, file)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        walk(fullPath)
      } else if (file.toLowerCase().endsWith('.jpg')) {
        results.push(fullPath)
      }
    }
  }

  walk(dir)
  return results
}

/**
 * 在指定维度文件夹中查找缩略图
 * 匹配策略：
 * 1. 精确匹配文件名
 * 2. 模糊匹配标题（移除前导数字和标点符号）
 */
function findThumbnail(root, dimensionFolder, fileName, title) {
  const dimensionPath = path.join(root, dimensionFolder)
  if (!fs.existsSync(dimensionPath)) {
    return null
  }

  const allThumbnails = listThumbnails(dimensionPath)

  // 策略 1: 精确匹配文件名
  for (const thumbnail of allThumbnails) {
    if (path.basename(thumbnail) === fileName) {
      return thumbnail
    }
  }

  // 策略 2: 模糊匹配标题（移除前导序号）
  const normalizedTitle = title.replace(/^\d+[.、\s]*/g, '').trim()

  for (const thumbnail of allThumbnails) {
    const thumbnailBase = path.basename(thumbnail, '.jpg')
    const normalizedThumbnail = thumbnailBase.replace(/^\d+[.、\s]*/g, '').trim()

    if (normalizedThumbnail.includes(normalizedTitle) || normalizedTitle.includes(normalizedThumbnail)) {
      return thumbnail
    }
  }

  return null
}
