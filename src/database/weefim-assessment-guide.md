# WeeFIM评估建议到水平评级转换指南

## 概述

本系统解决了WeeFIM量表评估结果中水平为"未知"的问题，通过分析评估建议文本，自动推断各个领域项目的水平评分（1-7分）。

## 核心功能

### 1. 评估文本解析 (`weefim-assessment-parser.ts`)

- **解析评估文本**：自动识别评估文本中的关键词和描述
- **提取总体水平**：根据文本描述判断儿童的总体功能独立性水平
- **领域评估提取**：将文本按不同领域（自我照顾、括约肌控制等）分类
- **生成评估报告**：提供详细的评估结果和建议

### 2. 评估映射算法 (`weefim-assessment-mapper.ts`)

- **关键词映射**：将描述性语言转化为量化评分
- **领域分析**：针对6个主要领域建立专门的评分映射
- **置信度评估**：为每个评分提供置信度评分
- **综合分析**：结合文本分析和水平推断

### 3. 集成功能 (`weefim-data.ts`)

- `inferScoresFromAssessmentText()`: 从评估文本推断各项目评分
- `generateAssessmentFromRecommendations()`: 生成完整的评估结果

## 使用方法

### 基本用法

```typescript
import { parseWeeFIMAssessment } from './weefim-assessment-parser';

const assessmentText = `
  儿童功能独立性中等，在日常生活和认知功能上既有一定的自主能力，
  又在多个方面需要不同程度的协助。进食时能独立完成大部分动作，
  但偶尔需要他人提醒...
`;

const result = parseWeeFIMAssessment(assessmentText);
console.log('各项目评分:', result.scores);
console.log('评估报告:', result.report);
```

### 高级用法

```typescript
import { generateAssessmentFromRecommendations } from './weefim-data';

const assessment = generateAssessmentFromRecommendations(
  assessmentText,
  ['建议加强梳洗修饰练习', '提高社交互动能力']
);

console.log('总分:', assessment.total_score);
console.log('运动功能分:', assessment.motor_score);
console.log('认知功能分:', assessment.cognitive_score);
```

## 评分映射规则

### 自我照顾领域（项目1-6）

- **7分（完全独立）**：关键词如"独立完成"、"无需协助"、"完全自主"
- **6分（基本独立）**：关键词如"大部分独立"、"轻微协助"、"较小协助"
- **5分（监护或准备）**：关键词如"偶尔需要"、"少量辅助"、"提醒"
- **4分（中度帮助）**：关键词如"中度协助"、"部分完成"、"需要帮助"
- **3分（重度帮助）**：关键词如"大量协助"、"完成大部分"、"他人完成"
- **2分（极重度帮助）**：关键词如"极少量"、"大部分依赖"、"只能少量"
- **1分（完全依赖）**：关键词如"完全不能"、"完全依赖"、"无自主能力"

### 其他领域

类似地，为其他5个领域（括约肌控制、转移、行走、沟通、社会认知）建立了专门的映射规则。

## 示例演示

运行示例代码查看实际效果：

```typescript
import { runAssessmentExamples } from './weefim-assessment-example';
runAssessmentExamples();
```

## 注意事项

1. **文本质量**：评估文本越详细、越具体，推断结果越准确
2. **关键词匹配**：系统基于关键词匹配，建议使用标准化的评估描述
3. **置信度**：每个评分都有置信度评分，低置信度的评分需要人工核实
4. **默认值**：无法确定的情况下，系统会使用默认中等评分（4分）

## 扩展建议

1. **添加更多关键词**：根据实际使用情况，可以扩展关键词库
2. **调整权重**：不同关键词的重要性可以设置不同的权重
3. **机器学习**：收集足够数据后，可以使用机器学习算法优化映射规则
4. **人工校验**：建立人工校验机制，持续改进系统准确性

## 技术实现

- **TypeScript**：使用TypeScript确保类型安全
- **模块化设计**：功能分离，易于维护和扩展
- **错误处理**：完善的错误处理机制
- **文档齐全**：提供详细的使用说明和示例