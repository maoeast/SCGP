declare module 'sql.js' {
  const initSqlJs: any
  export default initSqlJs
  export { initSqlJs }
  export const SQL: any
}

declare module 'sql.js/dist/sql-wasm.js' {
  const sqlWasm: any
  export default sqlWasm
}
