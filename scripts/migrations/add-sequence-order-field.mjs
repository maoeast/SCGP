#!/usr/bin/env node
/**
 * Migration: Add sequence_order field to teaching_material table
 *
 * Purpose: Fix sorting issue where videos display as "9, 8, 7, 6, 5, 50, 49, 48..."
 * Root cause: Current ORDER BY updated_at DESC treats sequence as timestamps, not numbers
 *
 * This migration:
 * 1. Adds sequence_order INTEGER NULL column if not exists
 * 2. Backfills existing data by extracting leading digits from title
 * 3. Creates index for efficient sorting
 *
 * Usage: node scripts/migrations/add-sequence-order-field.mjs [path/to/database.db]
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')

async function migrateSequenceOrder(dbPath) {
  console.log('📂 数据库路径:', dbPath)
  console.log('🔄 开始迁移...\n')

  const SQL = await initSqlJs()
  const buffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(buffer)

  try {
    // Step 1: 检查列是否已存在
    const columns = db.exec('PRAGMA table_info(teaching_material)')
    const hasSequenceOrder = columns?.[0]?.values?.some(col => col[1] === 'sequence_order') || false

    if (hasSequenceOrder) {
      console.log('✅ sequence_order 列已存在，跳过 ALTER TABLE')
    } else {
      console.log('➕ 增加 sequence_order 列...')
      db.run('ALTER TABLE teaching_material ADD COLUMN sequence_order INTEGER NULL')
      console.log('✅ 列添加完成')
    }

    // Step 2: 回填数据（只回填 NULL 记录，幂等）
    const result = db.exec('SELECT id, title FROM teaching_material WHERE sequence_order IS NULL')
    const materials = result?.[0]?.values || []

    if (materials.length === 0) {
      console.log('✅ 所有记录的 sequence_order 已填充，无需回填')
    } else {
      console.log(`\n📝 回填 ${materials.length} 条记录的 sequence_order...`)

      const stmt = db.prepare('UPDATE teaching_material SET sequence_order = ? WHERE id = ?')
      let backfilled = 0

      for (const [id, title] of materials) {
        if (typeof title !== 'string') continue
        const match = title.match(/^(\d+)/)
        if (match?.[1]) {
          const sequenceNum = parseInt(match[1], 10)
          stmt.run([sequenceNum, id])
          backfilled++
        }
      }

      stmt.free()
      console.log(`✅ 已回填 ${backfilled} 条记录`)
      console.log(`ℹ️  ${materials.length - backfilled} 条记录无前导数字，sequence_order 保持 NULL`)
    }

    // Step 3: 创建索引
    const indexes = db.exec("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_teaching_material_sequence'")
    if (indexes.length === 0) {
      console.log('\n📊 创建 sequence_order 索引...')
      db.run('CREATE INDEX idx_teaching_material_sequence ON teaching_material(sequence_order)')
      console.log('✅ 索引创建完成')
    } else {
      console.log('\n✅ sequence_order 索引已存在')
    }

    // Step 4: 验证结果
    const stats = db.exec(`
      SELECT
        COUNT(*) as total,
        COUNT(sequence_order) as with_sequence,
        MIN(sequence_order) as min_seq,
        MAX(sequence_order) as max_seq
      FROM teaching_material
    `)

    if (stats?.[0]?.values?.[0]) {
      const [total, withSeq, minSeq, maxSeq] = stats[0].values[0]
      console.log('\n📊 迁移统计:')
      console.log(`   总记录数: ${total}`)
      console.log(`   有序号记录: ${withSeq}`)
      console.log(`   序号范围: ${minSeq} ~ ${maxSeq}`)
      console.log(`   无序号记录: ${total - withSeq}`)
    }

    // Step 5: 验证样本（生活自理前10条）
    console.log('\n🔍 验证样本（生活自理视频，按 sequence_order 降序）:')
    const sample = db.exec(`
      SELECT sequence_order, title
      FROM teaching_material
      WHERE dimension_code = 'life-skills' AND sequence_order IS NOT NULL
      ORDER BY sequence_order DESC
      LIMIT 10
    `)

    if (sample?.[0]?.values) {
      sample[0].values.forEach(([seq, title]) => {
        console.log(`   ${String(seq).padStart(3)} - ${title.substring(0, 60)}`)
      })
    }

    // Step 6: 保存数据库
    console.log('\n💾 保存数据库...')
    const data = db.export()
    fs.writeFileSync(dbPath, data)
    console.log('✅ 数据库已保存')

    db.close()
    console.log('\n🎉 迁移完成！')
    console.log('\n下一步：重启应用测试教学资料排序效果')

  } catch (error) {
    console.error('\n❌ 迁移失败:', error)
    db.close()
    throw error
  }
}

// Main execution
const dbPath = process.argv[2] || path.join(projectRoot, 'user-data', 'database.db')

if (!fs.existsSync(dbPath)) {
  console.error(`❌ 数据库文件不存在: ${dbPath}`)
  console.error('使用方法: node scripts/migrations/add-sequence-order-field.mjs [数据库路径]')
  process.exit(1)
}

migrateSequenceOrder(dbPath)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('迁移失败:', err)
    process.exit(1)
  })

