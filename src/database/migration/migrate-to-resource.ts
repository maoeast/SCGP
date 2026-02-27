/**
 * Phase 1.3: Schema 迁移 - Equipment to Resource
 *
 * 功能：
 * 1. 创建 sys_* 核心表
 * 2. 迁移 equipment_catalog -> sys_training_resource
 * 3. 提取 ability_tags -> sys_tags + sys_resource_tag_map
 * 4. 迁移 teacher_fav -> sys_favorites
 * 5. 检测并创建 FTS5 全文检索（如果支持）
 *
 * @module migrate-to-resource
 */

// 内联 SQL 定义（直接嵌入，避免文件导入问题）
const sysTablesSQL = `
-- 1. 核心资源表
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
);

-- 资源表索引
CREATE INDEX IF NOT EXISTS idx_sys_resource_module ON sys_training_resource(module_code);
CREATE INDEX IF NOT EXISTS idx_sys_resource_type ON sys_training_resource(resource_type);
CREATE INDEX IF NOT EXISTS idx_sys_resource_category ON sys_training_resource(category);
CREATE INDEX IF NOT EXISTS idx_sys_resource_legacy ON sys_training_resource(legacy_id, legacy_source);

-- 2. 标签字典表
CREATE TABLE IF NOT EXISTS sys_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  is_preset INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(domain, name)
);

-- 标签表索引
CREATE INDEX IF NOT EXISTS idx_sys_tags_domain ON sys_tags(domain);

-- 3. 资源-标签关联表
CREATE TABLE IF NOT EXISTS sys_resource_tag_map (
  resource_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (resource_id, tag_id),
  FOREIGN KEY (resource_id) REFERENCES sys_training_resource(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES sys_tags(id) ON DELETE CASCADE
);

-- 4. 统一收藏夹
CREATE TABLE IF NOT EXISTS sys_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  resource_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, resource_id),
  FOREIGN KEY (resource_id) REFERENCES sys_training_resource(id) ON DELETE CASCADE
);

-- 收藏夹索引
CREATE INDEX IF NOT EXISTS idx_sys_favorites_user ON sys_favorites(user_id);

-- 5. 系统配置表
CREATE TABLE IF NOT EXISTS sys_app_settings (
  module_code TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  description TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (module_code, key)
);
`

// 迁移结果接口
export interface MigrationResult {
  success: boolean
  message: string
  stats: {
    resourcesCreated: number
    tagsCreated: number
    tagMappingsCreated: number
    favoritesCreated: number
    fts5Enabled: boolean
  }
}

/**
 * 检测数据库是否支持 FTS5
 */
function detectFTS5Support(db: any): boolean {
  try {
    const result = db.exec("SELECT fts5()")
    return result && result.length > 0
  } catch (e) {
    console.warn('[Migration] FTS5 不可用，将使用 LIKE 查询')
    return false
  }
}

/**
 * 安全解析 JSON 字符串
 */
function safeParseJSON(jsonStr: string | null, defaultValue: any = []): any {
  if (!jsonStr) return defaultValue

  try {
    // 如果是数组，直接返回
    if (Array.isArray(jsonStr)) return jsonStr

    // 尝试解析 JSON 字符串
    const parsed = JSON.parse(jsonStr)
    return parsed
  } catch (e) {
    console.warn('[Migration] JSON 解析失败:', jsonStr, e)
    return defaultValue
  }
}

/**
 * 确保 ability_tags 是数组格式
 * 处理两种情况：
 * 1. JSON 字符串: '["手眼协调", "注意力"]'
 * 2. 已解析的数组: ["手眼协调", "注意力"]
 */
function ensureArray(tags: any): string[] {
  if (Array.isArray(tags)) {
    return tags
  }
  return safeParseJSON(tags, [])
}

/**
 * 执行 SQL 字符串
 * 使用 sql.js 的 exec() 方法执行多条 SQL 语句
 */
function executeSQLString(db: any, sql: string): void {
  console.log('[Migration] 📄 SQL 内容长度:', sql.length, '字符')

  try {
    // 使用 exec() 方法执行多条 SQL 语句
    // sql.js 的 exec() 可以正确处理多条语句和注释
    db.exec(sql)
    console.log('[Migration] ✅ SQL 语句执行成功')
  } catch (e) {
    console.error('[Migration] ❌ SQL 执行失败:', e)
    throw e
  }
}

/**
 * 创建 FTS5 相关表和触发器（如果支持）
 */
function createFTS5Tables(db: any): boolean {
  if (!detectFTS5Support(db)) {
    console.log('[Migration] ⚠️  FTS5 不可用，跳过全文检索表创建')
    return false
  }

  try {
    // 创建 FTS5 虚拟表
    db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS sys_resource_fts USING fts5(
        name,
        description,
        content='sys_training_resource',
        content_rowid='id'
      )
    `)
    console.log('[Migration] ✅ 创建 FTS5 表: sys_resource_fts')

    // 创建触发器：INSERT
    db.run(`
      CREATE TRIGGER IF NOT EXISTS sys_resource_ai AFTER INSERT ON sys_training_resource BEGIN
        INSERT INTO sys_resource_fts(rowid, name, description) VALUES (new.id, new.name, new.description);
      END
    `)

    // 创建触发器：DELETE
    db.run(`
      CREATE TRIGGER IF NOT EXISTS sys_resource_ad AFTER DELETE ON sys_training_resource BEGIN
        INSERT INTO sys_resource_fts(sys_resource_fts, rowid, name, description) VALUES('delete', old.id, old.name, old.description);
      END
    `)

    // 创建触发器：UPDATE
    db.run(`
      CREATE TRIGGER IF NOT EXISTS sys_resource_au AFTER UPDATE ON sys_training_resource BEGIN
        INSERT INTO sys_resource_fts(sys_resource_fts, rowid, name, description) VALUES('delete', old.id, old.name, old.description);
        INSERT INTO sys_resource_fts(rowid, name, description) VALUES (new.id, new.name, new.description);
      END
    `)

    console.log('[Migration] ✅ 创建 FTS5 触发器')
    return true
  } catch (e) {
    console.warn('[Migration] FTS5 表创建失败:', e)
    return false
  }
}

/**
 * 主迁移函数
 */
export async function migrateEquipmentToResource(db: any): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    message: '',
    stats: {
      resourcesCreated: 0,
      tagsCreated: 0,
      tagMappingsCreated: 0,
      favoritesCreated: 0,
      fts5Enabled: false
    }
  }

  try {
    console.log('[Migration] 🚀 开始 Schema 迁移...')

    // ============================================
    // 步骤 1: 创建 sys_* 核心表
    // ============================================
    // 使用导入的 SQL 字符串（通过 Vite ?raw 导入）
    if (sysTablesSQL) {
      executeSQLString(db, sysTablesSQL)
    } else {
      console.error('[Migration] ❌ Schema SQL 未加载')
      result.message = 'Schema SQL 未加载'
      return result
    }

    // ============================================
    // 步骤 2: 检查是否已迁移
    // ============================================
    const existingCount = db.exec('SELECT COUNT(*) as count FROM sys_training_resource')[0]?.values[0]?.[0] || 0
    if (existingCount > 0) {
      console.log(`[Migration] ℹ️  sys_training_resource 已有 ${existingCount} 条记录，跳过迁移`)
      result.success = true
      result.message = '数据已存在，跳过迁移'
      result.stats.resourcesCreated = existingCount
      return result
    }

    // ============================================
    // 步骤 3: 检查 equipment_catalog 是否存在
    // ============================================
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='equipment_catalog'")
    if (!tables || tables.length === 0) {
      console.log('[Migration] ℹ️  equipment_catalog 表不存在，跳过数据迁移')
      result.success = true
      result.message = '源表不存在，跳过迁移'
      return result
    }

    // ============================================
    // 步骤 4: 迁移 equipment_catalog -> sys_training_resource
    // ============================================
    console.log('[Migration] 📦 开始迁移 equipment_catalog...')

    const equipmentData = db.exec('SELECT * FROM equipment_catalog')
    if (!equipmentData || equipmentData.length === 0) {
      console.log('[Migration] ℹ️  equipment_catalog 为空')
      result.success = true
      result.message = '源表为空'
      return result
    }

    // 获取列名
    const columns = equipmentData[0].columns

    // 遍历所有记录
    for (const row of equipmentData[0].values) {
      const record: any = {}
      columns.forEach((col: string, index: number) => {
        record[col] = row[index]
      })

      // 插入到 sys_training_resource
      db.run(`
        INSERT INTO sys_training_resource (
          parent_id, module_code, resource_type, name, category,
          description, is_custom, is_active, legacy_id, legacy_source,
          meta_data, usage_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        null,                          // parent_id
        'sensory',                     // module_code
        'equipment',                   // resource_type
        record.name,                   // name
        record.category,               // category
        record.description || '',      // description
        0,                             // is_custom
        1,                             // is_active
        record.id,                     // legacy_id
        'equipment_catalog',           // legacy_source
        JSON.stringify({               // meta_data
          original_data: record
        }),
        0                              // usage_count
      ])
    }

    result.stats.resourcesCreated = equipmentData[0].values.length
    console.log(`[Migration] ✅ 迁移了 ${result.stats.resourcesCreated} 条器材记录`)

    // ============================================
    // 步骤 5: 提取并迁移 ability_tags
    // ============================================
    console.log('[Migration] 🏷️  开始提取标签...')

    const tagMap = new Map<string, number>() // tag name -> tag id

    // 遍历所有 equipment 记录，提取标签
    for (const row of equipmentData[0].values) {
      const record: any = {}
      columns.forEach((col: string, index: number) => {
        record[col] = row[index]
      })

      // 安全解析 ability_tags
      const tags = ensureArray(record.ability_tags)
      const lastInsertResult = db.exec('SELECT last_insert_rowid() as id')
      const newResourceId = lastInsertResult && lastInsertResult[0] && lastInsertResult[0].values && lastInsertResult[0].values[0] && lastInsertResult[0].values[0][0]

      // 处理每个标签
      for (const tag of tags) {
        if (!tag || typeof tag !== 'string') continue

        // 创建或获取标签 ID
        let tagId = tagMap.get(tag)
        if (!tagId) {
          // 尝试从数据库获取
          const existingTag = db.exec('SELECT id FROM sys_tags WHERE domain = ? AND name = ?', ['ability', tag])
          if (existingTag && existingTag.length > 0 && existingTag[0].values && existingTag[0].values[0]) {
            tagId = existingTag[0].values[0][0]
          } else {
            // 创建新标签
            db.run('INSERT INTO sys_tags (domain, name, usage_count) VALUES (?, ?, ?)', ['ability', tag, 0])
            const newTagResult = db.exec('SELECT last_insert_rowid() as id')
            if (newTagResult && newTagResult[0] && newTagResult[0].values && newTagResult[0].values[0]) {
              tagId = newTagResult[0].values[0][0]
              result.stats.tagsCreated++
            }
          }
          if (tagId !== undefined) {
            tagMap.set(tag, tagId)
          }
        }

        // 创建资源-标签关联（仅当有有效的 tagId 和 newResourceId 时）
        if (tagId !== undefined && newResourceId !== undefined) {
          try {
            db.run('INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id) VALUES (?, ?)', [newResourceId, tagId])
            result.stats.tagMappingsCreated++
          } catch (e) {
            // 忽略重复键错误
          }
        }
      }
    }

    console.log(`[Migration] ✅ 创建了 ${result.stats.tagsCreated} 个标签，${result.stats.tagMappingsCreated} 个关联`)

    // ============================================
    // 步骤 6: 迁移 teacher_fav -> sys_favorites
    // ============================================
    console.log('[Migration] ⭐ 开始迁移收藏夹...')

    const favTables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='teacher_fav'")
    if (favTables && favTables.length > 0) {
      const favData = db.exec('SELECT * FROM teacher_fav')
      if (favData && favData.length > 0) {
        const favColumns = favData[0].columns

        for (const row of favData[0].values) {
          const fav: any = {}
          favColumns.forEach((col: string, index: number) => {
            fav[col] = row[index]
          })

          // 查找对应的 sys_training_resource
          const resource = db.exec('SELECT id FROM sys_training_resource WHERE legacy_id = ? AND legacy_source = ?', [fav.equipment_id, 'equipment_catalog'])
          if (resource && resource.length > 0) {
            const resourceId = resource[0].values[0][0]

            try {
              db.run('INSERT OR IGNORE INTO sys_favorites (user_id, resource_id) VALUES (?, ?)', [fav.teacher_id, resourceId])
              result.stats.favoritesCreated++
            } catch (e) {
              console.warn('[Migration] 收藏夹迁移失败:', fav, e)
            }
          }
        }

        console.log(`[Migration] ✅ 迁移了 ${result.stats.favoritesCreated} 条收藏记录`)
      } else {
        console.log('[Migration] ℹ️  teacher_fav 表为空')
      }
    } else {
      console.log('[Migration] ℹ️  teacher_fav 表不存在')
    }

    // ============================================
    // 步骤 7: 创建 FTS5 表和触发器（如果支持）
    // ============================================
    result.stats.fts5Enabled = createFTS5Tables(db)

    // ============================================
    // 完成
    // ============================================
    result.success = true
    result.message = '迁移完成'
    console.log('[Migration] ✅ Schema 迁移完成！')
    console.log(`[Migration] 📊 统计: 资源=${result.stats.resourcesCreated}, 标签=${result.stats.tagsCreated}, 关联=${result.stats.tagMappingsCreated}, 收藏=${result.stats.favoritesCreated}, FTS5=${result.stats.fts5Enabled}`)

    return result

  } catch (error) {
    console.error('[Migration] ❌ 迁移失败:', error)
    result.success = false
    result.message = `迁移失败: ${error}`
    return result
  }
}

/**
 * 回滚迁移（仅用于开发/测试）
 */
export function rollbackMigration(db: any): boolean {
  try {
    console.log('[Migration] 🔄 开始回滚...')

    // 删除新表
    db.run('DROP TABLE IF EXISTS sys_resource_tag_map')
    db.run('DROP TABLE IF EXISTS sys_favorites')
    db.run('DROP TABLE IF EXISTS sys_training_resource')
    db.run('DROP TABLE IF EXISTS sys_tags')
    db.run('DROP TABLE IF EXISTS sys_app_settings')
    db.run('DROP TABLE IF EXISTS sys_resource_fts')

    console.log('[Migration] ✅ 回滚完成')
    return true
  } catch (error) {
    console.error('[Migration] ❌ 回滚失败:', error)
    return false
  }
}
