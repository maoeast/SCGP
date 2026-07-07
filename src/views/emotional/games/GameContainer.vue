<template>
  <section class="emotion-game-shell" :data-paused="isPaused">
    <header class="game-toolbar">
      <button class="quiet-exit-button" type="button" @click="handleQuietExit">
        安静退出
      </button>

      <div class="toolbar-right">
        <div class="student-pill">
          <span class="student-label">{{ participantLabel }}</span>
          <strong>{{ participantSummary }}</strong>
        </div>

        <button
          v-if="musicAvailable"
          class="music-toggle-button"
          type="button"
          @click="toggleMusicEnabled"
          :aria-label="settings.musicEnabled ? '关闭背景音乐' : '开启背景音乐'"
        >
          <span class="music-toggle-button__status">
            {{ settings.musicEnabled ? '音乐开着' : '安静模式' }}
          </span>
          <strong class="music-toggle-button__action">
            {{ settings.musicEnabled ? '点一下先安静' : '点一下开音乐' }}
          </strong>
        </button>

        <el-dropdown trigger="click" placement="bottom-end">
          <button class="settings-button" type="button">
            设置
          </button>

          <template #dropdown>
            <el-dropdown-menu class="game-settings-menu">
              <div class="settings-panel" @click.stop>
                <div class="settings-row">
                  <span class="setting-label">难度级别</span>
                  <el-radio-group v-model="difficulty" size="small" :disabled="difficultyLocked">
                    <el-radio-button :value="1">简单</el-radio-button>
                    <el-radio-button :value="2">中等</el-radio-button>
                    <el-radio-button :value="3">困难</el-radio-button>
                  </el-radio-group>
                  <span v-if="difficultyLocked" class="setting-lock-note">
                    当前训练已锁定难度，运行中不可修改。
                  </span>
                </div>

                <div class="settings-row">
                  <span class="setting-label">背景音乐</span>
                  <el-slider
                    v-model="settings.musicVolume"
                    :min="0"
                    :max="100"
                    :show-tooltip="false"
                  />
                </div>

                <div class="settings-row">
                  <span class="setting-label">特效与语音</span>
                  <el-switch v-model="settings.effectsEnabled" />
                </div>

                <div class="settings-row">
                  <span class="setting-label">教师操作</span>
                  <button class="teacher-exit-button" type="button" @click="handleTeacherExit">
                    教师结束本局
                  </button>
                </div>
              </div>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <div class="game-stage">
      <slot
        v-if="shouldRenderGame"
        :difficulty="difficulty"
        :settings="settings"
        :is-paused="isPaused"
        :complete-game="handleGameComplete"
        :complete-group-game="handleGroupGameComplete"
        :abort-group-game="handleAbortGroupGame"
        :mark-round-dirty="markRoundDirty"
        :audio="audioController"
        :launch-context="props.launchContext"
        :permission-streams="permissionStreams"
      />

      <div v-else class="permission-gate">
        <div class="permission-card" :data-state="preflightState">
          <div class="permission-icon">
            {{ preflightState === 'probing' ? '...' : preflightState === 'blocked_system' ? '🛡️' : '🎮' }}
          </div>
          <h2>{{ preflightTitle }}</h2>
          <p>{{ preflightMessage }}</p>
          <p v-if="preflightHint" class="permission-hint">
            {{ preflightHint }}
          </p>

          <div v-if="requiredPermissions.length > 0" class="permission-tags">
            <span
              v-for="permission in requiredPermissions"
              :key="permission"
              class="permission-tag"
              :class="{ missing: blockedPermissions.includes(permission) }"
            >
              {{ permissionLabels[permission] }}
            </span>
          </div>

          <div class="permission-actions">
            <button
              v-if="preflightState === 'blocked_system' && canOpenSystemSettings"
              class="permission-primary-button"
              type="button"
              :disabled="isOpeningSystemSettings || isProbing"
              @click="handleOpenSystemSettings"
            >
              {{ isOpeningSystemSettings ? '正在打开系统设置...' : '打开系统设置' }}
            </button>

            <button
              v-if="preflightState === 'blocked_retryable' || preflightState === 'blocked_system'"
              class="permission-secondary-button"
              type="button"
              :disabled="isProbing"
              @click="runPermissionPreflight"
            >
              {{ preflightState === 'blocked_system' ? '我已完成设置，重新检测' : '重新检测权限' }}
            </button>

            <button
              v-if="preflightState !== 'probing'"
              class="permission-ghost-button"
              type="button"
              @click="handlePreflightReturn"
            >
              返回训练列表
            </button>
          </div>
        </div>
      </div>
    </div>

    <transition name="fade-up">
      <div v-if="persistenceMessage" class="persistence-banner">
        {{ persistenceMessage }}
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import {
  getRequiredCustomGameDefinition,
  type CustomGamePermission,
} from '@/data/custom-game-registry'
import { EmotionalGamesAPI } from '@/database/emotional-games-api'
import { DatabaseAPI, GameTrainingAPI } from '@/database/api'
import { ModuleCode } from '@/types/module'
import {
  loadGameAudioSettings,
  saveGameAudioSettings,
} from '@/audio/game-audio-settings'
import { createGameMusicController } from '@/audio/game-music-controller'
import {
  hasCustomGameBackgroundMusic,
  resolveCustomGameMusicProfile,
} from '@/audio/game-music-profiles'
import type {
  CustomGameCode,
  CustomGameExitTrigger,
  CustomGameLaunchContext,
  EmotionGameAudioController,
  EmotionGameBadgePayload,
  EmotionGameCompletionPayload,
  EmotionGameDifficulty,
  EmotionGameSettings,
  GroupGameCompletionPayload,
} from '@/types/emotional/games'

const props = withDefaults(defineProps<{
  launchContext: CustomGameLaunchContext
  gameCode: CustomGameCode
  gameTitle: string
  defaultBadge?: EmotionGameBadgePayload
}>(), {
  defaultBadge: undefined,
})

const route = useRoute()
const router = useRouter()
const api = new EmotionalGamesAPI()
const gameDefinition = computed(() => getRequiredCustomGameDefinition(props.gameCode))

type PermissionPreflightState =
  | 'idle'
  | 'probing'
  | 'ready'
  | 'degraded_ready'
  | 'blocked_retryable'
  | 'blocked_system'
  | 'active'
  | 'terminal'

type MediaAccessStatus = 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown'

const permissionLabels: Record<CustomGamePermission, string> = {
  microphone: '麦克风',
  camera: '摄像头',
}

const permissionStreams = reactive<Record<CustomGamePermission, MediaStream | null>>({
  microphone: null,
  camera: null,
})
const preflightState = ref<PermissionPreflightState>('idle')
const blockedPermissions = ref<CustomGamePermission[]>([])
const preflightFailureMessage = ref('')
const preflightPlatform = ref('unknown')
const canOpenSystemSettings = ref(false)
const isOpeningSystemSettings = ref(false)
let activePreflightRunId = 0
let isDisposed = false

const LEGACY_BACKGROUND_VOLUME = 28
const initialAudioSettings = loadGameAudioSettings()
const settings = reactive<EmotionGameSettings>({
  musicEnabled: initialAudioSettings.musicEnabled,
  musicVolume: initialAudioSettings.musicVolume,
  effectsEnabled: initialAudioSettings.effectsEnabled,
  backgroundVolume: LEGACY_BACKGROUND_VOLUME,
})
const gameMusicController = createGameMusicController(initialAudioSettings)

function normalizeParticipantStudentIds(source: number[]): number[] {
  return Array.from(new Set(
    source
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
      .map((value) => Math.floor(value)),
  ))
}

function createSessionGroupId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `custom-game-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getOptionalElectronAPI() {
  return (window as typeof window & {
    electronAPI?: {
      getMediaPermissionStatus?: (permission: CustomGamePermission) => Promise<{
        success: boolean
        permission: CustomGamePermission
        status: MediaAccessStatus
        platform: string
        canOpenSettings: boolean
        error?: string
      }>
      openMediaPermissionSettings?: (permission: CustomGamePermission) => Promise<{
        success: boolean
        opened: boolean
        platform: string
        error?: string
      }>
    }
  }).electronAPI
}

function stopPermissionStream(permission: CustomGamePermission) {
  const stream = permissionStreams[permission]
  if (!stream) {
    return
  }

  stream.getTracks().forEach((track) => track.stop())
  permissionStreams[permission] = null
}

function stopAllPermissionStreams() {
  stopPermissionStream('microphone')
  stopPermissionStream('camera')
}

function cancelPermissionPreflight() {
  activePreflightRunId += 1
  stopAllPermissionStreams()
}

function isCurrentPreflightRun(runId: number) {
  return !isDisposed && activePreflightRunId === runId
}

function getPermissionConstraints(permission: CustomGamePermission): MediaStreamConstraints {
  if (permission === 'microphone') {
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
      video: false,
    }
  }

  return {
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode: 'user',
    },
    audio: false,
  }
}

async function getSystemPermissionStatus(permission: CustomGamePermission): Promise<MediaAccessStatus | null> {
  const electronAPI = getOptionalElectronAPI()
  if (!electronAPI?.getMediaPermissionStatus) {
    return null
  }

  try {
    const result = await electronAPI.getMediaPermissionStatus(permission)
    if (!result?.success) {
      return null
    }

    preflightPlatform.value = result.platform || preflightPlatform.value
    canOpenSystemSettings.value = canOpenSystemSettings.value || Boolean(result.canOpenSettings)
    return result.status
  } catch {
    return null
  }
}

function setRetryableBlock(permission: CustomGamePermission, error: unknown) {
  const errorName = typeof (error as { name?: string })?.name === 'string'
    ? String((error as { name?: string }).name)
    : ''
  const errorMessage = typeof (error as { message?: string })?.message === 'string'
    ? String((error as { message?: string }).message)
    : ''
  const permissionLabel = permissionLabels[permission]

  blockedPermissions.value = [permission]
  preflightState.value = 'blocked_retryable'

  if (!navigator.mediaDevices?.getUserMedia) {
    preflightFailureMessage.value = `${permissionLabel}当前不可用，请在 Electron 环境中运行，或确认浏览器允许媒体访问。`
    return
  }

  if (errorName === 'NotFoundError') {
    preflightFailureMessage.value = `没有检测到${permissionLabel}设备，请检查连接后重新检测。`
    return
  }

  if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
    preflightFailureMessage.value = `${permissionLabel}正在被其他程序占用，请关闭冲突程序后重试。`
    return
  }

  if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
    preflightFailureMessage.value = `${permissionLabel}未被当前页面允许，请点击重新检测并在弹窗中允许访问。`
    return
  }

  preflightFailureMessage.value = `${permissionLabel}启动失败${errorMessage ? `：${errorMessage}` : '，请重新检测权限。'}`
}

function setSystemBlock(permissions: CustomGamePermission[]) {
  blockedPermissions.value = [...permissions]
  preflightState.value = 'blocked_system'
  preflightFailureMessage.value = permissions.length > 0
    ? `${permissions.map((permission) => permissionLabels[permission]).join('、')}在系统权限里被拒绝，当前不能进入训练。`
    : '系统权限未开启，当前不能进入训练。'
}

async function runPermissionPreflight() {
  const runId = ++activePreflightRunId

  stopAllPermissionStreams()
  blockedPermissions.value = []
  preflightFailureMessage.value = ''
  canOpenSystemSettings.value = false
  preflightState.value = 'probing'

  const permissions = requiredPermissions.value
  if (permissions.length === 0) {
    if (!isCurrentPreflightRun(runId)) {
      return
    }

    preflightState.value = 'ready'
    await nextTick()

    if (isCurrentPreflightRun(runId)) {
      preflightState.value = 'active'
    }
    return
  }

  const systemBlocked: CustomGamePermission[] = []
  for (const permission of permissions) {
    const status = await getSystemPermissionStatus(permission)
    if (!isCurrentPreflightRun(runId)) {
      stopAllPermissionStreams()
      return
    }

    if (status === 'denied' || status === 'restricted') {
      systemBlocked.push(permission)
    }
  }

  if (systemBlocked.length > 0) {
    setSystemBlock(systemBlocked)
    stopAllPermissionStreams()
    return
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    const firstPermission = permissions[0]
    if (firstPermission) {
      setRetryableBlock(firstPermission, new Error('media-devices-unavailable'))
    }
    stopAllPermissionStreams()
    return
  }

  for (const permission of permissions) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getPermissionConstraints(permission))
      if (!isCurrentPreflightRun(runId)) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      permissionStreams[permission] = stream
    } catch (error) {
      stopAllPermissionStreams()

      if (!isCurrentPreflightRun(runId)) {
        return
      }

      const postStatus = await getSystemPermissionStatus(permission)
      if (!isCurrentPreflightRun(runId)) {
        return
      }

      if (postStatus === 'denied' || postStatus === 'restricted') {
        setSystemBlock([permission])
      } else {
        setRetryableBlock(permission, error)
      }
      return
    }
  }

  if (!isCurrentPreflightRun(runId)) {
    stopAllPermissionStreams()
    return
  }

  preflightState.value = 'ready'
  await nextTick()

  if (isCurrentPreflightRun(runId)) {
    preflightState.value = 'active'
  }
}

const resolvedParticipantStudentIds = computed(() => {
  return normalizeParticipantStudentIds(
    props.launchContext.participantStudentIds.length > 0
      ? props.launchContext.participantStudentIds
      : [props.launchContext.studentId],
  )
})

const resolvedParticipantNames = computed(() => {
  const explicitNames = Array.isArray(props.launchContext.participantStudentNames)
    ? props.launchContext.participantStudentNames
      .map((value) => String(value || '').trim())
      .filter(Boolean)
    : []

  return resolvedParticipantStudentIds.value.map((studentId, index) => {
    return explicitNames[index]
      || (index === 0 && props.launchContext.studentName ? props.launchContext.studentName : '')
      || `学生 ${studentId}`
  })
})

const primaryStudentId = computed(() => resolvedParticipantStudentIds.value[0] || 0)
const primaryStudentName = computed(() => resolvedParticipantNames.value[0] || `学生 ${primaryStudentId.value}`)
const isGroupLaunch = computed(() => resolvedParticipantStudentIds.value.length > 1)
const difficultyLocked = computed(() => props.launchContext.difficultyLocked)
const participantLabel = computed(() => (isGroupLaunch.value ? '当前参与者' : '当前学生'))
const participantSummary = computed(() => resolvedParticipantNames.value.join('、') || primaryStudentName.value)
const requiredPermissions = computed(() => [...gameDefinition.value.requiredPermissions])
const shouldRenderGame = computed(() => ['active', 'terminal'].includes(preflightState.value))
const isProbing = computed(() => preflightState.value === 'probing')
const blockedPermissionSummary = computed(() => blockedPermissions.value.map((permission) => permissionLabels[permission]).join('、'))
const resolvedMusicProfile = computed(() => resolveCustomGameMusicProfile({
  trainingEntryCode: props.launchContext.launchEntryCode,
  gameCode: props.gameCode,
}))
const musicAvailable = computed(() => hasCustomGameBackgroundMusic({
  trainingEntryCode: props.launchContext.launchEntryCode,
  gameCode: props.gameCode,
}))
const preflightTitle = computed(() => {
  if (preflightState.value === 'probing') {
    return `正在准备《${props.gameTitle}》`
  }

  if (preflightState.value === 'blocked_system') {
    return `${blockedPermissionSummary.value || '媒体权限'}尚未在系统中开启`
  }

  if (preflightState.value === 'blocked_retryable') {
    return `${blockedPermissionSummary.value || '媒体权限'}暂时不可用`
  }

  return `正在进入《${props.gameTitle}》`
})
const preflightMessage = computed(() => {
  if (preflightState.value === 'probing') {
    if (requiredPermissions.value.length === 0) {
      return '正在检查启动环境，请稍候。'
    }

    return `容器正在统一检查 ${requiredPermissions.value.map((permission) => permissionLabels[permission]).join('、')} 权限。`
  }

  if (preflightFailureMessage.value) {
    return preflightFailureMessage.value
  }

  return '正在准备训练环境。'
})
const preflightHint = computed(() => {
  if (preflightState.value !== 'blocked_system') {
    return ''
  }

  if (preflightPlatform.value === 'darwin') {
    return 'macOS：系统设置 -> 隐私与安全性 -> 麦克风 / 摄像头，开启后返回本页重新检测。'
  }

  if (preflightPlatform.value === 'win32') {
    return 'Windows：设置 -> 隐私和安全性 -> 麦克风 / 摄像头，允许桌面应用访问后再返回重新检测。'
  }

  return 'Linux：请检查桌面环境权限设置，并确认设备未被其他程序占用。'
})

function resolveInitialSessionGroupId() {
  const metadataSessionGroupId = typeof props.launchContext.metadata?.sessionGroupId === 'string'
    ? props.launchContext.metadata.sessionGroupId.trim()
    : ''

  if (metadataSessionGroupId) {
    return metadataSessionGroupId
  }

  return isGroupLaunch.value ? createSessionGroupId() : ''
}

const difficulty = ref<EmotionGameDifficulty>(props.launchContext.initialDifficulty)
const isPaused = ref(false)
const persistenceMessage = ref('')
const isPersisting = ref(false)
const sessionStartedAt = ref<number | null>(null)
const hasDirtyRound = ref(false)
const suppressLeaveAbort = ref(false)
const activeSessionGroupId = ref(resolveInitialSessionGroupId())
let messageTimer: number | null = null

let audioContext: AudioContext | null = null
let masterGain: GainNode | null = null
const cleanupAudioStops = new Set<() => void>()

function registerCleanup(cleanup: () => void) {
  cleanupAudioStops.add(cleanup)
  return () => cleanupAudioStops.delete(cleanup)
}

async function ensureAudioReady() {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  if (AudioContextClass) {
    if (!audioContext) {
      audioContext = new AudioContextClass()
      masterGain = audioContext.createGain()
      masterGain.gain.value = 0.45
      masterGain.connect(audioContext.destination)
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
  }

  await gameMusicController.ensureReady()
}

function stopAmbient() {
  gameMusicController.stopMusic()
}

async function startAmbient() {
  if (!musicAvailable.value) {
    gameMusicController.stopMusic()
    return
  }

  await ensureAudioReady()
  gameMusicController.setProfile(resolvedMusicProfile.value)
  gameMusicController.restoreMusic()
  gameMusicController.setState('playing')
}

async function startBreathCue() {
  if (!settings.effectsEnabled) return
  await ensureAudioReady()
  if (!audioContext || !masterGain) return

  let stopped = false
  const gain = audioContext.createGain()
  gain.gain.value = 0.0001
  gain.connect(masterGain)

  const oscillator = audioContext.createOscillator()
  oscillator.type = 'triangle'
  oscillator.frequency.value = 232
  oscillator.connect(gain)
  oscillator.start()

  const now = audioContext.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.exponentialRampToValueAtTime(0.055, now + 0.25)

  const cleanup = () => {
    if (stopped) return
    stopped = true
    const endAt = audioContext?.currentTime || 0
    try {
      gain.gain.cancelScheduledValues(endAt)
      gain.gain.exponentialRampToValueAtTime(0.0001, endAt + 0.18)
      oscillator.stop(endAt + 0.22)
    } catch {
      // ignore
    }
    setTimeout(() => {
      try {
        oscillator.disconnect()
        gain.disconnect()
      } catch {
        // ignore
      }
    }, 280)
    cleanupAudioStops.delete(cleanup)
  }

  registerCleanup(cleanup)
}

function stopBreathCue() {
  Array.from(cleanupAudioStops).forEach((cleanup) => cleanup())
}

async function playSoftBounce() {
  if (!settings.effectsEnabled) return
  await ensureAudioReady()
  if (!audioContext || !masterGain) return

  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(330, audioContext.currentTime)
  osc.frequency.exponentialRampToValueAtTime(250, audioContext.currentTime + 0.22)
  gain.gain.setValueAtTime(0.001, audioContext.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 0.04)
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.26)
  osc.connect(gain)
  gain.connect(masterGain)
  osc.start()
  osc.stop(audioContext.currentTime + 0.28)
}

async function playSuccessCue() {
  if (!settings.effectsEnabled) return
  await ensureAudioReady()
  if (!audioContext || !masterGain) return

  const notes = [392, 523.25, 659.25]
  notes.forEach((frequency, index) => {
    const osc = audioContext!.createOscillator()
    const gain = audioContext!.createGain()
    const startAt = audioContext!.currentTime + index * 0.12
    osc.type = 'sine'
    osc.frequency.setValueAtTime(frequency, startAt)
    osc.frequency.linearRampToValueAtTime(frequency * 1.08, startAt + 0.18)
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(0.06, startAt + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.3)
    osc.connect(gain)
    gain.connect(masterGain!)
    osc.start(startAt)
    osc.stop(startAt + 0.32)
  })
}

function speak(text: string) {
  if (!settings.effectsEnabled || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 0.9
  utterance.pitch = 1.08
  utterance.volume = Math.max(0.2, LEGACY_BACKGROUND_VOLUME / 100)
  window.speechSynthesis.speak(utterance)
}

function stopAllAudio() {
  stopBreathCue()
  gameMusicController.stopMusic()
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

function toggleMusicEnabled() {
  settings.musicEnabled = !settings.musicEnabled
}

watch(
  () => resolvedMusicProfile.value,
  (profileId) => {
    gameMusicController.setProfile(profileId)
  },
  { immediate: true },
)

watch(
  () => settings.backgroundVolume,
  (backgroundVolume) => {
    if (backgroundVolume !== LEGACY_BACKGROUND_VOLUME) {
      settings.backgroundVolume = LEGACY_BACKGROUND_VOLUME
    }
  },
)

watch(
  () => settings.musicVolume,
  (musicVolume, previousVolume) => {
    if (musicVolume === previousVolume) {
      return
    }

    if (musicVolume <= 0 && settings.musicEnabled) {
      settings.musicEnabled = false
      return
    }

    if (musicVolume > 0 && !settings.musicEnabled) {
      settings.musicEnabled = true
    }
  },
)

watch(
  () => [settings.musicEnabled, settings.musicVolume, settings.effectsEnabled] as const,
  ([musicEnabled, musicVolume, effectsEnabled]) => {
    const normalizedSettings = saveGameAudioSettings({
      musicEnabled,
      musicVolume,
      effectsEnabled,
    })

    if (settings.musicEnabled !== normalizedSettings.musicEnabled) {
      settings.musicEnabled = normalizedSettings.musicEnabled
    }
    if (settings.musicVolume !== normalizedSettings.musicVolume) {
      settings.musicVolume = normalizedSettings.musicVolume
    }
    if (settings.effectsEnabled !== normalizedSettings.effectsEnabled) {
      settings.effectsEnabled = normalizedSettings.effectsEnabled
    }

    gameMusicController.applySettings(normalizedSettings)
  },
  { immediate: true },
)

watch(
  () => props.launchContext.initialDifficulty,
  (value) => {
    difficulty.value = value
  },
)

watch(
  () => props.launchContext.difficultyLocked,
  (locked) => {
    if (locked && difficulty.value !== props.launchContext.initialDifficulty) {
      difficulty.value = props.launchContext.initialDifficulty
    }
  },
)

watch(difficulty, (value) => {
  if (difficultyLocked.value && value !== props.launchContext.initialDifficulty) {
    difficulty.value = props.launchContext.initialDifficulty
  }
})

watch(isGroupLaunch, (value) => {
  if (value && !activeSessionGroupId.value) {
    activeSessionGroupId.value = createSessionGroupId()
  }

  if (!value) {
    activeSessionGroupId.value = ''
  }
})

const audioController: EmotionGameAudioController = {
  ensureReady: ensureAudioReady,
  setProfile: (profileId) => gameMusicController.setProfile(profileId),
  setState: (state) => gameMusicController.setState(state),
  duckMusic: (mode) => gameMusicController.duckMusic(mode),
  restoreMusic: () => gameMusicController.restoreMusic(),
  stopMusic: () => gameMusicController.stopMusic(),
  dispose: () => {
    stopAllAudio()
    gameMusicController.dispose()
  },
  startAmbient,
  stopAmbient,
  startBreathCue,
  stopBreathCue,
  playSoftBounce,
  playSuccessCue,
  speak,
  stopAll: stopAllAudio,
}

async function handleOpenSystemSettings() {
  const permission = blockedPermissions.value[0]
  const electronAPI = getOptionalElectronAPI()

  if (!permission || !electronAPI?.openMediaPermissionSettings) {
    return
  }

  isOpeningSystemSettings.value = true
  try {
    const result = await electronAPI.openMediaPermissionSettings(permission)
    if (result?.platform) {
      preflightPlatform.value = result.platform
    }
  } finally {
    isOpeningSystemSettings.value = false
  }
}

function buildReturnQuery() {
  const nextQuery = { ...route.query }
  nextQuery.entry = props.launchContext.launchEntryCode
  nextQuery.module = props.launchContext.launchModuleCode
  nextQuery.studentId = String(primaryStudentId.value)
  nextQuery.studentName = primaryStudentName.value

  if (isGroupLaunch.value) {
    nextQuery.participantStudentIds = resolvedParticipantStudentIds.value.join(',')
    nextQuery.participantStudentNames = resolvedParticipantNames.value.join('|')
  } else {
    delete nextQuery.participantStudentIds
    delete nextQuery.participantStudentNames
  }

  delete nextQuery.targetPath
  delete nextQuery.subModule
  return nextQuery
}

function markRoundDirty() {
  if (!hasDirtyRound.value) {
    sessionStartedAt.value = Date.now()
  }
  hasDirtyRound.value = true
}

function getReturnLocation() {
  return {
    path: `/games/lobby/${primaryStudentId.value}`,
    query: buildReturnQuery(),
  }
}

async function handlePreflightReturn() {
  suppressLeaveAbort.value = true
  preflightState.value = 'terminal'
  cancelPermissionPreflight()
  stopAllAudio()
  await router.push(getReturnLocation())
}

function resolveSessionGroupId(payload?: EmotionGameCompletionPayload | GroupGameCompletionPayload) {
  if (typeof payload?.sessionGroupId === 'string' && payload.sessionGroupId.trim()) {
    return payload.sessionGroupId.trim()
  }

  if (isGroupLaunch.value) {
    if (!activeSessionGroupId.value) {
      activeSessionGroupId.value = createSessionGroupId()
    }
    return activeSessionGroupId.value
  }

  return null
}

function buildDefaultPerformanceData(
  status: 'completed' | 'aborted',
  exitTrigger: CustomGameExitTrigger | null,
) {
  if (status === 'completed') {
    return {
      event: exitTrigger || 'game_complete',
    }
  }

  return {
    event: exitTrigger || 'user_exit',
  }
}

function normalizeGroupPayload(
  status: 'completed' | 'aborted',
  payload?: EmotionGameCompletionPayload | GroupGameCompletionPayload,
) {
  const exitTrigger = payload?.exitTrigger || null
  const payloadParticipantIds = payload && 'participantStudentIds' in payload && Array.isArray(payload.participantStudentIds)
    ? payload.participantStudentIds
    : resolvedParticipantStudentIds.value
  const participantStudentIds = normalizeParticipantStudentIds(payloadParticipantIds)

  return {
    performanceData: payload?.performanceData || buildDefaultPerformanceData(status, exitTrigger),
    badge: payload?.badge || props.defaultBadge,
    exitTrigger,
    sessionGroupId: resolveSessionGroupId(payload),
    participantStudentIds,
  }
}

// 社交沟通游戏中文映射（与 IEPGenerator.getSocialGameName 保持一致）
const SOCIAL_GAME_NAME_MAP: Record<string, string> = {
  S01_BURGER: '合作造汉堡',
  S02_EMOTION_MIRROR: '表情猜猜乐',
  S03_STORY_SEQ: '故事接龙板',
  S04_GIFT_MATCH: '礼物分享派对',
  S05_ECHO_PARROT: '动物传声筒',
  S06_EXPRESSION_DUEL: '双人表情擂台',
}

function resolveSocialGameName(gameCode: string): string {
  return SOCIAL_GAME_NAME_MAP[gameCode] || '社交沟通训练'
}

function numOr(value: unknown, fallback: number): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return fallback
  }
  if (num < min) return min
  if (num > max) return max
  return num
}

// 把可能是 ms 或秒的时长统一换算为整数秒（NaN 安全）
function resolveDurationSeconds(performanceData: Record<string, any>, sessionDurationMs: number): number {
  const raw = performanceData.durationMs ?? performanceData.durationSec ?? performanceData.duration
  const fieldName = ['durationMs', 'durationSec', 'duration'].find(
    (key) => performanceData[key] !== undefined,
  )
  const looksLikeMs = fieldName === 'durationMs' || (numOr(raw, 0) > 10000)
  const valueMs = looksLikeMs
    ? numOr(raw, sessionDurationMs)
    : numOr(raw, sessionDurationMs / 1000) * 1000
  const seconds = Math.round((valueMs || sessionDurationMs) / 1000)
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : 0
}

/**
 * 社交沟通游戏完成后的 IEP 链路：
 * 写 training_records + report_record，然后跳 IEPReport。
 * 失败时降级：弹错 + 不抛，让外层照常回大厅。
 * 双人游戏只为 primaryStudentId 生成一份 IEP。
 */
async function runSocialIepChain(
  studentId: number,
  gameCode: CustomGameCode,
  performanceData: Record<string, any>,
  sessionDurationMs: number,
) {
  if (!studentId || studentId <= 0) {
    return false
  }

  try {
    const data = performanceData && typeof performanceData === 'object' ? performanceData : {}
    const accuracy = clampNum(data.accuracy ?? data.accuracyRate, 0, 1, 0)
    const avgResponseTimeMs = numOr(
      data.avgResponseTime ?? data.avgResponseTimeMs ?? data.reactionTime,
      0,
    )
    const durationSec = resolveDurationSeconds(data, sessionDurationMs)
    const gameName = resolveSocialGameName(gameCode)

    const gameApi = new GameTrainingAPI()
    const recordId = gameApi.saveTrainingRecord({
      student_id: studentId,
      task_id: null,
      resource_id: null,
      resource_type: 'game',
      session_type: 'game',
      entry_code: 'social-communication',
      timestamp: Date.now(),
      duration: durationSec,
      accuracy_rate: accuracy,
      avg_response_time: avgResponseTimeMs,
      raw_data: {
        gameCode,
        taskName: gameName,
        performanceData: data,
        difficulty: difficulty.value,
        durationMs: sessionDurationMs,
        moduleCode: 'social',
      },
      module_code: 'social',
    })

    const db = new DatabaseAPI()
    const students = db.query('SELECT name FROM student WHERE id = ?', [studentId])
    const studentName = students[0]?.name || String(studentId)
    const dateStamp = new Date()
    const yyyymmdd = `${dateStamp.getFullYear()}${String(dateStamp.getMonth() + 1).padStart(2, '0')}${String(dateStamp.getDate()).padStart(2, '0')}`
    const title = `社交沟通IEP报告_${studentName}_${gameCode}_${yyyymmdd}`

    db.execute(
      `INSERT INTO report_record (student_id, report_type, training_record_id, title, module_code, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [studentId, 'iep', recordId, title, 'social', new Date().toISOString()],
    )

    ElMessage.success('训练完成，正在生成 IEP 报告…')

    await router.push({
      path: '/games/report',
      query: {
        recordId: String(recordId),
        studentId: String(studentId),
        module: 'social',
        gameCode,
      },
    })

    return true
  } catch (error) {
    console.error('[GameContainer] 社交 IEP 链路失败，降级返回大厅:', error)
    ElMessage.error('报告生成失败，已返回大厅')
    return false
  }
}

async function persistTerminalState(
  status: 'completed' | 'aborted',
  payload?: EmotionGameCompletionPayload | GroupGameCompletionPayload,
) {
  if (isPersisting.value) {
    return
  }

  isPersisting.value = true

  try {
    const startedAtMs = sessionStartedAt.value ?? Date.now()

    if (isGroupLaunch.value) {
      const groupPayload = normalizeGroupPayload(status, payload)
      const sessionGroupId = groupPayload.sessionGroupId || createSessionGroupId()
      activeSessionGroupId.value = sessionGroupId

      const result = await api.persistSessionGroup({
        gameCode: props.gameCode,
        participantStudentIds: groupPayload.participantStudentIds,
        startedAt: new Date(startedAtMs).toISOString(),
        durationMs: Date.now() - startedAtMs,
        difficultyLevel: difficulty.value,
        completionStatus: status,
        performanceData: groupPayload.performanceData,
        sessionGroupId,
        exitTrigger: groupPayload.exitTrigger,
        sharedBadge: groupPayload.badge,
      })

      persistenceMessage.value = status === 'completed'
        ? `已静默保存共享训练，${result.recordIds.length} 名学生记录已同步写入`
        : `已安静保存共享中断记录，${result.recordIds.length} 名学生已同步结束`

      if (
        status === 'completed'
        && gameDefinition.value.moduleCode === ModuleCode.SOCIAL
        && primaryStudentId.value > 0
      ) {
        const startedAtMsForIep = sessionStartedAt.value ?? Date.now()
        const navigated = await runSocialIepChain(
          primaryStudentId.value,
          props.gameCode,
          groupPayload.performanceData,
          Date.now() - startedAtMsForIep,
        )
        if (navigated) {
          return
        }
      }
    } else {
      const exitTrigger = payload?.exitTrigger || null
      const result = await api.persistSession({
        studentId: primaryStudentId.value,
        gameCode: props.gameCode,
        startedAt: new Date(startedAtMs).toISOString(),
        durationMs: Date.now() - startedAtMs,
        difficultyLevel: difficulty.value,
        completionStatus: status,
        performanceData: payload?.performanceData || buildDefaultPerformanceData(status, exitTrigger),
        badge: payload?.badge || props.defaultBadge,
        exitTrigger,
        sessionGroupId: resolveSessionGroupId(payload),
        sessionParticipants: resolvedParticipantStudentIds.value,
      })

      persistenceMessage.value = status === 'completed'
        ? `已静默保存本次训练${result.badgeUnlockCount ? `，徽章累计 ${result.badgeUnlockCount} 次` : ''}`
        : '已安静保存本次中断记录'

      if (
        status === 'completed'
        && gameDefinition.value.moduleCode === ModuleCode.SOCIAL
        && primaryStudentId.value > 0
      ) {
        const startedAtMsForIep = sessionStartedAt.value ?? Date.now()
        const navigated = await runSocialIepChain(
          primaryStudentId.value,
          props.gameCode,
          payload?.performanceData || buildDefaultPerformanceData(status, exitTrigger),
          Date.now() - startedAtMsForIep,
        )
        if (navigated) {
          return
        }
      }
    }

    sessionStartedAt.value = null
    if (isGroupLaunch.value) {
      activeSessionGroupId.value = createSessionGroupId()
    }

    if (messageTimer) {
      window.clearTimeout(messageTimer)
    }
    messageTimer = window.setTimeout(() => {
      persistenceMessage.value = ''
      messageTimer = null
    }, 2200)
  } finally {
    isPersisting.value = false
  }
}

async function handleGameComplete(payload: EmotionGameCompletionPayload) {
  await persistTerminalState('completed', {
    ...payload,
    exitTrigger: payload.exitTrigger || 'game_complete',
  })
  hasDirtyRound.value = false
}

async function handleGroupGameComplete(payload: GroupGameCompletionPayload) {
  await persistTerminalState('completed', {
    ...payload,
    exitTrigger: payload.exitTrigger || 'game_complete',
  })
  hasDirtyRound.value = false
}

async function handleAbortGroupGame(reason?: CustomGameExitTrigger | GroupGameCompletionPayload) {
  const payload = typeof reason === 'string'
    ? {
        performanceData: buildDefaultPerformanceData('aborted', reason),
        exitTrigger: reason,
        participantStudentIds: resolvedParticipantStudentIds.value,
      }
    : {
        ...reason,
        exitTrigger: reason?.exitTrigger || 'system_interrupt',
        performanceData: reason?.performanceData || buildDefaultPerformanceData('aborted', reason?.exitTrigger || 'system_interrupt'),
      }

  await persistTerminalState('aborted', payload)
  hasDirtyRound.value = false
}

async function handleQuietExit() {
  suppressLeaveAbort.value = true
  isPaused.value = true
  preflightState.value = 'terminal'
  stopAllAudio()
  cancelPermissionPreflight()

  if (hasDirtyRound.value) {
    await persistTerminalState('aborted', {
      performanceData: {
        event: 'user_exit',
      },
      exitTrigger: 'user_exit',
    })
    hasDirtyRound.value = false
  }

  await router.push(getReturnLocation())
}

async function handleTeacherExit() {
  try {
    await ElMessageBox.confirm(
      '教师结束会将本局记录为“已中断 / teacher_exit”，并立即返回上一页。',
      '确认教师结束',
      {
        type: 'warning',
        confirmButtonText: '结束本局',
        cancelButtonText: '继续训练',
      },
    )
  } catch {
    return
  }

  suppressLeaveAbort.value = true
  isPaused.value = true
  preflightState.value = 'terminal'
  stopAllAudio()
  cancelPermissionPreflight()

  if (hasDirtyRound.value) {
    await persistTerminalState('aborted', {
      performanceData: {
        event: 'teacher_exit',
      },
      exitTrigger: 'teacher_exit',
    })
    hasDirtyRound.value = false
  }

  await router.push(getReturnLocation())
}

function handleSystemInterrupt() {
  if (suppressLeaveAbort.value || !hasDirtyRound.value || isPersisting.value) {
    return
  }

  isPaused.value = true
  preflightState.value = 'terminal'
  stopAllAudio()
  cancelPermissionPreflight()
  void persistTerminalState('aborted', {
    performanceData: {
      event: 'system_interrupt',
    },
    exitTrigger: 'system_interrupt',
  })
  hasDirtyRound.value = false
}

onBeforeRouteLeave(async () => {
  if (!suppressLeaveAbort.value && hasDirtyRound.value) {
    isPaused.value = true
    preflightState.value = 'terminal'
    stopAllAudio()
    cancelPermissionPreflight()
    await persistTerminalState('aborted', {
      performanceData: {
        event: 'system_interrupt',
      },
      exitTrigger: 'system_interrupt',
    })
    hasDirtyRound.value = false
  }
})

onMounted(() => {
  void runPermissionPreflight()
  window.addEventListener('pagehide', handleSystemInterrupt)
})

onBeforeUnmount(() => {
  isDisposed = true
  cancelPermissionPreflight()
  if (messageTimer) {
    window.clearTimeout(messageTimer)
  }
  window.removeEventListener('pagehide', handleSystemInterrupt)
  stopAllPermissionStreams()
  stopAllAudio()
  gameMusicController.dispose()
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(() => {
      // ignore close failures
    })
  }
})
</script>

<style scoped>
.emotion-game-shell {
  position: relative;
  min-height: 100dvh;
  height: 100dvh;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.45), transparent 38%),
    linear-gradient(180deg, #94d8ff 0%, #dff4ff 50%, #fff9e5 100%);
  box-shadow: 0 24px 48px rgba(50, 94, 133, 0.16);
}

.emotion-game-shell[data-paused='true'] :deep(*) {
  animation-play-state: paused !important;
}

.game-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
}

.quiet-exit-button,
.music-toggle-button,
.settings-button {
  min-width: 112px;
  min-height: 64px;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 700;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.quiet-exit-button {
  color: #5a3e1b;
  background: rgba(255, 248, 222, 0.96);
  box-shadow: 0 12px 24px rgba(132, 98, 42, 0.14);
}

.settings-button {
  color: #265174;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 24px rgba(68, 123, 170, 0.14);
}

.music-toggle-button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  color: #2b5b4c;
  background: rgba(240, 255, 248, 0.94);
  box-shadow: 0 12px 24px rgba(58, 112, 96, 0.14);
  text-align: left;
}

.quiet-exit-button:hover,
.music-toggle-button:hover,
.settings-button:hover {
  transform: translateY(-2px);
}

.music-toggle-button__status {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.78;
}

.music-toggle-button__action {
  font-size: 13px;
  line-height: 1.2;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.student-pill {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 64px;
  padding: 10px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 10px 24px rgba(57, 99, 145, 0.14);
}

.student-label {
  font-size: 12px;
  color: #6e87a1;
}

.student-pill strong {
  font-size: 16px;
  color: #21415f;
}

.game-stage {
  position: relative;
  min-height: 100%;
  height: 100%;
}

.permission-gate {
  display: grid;
  place-items: center;
  min-height: 100%;
  padding: 120px 24px 48px;
}

.permission-card {
  width: min(520px, 100%);
  padding: 28px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 24px 48px rgba(58, 101, 142, 0.18);
  text-align: center;
}

.permission-card h2 {
  margin: 0 0 12px;
  font-size: 28px;
  color: #24425f;
}

.permission-card p {
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: #5f7690;
}

.permission-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 84px;
  min-height: 84px;
  margin-bottom: 18px;
  border-radius: 999px;
  background: rgba(93, 169, 224, 0.12);
  color: #24557d;
  font-size: 30px;
  font-weight: 800;
}

.permission-hint {
  margin-top: 12px !important;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 247, 223, 0.92);
  color: #80622d !important;
}

.permission-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
}

.permission-tag {
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(230, 243, 255, 0.92);
  color: #34648f;
  font-size: 13px;
  font-weight: 700;
}

.permission-tag.missing {
  background: rgba(255, 238, 236, 0.96);
  color: #a44a42;
}

.permission-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
}

.permission-primary-button,
.permission-secondary-button,
.permission-ghost-button {
  min-width: 160px;
  min-height: 48px;
  padding: 0 18px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.permission-primary-button:disabled,
.permission-secondary-button:disabled,
.permission-ghost-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
  transform: none;
  box-shadow: none;
}

.permission-primary-button {
  border: none;
  color: #ffffff;
  background: linear-gradient(135deg, #3d88c9 0%, #2f5f9f 100%);
  box-shadow: 0 14px 28px rgba(55, 100, 160, 0.22);
}

.permission-secondary-button {
  border: none;
  color: #2f5f8b;
  background: rgba(228, 243, 255, 0.98);
  box-shadow: 0 12px 24px rgba(71, 126, 178, 0.14);
}

.permission-ghost-button {
  border: 1px solid rgba(56, 95, 130, 0.18);
  color: #476884;
  background: rgba(255, 255, 255, 0.9);
}

.permission-primary-button:hover:not(:disabled),
.permission-secondary-button:hover:not(:disabled),
.permission-ghost-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

:deep(.game-settings-menu) {
  padding: 0;
  border-radius: 20px;
  overflow: hidden;
}

.settings-panel {
  width: 320px;
  padding: 16px;
  background: #fffef9;
}

.settings-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px 0;
}

.settings-row + .settings-row {
  border-top: 1px solid rgba(38, 81, 116, 0.08);
}

.setting-label {
  font-size: 14px;
  font-weight: 600;
  color: #33597b;
}

.setting-lock-note {
  font-size: 12px;
  color: #8b6a2f;
}

.teacher-exit-button {
  min-height: 44px;
  border: 1px solid rgba(193, 71, 66, 0.18);
  border-radius: 14px;
  background: rgba(255, 241, 240, 0.96);
  color: #9c3d35;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.teacher-exit-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(156, 61, 53, 0.12);
}

.persistence-banner {
  position: absolute;
  left: 50%;
  bottom: 20px;
  z-index: 25;
  transform: translateX(-50%);
  padding: 12px 18px;
  border-radius: 999px;
  color: #285b54;
  background: rgba(240, 255, 248, 0.94);
  box-shadow: 0 14px 28px rgba(58, 112, 96, 0.16);
  font-size: 14px;
  font-weight: 600;
}

.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.28s ease;
}

.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 16px);
}

@media (max-width: 900px) {
  .emotion-game-shell,
  .game-stage {
    min-height: 100dvh;
    height: 100dvh;
    border-radius: 20px;
  }

  .game-toolbar {
    flex-wrap: wrap;
    gap: 12px;
    padding: 16px;
  }

  .toolbar-right {
    width: 100%;
    justify-content: space-between;
  }

  .settings-panel {
    width: min(86vw, 320px);
  }
}
</style>
