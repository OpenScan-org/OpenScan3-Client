<template>
  <q-page>
    <div class="q-pa-md">
      <div class="row justify-center q-col-gutter-md">
        <div class="col-12 col-md-3">
          <scan-settings-card
            ref="scanSettingsCardRef"
            :project-options="projectsStore.projectNames"
            v-model:selected-project="selectedProject"
            @create-project-click="showCreateProjectDialog = true"
            @submit="startScan"
          />
        </div>
        <div class="col-12 col-md-3">
          <q-card flat bordered>
            <q-card-section>
              <div class="text-h6">Camera Settings</div>
            </q-card-section>
            <q-card-section>
              <CameraSettings
                :camera="selectedCamera"
                :camera-options="cameraStore.cameraOptions"
                v-model:selected-camera-name="selectedCameraName"
              />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-md-6">
          <camera-view :scanning="scanning" :camera="selectedCamera" />
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
import { addScanWithDescription } from 'src/generated/api'
import generateDashedName from 'src/utils/randomName'

import CameraView from 'components/CameraView.vue'
import ScanSettingsCard from 'components/ScanSettingsCard.vue'
import CreateProjectDialog from 'components/CreateProjectDialog.vue'
import CameraSettings from 'components/camera/CameraSettings.vue'
import { useProjectsStore } from 'src/stores/projects'
import { useCameraStore } from 'src/stores/camera'

const $q = useQuasar()
const route = useRoute()

const projectsStore = useProjectsStore()
const cameraStore = useCameraStore()

const selectedCameraName = ref<string>('')
const selectedProject = ref('')

type ScanSettingsCardInstance = InstanceType<typeof ScanSettingsCard>
const scanSettingsCardRef = ref<ScanSettingsCardInstance | null>(null)

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

  if (!scanSettingsCardRef.value) {
    $q.notify({ type: 'negative', message: 'Scan settings are not available.' })
    return
  }

  scanning.value = true

  const scanSettings = scanSettingsCardRef.value.getScanSettings()

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
