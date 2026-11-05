<template>
  <BasePage class="scan-wizard-page" :center-content="false">
    <div class="scan-wizard-page__content">
      <BaseWizard
        v-model="activeStepId"
        :steps="steps"
        finish-label="Start scan"
        title="Scan wizard"
        subtitle="We'll guide you through the most important scan settings."
        @finish="startScan"
      >
        <template #default="{ step }">
          <section v-if="step.id === 'project'">
            <h2 class="text-h6 q-mt-none q-mb-xs">Choose a project</h2>
            <p class="text-body2 text-grey-7">Your scan will be saved in this project. Select an existing project or create a new one.</p>
            <div class="project-selection q-gutter-y-md">
              <SelectWithButton
                v-model="selectedProjectName"
                :options="projectOptions"
                label="Project"
                emit-value
                map-options
                button-icon="add"
                button-aria-label="Create new project"
                button-tooltip="Create new project"
                @button-click="showCreateProjectDialog = true"
              />

              <div class="text-caption text-grey-7">
                {{ projectHint }}
              </div>

              <div v-if="projectsStore.loading" class="project-list-skeleton q-gutter-y-sm">
                <q-skeleton v-for="index in 3" :key="index" type="rect" height="56px" />
              </div>

              <BaseBanner v-else-if="projectsStore.error" background-class="bg-red-2" text-class="text-negative">
                {{ projectsStore.error }}
                <template #action>
                  <BaseButtonSecondary label="Retry" @click="loadProjects" />
                </template>
              </BaseBanner>

              <div v-else-if="projectsStore.projects.length" class="project-list-wrapper">
                <div class="text-subtitle2 q-mb-sm">Your projects</div>
                <BaseList>
                  <BaseListItem
                    v-for="project in projectsStore.projects"
                    :key="project.name"
                    :title="project.name"
                    :caption="project.description || `${getScanCount(project)} scan${getScanCount(project) === 1 ? '' : 's'}`"
                    icon="folder"
                    :selected="project.name === selectedProjectName"
                    @click="selectedProjectName = project.name"
                  >
                    <template #actions>
                      <q-item-section side>
                        <q-icon
                          v-if="project.name === selectedProjectName"
                          name="check_circle"
                          color="primary"
                        />
                      </q-item-section>
                    </template>
                  </BaseListItem>
                </BaseList>
              </div>

              <div v-else class="empty-project-state text-center q-pa-lg">
                <q-icon name="create_new_folder" color="primary" size="48px" />
                <div class="text-subtitle1 q-mt-sm">Create your first project</div>
                <div class="text-body2 text-grey-7 q-mb-md">
                  Projects keep scans and reconstructed models together.
                </div>
                <BaseButtonPrimary
                  icon="add"
                  label="Create project"
                  @click="showCreateProjectDialog = true"
                />
              </div>
            </div>
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
              :disabled="motorControlsBusy || analysisBusy"
            >
              <template #controls>
                <div class="scan-wizard-page__motor-controls q-mb-md">
                  <CameraMotorControls
                    :disable="motorControlsBusy || analysisBusy"
                    @busy-change="motorControlsBusy = $event"
                  />
                </div>
              </template>
            </ScanWizardCropPreview>
          </section>
          <section v-else-if="step.id === 'analysis'">
            <h2 class="text-h6 q-mt-none q-mb-xs">Object features</h2>
            <p class="text-body2 text-grey-7">Check how well your object can be recognized across different views.</p>
            <div role="status" aria-live="polite">
              <div class="row items-center q-gutter-sm">
                <q-spinner v-if="analysisBusy" color="primary" size="32px" />
                <span>{{ analysisMessage }}</span>
              </div>
              <q-linear-progress
                v-if="analysisBusy"
                class="q-mt-md"
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
              :disabled="scanStarting || cloudResetLoading"
              @retry="activeStepId = 'cropping'"
            />
            <ScanAnalysisDebug v-if="analysisTask" :task="analysisTask" :crop="crop" :plan="scanPlan" />
          </section>
          <section v-else-if="step.id === 'quality'">
            <h2 class="text-h6 q-mt-none q-mb-xs">Scan quality</h2>
            <p class="text-body2 text-grey-7">Choose how much time and detail you want for your scan.</p>
            <ScanWizardQualityStep
              v-if="analysisTask?.status === 'completed'"
              v-model:auto-start-stacking="autoStartStacking"
              :result="analysisTask.result"
              :disabled="scanStarting || cloudResetLoading"
              @plan-change="scanPlan = $event"
              @retry="activeStepId = 'cropping'"
              @manual-settings="continueToScanSettings"
            />
            <BaseBanner v-if="scanError" class="q-mt-md" background-class="bg-red-2" text-class="text-negative">
              {{ scanError }}
            </BaseBanner>
            <ScanAnalysisDebug v-if="analysisTask" :task="analysisTask" :crop="crop" :plan="scanPlan" />
          </section>
        </template>

        <template #navigation="{ isFirstStep, isLastStep, goNext, goBack }">
          <div class="row items-center justify-end">
            <BaseButtonSecondary
              v-if="!isFirstStep"
              label="Back"
              :disable="motorControlsBusy || analysisBusy || scanStarting || cloudResetLoading"
              @click="goBack"
            />
            <q-space />
            <BaseButtonPrimary
              :label="isLastStep ? (startedScanTaskId ? 'View scan progress' : 'Start scan') : (activeStepId === 'analysis' && analysisTask?.status !== 'completed' ? 'Retry analysis' : 'Next')"
              :loading="scanStarting || cloudResetLoading"
              :disable="!selectedProjectName || motorControlsBusy || analysisBusy || scanStarting || cloudResetLoading || (activeStepId === 'cropping' && (!crop || !selectedCamera)) || (isLastStep && (!scanPlan || analysisTask?.status !== 'completed') && !startedScanTaskId)"
              @click="handleNext(goNext)"
            />
          </div>
        </template>
      </BaseWizard>
    </div>

    <CreateProjectDialog
      v-model="showCreateProjectDialog"
      @create-project="createProject"
    />
  </BasePage>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'

import BaseBanner from 'components/base/BaseBanner.vue'
import BaseButtonPrimary from 'components/base/BaseButtonPrimary.vue'
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue'
import BaseList from 'components/base/BaseList.vue'
import BaseListItem from 'components/base/BaseListItem.vue'
import CameraMotorControls from 'components/camera/CameraMotorControls.vue'
import BasePage from 'components/base/BasePage.vue'
import BaseWizard from 'components/base/BaseWizard.vue'
import ScanWizardCropPreview, { type WizardCrop } from 'components/scan/ScanWizardCropPreview.vue'
import ScanWizardQualityStep from 'components/scan/ScanWizardQualityStep.vue'
import ScanWizardSiftStep from 'components/scan/ScanWizardSiftStep.vue'
import ScanAnalysisDebug from 'components/scan/ScanAnalysisDebug.vue'
import CreateProjectDialog from 'components/project/CreateProjectDialog.vue'
import SelectWithButton from 'components/common/SelectWithButton.vue'
import type { Project, Task } from 'src/generated/api'
import { useProjectsStore } from 'src/stores/projects'
import { useCameraStore } from 'src/stores/camera'
import { apiClient, getApiSdk } from 'src/services/apiClient'
import type { ScanAnalysisTaskResponse } from 'src/generated/api/next'
import { fieldDefaults } from 'src/generated/api/next/fieldDefaults'
import type { ScanWizardPlan } from 'src/utils/scanWizardPlan'
import { useTaskStore } from 'src/stores/tasks'
import { useCloudResetGuard } from 'src/composables/useCloudResetGuard'
import { useDeviceWakeup } from 'src/composables/useDeviceWakeup'

const steps = [
  { id: 'project', label: 'Project', caption: 'Choose where to save the scan.' },
  { id: 'cropping', label: 'Cropping', caption: 'Position your object in the camera preview.' },
  { id: 'analysis', label: 'Features', caption: 'Review recognizable detail.' },
  { id: 'quality', label: 'Quality', caption: 'Choose quality and start.' }
]

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()
const cameraStore = useCameraStore()
const taskStore = useTaskStore()
const { promptCloudReset, cloudResetLoading } = useCloudResetGuard()
const { wakeUpDevice } = useDeviceWakeup()
const scanPlan = ref<ScanWizardPlan | null>(null)
const autoStartStacking = ref(true)
const scanStarting = ref(false)
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
  return analysisTask.value?.progress?.message || (analysisStarting.value ? 'Starting scan analysis…' : analysisTask.value?.status === 'paused' || analysisTask.value?.status === 'interrupted' ? 'Analysis is paused. Resume the task in the task drawer.' : 'Analysing your scan setup…')
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
  if (analysisBusy.value) return
  if (activeStepId.value === 'project') goNext()
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
  if (pollTimer) clearTimeout(pollTimer)
})
const motorControlsBusy = ref(false)
const selectedCamera = computed(() =>
  cameraStore.cameraOptions.find(camera => camera.value === cameraStore.selectedCamera) ?? null
)

const activeStepId = ref(steps[0].id)
const selectedProjectName = ref(typeof route.query.project === 'string' ? route.query.project : '')
const showCreateProjectDialog = ref(false)

const projectOptions = computed(() => projectsStore.projectNames)
const selectedProject = computed(() =>
  projectsStore.projects.find(project => project.name === selectedProjectName.value) ?? null
)
const projectHint = computed(() => {
  if (selectedProject.value) {
    return `Selected project: ${selectedProject.value.name}`
  }
  return projectsStore.projects.length
    ? 'Select a project from the list or use the dropdown above.'
    : 'Create a project to continue.'
})

const getScanCount = (project: Project) => Object.keys(project.scans ?? {}).length

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

const continueToScanSettings = () => {
  if (!selectedProjectName.value) {
    return
  }

  void router.push({
    path: '/scan',
    query: {
      project: selectedProjectName.value,
      ...(cameraStore.selectedCamera ? { camera: cameraStore.selectedCamera } : {})
    }
  })
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
    const defaults = fieldDefaults.ScanSetting
    const response = await sdk.addScan({
      client: apiClient,
      path: { project_name: projectName },
      body: {
        camera_name: cameraName,
        scan_settings: {
          path_method: defaults.path_method,
          image_format: defaults.image_format,
          min_theta: defaults.min_theta, max_theta: defaults.max_theta,
          min_phi: defaults.min_phi, max_phi: defaults.max_phi,
          optimize_path: defaults.optimize_path, optimization_algorithm: defaults.optimization_algorithm,
          pause_before_capture_ms: defaults.pause_before_capture_ms,
          points: plan.points,
          focus_stacks: plan.focusStacks,
          ...(plan.focusRange ? { focus_range: plan.focusRange } : {})
        }
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
  if (scanStarting.value || cloudResetLoading.value || analysisBusy.value) return
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
  width: min(100%, 760px);
  margin: 0 auto;
  padding: 32px 24px 48px;
}

.project-list-wrapper {
  max-height: 420px;
  overflow-y: auto;
}

.scan-wizard-page__motor-controls {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
}

.project-list-skeleton :deep(.q-skeleton) {
  border-radius: 4px;
}

.empty-project-state {
  border: 1px dashed rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

@media (max-width: 599px) {
  .scan-wizard-page__content {
    padding: 20px 12px 32px;
  }
}
</style>
