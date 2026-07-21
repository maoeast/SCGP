/**
 * 预置视频资料打包脚本
 *
 * 功能：将 389 个预置视频打包为 7-Zip 自解压文件（SFX）
 *
 * 使用方法：
 *   node scripts/package-preset-videos.cjs
 *
 * 前置条件：
 *   1. 安装 7-Zip 并将其添加到系统 PATH
 *   2. 视频源文件位于 G:\SCGP_Rec\Video\带水印\
 *
 * 输出：
 *   - scgp-preset-videos.exe（自解压文件，约 1.2GB）
 *   - 用户双击运行后，自动解压到程序安装目录的 resources\assets\resources\videos\
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const SOURCE_ROOT = 'G:/SCGP_Rec/Video/带水印'
const OUTPUT_DIR = path.join(__dirname, '../dist')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'scgp-preset-videos.exe')
const PRESET_JSON = path.join(__dirname, '../src/data/preset-teaching-materials.json')
const SEVEN_ZIP_PATH = 'C:\\Program Files\\7-Zip\\7z.exe'

// 文件夹到 dimensionCode 的映射
const FOLDER_MAP = {
  '安抚教具': 'soothing-aids',
  '情绪调节': 'emotional-regulation',
  '感官训练': 'sensory-training',
  '生活自理': 'life-skills',
  '社交沟通': 'social-communication',
  '精细动作': 'fine-motor',
  '认知发展': 'cognitive-development',
}

// 生活自理的子文件夹映射
const LIFE_SKILLS_SUBFOLDERS = {
  '影子老师': 'life-skills/影子老师',
  '董泉老师': 'life-skills/董泉老师',
  '星星雨教育': 'life-skills/星星雨教育',
  '学龄前儿童生活自理能力训练': 'life-skills/学龄前儿童生活自理能力训练',
}

console.log('========================================')
console.log('SCGP 预置视频资料打包工具')
console.log('========================================\n')

// 检查 7-Zip
if (!fs.existsSync(SEVEN_ZIP_PATH)) {
  console.error('❌ 未找到 7-Zip，请先安装到默认位置')
  console.error(`   预期路径: ${SEVEN_ZIP_PATH}`)
  console.error('   下载地址: https://www.7-zip.org/')
  process.exit(1)
}

// 检查源目录
if (!fs.existsSync(SOURCE_ROOT)) {
  console.error(`❌ 源目录不存在: ${SOURCE_ROOT}`)
  process.exit(1)
}

// 加载预置数据清单
console.log('📋 加载预置数据清单...')
let presetData
try {
  const jsonContent = fs.readFileSync(PRESET_JSON, 'utf-8')
  presetData = JSON.parse(jsonContent)
  console.log(`✅ 成功加载 ${presetData.length} 条视频记录\n`)
} catch (error) {
  console.error(`❌ 无法加载 ${PRESET_JSON}:`, error.message)
  process.exit(1)
}

// 创建临时工作目录
const TEMP_DIR = path.join(__dirname, '../temp-videos')
const ASSETS_DIR = path.join(TEMP_DIR, 'assets/resources/videos')

if (fs.existsSync(TEMP_DIR)) {
  console.log('🧹 清理旧临时目录...')
  fs.rmSync(TEMP_DIR, { recursive: true, force: true })
}

console.log('📁 创建临时目录结构...')
fs.mkdirSync(ASSETS_DIR, { recursive: true })

// 按 JSON 数据复制文件
console.log('📦 复制视频文件...\n')
let totalFiles = 0
let totalSize = 0
let missingFiles = []

const dimensionStats = {}

for (const item of presetData) {
  // 从 filePath 提取目标相对路径：assets/resources/videos/{dimensionCode}/{fileName}
  // 或 assets/resources/videos/life-skills/{subFolder}/{fileName}
  const relativePath = item.filePath.replace(/^assets\/resources\/videos\//, '')
  const targetPath = path.join(ASSETS_DIR, relativePath)

  // 确定源文件路径
  let sourcePath
  const parts = relativePath.split('/')

  if (item.dimensionCode === 'life-skills' && parts.length === 3) {
    // 生活自理子文件夹：life-skills/影子老师/xxx.mp4
    const subFolder = parts[1] // 影子老师、董泉老师 等
    const fileName = parts[2]
    sourcePath = path.join(SOURCE_ROOT, '生活自理', subFolder, fileName)
  } else if (item.dimensionCode === 'life-skills' && parts.length === 2) {
    // 生活自理根目录：life-skills/xxx.mp4
    const fileName = parts[1]
    sourcePath = path.join(SOURCE_ROOT, '生活自理', fileName)
  } else {
    // 普通维度：{dimensionCode}/{fileName}
    const folderName = Object.keys(FOLDER_MAP).find(k => FOLDER_MAP[k] === item.dimensionCode)
    if (!folderName) {
      console.error(`❌ 未找到 dimensionCode 对应的文件夹: ${item.dimensionCode}`)
      missingFiles.push({ title: item.title, sourcePath: `未知维度: ${item.dimensionCode}` })
      continue
    }
    sourcePath = path.join(SOURCE_ROOT, folderName, item.fileName)
  }

  // 检查源文件是否存在
  if (!fs.existsSync(sourcePath)) {
    missingFiles.push({ title: item.title, sourcePath })
    continue
  }

  // 创建目标目录
  const targetDir = path.dirname(targetPath)
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  // 复制文件
  fs.copyFileSync(sourcePath, targetPath)

  const stat = fs.statSync(sourcePath)
  totalSize += stat.size
  totalFiles++

  // 统计维度
  const dimension = item.dimensionCode
  if (!dimensionStats[dimension]) {
    dimensionStats[dimension] = { count: 0, size: 0 }
  }
  dimensionStats[dimension].count++
  dimensionStats[dimension].size += stat.size
}

console.log('📊 复制统计:\n')
for (const [dimension, stats] of Object.entries(dimensionStats)) {
  console.log(`  ${dimension}: ${stats.count} 个视频, ${(stats.size / 1024 / 1024).toFixed(2)} MB`)
}
console.log(`\n✅ 共复制 ${totalFiles} 个视频文件，总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)

if (missingFiles.length > 0) {
  console.log(`\n⚠️  ${missingFiles.length} 个文件缺失:`)
  missingFiles.slice(0, 10).forEach(f => console.log(`  - ${f.title}: ${f.sourcePath}`))
  if (missingFiles.length > 10) {
    console.log(`  ... 还有 ${missingFiles.length - 10} 个`)
  }
  console.log('\n❌ 存在缺失文件，无法继续打包')
  process.exit(1)
}

// 创建 7-Zip SFX 配置文件
console.log('\n⚙️  创建 SFX 配置...')
const SFX_CONFIG = `
;!@Install@!UTF-8!
Title="SCGP 星愿能力发展平台 - 预置视频资料库"
BeginPrompt="即将安装 ${totalFiles} 个预置视频资料（约 ${(totalSize / 1024 / 1024).toFixed(0)} MB）到程序安装目录。\\n\\n请确保程序已安装并关闭所有 SCGP 窗口。\\n\\n点击"确定"继续，点击"取消"退出。"
ExtractDialogText="正在解压视频资料，请稍候..."
ExtractPathText="请选择 SCGP 程序的安装目录（包含 SCGP.exe 的文件夹）："
ExtractTitle="SCGP 预置视频资料安装"
GUIMode="2"
OverwriteMode="2"
;!@InstallEnd@!
`.trim()

const SFX_CONFIG_FILE = path.join(TEMP_DIR, 'sfx-config.txt')
fs.writeFileSync(SFX_CONFIG_FILE, SFX_CONFIG, 'utf-8')

// 创建输出目录
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

// 打包为 7z
console.log('🗜️  正在压缩（这可能需要几分钟）...\n')
const ARCHIVE_FILE = path.join(TEMP_DIR, 'preset-videos.7z')

try {
  execSync(`"${SEVEN_ZIP_PATH}" a -t7z -mx=5 "${ARCHIVE_FILE}" "${path.join(TEMP_DIR, 'assets')}"`, {
    stdio: 'inherit',
    cwd: TEMP_DIR
  })
} catch (error) {
  console.error('❌ 压缩失败')
  process.exit(1)
}

// 制作自解压文件
console.log('\n📦 制作自解压文件...\n')

// 查找 7-Zip SFX 模块
const SFX_MODULE = 'C:\\Program Files\\7-Zip\\7z.sfx'
if (!fs.existsSync(SFX_MODULE)) {
  console.error('❌ 未找到 7z.sfx 模块，请确保 7-Zip 已正确安装')
  process.exit(1)
}

try {
  // 使用 copy 命令合并文件（支持大文件）
  // Windows: copy /b file1+file2+file3 output
  const copyCmd = `copy /b "${SFX_MODULE}"+"${SFX_CONFIG_FILE}"+"${ARCHIVE_FILE}" "${OUTPUT_FILE}"`
  execSync(copyCmd, { stdio: 'inherit', shell: 'cmd.exe' })

  console.log('✅ 自解压文件创建成功！\n')
} catch (error) {
  console.error('❌ 创建自解压文件失败:', error.message)
  process.exit(1)
}

// 清理临时文件
console.log('🧹 清理临时文件...')
fs.rmSync(TEMP_DIR, { recursive: true, force: true })

// 输出结果
const finalStat = fs.statSync(OUTPUT_FILE)
console.log('\n========================================')
console.log('✨ 打包完成！')
console.log('========================================')
console.log(`📍 输出文件: ${OUTPUT_FILE}`)
console.log(`📊 文件大小: ${(finalStat.size / 1024 / 1024).toFixed(2)} MB`)
console.log(`📦 包含视频: ${totalFiles} 个`)
console.log('\n📝 使用说明:')
console.log('   1. 将 scgp-preset-videos.exe 提供给用户')
console.log('   2. 用户双击运行，选择 SCGP 安装目录')
console.log('   3. 自动解压到 {installDir}/resources/assets/resources/videos/')
console.log('   4. 重启 SCGP 即可在"资源中心-教学资料"看到所有视频\n')
