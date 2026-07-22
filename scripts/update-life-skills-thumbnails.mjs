#!/usr/bin/env node
/**
 * 更新生活自理类教学资料缩略图
 * 将 4 个子文件夹中的 PNG 转换为 JPG 并按 ID 重命名
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

// 加载教学资料数据
const materialsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'teaching-materials-export.json'), 'utf-8')
)

const lifeSkillsMaterials = materialsData
  .filter(m => m.dimension_code === 'life-skills')
  .sort((a, b) => a.id - b.id)

// 源文件夹
const sourceRoot = path.join(projectRoot, 'assets/resources/images/teaching-materials/life-skills')
const subfolders = [
  '学龄前儿童生活自理能力训练',
  '影子老师',
  '星星雨教育',
  '董泉老师'
]

// 输出目录
const targetDir = sourceRoot
const tempDir = path.join(sourceRoot, '.tmp-convert')

// 创建临时目录
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

console.log('🔍 开始扫描新缩略图...\n')

let converted = 0
let skipped = 0
let notFound = 0

// 构建文件名到ID的映射
const titleToId = new Map()
lifeSkillsMaterials.forEach(m => {
  titleToId.set(m.title, m.id)
})

// 扫描所有子文件夹
for (const subfolder of subfolders) {
  const subfolderPath = path.join(sourceRoot, subfolder)

  if (!fs.existsSync(subfolderPath)) {
    console.log(`⚠️  子文件夹不存在: ${subfolder}`)
    continue
  }

  console.log(`📁 处理文件夹: ${subfolder}`)

  const files = fs.readdirSync(subfolderPath).filter(f => f.endsWith('.png'))

  for (const file of files) {
    const basename = path.basename(file, '.png')
    const materialId = titleToId.get(basename)

    if (!materialId) {
      console.log(`  ❌ 未找到匹配: ${basename}`)
      notFound++
      continue
    }

    const sourcePath = path.join(subfolderPath, file)
    const tempJpg = path.join(tempDir, `${materialId}.jpg`)
    const targetPath = path.join(targetDir, `${materialId}.jpg`)

    try {
      // 使用 ImageMagick convert 或 ffmpeg 转换 PNG 到 JPG
      // 优先尝试 magick（ImageMagick 7+），然后 convert（ImageMagick 6），最后 ffmpeg
      let convertSuccess = false

      // 尝试 ImageMagick
      try {
        await execAsync(`magick "${sourcePath}" -quality 85 "${tempJpg}"`)
        convertSuccess = true
      } catch (e1) {
        try {
          await execAsync(`convert "${sourcePath}" -quality 85 "${tempJpg}"`)
          convertSuccess = true
        } catch (e2) {
          // 尝试 ffmpeg
          try {
            await execAsync(`ffmpeg -i "${sourcePath}" -q:v 3 "${tempJpg}" -y`)
            convertSuccess = true
          } catch (e3) {
            console.log(`  ⚠️  转换失败 (无可用工具): ${basename} -> ${materialId}.jpg`)
            console.log(`     尝试直接复制 PNG...`)
            fs.copyFileSync(sourcePath, targetPath.replace('.jpg', '.png'))
            skipped++
            continue
          }
        }
      }

      if (convertSuccess) {
        // 移动到目标目录
        fs.renameSync(tempJpg, targetPath)
        console.log(`  ✓ ${basename} -> ${materialId}.jpg`)
        converted++
      }

    } catch (err) {
      console.error(`  ❌ 处理失败: ${basename}`, err.message)
      skipped++
    }
  }

  console.log()
}

// 清理临时目录
if (fs.existsSync(tempDir) && fs.readdirSync(tempDir).length === 0) {
  fs.rmdirSync(tempDir)
}

console.log('📊 更新完成:')
console.log(`  ✓ 转换成功: ${converted}`)
console.log(`  ❌ 未找到匹配: ${notFound}`)
console.log(`  ⚠️  跳过: ${skipped}`)
console.log()
console.log('💡 提示: 转换后的 JPG 文件已放置在 life-skills/ 根目录')
console.log('    你可以手动删除子文件夹以清理源文件')
