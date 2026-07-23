/**
 * 预置视频资料测试脚本
 *
 * 验证：
 * 1. preset-teaching-materials.json 数据完整性
 * 2. 文件路径格式正确性
 * 3. 视频源文件存在性
 */

const fs = require('fs')
const path = require('path')

const JSON_PATH = path.join(__dirname, '../src/data/preset-teaching-materials.json')
const SOURCE_ROOT = 'G:/SCGP_Rec/Video/带水印'

const FOLDER_MAP = {
  '安抚教具': 'soothing-aids',
  '情绪调节': 'emotional-regulation',
  '感官训练': 'sensory-training',
  '生活自理': 'life-skills',
  '社交沟通': 'social-communication',
  '精细动作': 'fine-motor',
  '认知发展': 'cognitive-development',
}

console.log('========================================')
console.log('预置视频资料数据验证')
console.log('========================================\n')

// 1. 读取 JSON
if (!fs.existsSync(JSON_PATH)) {
  console.error('❌ 未找到 JSON 文件:', JSON_PATH)
  process.exit(1)
}

const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'))
console.log(`✅ JSON 文件加载成功，共 ${data.length} 条记录\n`)

// 2. 验证数据结构
const errors = []
const warnings = []

const dimensionStats = {}
const moduleStats = {}

for (let i = 0; i < data.length; i++) {
  const item = data[i]
  const prefix = `[${i}] ${item.title}`

  // 必填字段
  if (!item.title) errors.push(`${prefix}: 缺少 title`)
  if (!item.dimensionCode) errors.push(`${prefix}: 缺少 dimensionCode`)
  if (!item.moduleCode) errors.push(`${prefix}: 缺少 moduleCode`)
  if (!item.fileName) errors.push(`${prefix}: 缺少 fileName`)
  if (!item.filePath) errors.push(`${prefix}: 缺少 filePath`)
  if (typeof item.fileSizeBytes !== 'number') errors.push(`${prefix}: fileSizeBytes 不是数字`)

  // 路径格式
  if (item.filePath && !item.filePath.startsWith('assets/resources/videos/')) {
    errors.push(`${prefix}: filePath 必须以 'assets/resources/videos/' 开头`)
  }

  // 文件名匹配
  if (item.fileName && !item.fileName.endsWith('.mp4')) {
    errors.push(`${prefix}: fileName 必须以 .mp4 结尾`)
  }

  // 统计
  if (item.dimensionCode) {
    dimensionStats[item.dimensionCode] = (dimensionStats[item.dimensionCode] || 0) + 1
  }
  if (item.moduleCode) {
    moduleStats[item.moduleCode] = (moduleStats[item.moduleCode] || 0) + 1
  }

  // 检查源文件
  const dimensionFolder = Object.keys(FOLDER_MAP).find(k => FOLDER_MAP[k] === item.dimensionCode)
  if (dimensionFolder) {
    const relativeVideoPath = item.filePath.replace(/^assets\/resources\/videos\//, '')
    const pathParts = relativeVideoPath.split('/')
    const sourcePath = item.dimensionCode === 'life-skills' && pathParts.length === 3
      ? path.join(SOURCE_ROOT, dimensionFolder, pathParts[1], pathParts[2])
      : path.join(SOURCE_ROOT, dimensionFolder, item.fileName)

    if (!fs.existsSync(sourcePath)) {
      warnings.push(`${prefix}: 源文件不存在 - ${sourcePath}`)
    } else {
      const stat = fs.statSync(sourcePath)
      if (stat.size !== item.fileSizeBytes) {
        warnings.push(`${prefix}: 文件大小不匹配 (JSON: ${item.fileSizeBytes}, 实际: ${stat.size})`)
      }
    }
  }
}

// 3. 输出结果
console.log('📊 数据统计:\n')
console.log('按维度分组:')
for (const [dim, count] of Object.entries(dimensionStats)) {
  console.log(`  - ${dim}: ${count} 个`)
}

console.log('\n按模块分组:')
for (const [mod, count] of Object.entries(moduleStats)) {
  console.log(`  - ${mod}: ${count} 个`)
}

if (errors.length > 0) {
  console.log('\n❌ 发现错误:\n')
  errors.forEach(e => console.log(`  ${e}`))
}

if (warnings.length > 0) {
  console.log('\n⚠️  发现警告:\n')
  warnings.slice(0, 10).forEach(w => console.log(`  ${w}`))
  if (warnings.length > 10) {
    console.log(`  ... 还有 ${warnings.length - 10} 个警告`)
  }
}

if (errors.length === 0) {
  console.log('\n✅ 数据验证通过！')
} else {
  console.log(`\n❌ 发现 ${errors.length} 个错误，${warnings.length} 个警告`)
  process.exit(1)
}

console.log('\n========================================')
console.log('总计:')
console.log(`  记录数: ${data.length}`)
console.log(`  总大小: ${(data.reduce((sum, item) => sum + item.fileSizeBytes, 0) / 1024 / 1024).toFixed(2)} MB`)
console.log('========================================\n')
