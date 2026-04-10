# SCGP-CNBS-R2016 Integration TODO

> Scope: integrate `0-6岁儿童发育行为评估量表（儿心量表Ⅱ）` into the existing SCGP assessment module.
> Constraint: follow the current `AssessmentContainer + ScaleDriver + per-scale tables + report_record` mainline.
> Update rule: after a milestone is completed in later conversations, change that milestone and its finished subtasks from `[ ]` to `[x]`.

## References

- PRD: `docs/references/儿心量表Ⅱ/SCGP-CNBS-R2016-PRD.txt`
- Item source: `docs/references/儿心量表Ⅱ/0-6岁儿童发育行为评估量表（儿心量表Ⅱ）.pdf`
- Feedback config: `docs/references/儿心量表Ⅱ/CNBSR2016FeedbackConfig.js`

## Milestone 1: 数据库持久化扩展

- [ ] Milestone 1 完成
- [ ] 明确 `scgp_assess` 主表字段，覆盖学生、测评时间、月龄、总智龄 MA、发育商 DQ、状态等聚合数据
- [ ] 明确 `scgp_assess_detail` 明细表字段，覆盖题目编码、能区、月龄组、原始得分、权重、`is_auto_filled`、自动填充原因等
- [ ] 规划 `report_record.report_type = 'scgp'` 的初始化与迁移收口
- [ ] 规划 `init / migration / API` 的保存与读取边界，保持与现有分量表持久化模式一致
- [ ] 明确运行时校验项：主表、明细表、报告记录三处数据必须可交叉核对

## Milestone 2: 题库数据结构化

- [ ] Milestone 2 完成
- [ ] 从 PDF 整理全部 261 道题，建立稳定题目编号与原文映射
- [ ] 为每题补齐结构化元数据：`domain`、`age_group_months`、题干、展示顺序
- [ ] 按 PRD 规则整理各月龄组的 `score_weight`
- [ ] 明确五大能区题目分布：`gm`、`fm`、`ad`、`la`、`sb`
- [ ] 设计可落地的 TS 题库种子格式，保证后续驱动和报告都复用同一份题目真相源
- [ ] 完成 261 题数量、月龄组覆盖、权重分配的一致性校验清单

## Milestone 3: 核心引擎开发

- [ ] Milestone 3 完成
- [ ] 设计按儿童实际月龄选取最近起测月龄组的起点规则
- [ ] 设计按能区独立执行的 Basal 逻辑：连续 2 个月龄组全部通过即成立
- [ ] 设计 Basal 后更低月龄题目的自动补 1 规则，并保留 `is_auto_filled = true`
- [ ] 设计按能区独立执行的 Ceiling 逻辑：连续 2 个月龄组全部不通过即成立
- [ ] 设计 Ceiling 后更高月龄题目的自动补 0 规则，并保留 `is_auto_filled = true`
- [ ] 明确能区智龄、总智龄 MA、发育商 DQ 的计算链路
- [ ] 明确 DQ 状态映射：`excellent / good / normal / borderline / delayed`
- [ ] 明确 IEP 提取规则：仅提取 `score = 0` 且 `is_auto_filled = false` 的人工失败项

## Milestone 4: 测评交互适配

- [ ] Milestone 4 完成
- [ ] 将 `scgp` 测评卡片交互改为二元评分：`通过(1)` / `不通过(0)`
- [ ] 明确 `scgp` 在现有评估容器中的题目切换、回退、重答、续测行为
- [ ] 明确自动填充题在 UI 中的表现方式，避免与人工作答混淆
- [ ] 明确测评过程需要展示的上下文：当前能区、当前月龄组、儿童实际月龄
- [ ] 明确保存后重新进入测评时，二元作答与自动填充状态的恢复要求
- [ ] 明确与现有占位入口、学生详情、报告中心之间的联通验收项

## Milestone 5: 报告与专家引擎集成

- [ ] Milestone 5 完成
- [ ] 规划报告页展示字段：实际月龄、总智龄 MA、发育商 DQ、DQ 状态
- [ ] 规划年龄分段映射：`a1(0-12m)`、`a2(13-24m)`、`a3(25-36m)`、`a4(37-72m)`
- [ ] 规划从 `CNBSR2016FeedbackConfig.js` 接入 305 条评语配置的读取规则
- [ ] 明确 `年龄分段 + DQ 状态` 到专家评语的精确命中逻辑
- [ ] 明确报告中的干预建议提取逻辑，与 IEP 人工失败项保持一致
- [ ] 明确 `report_record`、报告页渲染结果、持久化明细三者的一致性校验项
