-- ============================================
-- Phase 1.3: Schema 迁移 - 系统核心表定义
-- ============================================
-- 创建日期: 2026-02-05
-- 用途: 支持资源管理底座的 6 张核心表
-- ============================================

-- 1. 核心资源表
-- 存储所有训练资源（器材、闪卡、游戏等）
CREATE TABLE IF NOT EXISTS sys_training_resource (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER,              -- 支持克隆/变体
  module_code TEXT NOT NULL,      -- 'sensory', 'emotional', 'social', 'cognitive', 'life_skills'
  resource_type TEXT NOT NULL,    -- 'equipment', 'flashcard', 'game', 'social_story', etc.
  name TEXT NOT NULL,
  category TEXT,                  -- 业务分类 Key
  description TEXT,
  cover_image TEXT,               -- 相对路径: 'resource_assets/uuid.webp'
  is_custom INTEGER DEFAULT 0,    -- 1=用户自定义
  is_active INTEGER DEFAULT 1,

  -- 迁移溯源
  legacy_id INTEGER,              -- 原 equipment_catalog ID
  legacy_source TEXT,             -- 'equipment_catalog'

  meta_data TEXT,                 -- JSON: 扩展属性
  usage_count INTEGER DEFAULT 0,  -- 资源热度，用于"常用资源"排序
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 资源表索引
CREATE INDEX IF NOT EXISTS idx_sys_resource_module ON sys_training_resource(module_code);
CREATE INDEX IF NOT EXISTS idx_sys_resource_type ON sys_training_resource(resource_type);
CREATE INDEX IF NOT EXISTS idx_sys_resource_category ON sys_training_resource(category);
CREATE INDEX IF NOT EXISTS idx_sys_resource_legacy ON sys_training_resource(legacy_id, legacy_source);

-- 2. 标签字典表 (标准化)
-- 存储所有能力标签、症状标签等标准化标签
CREATE TABLE IF NOT EXISTS sys_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL,           -- 'ability'(能力), 'symptom'(症状)
  name TEXT NOT NULL,             -- '手眼协调', '注意力' 等
  usage_count INTEGER DEFAULT 0,  -- 热度统计
  is_preset INTEGER DEFAULT 1,    -- 1=预设标签, 0=用户自定义
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(domain, name)
);

-- 标签表索引
CREATE INDEX IF NOT EXISTS idx_sys_tags_domain ON sys_tags(domain);

-- 3. 资源-标签关联表 (多对多)
CREATE TABLE IF NOT EXISTS sys_resource_tag_map (
  resource_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (resource_id, tag_id),
  FOREIGN KEY (resource_id) REFERENCES sys_training_resource(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES sys_tags(id) ON DELETE CASCADE
);

-- 4. 统一收藏夹 (替代 teacher_fav)
-- 存储所有用户的收藏资源
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

-- 5. 系统配置表 (KV存储)
-- 存储各模块的配置项，随数据库一起备份
CREATE TABLE IF NOT EXISTS sys_app_settings (
  module_code TEXT NOT NULL,      -- 'global', 'sensory', 'emotional'
  key TEXT NOT NULL,              -- 'default_duration', 'theme_color'
  value TEXT,                     -- JSON Value
  description TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (module_code, key)
);

-- ============================================
-- FTS5 全文检索（可选，需要运行时检测支持）
-- ============================================
-- 注意: FTS5 在某些 sql.js 构建中不可用
-- 迁移脚本会在运行时检测并决定是否创建

-- 以下 FTS5 表由迁移脚本动态创建（如果支持）
-- CREATE VIRTUAL TABLE IF NOT EXISTS sys_resource_fts USING fts5(
--   name,
--   description,
--   content='sys_training_resource',
--   content_rowid='id'
-- );

-- ============================================
-- 触发器（仅在 FTS5 可用时创建）
-- ============================================
-- 以下触发器由迁移脚本动态创建（如果支持）

-- CREATE TRIGGER sys_resource_ai AFTER INSERT ON sys_training_resource BEGIN
--   INSERT INTO sys_resource_fts(rowid, name, description) VALUES (new.id, new.name, new.description);
-- END;

-- CREATE TRIGGER sys_resource_ad AFTER DELETE ON sys_training_resource BEGIN
--   INSERT INTO sys_resource_fts(sys_resource_fts, rowid, name, description) VALUES('delete', old.id, old.name, old.description);
-- END;

-- CREATE TRIGGER sys_resource_au AFTER UPDATE ON sys_training_resource BEGIN
--   INSERT INTO sys_resource_fts(sys_resource_fts, rowid, name, description) VALUES('delete', old.id, old.name, old.description);
--   INSERT INTO sys_resource_fts(rowid, name, description) VALUES (new.id, new.name, new.description);
-- END;
