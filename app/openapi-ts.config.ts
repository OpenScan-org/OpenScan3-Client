import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../openapi_next.json',
  output: {
    client: '@hey-api/client-axios',
    path: './src/generated/api'
  }
});
