import { defineStore } from 'pinia'
import { useApiConfigStore } from './apiConfig'
import packageJson from '../../package.json'

interface SoftwareInfo {
  model: string | null
  firmware_version: string
}

interface VersionState {
  frontendVersion: string
  firmwareVersion: string | null
  firmwareVersionLoading: boolean
  firmwareVersionError: string | null
}

export const useVersionStore = defineStore('version', {
  state: (): VersionState => ({
    frontendVersion: packageJson.version ?? '0.0.0',
    firmwareVersion: null,
    firmwareVersionLoading: false,
    firmwareVersionError: null
  }),

  actions: {
    async fetchFirmwareVersion() {
      if (this.firmwareVersionLoading) return

      const apiConfigStore = useApiConfigStore()
      this.firmwareVersionLoading = true
      this.firmwareVersionError = null

      try {
        const baseUrl = apiConfigStore.baseURL.replace(/\/+$/, '')
        const response = await fetch(baseUrl)

        if (response.ok) {
          const data: SoftwareInfo = await response.json()
          this.firmwareVersion = data.firmware_version
        } else {
          this.firmwareVersionError = 'Failed to fetch firmware version'
        }
      } catch (error) {
        console.error('Failed to fetch firmware version:', error)
        this.firmwareVersionError = error instanceof Error ? error.message : 'Unknown error'
      } finally {
        this.firmwareVersionLoading = false
      }
    },

    async initialize() {
      await this.fetchFirmwareVersion()
    }
  }
})
