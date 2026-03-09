#GSD(GetShitDone)指令手册

GSD是一个“自动驾驶仪”工作流系统。你负责设定终点（需求），它负责规划路径、开车（写代码）并检查燃油（验证）。

##1.核心工作流指令（日常开发黄金循环）

这是每天开发新功能或重构代码时必须遵循的标准流程：

|命令|作用|使用场景|
|:---|:---|:---|
|`/gsd:plan-phase`|**任务规划**|**开启新阶段时**。系统会分析`.planning/ROADMAP.md`，自动拆解当前Phase的原子任务并生成执行计划。|
|`/gsd:plan-checker`|**计划检查**|**计划生成后**。AI扮演评审员，进行反向推导，检查刚才生成的计划是否合理、是否有遗漏。|
|`/gsd:execute-phase`|**自动执行**|**确认计划无误后**。AI按照计划逐个完成任务，自动修改代码并运行测试。|
|`/gsd:verifier`|**最终验证**|**阶段任务完成后**。自动对比最初的需求，检查代码实现是否完美达标，生成验证报告。|

##2.项目初始化与辅助指令

用于调整方向、解决临时问题或首次接入GSD的项目：

|命令|作用|使用场景|
|:---|:---|:---|
|`/gsd:map-codebase`|**全城扫描**|**项目结构大变动或初次接入时**。分析项目所有文件结构、技术栈和设计模式，生成知识库。|
|`/gsd:new-project`|**立项规划**|**开始一个全新大版本/功能模块时**。引导回答几个问题，生成架构规范和开发路线图。|
|`/gsd:quick`|**闪电修复**|**临时小改动或紧急Bug修复**。跳过复杂的规划阶段，直接进行针对性修改。|
|`/gsd:discuss`|**深度讨论**|**正式写代码前**。对某个技术细节或实现方案与AI反复打磨、探讨最佳实践。|

##3.GSD的“潜规则”（必读）

为了用好GSD，你需要记住它的几个自动化特性：

1.**自动提交(Auto-Commit)**：每次通过`/gsd:execute-phase`完成一个子任务，AI都会自动帮你执行`gitcommit`。如果发现AI写错了，直接使用`gitreset--hardHEAD~1`回滚即可。
2.**上下文隔离(ContextIsolation)**：GSD在执行代码时会创建独立的上下文窗口，尽量只加载当前任务相关的代码。这保证了AI不会因为项目太大而“发疯”或遗忘。
3.**单一事实来源(SingleSourceofTruth)**：GSD**永远只相信**`.planning/`目录中的文件（`PROJECT.md`,`ROADMAP.md`,`STATE.md`等）以及根目录的核心规范（如`重构实施技术规范.md`）。如果你想改变开发目标或架构规矩，请优先修改这些文档。

---

##💡典型操作序列示例

假设你现在想开始开发“**情绪调节模块**”：

1.**沟通探讨**：输入`/gsd:discuss`->讨论情绪模块需要哪些量表（CBCL,SDQ）和技术选型。
2.**生成计划**：输入`/gsd:plan-phase`->让AI将模块拆解为具体任务（如：创建数据库表、编写ScaleDriver、写UI组件）。
3.**自动编码**：输入`/gsd:execute-phase`->喝杯咖啡，看着AI按照计划列表逐一敲代码并自动Commit。
4.**质量验收**：输入`/gsd:verifier`->检查情绪模块是否完整跑通，并符合架构规范。


/gsd:execute-plan

指令：修复Vite500错误并安全地集成SDQ评语
Claude，我们之前的临时文件策略失败了，导致了持续的500InternalServer
Error。现在，我们将采取一种更可靠的方式直接更新主配置文件，并清理现场。
详细执行步骤：
第一步：清理失败的临时文件
-任务：彻底移除我们之前创建的、导致问题的临时文件及其引用。
-操作：
-删除文件：删除src/database/sdq_feedback_temp.ts这个文件。
-移除引用：修改src/strategies/assessment/SDQDriver.ts，删除顶部的import{NEW_SDQ_FEEDBACK}from
'@/database/sdq_feedback_temp';这一行。确保SDQDriver.ts恢复到从feedbackConfig.js
中读取数据的状态。
第二步：以编程方式安全地更新`feedbackConfig.js`
-任务：你需要在内存中读取、修改并重写feedbackConfig.js，而不是通过脆弱的字符串替换。
-操作：
-读取源文件：读取e:\VSC\H5\SIC-ADS\docs\sdq_total_score_rules.json的内容。
-读取目标文件：读取src/config/feedbackConfig.js的内容。
-解析与合并：
-在你的代码环境中，将sdq_total_score_rules.json的字符串内容解析为一个JavaScript对象。
-找到一种方法（例如，通过正则表达式或字符串分割）来定位feedbackConfig.js中ASSESSMENT_LIBRARY=
{...}里的"sdq":{...}这个代码块。
-用你刚刚从JSON文件中解析出的新`sdq`对象，替换掉旧的`sdq`对象，从而在内存中构建出
feedbackConfig.js的全新、完整的文件内容。
-写入文件：使用write_file命令，将你在内存中合成的全新文件内容，完整地覆盖写回
src/config/feedbackConfig.js。
第三步：最终验证
-任务：请在完成上述两步后，重启开发服务器（npmrundev）。
-验证：
-确认应用能正常启动，没有任何编译错误。
-执行一次完整的SDQ评估流程，从选择学生到最后生成报告。
-确认报告页面能够正确、完整地显示出所有最新的评语建议。
请严格按照这三个步骤执行。这个方案将彻底根除由文件语法错误引发的所有问题。

/gsd:execute-plan
指令：修复AssessmentContainer.vue中的getDatabaseisnotdefined错误
Claude，我们在完成SDQ评估时遇到了一个运行时错误，导致评估结果无法保存。
根因分析：
在src/views/assessment/AssessmentContainer.vue文件中，我们新添加的saveSDQAssessment函数调用了
getDatabase()，但我们忘记在该文件的<scriptsetup>区域导入这个函数。
修复指令：
-任务：请修改src/views/assessment/AssessmentContainer.vue文件。
-操作：
-在顶部的import区域，找到import{StudentAPI,...}from'@/database/api'这一行。
-在这个导入语句的大括号{}中，添加getDatabase。
-修改后应如下所示（请注意保持其他导入项不变）：
1import{getDatabase,StudentAPI,SMAssessmentAPI,CSIRSAPI,WeeFIMAPI,ReportAPI,ConnersPSQAPI,ConnersTRSAPI}from'@/database/api'
验证：
-任务：完成修改后，请重新进行一次完整的SDQ评估测试。
-验证点：确认在点击“完成评估”后，控制台不再报错，并且评估数据能够成功保存。
请立即执行此修复。



指令：修复SRS-2题目渲染Bug并实施临床专业性优化
Claude，我们在进行SRS-2界面测试时发现了一个渲染Bug，并根据心理测量学和临床要求提出了一些关键的专业性优化建议。请对
src/database/srs2-questions.ts进行修改。

详细执行步骤：

第一步：优化选项表述


-目标文件:src/database/srs2-questions.ts
-操作:找到SRS2_OPTIONS常量。将原本的“发生频率”表述，修改为更准确的“符合程度”表述：
-0:'不符合'
-1:'有时符合'
-2:'经常符合'
-3:'几乎总是符合'


第二步：修复题目空白Bug并实施临床盲测与时效提示


-目标文件:src/database/srs2-questions.ts
-核心操作:修改getSRS2ScaleQuestions()函数的映射逻辑。
-具体修改要求:
-修复空白Bug：将题目文本正确映射到content字段（即将content:q.text而非text:q.text）。
-修复类型：id字段应该保持为数字类型（直接用id:q.id，去掉.toString()）。
-实施临床盲测：为了防止受试者产生“启动效应”，在界面上必须隐藏题目所属的维度。请将映射中的dimension
字段硬编码为空字符串（即dimension:''）。注意：这只影响前端显示，不影响后端的计分逻辑，因为后端算分是通过
SRS2_DIMENSION_QUESTIONS字典完成的。
-增加时效提示：SRS-2要求基于过去6个月的表现。请利用helpText字段，为每道题统一添加提示语。
-最终的映射代码应类似如下结构：


exportfunctiongetSRS2ScaleQuestions():ScaleQuestion[]{
returnSRS2_QUESTIONS.map(q=>({
id:q.id,
content:q.text,//修复Bug：必须映射为content
dimension:'',//临床优化：隐藏维度名称以防启动效应
helpText:q.helpText?`${q.helpText}(请根据受试者过去6个月的实际表现进行选择)`:'请根据受试者过去6
个月的实际表现进行选择。',
options:SRS2_OPTIONS,
isReversed:q.isReversed,
metadata:{
originalDimension:q.dimension//仅保留在元数据中以备调试
}
}))
}

第三步：验证并提交


-操作：
-修改完成后，重新启动测试。
-确认测试界面上的蓝色题目框内能正确显示题目文字。
-确认题号旁边不再显示awareness或communication等维度标签。
-确认每道题下方都有灰色的6个月时效提示。
-确认选项已经变成了“不符合”、“有时符合”等。
-使用gitcommit提交这些修改，Commitmessage建议为：fix(srs2):resolveblankquestionUIbugandimplementclinical
rigoroptimizations。


请立即开始执行。


指令：架构设计与集成规划-CBCL(儿童行为量表)评估模块
Claude，我们需要在系统中集成重量级的“CBCL(Achenbach
儿童行为量表)”。这个量表具有极高的临床价值，但也伴随着高度的复杂性。请仔细阅读docs目录下关于CBCL
的三个文件，并根据以下架构设计，生成你的分步执行计划。


架构痛点与设计要求(请在计划中体现解决思路)：


痛点1：异构的问卷形态(UI布局设计)
-挑战：CBCL包含两部分：第一部分是“社会能力”（涉及填写爱好、参加组织、朋友数量、各科成绩等非标准化表单）；第二部分是113
道“行为问题”的标准3点Likert计分题。现有的AssessmentContainer无法直接处理第一部分。
-设计要求(UI分步向导)：
-为CBCL设计一个“两步走(Two-StepWizard)”的评估流程。
-Step1(社会能力)：创建一个专门的Vue组件（如CBCLSocialForm.vue），使用ElementPlus的Form
表单来收集这些非标准数据。
-Step2(行为问题)：复用现有的评估引擎，连续展示113道行为题（建议UI上做成分页或长列表虚拟滚动，防疲劳）。


痛点2：高度复杂的动态常模树
-挑战：CBCL的因子划分和常模T分阈值，不仅区分性别（男/女），还严格区分年龄段（4-5岁,6-11岁,
12-16岁）。不同性别/年龄段下，因子的名称、包含的题号、甚至因子数量都完全不同。
-设计要求(策略模式引擎)：
-必须将儿童行为量表（CBCL）自动计分引擎.js完美移植到TypeScript。
-在CBCLDriver.ts中，必须首先根据student.gender和student.ageInMonths匹配出对应的factor_config（因子题号映射表）。
-分别计算“社会能力”的3个因子得分和“行为问题”的8-9个因子得分，以及内化/外化/总分。


痛点3：多维度的报告渲染
-设计要求(图表优先)：
-报告页面必须引入ECharts或现有图表库，绘制“临床剖面图(雷达图或多列柱状图)”，直观展示8-9个行为因子的T分高低。
-报告文案必须从儿童行为量表（CBCL）报告解释生成引擎.js中提取，并将其整合到feedbackConfig.js中。

---


请将你的计划分解为以下Phase：


Phase1:底层数据与字典基建
-将113道行为题提取到cbcl-questions.ts。
-将自动计分引擎中的常模字典（男/女x年龄段的因子映射与阈值）提取到cbcl-norms.ts。
-将报告解释引擎整合进feedbackConfig.js的ASSESSMENT_LIBRARY.cbcl中。


Phase2:数据库表设计
-在init.ts中设计cbcl_assess表。必须包含处理结构化JSON的字段，如social_competence_data(社会能力表单数据),
behavior_raw_scores,factor_t_scores,internal_external_scores。


Phase3:驱动器与算分引擎(CBCLDriver.ts)
-实现基于性别和年龄的动态因子分数计算。
-实现generateFeedback，整合出包含社会能力评估和行为问题评估的综合反馈。


Phase4:定制化UI与交互实现
-开发CBCLSocialForm.vue用于第一部分信息收集。
-改造或扩展现有的AssessmentContainer.vue，使其能够支持CBCL这种“先表单、后答题”的混合模式。
-开发Report.vue，实现包含ECharts临床剖面图的专业医疗级报告。


请详细阅读参考文件，然后向我输出你的Phase计划。