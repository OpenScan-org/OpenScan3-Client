import { defineStore } from 'pinia';

export const useApiConfigStore = defineStore('apiConfig', {
  state: () => ({
    schema: 'http' as 'http' | 'https',
    host: 'openscan3-dev',
    port: 8000,
    version: 'v0.5'
  }),
  getters: {
    baseURL: (state) => `${state.schema}://${state.host}:${state.port}/${state.version}/`
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
