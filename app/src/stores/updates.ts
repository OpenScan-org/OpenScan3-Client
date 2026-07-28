import { defineStore } from 'pinia'
import type * as latestSdk from 'src/generated/api/latest/sdk.gen'
import type { UpdateStatusResponse } from 'src/generated/api/latest/types.gen'
import { apiClient, getApiSdk, resolveApiTarget } from 'src/services/apiClient'

const UPDATE_STATUS_REFRESH_MS = 30 * 60 * 1000

type UpdateSdk = Pick<typeof latestSdk, 'getUpdateStatus'>

let refreshTimer: ReturnType<typeof window.setInterval> | null = null

function unwrapResponse<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T }).data
  }
  return response as T
}

export const useUpdatesStore = defineStore('updates', {
  state: () => ({
    updatesAvailable: false,
    loading: false,
    lastFetchedAt: null as number | null
  }),

  actions: {
    applyStatus(status: UpdateStatusResponse) {
      this.updatesAvailable = status.status === 'updates_available'
      this.lastFetchedAt = Date.now()
    },

    async refresh() {
      if (this.loading) {
        return
      }

      if (resolveApiTarget() === 'v0_8') {
        this.updatesAvailable = false
        return
      }

      this.loading = true
      try {
        const sdk = getApiSdk() as UpdateSdk
        const status = unwrapResponse<UpdateStatusResponse>(
          await sdk.getUpdateStatus({ client: apiClient })
        )
        this.applyStatus(status)
      } catch (error) {
        // Keep the most recently known state if the device is temporarily unavailable.
        console.debug('Could not refresh update availability.', error)
      } finally {
        this.loading = false
      }
    },

    startPolling() {
      if (refreshTimer) {
        return
      }

      void this.refresh()
      refreshTimer = window.setInterval(() => {
        void this.refresh()
      }, UPDATE_STATUS_REFRESH_MS)
    },

    stopPolling() {
      if (!refreshTimer) {
        return
      }

      window.clearInterval(refreshTimer)
      refreshTimer = null
    }
  }
})
