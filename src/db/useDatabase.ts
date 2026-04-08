import { ref, shallowRef } from 'vue'
import initSqlJs from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

import defaultSchemaSql from './schema.sql?raw'
import { migrateLegacyEmotionSceneData, type LegacyMigrationResult } from './migrateLegacyData'

type SqlPrimitive = string | number | null | Uint8Array
type SqlParams = SqlPrimitive[] | Record<string, SqlPrimitive>

export interface SqlResultSet {
  columns: string[]
  values: SqlPrimitive[][]
}

interface SqlDatabase {
  exec(sql: string, params?: SqlParams): SqlResultSet[]
  run(sql: string, params?: SqlParams): void
  export(): Uint8Array
  close(): void
}

interface SqlModule {
  Database: new (data?: Uint8Array) => SqlDatabase
}

export interface InitDatabaseOptions {
  data?: Uint8Array | ArrayBuffer | null
  schemaSql?: string
  withLegacyMigration?: boolean
}

let sqlModulePromise: Promise<SqlModule> | null = null

async function loadSqlModule(): Promise<SqlModule> {
  if (!sqlModulePromise) {
    sqlModulePromise = initSqlJs({
      locateFile: () => sqlWasmUrl,
    }) as Promise<SqlModule>
  }

  return sqlModulePromise
}

function normalizeBuffer(data?: Uint8Array | ArrayBuffer | null): Uint8Array | undefined {
  if (!data) {
    return undefined
  }

  if (data instanceof Uint8Array) {
    return data
  }

  return new Uint8Array(data)
}

export function useDatabase() {
  const db = shallowRef<SqlDatabase | null>(null)
  const isReady = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  function ensureDatabase(): SqlDatabase {
    if (!db.value) {
      throw new Error('Database is not initialized. Call initDatabase() first.')
    }

    return db.value
  }

  async function initDatabase(options: InitDatabaseOptions = {}): Promise<SqlDatabase> {
    const {
      data = null,
      schemaSql = defaultSchemaSql,
      withLegacyMigration = true,
    } = options

    isLoading.value = true
    error.value = null

    try {
      const SQL = await loadSqlModule()
      const initialData = normalizeBuffer(data)
      const database = initialData ? new SQL.Database(initialData) : new SQL.Database()

      database.run('PRAGMA foreign_keys = ON;')

      if (!initialData) {
        database.exec(schemaSql)

        if (withLegacyMigration) {
          migrateLegacyEmotionSceneData(database)
        }
      }

      if (db.value) {
        db.value.close()
      }

      db.value = database
      isReady.value = true

      return database
    } catch (err) {
      isReady.value = false
      error.value = err instanceof Error ? err.message : 'Failed to initialize database'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function execute(sql: string, params?: SqlParams): SqlResultSet[] {
    const database = ensureDatabase()
    return params ? database.exec(sql, params) : database.exec(sql)
  }

  function run(sql: string, params?: SqlParams): void {
    const database = ensureDatabase()

    if (params) {
      database.run(sql, params)
      return
    }

    database.run(sql)
  }

  function migrateLegacyData(): LegacyMigrationResult {
    return migrateLegacyEmotionSceneData(ensureDatabase())
  }

  function exportDatabase(): Uint8Array {
    return ensureDatabase().export()
  }

  function closeDatabase(): void {
    if (!db.value) {
      return
    }

    db.value.close()
    db.value = null
    isReady.value = false
  }

  return {
    db,
    isReady,
    isLoading,
    error,
    initDatabase,
    execute,
    run,
    migrateLegacyData,
    exportDatabase,
    closeDatabase,
  }
}
