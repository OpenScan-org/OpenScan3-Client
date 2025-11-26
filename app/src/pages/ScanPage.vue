<template>
  <q-page v-if="scanner_available">
    <div class="q-pa-md">
      <div class="row q-col-gutter-md">
        <div class="col-8">
          <scan-settings :settings="scan_settings" :cameras="camera_options" :path_methods="path_options"
            :scanning="scanning" @update:camera="update_camera" @update:scanning="update_scanning" />
        </div>
        <div class="col-4">
          <div class="row q-col-gutter-md">
            <div class="col-12">
              <camera-preview :scanning="scanning" :camera="scan_settings.camera" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
  <q-page v-else-if="scanner_pinged">
    <div class="q-pa-md">
      <div class="row justify-center">
        <div class="col-4">
          <q-banner v-if="!scanner_available" inline-actions class="text-white bg-red">
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

<script setup lang="ts">
import { QSelectProps, useQuasar } from 'quasar'
import { ref, onMounted } from 'vue'
import { apiClient } from 'src/services/apiClient'
import {
  getCameras,
  getSoftwareInfo,
  type CameraStatusResponse
} from 'src/generated/api'
import generateDashedName from 'src/utils/randomName'

import ScanSettings from 'components/ScanSettings.vue'
import CameraPreview from 'components/CameraPreview.vue'
import { ScanSettingsModel } from 'components/models'

const $q = useQuasar()

type ScannerInfo = {
  model?: string
  firmware_version?: string
}

type CameraOption = {
  label: string
  value: string
  orientationFlag?: number | null
}

const camera_options = ref<CameraOption[]>([])

const scanner_info = ref<ScannerInfo | null>(null)

const path_options = [
  {
    label: 'Fibonacci',
    value: 'fibonacci'
  },
  {
    label: 'Spiral',
    value: 'spiral'
  },
]

const scan_settings = ref<ScanSettingsModel>({
  project_name: generateDashedName(),
  camera: null,
  points: 100,
  method: path_options[0]
})

const scanner_available = ref(false)
const scanner_pinged = ref(false)
const scanning = ref(false)

const update_camera = (camera: QSelectProps['options']) => {
  scan_settings.value.camera = camera
}

const update_scanning = (status: boolean) => {
  scanning.value = status
}

const update_cameras = async () => {
  try {
    const data = await getCameras({ client: apiClient })
    const cameras = Object.values(data ?? {}).map((camera) => ({
      label: camera.name,
      value: camera.name,
      orientationFlag: camera.settings?.orientation_flag ?? null
    }))
    camera_options.value = cameras
    scan_settings.value.camera = cameras[0] ?? null
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Kameraliste konnte nicht geladen werden.' })
  }
}

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

    await update_cameras()
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Scanner nicht erreichbar.' })
  } finally {
    $q.loading.hide()
    scanner_pinged.value = true
  }
})

</script>
