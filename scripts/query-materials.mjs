import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = 'C:/Users/maoea/AppData/Roaming/scgp/database.sqlite'

const db = new Database(dbPath, { readonly: true })
const rows = db.prepare(`
  SELECT id, title, file_name, dimension_code, sequence_order
  FROM teaching_material
  ORDER BY dimension_code, sequence_order DESC NULLS LAST
`).all()

console.log(`查询到 ${rows.length} 条记录`)

// 写入导出文件
const exportPath = path.join(__dirname, 'teaching-materials-export.json')
fs.writeFileSync(exportPath, JSON.stringify(rows, null, 2), 'utf-8')
console.log(`已导出到: ${exportPath}`)

db.close()
