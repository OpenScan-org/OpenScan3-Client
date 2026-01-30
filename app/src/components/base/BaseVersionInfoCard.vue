<script setup lang="ts">
import BaseSection from 'components/base/BaseSection.vue'
import { useApiConfigStore } from 'src/stores/apiConfig'
import { useVersionStore } from 'src/stores/version'

const apiConfigStore = useApiConfigStore()
const versionStore = useVersionStore()
</script>

<template>
  <BaseSection title="Version info">
    <div class="row q-col-gutter-sm">
      <div class="col">
        <div class="text-caption">Frontend</div>
        <div>{{ versionStore.frontendVersion }}</div>
        <div
          v-if="versionStore.frontendUpdateAvailable"
          class="text-caption text-positive text-no-wrap q-mt-xs"
        >
          Update available: {{ versionStore.latestFrontendVersion }}
        </div>
      </div>
      <div class="col">
        <div class="text-caption">Firmware</div>
        <div>{{ versionStore.firmwareVersion ?? 'Loading...' }}</div>
        <div
          v-if="versionStore.firmwareUpdateAvailable"
          class="text-caption text-positive text-no-wrap q-mt-xs"
        >
          Update available: {{ versionStore.latestFirmwareVersion }}
        </div>
      </div>
      <div class="col">
        <div class="text-caption">API version</div>
        <div>{{ apiConfigStore.version }}</div>
      </div>
    </div>
  </BaseSection>
</template>
