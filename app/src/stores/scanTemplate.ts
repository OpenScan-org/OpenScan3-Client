import { defineStore } from 'pinia'
import { type ScanSetting, type CameraSettings } from 'src/generated/api'

interface ScanTemplateState {
  scanSettings: ScanSetting | null
  cameraSettings: CameraSettings | null
}

export const useScanTemplateStore = defineStore('scanTemplate', {
  state: (): ScanTemplateState => ({
    scanSettings: null,
    cameraSettings: null
  }),
  actions: {
    setTemplate(scanSettings: ScanSetting, cameraSettings: CameraSettings) {
      this.scanSettings = scanSettings
      this.cameraSettings = cameraSettings
    },
    clearTemplate() {
      this.scanSettings = null
      this.cameraSettings = null
    },
    hasTemplate(): boolean {
      return !!this.scanSettings
    }
  }
})
