const fs = require('fs').promises
const path = require('path')

// 资源目录结构
const resourceStructure = {
  'docs': [
    // 教学文档
    { source: '../assets/resources/docs', target: 'docs' }
  ],
  'videos': [
    // 示范视频
    { source: '../assets/resources/videos', target: 'videos' }
  ],
  'ppt': [
    // PPT课件
    { source: '../assets/resources/ppt', target: 'ppt' }
  ],
  'cases': [
    // 案例分析
    { source: '../assets/resources/cases', target: 'cases' }
  ],
  'images': [
    // 图片素材
    { source: '../assets/resources/images', target: 'images' }
  ],
  'audio': [
    // 音频资源
    { source: '../assets/resources/audio', target: 'audio' }
  ]
}

async function copyFolder(source, target) {
  try {
    // 确保目标目录存在
    await fs.mkdir(target, { recursive: true })

    // 读取源目录
    const items = await fs.readdir(source, { withFileTypes: true })

    for (const item of items) {
      const sourcePath = path.join(source, item.name)
      const targetPath = path.join(target, item.name)

      if (item.isDirectory()) {
        // 递归复制子目录
        await copyFolder(sourcePath, targetPath)
      } else {
        // 复制文件
        await fs.copyFile(sourcePath, targetPath)
        console.log(`复制文件: ${item.name}`)
      }
    }
  } catch (error) {
    console.error(`复制文件夹失败: ${source} -> ${target}`, error)
  }
}

async function initResources() {
  console.log('开始初始化预置资源...')

  // 获取当前脚本的目录
  const scriptDir = __dirname

  // 遍历所有资源类别
  for (const [category, folders] of Object.entries(resourceStructure)) {
    for (const folder of folders) {
      const sourcePath = path.resolve(scriptDir, folder.source)
      const targetPath = path.resolve(scriptDir, '../dist/resources', folder.target)

      console.log(`处理 ${category} 资源...`)

      // 检查源目录是否存在
      try {
        await fs.access(sourcePath)
        await copyFolder(sourcePath, targetPath)
      } catch (error) {
        console.log(`警告: ${folder.source} 目录不存在，跳过`)
      }
    }
  }

  console.log('预置资源初始化完成！')
}

// 如果直接运行此脚本
if (require.main === module) {
  initResources().catch(console.error)
}

module.exports = { initResources, copyFolder }