import { defineStore } from 'pinia'
import { apiClient, getApiSdk } from 'src/services/apiClient'
import { fieldDefaults } from 'src/generated/api/fieldDefaults'
import type { FirmwareSettings } from 'src/generated/api'

interface FirmwareSettingsState {
  settings: FirmwareSettings | null
  loading: boolean
  saving: boolean
  error: string | null
}

const defaultCameraPreviewEnabled = fieldDefaults.FirmwareSettings?.camera_preview_enabled ?? true

function normalizeFirmwareSettings(settings: FirmwareSettings | null | undefined): FirmwareSettings {
  return {
    camera_preview_enabled: Boolean(settings?.camera_preview_enabled ?? defaultCameraPreviewEnabled),
    enable_cloud: Boolean(settings?.enable_cloud ?? false),
    qr_wifi_scan_enabled: Boolean(settings?.qr_wifi_scan_enabled ?? false)
  }
}

export const useFirmwareSettingsStore = defineStore('firmwareSettings', {
  state: (): FirmwareSettingsState => ({
    settings: null,
    loading: false,
    saving: false,
    error: null
  }),

  actions: {
    resetState() {
      this.settings = null
      this.loading = false
      this.saving = false
      this.error = null
    },

    async fetch(force = false): Promise<FirmwareSettings | null> {
      if (!force && this.settings) {
        return this.settings
      }

      this.loading = true
      this.error = null

      try {
        const response = await getApiSdk().getSettings({ client: apiClient })
        const payload = (response?.data ?? response) as FirmwareSettings
        const normalized = normalizeFirmwareSettings(payload)
        this.settings = normalized
        return normalized
      } catch (error) {
        this.error = 'Could not load firmware settings.'
        throw error
      } finally {
        this.loading = false
      }
    },

    async replace(payload: FirmwareSettings): Promise<FirmwareSettings> {
      this.saving = true
      this.error = null

      try {
        const response = await getApiSdk().replaceSettings({
          client: apiClient,
          body: payload
        })
        const next = normalizeFirmwareSettings((response?.data ?? response) as FirmwareSettings)
        this.settings = next
        return next
      } catch (error) {
        this.error = 'Could not save firmware settings.'
        throw error
      } finally {
        this.saving = false
      }
    },

    async updateSetting<K extends keyof FirmwareSettings>(
      key: K,
      value: FirmwareSettings[K]
    ): Promise<FirmwareSettings> {
      this.saving = true
      this.error = null

      try {
        const response = await getApiSdk().updateSetting({
          client: apiClient,
          path: { key: String(key) },
          body: { value }
        })
        const next = normalizeFirmwareSettings((response?.data ?? response) as FirmwareSettings)
        this.settings = next
        return next
      } catch (error) {
        this.error = 'Could not update firmware setting.'
        throw error
      } finally {
        this.saving = false
      }
    }
  }
})
