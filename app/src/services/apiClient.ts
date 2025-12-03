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

// Export the old API_BASE_URL for backward compatibility, but it's now computed
export const API_BASE_URL = apiConfigStore.baseURL
