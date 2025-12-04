import { defineStore } from 'pinia'
import { useApiConfigStore, buildWebSocketUrl } from './apiConfig'
import { apiClient } from 'src/services/apiClient'
import { getAllTasks, type Task } from 'src/generated/api'

export type TaskStoreStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

interface TaskEventMessage {
  type: string
  task?: Task
}

interface TaskStoreState {
  tasks: Task[]
  lastHeartbeat: number | null
  status: TaskStoreStatus
  error: string | null
}

let socket: WebSocket | null = null
let connectPromise: Promise<void> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let allowReconnect = true

export const useTaskStore = defineStore('tasks', {
  state: (): TaskStoreState => ({
    tasks: [],
    lastHeartbeat: null,
    status: 'idle',
    error: null
  }),
  getters: {
    taskList: (state) => state.tasks,
    runningTasks: (state) => state.tasks.filter((task) => task.status === 'running')
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
        } catch {
          this.scheduleReconnect()
        }
      }, delay)
    },
    async ensureConnected() {
      if (this.status === 'open') {
        return
      }

      await this.connect()

      if (!this.tasks.length) {
        await this.refreshFromRest()
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
      const wsUrl = buildWebSocketUrl(apiConfigStore.baseURL, 'tasks')

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
          this.scheduleReconnect()
          if (!settled) {
            settled = true
            reject(new Error('Failed to connect to task WebSocket'))
          }
        }

        ws.onclose = () => {
          if (socket === ws) {
            socket = null
          }

          if (!settled) {
            settled = true
            this.status = 'closed'
            reject(new Error('Task WebSocket closed before opening'))
            return
          }

          this.status = 'closed'
          this.scheduleReconnect()
        }
      })

      try {
        await connectPromise
      } finally {
        connectPromise = null
      }
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
    },
    async refreshFromRest() {
      try {
        const snapshot = await getAllTasks({ client: apiClient })
        this.tasks = snapshot ?? []
        return snapshot
      } catch (error) {
        this.error = 'Failed to load tasks snapshot'
        throw error
      }
    },
    handleMessage(raw: string) {
      let payload: TaskEventMessage
      try {
        payload = JSON.parse(raw) as TaskEventMessage
      } catch (error) {
        console.error('Invalid task message', error)
        return
      }

      if (payload.type === 'ping') {
        this.lastHeartbeat = Date.now()
        return
      }

      if (payload.type === 'task.update' && payload.task) {
        this.applyTaskUpdate(payload.task)
      }
    },
    applyTaskUpdate(task: Task) {
      const index = this.tasks.findIndex((existing) => existing.id === task.id)
      if (index === -1) {
        this.tasks = [task, ...this.tasks]
        return
      }

      this.tasks.splice(index, 1, task)
    }
  }
})
