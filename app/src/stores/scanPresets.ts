import { defineStore } from 'pinia'
import { type ScanSetting, type CameraSettings } from 'src/generated/api'

const STORAGE_KEY = 'scanPresets'

export interface ScanPreset {
  id: string
  name: string
  scanSettings: ScanSetting
  cameraSettings: CameraSettings
  cameraName?: string | null
}

interface ScanPresetsState {
  presets: ScanPreset[]
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function loadPersisted(): ScanPresetsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ScanPresetsState>
      if (Array.isArray(parsed?.presets)) {
        return {
          presets: parsed.presets
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load scan presets', error)
  }
  return { presets: [] }
}

function persist(state: ScanPresetsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to persist scan presets', error)
  }
}

export const useScanPresetsStore = defineStore('scanPresets', {
  state: (): ScanPresetsState => loadPersisted(),
  actions: {
    getPreset(id: string | null | undefined) {
      if (!id) {
        return null
      }
      return this.presets.find(preset => preset.id === id) ?? null
    },
    addPreset(payload: Omit<ScanPreset, 'id'>) {
      const uniqueName = this.ensureUniqueName(payload.name)
      const preset: ScanPreset = {
        ...payload,
        name: uniqueName,
        id: generateId()
      }
      this.presets = [...this.presets, preset]
      persist(this.$state)
      return preset.id
    },
    updatePreset(id: string, data: Partial<Omit<ScanPreset, 'id' | 'name'>>) {
      const index = this.presets.findIndex(preset => preset.id === id)
      if (index === -1) {
        return
      }
      const target = this.presets[index]
      const updated: ScanPreset = {
        ...target,
        ...data,
        id: target.id,
        name: target.name
      }
      this.presets = [
        ...this.presets.slice(0, index),
        updated,
        ...this.presets.slice(index + 1)
      ]
      persist(this.$state)
    },
    removePreset(id: string) {
      this.presets = this.presets.filter(preset => preset.id !== id)
      persist(this.$state)
    },
    ensureUniqueName(baseName: string) {
      const trimmed = baseName.trim() || 'Preset'
      const existingNames = new Set(this.presets.map(preset => preset.name))
      if (!existingNames.has(trimmed)) {
        return trimmed
      }
      let index = 2
      let candidate = `${trimmed} (${index})`
      while (existingNames.has(candidate)) {
        index += 1
        candidate = `${trimmed} (${index})`
      }
      return candidate
    }
  }
})
