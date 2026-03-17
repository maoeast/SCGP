export interface SqlViewDefinition {
  name: string
  sql: string
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`
}

export function captureDependentViews(db: any, tableNames: string[]): SqlViewDefinition[] {
  try {
    const result = db.exec(`
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'view' AND sql IS NOT NULL
    `)

    const rows = result?.[0]?.values || []
    if (!rows.length) {
      return []
    }

    const patterns = tableNames.map((tableName) => new RegExp(`\\b${tableName}\\b`, 'i'))

    return rows
      .map((row: any[]) => ({
        name: String(row[0] || ''),
        sql: String(row[1] || ''),
      }))
      .filter((view) => view.name && view.sql && patterns.some((pattern) => pattern.test(view.sql)))
  } catch {
    return []
  }
}

export function dropViews(db: any, views: SqlViewDefinition[]): void {
  for (const view of views) {
    db.run(`DROP VIEW IF EXISTS ${quoteIdentifier(view.name)}`)
  }
}

export function restoreViews(db: any, views: SqlViewDefinition[]): void {
  for (const view of views) {
    db.run(view.sql)
  }
}
