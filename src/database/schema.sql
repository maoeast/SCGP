-- 学生表
CREATE TABLE IF NOT EXISTS student (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  gender TEXT CHECK(gender IN ('男', '女')) NOT NULL,
  birthday TEXT NOT NULL,
  student_no TEXT UNIQUE,
  disorder TEXT,
  avatar_path TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- S-M量表年龄阶段表
CREATE TABLE IF NOT EXISTS sm_age_stage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  age_min INTEGER NOT NULL,
  age_max INTEGER NOT NULL,
  description TEXT
);

-- S-M量表题目表
CREATE TABLE IF NOT EXISTS sm_question (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dimension TEXT NOT NULL,
  age_stage INTEGER NOT NULL,
  age_min INTEGER NOT NULL,
  age_max INTEGER NOT NULL,
  title TEXT NOT NULL,
  audio TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- S-M量表常模表
CREATE TABLE IF NOT EXISTS sm_norm (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  age_month INTEGER NOT NULL UNIQUE,
  mean REAL NOT NULL,
  sd REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 粗分-标准分换算表
CREATE TABLE IF NOT EXISTS sm_raw_to_sq (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_score INTEGER NOT NULL UNIQUE,
  sq_score INTEGER NOT NULL,
  level TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- S-M量表评估主表
CREATE TABLE IF NOT EXISTS sm_assess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  age_stage INTEGER NOT NULL,
  raw_score INTEGER NOT NULL,
  sq_score INTEGER NOT NULL,
  level TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);

-- S-M量表评估详情表
CREATE TABLE IF NOT EXISTS sm_assess_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assess_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  score INTEGER NOT NULL CHECK(score IN (0, 1)),
  answer_time INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assess_id) REFERENCES sm_assess(id),
  FOREIGN KEY (question_id) REFERENCES sm_question(id)
);

-- WeeFIM量表分类表
CREATE TABLE IF NOT EXISTS weefim_category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- WeeFIM量表题目表
CREATE TABLE IF NOT EXISTS weefim_question (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  dimension TEXT NOT NULL,
  audio TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES weefim_category(id)
);

-- WeeFIM量表评估主表
CREATE TABLE IF NOT EXISTS weefim_assess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  total_score INTEGER NOT NULL,
  adl_score INTEGER NOT NULL,
  cognitive_score INTEGER NOT NULL,
  level TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);

-- WeeFIM量表评估详情表
CREATE TABLE IF NOT EXISTS weefim_assess_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assess_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 7),
  answer_time INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assess_id) REFERENCES weefim_assess(id),
  FOREIGN KEY (question_id) REFERENCES weefim_question(id)
);

-- 训练任务分类表
CREATE TABLE IF NOT EXISTS task_category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER DEFAULT 0,
  description TEXT,
  icon TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 训练任务表
CREATE TABLE IF NOT EXISTS task (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  ability_item TEXT,
  media_type TEXT DEFAULT 'image',
  cover_img TEXT,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES task_category(id)
);

-- 训练任务难度表
CREATE TABLE IF NOT EXISTS task_level (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 4),
  total_step INTEGER NOT NULL,
  score INTEGER NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES task(id)
);

-- 训练任务步骤表
CREATE TABLE IF NOT EXISTS task_step (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  img_path TEXT,
  video_path TEXT,
  audio_path TEXT,
  text TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES task(id)
);

-- 训练计划主表
CREATE TABLE IF NOT EXISTS train_plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status INTEGER DEFAULT 0 CHECK(status IN (0, 1, 2)),
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);

-- 训练计划详情表
CREATE TABLE IF NOT EXISTS train_plan_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  scheduled_date TEXT NOT NULL,
  actual_date TEXT,
  status INTEGER DEFAULT 0 CHECK(status IN (0, 1, 2)),
  score INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES train_plan(id),
  FOREIGN KEY (task_id) REFERENCES task(id)
);

-- 训练记录表
CREATE TABLE IF NOT EXISTS train_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  total_step INTEGER NOT NULL,
  finish_step INTEGER NOT NULL,
  score INTEGER DEFAULT 0 CHECK(score BETWEEN 0 AND 100),
  error_type INTEGER DEFAULT 0 CHECK(error_type IN (0, 1, 2, 3)),
  completion_details TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id),
  FOREIGN KEY (task_id) REFERENCES task(id)
);

-- 资源表
CREATE TABLE IF NOT EXISTS resource_meta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  category INTEGER NOT NULL,
  path TEXT NOT NULL,
  size_kb INTEGER,
  tags TEXT,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 教师收藏表
CREATE TABLE IF NOT EXISTS teacher_fav (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL,
  resource_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resource_id) REFERENCES resource_meta(id)
);

-- 用户表
CREATE TABLE IF NOT EXISTS user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'teacher')),
  name TEXT NOT NULL,
  email TEXT,
  last_login TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 激活信息表
CREATE TABLE IF NOT EXISTS activation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_code TEXT NOT NULL,
  activation_code TEXT NOT NULL,
  license_data TEXT NOT NULL,
  is_valid INTEGER DEFAULT 1,
  expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_student_name ON student(name);
CREATE INDEX IF NOT EXISTS idx_sm_assess_student ON sm_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_weefim_assess_student ON weefim_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_train_plan_student ON train_plan(student_id);
CREATE INDEX IF NOT EXISTS idx_train_log_student ON train_log(student_id);
CREATE INDEX IF NOT EXISTS idx_task_category ON task(category_id);