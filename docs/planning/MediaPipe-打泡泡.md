# 任务：用 MediaPipe Hands 实现「打泡泡」手势体感游戏

## 项目定位
适合 4–10 岁儿童的手眼协调训练游戏。  
运行环境：Electron，全屏 Canvas 渲染，接入 MediaPipe Hands 做手指追踪，鼠标/触屏作为降级操作方式。

---

## 一、整体架构

```
index.html
├── <canvas id="gameCanvas">        ← 所有游戏元素在此绘制
├── <video id="camFeed" hidden>     ← MediaPipe 摄像头源
├── <canvas id="handCanvas">        ← 手部骨架叠层（可切换显示）
└── <div id="ui">                   ← HUD（得分/模式/难度/倒计时）
```

**主循环** 使用 `requestAnimationFrame`，每帧按以下顺序执行：
1. 清空 Canvas → 绘制背景（天空渐变 + 漂移白云）
2. 更新并绘制所有泡泡
3. 更新并绘制粒子 / 爆破环
4. 读取 MediaPipe 当前帧手指坐标，执行碰撞检测
5. 更新 HUD

---

## 二、泡泡系统

### 2.1 颜色配置表
```js
const BUBBLE_COLORS = [
  { id: 'red',    hex: '#FF6B6B', name: '红色' },
  { id: 'yellow', hex: '#FFD93D', name: '黄色' },
  { id: 'green',  hex: '#6BCB77', name: '绿色' },
  { id: 'blue',   hex: '#4D96FF', name: '蓝色' },
  { id: 'pink',   hex: '#FF9FF3', name: '粉色' },
  { id: 'orange', hex: '#FFA552', name: '橙色' },
];
```

### 2.2 难度配置表
```js
const DIFFICULTY = {
  easy: {
    label: '🐣 简单',
    bubbleMinR: 38, bubbleMaxR: 58,   // 泡泡半径范围(px, 基准1920宽)
    maxCount: 8,                       // 同屏最多泡泡数
    riseSpeed: 0.35, riseVariance: 0.2,// 上升基础速度 + 随机浮动
    spawnInterval: 1500,               // 生成间隔(ms)
    colorCount: 3,                     // 使用前N种颜色
    rotationEnabled: false,            // 泡泡内图案不旋转
    splitOnPop: false,                 // 戳破不分裂
  },
  normal: {
    label: '🐥 普通',
    bubbleMinR: 28, bubbleMaxR: 46,
    maxCount: 12,
    riseSpeed: 0.6, riseVariance: 0.35,
    spawnInterval: 900,
    colorCount: 4,
    rotationEnabled: false,
    splitOnPop: false,
  },
  hard: {
    label: '🦅 困难',
    bubbleMinR: 20, bubbleMaxR: 36,
    maxCount: 18,
    riseSpeed: 0.9, riseVariance: 0.5,
    spawnInterval: 550,
    colorCount: 6,
    rotationEnabled: true,
    splitOnPop: true,   // 大泡泡戳破后分裂成2个小泡泡
  },
};
```

### 2.3 Bubble 类
```js
class Bubble {
  constructor(cfg) {
    this.r     = cfg.minR + Math.random() * (cfg.maxR - cfg.minR);
    this.x     = this.r + Math.random() * (W - this.r * 2);
    this.y     = H + this.r;                      // 从底部屏幕外生成
    this.vy    = -(cfg.riseSpeed + Math.random() * cfg.riseVariance);
    this.vx    = (Math.random() - 0.5) * 0.5;    // 轻微左右漂移
    this.wobble      = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 0.018 + Math.random() * 0.015;
    this.color = BUBBLE_COLORS[Math.floor(Math.random() * cfg.colorCount)];
    this.alpha = 0;          // 淡入
    this.popped = false;
    this.popProgress = 0;
  }

  update() {
    this.wobble += this.wobbleSpeed;
    this.x += this.vx + Math.sin(this.wobble) * 0.45;
    this.y += this.vy;
    if (this.alpha < 1) this.alpha = Math.min(1, this.alpha + 0.04);
    // 左右边界反弹
    if (this.x - this.r < 0)  { this.x = this.r;  this.vx = Math.abs(this.vx); }
    if (this.x + this.r > W)  { this.x = W - this.r; this.vx = -Math.abs(this.vx); }
  }

  draw(ctx) {
    if (this.popped) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;

    // 泡泡主体（半透明填充 + 描边）
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle   = this.color.hex + 'bb';   // 70%透明度
    ctx.strokeStyle = this.color.hex;
    ctx.lineWidth   = 2.5;
    ctx.fill();
    ctx.stroke();

    // 高光 1（大）
    ctx.beginPath();
    ctx.arc(this.x - this.r * 0.28, this.y - this.r * 0.3, this.r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fill();

    // 高光 2（小）
    ctx.beginPath();
    ctx.arc(this.x - this.r * 0.12, this.y - this.r * 0.12, this.r * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();

    ctx.restore();
  }

  isOffScreen() {
    return this.y + this.r < -20;
  }
}
```

---

## 三、游戏模式

### 模式 A：自由模式（🎯 随便戳）
- 屏幕上不断生成多色泡泡，戳任意泡泡得 `10 × combo` 分
- 连续戳中计连击（combo），2.5 秒内无操作 combo 归 1
- 60 秒倒计时，时间到显示结算界面

### 模式 B：颜色分类（🎨 戳对颜色）
- 顶部显示「目标色指示条」，告知当前需要戳哪种颜色
```
┌──────────────────────────────────┐
│   请戳 [●红色] 泡泡！            │   ← 目标色条，颜色圆点 + 文字
└──────────────────────────────────┘
```
- 戳对颜色：+10分 × combo，目标色随机切换到下一种
- 戳错颜色：-5分，combo 归 1，泡泡抖动后原地保留（不消失）
- 每完成 5 个目标切换一次颜色，颜色切换时有动画提示

### 模式 C（可选扩展）：双手抢分
- 左手控制蓝色泡泡，右手控制红色泡泡，互不干扰
- 各自独立得分，30 秒后比较谁分高
- 需同时追踪双手（MediaPipe max_num_hands: 2）

---

## 四、MediaPipe Hands 接入

```js
// 初始化
const hands = new Hands({
  locateFile: f => `mediapipe/hands/${f}`
});
hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.6,
});

// 每帧回调
hands.onResults(results => {
  if (!results.multiHandLandmarks) return;
  results.multiHandLandmarks.forEach((landmarks, hi) => {
    // 只取食指尖（8）和中指尖（12）做碰撞
    const tips = [8, 12].map(i => ({
      x: landmarks[i].x * W,   // 注意：MediaPipe 返回 0~1 归一化坐标，需乘以 Canvas 宽高
      y: landmarks[i].y * H,   // 摄像头默认镜像，需 x = W - x 做翻转
    }));
    tips.forEach(tip => checkPopCollision(tip.x, tip.y));

    // 可选：在 handCanvas 上绘制骨架（调试用，正式可隐藏）
    drawHandSkeleton(landmarks, hi);
  });
});

// 碰撞检测：逐帧对每根手指做一次检测，防止同一帧重复触发
const poppedThisFrame = new Set();
function checkPopCollision(fx, fy) {
  for (const bubble of bubbles) {
    if (bubble.popped || poppedThisFrame.has(bubble)) continue;
    const dist = Math.hypot(fx - bubble.x, fy - bubble.y);
    if (dist < bubble.r * 0.88) {   // 0.88 避免边缘误触
      poppedThisFrame.add(bubble);
      onBubblePopped(bubble);
      break;
    }
  }
}
// 在每帧开始时清空：poppedThisFrame.clear()
```

---

## 五、视觉反馈系统

### 5.1 泡泡爆破动画

```js
function onBubblePopped(bubble, isCorrect = true) {
  bubble.popped = true;

  const effectColor = isCorrect ? bubble.color.hex : '#aaaaaa';

  // ① 扩散爆破环（2~3 个，间隔 60ms）
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      popRings.push(new PopRing(bubble.x, bubble.y, bubble.r, effectColor));
    }, i * 55);
  }

  // ② 彩色粒子放射（24 个，360° 均匀散射）
  const count = 24;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
    const speed = 3 + Math.random() * 5;
    particles.push(new Particle(
      bubble.x, bubble.y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      effectColor
    ));
  }

  // ③ 分数浮字（+10 / -5 从爆破点向上飘走）
  floatTexts.push(new FloatText(
    bubble.x, bubble.y,
    isCorrect ? `+${10 * combo}` : '-5',
    isCorrect ? '#4CAF50' : '#FF5252'
  ));

  // ④ 困难模式：分裂
  if (DIFFICULTY[currentDiff].splitOnPop && isCorrect && bubble.r > 28) {
    for (let i = 0; i < 2; i++) {
      const small = new Bubble({ ...DIFFICULTY[currentDiff], minR: 14, maxR: 22 });
      small.x = bubble.x + (i === 0 ? -20 : 20);
      small.y = bubble.y;
      small.color = bubble.color;
      bubbles.push(small);
    }
  }

  // ⑤ 音效
  isCorrect ? playPopSound(bubble.r) : playWrongSound();

  // 更新分数和连击
  if (isCorrect) { score += 10 * combo; combo++; }
  else           { score = Math.max(0, score - 5); combo = 1; }
  updateHUD();
}
```

### 5.2 PopRing 类
```js
class PopRing {
  constructor(x, y, r, color) {
    this.x = x; this.y = y;
    this.r = r * 0.9;
    this.maxR = r * 2.5;
    this.color = color;
    this.life = 1;
  }
  update() { this.r += 4; this.life -= 0.07; }
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.life * 0.65;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}
```

### 5.3 浮动分数文字（FloatText 类）
```js
class FloatText {
  constructor(x, y, text, color) {
    this.x = x; this.y = y;
    this.text = text; this.color = color;
    this.vy = -2.5; this.life = 1;
  }
  update() { this.y += this.vy; this.life -= 0.025; }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.font = 'bold 26px Nunito, sans-serif';
    ctx.fillStyle = this.color;
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}
```

### 5.4 连击提示
连击数 ≥ 3 时在爆破点附近显示大字提示：

| combo | 文字 | 颜色 |
|---|---|---|
| 3 | x3 连击！ | #FF9800 |
| 5 | x5 超棒！ | #FF5722 |
| 8 | x8 无敌！ | #E91E63 |
| 10+ | 传说级！✨ | #9C27B0 |

提示文字使用 CSS 动画弹入 + 淡出，持续 800ms。

### 5.5 全部完成（颜色分类模式：戳够 20 个目标时）
- 背景闪白一帧（Canvas fillRect rgba(255,255,255,0.6)）
- 从屏幕四角连续 3 轮喷射粒子向中心汇聚
- 中央出现结算卡片，展示：总分 / 用时 / 最高连击 / 正确率

---

## 六、音效系统（Web Audio API，无需外部文件）

```js
function playPopSound(radius) {
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const o = ac.createOscillator(), g = ac.createGain();
  o.connect(g); g.connect(ac.destination);
  const freq = 900 - radius * 9;   // 泡泡越大音调越低
  o.frequency.setValueAtTime(freq, ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(freq * 1.8, ac.currentTime + 0.08);
  g.gain.setValueAtTime(0.28, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.22);
  o.start(); o.stop(ac.currentTime + 0.22);
}

function playWrongSound() {
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sawtooth'; o.connect(g); g.connect(ac.destination);
  o.frequency.setValueAtTime(220, ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(130, ac.currentTime + 0.15);
  g.gain.setValueAtTime(0.18, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);
  o.start(); o.stop(ac.currentTime + 0.18);
}

function playComboSound(comboLevel) {
  // combo 越高音调越高，给孩子正反馈
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const o = ac.createOscillator(), g = ac.createGain();
  o.connect(g); g.connect(ac.destination);
  o.frequency.value = 440 + comboLevel * 80;
  g.gain.setValueAtTime(0.22, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
  o.start(); o.stop(ac.currentTime + 0.3);
}
```

---

## 七、HUD 布局

```
┌─────────────────────────────────────────────────────────────┐
│ [返回准备页]   [🎯自由] [🎨分类] [👐双手]   [🐣简单][🐥普通][🦅困难] │
├─────────────────────────────────────────────────────────────┤
│         [目标色条：请戳 ●红色 泡泡！]  ← 仅颜色分类模式显示   │
│                                                             │
│    ← ← ← ← ← 游戏 Canvas（泡泡在此飘浮）← ← ← ← ←         │
│                                                             │
│                    ⏱ 剩余 42 秒                              │
└─────────────────────────────────────────────────────────────┘
         得分：320  🔥 ×5 连击            ← 右下角固定显示
```

---

## 八、背景渲染

每帧绘制天空渐变 + 漂移白云（不使用图片，全 Canvas 绘制）：

```js
function drawBackground(t) {
  // 天空渐变
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#87CEEB');
  grad.addColorStop(1, '#E0F4FF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 3 朵随帧数缓慢向右漂移的云
  const clouds = [
    { ox: 0.1, oy: 0.1, s: 55 },
    { ox: 0.45, oy: 0.07, s: 42 },
    { ox: 0.75, oy: 0.15, s: 60 },
  ];
  ctx.globalAlpha = 0.5;
  clouds.forEach(cl => {
    const cx = ((cl.ox * W + t * 0.012) % (W + 200)) - 100;
    const cy = cl.y || cl.oy * H;
    drawCloud(cx, cy, cl.s);
  });
  ctx.globalAlpha = 1;
}

function drawCloud(cx, cy, s) {
  ctx.beginPath();
  ctx.arc(cx, cy, s, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.9, cy - s * 0.3, s * 0.75, 0, Math.PI * 2);
  ctx.arc(cx + s * 1.8, cy, s * 0.85, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
}
```

---

## 九、不需要修改的部分

- Electron 主进程 / IPC 通信
- 返回准备页路由
- MediaPipe 模型文件加载路径

---

## 十、交付检查项

- [ ] 三种颜色的泡泡正确渲染（圆形 + 高光 + 半透明边框）
- [ ] 三档难度：泡泡大小 / 速度 / 数量 / 颜色数量均有差异
- [ ] 困难模式：大泡泡被戳破后分裂为 2 个小泡泡
- [ ] 自由模式：任意戳，60 秒限时
- [ ] 颜色分类模式：顶部目标色条，戳错有惩罚
- [ ] 爆破时：扩散环 + 彩色粒子 + 浮动得分文字 + 音效
- [ ] 连击 ≥ 3 显示连击文字提示，combo 2.5 秒无操作归 1
- [ ] MediaPipe 食指/中指尖坐标做碰撞检测，同帧去重
- [ ] 鼠标点击作为降级操作（摄像头未启用时可用）
- [ ] 背景：天空渐变 + 漂移白云，无需图片素材