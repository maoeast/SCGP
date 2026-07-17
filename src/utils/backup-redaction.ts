const PROVIDER_SECRET_TABLE = 'ai_provider'
const PROVIDER_SECRET_COLUMN = 'api_key_enc'

export function redactBackupTableRows(tableName: string, rows: any[]): any[] {
  if (tableName !== PROVIDER_SECRET_TABLE) {
    return rows
  }

  return rows.map((row) => {
    if (!row || typeof row !== 'object' || !(PROVIDER_SECRET_COLUMN in row)) {
      return row
    }
    return {
      ...row,
      [PROVIDER_SECRET_COLUMN]: '',
    }
  })
}
