import type {
  AirConductorBeatTrajectorySegment,
  AirConductorRipplePulse,
  AirConductorRuntimeState,
  AirConductorParticleEmitter,
  AirConductorNoteParticle,
  AirConductorTrailPoint,
  ArmLiftState,
  ArmPose,
  CalibrationAccumulator,
  CalibrationResult,
  OffFrameState,
  SessionStats,
} from '@/types/air-conductor'

export const AIR_CONDUCTOR_SMOOTH_ALPHA = 0.12
export const AIR_CONDUCTOR_LIFT_THRESHOLD = 0.15
export const AIR_CONDUCTOR_COUNT_COOLDOWN_MS = 300
export const AIR_CONDUCTOR_OFFFRAME_THRESHOLD = 10
export const AIR_CONDUCTOR_OFFFRAME_RECOVERY_FRAMES = 5
export const AIR_CONDUCTOR_BILATERAL_TOLERANCE = 0.12
export const AIR_CONDUCTOR_MAX_REACH_NORMALIZER = 0.45
export const AIR_CONDUCTOR_CALIBRATION_MS = 3000
export const AIR_CONDUCTOR_COUNTDOWN_MS = 3000
export const AIR_CONDUCTOR_FINISHING_MS = 1500
export const AIR_CONDUCTOR_HARMONY_COOLDOWN_MS = 1500
export const AIR_CONDUCTOR_NOTE_RAMP_SECONDS = 0.08
export const AIR_CONDUCTOR_PARTICLE_BURST_INTERVAL_MS = 96
export const AIR_CONDUCTOR_PARTICLE_BURST_SIZE = 7
export const AIR_CONDUCTOR_PARTICLE_LIFETIME_MS = 1500
export const AIR_CONDUCTOR_TRAIL_POINT_LIFETIME_MS = 520
export const AIR_CONDUCTOR_RIPPLE_LIFETIME_MS = 820
export const AIR_CONDUCTOR_BEAT_TRAJECTORY_LIFETIME_MS = 460
export const AIR_CONDUCTOR_RIPPLE_TRIGGER_THRESHOLD = 0.78
export const AIR_CONDUCTOR_RIPPLE_MIN_RADIUS = 28
export const AIR_CONDUCTOR_PARTICLE_COLORS = [
  '#ef4444',
  '#f97316',
  '#facc15',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
] as const
export const AIR_CONDUCTOR_PARTICLE_SYMBOLS = ['♪', '♫', '♩', '♬'] as const
export const AIR_CONDUCTOR_TRAIL_COLORS = {
  left: 'rgba(56, 189, 248, 0.92)',
  right: 'rgba(168, 85, 247, 0.88)',
} as const
export const AIR_CONDUCTOR_RIPPLE_COLORS = {
  left: 'rgba(34, 211, 238, 0.72)',
  right: 'rgba(244, 114, 182, 0.7)',
} as const
export const AIR_CONDUCTOR_BEAT_TRAJECTORY_PALETTE = {
  left: {
    toneBand: 'high',
    warm: 'rgba(250, 204, 21, 0.94)',
    cool: 'rgba(56, 189, 248, 0.94)',
  },
  right: {
    toneBand: 'mid',
    warm: 'rgba(251, 146, 60, 0.92)',
    cool: 'rgba(168, 85, 247, 0.92)',
  },
} as const

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function lerp(previous: number, current: number, alpha: number): number {
  return alpha * current + (1 - alpha) * previous
}

function roundTo(value: number, precision = 1000): number {
  return Math.round(value * precision) / precision
}

export function smoothArmPose(
  previous: ArmPose | null,
  current: ArmPose,
  alpha = AIR_CONDUCTOR_SMOOTH_ALPHA,
): ArmPose {
  if (!previous) {
    return current
  }

  return {
    left: {
      x: lerp(previous.left.x, current.left.x, alpha),
      y: lerp(previous.left.y, current.left.y, alpha),
      visible: current.left.visible,
    },
    right: {
      x: lerp(previous.right.x, current.right.x, alpha),
      y: lerp(previous.right.y, current.right.y, alpha),
      visible: current.right.visible,
    },
    leftShoulder: {
      y: lerp(previous.leftShoulder.y, current.leftShoulder.y, alpha),
    },
    rightShoulder: {
      y: lerp(previous.rightShoulder.y, current.rightShoulder.y, alpha),
    },
    timestamp: current.timestamp,
  }
}

export function getRelativeArmHeight(wristY: number, shoulderY: number): number {
  return Math.max(0, shoulderY - wristY)
}

export function isArmLifted(
  wristY: number,
  shoulderY: number,
  threshold = AIR_CONDUCTOR_LIFT_THRESHOLD,
): boolean {
  return getRelativeArmHeight(wristY, shoulderY) > threshold
}

export function createCalibrationAccumulator(): CalibrationAccumulator {
  return {
    count: 0,
    leftShoulderSum: 0,
    rightShoulderSum: 0,
  }
}

export function accumulateCalibration(
  accumulator: CalibrationAccumulator,
  pose: ArmPose | null,
): CalibrationAccumulator {
  if (!pose) {
    return accumulator
  }

  return {
    count: accumulator.count + 1,
    leftShoulderSum: accumulator.leftShoulderSum + pose.leftShoulder.y,
    rightShoulderSum: accumulator.rightShoulderSum + pose.rightShoulder.y,
  }
}

export function finalizeCalibration(
  accumulator: CalibrationAccumulator,
  capturedAt: number,
): CalibrationResult | null {
  if (accumulator.count <= 0) {
    return null
  }

  return {
    leftShoulderRestY: accumulator.leftShoulderSum / accumulator.count,
    rightShoulderRestY: accumulator.rightShoulderSum / accumulator.count,
    capturedAt,
  }
}

export function createArmLiftState(): ArmLiftState {
  return {
    lifted: false,
    lastCountAt: -Infinity,
  }
}

export function updateArmLiftState(
  state: ArmLiftState,
  now: number,
  lifted: boolean,
  cooldownMs = AIR_CONDUCTOR_COUNT_COOLDOWN_MS,
): { nextState: ArmLiftState; increment: number } {
  if (lifted && !state.lifted && now - state.lastCountAt >= cooldownMs) {
    return {
      nextState: {
        lifted: true,
        lastCountAt: now,
      },
      increment: 1,
    }
  }

  if (lifted && !state.lifted) {
    return {
      nextState: {
        lifted: false,
        lastCountAt: state.lastCountAt,
      },
      increment: 0,
    }
  }

  if (!lifted && state.lifted) {
    return {
      nextState: {
        lifted: false,
        lastCountAt: state.lastCountAt,
      },
      increment: 0,
    }
  }

  return {
    nextState: {
      lifted,
      lastCountAt: state.lastCountAt,
    },
    increment: 0,
  }
}

export function createOffFrameState(): OffFrameState {
  return {
    offFrame: false,
    missingFrames: 0,
    recoveryFrames: 0,
  }
}

export function updateOffFrameState(
  state: OffFrameState,
  allVisible: boolean,
  threshold = AIR_CONDUCTOR_OFFFRAME_THRESHOLD,
  recoveryFramesRequired = AIR_CONDUCTOR_OFFFRAME_RECOVERY_FRAMES,
): OffFrameState {
  if (allVisible) {
    const recoveryFrames = state.offFrame ? state.recoveryFrames + 1 : 0
    return {
      offFrame: state.offFrame && recoveryFrames < recoveryFramesRequired,
      missingFrames: 0,
      recoveryFrames: state.offFrame && recoveryFrames < recoveryFramesRequired ? recoveryFrames : 0,
    }
  }

  const missingFrames = state.missingFrames + 1
  return {
    offFrame: state.offFrame || missingFrames >= threshold,
    missingFrames,
    recoveryFrames: 0,
  }
}

export function isPoseVisible(pose: ArmPose | null): boolean {
  return Boolean(
    pose
    && pose.left.visible
    && pose.right.visible,
  )
}

export function shouldCountBilateralCoord(
  pose: ArmPose | null,
  tolerance = AIR_CONDUCTOR_BILATERAL_TOLERANCE,
): boolean {
  if (!pose || !pose.left.visible || !pose.right.visible) {
    return false
  }

  const leftHeight = getRelativeArmHeight(pose.left.y, pose.leftShoulder.y)
  const rightHeight = getRelativeArmHeight(pose.right.y, pose.rightShoulder.y)
  return (
    isArmLifted(pose.left.y, pose.leftShoulder.y)
    && isArmLifted(pose.right.y, pose.rightShoulder.y)
    && Math.abs(leftHeight - rightHeight) < tolerance
  )
}

export function accumulateBilateralCoordSec(
  currentSec: number,
  pose: ArmPose | null,
  deltaMs: number,
): number {
  if (!shouldCountBilateralCoord(pose) || deltaMs <= 0) {
    return currentSec
  }

  return currentSec + deltaMs / 1000
}

export function calculateReachScore(
  pose: ArmPose | null,
  normalizer = AIR_CONDUCTOR_MAX_REACH_NORMALIZER,
): number {
  if (!pose || !pose.left.visible || !pose.right.visible) {
    return 0
  }

  const leftRatio = clamp(getRelativeArmHeight(pose.left.y, pose.leftShoulder.y) / normalizer, 0, 1)
  const rightRatio = clamp(getRelativeArmHeight(pose.right.y, pose.rightShoulder.y) / normalizer, 0, 1)
  return Math.round(((leftRatio + rightRatio) / 2) * 100)
}

export function updateMaxReachScore(currentMax: number, pose: ArmPose | null): number {
  return Math.max(currentMax, calculateReachScore(pose))
}

export function createSessionStats(durationSec: number): SessionStats {
  return {
    durationSec,
    leftArmExtensions: 0,
    rightArmExtensions: 0,
    bilateralCoordSec: 0,
    maxReachScore: 0,
  }
}

export function createRuntimeState(now: number): AirConductorRuntimeState {
  return {
    phase: 'idle',
    phaseStartedAt: now,
    countdownValue: 3,
    elapsedPlayingMs: 0,
  }
}

export function startRuntimePhase(
  state: AirConductorRuntimeState,
  phase: AirConductorRuntimeState['phase'],
  now: number,
): AirConductorRuntimeState {
  return {
    ...state,
    phase,
    phaseStartedAt: now,
    countdownValue: phase === 'countdown' ? 3 : state.countdownValue,
  }
}

export function getCountdownValue(phaseStartedAt: number, now: number): number {
  const remainingMs = AIR_CONDUCTOR_COUNTDOWN_MS - Math.max(0, now - phaseStartedAt)
  return clamp(Math.ceil(remainingMs / 1000), 0, 3)
}

export function shouldAutoFinish(durationSec: number, elapsedPlayingMs: number): boolean {
  return elapsedPlayingMs >= durationSec * 1000
}

export function formatAirConductorDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

export function mapArmPoseToParticleEmitters(pose: ArmPose | null): AirConductorParticleEmitter[] {
  if (!pose) {
    return []
  }

  const createEmitter = (
    hand: 'left' | 'right',
    wrist: ArmPose['left'] | ArmPose['right'],
    shoulderY: number,
  ): AirConductorParticleEmitter => ({
    hand,
    // Particle DOM stays unmirrored, so invert x here to match the mirrored video/canvas stage.
    x: roundTo(1 - wrist.x),
    y: roundTo(wrist.y),
    visible: wrist.visible,
    intensity: roundTo(clamp(getRelativeArmHeight(wrist.y, shoulderY) / AIR_CONDUCTOR_MAX_REACH_NORMALIZER, 0, 1)),
  })

  return [
    createEmitter('left', pose.left, pose.leftShoulder.y),
    createEmitter('right', pose.right, pose.rightShoulder.y),
  ]
}

export function spawnEmitterNoteParticles(
  emitters: AirConductorParticleEmitter[],
  now: number,
  nextId = 0,
): { particles: AirConductorNoteParticle[]; nextId: number } {
  const visibleEmitters = emitters.filter((emitter) => emitter.visible)
  const particles: AirConductorNoteParticle[] = []
  let idCursor = nextId

  visibleEmitters.forEach((emitter, emitterIndex) => {
    for (let index = 0; index < AIR_CONDUCTOR_PARTICLE_BURST_SIZE; index += 1) {
      const direction = emitter.hand === 'left' ? -1 : 1
      const spread = index - (AIR_CONDUCTOR_PARTICLE_BURST_SIZE - 1) / 2
      const travelWeight = 0.65 + emitter.intensity * 0.7
      particles.push({
        id: idCursor,
        hand: emitter.hand,
        x: emitter.x,
        y: emitter.y,
        driftX: roundTo(direction * (16 + spread * 10) * travelWeight, 100),
        driftY: roundTo(-(68 + Math.abs(spread) * 9 + emitter.intensity * 24), 100),
        rotation: roundTo(direction * (8 + spread * 5), 100),
        scale: roundTo(0.9 + emitter.intensity * 0.55 + Math.abs(spread) * 0.05, 1000),
        opacity: roundTo(0.48 + emitter.intensity * 0.42, 1000),
        color: AIR_CONDUCTOR_PARTICLE_COLORS[(index + emitterIndex * 3) % AIR_CONDUCTOR_PARTICLE_COLORS.length]!,
        symbol: AIR_CONDUCTOR_PARTICLE_SYMBOLS[(index + emitterIndex * 2) % AIR_CONDUCTOR_PARTICLE_SYMBOLS.length]!,
        bornAt: now,
        expiresAt: now + AIR_CONDUCTOR_PARTICLE_LIFETIME_MS,
        delayMs: emitterIndex * 28 + index * 18,
      })
      idCursor += 1
    }
  })

  return {
    particles,
    nextId: idCursor,
  }
}

export function pruneExpiredNoteParticles(
  particles: AirConductorNoteParticle[],
  now: number,
): AirConductorNoteParticle[] {
  return particles.filter((particle) => particle.expiresAt > now)
}

export function createConductorTrailFrame(
  emitters: AirConductorParticleEmitter[],
  now: number,
  nextId = 0,
): { points: AirConductorTrailPoint[]; nextId: number } {
  const visibleEmitters = emitters.filter((emitter) => emitter.visible)
  const points: AirConductorTrailPoint[] = []
  let idCursor = nextId

  visibleEmitters.forEach((emitter) => {
    points.push({
      id: idCursor,
      hand: emitter.hand,
      x: emitter.x,
      y: emitter.y,
      radius: roundTo(8 + emitter.intensity * 18, 100),
      opacity: roundTo(0.18 + emitter.intensity * 0.48, 1000),
      glowSize: roundTo(18 + emitter.intensity * 28, 100),
      color: AIR_CONDUCTOR_TRAIL_COLORS[emitter.hand],
      bornAt: now,
      expiresAt: now + AIR_CONDUCTOR_TRAIL_POINT_LIFETIME_MS,
    })
    idCursor += 1
  })

  return {
    points,
    nextId: idCursor,
  }
}

export function pruneExpiredTrailPoints(
  points: AirConductorTrailPoint[],
  now: number,
): AirConductorTrailPoint[] {
  return points.filter((point) => point.expiresAt > now)
}

export function spawnConductorRipples(
  emitters: AirConductorParticleEmitter[],
  now: number,
  nextId = 0,
): { ripples: AirConductorRipplePulse[]; nextId: number } {
  const ripples: AirConductorRipplePulse[] = []
  let idCursor = nextId

  emitters
    .filter((emitter) => emitter.visible && emitter.intensity >= AIR_CONDUCTOR_RIPPLE_TRIGGER_THRESHOLD)
    .forEach((emitter) => {
      ripples.push({
        id: idCursor,
        hand: emitter.hand,
        x: emitter.x,
        y: emitter.y,
        radius: roundTo(AIR_CONDUCTOR_RIPPLE_MIN_RADIUS + emitter.intensity * 26, 100),
        strength: roundTo(emitter.intensity, 1000),
        color: AIR_CONDUCTOR_RIPPLE_COLORS[emitter.hand],
        bornAt: now,
        expiresAt: now + AIR_CONDUCTOR_RIPPLE_LIFETIME_MS,
      })
      idCursor += 1
    })

  return {
    ripples,
    nextId: idCursor,
  }
}

export function pruneExpiredRipples(
  ripples: AirConductorRipplePulse[],
  now: number,
): AirConductorRipplePulse[] {
  return ripples.filter((ripple) => ripple.expiresAt > now)
}

export function createBeatTrajectorySegments(
  previousEmitters: AirConductorParticleEmitter[],
  currentEmitters: AirConductorParticleEmitter[],
  now: number,
  nextId = 0,
): { segments: AirConductorBeatTrajectorySegment[]; nextId: number } {
  const previousByHand = new Map(previousEmitters.map((emitter) => [emitter.hand, emitter]))
  const segments: AirConductorBeatTrajectorySegment[] = []
  let idCursor = nextId

  currentEmitters
    .filter((emitter) => emitter.visible)
    .forEach((current) => {
      const previous = previousByHand.get(current.hand)
      if (!previous?.visible) {
        return
      }

      const vectorX = roundTo(current.x - previous.x)
      const vectorY = roundTo(current.y - previous.y)
      const movement = Math.abs(vectorX) + Math.abs(vectorY)
      if (movement < 0.01) {
        return
      }

      const palette = AIR_CONDUCTOR_BEAT_TRAJECTORY_PALETTE[current.hand]
      segments.push({
        id: idCursor,
        hand: current.hand,
        toneBand: palette.toneBand,
        startX: previous.x,
        startY: previous.y,
        endX: current.x,
        endY: current.y,
        vectorX,
        vectorY,
        strokeWidth: roundTo(3 + current.intensity * 7, 100),
        opacity: roundTo(0.24 + current.intensity * 0.56, 1000),
        colorWarm: palette.warm,
        colorCool: palette.cool,
        bornAt: now,
        expiresAt: now + AIR_CONDUCTOR_BEAT_TRAJECTORY_LIFETIME_MS,
      })
      idCursor += 1
    })

  return {
    segments,
    nextId: idCursor,
  }
}

export function pruneExpiredBeatTrajectorySegments(
  segments: AirConductorBeatTrajectorySegment[],
  now: number,
): AirConductorBeatTrajectorySegment[] {
  return segments.filter((segment) => segment.expiresAt > now)
}
