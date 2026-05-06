import { apiClient, getApiSdk } from 'src/services/apiClient'

type WakeupOptions = {
  minIntervalMs?: number
}

export function useDeviceWakeup(options: WakeupOptions = {}) {
  const minIntervalMs = options.minIntervalMs ?? 400
  let lastWakeupAt = 0
  let wakeupInFlight: Promise<void> | null = null

  const wakeUpDevice = async () => {
    const now = Date.now()
    if (now - lastWakeupAt < minIntervalMs) {
      return
    }
    if (wakeupInFlight) {
      return wakeupInFlight
    }

    lastWakeupAt = now
    const sdk = getApiSdk() as { wakeupDevice?: (args?: { client: typeof apiClient }) => Promise<unknown> }
    if (typeof sdk.wakeupDevice !== 'function') {
      return
    }

    wakeupInFlight = (async () => {
      try {
        await sdk.wakeupDevice({ client: apiClient })
      } catch (error) {
        console.error('Device wakeup call failed.', error)
      } finally {
        wakeupInFlight = null
      }
    })()

    return wakeupInFlight
  }

  return {
    wakeUpDevice
  }
}
