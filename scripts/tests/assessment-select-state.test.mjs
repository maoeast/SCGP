import test from 'node:test'
import assert from 'node:assert/strict'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)

function loadAssessmentSelectState() {
  return jiti('../../src/views/assessment/assessment-select-state.ts')
}

test('reconcileAssessmentActiveTab falls back to the first available tab before user interaction', () => {
  const { reconcileAssessmentActiveTab } = loadAssessmentSelectState()

  const nextTab = reconcileAssessmentActiveTab({
    currentTab: 'sensory-integration',
    hasUserSelectedTab: false,
    panels: [
      { id: 'sensory-integration', count: 0 },
      { id: 'emotional-regulation', count: 2 },
      { id: 'social-communication', count: 1 },
    ],
  })

  assert.equal(nextTab, 'emotional-regulation')
})

test('reconcileAssessmentActiveTab preserves an empty tab after explicit user selection', () => {
  const { reconcileAssessmentActiveTab } = loadAssessmentSelectState()

  const nextTab = reconcileAssessmentActiveTab({
    currentTab: 'soothing-aids',
    hasUserSelectedTab: true,
    panels: [
      { id: 'sensory-integration', count: 3 },
      { id: 'soothing-aids', count: 0 },
    ],
  })

  assert.equal(nextTab, 'soothing-aids')
})

test('isAssessmentCardActivationKey recognizes keyboard activation keys', () => {
  const { isAssessmentCardActivationKey } = loadAssessmentSelectState()

  assert.equal(isAssessmentCardActivationKey('Enter'), true)
  assert.equal(isAssessmentCardActivationKey(' '), true)
  assert.equal(isAssessmentCardActivationKey('Tab'), false)
})
