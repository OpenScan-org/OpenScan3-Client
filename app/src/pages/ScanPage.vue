<template>
  <q-page>
    <div class="q-pa-md">
      <div class="row justify-center q-col-gutter-sm">
        <div class="col-12 col-md-4 col-lg-3">
          <ScanStartSection
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
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from 'src/services/apiClient'
import { addScanWithDescription } from 'src/generated/api'
import generateDashedName from 'src/utils/randomName'

import CameraView from 'components/CameraView.vue'
import ScanStartSection from 'components/scan/ScanStartSection.vue'
import ScanSettingsSection from 'components/scan/ScanSettingsSection.vue'
import CreateProjectDialog from 'components/project/CreateProjectDialog.vue'
import { useProjectsStore } from 'src/stores/projects'
import { useCameraStore } from 'src/stores/camera'
import { useTaskStore } from 'src/stores/tasks'
const route = useRoute()
const router = useRouter()

const projectsStore = useProjectsStore()
const cameraStore = useCameraStore()
const taskStore = useTaskStore()

const selectedCameraName = ref<string>('')
const selectedProject = ref('')
const photoCount = ref(0)

type ScanSettingsSectionInstance = InstanceType<typeof ScanSettingsSection>
const scanSettingsSectionRef = ref<ScanSettingsSectionInstance | null>(null)

const scanning = ref(false)
const showCreateProjectDialog = ref(false)

const selectedCamera = computed(() => cameraStore.cameraOptions.find(c => c.value === selectedCameraName.value) || null)

const activeScanTaskId = computed(() => {
  const tasks = taskStore.taskList

  const running = tasks.find((task) => task.task_type === 'scan_task' && task.status === 'running')
  if (running?.id) {
    return running.id
  }

  const pendingCandidates = tasks
    .filter((task) => task.task_type === 'scan_task' && task.status === 'pending')
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a.started_at ?? a.created_at ?? 0).getTime()
      const bTime = new Date(b.started_at ?? b.created_at ?? 0).getTime()
      return bTime - aTime
    })

  if (pendingCandidates[0]?.id) {
    return pendingCandidates[0].id
  }

  const pausedCandidates = tasks
    .filter((task) => task.task_type === 'scan_task' && (task.status === 'paused' || task.status === 'interrupted'))
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a.started_at ?? a.created_at ?? 0).getTime()
      const bTime = new Date(b.started_at ?? b.created_at ?? 0).getTime()
      return bTime - aTime
    })

  return pausedCandidates[0]?.id ?? null
})

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
    const task = await addScanWithDescription({
      client: apiClient,
      path: { project_name: selectedProject.value },
      query: { camera_name: selectedCameraName.value },
      body: scanSettings
    })

    taskStore.applyTaskUpdate(task)
    await router.push(`/scan/progress/${task.id}`)

    // Refresh projects list after starting scan (in case a new project was created)
    await projectsStore.fetchProjects()
  } catch (error) {
    console.error('Scan could not be started.', error)
  } finally {
    scanning.value = false
  }
}

onMounted(async () => {
  await taskStore.ensureConnected()

  if (activeScanTaskId.value) {
    await router.replace(`/scan/progress/${activeScanTaskId.value}`)
    return
  }

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
