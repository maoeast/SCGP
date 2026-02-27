/**
 * 直接初始化SQL.js的解决方案
 */

// 直接使用全局导入方式
export async function initSQLJS() {
  // 检查是否已经在window对象上定义了initSqlJs
  if ((window as any).initSqlJs) {
    return (window as any).initSqlJs
  }

  // 动态创建script标签加载sql.js
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = '/node_modules/sql.js/dist/sql-wasm.js'
    script.onload = () => {
      if ((window as any).initSqlJs) {
        resolve((window as any).initSqlJs)
      } else {
        reject(new Error('initSqlJs not found after loading'))
      }
    }
    script.onerror = () => reject(new Error('Failed to load sql.js'))
    document.head.appendChild(script)
  })
}

// 使用Vite的动态导入
export async function loadSQLJS() {
  try {
    // Vite的特殊处理方式
    return await import('sql.js/dist/sql-wasm.js')
  } catch (error) {
    console.error('Failed to load sql.js:', error)
    throw error
  }
}