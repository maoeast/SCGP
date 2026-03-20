// Font Awesome 已通过 index.html 从 /public/fontawesome 本地目录加载
// 注意：不在这里导入 main.css，已在 index.html 中导入以确保正确的加载顺序

import { createApp } from 'vue'
import pinia from './stores'
import router from './router'
import { initDatabase } from './database/init'
import { initializeBuiltinModules } from './core/module-registry'
import { initializeStrategies } from './core/strategies-init'
import { useAuthStore } from './stores/auth'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 全局页面布局规范 CSS
import './assets/layout.css'

import App from './App.vue'

const app = createApp(App)

// 初始化数据库
async function initializeApp() {
  try {
    // 检查是否需要清空所有数据
    const urlParams = new URLSearchParams(window.location.search)
    const shouldClear = urlParams.get('clear') === 'true' || sessionStorage.getItem('__CLEAR_ALL_DATA__') === 'true'

    if (shouldClear) {
      console.log('🔄 检测到清空数据标志，开始清空...')

      // 清空 IndexedDB
      await new Promise<void>((resolve) => {
        const deleteReq = indexedDB.deleteDatabase('SelfCareATS_DB')
        deleteReq.onsuccess = () => {
          console.log('✅ IndexedDB 已清空')
          resolve()
        }
        deleteReq.onerror = () => {
          console.error('❌ IndexedDB 清空失败')
          resolve() // 继续执行
        }
        deleteReq.onblocked = () => {
          console.warn('⚠️ IndexedDB 删除被阻塞')
          setTimeout(() => resolve(), 1000)
        }
      })

      // 清空 localStorage
      const keepKeys = ['theme', 'language']
      Object.keys(localStorage).forEach(key => {
        if (!keepKeys.includes(key)) {
          localStorage.removeItem(key)
        }
      })
      console.log('✅ localStorage 已清空')

      // 清空 sessionStorage
      sessionStorage.clear()
      console.log('✅ sessionStorage 已清空')

      // 删除 Electron 环境下的数据库文件
      if ((window as any).electronAPI) {
        try {
          const electronAPI = (window as any).electronAPI
          const userDataPath = await electronAPI.getUserDataPath()

          // 删除主数据库文件
          const dbPath = `${userDataPath}/database.sqlite`
          const dbDeleteResult = await electronAPI.deleteFile(dbPath)
          if (dbDeleteResult) {
            console.log('✅ 主数据库文件已删除:', dbPath)
          } else {
            console.warn('⚠️ 删除主数据库文件失败:', dbPath)
          }

          // 删除备份文件
          const backupPath = `${userDataPath}/database_backup.db`
          const backupDeleteResult = await electronAPI.deleteFile(backupPath)
          if (backupDeleteResult) {
            console.log('✅ 备份文件已删除:', backupPath)
          } else {
            console.warn('⚠️ 删除备份文件失败:', backupPath)
          }
        } catch (error) {
          console.warn('⚠️ 删除数据库文件时出错:', error)
        }
      }

      // 清除 URL 参数
      window.history.replaceState({}, '', window.location.pathname)

      console.log('✅ 数据清空完成，开始初始化...')
    }

    // 初始化SQLite数据库
    await initDatabase()

    // 初始化模块注册表
    initializeBuiltinModules()

    // 初始化 IEP 策略
    initializeStrategies()

    // 使用插件
    app.use(pinia)
    app.use(router)
    app.use(ElementPlus)

    // 注册所有图标
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
      app.component(key, component)
    }

    // 抑制 ResizeObserver 警告 (Element Plus 组件触发)
    const originalError = console.error
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('ResizeObserver loop')) {
        return // 忽略此警告
      }
      originalError.apply(console, args)
    }

    // 捕获未处理的 ResizeObserver 错误
    window.addEventListener('error', (event) => {
      if (event.message && event.message.includes('ResizeObserver loop')) {
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    })

    // 捕获未处理的 Promise 错误
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message && event.reason.message.includes('ResizeObserver loop')) {
        event.preventDefault()
        return false
      }
    })

    // 挂载应用
    app.mount('#app')

    // 恢复认证状态
    const authStore = useAuthStore()
    authStore.restoreAuth()

    // 检查激活状态
    await authStore.checkActivation()

    console.log('应用初始化成功')

    // 注册全局迁移函数（用于控制台手动迁移）
    ;(window as any).__migrateReportConstraints = async () => {
      const { migrateReportRecordConstraintsManually } = await import('./database/init')
      const result = await migrateReportRecordConstraintsManually()
      if (result.success) {
        alert('迁移成功！\n' + result.message + '\n\n请刷新页面后重试。')
        location.reload()
      } else {
        alert('迁移失败！\n' + result.message)
      }
      return result
    }
    console.log('💡 提示：如需手动迁移数据库约束，可在控制台运行: __migrateReportConstraints()')

    // ========== Plan B: 应用退出前保存数据 ==========
    // 确保应用关闭前数据被保存到磁盘（绕过防抖，立即保存）
    window.addEventListener('beforeunload', async () => {
      try {
        const db = (window as any).db
        if (db && typeof db.saveNow === 'function') {
          // SQLWrapper 的 saveNow() 方法会导出数据库并调用 IPC 保存
          await db.saveNow()
          console.log('[App] ✅ 应用退出前数据已保存')
        } else if (db && typeof db.export === 'function') {
          // 降级方案：直接导出并保存
          const data = db.export()
          if (data.byteLength > 0 && (window as any).electronAPI) {
            await (window as any).electronAPI.saveDatabaseAtomic(data, 'database.sqlite')
            console.log('[App] ✅ 应用退出前数据已保存（降级方案）')
          }
        }
      } catch (error) {
        console.warn('[App] ⚠️  应用退出前保存失败:', error)
      }
    })
  } catch (error) {
    console.error('应用初始化失败:', error)

    // 显示错误信息
    const errorDiv = document.createElement('div')
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      max-width: 500px;
      text-align: center;
    `
    errorDiv.innerHTML = `
      <h2>系统初始化失败</h2>
      <p>错误信息: ${error}</p>
      <p>请刷新页面重试，或联系技术支持。</p>
      <button onclick="location.reload()" style="
        padding: 8px 20px;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      ">刷新页面</button>
    `
    document.body.appendChild(errorDiv)
  }
}

// 启动应用
initializeApp()
