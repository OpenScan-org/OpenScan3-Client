import { createClient } from 'src/generated/api/client'

const API_BASE_URL = 'http://openscan3-dev:8000/v0.5/'

const apiClient = createClient()

apiClient.setConfig({
  baseUrl: API_BASE_URL,
  responseStyle: 'data'
})

export { apiClient, API_BASE_URL }
