<script setup lang="ts">
import BaseSection from 'components/base/BaseSection.vue'
import { useApiConfigStore } from 'src/stores/apiConfig'
import { useVersionStore } from 'src/stores/version'

const apiConfigStore = useApiConfigStore()
const versionStore = useVersionStore()
void versionStore.initialize()
</script>

<template>
  <BaseSection title="Version Info">
    <div class="row q-col-gutter-sm">
      <div class="col">
        <div class="text-caption">Frontend</div>
        <div>{{ versionStore.frontendVersion }}</div>
      </div>
      <div class="col">
        <div class="text-caption">Firmware</div>
        <div>{{ versionStore.firmwareVersion ?? 'Loading...' }}</div>
      </div>
      <div class="col">
        <div class="text-caption">API version</div>
        <div>{{ apiConfigStore.version }}</div>
      </div>
    </div>
    <q-banner class="bg-blue-1 text-primary q-mt-md" rounded>
      <div class="text-weight-medium">Stable release coming soon</div>
      <div class="q-mt-xs">
        OpenScan is moving from beta to its stable release. Updates are temporarily paused while we prepare the new version.
        You can continue using your scanner as usual. Installing the stable release will require flashing a new system image.
        We will provide instructions when it is ready.
      </div>
    </q-banner>
  </BaseSection>
</template>
