import { defineStore } from 'pinia'
import { useApiConfigStore, buildWebSocketUrl } from './apiConfig'
import { apiClient } from 'src/services/apiClient'
import { getDeviceInfo, type DeviceStatusResponse } from 'src/generated/api'
import { useCameraStore } from './camera'

export type DeviceStoreStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

interface DeviceStatusMessage {
  type: string
  device?: DeviceStatusResponse
  changed?: string[]
}

interface DeviceStoreState {
  device: DeviceStatusResponse | null
  lastChanged: string[] | null
  lastHeartbeat: number | null
  status: DeviceStoreStatus
  error: string | null
  needsSetup: boolean
  hasConnectionIssue: boolean
}

let socket: WebSocket | null = null
let connectPromise: Promise<void> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let allowReconnect = true

export const useDeviceStore = defineStore('device', {
  state: (): DeviceStoreState => ({
    device: null,
    lastChanged: null,
    lastHeartbeat: null,
    status: 'idle',
    error: null,
    needsSetup: false,
    hasConnectionIssue: false
  }),
  getters: {
    isReady: (state) => state.status === 'open' && !!state.device,
    cameras: (state) => state.device?.cameras ?? {},
    motors: (state) => state.device?.motors ?? {},
    lights: (state) => state.device?.lights ?? {},
    getCamera: (state) => (name: string) => state.device?.cameras?.[name] ?? null,
    getMotor: (state) => (name: string) => state.device?.motors?.[name] ?? null,
    getLight: (state) => (name: string) => state.device?.lights?.[name] ?? null
  },
  actions: {
    clearReconnectTimer() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    },
    scheduleReconnect() {
      if (!allowReconnect || reconnectTimer || this.status === 'connecting') {
        return
      }

      reconnectAttempts += 1
      const delay = Math.min(1000 * reconnectAttempts, 10000)

      reconnectTimer = setTimeout(async () => {
        reconnectTimer = null
        if (!allowReconnect || this.status === 'open' || this.status === 'connecting') {
          return
        }

        try {
          await this.connect()
          this.hasConnectionIssue = false
        } catch (error) {
          console.warn('Device websocket reconnect failed, retrying...', error)
          this.hasConnectionIssue = true
          this.scheduleReconnect()
        }
      }, delay)
    },
    async ensureConnected() {
      if (this.status === 'open') {
        return
      }

      try {
        await this.connect()
        this.hasConnectionIssue = false
      } catch (error) {
        this.hasConnectionIssue = true
        throw error
      }
    },
    async connect() {
      if (this.status === 'open') {
        return
      }

      if (connectPromise) {
        return connectPromise
      }

      const apiConfigStore = useApiConfigStore()
      const wsUrl = buildWebSocketUrl(apiConfigStore.baseURL, 'device')

      this.status = 'connecting'
      this.error = null
      allowReconnect = true

      connectPromise = new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl)
        socket = ws
        let settled = false

        ws.onopen = () => {
          if (socket !== ws) {
            return
          }
          settled = true
          this.status = 'open'
          reconnectAttempts = 0
          this.clearReconnectTimer()
          resolve()
        }

        ws.onmessage = (event: MessageEvent<string>) => {
          if (socket !== ws) {
            return
          }
          this.handleMessage(event.data)
        }

        ws.onerror = () => {
          if (socket !== ws) {
            return
          }
          this.error = 'WebSocket error'
          this.status = 'error'
          this.hasConnectionIssue = true
          this.scheduleReconnect()
          if (!settled) {
            settled = true
            reject(new Error('Failed to connect to device WebSocket'))
          }
        }

        ws.onclose = () => {
          if (socket === ws) {
            socket = null
          }

          if (!settled) {
            settled = true
            this.status = 'closed'
            reject(new Error('Device WebSocket closed before opening'))
            return
          }

          this.status = 'closed'
          this.hasConnectionIssue = true
          this.scheduleReconnect()
        }
      })

      try {
        await connectPromise
        this.hasConnectionIssue = false
      } finally {
        connectPromise = null
      }

      await this.refreshFromRest()
    },
    disconnect() {
      allowReconnect = false
      this.clearReconnectTimer()
      if (socket) {
        socket.close()
        socket = null
      }
      reconnectAttempts = 0
      this.status = 'closed'
      this.hasConnectionIssue = true
    },
    async refreshFromRest() {
      try {
        const snapshot = await getDeviceInfo<true>({ client: apiClient, throwOnError: true })
        this.device = snapshot ?? null
        this.lastChanged = null
        this.needsSetup = false
        return snapshot
      } catch (error) {
        const message = (error as { detail?: { message?: string } })?.detail?.message

        if (message === 'Device configuration is not loaded.') {
          this.device = null
          this.lastChanged = null
          this.needsSetup = true
          this.error = null
          return null
        }

        this.error = 'Failed to load device snapshot'
        this.needsSetup = false
        throw error
      }
    },
    handleMessage(raw: string) {
      let payload: DeviceStatusMessage
      try {
        payload = JSON.parse(raw) as DeviceStatusMessage
      } catch (error) {
        console.error('Invalid device message', error)
        return
      }

      if (payload.type === 'ping') {
        this.lastHeartbeat = Date.now()
        return
      }

      if (payload.type === 'device.status') {
        this.device = payload.device ?? null
        this.lastChanged = payload.changed ?? null

        if (payload.changed?.length) {
          const cameraStore = useCameraStore()
          cameraStore.handleCameraSettingsChanged(payload.changed)
        }
      }
    }
  }
})
