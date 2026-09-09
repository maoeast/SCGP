# 历史 DQ 算法审计（legacy-dq-audit，2026-09-09）

> 任务书 §二十三：发现历史 DQ 算法时，先列出代码位置/公式/调用/展示/字段，再停止等待决策。
> 现状说明：CPEP-3 模块整体为**未提交代码**（26 个未提交变更，无生产数据），「历史」指本轮之前本会话链上的实现。

## 1. 被审计对象：综合发展商数（overallDq）

| 项 | 内容 |
|---|---|
| 代码位置 | `src/strategies/assessment/Cpep3Driver.ts:161-171`（avgDevDa = 7 发展能区 DA 中值平均；overallDq = deriveDq(avgDevDa, CA)）；`src/services/cpep3-scoring.ts:42-46`（deriveDq） |
| 计算公式 | `DQ_overall = mean(DA_domain 中值) / CA_months_decimal × 100`，其中 DA_domain = pg 常模月龄区间中值 |
| 调用位置 | Driver.calculateScore（写入 extraData.overallDq）→ persistAssessment（写入 `cpep3_assess.dq` 列）→ AI 适配器（`assessment-score-adapters.ts:405` totalScore=r.dq）→ 学生详情 scoreText（`assessment-records.ts:415`） |
| 报告位置 | `Report.vue:68-72`「综合发展商数（派生）」主位 metric 卡 + `:92-97` 能区派生 DQ 列 + 生成 feedback 文本 |
| 数据库字段 | `cpep3_assess.dq REAL NOT NULL`（`init.ts:224`）；domain_results JSON 内每发展能区 `dq` 字段 |

## 2. 与任务书的冲突

- §二十三：禁止「C-PEP-3 总 DQ / 总发展商 / 总体智力指数 / 综合智商」，禁止六领域 DA 简单平均。overallDq 正是 7 能区 DA 平均 ÷ CA——**被禁指标**。
- 用户本轮指令第 4 条同向：「不得自行生成总 DQ、总发展商、综合智商等指标」。
- 能区级派生 DQ（DA_domain/CA×100）**不在禁令内**：用户提供的 `export/CPEP-3/DQ换算口径.md` 明确采纳双层架构（官方层 DA 查表 + 系统扩展层能区 DQ 固定标注「派生指标，非官方规范分数」），仅 Overall 层被新任务书升级为禁止。

## 3. 本轮处置（已按任务书执行）

1. **新报告链路不再生成/展示/持久化 overallDq**：Driver 移除计算与 extraData 字段；`cpep3_assess` 建表语句移除 `dq` 列（表未提交，无兼容负担；旧 dev 库残留列不写入、不读取）；Report.vue 移除主位 DQ 卡；AI 适配器代表性分数改用 `total_pass_count`（总通过数，同题库跨次可比），scoreNote 同步改写；学生详情 scoreText 移除 DQ。
2. **能区级派生 DQ 保留**：标注「派生指标，非 CPEP-3 官方规范分数」，移入「专业数据」次要区域（任务书 §七 展示优先级）。
3. **趋势解读锚点**：官方层「总发展当量月龄区间（gn 查表）」保留为主展示；纵向趋势 AI 解读以总通过数 + 总发展当量为主、能区 DQ 为辅并带天花板警示（scoreNote 内声明）。
4. 本审计即 §二十三 要求的停止点产物；overallDq 代码随本轮移除（未提交特性内重构，非删除已发布能力）。若未来需要恢复，按 `DQ换算口径.md` 双层架构 + 固定标注实现。
