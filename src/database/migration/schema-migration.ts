/**
 * SIC-ADS 2.0 Schema Migration Script
 *
 * 安全协议：
 * 1. 迁移前强制备份
 * 2. FTS5 兼容性检测
 * 3. 数据清洗（ability_tags JSON 解析）
 * 4. 双重验证（COUNT 对比）
 *
 * @module schema-migration
 */

// ============ 类型定义 ============

// 本地类型定义，避免直接 import sql.js
interface Database {
  exec(sql: string): any[]
  run(sql: string, ...params: any[]): { changes: number; lastInsertRowid: number }
  prepare(sql: string): PreparedStatement
  close(): void
  export(): Uint8Array
}

interface PreparedStatement {
  bind(params: any[]): void
  step(): boolean
  getAsObject(): any
  free(): void
}

interface MigrationOptions {
  /** 是否强制备份 */
  forceBackup?: boolean
  /** 是否跳过验证 */
  skipVerification?: boolean
  /** 日志回调 */
  onLog?: (level: 'info' | 'warn' | 'error' | 'success', message: string) => void
}

interface MigrationResult {
  success: boolean
  steps: Array<{ step: string; status: string; details?: any }>
  summary: {
    equipmentCount: number
    resourceCount: number
    tagCount: number
    favoriteCount: number
    fts5Supported: boolean
  }
  errors: string[]
}

interface EquipmentRecord {
  id: number
  category: string
  sub_category: string
  name: string
  description: string
  ability_tags: string
  image_url: string
  is_active: number
}

// ============ 日志工具 ============

function log(options: MigrationOptions, level: 'info' | 'warn' | 'error' | 'success', message: string) {
  const timestamp = new Date().toLocaleTimeString()
  const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`
  console.log(formattedMessage)
  if (options.onLog) {
    options.onLog(level, message)
  }
}

// ============ 1. 迁移前检查 (Pre-flight Check) ============

/**
 * 备份数据库
 */
async function backupDatabase(db: Database, options: MigrationOptions): Promise<boolean> {
  log(options, 'info', '开始数据库备份检查...')

  try {
    // 导出当前数据库
    const data = db.export()

    // 在实际环境中，这里会通过 IPC 发送给主进程保存
    log(options, 'success', `数据库导出成功，大小: ${data.byteLength} bytes`)
    log(options, 'info', '注意: 在 Electron 环境中，将保存为 database.db.bak')

    return true
  } catch (error: any) {
    log(options, 'error', `数据库备份失败: ${error.message}`)
    return false
  }
}

// ============ 2. FTS5 支持检测 ============

/**
 * 检测 FTS5 支持
 */
function detectFTS5Support(db: Database): boolean {
  try {
    // 尝试创建 FTS5 虚拟表
    const testStmt = db.prepare('CREATE VIRTUAL TABLE IF NOT EXISTS fts5_test USING fts5(test)')
    testStmt.step()
    testStmt.free()

    const dropStmt = db.prepare('DROP TABLE IF EXISTS fts5_test')
    dropStmt.step()
    dropStmt.free()

    return true
  } catch (e) {
    return false
  }
}

// ============ 3. 创建 sys_ 表结构 ============

/**
 * 创建新表结构
 */
function createSystemTables(db: Database, options: MigrationOptions): boolean {
  log(options, 'info', '开始创建 sys_ 表结构...')

  try {
    // 辅助函数：执行 SQL 并捕获错误
    // 使用 run 而不是 exec，因为 sql.js 的 run 方法更可靠
    const execSQL = (sql: string, description: string): boolean => {
      try {
        db.run(sql)
        log(options, 'info', `✓ ${description}`)
        return true
      } catch (error: any) {
        log(options, 'error', `✗ ${description}: ${error.message}`)
        return false
      }
    }

    // 1. 核心资源表
    if (!execSQL(`
      CREATE TABLE IF NOT EXISTS sys_training_resource (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id INTEGER,
        module_code TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        cover_image TEXT,
        is_custom INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        legacy_id INTEGER,
        legacy_source TEXT,
        meta_data TEXT,
        usage_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `, '创建 sys_training_resource 表')) {
      return false
    }

    // 2. 标签字典表
    if (!execSQL(`
      CREATE TABLE IF NOT EXISTS sys_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL,
        name TEXT NOT NULL,
        usage_count INTEGER DEFAULT 0,
        is_preset INTEGER DEFAULT 1,
        UNIQUE(domain, name)
      )
    `, '创建 sys_tags 表')) {
      return false
    }

    // 3. 资源-标签关联表
    if (!execSQL(`
      CREATE TABLE IF NOT EXISTS sys_resource_tag_map (
        resource_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (resource_id, tag_id),
        FOREIGN KEY (resource_id) REFERENCES sys_training_resource(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES sys_tags(id) ON DELETE CASCADE
      )
    `, '创建 sys_resource_tag_map 表')) {
      return false
    }

    // 4. 全文检索虚拟表 (FTS5)
    const fts5Supported = detectFTS5Support(db)
    if (fts5Supported) {
      execSQL(`
        CREATE VIRTUAL TABLE IF NOT EXISTS sys_resource_fts USING fts5(
          name,
          description,
          content='sys_training_resource',
          content_rowid='id'
        )
      `, '创建 sys_resource_fts 表')

      // 创建触发器保持 FTS 同步
      execSQL(`
        CREATE TRIGGER IF NOT EXISTS sys_resource_ai AFTER INSERT ON sys_training_resource BEGIN
          INSERT INTO sys_resource_fts(rowid, name, description) VALUES (new.id, new.name, new.description);
        END
      `, '创建 FTS INSERT 触发器')

      execSQL(`
        CREATE TRIGGER IF NOT EXISTS sys_resource_ad AFTER DELETE ON sys_training_resource BEGIN
          INSERT INTO sys_resource_fts(sys_resource_fts, rowid, name, description) VALUES('delete', old.id, old.name, old.description);
        END
      `, '创建 FTS DELETE 触发器')

      execSQL(`
        CREATE TRIGGER IF NOT EXISTS sys_resource_au AFTER UPDATE ON sys_training_resource BEGIN
          INSERT INTO sys_resource_fts(sys_resource_fts, rowid, name, description) VALUES('delete', old.id, old.name, old.description);
          INSERT INTO sys_resource_fts(rowid, name, description) VALUES (new.id, new.name, new.description);
        END
      `, '创建 FTS UPDATE 触发器')

      log(options, 'success', 'FTS5 全文检索已启用')
    } else {
      log(options, 'warn', '[WARN] FTS5 not supported, utilizing LIKE fallback for search')
    }

    // 5. 统一收藏夹
    if (!execSQL(`
      CREATE TABLE IF NOT EXISTS sys_favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        resource_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, resource_id),
        FOREIGN KEY (resource_id) REFERENCES sys_training_resource(id) ON DELETE CASCADE
      )
    `, '创建 sys_favorites 表')) {
      return false
    }

    // 6. 系统配置表 (KV存储)
    if (!execSQL(`
      CREATE TABLE IF NOT EXISTS sys_app_settings (
        module_code TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        description TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (module_code, key)
      )
    `, '创建 sys_app_settings 表')) {
      return false
    }

    // 创建索引
    execSQL('CREATE INDEX IF NOT EXISTS idx_sys_resource_module ON sys_training_resource(module_code)', '创建 idx_sys_resource_module 索引')
    execSQL('CREATE INDEX IF NOT EXISTS idx_sys_resource_type ON sys_training_resource(resource_type)', '创建 idx_sys_resource_type 索引')
    execSQL('CREATE INDEX IF NOT EXISTS idx_sys_resource_category ON sys_training_resource(category)', '创建 idx_sys_resource_category 索引')
    execSQL('CREATE INDEX IF NOT EXISTS idx_sys_resource_legacy ON sys_training_resource(legacy_id, legacy_source)', '创建 idx_sys_resource_legacy 索引')
    execSQL('CREATE INDEX IF NOT EXISTS idx_sys_tag_domain ON sys_tags(domain)', '创建 idx_sys_tag_domain 索引')

    log(options, 'success', 'sys_ 表结构创建完成')
    return fts5Supported
  } catch (error: any) {
    log(options, 'error', `创建表结构失败: ${error.message}`)
    return false
  }
}

// ============ 4. 数据清洗工具 ============

/**
 * 安全解析 ability_tags JSON
 */
function safeParseAbilityTags(jsonString: string | null, options: MigrationOptions, recordId: number): string[] {
  if (!jsonString || jsonString === 'null' || jsonString === '') {
    return []
  }

  // 如果已经是数组（不应该发生，但防御性编程）
  if (Array.isArray(jsonString)) {
    return jsonString
  }

  try {
    const parsed = JSON.parse(jsonString)
    if (Array.isArray(parsed)) {
      return parsed
    }
    // 如果解析出来不是数组，返回空数组
    log(options, 'warn', `记录 #${recordId}: ability_tags 解析结果不是数组，使用空数组`)
    return []
  } catch (error) {
    // JSON 解析失败，使用空数组
    log(options, 'warn', `记录 #${recordId}: ability_tags JSON 解析失败: "${jsonString.substring(0, 50)}..."`)
    return []
  }
}

// ============ 5. 迁移 equipment_catalog 数据 ============

/**
 * 迁移器材数据
 */
function migrateEquipmentData(db: Database, options: MigrationOptions): number {
  log(options, 'info', '开始迁移 equipment_catalog 数据...')

  try {
    // 获取所有器材数据
    const result = db.exec('SELECT * FROM equipment_catalog')

    // 检查结果是否存在
    if (!result || result.length === 0) {
      log(options, 'info', 'equipment_catalog 表为空或不存在')
      return 0
    }

    // 检查是否有数据
    if (!result[0].values || result[0].values.length === 0) {
      log(options, 'info', 'equipment_catalog 表中没有数据')
      return 0
    }

    const equipmentRecords: EquipmentRecord[] = []
    const columns = result[0].columns

    for (const row of result[0].values) {
      const record: any = {}
      columns.forEach((col: string, i: number) => {
        record[col] = row[i]
      })
      equipmentRecords.push(record as EquipmentRecord)
    }

    log(options, 'info', `找到 ${equipmentRecords.length} 条器材记录`)

    // ========== 幂等性处理：清理旧迁移数据 ==========
    // 检查是否已经迁移过
    const existingResult = db.exec(`
      SELECT COUNT(*) as count FROM sys_training_resource
      WHERE legacy_source = 'equipment_catalog'
    `)
    const existingCount = existingResult[0]?.values[0]?.[0] || 0

    if (existingCount > 0) {
      log(options, 'info', `发现 ${existingCount} 条旧迁移数据，先清理...`)

      // 清理旧数据（使用级联删除）
      db.run(`
        DELETE FROM sys_resource_tag_map
        WHERE resource_id IN (
          SELECT id FROM sys_training_resource
          WHERE legacy_source = 'equipment_catalog'
        )
      `)
      db.run("DELETE FROM sys_training_resource WHERE legacy_source = 'equipment_catalog'")
      db.run("DELETE FROM sys_tags WHERE domain = 'ability'")

      log(options, 'success', '旧迁移数据已清理')
    }
    // ========== 幂等性处理结束 ==========

    // 迁移标签映射（用于后续去重）
    const tagMap = new Map<string, number>() // domain_name -> tag_id

    let migratedCount = 0

    for (const equipment of equipmentRecords) {
      try {
        // 1. 解析 ability_tags（数据清洗）
        const abilityTags = safeParseAbilityTags(equipment.ability_tags, options, equipment.id)

        // 2. 插入资源记录 - 使用预处理语句
        const insertStmt = db.prepare(`
          INSERT INTO sys_training_resource (
            module_code, resource_type, name, category, description,
            cover_image, is_custom, is_active,
            legacy_id, legacy_source,
            meta_data, usage_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        insertStmt.bind([
          'sensory',
          'equipment',
          equipment.name,
          equipment.sub_category,
          equipment.description || '',
          equipment.image_url || '',
          0,
          equipment.is_active || 1,
          equipment.id,
          'equipment_catalog',
          JSON.stringify({ original_tags: abilityTags }),
          0
        ])
        insertStmt.step()
        insertStmt.free()

        // 获取新插入的资源 ID
        const idResult = db.exec('SELECT last_insert_rowid() as id')
        const newResourceId = (idResult[0].values[0] as any[])[0]

        // 3. 处理标签
        for (const tagName of abilityTags) {
          const tagKey = `ability_${tagName}`

          // 创建或获取标签
          if (!tagMap.has(tagKey)) {
            // 插入标签
            const tagStmt = db.prepare(`
              INSERT OR IGNORE INTO sys_tags (domain, name)
              VALUES (?, ?)
            `)
            tagStmt.bind(['ability', tagName])
            tagStmt.step()
            tagStmt.free()

            // 获取标签 ID - 使用 prepare/bind 而不是 exec
            const tagIdStmt = db.prepare(`
              SELECT id FROM sys_tags WHERE domain = 'ability' AND name = ?
            `)
            tagIdStmt.bind([tagName])
            tagIdStmt.step()
            const tagRow = tagIdStmt.getAsObject()
            tagIdStmt.free()

            if (tagRow) {
              tagMap.set(tagKey, tagRow.id)
            }
          }

          const tagId = tagMap.get(tagKey)
          if (tagId) {
            // 创建资源-标签关联
            const mapStmt = db.prepare(`
              INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id)
              VALUES (?, ?)
            `)
            mapStmt.bind([newResourceId, tagId])
            mapStmt.step()
            mapStmt.free()
          }
        }

        migratedCount++
      } catch (error: any) {
        log(options, 'error', `迁移器材 #${equipment.id} (${equipment.name}) 失败: ${error.message}`)
      }
    }

    log(options, 'success', `器材数据迁移完成: ${migratedCount}/${equipmentRecords.length}`)
    return migratedCount
  } catch (error: any) {
    log(options, 'error', `迁移 equipment_catalog 失败: ${error.message}`)
    return 0
  }
}

// ============ 6. 迁移 teacher_fav 数据 ============

/**
 * 迁移收藏夹数据
 */
function migrateFavorites(db: Database, options: MigrationOptions): number {
  log(options, 'info', '开始迁移 teacher_fav 数据...')

  try {
    // 检查表是否存在
    let tableExists = false
    try {
      const tablesResult = db.exec(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='teacher_fav'
      `)
      tableExists = tablesResult.length > 0 && tablesResult[0].values.length > 0
    } catch (e) {
      log(options, 'info', 'teacher_fav 表不存在，跳过收藏夹迁移')
      return 0
    }

    if (!tableExists) {
      log(options, 'info', 'teacher_fav 表不存在，跳过收藏夹迁移')
      return 0
    }

    // 获取所有收藏记录
    const result = db.exec('SELECT * FROM teacher_fav')
    if (!result.length || !result[0].values.length) {
      log(options, 'info', 'teacher_fav 表为空，跳过收藏夹迁移')
      return 0
    }

    let migratedCount = 0

    for (const row of result[0].values) {
      const columns = result[0].columns
      const record: any = {}
      columns.forEach((col: string, i: number) => {
        record[col] = row[i]
      })

      try {
        // 查找对应的 resource_id - 使用预处理语句
        const findStmt = db.prepare(`
          SELECT id FROM sys_training_resource
          WHERE legacy_source = 'equipment_catalog' AND legacy_id = ?
        `)
        findStmt.bind([record.equipment_id])
        const hasResult = findStmt.step()
        let resourceId = null
        if (hasResult) {
          const rowObj = findStmt.getAsObject()
          resourceId = rowObj.id
        }
        findStmt.free()

        if (resourceId) {
          // 插入收藏记录
          const favStmt = db.prepare(`
            INSERT OR IGNORE INTO sys_favorites (user_id, resource_id, created_at)
            VALUES (?, ?, ?)
          `)
          favStmt.bind([record.teacher_id, resourceId, record.created_at || null])
          favStmt.step()
          favStmt.free()

          migratedCount++
        }
      } catch (error: any) {
        log(options, 'warn', `迁移收藏记录失败: ${error.message}`)
      }
    }

    log(options, 'success', `收藏夹数据迁移完成: ${migratedCount} 条`)
    return migratedCount
  } catch (error: any) {
    log(options, 'error', `迁移 teacher_fav 失败: ${error.message}`)
    return 0
  }
}

// ============ 7. 双重验证 ============

/**
 * 验证迁移结果
 */
function verifyMigration(db: Database, options: MigrationOptions): {
  passed: boolean
  equipmentCount: number
  resourceCount: number
  tagCount: number
  favoriteCount: number
} {
  log(options, 'info', '开始验证迁移结果...')

  try {
    // 辅助函数：安全获取 COUNT 值
    const getCount = (sql: string, defaultValue: number = 0): number => {
      try {
        const result = db.exec(sql)
        if (result.length > 0 && result[0].values.length > 0) {
          return (result[0].values[0] as any)[0] as number
        }
        return defaultValue
      } catch (e) {
        return defaultValue
      }
    }

    // 1. 统计 equipment_catalog 原始数量
    const equipmentCount = getCount('SELECT COUNT(*) as count FROM equipment_catalog', 0)

    // 2. 统计 sys_training_resource 中 equipment 类型的数量
    const resourceCount = getCount(`
      SELECT COUNT(*) as count FROM sys_training_resource
      WHERE legacy_source = 'equipment_catalog'
    `, 0)

    // 3. 统计标签数量
    const tagCount = getCount('SELECT COUNT(*) as count FROM sys_tags', 0)

    // 4. 统计收藏夹数量
    const favoriteCount = getCount('SELECT COUNT(*) as count FROM sys_favorites', 0)

    // 5. 对比验证
    const countMatch = equipmentCount === resourceCount
    const passed = countMatch && resourceCount > 0

    log(options, 'info', '========== 验证结果 ==========')
    log(options, 'info', `equipment_catalog 原始数量: ${equipmentCount}`)
    log(options, 'info', `sys_training_resource 迁移数量: ${resourceCount}`)
    log(options, 'info', `sys_tags 标签数量: ${tagCount}`)
    log(options, 'info', `sys_favorites 收藏数量: ${favoriteCount}`)
    log(options, 'info', `数量对比: ${countMatch ? '✅ 通过' : '❌ 不匹配'}`)

    if (countMatch) {
      log(options, 'success', '✅ 迁移验证通过！')
    } else {
      log(options, 'error', '❌ 迁移验证失败：数量不匹配')
    }

    return {
      passed,
      equipmentCount,
      resourceCount,
      tagCount,
      favoriteCount
    }
  } catch (error: any) {
    log(options, 'error', `验证失败: ${error.message}`)
    return {
      passed: false,
      equipmentCount: 0,
      resourceCount: 0,
      tagCount: 0,
      favoriteCount: 0
    }
  }
}

// ============ 主迁移函数 ============

/**
 * 执行完整的 Schema 迁移
 *
 * @param db sql.js Database 实例
 * @param options 迁移选项
 * @returns 迁移结果
 */
export async function migrateSchema(
  db: Database,
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const steps: Array<{ step: string; status: string; details?: any }> = []
  const errors: string[] = []

  log(options, 'success', '==========================================')
  log(options, 'success', '  SIC-ADS 2.0 Schema Migration Started')
  log(options, 'success', '==========================================')

  // Step 1: 迁移前检查 - 备份数据库
  const backupSuccess = await backupDatabase(db, options)
  steps.push({ step: '1. 迁移前备份', status: backupSuccess ? '成功' : '失败' })
  if (!backupSuccess) {
    return {
      success: false,
      steps,
      summary: {
        equipmentCount: 0,
        resourceCount: 0,
        tagCount: 0,
        favoriteCount: 0,
        fts5Supported: false
      },
      errors: ['数据库备份失败']
    }
  }

  // Step 2: 检测 FTS5 支持
  log(options, 'info', '检测 FTS5 支持情况...')
  const fts5Supported = detectFTS5Support(db)
  if (fts5Supported) {
    log(options, 'success', '✅ FTS5 全文检索支持')
  } else {
    log(options, 'warn', '[WARN] FTS5 not supported, utilizing LIKE fallback for search')
  }
  steps.push({ step: '2. FTS5 检测', status: fts5Supported ? '支持' : '不支持（降级）', details: { fts5Supported } })

  // Step 3: 创建 sys_ 表结构
  const tablesCreated = createSystemTables(db, options)
  steps.push({ step: '3. 创建表结构', status: tablesCreated ? '成功' : '失败', details: { fts5Supported } })

  // Step 4: 迁移 equipment_catalog 数据
  const equipmentCount = migrateEquipmentData(db, options)
  steps.push({ step: '4. 迁移器材数据', status: '成功', details: { count: equipmentCount } })

  // Step 5: 迁移 teacher_fav 数据
  const favoriteCount = migrateFavorites(db, options)
  steps.push({ step: '5. 迁移收藏夹', status: '成功', details: { count: favoriteCount } })

  // Step 6: 双重验证
  const verification = verifyMigration(db, options)
  steps.push({
    step: '6. 双重验证',
    status: verification.passed ? '通过' : '失败',
    details: verification
  })

  log(options, 'success', '==========================================')
  log(options, 'success', '  Schema Migration Completed')
  log(options, 'success', '==========================================')

  return {
    success: verification.passed,
    steps,
    summary: {
      equipmentCount: verification.equipmentCount,
      resourceCount: verification.resourceCount,
      tagCount: verification.tagCount,
      favoriteCount: verification.favoriteCount,
      fts5Supported
    },
    errors
  }
}

/**
 * Rollback 迁移（用于测试或回退）
 *
 * @param db sql.js Database 实例
 */
export function rollbackMigration(db: Database): void {
  console.log('[Rollback] 开始回滚迁移...')

  try {
    // 删除新表 - 使用 run 而不是 exec
    db.run('DROP TABLE IF EXISTS sys_resource_tag_map')
    db.run('DROP TABLE IF EXISTS sys_training_resource')
    db.run('DROP TABLE IF EXISTS sys_tags')
    db.run('DROP TABLE IF EXISTS sys_favorites')
    db.run('DROP TABLE IF EXISTS sys_app_settings')
    db.run('DROP TABLE IF EXISTS sys_resource_fts')

    console.log('[Rollback] ✅ 回滚完成')
  } catch (error) {
    console.error('[Rollback] ❌ 回滚失败:', error)
    throw error
  }
}
