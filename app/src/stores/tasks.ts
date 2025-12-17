import { defineStore } from 'pinia'
import { useApiConfigStore, buildWebSocketUrl } from './apiConfig'
import { apiClient } from 'src/services/apiClient'
import { cancelTask, getAllTasks, getTaskStatus, pauseTask, resumeTask, type Task } from 'src/generated/api'

export type TaskStoreStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

interface TaskEventMessage {
  type: string
  task?: Task
}

interface TaskStoreState {
  tasks: Task[]
  lastHeartbeat: number | null
  now: number
  taskTiming: Record<string, { pausedAt: number | null; totalPausedMs: number }>
  status: TaskStoreStatus
  error: string | null
}

let socket: WebSocket | null = null
let connectPromise: Promise<void> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let allowReconnect = true
let clockTimer: ReturnType<typeof setInterval> | null = null

export const useTaskStore = defineStore('tasks', {
  state: (): TaskStoreState => ({
    tasks: [],
    lastHeartbeat: null,
    now: Date.now(),
    taskTiming: {},
    status: 'idle',
    error: null
  }),
  getters: {
    taskList: (state) => state.tasks,
    runningTasks: (state) => state.tasks.filter((task) => task.status === 'running'),
    taskById: (state) => (taskId: string) => state.tasks.find((task) => task.id === taskId) ?? null,
    etaSecondsById: (state) => (taskId: string) => {
      const task = state.tasks.find((entry) => entry.id === taskId)
      if (!task?.started_at) {
        return null
      }

      const current = task.progress?.current
      const total = task.progress?.total
      if (current === undefined || total === undefined || total <= 0 || current <= 0) {
        return null
      }

      const timing = state.taskTiming[taskId]
      const startedAtMs = new Date(task.started_at).getTime()
      const totalPausedMs = timing?.totalPausedMs ?? 0
      const isPaused = task.status === 'paused' || task.status === 'interrupted'
      const effectiveNowMs = isPaused && timing?.pausedAt ? timing.pausedAt : state.now
      const elapsedSeconds = (effectiveNowMs - startedAtMs - totalPausedMs) / 1000
      if (elapsedSeconds <= 0) {
        return null
      }

      const rate = current / elapsedSeconds
      const remaining = Math.max(total - current, 0)
      return rate > 0 ? Math.ceil(remaining / rate) : null
    }
  },
  actions: {
    ensureTaskTiming(taskId: string) {
      if (!this.taskTiming[taskId]) {
        this.taskTiming[taskId] = { pausedAt: null, totalPausedMs: 0 }
      }
      return this.taskTiming[taskId]
    },
    startClock() {
      if (clockTimer) {
        return
      }
      clockTimer = setInterval(() => {
        this.now = Date.now()
      }, 1000)
    },
    stopClock() {
      if (!clockTimer) {
        return
      }
      clearInterval(clockTimer)
      clockTimer = null
    },
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
          this.startClock()
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
          this.stopClock()
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

          this.stopClock()

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
      this.stopClock()
      reconnectAttempts = 0
      this.status = 'closed'
    },
    async refreshFromRest() {
      try {
        const snapshot = await getAllTasks({ client: apiClient })
        this.tasks = snapshot ?? []

        const nowMs = Date.now()
        for (const task of this.tasks) {
          const timing = this.ensureTaskTiming(task.id)

          const isPaused = task.status === 'paused' || task.status === 'interrupted'
          if (isPaused) {
            if (timing.pausedAt === null) {
              timing.pausedAt = nowMs
            }
            continue
          }

          if (timing.pausedAt !== null) {
            timing.totalPausedMs += nowMs - timing.pausedAt
            timing.pausedAt = null
          }
        }
        return snapshot
      } catch (error) {
        this.error = 'Failed to load tasks snapshot'
        throw error
      }
    },
    async refreshTask(taskId: string) {
      const task = await getTaskStatus({ client: apiClient, path: { task_id: taskId } })
      this.applyTaskUpdate(task)
      return task
    },
    async ensureTaskLoaded(taskId: string) {
      const existing = this.tasks.find((task) => task.id === taskId)
      if (existing) {
        return existing
      }
      return await this.refreshTask(taskId)
    },
    async pause(taskId: string) {
      const task = await pauseTask({ client: apiClient, path: { task_id: taskId } })
      this.applyTaskUpdate(task)
      return task
    },
    async resume(taskId: string) {
      const task = await resumeTask({ client: apiClient, path: { task_id: taskId } })
      this.applyTaskUpdate(task)
      return task
    },
    async cancel(taskId: string) {
      const task = await cancelTask({ client: apiClient, path: { task_id: taskId } })
      this.applyTaskUpdate(task)
      return task
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
      const timing = this.ensureTaskTiming(task.id)
      const nowMs = Date.now()

      const isPaused = task.status === 'paused' || task.status === 'interrupted'
      if (isPaused && timing.pausedAt === null) {
        timing.pausedAt = nowMs
      }

      const isUnpaused = task.status === 'running' || task.status === 'completed' || task.status === 'cancelled' || task.status === 'error'
      if (isUnpaused && timing.pausedAt !== null) {
        timing.totalPausedMs += nowMs - timing.pausedAt
        timing.pausedAt = null
      }

      const index = this.tasks.findIndex((existing) => existing.id === task.id)
      if (index === -1) {
        this.tasks = [task, ...this.tasks]
        return
      }

      this.tasks.splice(index, 1, task)
    }
  }
})
