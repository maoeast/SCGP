-- =====================================================
-- 班级管理模块数据库表结构
-- Phase: 班级管理模块
-- 设计原则: 混合快照模式 - 当前状态 + 历史快照 + 变更追踪
-- =====================================================

-- =====================================================
-- 1. 班级表 (sys_class)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_class (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- 班级名称: "1年级1班", "2年级3班"
  grade_level INTEGER NOT NULL,          -- 年级: 1, 2, 3, 4, 5, 6
  class_number INTEGER NOT NULL,         -- 班号: 1, 2, 3...
  academic_year TEXT NOT NULL,           -- 学年: "2023-2024"
  max_students INTEGER DEFAULT 50,       -- 最大学生数
  current_enrollment INTEGER DEFAULT 0,  -- 当前在籍人数
  status INTEGER DEFAULT 1,              -- 状态: 1=激活, 0=停用, 2=已毕业
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  -- 唯一约束: 同一学年同一年级同一班号唯一
  UNIQUE (academic_year, grade_level, class_number)
);

-- 索引: 按学年+年级查询班级
CREATE INDEX IF NOT EXISTS idx_class_year_grade
  ON sys_class(academic_year, grade_level, class_number);

-- 索引: 按状态查询
CREATE INDEX IF NOT EXISTS idx_class_status
  ON sys_class(status);

-- =====================================================
-- 2. 学生班级历史表 (student_class_history)
-- =====================================================
CREATE TABLE IF NOT EXISTS student_class_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,           -- 学生ID
  student_name TEXT NOT NULL,            -- 学生姓名（冗余，便于显示）
  class_id INTEGER NOT NULL,             -- 班级ID
  class_name TEXT NOT NULL,              -- 班级名称（冗余，便于显示）
  academic_year TEXT NOT NULL,           -- 学年
  enrollment_date TEXT NOT NULL,         -- 入班日期
  leave_date TEXT,                       -- 离班日期（NULL表示当前班级）
  leave_reason TEXT,                     -- 离班原因: upgrade/transfer/adjust/graduate
  is_current INTEGER DEFAULT 1,          -- 是否当前班级 (0=历史, 1=当前)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES sys_class(id) ON DELETE CASCADE,

  -- 唯一约束: 每学生每学年唯一
  UNIQUE (student_id, academic_year)
);

-- 索引: 查询学生当前班级
CREATE INDEX IF NOT EXISTS idx_sch_student_current
  ON student_class_history(student_id, is_current);

-- 索引: 查询班级历史学生
CREATE INDEX IF NOT EXISTS idx_sch_class_history
  ON student_class_history(class_id, academic_year);

-- 索引: 按学年查询
CREATE INDEX IF NOT EXISTS idx_sch_academic_year
  ON student_class_history(academic_year);

-- =====================================================
-- 3. 班级-老师关联表 (sys_class_teachers)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_class_teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  teacher_id INTEGER NOT NULL,
  assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
  assigned_by INTEGER,                    -- 分配者的用户ID（管理员）

  FOREIGN KEY (class_id) REFERENCES sys_class(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES user(id) ON DELETE SET NULL,

  -- 唯一约束: 同一班级同一老师只能关联一次
  UNIQUE (class_id, teacher_id)
);

-- 索引: 查询老师负责的班级
CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher
  ON sys_class_teachers(teacher_id);

-- 索引: 查询班级的老师
CREATE INDEX IF NOT EXISTS idx_class_teachers_class
  ON sys_class_teachers(class_id);

-- =====================================================
-- 4. student 表新增字段（使用 ALTER TABLE）
-- =====================================================

-- 添加当前班级ID字段（如果不存在）
ALTER TABLE student ADD COLUMN current_class_id INTEGER;

-- 添加当前班级名称字段（冗余，便于显示）
ALTER TABLE student ADD COLUMN current_class_name TEXT;

-- =====================================================
-- 5. 业务记录表新增班级快照字段
-- =====================================================

-- 游戏训练记录表添加班级快照
ALTER TABLE training_records ADD COLUMN class_id INTEGER;
ALTER TABLE training_records ADD COLUMN class_name TEXT;

-- 训练记录表添加班级快照
ALTER TABLE train_log ADD COLUMN class_id INTEGER;
ALTER TABLE train_log ADD COLUMN class_name TEXT;

-- 评估记录表添加班级快照
ALTER TABLE report_record ADD COLUMN class_id INTEGER;
ALTER TABLE report_record ADD COLUMN class_name TEXT;

-- 器材训练记录表添加班级快照
ALTER TABLE equipment_training_records ADD COLUMN class_id INTEGER;
ALTER TABLE equipment_training_records ADD COLUMN class_name TEXT;

-- =====================================================
-- 5.1 业务记录表添加 module_code 字段（通用统计支持）
-- =====================================================

-- 游戏训练记录表添加 module_code
ALTER TABLE training_records ADD COLUMN module_code TEXT DEFAULT 'sensory';

-- 训练记录表添加 module_code
ALTER TABLE train_log ADD COLUMN module_code TEXT DEFAULT 'sensory';

-- 器材训练记录表添加 module_code
ALTER TABLE equipment_training_records ADD COLUMN module_code TEXT DEFAULT 'sensory';

-- 评估记录表添加 module_code
ALTER TABLE report_record ADD COLUMN module_code TEXT;

-- =====================================================
-- 5.2 创建索引优化模块统计查询性能
-- =====================================================

-- 训练记录表复合索引（模块 + 班级）
CREATE INDEX IF NOT EXISTS idx_training_records_module_class
  ON training_records(module_code, class_id);
CREATE INDEX IF NOT EXISTS idx_training_records_module_date
  ON training_records(module_code, created_at);

-- 器材训练记录表复合索引
CREATE INDEX IF NOT EXISTS idx_equipment_training_module_class
  ON equipment_training_records(module_code, class_id);
CREATE INDEX IF NOT EXISTS idx_equipment_training_module_date
  ON equipment_training_records(module_code, training_date);

-- 评估记录表复合索引
CREATE INDEX IF NOT EXISTS idx_report_record_module_class
  ON report_record(module_code, class_id);
CREATE INDEX IF NOT EXISTS idx_report_record_module_date
  ON report_record(module_code, created_at);

-- =====================================================
-- 6. 触发器：自动更新班级在籍人数
-- =====================================================

-- 创建触发器：学生入班时自动增加班级人数
CREATE TRIGGER IF NOT EXISTS trg_class_enrollment_increment
  AFTER INSERT ON student_class_history
  WHEN NEW.is_current = 1
BEGIN
  UPDATE sys_class
  SET current_enrollment = current_enrollment + 1,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.class_id;
END;

-- 创建触发器：学生离班时自动减少班级人数
CREATE TRIGGER IF NOT EXISTS trg_class_enrollment_decrement
  AFTER UPDATE OF is_current ON student_class_history
  WHEN OLD.is_current = 1 AND NEW.is_current = 0
BEGIN
  UPDATE sys_class
  SET current_enrollment = current_enrollment - 1,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.class_id;
END;

-- =====================================================
-- 7. 视图：班级当前学生列表
-- =====================================================
CREATE VIEW IF NOT EXISTS v_class_current_students AS
SELECT
  sc.id AS class_id,
  sc.name AS class_name,
  sc.grade_level,
  sc.class_number,
  sc.academic_year,
  sch.student_id,
  sch.student_name,
  sch.enrollment_date
FROM sys_class sc
INNER JOIN student_class_history sch
  ON sc.id = sch.class_id AND sch.is_current = 1
ORDER BY sc.grade_level, sc.class_number, sch.student_name;

-- =====================================================
-- 8. 视图：学生班级历史（含当前）
-- =====================================================
CREATE VIEW IF NOT EXISTS v_student_class_history AS
SELECT
  sch.id AS history_id,
  sch.student_id,
  sch.student_name,
  sch.class_id,
  sch.class_name,
  sch.academic_year,
  sch.enrollment_date,
  sch.leave_date,
  sch.leave_reason,
  sch.is_current,
  sc.grade_level,
  sc.class_number
FROM student_class_history sch
LEFT JOIN sys_class sc
  ON sch.class_id = sc.id
ORDER BY sch.student_id, sch.enrollment_date DESC;

-- =====================================================
-- 9. 视图：班级统计信息
-- =====================================================
CREATE VIEW IF NOT EXISTS v_class_statistics AS
SELECT
  sc.id AS class_id,
  sc.name AS class_name,
  sc.grade_level,
  sc.class_number,
  sc.academic_year,
  sc.current_enrollment AS total_students,
  sc.max_students,
  COUNT(tl.id) AS training_count,
  AVG(tl.score) AS average_score,
  MAX(tl.created_at) AS last_training_date
FROM sys_class sc
LEFT JOIN student_class_history sch
  ON sc.id = sch.class_id AND sch.is_current = 1
LEFT JOIN train_log tl
  ON sch.student_id = tl.student_id
GROUP BY sc.id
ORDER BY sc.grade_level, sc.class_number;

-- =====================================================
-- 9.1 视图：统一班级统计信息（支持模块化统计）
-- =====================================================
CREATE VIEW IF NOT EXISTS v_class_statistics_unified AS
WITH
-- 训练记录统计
training_stats AS (
  SELECT
    class_id,
    class_name,
    'sensory' AS module_code,
    COUNT(*) AS training_count,
    AVG(
      CASE
        WHEN task_id IN (1, 2, 3) THEN accuracy_rate * 100
        WHEN task_id IN (4, 5) THEN accuracy_rate * 100
        ELSE accuracy_rate * 100
      END
    ) AS avg_score,
    MAX(created_at) AS last_training_date
  FROM training_records
  WHERE class_id IS NOT NULL
  GROUP BY class_id, class_name
),

-- 器材训练统计
equipment_stats AS (
  SELECT
    class_id,
    class_name,
    'sensory' AS module_code,
    COUNT(*) AS training_count,
    AVG(CAST(score AS REAL)) AS avg_score,
    MAX(training_date) AS last_training_date
  FROM equipment_training_records
  WHERE class_id IS NOT NULL
  GROUP BY class_id, class_name
),

-- 评估记录统计
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

-- 合并所有统计数据
all_stats AS (
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

-- 最终聚合统计
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
  -- 修改：全部模式下不计算混合平均分，避免不同分值类型导致的无意义结果
  CASE
    WHEN COALESCE(s.module_code, 'all') = 'all' THEN NULL
    WHEN COUNT(DISTINCT s.activity_type) > 1 THEN NULL
    ELSE AVG(s.avg_score)
  END AS average_score,
  MAX(s.last_activity_date) AS last_activity_date,
  COUNT(DISTINCT CASE WHEN s.activity_type = 'training' THEN sch.student_id END) AS active_students_training,
  COUNT(DISTINCT CASE WHEN s.activity_type = 'assessment' THEN sch.student_id END) AS active_students_assessment
FROM sys_class sc
LEFT JOIN all_stats s ON sc.id = s.class_id
LEFT JOIN student_class_history sch ON sc.id = sch.class_id AND sch.is_current = 1
GROUP BY sc.id, s.module_code
ORDER BY sc.grade_level, sc.class_number;

-- =====================================================
-- 10. 示例数据：创建默认学年班级
-- =====================================================

-- 创建 2023-2024 学年的默认班级（1-6年级，每个年级3个班）
-- 实际使用时应通过UI创建，此处仅为示例

-- 1年级
INSERT INTO sys_class (name, grade_level, class_number, academic_year)
VALUES
  ('1年级1班', 1, 1, '2023-2024'),
  ('1年级2班', 1, 2, '2023-2024'),
  ('1年级3班', 1, 3, '2023-2024')
ON CONFLICT(academic_year, grade_level, class_number) DO NOTHING;

-- 2年级
INSERT INTO sys_class (name, grade_level, class_number, academic_year)
VALUES
  ('2年级1班', 2, 1, '2023-2024'),
  ('2年级2班', 2, 2, '2023-2024'),
  ('2年级3班', 2, 3, '2023-2024')
ON CONFLICT(academic_year, grade_level, class_number) DO NOTHING;

-- 3年级
INSERT INTO sys_class (name, grade_level, class_number, academic_year)
VALUES
  ('3年级1班', 3, 1, '2023-2024'),
  ('3年级2班', 3, 2, '2023-2024'),
  ('3年级3班', 3, 3, '2023-2024')
ON CONFLICT(academic_year, grade_level, class_number) DO NOTHING;

-- 4年级
INSERT INTO sys_class (name, grade_level, class_number, academic_year)
VALUES
  ('4年级1班', 4, 1, '2023-2024'),
  ('4年级2班', 4, 2, '2023-2024'),
  ('4年级3班', 4, 3, '2023-2024')
ON CONFLICT(academic_year, grade_level, class_number) DO NOTHING;

-- 5年级
INSERT INTO sys_class (name, grade_level, class_number, academic_year)
VALUES
  ('5年级1班', 5, 1, '2023-2024'),
  ('5年级2班', 5, 2, '2023-2024'),
  ('5年级3班', 5, 3, '2023-2024')
ON CONFLICT(academic_year, grade_level, class_number) DO NOTHING;

-- 6年级
INSERT INTO sys_class (name, grade_level, class_number, academic_year)
VALUES
  ('6年级1班', 6, 1, '2023-2024'),
  ('6年级2班', 6, 2, '2023-2024'),
  ('6年级3班', 6, 3, '2023-2024')
ON CONFLICT(academic_year, grade_level, class_number) DO NOTHING;
