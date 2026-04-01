<template>
  <BasePage class="scan-page" :center-content="false">
    <template #background>
      <BlurredSnapshotBackground
        :src="snapshotBackgroundSrc"
        :blur-px="10"
        :saturate-percent="100"
        :transition-ms="1600"
        :max-opacity="0.3"
        :orientation-flag="snapshotOrientationFlag"
      />
    </template>
    <div class="q-pa-md">
      <template v-if="showDisconnectedSkeleton">
        <div class="row justify-center q-col-gutter-sm">
          <div class="col-12 col-md-4 col-lg-3">
            <q-card flat bordered class="q-pa-md">
              <div class="q-gutter-y-sm">
                <q-skeleton type="text" width="50%" />
                <q-skeleton type="text" width="70%" />
                <q-skeleton type="rect" height="32px" />
                <q-skeleton type="rect" height="32px" />
                <q-skeleton type="rect" height="32px" />
                <q-skeleton type="text" width="40%" />
                <q-skeleton type="QBtn" class="q-mt-sm" />
              </div>
            </q-card>
          </div>
          <div class="col-12 col-md-8 col-lg-9">
            <q-card flat bordered>
              <q-skeleton type="rect" height="320px" />
            </q-card>
          </div>
        </div>
        <div class="q-mt-md">
          <q-card flat bordered class="q-pa-md">
            <div class="q-gutter-y-sm">
              <q-skeleton type="text" width="30%" />
              <q-skeleton type="rect" height="24px" v-for="index in 4" :key="index" />
              <q-skeleton type="text" width="45%" />
            </div>
          </q-card>
        </div>
      </template>
      <template v-else>
        <div class="row justify-center q-col-gutter-sm">
          <div class="col-12 col-md-4 col-lg-3">
            <ScanStartSection
              :project-options="projectsStore.projectNames"
              v-model:selected-project="selectedProject"
              :photo-count="photoCount"
              :preset-options="presetOptions"
              v-model:selected-preset-id="selectedPresetId"
              @create-project-click="showCreateProjectDialog = true"
              @create-preset-click="openSavePresetDialog"
              @overwrite-preset="handleOverwritePreset"
              @delete-preset="handleDeletePreset"
              @reset-defaults="resetSettingsToDefaults"
              @submit="startScan"
            />
          </div>
          <div class="col-12 col-md-8 col-lg-9">
            <camera-view
              :scanning="scanning"
              :camera="selectedCamera"
              :camera-options="cameraStore.cameraOptions"
              v-model:selectedCameraName="selectedCameraName"
            />
          </div>
        </div>

        <div class="q-mt-md">
          <ScanSettingsSection
            ref="scanSettingsSectionRef"
            :camera-name="selectedCameraName"
            :camera="selectedCamera"
            :camera-options="cameraStore.cameraOptions"
            v-model:selectedCameraName="selectedCameraName"
            @scan-settings-change="handleScanSettingsChange"
            @update:photoCount="value => (photoCount = value)"
          />
        </div>
        <create-project-dialog
          v-model="showCreateProjectDialog"
          @create-project="onCreateProject"
        />
        <scan-preset-save-dialog
          v-model="showSavePresetDialog"
          :initial-name="presetDialogInitialName"
          @save="handleSavePreset"
        />
      </template>
    </div>
  </BasePage>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient, getApiSdk } from 'src/services/apiClient'
import { type ScanSetting, type Task } from 'src/generated/api'
import generateDashedName from 'src/utils/randomName'

import CameraView from 'components/CameraView.vue'
import BasePage from 'components/base/BasePage.vue'
import BlurredSnapshotBackground from 'components/background/BlurredSnapshotBackground.vue'
import ScanStartSection from 'components/scan/ScanStartSection.vue'
import ScanSettingsSection from 'components/scan/ScanSettingsSection.vue'
import CreateProjectDialog from 'components/project/CreateProjectDialog.vue'
import ScanPresetSaveDialog from 'components/scan/ScanPresetSaveDialog.vue'
import { useProjectsStore } from 'src/stores/projects'
import { useCameraStore } from 'src/stores/camera'
import { useTaskStore } from 'src/stores/tasks'
import { useScanTemplateStore } from 'src/stores/scanTemplate'
import { useScanPresetsStore } from 'src/stores/scanPresets'
import { useCloudResetGuard } from 'src/composables/useCloudResetGuard'
import { useDeviceStore } from 'src/stores/device'
const route = useRoute()
const router = useRouter()

const projectsStore = useProjectsStore()
const cameraStore = useCameraStore()
const taskStore = useTaskStore()
const scanTemplateStore = useScanTemplateStore()
const scanPresetsStore = useScanPresetsStore()
const { promptCloudReset } = useCloudResetGuard()
const deviceStore = useDeviceStore()
const apiSdk = () => getApiSdk()

const selectedCameraName = ref<string>('')
const selectedProject = ref('')
const photoCount = ref(0)
const selectedPresetId = ref('')
const showSavePresetDialog = ref(false)
const presetDialogInitialName = ref('')
const lastScanSettings = ref<ScanSetting | null>(null)
const isRestoringFromHiddenPreset = ref(false)
const canPersistHiddenPreset = ref(false)
let hiddenPresetPersistTimeout: ReturnType<typeof setTimeout> | null = null

type ScanSettingsSectionInstance = InstanceType<typeof ScanSettingsSection>
const scanSettingsSectionRef = ref<ScanSettingsSectionInstance | null>(null)

const scanning = ref(false)
const showCreateProjectDialog = ref(false)
const presetOptions = computed(() =>
  scanPresetsStore.presets
    .filter(preset => !preset.hidden)
    .map(preset => ({
      label: preset.name,
      value: preset.id
    }))
)

const persistHiddenPreset = (force = false) => {
  if (( !force && !canPersistHiddenPreset.value) || isRestoringFromHiddenPreset.value) {
    return
  }
  if (!scanSettingsSectionRef.value) {
    return
  }
  const scanSettings = lastScanSettings.value ?? scanSettingsSectionRef.value.getScanSettings()
  if (!scanSettings) {
    return
  }
  scanPresetsStore.saveHiddenPreset({
    scanSettings,
    cameraName: selectedCameraName.value,
    selectedProject: selectedProject.value || null,
    selectedPresetId: selectedPresetId.value || null
  })
}

const scheduleHiddenPresetPersist = () => {
  if (!canPersistHiddenPreset.value || isRestoringFromHiddenPreset.value) {
    return
  }
  if (hiddenPresetPersistTimeout) {
    window.clearTimeout(hiddenPresetPersistTimeout)
  }
  hiddenPresetPersistTimeout = window.setTimeout(() => {
    hiddenPresetPersistTimeout = null
    persistHiddenPreset()
  }, 200)
}

const restoreHiddenPreset = async () => {
  const hiddenPreset = scanPresetsStore.getHiddenPreset()
  if (!hiddenPreset) {
    canPersistHiddenPreset.value = true
    return
  }
  isRestoringFromHiddenPreset.value = true

  if (hiddenPreset.selectedProject) {
    selectedProject.value = hiddenPreset.selectedProject
  }

  if (hiddenPreset.selectedPresetId) {
    const found = scanPresetsStore.getPreset(hiddenPreset.selectedPresetId)
    selectedPresetId.value = found ? hiddenPreset.selectedPresetId : ''
  }

  if (hiddenPreset.cameraName && cameraStore.cameraOptions.some(c => c.value === hiddenPreset.cameraName)) {
    selectedCameraName.value = hiddenPreset.cameraName
  }

  await nextTick()
  if (scanSettingsSectionRef.value) {
    scanSettingsSectionRef.value.applySettings(hiddenPreset.scanSettings, null)
  }
  lastScanSettings.value = hiddenPreset.scanSettings

  isRestoringFromHiddenPreset.value = false
  canPersistHiddenPreset.value = true
}

const handleScanSettingsChange = (settings: ScanSetting) => {
  lastScanSettings.value = settings
  scheduleHiddenPresetPersist()
}

const selectedCamera = computed(() => cameraStore.cameraOptions.find(c => c.value === selectedCameraName.value) || null)
const snapshotOrientationFlag = computed(() => selectedCamera.value?.orientationFlag ?? null)
const snapshotBackgroundSrc = computed(() => cameraStore.photoObjectUrl)
const showDisconnectedSkeleton = computed(() => deviceStore.hasConnectionIssue)
const selectedProjectEntity = computed(() =>
  projectsStore.projects.find((project) => project.name === selectedProject.value) ?? null
)

const activeScanTaskId = computed(() => taskStore.activeScanTaskId)

watch(selectedCameraName, (newVal) => {
  cameraStore.setSelectedCamera(newVal)
  scheduleHiddenPresetPersist()
})

watch(selectedProject, () => {
  scheduleHiddenPresetPersist()
})

watch(
  () => scanSettingsSectionRef.value,
  (instance) => {
    if (instance) {
      scheduleHiddenPresetPersist()
    }
  }
)

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

const performStartScan = async () => {
  if (!scanSettingsSectionRef.value) {
    return
  }

  scanning.value = true

  const scanSettings = scanSettingsSectionRef.value.getScanSettings()

  try {
    const taskResponse = await apiSdk().addScanWithDescription({
      client: apiClient,
      path: { project_name: selectedProject.value },
      query: { camera_name: selectedCameraName.value },
      body: scanSettings
    })
    const task = (taskResponse?.data ?? taskResponse) as Task | null
    if (!task?.id || typeof task.id !== 'string' || !task.id.trim()) {
      throw new Error('Scan start response does not contain a valid task id')
    }

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

  if (selectedProjectEntity.value?.downloaded) {
    promptCloudReset(selectedProject.value, async () => {
      await projectsStore.fetchProjects()
      await performStartScan()
    })
    return
  }

  await performStartScan()
}

const resetSettingsToDefaults = () => {
  scanSettingsSectionRef.value?.resetToDefaults()
}

const openSavePresetDialog = () => {
  presetDialogInitialName.value = ''
  showSavePresetDialog.value = true
}

const handleSavePreset = (name: string) => {
  if (!scanSettingsSectionRef.value) {
    return
  }
  const scanSettings = scanSettingsSectionRef.value.getScanSettings()
  const cameraSettings = scanSettingsSectionRef.value.getCameraSettingsSnapshot()
  if (selectedPresetId.value) {
    scanPresetsStore.updatePreset(selectedPresetId.value, {
      scanSettings,
      cameraSettings,
      cameraName: selectedCameraName.value
    })
  } else {
    const presetId = scanPresetsStore.addPreset({
      name,
      scanSettings,
      cameraSettings,
      cameraName: selectedCameraName.value
    })
    selectedPresetId.value = presetId
  }
}

const handleDeletePreset = (presetId: string) => {
  scanPresetsStore.removePreset(presetId)
  if (selectedPresetId.value === presetId) {
    selectedPresetId.value = ''
  }
}

const handleOverwritePreset = () => {
  if (!selectedPresetId.value || !scanSettingsSectionRef.value) {
    return
  }
  const scanSettings = scanSettingsSectionRef.value.getScanSettings()
  const cameraSettings = scanSettingsSectionRef.value.getCameraSettingsSnapshot()
  scanPresetsStore.updatePreset(selectedPresetId.value, {
    scanSettings,
    cameraSettings,
    cameraName: selectedCameraName.value
  })
}

watch(selectedPresetId, (newId) => {
  scheduleHiddenPresetPersist()
  if (!newId) {
    return
  }
  const preset = scanPresetsStore.getPreset(newId)
  if (!preset || !scanSettingsSectionRef.value) {
    return
  }
  scanSettingsSectionRef.value.applySettings(preset.scanSettings, preset.cameraSettings ?? null)
  if (preset.cameraName && cameraStore.cameraOptions.some(c => c.value === preset.cameraName)) {
    selectedCameraName.value = preset.cameraName
  }
})

onMounted(async () => {
  await taskStore.ensureConnected()

  if (activeScanTaskId.value) {
    await router.replace(`/scan/progress/${activeScanTaskId.value}`)
    return
  }

  await cameraStore.fetchCameras()
  await projectsStore.fetchProjects()

  selectedCameraName.value = cameraStore.selectedCamera || ''

  await nextTick()
  await restoreHiddenPreset()
  if (!canPersistHiddenPreset.value) {
    canPersistHiddenPreset.value = true
  }

  // Set camera from query parameter if provided and exists
  const cameraFromQuery = route.query.camera as string
  if (cameraFromQuery && cameraStore.cameraOptions.some(c => c.value === cameraFromQuery)) {
    selectedCameraName.value = cameraFromQuery
  }

  // Set project from query parameter if provided and exists
  const projectFromQuery = route.query.project as string
  if (projectFromQuery && projectsStore.projects.some(p => p.name === projectFromQuery)) {
    selectedProject.value = projectFromQuery
  } else if (!selectedProject.value) {
    selectedProject.value = ''
  }

  // Apply template settings if available
  if (scanTemplateStore.hasTemplate()) {
    await nextTick()
    if (scanSettingsSectionRef.value && scanTemplateStore.scanSettings) {
      scanSettingsSectionRef.value.applySettings(scanTemplateStore.scanSettings, scanTemplateStore.cameraSettings)
      scanTemplateStore.clearTemplate()
    }
  }
})

onBeforeUnmount(() => {
  if (hiddenPresetPersistTimeout) {
    window.clearTimeout(hiddenPresetPersistTimeout)
    hiddenPresetPersistTimeout = null
  }
  persistHiddenPreset(true)
})
</script>
