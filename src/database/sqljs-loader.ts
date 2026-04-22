/**
 * SQL.js 加载器 - 使用 script 标签加载方式
 * 注意：动态 import 不适用于 sql.js，因为它不是标准 ES 模块
 */

import sqlWasmScriptUrl from 'sql.js/dist/sql-wasm.js?url'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

let loadPromise: Promise<any> | null = null

// 使用 script 标签加载 SQL.js
export async function loadSQLJs(): Promise<any> {
  // 避免重复加载
  if (loadPromise) {
    return loadPromise
  }

  loadPromise = (async () => {
    console.log('[loadSQLJs] 开始加载 SQL.js...')

    // 检查是否已经加载
    if ((window as any).initSqlJs) {
      console.log('[loadSQLJs] ✅ initSqlJs 已存在于 window 上')
      return (window as any).initSqlJs
    }

    // 使用 script 标签加载
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = sqlWasmScriptUrl
      script.async = true

      console.log('[loadSQLJs] 正在加载 script:', script.src)

      script.onload = () => {
        if ((window as any).initSqlJs) {
          console.log('[loadSQLJs] ✅ script 加载成功，initSqlJs 已就绪')
          resolve((window as any).initSqlJs)
        } else {
          reject(new Error('SQL.js 加载失败：script 加载成功但未找到 initSqlJs 函数'))
        }
      }

      script.onerror = (e) => {
        console.error('[loadSQLJs] ❌ script 加载失败:', e)
        reject(new Error(`SQL.js 加载失败：无法加载 ${sqlWasmScriptUrl}`))
      }

      document.head.appendChild(script)
    })
  })()

  return loadPromise
}

// 初始化SQL.js数据库
export async function initSQLiteDatabase(): Promise<any> {
  try {
    console.log('[initSQLiteDatabase] 开始初始化 SQL.js 数据库...')

    // 加载SQL.js
    const initSqlJs = await loadSQLJs()
    console.log('[initSQLiteDatabase] initSqlJs 函数已获取')

    // 初始化SQL.js - 使用绝对路径确保 WASM 文件能正确加载
    const SQL = await initSqlJs({
      locateFile: (filename: string) => {
        console.log(`[initSQLiteDatabase] locateFile: ${filename} -> ${sqlWasmUrl}`)
        return sqlWasmUrl
      }
    })
    console.log('[initSQLiteDatabase] ✅ SQL.js 初始化成功')

    let db: any
    let isNewDb = true

    // 检查是否需要清空数据
    const shouldClear = sessionStorage.getItem('__CLEAR_ALL_DATA__') === 'true' ||
                        new URLSearchParams(window.location.search).get('clear') === 'true'

    // ========== 优先级1：从本地文件加载（Electron环境） ==========
    if ((window as any).electronAPI && !shouldClear) {
      try {
        const electronAPI = (window as any).electronAPI
        const userDataPath = await electronAPI.getUserDataPath()
        const backupPath = `${userDataPath}/database_backup.db`

        console.log('🔍 检查本地备份文件:', backupPath)

        const fileInfo = await electronAPI.databaseFileExists(backupPath)

        if (fileInfo.exists) {
          console.log('📂 发现本地备份文件，大小:', fileInfo.size, 'bytes')
          const result = await electronAPI.readDatabaseFile(backupPath)

          if (result.success && result.data) {
            // 先检查 IndexedDB 的版本和时间
            const { indexedDBStorage, DATA_VERSION: currentVersion } = await import('./indexeddb-storage')
            const indexedDBVersion = await indexedDBStorage.getVersion()

            // 比较本地文件和 IndexedDB 的版本，使用较新的
            if (indexedDBVersion && indexedDBVersion === currentVersion) {
              console.log('✅ IndexedDB 有较新的数据，从 IndexedDB 加载')
              db = new SQL.Database(result.data) // 先从文件加载基础数据
              // 然后从 IndexedDB 加载覆盖
              const indexedDBData = await indexedDBStorage.load()
              if (indexedDBData) {
                db = new SQL.Database(indexedDBData)
                console.log('✅ 使用 IndexedDB 的最新数据')
              }
              isNewDb = false
            } else {
              db = new SQL.Database(result.data)
              isNewDb = false
              console.log('✅ 从本地文件恢复数据库成功')

              // 同步到IndexedDB
              try {
                await indexedDBStorage.save(result.data)
                console.log('✅ 数据已同步到IndexedDB (版本: ' + currentVersion + ')')
              } catch (syncError) {
                console.warn('⚠️ 同步到IndexedDB失败:', syncError)
              }
            }

            return { db, SQL, isNewDb }
          } else {
            console.error('❌ 读取本地备份文件失败:', result.error)
          }
        } else {
          console.log('ℹ️ 本地备份文件不存在，尝试其他方式')
        }
      } catch (error) {
        console.warn('⚠️ 从本地文件加载失败:', error)
      }
    }

    // ========== 优先级2：从IndexedDB加载 ==========
    if (!shouldClear) {
      try {
        const { indexedDBStorage, DATA_VERSION: currentVersion } = await import('./indexeddb-storage')
        const savedData = await indexedDBStorage.load()

        if (savedData) {
          // 检查版本号
          const savedVersion = await indexedDBStorage.getVersion()

          if (savedVersion && savedVersion !== currentVersion) {
            console.log(`🔄 数据库版本从 ${savedVersion} 更新到 ${currentVersion}，清除旧数据...`)
            await indexedDBStorage.clear()
            isNewDb = true
            // 清除后继续创建新数据库
          } else {
            // 从保存的数据创建数据库
            db = new SQL.Database(savedData)
            isNewDb = false
            console.log('✅ 从IndexedDB加载已保存的数据库 (版本: ' + (savedVersion || 'unknown') + ')')

            // 如果是Electron环境，同步到本地文件
            if ((window as any).electronAPI) {
              try {
                const electronAPI = (window as any).electronAPI
                const userDataPath = await electronAPI.getUserDataPath()
                const backupPath = `${userDataPath}/database_backup.db`
                const writeResult = await electronAPI.writeDatabaseFile(backupPath, savedData)
                if (writeResult.success) {
                  console.log('✅ 数据已同步到本地文件')
                }
              } catch (syncError) {
                console.warn('⚠️ 同步到本地文件失败:', syncError)
              }
            }

            return { db, SQL, isNewDb }
          }
        } else {
          console.log('ℹ️ IndexedDB中没有数据')
        }
      } catch (error) {
        console.error('❌ IndexedDB加载失败，尝试localStorage:', error)
      }
    }

    // ========== 优先级3：从localStorage加载（降级方案） ==========
    const savedDb = localStorage.getItem('selfcare_ats_db')
    const savedVersion = localStorage.getItem('selfcare_ats_db_version')
    const { DATA_VERSION: currentVersion } = await import('./indexeddb-storage')

    if (savedDb) {
      try {
        // 检查版本号
        if (savedVersion && savedVersion !== currentVersion) {
          console.log(`🔄 localStorage数据库版本从 ${savedVersion} 更新到 ${currentVersion}，清除旧数据...`)
          localStorage.removeItem('selfcare_ats_db')
          localStorage.removeItem('selfcare_ats_db_version')
          sessionStorage.clear()
          // 继续创建新数据库
        } else {
          // 解码base64数据
          const binaryString = atob(savedDb)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          // 从保存的数据创建数据库
          db = new SQL.Database(bytes)
          isNewDb = false
          console.log('✅ 从localStorage加载已保存的数据库（降级方案）')

          // 尝试将数据迁移到IndexedDB和本地文件
          try {
            const { indexedDBStorage } = await import('./indexeddb-storage')
            await indexedDBStorage.save(bytes)
            console.log('✅ 数据已从localStorage迁移到IndexedDB')

            // 如果是Electron环境，也迁移到本地文件
            if ((window as any).electronAPI) {
              try {
                const electronAPI = (window as any).electronAPI
                const userDataPath = await electronAPI.getUserDataPath()
                const backupPath = `${userDataPath}/database_backup.db`
                const result = await electronAPI.writeDatabaseFile(backupPath, bytes)
                if (result.success) {
                  console.log('✅ 数据已从localStorage迁移到本地文件')
                }
              } catch (fileError) {
                console.warn('⚠️ 迁移到本地文件失败:', fileError)
              }
            }

            // 清除localStorage中的旧数据
            localStorage.removeItem('selfcare_ats_db')
            localStorage.removeItem('selfcare_ats_db_version')
            console.log('🗑️ 已清除localStorage旧数据')
          } catch (migrateError) {
            console.error('❌ 数据迁移失败:', migrateError)
          }

          return { db, SQL, isNewDb }
        }
      } catch (e) {
        console.error('❌ localStorage解码失败:', e)
      }
    }

    // ========== 优先级4：创建新数据库 ==========
    db = new SQL.Database()
    console.log('⚠️ 未找到任何备份数据，创建新的数据库')

    return { db, SQL, isNewDb }
  } catch (error) {
    console.error('SQL.js初始化失败:', error)
    throw error
  }
}
