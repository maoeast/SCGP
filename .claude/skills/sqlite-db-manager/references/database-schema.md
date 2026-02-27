# 数据库表结构文档

本文档详细描述感官综合训练与评估系统 SQLite 数据库的所有表结构。

## 表结构速览

### 核心业务表

#### student - 学生信息表

```sql
CREATE TABLE IF NOT EXISTS student (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  gender TEXT CHECK(gender IN ('男', '女')),
  birthday DATE,
  admission_date DATE,
  diagnosis TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**字段说明**:

- `id`: 学生唯一标识（主键，自增）
- `name`: 学生姓名
- `gender`: 性别（'男' 或 '女'）
- `birthday`: 出生日期
- `admission_date`: 入训日期
- `diagnosis`: 诊断信息
- `notes`: 备注信息
- `created_at`: 创建时间
- `updated_at`: 更新时间

#### user - 用户表

```sql
CREATE TABLE IF NOT EXISTS user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'teacher')),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**字段说明**:

- `id`: 用户唯一标识（主键，自增）
- `username`: 用户名（唯一）
- `password`: 密码（加密存储）
- `role`: 角色（'admin' 或 'teacher'）
- `name`: 真实姓名
- `created_at`: 创建时间

#### sm_assess - S-M 量表评估主表

```sql
CREATE TABLE IF NOT EXISTS sm_assess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  assess_date DATE NOT NULL,
  assessor_id INTEGER NOT NULL,
  total_score INTEGER,
  age_stage_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
  FOREIGN KEY (assessor_id) REFERENCES user(id) ON DELETE SET NULL,
  FOREIGN KEY (age_stage_id) REFERENCES sm_age_stage(id)
)
```

**字段说明**:

- `id`: 评估记录唯一标识（主键，自增）
- `student_id`: 学生 ID（外键，关联 student 表）
- `assess_date`: 评估日期
- `assessor_id`: 评估人 ID（外键，关联 user 表）
- `total_score`: 总分
- `age_stage_id`: 对应年龄阶段 ID（外键，关联 sm_age_stage 表）
- `created_at`: 创建时间

#### sm_assess_detail - S-M 量表评估详情表

```sql
CREATE TABLE IF NOT EXISTS sm_assess_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assess_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  score INTEGER,
  notes TEXT,
  FOREIGN KEY (assess_id) REFERENCES sm_assess(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES sm_question(id)
)
```

**字段说明**:

- `id`: 详情记录唯一标识（主键，自增）
- `assess_id`: 评估记录 ID（外键，关联 sm_assess 表）
- `question_id`: 题目 ID（外键，关联 sm_question 表）
- `score`: 得分
- `notes`: 备注

#### weefim_assess - WeeFIM 量表评估主表

```sql
CREATE TABLE IF NOT EXISTS weefim_assess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  assess_date DATE NOT NULL,
  assessor_id INTEGER NOT NULL,
  total_score INTEGER,
  motor_score INTEGER,
  cognitive_score INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
  FOREIGN KEY (assessor_id) REFERENCES user(id) ON DELETE SET NULL
)
```

**字段说明**:

- `id`: 评估记录唯一标识（主键，自增）
- `student_id`: 学生 ID（外键，关联 student 表）
- `assess_date`: 评估日期
- `assessor_id`: 评估人 ID（外键，关联 user 表）
- `total_score`: 总分
- `motor_score`: 运动功能得分
- `cognitive_score`: 认知功能得分
- `created_at`: 创建时间

#### weefim_assess_detail - WeeFIM 量表评估详情表

```sql
CREATE TABLE IF NOT EXISTS weefim_assess_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assess_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  score INTEGER,
  FOREIGN KEY (assess_id) REFERENCES weefim_assess(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES weefim_question(id)
)
```

**字段说明**:

- `id`: 详情记录唯一标识（主键，自增）
- `assess_id`: 评估记录 ID（外键，关联 weefim_assess 表）
- `question_id`: 题目 ID（外键，关联 weefim_question 表）
- `score`: 得分

#### train_plan - 训练计划主表

```sql
CREATE TABLE IF NOT EXISTS train_plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  creator_id INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES user(id)
)
```

**字段说明**:

- `id`: 计划唯一标识（主键，自增）
- `student_id`: 学生 ID（外键，关联 student 表）
- `name`: 计划名称
- `start_date`: 开始日期
- `end_date`: 结束日期
- `creator_id`: 创建人 ID（外键，关联 user 表）
- `status`: 状态（'active', 'completed', 'paused'）
- `created_at`: 创建时间
- `updated_at`: 更新时间

#### train_plan_detail - 训练计划详情表

```sql
CREATE TABLE IF NOT EXISTS train_plan_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  target_level_id INTEGER,
  sequence INTEGER NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES train_plan(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES task(id),
  FOREIGN KEY (target_level_id) REFERENCES task_level(id)
)
```

**字段说明**:

- `id`: 详情记录唯一标识（主键，自增）
- `plan_id`: 计划 ID（外键，关联 train_plan 表）
- `task_id`: 训练任务 ID（外键，关联 task 表）
- `target_level_id`: 目标难度等级 ID（外键，关联 task_level 表）
- `sequence`: 执行顺序

#### train_log - 训练记录表

```sql
CREATE TABLE IF NOT EXISTS train_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_detail_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  trainer_id INTEGER,
  train_date TIMESTAMP NOT NULL,
  duration INTEGER,
  result TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_detail_id) REFERENCES train_plan_detail(id),
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
  FOREIGN KEY (trainer_id) REFERENCES user(id)
)
```

**字段说明**:

- `id`: 记录唯一标识（主键，自增）
- `plan_detail_id`: 计划详情 ID（外键，关联 train_plan_detail 表）
- `student_id`: 学生 ID（外键，关联 student 表）
- `trainer_id`: 训练师 ID（外键，关联 user 表）
- `train_date`: 训练时间
- `duration`: 持续时间（分钟）
- `result`: 训练结果
- `notes`: 备注
- `created_at`: 创建时间

#### task - 训练任务表

```sql
CREATE TABLE IF NOT EXISTS task (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category_id INTEGER,
  description TEXT,
  video_url TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES task_category(id)
)
```

**字段说明**:

- `id`: 任务唯一标识（主键，自增）
- `name`: 任务名称
- `category_id`: 分类 ID（外键，关联 task_category 表）
- `description`: 描述
- `video_url`: 视频资源 URL
- `image_url`: 图片资源 URL
- `created_at`: 创建时间

#### resource_meta - 资源表

```sql
CREATE TABLE IF NOT EXISTS resource_meta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_name TEXT NOT NULL,
  resource_path TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  category TEXT,
  file_size INTEGER,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**字段说明**:

- `id`: 资源唯一标识（主键，自增）
- `resource_name`: 资源名称
- `resource_path`: 资源路径
- `resource_type`: 资源类型（'video', 'image', 'audio', 'document'）
- `category`: 分类
- `file_size`: 文件大小（字节）
- `upload_date`: 上传时间

### 支持表

#### sm_age_stage - S-M 量表年龄阶段表

```sql
CREATE TABLE IF NOT EXISTS sm_age_stage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_name TEXT NOT NULL,
  min_age INTEGER NOT NULL,
  max_age INTEGER NOT NULL
)
```

#### sm_question - S-M 量表题目表

```sql
CREATE TABLE IF NOT EXISTS sm_question (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  age_stage_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_number INTEGER,
  FOREIGN KEY (age_stage_id) REFERENCES sm_age_stage(id)
)
```

#### sm_norm - S-M 量表常模表

```sql
CREATE TABLE IF NOT EXISTS sm_norm (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  age_stage_id INTEGER NOT NULL,
  gender TEXT,
  min_score INTEGER,
  max_score INTEGER,
  description TEXT,
  FOREIGN KEY (age_stage_id) REFERENCES sm_age_stage(id)
)
```

#### weefim_category - WeeFIM 量表分类表

```sql
CREATE TABLE IF NOT EXISTS weefim_category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_name TEXT NOT NULL,
  category_type TEXT CHECK(category_type IN ('motor', 'cognitive'))
)
```

#### weefim_question - WeeFIM 量表题目表

```sql
CREATE TABLE IF NOT EXISTS weefim_question (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_number INTEGER,
  FOREIGN KEY (category_id) REFERENCES weefim_category(id)
)
```

#### task_category - 训练任务分类表

```sql
CREATE TABLE IF NOT EXISTS task_category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_name TEXT NOT NULL,
  description TEXT
)
```

#### task_level - 训练任务难度表

```sql
CREATE TABLE IF NOT EXISTS task_level (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  level_name TEXT NOT NULL,
  level_number INTEGER NOT NULL,
  description TEXT,
  FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE CASCADE
)
```

#### task_step - 训练任务步骤表

```sql
CREATE TABLE IF NOT EXISTS task_step (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  level_id INTEGER,
  step_number INTEGER NOT NULL,
  step_description TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE CASCADE,
  FOREIGN KEY (level_id) REFERENCES task_level(id)
)
```

### 系统表

#### system_config - 系统配置表

```sql
CREATE TABLE IF NOT EXISTS system_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT,
  description TEXT
)
```

#### activation - 激活信息表

REFERENCES task(id) ON DELETE CASCADE
)

````

#### task_step - 训练任务步骤表

```sql
CREATE TABLE IF NOT EXISTS task_step (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  level_id INTEGER,
  step_number INTEGER NOT NULL,
  step_description TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE CASCADE,
  FOREIGN KEY (level_id) REFERENCES task_level(id)
)
````

### 系统表

#### system_config - 系统配置表

```sql
CREATE TABLE IF NOT EXISTS system_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT,
  description TEXT
)
```

#### activation - 激活信息表

```sql
CREATE TABLE IF NOT EXISTS activation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_key TEXT NOT NULL UNIQUE,
  activation_code TEXT NOT NULL,
  activation_date DATE NOT NULL,
  expiry_date DATE,
  machine_code TEXT,
  status TEXT DEFAULT 'active'
)
```
