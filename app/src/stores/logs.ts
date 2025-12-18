import { defineStore } from 'pinia'
import { apiClient } from 'src/services/apiClient'
import { tailLogs } from 'src/generated/api'

export type LogsStoreStatus = 'idle' | 'polling'
export type LogFormat = 'text' | 'json'

export interface LogsContextState {
  logsText: string
  loading: boolean
  error: string | null
  format: LogFormat
  lines: number
  autoRefresh: boolean
  pollIntervalSeconds: number
  status: LogsStoreStatus
}

interface LogsStoreState {
  contexts: Record<string, LogsContextState>
}

const pollHandles = new Map<string, number>()

const createDefaultContextState = (): LogsContextState => ({
  logsText: '',
  loading: false,
  error: null,
  format: 'text',
  lines: 500,
  autoRefresh: false,
  pollIntervalSeconds: 2,
  status: 'idle'
})

export const useLogsStore = defineStore('logs', {
  state: (): LogsStoreState => ({
    contexts: {}
  }),
  getters: {
    getContext: (state) => (key: string) => state.contexts[key] ?? null
  },
  actions: {
    ensureContext(key: string, initial?: Partial<LogsContextState>) {
      if (!this.contexts[key]) {
        this.contexts[key] = {
          ...createDefaultContextState(),
          ...(initial ?? {})
        }
      }
      return this.contexts[key]
    },
    stopPolling(key: string) {
      const handle = pollHandles.get(key)
      if (handle !== undefined) {
        window.clearInterval(handle)
        pollHandles.delete(key)
      }

      const ctx = this.ensureContext(key)
      ctx.status = 'idle'
    },
    startPolling(key: string) {
      this.stopPolling(key)

      const ctx = this.ensureContext(key)
      const handle = window.setInterval(() => {
        void this.load(key)
      }, ctx.pollIntervalSeconds * 1000)
      pollHandles.set(key, handle)
      ctx.status = 'polling'
    },
    async load(key: string) {
      const ctx = this.ensureContext(key)
      ctx.loading = true
      ctx.error = null

      try {
        const result = await tailLogs({
          client: apiClient,
          parseAs: 'text',
          query: {
            format: ctx.format,
            lines: ctx.lines
          }
        })

        ctx.logsText = result as unknown as string
      } catch (error) {
        ctx.error = 'Failed to load logs'
        throw error
      } finally {
        ctx.loading = false
      }
    }
  }
})
