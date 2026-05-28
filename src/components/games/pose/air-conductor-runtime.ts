import type {
  AirConductorRuntimeState,
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function lerp(previous: number, current: number, alpha: number): number {
  return alpha * current + (1 - alpha) * previous
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
