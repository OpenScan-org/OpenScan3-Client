<script setup lang="ts">
import { useQuasar } from 'quasar'
import { ref, onMounted } from 'vue'
import { apiClient } from 'src/services/apiClient'
import { getSoftwareInfo } from 'src/generated/api'
import { useCameraStore } from 'src/stores/camera'

const $q = useQuasar()
const cameraStore = useCameraStore()

type ScannerInfo = {
  model?: string
  firmware_version?: string
}

const scanner_info = ref<ScannerInfo | null>(null)
const scanner_available = ref(false)
const scanner_pinged = ref(false)

const reload_page = () => {
  window.location.reload()
}

onMounted(async () => {
  $q.loading.show({
    message: 'Connecting to OpenScan device...'
  })

  try {
    const data = (await getSoftwareInfo({ client: apiClient })) as ScannerInfo

    scanner_available.value = true
    scanner_info.value = data ?? null

    await cameraStore.fetchCameras()
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Scanner not reachable.' })
  } finally {
    $q.loading.hide()
    scanner_pinged.value = true
  }
})
</script>

<template>
  <q-page>
    <!-- Blurred background camera preview -->
    <img v-if="cameraStore.previewUrl" class="camera-background" :src="cameraStore.previewUrl" />

    <div class="q-pa-md">
      <div class="row justify-center">
        <div class="col-12 col-md-6">
          <q-card v-if="scanner_available" class="q-pa-md">
            <q-card-title>Connected to OpenScan Device</q-card-title>
            <q-card-section>
              <p>Model: {{ scanner_info?.model }}</p>
              <p>Firmware: {{ scanner_info?.firmware_version }}</p>
              <div class="q-gutter-sm">
                <q-btn label="Go to Scan" color="primary" to="/scan" />
                <q-btn label="Manage Projects" color="secondary" to="/projects" />
              </div>
            </q-card-section>
          </q-card>
          <q-banner v-else-if="scanner_pinged && !scanner_available" inline-actions class="text-white bg-red">
            Couldn't connect to OpenScan device.
            <template v-slot:action>
              <q-btn flat color="white" label="Retry" @click="reload_page" />
            </template>
          </q-banner>
        </div>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.camera-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(10px);
  opacity: 0.3;
  z-index: -1;
}
</style>
