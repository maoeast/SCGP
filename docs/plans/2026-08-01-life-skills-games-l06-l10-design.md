# 生活自理小游戏 L06–L10 产品与技术设计

> 状态：V1 实施合同（2026-08-01）  
> 范围：新增五款单人生活自理小游戏，不改造 L01–L05，不建立第二套训练记录系统。

## 1. 目标与边界

本批游戏覆盖独立进食、如厕意识、个人卫生、居家安全和社区生活五类真实生活能力。玩法必须与 L01–L05 的洗手步骤、穿衣拖放、刷牙轨迹、餐具定位和书包选择不同，也不能把五款游戏统一降级为“看示范—点按钮—反馈”。

V1 共同边界：

- 单人，`maxPlayers: 1`；现有 `maxPlayers: 2` 会强制选择第二名学生，不能表达“可选双人”。
- 只使用 Pointer Events；鼠标、触屏和触控笔均可完整完成，不申请摄像头或麦克风权限。
- 不设倒计时、排行榜、失败扣分或羞辱性文案。
- 错误只影响当前动作，并允许立即修正；不会清空整局成果。
- 子游戏只发出一次统一 `CustomGameCompletionPayload`，由 `GameContainer` 负责完成、退出和落库。
- 0–4 独立程度是教师观察量表，不由错误次数推断；V1 不伪造自动评分字段。
- 不训练吞咽，不替代进食、如厕、听觉或安全方面的专业评估。

## 2. 共同交互合同

- 主要命中区不小于约 112px，儿童操作区显著大于教师控制区。
- 主界面只保留当前目标、进度、即时反馈和必要的“再提示一次”。
- Pointer 拖动使用 `setPointerCapture()`；处理 `pointerup`、`pointercancel` 和组件卸载。
- 暂停时停止交互和计时采样；恢复后保留本轮进度，不把暂停时长计入动作响应。
- 提示按“目标高亮 → 轨迹/轮廓 → 动画或语音示范 → 教师介入”递进。
- 所有错误反馈使用中性或鼓励性语言，如“慢慢来”“换一个试试”“再核对一次”。
- 每局首次有效操作调用 `markRoundDirty()`；完成时只 emit 一次。
- `total_duration_seconds` 为从首次有效操作至完成的墙钟时长近似值；容器仍保留会话级 `duration_ms` 作为事实来源。

## 3. L06 稳稳送一勺

### 3.1 产品定义

- `gameCode`: `L06_STEADY_SPOON`
- 路径：`/life-skills/games/steady-spoon`
- 领域：独立进食
- 核心机制：按住大勺持续移动，在速度、急转和路径偏移之间进行闭环稳定控制；不是固定槽位拖放。

孩子从碗边抓住大勺，沿宽阔通道移动到角色嘴边。稳定时显示绿色柔光；过快或偏离时显示柔和波纹。到达嘴边自动送达，无需精准松手。累积不稳定采样达到宽容阈值时，当前食物回到碗中，但已送达勺数不回退。

### 3.2 难度

| 难度 | 目标 | 运动负荷 | 支持 |
|---|---:|---|---|
| 简单 | 3 勺 | 宽直路、较高速度容忍 | 全程通道 |
| 中等 | 4 勺 | 宽缓弯、降低速度阈值 | 全程通道 |
| 困难 | 5 勺 | 曲线方向改变、稳定阈值更严格 | 通道弱化，可主动显示 |

难度改变支持程度和运动规划，不把“越快越好”作为目标。

### 3.3 指标

- `target_scoops`, `delivered_scoops`, `spill_events`
- `stable_motion_ratio`（稳定采样/有效采样，0–1）
- `path_deviation_ratio`（平均归一化路径偏移，0–1）
- `delivery_times_ms`, `average_delivery_ms`, `regrasp_count`, `hint_count`
- `input_adaptation: 'pointer'`, `actual_params`, `total_duration_seconds`

标准正确率取 `stable_motion_ratio`；标准响应时取 `average_delivery_ms`。

## 4. L07 身体信号小灯塔

### 4.1 产品定义

- `gameCode`: `L07_BODY_SIGNAL`
- 路径：`/life-skills/games/body-signal`
- 领域：如厕意识与主动表达
- 核心机制：根据身体线索选择信号，再持续按住“大声告诉大人”完成主动请求；不是步骤排序。

每轮先出现一个简短生活情境。孩子在大图卡中识别“想上厕所 / 肚子饿 / 身体累了”，识别正确后持续按住表达按钮，灯塔逐渐点亮。松手不会扣分，只保留当前轮并可重新按住。

### 4.2 难度

| 难度 | 目标 | 认知负荷 | 表达动作 |
|---|---:|---|---|
| 简单 | 3 轮 | 2 个选择、线索突出 | 按住 0.5 秒 |
| 中等 | 4 轮 | 3 个选择、线索更生活化 | 按住 0.65 秒 |
| 困难 | 5 轮 | 3 个选择、包含相近身体描述 | 按住 0.8 秒 |

### 4.3 指标

- `target_rounds`, `recognized_signals`, `wrong_signal_choices`
- `requests_completed`, `request_hold_breaks`, `hint_count`
- `response_times_ms`, `average_response_ms`, `total_duration_seconds`

标准正确率取 `recognized_signals / (recognized_signals + wrong_signal_choices)`；响应时取从线索出现到正确识别的平均时长。

## 5. L08 毛巾拧拧工坊

### 5.1 产品定义

- `gameCode`: `L08_TOWEL_TWIST`
- 路径：`/life-skills/games/towel-twist`
- 领域：个人卫生与双侧协调
- 核心机制：左右两端沿相反方向移动，并在每次成功后交换方向；不是单目标轨迹或物品配对。

毛巾左右各有一个大把手。触屏可双指同时操作，鼠标可先后移动两端；当左右端都达到本轮相反方向目标时完成一次拧动。错误同向只柔和回弹当前把手，不清空已完成次数。

### 5.2 难度

| 难度 | 目标 | 动作负荷 | 支持 |
|---|---:|---|---|
| 简单 | 3 次 | 较短移动距离 | 持续方向箭头 |
| 中等 | 4 次 | 中等距离、方向交替 | 持续方向箭头 |
| 困难 | 5 次 | 更长距离、方向交替 | 箭头弱化，可主动显示 |

### 5.3 指标

- `target_twists`, `completed_twists`, `direction_mismatches`
- `grip_releases`, `coordinated_motion_ratio`（成功动作/全部方向提交，0–1）
- `twist_times_ms`, `average_twist_ms`, `hint_count`, `total_duration_seconds`

标准正确率取 `coordinated_motion_ratio`；响应时取每次完整双侧拧动的平均时长。

## 6. L09 家里声音小侦探

### 6.1 产品定义

- `gameCode`: `L09_HOME_SOUND`
- 路径：`/life-skills/games/home-sound`
- 领域：居家安全
- 核心机制：听预置/TTS 生活声音线索，先定位来源，再匹配安全反应；不采集麦克风输入。

每轮播放一个不刺耳的声音提示，如门铃、报警器、水壶或流水声。孩子先选声音来源，再从两张行动卡中选择安全反应。声音始终有可见文字替代，支持听觉敏感或听觉受限儿童；“再听一次”不计错误。

### 6.2 难度

| 难度 | 目标 | 来源选择 | 支持 |
|---|---:|---:|---|
| 简单 | 3 轮 | 2 个 | 自动播放，图文同时突出 |
| 中等 | 4 轮 | 3 个 | 自动播放一次，可手动重播 |
| 困难 | 5 轮 | 3 个 | 文字线索弱化后再显示，可手动重播 |

### 6.3 指标

- `target_rounds`, `source_matches`, `wrong_source_choices`
- `safe_responses`, `unsafe_response_choices`
- `replay_count`, `hint_count`, `response_times_ms`, `average_response_ms`
- `total_duration_seconds`

标准正确率取 `(source_matches + safe_responses) / 全部来源与行动选择`；响应时取每轮从声音播放到安全行动完成的平均时长。

## 7. L10 超市付款小能手

### 7.1 产品定义

- `gameCode`: `L10_MARKET_PAY`
- 路径：`/life-skills/games/market-pay`
- 领域：社区生活
- 核心机制：把不同面值硬币逐枚投入托盘，主动点击核对，并根据“还差 / 多了”反馈增减后再次核对；不是一次性选择答案。

每轮显示一件商品和整数价格。孩子用大硬币按钮逐枚投放，可点击托盘中最后一枚退回。系统只在孩子主动“核对付款”时判断，少付或多付均保留托盘，鼓励自主纠错。精确付款后进入下一件商品。

### 7.2 难度

| 难度 | 目标 | 面值 | 数量规划 |
|---|---:|---|---|
| 简单 | 3 件 | 1 元 | 直接数量对应 |
| 中等 | 4 件 | 1、2 元 | 两种组合 |
| 困难 | 5 件 | 1、2、5 元 | 多种组合与主动纠错 |

### 7.3 指标

- `target_purchases`, `completed_purchases`, `exact_payments`
- `underpayment_checks`, `overpayment_checks`, `incorrect_payment_checks`
- `correction_actions`, `coins_placed`, `hint_count`
- `payment_times_ms`, `average_payment_ms`, `total_duration_seconds`

标准正确率取 `exact_payments / (exact_payments + incorrect_payment_checks)`；响应时取每件商品从出现到精确付款的平均时长。

## 8. 技术接入

每款页面采用同一页面合同：

1. `getRequiredCustomGameDefinition(gameCode)` 读取注册定义。
2. `buildCustomGameLaunchContext(route.query, definition)` 构造启动上下文。
3. 复用现有 `src/views/emotional/games/GameContainer.vue`（文件名是历史债，V1 不做大范围重命名）。
4. 从默认插槽接收 `difficulty`, `isPaused`, `completeGame`, `markRoundDirty`, `audio`。
5. 游戏组件通过 `@complete="completeGame"` 提交，不直接访问数据库。

注册项统一使用：

- `moduleCode: ModuleCode.LIFE_SKILLS`
- `trainingEntryCode: 'life-skills'`
- `maxPlayers: 1`
- `requiredPermissions: []`
- `permissionPolicy: 'all_required'`
- 新增语义明确的 `/life-skills/games/...` 路由，不继续扩大 `/emotional/games/...` 历史命名债。

持久化沿用 `src/database/emotional-games-api.ts`；详情页在 `GameRecordDetail.vue` 显示上述教师可读指标；IEP 归一化在 `game-performance-normalizer.ts` 中按同一口径配置。

## 9. 视觉与资产策略

V1 使用 CSS 场景、平台字体和大尺寸 emoji/图形组合，避免在玩法未验证前增加 AI 资产依赖。它们不是旧贴纸换皮：每款舞台布局由交互机制决定。后续若需要品牌化插画，可沿用 `scripts/generate-selfcare-artwork.mjs` 和 Electron `nativeImage` 缩图流程，运行时通过 `resource://` 加载，禁止新增 `sharp` 等原生依赖。

音频复用容器 `audio.speak()`、`playSoftBounce()` 和 `playSuccessCue()`；L09 使用柔和拟声文本/TTS，不播放刺耳报警采样，也不申请麦克风权限。

## 10. 验收

- 五个 `gameCode` 同时存在于注册表、路由页面、组件、标准指标派生、详情映射和 IEP 归一化规则。
- 大厅可通过 `trainingEntryCode: 'life-skills'` 查询到五款游戏。
- 每款难度至少改变目标数量以及一种支持/认知/动作负荷，而非只改变计时。
- Pointer 取消和暂停不会误完成，不会重复 emit。
- 相关纯逻辑与合同测试通过。
- `npm run type-check`、`npm run build:web` 通过。
