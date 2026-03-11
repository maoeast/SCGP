# Phase 4: CBCL Assessment Integration - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning
**Source:** PRD Express Path (d:\Desktop\架构设计与集成规划-CBCL(儿童行为量表)评估模块.txt)

<domain>
## Phase Boundary

CBCL (Achenbach儿童行为量表) 是全球应用最广泛的儿童行为评估工具，从社会能力与行为问题双视角进行综合画像。本阶段将其集成到系统的情绪模块中，提供临床级的评估能力。

**核心交付物：**
1. 两步走评估流程（社会能力表单 + 113道行为问题）
2. 基于性别×年龄段的动态常模计分引擎
3. 包含临床剖面图的专业级报告

</domain>

<decisions>
## Implementation Decisions

### UI/UX Design
- **Two-Step Wizard 流程**：Step 1 使用 CBCLSocialForm.vue 收集社会能力数据；Step 2 复用评估引擎展示113道行为题
- **分页显示**：题量极大（113题），采用分页（每页10题）或虚拟滚动，增加实时进度保存
- **图表优先**：报告页面使用 ECharts 绘制临床剖面图（雷达图或多列柱状图）

### Technical Architecture
- **策略模式引擎**：移植《自动计分引擎.js》到 TypeScript，创建 CBCLDriver.ts
- **动态常模匹配**：根据受试者性别和月龄匹配正确的常模配置块
- **标准化数据接口**：社会能力3因子、行为问题8-9个因子、内化/外化/总分的原始分与T分

### Data Structure
- **异构问卷处理**：社会能力部分（Part 2）使用非标准化表单；行为问题（Part 3）使用标准3点Likert计分
- **常模树复杂度**：区分性别（男/女）× 年龄段（4-5岁, 6-11岁, 12-16岁），不同组别因子名称、题号、数量完全不同
- **报告解释配置**：整合《报告解释生成引擎.js》到 feedbackConfig.js 的 ASSESSMENT_LIBRARY.cbcl

### Database Schema
- **结构化JSON字段**：social_competence_data, behavior_raw_scores, factor_t_scores, summary_level
- **扩展性考虑**：支持未来其他评估量表的类似复杂数据结构

### Claude's Discretion
- 使用现有的 ScaleDriver 架构进行扩展
- 保持与 SDQ、SRS-2 评估一致的UI风格
- 虚拟滚动 vs 分页的具体实现选择（根据性能测试结果）
- ECharts 图表的具体样式和交互细节

</decisions>

<specifics>
## Specific Ideas

### Phase 1: 底层数据与字典基建
- 提取113道行为题到 cbcl-questions.ts
- 提取常模字典（男/女 × 年龄段的因子映射与阈值）到 cbcl-norms.ts
- 整合报告解释文案到 feedbackConfig.js

### Phase 2: 数据库表设计
- 在 init.ts 中设计 cbcl_assess 表
- 字段：social_competence_data (JSON), behavior_raw_scores, factor_t_scores, summary_level

### Phase 3: 驱动器与算分引擎 (CBCLDriver.ts)
- 实现基于性别和年龄的动态因子分数计算
- 实现 generateFeedback，整合社会能力和行为问题双重视角的综合反馈

### Phase 4: 定制化UI与交互实现
- CBCLSocialForm.vue 用于第一部分信息收集
- 改造 AssessmentContainer.vue 支持"先表单、后答题"的混合模式
- Report.vue 实现包含临床剖面图的专业级报告

### 参考文件位置
- docs/references/儿童行为量表（CBCL）- 2026数字化题目.md
- docs/references/儿童行为量表（CBCL）自动计分引擎.js
- docs/references/儿童行为量表（CBCL）报告解释生成引擎.js

</specifics>

<deferred>
## Deferred Ideas

- 4-5岁年龄组的详细因子常模（文档中提到此年龄段常模不同，当前仅计算总分）
- 家长/教师多信息源对比报告（当前仅实现家长版）
- 纵向追踪和历史趋势图表

</deferred>

---

*Phase: 04-cbcl-assessment-integration*
*Context gathered: 2026-03-09 via PRD Express Path*
