---
name: sqlite-db-manager
description: 提供感官综合训练与评估系统 SQLite 数据库的管理、查询和分析功能。当用户需要查看数据库结构、执行查询、分析数据关系或进行数据库操作时使用此 skill。
---

# SQLite 数据库管理 Skill

此 skill 用于管理感官综合训练与评估系统的 SQLite 数据库，提供表结构查询、数据检索、关系分析和常用操作指南。

## 何时使用

- 查询数据库表结构或字段信息
- 检索学生、评估、训练记录等数据
- 理解表之间的关系和外键约束
- 执行常用数据库操作（数据统计、筛选等）
- 分析评估结果和训练进度
- 需要快速定位数据库相关代码

## 数据库概述

系统使用 SQL.js 实现的 SQLite 数据库，包含以下核心数据表：

### 核心表

- `student` - 学生信息表
- `user` - 用户表（管理员/教师）
- `sm_assess` - S-M 量表评估主表
- `sm_assess_detail` - S-M 量表评估详情表
- `weefim_assess` - WeeFIM 量表评估主表
- `weefim_assess_detail` - WeeFIM 量表评估详情表
- `train_plan` - 训练计划主表
- `train_plan_detail` - 训练计划详情表
- `train_log` - 训练记录表
- `task` - 训练任务表
- `resource_meta` - 资源表

### 支持表

- `sm_age_stage` - S-M 量表年龄阶段表
- `sm_question` - S-M 量表题目表
- `sm_norm` - S-M 量表常模表
- `weefim_category` - WeeFIM 量表分类表
- `weefim_question` - WeeFIM 量表题目表
- `task_category` - 训练任务分类表
- `task_level` - 训练任务难度表
- `task_step` - 训练任务步骤表

### 系统表

- `system_config` - 系统配置表
- `activation` - 激活信息表

## 使用方法

### 1. 查看表结构

要查看数据库的完整表结构，参考 `references/database-schema.md` 文件，该文件包含所有表的字段定义、数据类型和约束。

### 2. 执行常用查询

参考 `references/common-queries.md` 文件，获取常用 SQL 查询示例，包括：

- 查询所有学生信息
- 查询指定学生的评估结果
- 统计训练记录数据
- 查找特定条件的记录

### 3. 理解表关系

参考 `references/table-relationships.md` 文件，了解表之间的外键关系和关联方式。

### 4. 使用数据库 API

数据库操作通过 `src/database/api.ts` 中的 API 类进行，主要类包括：
的外键关系和关联方式。

### 4. 使用数据库 API

数据库操作通过 `src/database/api.ts` 中的 API 类进行，主要类包括：

- `UserAPI` - 用户管理
- `StudentAPI` - 学生管理
- `SMAssessAPI` - S-M 量表评估
- `WeeFIMAssessAPI` - WeeFIM 量表评估
- `TrainPlanAPI` - 训练计划管理
- `TrainLogAPI` - 训练记录管理
- `ResourceAPI` - 资源管理

### 5. 数据库初始化和迁移

数据库初始化脚本位于 `src/database/init.ts`，表结构定义在 `src/database/schema.sql`。如需修改数据库结构，更新这两个文件。

## 常见场景

### 场景 1: 查询学生的所有评估结果

1. 从 `student` 表获取学生 ID
2. 使用 `sm_assess` 和 `sm_assess_detail` 表查询 S-M 评估
3. 使用 `weefim_assess` 和 `weefim_assess_detail` 表查询 WeeFIM 评估

参考 `references/common-queries.md` 中的示例查询。

### 场景 2: 统计训练记录

使用 `train_log` 表统计训练次数、完成情况等数据。参考 `references/common-queries.md` 中的统计查询。

### 场景 3: 导出评估报告

从 `sm_assess`、`weefim_assess` 及其详情表获取评估数据，结合常模数据生成报告。

## 注意事项

- 数据库文件位置：应用程序根目录或用户数据目录
- 修改数据库结构前务必备份数据库文件
- 所有数据库操作应通过 API 类进行，确保数据一致性
- 删除操作前确认外键约束，避免数据不一致
