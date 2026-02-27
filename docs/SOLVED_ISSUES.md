# 已解决问题归档 (SOLVED_ISSUES)

此文件记录项目中已解决的历史问题，供后续参考。

---

## Conners PSQ/TRS 评估模块 (2026-01-29)

| 问题描述 | 解决方案 | 提交 |
| :--- | :--- | :--- |
| Conners 性别×年龄常模数据缺失 | 实现 conners-norms.ts，包含男女5个年龄段 | fce6725 |
| Conners PI/NI 效度检查逻辑错误 | 修正为高分才可疑(PI>2.5, NI>2.2) | be0d3d8 |
| Conners 漏填处理机制缺失 | 实现10%容忍度+平均分填补 | be0d3d8 |

---

## CSIRS 感觉统合评估模块 (2026-01-28)

| 问题描述 | 解决方案 |
| :--- | :--- |
| age_months字段NOT NULL约束失败 | 添加计算属性从birthday计算月龄 |
| T分计算结果错误（分数倒置） | 修复转换表数据和搜索逻辑 |
| Executive维度配置错误 | 移除转换表，独立处理 |
| Flags未持久化 | 添加flags字段和迁移逻辑 |
| 维度名称不匹配 | 修复proprioceptive → proprioception |
| 报告页建议简单 | 集成feedbackConfig.js |

---

**最后更新**: 2026-01-29
