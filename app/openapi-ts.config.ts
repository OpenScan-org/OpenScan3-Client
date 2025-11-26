import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../openapi_v0.5.json',
  output: {
    client: '@hey-api/client-axios',
    path: './src/generated/api'
  }
});
