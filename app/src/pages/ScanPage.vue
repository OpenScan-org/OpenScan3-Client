<template>
  <q-page>
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
                    <div class="row items-center q-gutter-sm">
                      <q-slider
                        v-model="points"
                        :min="1"
                        :max="300"
                        :step="1"
                        :markers="true"
                        :marker-labels="[70, 130, 200]"
                        color="primary"
                        track-color="grey-3"
                        class="col"
                      >
                        <q-tooltip>{{ scanSettingDescription('points') }}</q-tooltip>
                      </q-slider>
                      <q-input
                        v-model.number="points"
                        type="number"
                        :min="1"
                        :max="500"
                        dense
                        outlined
                        style="width: 80px"
                        :rules="[(val: number) => val && val > 0 || 'Please enter a number > 0']"
                      >
                        <q-tooltip>Number of points in scanning path.</q-tooltip>
                      </q-input>
                    </div>
                  </div>
                </div>
                <div class="col-12">
                  <q-checkbox v-model="enableFocusStacking" label="Focus Stacking" />
                </div>
                <div v-if="enableFocusStacking">
                  <label class="q-field__label">Focus Stacks</label>
                  <q-slider
                    v-model="focusStacks"
                    :min="1"
                    :max="15"
                    :step="1"
                    color="primary"
                    track-color="grey-3"
                  >
                    <q-tooltip>{{ scanSettingDescription('focus_stacks') }}</q-tooltip>
                  </q-slider>
                  <q-input
                    type="number"
                    v-model.number="focusStacks"
                    :min="1"
                    :max="99"
                    dense
                    outlined
                    style="width: 80px"
                    :rules="[(val: number) => val && val > 0 || 'Please enter a number > 0']"
                  >
                    <q-tooltip>{{ scanSettingDescription('focus_stacks') }}</q-tooltip>
                  </q-input>
                  <label class="q-field__label">Focus Range (diopters)</label>
                  <div class="row items-center q-gutter-sm">
                    <q-input
                      type="number"
                      v-model.number="focusRange.min"
                      :min="0"
                      :max="15"
                      dense
                      outlined
                      style="width: 80px"
                      label="Min"
                    />
                    <q-range
                      v-model="focusRange"
                      :min="0"
                      :max="15"
                      :step="0.1"
                      :markers="true"
                      :marker-labels="[5, 10, 15]"
                      color="primary"
                      track-color="grey-3"
                      class="col"
                      style="min-width: 200px"
                    >
                      <q-tooltip>{{ scanSettingDescription('focus_range') }}</q-tooltip>
                    </q-range>
                    <q-input
                      type="number"
                      v-model.number="focusRange.max"
                      :min="0"
                      :max="15"
                      dense
                      outlined
                      style="width: 80px"
                      label="Max"
                    />
                  </div>
                </div>


                <div class="col-12">
                  <q-expansion-item label="Advanced Settings" header-class="text-h6">
                    <q-card>
                      <q-card-section>
                        <div class="row q-col-gutter-md">
                          <div class="col-12">
                            <q-select v-model="selectedCameraName" :options="cameraStore.cameraOptions" label="Camera" />
                          </div>



                          <div class="col-12">
                            <q-select v-model="pathMethod" :options="pathMethods" label="Path Method" >
                              <q-tooltip>{{ scanSettingDescription('path_method') }}</q-tooltip>
                            </q-select>
                          </div>
                          <div class="col-12">
                            <q-select v-model="imageFormat" :options="['jpeg', 'dng', 'rgb_array', 'yuv_array']" label="Image Format" >
                              <q-tooltip>{{ scanSettingDescription('image_format') }}</q-tooltip>
                            </q-select>
                          </div>
                          <div class="col-6">
                            <q-input type="number" v-model.number="minTheta" label="Min Theta (degrees)" >
                              <q-tooltip>{{ scanSettingDescription('min_theta') }}</q-tooltip>
                            </q-input>
                          </div>
                          <div class="col-6">
                            <q-input type="number" v-model.number="maxTheta" label="Max Theta (degrees)" >
                              <q-tooltip>{{ scanSettingDescription('max_theta') }}</q-tooltip>
                            </q-input>
                          </div>
                          <div class="col-12">
                            <div class="row items-center q-col-gutter-md">
                              <div class="col-auto">
                                <q-checkbox v-model="optimizePath" label="Optimize Path" >
                                  <q-tooltip>{{ scanSettingDescription('optimize_path') }}</q-tooltip>
                                </q-checkbox>
                              </div>
                              <div class="col">
                                <q-input v-model="optimizationAlgorithm" label="Optimization Algorithm" :disable="!optimizePath" >
                                  <q-tooltip>{{ scanSettingDescription('optimization_algorithm') }}</q-tooltip>
                                </q-input>
                              </div>
                            </div>
                          </div>
                        </div>
                      </q-card-section>
                    </q-card>
                  </q-expansion-item>
                </div>
                <div class="col-12">
                  <q-btn
                    :label="`Start scan with ${photoCount} photos`"
                    type="submit"
                    size="lg"
                    color="primary"
                    class="full-width q-mt-md"
                  />
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
    <create-project-dialog
      v-model="showCreateProjectDialog"
      @create-project="onCreateProject"
    />
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiClient } from 'src/services/apiClient'
import {
  addScanWithDescription,
  type ScanSetting
} from 'src/generated/api'
import { fieldDescriptions, getFieldDescription } from 'src/generated/api/fieldDescriptions'
import generateDashedName from 'src/utils/randomName'

import CameraPreview from 'components/CameraPreview.vue'
import CreateProjectDialog from 'components/CreateProjectDialog.vue'
import { useProjectsStore } from 'src/stores/projects'
import { useCameraStore } from 'src/stores/camera'

const $q = useQuasar()
const route = useRoute()

const projectsStore = useProjectsStore()
const cameraStore = useCameraStore()

const pathMethods = [
  { label: 'Fibonacci', value: 'fibonacci' },
  { label: 'Spiral', value: 'spiral' }
]

const selectedCameraName = ref<string>('')
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

const photoCount = computed(() => points.value * (enableFocusStacking.value ? focusStacks.value : 1))

type ScanSettingField = keyof (typeof fieldDescriptions)['ScanSetting']

const scanSettingDescription = (field: ScanSettingField) => getFieldDescription('ScanSetting', field)

const scanning = ref(false)
const showCreateProjectDialog = ref(false)

const selectedCamera = computed(() => cameraStore.cameraOptions.find(c => c.value === selectedCameraName.value) || null)

watch(selectedCameraName, (newVal) => cameraStore.setSelectedCamera(newVal))

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
  if (!selectedCameraName.value) {
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
      query: { camera_name: selectedCameraName.value },
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
  await cameraStore.fetchCameras()
  await projectsStore.fetchProjects()

  selectedCameraName.value = cameraStore.selectedCamera || ''

  // Set default project if available
  if (projectsStore.projects.length === 0) {
    selectedProject.value = generateDashedName()
  }

  // Set project from query parameter if provided and exists
  const projectFromQuery = route.query.project as string
  if (projectFromQuery && projectsStore.projects.some(p => p.name === projectFromQuery)) {
    selectedProject.value = projectFromQuery
  }
})
</script>
