<template>
  <section
    class="sensory-shell"
    :class="{
      'sensory-shell--audio-diff': theme === 'audio-diff',
      'sensory-shell--audio-command': theme === 'audio-command',
      'sensory-shell--rhythm': theme === 'rhythm',
      'sensory-shell--color-match': theme === 'color-match',
      'sensory-shell--shape-match': theme === 'shape-match',
      'sensory-shell--bubble-pop': theme === 'bubble-pop',
    }"
  >
    <div class="sensory-shell__backdrop" aria-hidden="true">
      <div class="sensory-shell__orb sensory-shell__orb--amber"></div>
      <div class="sensory-shell__orb sensory-shell__orb--sky"></div>
      <div class="sensory-shell__grid"></div>
      <template v-if="theme === 'rhythm'">
        <span class="sensory-shell__note sensory-shell__note--one">♪</span>
        <span class="sensory-shell__note sensory-shell__note--two">♫</span>
        <span class="sensory-shell__note sensory-shell__note--three">♩</span>
        <span class="sensory-shell__bubble sensory-shell__bubble--one"></span>
        <span class="sensory-shell__bubble sensory-shell__bubble--two"></span>
        <span class="sensory-shell__bubble sensory-shell__bubble--three"></span>
      </template>
      <template v-else-if="theme === 'color-match'">
        <span class="sensory-shell__cloud sensory-shell__cloud--one"></span>
        <span class="sensory-shell__cloud sensory-shell__cloud--two"></span>
        <span class="sensory-shell__cloud sensory-shell__cloud--three"></span>
        <span class="sensory-shell__glimmer sensory-shell__glimmer--one"></span>
        <span class="sensory-shell__glimmer sensory-shell__glimmer--two"></span>
        <span class="sensory-shell__glimmer sensory-shell__glimmer--three"></span>
      </template>
      <template v-else-if="theme === 'shape-match' || theme === 'audio-command'">
        <span class="sensory-shell__wood-knot sensory-shell__wood-knot--one"></span>
        <span class="sensory-shell__wood-knot sensory-shell__wood-knot--two"></span>
        <span class="sensory-shell__wood-streak sensory-shell__wood-streak--one"></span>
        <span class="sensory-shell__wood-streak sensory-shell__wood-streak--two"></span>
      </template>
    </div>

    <header v-if="theme !== 'bubble-pop'" class="sensory-shell__toolbar">
      <div class="sensory-shell__actions">
      <button class="sensory-shell__back-button" type="button" @click="emit('back')">
        返回准备页
      </button>

        <!-- 背景音乐设置 -->
        <GameMusicSettingsMenu
          :music-available="musicAvailable"
          :music-enabled="musicEnabled"
          :music-volume="musicVolume"
          :effects-enabled="effectsEnabled"
          :tone="theme === 'default' || theme === 'rhythm' || theme === 'color-match' ? 'light' : 'dark'"
          @change="emit('updateAudioSettings', $event)"
        />
      </div>

      <div class="sensory-shell__title-group">
        <span class="sensory-shell__eyebrow">{{ entryLabel }}</span>
        <h1>{{ title }}</h1>
        <p>{{ summary }}</p>
      </div>

      <div class="sensory-shell__meta">
        <div class="sensory-shell__meta-card">
          <span>学生</span>
          <strong>{{ studentName || '未命名学生' }}</strong>
        </div>

        <div class="sensory-shell__meta-card">
          <span>模式</span>
          <strong>{{ modeLabel }}</strong>
        </div>

        <div v-if="durationLabel" class="sensory-shell__meta-card">
          <span>建议时长</span>
          <strong>{{ durationLabel }}</strong>
        </div>
      </div>
    </header>

    <main class="sensory-shell__stage">
      <slot />
    </main>
  </section>
</template>

<script setup lang="ts">
import type { SharedGameAudioSettings } from '@/audio/game-audio-settings'
import GameMusicSettingsMenu from '@/components/games/GameMusicSettingsMenu.vue'

const props = withDefaults(defineProps<{
  title: string
  summary?: string
  studentName?: string
  entryLabel?: string
  modeLabel: string
  durationLabel?: string
  musicAvailable?: boolean
  musicEnabled: boolean
  musicVolume: number
  effectsEnabled: boolean
  theme?: 'default' | 'audio-diff' | 'audio-command' | 'rhythm' | 'color-match' | 'shape-match' | 'bubble-pop'
}>(), {
  summary: '请使用手指直接操作训练内容，系统会自动记录本次训练结果。',
  studentName: '',
  entryLabel: '感官统合训练',
  durationLabel: '',
  musicAvailable: true,
  theme: 'default',
})

const emit = defineEmits<{
  back: []
  updateAudioSettings: [settings: SharedGameAudioSettings]
}>()

void props
</script>

<style scoped>
.sensory-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: 24px;
  overflow: hidden;
  color: #0f172a;
  background:
    radial-gradient(circle at top left, rgba(255, 211, 135, 0.42), transparent 32%),
    radial-gradient(circle at bottom right, rgba(56, 189, 248, 0.24), transparent 30%),
    linear-gradient(180deg, #f8fbff 0%, #eef6ff 48%, #f5fbf6 100%);
}

.sensory-shell__backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.sensory-shell__orb {
  position: absolute;
  width: 380px;
  height: 380px;
  border-radius: 999px;
  filter: blur(32px);
  opacity: 0.42;
}

.sensory-shell__orb--amber {
  top: -120px;
  left: -80px;
  background: rgba(251, 191, 36, 0.8);
}

.sensory-shell__orb--sky {
  right: -100px;
  bottom: -120px;
  background: rgba(56, 189, 248, 0.72);
}

.sensory-shell__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.6), transparent 88%);
}

.sensory-shell__note,
.sensory-shell__bubble,
.sensory-shell__cloud,
.sensory-shell__glimmer,
.sensory-shell__wood-knot,
.sensory-shell__wood-streak {
  position: absolute;
  pointer-events: none;
}

.sensory-shell__note {
  font-size: clamp(2rem, 2.8vw, 3.4rem);
  font-weight: 700;
  color: rgba(122, 92, 170, 0.2);
  text-shadow: 0 10px 18px rgba(255, 255, 255, 0.28);
}

.sensory-shell__note--one {
  top: 12%;
  left: 14%;
  transform: rotate(-14deg);
}

.sensory-shell__note--two {
  right: 11%;
  top: 24%;
  transform: rotate(12deg);
}

.sensory-shell__note--three {
  left: 56%;
  bottom: 16%;
  transform: rotate(-10deg);
}

.sensory-shell__bubble {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.48);
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.12));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.sensory-shell__bubble--one {
  width: 44px;
  height: 44px;
  top: 18%;
  right: 24%;
}

.sensory-shell__bubble--two {
  width: 28px;
  height: 28px;
  bottom: 20%;
  left: 12%;
}

.sensory-shell__bubble--three {
  width: 64px;
  height: 64px;
  top: 54%;
  right: 8%;
}

.sensory-shell__cloud {
  width: 172px;
  height: 54px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  filter: drop-shadow(0 16px 24px rgba(148, 188, 255, 0.18));
}

.sensory-shell__cloud::before,
.sensory-shell__cloud::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: inherit;
}

.sensory-shell__cloud::before {
  width: 66px;
  height: 66px;
  left: 20px;
  top: -26px;
}

.sensory-shell__cloud::after {
  width: 84px;
  height: 84px;
  right: 16px;
  top: -40px;
}

.sensory-shell__cloud--one {
  top: 10%;
  left: 4%;
  opacity: 0.66;
}

.sensory-shell__cloud--two {
  top: 18%;
  right: 8%;
  width: 210px;
  opacity: 0.54;
}

.sensory-shell__cloud--three {
  bottom: 14%;
  left: 10%;
  width: 188px;
  opacity: 0.46;
}

.sensory-shell__glimmer {
  border-radius: 999px;
  filter: blur(4px);
}

.sensory-shell__glimmer--one {
  top: 14%;
  right: 24%;
  width: 148px;
  height: 148px;
  background: radial-gradient(circle, rgba(255, 203, 222, 0.48) 0%, rgba(255, 203, 222, 0) 72%);
}

.sensory-shell__glimmer--two {
  bottom: 12%;
  left: 18%;
  width: 168px;
  height: 168px;
  background: radial-gradient(circle, rgba(255, 237, 166, 0.42) 0%, rgba(255, 237, 166, 0) 74%);
}

.sensory-shell__glimmer--three {
  right: 6%;
  bottom: 18%;
  width: 188px;
  height: 188px;
  background: radial-gradient(circle, rgba(150, 218, 255, 0.34) 0%, rgba(150, 218, 255, 0) 74%);
}

.sensory-shell__wood-knot {
  border-radius: 50%;
  background:
    radial-gradient(circle at 38% 38%, rgba(132, 78, 38, 0.24) 0%, rgba(132, 78, 38, 0.08) 28%, rgba(84, 50, 24, 0.22) 54%, rgba(84, 50, 24, 0) 72%);
  mix-blend-mode: multiply;
}

.sensory-shell__wood-knot--one {
  top: 22%;
  left: 16%;
  width: 144px;
  height: 144px;
}

.sensory-shell__wood-knot--two {
  right: 12%;
  bottom: 16%;
  width: 120px;
  height: 120px;
}

.sensory-shell__wood-streak {
  height: 18px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(119, 69, 31, 0.1), rgba(255, 255, 255, 0));
  opacity: 0.48;
  transform: rotate(-8deg);
}

.sensory-shell__wood-streak--one {
  top: 18%;
  right: 10%;
  width: 280px;
}

.sensory-shell__wood-streak--two {
  bottom: 22%;
  left: 14%;
  width: 240px;
}

.sensory-shell__toolbar {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 18px;
  align-items: stretch;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(18px);
}

.sensory-shell__actions {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.sensory-shell__back-button {
  align-self: start;
  min-height: 58px;
  padding: 0 24px;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-weight: 700;
  color: #0f172a;
  background: linear-gradient(135deg, #fde68a 0%, #f59e0b 100%);
  box-shadow: 0 16px 34px rgba(245, 158, 11, 0.24);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.sensory-shell__back-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 20px 40px rgba(245, 158, 11, 0.3);
}

.sensory-shell__title-group {
  min-width: 0;
}

.sensory-shell__eyebrow {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #1d4ed8;
  background: rgba(191, 219, 254, 0.78);
}

.sensory-shell__title-group h1 {
  margin: 10px 0 8px;
  font-size: clamp(2rem, 2.6vw, 2.85rem);
  line-height: 1.04;
}

.sensory-shell__title-group p {
  max-width: 760px;
  margin: 0;
  color: #475569;
  line-height: 1.7;
}

.sensory-shell__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 1fr));
  gap: 12px;
}

.sensory-shell__meta-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-height: 92px;
  padding: 16px 18px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(241, 245, 249, 0.96));
  border: 1px solid rgba(226, 232, 240, 0.92);
}

.sensory-shell__meta-card span {
  color: #64748b;
  font-size: 0.84rem;
}

.sensory-shell__meta-card strong {
  font-size: 1.06rem;
  line-height: 1.4;
}

.sensory-shell__stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  min-height: 0;
  margin-top: 18px;
  padding: 20px;
  overflow: auto;
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.7)),
    linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(219, 234, 254, 0.4));
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(16px);
}

.sensory-shell--audio-diff {
  height: 100%;
  padding: 18px;
  color: #f8e9cf;
  background:
    radial-gradient(circle at 12% 10%, rgba(255, 206, 120, 0.2), transparent 18%),
    radial-gradient(circle at 88% 14%, rgba(177, 115, 255, 0.18), transparent 20%),
    linear-gradient(180deg, #352621 0%, #191110 52%, #090707 100%);
}

.sensory-shell--audio-diff .sensory-shell__orb {
  filter: blur(70px);
  opacity: 0.34;
}

.sensory-shell--audio-diff .sensory-shell__orb--amber {
  top: -110px;
  left: -48px;
  background: rgba(255, 191, 73, 0.62);
}

.sensory-shell--audio-diff .sensory-shell__orb--sky {
  right: -82px;
  bottom: -120px;
  background: rgba(150, 102, 255, 0.38);
}

.sensory-shell--audio-diff .sensory-shell__grid {
  opacity: 0.14;
  background-image:
    linear-gradient(rgba(255, 214, 151, 0.14) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 214, 151, 0.12) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: none;
}

.sensory-shell--audio-diff .sensory-shell__toolbar {
  position: absolute;
  top: clamp(14px, 1.2vw, 20px);
  left: clamp(14px, 1.2vw, 20px);
  z-index: 4;
  display: flex;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.sensory-shell--audio-diff .sensory-shell__actions,
.sensory-shell--shape-match .sensory-shell__actions,
.sensory-shell--audio-command .sensory-shell__actions {
  align-items: center;
}

.sensory-shell--audio-diff .sensory-shell__back-button {
  min-height: 48px;
  padding: 0 18px;
  color: #fff3df;
  border: 1px solid rgba(255, 224, 180, 0.18);
  background:
    linear-gradient(180deg, rgba(122, 86, 56, 0.94), rgba(67, 43, 28, 0.98)),
    linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0));
  box-shadow:
    0 18px 28px rgba(16, 10, 8, 0.28),
    inset 0 1px 0 rgba(255, 238, 211, 0.28);
}

.sensory-shell--audio-diff .sensory-shell__back-button:hover {
  transform: translateY(-1px);
  box-shadow:
    0 22px 32px rgba(16, 10, 8, 0.32),
    inset 0 1px 0 rgba(255, 238, 211, 0.32);
}

.sensory-shell--audio-diff .sensory-shell__title-group,
.sensory-shell--audio-diff .sensory-shell__meta {
  display: none;
}

.sensory-shell--audio-diff .sensory-shell__stage {
  margin-top: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.sensory-shell--rhythm {
  height: 100dvh;
  color: #4b2c73;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.38), transparent 28%),
    radial-gradient(circle at 82% 18%, rgba(255, 210, 122, 0.36), transparent 22%),
    linear-gradient(180deg, #f8e8a6 0%, #f7e3a9 40%, #f6dfad 100%);
}

.sensory-shell--rhythm .sensory-shell__orb {
  filter: blur(42px);
  opacity: 0.5;
}

.sensory-shell--rhythm .sensory-shell__orb--amber {
  top: -90px;
  left: -40px;
  background: rgba(255, 200, 94, 0.86);
}

.sensory-shell--rhythm .sensory-shell__orb--sky {
  right: -80px;
  bottom: -100px;
  background: rgba(255, 167, 108, 0.42);
}

.sensory-shell--rhythm .sensory-shell__grid {
  opacity: 0.18;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.52) 0, rgba(255, 255, 255, 0.52) 2px, transparent 2px),
    radial-gradient(circle at 72% 26%, rgba(255, 255, 255, 0.48) 0, rgba(255, 255, 255, 0.48) 2px, transparent 2px),
    radial-gradient(circle at 40% 72%, rgba(255, 255, 255, 0.44) 0, rgba(255, 255, 255, 0.44) 2px, transparent 2px);
  background-size: 220px 220px, 160px 160px, 200px 200px;
  mask-image: none;
}

.sensory-shell--rhythm .sensory-shell__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.sensory-shell--rhythm .sensory-shell__back-button {
  order: 1;
  min-height: 46px;
  padding: 0 18px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  color: #65438f;
  background: rgba(255, 252, 246, 0.78);
  box-shadow: 0 16px 28px rgba(160, 116, 45, 0.14);
}

.sensory-shell--rhythm .sensory-shell__back-button:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 20px 34px rgba(160, 116, 45, 0.18);
}

.sensory-shell--rhythm .sensory-shell__title-group {
  order: 3;
  flex: 1 1 100%;
  padding: 4px 4px 0;
}

.sensory-shell--rhythm .sensory-shell__eyebrow {
  min-height: 32px;
  padding: 0 14px;
  color: #9a5c1f;
  background: rgba(255, 246, 225, 0.72);
  box-shadow: 0 12px 22px rgba(194, 138, 42, 0.12);
}

.sensory-shell--rhythm .sensory-shell__title-group h1 {
  margin: 14px 0 10px;
  font-family: "Comic Sans MS", "Marker Felt", "Trebuchet MS", "Microsoft YaHei", sans-serif;
  font-size: clamp(2.4rem, 4.4vw, 4rem);
  letter-spacing: 0.04em;
  color: #5a2f86;
  text-shadow:
    0 4px 0 rgba(255, 255, 255, 0.6),
    0 18px 28px rgba(111, 67, 155, 0.16);
}

.sensory-shell--rhythm .sensory-shell__title-group p {
  max-width: 820px;
  font-size: 1rem;
  color: rgba(101, 67, 143, 0.88);
}

.sensory-shell--rhythm .sensory-shell__meta {
  order: 2;
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.sensory-shell--rhythm .sensory-shell__meta-card {
  min-height: auto;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 252, 246, 0.48);
  border: 1px solid rgba(255, 255, 255, 0.74);
  box-shadow: 0 12px 24px rgba(140, 96, 37, 0.1);
  backdrop-filter: blur(10px);
}

.sensory-shell--rhythm .sensory-shell__meta-card span {
  font-size: 0.72rem;
  color: rgba(101, 67, 143, 0.68);
}

.sensory-shell--rhythm .sensory-shell__meta-card strong {
  font-size: 0.92rem;
  color: #5f3a88;
}

.sensory-shell--rhythm .sensory-shell__stage {
  margin-top: 10px;
  padding: clamp(18px, 2vw, 24px);
  border-radius: 40px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  background:
    linear-gradient(180deg, rgba(255, 252, 242, 0.78), rgba(255, 246, 227, 0.72)),
    linear-gradient(135deg, rgba(255, 255, 255, 0.24), rgba(255, 226, 169, 0.14));
  box-shadow:
    0 26px 58px rgba(159, 112, 38, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.48);
}

.sensory-shell--color-match {
  color: #4f317d;
  background:
    radial-gradient(circle at 12% 14%, rgba(255, 236, 170, 0.34), transparent 20%),
    radial-gradient(circle at 88% 22%, rgba(255, 190, 216, 0.3), transparent 20%),
    radial-gradient(circle at 74% 84%, rgba(122, 205, 255, 0.22), transparent 24%),
    linear-gradient(180deg, #daf1ff 0%, #cfe9ff 48%, #eaf7ff 100%);
}

.sensory-shell--color-match .sensory-shell__orb {
  filter: blur(52px);
  opacity: 0.52;
}

.sensory-shell--color-match .sensory-shell__orb--amber {
  top: -88px;
  left: -28px;
  background: rgba(255, 215, 127, 0.72);
}

.sensory-shell--color-match .sensory-shell__orb--sky {
  right: -72px;
  bottom: -90px;
  background: rgba(129, 206, 255, 0.6);
}

.sensory-shell--color-match .sensory-shell__grid {
  opacity: 0.24;
  background-image:
    radial-gradient(circle at 18% 22%, rgba(255, 255, 255, 0.7) 0, rgba(255, 255, 255, 0.7) 3px, transparent 3px),
    radial-gradient(circle at 74% 28%, rgba(255, 255, 255, 0.56) 0, rgba(255, 255, 255, 0.56) 2px, transparent 2px),
    radial-gradient(circle at 42% 72%, rgba(255, 255, 255, 0.52) 0, rgba(255, 255, 255, 0.52) 2px, transparent 2px),
    linear-gradient(rgba(150, 188, 224, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(150, 188, 224, 0.12) 1px, transparent 1px);
  background-size: 220px 220px, 180px 180px, 210px 210px, 32px 32px, 32px 32px;
  mask-image: none;
}

.sensory-shell--color-match .sensory-shell__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.38);
  box-shadow: 0 16px 28px rgba(75, 108, 170, 0.1);
  backdrop-filter: blur(18px);
}

.sensory-shell--color-match .sensory-shell__back-button {
  min-height: 40px;
  padding: 0 16px;
  color: #4f317d;
  background: rgba(255, 255, 255, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 10px 18px rgba(97, 139, 210, 0.12);
}

.sensory-shell--color-match .sensory-shell__back-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 22px rgba(97, 139, 210, 0.16);
}

.sensory-shell--color-match .sensory-shell__title-group {
  order: 2;
  flex: 1 1 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
}

.sensory-shell--color-match .sensory-shell__eyebrow {
  min-height: 28px;
  padding: 0 10px;
  font-size: 0.74rem;
  color: #4f46e5;
  background: rgba(237, 245, 255, 0.52);
}

.sensory-shell--color-match .sensory-shell__title-group h1 {
  margin: 0;
  color: #5b3290;
  font-family: "Comic Sans MS", "Marker Felt", "Trebuchet MS", "Microsoft YaHei", sans-serif;
  font-size: clamp(1.05rem, 1.8vw, 1.34rem);
  letter-spacing: 0.02em;
  text-shadow: 0 8px 16px rgba(91, 50, 144, 0.1);
}

.sensory-shell--color-match .sensory-shell__title-group p {
  display: none;
}

.sensory-shell--color-match .sensory-shell__meta {
  order: 3;
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.sensory-shell--color-match .sensory-shell__meta-card {
  min-height: auto;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.36);
  box-shadow: none;
  backdrop-filter: blur(12px);
}

.sensory-shell--color-match .sensory-shell__meta-card span {
  font-size: 0.68rem;
  color: rgba(79, 49, 125, 0.62);
}

.sensory-shell--color-match .sensory-shell__meta-card strong {
  font-size: 0.84rem;
  color: #533685;
}

.sensory-shell--color-match .sensory-shell__stage {
  margin-top: 8px;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.sensory-shell--shape-match {
  height: 100%;
  color: #4f311a;
  background:
    radial-gradient(circle at 18% 12%, rgba(255, 239, 208, 0.28), transparent 18%),
    radial-gradient(circle at 82% 82%, rgba(201, 154, 99, 0.18), transparent 22%),
    repeating-linear-gradient(
      -8deg,
      rgba(191, 145, 96, 0.12) 0,
      rgba(191, 145, 96, 0.12) 10px,
      rgba(233, 203, 160, 0.08) 10px,
      rgba(233, 203, 160, 0.08) 24px
    ),
    linear-gradient(180deg, #e9cfab 0%, #e2c095 44%, #d8b284 100%);
}

.sensory-shell--shape-match .sensory-shell__orb {
  filter: blur(56px);
  opacity: 0.28;
}

.sensory-shell--shape-match .sensory-shell__orb--amber {
  top: -84px;
  left: -40px;
  background: rgba(255, 245, 220, 0.74);
}

.sensory-shell--shape-match .sensory-shell__orb--sky {
  right: -90px;
  bottom: -110px;
  background: rgba(166, 115, 66, 0.22);
}

.sensory-shell--shape-match .sensory-shell__grid {
  opacity: 0.18;
  background-image:
    linear-gradient(90deg, rgba(150, 101, 58, 0.1) 0 1px, transparent 1px 110px),
    linear-gradient(rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 140px);
  background-size: 220px 100%, 100% 180px;
  mask-image: none;
}

.sensory-shell--shape-match .sensory-shell__toolbar {
  position: absolute;
  top: clamp(16px, 1.4vw, 24px);
  left: clamp(16px, 1.4vw, 24px);
  z-index: 3;
  display: flex;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.sensory-shell--shape-match .sensory-shell__back-button {
  min-height: 48px;
  padding: 0 18px;
  color: #fff5e9;
  border: 1px solid rgba(255, 236, 208, 0.18);
  background: linear-gradient(180deg, #9a6737 0%, #7f4d23 100%);
  box-shadow:
    0 14px 22px rgba(73, 43, 18, 0.2),
    inset 0 1px 0 rgba(255, 240, 216, 0.22);
}

.sensory-shell--shape-match .sensory-shell__back-button:hover {
  transform: translateY(-1px);
  box-shadow:
    0 18px 26px rgba(73, 43, 18, 0.24),
    inset 0 1px 0 rgba(255, 240, 216, 0.24);
}

.sensory-shell--shape-match .sensory-shell__title-group {
  display: none;
}

.sensory-shell--shape-match .sensory-shell__meta {
  display: none;
}

.sensory-shell--shape-match .sensory-shell__stage {
  margin-top: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.sensory-shell--bubble-pop {
  height: 100%;
}

.sensory-shell--bubble-pop .sensory-shell__title-group,
.sensory-shell--bubble-pop .sensory-shell__meta {
  display: none;
}

.sensory-shell--bubble-pop .sensory-shell__stage {
  margin-top: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.sensory-shell--bubble-pop .sensory-shell__back-button {
  min-height: 42px;
  padding: 0 16px;
}

.sensory-shell--audio-command {
  height: 100%;
  color: #4f311a;
  background:
    radial-gradient(circle at 14% 12%, rgba(255, 236, 198, 0.24), transparent 18%),
    radial-gradient(circle at 84% 82%, rgba(184, 126, 72, 0.16), transparent 24%),
    repeating-linear-gradient(
      -8deg,
      rgba(124, 78, 42, 0.08) 0,
      rgba(124, 78, 42, 0.08) 12px,
      rgba(232, 208, 171, 0.04) 12px,
      rgba(232, 208, 171, 0.04) 28px
    ),
    linear-gradient(180deg, #dac098 0%, #d0ad7f 46%, #c99f6e 100%);
}

.sensory-shell--audio-command .sensory-shell__orb {
  filter: blur(58px);
  opacity: 0.24;
}

.sensory-shell--audio-command .sensory-shell__orb--amber {
  top: -90px;
  left: -36px;
  background: rgba(255, 241, 214, 0.72);
}

.sensory-shell--audio-command .sensory-shell__orb--sky {
  right: -96px;
  bottom: -120px;
  background: rgba(156, 102, 48, 0.2);
}

.sensory-shell--audio-command .sensory-shell__grid {
  opacity: 0.16;
  background-image:
    linear-gradient(90deg, rgba(125, 82, 42, 0.1) 0 1px, transparent 1px 120px),
    linear-gradient(rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 150px);
  background-size: 240px 100%, 100% 190px;
  mask-image: none;
}

.sensory-shell--audio-command .sensory-shell__toolbar {
  position: absolute;
  top: clamp(16px, 1.4vw, 24px);
  left: clamp(16px, 1.4vw, 24px);
  z-index: 3;
  display: flex;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.sensory-shell--audio-command .sensory-shell__back-button {
  min-height: 48px;
  padding: 0 18px;
  color: #fff6eb;
  border: 1px solid rgba(255, 236, 208, 0.16);
  background: linear-gradient(180deg, #8d5a2b 0%, #70401c 100%);
  box-shadow:
    0 14px 22px rgba(73, 43, 18, 0.18),
    inset 0 1px 0 rgba(255, 240, 216, 0.22);
}

.sensory-shell--audio-command .sensory-shell__back-button:hover {
  transform: translateY(-1px);
  box-shadow:
    0 18px 26px rgba(73, 43, 18, 0.22),
    inset 0 1px 0 rgba(255, 240, 216, 0.24);
}

.sensory-shell--audio-command .sensory-shell__title-group,
.sensory-shell--audio-command .sensory-shell__meta {
  display: none;
}

.sensory-shell--audio-command .sensory-shell__stage {
  margin-top: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

@media (max-width: 1280px) {
  .sensory-shell__toolbar {
    grid-template-columns: 1fr;
  }

  .sensory-shell__meta {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .sensory-shell--rhythm .sensory-shell__meta {
    margin-left: 0;
    justify-content: flex-start;
  }
}

@media (max-width: 900px) {
  .sensory-shell {
    padding: 16px;
  }

  .sensory-shell__toolbar {
    padding: 16px;
    border-radius: 24px;
  }

  .sensory-shell__meta {
    grid-template-columns: 1fr;
  }

  .sensory-shell__stage {
    padding: 16px;
    border-radius: 24px;
  }

  .sensory-shell--rhythm .sensory-shell__toolbar {
    gap: 12px;
  }

  .sensory-shell--rhythm .sensory-shell__title-group h1 {
    font-size: clamp(2rem, 11vw, 3rem);
  }

  .sensory-shell--rhythm .sensory-shell__meta {
    width: 100%;
    justify-content: flex-start;
  }

  .sensory-shell--rhythm .sensory-shell__stage {
    border-radius: 28px;
  }

  .sensory-shell--color-match .sensory-shell__toolbar,
  .sensory-shell--color-match .sensory-shell__stage {
    border-radius: 20px;
  }

  .sensory-shell--color-match .sensory-shell__meta {
    justify-content: flex-start;
  }

  .sensory-shell--audio-diff .sensory-shell__toolbar,
  .sensory-shell--audio-command .sensory-shell__toolbar {
    top: 12px;
    left: 12px;
  }

  .sensory-shell--shape-match .sensory-shell__meta {
    margin-left: 0;
    justify-content: flex-start;
  }
}
</style>
