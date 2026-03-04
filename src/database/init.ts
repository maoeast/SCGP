// SQL.js 将通过动态导入加载

// 内联schema.sql内容
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
  report_type TEXT NOT NULL CHECK(report_type IN ('sm', 'weefim', 'training', 'iep', 'csirs', 'conners-psq', 'conners-trs', 'sdq')),
  assess_id INTEGER,
  plan_id INTEGER,
  training_record_id INTEGER,
  title TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id),
  FOREIGN KEY (assess_id) REFERENCES sm_assess(id),
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
CREATE INDEX IF NOT EXISTS idx_csirs_assess_student ON csirs_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_csirs_assess_detail_assess ON csirs_assess_detail(assess_id);
CREATE INDEX IF NOT EXISTS idx_conners_psq_assess_student ON conners_psq_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_conners_trs_assess_student ON conners_trs_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_sdq_assess_student ON sdq_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_train_plan_student ON train_plan(student_id);
CREATE INDEX IF NOT EXISTS idx_train_log_student ON train_log(student_id);
CREATE INDEX IF NOT EXISTS idx_task_category ON task(category_id);

-- 感官训练记录表 (新模块)
CREATE TABLE IF NOT EXISTS training_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL CHECK(task_id IN (1, 2, 3, 4, 5, 6, 7)),
  timestamp INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  accuracy_rate REAL NOT NULL CHECK(accuracy_rate BETWEEN 0 AND 1),
  avg_response_time INTEGER NOT NULL,
  raw_data TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_training_records_student_id ON training_records(student_id);
CREATE INDEX IF NOT EXISTS idx_training_records_task_id ON training_records(task_id);
CREATE INDEX IF NOT EXISTS idx_training_records_timestamp ON training_records(timestamp);

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
  FOREIGN KEY (equipment_id) REFERENCES equipment_catalog(id)
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
CREATE INDEX IF NOT EXISTS idx_equipment_training_batches_student ON equipment_training_batches(student_id);

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

    // 创建表结构
    db.run(schemaSQL)

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

    // 只在新数据库时插入初始数据
    if (isNewDb) {
      console.log('新数据库，插入初始数据')
      await insertInitialDataToDB(db)
    } else {
      console.log('加载已有数据库，跳过初始数据插入')
    }

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

    // ========== 游戏资源迁移 ==========
    try {
      const { needsGameMigration, runGameMigration } = await import('./migration/migrate-games-to-resources')
      if (needsGameMigration()) {
        console.log('[InitDatabase] 🔄 检测到需要迁移游戏资源，自动运行迁移...')
        const result = await runGameMigration()
        if (result.success) {
          console.log('[InitDatabase] ✅ 游戏资源迁移成功:', result.message)
          if (result.verification) {
            console.log('[InitDatabase] 📊 游戏统计:', result.verification.stats)
          }
        } else {
          console.warn('[InitDatabase] ⚠️  游戏资源迁移失败:', result.message)
        }
      } else {
        console.log('[InitDatabase] ✅ 游戏资源已是最新，无需迁移')
      }
    } catch (gameMigrationError) {
      console.warn('[InitDatabase] ⚠️  游戏资源迁移检查失败:', gameMigrationError)
    }

    return db
  } catch (error) {
    console.error('SQL.js数据库初始化失败:', error)
    // 降级到Mock数据库
    console.log('降级使用Mock数据库')
    const { MockDatabase, createMockData } = await import('./mock-db')
    db = new MockDatabase()
    createMockData(db)
    return db
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

    // 生成盐值和密码哈希
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    const salt = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    const passwordHash = btoa('admin123' + salt)

    // 插入默认管理员用户
    database.run(`
      INSERT INTO user (username, password_hash, salt, role, name) VALUES
      ('admin', ?, ?, 'admin', '系统管理员');
    `, [passwordHash, salt])

    // 插入系统默认配置
    database.run(`
      INSERT INTO system_config (key, value, description) VALUES
      ('system_name', '生活自理适应综合训练', '系统名称'),
      ('system_version', '1.0.0', '系统版本'),
      ('auto_backup', 'true', '是否自动备份'),
      ('backup_interval', '7', '备份间隔（天）'),
      ('trial_days', '7', '试用天数');
    `)

    // 插入资源数据
    const { initResourceData } = await import('./resource-data')
    initResourceData(database)

    console.log('初始数据插入成功')
  } catch (error) {
    console.error('插入初始数据失败:', error)
  }
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
    const defaultSalt = generateSalt();
    const defaultPasswordHash = hashPassword('admin123', defaultSalt);
    db.run(`
      INSERT INTO user (username, password_hash, salt, role, name) VALUES
      ('admin', '${defaultPasswordHash}', '${defaultSalt}', 'admin', '系统管理员');
    `);

    // 插入系统默认配置
    db.run(`
      INSERT INTO system_config (key, value, description) VALUES
      ('system_name', '生活自理适应综合训练', '系统名称'),
      ('system_version', '1.0.0', '系统版本'),
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

    // 标签缓存：tagName -> tagId
    const tagMap = new Map<string, number>()

    // 第一步：插入 sys_training_resource 表
    // 使用序号作为 legacy_id（对应图片文件名：{category}-{id}.webp）
    let legacyIdCounter = 1
    for (const equipment of EQUIPMENT_DATA) {
      try {
        // 检查是否已存在同名资源
        const existing = db.get('SELECT id FROM sys_training_resource WHERE name = ? AND resource_type = ?', [equipment.name, 'equipment'])
        if (existing) {
          console.log(`[insertEquipmentData] 跳过已存在: ${equipment.name}`)
          continue
        }

        // 插入资源记录（包裹在 try-catch 中）
        db.run(`
          INSERT INTO sys_training_resource (
            module_code, resource_type, name, category, description,
            cover_image, is_custom, is_active, legacy_id, legacy_source, meta_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'sensory',                         // module_code
          'equipment',                        // resource_type
          equipment.name,                      // name
          equipment.category,                  // category (使用原始分类而非 sub_category)
          equipment.description || '',          // description
          equipment.image_url || '',           // cover_image
          0,                                  // is_custom
          equipment.is_active ?? 1,           // is_active
          legacyIdCounter,                    // legacy_id (用于图片加载：{category}-{legacy_id}.webp)
          'equipment_data',                   // legacy_source
          JSON.stringify({                   // meta_data
            original_category: equipment.category,
            original_sub_category: equipment.sub_category
          })
        ])

        // 获取新插入的资源 ID（严格验证结果结构）
        const result = db.exec('SELECT last_insert_rowid() as id')
        if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
          console.error(`[insertEquipmentData] 获取ID失败: ${equipment.name}`)
          continue
        }
        const resourceId = result[0].values[0][0]

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
                  const newTagResult = db.exec('SELECT last_insert_rowid() as id')
                  if (!newTagResult || newTagResult.length === 0 || !newTagResult[0].values || newTagResult[0].values.length === 0) {
                    console.error(`[insertEquipmentData] 创建标签失败: ${tagName}`)
                    continue
                  }
                  tagId = newTagResult[0].values[0][0]
                }

                // 缓存标签 ID
                if (tagId) {
                  tagMap.set(tagKey, tagId)
                }
              }

              // 第三步：创建资源-标签关联
              if (tagId) {
                db.run('INSERT OR IGNORE INTO sys_resource_tag_map (resource_id, tag_id) VALUES (?, ?)', [resourceId, tagId])
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

    console.log(`✅ 器材数据插入成功: ${EQUIPMENT_DATA.length} 种器材（新表结构）`)

    // 创建默认管理员账户
    createDefaultAdminAccount(db)
  } catch (error) {
    console.error('插入器材数据失败:', error)
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
function createDefaultAdminAccount(database: any) {
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
    const salt = generateSalt()
    const hashedPassword = hashPassword('admin123', salt)

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

// 生成盐值
function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 密码哈希
function hashPassword(password: string, salt: string): string {
  // 简化的密码哈希（生产环境应使用更安全的方法）
  return btoa(password + salt);
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
 * 添加对 conners-psq 和 conners-trs 类型的支持
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
  const columnName = parts[0]

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
  const statements = sysTablesSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

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
async function initializeClassTables(rawDb: any): Promise<void> {
  console.log('[ClassTables] 开始初始化班级管理表结构...')

  // 1. 班级表 (sys_class)
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

  // Phase 4.6: 训练记录模块重构 - 添加 module_code 字段
  safeAddColumn(rawDb, 'training_records', 'module_code TEXT DEFAULT "sensory"')
  safeAddColumn(rawDb, 'equipment_training_records', 'module_code TEXT DEFAULT "sensory"')

  console.log('[ClassTables] 班级管理表结构初始化完成')
}