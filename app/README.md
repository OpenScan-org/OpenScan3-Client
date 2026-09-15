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
Releases follow a Gitflow-style process. Create `release/v<version>` from `develop`, update the frontend version in `app/package.json` and its lockfile, and move the relevant entries from `Unreleased` to the matching version in `app/CHANGELOG.md`:
```bash
cd app
npm version <version> --no-git-tag-version
```
Merge the release branch into `main` and back into `develop`. Then run the `Build SPA` workflow manually on the release commit in `main`. It creates a GitHub release named `v<frontend-version>+api<api-version>` and attaches the versioned SPA and Debian artifacts.

### Build and create spa.zip for deployment
```bash
npm run build:zip
```
This produces `dist/spa.zip`. Requires the `zip` command to be available on the system.

### Build and create Debian package for updater deployment
```bash
npm run build:deb
```
This produces `dist/openscan3-client_<version>_all.deb`. The package installs the built SPA assets into `/usr/share/openscan3-client` and intentionally does not ship nginx configuration or services.

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
