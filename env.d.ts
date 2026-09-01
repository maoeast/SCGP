/// <reference types="vite/client" />

/**
 * 全局 Window 接口扩展
 */
declare module '*.sql?raw' {
  const content: string
  export default content
}

declare module 'sql.js' {
  const initSqlJs: any
  export default initSqlJs
  export const SQL: any
}

declare module 'sql.js/dist/sql-wasm.js' {
  const sqlWasm: any
  export default sqlWasm
}

// window.electronAPI 类型统一由 src/types/electron.d.ts 声明。
// 历史上 env.d.ts 曾有一份内联重复副本，两份分叉维护（env.d.ts 缺新成员、electron.d.ts 缺
// readFile/getAppPath/aiListModels），2026-09-01 已删除旧副本并补齐 electron.d.ts，统一为单一声明源。

export {}
