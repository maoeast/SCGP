# Self-Care ATS 种子导入分析与迁移起步建议
> 文档类型：现行迁移分析
> 适用范围：`SCGP / 星愿能力发展训练系统`
> 参考来源：`E:\VSC\H5\Self-Care ATS\self-care-ats`
> 状态：当前有效
> 创建日期：2026-05-11

## 1. 前提锁定

当前用户已明确：

- 旧 `Self-Care ATS` 处于研发阶段
- 不存在需要背负的学生、历史训练计划、历史训练记录等生产数据
- 因此本次不做“历史业务数据迁移”，只做“任务内容种子导入”

这会直接改变迁移策略：

- `ATS` 只作为任务内容与静态资源的种子源
- 不迁入旧 `student`
- 不迁入旧 `train_plan / train_plan_detail`
- 不迁入旧 `train_log`
- 不复活旧 `task / task_step / train_plan / train_log` 作为 SCGP 主链

一句话锁定：

> 本轮迁的是“自理任务模板内容”，不是“旧系统业务历史”。

## 2. 结论摘要

### 2.1 可以迁的内容

- `task_category` 的分类语义
- `task` 的任务基础信息
- `task_step` 的步骤文本结构
- 能确认存在的封面与步骤媒体文件
- 旧任务编码、旧任务 id 等追溯字段

### 2.2 不建议迁的内容

- `student`
- `train_plan`
- `train_plan_detail`
- `train_log`
- `task_level`
- 旧 ATS 独立 `resource_meta` 体系

### 2.3 推荐策略

推荐采用“文本优先、媒体尽力”的种子导入策略：

1. 先把 31 条任务模板与步骤文本导入 SCGP
2. 缺失封面与步骤媒体不阻塞第一波导入
3. 后续再按存在性审计结果补资源、补路径、补文案

### 2.4 E2E 验证数据清理结论

- 2026-05-11 已清理 2 条仅用于端到端验证的 `task_training` 测试数据
- 当前正式库中 `task_training` 为 31 条，页面统计口径只认这 31 条正式任务
- 后续联调与验收不得把这 2 条 E2E 验证数据重新写回正式库

## 3. ATS 种子现状审计

本节只基于当前仓库目录和源码可直接确认的事实。

### 3.1 任务模板规模

从 `sample-tasks.ts` 可确认：

- 任务模板总数：31 条
- 有步骤定义的任务数：31 条
- 步骤总数：235 步
- 单任务步骤数范围：6 到 10 步

### 3.2 封面文件现状

源码中的 31 条任务都引用了 `cover_img`，格式类似：

- `tasks/EAT_SPOON_001_cover.jpg`
- `tasks/WASH_HANDS_001_cover.jpg`

但按当前仓库目录实查结果：

- 封面引用数：31
- 实际存在文件数：0
- 缺失数：31

结论：

- 旧 ATS 的任务封面路径不能视为可直接导入的有效资源
- 第一波导入时必须允许 `cover_image = null`

### 3.3 步骤媒体现状

`sample-tasks.ts` 在生成 `SAMPLE_TASK_STEPS` 时，对每一步统一写死：

- `img_path = ''`
- `video_path = ''`
- `audio_path = ''`

这意味着源码种子本身并没有把步骤媒体与步骤文本正式绑定。

结论：

- 第一波可稳定迁移的是步骤文本，不是完整步骤媒体包
- 媒体导入必须依赖额外文件审计与人工补链

### 3.4 仓库内可见静态资源现状

当前 ATS 仓库目录内可直接确认的资源规模：

- `assets/resources/images/`：75 个文件
- `assets/resources/videos/`：1 个文件
- `assets/resources/audio/`：0 个文件
- `assets/resources/docs/`：54 个文件
- `tasks/` 目录内仅发现 1 个步骤图片：
  - `tasks/steps/TAKE_BUS_001_S1.jpeg`

结论：

- ATS 仓库内存在一批可利用的散落资源
- 但它们并没有和 31 条任务形成稳定、完备、机器可直接消费的映射
- 媒体迁移前必须做一次完整的存在性与归属审计

## 4. SCGP 目标落点

本轮种子导入必须落到 SCGP 的现行主链：

- 任务本体：`sys_training_resource`
- 任务类型：`task_training`
- 模块授权：`life_skills`
- 步骤事实源：`sys_training_resource.meta_data.steps[]`

对应 contract 已在：

- `src/features/self-care/task-training-contract.ts`

当前锁定约束：

- `module_code = life_skills`
- `resource_type = task_training`
- `trainingEntryCode = life-skills`
- `trainingMode = step_task`

## 5. 字段映射清单

### 5.1 任务基础信息

| ATS 来源 | SCGP 落点 | 规则 |
| --- | --- | --- |
| `task.id` | `sys_training_resource.legacy_id` | 保留旧主键追溯值 |
| 固定值 | `sys_training_resource.legacy_source` | 建议固定为 `self_care_ats_task` |
| `task.code` | `meta_data.legacyTaskCode` | 作为幂等锚点与历史追溯码 |
| `task.name` | `sys_training_resource.name` | 直接迁入 |
| `task.description` | `sys_training_resource.description` | 直接迁入，空值转 `null` |
| `task.cover_img` | `sys_training_resource.cover_image` | 仅当文件审计存在时导入，否则置 `null` |
| `task.category_id` | `meta_data.category.childId / childName` | 通过 `task_category` 解析 |
| 父分类 `task_category.parent_id` | `meta_data.category.parentId / parentName` | 通过分类树补齐 |
| `task.ability_item` | `meta_data.abilityItem.id` | 原值保留为能力项编码 |
| `task.ability_item` | `meta_data.abilityItem.name` | 若 ATS 无稳定中文名，第一波允许空字符串 |
| `task.media_type` | 暂不落主字段 | 不进入一期 contract；如后续确有必要，再扩展追溯字段 |

### 5.2 步骤结构

| ATS 来源 | SCGP 落点 | 规则 |
| --- | --- | --- |
| `task_step.id` | `meta_data.steps[].id` | 建议转为 `legacy_step_<id>` 保留追溯性 |
| `task_step.seq` | `meta_data.steps[].seq` | 直接迁入，保持连续 |
| `task_step.text` | `meta_data.steps[].text` | 直接迁入，空白步骤视为非法数据 |
| `task_step.img_path` | `meta_data.steps[].imagePath` | 文件存在时归一化为 `resource://`，否则置 `null` |
| `task_step.video_path` | `meta_data.steps[].videoPath` | 文件存在时归一化为 `resource://`，否则置 `null` |
| `task_step.audio_path` | `meta_data.steps[].audioPath` | 文件存在时归一化为 `resource://`，否则置 `null` |

### 5.3 固定补写字段

以下字段由 SCGP 导入器统一补写，不从 ATS 原表直接读取：

| SCGP 字段 | 固定值 |
| --- | --- |
| `sys_training_resource.module_code` | `life_skills` |
| `sys_training_resource.resource_type` | `task_training` |
| `meta_data.trainingMode` | `step_task` |
| `meta_data.trainingEntryCode` | `life-skills` |

### 5.4 明确不迁字段

以下 ATS 字段或表在第一波种子导入中明确不迁：

- `task_level.*`
- `train_plan.*`
- `train_plan_detail.*`
- `train_log.*`
- `resource_meta.*`
- `teacher_fav.*`

## 6. 31 条任务与媒体存在性审计计划

审计目标不是“立即补全所有媒体”，而是为导入器生成一份可执行白名单。

### 6.1 审计目标

对 31 条任务分别给出以下结论：

- 任务基础信息是否完整
- 封面引用是否真实存在
- 步骤文本是否完整
- 步骤媒体是否存在、能否归属到具体步骤
- 资源路径是否可归一化到 `resource://`

### 6.2 审计输出物

建议新会话至少产出 3 份机器可消费结果：

1. `task-seed-inventory.json`
   - 每条任务的 `code / name / category / ability / stepCount`
2. `task-media-audit.csv`
   - 每条任务的封面、步骤图片、步骤视频、步骤音频存在性矩阵
3. `task-import-allowlist.json`
   - 哪些任务可直接导入
   - 哪些任务只能文本导入
   - 哪些任务需要人工补资源后再导入

### 6.3 审计步骤

#### 步骤 1：任务与步骤清单抽取

- 从 `sample-tasks.ts` 提取 31 条任务
- 生成每条任务的步骤数与步骤文本清单
- 检查是否存在空白步骤或重复 `code`

#### 步骤 2：封面存在性校验

- 遍历 `cover_img`
- 以 ATS 仓库根目录为基准检查真实文件
- 将结果标记为：
  - `exists`
  - `missing`
  - `needs-remap`

#### 步骤 3：步骤媒体存在性校验

- 优先检查 `task_step` 自带路径
- 若路径为空，再扫描：
  - `tasks/`
  - `assets/resources/images/`
  - `assets/resources/videos/`
  - `assets/resources/audio/`
- 仅允许“高置信度匹配”自动挂接
- 其余全部标记为人工处理，不做猜测性自动绑定

#### 步骤 4：路径归一化预演

- 将可确认存在的路径预演映射到：
  - `resource://images/...`
  - `resource://videos/...`
  - `resource://audio/...`
  - `resource://docs/...`
- 检查是否出现：
  - 重名冲突
  - 扩展名不一致
  - 路径层级混乱

#### 步骤 5：导入分级

建议按以下等级对 31 条任务分类：

- `A`：可完整导入（文本 + 可用封面/媒体）
- `B`：可文本导入（媒体缺失不阻塞）
- `C`：暂缓导入（数据缺失或归属冲突太大）

### 6.4 审计验收标准

审计完成后，至少能回答：

- 31 条任务中有多少条可直接文本导入
- 有多少条具备真实可用封面
- 有多少步具备可自动归属的媒体
- 哪些路径需要人工清洗

## 7. 实施优先级与排期

## 7.1 总体判断

推荐先做 SCGP 自理训练主线闭环，再做 ATS 种子导入。

原因：

- 现在就导入 31 条任务，最多只能填满任务列表
- 如果执行页和写链还没站稳，导入后的任务仍然不能完成真实闭环
- 先做执行与落记录主线，后做种子导入，验收成本最低

## 7.2 推荐顺序

### Wave 1：阶段 4 主线实现

目标：让 `task_training` 成为真正可执行、可落记录的资源类型。

优先做：

- `src/database/self-care-training-api.ts`
- `src/views/self-care/TaskExecution.vue`
- `training_records + training_session` 的自理训练写链

这一波完成后，SCGP 才具备“正式承接 ATS 内容”的最低能力。

### Wave 2：ATS 种子审计工具与白名单

目标：把 ATS 内容从“源码散料”变成“可导入对象集”。

优先做：

- 31 条任务清单抽取
- 媒体存在性矩阵
- 资源归一化预演
- 导入白名单

### Wave 3：文本优先的种子导入器

目标：把 31 条任务和 235 步文本正式落到 SCGP 的 `task_training` 资源主链。

要求：

- 幂等执行
- 使用 `legacy_id + legacy_source + legacyTaskCode` 追溯
- 缺失媒体时不失败
- 默认支持“文本任务先导入、资源后补”

### Wave 4：媒体补链与资源中心校正

目标：补齐封面、步骤媒体与资源中心可见性体验。

优先做：

- 缺失封面补链
- 高置信度步骤媒体补链
- 资源中心与编辑器中的可见性修正

## 7.3 不推荐的顺序

不推荐下一会话一上来就做导入器。

原因：

- 执行页未完成时，导入只是“把旧内容塞进新库”
- 没有正式写链时，导入后的端到端验收没有意义
- 很容易导入两轮后又因为 contract 微调而返工

## 8. 新会话起步建议

新会话正式开始迁移时，建议按以下顺序读取：

1. `AGENTS.md`
2. `.continue-here.md`
3. `docs/planning/2026-05-08-self-care-training-module-implementation-plan.md`
4. `docs/planning/2026-05-11-self-care-ats-seed-import-analysis.md`

新会话第一步建议锁定为：

> 先新建 `src/database/self-care-training-api.ts`，把 `TaskTrainingExecutionResult -> training_records + training_session` 的保存契约收口，再进入 `TaskExecution.vue`。

原因：

- 记录契约先定，执行页状态和完成动作才不会返工
- 这也是后续种子导入完成后的第一条真实验收链

## 9. 最终结论

在“无历史生产数据包袱”的前提下，`Self-Care ATS` 最合适的角色不是“历史系统”，而是“任务内容种子仓”。

因此后续迁移的正确姿势是：

- 先完成 SCGP 的自理训练执行与落记录主线
- 再把 ATS 的 31 条任务和 235 步文本导入为 `task_training`
- 对封面与步骤媒体采用审计后补链，而不是假设旧仓库已经完整可用
- 保持正式库 `task_training = 31` 的当前口径，不再混入 E2E 验证数据
