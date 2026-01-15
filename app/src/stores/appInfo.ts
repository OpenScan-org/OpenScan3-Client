import { defineStore } from 'pinia'
import packageJson from '../../package.json'

export const useAppInfoStore = defineStore('appInfo', {
  state: () => ({
    version: packageJson.version ?? '0.0.0'
  })
})
