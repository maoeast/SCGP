export interface ConfirmedLogoutHandlers {
  confirm: () => Promise<unknown>
  logout: () => void
  navigateToLogin: () => unknown | Promise<unknown>
}

export async function performConfirmedLogout(
  handlers: ConfirmedLogoutHandlers,
): Promise<boolean> {
  try {
    await handlers.confirm()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return false
    }

    throw error
  }

  handlers.logout()
  await handlers.navigateToLogin()
  return true
}

export interface LoginFocusRecoveryOptions {
  delays?: readonly number[]
  scheduleTimeout?: (callback: () => void, delay: number) => number
}

const DEFAULT_LOGIN_FOCUS_DELAYS = [0, 80, 160, 320, 640] as const

export function scheduleLoginFocusRecovery(
  attemptFocus: () => boolean,
  options: LoginFocusRecoveryOptions = {},
): number[] {
  const delays = options.delays ?? DEFAULT_LOGIN_FOCUS_DELAYS
  const scheduleTimeout = options.scheduleTimeout ?? ((callback: () => void, delay: number) => window.setTimeout(callback, delay))
  let recovered = false

  return delays.map((delay) => scheduleTimeout(() => {
    if (recovered) {
      return
    }

    recovered = attemptFocus()
  }, delay))
}

export function cancelLoginFocusRecovery(
  timerIds: readonly number[],
  clearTimeoutImpl: (timerId: number) => void = (timerId) => window.clearTimeout(timerId),
): void {
  timerIds.forEach((timerId) => {
    clearTimeoutImpl(timerId)
  })
}
