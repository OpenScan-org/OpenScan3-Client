import { createClient } from 'src/generated/api/client';

const apiClient = createClient();

apiClient.setConfig({
  baseUrl: 'http://openscan3-dev:8000/v0.5/',
  responseStyle: 'data'
});

export { apiClient };
