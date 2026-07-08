 SCGP 规格核对缺口改造方案

 Context（背景）

 对照"系统首页/学生管理/系统管理/能力评估/训练任务/训练计划/训练记录/报告生成/资源库/情绪场景/表达关心"11
 项规格逐项核对源码后，确认 5 处与规格不符或需补全。本方案针对这 5 处给出可落地的改造路径。

 重要修正（核对阶段的两处误判，经深入调研推翻）：
 - 训练计划"计划说明"字段已存在（sys_training_plan.description，表单 label 为"计划描述"），非真缺口 → 仅做 UI
 可见性微调。
 - 社交沟通游戏已存在 6 个（S01–S06），缺的是 IEP 报告闭环（完成后回大厅，不写 training_records/report_record，不进
 IEPReport）。

 用户已确认的 4 项决策：
 1. 资源库分类改造对象 = 教学资料页（TeachingMaterials）（文件类型维度，匹配规格）
 2. 训练记录导出格式 = Excel (.xlsx)
 3. 社交游戏 = 补全 IEP 报告闭环
 4. 首页训练进度概览 = 近 7 天趋势折线图（echarts）

 技术栈约束（CLAUDE.md）：Electron + Vue3 <script setup lang="ts"> + sql.js 渲染进程库；不新增原生依赖；沿用现有 scoped
 CSS；路径用 @/；IPC/DB 写入必须有错误处理。

 ---
 改造范围总览

 ┌─────┬────────────────────────────────────────────────┬────────┬────────┐
 │ 项  │                     改造点                     │ 工作量 │ 优先级 │
 ├─────┼────────────────────────────────────────────────┼────────┼────────┤
 │ E   │ 训练计划"计划说明"UI 微调                      │ 极小   │ 1      │
 ├─────┼────────────────────────────────────────────────┼────────┼────────┤
 │ B   │ 训练记录导出 Excel                             │ 小     │ 2      │
 ├─────┼────────────────────────────────────────────────┼────────┼────────┤
 │ C   │ 教学资料页新增音频/压缩包分类                  │ 中小   │ 3      │
 ├─────┼────────────────────────────────────────────────┼────────┼────────┤
 │ A   │ 首页补 3 项（已完成计划数/最近学生/7天趋势图） │ 中     │ 4      │
 ├─────┼────────────────────────────────────────────────┼────────┼────────┤
 │ D   │ 社交沟通游戏 IEP 报告闭环                      │ 大     │ 5      │
 └─────┴────────────────────────────────────────────────┴────────┴────────┘

 建议按 E→B→C→A→D 实施（从易到难，D 涉及架构决策放最后）。

 ---
 项 E：训练计划"计划说明"字段（UI 微调）

 字段已贯通（sys_training_plan.description / planForm.description / 详情 el-descriptions 行 643-645）。仅做可见性增强：

 - src/views/plan/PlanList.vue:337-344：表单 label "计划描述"→"计划说明"，el-input type="textarea" 增大 :rows="3"，加
 maxlength="200" + show-word-limit，加 placeholder（如"填写本计划的目标、注意事项或执行说明"）。
 - 无需改 DB / API / 类型定义。

 ---
 项 B：训练记录导出 Excel

 现状：src/views/training-records/ 两个面板（GameRecordsPanel / EquipmentRecordsPanel）的 records ref
 已持有完整可导出数据，无后端改动。依赖 xlsx+file-saver 已装。

 复用模板：src/views/Students.vue:439-455（XLSX json_to_sheet + saveAs）。

 实现：
 1. 新建 src/views/training-records/exportTrainingRecords.ts（导出工具，供两个面板复用）：
   - exportGameRecordsExcel(records, studentName)：把游戏记录映射成中文键对象数组 → XLSX.utils.json_to_sheet →
 导出。列：学生/任务名/模块/日期/时长(秒)/准确率(%)/平均反应时(ms)。
   - exportEquipmentRecordsExcel(records,
 studentName)：列：学生/器材/分类/训练日期/得分/提示等级/时长(秒)/备注(notes)/AI评语(generated_comment)。
 2. GameRecordsPanel.vue / EquipmentRecordsPanel.vue：在筛选工具栏（filter-section）加"导出
 Excel"按钮，调上述工具，传当前 records.value 与 selectedStudentName。
 3. 时长单位换算：游戏记录 duration(ms)→秒；器材 duration_seconds 直接用。准确率 accuracy_rate(0-1)→百分号。
 4. 空数据时 ElMessage.warning('当前没有可导出的记录')。

 备注字段处理：游戏记录无独立 remark 列（藏 raw_data JSON），导出时该列留空或解析 raw_data；器材记录有
 notes+generated_comment，两列都导出。

 ---
 项 C：教学资料页新增"音频资料""压缩包"分类

 改造对象：TeachingMaterials.vue（文件类型维度，符合规格）。机制是标准的 codes+labels+后缀集合+resolve 函数，UI
 筛选下拉（TeachingMaterials.vue:90 用 fileCategoryOptions = TEACHING_MATERIAL_FILE_CATEGORY_CODES）会自动包含新类别。

 改动文件：

 1. src/utils/resource-center-business.ts：
   - TEACHING_MATERIAL_FILE_CATEGORY_CODES（行 63-69）：加 'audio'、'archive'。
   - TEACHING_MATERIAL_FILE_CATEGORY_LABELS（行 73-79）：加 audio: '音频'、archive: '压缩包'。
   - 新增两个后缀集合（行 81-94 旁）：
 const TEACHING_MATERIAL_AUDIO_TYPES = new Set(['mp3','wav','ogg','aac','flac','m4a','wma'])
 const TEACHING_MATERIAL_ARCHIVE_TYPES = new Set(['zip','rar','7z','tar','gz','bz2','xz'])
   - resolveTeachingMaterialFileCategory（行 100-116）：在 document 分支后加 audio/archive 分支。
 2. src/views/resource-center/TeachingMaterials.vue：
   - getFileIcon(fileType)（行 117/335 引用）：audio 后缀→Headset/Microphone 图标；archive→Files/FolderOpened。import
 对应 @element-plus/icons-vue。
   - getFileIconColor(fileType)：audio/archive 配色。
   - 确认 materialsStore.fileCategoryCounts（Pinia）统计是否基于
 resolveTeachingMaterialFileCategory——若是则自动覆盖新类别，无需改 store。
 3. （可选）上传校验 handleUpload（行 646-682）：确认 accept 与文件大小校验是否需放宽以接收音频/压缩包；当前
 teaching_material 表 file_type 列存任意后缀，无 schema 改动。

 验证：上传一个 .mp3 和 .zip，确认分类下拉出现"音频(N)""压缩包(N)"且计数正确，列表图标/颜色正确。

 ---
 项 A：首页补 3 项要素

 数据层：src/database/dashboard-api.ts（类 DashboardAPI，getSnapshot() 行 104 用 Promise.all 聚合）。

 1. 已完成计划数：
   - DashboardAPI 新增 getCompletedPlanCount()：SELECT COUNT(*) AS count FROM sys_training_plan WHERE status =
 'completed'（状态枚举见 init.ts:887）。
   - 挂到 DashboardOverview 接口（dashboard-api.ts:5）+ getSnapshot 的 Promise.all。
 2. 最近添加的学生：
   - 复用 StudentAPI.getAllStudents()（api.ts:648，已 ORDER BY created_at DESC），取前 5 条；或在 DashboardAPI 内
 SELECT ... FROM student ORDER BY created_at DESC LIMIT 5。
   - 挂到 DashboardSnapshot.recentStudents。
 3. 近 7 天训练量趋势：
   - DashboardAPI 新增 getWeeklyTrainingTrend()：聚合 training_records（按天 GROUP BY，复用 dashboard-api.ts:229 的 7
 天时间窗写法；timestamp 是 ms INTEGER，按天换算），返回 [{date, count, totalDurationMs}]。
   - 挂到 DashboardSnapshot.weeklyTrend。

 展示层：src/views/Dashboard.vue
 - metrics computed（行
 328）把"本周异常预警"替换/补为"已完成计划数"（或并存，按产品意图定——建议替换预警卡为已完成计划数卡，预警并入 focus
 提醒）。
 - 新增"最近添加的学生"区块：列表展示头像/姓名/学号/创建时间，点击跳学生详情。
 - 新增"训练进度概览"区块：用 vue-echarts（已装 echarts+vue-echarts）画近 7
 天折线图（训练次数为主轴，可叠加时长）。参考项目内现有 echarts 用法保持一致。

 ---
 项 D：社交沟通游戏 IEP 报告闭环（最复杂）

 现状：6 个社交游戏（S01–S06，定义于 src/data/custom-game-registry.ts:34）走 registry 框架，完成流程：
 Game 子组件 @complete(EmotionGameCompletionPayload)
   → GameContainer.handleGameComplete (GameContainer.vue:1040)
   → persistTerminalState('completed') (:968)
     → api.persistSession(...)  → EmotionalGamesAPI.persistSession
       → INSERT game_emotion_records + upsertSession(training_sessions)
   → 回大厅 (getReturnLocation → /games/lobby/:studentId)
 缺：不写 training_records/report_record，不跳 IEPReport。IEPGenerator.generateReport（iep-generator.ts:108）按 TaskID
 枚举工作，不含社交 gameCode。

 参考模板：src/views/games/GamePlay.vue:532-629（saveTrainingRecord→createReportRecord→router.push('/games/report',
 {recordId,...})）。

 改造分 3 步：

 D1. GameContainer 完成后补落库 + 跳转

 src/views/emotional/games/GameContainer.vue：
 - 在 handleGameComplete（行 1040）/ persistTerminalState 成功分支（行 1004 单人、行 986
 双人之后）增加：仅当游戏归属社交模块（moduleCode === ModuleCode.SOCIAL，或 registry trainingEntryCode ===
 'social-communication'）且 status==='completed' 时，执行 IEP 链路。
 - 从 performanceData 提取 accuracy/avgResponseTime/duration（社交 payload 字段名需对齐
 EmotionGameCompletionPayload，提取时做防御性默认值）。
 - 调 GameTrainingAPI.saveTrainingRecord（api.ts:3502）写入 training_records：
   - task_id: gameCode（如 S01_BURGER），resource_id: null，resource_type/session_type: 'game'，entry_code:
 'social-communication'，module_code: 'social'，raw_data: 存 {gameCode, performanceData, difficulty, ...}。
   - 返回 recordId。
 - 调 createReportRecord（仿 GamePlay.vue:560）：INSERT report_record(report_type='iep', training_record_id,
 module_code='social', ...)。
 - router.push('/games/report', { recordId, studentId, module:'social', gameCode })。
 - 双人游戏：只为主学生（primaryStudentId）生成 IEP，或为每个参与者各生成一份（按产品定，建议主学生一份避免重复）。
 - 错误处理：落库失败 ElMessage.error 但不阻塞回大厅（降级），符合 CLAUDE.md 的"DB 写入必须有错误处理"。

 D2. IEPGenerator 新增 social 分支

 src/utils/iep-generator.ts（保持旧版，不引入重构风险，符合 CLAUDE.md）：
 - 新增 static generateSocialReport(studentName, gameCode, performanceData): IEPReport。
 - 新增 private static getSocialGameName(gameCode)：S01–S06
 中文名（合作造汉堡/表情猜猜乐/故事接龙/礼物分享派对/动物传声筒/双人表情擂台），未知 gameCode 回退"社交沟通训练"。
 - 新增 private static generateSocialSections(gameCode, performanceData)：按 gameCode
 维度生成专属评估段（轮流配合/表情识别准确率/分享决策/仿说完整度等）+ 教育建议（共情、换位、轮流等待等），结构对齐
 IEPReportSection。

 D3. IEPReport.vue 识别 social 渲染

 src/views/games/IEPReport.vue：
 - loadReport（行 186-225）：取到 training_records 后，判断 module_code === 'social'（或 raw_data.gameCode 存在）→ 改调
 IEPGenerator.generateSocialReport(studentName, raw_data.gameCode, raw_data.performanceData)，而非旧
 generateReport(taskId,...)。
 - 报告统计卡（准确率/反应时/时长）从 raw_data.performanceData 提取；社交游戏若无反应时则隐藏该卡。
 - 导出 PDF/Word（行 260-625）沿用，社交报告内容自动随之导出。

 验证（端到端）：进入社交沟通入口 → 选学生 → 玩 S01 合作造汉堡 → 完成 → 确认①training_records 新增一行
 module_code='social'②report_record 新增 report_type='iep' 一行③自动跳 IEPReport
 且展示"合作造汉堡"专属评估与建议④报告可导出 Word。其余 5 个社交游戏同样验证一次。

 ---
 实施顺序与依赖

 1. E（计划说明 UI）→ 独立，立即做。
 2. B（训练记录导出）→ 独立，复用现成工具。
 3. C（教学资料分类）→ 独立，扩展枚举。
 4. A（首页 3 项）→ 依赖 dashboard-api 新增查询；echarts 趋势图独立。
 5. D（社交 IEP 闭环）→ 最重，分 D1/D2/D3 三步，D1 依赖 D2/D3 才能端到端跑通。

 ▎ 上面的"实施顺序"是单会话顺序执行的稳妥路径；若用多智能体并行，见下一节。

 ---
 并行执行策略（供新会话 Claude 调度子智能体）

 文件冲突分析（结论：5 项互不重叠，可安全并行）

 ┌─────┬─────────────────────────────────────────────────────────────────────────────────────────────┬──────────────┐
 │ 项  │                                        主要改动文件                                         │ 与其他项冲突 │
 ├─────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────┤
 │ E   │ src/views/plan/PlanList.vue                                                                 │ 无           │
 ├─────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────┤
 │ B   │ src/views/training-records/* + 新建 exportTrainingRecords.ts                                │ 无           │
 ├─────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────┤
 │ C   │ src/utils/resource-center-business.ts + src/views/resource-center/TeachingMaterials.vue     │ 无           │
 ├─────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────┤
 │ A   │ src/database/dashboard-api.ts + src/views/Dashboard.vue                                     │ 无           │
 ├─────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────┤
 │ D   │ src/views/emotional/games/GameContainer.vue + src/utils/iep-generator.ts +                  │ 无           │
 │     │ src/views/games/IEPReport.vue                                                               │              │
 └─────┴─────────────────────────────────────────────────────────────────────────────────────────────┴──────────────┘

 推荐调度方式

 1. 并行派发：用 Agent 工具同时派发 5 个子智能体，每个负责一项（E/B/C/A/D 各一）。
 2. D 项内部串行：D 的 D1→D2→D3 有依赖，由 D 子智能体内部顺序完成，不要再拆。
 3. 子智能体只改文件：不提交 git、不跑全局 type-check（它是全局的，不能并行）。
 4. 主会话收口：5 个子智能体全部返回后，由主会话统一：
   - 跑 npm run type-check，修复任何类型错误（并行改动可能引入交叉类型问题）；
   - 按项分别 git add + git commit（串行提交，避免索引竞争），commit message 用 conventional commits 风格；
   - 汇总每项改动文件清单 + 验证结果。

 每个子智能体的 prompt 要点（主会话派发时填入）

 每个 Agent prompt 应包含：
 - 本文档对应项章节（E/B/C/A/D 之一）的完整内容；
 - CLAUDE.md 的代码风格与实现约束（<script setup lang="ts">、scoped CSS、@/ 路径、DB/IPC 错误处理、不新增原生依赖）；
 - 该项的"验证"小节作为完成标准；
 - 明确指令："只改文件，不要 git commit，不要运行 type-check，完成后返回改动文件清单与待验证点。"

 隔离建议

 - 该项的"验证"小节作为完成标准；
 - 明确指令："只改文件，不要 git commit，不要运行 type-check，完成后返回改动文件清单与待验证点。"

 隔离建议

 因无文件冲突，可在同一工作区并行（无需 worktree，避免多 worktree 合并成本）。唯一需要串行的是 git 提交与全局
 type-check。

 ---
 验证基线（统一）

 - 每项改完跑 npm run type-check（CLAUDE.md 验证基线）。
 - 涉及 DB 写入的（D 项）补充手工验证路径：Electron 联调 npm run
 electron:dev，按各项"验证"小节走真实操作链路，不只写"理论可行"。
 - 项 A/D 涉及新查询/新落库，必要时用 SQLTest 视图（src/views/SQLTest.vue）或 DB 工具核对表数据。

 ---
 风险与备注

 - 项 D 数据格式差异：社交游戏的 performanceData 与感官游戏的 GameSessionData 结构不同，D1 提取字段与 D3
 渲染都要做防御性兼容，不能假设字段一定存在。
 - 项 D 双人游戏：S01/S06 是 maxPlayers:2，IEP 只为单人生成（primaryStudentId），避免重复报告；双人各自的训练记录已由
 persistSessionGroup 写入 game_emotion_records，不重复。
 - 项 A 指标取舍：首页卡片位有限，"已完成计划数"与"本周异常预警"建议二选一或重新排版，实施时与产品口径确认（本方案默认
 替换预警卡为已完成计划数，预警并入 focus 提醒区）。
 - 不触碰范围：训练资源体系（sys_training_resource / training-resource-ui.ts）本次不改（用户已选只改教学资料页）。
 - 项 C store 确认：实施前确认 materialsStore.fileCategoryCounts 的统计源是否为
 resolveTeachingMaterialFileCategory，决定是否需要同步改 store。

 ---