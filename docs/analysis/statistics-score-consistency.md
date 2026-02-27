# 跨模块统计分值一致性分析报告

## 📊 问题分析

### 当前视图的分值类型

| 数据源 | 分值类型 | 分值范围 | 计算方式 |
|:-------|:--------|:---------|:---------|
| 游戏训练记录 | 百分比 | 0-100 | `AVG(accuracy_rate * 100)` |
| 器材训练记录 | 整数 | 1-5 | `AVG(CAST(score AS REAL))` |
| 评估记录 | 无分值 | - | `NULL` |

### ⚠️ 当前视图的问题

**问题：在第 352 行的计算**
```sql
AVG(s.avg_score) AS average_score
```

当 `module_code = 'all'` 时，这个计算会：
1. 将游戏的百分比分值（如 80）与器材的整数分值（如 4）混合
2. 计算出的平均分失去参考意义

**示例场景：**
- 游戏训练：80% → avg_score = 80
- 器材训练：4/5 → avg_score = 4
- **全部模式 AVG：(80 + 4) / 2 = 42** ❌ 无意义！

---

## ✅ 解决方案

### 方案 A：按模块分别展示（推荐）

#### 修改后的视图
```sql
CREATE VIEW IF NOT EXISTS v_class_statistics_unified AS
WITH
-- 训练记录统计（保持原有逻辑）
training_stats AS (
  SELECT
    class_id,
    class_name,
    'sensory' AS module_code,
    COUNT(*) AS training_count,
    AVG(accuracy_rate * 100) AS avg_score,
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
  SELECT class_id, class_name, module_code, training_count,
         0 AS assessment_count, avg_score, last_training_date AS last_activity_date,
         'training' AS activity_type
  FROM training_stats
  UNION ALL
  SELECT class_id, class_name, module_code, training_count,
         0 AS assessment_count, avg_score, last_training_date AS last_activity_date,
         'equipment' AS activity_type
  FROM equipment_stats
  UNION ALL
  SELECT class_id, class_name, module_code,
         0 AS training_count, assessment_count,
         NULL AS avg_score, last_assessment_date AS last_activity_date,
         'assessment' AS activity_type
  FROM assessment_stats
)

-- 最终聚合统计
-- 关键修改：当 module_code = 'all' 时，average_score 设为 NULL
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
  -- 修改：全部模式下不计算平均分，或只计算特定类型
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
```

### 方案 B：UI 层按模块分别展示（无需修改视图）

在 `ClassManagement.vue` 中修改统计面板，按模块分别显示：

```vue
<template>
  <!-- 统计面板 -->
  <el-card shadow="never" class="stats-card">
    <template #header>
      <div class="card-header">
        <span>统计概览 - {{ currentModuleName }}</span>
        <el-tag type="info">{{ statistics.length }} 个班级</el-tag>
      </div>
    </template>

    <!-- 按模块分开展示 -->
    <el-tabs v-model="activeStatsTab" type="border-card">
      <!-- 全部模块 -->
      <el-tab-pane label="全部模块" name="all">
        <StatsSummary :stats="allModuleStats" />
      </el-tab-pane>

      <!-- 感官统合 -->
      <el-tab-pane label="感官统合" name="sensory">
        <SensoryModuleStats :stats="sensoryModuleStats" />
      </el-tab-pane>

      <!-- 生活自理 -->
      <el-tab-pane label="生活自理" name="life_skills">
        <LifeSkillsModuleStats :stats="lifeSkillsModuleStats" />
      </el-tab-pane>
    </el-tabs>

    <!-- 详细统计表格 -->
    <el-table :data="statistics" stripe>
      <!-- 表格列 -->
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
// 按模块分组统计数据
const statsByModuleGrouped = computed(() => {
  const grouped = {
    all: statistics.value.filter(s => s.module_code === 'all'),
    sensory: statistics.value.filter(s => s.module_code === 'sensory'),
    life_skills: statistics.value.filter(s => s.module_code === 'life_skills')
  }
  return grouped
})

// 计算各模块的平均分
const averageScoresByModule = computed(() => {
  return {
    sensory: calculateAverageScore('sensory'),
    life_skills: calculateAverageScore('life_skills')
  }
})

function calculateAverageScore(moduleCode: string) {
  // 只计算有 avg_score 的记录
  const statsWithScores = statistics.value
    .filter(s => s.module_code === moduleCode && s.averageScore !== null)

  if (statsWithScores.length === 0) return null

  return statsWithScores.reduce((sum, s) => sum + s.averageScore, 0) / statsWithScores.length
}
</script>
```

---

## 📋 推荐的验证流程

### 步骤 1：准备测试环境

1. 确保有测试班级（如 "1年级1班"）
2. 确认该班级有至少 2 名学生

### 步骤 2：插入测试数据

使用 SQL 脚本或 JavaScript 函数：

```javascript
// 在浏览器控制台中执行
createTestData(1)  // 为班级 ID=1 创建测试数据
```

### 步骤 3：验证视图输出

```javascript
// 查看验证结果
verifyStatistics(1)
```

预期输出示例：

```
【第五步】分值一致性分析
  training_records:
    分值类型: percentage
    数量: 1
    平均分: 80
    分值范围: 80 - 80
  equipment_training:
    分值类型: integer_1_5
    数量: 1
    平均分: 4
    分值范围: 4 - 4

【第六步】分值一致性风险评估
⚠️  "全部模块" 模式下的平均分: 42
⚠️  问题分析:
  ❌ 存在混合分值类型：
     - 游戏训练：百分比（0-100）
     - 器材训练：整数（1-5）
     → 简单的 AVG 聚合会导致平均分失去参考意义
```

### 步骤 4：UI 筛选功能验证

1. 打开"班级管理"页面
2. 选择"业务模块"下拉框：

| 选择项 | 预期结果 |
|:-------|:---------|
| 感官统合 | 显示游戏 + 器材的统计数据，平均分显示感官相关的分值 |
| 生活自理 | 显示评估次数，平均分为空或不显示 |
| 全部模块 | 显示汇总次数，但平均分应显示为分隔的模块平均分或空值 |

---

## 🎯 最终建议

### 建议 1：视图层面（推荐实施）

修改 `v_class_statistics_unified` 视图的第 352 行：

```sql
-- 修改前
AVG(s.avg_score) AS average_score

-- 修改后（全部模式下不计算平均分）
CASE
  WHEN COALESCE(s.module_code, 'all') = 'all' THEN NULL
  ELSE AVG(s.avg_score)
END AS average_score
```

### 建议 2：UI 展示层面

在统计面板中，当选择"全部模块"时：

1. **隐藏总平均分**，或显示为 "—"（不适用）
2. **按模块分别显示平均分**：
   ```
   感官统合平均分: 80.5
   生活自理平均分: --
   ```

### 建议 3：API 层面（最灵活）

修改 `ClassAPI.getStatistics()` 返回结果：

```typescript
interface UnifiedClassStatistics {
  // ... 现有字段
  averageScore?: number
  // 新增：按活动类型分组的平均分
  averageScoresByActivity?: {
    training?: number
    equipment?: number
    assessment?: number
  }
}
```

---

## 📌 总结

| 问题 | 严重程度 | 解决方案 |
|:-----|:---------|:---------|
| 混合分值类型导致平均分无意义 | 🔴 高 | 全部模式下不计算平均分 |
| 用户可能误解平均分含义 | 🟡 中 | UI 上按模块分开展示或标注分值类型 |
| 跨模块数据汇总困难 | 🟢 低 | 提供按模块分组的详细统计 |

**推荐实施方案：建议 1 + 建议 2**
- 视图层面：全部模式下返回 NULL
- UI 层面：按模块分别显示平均分
