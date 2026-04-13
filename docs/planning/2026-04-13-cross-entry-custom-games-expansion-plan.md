# 跨训练入口自定义小游戏扩展实施计划

## 1. 文档定位

本文件用于指导 SCGP 在现有 5 个情绪调节小游戏基础上，扩展 `社交沟通`、`精细动作`、`安抚教具` 三个训练入口下的新一批自定义小游戏，并明确底座改造范围、分波次实施顺序和验收边界。

本文件是**实施计划**，不是“当前代码已实现现状”。

当前 `Phase 0` 的可执行实施规格已单独沉淀为：

- [docs/planning/2026-04-13-cross-entry-custom-games-phase0-implementation-spec.md](/home/DONG/Mycode/SCGP/docs/planning/2026-04-13-cross-entry-custom-games-phase0-implementation-spec.md)

使用方式：

- 本文件继续作为专题入口，负责范围、目标、波次与验收边界
- 新会话里的 Codex 如要直接开始实施 `Phase 0`，优先读取 implementation spec，再回到当前代码核对真实状态

## 2. 直接来源

- 当前需求来源：
  - [docs/planning/社交_精细_安抚游戏_细化PRD.md](/home/DONG/Mycode/SCGP/docs/planning/社交_精细_安抚游戏_细化PRD.md)
  - [docs/planning/2026-03-20-emotion-games-prd.md](/home/DONG/Mycode/SCGP/docs/planning/2026-03-20-emotion-games-prd.md)
- 当前代码现实锚点：
  - [src/views/emotional/games/GameContainer.vue](/home/DONG/Mycode/SCGP/src/views/emotional/games/GameContainer.vue)
  - [src/database/emotional-games-api.ts](/home/DONG/Mycode/SCGP/src/database/emotional-games-api.ts)
  - [src/data/emotional-game-catalog.ts](/home/DONG/Mycode/SCGP/src/data/emotional-game-catalog.ts)
  - [src/views/games/GameLobby.vue](/home/DONG/Mycode/SCGP/src/views/games/GameLobby.vue)
  - [src/router/index.ts](/home/DONG/Mycode/SCGP/src/router/index.ts)

## 3. 当前现实与问题

### 3.1 当前已实现现实

当前仓库里已经落地 5 个情绪调节小游戏：

- `G01_BALLOON`
- `G03_FOREST`
- `G04_WIPE_ICE`
- `G07_MONSTER`
- `G08_ENERGY_BALL`

它们当前共用一条 `emotional-only` 小游戏链路：

- 游戏目录、资源种子、标题映射、路由、记录落库都主要围绕 `emotional-regulation` 设计
- `GameLobby` 对 `emotional-regulation` 有独立特判
- `game_emotion_records` / `student_badges` 的 `game_code` 约束目前只覆盖上述 5 个情绪小游戏

### 3.2 当前主要问题

如果直接按现有情绪小游戏模式继续增加 `社交沟通 / 精细动作 / 安抚教具` 的 15 个新游戏，会出现以下问题：

- 新游戏会继续扩散 `emotional` 专用分支逻辑
- 训练记录可能被错误归属为 `emotional-regulation`
- 双人游戏没有正式的数据契约
- 权限申请、难度锁定、教师结束等公共能力没有统一底座
- 徽章系统缺少跨入口的视觉语义约束

## 4. 本计划目标

### 4.1 目标

- 在不破坏现有 5 个情绪小游戏可用性的前提下，收口一套**跨训练入口可复用的自定义小游戏底座**
- 让后续 `社交沟通 / 精细动作 / 安抚教具` 新游戏沿用统一容器、统一注册表、统一落库和统一权限调度
- 保持当前 `Page.vue + Game.vue + GameContainer` 的实现模式，不把这批高交互小游戏塞回旧 `GamePlay` 通用任务链

### 4.2 非目标

- 本轮不把所有小游戏重构进旧 [src/views/games/GamePlay.vue](/home/DONG/Mycode/SCGP/src/views/games/GamePlay.vue) 的 `TaskID` 链
- 本轮不启动完整“训练记录统一大迁移”的新专题，只在现有数据模型上补齐小游戏底座所需字段和关联表
- 本轮不把 `C05_MOOD_METER` 直接做成全局悬浮入口；先保留为后续独立产品化波次

## 5. Phase 0：跨入口小游戏底座收口

Phase 0 是后续所有新游戏的前置条件。没有完成 Phase 0，不进入任何 Wave 的正式开发。

### 5.1 统一小游戏注册表

新增统一注册表作为“小游戏真源”，现有 5 个情绪小游戏先迁入该注册表，再逐步把新游戏补进来。

建议最小结构如下：

```ts
interface CustomGameDefinition {
  gameCode: string
  name: string
  moduleCode: ModuleCode
  trainingEntryCode: TrainingEntryCode
  entryPath: string
  maxPlayers: 1 | 2
  requiredPermissions: ('microphone' | 'camera')[]
  permissionPolicy: 'all_required' | 'degradable'
  difficultyLocked: boolean
  badge?: {
    badgeCode: string
    badgeName: string
    visualThemeTag: string
    iconToken: string
    paletteToken: string
  }
  metadata: Record<string, unknown>
}
```

明确约束：

- `maxPlayers` 必须作为注册表一等字段，不允许子游戏自行口头约定
- `difficultyLocked` 允许注册表默认值，训练入口启动参数可覆盖
- `requiredPermissions` 和 `permissionPolicy` 由容器统一消费，不由子游戏自行调度
- 现有 `src/data/emotional-game-catalog.ts` 后续应退化为注册表的情绪入口视图适配层，而不再是唯一事实源

### 5.2 启动上下文与入口契约

小游戏启动上下文需要统一补齐以下能力：

- `participantStudentIds: number[]`
- `initialDifficulty: 1 | 2 | 3`
- `difficultyLocked: boolean`
- `launchEntryCode`
- `launchModuleCode`

明确约束：

- 单人游戏 `participantStudentIds.length = 1`
- 双人游戏 `participantStudentIds.length = 2`
- 当前阶段不支持 3 人及以上同屏小游戏

### 5.3 双人游戏共享场次契约

本轮明确双人游戏是**共享场次**，不是“两名学生各自独立完成一局”。

因此：

- 双人游戏不等待两个独立 `onGameComplete`
- 子游戏只向容器抛出共享终态事件：
  - `completeGroupGame(payload)`
  - `abortGroupGame(reason)`
- 任何一方主动退出、教师结束、系统中断，整组场次立即进入 `aborted`
- 不存在“一人退出，另一人继续独立完成再补记”的 Phase 0 支持

### 5.4 组写入事务安全

多人场次持久化必须以**单事务**完成，不能接受半成功状态。

建议提供统一的 `persistSessionGroup()`：

- 输入：
  - `participantStudentIds[]`
  - `sessionGroupId`
  - `completionStatus`
  - `exitTrigger`
  - 共享 `performanceData`
  - 徽章数据（如适用）
- 单事务内完成：
  - 写入全部 `game_emotion_records`
  - 写入全部 `training_session`
  - 写入 `game_session_participants`
  - 完成全部 `student_badges` upsert
- 任一步失败整组回滚

验收底线：

- 不允许出现一条记录带 `session_group_id`、另一条未落库的悬空场次

### 5.5 数据模型补充

在现有小游戏数据链上补以下字段与关联表：

#### `game_emotion_records`

新增：

- `session_group_id TEXT`
- `exit_trigger TEXT`
- `session_participants TEXT`（仅作快照，不作为主查询结构）

保留：

- `student_id` 继续为非空，不走 `null` 方案

#### 新增 `game_session_participants`

建议结构：

```sql
CREATE TABLE IF NOT EXISTS game_session_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_group_id TEXT NOT NULL,
  student_id INTEGER NOT NULL,
  role TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

建议索引：

- `(student_id, created_at DESC)`
- `(session_group_id, student_id)`

使用原则：

- 教师后台按学生查询双人场次时，走 `game_session_participants`
- `session_participants` JSON 只作为冗余快照和调试辅助

### 5.6 结束状态与触发来源

小游戏结束语义拆成两层：

- `completion_status`: `completed | aborted`
- `exit_trigger`: `game_complete | user_exit | teacher_exit | timer_end | system_interrupt`

明确规则：

- `C04_HOURGLASS` 倒计时自然归零：`completed + timer_end`
- 孩子通过主退出按钮离开：`aborted + user_exit`
- 教师通过专用教师结束入口离开：`aborted + teacher_exit`
- 权限失败、硬件中断、应用异常关闭：`aborted + system_interrupt`

本轮不引入单独的 `timeout` 作为 `completion_status` 值，避免把“自然完成”与“失败超时”混淆。

### 5.7 教师结束入口

当前主退出按钮不能同时承担 `user_exit` 与 `teacher_exit` 两种语义。

因此 Phase 0 明确：

- 保留现有主退出按钮，语义固定为 `user_exit`
- 新增教师专用结束入口，建议放在 `GameContainer` 设置菜单或教师操作区
- 教师结束必须二次确认
- 后台记录必须能区分 `teacher_exit` 与 `user_exit`

### 5.8 难度锁定

部分训练任务需要禁止孩子自己修改难度。

Phase 0 明确：

- 注册表支持 `difficultyLocked`
- 启动上下文允许覆盖该值
- `GameContainer` 在锁定时不只隐藏难度控件，还必须禁止运行时改值

### 5.9 权限预申请与部分权限策略

当前麦克风和摄像头权限由具体游戏组件各自申请，这会让系统权限弹窗打断训练过程。

Phase 0 要求把权限调度提升到容器层：

- `GameContainer` 在正式挂载游戏组件前完成权限 preflight
- 子游戏不再在首轮自行发起 `getUserMedia()`

每个权限项分别维护状态：

- `granted`
- `retryable_denied`
- `system_denied`
- `not_required`

容器层最终 gate 结果：

- `ready`
- `degraded_ready`
- `blocked`

策略规则：

- `permissionPolicy = 'all_required'`
  - 任一必需权限未通过，则整体拦截
- `permissionPolicy = 'degradable'`
  - 仅在游戏明确定义支持降级时，允许部分授权进入降级态

当前规划阶段默认：

- `G03_FOREST`、`S05_ECHO_PARROT`：麦克风为 `all_required`
- `G08_ENERGY_BALL`：摄像头为 `all_required`
- 未来如某个游戏支持“无麦克风演示模式”，再单独切为 `degradable`

### 5.10 Electron 权限拒绝恢复页

在 Electron 环境中，系统级麦克风/摄像头权限被拒后，`getUserMedia()` 可能持续失败。

因此容器层不能只提供“重试”按钮，必须提供恢复页：

- 展示当前缺失权限项
- 提供按平台区分的系统设置指引：
  - macOS：系统设置 → 隐私与安全性 → 麦克风 / 摄像头
  - Windows：设置 → 隐私和安全性 → 麦克风 / 摄像头
  - Linux：提示检查桌面环境权限与设备占用
- 提供操作：
  - `我已完成设置，重新检测`
  - `返回训练列表`

验收底线：

- 系统级拒绝不能伪装成普通重试错误
- 教师必须能明确区分“软件 bug”与“系统权限未开”

### 5.11 徽章视觉语义约束

为了避免荣誉墙中出现视觉语义高度重合的徽章，注册表中的 `badge` 必须补齐：

- `visualThemeTag`
- `iconToken`
- `paletteToken`

Phase 0 校验规则：

- `badgeCode` 唯一
- `visualThemeTag + iconToken` 组合唯一
- `paletteToken` 允许复用

这意味着：

- “同主题 + 同图标”的徽章不允许重复
- 同主题下复用相同色系不是问题，但不能再用同一个核心图形制造两个近似徽章

### 5.12 注册表校验门禁

新增 `validate:custom-games` 校验脚本，并接入自动门禁，不依赖手动执行。

建议接入点：

- 本地开发前置校验
- `build:web` 前置
- CI 必过检查

至少校验以下内容：

- `gameCode` 唯一
- `entryPath` 唯一
- `badgeCode` 唯一
- `visualThemeTag + iconToken` 唯一
- `requiredPermissions` 只允许白名单值
- `maxPlayers > 1` 时必须启用 group persistence 配置

## 6. Phase 0 预计影响文件

以下是本计划预期会改到的核心区域：

- 注册表与资源视图：
  - `src/data/emotional-game-catalog.ts`
  - 新增统一小游戏注册表文件
- 容器与页面入口：
  - `src/views/emotional/games/GameContainer.vue`
  - `src/views/games/GameLobby.vue`
  - `src/views/games/SelectStudent.vue`
  - `src/router/index.ts`
- 数据与迁移：
  - `src/types/emotional/games.ts`
  - `src/database/schema/emotional-schema.sql`
  - `src/database/init.ts`
  - `src/database/emotional-games-api.ts`
- 训练记录读取：
  - `src/views/training-records/components/GameRecordsPanel.vue`
  - `src/views/emotional/GameRecordDetail.vue`
- 校验脚本：
  - `scripts/validate-custom-games.mjs` 或等价脚本

当前阶段不要求立刻大规模重命名现有 `emotional` 文件路径。优先先把行为、注册与落库模型收口，再决定是否迁目录。

## 7. 游戏分波次实施顺序

### 7.1 Wave 1：低风险高复用首批

优先落地以下 6 个：

- `C01_DANDELION`
- `F01_CLOUD_ERASE`
- `F05_BALLOONS`
- `S04_GIFT_MATCH`
- `S02_EMOTION_MIRROR`
- `C04_HOURGLASS`

原因：

- 能最大化复用现有呼吸、刮擦、拖拽匹配、点击选择等能力
- 不依赖麦克风、语音识别或多指旋转
- 可以尽快验证跨入口小游戏底座是否稳定

### 7.2 Wave 2：中复杂度交互扩展

第二批落地以下 6 个：

- `S01_BURGER`
- `S03_STORY_SEQ`
- `F02_STAR_TRACE`
- `F03_RECYCLING`
- `C02_PUDDLE`
- `C03_XYLOPHONE`

原因：

- 这批需要新的交互中层，如吸附排序、轨迹精度、多点触控、水波和音乐序列
- `S01_BURGER` 虽然是双人游戏，但在 Phase 0 完成共享场次与事务组写入后即可进入实施

### 7.3 Wave 3：高风险硬件与控制游戏

第三批落地：

- `S05_ECHO_PARROT`
- `F04_TRACK_BUILD`

原因：

- `S05_ECHO_PARROT` 叠加了麦克风、音频分析、语音识别兼容性风险
- `F04_TRACK_BUILD` 叠加了旋转、多指或替代控制设计，容易放大交互差异

### 7.4 Wave 4：特殊产品化工具

最后单独处理：

- `C05_MOOD_METER`

原因：

- 它不只是普通小游戏，更接近“训练前后情绪快照工具”
- 后续大概率需要从游戏列表进一步提升为全局快捷入口
- 不适合和其他 14 个小游戏混在同一节奏里开发

## 8. 游戏清单与规划归属

| 代码 | 名称 | 训练入口 | 人数 | 权限 | 计划波次 | 说明 |
|---|---|---|---:|---|---|---|
| `S01_BURGER` | 合作造汉堡 | `social-communication` | 2 | 无 | Wave 2 | 首个双人同屏共享场次游戏 |
| `S02_EMOTION_MIRROR` | 表情猜猜乐 | `social-communication` | 1 | 无 | Wave 1 | 可直接复用单选/多选与情绪卡片经验 |
| `S03_STORY_SEQ` | 故事接龙板 | `social-communication` | 1 | 无 | Wave 2 | 需要排序吸附与时序判定 |
| `S04_GIFT_MATCH` | 礼物分享派对 | `social-communication` | 1 | 无 | Wave 1 | 接近现有拖拽匹配模型 |
| `S05_ECHO_PARROT` | 动物传声筒 | `social-communication` | 1 | `microphone` | Wave 3 | 麦克风与语音识别风险高 |
| `F01_CLOUD_ERASE` | 云朵擦擦擦 | `fine-motor` | 1 | 无 | Wave 1 | 可复用 `G04_WIPE_ICE` 的 Canvas 擦除链 |
| `F02_STAR_TRACE` | 连线小星座 | `fine-motor` | 1 | 无 | Wave 2 | 需要轨迹精度统计 |
| `F03_RECYCLING` | 分拣小能手 | `fine-motor` | 1 | 无 | Wave 2 | 需要掉落与拖拽判定 |
| `F04_TRACK_BUILD` | 轨道修补匠 | `fine-motor` | 1 | 无 | Wave 3 | 旋转与替代控制设计风险高 |
| `F05_BALLOONS` | 刺破慢气球 | `fine-motor` | 1 | 无 | Wave 1 | 低成本验证抑制控制玩法 |
| `C01_DANDELION` | 吹蒲公英 | `soothing-aids` | 1 | 无 | Wave 1 | 可复用呼吸按住/释放底座 |
| `C02_PUDDLE` | 水塘波纹 | `soothing-aids` | 1 | 无 | Wave 2 | 多点触控与永不自动结束模型 |
| `C03_XYLOPHONE` | 星空八音盒 | `soothing-aids` | 1 | 无 | Wave 2 | 需要五声音阶与录制回放 |
| `C04_HOURGLASS` | 魔法沙漏 | `soothing-aids` | 1 | 无 | Wave 1 | 重点验证 `timer_end` 结束语义 |
| `C05_MOOD_METER` | 我的情绪温度计 | `soothing-aids` | 1 | 可选语音扩展 | Wave 4 | 后续可能升级为全局干预工具 |

## 9. Phase 0 验收标准

### 9.1 架构与数据

- [ ] 现有 5 个情绪小游戏已迁入统一注册表视角，行为不回归
- [ ] 新增 `session_group_id`、`exit_trigger` 和 `game_session_participants` 后，现有数据读取不被破坏
- [ ] 双人场次通过单事务组写入，不会出现半成功数据

### 9.2 退出与结束语义

- [ ] `user_exit` 与 `teacher_exit` 在训练记录页可明确区分
- [ ] `C04_HOURGLASS` 可记录 `completed + timer_end`
- [ ] 共享场次中任一参与者退出，会立即以整组 `aborted` 结束

### 9.3 权限与运行时

- [ ] 麦克风/摄像头权限由容器统一 preflight，不在子游戏首轮各自弹权限窗
- [ ] Electron 系统级权限拒绝时，能进入恢复页并给出平台化指引
- [ ] 多权限游戏在“部分授权”情况下不会进入未定义状态

### 9.4 文档与门禁

- [ ] `validate:custom-games` 已接入本地构建前置和 CI
- [ ] 徽章视觉语义冲突可在校验阶段被拦截
- [ ] 文档、注册表与实现边界保持一致，不把规划写成已实现事实

## 10. 下一步执行建议

在正式进入 Wave 1 前，下一步只做一件事：

- 先落 `Phase 0` 的注册表、数据迁移、容器改造和校验门禁

完成 Phase 0 之后，再从 `Wave 1` 的 `C01_DANDELION / F01_CLOUD_ERASE / F05_BALLOONS / S04_GIFT_MATCH / S02_EMOTION_MIRROR / C04_HOURGLASS` 开始逐个实现。
