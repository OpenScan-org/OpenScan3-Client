import { defineStore } from 'pinia'
import { useApiConfigStore } from './apiConfig'
import packageJson from '../../package.json'

interface SoftwareInfo {
  model: string | null
  firmware_version: string
}

interface GitHubRelease {
  tag_name: string
  html_url: string
  published_at: string
  name: string
}

interface VersionState {
  frontendVersion: string
  firmwareVersion: string | null
  firmwareVersionLoading: boolean
  firmwareVersionError: string | null
  latestFirmwareRelease: GitHubRelease | null
  latestFrontendRelease: GitHubRelease | null
  releasesLoading: boolean
  releasesError: string | null
}

const GITHUB_FIRMWARE_REPO = 'OpenScan-org/OpenScan3'
const GITHUB_FRONTEND_REPO = 'OpenScan-org/OpenScan3-Client'

const stripVersionMetadata = (version: string) => version.replace(/[-+].*$/, '')

function compareVersions(current: string, latest: string): number {
  const normalize = (v: string) =>
    stripVersionMetadata(v.replace(/^v/, ''))
      .split('.')
      .map(Number)
  const currentParts = normalize(current)
  const latestParts = normalize(latest)

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const c = currentParts[i] || 0
    const l = latestParts[i] || 0
    if (c < l) return -1
    if (c > l) return 1
  }
  return 0
}

export const useVersionStore = defineStore('version', {
  state: (): VersionState => ({
    frontendVersion: packageJson.version ?? '0.0.0',
    firmwareVersion: null,
    firmwareVersionLoading: false,
    firmwareVersionError: null,
    latestFirmwareRelease: null,
    latestFrontendRelease: null,
    releasesLoading: false,
    releasesError: null
  }),

  getters: {
    firmwareUpdateAvailable(): boolean {
      if (!this.firmwareVersion || !this.latestFirmwareRelease) return false
      return compareVersions(this.firmwareVersion, this.latestFirmwareRelease.tag_name) < 0
    },

    frontendUpdateAvailable(): boolean {
      if (!this.latestFrontendRelease) return false
      return compareVersions(this.frontendVersion, this.latestFrontendRelease.tag_name) < 0
    },

    anyUpdateAvailable(): boolean {
      return this.firmwareUpdateAvailable || this.frontendUpdateAvailable
    },

    latestFirmwareVersion(): string | null {
      const tag = this.latestFirmwareRelease?.tag_name
      return tag ? stripVersionMetadata(tag) : null
    },

    latestFrontendVersion(): string | null {
      const tag = this.latestFrontendRelease?.tag_name
      return tag ? stripVersionMetadata(tag) : null
    }
  },

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

    async fetchLatestReleases() {
      if (this.releasesLoading) return

      this.releasesLoading = true
      this.releasesError = null

      try {
        const [firmwareResponse, frontendResponse] = await Promise.all([
          fetch(`https://api.github.com/repos/${GITHUB_FIRMWARE_REPO}/releases/latest`),
          fetch(`https://api.github.com/repos/${GITHUB_FRONTEND_REPO}/releases/latest`)
        ])

        if (firmwareResponse.ok) {
          this.latestFirmwareRelease = await firmwareResponse.json()
        }

        if (frontendResponse.ok) {
          this.latestFrontendRelease = await frontendResponse.json()
        }

        if (!firmwareResponse.ok && !frontendResponse.ok) {
          this.releasesError = 'Failed to fetch release information'
        }
      } catch (error) {
        console.error('Failed to fetch latest releases:', error)
        this.releasesError = error instanceof Error ? error.message : 'Unknown error'
      } finally {
        this.releasesLoading = false
      }
    },

    async initialize() {
      await Promise.all([
        this.fetchFirmwareVersion(),
        this.fetchLatestReleases()
      ])
    }
  }
})
