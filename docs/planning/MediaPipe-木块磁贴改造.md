# 任务：重构木块磁贴游戏

## 背景
现有游戏用文字（"圆"、"方"、"三角"）代替真实形状显示，视觉反馈薄弱，没有难度分级。
需要在不替换 MediaPipe Hands 手势追踪逻辑的前提下，重构渲染层和游戏系统。

---

## 1. 用真实 SVG 形状替换文字标签

定义一个形状配置表 `SHAPES`，每个形状包含：
- `id`：唯一标识（如 `"circle"`）
- `label`：中文名（如 `"圆形"`）
- `color`：填充色（如 `"#E8680A"`）
- `svgPath`：用于在画布上绘制的 SVG `<path>` 或基本图形标签字符串

必须实现的形状（至少 6 种）：

| id | label | SVG 绘制方式 |
|---|---|---|
| circle | 圆形 | `<circle cx="50" cy="50" r="42"/>` |
| square | 方形 | `<rect x="8" y="8" width="84" height="84" rx="8"/>` |
| triangle | 三角形 | `<polygon points="50,6 94,94 6,94"/>` |
| star | 星形 | `<polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35"/>` |
| heart | 心形 | `<path d="M50,80 C10,55 10,20 50,38 C90,20 90,55 50,80Z"/>` |
| diamond | 菱形 | `<polygon points="50,5 95,50 50,95 5,50"/>` |

**拼图块（piece）渲染**：
```js
function createPieceSVG(shape) {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    ${shape.svgPath.replace('FILL', 'rgba(255,255,255,0.92)')}
  </svg>`;
}
```

**目标槽（slot）轮廓**：使用相同 SVG 路径，但改为 `fill="none"`，`stroke="#bba880"`，`stroke-dasharray="6 4"`，`stroke-width="3"`。

---

## 2. 难度系统

在 `DIFFICULTY` 配置表中定义三档：

```js
const DIFFICULTY = {
  low: {
    label: '🐣 简单',
    shapeCount: 3,        // 只用 3 种形状
    piecesRotated: false, // 木块不旋转
    slotSize: 140,        // 目标槽较大（px）
    pieceSize: 110,
    snapDistance: 80,     // 吸附判定范围（px）
    timeLimit: 0,         // 无时间限制
    maxTries: 99,
  },
  mid: {
    label: '🐥 普通',
    shapeCount: 4,
    piecesRotated: false,
    slotSize: 120,
    pieceSize: 100,
    snapDistance: 55,
    timeLimit: 60,        // 60 秒限时
    maxTries: 6,
  },
  high: {
    label: '🦅 困难',
    shapeCount: 6,
    piecesRotated: true,  // 木块随机旋转 0~270°
    slotSize: 100,
    pieceSize: 90,
    snapDistance: 35,
    timeLimit: 40,
    maxTries: 4,
  },
};
```

**难度切换按钮**位于顶部栏，切换时调用 `initGame(difficulty)` 重新生成关卡。

---

## 3. 匹配成功的视觉反馈（重点）

当木块拖入正确目标槽时，**按顺序触发以下效果**：

### ① 吸附动画（snap）
```js
// 木块飞向目标槽中心
piece.style.transition = 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
piece.style.left = slot.centerX + 'px';
piece.style.top  = slot.centerY + 'px';
```

### ② 目标槽弹跳
```css
@keyframes slotBounce {
  0%   { transform: scale(1); }
  35%  { transform: scale(1.22); }
  65%  { transform: scale(0.93); }
  100% { transform: scale(1); }
}
```
槽边框变为实线绿色：`border: 3px solid #4CAF50`。

### ③ 彩色粒子爆炸
```js
function spawnParticles(x, y, count = 24) {
  const colors = ['#FFD700','#FF6B6B','#4CAF50','#42A5F5','#AB47BC','#FF9800'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    const angle = (360 / count) * i;
    const dist  = 60 + Math.random() * 60;
    p.className = 'particle';
    p.style.cssText = `
      width: ${6 + Math.random()*8}px;
      height: ${6 + Math.random()*8}px;
      background: ${colors[i % colors.length]};
      border-radius: 50%;
      position: absolute;
      left: ${x}px; top: ${y}px;
      animation: particleFly 0.8s ease forwards;
      --dx: ${Math.cos(angle * Math.PI/180) * dist}px;
      --dy: ${Math.sin(angle * Math.PI/180) * dist}px;
    `;
    gameContainer.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}
```
```css
@keyframes particleFly {
  to { transform: translate(var(--dx), var(--dy)); opacity: 0; }
}
```

### ④ ✅ 图标出现 + 音效
- 在目标槽中心叠加一个 `✅` 图标，播放短促的成功音：
```js
function playSuccessBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(520, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.start(); osc.stop(ctx.currentTime + 0.25);
}
```

### ⑤ 全部完成时：全屏庆祝
所有形状匹配完成时触发：
- 屏幕背景短暂闪亮（`rgba(255,255,200,0.4)` 叠层 flash）
- 连续 3 波粒子从底部扫过整个屏幕
- 中央显示大号文字动画：`"🎉 太棒了！"` + 当前用时/尝试次数
- 2 秒后显示"再玩一次"按钮

---

## 4. 匹配失败反馈

木块拖到错误目标槽时：
- 木块抖动：`animation: shake 0.35s ease`
```css
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20%      { transform: translateX(-8px) rotate(-3deg); }
  60%      { transform: translateX(8px) rotate(3deg); }
}
```
- 播放低频短音（频率 220Hz，时长 0.15s）
- 尝试次数 +1，若超过 `maxTries`，木块归位并高亮正确目标槽 3 秒

---

## 5. 布局要求

```
┌─────────────────────────────────────┐
│ [返回准备页]  [简单][普通][困难]  [得分]│  ← topbar
├─────────────────────────────────────┤
│                                     │
│   [槽1]    [槽2]    [槽3]    [槽4]   │  ← 目标槽区（上半部）
│                                     │
├─────────────────────────────────────┤
│                                     │
│  [块1] [块2] [块3] [块4] [块5] [块6] │  ← 可拖动木块（下半部）
│                                     │
│     把手放到摄像头前，或拖动操作       │  ← hint
└─────────────────────────────────────┘
```

- 背景保留现有木纹条纹风格
- 目标槽和木块之间留出足够空间（供手势悬停操作）
- 已完成的木块变半透明并禁止再次拖动

---

## 6. 保留不动的部分

- MediaPipe Hands 初始化和手势追踪逻辑
- 手指坐标 → 游戏坐标的映射函数
- 返回准备页的路由逻辑
- Electron IPC 通信（如有）

---

## 7. 交付检查项

- [ ] 6 种形状均有正确 SVG 渲染
- [ ] 三档难度可切换，shapeCount/snapDistance 生效
- [ ] 成功匹配触发：吸附 + 弹跳 + 粒子 + 音效 + ✅
- [ ] 失败匹配触发：抖动 + 低音
- [ ] 全部完成触发：全屏庆祝动画
- [ ] 困难模式木块有随机旋转
- [ ] 普通/困难模式有倒计时显示