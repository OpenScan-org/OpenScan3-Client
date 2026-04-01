import { defineStore } from 'pinia'
import { type CloudProjectStatus } from 'src/generated/api'
import { apiClient, getApiSdk } from 'src/services/apiClient'

interface CloudProjectEntry {
  data: CloudProjectStatus
  fetchedAt: number
}

const ENTRY_STALE_MS = 30_000
const READY_STATUS_VALUES = new Set(['processing done', 'processed', 'done', 'ready', 'completed'])

function extractRemoteStatus(cloudProject: CloudProjectStatus | null | undefined): string | null {
  if (!cloudProject) {
    return null
  }

  const remoteInfo = cloudProject.remote_info
  if (!remoteInfo || typeof remoteInfo !== 'object') {
    return null
  }

  const value = (remoteInfo as Record<string, unknown>)['status']
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }

  const msg = (remoteInfo as Record<string, unknown>)['message']
  if (typeof msg === 'string' && msg.trim().length > 0) {
    return msg.trim()
  }

  return null
}

function isReadyStatus(cloudProject: CloudProjectStatus | null | undefined): boolean {
  const status = extractRemoteStatus(cloudProject)
  if (!status) {
    return false
  }

  const normalized = status.trim().toLowerCase()
  if (READY_STATUS_VALUES.has(normalized)) {
    return true
  }

  const remoteInfo = cloudProject?.remote_info
  if (remoteInfo && typeof remoteInfo === 'object') {
    const dlink = (remoteInfo as Record<string, unknown>)['dlink']
    if (typeof dlink === 'string' && dlink.trim().length > 0) {
      return true
    }
  }

  return false
}

export const useCloudProjectsStore = defineStore('cloudProjects', {
  state: () => ({
    entries: {} as Record<string, CloudProjectEntry>,
    loading: false,
    error: null as string | null,
    dismissed: new Set<string>()
  }),
  getters: {
    statusByProject: (state) => (projectName: string) => state.entries[projectName]?.data ?? null,
    remoteStatusLabel: (state) => (projectName: string) => extractRemoteStatus(state.entries[projectName]?.data) ?? null,
    isModelReady: (state) => (projectName: string) => isReadyStatus(state.entries[projectName]?.data),
    visibleEntries: (state) => Object.fromEntries(
      Object.entries(state.entries).filter(([name]) => !state.dismissed.has(name))
    )
  },
  actions: {
    async fetchAll(force = false) {
      if (this.loading) {
        return
      }

      if (!force) {
        const hasFreshEntries = Object.values(this.entries).some(
          (entry) => Date.now() - entry.fetchedAt < ENTRY_STALE_MS
        )
        if (hasFreshEntries) {
          return
        }
      }

      this.loading = true
      this.error = null
      try {
        const response = await getApiSdk().listCloudProjects({ client: apiClient })
        const list = ((response?.data ?? response) as CloudProjectStatus[] | undefined) ?? []
        const nextEntries: Record<string, CloudProjectEntry> = {}
        const now = Date.now()
        for (const cloudProject of list) {
          const name = cloudProject.project?.name
          if (typeof name === 'string' && name.length > 0) {
            nextEntries[name] = { data: cloudProject, fetchedAt: now }
          }
        }
        this.entries = { ...this.entries, ...nextEntries }
      } catch (error) {
        console.error('Could not load cloud projects.', error)
        this.error = 'Failed to load cloud project status.'
      } finally {
        this.loading = false
      }
    },
    async ensureProjectStatus(projectName: string, options?: { force?: boolean }) {
      if (!projectName) {
        return null
      }

      const entry = this.entries[projectName]
      if (!options?.force && entry && Date.now() - entry.fetchedAt < ENTRY_STALE_MS) {
        return entry.data
      }

      try {
        const response = await getApiSdk().getCloudProject({ client: apiClient, path: { project_name: projectName } })
        const data = ((response?.data ?? response) as CloudProjectStatus | undefined) ?? null
        if (data) {
          this.entries[projectName] = { data, fetchedAt: Date.now() }
        }
        return data
      } catch (error) {
        console.error(`Could not load cloud project status for ${projectName}.`, error)
        return entry?.data ?? null
      }
    },
    markProjectDirty(projectName: string) {
      if (this.entries[projectName]) {
        delete this.entries[projectName]
      }
      this.dismissed.delete(projectName)
    },
    dismiss(projectName: string) {
      this.dismissed.add(projectName)
    },
    restore(projectName: string) {
      this.dismissed.delete(projectName)
    }
  }
})

export function getCloudRemoteStatus(cloudProject: CloudProjectStatus | null | undefined) {
  return extractRemoteStatus(cloudProject)
}

export function isCloudModelReady(cloudProject: CloudProjectStatus | null | undefined) {
  return isReadyStatus(cloudProject)
}
