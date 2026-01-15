import { createClient } from 'src/generated/api/client'
import { useApiConfigStore } from 'src/stores/apiConfig'

const apiConfigStore = useApiConfigStore()

apiConfigStore.loadFromStorage()

export const apiClient = createClient()

export function updateApiClientConfig() {
  apiClient.setConfig({
    baseUrl: apiConfigStore.baseURL,
    responseStyle: 'data'
  })
}

updateApiClientConfig()

export function getApiBaseUrl() {
  return apiConfigStore.baseURL
}
