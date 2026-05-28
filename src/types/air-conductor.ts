export interface ArmPose {
  left: { x: number; y: number; visible: boolean }
  right: { x: number; y: number; visible: boolean }
  leftShoulder: { y: number }
  rightShoulder: { y: number }
  timestamp: number
}

export type AirConductorParticleHand = 'left' | 'right'

export interface AirConductorParticleEmitter {
  hand: AirConductorParticleHand
  x: number
  y: number
  visible: boolean
  intensity: number
}

export interface AirConductorNoteParticle {
  id: number
  hand: AirConductorParticleHand
  x: number
  y: number
  driftX: number
  driftY: number
  rotation: number
  scale: number
  opacity: number
  color: string
  symbol: string
  bornAt: number
  expiresAt: number
  delayMs: number
}

export interface AirConductorTrailPoint {
  id: number
  hand: AirConductorParticleHand
  x: number
  y: number
  radius: number
  opacity: number
  glowSize: number
  color: string
  bornAt: number
  expiresAt: number
}

export interface AirConductorRipplePulse {
  id: number
  hand: AirConductorParticleHand
  x: number
  y: number
  radius: number
  strength: number
  color: string
  bornAt: number
  expiresAt: number
}

export type AirConductorToneBand = 'high' | 'mid'

export interface AirConductorBeatTrajectorySegment {
  id: number
  hand: AirConductorParticleHand
  toneBand: AirConductorToneBand
  startX: number
  startY: number
  endX: number
  endY: number
  vectorX: number
  vectorY: number
  strokeWidth: number
  opacity: number
  colorWarm: string
  colorCool: string
  bornAt: number
  expiresAt: number
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
