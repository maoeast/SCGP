# 设计规格 · 擦亮坏心情视觉升级

> 日期：2026-05-27
> 状态：已批准

---

## 一、设计决策

| 维度 | 选择 |
|------|------|
| 太阳动画 | B · 活力光芒：双层反向旋转（三角+矩形交替）+ 核心暖色脉动 + 弯弯笑眼 + 腮红 |
| 山丘湖泊 | 童话插画：3-4 层圆润山丘叠加 + 小草小花点缀 + 湖泊 SVG 波纹动画 + 远中近景纵深感 |
| 擦拭反馈 | 冰晶飞溅粒子：擦拭时菱形冰晶碎片向四周飞散，带重力和透明度衰减 |
| 庆祝动画 | 爆裂式：冰霜爆碎 + 五彩纸屑 + 金色光雨 + 太阳放大光芒爆发 |

---

## 二、太阳动画实现

### 2.1 SVG 结构

保留现有 SVG viewBox `"0 0 220 220"`，改造内容：

- **光芒层 A**：4 个三角尖（`<polygon>`），12 秒正向旋转
- **光芒层 B**：4 个圆角矩形，18 秒反向旋转，偏移 22.5°
- **核心**：径向渐变（`#fff6bf → #ffcb52 → #ffb703`），box-shadow 脉动 3s 周期
- **外圈光晕**：`radial-gradient`，1.8s 脉动呼吸
- **表情**：弯弯笑眼（弧形 border-bottom）+ 微笑弧线 + 腮红椭圆

### 2.2 动画

```css
.sun-rays-primary { animation: spin 12s linear infinite; }
.sun-rays-secondary { animation: spin 18s linear infinite reverse; }
.sun-glow { animation: sun-pulse 1.8s ease-in-out infinite; }
.sun-core { animation: sun-warm 3s ease-in-out infinite; }
```

### 2.3 进度联动

- `clearedRatio` 0→1 时太阳 `scale` 从 0.9 → 1.14
- 庆祝态 `scale` 1.16 + 光晕扩散增强

---

## 三、山丘湖泊

### 3.1 SVG 结构

新 SVG viewBox `"0 0 900 260"`，`preserveAspectRatio="xMidYMax slice"`，容器 `height: 50%` 铺满底部：

- **远山**：淡绿 `#a8e6cf`，opacity 0.6，Q 曲线柔和起伏
- **中山**：翠绿 `#7dcfb6`，opacity 0.75
- **湖泊**：`#87ceeb`，opacity 0.7，SVG `<animate>` 波纹 4s 周期
- **近山**：深绿 `#56c596`，不透明
- **小草**：多组 Q 曲线线条，`#3da87a`，随机分布在近山表面
- **小花**：彩色圆点（粉/黄/紫/薄荷），散布在近山

### 3.2 主题适配

两个主题（`sunny-valley` / `breeze-lake`）各自调整色板：

| 层 | sunny-valley | breeze-lake |
|----|-------------|-------------|
| 远山 | `#a8e6cf` | `#b5e8d5` |
| 中山 | `#7dcfb6` | `#8cd8c0` |
| 湖泊 | `#87ceeb` | `#a0d8ec` |
| 近山 | `#56c596` | `#6ad4a8` |
| 草 | `#3da87a` | `#4db88a` |

---

## 四、冰晶飞溅粒子

### 4.1 粒子画布

新增 `particleCanvas`（全屏 Canvas，z-index 6，pointer-events: none），与 frostCanvas 同级。

### 4.2 粒子系统

```typescript
interface IceParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  maxLife: number
  rotation: number
  spin: number
}
```

**生成规则**：每次 `paintInterpolatedStroke` 中，沿擦拭路径每 `spacing` 间距生成 3-5 个粒子。

**物理**：
- 初始速度：`(Math.random() - 0.5) * 5, -(Math.random() * 4 + 1)`
- 重力：`vy += 0.08`
- 生命衰减：`life -= 0.02 / maxLife`

**渲染**：菱形冰晶（4 点路径），`globalAlpha = life`，两种色调交替（`rgba(200,230,255,0.9)` / `rgba(240,248,255,0.9)`）。

### 4.3 动画循环

复用现有的 `requestAnimationFrame` 模式，在 frost 渲染帧中同时更新和绘制粒子。粒子池 `maxPoolSize = 200`，超出时不再生成。

---

## 五、庆祝动画升级

### 5.1 冰霜爆碎

到达目标比例时，先执行一次冰霜"爆碎"效果：

- frostCanvas 的 `globalAlpha` 快速从 1 降至 0（0.3s）
- 同时从屏幕中心向外生成 60 个大冰晶碎片，高速飞散

### 5.2 五彩纸屑 + 金色光雨

现有 92 个五彩纸屑保留，额外添加 40 个金色光雨粒子：

- 金色光雨：更小（3-5px），从顶部缓缓飘落，`vy` 为正（向下），`life` 衰减更慢
- 颜色：`#ffd166`、`#fff275`、`#ffe4a0` 交替

### 5.3 太阳爆发

庆祝开始时太阳 `scale` 瞬间 1.16 → 1.3（0.2s ease-out），光晕扩散半径翻倍，然后缓回 1.16。

---

## 六、实施范围

### 改动文件

仅修改 `src/components/emotional/games/WipeSadnessGame.vue`。

### 不改动

- 核心网格/侵蚀/重生算法
- 难度配置（DIFFICULTY_CONFIGS）
- 完成判定和 emit 逻辑
- 训练记录落库格式
- HandCameraLayer / useHandLandmarker
- 注册表条目（已在上一轮改完）

### 模板新增

- `particleCanvas`（冰晶粒子画布）

### 模板替换

- 太阳 SVG → 双层旋转光芒 + 弯弯笑眼
- 山丘 SVG → 童话插画多层 + 小草小花 + 湖泊波纹

### 脚本新增

- `IceParticle` 类型和粒子池
- 粒子生成、更新、渲染函数
- 庆祝爆碎逻辑

### 样式新增

- 太阳旋转/脉动 keyframes
- 山丘容器高度改为 50%
- 粒子画布定位
