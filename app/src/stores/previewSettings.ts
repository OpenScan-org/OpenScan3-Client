import { defineStore } from 'pinia'

export type PreviewOrientation = 'landscape' | 'portrait'

interface PreviewSettingsState {
  orientations: Record<string, PreviewOrientation>
}

const STORAGE_KEY = 'previewSettings'

function loadPersisted(): PreviewSettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PreviewSettingsState
      if (parsed && typeof parsed === 'object' && parsed.orientations) {
        return {
          orientations: parsed.orientations
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load preview settings', error)
  }
  return { orientations: {} }
}

function persist(state: PreviewSettingsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to persist preview settings', error)
  }
}

export const usePreviewSettingsStore = defineStore('previewSettings', {
  state: (): PreviewSettingsState => loadPersisted(),
  actions: {
    setOrientation(cameraName: string, orientation: PreviewOrientation) {
      if (!cameraName) {
        return
      }
      this.orientations[cameraName] = orientation
      persist(this.$state)
    },
    getOrientation(cameraName?: string | null) {
      if (!cameraName) {
        return 'landscape' as PreviewOrientation
      }
      return this.orientations[cameraName] ?? 'landscape'
    }
  }
})
