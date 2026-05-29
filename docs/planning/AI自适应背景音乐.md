# 新增功能：程序化背景音乐（Tone.js + 游戏状态自适应）

## 目标
不依赖任何外部音频文件，使用 Tone.js 在浏览器内实时合成背景音乐，
并根据当前游戏模式、难度和连击状态自动切换音乐风格。

---

## 一、安装 Tone.js

Electron 环境下通过 npm 引入：
```bash
npm install tone
```
在游戏页面顶部引入：
```js
import * as Tone from 'tone';
```

---

## 二、音乐状态机

定义 4 种音乐状态，游戏运行时自动切换：

| 状态 key | 触发条件 | 风格描述 |
|---|---|---|
| `idle` | 进入游戏但未开始 | 轻柔、慢速、空灵 |
| `playing` | 正常游玩中 | 欢快、中速、儿歌感 |
| `combo` | 连击 ≥ 5 | 加速、明亮、紧张感 |
| `finish` | 完成所有目标 | 欢庆、上行旋律 |

---

## 三、音乐引擎实现

新建文件 `src/music/MusicEngine.js`：

```js
import * as Tone from 'tone';

// ── 音阶定义（C 大调五声音阶，适合儿童）──
const PENTATONIC = ['C4','D4','E4','G4','A4','C5','D5','E5','G5','A5'];

// ── 各状态的音乐参数 ──
const MUSIC_THEMES = {
  idle: {
    bpm: 72,
    melody: ['C4','E4','G4','E4','C4','G3','A3','C4'],
    noteLen: '4n',
    bassNotes: ['C3','G3'],
    bassLen: '2n',
    synthType: 'triangle',
    reverbWet: 0.55,
    delayWet: 0.3,
    volume: -18,
  },
  playing: {
    bpm: 108,
    melody: ['C4','D4','E4','G4','A4','G4','E4','C4',
             'D4','E4','G4','A4','C5','A4','G4','E4'],
    noteLen: '8n',
    bassNotes: ['C3','C3','G3','G3','A2','A2','F3','G3'],
    bassLen: '4n',
    synthType: 'sine',
    reverbWet: 0.25,
    delayWet: 0.1,
    volume: -14,
  },
  combo: {
    bpm: 138,
    melody: ['E4','G4','A4','C5','D5','C5','A4','G4',
             'C5','D5','E5','D5','C5','A4','G4','E4'],
    noteLen: '16n',
    bassNotes: ['C3','G3','A3','F3'],
    bassLen: '8n',
    synthType: 'sawtooth',
    reverbWet: 0.1,
    delayWet: 0.15,
    volume: -10,
  },
  finish: {
    bpm: 120,
    melody: ['C4','E4','G4','C5','E5','G5','C6'],
    noteLen: '8n',
    bassNotes: ['C3','E3','G3','C4'],
    bassLen: '4n',
    synthType: 'sine',
    reverbWet: 0.4,
    delayWet: 0.0,
    volume: -12,
    playOnce: true,   // 完成音只播一次，不循环
  },
};

export class MusicEngine {
  constructor() {
    this.currentState = null;
    this.melodySynth  = null;
    this.bassSynth    = null;
    this.reverb       = null;
    this.delay        = null;
    this.melodyPart   = null;
    this.bassPart     = null;
    this.initialized  = false;
  }

  // 必须在用户首次交互后调用（浏览器 AudioContext 策略）
  async init() {
    if (this.initialized) return;
    await Tone.start();

    this.reverb = new Tone.Reverb({ decay: 2.5, wet: 0.3 }).toDestination();
    this.delay  = new Tone.FeedbackDelay('8n', 0.25).connect(this.reverb);

    this.melodySynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.4, release: 0.5 },
    }).connect(this.delay);

    this.bassSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.8 },
      volume: -8,
    }).connect(this.reverb);

    this.initialized = true;
  }

  // 切换音乐状态，带淡入淡出
  async setState(newState) {
    if (!this.initialized) await this.init();
    if (newState === this.currentState) return;

    await this._stop();
    this.currentState = newState;
    const theme = MUSIC_THEMES[newState];
    if (!theme) return;

    // 更新合成器参数
    Tone.getTransport().bpm.rampTo(theme.bpm, 0.8);
    this.melodySynth.oscillator.type = theme.synthType;
    this.melodySynth.volume.rampTo(theme.volume, 0.5);
    this.reverb.wet.rampTo(theme.reverbWet, 0.5);
    this.delay.wet.rampTo(theme.delayWet, 0.5);

    // 构建旋律序列
    this._buildParts(theme);

    Tone.getTransport().start();
  }

  _buildParts(theme) {
    const melodySeq = theme.melody.map((note, i) => ({
      time: `${i}*${theme.noteLen}`,
      note,
    }));
    this.melodyPart = new Tone.Part((time, { note }) => {
      this.melodySynth.triggerAttackRelease(note, theme.noteLen, time);
    }, melodySeq);
    this.melodyPart.loop = !theme.playOnce;
    this.melodyPart.loopEnd = `${theme.melody.length}*${theme.noteLen}`;
    this.melodyPart.start(0);

    const bassSeq = theme.bassNotes.map((note, i) => ({
      time: `${i}*${theme.bassLen}`,
      note,
    }));
    this.bassPart = new Tone.Part((time, { note }) => {
      this.bassSynth.triggerAttackRelease(note, theme.bassLen, time);
    }, bassSeq);
    this.bassPart.loop = !theme.playOnce;
    this.bassPart.loopEnd = `${theme.bassNotes.length}*${theme.bassLen}`;
    this.bassPart.start(0);
  }

  async _stop() {
    if (this.melodyPart) { this.melodyPart.stop(); this.melodyPart.dispose(); }
    if (this.bassPart)   { this.bassPart.stop();   this.bassPart.dispose();   }
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    await new Promise(r => setTimeout(r, 100));
  }

  // 音量控制（0~1）
  setVolume(v) {
    const db = v <= 0 ? -Infinity : 20 * Math.log10(v) - 6;
    this.melodySynth?.volume.rampTo(db, 0.3);
  }

  dispose() {
    this._stop();
    this.melodySynth?.dispose();
    this.bassSynth?.dispose();
    this.reverb?.dispose();
    this.delay?.dispose();
  }
}
```

---

## 四、在游戏主文件中接入

```js
import { MusicEngine } from './music/MusicEngine.js';

const music = new MusicEngine();

// 游戏开始时（首次用户点击触发 AudioContext）
canvas.addEventListener('click', async () => {
  if (!music.initialized) {
    await music.init();
    music.setState('playing');
  }
}, { once: true });

// 连击变化时
function onComboChange(combo) {
  if (combo >= 5) music.setState('combo');
  else if (combo <= 1) music.setState('playing');
}

// combo 回落时（2.5s 无操作后触发）
function onComboReset() {
  music.setState('playing');
}

// 关卡完成时
function onLevelComplete() {
  music.setState('finish');
}

// 返回准备页时
function onExit() {
  music.dispose();
}
```

---

## 五、音量控制 UI（可选）

在 HUD 右下角添加一个小喇叭图标，点击切换静音：

```html
<button id="muteBtn" title="切换音乐">🔊</button>
```

```js
let muted = false;
document.getElementById('muteBtn').addEventListener('click', () => {
  muted = !muted;
  music.setVolume(muted ? 0 : 1);
  document.getElementById('muteBtn').textContent = muted ? '🔇' : '🔊';
});
```

---

## 六、各游戏的音乐适配建议

| 游戏 | idle | playing | combo | finish |
|---|---|---|---|---|
| 打泡泡 | 空灵轻柔 | 欢快跳跃 | 加速紧张 | 欢庆上行 |
| 空气木琴 | 静默 | 随按键音叠加旋律 | 自动和弦填充 | 完整曲尾 |
| 形状拼图 | 轻柔钢琴 | 温暖弦乐感 | 鼓点加入 | 胜利小号感 |

空气木琴的特殊处理：游戏本身就是音乐，背景音乐应设为静默或仅保留极轻的和弦伴奏垫底，避免干扰按键音效。

---

## 七、交付检查项

- [ ] Tone.js 正常安装并引入
- [ ] 首次点击后背景音乐自动启动（符合浏览器 AudioContext 策略）
- [ ] 四种状态切换时有 0.8s 渐变过渡，不突兀
- [ ] combo ≥ 5 触发加速音乐，回落后恢复正常
- [ ] 关卡完成播放欢庆音乐，不循环
- [ ] 🔊/🔇 静音按钮可用
- [ ] 退出游戏时调用 `music.dispose()` 释放 AudioContext