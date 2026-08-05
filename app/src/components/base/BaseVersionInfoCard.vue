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
  </BaseSection>
</template>
