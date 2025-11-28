<template>
  <q-page v-if="scanner_available">
    <div class="q-pa-md">
      <div class="row justify-center">
        <div class="col-12 col-md-6">
          <q-card class="q-pa-md">
            <q-form @submit="startScan">
              <div class="row q-col-gutter-md">
                <div class="col-8">
                  <q-select
                    v-model="selectedProject"
                    :options="projectsStore.projectNames"
                    label="Projekt"
                    new-value-mode="add-unique"
                    emit-value
                    map-options
                    lazy-rules
                    :rules="[(val: string) => val && val.length > 0 || 'Bitte Projekt auswählen oder eingeben']"
                  />
                </div>
                <div class="col-4">
                  <q-btn round icon="casino" color="primary" @click="generateProjectName" />
                </div>
                <div class="col-12">
                  <q-select v-model="selectedCamera" :options="cameraOptions" label="Kamera" />
                </div>
                <div class="col-6">
                  <q-select v-model="pathMethod" :options="pathMethods" label="Pfadmethode" />
                </div>
                <div class="col-6">
                  <q-input type="number" min="1" v-model.number="points" label="Anzahl Punkte" lazy-rules
                    :rules="[(val: number) => val && val > 0 || 'Bitte Zahl > 0 eingeben']" />
                </div>
                <div class="col-12 text-center">
                  <q-btn color="primary" label="Start Scan" type="submit" :loading="scanning" />
                </div>
              </div>
            </q-form>
          </q-card>
        </div>
        <div class="col-12 col-md-6">
          <camera-preview :scanning="scanning" :camera="selectedCamera" />
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
  addScanWithDescription,
  type CameraStatusResponse,
  type ScanSetting
} from 'src/generated/api'
import generateDashedName from 'src/utils/randomName'

import CameraPreview from 'components/CameraPreview.vue'
import { useProjectsStore } from 'src/stores/projects'

const $q = useQuasar()

const projectsStore = useProjectsStore()

type ScannerInfo = {
  model?: string
  firmware_version?: string
}

const scanner_info = ref<ScannerInfo | null>(null)

const cameraOptions = ref<QSelectProps['options']>([])

const pathMethods = [
  { label: 'Fibonacci', value: 'fibonacci' },
  { label: 'Spiral', value: 'spiral' }
]

const selectedCamera = ref<QSelectProps['options'] | null>(null)
const selectedProject = ref('')
const pathMethod = ref(pathMethods[0])
const points = ref(100)

const scanner_available = ref(false)
const scanner_pinged = ref(false)
const scanning = ref(false)

const update_cameras = async () => {
  try {
    const data = await getCameras({ client: apiClient })
    const cameras = Object.values(data ?? {}).map((camera) => ({
      label: camera.name,
      value: camera.name,
      orientationFlag: camera.settings?.orientation_flag ?? null
    }))
    cameraOptions.value = cameras
    selectedCamera.value = cameras[0] ?? null
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Kameraliste konnte nicht geladen werden.' })
  }
}

const reload_page = () => {
  window.location.reload()
}

const generateProjectName = () => {
  selectedProject.value = generateDashedName()
}

const startScan = async () => {
  if (!selectedCamera.value?.value) {
    $q.notify({ type: 'negative', message: 'Bitte Kamera auswählen.' })
    return
  }

  if (!selectedProject.value) {
    $q.notify({ type: 'negative', message: 'Bitte Projekt auswählen oder eingeben.' })
    return
  }

  scanning.value = true

  const scanSettings: ScanSetting = {
    path_method: pathMethod.value.value as 'fibonacci' | 'spiral',
    points: points.value,
    image_format: 'jpeg'
  }

  try {
    await addScanWithDescription({
      client: apiClient,
      path: { project_name: selectedProject.value },
      query: { camera_name: selectedCamera.value.value },
      body: scanSettings
    })

    // Refresh projects list after starting scan (in case a new project was created)
    await projectsStore.fetchProjects()

    $q.notify({
      type: 'positive',
      message: 'Scan wurde gestartet.'
    })
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Scan konnte nicht gestartet werden.' })
  } finally {
    scanning.value = false
  }
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
    await projectsStore.fetchProjects()

    // Set default project if available
    if (projectsStore.projects.length > 0) {
      selectedProject.value = projectsStore.projects[0].name
    } else {
      selectedProject.value = generateDashedName()
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Scanner nicht erreichbar.' })
  } finally {
    $q.loading.hide()
    scanner_pinged.value = true
  }
})

</script>
