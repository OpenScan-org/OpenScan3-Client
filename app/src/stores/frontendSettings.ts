import { defineStore } from 'pinia'

type FrontendSettingsState = {
  backgroundCameraPreviewEnabled: boolean
}

const STORAGE_KEY = 'frontendSettings'

function loadInitialState(): FrontendSettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        backgroundCameraPreviewEnabled: true
      }
    }

    const parsed = JSON.parse(raw) as Partial<FrontendSettingsState> | null
    return {
      backgroundCameraPreviewEnabled: parsed?.backgroundCameraPreviewEnabled ?? true
    }
  } catch (error) {
    console.warn('Failed to load frontend settings.', error)
    return {
      backgroundCameraPreviewEnabled: true
    }
  }
}

function persistState(state: FrontendSettingsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to persist frontend settings.', error)
  }
}

export const useFrontendSettingsStore = defineStore('frontendSettings', {
  state: (): FrontendSettingsState => loadInitialState(),
  actions: {
    setBackgroundCameraPreviewEnabled(enabled: boolean) {
      this.backgroundCameraPreviewEnabled = enabled
      persistState(this.$state)
    }
  }
})
