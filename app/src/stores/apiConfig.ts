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
