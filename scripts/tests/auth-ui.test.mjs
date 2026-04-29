import test from 'node:test'
import assert from 'node:assert/strict'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)

function loadAuthUi() {
  return jiti('../../src/utils/auth-ui.ts')
}

test('performConfirmedLogout logs out and navigates after confirmation resolves', async () => {
  const { performConfirmedLogout } = loadAuthUi()
  const events = []

  const confirmed = await performConfirmedLogout({
    confirm: async () => {
      events.push('confirm')
    },
    logout: () => {
      events.push('logout')
    },
    navigateToLogin: async () => {
      events.push('navigate')
    },
  })

  assert.equal(confirmed, true)
  assert.deepEqual(events, ['confirm', 'logout', 'navigate'])
})

test('performConfirmedLogout stops cleanly when confirmation is cancelled', async () => {
  const { performConfirmedLogout } = loadAuthUi()
  const events = []

  const confirmed = await performConfirmedLogout({
    confirm: async () => {
      events.push('confirm')
      throw 'cancel'
    },
    logout: () => {
      events.push('logout')
    },
    navigateToLogin: async () => {
      events.push('navigate')
    },
  })

  assert.equal(confirmed, false)
  assert.deepEqual(events, ['confirm'])
})

test('scheduleLoginFocusRecovery keeps retrying until a focus attempt succeeds', () => {
  const { scheduleLoginFocusRecovery } = loadAuthUi()
  const scheduled = []
  let attempts = 0

  scheduleLoginFocusRecovery(
    () => {
      attempts += 1
      return attempts >= 2
    },
    {
      delays: [0, 80, 160],
      scheduleTimeout: (callback, delay) => {
        scheduled.push({ callback, delay })
        return scheduled.length
      },
    },
  )

  assert.deepEqual(
    scheduled.map((entry) => entry.delay),
    [0, 80, 160],
  )

  scheduled[0].callback()
  assert.equal(attempts, 1)

  scheduled[1].callback()
  assert.equal(attempts, 2)

  scheduled[2].callback()
  assert.equal(attempts, 2)
})

test('cancelLoginFocusRecovery clears every scheduled timer', () => {
  const { cancelLoginFocusRecovery } = loadAuthUi()
  const cleared = []

  cancelLoginFocusRecovery([11, 22, 33], (timerId) => {
    cleared.push(timerId)
  })

  assert.deepEqual(cleared, [11, 22, 33])
})
