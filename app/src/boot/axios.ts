import { boot } from 'quasar/wrappers';
import axios, { AxiosInstance } from 'axios';
import { apiClient } from 'src/services/apiClient';
import { useApiConfigStore } from 'src/stores/apiConfig';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $apiClient: typeof apiClient;
    $apiConfig: ReturnType<typeof useApiConfigStore>;
  }
}

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)

export default boot(({ app }) => {
  // for use inside Vue files (Options API) through this.$axios and related helpers

  const apiConfigStore = useApiConfigStore();

  app.config.globalProperties.$axios = axios;
  // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
  //       so you won't necessarily have to import axios in each vue file
  app.config.globalProperties.$apiClient = apiClient;
  app.config.globalProperties.$apiConfig = apiConfigStore;
  // ^ ^ ^ expose generated API client and config store to Options API components
});
