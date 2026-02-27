---
name: test-data-generator
description: 提供测试数据生成功能，包括学生、评估、训练记录等数据的创建。当用户需要生成测试数据、创建演示数据或进行压力测试时使用此 skill。
---

# 测试数据生成 Skill

此 skill 提供感官综合训练与评估系统的测试数据生成功能，包括学生信息、评估记录、训练数据等的创建。

## 何时使用

- 生成测试用学生数据
- 创建评估记录（S-M 和 WeeFIM）
- 生成训练计划和训练记录
- 创建演示数据
- 进行压力测试
- 测试报告生成功能
- 测试数据库性能

## 数据类型

### 1. 学生数据

包含字段：

- 姓名（随机中文姓名）
- 性别（随机）
- 出生日期（随机年龄）
- 入训日期
- 诊断信息（可选）
- 备注

### 2. 用户数据

包含字段：

- 用户名（唯一）
- 密码（加密）
- 角色（admin/teacher）
- 真实姓名

### 3. S-M 评估数据

包含字段：

- 学生 ID
- 评估日期
- 评估人 ID
- 总分（根据题目得分计算）
- 年龄阶段 ID
- 各项目得分（随机生成）

### 4. WeeFIM 评估数据

包含字段：

- 学生 ID
- 评估日期
- 评估人 ID
- 总分（根据题目得分计算）
- 运动功能得分
- 认知功能得分
- 各项目得分（随机生成）

### 5. 训练计划数据

包含字段：

- 学生 ID
- 计划名称
- 开始日期
- 结束日期
- 创建人 ID
- 状态（active/completed/paused）
- 训练任务列表

### 6. 训练记录数据

包含字段：

- 计划详情 ID
- 学生 ID
- 训练师 ID
- 训练日期
- 持续时间（分钟）
- 训练结果
- 备注

## 使用方法

### 1. 生成学生数据

```bash
# 生成 10 个学生
node scripts/generate-test-data.js --type student --count 10

# 生成指定年龄范围的学生
node scripts/generate-test-data.js --type student --min-age 3 --max-age 8 --count 20
```

### 2. 生成用户数据

```bash
# 生成管理员账户
node scripts/generate-test-data.js --type user --role admin --count 1

# 生成教师账户
node scripts/generate-test-data.js --type user --role teacher --count 5
```

### 3. 生成评估数据

#### S-M 评估

```bash
# 为指定学生生成 S-M 评估记录
node scripts/generate-test-data.js --type sm-assess --student-id 1 --count 3

# 为所有学生生成评估记录
node scripts/generate-test-data.js --type sm-assess --all-students --count 2
```

#### WeeFIM 评估

```bash
# 为指定学生生成 WeeFIM 评估记录
node scripts/generate-test-data.js --type weefim-assess --student-id 1 --count 3
```

### 4. 生成训练数据

#### 训练计划

```bash
# 为指定学生生成训练计划
node scripts/generate-test-data.js --type train-plan --student-id 1 --count 2

# 生成完整训练计划（包含任务）
node scripts/generate-test-data.js --type train-plan --student-id 1 --with-tasks --count 2
```

#### 训练记录

```bash
# 为指定训练计划生成训练记录
node scripts/generate-test-data.js --type train-log --plan-id 1 --count 20

# 为所有训练计划生成记录
node scripts/generate-test-data.js --type train-log --all-plans --count 10
```

### 5. 生成完整数据集

```bash
# 生成完整的演示数据（学生、用户、评估、训练）
node scripts/generate-test-data.js --full --students 20 --teachers 5

# 生成压力测试数据（大量数据）
node scripts/generate-test-data.js --stress --students 100 --assessments-per-student 10 --train-logs-per-plan 50
```

### 6. 重置测试数据

```bash
# 清空所有测试数据
node scripts/generate-test-data.js --reset

# 清空并重新生成完整数据集
node scripts/generate-test-data.js --reset --full
```

## 数据生成规则

### 学生数据规则

- 姓名：从 `assets/chinese-names.txt` 中随机选择
- 性别：50% 概率男，50% 概率女
- 年龄：根据配置的最小/最大年龄范围随机生成
- 入训日期：生日之后的随机日期
- 诊断信息：从常见诊断列表中随机选择（70% 概率有诊断）

### 评估数据规则

#### S-M 评估

- 评估日期：入训日期之后的随机日期
- 评估人：从用户表中随机选择教师
- 年龄阶段：根据评估结果总分确定
- 各项目得分：根据年龄阶段的常模范围随机生成
- 总分：所有项目得分之和

#### WeeFIM 评估

- 评估日期：入训日期之后的随机日期
- 评估人：从用户表中随机选择教师
- 运动功能得分：13 个题目得分之和
- 认知功能得分：5 个题目得分之和
- 总分：运动功能得分 + 认知功能得分
- 各项目得分：1-7 分随机

### 训练数据规则

#### 训练计划

- 计划名称：从预设列表中随机选择
- 开始日期：入训日期或上次评估日期之后
- 结束日期：开始日期 + 30-90 天随机
- 状态：根据日期确定（active/completed/paused）
- 任务数量：3-10 个随机
- 任务来源：从 task 表中随机选择

#### 训练记录

- 训练日期：训练计划期间内的随机日期
- 训练师：70% 概率有训练师，从教师列表随机
- 持续时间：10-60 分钟随机
- 训练结果：70% completed, 20% partial, 10% failed
- 备注：10% 概率有备注

## 脚本使用

### generate-test-data.js

主脚本文件，提供所有数据生成功能：

```javascript
const generator = require('./scripts/generate-test-data.js')

// 生成学生
await generator.generateStudents(10)

// 生成 S-M 评估
await generator.generateSMAssessments(studentId, 3)

// 生成训练计划
await generator.generateTrainPlans(studentId, 2)

// 生成完整数据集
await generator.generateFullDataset({
  students: 20,
  teachers: 5,
  assessmentsPerStudent: 2,
  plansPerStudent: 2,
  logsPerPlan: 10,
})
```

## 数据真实性保证

### 姓名

使用 `references/chinese-names.txt` 中的真实中文姓名库，确保姓名的真实性。

### 诊断信息

使用 `references/common-diagnoses.txt` 中的常见诊断列表：

- 脑瘫
- 自闭症谱系障碍
- 发育迟缓
- 脊髓损伤
- 脑外伤后等

### 评估数据

根据年龄阶段的常模范围生成评估数据，确保数据的合理性：

- 总分在对应年龄阶段的常模范围内
- 部分学生生成低于常模的数据
- 部分学生生成高于常模的数据
- 模拟真实评估中的异常值

## 数据校验

生成数据后自动进行校验：

1. **完整性校验**：所有必需字段都有值
2. **外键约束校验**：所有外键都有效
3. **逻辑一致性校验**：
   - 出生日期 < 入训日期 < 评估日期
   - 训练开始日期 < 结束日期
   - 训练日期在计划期间内
4. **数值范围校验**：
   - 年龄在合理范围内
   - 评估得分在合法范围内
   - 训练时长在合理范围内

## 输出报告

生成数据后输出详细报告：

```
生成数据报告
===================

学生数据: 20 条
  - 男: 10 条
  - 女: 10 条
  - 平均年龄: 5.2 岁

用户数据: 6 条
  - 管理员: 1 条
  - 教师: 5 条

评估数据: 40 条
  - S-M 评估: 20 条
  - WeeFIM 评估: 20 条

训练计划: 40 条
  - 活跃中: 25 条
  - 已完成: 15 条

训练记录: 400 条
  - 平均时长: 32 分钟
  - 完成率: 68%

总计: 506 条数据
```

## 注意事项

- **生产环境禁止使用**：测试数据生成脚本仅用于开发和测试环境
- **数据备份**：生成测试数据前备份现有数据
- **清空确认**：使用 `--reset` 选项前确认数据库中没有重要数据
- **数据量控制**：压力测试时注意数据量，避免超出数据库性能限制
- **真实性**：确保生成的数据符合实际业务逻辑和统计分布

## 常见问题

### Q: 如何生成特定条件的数据？

A: 修改脚本中的生成规则或使用命令行参数指定条件。

### Q: 如何确保生成的评估数据符合常模？

A: 脚本已内置常模范围查询，确保生成的总分在对应年龄阶段的常模范围内。

### Q: 如何模拟评估进步的数据？

A: 为同一学生生成多次评估，每次评估的总分比上一次略高。

### Q: 如何生成异常数据用于测试？

A: 修改脚本中的生成规则或使用命令行参数指定条件。

### Q: 如何确保生成的评估数据符合常模？

A: 脚本已内置常模范围查询，确保生成的总分在对应年龄阶段的常模范围内。

### Q: 如何模拟评估进步的数据？

A: 为同一学生生成多次评估，每次评估的总分比上一次略高。

### Q: 如何生成异常数据用于测试？

A: 使用 `--include-outliers` 参数生成包含异常值的数据。

## 文件位置

- 主脚本：`scripts/generate-test-data.js`
- 姓名库：`references/chinese-names.txt`
- 诊断列表：`references/common-diagnoses.txt`
- 配置文件：`references/test-data-config.json`
