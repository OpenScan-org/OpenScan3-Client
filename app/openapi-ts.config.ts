import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../openapi_latest.json',
  output: {
    client: '@hey-api/client-axios',
    path: './src/generated/api'
  }
});
