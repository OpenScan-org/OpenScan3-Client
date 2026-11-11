<template>
  <BasePage class="scan-wizard-page" :center-content="false">
    <template #background>
      <BlurredSnapshotBackground
        v-if="backgroundPreviewUrl"
        :src="backgroundPreviewUrl"
        alt="Camera preview background"
        :blur-px="10"
        :saturate-percent="100"
        :max-opacity="0.3"
        :transition-ms="600"
        :orientation-flag="selectedCamera?.orientationFlag ?? null"
      />
    </template>
    <div class="scan-wizard-page__content">
      <div class="row justify-center q-col-gutter-md">
        <div class="col-12 col-md-10 col-lg-8">
      <q-card
        v-if="showDisconnectedSkeleton"
        flat
        bordered
        class="scan-wizard-page__skeleton q-pa-lg"
        role="status"
        aria-label="Reconnecting to the scan device"
        aria-busy="true"
      >
        <q-skeleton type="text" width="45%" class="q-mb-sm" />
        <q-skeleton type="text" width="75%" class="q-mb-lg" />
        <div class="row justify-between q-mb-lg">
          <div v-for="step in steps" :key="step.id" class="column items-center">
            <q-skeleton type="QAvatar" size="32px" />
            <q-skeleton type="text" width="56px" />
          </div>
        </div>
        <div class="q-gutter-y-md">
          <q-skeleton type="text" width="90%" />
          <template v-if="activeStepId === 'project'">
            <q-skeleton v-for="index in 3" :key="index" type="rect" height="64px" />
          </template>
          <template v-else-if="activeStepId === 'cropping'">
            <q-skeleton type="QBtn" width="240px" class="q-mx-auto" />
            <q-skeleton type="rect" class="scan-wizard-page__preview-skeleton q-mx-auto" />
            <q-skeleton type="rect" height="72px" />
          </template>
          <q-skeleton v-else type="rect" height="220px" />
        </div>
        <div class="row justify-between q-mt-lg">
          <q-skeleton type="QBtn" />
          <q-skeleton type="QBtn" />
        </div>
      </q-card>
      <BaseWizard
        v-else
        v-model="activeStepId"
        :steps="steps"
        finish-label="Start scan"
        title="Scan Wizard"
        subtitle="Automatically finding the best scan settings."
        @finish="startScan"
      >
        <template #default="{ step }">
          <section v-if="step.id === 'project'" class="scan-wizard-page__project">
            <p>
              Select an existing project or
              <button type="button" class="scan-wizard-page__create-project-link" @click="showCreateProjectDialog = true">create a new project</button>.
              Your scan will be saved in this project.
            </p>
            <div v-if="projectsStore.loading" class="project-list-skeleton q-gutter-y-sm">
              <q-skeleton v-for="index in 3" :key="index" type="rect" height="56px" />
            </div>
            <BaseBanner v-else-if="projectsStore.error" background-class="bg-red-2" text-class="text-negative">
              {{ projectsStore.error }}
              <template #action>
                <BaseButtonSecondary label="Retry" @click="loadProjects" />
              </template>
            </BaseBanner>
            <ProjectsList
              v-else
              v-model:create-dialog="showCreateProjectDialog"
              :projects="projectsStore.projects"
              :selected-project-name="selectedProjectName"
              :sort-state="projectSort"
              selection-only
              embedded
              class="project-list-wrapper"
              @select:project="selectedProjectName = $event"
              @update:sort="projectSort = $event"
              @create:project="createProject"
            />
          </section>

          <section v-else-if="step.id === 'cropping'">
            <BaseBanner v-if="cameraStore.error" background-class="bg-red-2" text-class="text-negative">
              {{ cameraStore.error }}
              <template #action>
                <BaseButtonSecondary label="Retry" @click="cameraStore.fetchCameras()" />
              </template>
            </BaseBanner>
            <ScanWizardCropPreview
              v-model="crop"
              :camera="selectedCamera"
              :active="activeStepId === 'cropping'"
              :disabled="exposureBusy || analysisBusy"
            >
              <template #controls>
                <div v-if="exposureBusy" class="row items-center justify-center q-gutter-sm q-mb-md" role="status">
                  <q-spinner color="primary" size="20px" />
                  <span>Adjusting exposure automatically…</span>
                </div>
                <BaseBanner v-if="exposureError" class="q-mb-md" background-class="bg-red-2" text-class="text-negative">
                  {{ exposureError }}
                </BaseBanner>
              </template>
            </ScanWizardCropPreview>
          </section>
          <section v-else-if="step.id === 'analysis'">
            <div v-if="analysisTask?.status !== 'completed'" class="scan-wizard-page__analysis-progress" role="status" aria-live="polite">
              <div class="row items-center q-gutter-xs text-caption">
                <q-spinner v-if="analysisBusy" color="primary" size="16px" />
                <span>{{ analysisMessage }}</span>
              </div>
              <div
                v-if="analysisTask?.progress?.message && analysisTask.progress.message !== analysisMessage"
                class="text-caption text-grey-7 q-mt-xs"
              >{{ analysisTask.progress.message }}</div>
              <div v-if="analysisBusy" class="text-caption text-grey-7 q-mt-xs">
                {{ analysisProgress === null ? 'Waiting for progress…' : `${Math.round(analysisProgress * 100)}% · Step ${analysisTask?.progress?.current ?? 0} of ${analysisTask?.progress?.total ?? 0}` }}
              </div>
              <q-linear-progress
                v-if="analysisBusy"
                class="q-mt-sm"
                size="2px"
                :indeterminate="analysisProgress === null"
                :value="analysisProgress ?? 0"
                aria-label="Scan analysis progress"
              />
            </div>
            <BaseBanner v-if="analysisError" class="q-mt-md" background-class="bg-red-2" text-class="text-negative">
              {{ analysisError }}
              <template v-if="analysisBusy && analysisTask?.id" #action>
                <BaseButtonSecondary label="Retry status" @click="pollAnalysis" />
              </template>
            </BaseBanner>
            <ScanWizardSiftStep
              v-if="analysisTask?.status === 'completed'"
              :result="analysisTask.result"
              :shutter-ms="deviceStore.getCamera(cameraStore.selectedCamera ?? '')?.settings?.shutter ?? null"
              :disabled="scanStarting || cloudResetLoading"
              @retry="activeStepId = 'cropping'"
            />
          </section>
          <section v-else-if="step.id === 'quality'">
            <p class="scan-wizard-page__quality-instructions">Choose how much time and detail you want for your scan. Higher quality takes more photos and increases scan and reconstruction time.</p>
            <ScanWizardQualityStep
              v-if="analysisTask?.status === 'completed'"
              v-model:auto-start-stacking="autoStartStacking"
              :result="analysisTask.result"
              :disabled="scanStarting || openingScanSettings || cloudResetLoading"
              @plan-change="scanPlan = $event"
              @retry="activeStepId = 'cropping'"
              @manual-settings="continueToScanSettings"
            />
            <BaseBanner v-if="scanError" class="q-mt-md" background-class="bg-red-2" text-class="text-negative">
              {{ scanError }}
            </BaseBanner>
            <div class="scan-wizard-page__quality-actions">
              <BaseButtonPrimary
                :label="startedScanTaskId ? 'View scan progress' : `Start scan with ${scanPlan?.totalPhotos ?? 0} photos`"
                class="full-width"
                :loading="scanStarting || cloudResetLoading"
                :disable="!selectedProjectName || !selectedCamera || !scanPlan || analysisTask?.status !== 'completed' || exposureBusy || analysisBusy || scanStarting || openingScanSettings || cloudResetLoading"
                @click="startScan"
              />
            </div>
          </section>
        </template>

        <template #navigation="{ isFirstStep, isLastStep, goNext, goBack }">
          <div :class="isLastStep ? 'scan-wizard-page__quality-navigation' : 'row items-center justify-end q-gutter-sm'">
            <BaseButtonSecondary
              v-if="!isFirstStep"
              label="Back"
              :disable="exposureBusy || analysisBusy || scanStarting || openingScanSettings || cloudResetLoading"
              @click="goBack"
            />
            <q-space v-if="!isLastStep" />
            <template v-if="isLastStep">
              <BaseButtonSecondary class="scan-wizard-page__debug-button" label="Debug report" icon="bug_report" :disable="!analysisTask" @click="debugOpen = true" />
              <BaseButtonSecondary
                label="Use settings on scan page"
                :loading="openingScanSettings"
                :disable="!scanPlan || scanStarting || openingScanSettings || cloudResetLoading || Boolean(startedScanTaskId)"
                @click="continueToScanSettings"
              >
                <q-tooltip>Leave the wizard and open the scan page with your project, photo positions and focus settings applied. The scan will not start yet.</q-tooltip>
              </BaseButtonSecondary>
            </template>
            <BaseButtonPrimary
              v-if="!isLastStep"
              :label="nextButtonLabel"
              :loading="scanStarting || cloudResetLoading || (activeStepId === 'analysis' && analysisBusy)"
              :disable="!selectedProjectName || exposureBusy || analysisBusy || scanStarting || openingScanSettings || cloudResetLoading || (activeStepId === 'cropping' && (!crop || !selectedCamera))"
              @click="handleNext(goNext)"
            />
          </div>
        </template>
      </BaseWizard>
        </div>
      </div>
    </div>
    <ScanAnalysisDebugDialog v-model="debugOpen" :task="analysisTask" :crop="crop" :plan="scanPlan" :camera-name="selectedCamera?.value" :project-name="selectedProjectName" />
  </BasePage>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'

import BaseBanner from 'components/base/BaseBanner.vue'
import BaseButtonPrimary from 'components/base/BaseButtonPrimary.vue'
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue'
import BasePage from 'components/base/BasePage.vue'
import BlurredSnapshotBackground from 'components/background/BlurredSnapshotBackground.vue'
import BaseWizard from 'components/base/BaseWizard.vue'
import ScanWizardCropPreview, { type WizardCrop } from 'components/scan/ScanWizardCropPreview.vue'
import ScanWizardQualityStep from 'components/scan/ScanWizardQualityStep.vue'
import ScanWizardSiftStep from 'components/scan/ScanWizardSiftStep.vue'
import ScanAnalysisDebugDialog from 'components/scan/ScanAnalysisDebugDialog.vue'
import ProjectsList, { type SortState } from 'components/project/ProjectsList.vue'
import type { Task } from 'src/generated/api'
import { useProjectsStore } from 'src/stores/projects'
import { useCameraStore } from 'src/stores/camera'
import { useFrontendSettingsStore } from 'src/stores/frontendSettings'
import { useDeviceStore } from 'src/stores/device'
import { apiClient, getApiSdk } from 'src/services/apiClient'
import type { ScanAnalysisTaskResponse } from 'src/generated/api/next'
import { fieldDefaults } from 'src/generated/api/next/fieldDefaults'
import { buildWizardScanSettings, type ScanWizardPlan } from 'src/utils/scanWizardPlan'
import { useTaskStore } from 'src/stores/tasks'
import { useCloudResetGuard } from 'src/composables/useCloudResetGuard'
import { useDeviceWakeup } from 'src/composables/useDeviceWakeup'
import { useScanTemplateStore } from 'src/stores/scanTemplate'

const steps = [
  { id: 'project', label: 'Project', caption: 'Choose where to save the scan.' },
  { id: 'cropping', label: 'Cropping', caption: 'Position your object in the camera preview.' },
  { id: 'analysis', label: 'Scan readiness', caption: 'Check surface preparation.' },
  { id: 'quality', label: 'Quality', caption: 'Choose quality and start.' }
]

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()
const cameraStore = useCameraStore()
const frontendSettingsStore = useFrontendSettingsStore()
const deviceStore = useDeviceStore()
const showDisconnectedSkeleton = computed(() => deviceStore.hasConnectionIssue)
const taskStore = useTaskStore()
const scanTemplateStore = useScanTemplateStore()
const { promptCloudReset, cloudResetLoading } = useCloudResetGuard()
const { wakeUpDevice } = useDeviceWakeup()
const scanPlan = ref<ScanWizardPlan | null>(null)
const autoStartStacking = ref(true)
const scanStarting = ref(false)
const openingScanSettings = ref(false)
const debugOpen = ref(false)
const scanError = ref('')
const startedScanTaskId = ref<string | null>(null)
const crop = ref<WizardCrop | null>(null)
type AnalysisTask = Pick<ScanAnalysisTaskResponse, 'id' | 'status' | 'progress' | 'error'> & { result?: unknown }
const analysisTask = ref<AnalysisTask | null>(null)
const analysisStarting = ref(false)
const analysisError = ref('')
const analysisBusy = computed(() => analysisStarting.value || Boolean(
  analysisTask.value && !['completed', 'error', 'cancelled'].includes(analysisTask.value.status ?? 'pending')
))
const nextButtonLabel = computed(() => {
  if (activeStepId.value !== 'analysis' || analysisTask.value?.status === 'completed') return 'Next'
  if (analysisBusy.value) return 'Analysing…'
  if (analysisError.value || ['error', 'cancelled'].includes(analysisTask.value?.status ?? '')) return 'Retry analysis'
  return 'Start analysis'
})
const analysisProgress = computed(() => {
  const progress = analysisTask.value?.progress
  return progress && typeof progress.current === 'number' && typeof progress.total === 'number' && progress.total > 0
    ? Math.min(1, Math.max(0, progress.current / progress.total)) : null
})
const analysisMessage = computed(() => {
  if (!analysisTask.value && analysisError.value) return 'Could not start scan analysis.'
  if (analysisTask.value?.status === 'completed') return 'Scan analysis complete.'
  if (analysisTask.value?.status === 'error') return 'Scan analysis failed.'
  if (analysisTask.value?.status === 'cancelled') return 'Scan analysis was cancelled.'
  if (analysisStarting.value) return 'Preparing the scan analysis…'
  if (analysisTask.value?.status === 'paused' || analysisTask.value?.status === 'interrupted') return 'Analysis paused. Resume it in the task drawer.'
  const message = analysisTask.value?.progress?.message ?? ''
  if (/sift|feature|match/i.test(message)) return 'Checking recognizable surface detail…'
  if (/calibrat|exposure|white balance/i.test(message)) return 'Adjusting camera settings…'
  if (/frame|focus|capture/i.test(message)) return 'Measuring focus across the object…'
  return message || 'Analysing your scan setup…'
})
let pollTimer: ReturnType<typeof setTimeout> | null = null
const analysisAbort = new AbortController()

async function pollAnalysis() {
  const id = analysisTask.value?.id
  if (!id || analysisAbort.signal.aborted) return
  if (pollTimer) clearTimeout(pollTimer)
  analysisError.value = ''
  try {
    const response = await getApiSdk().getTaskStatus({
      client: apiClient, path: { task_id: id }, throwOnError: true, signal: analysisAbort.signal
    })
    if (analysisAbort.signal.aborted) return
    if (!response.data) throw new Error('No task status returned.')
    analysisTask.value = response.data
    if (response.data.status === 'error') analysisError.value = response.data.error || 'Scan analysis failed. Please try again.'
    if (analysisBusy.value) pollTimer = setTimeout(() => { void pollAnalysis() }, 1000)
  } catch {
    if (!analysisAbort.signal.aborted) analysisError.value = 'Could not load analysis progress. Retry to reconnect to the running task.'
  }
}

async function startAnalysis() {
  if (!crop.value || !selectedCamera.value || analysisBusy.value) return
  const box = { ...crop.value }
  const cameraName = selectedCamera.value.value
  analysisStarting.value = true
  analysisTask.value = null
  scanPlan.value = null
  scanError.value = ''
  analysisError.value = ''
  try {
    const sdk = getApiSdk()
    if (!('startScanAnalysis' in sdk)) throw new Error('Scan analysis requires the Next API. Select it in the connection settings.')
    await sdk.updateCameraNameSettings({
      client: apiClient, path: { name: cameraName },
      body: { crop_width: Math.round((1 - box.width) * 100), crop_height: Math.round((1 - box.height) * 100) },
      throwOnError: true, signal: analysisAbort.signal
    })
    const response = await sdk.startScanAnalysis({
      client: apiClient,
      body: { camera_name: cameraName, crop: [box.x, box.y, box.width, box.height] },
      throwOnError: true, signal: analysisAbort.signal
    })
    if (!response.data?.id) throw new Error('The analysis did not return a task ID.')
    analysisTask.value = response.data
    if (response.data.status === 'error') analysisError.value = response.data.error || 'Scan analysis failed.'
  } catch (error) {
    if (!analysisAbort.signal.aborted) analysisError.value = error instanceof Error ? error.message : 'Could not start scan analysis. Please try again.'
  } finally {
    analysisStarting.value = false
  }
  if (analysisBusy.value) void pollAnalysis()
}

function handleNext(goNext: () => void) {
  if (analysisBusy.value || exposureBusy.value) return
  if (activeStepId.value === 'project') {
    if (!selectedProjectName.value) return
    goNext()
  }
  else if (activeStepId.value === 'cropping') {
    if (!crop.value || !selectedCamera.value) return
    goNext()
    void startAnalysis()
  } else if (activeStepId.value === 'analysis') {
    if (analysisTask.value?.status === 'completed') goNext()
    else void startAnalysis()
  } else if (activeStepId.value === 'quality' && analysisTask.value?.status === 'completed') void startScan()
}

onBeforeUnmount(() => {
  analysisAbort.abort()
  exposureAbort?.abort()
  if (pollTimer) clearTimeout(pollTimer)
})
const exposureBusy = ref(false)
const exposureError = ref('')
let exposureAbort: AbortController | null = null
const selectedCamera = computed(() =>
  cameraStore.cameraOptions.find(camera => camera.value === cameraStore.selectedCamera) ?? null
)
const backgroundPreviewUrl = computed(() => {
  if (showDisconnectedSkeleton.value || !frontendSettingsStore.backgroundCameraPreviewEnabled) return null
  const cameraName = cameraStore.selectedCamera
  return cameraName ? cameraStore.getPreviewUrl(cameraName, 30) : null
})

const activeStepId = ref(steps[0].id)
watch(activeStepId, (step, previousStep) => {
  if (step === 'cropping' && previousStep !== 'cropping') void calibrateExposure()
}, { flush: 'sync' })
const selectedProjectName = ref(typeof route.query.project === 'string' ? route.query.project : '')
const projectSort = ref<SortState>({ field: 'name', order: 'asc' })
const showCreateProjectDialog = ref(false)
watch(showDisconnectedSkeleton, disconnected => {
  if (disconnected) {
    exposureAbort?.abort()
    exposureAbort = null
    exposureBusy.value = false
    showCreateProjectDialog.value = false
    debugOpen.value = false
  }
})

const selectedProject = computed(() =>
  projectsStore.projects.find(project => project.name === selectedProjectName.value) ?? null
)

const loadProjects = async () => {
  await projectsStore.fetchProjects()

  if (
    selectedProjectName.value &&
    !projectsStore.projects.some(project => project.name === selectedProjectName.value)
  ) {
    selectedProjectName.value = ''
  }
}

const createProject = async (data: { name: string; description?: string }) => {
  try {
    const project = await projectsStore.createProject(data.name, data.description)
    selectedProjectName.value = project.name
  } catch (error) {
    console.error('Could not create project from scan wizard.', error)
    $q.notify({ type: 'negative', message: 'Could not create the project' })
  }
}

async function calibrateExposure() {
  if (exposureBusy.value || analysisBusy.value || showDisconnectedSkeleton.value) return
  const controller = new AbortController()
  exposureAbort = controller
  exposureBusy.value = true
  exposureError.value = ''
  try {
    if (!selectedCamera.value) await cameraStore.fetchCameras()
    if (!selectedCamera.value) throw new Error('No camera is available for automatic exposure.')
    const cameraName = selectedCamera.value.value
    const sdk = getApiSdk()
    if (!('autoCalibrateExposure' in sdk)) throw new Error('Auto exposure is unavailable for the selected API version.')
    await wakeUpDevice()
    await sdk.autoCalibrateExposure({
      client: apiClient,
      path: { camera_name: cameraName },
      body: {},
      throwOnError: true,
      signal: controller.signal
    })
    await deviceStore.refreshFromRest()
    await cameraStore.fetchCameras()
  } catch (error) {
    if (!controller.signal.aborted) {
      exposureError.value = error instanceof Error ? error.message : 'Could not adjust exposure. Please try again.'
    }
  } finally {
    if (exposureAbort === controller) {
      exposureAbort = null
      exposureBusy.value = false
    }
  }
}

const continueToScanSettings = async () => {
  if (!selectedProjectName.value || scanStarting.value || openingScanSettings.value || cloudResetLoading.value || startedScanTaskId.value) return
  openingScanSettings.value = true
  scanError.value = ''
  try {
    if (scanPlan.value && selectedCamera.value) {
      const cameraSettings = { AF: scanPlan.value.focusStacks === 1 }
      await getApiSdk().updateCameraNameSettings({
        client: apiClient, path: { name: selectedCamera.value.value }, body: cameraSettings, throwOnError: true
      })
      scanTemplateStore.setTemplate(buildWizardScanSettings(scanPlan.value, fieldDefaults.ScanSetting), cameraSettings, {
        autoStartFocusStacking: autoStartStacking.value && scanPlan.value.focusStacks > 1
      })
    }
    await router.push({
      path: '/scan',
      query: {
        project: selectedProjectName.value,
        ...(cameraStore.selectedCamera ? { camera: cameraStore.selectedCamera } : {})
      }
    })
  } catch (error) {
    scanError.value = error instanceof Error ? error.message : 'Could not open scan settings. Please try again.'
  } finally {
    openingScanSettings.value = false
  }
}

async function performStartScan() {
  if (!scanPlan.value || !selectedCamera.value || scanStarting.value || startedScanTaskId.value) return
  const plan = { ...scanPlan.value }
  const cameraName = selectedCamera.value.value
  const projectName = selectedProjectName.value
  scanStarting.value = true
  scanError.value = ''
  try {
    const sdk = getApiSdk()
    if (!('startScanAnalysis' in sdk)) throw new Error('The scan wizard requires the Next API.')
    await wakeUpDevice()
    await sdk.updateCameraNameSettings({
      client: apiClient, path: { name: cameraName }, body: { AF: plan.focusStacks === 1 }, throwOnError: true
    })
    const response = await sdk.addScan({
      client: apiClient,
      path: { project_name: projectName },
      body: {
        camera_name: cameraName,
        scan_settings: buildWizardScanSettings(plan, fieldDefaults.ScanSetting)
      },
      throwOnError: true
    })
    const task = response.data
    if (!task?.id?.trim()) throw new Error('The scan did not return a task ID.')
    startedScanTaskId.value = task.id
    taskStore.applyTaskUpdate(task as Task)

    if (autoStartStacking.value && plan.focusStacks > 1) {
      try {
        const args = [...(task.run_args ?? []), task.run_kwargs]
        const scanArgs = args.find((value): value is { index: number } =>
          Boolean(value) && typeof value === 'object' && 'index' in value && typeof value.index === 'number' && Number.isInteger(value.index)
        )
        if (!scanArgs) throw new Error('The scan task did not include its scan index.')
        const stacking = await sdk.startFocusStacking({
          client: apiClient, path: { project_name: projectName, scan_index: scanArgs.index },
          query: { depends_on: task.id }, throwOnError: true
        })
        if (!stacking.data?.id?.trim()) throw new Error('No focus stacking task ID returned.')
        taskStore.applyTaskUpdate(stacking.data as Task)
      } catch (error) {
        console.error('Could not schedule automatic focus stacking.', error)
        $q.notify({ type: 'warning', message: 'The scan has started, but automatic focus stacking could not be scheduled. Start it from the project after the scan.' })
      }
    }
    void projectsStore.fetchProjects()
    await router.push(`/scan/progress/${task.id}`)
  } catch (error) {
    scanError.value = error instanceof Error ? error.message : 'Could not start the scan. Please try again.'
  } finally {
    scanStarting.value = false
  }
}

async function startScan() {
  if (scanStarting.value || openingScanSettings.value || cloudResetLoading.value || analysisBusy.value) return
  if (startedScanTaskId.value) {
    await router.push(`/scan/progress/${startedScanTaskId.value}`)
    return
  }
  if (analysisTask.value?.status !== 'completed' || !scanPlan.value || !selectedProjectName.value) return
  if (selectedProject.value?.downloaded) {
    promptCloudReset(selectedProjectName.value, async () => {
      await projectsStore.fetchProjects()
      await performStartScan()
    })
    return
  }
  await performStartScan()
}

onMounted(() => {
  void loadProjects()
  void cameraStore.fetchCameras()
})
</script>

<style scoped>
.scan-wizard-page__content {
  position: relative;
}

.scan-wizard-page__quality-navigation {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}
.scan-wizard-page__quality-navigation > :first-child { justify-self: start; }
.scan-wizard-page__quality-navigation > :last-child { justify-self: end; }
.scan-wizard-page__debug-button { justify-self: center; }
.scan-wizard-page__quality-actions { width: 50%; margin: 0 auto; padding: 24px 0; }
.scan-wizard-page__project { width: 50%; margin: 0 auto; }
.scan-wizard-page__quality-instructions { width: 50%; margin: 0 auto 32px; }
.scan-wizard-page__analysis-progress { width: 50%; margin: 0 auto; }
@media (max-width: 599px) {
  .scan-wizard-page__quality-navigation { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .scan-wizard-page__quality-navigation > :last-child { grid-column: 2; grid-row: 1; }
  .scan-wizard-page__debug-button { grid-column: 1 / -1; grid-row: 2; }
  .scan-wizard-page__quality-actions,
  .scan-wizard-page__project,
  .scan-wizard-page__quality-instructions,
  .scan-wizard-page__analysis-progress { width: 100%; }
}

.project-list-wrapper {
  max-height: 420px;
  overflow-y: auto;
}

.scan-wizard-page__skeleton { border-radius: 20px; }
.scan-wizard-page__preview-skeleton { width: 25%; height: auto; aspect-ratio: 3 / 4; border-radius: 12px; }

.scan-wizard-page__create-project-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--q-primary);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}


.project-list-skeleton :deep(.q-skeleton) {
  border-radius: 4px;
}


</style>
