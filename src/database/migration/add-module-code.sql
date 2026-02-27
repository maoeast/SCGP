-- =====================================================
-- 模块化统计支持 - 添加 module_code 字段
-- Phase: 通用统计功能实现
-- 方案: 方案 B - 扩展现有表
-- 目标: 为所有训练/评估记录表添加 module_code 字段，
--       支持按模块维度进行统计查询
-- =====================================================

-- =====================================================
-- 1. 为现有表添加 module_code 字段
-- =====================================================

-- 1.1 游戏训练记录表
-- 说明: 感官训练游戏（颜色配对、形状识别等）
ALTER TABLE training_records ADD COLUMN module_code TEXT DEFAULT 'sensory';

-- 1.2 器材训练记录表
-- 说明: 感官器材训练（触觉、视觉、前庭等器材）
ALTER TABLE equipment_training_records ADD COLUMN module_code TEXT DEFAULT 'sensory';

-- 1.3 训练记录表（train_log - 如有）
-- 说明: 通用训练日志表
ALTER TABLE train_log ADD COLUMN module_code TEXT DEFAULT 'sensory';

-- 1.4 评估记录表
-- 说明: 各类评估量表（S-M, WeeFIM, CSIRS, Conners 等）
-- 注意: 评估记录的 module_code 需要根据评估类型映射
ALTER TABLE report_record ADD COLUMN module_code TEXT;

-- =====================================================
-- 2. 为评估记录设置默认 module_code 值
-- =====================================================

-- 2.1 更新现有评估记录的 module_code
-- 说明: 根据评估类型自动映射到对应模块
UPDATE report_record SET module_code = CASE
  -- 生活自理能力评估 -> life_skills
  WHEN type IN ('sm', 'weefim') THEN 'life_skills'
  -- 感觉统合评估 -> sensory
  WHEN type = 'csirs' THEN 'sensory'
  -- 行为评估 -> sensory (Conners 属于行为/感官范畴)
  WHEN type IN ('conners-psq', 'conners-trs') THEN 'sensory'
  -- 训练记录 -> sensory
  WHEN type = 'training' THEN 'sensory'
  -- IEP 报告 -> sensory
  WHEN type = 'iep' THEN 'sensory'
  ELSE 'sensory'  -- 默认值
END WHERE module_code IS NULL;

-- =====================================================
-- 3. 创建索引以优化统计查询性能
-- =====================================================

-- 3.1 训练记录表复合索引（模块 + 班级）
CREATE INDEX IF NOT EXISTS idx_training_records_module_class
  ON training_records(module_code, class_id);

CREATE INDEX IF NOT EXISTS idx_training_records_module_date
  ON training_records(module_code, created_at);

-- 3.2 器材训练记录表复合索引
CREATE INDEX IF NOT EXISTS idx_equipment_training_module_class
  ON equipment_training_records(module_code, class_id);

CREATE INDEX IF NOT EXISTS idx_equipment_training_module_date
  ON equipment_training_records(module_code, training_date);

-- 3.3 评估记录表复合索引
CREATE INDEX IF NOT EXISTS idx_report_record_module_class
  ON report_record(module_code, class_id);

CREATE INDEX IF NOT EXISTS idx_report_record_module_date
  ON report_record(module_code, created_at);

-- =====================================================
-- 4. 创建统一统计视图
-- =====================================================

-- 4.1 删除旧视图（如果存在）
DROP VIEW IF EXISTS v_class_statistics_unified;

-- 4.2 创建新的统一统计视图
CREATE VIEW IF NOT EXISTS v_class_statistics_unified AS
WITH
-- ========== 训练记录统计 ==========
training_stats AS (
  SELECT
    class_id,
    class_name,
    'sensory' AS module_code,  -- 游戏训练目前只有 sensory 模块
    COUNT(*) AS training_count,
    AVG(
      CASE
        WHEN task_id IN (1, 2, 3) THEN accuracy_rate * 100  -- 配对类游戏
        WHEN task_id IN (4, 5) THEN accuracy_rate * 100     -- 辨别类游戏
        ELSE accuracy_rate * 100  -- 其他游戏
      END
    ) AS avg_score,
    MAX(created_at) AS last_training_date
  FROM training_records
  WHERE class_id IS NOT NULL
  GROUP BY class_id, class_name
),

-- ========== 器材训练统计 ==========
equipment_stats AS (
  SELECT
    class_id,
    class_name,
    'sensory' AS module_code,  -- 器材训练目前只有 sensory 模块
    COUNT(*) AS training_count,
    AVG(CAST(score AS REAL)) AS avg_score,
    MAX(training_date) AS last_training_date
  FROM equipment_training_records
  WHERE class_id IS NOT NULL
  GROUP BY class_id, class_name
),

-- ========== 评估记录统计 ==========
assessment_stats AS (
  SELECT
    class_id,
    class_name,
    module_code,
    COUNT(*) AS assessment_count,
    MAX(created_at) AS last_assessment_date
  FROM report_record
  WHERE class_id IS NOT NULL
  GROUP BY class_id, class_name, module_code
),

-- ========== 合并所有统计数据 ==========
all_stats AS (
  -- 训练记录
  SELECT
    class_id,
    class_name,
    module_code,
    training_count,
    0 AS assessment_count,
    avg_score,
    last_training_date AS last_activity_date,
    'training' AS activity_type
  FROM training_stats

  UNION ALL

  -- 器材训练
  SELECT
    class_id,
    class_name,
    module_code,
    training_count,
    0 AS assessment_count,
    avg_score,
    last_training_date AS last_activity_date,
    'equipment' AS activity_type
  FROM equipment_stats

  UNION ALL

  -- 评估记录
  SELECT
    class_id,
    class_name,
    module_code,
    0 AS training_count,
    assessment_count,
    NULL AS avg_score,
    last_assessment_date AS last_activity_date,
    'assessment' AS activity_type
  FROM assessment_stats
)

-- ========== 最终聚合统计 ==========
SELECT
  sc.id AS class_id,
  sc.name AS class_name,
  sc.grade_level,
  sc.class_number,
  sc.academic_year,
  sc.current_enrollment AS total_students,
  sc.max_students,
  COALESCE(s.module_code, 'all') AS module_code,
  SUM(s.training_count) AS total_training_count,
  SUM(s.assessment_count) AS total_assessment_count,
  AVG(s.avg_score) AS average_score,
  MAX(s.last_activity_date) AS last_activity_date,
  COUNT(DISTINCT CASE WHEN s.activity_type = 'training' THEN sch.student_id END) AS active_students_training,
  COUNT(DISTINCT CASE WHEN s.activity_type = 'assessment' THEN sch.student_id END) AS active_students_assessment
FROM sys_class sc
LEFT JOIN all_stats s ON sc.id = s.class_id
LEFT JOIN student_class_history sch ON sc.id = sch.class_id AND sch.is_current = 1
GROUP BY sc.id, s.module_code
ORDER BY sc.grade_level, sc.class_number;

-- =====================================================
-- 5. 验证数据完整性
-- =====================================================

-- 5.1 检查是否有未设置 module_code 的记录
SELECT
  'training_records' AS table_name,
  COUNT(*) AS null_count
FROM training_records
WHERE module_code IS NULL

UNION ALL

SELECT
  'equipment_training_records' AS table_name,
  COUNT(*) AS null_count
FROM equipment_training_records
WHERE module_code IS NULL

UNION ALL

SELECT
  'report_record' AS table_name,
  COUNT(*) AS null_count
FROM report_record
WHERE module_code IS NULL;

-- =====================================================
-- 6. 示例查询：获取指定班级的统计信息
-- =====================================================

-- 查询所有模块的统计
-- SELECT * FROM v_class_statistics_unified WHERE class_id = ?;

-- 查询特定模块的统计
-- SELECT * FROM v_class_statistics_unified WHERE class_id = ? AND module_code = 'sensory';

-- 查询所有班级的统计（指定模块）
-- SELECT * FROM v_class_statistics_unified WHERE module_code = 'sensory' ORDER BY grade_level, class_number;

-- =====================================================
-- 迁移完成
-- =====================================================
