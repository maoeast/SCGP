---
name: report-generator
description: 提供评估报告生成功能，支持 S-M 量表和 WeeFIM 量表的报告导出。当用户需要生成、导出或自定义评估报告时使用此 skill。
---

# 评估报告生成 Skill

此 skill 提供感官综合训练与评估系统的评估报告生成功能，包括数据提取、模板渲染和文件导出。

## 何时使用

- 生成学生的 S-M 量表评估报告
- 生成学生的 WeeFIM 量表评估报告
- 导出评估报告为 Word 或 PDF 格式
- 自定义报告模板或样式
- 批量生成多个学生的评估报告
- 添加报告水印或公司信息

## 报告类型

### 1. S-M 量表评估报告

包含内容：

- 学生基本信息（姓名、性别、年龄、入训日期等）
- 评估基本信息（评估日期、评估人、年龄阶段）
- 总分及对应常模解释
- 各项目得分详情
- 评估结论和建议

### 2. WeeFIM 量表评估报告

包含内容：

- 学生基本信息
- 评估基本信息
- 总分、运动功能得分、认知功能得分
- 各项目得分详情（按分类）
- 评估结论和建议

## 使用方法

### 1. 生成单份评估报告

#### S-M 评估报告生成流程

1. **提取学生信息**：
   - 从 `student` 表获取学生基本信息
   - 计算年龄（基于生日和评估日期）

2. **提取评估数据**：
   - 从 `sm_assess` 获取评估主记录
   - 从 `sm_assess_detail` 获取各项目得分
   - 从 `sm_question` 关联题目内容
   - 从 `sm_age_stage` 获取年龄阶段信息

3. **匹配常模数据**：
   - 从 `sm_norm` 表查询对应的常模范围
   - 确定评估结果的解释说明

4. **渲染报告**：
   - 使用 `references/sm-report-template.md` 作为模板
   - 填充数据到模板中
   - 应用样式和格式

5. **导出文件**：
   - 生成 Word 文档（.docx）或 PDF 文档
   - 保存到指定目录

#### WeeFIM 评估报告生成流程

1. **提取学生信息**：
   - 从 `student` 表获取学生基本信息

2. **提取评估数据**：
   - 从 `weefim_assess` 获取评估主记录
   - 从 `weefim_assess_detail` 获取各项目得分
   - 从 `weefim_question` 关联题目内容
   - 从 `weefim_category` 获取分类信息

3. **渲染报告**：
   - 使用 `references/weefim-report-template.md` 作为模板
   - 填充数据到模板中
   - 按运动功能和认知功能分类展示

4. **导出文件**：
   - 生成 Word 文档或 PDF 文档

### 2. 批量生成报告

使用 `scripts/generate-batch-reports.js` 脚本批量生成多个学生的评估报告。

### 3. 自定义报告模板

- 修改 `references/sm-report-template.md` 自定义 S-M 报告模板
- 修改 `references/weefim-report-template.md` 自定义 WeeFIM 报告模板
- 支持添加公司 Logo、水印、页眉页脚等

## 代码 API 使用

### S-M 评估报告生成

```typescript
import { generateSMReport } from '@/utils/reportGenerator'

// 生成 S-M 评估报告
const reportData = await generateSMReport({
  studentId: 1,
  assessId: 5,
  format: 'docx', // 'docx' 或 'pdf'
})

// 保存报告文件
await saveReport(reportData, 'path/to/save/report.docx')
```

### WeeFIM 评估报告生成

```typescript
import { generateWeeFIMReport } from '@/utils/reportGenerator'

// 生成 WeeFIM 评估报告
const reportData = await generateWeeFIMReport({
  studentId: 1,
  assessId: 10,
  format: 'docx',
})

// 保存报告文件
await saveReport(reportData, 'path/to/save/report.docx')
```

### 批量生成报告

```typescript
import { generateBatchReports } from '@/utils/reportGenerator'

// 批量生成报告
const results = await generateBatchReports({
  studentIds: [1, 2, 3],
  assessType: 'sm', // 'sm' 或 'weefim'
  format: 'docx',
  outputDir: 'reports/',
})
```

## 报告数据提取参考

### S-M 评估报告所需数据

使用 `references/common-queries.md` 中的以下查询：

- "查询学生的所有 S-M 评估记录"
- "查询 S-M 评估详情（包含题目和得分）"
- "查询指定学生的评估结果"

### WeeFIM 评估报告所需数据

使用 `references/common-queries.md` 中的以下查询：

- "查询学生的所有 WeeFIM 评估记录"
- "查询 WeeFIM 评估详情（包含分类和得分）"

## 报告模板变量

### 学生信息变量

- `{{student.name}}` - 学生姓名
- `{{student.gender}}` - 性别
- `{{student.age}}` - 年龄
- `{{student.birthday}}` - 出生日期
- `{{student.admission_date}}` - 入训日期
- `{{student.diagnosis}}` - 诊断信息

### S-M 评估变量

- `{{assess.id}}` - 评估 ID
- `{{assess.date}}` - 评估日期
- `{{assess.total_score}}` - 总分
- `{{assess.age_stage}}` - 年龄阶段
- `{{assessor.name}}` - 评估人姓名
- `{{items}}` - 评估项目数组（包含题目和得分）

### WeeFIM 评估变量

- `{{assess.id}}` - 评估 ID
- `{{assess.date}}` - 评估日期
- `{{assess.total_score}}` - 总分
- `{{assess.motor_score}}` - 运动功能得分
- `{{assess.cognitive_score}}` - 认知功能得分
- `{{assessor.name}}` - 评估人姓名
- `{{categories}}` - 评估分类数组（包含项目和得分）

## 文档生成库

项目使用以下库生成文档：

- **docx**: 生成 Word 文档（.docx）
- **jspdf**: 生成 PDF 文档（.pdf）

## 注意事项

- 生成报告前确保评估数据完整
- Word 格式支持更好的排版和样式
- PDF 格式适合打印和归档
- 批量生成时注意处理并发和错误
- 报告文件命名建议格式：`{学生姓名}_{评估日期}_{评估类型}_报告.docx`

## 常见问题

### Q: 如何添加公司 Logo 到报告？

A: 修改模板文件，在标题下方添加图片占位符，使用 docx 库的 Image 功能插入 Logo。

### Q: 如何修改报告样式？

A: 修改模板文件中的样式定义，或直接在生成代码中设置字体、颜色、间距等样式属性。

### Q: 如何生成带水印的报告？

### Q: 如何添加公司 Logo 到报告？

A: 修改模板文件，在标题下方添加图片占位符，使用 docx 库的 Image 功能插入 Logo。

### Q: 如何修改报告样式？

A: 修改模板文件中的样式定义，或直接在生成代码中设置字体、颜色、间距等样式属性。

### Q: 如何生成带水印的报告？

A: 使用 docx 或 jsPDF 库的水印功能，在页面背景添加透明文字或图片。
