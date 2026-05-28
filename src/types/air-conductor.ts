export interface ArmPose {
  left: { x: number; y: number; visible: boolean }
  right: { x: number; y: number; visible: boolean }
  leftShoulder: { y: number }
  rightShoulder: { y: number }
  timestamp: number
}

export type GamePhase =
  | 'idle'
  | 'calibrating'
  | 'countdown'
  | 'playing'
  | 'paused'
  | 'finishing'
  | 'done'

export interface SessionStats {
  durationSec: number
  leftArmExtensions: number
  rightArmExtensions: number
  bilateralCoordSec: number
  maxReachScore: number
}

export interface TrainingRecord {
  studentId: string
  durationSec: number
  leftArmExtensions: number
  rightArmExtensions: number
  bilateralCoordSec: number
  maxReachScore: number
  createdAt: string
}

export interface CalibrationResult {
  leftShoulderRestY: number
  rightShoulderRestY: number
  capturedAt: number
}

export interface CalibrationAccumulator {
  count: number
  leftShoulderSum: number
  rightShoulderSum: number
}

export interface ArmLiftState {
  lifted: boolean
  lastCountAt: number
}

export interface OffFrameState {
  offFrame: boolean
  missingFrames: number
  recoveryFrames: number
}

export interface AirConductorRuntimeState {
  phase: GamePhase
  phaseStartedAt: number
  countdownValue: number
  elapsedPlayingMs: number
}
