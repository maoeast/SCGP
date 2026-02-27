# 生活自理适应综合训练系统 - 文档索引

> 本文档提供项目所有技术文档的快速索引和说明

---

## 📚 文档分类

### 📋 一、需求与计划类 (`planning/`)

#### 核心需求文档
- **[prd.md](./planning/prd.md)** - 产品需求文档 (PRD)
  - 产品概述、功能需求、用户角色与权限
  - 系统架构设计、数据模型
  - S-M量表、WeeFIM量表、26项生活自理评估详细设计

- **[开发计划.md](./planning/开发计划.md)** - 开发计划与时间规划
  - 9个开发阶段详细规划（23周总周期）
  - 优先级划分（P0-P4）
  - 技术难点分析、资源需求、质量标准

#### 训练任务设计
- **[27项生活自理任务标准分解步骤说明_.md](./planning/27项生活自理任务标准分解步骤说明_.md)**
  - 27项生活自理任务的详细步骤分解
  - 6大类别：饮食、个人卫生、穿着、如厕、居家生活、社区生活
  - 包含简化版、安全提示、辅助工具说明

- **[27项生活自理任务标准化评估量表设计.md](./planning/27项生活自理任务标准化评估量表设计.md)**
  - 0-4五级评分制设计
  - 6大领域评估表格
  - IEP目标制定建议和使用说明

- **[27项生活自理任务描述.md](./planning/27项生活自理任务描述.md)**
  - 每项任务的功能导向描述
  - 任务教学重点和数据指标
  - 性别差异、安全提示

- **[训练任务分类.md](./planning/训练任务分类.md)**
  - 训练任务分类规范

#### 教学资源设计
- **[生活自理训练步骤卡模板系统.md](./planning/生活自理训练步骤卡模板系统.md)**
  - 步骤卡模板设计系统

- **[生活自理训练任务描述讲解课件系统.md](./planning/生活自理训练任务描述讲解课件系统.md)**
  - 任务描述讲解课件系统

---

### 🔧 二、技术设计类 (`tech-design/`)

#### 核心架构文档
- **[开发文档.md](./tech-design/开发文档.md)** - 项目开发文档（主要技术文档）
  - 技术栈、项目结构、开发阶段详解
  - 存储架构（SQL.js + IndexedDB双层）
  - 激活系统流程、数据同步机制
  - 已知问题和解决方案、调试技巧

- **[激活系统.md](./tech-design/激活系统.md)** - 激活系统架构详解
  - RSA-2048数字签名验证
  - 机器指纹生成（宽松模式60%容忍度）
  - AES-256加密 + HMAC-SHA256防篡改
  - 试用期管理、IPC通信接口

#### 系统分析
- **[生活自理适应综合训练系统 - 全面分析与优化建议.md](./tech-design/生活自理适应综合训练系统 - 全面分析与优化建议.md)**
  - 当前实现状态评估（完成度分析）
  - 存在的问题与缺陷（关键/次要问题）
  - 短期/中期/长期优化方案
  - 安全性提升、用户体验改进建议
  - 技术债务清理、优先级总结

- **[sm-tables-index-issue.md](./tech-design/sm-tables-index-issue.md)** - S-M量表换算表索引问题分析
  - 年龄分段和换算表索引不匹配问题
  - 问题原因和解决方案

---

### 📝 三、Bug修复与功能升级记录 (`logs/`)

#### S-M量表相关修复
- **[sm-score-fix-implementation.md](./logs/sm-score-fix-implementation.md)** - S-M量表粗分转标准分计算修复实施
  - 问题描述：95分（5岁）应为10分标准分
  - 修复内容：更新换算表、修改计算函数
  - 测试用例验证结果

- **[sm-score-fix-summary.md](./logs/sm-score-fix-summary.md)** - S-M量表计算修正总结
  - 使用官方CSV文件作为数据源
  - 5岁儿童换算标准详解
  - 其他关键年龄段标准

#### WeeFIM量表相关修复
- **[weefim-level-fix-implementation.md](./logs/weefim-level-fix-implementation.md)** - WeeFIM评估报告水平显示修复
  - 问题：水平字段显示"未知"
  - 修复：添加WeeFIM特有的6级水平等级映射
  - 更新4个函数的详细说明

- **[weefim-pdf-word-consistency-implementation.md](./logs/weefim-pdf-word-consistency-implementation.md)** - WeeFIM PDF与Word报告一致性升级
  - 统一七大报告结构
  - 视觉格式统一
  - 技术实现更新

- **[weefim-word-export-implementation.md](./logs/weefim-word-export-implementation.md)** - WeeFIM Word导出功能升级
  - 添加完整的独立性等级评定
  - 优化报告格式
  - 新增内容：评估编号、专业转介建议等

#### 系统问题修复
- **[font-awesome-issue-analysis.md](./logs/font-awesome-issue-analysis.md)** - Font Awesome图标问题分析
  - 问题根本原因：版本不匹配（5.x图标名 vs 6.x CDN）
  - 完整解决方案（3种方案）
  - Font Awesome 5.x → 6.x 迁移映射表

- **[font-awesome-fix-implementation.md](./logs/font-awesome-fix-implementation.md)** - Font Awesome图标修复实施记录
  - 路由图标、组件图标修复清单
  - 修复效果验证
  - 图标配置文件创建
  - 后续建议：本地化Font Awesome

- **[indexeddb-issue-analysis.md](./logs/indexeddb-issue-analysis.md)** - IndexedDB数据丢失问题分析
  - 问题根本原因：清除浏览器数据会删除IndexedDB
  - 4种解决方案详解（双重备份、备份提醒、恢复向导、用户教育）
  - 技术实现代码示例

- **[indexeddb-fix-implementation.md](./logs/indexeddb-fix-implementation.md)** - IndexedDB数据丢失问题修复实施记录
  - 实施方案：双重备份机制（IndexedDB + 本地文件）
  - 详细实施步骤（5个模块修改）
  - 数据存储位置、测试验证
  - 后续建议

---

## 🗂️ 快速导航

### 按文档用途分类

#### 🎯 新人入门必读
1. [README.md](../README.md) - 项目说明
2. [prd.md](./planning/prd.md) - 产品需求文档
3. [开发文档.md](./tech-design/开发文档.md) - 开发文档

#### 👨‍💻 开发人员参考
- [开发计划.md](./planning/开发计划.md) - 开发计划
- [激活系统.md](./tech-design/激活系统.md) - 激活系统架构
- [生活自理适应综合训练系统 - 全面分析与优化建议.md](./tech-design/生活自理适应综合训练系统 - 全面分析与优化建议.md) - 系统分析

#### 🐛 问题排查参考
- [font-awesome-issue-analysis.md](./logs/font-awesome-issue-analysis.md)
- [indexeddb-issue-analysis.md](./logs/indexeddb-issue-analysis.md)
- [sm-tables-index-issue.md](./tech-design/sm-tables-index-issue.md)

#### 📊 评估与训练设计
- [27项生活自理任务标准化评估量表设计.md](./planning/27项生活自理任务标准化评估量表设计.md)
- [27项生活自理任务标准分解步骤说明_.md](./planning/27项生活自理任务标准分解步骤说明_.md)
- [27项生活自理任务描述.md](./planning/27项生活自理任务描述.md)

---

## 📊 文档统计

| 分类 | 文件数量 | 说明 |
|-----|---------|------|
| 需求与计划 | 8个 | PRD、开发计划、训练任务设计 |
| 技术设计 | 4个 | 开发文档、激活系统、系统分析 |
| 修复记录 | 9个 | Bug修复和功能升级记录 |
| **总计** | **21个** | 不含README.md |

---

## 🔄 文档更新记录

| 日期 | 更新内容 | 更新人 |
|-----|---------|--------|
| 2025-12-23 | 创建文档索引，整理所有md文件到docs目录 | Claude Code |
| 2025-12-22 | 完成IndexedDB数据丢失问题修复 | Claude Code |
| 2025-12-22 | 完成Font Awesome图标问题修复 | Claude Code |
| 2025-12-17 | 完成系统集成与数据整合 | 开发团队 |

---

## 📌 文档维护规范

### 新增文档命名规范
- **需求文档**：`功能名称.md`
- **技术文档**：`模块名称.md`
- **问题分析**：`问题关键词-issue-analysis.md`
- **修复记录**：`问题关键词-fix-implementation.md`
- **总结文档**：`主题-summary.md`

### 文档分类规则
- **planning/** - 产品需求、开发计划、训练任务设计
- **tech-design/** - 技术架构、系统设计、分析报告
- **logs/** - Bug修复记录、功能升级记录、实施日志

### 索引更新
每次新增或移动文档后，请更新本索引文件。

---

**文档索引版本**: v1.0
**创建时间**: 2025-12-23
**最后更新**: 2025-12-23
**维护者**: 开发团队
