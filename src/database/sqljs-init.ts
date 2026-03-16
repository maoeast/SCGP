/**
 * SQL.js 数据库初始化
 * 独立的SQL.js初始化逻辑
 */

import { SQLWrapper } from './sql-wrapper'

// 数据库版本号 - 当数据结构发生变化时递增此版本号
// 必须与 indexeddb-storage.ts 中的 DATA_VERSION 保持一致
export const DATABASE_VERSION = '4.2.0' // emotional foundation schema baseline
const DB_VERSION_KEY = 'selfcare_ats_db_version'

/**
 * 创建SQL数据库实例
 */
async function createSQLDatabase(SQL: any): Promise<any> {
  // 检查数据库版本，如果不匹配则清除旧数据
  const savedVersion = localStorage.getItem(DB_VERSION_KEY)
  if (savedVersion && savedVersion !== DATABASE_VERSION) {
    console.log(`🔄 数据库版本从 ${savedVersion} 更新到 ${DATABASE_VERSION}，清除旧数据...`)
    localStorage.removeItem('selfcare_ats_sql_db')
    sessionStorage.clear()
  }

  // 尝试从localStorage加载数据库
  const savedDb = localStorage.getItem('selfcare_ats_sql_db')
  let rawDb: any

  if (savedDb) {
    try {
      const data = Uint8Array.from(atob(savedDb), (c) => c.charCodeAt(0))
      rawDb = new SQL.Database(data)
      console.log('从本地存储加载SQL.js数据库成功')

      // 保存当前版本号
      if (localStorage.getItem(DB_VERSION_KEY) !== DATABASE_VERSION) {
        localStorage.setItem(DB_VERSION_KEY, DATABASE_VERSION)
      }
    } catch (error) {
      console.error('加载SQL.js数据库失败，创建新数据库:', error)
      rawDb = new SQL.Database()
      await createSchemaAndData(rawDb)
      localStorage.setItem(DB_VERSION_KEY, DATABASE_VERSION)
    }
  } else {
    rawDb = new SQL.Database()
    await createSchemaAndData(rawDb)
    localStorage.setItem(DB_VERSION_KEY, DATABASE_VERSION)
  }

  // 使用SQLWrapper包装
  const db = new SQLWrapper(rawDb, SQL)
  console.log('SQL.js数据库初始化成功')
  return db
}

// 导出SQL.js数据库
export async function initSQLDatabase(): Promise<any> {
  try {
    // 动态导入SQL.js
    const sqlModule = await import('sql.js')

    // SQL.js模块导出的形式可能不同，尝试不同的导入方式
    let initSqlJs: any
    if (sqlModule.default) {
      initSqlJs = sqlModule.default
    } else if (sqlModule.initSqlJs) {
      initSqlJs = sqlModule.initSqlJs
    } else if ((sqlModule as any).SQL) {
      // 某些版本可能直接导出SQL构造函数
      const SQL = (sqlModule as any).SQL
      return createSQLDatabase(SQL)
    } else {
      throw new Error('无法找到SQL.js的初始化函数')
    }

    const SQL = await initSqlJs({
      locateFile: (file: string) => `/node_modules/sql.js/dist/${file}`,
    })

    // 检查数据库版本，如果不匹配则清除旧数据
    const savedVersion = localStorage.getItem(DB_VERSION_KEY)
    if (savedVersion && savedVersion !== DATABASE_VERSION) {
      console.log(`🔄 数据库版本从 ${savedVersion} 更新到 ${DATABASE_VERSION}，清除旧数据...`)
      localStorage.removeItem('selfcare_ats_sql_db')
      sessionStorage.clear()
    }

    // 尝试从localStorage加载数据库
    const savedDb = localStorage.getItem('selfcare_ats_sql_db')
    let rawDb: any

    if (savedDb) {
      try {
        const data = Uint8Array.from(atob(savedDb), (c) => c.charCodeAt(0))
        rawDb = new SQL.Database(data)
        console.log('从本地存储加载SQL.js数据库成功')

        // 保存当前版本号
        if (localStorage.getItem(DB_VERSION_KEY) !== DATABASE_VERSION) {
          localStorage.setItem(DB_VERSION_KEY, DATABASE_VERSION)
        }
      } catch (error) {
        console.error('加载SQL.js数据库失败，创建新数据库:', error)
        rawDb = new SQL.Database()
        await createSchemaAndData(rawDb)
        localStorage.setItem(DB_VERSION_KEY, DATABASE_VERSION)
      }
    } else {
      rawDb = new SQL.Database()
      await createSchemaAndData(rawDb)
      localStorage.setItem(DB_VERSION_KEY, DATABASE_VERSION)
    }

    // 使用SQLWrapper包装
    const db = new SQLWrapper(rawDb, SQL)
    console.log('SQL.js数据库初始化成功')
    return db
  } catch (error) {
    console.error('SQL.js数据库初始化失败:', error)
    throw error
  }
}

/**
 * 创建数据库结构和初始数据
 */
async function createSchemaAndData(db: any): Promise<void> {
  const schemaSQL = `
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

    -- 学生表
    CREATE TABLE IF NOT EXISTS student (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gender TEXT CHECK(gender IN ('male', 'female')) NOT NULL,
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
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student(id),
      FOREIGN KEY (task_id) REFERENCES task(id)
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

    -- 感官训练记录表 (新模块)
    CREATE TABLE IF NOT EXISTS training_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      task_id INTEGER,
      resource_id INTEGER,
      resource_type TEXT,
      session_type TEXT,
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
    CREATE INDEX IF NOT EXISTS idx_training_records_resource_id ON training_records(resource_id);
  `

  // 执行创建表的SQL
  try {
    db.run(schemaSQL)
    console.log('数据库表创建成功')
  } catch (error) {
    console.error('创建表失败:', error)
    throw error
  }

  // 插入初始数据
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
    `)

    // 插入WeeFIM量表分类
    db.run(`
      INSERT INTO weefim_category (name, description) VALUES
      ('自我照顾', '进食、梳洗修饰、洗澡、穿衣、如厕等日常生活能力'),
      ('括约肌控制', '排尿控制、排便控制'),
      ('转移', '床椅转移、轮椅转移、进出浴盆/淋浴间'),
      ('行走', '步行、使用轮椅'),
      ('沟通', '理解、表达能力'),
      ('社会认知', '社会交往、解决问题能力');
    `)

    // 插入训练任务分类（使用统一的6大分类）
    db.run(`
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
    const salt = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
    const passwordHash = btoa('admin123' + salt)

    // 插入默认管理员用户
    db.run(
      `
      INSERT INTO user (username, password_hash, salt, role, name) VALUES
      ('admin', ?, ?, 'admin', '系统管理员');
    `,
      [passwordHash, salt],
    )

    // 插入系统默认配置
    db.run(`
      INSERT INTO system_config (key, value, description) VALUES
      ('system_name', '感官综合训练与评估', '系统名称'),
      ('system_version', '1.0.0', '系统版本'),
      ('auto_backup', 'true', '是否自动备份'),
      ('backup_interval', '7', '备份间隔（天）'),
      ('trial_days', '7', '试用天数');
    `)

    console.log('初始数据插入成功')
  } catch (error) {
    console.error('插入初始数据失败:', error)
    throw error
  }
}
