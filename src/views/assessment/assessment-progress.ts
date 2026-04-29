import type { ScaleAnswer } from '../../types/assessment'
import type { CBCLSocialCompetenceData } from '../../types/cbcl'

export type AssessmentProgressPhase = 'welcome' | 'social' | 'assessing'
export type AssessmentProgressCbclStep = 'social' | 'behavior'

export interface AssessmentProgressStorageKeyInput {
  scaleCode: string
  studentId: number | string
}

export interface AssessmentProgressSnapshotPayload {
  phase: AssessmentProgressPhase
  currentIndex: number
  answers: Record<string, ScaleAnswer>
  startTime: number
  metadata?: Record<string, any>
  cbclStep?: AssessmentProgressCbclStep
  socialFormData?: CBCLSocialCompetenceData | null
  currentPage?: number
}

export interface AssessmentProgressSnapshot extends AssessmentProgressSnapshotPayload {
  version: 1
  savedAt: number
}

export interface AssessmentProgressResolvedState {
  phase: AssessmentProgressPhase
  currentIndex: number
  answers: Record<string, ScaleAnswer>
  startTime: number
  metadata?: Record<string, any>
  cbclStep: AssessmentProgressCbclStep
  socialFormData: CBCLSocialCompetenceData | null
  currentPage: number
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const ASSESSMENT_PROGRESS_STORAGE_KEY = 'assessment_progress'
const ASSESSMENT_PROGRESS_VERSION = 1

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isProgressPhase(value: unknown): value is AssessmentProgressPhase {
  return value === 'welcome' || value === 'social' || value === 'assessing'
}

function isCbclStep(value: unknown): value is AssessmentProgressCbclStep {
  return value === 'social' || value === 'behavior'
}

function clampInteger(value: unknown, min: number, max: number): number {
  const normalized = Number(value)
  if (!Number.isInteger(normalized)) return min
  if (normalized < min) return min
  if (normalized > max) return max
  return normalized
}

function parseSnapshot(value: unknown): AssessmentProgressSnapshot | null {
  if (!isRecord(value)) return null

  if (value.version === undefined) {
    return parseLegacySnapshot(value)
  }

  if (value.version !== ASSESSMENT_PROGRESS_VERSION) return null
  if (!isProgressPhase(value.phase)) return null
  if (!Number.isInteger(value.currentIndex) || value.currentIndex < 0) return null
  if (!isRecord(value.answers)) return null
  if (!Number.isFinite(value.startTime) || value.startTime <= 0) return null

  if (value.metadata !== undefined && !isRecord(value.metadata)) return null
  if (value.cbclStep !== undefined && !isCbclStep(value.cbclStep)) return null
  if (value.socialFormData !== undefined && value.socialFormData !== null && !isRecord(value.socialFormData)) {
    return null
  }
  if (value.currentPage !== undefined && (!Number.isInteger(value.currentPage) || value.currentPage <= 0)) {
    return null
  }
  if (!Number.isFinite(value.savedAt) || value.savedAt <= 0) return null

  return {
    version: ASSESSMENT_PROGRESS_VERSION,
    savedAt: value.savedAt,
    phase: value.phase,
    currentIndex: value.currentIndex,
    answers: value.answers as Record<string, ScaleAnswer>,
    startTime: value.startTime,
    metadata: value.metadata,
    cbclStep: value.cbclStep,
    socialFormData: value.socialFormData as CBCLSocialCompetenceData | null | undefined,
    currentPage: value.currentPage,
  }
}

function parseLegacySnapshot(value: Record<string, any>): AssessmentProgressSnapshot | null {
  if (!Number.isInteger(value.currentIndex) || value.currentIndex < 0) return null
  if (!isRecord(value.answers)) return null
  if (!Number.isFinite(value.startTime) || value.startTime <= 0) return null
  if (value.metadata !== undefined && !isRecord(value.metadata)) return null

  return {
    version: ASSESSMENT_PROGRESS_VERSION,
    savedAt: value.startTime,
    phase: 'assessing',
    currentIndex: value.currentIndex,
    answers: value.answers as Record<string, ScaleAnswer>,
    startTime: value.startTime,
    metadata: value.metadata,
    cbclStep: 'behavior',
    socialFormData: null,
    currentPage: 1,
  }
}

export function getAssessmentProgressStorageKey({
  scaleCode,
  studentId,
}: AssessmentProgressStorageKeyInput): string {
  return `${ASSESSMENT_PROGRESS_STORAGE_KEY}_${scaleCode}_${studentId}`
}

export function createAssessmentProgressSnapshot(
  payload: AssessmentProgressSnapshotPayload,
): AssessmentProgressSnapshot {
  return {
    version: ASSESSMENT_PROGRESS_VERSION,
    savedAt: Date.now(),
    ...payload,
  }
}

export function saveAssessmentProgressSnapshot(
  storage: StorageLike,
  keyInput: AssessmentProgressStorageKeyInput,
  payload: AssessmentProgressSnapshotPayload,
): AssessmentProgressSnapshot {
  const snapshot = createAssessmentProgressSnapshot(payload)
  storage.setItem(
    getAssessmentProgressStorageKey(keyInput),
    JSON.stringify(snapshot),
  )
  return snapshot
}

export function readAssessmentProgressSnapshot(
  storage: StorageLike,
  keyInput: AssessmentProgressStorageKeyInput,
): AssessmentProgressSnapshot | null {
  const raw = storage.getItem(getAssessmentProgressStorageKey(keyInput))
  if (!raw) return null

  try {
    return parseSnapshot(JSON.parse(raw))
  } catch {
    return null
  }
}

export function clearAssessmentProgressSnapshot(
  storage: StorageLike,
  keyInput: AssessmentProgressStorageKeyInput,
): void {
  storage.removeItem(getAssessmentProgressStorageKey(keyInput))
}

export function resolveAssessmentProgressSnapshot({
  snapshot,
  questionCount,
  pageSize,
  fallbackStartTime = Date.now(),
}: {
  snapshot: AssessmentProgressSnapshot
  questionCount: number
  pageSize: number
  fallbackStartTime?: number
}): AssessmentProgressResolvedState {
  const safeQuestionCount = Math.max(0, questionCount)
  const maxIndex = safeQuestionCount > 0 ? safeQuestionCount - 1 : 0
  const currentIndex = clampInteger(snapshot.currentIndex, 0, maxIndex)
  const totalPages = Math.max(1, Math.ceil(Math.max(safeQuestionCount, 1) / Math.max(pageSize, 1)))
  const currentPage = clampInteger(
    snapshot.currentPage ?? Math.floor(currentIndex / Math.max(pageSize, 1)) + 1,
    1,
    totalPages,
  )

  return {
    phase: snapshot.phase,
    currentIndex,
    answers: snapshot.answers,
    startTime: snapshot.startTime > 0 ? snapshot.startTime : fallbackStartTime,
    metadata: snapshot.metadata,
    cbclStep: snapshot.cbclStep ?? 'social',
    socialFormData: snapshot.socialFormData ?? null,
    currentPage,
  }
}
