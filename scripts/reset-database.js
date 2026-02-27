/**
 * 数据库重置脚本
 * 在浏览器控制台执行此脚本来重置数据库并加载新的31项任务
 *
 * 使用方法：
 * 1. 打开应用
 * 2. 按F12打开开发者工具
 * 3. 在控制台粘贴以下代码并执行
 */

(function resetDatabase() {
  console.log('🔄 开始重置数据库...')

  // 1. 清除 localStorage 中的数据库
  const dbKey = 'selfcare_ats_sql_db'
  if (localStorage.getItem(dbKey)) {
    localStorage.removeItem(dbKey)
    console.log('✅ 已清除本地数据库')
  }

  // 2. 清除所有相关的 localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.includes('selfcare') || key.includes('ats')) {
      localStorage.removeItem(key)
      console.log(`✅ 已清除 ${key}`)
    }
  })

  // 3. 清除 sessionStorage
  sessionStorage.clear()
  console.log('✅ 已清除会话存储')

  console.log('🎉 数据库重置完成！')
  console.log('📌 请刷新页面让系统重新初始化数据库')
  console.log('')
  console.log('⚠️  刷新后系统将自动加载31项新的训练任务')

  // 4. 自动刷新页面（延迟2秒）
  setTimeout(() => {
    if (confirm('数据库已清除！是否立即刷新页面以加载新数据？')) {
      location.reload()
    }
  }, 1000)
})()
