# 情绪行为调节模块页面与路由设计

## 1. 设计目标

本设计文档用于明确情绪行为调节模块如何接入 SCGP 现有页面体系、路由体系和学生训练流程，确保新模块不是孤立页面，而是延续当前“模块入口 -> 选择学生 -> 训练流程 -> 记录查看 -> 报告查看”的产品路径。

## 2. 当前系统可复用能力

当前项目已具备以下可复用结构：

1. 模块注册：`src/core/module-registry.ts`
2. 顶级训练入口：`/games`、`/games/menu`
3. 学生选择页：`/games/select-student`
4. 训练记录入口：`/training-records/menu`
5. 报告列表页：`/reports`
6. 统一模块类型：`src/types/module.ts`

因此情绪模块建议采用“模块接入 + 专属训练页 + 专属报告页”的方案。

## 3. 页面接入原则

1. 不新建独立的顶级系统。
2. 继续通过现有“游戏训练”模块入口进入。
3. 训练完成后数据进入现有训练记录体系，并新增情绪模块专属查看页。
4. 通用报告列表保留摘要入口，详细可视化趋势进入情绪模块报告页。
5. 页面命名与目录结构延续现有 `src/views/...` 风格。

## 4. 推荐页面清单

### 4.1 学生端训练页面

建议新增目录：

`src/views/emotional/`

建议页面：

1. `src/views/emotional/Menu.vue`
   - 情绪模块首页
   - 展示两个子模块入口：情绪与场景、表达关心
2. `src/views/emotional/SelectMode.vue`
   - 可选，如果希望在进入学生选择前先选训练子模块
   - 若想减少页面层级，可不单独设置
3. `src/views/emotional/SelectStudent.vue`
   - 如需独立情绪模块入口可单独实现
   - 若复用现有 `/games/select-student`，则无需新增
4. `src/views/emotional/EmotionSceneTraining.vue`
   - 情绪与场景训练主页面
   - 包含：场景展示、情绪选择、社交推理、问题解决
5. `src/views/emotional/CareExpressionTraining.vue`
   - 表达关心训练主页面
   - 包含：情境展示、话术选择、视角切换、反馈说明
6. `src/views/emotional/SessionSummary.vue`
   - 单次训练完成后的总结页
   - 展示：正确率、用时、表现亮点、下一步建议

### 4.2 教师端查看页面

建议新增：

1. `src/views/emotional/Records.vue`
   - 情绪模块训练记录页
   - 支持按学生、子模块、日期筛选
2. `src/views/emotional/Report.vue`
   - 情绪模块专属报告页
   - 使用 ECharts 展示趋势和偏好数据

### 4.3 管理与内容配置页面

首期如果仅使用内置演示数据，可暂缓单独后台页面。

二期建议新增：

1. `src/views/admin/EmotionalSceneManager.vue`
   - 管理情绪与场景资源
2. `src/views/admin/CareSceneManager.vue`
   - 管理表达关心资源

## 5. 推荐路由设计

## 5.1 模块入口接入

当前建议仍从 `/games/menu` 进入情绪模块。

建议新增以下路由：

```ts
{
  path: 'emotional',
  name: 'EmotionalModule',
  component: () => import('@/views/emotional/Menu.vue'),
  meta: {
    title: '情绪行为调节',
    hideInMenu: true,
    roles: ['admin', 'teacher']
  }
}
```

为了兼容现有模式，点击 `/games/menu` 中的 `emotional` 模块卡片后，可直接跳转：

- `/games/select-student?module=emotional`

学生选择完成后，按训练子模块再进入具体训练页。

## 5.2 训练路由

建议新增：

```ts
{
  path: 'emotional/scene/:studentId',
  name: 'EmotionalSceneTraining',
  component: () => import('@/views/emotional/EmotionSceneTraining.vue'),
  meta: {
    title: '情绪与场景训练',
    hideInMenu: true,
    roles: ['admin', 'teacher']
  }
},
{
  path: 'emotional/care/:studentId',
  name: 'EmotionalCareTraining',
  component: () => import('@/views/emotional/CareExpressionTraining.vue'),
  meta: {
    title: '表达关心训练',
    hideInMenu: true,
    roles: ['admin', 'teacher']
  }
},
{
  path: 'emotional/session-summary/:studentId',
  name: 'EmotionalSessionSummary',
  component: () => import('@/views/emotional/SessionSummary.vue'),
  meta: {
    title: '训练结果',
    hideInMenu: true,
    roles: ['admin', 'teacher']
  }
}
```

## 5.3 记录与报告路由

建议新增：

```ts
{
  path: 'training-records/emotional',
  name: 'EmotionalRecords',
  component: () => import('@/views/emotional/Records.vue'),
  meta: {
    title: '情绪训练记录',
    hideInMenu: true,
    roles: ['admin', 'teacher']
  }
},
{
  path: 'reports/emotional/:studentId',
  name: 'EmotionalReport',
  component: () => import('@/views/emotional/Report.vue'),
  meta: {
    title: '情绪训练报告',
    hideInMenu: true,
    roles: ['admin', 'teacher']
  }
}
```

## 6. 推荐页面流转

### 6.1 训练流转

```text
/games/menu
  -> 选择“情绪行为调节”
  -> /games/select-student?module=emotional
  -> 选择学生
  -> /emotional
  -> 选择子模块
     -> /emotional/scene/:studentId
     -> 或 /emotional/care/:studentId
  -> 完成训练
  -> /emotional/session-summary/:studentId
  -> 返回情绪模块首页或继续下一个训练
```

### 6.2 记录与报告流转

```text
/training-records/menu
  -> 选择“情绪行为调节”
  -> /training-records/emotional
  -> 查看某次训练记录

/reports
  -> 查看情绪模块报告摘要
  -> /reports/emotional/:studentId
  -> 查看专属可视化报告
```

## 7. 页面职责拆分

### 7.1 `Menu.vue`

职责：

- 展示模块说明
- 展示两个子模块入口
- 展示最近训练摘要
- 提供“继续上次训练”和“查看报告”快捷入口

### 7.2 `EmotionSceneTraining.vue`

职责：

- 加载单个场景资源
- 情绪识别
- 推理问题流程控制
- 应对方案选择
- 即时反馈
- 写入训练记录

### 7.3 `CareExpressionTraining.vue`

职责：

- 加载表达关心场景
- 呈现三类话术
- 切换表达者/接收者视角
- 展示虚拟反馈
- 写入训练记录

### 7.4 `Records.vue`

职责：

- 展示会话列表
- 支持按学生、子模块、场景类型、日期筛选
- 支持查看单次作答明细

### 7.5 `Report.vue`

职责：

- 展示趋势图
- 展示偏好图
- 展示能力分层总结
- 提供老师/家长建议文案

## 8. 复用建议

优先复用：

1. `/games/menu` 作为统一模块入口
2. `/games/select-student` 作为学生选择页
3. `ModuleRegistry` 作为模块激活与展示来源
4. `/training-records/menu` 作为训练记录入口
5. `/reports` 作为总报告入口

建议新增而不是强行复用的页面：

1. 情绪模块首页
2. 两个训练主页面
3. 情绪模块记录页
4. 情绪模块专属报告页

## 9. UI 交互原则

1. 学生训练页优先全屏或近似全屏，弱化后台管理元素。
2. 训练页一次只显示一个问题区块。
3. 情绪选项使用图标 + 中文双编码。
4. 正反馈与错误反馈视觉区分明显，但不使用惩罚式红色警报设计。
5. 训练完成页只展示少量关键结果，避免信息压迫。

## 10. 首期最小页面集合

如果要压缩首期范围，建议最小交付以下 5 个页面：

1. `src/views/emotional/Menu.vue`
2. `src/views/emotional/EmotionSceneTraining.vue`
3. `src/views/emotional/CareExpressionTraining.vue`
4. `src/views/emotional/Records.vue`
5. `src/views/emotional/Report.vue`

其中学生选择和总入口继续复用现有页面。
