// 测试SQL.js导入
async function testSqlJs() {
  console.log('开始测试SQL.js导入...')

  try {
    // 方法1: 直接导入
    const sqljs1 = await import('sql.js')
    console.log('导入方法1 - sqljs1:', Object.keys(sqljs1))
    console.log('sqljs1.default:', typeof sqljs1.default)

    if (sqljs1.default && typeof sqljs1.default === 'function') {
      console.log('找到 initSqlJs 函数')
      const initDb = await sqljs1.default()
      console.log('数据库初始化成功:', typeof initDb)
    }

    // 方法2: 使用require
    // const sqljs2 = require('sql.js')
    // console.log('导入方法2 - sqljs2:', Object.keys(sqljs2))
  } catch (error) {
    console.error('测试失败:', error)
  }
}

// 在浏览器中运行
if (typeof window !== 'undefined') {
  testSqlJs()
}