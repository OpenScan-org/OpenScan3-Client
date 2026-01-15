# Quasar App (openscan3-client)

A Quasar Project

## Install the dependencies
```bash
yarn
# or
npm install

# or to install versions from package-lock.json:
npm ci
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)
```bash
quasar dev
```


### Lint the files
```bash
yarn lint
# or
npm run lint
```


### Format the files
```bash
yarn format
# or
npm run format
```



### Build the app for production
```bash
npm run build
```

### Release process
All merges into `main` are treated as releases. Before pushing or opening a PR, bump the version in `app/package.json` via:
```bash
cd app
npm version <patch|minor|major>
```
This keeps the automated GitHub release workflow from failing because of duplicated tags _with_ existing releases and ensures `spa.zip` is versioned correctly.

### Build and create spa.zip for deployment
```bash
npm run build:zip
```
This produces `dist/spa.zip`. Requires the `zip` command to be available on the system.

### Regenerate API client and schema helpers
```bash
npm run api:gen
```
This runs `scripts/generate-api.mjs`, which

1. executes `@hey-api/openapi-ts` using `openapi_latest.json` from the repository root, writing the client into `src/generated/api`, and
2. rebuilds `fieldDescriptions.ts` and `fieldDefaults.ts` from the same spec.

Always update `openapi_latest.json` first, then run this command so the generated sources stay in sync.

### Customize the configuration
See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).
