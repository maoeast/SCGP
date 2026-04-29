import test from 'node:test'
import assert from 'node:assert/strict'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)

function loadAssessmentProgress() {
  return jiti('../../src/views/assessment/assessment-progress.ts')
}

function createStorage() {
  const data = new Map()

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null
    },
    setItem(key, value) {
      data.set(key, String(value))
    },
    removeItem(key) {
      data.delete(key)
    },
  }
}

test('saveAssessmentProgressSnapshot persists all resume fields and readAssessmentProgressSnapshot restores them', () => {
  const {
    getAssessmentProgressStorageKey,
    saveAssessmentProgressSnapshot,
    readAssessmentProgressSnapshot,
  } = loadAssessmentProgress()

  const storage = createStorage()
  const keyInput = { scaleCode: 'cbcl', studentId: 42 }
  const payload = {
    phase: 'social',
    currentIndex: 12,
    answers: {
      '56': {
        questionId: 56,
        value: 1,
        score: 1,
        timestamp: 1710000000000,
        responseTime: 2300,
      },
    },
    startTime: 1710000000000,
    metadata: {
      startIndex: 0,
      totalQuestions: 113,
      lastAnswerTime: 1710000002300,
    },
    cbclStep: 'behavior',
    socialFormData: {
      reporter: 'mother',
      I_count: 2,
      II_count: 1,
    },
    currentPage: 4,
  }

  saveAssessmentProgressSnapshot(storage, keyInput, payload)

  const snapshot = readAssessmentProgressSnapshot(storage, keyInput)
  assert.ok(snapshot)
  assert.equal(getAssessmentProgressStorageKey(keyInput), 'assessment_progress_cbcl_42')
  assert.equal(snapshot.version, 1)
  assert.equal(snapshot.phase, 'social')
  assert.equal(snapshot.currentIndex, 12)
  assert.deepEqual(snapshot.answers, payload.answers)
  assert.equal(snapshot.startTime, payload.startTime)
  assert.deepEqual(snapshot.metadata, payload.metadata)
  assert.equal(snapshot.cbclStep, 'behavior')
  assert.deepEqual(snapshot.socialFormData, payload.socialFormData)
  assert.equal(snapshot.currentPage, 4)
  assert.equal(typeof snapshot.savedAt, 'number')
})

test('resolveAssessmentProgressSnapshot clamps restore state to current question list', () => {
  const { resolveAssessmentProgressSnapshot } = loadAssessmentProgress()

  const restored = resolveAssessmentProgressSnapshot({
    snapshot: {
      version: 1,
      savedAt: 1710000009999,
      phase: 'assessing',
      currentIndex: 99,
      answers: {},
      startTime: 1710000000000,
      metadata: { totalQuestions: 88 },
      cbclStep: 'behavior',
      socialFormData: null,
      currentPage: 0,
    },
    questionCount: 18,
    pageSize: 10,
  })

  assert.equal(restored.phase, 'assessing')
  assert.equal(restored.currentIndex, 17)
  assert.equal(restored.currentPage, 1)
  assert.equal(restored.cbclStep, 'behavior')
})

test('readAssessmentProgressSnapshot returns null for malformed payloads', () => {
  const {
    getAssessmentProgressStorageKey,
    readAssessmentProgressSnapshot,
  } = loadAssessmentProgress()

  const storage = createStorage()
  const keyInput = { scaleCode: 'sm', studentId: 7 }
  storage.setItem(
    getAssessmentProgressStorageKey(keyInput),
    JSON.stringify({
      version: 1,
      phase: 'complete',
      currentIndex: 'bad',
    }),
  )

  assert.equal(readAssessmentProgressSnapshot(storage, keyInput), null)
})

test('readAssessmentProgressSnapshot upgrades the legacy saveProgress payload shape', () => {
  const {
    getAssessmentProgressStorageKey,
    readAssessmentProgressSnapshot,
  } = loadAssessmentProgress()

  const storage = createStorage()
  const keyInput = { scaleCode: 'sm', studentId: 9 }
  storage.setItem(
    getAssessmentProgressStorageKey(keyInput),
    JSON.stringify({
      currentIndex: 6,
      answers: {
        '101': {
          questionId: 101,
          value: 1,
          score: 1,
          timestamp: 1710000000000,
        },
      },
      startTime: 1710000000000,
      metadata: {
        startIndex: 5,
        startStage: 2,
      },
    }),
  )

  const snapshot = readAssessmentProgressSnapshot(storage, keyInput)
  assert.ok(snapshot)
  assert.equal(snapshot.version, 1)
  assert.equal(snapshot.phase, 'assessing')
  assert.equal(snapshot.currentIndex, 6)
  assert.deepEqual(snapshot.metadata, {
    startIndex: 5,
    startStage: 2,
  })
})

test('clearAssessmentProgressSnapshot removes saved snapshot', () => {
  const {
    saveAssessmentProgressSnapshot,
    readAssessmentProgressSnapshot,
    clearAssessmentProgressSnapshot,
  } = loadAssessmentProgress()

  const storage = createStorage()
  const keyInput = { scaleCode: 'weefim', studentId: 3 }

  saveAssessmentProgressSnapshot(storage, keyInput, {
    phase: 'welcome',
    currentIndex: 0,
    answers: {},
    startTime: 1710000000000,
    metadata: { startIndex: 0, totalQuestions: 18 },
    cbclStep: 'social',
    socialFormData: null,
    currentPage: 1,
  })

  assert.ok(readAssessmentProgressSnapshot(storage, keyInput))
  clearAssessmentProgressSnapshot(storage, keyInput)
  assert.equal(readAssessmentProgressSnapshot(storage, keyInput), null)
})
