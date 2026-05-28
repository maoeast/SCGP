# 云朵擦擦擦 视觉升级 + 全屏沉浸改造 设计规格

status: approved
date: 2026-05-27

---

## 1. 目标

将 CloudEraseGame（F01_CLOUD_ERASE）从当前的卡片式布局 + 触摸输入，全面重构为全屏沉浸 + HandCameraLayer 手势追踪架构，与已完成的 WipeSadnessGame（G04_WIPE_ICE）完全对齐。

## 2. 方案

以当前 WipeSadnessGame.vue 为基座，替换所有冰霜/冰晶主题为云朵主题。骨架代码已验证，仅改视觉层和文案。

## 3. 改动文件

| 文件 | 改动类型 |
|------|----------|
| `src/components/emotional/games/CloudEraseGame.vue` | 全文重写 |
| `src/data/custom-game-registry.ts` | 权限更新 |

## 4. 架构

直接复制 WipeSadnessGame.vue 的已验证架构，改动点如下：

| 层面 | WipeSadness（基座） | CloudErase（改后） |
|------|---------------------|---------------------|
| 输入层 | HandCameraLayer + onPrimaryPoint | 不变 |
| 覆盖层纹理 | 冰霜蓝白色调 | 暖白云朵纹理 |
| 粒子系统 | 冰晶菱形碎片 | 云朵蓬松圆球 |
| 庆祝动画 | 冰霜爆碎 + 纸屑 + 金雨 | 云层爆散 + 纸屑 + 金雨 |
| 太阳/山丘 | 活力光芒 + 童话插画 | 完全复用 |
| Theme 数据 | 暖阳山谷/微风湖边 | 晴空草坡/微风晴湾 |
| 游戏文案 | 冰霜/坏心情主题 | 云朵/拨云主题 |
| 注册表权限 | camera + degradable | camera + degradable |

## 5. 云朵视觉身份

### 5.1 覆盖层纹理

替换 FROST_COLORS 为 CLOUD_COLORS：

```typescript
const CLOUD_COLORS = [
  'rgba(255, 255, 255, 0.96)',
  'rgba(245, 248, 252, 0.93)',
  'rgba(238, 243, 250, 0.90)',
]
```

createTemplateCanvas 生成棉花云纹理：
- 基底渐变：暖白 `rgba(255, 255, 255, 0.96)` → 微灰蓝 `rgba(238, 243, 250, 0.90)`
- 随机 blob：半径 50-130、透明度 0.5-0.7、更圆润
- 线条纹路：粗线（2-4）、更柔和曲线模拟云丝

### 5.2 云朵粒子系统

替换 IceParticle 为 CloudParticle：

```typescript
interface CloudParticle {
  x: number; y: number
  vx: number; vy: number
  size: number; life: number
  rotation: number; spin: number
}
```

- 形状：圆形（arc），非菱形
- 颜色：`rgba(255,255,255,0.9)` / `rgba(240,245,250,0.9)`
- 物理：vx ±3、vy -2~0.5、重力 0.04、生命衰减 0.018
- 命名：spawnCloudParticles / stepCloudParticles / stopCloudParticles
- maxPool：200

### 5.3 庆祝云朵爆散

- 60 个云朵粒子从屏幕中心向外扩散
- 速度更慢、轨迹更飘逸（与冰晶对比）
- 五彩纸屑 92 个 + 金色光雨 40 个：完全复用 WipeSadness 逻辑

## 6. Theme 数据

### 6.1 Theme 接口

与 WipeSadness 完全一致：

```typescript
interface Theme {
  key: string
  title: string
  skyGradient: string
  glowGradient: string
  hillFar: string
  hillMid: string
  hillNear: string
  lakeFill: string
  grassStroke: string
  sunFill: string
  revealTitle: string
  badgeCopy: string
  celebrationLine: string
}
```

### 6.2 两个主题

**晴空草坡（clear-sky-meadow）：**

| 字段 | 值 |
|------|---|
| skyGradient | `radial-gradient(circle at top, rgba(255,255,255,0.42), transparent 34%), linear-gradient(180deg, #8fdcff 0%, #dff6ff 54%, #fff6d8 100%)` |
| glowGradient | `radial-gradient(circle, rgba(255, 235, 168, 0.88), rgba(255, 235, 168, 0))` |
| hillFar | `#a8e6cf` |
| hillMid | `#7dcfb6` |
| hillNear | `#56c596` |
| lakeFill | `#87ceeb` |
| grassStroke | `#3da87a` |
| sunFill | `#ffd460` |
| revealTitle | 云朵正在慢慢散开 |
| badgeCopy | 云朵被你拨开啦，晴空巧手徽章亮起来了。 |
| celebrationLine | 云层都被你擦开啦，蓝天出来咯！ |

**微风晴湾（breeze-harbor）：**

| 字段 | 值 |
|------|---|
| skyGradient | `radial-gradient(circle at top, rgba(255,255,255,0.36), transparent 34%), linear-gradient(180deg, #a7e3ff 0%, #ecfffb 54%, #fff0c9 100%)` |
| glowGradient | `radial-gradient(circle, rgba(205, 255, 236, 0.9), rgba(205, 255, 236, 0))` |
| hillFar | `#b5e8d5` |
| hillMid | `#8cd8c0` |
| hillNear | `#6ad4a8` |
| lakeFill | `#a0d8ec` |
| grassStroke | `#4db88a` |
| sunFill | `#ffcb52` |
| revealTitle | 明亮天空一点点回来了 |
| badgeCopy | 你把天空里的云擦亮了，太阳和微风都在对你笑。 |
| celebrationLine | 云朵被你一点点擦走啦，晴空和微风都回来了。 |

## 7. DifficultyConfig 文案

| 难度 | shortLabel | readyText | helperText | successText |
|------|-----------|-----------|------------|-------------|
| 1 | 简单 · 薄云很快散开 | 把手指放上去，大范围擦几下，薄薄的云层马上就会散开。 | 这一关云层不会重新聚回来，只要放心做大动作，把天空慢慢擦亮就可以。 | 云层已经被你擦得轻轻散开了，蓝天马上就要露出来啦！ |
| 2 | 中等 · 停下云会回来 | 继续连着擦，别停太久哦，不然云层会慢慢又聚回来。 | 这次要保持连续的大动作，让云层没有机会重新盖住蓝天。 | 你一直没有放弃，云层已经被你越擦越开了！ |
| 3 | 困难 · 厚云要反复擦 3 次 | 这是一层厚厚的云。同一个地方要反复擦亮三次，蓝天才会真正露出来。 | 遇到厚云别着急，用整只手臂带着手指来回擦，把力量慢慢送出去。 | 厚云正在一层层散开，你把天空擦得越来越亮了！ |

### 其他文案

- instructionText（中央提示）：
  - 难度 3：`厚厚的云层，同一块要反复擦亮三次！`
  - 难度 2：`挥动手臂擦掉云层，别停太久哦！`
  - 难度 1：`挥动手臂，擦掉云层！`
- progressHint：
  - regenActive：`云层在回来，继续擦！`
  - <30%：`云层还很厚，继续用力擦...`
  - <60%：`越来越晴了...`
  - ≥60%：`快看到蓝天了！`

## 8. 注册表更新

`src/data/custom-game-registry.ts` 中 `F01_CLOUD_ERASE`：

```typescript
requiredPermissions: ['camera'],
degradable: true,
```

## 9. 不改的部分

以下完全复用 WipeSadness 代码，不做修改：

- HandCameraLayer 输入逻辑（onPrimaryPoint、onHands）
- 太阳动画（双层旋转光芒 + 笑眼 + 腮红 + 脉动光晕）
- 山丘湖泊 SVG（三层童话插画 + 波纹湖泊 + 小草小花）
- 网格系统（Float32Array 强度追踪、applyBrushToGrid、adjustCellStrength）
- 再生循环（stepRegen、startRegenLoop、stopRegenLoop）
- 五彩纸屑 + 金色光雨逻辑（CONFETTI_COLORS、GOLDEN_COLORS）
- CSS 布局（全屏沉浸、top-hud、bottom-hud、progress-track）
- sunCoreStyle 计算属性（庆祝时 scale 1.3）
