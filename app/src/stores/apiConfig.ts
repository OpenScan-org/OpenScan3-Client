import { defineStore } from 'pinia'
import packageJson from '../../package.json'

const defaultApiVersion = packageJson.apiVersion ?? 'v0.6'

export const useApiConfigStore = defineStore('apiConfig', {
  state: () => ({
    schema: (window.location.protocol === 'https:' ? 'https' : 'http') as 'http' | 'https',
    host: window.location.hostname || 'openscan3-alpha.local',
    port: 8000,
    version: defaultApiVersion,
    developerMode: false,
    cloudEnabled: false
  }),
  getters: {
    baseURL: (state) => {
      const portSegment = state.developerMode && state.port ? `:${state.port}` : ''
      const pathSegment = state.developerMode ? `/${state.version}/` : `/api/${state.version}/`

      return `${state.schema}://${state.host}${portSegment}${pathSegment}`
    }
  },
  actions: {
    setConfig(config: Partial<typeof this.$state>) {
      Object.assign(this.$state, config);
      localStorage.setItem('apiConfig', JSON.stringify(this.$state));
    },
    loadFromStorage() {
      const saved = localStorage.getItem('apiConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        if ('useApiPath' in parsed && !('developerMode' in parsed)) {
          parsed.developerMode = !parsed.useApiPath
          delete parsed.useApiPath
        }
        Object.assign(this.$state, parsed);
      }
    }
  }
});

export function buildWebSocketUrl(baseUrl: string, namespace: string): string {
  try {
    const url = new URL(baseUrl)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    const strippedPath = url.pathname
      .replace(/\/+$/g, '')
      .replace(/(?<=^)\//, '')
      .replace(/\/+/, '/')
      .trim()
    const prefix = strippedPath.length ? `/${strippedPath}` : ''
    let nextPath = `${prefix}/ws/${namespace}`.replace(/\/+/, '/').replace(/\/$/, '')
    if (!nextPath.startsWith('/')) {
      nextPath = `/${nextPath}`
    }
    url.pathname = nextPath
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch (error) {
    console.error('Invalid base URL for websocket', error)
    return baseUrl.replace(/^http/i, 'ws')
  }
}
