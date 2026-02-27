# 常用数据库查询

本文档提供感官综合训练与评估系统数据库的常用 SQL 查询示例。

## 学生相关查询

### 查询所有学生信息

```sql
SELECT id, name, gender, birthday, admission_date, diagnosis, notes
FROM student
ORDER BY admission_date DESC;
```

### 查询指定年龄范围内的学生

```sql
SELECT id, name, gender, birthday,
       strftime('%Y', 'now') - strftime('%Y', birthday) -
       (strftime('%m-%d', 'now') < strftime('%m-%d', birthday)) AS age
FROM student
WHERE birthday BETWEEN '2015-01-01' AND '2017-12-31'
ORDER BY birthday;
```

### 按性别统计学生数量

```sql
SELECT gender, COUNT(*) as count
FROM student
GROUP BY gender;
```

### 查询最近入训的学生

```sql
SELECT id, name, gender, admission_date
FROM student
WHERE admission_date >= date('now', '-30 days')
ORDER BY admission_date DESC;
```

## 评估相关查询

### 查询学生的所有 S-M 评估记录

```sql
SELECT sa.id, sa.assess_date, sa.total_score,
       sas.stage_name,
       u.name as assessor_name
FROM sm_assess sa
LEFT JOIN sm_age_stage sas ON sa.age_stage_id = sas.id
LEFT JOIN user u ON sa.assessor_id = u.id
WHERE sa.student_id = ?  -- 替换为学生 ID
ORDER BY sa.assess_date DESC;
```

### 查询学生最近一次 S-M 评估结果

```sql
SELECT sa.id, sa.assess_date, sa.total_score,
       sas.stage_name, u.name as assessor_name
FROM sm_assess sa
LEFT JOIN sm_age_stage sas ON sa.age_stage_id = sas.id
LEFT JOIN user u ON sa.assessor_id = u.id
WHERE sa.student_id = ?  -- 替换为学生 ID
ORDER BY sa.assess_date DESC
LIMIT 1;
```

### 查询学生的所有 WeeFIM 评估记录

```sql
SELECT wa.id, wa.assess_date, wa.total_score,
       wa.motor_score, wa.cognitive_score,
       u.name as assessor_name
FROM weefim_assess wa
LEFT JOIN user u ON wa.assessor_id = u.id
WHERE wa.student_id = ?  -- 替换为学生 ID
ORDER BY wa.assess_date DESC;
```

### 查询 S-M 评估详情（包含题目和得分）

```sql
SELECT sq.question_text, sq.question_number, sad.score, sad.notes
FROM sm_assess_detail sad
JOIN sm_question sq ON sad.question_id = sq.id
WHERE sad.assess_id = ?  -- 替换为评估 ID
ORDER BY sq.question_number;
```

### 查询 WeeFIM 评估详情（包含分类和得分）

```sql
SELECT wc.category_name, wc.category_type, wq.question_text,
       wq.question_number, wad.score
FROM weefim_assess_detail wad
JOIN weefim_question wq ON wad.question_id = wq.id
JOIN weefim_category wc ON wq.category_id = wc.id
WHERE wad.assess_id = ?  -- 替换为评估 ID
ORDER BY wc.category_type, wq.question_number;
```

### 统计学生的评估次数

```sql
SELECT
  student_id,
  COUNT(DISTINCT sm_assess.id) as sm_count,
  COUNT(DISTINCT weefim_assess.id) as weefim_count
FROM student
LEFT JOIN sm_assess ON student.id = sm_assess.student_id
LEFT JOIN weefim_assess ON student.id = weefim_assess.student_id
GROUP BY student_id;
```

## 训练计划相关查询

### 查询学生的所有训练计划

```sql
SELECT tp.id, tp.name, tp.start_date, tp.end_date,
       tp.status, u.name as creator_name
FROM train_plan tp
LEFT JOIN user u ON tp.creator_id = u.id
WHERE tp.student_id = ?  -- 替换为学生 ID
ORDER BY tp.start_date DESC;
```

### 查询当前活跃的训练计划

```sql
SELECT tp.id, tp.name, tp.start_date, tp.end_date,
       s.name as student_name, u.name as creator_name
FROM train_plan tp
JOIN student s ON tp.student_id = s.id
LEFT JOIN user u ON tp.creator_id = u.id
WHERE tp.status = 'active'
ORDER BY tp.start_date;
```

### 查询训练计划的详情任务列表

```sql
SELECT tpd.sequence, t.name as task_name,
       tc.category_name, tl.level_name, tl.level_number
FROM train_plan_detail tpd
JOIN task t ON tpd.task_id = t.id
LEFT JOIN task_category tc ON t.category_id = tc.id
LEFT JOIN task_level tl ON tpd.target_level_id = tl.id
WHERE tpd.plan_id = ?  -- 替换为计划 ID
ORDER BY tpd.sequence;
```

### 查询即将过期的训练计划

```sql
SELECT tp.id, tp.name, tp.end_date, s.name as student_name
FROM train_plan tp
JOIN student s ON tp.student_id = s.id
WHERE tp.status = 'active'
  AND tp.end_date BETWEEN date('now') AND date('now', '+7 days')
ORDER BY tp.end_date;
```

## 训练记录相关查询

### 查询学生的所有训练记录

```sql
SELECT tl.id, tl.train_date, tl.duration, tl.result, tl.notes,
       t.name as task_name, u.name as trainer_name
FROM train_log tl
JOIN train_plan_detail tpd ON tl.plan_detail_id = tpd.id
JOIN task t ON tpd.task_id = t.id
LEFT JOIN user u ON tl.trainer_id = u.id
WHERE tl.student_id = ?  -- 替换为学生 ID
ORDER BY tl.train_date DESC;
```

### 查询指定日期范围内的训练记录

```sql
SELECT tl.id, tl.train_date, tl.duration, tl.result,
       s.name as student_name, t.name as task_name
FROM train_log tl
JOIN student s ON tl.student_id = s.id
JOIN train_plan_detail tpd ON tl.plan_detail_id = tpd.id
JOIN task t ON tpd.task_id = t.id
WHERE tl.train_date BETWEEN date('now', '-30 days') AND date('now')
ORDER BY tl.train_date DESC;
```

### 统计学生的训练次数和总时长

```sql
SELECT
  student_id,
  COUNT(*) as total_sessions,
  SUM(duration) as total_minutes,
  AVG(duration) as avg_minutes_per_session
FROM train_log
WHERE student_id = ?  -- 替换为学生 ID
GROUP BY student_id;
```

### 查询每个任务的训练统计

```sql
SELECT
  t.id, t.name,
  COUNT(tl.id) as train_count,
  AVG(tl.duration) as avg_duration,
  COUNT(CASE WHEN tl.result = 'completed' THEN 1 END) as completed_count
FROM task t
JOIN train_plan_detail tpd ON t.id = tpd.task_id
LEFT JOIN train_log tl ON tpd.id = tl.plan_detail_id
GROUP BY t.id, t.name
ORDER BY train_count DESC;
```

### 查询最近完成的训练记录

```sql
SELECT tl.id, tl.train_date, tl.duration, tl.result,
       s.name as student_name, t.name as task_name, u.name as trainer_name
FROM train_log tl
JOIN student s ON tl.student_id = s.id
JOIN train_plan_detail tpd ON tl.plan_detail_id = tpd.id
JOIN task t ON tpd.task_id = t.id
LEFT JOIN user u ON tl.trainer_id = u.id
WHERE tl.result = 'completed'
ORDER BY tl.train_date DESC
LIMIT 20;
```

## 统计查询

### 查询系统整体数据统计

```sql
SELECT
  (SELECT COUNT(*) FROM student) as student_count,
  (SELECT COUNT(*) FROM user) as user_count,
  (SELECT COUNT(*) FROM sm_assess) as sm_assess_count,
  (SELECT COUNT(*) FROM weefim_assess) as weefim_assess_count,
  (SELECT COUNT(*) FROM train_plan) as train_plan_count,
  (SELECT COUNT(*) FROM train_log) as train_log_count;
```

### 按月统计评估次数

```sql
SELECT
  strftime('%Y-%m', assess_date) as month,
  COUNT(*) as count
FROM sm_assess
GROUP BY strftime('%Y-%m', assess_date)
ORDER BY month DESC;
```

### 按月统计训练时长

```sql
SELECT
  strftime('%Y-%m', train_date) as month,
  SUM(duration) as total_minutes,
  COUNT(*) as session_count
FROM train_log
GROUP BY strftime('%Y-%m', train_date)
ORDER BY month DESC;
```

### 查询学生完成率最高的任务

```sql
SELECT
  t.name as task_name,
  COUNT(tl.id) as total_count,
  COUNT(CASE WHEN tl.result = 'completed' THEN 1 END) as completed_count,
  ROUND(CAST(COUNT(CASE WHEN tl.result = 'completed' THEN 1 END) * 100.0 / COUNT(tl.id) AS REAL), 2) as completion_rate
FROM task t
JOIN train_plan_detail tpd ON t.id = tpd.task_id
LEFT JOIN train_log tl ON tpd.id = tl.plan_detail_id
GROUP BY t.id, t.name
HAVING COUNT(tl.id) > 0
ORDER BY completion_rate DESC;
```

## 资源相关查询

### 查询所有视频资源

```sql
SELECT * FROM resource_meta
WHERE resource_type = 'video'
ORDER BY upload_date DESC;
```

### 查询指定分类的任务及其资源

```sql
SELECT
  t.id, t.name, t.description,
  t.video_url, t.image_url,
  tc.category_name
FROM task t
LEFT JOIN task_category tc ON t.category_id = tc.id
WHERE tc.id = ?  -- 替换为分类 ID
ORDER BY t.name;
```

### 统计各类资源的数量

```sql
SELECT
  resource_type,
  COUNT(*) as count
FROM resource_meta
GROUP BY resource_type;
```

## 系统配置查询

### 查询所有系统配置

```sql
SELECT * FROM system_config
ORDER BY config_key;
```

### 查询指定配置项

```sql
SELECT config_value
FROM system_config
WHERE config_key = ?;  -- 替换为配置键名
```

## 激活信息查询

### 查询当前激活状态

```sql
SELECT * FROM activation
WHERE status = 'active'
ORDER BY activation_date DESC
LIMIT 1;
```

### 查询即将过期的激活

## 系统配置查询

### 查询所有系统配置

```sql
SELECT * FROM system_config
ORDER BY config_key;
```

### 查询指定配置项

```sql
SELECT config_value
FROM system_config
WHERE config_key = ?;  -- 替换为配置键名
```

## 激活信息查询

### 查询当前激活状态

```sql
SELECT * FROM activation
WHERE status = 'active'
ORDER BY activation_date DESC
LIMIT 1;
```

### 查询即将过期的激活

```sql
SELECT * FROM activation
WHERE status = 'active'
  AND expiry_date BETWEEN date('now') AND date('now', '+30 days');
```

## 提示

- 所有查询中的 `?` 占位符应替换为实际的参数值
- 日期函数使用 SQLite 的 `date()` 和 `strftime()` 函数
- `COUNT(CASE WHEN ... THEN 1 END)` 用于条件计数
- `CAST(... AS REAL)` 用于确保除法运算结果为浮点数
