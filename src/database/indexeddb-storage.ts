/**
 * IndexedDB 存储管理器
 * 用于替代 localStorage 存储 SQL.js 数据库
 */

const DB_NAME = 'SelfCareATS_DB'
const DB_VERSION = 1
const STORE_NAME = 'database'

// 数据库内容版本号 - 当数据结构发生变化时递增此版本号
// 必须与 sqljs-init.ts 中的 DATABASE_VERSION 保持一致
export const DATA_VERSION = '4.1.2' // 添加 training_records 表用于感官训练记录
const DATA_VERSION_KEY = 'data_version'

export class IndexedDBStorage {
  private db: IDBDatabase | null = null

  // 初始化 IndexedDB
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('IndexedDB打开失败:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('IndexedDB初始化成功')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
    })
  }

  // 保存数据库
  async save(data: Uint8Array): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      // 保存数据库数据和版本号
      store.put(data, 'main_db')
      store.put(DATA_VERSION, DATA_VERSION_KEY)

      transaction.onerror = () => {
        console.error('保存数据库到IndexedDB失败:', transaction.error)
        reject(transaction.error)
      }

      transaction.oncomplete = () => {
        console.log('数据库已保存到IndexedDB (版本: ' + DATA_VERSION + ')')
        resolve()
      }
    })
  }

  // 加载数据库
  async load(): Promise<Uint8Array | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get('main_db')

      request.onerror = () => {
        console.error('从IndexedDB加载数据库失败:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        const data = request.result
        if (data) {
          console.log('从IndexedDB加载数据库成功')
          resolve(data)
        } else {
          console.log('IndexedDB中没有找到数据库')
          resolve(null)
        }
      }
    })
  }

  // 获取存储的数据版本
  async getVersion(): Promise<string | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(DATA_VERSION_KEY)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  // 检查是否存在数据库
  async exists(): Promise<boolean> {
    const data = await this.load()
    return data !== null
  }

  // 清除数据库
  async clear(): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete('main_db')

      request.onerror = () => {
        console.error('清除IndexedDB数据库失败:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        console.log('已清除IndexedDB中的数据库')
        resolve()
      }
    })
  }

  // 获取存储使用情况
  async getUsage(): Promise<{ used: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0
      }
    }
    return { used: 0, available: 0 }
  }
}

// 创建单例实例
export const indexedDBStorage = new IndexedDBStorage()