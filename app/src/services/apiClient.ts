import {
  apiSdkByTarget,
  apiTargets,
  createApiClients,
  versionToApiTarget,
  type ApiClient,
  type ApiSdk,
  type ApiTarget
} from 'src/generated/api/versioned.gen'
import { useApiConfigStore } from 'src/stores/apiConfig'

const apiConfigStore = useApiConfigStore()

apiConfigStore.loadFromStorage()

const apiClients = createApiClients()

const normalizeVersion = (version: string) => {
  const normalized = version.trim().toLowerCase()

  if (normalized in versionToApiTarget) {
    return normalized as keyof typeof versionToApiTarget
  }

  const match = normalized.match(/^v?(\d+)\.(\d+)/)
  if (match) {
    const major = match[1]
    const minor = match[2]
    const shortVersion = `v${major}.${minor}`
    if (shortVersion in versionToApiTarget) {
      return shortVersion as keyof typeof versionToApiTarget
    }
  }

  return 'latest'
}

export function resolveApiTarget(version = apiConfigStore.version): ApiTarget {
  const normalizedVersion = normalizeVersion(version)
  return versionToApiTarget[normalizedVersion]
}

export function getApiSdk(version = apiConfigStore.version): ApiSdk {
  return apiSdkByTarget[resolveApiTarget(version)]
}

export function getActiveApiClient(version = apiConfigStore.version): ApiClient {
  return apiClients[resolveApiTarget(version)]
}

export const apiClient = new Proxy({} as ApiClient, {
  get(_target, property) {
    const activeClient = getActiveApiClient()
    const value = (activeClient as Record<PropertyKey, unknown>)[property]

    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(activeClient)
    }

    return value
  },
  set(_target, property, value) {
    const activeClient = getActiveApiClient()
    ;(activeClient as Record<PropertyKey, unknown>)[property] = value
    return true
  }
})

export function updateApiClientConfig() {
  for (const target of apiTargets) {
    apiClients[target].setConfig({
      baseURL: apiConfigStore.baseURL
    })
  }
}

updateApiClientConfig()

export function getApiBaseUrl() {
  return apiConfigStore.baseURL
}
