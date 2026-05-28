<template>
  <div v-if="musicAvailable" class="game-music-settings">
    <button
      type="button"
      class="game-music-quick-toggle"
      :class="`game-music-quick-toggle--${tone}`"
      @click="toggleMusicEnabled"
      :aria-label="musicEnabled ? '关闭背景音乐' : '开启背景音乐'"
    >
      <span class="game-music-quick-toggle__status">
        {{ musicEnabled ? '音乐开着' : '安静模式' }}
      </span>
      <strong class="game-music-quick-toggle__action">
        {{ musicEnabled ? '点一下先安静' : '点一下开音乐' }}
      </strong>
    </button>

    <el-dropdown trigger="click" placement="bottom-end">
      <button
        type="button"
        class="game-music-settings-trigger"
        :class="`game-music-settings-trigger--${tone}`"
      >
        音乐设置
      </button>

      <template #dropdown>
        <el-dropdown-menu class="game-music-settings-menu">
          <div class="game-music-settings-panel" @click.stop>
            <div class="game-music-settings-row">
              <span class="game-music-settings-label">背景音乐</span>
              <el-switch
                :model-value="musicEnabled"
                @update:model-value="updateSetting('musicEnabled', $event)"
              />
            </div>

            <div class="game-music-settings-row">
              <span class="game-music-settings-label">音乐音量</span>
              <el-slider
                :model-value="musicVolume"
                :min="0"
                :max="100"
                :show-tooltip="false"
                @update:model-value="updateSetting('musicVolume', $event)"
              />
            </div>

            <div class="game-music-settings-row">
              <span class="game-music-settings-label">音效与语音</span>
              <el-switch
                :model-value="effectsEnabled"
                @update:model-value="updateSetting('effectsEnabled', $event)"
              />
            </div>
          </div>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import type { SharedGameAudioSettings } from '@/audio/game-audio-settings'

const props = withDefaults(defineProps<{
  musicEnabled: boolean
  musicVolume: number
  effectsEnabled: boolean
  musicAvailable?: boolean
  tone?: 'light' | 'dark'
}>(), {
  musicAvailable: true,
  tone: 'light',
})

const emit = defineEmits<{
  change: [settings: SharedGameAudioSettings]
}>()

function updateSetting<Key extends keyof SharedGameAudioSettings>(
  key: Key,
  value: SharedGameAudioSettings[Key],
) {
  emit('change', {
    musicEnabled: props.musicEnabled,
    musicVolume: props.musicVolume,
    effectsEnabled: props.effectsEnabled,
    [key]: value,
  })
}

function toggleMusicEnabled() {
  updateSetting('musicEnabled', !props.musicEnabled)
}
</script>

<style scoped>
.game-music-settings {
  display: flex;
  align-items: center;
  gap: 10px;
}

.game-music-quick-toggle,
.game-music-settings-trigger {
  min-height: 42px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.game-music-quick-toggle {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-height: 52px;
  padding: 8px 16px;
  text-align: left;
}

.game-music-settings-trigger:hover {
  transform: translateY(-1px);
}

.game-music-quick-toggle:hover {
  transform: translateY(-1px);
}

.game-music-quick-toggle--light,
.game-music-settings-trigger--light {
  color: #31506a;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.14);
}

.game-music-quick-toggle--dark,
.game-music-settings-trigger--dark {
  color: #fff6eb;
  border: 1px solid rgba(255, 236, 208, 0.16);
  background: linear-gradient(180deg, rgba(141, 90, 43, 0.94), rgba(112, 64, 28, 0.98));
  box-shadow:
    0 14px 22px rgba(73, 43, 18, 0.18),
    inset 0 1px 0 rgba(255, 240, 216, 0.22);
}

.game-music-quick-toggle__status {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.78;
}

.game-music-quick-toggle__action {
  font-size: 13px;
  line-height: 1.2;
}

.game-music-settings-menu :deep(.el-dropdown-menu__item) {
  padding: 0;
}

.game-music-settings-panel {
  width: min(320px, calc(100vw - 32px));
  padding: 14px;
}

.game-music-settings-row {
  display: grid;
  gap: 10px;
}

.game-music-settings-row + .game-music-settings-row {
  margin-top: 14px;
}

.game-music-settings-label {
  font-size: 13px;
  font-weight: 700;
  color: #475569;
}
</style>
