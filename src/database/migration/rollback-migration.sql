-- ============================================
-- SIC-ADS 2.0 迁移回滚脚本
-- ============================================
-- 功能：回滚 Phase 1.2 的 Schema 迁移
-- 警告：此操作将删除所有 sys_ 表和迁移数据
-- 建议：回滚前务必备份数据库
-- ============================================

-- 开始事务
BEGIN;

-- ============================================
-- 第 1 步：删除触发器（如果存在）
-- ============================================

DROP TRIGGER IF EXISTS sys_resource_ai;
DROP TRIGGER IF EXISTS sys_resource_ad;
DROP TRIGGER IF EXISTS sys_resource_au;

-- ============================================
-- 第 2 步：删除 FTS5 虚拟表（如果存在）
-- ============================================

DROP TABLE IF EXISTS sys_resource_fts;

-- ============================================
-- 第 3 步：删除索引（如果存在）
-- ============================================

DROP INDEX IF EXISTS idx_sys_resource_module;
DROP INDEX IF EXISTS idx_sys_resource_type;
DROP INDEX IF EXISTS idx_sys_resource_category;
DROP INDEX IF EXISTS idx_sys_resource_legacy;
DROP INDEX IF EXISTS idx_sys_tag_domain;

-- ============================================
-- 第 4 步：删除关联表（注意顺序：先删子表）
-- ============================================

-- 删除资源-标签映射表
DROP TABLE IF EXISTS sys_resource_tag_map;

-- 删除统一收藏夹表
DROP TABLE IF EXISTS sys_favorites;

-- ============================================
-- 第 5 步：删除核心表
-- ============================================

-- 删除标签字典表
DROP TABLE IF EXISTS sys_tags;

-- 删除系统配置表
DROP TABLE IF EXISTS sys_app_settings;

-- 删除核心资源表
DROP TABLE IF EXISTS sys_training_resource;

-- ============================================
-- 第 6 步：验证回滚完成
-- ============================================

-- 检查是否所有 sys_ 表都已删除
SELECT
    'sys_training_resource' as table_name,
        CASE
            WHEN NOT EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='sys_training_resource')
            THEN '已删除'
            ELSE '仍存在'
        END as status
UNION ALL
SELECT
    'sys_tags',
        CASE
            WHEN NOT EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='sys_tags')
            THEN '已删除'
            ELSE '仍存在'
        END
UNION ALL
SELECT
    'sys_resource_tag_map',
        CASE
            WHEN NOT EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='sys_resource_tag_map')
            THEN '已删除'
            ELSE '仍存在'
        END
UNION ALL
SELECT
    'sys_favorites',
        CASE
            WHEN NOT EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='sys_favorites')
            THEN '已删除'
            ELSE '仍存在'
        END
UNION ALL
SELECT
    'sys_app_settings',
        CASE
            WHEN NOT EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='sys_app_settings')
            THEN '已删除'
            ELSE '仍存在'
        END
UNION ALL
SELECT
    'sys_resource_fts',
        CASE
            WHEN NOT EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='sys_resource_fts')
            THEN '已删除'
            ELSE '仍存在'
        END;

-- 提交事务
COMMIT;

-- ============================================
-- 回滚完成提示
-- ============================================

SELECT '✅ 回滚完成！所有 sys_ 表已删除。' as message;
SELECT '⚠️ 原始数据表 (equipment_catalog, teacher_fav) 保持不变。' as note;
