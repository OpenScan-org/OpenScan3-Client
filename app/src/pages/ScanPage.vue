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
                    label="Project"
                    new-value-mode="add-unique"
                    emit-value
                    map-options
                    lazy-rules
                    :rules="[(val: string) => val && val.length > 0 || 'Please select or enter a project']"
                  />
                </div>
                <div class="col-4">
                  <q-btn label="New Project" color="primary" @click="showCreateProjectDialog = true" />
                </div>
                <div class="col-12">
                  <div class="q-pa-sm">
                    <label class="q-field__label">Number of Points</label>
                    <div class="row q-col-gutter-md">
                      <div class="col-6">
                        <q-slider
                          v-model="points"
                          :min="1"
                          :max="500"
                          :step="1"
                          color="primary"
                          track-color="grey-3"
                        >
                          <q-tooltip>Number of points in scanning path.</q-tooltip>
                        </q-slider>
                      </div>
                      <div class="col-6">
                        <q-input
                          type="number"
                          v-model.number="points"
                          :min="1"
                          :max="500"
                          dense
                          :rules="[(val: number) => val && val > 0 || 'Please enter a number > 0']"
                        >
                          <q-tooltip>Number of points in scanning path.</q-tooltip>
                        </q-input>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-12">
                  <q-checkbox v-model="enableFocusStacking" label="Focus Stacking" />
                </div>
                <div class="row q-col-gutter-md" v-if="enableFocusStacking">
                  <div class="col-6">
                    <div class="q-pa-sm">
                      <label class="q-field__label">Focus Stacks</label>
                      <q-slider
                        v-model="focusStacks"
                        :min="1"
                        :max="99"
                        :step="1"
                        color="primary"
                        track-color="grey-3"
                      >
                        <q-tooltip>Number of photos with different focus per position. This ignores AF and you need to set a focus range. Focus values will then be evenly spaced between min and max.</q-tooltip>
                      </q-slider>
                      <q-input
                        type="number"
                        v-model.number="focusStacks"
                        :min="1"
                        :max="99"
                        dense
                        :rules="[(val: number) => val && val > 0 || 'Please enter a number > 0']"
                      >
                        <q-tooltip>Number of photos with different focus per position. This ignores AF and you need to set a focus range. Focus values will then be evenly spaced between min and max.</q-tooltip>
                      </q-input>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="q-pa-sm">
                      <label class="q-field__label">Focus Range (diopters)</label>
                      <div class="row items-center q-gutter-md">
                        <div class="col">
                          <q-range
                            v-model="focusRange"
                            :min="0"
                            :max="15"
                            :step="0.1"
                            color="primary"
                            track-color="grey-3"
                          >
                            <q-tooltip>Minimum and maximum focus distance in diopters.</q-tooltip>
                          </q-range>
                        </div>
                        <div class="col-auto">
                          <q-input
                            type="number"
                            v-model.number="focusRange.min"
                            :min="0"
                            :max="15"
                            dense
                            label="Min"
                          />
                        </div>
                        <div class="col-auto">
                          <q-input
                            type="number"
                            v-model.number="focusRange.max"
                            :min="0"
                            :max="15"
                            dense
                            label="Max"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>


                <div class="col-12">
                  <q-expansion-item label="Advanced Settings" header-class="text-h6">
                    <q-card>
                      <q-card-section>
                        <div class="row q-col-gutter-md">
                          <div class="col-12">
                            <q-select v-model="selectedCamera" :options="cameraOptions" label="Camera" />
                          </div>



                          <div class="col-12">
                            <q-select v-model="pathMethod" :options="pathMethods" label="Path Method" >
                              <q-tooltip>Path method to use for scanning.</q-tooltip>
                            </q-select>
                          </div>
                          <div class="col-12">
                            <q-select v-model="imageFormat" :options="['jpeg', 'dng', 'rgb_array', 'yuv_array']" label="Image Format" >
                              <q-tooltip>Image Format</q-tooltip>
                            </q-select>
                          </div>
                          <div class="col-6">
                            <q-input type="number" v-model.number="minTheta" label="Min Theta (degrees)" >
                              <q-tooltip>Minimum theta angle in degrees for constrained paths.</q-tooltip>
                            </q-input>
                          </div>
                          <div class="col-6">
                            <q-input type="number" v-model.number="maxTheta" label="Max Theta (degrees)" >
                              <q-tooltip>Maximum theta angle in degrees for constrained paths.</q-tooltip>
                            </q-input>
                          </div>
                          <div class="col-12">
                            <div class="row items-center q-col-gutter-md">
                              <div class="col-auto">
                                <q-checkbox v-model="optimizePath" label="Optimize Path" >
                                  <q-tooltip>Enable path optimization for faster scanning.</q-tooltip>
                                </q-checkbox>
                              </div>
                              <div class="col">
                                <q-input v-model="optimizationAlgorithm" label="Optimization Algorithm" :disable="!optimizePath" >
                                  <q-tooltip>Path optimization algorithm to use.</q-tooltip>
                                </q-input>
                              </div>
                            </div>
                          </div>
                        </div>
                      </q-card-section>
                    </q-card>
                  </q-expansion-item>
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
  <CreateProjectDialog v-model="showCreateProjectDialog" @create-project="onCreateProject" />
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
import CreateProjectDialog from 'components/CreateProjectDialog.vue'
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
const points = ref(130)

const imageFormat = ref('jpeg')
const minTheta = ref<number>(12.0)
const maxTheta = ref<number>(125.0)
const optimizePath = ref(true)
const optimizationAlgorithm = ref('nearest_neighbor')
const focusStacks = ref<number>(1)
const enableFocusStacking = ref(false)
const focusRange = ref({ min: 10.0, max: 15.0 })

const scanner_available = ref(false)
const scanner_pinged = ref(false)
const scanning = ref(false)
const showCreateProjectDialog = ref(false)

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
    $q.notify({ type: 'negative', message: 'Camera list could not be loaded.' })
  }
}

const reload_page = () => {
  window.location.reload()
}

const generateProjectName = () => {
  selectedProject.value = generateDashedName()
}

const onCreateProject = async (data: { name: string; description?: string }) => {
  try {
    await projectsStore.createProject(data.name, data.description)
    selectedProject.value = data.name
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Failed to create project.' })
  }
}

const startScan = async () => {
  if (!selectedCamera.value?.value) {
    $q.notify({ type: 'negative', message: 'Please select a camera.' })
    return
  }

  if (!selectedProject.value) {
    $q.notify({ type: 'negative', message: 'Please select or enter a project.' })
    return
  }

  scanning.value = true

  const scanSettings: ScanSetting = {
    path_method: pathMethod.value.value as 'fibonacci' | 'spiral',
    points: points.value,
    image_format: imageFormat.value as 'jpeg' | 'dng' | 'rgb_array' | 'yuv_array'
  }

  if (minTheta.value !== undefined) scanSettings.min_theta = minTheta.value
  if (maxTheta.value !== undefined) scanSettings.max_theta = maxTheta.value
  if (optimizePath.value) scanSettings.optimize_path = optimizePath.value
  if (optimizationAlgorithm.value) scanSettings.optimization_algorithm = optimizationAlgorithm.value
  if (enableFocusStacking.value) {
    if (focusStacks.value !== undefined) scanSettings.focus_stacks = focusStacks.value
    if (focusRange.value.min !== 0 && focusRange.value.max !== 0) scanSettings.focus_range = [focusRange.value.min, focusRange.value.max]
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
      message: 'Scan has been started.'
    })
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Scan could not be started.' })
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
    $q.notify({ type: 'negative', message: 'Scanner not reachable.' })
  } finally {
    $q.loading.hide()
    scanner_pinged.value = true
  }
})

</script>
