<template>
  <q-page>
    <div class="q-pa-md">
      <div class="row justify-center q-col-gutter-sm">
        <div class="col-12 col-md-4 col-lg-3">
          <ScanProjectSection
            :project-options="projectsStore.projectNames"
            v-model:selected-project="selectedProject"
            :photo-count="photoCount"
            @create-project-click="showCreateProjectDialog = true"
            @submit="startScan"
          />
        </div>
        <div class="col-12 col-md-8 col-lg-9">
          <camera-view :scanning="scanning" :camera="selectedCamera" />
        </div>
      </div>

      <div class="q-mt-md">
        <ScanSettingsSection
          ref="scanSettingsSectionRef"
          :camera-name="selectedCameraName"
          :camera="selectedCamera"
          :camera-options="cameraStore.cameraOptions"
          v-model:selectedCameraName="selectedCameraName"
          @update:photoCount="value => (photoCount = value)"
        />
      </div>
    </div>
    <create-project-dialog
      v-model="showCreateProjectDialog"
      @create-project="onCreateProject"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiClient } from 'src/services/apiClient'
import { addScanWithDescription } from 'src/generated/api'
import generateDashedName from 'src/utils/randomName'

import CameraView from 'components/CameraView.vue'
import ScanProjectSection from 'components/scan/ScanSettingsCard.vue'
import ScanSettingsSection from 'components/scan/ScanSettingsSection.vue'
import CreateProjectDialog from 'components/project/CreateProjectDialog.vue'
import { useProjectsStore } from 'src/stores/projects'
import { useCameraStore } from 'src/stores/camera'
const route = useRoute()

const projectsStore = useProjectsStore()
const cameraStore = useCameraStore()

const selectedCameraName = ref<string>('')
const selectedProject = ref('')
const photoCount = ref(0)

type ScanSettingsSectionInstance = InstanceType<typeof ScanSettingsSection>
const scanSettingsSectionRef = ref<ScanSettingsSectionInstance | null>(null)

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
    console.error('Failed to create project.', error)
  }
}

const startScan = async () => {
  if (!selectedCameraName.value) {
    return
  }

  if (!selectedProject.value) {
    return
  }

  if (!scanSettingsSectionRef.value) {
    return
  }

  scanning.value = true

  const scanSettings = scanSettingsSectionRef.value.getScanSettings()

  try {
    await addScanWithDescription({
      client: apiClient,
      path: { project_name: selectedProject.value },
      query: { camera_name: selectedCameraName.value },
      body: scanSettings
    })

    // Refresh projects list after starting scan (in case a new project was created)
    await projectsStore.fetchProjects()
  } catch (error) {
    console.error('Scan could not be started.', error)
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
