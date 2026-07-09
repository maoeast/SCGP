// SQL.js 将通过动态导入加载

// 内联schema.sql内容
import emotionalSchemaSQL from './schema/emotional-schema.sql?raw'
import { hashPasswordV1 } from '@/utils/password-security'
import {
  resolveSelfCareTaskSeedMode,
  SELF_CARE_TASK_SEED_RESOURCES,
  SELF_CARE_TASK_SEED_SUMMARY,
  type SelfCareTaskSeedMode,
} from '@/data/self-care-task-seed'

const schemaSQL = `
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

-- 小肌肉功能发展评估主表
CREATE TABLE IF NOT EXISTS fine_motor_assess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  age_months INTEGER NOT NULL,
  total_score INTEGER NOT NULL,
  standard_score INTEGER NOT NULL,
  level TEXT NOT NULL,
  level_code TEXT,
  total_max_score INTEGER NOT NULL,
  total_mastery_rate REAL NOT NULL,
  domain_results TEXT NOT NULL,
  iep_targets TEXT NOT NULL DEFAULT '[]',
  start_time TEXT NOT NULL,
  end_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);

-- 小肌肉功能发展评估详情表
CREATE TABLE IF NOT EXISTS fine_motor_assess_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assess_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  dimension TEXT NOT NULL,
  score INTEGER NOT NULL CHECK(score IN (0, 1, 2)),
  answer_time INTEGER DEFAULT 0,
  is_auto_filled INTEGER NOT NULL DEFAULT 0 CHECK(is_auto_filled IN (0, 1)),
  auto_fill_reason TEXT CHECK(auto_fill_reason IN ('basal', 'ceiling') OR auto_fill_reason IS NULL),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assess_id) REFERENCES fine_motor_assess(id)
);

-- CNBS-R2016评估主表
CREATE TABLE IF NOT EXISTS cnbsr2016_assess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  age_months INTEGER NOT NULL,
  total_mental_age REAL NOT NULL,
  dq REAL NOT NULL,
  dq_status TEXT NOT NULL CHECK(dq_status IN ('excellent', 'good', 'normal', 'borderline', 'delayed')),
  age_bracket TEXT NOT NULL CHECK(age_bracket IN ('a1', 'a2', 'a3', 'a4')),
  level TEXT NOT NULL,
  level_code TEXT,
  domain_results TEXT NOT NULL,
  domain_feedback TEXT NOT NULL,
  iep_targets TEXT NOT NULL DEFAULT '[]',
  iep_interventions TEXT NOT NULL DEFAULT '[]',
  overall_rule TEXT,
  expert_clinical TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);

-- CNBS-R2016评估详情表
CREATE TABLE IF NOT EXISTS cnbsr2016_assess_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assess_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  dimension TEXT NOT NULL,
  age_group_months INTEGER NOT NULL,
  score_weight REAL NOT NULL,
  score INTEGER NOT NULL CHECK(score IN (0, 1)),
  answer_time INTEGER DEFAULT 0,
  is_auto_filled INTEGER NOT NULL DEFAULT 0 CHECK(is_auto_filled IN (0, 1)),
  auto_fill_reason TEXT CHECK(auto_fill_reason IN ('basal', 'ceiling') OR auto_fill_reason IS NULL),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assess_id) REFERENCES cnbsr2016_assess(id)
);

-- GMFM-88评估主表
CREATE TABLE IF NOT EXISTS gmfm_88_assess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  age_months INTEGER NOT NULL,
  total_score REAL NOT NULL,
  raw_total_score INTEGER NOT NULL,
  total_max_score INTEGER NOT NULL,
  level TEXT NOT NULL,
  level_code TEXT,
  domain_results TEXT NOT NULL,
  domain_feedback TEXT NOT NULL,
  iep_targets TEXT NOT NULL DEFAULT '[]',
  flags TEXT NOT NULL DEFAULT '[]',
  overall_rule TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);

-- GMFM-88评估详情表
CREATE TABLE IF NOT EXISTS gmfm_88_assess_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assess_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  item_code TEXT NOT NULL,
  dimension TEXT NOT NULL,
  score INTEGER NOT NULL CHECK(score IN (0, 1, 2, 3)),
  raw_value TEXT NOT NULL,
  is_nt INTEGER NOT NULL DEFAULT 0 CHECK(is_nt IN (0, 1)),
  answer_time INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assess_id) REFERENCES gmfm_88_assess(id)
);

-- TGMD-3评估主表
CREATE TABLE IF NOT EXISTS tgmd_3_assess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  age_months INTEGER NOT NULL,
  gender TEXT NOT NULL,
  locomotor_score INTEGER NOT NULL,
  locomotor_percent REAL NOT NULL,
  locomotor_level INTEGER,
  ball_skills_score INTEGER NOT NULL,
  ball_skills_percent REAL NOT NULL,
  ball_skills_level INTEGER,
  total_score INTEGER NOT NULL,
  total_percent REAL NOT NULL,
  total_level INTEGER,
  level TEXT NOT NULL,
  level_code TEXT,
  domain_results TEXT NOT NULL,
  domain_feedback TEXT NOT NULL,
  skill_results TEXT NOT NULL,
  norm_summary TEXT NOT NULL,
  iep_targets TEXT NOT NULL DEFAULT '[]',
  flags TEXT NOT NULL DEFAULT '[]',
  overall_rule TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);

-- TGMD-3评估详情表
CREATE TABLE IF NOT EXISTS tgmd_3_assess_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assess_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  item_code TEXT NOT NULL,
  dimension TEXT NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  raw_value TEXT NOT NULL,
  criteria_snapshot TEXT NOT NULL DEFAULT '[]',
  answer_time INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assess_id) REFERENCES tgmd_3_assess(id)
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

-- 登录日志表
CREATE TABLE IF NOT EXISTS login_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  login_time TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL CHECK(status IN ('success', 'failed')),
  failure_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id)
);

-- 登录日志表索引
CREATE INDEX IF NOT EXISTS idx_login_log_user ON login_log(user_id);
CREATE INDEX IF NOT EXISTS idx_login_log_time ON login_log(login_time DESC);

-- 报告记录表
CREATE TABLE IF NOT EXISTS report_record (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  report_type TEXT NOT NULL CHECK(report_type IN ('sm', 'weefim', 'training', 'iep', 'csirs', 'conners-psq', 'conners-trs', 'sdq', 'srs2', 'cbcl', 'emotional', 'fine_motor', 'cnbsr2016', 'gmfm_88', 'tgmd_3')),
  assess_id INTEGER,
  plan_id INTEGER,
  training_record_id INTEGER,
  title TEXT NOT NULL,
  class_id INTEGER,
  class_name TEXT,
  module_code TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id),
  FOREIGN KEY (plan_id) REFERENCES train_plan(id),
  FOREIGN KEY (training_record_id) REFERENCES training_records(id)
);

-- 报告记录表索引
CREATE INDEX IF NOT EXISTS idx_report_student ON report_record(student_id);
CREATE INDEX IF NOT EXISTS idx_report_type ON report_record(report_type);
CREATE INDEX IF NOT EXISTS idx_report_created ON report_record(created_at DESC);

-- CSIRS感觉统合评估主表
CREATE TABLE IF NOT EXISTS csirs_assess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  age_months INTEGER NOT NULL,
  raw_scores TEXT NOT NULL,
  t_scores TEXT NOT NULL,
  total_t_score REAL NOT NULL DEFAULT 50,
  level TEXT NOT NULL DEFAULT '正常' CHECK(level IN ('严重偏低', '偏低', '正常', '优秀', '非常优秀')),
  flags TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);

-- CSIRS评估详情表
CREATE TABLE IF NOT EXISTS csirs_assess_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assess_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,  -- 题目ID (参考csirs-questions.ts, 无FK约束因为题目在TypeScript代码中定义)
  dimension TEXT NOT NULL,
  score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
  answer_time INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assess_id) REFERENCES csirs_assess(id)
);

-- Conners PSQ 表 (父母问卷 48题)
CREATE TABLE IF NOT EXISTS conners_psq_assess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  gender TEXT NOT NULL,
  age_months INTEGER NOT NULL,
  raw_scores TEXT NOT NULL,
  dimension_scores TEXT NOT NULL,
  t_scores TEXT NOT NULL,
  pi_score REAL,
  ni_score REAL,
  is_valid INTEGER DEFAULT 1,
  invalid_reason TEXT,
  hyperactivity_index REAL,
  level TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);

-- Conners TRS 表 (教师问卷 28题)
CREATE TABLE IF NOT EXISTS conners_trs_assess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  gender TEXT NOT NULL,
  age_months INTEGER NOT NULL,
  raw_scores TEXT NOT NULL,
  dimension_scores TEXT NOT NULL,
  t_scores TEXT NOT NULL,
  pi_score REAL,
  ni_score REAL,
  is_valid INTEGER DEFAULT 1,
  invalid_reason TEXT,
  hyperactivity_index REAL,
  level TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);

-- SDQ 长处和困难问卷表 (父母版 25题)
CREATE TABLE IF NOT EXISTS sdq_assess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  age_months INTEGER NOT NULL,
  raw_scores TEXT NOT NULL,
  dimension_scores TEXT NOT NULL,
  total_difficulties_score INTEGER NOT NULL,
  prosocial_score INTEGER NOT NULL,
  level TEXT NOT NULL,
  is_valid INTEGER DEFAULT 1,
  start_time TEXT NOT NULL,
  end_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);

-- SRS-2 社交反应量表表 (学龄版 65题)
CREATE TABLE IF NOT EXISTS srs2_assess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  age_months INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('male', 'female')),
  raw_answers TEXT NOT NULL,
  dimension_scores TEXT NOT NULL,
  total_raw_score INTEGER NOT NULL,
  total_t_score REAL NOT NULL,
  total_level TEXT NOT NULL CHECK(total_level IN ('normal', 'mild', 'moderate', 'severe')),
  start_time TEXT NOT NULL,
  end_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);

-- CBCL 儿童行为量表表 (6-18岁 113题+8子项)
CREATE TABLE IF NOT EXISTS cbcl_assess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  age_months INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('male', 'female')),

  -- Part 1: Social Competence (raw form data as JSON)
  social_competence_data TEXT NOT NULL,

  -- Calculated social competence scores
  social_activity_score REAL,
  social_social_score REAL,
  social_school_score REAL,

  -- Part 3: Behavior Problems
  raw_answers TEXT NOT NULL,  -- JSON: { "1": 0, "2": 1, "56a": 2, ... }

  -- Calculated factor scores (dynamic based on age/gender)
  behavior_raw_scores TEXT NOT NULL,  -- JSON: { "factor_name": raw_score }
  factor_t_scores TEXT NOT NULL,      -- JSON: { "factor_name": t_score }

  -- Summary scores
  total_problems_score INTEGER NOT NULL,
  total_problems_t_score REAL,
  internalizing_t_score REAL,
  externalizing_t_score REAL,

  -- Overall level
  summary_level TEXT NOT NULL CHECK(summary_level IN ('normal', 'borderline', 'clinical')),

  -- Metadata
  start_time TEXT NOT NULL,
  end_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (student_id) REFERENCES student(id)
);

-- CBCL评估表索引
CREATE INDEX IF NOT EXISTS idx_cbcl_assess_student ON cbcl_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_cbcl_assess_created ON cbcl_assess(created_at DESC);

-- SRS-2评估表索引
CREATE INDEX IF NOT EXISTS idx_srs2_assess_student ON srs2_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_srs2_assess_created ON srs2_assess(created_at DESC);

-- CNBS-R2016评估表索引
CREATE INDEX IF NOT EXISTS idx_cnbsr2016_assess_student ON cnbsr2016_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_cnbsr2016_assess_created ON cnbsr2016_assess(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cnbsr2016_assess_detail_assess ON cnbsr2016_assess_detail(assess_id);
CREATE INDEX IF NOT EXISTS idx_gmfm_88_assess_student ON gmfm_88_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_gmfm_88_assess_created ON gmfm_88_assess(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gmfm_88_assess_detail_assess ON gmfm_88_assess_detail(assess_id);
CREATE INDEX IF NOT EXISTS idx_tgmd_3_assess_student ON tgmd_3_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_tgmd_3_assess_created ON tgmd_3_assess(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tgmd_3_assess_detail_assess ON tgmd_3_assess_detail(assess_id);

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
  allowed_modules TEXT NOT NULL DEFAULT '[]',
  is_valid INTEGER DEFAULT 1,
  expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_student_name ON student(name);
CREATE INDEX IF NOT EXISTS idx_sm_assess_student ON sm_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_weefim_assess_student ON weefim_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_fine_motor_assess_student ON fine_motor_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_fine_motor_assess_detail_assess ON fine_motor_assess_detail(assess_id);
CREATE INDEX IF NOT EXISTS idx_csirs_assess_student ON csirs_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_csirs_assess_detail_assess ON csirs_assess_detail(assess_id);
CREATE INDEX IF NOT EXISTS idx_conners_psq_assess_student ON conners_psq_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_conners_trs_assess_student ON conners_trs_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_sdq_assess_student ON sdq_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_srs2_assess_student ON srs2_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_train_plan_student ON train_plan(student_id);
CREATE INDEX IF NOT EXISTS idx_train_log_student ON train_log(student_id);
CREATE INDEX IF NOT EXISTS idx_task_category ON task(category_id);

-- 感官训练记录表 (新模块)
CREATE TABLE IF NOT EXISTS training_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  task_id INTEGER,
  resource_id INTEGER,
  resource_type TEXT,
  session_type TEXT,
  entry_code TEXT,
  timestamp INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  accuracy_rate REAL NOT NULL CHECK(accuracy_rate BETWEEN 0 AND 1),
  avg_response_time INTEGER NOT NULL,
  raw_data TEXT NOT NULL,
  class_id INTEGER,
  class_name TEXT,
  module_code TEXT DEFAULT 'sensory',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_training_records_student_id ON training_records(student_id);
CREATE INDEX IF NOT EXISTS idx_training_records_task_id ON training_records(task_id);
CREATE INDEX IF NOT EXISTS idx_training_records_timestamp ON training_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_training_records_resource_id ON training_records(resource_id);
CREATE INDEX IF NOT EXISTS idx_training_records_entry_code ON training_records(entry_code);

-- 器材主数据表 (器材训练模块)
CREATE TABLE IF NOT EXISTS equipment_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK(category IN ('tactile', 'olfactory', 'visual', 'auditory', 'gustatory', 'proprioceptive', 'integration')),
  sub_category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  ability_tags TEXT,
  image_url TEXT,
  is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 器材训练记录表 (器材训练模块)
CREATE TABLE IF NOT EXISTS equipment_training_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  equipment_id INTEGER NOT NULL,
  entry_code TEXT,
  score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
  prompt_level INTEGER NOT NULL CHECK(prompt_level BETWEEN 1 AND 5),
  duration_seconds INTEGER,
  notes TEXT,
  generated_comment TEXT,
  training_date TEXT NOT NULL,
  teacher_name TEXT,
  environment TEXT,
  batch_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id),
  FOREIGN KEY (equipment_id) REFERENCES sys_training_resource(id)
);

-- 器材训练批次表 (器材训练模块 - 可选)
CREATE TABLE IF NOT EXISTS equipment_training_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  batch_name TEXT,
  training_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);

-- 器材相关索引
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_category ON equipment_catalog(category);
CREATE INDEX IF NOT EXISTS idx_equipment_training_student ON equipment_training_records(student_id);
CREATE INDEX IF NOT EXISTS idx_equipment_training_date ON equipment_training_records(training_date);
CREATE INDEX IF NOT EXISTS idx_equipment_training_equipment ON equipment_training_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_training_batch ON equipment_training_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_equipment_training_entry_code ON equipment_training_records(entry_code);
CREATE INDEX IF NOT EXISTS idx_equipment_training_batches_student ON equipment_training_batches(student_id);

-- 统一训练记录主表（Phase A）
CREATE TABLE IF NOT EXISTS training_session (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  module_code TEXT NOT NULL,
  entry_code TEXT NOT NULL,
  session_family TEXT NOT NULL,
  resource_id INTEGER,
  resource_type TEXT,
  task_id INTEGER,
  task_name_snapshot TEXT,
  class_id INTEGER,
  class_name TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  completion_status TEXT NOT NULL DEFAULT 'completed'
    CHECK(completion_status IN ('completed', 'cancelled', 'interrupted', 'aborted')),
  accuracy_rate REAL
    CHECK(accuracy_rate IS NULL OR accuracy_rate BETWEEN 0 AND 1),
  avg_response_time_ms INTEGER,
  summary_payload TEXT,
  source_table TEXT NOT NULL,
  source_record_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id),
  FOREIGN KEY (task_id) REFERENCES task(id)
);

CREATE INDEX IF NOT EXISTS idx_training_session_student_started
  ON training_session(student_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_session_module_entry_started
  ON training_session(module_code, entry_code, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_session_family_started
  ON training_session(session_family, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_session_completion_started
  ON training_session(completion_status, started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_training_session_source_record
  ON training_session(source_table, source_record_id);

-- ============================================
-- Phase 1.3: Schema 迁移 - 系统核心表定义
-- ============================================

-- 1. 核心资源表
-- 存储所有训练资源（器材、闪卡、游戏等）
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

-- 2. 标签字典表 (标准化)
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

-- 3. 资源-标签关联表 (多对多)
CREATE TABLE IF NOT EXISTS sys_resource_tag_map (
  resource_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (resource_id, tag_id),
  FOREIGN KEY (resource_id) REFERENCES sys_training_resource(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES sys_tags(id) ON DELETE CASCADE
);

-- 4. 统一收藏夹 (替代 teacher_fav)
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
CREATE TABLE IF NOT EXISTS sys_app_settings (
  module_code TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  description TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (module_code, key)
);

-- ============================================
-- Phase 3.12: 训练计划模块
-- ============================================
-- 创建日期: 2026-02-24
-- 用途: IEP 训练计划管理，支持跨模块资源编排
-- ============================================

-- 6. 训练计划主表
CREATE TABLE IF NOT EXISTS sys_training_plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  student_id INTEGER NOT NULL,
  module_code TEXT NOT NULL DEFAULT 'all',  -- 归属模块，'all' 表示综合计划
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'completed', 'archived')),
  long_term_goals TEXT,    -- JSON 数组存储长期目标
  short_term_goals TEXT,   -- JSON 数组存储短期目标
  description TEXT,
  source TEXT,                       -- 计划来源（'assessment' = 由评估推荐生成；NULL = 手工建）
  source_assessment_id INTEGER,      -- 来源评估记录 id（回链评估报告；nullable）
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
);

-- 训练计划索引
CREATE INDEX IF NOT EXISTS idx_training_plan_student ON sys_training_plan(student_id);
CREATE INDEX IF NOT EXISTS idx_training_plan_status ON sys_training_plan(status);
CREATE INDEX IF NOT EXISTS idx_training_plan_module ON sys_training_plan(module_code);
CREATE INDEX IF NOT EXISTS idx_training_plan_dates ON sys_training_plan(start_date, end_date);

-- 7. 计划-资源关联表
CREATE TABLE IF NOT EXISTS sys_plan_resource_map (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  resource_id INTEGER NOT NULL,
  frequency INTEGER,           -- 训练频次（次/周）
  duration_minutes INTEGER,    -- 时长建议（分钟）
  notes TEXT,                  -- 教学指导
  sort_order INTEGER DEFAULT 0, -- 排序
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES sys_training_plan(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id) REFERENCES sys_training_resource(id) ON DELETE CASCADE,
  UNIQUE (plan_id, resource_id)
);

-- 计划-资源关联索引
CREATE INDEX IF NOT EXISTS idx_plan_resource_plan ON sys_plan_resource_map(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_resource_resource ON sys_plan_resource_map(resource_id);
`;

// 内联 sys-tables.sql 内容（保留用于 initializeSysTables）
const sysTablesSQL = `
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

-- 2. 标签字典表 (标准化)
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

-- 3. 资源-标签关联表 (多对多)
CREATE TABLE IF NOT EXISTS sys_resource_tag_map (
  resource_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (resource_id, tag_id),
  FOREIGN KEY (resource_id) REFERENCES sys_training_resource(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES sys_tags(id) ON DELETE CASCADE
);

-- 4. 统一收藏夹 (替代 teacher_fav)
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
CREATE TABLE IF NOT EXISTS sys_app_settings (
  module_code TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  description TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (module_code, key)
);
`;

// 数据库实例
let db: any = null;
let SQL: any = null;
let initPromise: Promise<any> | null = null;

function getLastInsertedRowId(): number {
  if (!db) {
    return 0
  }

  if (typeof db.lastInsertId === 'function') {
    return Number(db.lastInsertId() || 0)
  }

  return Number(db.get?.('SELECT last_insert_rowid() as id', [])?.id || 0)
}

function queryRows<T extends Record<string, any>>(sql: string, params: any[] = []): T[] {
  if (!db || typeof db.all !== 'function') {
    return []
  }

  return db.all(sql, params) as T[]
}

// 创建表结构（内部使用原始数据库）
function createTablesInternal(rawDb: any) {
  try {
    rawDb.run(schemaSQL);
    console.log('数据库表创建成功');
  } catch (error) {
    console.error('创建表失败:', error);
    throw error;
  }
}

// 兼容性函数（使用包装后的数据库）
function createTables() {
  try {
    db.run(schemaSQL);
    console.log('数据库表创建成功');
  } catch (error) {
    console.error('创建表失败:', error);
    throw error;
  }
}

// 自动保存数据库
function autoSave() {
  if (db && SQL) {
    try {
      const data = db.export();
      const base64 = btoa(String.fromCharCode(...data));
      localStorage.setItem('selfcare_ats_db', base64);
    } catch (error) {
      console.error('自动保存数据库失败:', error);
    }
  }
}

// 初始化数据库
export async function initDatabase(): Promise<any> {
  if (db) {
    console.log('[InitDatabase] ♻️ 复用已初始化数据库实例')
    return db
  }

  if (initPromise) {
    console.log('[InitDatabase] ⏳ 复用进行中的数据库初始化流程')
    return initPromise
  }

  initPromise = (async (): Promise<any> => {
    try {
      console.log('[InitDatabase] 🔄 开始初始化数据库...')

    // 步骤 1: 通过 Electron IPC 加载数据库文件
    let dbBuffer: Uint8Array | null = null

    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      console.log('[InitDatabase] 📡 通过 IPC 加载数据库文件...')
      // 直接获取 Buffer，不再需要解构对象
      dbBuffer = await (window as any).electronAPI.loadDatabaseFile()
      if (dbBuffer) {
        console.log('[InitDatabase] ✅ IPC 加载成功，大小:', dbBuffer.length, 'bytes')
      } else {
        console.log('[InitDatabase] ℹ️  数据库文件不存在，将创建新数据库')
      }
    } else {
      console.log('[InitDatabase] 🌐 Web 模式，尝试从 IndexedDB 加载...')
      try {
        const { indexedDBStorage } = await import('./indexeddb-storage')
        const data = await indexedDBStorage.load()
        if (data) {
          dbBuffer = data
          console.log('[InitDatabase] ✅ IndexedDB 加载成功')
        }
      } catch (e) {
        console.log('[InitDatabase] ℹ️  IndexedDB 无数据')
      }
    }

    // 步骤 2: 使用 database-loader 初始化 sql.js
    const { loadDatabaseFromBuffer } = await import('./database-loader')
    const { db: rawDb, SQL, isNewDb } = await loadDatabaseFromBuffer(dbBuffer)

    // 步骤 3: 使用 SQLWrapper 包装（由 Worker Bridge 接管自动保存）
    const { SQLWrapper } = await import('./sql-wrapper')
    db = new SQLWrapper(rawDb, SQL)

    // 旧库兼容修复必须先于 schemaSQL 执行。
    // 否则 schemaSQL 中针对 training_records(resource_id) 的索引创建会在缺列旧库上直接失败。
    if (!isNewDb) {
      try {
        const { needsEmotionalFoundationMigration, migrateEmotionalFoundation } = await import('./migration/migrate-emotional-foundation')
        if (needsEmotionalFoundationMigration(rawDb)) {
          console.log('[InitDatabase] 🔄 在 schema 初始化前修复 emotional 兼容表结构...')
          const result = await migrateEmotionalFoundation(rawDb)
          if (!result.success) {
            throw new Error(result.message)
          }
          if (result.changes) {
            console.log('[InitDatabase] 📊 pre-schema emotional 迁移统计:', result.changes)
          }
          if (needsEmotionalFoundationMigration(rawDb)) {
            throw new Error('pre-schema emotional 兼容迁移后仍检测到旧 schema')
          }
          console.log('[InitDatabase] ✅ pre-schema emotional 兼容迁移完成')
        } else {
          console.log('[InitDatabase] ✅ pre-schema emotional 兼容检查通过')
        }
      } catch (preSchemaEmotionalError) {
        console.error('[InitDatabase] ❌ pre-schema emotional 兼容迁移失败:', preSchemaEmotionalError)
        throw preSchemaEmotionalError
      }
    }

    // 创建表结构
    db.run(schemaSQL)
    initializeTrainingSessionTables(rawDb)

    // 数据迁移：为现有表添加新字段或修改表结构
    if (!isNewDb) {
      console.log('🔄 执行数据库迁移（旧数据库）')
      try {
        // 检查 train_log 表是否有 completion_details 列
        const tableInfo = db.all("PRAGMA table_info(train_log)")
        const hasCompletionDetails = tableInfo.some((col: any) => col.name === 'completion_details')

        if (!hasCompletionDetails) {
          console.log('添加 completion_details 列到 train_log 表')
          db.run('ALTER TABLE train_log ADD COLUMN completion_details TEXT')
        }

        // 检查 report_record 表是否有 training_record_id 列
        const reportTableInfo = db.all("PRAGMA table_info(report_record)")
        const hasTrainingRecordId = reportTableInfo.some((col: any) => col.name === 'training_record_id')

        if (!hasTrainingRecordId) {
          console.log('添加 training_record_id 列到 report_record 表')
          db.run('ALTER TABLE report_record ADD COLUMN training_record_id INTEGER')
        }

        // 检查并迁移 task_step 表结构（移除 level_id 依赖）
        const stepTableInfo = db.all("PRAGMA table_info(task_step)")
        console.log('📋 task_step 表结构:', stepTableInfo.map((c: any) => ({ name: c.name, type: c.type })))
        const hasLevelId = stepTableInfo.some((col: any) => col.name === 'level_id')

        if (hasLevelId) {
          console.log('检测到旧的 task_step 表结构，开始迁移...')

          // SQLite 不支持直接删除列，需要重建表
          // 1. 创建新表
          db.run(`
            CREATE TABLE task_step_new (
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
          `)

          // 2. 复制数据（忽略 level_id）
          db.run(`
            INSERT INTO task_step_new (id, task_id, seq, img_path, video_path, audio_path, text, created_at, updated_at)
            SELECT id, task_id, seq, img_path, video_path, audio_path, text, created_at, updated_at
            FROM task_step;
          `)

          // 3. 删除旧表
          db.run('DROP TABLE task_step;')

          // 4. 重命名新表
          db.run('ALTER TABLE task_step_new RENAME TO task_step;')

          console.log('✅ task_step 表迁移完成')
        } else {
          console.log('✅ task_step 表已是新结构，无需迁移')
        }

        // 检查并迁移 train_plan_detail 表
        const planDetailInfo = db.all("PRAGMA table_info(train_plan_detail)")
        const hasPlanDetailLevelId = planDetailInfo.some((col: any) => col.name === 'level_id')

        if (hasPlanDetailLevelId) {
          console.log('检测到旧的 train_plan_detail 表结构，开始迁移...')

          db.run(`
            CREATE TABLE train_plan_detail_new (
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
          `)

          db.run(`
            INSERT INTO train_plan_detail_new (id, plan_id, task_id, scheduled_date, actual_date, status, score, notes, created_at, updated_at)
            SELECT id, plan_id, task_id, scheduled_date, actual_date, status, score, notes, created_at, updated_at
            FROM train_plan_detail;
          `)

          db.run('DROP TABLE train_plan_detail;')
          db.run('ALTER TABLE train_plan_detail_new RENAME TO train_plan_detail;')

          console.log('✅ train_plan_detail 表迁移完成')
        }

        // 检查并迁移 train_log 表
        const logTableInfo = db.all("PRAGMA table_info(train_log)")
        const hasLogLevelId = logTableInfo.some((col: any) => col.name === 'level_id')

        if (hasLogLevelId) {
          console.log('检测到旧的 train_log 表结构，开始迁移...')

          db.run(`
            CREATE TABLE train_log_new (
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
          `)

          db.run(`
            INSERT INTO train_log_new (id, student_id, task_id, start_time, end_time, total_step, finish_step, score, error_type, completion_details, notes, created_at)
            SELECT id, student_id, task_id, start_time, end_time, total_step, finish_step, score, error_type, completion_details, notes, created_at
            FROM train_log;
          `)

          db.run('DROP TABLE train_log;')
          db.run('ALTER TABLE train_log_new RENAME TO train_log;')

          console.log('✅ train_log 表迁移完成')
        }

        // 检查是否需要插入步骤数据
        const stepCount = db.all('SELECT COUNT(*) as count FROM task_step')
        const taskCount = db.all('SELECT COUNT(*) as count FROM task')
        console.log(`📊 当前数据: ${taskCount[0].count} 个任务, ${stepCount[0].count} 个步骤`)

        // 检查步骤的 text 字段是否为空（检测旧数据）
        const emptyTextCount = db.all('SELECT COUNT(*) as count FROM task_step WHERE text IS NULL OR text = "" OR text = " " OR LENGTH(TRIM(text)) = 0')
        console.log(`📊 空描述步骤: ${emptyTextCount[0].count} 个`)

        // 调试：查看前几个步骤的实际内容
        const sampleSteps = db.all('SELECT id, task_id, seq, text FROM task_step LIMIT 5')
        console.log('🔍 示例步骤数据:', sampleSteps)

        // 如果任务存在但步骤不存在或步骤的 text 为空，需要更新步骤数据
        const needsStepUpdate = stepCount[0].count === 0 ||
          (stepCount[0].count > 0 && emptyTextCount[0].count > 0)

        if (taskCount[0].count > 0 && needsStepUpdate) {
          console.log('🔧 检测到步骤需要更新，正在重新插入步骤数据...')

          // 先删除旧步骤数据
          db.run('DELETE FROM task_step')
          console.log('✅ 已清空旧步骤数据')

          // 插入新步骤数据
          await insertInitialDataToDB(db, { tasks: false, steps: true })
        }

        // 检查 csirs_assess 表是否有 flags 列
        const csirsTableInfo = db.all("PRAGMA table_info(csirs_assess)")
        const hasFlags = csirsTableInfo.some((col: any) => col.name === 'flags')

        if (!hasFlags) {
          console.log('添加 flags 列到 csirs_assess 表')
          db.run('ALTER TABLE csirs_assess ADD COLUMN flags TEXT')
        }

        // TGMD-3 表结构兼容修复：早期接入版本缺少 domain_feedback 列
        // 已有数据库会保留旧表结构，因此需要在启动时补齐。
        safeAddColumn(rawDb, 'tgmd_3_assess', "domain_feedback TEXT NOT NULL DEFAULT '[]'")

      } catch (error) {
        console.error('❌ 数据库迁移失败:', error)
        console.error('错误详情:', (error as Error).message)
        console.error('错误堆栈:', (error as Error).stack)
      }
    } else {
      console.log('✅ 新数据库，无需迁移')
    }

    // ========== 系统表初始化（必须在 insertEquipmentData 之前） ==========
    try {
      await initializeSysTables(rawDb)
      console.log('[InitDatabase] ✅ 系统表初始化完成')
    } catch (sysError) {
      console.warn('[InitDatabase] ⚠️ 系统表初始化失败:', sysError)
    }

    // ========== 推荐引擎：sys_training_plan 补 source / source_assessment_id 列 ==========
    try {
      migrateTrainingPlanSourceColumns(rawDb)
    } catch (planSourceError) {
      console.warn('[InitDatabase] ⚠️ sys_training_plan source 列迁移失败:', planSourceError)
    }

    // 只在新数据库时插入初始数据
    if (isNewDb) {
      console.log('新数据库，插入初始数据')
      await insertInitialDataToDB(db)
    } else {
      console.log('加载已有数据库，跳过初始数据插入')
    }

    await upsertSelfCareTaskSeedResources(db)

    // 插入器材数据（如果表为空）
    await insertEquipmentData()

    // 迁移器材数据的 legacy_id（修复现有数据库）
    await migrateEquipmentLegacyIds()

    // ============================================
    // Phase 1.3: Schema 迁移 - Equipment to Resource
    // ============================================
    console.log('🔄 [Phase 1.3] 检查 Schema 迁移...')
    try {
      const { migrateEquipmentToResource } = await import('./migration/migrate-to-resource')
      // 传递原始的 sql.js Database 对象，而不是 SQLWrapper
      const migrationResult = await migrateEquipmentToResource(rawDb)

      if (migrationResult.success) {
        console.log('✅ [Phase 1.3] Schema 迁移完成:', migrationResult.message)
        console.log('📊 [Phase 1.3] 迁移统计:', migrationResult.stats)
      } else {
        console.warn('⚠️  [Phase 1.3] Schema 迁移失败:', migrationResult.message)
      }
    } catch (migrationError) {
      console.warn('⚠️  [Phase 1.3] Schema 迁移跳过:', migrationError)
    }

    console.log('使用SQL.js数据库成功')

    // 设置全局 db 引用（用于应用退出前保存）
    ;(window as any).db = db

    // ========== Plan B: 主线程防抖原子写入 ==========
    // 防抖保存机制已内置在 SQLWrapper 中
    // - INSERT/UPDATE/DELETE 操作自动触发 2000ms 防抖保存
    // - 数据导出和原子写入通过 IPC 调用 electronAPI.saveDatabaseAtomic
    // - 无需 Worker Bridge，简化架构
    console.log('[InitDatabase] ✅ Plan B 已启用：主线程防抖原子写入（2000ms 延迟）')

    // ========== 自动运行数据库迁移 ==========
    try {
      const { needsMigration, migrateReportRecordConstraints } = await import('./migrate-report-constraints')
      if (needsMigration()) {
        console.log('[InitDatabase] 🔄 检测到 report_record 表需要更新约束，自动运行迁移...')
        const result = await migrateReportRecordConstraints()
        if (result.success) {
          console.log('[InitDatabase] ✅ 数据库迁移成功:', result.message)
        } else {
          console.warn('[InitDatabase] ⚠️  数据库迁移失败:', result.message)
        }
      } else {
        console.log('[InitDatabase] ✅ report_record 表约束已是最新版本')
      }
    } catch (migrationError) {
      console.warn('[InitDatabase] ⚠️  数据库迁移检查失败:', migrationError)
    }

    // ========== 班级管理模块初始化 ==========
    try {
      // 传入原始的 sql.js Database 对象，避免 SQLWrapper 的自动保存干扰
      await initializeClassTables(rawDb)
      console.log('[InitDatabase] ✅ 班级管理模块初始化完成')
    } catch (classError) {
      console.warn('[InitDatabase] ⚠️  班级管理模块初始化失败:', classError)
    }

    // ========== 模块化统计支持迁移 ==========
    try {
      const { needsModuleCodeMigration, runModuleCodeMigration } = await import('./migration/migrate-module-code')
      if (needsModuleCodeMigration(rawDb)) {
        console.log('[InitDatabase] 🔄 检测到需要添加 module_code 字段，自动运行迁移...')
        const result = await runModuleCodeMigration()
        if (result.success) {
          console.log('[InitDatabase] ✅ 模块化统计支持迁移成功:', result.message)
          if (result.changes) {
            console.log('[InitDatabase] 📊 迁移统计:', result.changes)
          }
        } else {
          console.warn('[InitDatabase] ⚠️  模块化统计支持迁移失败:', result.message)
        }
      } else {
        console.log('[InitDatabase] ✅ module_code 字段已存在，无需迁移')
      }
    } catch (moduleMigrationError) {
      console.warn('[InitDatabase] ⚠️  模块化统计支持迁移检查失败:', moduleMigrationError)
    }

    // ========== emotional 模块基础迁移与表初始化 ==========
    try {
      const { needsEmotionalFoundationMigration, migrateEmotionalFoundation } = await import('./migration/migrate-emotional-foundation')
      if (needsEmotionalFoundationMigration(rawDb)) {
        console.log('[InitDatabase] 🔄 检测到 emotional 基础 schema 仍需迁移，继续补齐...')
        const result = await migrateEmotionalFoundation(rawDb)
        if (result.success) {
          console.log('[InitDatabase] ✅ emotional 基础迁移成功:', result.message)
          if (result.changes) {
            console.log('[InitDatabase] 📊 emotional 迁移统计:', result.changes)
          }
        } else {
          throw new Error(result.message)
        }
      } else {
        console.log('[InitDatabase] ✅ emotional 基础 schema 已是最新，无需迁移')
      }
    } catch (emotionalMigrationError) {
      console.error('[InitDatabase] ❌ emotional 基础迁移检查失败:', emotionalMigrationError)
      throw emotionalMigrationError
    }

    try {
      await initializeEmotionalTables(rawDb)
      console.log('[InitDatabase] ✅ emotional 模块表初始化完成')
    } catch (emotionalSchemaError) {
      console.warn('[InitDatabase] ⚠️  emotional 模块表初始化失败:', emotionalSchemaError)
    }

    // ========== 游戏资源迁移 ==========
    try {
      const { runGameMigration } = await import('./migration/migrate-games-to-resources')
      console.log('[InitDatabase] 🔄 同步感官游戏资源...')
      const result = await runGameMigration()
      if (result.success) {
        console.log('[InitDatabase] ✅ 游戏资源迁移成功:', result.message)
        if (result.verification) {
          console.log('[InitDatabase] 📊 游戏统计:', result.verification.stats)
        }
      } else {
        console.warn('[InitDatabase] ⚠️  游戏资源迁移失败:', result.message)
      }
    } catch (gameMigrationError) {
      console.warn('[InitDatabase] ⚠️  游戏资源迁移检查失败:', gameMigrationError)
    }

    try {
      await insertEmotionalGameResourceData()
      console.log('[InitDatabase] ✅ custom game 游戏资源初始化完成')
    } catch (emotionalGameResourceError) {
      console.warn('[InitDatabase] ⚠️  custom game 游戏资源初始化失败:', emotionalGameResourceError)
    }

    try {
      await insertEmotionalResourceData()
      console.log('[InitDatabase] ✅ emotional 演示资源初始化完成')
    } catch (emotionalResourceError) {
      console.warn('[InitDatabase] ⚠️  emotional 演示资源初始化失败:', emotionalResourceError)
    }

    try {
      await insertPhysicalEquipmentResourceData()
      console.log('[InitDatabase] ✅ physical-equipment 资源初始化完成')
    } catch (physicalEquipmentError) {
      console.warn('[InitDatabase] ⚠️  physical-equipment 资源初始化失败:', physicalEquipmentError)
    }

      if (typeof db?.hasPendingChanges === 'function'
        && typeof db?.saveNow === 'function'
        && db.hasPendingChanges()) {
        console.log('[InitDatabase] 💾 初始化阶段存在待保存变更，立即落盘...')
        await db.saveNow()
        console.log('[InitDatabase] ✅ 初始化阶段变更已保存')
      }

      return db
    } catch (error) {
      console.error('SQL.js数据库初始化失败:', error)

      if (import.meta.env.PROD) {
        throw error
      }

      // 仅开发环境允许降级到 Mock 数据库，避免生产环境误报为账号密码错误。
      console.warn('[InitDatabase] 开发环境降级使用 Mock 数据库')
      const { MockDatabase, createMockData } = await import('./mock-db')
      db = new MockDatabase()
      createMockData(db)
      return db
    }
  })()

  try {
    return await initPromise
  } finally {
    initPromise = null
  }
}

// 插入初始数据到数据库
async function insertInitialDataToDB(database: any, options: { tasks?: boolean; steps?: boolean } = { tasks: true, steps: true }) {
  try {
    // 插入S-M量表年龄阶段
    database.run(`
      INSERT INTO sm_age_stage (name, age_min, age_max, description) VALUES
      ('6个月-1岁11个月', 6, 23, '婴儿期'),
      ('2岁-3岁5个月', 24, 41, '幼儿期早期'),
      ('3岁6个月-4岁11个月', 42, 59, '幼儿期晚期'),
      ('5岁-6岁5个月', 60, 77, '学龄前期早期'),
      ('6岁6个月-8岁5个月', 78, 101, '学龄前期晚期'),
      ('8岁6个月-10岁5个月', 102, 125, '学龄期早期'),
      ('10岁6个月以上', 126, 200, '学龄期晚期');
    `)

    // 插入WeeFIM量表分类
    database.run(`
      INSERT INTO weefim_category (name, description) VALUES
      ('自我照顾', '进食、梳洗修饰、洗澡、穿衣、如厕等日常生活能力'),
      ('括约肌控制', '排尿控制、排便控制'),
      ('转移', '床椅转移、轮椅转移、进出浴盆/淋浴间'),
      ('行走', '步行、使用轮椅'),
      ('沟通', '理解、表达能力'),
      ('社会认知', '社会交往、解决问题能力');
    `)

    // 插入训练任务分类（使用统一的6大分类）
    database.run(`
      INSERT INTO task_category (name, parent_id, description, icon) VALUES
      ('饮食技能', 0, '培养学生独立进食的能力，包括使用餐具、餐桌礼仪等', 'utensils'),
      ('穿着技能', 0, '培养学生独立穿脱衣物的能力，包括认识衣物、穿脱顺序等', 'tshirt'),
      ('如厕技能', 0, '培养学生独立如厕的能力，包括便后清洁、冲水等', 'toilet'),
      ('个人卫生', 0, '培养学生个人卫生习惯，包括洗手、洗脸、刷牙等', 'soap'),
      ('居家生活', 0, '培养学生居家生活能力，包括整理物品、开关门窗等', 'home'),
      ('社区生活', 0, '培养学生社区生活能力，包括安全过马路、购物等', 'users');
    `)

    const { passwordHash, salt } = await hashPasswordV1('admin123')

    // 插入默认管理员用户
    database.run(`
      INSERT INTO user (username, password_hash, salt, role, name) VALUES
      ('admin', ?, ?, 'admin', '系统管理员');
    `, [passwordHash, salt])

    // 插入系统默认配置
    database.run(`
      INSERT INTO system_config (key, value, description) VALUES
      ('system_name', '星愿能力发展训练系统', '系统名称'),
      ('system_version', '1.0.1', '系统版本'),
      ('login_theme_variant', 'classic-blue', '登录页主题预设'),
      ('theme_primary_color', '#4d8bbd', '登录页主色'),
      ('login_logo_path', '', '登录页 Logo'),
      ('brand_panel_description', '从能力基线到情绪感知，用智能化的数据记录，守护孩子点滴进步。', '登录页品牌说明'),
      ('auto_backup', 'true', '是否自动备份'),
      ('backup_interval', '7', '备份间隔（天）'),
      ('trial_days', '7', '试用天数');
    `)

    // 插入资源数据

    console.log('初始数据插入成功')
  } catch (error) {
    console.error('插入初始数据失败:', error)
  }
}

function getSelfCareTaskSeedModeFromEnv(): SelfCareTaskSeedMode {
  const envMode = typeof window !== 'undefined'
    ? ((window as any).__SCGP_TASK_SEED_MODE__ as string | undefined)
    : undefined

  return resolveSelfCareTaskSeedMode(envMode)
}

async function upsertSelfCareTaskSeedResources(database: any): Promise<void> {
  const mode = getSelfCareTaskSeedModeFromEnv()
  const existingRows = queryRows<{
    id: number
    legacy_id: number | null
    legacy_source: string | null
    meta_data: string | null
  }>(
    `
      SELECT id, legacy_id, legacy_source, meta_data
      FROM sys_training_resource
      WHERE module_code = ?
        AND resource_type = ?
    `,
    ['life_skills', 'task_training'],
  )

  const existingByLegacyId = new Map<string, typeof existingRows[number]>()
  const existingByLegacyTaskCode = new Map<string, typeof existingRows[number]>()

  for (const row of existingRows) {
    const legacyId = Number(row.legacy_id || 0)
    const legacySource = String(row.legacy_source || '')
    if (legacyId > 0 && legacySource) {
      existingByLegacyId.set(`${legacyId}::${legacySource}`, row)
    }

    try {
      const metadata = row.meta_data ? JSON.parse(row.meta_data) : null
      const legacyTaskCode = typeof metadata?.legacyTaskCode === 'string'
        ? metadata.legacyTaskCode.trim()
        : ''
      if (legacyTaskCode) {
        existingByLegacyTaskCode.set(legacyTaskCode, row)
      }
    } catch {
      // ignore malformed metadata on legacy rows
    }
  }

  let inserted = 0
  let updated = 0
  let skipped = 0

  for (const task of SELF_CARE_TASK_SEED_RESOURCES) {
    const existing = existingByLegacyId.get(`${task.legacyId}::${task.legacySource}`)
      || existingByLegacyTaskCode.get(task.legacyTaskCode)
      || null
    const metadataJson = JSON.stringify(task.metadata)

    if (!existing) {
      database.run(
        `
          INSERT INTO sys_training_resource (
            module_code, resource_type, name, category, description,
            cover_image, is_custom, is_active, legacy_id, legacy_source,
            meta_data, usage_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          'life_skills',
          'task_training',
          task.name,
          task.category,
          task.description || '',
          task.coverImage || '',
          0,
          1,
          task.legacyId,
          task.legacySource,
          metadataJson,
          0,
        ],
      )
      inserted += 1
      continue
    }

    if (mode === 'missing-only' || mode === 'preserve') {
      skipped += 1
      continue
    }

    database.run(
      `
        UPDATE sys_training_resource
        SET module_code = ?,
            resource_type = ?,
            name = ?,
            category = ?,
            description = ?,
            cover_image = ?,
            is_custom = 0,
            is_active = 1,
            legacy_id = ?,
            legacy_source = ?,
            meta_data = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        'life_skills',
        'task_training',
        task.name,
        task.category,
        task.description || '',
        task.coverImage || '',
        task.legacyId,
        task.legacySource,
        metadataJson,
        existing.id,
      ],
    )
    updated += 1
  }

  console.log('[InitDatabase] self-care task seed processed:', {
    mode,
    inserted,
    updated,
    skipped,
    totalTasks: SELF_CARE_TASK_SEED_SUMMARY.totalTasks,
    totalSteps: SELF_CARE_TASK_SEED_SUMMARY.totalSteps,
  })
}

// 插入初始数据
async function insertInitialData() {
  try {
    // 插入S-M量表年龄阶段
    db.run(`
      INSERT INTO sm_age_stage (name, age_min, age_max, description) VALUES
      ('6个月-1岁11个月', 6, 23, '婴儿期'),
      ('2岁-3岁5个月', 24, 41, '幼儿期早期'),
      ('3岁6个月-4岁11个月', 42, 59, '幼儿期晚期'),
      ('5岁-6岁5个月', 60, 77, '学龄前期早期'),
      ('6岁6个月-8岁5个月', 78, 101, '学龄前期晚期'),
      ('8岁6个月-10岁5个月', 102, 125, '学龄期早期'),
      ('10岁6个月以上', 126, 200, '学龄期晚期');
    `);

    // 插入WeeFIM量表分类
    db.run(`
      INSERT INTO weefim_category (name, description) VALUES
      ('自我照顾', '进食、梳洗修饰、洗澡、穿衣、如厕等日常生活能力'),
      ('括约肌控制', '排尿控制、排便控制'),
      ('转移', '床椅转移、轮椅转移、进出浴盆/淋浴间'),
      ('行走', '步行、使用轮椅'),
      ('沟通', '理解、表达能力'),
      ('社会认知', '社会交往、解决问题能力');
    `);

    // 插入训练任务分类（使用统一的6大分类）
    db.run(`
      INSERT INTO task_category (name, parent_id, description, icon) VALUES
      ('饮食技能', 0, '培养学生独立进食的能力，包括使用餐具、餐桌礼仪等', 'utensils'),
      ('穿着技能', 0, '培养学生独立穿脱衣物的能力，包括认识衣物、穿脱顺序等', 'tshirt'),
      ('如厕技能', 0, '培养学生独立如厕的能力，包括便后清洁、冲水等', 'toilet'),
      ('个人卫生', 0, '培养学生个人卫生习惯，包括洗手、洗脸、刷牙等', 'soap'),
      ('居家生活', 0, '培养学生居家生活能力，包括整理物品、开关门窗等', 'home'),
      ('社区生活', 0, '培养学生社区生活能力，包括安全过马路、购物等', 'users');
    `);

    // 插入默认管理员用户
    const { passwordHash: defaultPasswordHash, salt: defaultSalt } = await hashPasswordV1('admin123');
    db.run(`
      INSERT INTO user (username, password_hash, salt, role, name) VALUES
      ('admin', ?, ?, 'admin', '系统管理员');
    `, [defaultPasswordHash, defaultSalt]);

    // 插入系统默认配置
    db.run(`
      INSERT INTO system_config (key, value, description) VALUES
      ('system_name', '星愿能力发展训练系统', '系统名称'),
      ('system_version', '1.0.1', '系统版本'),
      ('login_theme_variant', 'classic-blue', '登录页主题预设'),
      ('theme_primary_color', '#4d8bbd', '登录页主色'),
      ('login_logo_path', '', '登录页 Logo'),
      ('brand_panel_description', '从能力基线到情绪感知，用智能化的数据记录，守护孩子点滴进步。', '登录页品牌说明'),
      ('auto_backup', 'true', '是否自动备份'),
      ('backup_interval', '7', '备份间隔（天）'),
      ('trial_days', '7', '试用天数');
    `);

    console.log('初始数据插入成功');
  } catch (error) {
    console.error('插入初始数据失败:', error);
    throw error;
  }
}

// 插入器材目录数据（Phase 1.4.3 重构：写入新表结构）
export async function insertEquipmentData(): Promise<void> {
  try {
    // 动态导入器材数据
    const { EQUIPMENT_DATA } = await import('./equipment-data')
    const existingRows = queryRows<{
      id: number
      name: string
      legacy_id: number | null
    }>(
      `
        SELECT id, name, legacy_id
        FROM sys_training_resource
        WHERE module_code = ?
          AND resource_type = ?
      `,
      ['sensory', 'equipment']
    )

    // 标签缓存：tagName -> tagId
    const tagMap = new Map<string, number>()
    const existingByName = new Map<string, number>()
    const existingByLegacyId = new Map<number, number>()
    let inserted = 0
    let updated = 0
    let tagLinks = 0

    for (const row of existingRows) {
      const id = Number(row.id || 0)
      const name = typeof row.name === 'string' ? row.name.trim() : ''
      const legacyId = Number(row.legacy_id || 0)

      if (id > 0 && name && !existingByName.has(name)) {
        existingByName.set(name, id)
      }

      if (id > 0 && legacyId > 0 && !existingByLegacyId.has(legacyId)) {
        existingByLegacyId.set(legacyId, id)
      }
    }

    // 第一步：同步 sys_training_resource 表
    // 使用序号作为 legacy_id（对应图片文件名：{category}-{id}.webp）
    let legacyIdCounter = 1
    for (const equipment of EQUIPMENT_DATA) {
      try {
        const existingId = existingByName.get(equipment.name) || existingByLegacyId.get(legacyIdCounter)
        let resourceId = Number(existingId || 0)

        if (resourceId > 0) {
          db.run(`
            UPDATE sys_training_resource
            SET module_code = ?, resource_type = ?, name = ?, category = ?, description = ?,
                cover_image = ?, is_custom = 0, is_active = ?, legacy_id = ?, legacy_source = ?, meta_data = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [
            'sensory',
            'equipment',
            equipment.name,
            equipment.category,
            equipment.description || '',
            equipment.image_url || '',
            equipment.is_active ?? 1,
            legacyIdCounter,
            'equipment_data',
            JSON.stringify({
              original_category: equipment.category,
              original_sub_category: equipment.sub_category
            }),
            resourceId,
          ])
          updated += 1
        } else {
          db.run(`
            INSERT INTO sys_training_resource (
              module_code, resource_type, name, category, description,
              cover_image, is_custom, is_active, legacy_id, legacy_source, meta_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            'sensory',
            'equipment',
            equipment.name,
            equipment.category,
            equipment.description || '',
            equipment.image_url || '',
            0,
            equipment.is_active ?? 1,
            legacyIdCounter,
            'equipment_data',
            JSON.stringify({
              original_category: equipment.category,
              original_sub_category: equipment.sub_category
            })
          ])

          resourceId = getLastInsertedRowId()
          if (!resourceId) {
            console.error(`[insertEquipmentData] 获取ID失败: ${equipment.name}`)
            continue
          }
          inserted += 1
        }

        existingByName.set(equipment.name, resourceId)
        existingByLegacyId.set(legacyIdCounter, resourceId)

        // 第二步：处理标签（sys_tags + sys_resource_tag_map）
        if (resourceId && equipment.ability_tags && equipment.ability_tags.length > 0) {
          for (const tagName of equipment.ability_tags) {
            try {
              // 生成标签唯一键
              const tagKey = `ability_${tagName}`

              // 获取或创建标签 ID
              let tagId = tagMap.get(tagKey)

              if (!tagId) {
                // 尝试从数据库获取
                const existingTag = db.get('SELECT id FROM sys_tags WHERE domain = ? AND name = ?', ['ability', tagName])

                if (existingTag) {
                  tagId = existingTag.id
                } else {
                  // 创建新标签
                  db.run('INSERT INTO sys_tags (domain, name, usage_count, is_preset) VALUES (?, ?, ?, ?)', ['ability', tagName, 0, 1])
                  tagId = getLastInsertedRowId()
                  if (!tagId) {
                    console.error(`[insertEquipmentData] 创建标签失败: ${tagName}`)
                    continue
                  }
                }

                // 缓存标签 ID
                if (tagId) {
                  tagMap.set(tagKey, tagId)
                }
              }

              // 第三步：创建资源-标签关联
              if (tagId) {
                db.run('INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id) VALUES (?, ?)', [resourceId, tagId])
                tagLinks += 1
              }
            } catch (tagError: any) {
              console.warn(`[insertEquipmentData] 处理标签失败 ${tagName}:`, tagError.message)
              // 继续处理下一个标签
            }
          }
        }
      } catch (insertError: any) {
        console.error(`[insertEquipmentData] 插入器材失败 ${equipment.name}:`, insertError.message)
        // 继续处理下一个器材
      } finally {
        legacyIdCounter++ // 无论成功或失败，都递增计数器
      }
    }

    console.log('[insertEquipmentData] 感官器材资源同步完成:', {
      total: EQUIPMENT_DATA.length,
      existing: existingRows.length,
      inserted,
      updated,
      tagLinks,
    })

    // 创建默认管理员账户
    await createDefaultAdminAccount(db)
  } catch (error) {
    console.error('插入器材数据失败:', error)
    throw error
  }
}

export async function insertEmotionalResourceData(): Promise<void> {
  try {
    const {
      EMOTIONAL_RESOURCE_SEED_LEGACY_SOURCE,
      EMOTIONAL_SEED_COUNTS,
      EMOTIONAL_SEED_RESOURCES,
    } = await import('./emotional-resource-data')

    const tagMap = new Map<string, number>()
    let inserted = 0
    let updated = 0

    const existingDemoSeedCount = Number(db.get(
      `SELECT COUNT(*) AS count
       FROM sys_training_resource
       WHERE module_code = ?
         AND resource_type IN ('emotion_scene', 'care_scene')
         AND legacy_source = 'emotional_demo_seed'`,
      ['emotional']
    )?.count || 0)

    if (existingDemoSeedCount > 0) {
      const demoSeedRows = queryRows<{ id: number }>(`
        SELECT id
        FROM sys_training_resource
        WHERE module_code = 'emotional'
          AND resource_type IN ('emotion_scene', 'care_scene')
          AND legacy_source = 'emotional_demo_seed'
      `)

      const demoSeedIds = demoSeedRows.map((row) => Number(row.id || 0)).filter((id) => id > 0)
      if (demoSeedIds.length > 0) {
        const placeholders = demoSeedIds.map(() => '?').join(', ')
        const linkedSessionCount = Number(db.get(
          `SELECT COUNT(*) AS count
           FROM emotional_training_session
           WHERE resource_id IN (${placeholders})`,
          demoSeedIds
        )?.count || 0)

        if (linkedSessionCount > 0) {
          console.warn('[InitDatabase] demo emotional resources already have session records, skip auto replacement.', {
            demoSeedCount: demoSeedIds.length,
            linkedSessionCount,
          })
          return
        }

        db.run(
          `DELETE FROM sys_resource_tag_map WHERE resource_id IN (${placeholders})`,
          demoSeedIds
        )
        db.run(
          `DELETE FROM sys_training_resource WHERE id IN (${placeholders})`,
          demoSeedIds
        )

        console.log('[InitDatabase] removed legacy emotional demo resources:', demoSeedIds.length)
      }
    }

    const existingRows = queryRows<{
      id: number
      resource_type: string
      name: string
      meta_data: string | null
    }>(`
      SELECT id, resource_type, name, meta_data
      FROM sys_training_resource
      WHERE module_code = 'emotional'
        AND resource_type IN ('emotion_scene', 'care_scene')
    `)

    const existingByStableKey = new Map<string, number>()
    const existingByName = new Map<string, number>()
    const rowsByStableKey = new Map<string, Array<{ id: number; resourceType: string; name: string }>>()

    const mergeDuplicateResourceIntoCanonical = (canonicalId: number, duplicateId: number) => {
      db.run(`
        INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id)
        SELECT ?, tag_id
        FROM sys_resource_tag_map
        WHERE resource_id = ?
      `, [canonicalId, duplicateId])

      db.run('UPDATE emotional_training_session SET resource_id = ? WHERE resource_id = ?', [canonicalId, duplicateId])
      db.run('UPDATE sys_plan_resource_map SET resource_id = ? WHERE resource_id = ?', [canonicalId, duplicateId])
      db.run('UPDATE sys_favorites SET resource_id = ? WHERE resource_id = ?', [canonicalId, duplicateId])
      db.run('DELETE FROM sys_resource_tag_map WHERE resource_id = ?', [duplicateId])
      db.run('DELETE FROM sys_favorites WHERE resource_id = ?', [duplicateId])
      db.run('DELETE FROM sys_training_resource WHERE id = ?', [duplicateId])
    }

    for (const row of existingRows) {
      const id = Number(row.id || 0)
      const resourceType = String(row.resource_type || '')
      const name = String(row.name || '')
      const metadataRaw = typeof row.meta_data === 'string' ? row.meta_data : ''

      if (!id || !resourceType || !name) {
        continue
      }

      existingByName.set(`${resourceType}:${name}`, id)

      if (!metadataRaw) {
        continue
      }

      try {
        const metadata = JSON.parse(metadataRaw) as { sceneCode?: string }
        const sceneCode = typeof metadata.sceneCode === 'string' ? metadata.sceneCode.trim() : ''
        if (!sceneCode) {
          continue
        }

        const stableKey = `${resourceType}:${sceneCode}`
        const bucket = rowsByStableKey.get(stableKey) || []
        bucket.push({ id, resourceType, name })
        rowsByStableKey.set(stableKey, bucket)
      } catch {
        // Ignore malformed metadata from unrelated rows.
      }
    }

    for (const [stableKey, rows] of rowsByStableKey.entries()) {
      const canonicalId = rows[0]?.id || 0
      if (!canonicalId) {
        continue
      }

      existingByStableKey.set(stableKey, canonicalId)

      for (const row of rows.slice(1)) {
        mergeDuplicateResourceIntoCanonical(canonicalId, row.id)
      }
    }

    for (const resource of EMOTIONAL_SEED_RESOURCES) {
      const sceneCode = typeof resource.metadata?.sceneCode === 'string'
        ? resource.metadata.sceneCode.trim()
        : ''
      const stableKey = sceneCode ? `${resource.resourceType}:${sceneCode}` : ''
      const existingId = (stableKey ? existingByStableKey.get(stableKey) : undefined)
        || existingByName.get(`${resource.resourceType}:${resource.name}`)

      let resourceId = Number(existingId || 0)
      let didInsert = false

      if (resourceId) {
        db.run(`
          UPDATE sys_training_resource
          SET module_code = ?, resource_type = ?, name = ?, category = ?, description = ?,
              cover_image = ?, is_custom = 0, is_active = 1, legacy_source = ?, meta_data = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          'emotional',
          resource.resourceType,
          resource.name,
          resource.category,
          resource.description,
          resource.coverImage || '',
          EMOTIONAL_RESOURCE_SEED_LEGACY_SOURCE,
          JSON.stringify(resource.metadata),
          resourceId,
        ])
        updated += 1
      } else {
        db.run(`
          INSERT INTO sys_training_resource (
            module_code, resource_type, name, category, description,
            cover_image, is_custom, is_active, legacy_source, meta_data, usage_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'emotional',
          resource.resourceType,
          resource.name,
          resource.category,
          resource.description,
          resource.coverImage || '',
          0,
          1,
          EMOTIONAL_RESOURCE_SEED_LEGACY_SOURCE,
          JSON.stringify(resource.metadata),
          0,
        ])

        resourceId = getLastInsertedRowId()
        didInsert = resourceId > 0
      }

      if (!resourceId) {
        continue
      }

      if (stableKey) {
        existingByStableKey.set(stableKey, resourceId)
      }
      existingByName.set(`${resource.resourceType}:${resource.name}`, resourceId)

      for (const tagName of resource.tags) {
        const tagKey = `ability:${tagName}`
        let tagId = tagMap.get(tagKey)

        if (!tagId) {
          const existingTag = db.get(
            'SELECT id FROM sys_tags WHERE domain = ? AND name = ?',
            ['ability', tagName]
          )

          if (existingTag?.id) {
            tagId = existingTag.id
          } else {
            db.run(
              'INSERT INTO sys_tags (domain, name, usage_count, is_preset) VALUES (?, ?, ?, ?)',
              ['ability', tagName, 0, 1]
            )
            tagId = getLastInsertedRowId()
          }

          if (tagId) {
            tagMap.set(tagKey, tagId)
          }
        }

        if (tagId) {
          db.run(
            'INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id) VALUES (?, ?)',
            [resourceId, tagId]
          )
        }
      }

      if (didInsert) {
        inserted += 1
      }
    }

    console.log('[InitDatabase] emotional default resources inserted:', {
      inserted,
      updated,
      emotionSceneCount: EMOTIONAL_SEED_COUNTS.emotionSceneCount,
      careSceneCount: EMOTIONAL_SEED_COUNTS.careSceneCount,
    })

  } catch (error) {
    console.error('failed to insert emotional default resources:', error)
    throw error
  }
}

export async function insertEmotionalGameResourceData(): Promise<void> {
  try {
    const {
      ALL_CUSTOM_GAME_RESOURCE_SEED,
      EMOTIONAL_GAME_RESOURCE_SEED_LEGACY_SOURCE,
    } = await import('../data/emotional-game-catalog')

    const existingRows = queryRows<{
      id: number
      name: string
      meta_data: string | null
    }>(`
      SELECT id, name, meta_data
      FROM sys_training_resource
      WHERE module_code = 'emotional'
        AND resource_type = 'game'
    `)

    const existingByGameCode = new Map<string, number>()
    const existingByName = new Map<string, number>()

    const tagMap = new Map<string, number>()
    let inserted = 0
    let updated = 0

    for (const row of existingRows) {
      const id = Number(row.id || 0)
      const name = typeof row.name === 'string' ? row.name.trim() : ''
      const metadataRaw = typeof row.meta_data === 'string' ? row.meta_data : ''

      if (id > 0 && name) {
        existingByName.set(name, id)
      }

      if (!metadataRaw) {
        continue
      }

      try {
        const metadata = JSON.parse(metadataRaw) as { gameCode?: string }
        const gameCode = typeof metadata.gameCode === 'string' ? metadata.gameCode.trim() : ''
        if (gameCode) {
          existingByGameCode.set(gameCode, id)
        }
      } catch {
        // Ignore malformed metadata.
      }
    }

    const ensureAbilityTagId = (tagName: string): number | null => {
      const tagKey = `ability:${tagName}`
      const cached = tagMap.get(tagKey)
      if (cached) {
        return cached
      }

      const existingTag = db.get(
        'SELECT id FROM sys_tags WHERE domain = ? AND name = ?',
        ['ability', tagName]
      )

      if (existingTag?.id) {
        tagMap.set(tagKey, existingTag.id)
        return existingTag.id
      }

      db.run(
        'INSERT INTO sys_tags (domain, name, usage_count, is_preset) VALUES (?, ?, ?, ?)',
        ['ability', tagName, 0, 1]
      )

      const tagId = getLastInsertedRowId()
      if (!tagId) {
        return null
      }

      tagMap.set(tagKey, tagId)
      return tagId
    }

    for (const resource of ALL_CUSTOM_GAME_RESOURCE_SEED) {
      const gameCode = typeof resource.metadata?.gameCode === 'string'
        ? resource.metadata.gameCode.trim()
        : ''
      const existingId = (gameCode ? existingByGameCode.get(gameCode) : undefined)
        || existingByName.get(resource.name)

      let resourceId = Number(existingId || 0)
      let didInsert = false

      if (resourceId) {
        db.run(`
          UPDATE sys_training_resource
          SET module_code = ?, resource_type = ?, name = ?, category = ?, description = ?,
              cover_image = ?, is_custom = 0, is_active = 1, legacy_source = ?, meta_data = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          'emotional',
          'game',
          resource.name,
          resource.category,
          resource.description,
          resource.coverImage || '',
          EMOTIONAL_GAME_RESOURCE_SEED_LEGACY_SOURCE,
          JSON.stringify(resource.metadata),
          resourceId,
        ])
        updated += 1
      } else {
        db.run(`
          INSERT INTO sys_training_resource (
            module_code, resource_type, name, category, description,
            cover_image, is_custom, is_active, legacy_source, meta_data, usage_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'emotional',
          'game',
          resource.name,
          resource.category,
          resource.description,
          resource.coverImage || '',
          0,
          1,
          EMOTIONAL_GAME_RESOURCE_SEED_LEGACY_SOURCE,
          JSON.stringify(resource.metadata),
          0,
        ])

        resourceId = getLastInsertedRowId()
        didInsert = resourceId > 0
      }

      if (!resourceId) {
        continue
      }

      if (gameCode) {
        existingByGameCode.set(gameCode, resourceId)
      }
      existingByName.set(resource.name, resourceId)

      for (const tagName of resource.tags) {
        const tagId = ensureAbilityTagId(tagName)
        if (!tagId) {
          continue
        }

        db.run(
          'INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id) VALUES (?, ?)',
          [resourceId, tagId]
        )
      }

      if (didInsert) {
        inserted += 1
      }
    }

    console.log('[InitDatabase] emotional regulation game resources synced:', {
      inserted,
      updated,
      total: ALL_CUSTOM_GAME_RESOURCE_SEED.length,
    })
  } catch (error) {
    console.error('failed to insert emotional regulation game resources:', error)
    throw error
  }
}

export async function insertPhysicalEquipmentResourceData(): Promise<void> {
  try {
    const {
      PHYSICAL_EQUIPMENT_SEED_LEGACY_SOURCE,
      PHYSICAL_EQUIPMENT_SEED_RESOURCES,
      PHYSICAL_EQUIPMENT_SEED_SUMMARY,
    } = await import('./physical-equipment-data')

    const existingRows = queryRows<{
      id: number
      module_code: string
      name: string
      category: string | null
      legacy_source: string | null
      meta_data: string | null
    }>(`
      SELECT id, module_code, name, category, legacy_source, meta_data
      FROM sys_training_resource
      WHERE resource_type = 'equipment'
        AND module_code IN ('sensory', 'emotional', 'social', 'life_skills', 'cognitive')
    `)

    const existingByCode = new Map<string, number>()
    const existingByName = new Map<string, number>()
    const tagMap = new Map<string, number>()
    const rowsByCode = new Map<string, Array<{
      id: number
      moduleCode: string
      name: string
      category: string
      metadataRaw: string
    }>>()

    const mergeDuplicateResourceIntoCanonical = (canonicalId: number, duplicateId: number) => {
      db.run(`
        INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id)
        SELECT ?, tag_id
        FROM sys_resource_tag_map
        WHERE resource_id = ?
      `, [canonicalId, duplicateId])

      db.run('UPDATE equipment_training_records SET equipment_id = ? WHERE equipment_id = ?', [canonicalId, duplicateId])
      db.run('UPDATE sys_plan_resource_map SET resource_id = ? WHERE resource_id = ?', [canonicalId, duplicateId])
      db.run('UPDATE sys_favorites SET resource_id = ? WHERE resource_id = ?', [canonicalId, duplicateId])
      db.run('DELETE FROM sys_resource_tag_map WHERE resource_id = ?', [duplicateId])
      db.run('DELETE FROM sys_favorites WHERE resource_id = ?', [duplicateId])
      db.run('DELETE FROM sys_training_resource WHERE id = ?', [duplicateId])
    }

    for (const row of existingRows) {
      const id = Number(row.id || 0)
      const moduleCode = String(row.module_code || '')
      const name = String(row.name || '')
      const category = typeof row.category === 'string' ? String(row.category) : ''
      const metadataRaw = typeof row.meta_data === 'string' ? row.meta_data : ''

      if (id > 0 && moduleCode && name) {
        existingByName.set(`${moduleCode}:${category}:${name}`, id)
      }

      if (!metadataRaw) {
        continue
      }

      try {
        const metadata = JSON.parse(metadataRaw) as { resourceCode?: string }
        const resourceCode = typeof metadata.resourceCode === 'string' ? metadata.resourceCode.trim() : ''
        if (resourceCode) {
          const bucket = rowsByCode.get(resourceCode) || []
          bucket.push({
            id,
            moduleCode,
            name,
            category,
            metadataRaw,
          })
          rowsByCode.set(resourceCode, bucket)
        }
      } catch {
        // Ignore malformed metadata from unrelated resources.
      }
    }

    for (const [resourceCode, rows] of rowsByCode.entries()) {
      if (rows.length === 0) {
        continue
      }

      let canonicalId = rows[0]?.id || 0
      let canonicalScore = -1

      for (const row of rows) {
        const tagCount = Number(db.get('SELECT COUNT(*) AS count FROM sys_resource_tag_map WHERE resource_id = ?', [row.id])?.count || 0)
        const score = tagCount * 10 + row.id
        if (score > canonicalScore) {
          canonicalId = row.id
          canonicalScore = score
        }
      }

      if (!canonicalId) {
        continue
      }

      existingByCode.set(resourceCode, canonicalId)

      for (const row of rows) {
        if (row.id === canonicalId) {
          existingByName.set(`${row.moduleCode}:${row.category}:${row.name}`, row.id)
          continue
        }

        mergeDuplicateResourceIntoCanonical(canonicalId, row.id)
      }
    }

    const ensureTag = (tagName: string): number | null => {
      const cacheKey = `ability:${tagName}`
      const cachedId = tagMap.get(cacheKey)
      if (cachedId) {
        return cachedId
      }

      const existingTag = db.get(
        'SELECT id FROM sys_tags WHERE domain = ? AND name = ?',
        ['ability', tagName]
      )

      let tagId = existingTag?.id ? Number(existingTag.id) : 0
      if (!tagId) {
        db.run(
          'INSERT INTO sys_tags (domain, name, usage_count, is_preset) VALUES (?, ?, ?, ?)',
          ['ability', tagName, 0, 1]
        )
        tagId = getLastInsertedRowId()
      }

      if (tagId) {
        tagMap.set(cacheKey, tagId)
        return tagId
      }

      return null
    }

    const attachTags = (resourceId: number, tags: string[]) => {
      for (const tagName of tags) {
        const tagId = ensureTag(tagName)
        if (!tagId) {
          continue
        }

        db.run(
          'INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id) VALUES (?, ?)',
          [resourceId, tagId]
        )
      }
    }

    let inserted = 0
    let linked = 0

    for (const resource of PHYSICAL_EQUIPMENT_SEED_RESOURCES) {
      const resourceCode = resource.metadata.resourceCode
      const existingId = existingByCode.get(resourceCode) || existingByName.get(`${resource.moduleCode}:${resource.category}:${resource.name}`)

      if (existingId) {
        if (!existingByCode.has(resourceCode)) {
          db.run(`
            UPDATE sys_training_resource
            SET module_code = ?, resource_type = ?, category = ?, description = ?,
                is_custom = 0, is_active = 1, legacy_source = ?, meta_data = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [
            resource.moduleCode,
            resource.resourceType,
            resource.category,
            resource.description,
            PHYSICAL_EQUIPMENT_SEED_LEGACY_SOURCE,
            JSON.stringify(resource.metadata),
            existingId,
          ])
          existingByCode.set(resourceCode, existingId)
          linked += 1
        }

        attachTags(existingId, resource.tags)
        continue
      }

      db.run(`
        INSERT INTO sys_training_resource (
          module_code, resource_type, name, category, description,
          cover_image, is_custom, is_active, legacy_source, meta_data, usage_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        resource.moduleCode,
        resource.resourceType,
        resource.name,
        resource.category,
        resource.description,
        resource.coverImage || '',
        0,
        1,
        PHYSICAL_EQUIPMENT_SEED_LEGACY_SOURCE,
        JSON.stringify(resource.metadata),
        0,
      ])

      const resourceId = getLastInsertedRowId()
      if (!resourceId) {
        continue
      }

      existingByCode.set(resourceCode, resourceId)
      existingByName.set(`${resource.moduleCode}:${resource.category}:${resource.name}`, resourceId)
      attachTags(resourceId, resource.tags)
      inserted += 1
    }

    console.log('[InitDatabase] physical-equipment seed processed:', {
      inserted,
      linked,
      totalCount: PHYSICAL_EQUIPMENT_SEED_SUMMARY.totalCount,
      byDomain: PHYSICAL_EQUIPMENT_SEED_SUMMARY.byDomain,
      byModule: PHYSICAL_EQUIPMENT_SEED_SUMMARY.byModule,
    })
  } catch (error) {
    console.error('failed to insert physical-equipment resources:', error)
    throw error
  }
}

/**
 * 迁移器材数据的 legacy_id（修复现有数据库）
 *
 * 对于已存在的数据库，更新 sys_training_resource 表中的 legacy_id 字段
 * legacy_id 对应图片文件名：{category}-{legacy_id}.webp
 */
export async function migrateEquipmentLegacyIds(): Promise<{ success: boolean; updated: number }> {
  try {
    // 动态导入器材数据
    const { EQUIPMENT_DATA } = await import('./equipment-data')

    let updated = 0

    // 遍历器材数据，按名称匹配并更新 legacy_id
    for (let i = 0; i < EQUIPMENT_DATA.length; i++) {
      const equipment = EQUIPMENT_DATA[i]
      if (!equipment) {
        continue
      }
      const legacyId = i + 1 // 从 1 开始

      // 检查是否存在且 legacy_id 为空
      const existing = db.get(
        'SELECT id FROM sys_training_resource WHERE name = ? AND resource_type = ? AND (legacy_id IS NULL OR legacy_id = 0)',
        [equipment.name, 'equipment']
      )

      if (existing) {
        db.run(
          'UPDATE sys_training_resource SET legacy_id = ?, category = ?, legacy_source = ? WHERE id = ?',
          [legacyId, equipment.category, 'equipment_data', existing.id]
        )
        updated++
      }
    }

    console.log(`✅ 器材 legacy_id 迁移完成: 更新了 ${updated} 条记录`)
    return { success: true, updated }
  } catch (error) {
    console.error('器材 legacy_id 迁移失败:', error)
    return { success: false, updated: 0 }
  }
}

/**
 * 创建默认管理员账户
 */
async function createDefaultAdminAccount(database: any): Promise<void> {
  try {
    // 检查是否已有管理员
    const existingAdmin = database.get('SELECT id FROM user WHERE username = ?', ['admin'])
    if (existingAdmin) {
      console.log('[InitDatabase] 管理员账户已存在，跳过创建')
      return
    }

    // 检查 user 表是否存在
    const tableExists = database.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='user'")
    if (!tableExists || tableExists.length === 0) {
      console.warn('[InitDatabase] user 表不存在，跳过创建管理员账户')
      return
    }

    // 创建默认管理员账户
    const { passwordHash: hashedPassword, salt } = await hashPasswordV1('admin123')

    database.run(`
      INSERT INTO user (username, password_hash, salt, name, role)
      VALUES (?, ?, ?, ?, ?)
    `, ['admin', hashedPassword, salt, '系统管理员', 'admin'])

    console.log('[InitDatabase] ✅ 默认管理员账户已创建 (用户名: admin, 密码: admin123)')
  } catch (error: any) {
    console.warn('[InitDatabase] 创建默认管理员账户失败:', error.message)
  }
}

// 获取数据库实例
export function getDatabase(): any {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()');
  }
  return db;
}

// 导出数据库
export async function exportDatabase(): Promise<Uint8Array> {
  if (!db) {
    throw new Error('数据库未初始化');
  }
  return db.export();
}

// 导入数据库
export async function importDatabase(data: Uint8Array): Promise<void> {
  try {
    if (db) {
      db.close();
    }
    db = new SQL.Database(data);
    console.log('数据库导入成功');
  } catch (error) {
    console.error('数据库导入失败:', error);
    throw error;
  }
}

// ========== 数据库迁移功能 ==========

/**
 * 手动迁移 report_record 表约束
 * 同步支持最新 report_type，并移除错误的 assess_id -> sm_assess 外键
 */
export async function migrateReportRecordConstraintsManually(): Promise<{ success: boolean; message: string }> {
  const { migrateReportRecordConstraints, needsMigration } = await import('./migrate-report-constraints')

  if (!needsMigration()) {
    return {
      success: true,
      message: '数据库约束已是最新版本，无需迁移。'
    }
  }

  return await migrateReportRecordConstraints()
}

/**
 * Phase 1.5: 数据迁移验证
 * 验证 equipment_catalog -> sys_training_resource 迁移的正确性
 */
export async function verifyMigration(): Promise<{ success: boolean; message: string; report?: string }> {
  const { verifyMigration: doVerifyMigration, formatVerificationReport } = await import('./migration/migration-verification')

  try {
    const db = getDatabase()
    const report = doVerifyMigration(db)
    const formattedReport = formatVerificationReport(report)

    return {
      success: report.passed,
      message: report.passed ? '数据迁移验证通过' : '数据迁移验证失败',
      report: formattedReport
    }
  } catch (error: any) {
    return {
      success: false,
      message: `验证失败: ${error.message}`
    }
  }
}

/**
 * Phase 1.5: 双写模式开关
 * 仅在开发环境用于验证新旧系统数据一致性
 */
export async function enableDualWrite(enabled: boolean): Promise<{ success: boolean; message: string }> {
  if (import.meta.env.PROD) {
    return {
      success: false,
      message: '生产环境不支持双写模式'
    }
  }

  // 这里可以设置全局标志或存储到 localStorage
  // 实际实现需要根据项目架构调整
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('VITE_DUAL_WRITE', enabled.toString())
  }

  return {
    success: true,
    message: `双写模式已${enabled ? '启用' : '禁用'}`
  }
}

/**
 * Phase 1.5: 检查双写模式是否启用
 */
export function isDualWriteEnabled(): boolean {
  if (import.meta.env.PROD) {
    return false
  }

  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('VITE_DUAL_WRITE') === 'true'
  }

  return false
}

// ========== 班级管理模块初始化 ==========

/**
 * 检查表中的列是否存在
 * 使用 PRAGMA table_info 查询表结构
 *
 * sql.js exec() 返回格式: [{ columns: [...], values: [[cid, name, type, ...], ...] }]
 * 每个 values 元素是 [cid, name, type, notnull, dflt_value, pk]
 */
function tableExists(database: any, tableName: string): boolean {
  try {
    let row: any = null

    if (database && typeof database.get === 'function') {
      row = database.get(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
        [tableName]
      )
    } else if (database && typeof database.prepare === 'function') {
      const stmt = database.prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`
      )
      try {
        stmt.bind([tableName])
        if (stmt.step()) {
          row = stmt.getAsObject()
        }
      } finally {
        stmt.free()
      }
    }

    return typeof row?.name === 'string' && row.name === tableName
  } catch (error) {
    console.warn(`[InitDatabase] 检查表失败: ${tableName} - ${error}`)
    return false
  }
}

function columnExists(database: any, tableName: string, columnName: string): boolean {
  try {
    const result = database.exec(`PRAGMA table_info(${tableName})`)
    // sql.js 返回的是结果对象数组，每个结果有 values 属性
    if (result && result.length > 0 && result[0]?.values) {
      // result[0].values 是一个二维数组，每个子数组代表一行的列信息
      // 行格式: [cid, name, type, notnull, dflt_value, pk]
      // 我们需要检查索引 1 (name) 是否等于目标列名
      for (const row of result[0].values) {
        if (Array.isArray(row) && row[1] === columnName) {
          return true
        }
      }
    }
    return false
  } catch (error) {
    console.warn(`[ClassTables] 检查列失败: ${tableName}.${columnName} - ${error}`)
    return false
  }
}

/**
 * 安全执行 ALTER TABLE ADD COLUMN
 * 先检查列是否存在，避免重复添加错误
 *
 * 健壮性增强：
 * - 即使 columnExists 返回 false，也在 try-catch 中执行 ALTER TABLE
 * - 捕获 duplicate column 错误时静默忽略（可能由并发或检查失败导致）
 */
function safeAddColumn(database: any, tableName: string, columnDef: string): void {
  // columnDef 格式: "column_name TEXT" 或 "column_id INTEGER"
  const parts = columnDef.trim().split(/\s+/)
  const columnName = parts[0] || ''

  if (!columnName) {
    console.warn(`[ClassTables] 无法解析列定义，跳过: ${tableName} -> ${columnDef}`)
    return
  }

  const exists = columnExists(database, tableName, columnName)

  if (exists) {
    console.log(`[ClassTables] 列已存在，跳过: ${tableName}.${columnName}`)
    return
  }

  // 即使检查返回不存在，也要在 try-catch 中执行
  // 处理可能的竞态条件或检查失败的情况
  try {
    database.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`)
    console.log(`[ClassTables] 添加列: ${tableName}.${columnName}`)
  } catch (error: any) {
    // duplicate column 错误说明列已经存在，静默忽略
    if (error.message.includes('duplicate column') ||
        error.message.includes('duplicate column name')) {
      console.log(`[ClassTables] 列已存在（由错误检测）: ${tableName}.${columnName}`)
    } else {
      // 其他错误才输出警告
      console.warn(`[ClassTables] 添加列失败: ${tableName}.${columnName} - ${error.message}`)
    }
  }
}

function tableSqlContains(database: any, tableName: string, expectedSqlFragment: string): boolean {
  try {
    let row: any = null

    if (database && typeof database.get === 'function') {
      row = database.get(
        `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`,
        [tableName]
      )
    } else if (database && typeof database.prepare === 'function') {
      const stmt = database.prepare(
        `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`
      )
      try {
        stmt.bind([tableName])
        if (stmt.step()) {
          row = stmt.getAsObject()
        }
      } finally {
        stmt.free()
      }
    }

    return typeof row?.sql === 'string' && row.sql.includes(expectedSqlFragment)
  } catch (error) {
    console.warn(`[InitDatabase] 检查表结构失败: ${tableName} - ${error}`)
    return false
  }
}

function migrateEquipmentTrainingRecordResourceForeignKey(rawDb: any): void {
  if (!tableSqlContains(rawDb, 'equipment_training_records', 'REFERENCES equipment_catalog(id)')) {
    return
  }

  console.log('[InitDatabase] 检测到 equipment_training_records 仍引用旧 equipment_catalog 外键，开始重建表结构...')

  rawDb.run('PRAGMA foreign_keys = OFF')

  try {
    rawDb.run('DROP TABLE IF EXISTS equipment_training_records_new')
    rawDb.run(`
      CREATE TABLE equipment_training_records_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        equipment_id INTEGER NOT NULL,
        entry_code TEXT,
        score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
        prompt_level INTEGER NOT NULL CHECK(prompt_level BETWEEN 1 AND 5),
        duration_seconds INTEGER,
        notes TEXT,
        generated_comment TEXT,
        training_date TEXT NOT NULL,
        teacher_name TEXT,
        environment TEXT,
        batch_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        class_id INTEGER,
        class_name TEXT,
        module_code TEXT DEFAULT 'sensory',
        FOREIGN KEY (student_id) REFERENCES student(id),
        FOREIGN KEY (equipment_id) REFERENCES sys_training_resource(id)
      )
    `)

    rawDb.run(`
      INSERT INTO equipment_training_records_new (
        id,
        student_id,
        equipment_id,
        entry_code,
        score,
        prompt_level,
        duration_seconds,
        notes,
        generated_comment,
        training_date,
        teacher_name,
        environment,
        batch_id,
        created_at,
        class_id,
        class_name,
        module_code
      )
      SELECT
        id,
        student_id,
        equipment_id,
        entry_code,
        score,
        prompt_level,
        duration_seconds,
        notes,
        generated_comment,
        training_date,
        teacher_name,
        environment,
        batch_id,
        created_at,
        class_id,
        class_name,
        COALESCE(module_code, 'sensory')
      FROM equipment_training_records
    `)

    rawDb.run('DROP TABLE equipment_training_records')
    rawDb.run('ALTER TABLE equipment_training_records_new RENAME TO equipment_training_records')
    rawDb.run('CREATE INDEX IF NOT EXISTS idx_equipment_training_student ON equipment_training_records(student_id)')
    rawDb.run('CREATE INDEX IF NOT EXISTS idx_equipment_training_date ON equipment_training_records(training_date)')
    rawDb.run('CREATE INDEX IF NOT EXISTS idx_equipment_training_equipment ON equipment_training_records(equipment_id)')
    rawDb.run('CREATE INDEX IF NOT EXISTS idx_equipment_training_batch ON equipment_training_records(batch_id)')
    rawDb.run('CREATE INDEX IF NOT EXISTS idx_equipment_training_entry_code ON equipment_training_records(entry_code)')

    console.log('[InitDatabase] equipment_training_records 外键迁移完成')
  } finally {
    rawDb.run('PRAGMA foreign_keys = ON')
  }
}

function initializeTrainingSessionTables(rawDb: any): void {
  rawDb.run(`
    CREATE TABLE IF NOT EXISTS training_session (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      module_code TEXT NOT NULL,
      entry_code TEXT NOT NULL,
      session_family TEXT NOT NULL,
      resource_id INTEGER,
      resource_type TEXT,
      task_id INTEGER,
      task_name_snapshot TEXT,
      class_id INTEGER,
      class_name TEXT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      completion_status TEXT NOT NULL DEFAULT 'completed'
        CHECK(completion_status IN ('completed', 'cancelled', 'interrupted', 'aborted')),
      accuracy_rate REAL
        CHECK(accuracy_rate IS NULL OR accuracy_rate BETWEEN 0 AND 1),
      avg_response_time_ms INTEGER,
      summary_payload TEXT,
      source_table TEXT NOT NULL,
      source_record_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student(id),
      FOREIGN KEY (task_id) REFERENCES task(id)
    )
  `)

  // 修复潜在的半成品本地 schema：约束收紧通过 CREATE TABLE 兜底，
  // 缺失列则用保守定义补齐，避免旧库因实验性结构导致初始化失败。
  const requiredColumns = [
    { name: 'module_code', definition: 'module_code TEXT' },
    { name: 'entry_code', definition: 'entry_code TEXT' },
    { name: 'session_family', definition: 'session_family TEXT' },
    { name: 'resource_id', definition: 'resource_id INTEGER' },
    { name: 'resource_type', definition: 'resource_type TEXT' },
    { name: 'task_id', definition: 'task_id INTEGER' },
    { name: 'task_name_snapshot', definition: 'task_name_snapshot TEXT' },
    { name: 'class_id', definition: 'class_id INTEGER' },
    { name: 'class_name', definition: 'class_name TEXT' },
    { name: 'started_at', definition: 'started_at TEXT' },
    { name: 'ended_at', definition: 'ended_at TEXT' },
    { name: 'duration_ms', definition: 'duration_ms INTEGER DEFAULT 0' },
    { name: 'completion_status', definition: 'completion_status TEXT DEFAULT "completed"' },
    { name: 'accuracy_rate', definition: 'accuracy_rate REAL' },
    { name: 'avg_response_time_ms', definition: 'avg_response_time_ms INTEGER' },
    { name: 'summary_payload', definition: 'summary_payload TEXT' },
    { name: 'source_table', definition: 'source_table TEXT' },
    { name: 'source_record_id', definition: 'source_record_id INTEGER' },
    { name: 'created_at', definition: 'created_at TEXT DEFAULT CURRENT_TIMESTAMP' },
    { name: 'updated_at', definition: 'updated_at TEXT DEFAULT CURRENT_TIMESTAMP' },
  ]

  for (const column of requiredColumns) {
    if (!columnExists(rawDb, 'training_session', column.name)) {
      safeAddColumn(rawDb, 'training_session', column.definition)
    }
  }

  const indexStatements = [
    'CREATE INDEX IF NOT EXISTS idx_training_session_student_started ON training_session(student_id, started_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_training_session_module_entry_started ON training_session(module_code, entry_code, started_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_training_session_family_started ON training_session(session_family, started_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_training_session_completion_started ON training_session(completion_status, started_at DESC)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_training_session_source_record ON training_session(source_table, source_record_id)',
  ]

  for (const statement of indexStatements) {
    try {
      rawDb.run(statement)
    } catch (error: any) {
      console.warn('[InitDatabase] training_session 索引创建警告:', error.message)
    }
  }
}

function getCurrentAcademicYearString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

function getNextAcademicYearString(): string {
  const currentAcademicYear = getCurrentAcademicYearString()
  const [startYear] = currentAcademicYear.split('-').map(Number)
  const safeStartYear = startYear || new Date().getFullYear()
  return `${safeStartYear + 1}-${safeStartYear + 2}`
}

function deriveAcademicYearBounds(academicYear: string): { startDate: string; endDate: string } | null {
  const match = academicYear.match(/^(\d{4})-(\d{4})$/)
  if (!match) {
    return null
  }

  const startYear = Number(match[1])
  const endYear = Number(match[2])
  if (endYear !== startYear + 1) {
    return null
  }

  return {
    startDate: `${startYear}-09-01`,
    endDate: `${endYear}-08-31`
  }
}

function extractAcademicYearsFromTable(rawDb: any, tableName: string): string[] {
  try {
    const result = rawDb.exec(`SELECT DISTINCT academic_year FROM ${tableName} WHERE academic_year IS NOT NULL`)
    if (!Array.isArray(result) || result.length === 0) {
      return []
    }

    return (result[0]?.values || [])
      .map((row: any[]) => String(row[0] || '').trim())
      .filter((value: string) => value.length > 0)
  } catch {
    return []
  }
}

function syncAcademicYearTable(rawDb: any): void {
  const currentAcademicYear = getCurrentAcademicYearString()
  const seedYears = new Set<string>([
    currentAcademicYear,
    getNextAcademicYearString(),
    ...extractAcademicYearsFromTable(rawDb, 'sys_class'),
    ...extractAcademicYearsFromTable(rawDb, 'student_class_history')
  ])

  for (const academicYear of seedYears) {
    const bounds = deriveAcademicYearBounds(academicYear)
    if (!bounds) {
      continue
    }

    rawDb.run(`
      INSERT INTO sys_academic_year (academic_year, start_date, end_date, is_active)
      VALUES (?, ?, ?, 0)
      ON CONFLICT(academic_year) DO NOTHING
    `, [academicYear, bounds.startDate, bounds.endDate])
  }

  const activeResult = rawDb.exec('SELECT COUNT(*) FROM sys_academic_year WHERE is_active = 1')
  const activeCount = Number(activeResult?.[0]?.values?.[0]?.[0] || 0)

  if (activeCount === 0) {
    rawDb.run('UPDATE sys_academic_year SET is_active = 0')
    rawDb.run('UPDATE sys_academic_year SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE academic_year = ?', [currentAcademicYear])
  }
}

/**
 * 初始化系统表结构
 *
 * Phase: 系统表
 * 说明: 执行 sys-tables.sql 创建系统表（user、sys_training_resource 等）
 * 注意:
 *   - rawDb: 原始 sql.js Database 对象（不经过 SQLWrapper）
 *   - DDL 语句会自动提交事务，不能包裹在 BEGIN/COMMIT 中
 *
 * @param rawDb 原始的 sql.js Database 对象
 */
async function initializeSysTables(rawDb: any): Promise<void> {
  console.log('[SysTables] 开始初始化系统表结构...')

  // 使用内联 SQL，避免动态导入问题
  const statements: string[] = sysTablesSQL
    .split(';')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0 && !s.startsWith('--'))

  // 执行所有 SQL 语句
  for (const statement of statements) {
    try {
      rawDb.run(statement)
    } catch (error: any) {
      // 忽略"已存在"和事务相关错误
      if (!error.message.includes('already exists') &&
          !error.message.includes('duplicate') &&
          !error.message.includes('no transaction')) {
        console.warn('[SysTables] SQL 执行警告:', error.message)
      }
    }
  }

  console.log('[SysTables] 系统表结构初始化完成')
}

/**
 * 初始化班级管理表结构
 *
 * Phase: 班级管理模块
 * 说明: 执行 class-schema.sql 创建班级相关表、触发器、视图
 * 注意:
 *   - rawDb: 原始 sql.js Database 对象（不经过 SQLWrapper）
 *   - DDL 语句会自动提交事务，不能包裹在 BEGIN/COMMIT 中
 *   - ALTER TABLE 需要检查列是否存在，避免重复添加
 *
 * @param rawDb 原始的 sql.js Database 对象
 */
async function initializeEmotionalTables(rawDb: any): Promise<void> {
  ensureCustomGamePhase0Schema(rawDb)
  rawDb.run(emotionalSchemaSQL)
  await initializeTeachingMaterialTables(rawDb)
  clearLegacyTeachingMaterialData(rawDb)
}

/**
 * Phase 0 正式迁移：把小游戏记录表从情绪专用旧约束升级为跨入口 custom game 底座。
 * 当前仍沿用 game_emotion_records / student_badges 表名，但不再为单个新游戏做 ad-hoc rebuild。
 */
export function ensureCustomGamePhase0Schema(rawDb: any): void {
  ensureGameEmotionRecordsPhase0(rawDb)
  ensureGameSessionParticipantsPhase0(rawDb)
  ensureStudentBadgesPhase0(rawDb)
}

function ensureGameEmotionRecordsPhase0(rawDb: any): void {
  if (!tableExists(rawDb, 'game_emotion_records')) {
    rawDb.run(`
      CREATE TABLE IF NOT EXISTS game_emotion_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        game_code TEXT NOT NULL
          CHECK(game_code GLOB '[A-Z][0-9][0-9]_*'),
        start_time TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        difficulty_level INTEGER DEFAULT 1
          CHECK(difficulty_level IN (1, 2, 3)),
        completion_status TEXT NOT NULL
          CHECK(completion_status IN ('completed', 'aborted')),
        performance_data TEXT,
        session_group_id TEXT,
        exit_trigger TEXT
          CHECK(exit_trigger IN ('game_complete', 'user_exit', 'teacher_exit', 'timer_end', 'system_interrupt') OR exit_trigger IS NULL),
        session_participants TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES student(id)
      )
    `)
  } else {
    migrateGameEmotionRecordsPhase0(rawDb)
  }

  rawDb.run('CREATE INDEX IF NOT EXISTS idx_game_emotion_records_student ON game_emotion_records(student_id, created_at DESC)')
  rawDb.run('CREATE INDEX IF NOT EXISTS idx_game_emotion_records_code ON game_emotion_records(game_code, created_at DESC)')
  rawDb.run('CREATE INDEX IF NOT EXISTS idx_game_emotion_records_group ON game_emotion_records(session_group_id, created_at DESC)')
}

function ensureGameSessionParticipantsPhase0(rawDb: any): void {
  rawDb.run(`
    CREATE TABLE IF NOT EXISTS game_session_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_group_id TEXT NOT NULL,
      student_id INTEGER NOT NULL,
      role TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student(id)
    )
  `)
  rawDb.run('CREATE INDEX IF NOT EXISTS idx_game_session_participants_student ON game_session_participants(student_id, created_at DESC)')
  rawDb.run('CREATE INDEX IF NOT EXISTS idx_game_session_participants_group ON game_session_participants(session_group_id, student_id)')
}

function ensureStudentBadgesPhase0(rawDb: any): void {
  if (!tableExists(rawDb, 'student_badges')) {
    rawDb.run(`
      CREATE TABLE IF NOT EXISTS student_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        badge_code TEXT NOT NULL,
        badge_name TEXT NOT NULL,
        game_code TEXT NOT NULL
          CHECK(game_code GLOB '[A-Z][0-9][0-9]_*'),
        unlock_count INTEGER DEFAULT 1,
        first_earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, badge_code),
        FOREIGN KEY (student_id) REFERENCES student(id)
      )
    `)
  } else {
    migrateStudentBadgesPhase0(rawDb)
  }

  rawDb.run('CREATE INDEX IF NOT EXISTS idx_student_badges_student ON student_badges(student_id, last_earned_at DESC)')
}

function migrateGameEmotionRecordsPhase0(rawDb: any): void {
  const hasSessionGroupId = columnExists(rawDb, 'game_emotion_records', 'session_group_id')
  const hasExitTrigger = columnExists(rawDb, 'game_emotion_records', 'exit_trigger')
  const hasSessionParticipants = columnExists(rawDb, 'game_emotion_records', 'session_participants')
  const usesLegacyGameCodeConstraint = tableSqlContains(rawDb, 'game_emotion_records', "CHECK(game_code IN (")
  const usesPhase0PatternConstraint = tableSqlContains(rawDb, 'game_emotion_records', "CHECK(game_code GLOB '[A-Z][0-9][0-9]_*')")

  const needsRebuild = !usesPhase0PatternConstraint
    || usesLegacyGameCodeConstraint
    || !hasSessionGroupId
    || !hasExitTrigger
    || !hasSessionParticipants

  if (!needsRebuild) {
    return
  }

  console.log('[InitDatabase] 迁移 game_emotion_records 到 Phase 0 custom game schema')
  rawDb.run('PRAGMA foreign_keys = OFF')

  try {
    rawDb.run('DROP TABLE IF EXISTS _game_emotion_records_phase0_old')
    rawDb.run('ALTER TABLE game_emotion_records RENAME TO _game_emotion_records_phase0_old')
    rawDb.run(`
      CREATE TABLE game_emotion_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        game_code TEXT NOT NULL
          CHECK(game_code GLOB '[A-Z][0-9][0-9]_*'),
        start_time TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        difficulty_level INTEGER DEFAULT 1
          CHECK(difficulty_level IN (1, 2, 3)),
        completion_status TEXT NOT NULL
          CHECK(completion_status IN ('completed', 'aborted')),
        performance_data TEXT,
        session_group_id TEXT,
        exit_trigger TEXT
          CHECK(exit_trigger IN ('game_complete', 'user_exit', 'teacher_exit', 'timer_end', 'system_interrupt') OR exit_trigger IS NULL),
        session_participants TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES student(id)
      )
    `)
    rawDb.run(`
      INSERT INTO game_emotion_records (
        id, student_id, game_code, start_time, duration_ms, difficulty_level,
        completion_status, performance_data, session_group_id, exit_trigger, session_participants, created_at
      )
      SELECT
        id,
        student_id,
        game_code,
        start_time,
        duration_ms,
        COALESCE(difficulty_level, 1),
        completion_status,
        performance_data,
        ${hasSessionGroupId ? 'session_group_id' : 'NULL'},
        ${hasExitTrigger ? 'exit_trigger' : 'NULL'},
        ${hasSessionParticipants ? 'session_participants' : 'NULL'},
        created_at
      FROM _game_emotion_records_phase0_old
    `)
    rawDb.run('DROP TABLE _game_emotion_records_phase0_old')
    rawDb.run('CREATE INDEX IF NOT EXISTS idx_game_emotion_records_student ON game_emotion_records(student_id, created_at DESC)')
    rawDb.run('CREATE INDEX IF NOT EXISTS idx_game_emotion_records_code ON game_emotion_records(game_code, created_at DESC)')
    rawDb.run('CREATE INDEX IF NOT EXISTS idx_game_emotion_records_group ON game_emotion_records(session_group_id, created_at DESC)')
  } catch (error) {
    console.error('[InitDatabase] game_emotion_records Phase 0 迁移失败:', error)
    throw error
  } finally {
    rawDb.run('PRAGMA foreign_keys = ON')
  }
}

function migrateStudentBadgesPhase0(rawDb: any): void {
  const usesLegacyGameCodeConstraint = tableSqlContains(rawDb, 'student_badges', "CHECK(game_code IN (")
  const usesPhase0PatternConstraint = tableSqlContains(rawDb, 'student_badges', "CHECK(game_code GLOB '[A-Z][0-9][0-9]_*')")

  if (usesPhase0PatternConstraint && !usesLegacyGameCodeConstraint) {
    return
  }

  console.log('[InitDatabase] 迁移 student_badges 到 Phase 0 custom game constraint')
  rawDb.run('PRAGMA foreign_keys = OFF')

  try {
    rawDb.run('DROP TABLE IF EXISTS _student_badges_phase0_old')
    rawDb.run('ALTER TABLE student_badges RENAME TO _student_badges_phase0_old')
    rawDb.run(`
      CREATE TABLE student_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        badge_code TEXT NOT NULL,
        badge_name TEXT NOT NULL,
        game_code TEXT NOT NULL
          CHECK(game_code GLOB '[A-Z][0-9][0-9]_*'),
        unlock_count INTEGER DEFAULT 1,
        first_earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, badge_code),
        FOREIGN KEY (student_id) REFERENCES student(id)
      )
    `)
    rawDb.run(`
      INSERT INTO student_badges (
        id, student_id, badge_code, badge_name, game_code, unlock_count, first_earned_at, last_earned_at
      )
      SELECT
        id,
        student_id,
        badge_code,
        badge_name,
        game_code,
        COALESCE(unlock_count, 1),
        first_earned_at,
        last_earned_at
      FROM _student_badges_phase0_old
    `)
    rawDb.run('DROP TABLE _student_badges_phase0_old')
    rawDb.run('CREATE INDEX IF NOT EXISTS idx_student_badges_student ON student_badges(student_id, last_earned_at DESC)')
  } catch (error) {
    console.error('[InitDatabase] student_badges Phase 0 迁移失败:', error)
    throw error
  } finally {
    rawDb.run('PRAGMA foreign_keys = ON')
  }
}

async function initializeTeachingMaterialTables(rawDb: any): Promise<void> {
  rawDb.run(`
    CREATE TABLE IF NOT EXISTS teaching_material (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      dimension_code TEXT NOT NULL CHECK(dimension_code IN (
        'sensory-training',
        'emotional-regulation',
        'social-communication',
        'life-skills',
        'fine-motor',
        'soothing-aids',
        'cognitive-development'
      )),
      module_code TEXT NOT NULL CHECK(module_code IN ('sensory', 'emotional', 'social', 'life_skills', 'cognitive')),
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_path TEXT NOT NULL UNIQUE,
      file_size_bytes INTEGER NOT NULL DEFAULT 0,
      tags TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  rawDb.run(`
    CREATE TABLE IF NOT EXISTS teaching_material_favorite (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, material_id),
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES teaching_material(id) ON DELETE CASCADE
    )
  `)

  rawDb.run('CREATE INDEX IF NOT EXISTS idx_teaching_material_dimension ON teaching_material(dimension_code)')
  rawDb.run('CREATE INDEX IF NOT EXISTS idx_teaching_material_module ON teaching_material(module_code)')
  rawDb.run('CREATE INDEX IF NOT EXISTS idx_teaching_material_updated ON teaching_material(updated_at DESC)')
  rawDb.run('CREATE INDEX IF NOT EXISTS idx_teaching_material_favorite_user ON teaching_material_favorite(user_id)')
  rawDb.run('CREATE INDEX IF NOT EXISTS idx_teaching_material_favorite_material ON teaching_material_favorite(material_id)')

  migrateTeachingMaterialCognitiveConstraint(rawDb)
}

function migrateTeachingMaterialCognitiveConstraint(rawDb: any): void {
  // 教具页已开放「认知发展」维度（DP6，TEACHING_MATERIAL_DIMENSION_CODES = EQUIPMENT_CATALOG_GROUPS）。
  // 老库 teaching_material 的 dimension_code / module_code CHECK 不含 cognitive-development / cognitive，
  // 上传认知教具会被拒。新库由 CREATE TABLE 直接建含 cognitive 的版本；此迁移仅重建老库表放开约束。
  if (tableSqlContains(rawDb, 'teaching_material', "'cognitive-development'")) {
    return
  }

  console.log('[InitDatabase] 迁移 teaching_material CHECK 约束：放开 cognitive-development / cognitive')
  rawDb.run('PRAGMA foreign_keys = OFF')
  try {
    rawDb.run('DROP TABLE IF EXISTS _teaching_material_cognitive_old')
    rawDb.run('ALTER TABLE teaching_material RENAME TO _teaching_material_cognitive_old')
    rawDb.run(`
      CREATE TABLE teaching_material (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        dimension_code TEXT NOT NULL CHECK(dimension_code IN (
          'sensory-training',
          'emotional-regulation',
          'social-communication',
          'life-skills',
          'fine-motor',
          'soothing-aids',
          'cognitive-development'
        )),
        module_code TEXT NOT NULL CHECK(module_code IN ('sensory', 'emotional', 'social', 'life_skills', 'cognitive')),
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_path TEXT NOT NULL UNIQUE,
        file_size_bytes INTEGER NOT NULL DEFAULT 0,
        tags TEXT,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    rawDb.run(`
      INSERT INTO teaching_material (
        id, title, dimension_code, module_code, file_name, file_type, file_path,
        file_size_bytes, tags, description, created_at, updated_at
      )
      SELECT
        id, title, dimension_code, module_code, file_name, file_type, file_path,
        file_size_bytes, tags, description, created_at, updated_at
      FROM _teaching_material_cognitive_old
    `)
    rawDb.run('DROP TABLE _teaching_material_cognitive_old')
    rawDb.run('CREATE INDEX IF NOT EXISTS idx_teaching_material_dimension ON teaching_material(dimension_code)')
    rawDb.run('CREATE INDEX IF NOT EXISTS idx_teaching_material_module ON teaching_material(module_code)')
    rawDb.run('CREATE INDEX IF NOT EXISTS idx_teaching_material_updated ON teaching_material(updated_at DESC)')
  } catch (error) {
    console.error('[InitDatabase] teaching_material cognitive CHECK 迁移失败:', error)
    throw error
  } finally {
    rawDb.run('PRAGMA foreign_keys = ON')
  }
}

function migrateTrainingPlanSourceColumns(rawDb: any): void {
  // 推荐引擎：sys_training_plan 增加 source / source_assessment_id 两列（均 nullable），
  // 用于记录"由评估推荐生成"的计划并回链评估报告。
  // 新库由 CREATE TABLE 直接建含两列；此迁移仅给老库补列。
  // 用 safeAddColumn（ALTER TABLE ADD COLUMN，幂等，列存在即跳过），而非表重建 idiom ——
  // 两列均为 nullable 无 CHECK 约束，表重建对 sys_training_plan（带 FK + 4 索引）风险更高且无必要。
  safeAddColumn(rawDb, 'sys_training_plan', 'source TEXT')
  safeAddColumn(rawDb, 'sys_training_plan', 'source_assessment_id INTEGER')
}

function clearLegacyTeachingMaterialData(rawDb: any): void {
  const legacyMaterialCount = getSqlJsTableCount(rawDb, 'resource_meta')
  const legacyFavoriteCount = getSqlJsTableCount(rawDb, 'teacher_fav')

  if (legacyFavoriteCount > 0) {
    rawDb.run('DELETE FROM teacher_fav')
  }

  if (legacyMaterialCount > 0) {
    rawDb.run('DELETE FROM resource_meta')
  }

  if (legacyMaterialCount > 0 || legacyFavoriteCount > 0) {
    console.log('[InitDatabase] cleaned legacy teaching materials:', {
      resourceMeta: legacyMaterialCount,
      teacherFav: legacyFavoriteCount,
    })
  }
}

function getSqlJsTableCount(rawDb: any, tableName: string): number {
  try {
    const result = rawDb.exec(`SELECT COUNT(*) FROM ${tableName}`)
    return Number(result?.[0]?.values?.[0]?.[0] || 0)
  } catch {
    return 0
  }
}

async function initializeClassTables(rawDb: any): Promise<void> {
  console.log('[ClassTables] 开始初始化班级管理表结构...')

  // 1. 班级表 (sys_class)
  rawDb.run(`CREATE TABLE IF NOT EXISTS sys_academic_year (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year TEXT NOT NULL UNIQUE,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`)

  rawDb.run(`CREATE TABLE IF NOT EXISTS sys_class (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    grade_level INTEGER NOT NULL,
    class_number INTEGER NOT NULL,
    academic_year TEXT NOT NULL,
    max_students INTEGER DEFAULT 50,
    current_enrollment INTEGER DEFAULT 0,
    status INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (academic_year, grade_level, class_number)
  )`)

  // 2. 学生班级历史表 (student_class_history)
  rawDb.run(`CREATE TABLE IF NOT EXISTS student_class_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    student_name TEXT NOT NULL,
    class_id INTEGER NOT NULL,
    class_name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    enrollment_date TEXT NOT NULL,
    leave_date TEXT,
    leave_reason TEXT,
    is_current INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES sys_class(id) ON DELETE CASCADE,
    UNIQUE (student_id, academic_year)
  )`)

  // 3. 班级-老师关联表 (sys_class_teachers)
  rawDb.run(`CREATE TABLE IF NOT EXISTS sys_class_teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER,
    FOREIGN KEY (class_id) REFERENCES sys_class(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES user(id) ON DELETE SET NULL,
    UNIQUE (class_id, teacher_id)
  )`)

  // 4. 创建索引
  const indexStatements = [
    `CREATE INDEX IF NOT EXISTS idx_academic_year_value ON sys_academic_year(academic_year)`,
    `CREATE INDEX IF NOT EXISTS idx_academic_year_active ON sys_academic_year(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_class_year_grade ON sys_class(academic_year, grade_level, class_number)`,
    `CREATE INDEX IF NOT EXISTS idx_class_status ON sys_class(status)`,
    `CREATE INDEX IF NOT EXISTS idx_sch_student_current ON student_class_history(student_id, is_current)`,
    `CREATE INDEX IF NOT EXISTS idx_sch_class_history ON student_class_history(class_id, academic_year)`,
    `CREATE INDEX IF NOT EXISTS idx_sch_academic_year ON student_class_history(academic_year)`,
    `CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher ON sys_class_teachers(teacher_id)`,
    `CREATE INDEX IF NOT EXISTS idx_class_teachers_class ON sys_class_teachers(class_id)`
  ]

  for (const stmt of indexStatements) {
    try {
      rawDb.run(stmt)
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('[ClassTables] 索引创建警告:', error.message)
      }
    }
  }

  // 5. 创建触发器
  syncAcademicYearTable(rawDb)

  rawDb.run(`CREATE TRIGGER IF NOT EXISTS trg_class_enrollment_increment
    AFTER INSERT ON student_class_history
    WHEN NEW.is_current = 1
  BEGIN
    UPDATE sys_class
    SET current_enrollment = current_enrollment + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.class_id;
  END`)

  rawDb.run(`CREATE TRIGGER IF NOT EXISTS trg_class_enrollment_decrement
    AFTER UPDATE OF is_current ON student_class_history
    WHEN OLD.is_current = 1 AND NEW.is_current = 0
  BEGIN
    UPDATE sys_class
    SET current_enrollment = current_enrollment - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.class_id;
  END`)

  // 6. 创建视图
  rawDb.run(`CREATE VIEW IF NOT EXISTS v_class_current_students AS
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
  ORDER BY sc.grade_level, sc.class_number, sch.student_name`)

  rawDb.run(`CREATE VIEW IF NOT EXISTS v_student_class_history AS
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
  ORDER BY sch.student_id, sch.enrollment_date DESC`)

  rawDb.run(`CREATE VIEW IF NOT EXISTS v_class_statistics AS
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
  ORDER BY sc.grade_level, sc.class_number`)

  // 7. ALTER TABLE 语句（使用 safeAddColumn 检查列是否存在）
  safeAddColumn(rawDb, 'student', 'current_class_id INTEGER')
  safeAddColumn(rawDb, 'student', 'current_class_name TEXT')
  safeAddColumn(rawDb, 'training_records', 'class_id INTEGER')
  safeAddColumn(rawDb, 'training_records', 'class_name TEXT')
  safeAddColumn(rawDb, 'train_log', 'class_id INTEGER')
  safeAddColumn(rawDb, 'train_log', 'class_name TEXT')
  safeAddColumn(rawDb, 'report_record', 'class_id INTEGER')
  safeAddColumn(rawDb, 'report_record', 'class_name TEXT')
  safeAddColumn(rawDb, 'equipment_training_records', 'class_id INTEGER')
  safeAddColumn(rawDb, 'equipment_training_records', 'class_name TEXT')
  safeAddColumn(rawDb, 'activation', 'allowed_modules TEXT NOT NULL DEFAULT \'[]\'')

  // Phase 4.6: 训练记录模块重构 - 添加 module_code 字段
  safeAddColumn(rawDb, 'training_records', 'module_code TEXT DEFAULT "sensory"')
  safeAddColumn(rawDb, 'training_records', 'entry_code TEXT')
  safeAddColumn(rawDb, 'equipment_training_records', 'module_code TEXT DEFAULT "sensory"')
  safeAddColumn(rawDb, 'equipment_training_records', 'entry_code TEXT')
  migrateEquipmentTrainingRecordResourceForeignKey(rawDb)
  rawDb.run('CREATE INDEX IF NOT EXISTS idx_training_records_entry_code ON training_records(entry_code)')
  rawDb.run('CREATE INDEX IF NOT EXISTS idx_equipment_training_entry_code ON equipment_training_records(entry_code)')

  console.log('[ClassTables] 班级管理表结构初始化完成')
}
