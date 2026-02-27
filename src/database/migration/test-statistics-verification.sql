-- =====================================================
-- 跨模块统计数据准确性验证脚本
-- 目的：验证 v_class_statistics_unified 视图在不同模块筛选下的准确性
-- =====================================================

-- =====================================================
-- 第一步：准备测试环境
-- =====================================================

-- 查看现有班级
SELECT id, name, grade_level, class_number, academic_year, current_enrollment
FROM sys_class
WHERE name = '1年级1班'
LIMIT 1;

-- 假设班级 ID 为 1，查看该班级的学生
SELECT s.id, s.name, s.current_class_id, s.current_class_name
FROM student s
WHERE s.current_class_id = 1
LIMIT 5;

-- =====================================================
-- 第二步：插入测试数据
-- =====================================================

-- 假设学生 ID 为 1 和 2，班级 ID 为 1

-- 数据 A：感官游戏训练记录（sensory 模块）
INSERT INTO training_records (
  student_id,
  task_id,
  timestamp,
  duration,
  accuracy_rate,
  avg_response_time,
  raw_data,
  class_id,
  class_name,
  module_code,
  created_at
) VALUES (
  1,  -- 学生 1
  1,   -- 任务 1（颜色配对）
  strftime('%s', 'now'),
  120,
  0.8,  -- 准确率 80%
  2000,
  '{"test": "verification_data_a"}',
  1,   -- 班级 ID
  '1年级1班',
  'sensory',
  datetime('now')
);

-- 数据 B：感官器材训练记录（sensory 模块）
INSERT INTO equipment_training_records (
  student_id,
  equipment_id,
  score,
  prompt_level,
  duration_seconds,
  training_date,
  class_id,
  class_name,
  module_code,
  created_at
) VALUES (
  2,  -- 学生 2
  1,   -- 器材 ID
  4,   -- 评分 4/5
  2,   -- 辅助等级 2
  300,
  date('now'),
  1,   -- 班级 ID
  '1年级1班',
  'sensory',
  datetime('now')
);

-- 数据 C：生活自理评估记录（life_skills 模块 - WeeFIM）
-- 先插入评估记录
INSERT INTO report_record (
  student_id,
  report_type,
  assess_id,
  title,
  class_id,
  class_name,
  module_code,
  created_at
) VALUES (
  1,  -- 学生 1
  'weefim',
  1,   -- 假设存在 weefim_assess 记录 ID 为 1
  'WeeFIM 生活自理评估',
  1,   -- 班级 ID
  '1年级1班',
  'life_skills',
  datetime('now')
);

-- =====================================================
-- 第三步：验证视图数据
-- =====================================================

-- 验证 1：查看班级 1 的所有模块统计
SELECT
  class_id,
  class_name,
  module_code,
  total_training_count,
  total_assessment_count,
  average_score,
  last_activity_date
FROM v_class_statistics_unified
WHERE class_id = 1
ORDER BY module_code;

-- 验证 2：仅查看 sensory 模块统计
SELECT
  class_id,
  class_name,
  module_code,
  total_training_count,
  total_assessment_count,
  average_score
FROM v_class_statistics_unified
WHERE class_id = 1 AND module_code = 'sensory';

-- 验证 3：仅查看 life_skills 模块统计
SELECT
  class_id,
  class_name,
  module_code,
  total_training_count,
  total_assessment_count,
  average_score
FROM v_class_statistics_unified
WHERE class_id = 1 AND module_code = 'life_skills';

-- 验证 4：查看总计（all）
SELECT
  class_id,
  class_name,
  module_code,
  total_training_count,
  total_assessment_count,
  average_score
FROM v_class_statistics_unified
WHERE class_id = 1 AND module_code = 'all';

-- =====================================================
-- 第四步：分值一致性分析
-- =====================================================

-- 查看原始数据及其分数类型
SELECT 'training_records' as source,
       COUNT(*) as count,
       AVG(accuracy_rate * 100) as avg_score_percent,
       MIN(accuracy_rate * 100) as min_score,
       MAX(accuracy_rate * 100) as max_score
FROM training_records
WHERE class_id = 1

UNION ALL

SELECT 'equipment_training_records' as source,
       COUNT(*) as count,
       AVG(CAST(score AS REAL)) as avg_score_integer,
       MIN(score) as min_score,
       MAX(score) as max_score
FROM equipment_training_records
WHERE class_id = 1

UNION ALL

SELECT 'report_record' as source,
       COUNT(*) as count,
       NULL as avg_score,  -- 评估记录没有 score 字段
       NULL as min_score,
       NULL as max_score
FROM report_record
WHERE class_id = 1 AND report_type IN ('weefim', 'sm');

-- =====================================================
-- 第五步：清理测试数据（可选）
-- =====================================================

-- 取消注释以删除测试数据
-- DELETE FROM training_records WHERE student_id IN (1, 2) AND raw_data LIKE '%verification_data%';
-- DELETE FROM equipment_training_records WHERE student_id = 2 AND duration_seconds = 300;
-- DELETE FROM report_record WHERE student_id = 1 AND title = 'WeeFIM 生活自理评估';
