# MVP 四款情绪游戏总体验收与真机调参清单

日期：2026-03-20  
适用范围：

- `src/components/emotional/games/BalloonBreathingGame.vue`
- `src/components/emotional/games/VoiceVolumeForestGame.vue`
- `src/components/emotional/games/WipeSadnessGame.vue`
- `src/components/emotional/games/EmotionMonsterGame.vue`

## 1. 使用说明

这份文档用于周末真机试玩与下周一集中调参，不涉及业务方案变更，只聚焦：

- 真机体感是否顺手
- 当前难度是否分层明确
- 关键变量应该去哪里改

行号以当前主线代码为准；后续如果文件继续演进，优先按“变量名 + 文件路径”搜索。

## 2. 总体验收顺序

建议每款游戏都按同一顺序试玩：

1. 先用桌面鼠标快速确认基本流程通关。
2. 再用真实触摸屏/触控板验证拖拽、按压、滑动是否顺手。
3. 最后切 L1 / L2 / L3，确认难度不是“同玩法换文案”。

通用观察项：

- 任意阶段点击 `GameContainer` 的“安静退出”后，音效和动画是否立刻停掉。
- 通关后是否稳定出现专属收尾仪式和徽章弹窗。
- 退出记录和完成记录是否都能静默落库，不出现打断式弹窗。

## 3. Top 1 深呼吸热气球

### 真机体感测试点

- 按住吸气时，主按钮是否足够大，低龄儿童能否稳定长按而不误松手。
- 自动呼气阈值是否合适：孩子持续按住时会不会太早打断，或者太晚才触发。
- L2 云朵是否真有“等时机”的体感，而不是几乎必撞或几乎必过。
- L3 三轮节奏是否足够稳定训练，但不会因为窗口太窄导致连续失败。
- 错误回弹是否温和，是否有“被弹飞/被惩罚”的挫败感。

### 核心调参变量速查表

| 变量 / 区块 | 作用 | 文件 / 行号 |
|---|---|---|
| `OBJECTIVES_BY_DIFFICULTY` | 三档难度总入口 | `src/components/emotional/games/BalloonBreathingGame.vue:253` |
| `inhaleMinMs` | 最低吸气时长 | `src/components/emotional/games/BalloonBreathingGame.vue:262`, `276`, `290`, `306`, `320`, `334`, `350`, `366`, `382` |
| `perfectMinMs` / `perfectMaxMs` | L3 完美节奏窗口 | `src/components/emotional/games/BalloonBreathingGame.vue:351-352`, `367-368`, `383-384` |
| `glideMs` | 呼气后上升/滑翔时长 | `src/components/emotional/games/BalloonBreathingGame.vue:263`, `277`, `291`, `307`, `321`, `335`, `353`, `369`, `385` |
| `cloudCount` | 云朵数量 | `src/components/emotional/games/BalloonBreathingGame.vue:265`, `279`, `293`, `309`, `323`, `337`, `355`, `371`, `387` |
| `cloudSpeedScale` | 云层移动速度 | `src/components/emotional/games/BalloonBreathingGame.vue:266`, `280`, `294`, `310`, `324`, `338`, `356`, `372`, `388` |
| `safeWidth` | L2/L3 避障判定宽度 | `src/components/emotional/games/BalloonBreathingGame.vue:267`, `281`, `295`, `311`, `325`, `339`, `357`, `373`, `389` |
| `autoReleaseTimer` | 单次按住超 6 秒自动释放 | `src/components/emotional/games/BalloonBreathingGame.vue:844-846` |
| `assistanceLevel` + 自适应阈值 | 连续失败后的宽容修正 | `src/components/emotional/games/BalloonBreathingGame.vue:424`, `529-537`, `701`, `793`, `904` |

## 4. Top 2 音量魔法森林

### 真机体感测试点

- 麦克风底噪是否容易把 L1 误判成“已经在说话”。
- 校准阶段是否足够稳定：安静 2 秒和“说一句你好”是否容易成功采样。
- L1 宽容区间是否真的很宽，孩子轻声说话就能点亮森林。
- L2 超过阈值后，小动物躲藏是否过于频繁，导致节奏断裂。
- L3 派对干扰是否明显但不过载，目标 10 秒是否真的有“稳住”的挑战感。
- 语音/背景音量同时开着时，家长是否还能直观看懂当前目标区间。

### 核心调参变量速查表

| 变量 / 区块 | 作用 | 文件 / 行号 |
|---|---|---|
| `OBJECTIVES` | 三档音量难度总入口 | `src/components/emotional/games/VoiceVolumeForestGame.vue:280` |
| `targetMinDb` / `targetMaxDb` | 目标音量区间 | `src/components/emotional/games/VoiceVolumeForestGame.vue:284-285`, `298-299`, `312-313` |
| `warningDb` | 过大声警戒阈值 | `src/components/emotional/games/VoiceVolumeForestGame.vue:286`, `300`, `314` |
| `completionGoalMs` | 稳定命中所需时长 | `src/components/emotional/games/VoiceVolumeForestGame.vue:287`, `301`, `315` |
| `animalMilestones` | 唤醒动物节点 | `src/components/emotional/games/VoiceVolumeForestGame.vue:288`, `302`, `316` |
| `usePartyBed` | L3 是否启用背景派对干扰 | `src/components/emotional/games/VoiceVolumeForestGame.vue:292`, `306`, `320` |
| `loudPenalty` | 超阈值时是否清空/惩罚进度 | `src/components/emotional/games/VoiceVolumeForestGame.vue:293`, `307`, `321` |
| `noiseFloorDbfs` | 安静底噪基线 | `src/components/emotional/games/VoiceVolumeForestGame.vue:373`, `942` |
| `speechReferenceDbfs` | 日常说话参考值 | `src/components/emotional/games/VoiceVolumeForestGame.vue:374`, `953-956` |
| `updateListening()` | 实时命中、超阈值、进度逻辑主入口 | `src/components/emotional/games/VoiceVolumeForestGame.vue:866-937` |
| `triggerHideAnimal()` | 超阈值后小动物躲藏手感 | `src/components/emotional/games/VoiceVolumeForestGame.vue:694-706` |
| `playCelebrationMusic()` | 通关庆祝音乐体感 | `src/components/emotional/games/VoiceVolumeForestGame.vue:748-767` |

## 5. Top 3 擦亮坏心情

### 真机体感测试点

- Canvas 擦拭在低配 Windows 触摸屏上是否有明显卡顿、断笔或延迟。
- 手指大动作横扫时，视觉擦除是否足够即时，不会出现“划了但没擦开”的感觉。
- L1 是否真的是“随便擦几下就明显融化”。
- L2 停下后的结冰恢复是否足够慢，既有连续输出要求，又不让孩子立刻崩盘。
- L3 三层厚冰是否有“更费力”的体感，但不会让进度过慢导致疲劳挫败。
- 底部面板是否始终不遮挡核心可擦区域，移动端和桌面端都要看。

### 核心调参变量速查表

| 变量 / 区块 | 作用 | 文件 / 行号 |
|---|---|---|
| `DIFFICULTY_CONFIGS` | 三档擦除难度总入口 | `src/components/emotional/games/WipeSadnessGame.vue:206` |
| `maxStrength` | 厚冰层数 | `src/components/emotional/games/WipeSadnessGame.vue:208`, `221`, `234` |
| `brushRadius` | 擦拭半径 / 手感大小 | `src/components/emotional/games/WipeSadnessGame.vue:209`, `222`, `235` |
| `erodePower` | 单次擦拭削弱力度 | `src/components/emotional/games/WipeSadnessGame.vue:210`, `223`, `236` |
| `targetRatio` | 通关百分比阈值 | `src/components/emotional/games/WipeSadnessGame.vue:211`, `224`, `237` |
| `regenDelayMs` | L2 停下多久开始回冻 | `src/components/emotional/games/WipeSadnessGame.vue:212`, `225`, `238` |
| `regenPerSecond` | L2 回冻速度 | `src/components/emotional/games/WipeSadnessGame.vue:213`, `226`, `239` |
| `cellSize` | 逻辑网格颗粒度 | `src/components/emotional/games/WipeSadnessGame.vue:214`, `227`, `240` |
| `globalCompositeOperation = 'destination-out'` | 视觉擦除实现点 | `src/components/emotional/games/WipeSadnessGame.vue:588` |
| `applyBrushToGrid()` | 逻辑网格削弱与命中主入口 | `src/components/emotional/games/WipeSadnessGame.vue:596-617` |
| `stepRegen()` | L2 缓慢回冻主循环 | `src/components/emotional/games/WipeSadnessGame.vue:777-814` |
| `panelSafeBottom` / `scratchStageBottom` | 底部面板动态避让 | `src/components/emotional/games/WipeSadnessGame.vue:354-357` |

## 6. Top 4 喂食情绪小怪兽

### 真机体感测试点

- Pointer 拖拽是否足够跟手：按下、抬起、移动过程中有没有“跳一下”或明显延迟。
- 工具回弹是否温和自然，错误后会不会显得太像“失败惩罚”。
- 怪兽接收区判定是否直观：拖到怪兽身体附近时，悬停高亮是否能给到足够反馈。
- L1 是否足够简单：1 只怪兽 + 2 个工具时，孩子能否快速理解“拖过去喂它”。
- L2 干扰项是否有效但不过度，让孩子能通过观察提示修正。
- L3 传送带移动是否平滑，拖起工具时是否能明显感觉到“脱离轨道”，松手后是否能自然回到传送带。
- 收尾阶段怪兽变绿、拍肚子、睡觉和呼噜音是否顺畅，不会抢戏或持续过久。

### 核心调参变量速查表

| 变量 / 区块 | 作用 | 文件 / 行号 |
|---|---|---|
| `SESSION_CONFIGS` | 每档怪兽/工具组合池 | `src/components/emotional/games/EmotionMonsterGame.vue:383` |
| `DIFFICULTY_CONFIGS` | 三档玩法参数总入口 | `src/components/emotional/games/EmotionMonsterGame.vue:401` |
| `conveyorSpeedPx` | L3 传送带移动速度 | `src/components/emotional/games/EmotionMonsterGame.vue:404`, `412`, `420`, `1040`, `1056-1057` |
| `slotSpacing` | 工具槽位间距 | `src/components/emotional/games/EmotionMonsterGame.vue:405`, `413`, `421`, `662-663` |
| `findHoveredMonster()` | 怪兽碰撞检测入口 | `src/components/emotional/games/EmotionMonsterGame.vue:788-804` |
| `beginDrag()` | 拖拽起手偏移与手感入口 | `src/components/emotional/games/EmotionMonsterGame.vue:806-829` |
| `handlePointerMove()` | 拖拽跟手更新 | `src/components/emotional/games/EmotionMonsterGame.vue:832-842` |
| `handlePointerUp()` | 松手判定正确/错误命中 | `src/components/emotional/games/EmotionMonsterGame.vue:891-906` |
| `stepConveyor()` | L3 传送带主循环 | `src/components/emotional/games/EmotionMonsterGame.vue:1044-1061` |
| `completeSession()` | 拍肚子 → 睡觉 → 徽章收尾节奏 | `src/components/emotional/games/EmotionMonsterGame.vue:985-1027` |
| `startSnoreLoop()` | 呼噜音效循环 | `src/components/emotional/games/EmotionMonsterGame.vue:729-757` |
| `buildPerformanceData()` | 试玩记录落库字段 | `src/components/emotional/games/EmotionMonsterGame.vue:1029-1042` |

## 7. 周一优先调参建议

如果周一时间有限，建议优先按这个顺序调：

1. **Top 2 麦克风阈值**：最容易受真实设备差异影响。
2. **Top 3 擦拭半径 / 恢复速度**：最影响大动作发泄的体感。
3. **Top 4 拖拽跟手 / 传送带速度**：最影响 L3 是否“难但不乱”。
4. **Top 1 L3 节奏窗口**：最后再微调连续三轮的稳定性。

## 8. 周末试玩记录模板

建议每轮试玩都记三件事：

- **设备**：Windows 触摸屏 / 普通鼠标 / 外接麦克风 / 笔记本内置麦克风
- **难度**：L1 / L2 / L3
- **一句结论**：例如“L2 回冻太快”“L3 传送带略快”“麦克风底噪偏高”

只要周末把这三项记下来，下周一就能直接对照上面的变量入口改。
