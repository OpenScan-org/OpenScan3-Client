import { defineStore } from 'pinia'
import type { ScanSetting, CameraSettings } from 'src/generated/api'

interface ScanTemplateState {
  scanSettings: ScanSetting | null
  cameraSettings: CameraSettings | null
  autoStartFocusStacking: boolean | null
}

export const useScanTemplateStore = defineStore('scanTemplate', {
  state: (): ScanTemplateState => ({
    scanSettings: null,
    cameraSettings: null,
    autoStartFocusStacking: null
  }),
  actions: {
    setTemplate(scanSettings: ScanSetting, cameraSettings: CameraSettings, options?: { autoStartFocusStacking: boolean }) {
      this.scanSettings = scanSettings
      this.cameraSettings = cameraSettings
      this.autoStartFocusStacking = options?.autoStartFocusStacking ?? null
    },
    clearTemplate() {
      this.scanSettings = null
      this.cameraSettings = null
      this.autoStartFocusStacking = null
    },
    hasTemplate(): boolean {
      return !!this.scanSettings
    }
  }
})
