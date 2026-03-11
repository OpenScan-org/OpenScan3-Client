<template>
  <BasePage class="setup-page" :center-content="false">
    <template #background>
      <BlurredSnapshotBackground
        v-if="backgroundPreviewUrl"
        :src="backgroundPreviewUrl"
        alt="Camera preview background"
        :orientation-flag="backgroundOrientationFlag"
        :blur-px="14"
        :saturate-percent="110"
        :max-opacity="0.28"
        :transition-ms="600"
      />
    </template>
    <div class="setup-page__content">
      <div class="row justify-center q-col-gutter-md">
        <div class="col-12 col-md-10 col-lg-8">
          <BaseWizard
            v-model="activeStepId"
            :steps="steps"
            finish-label="Finish setup"
            next-label="Next"
            back-label="Back"
            title="Device setup"
            subtitle="Initial configuration of your OpenScan device."
            @finish="handleFinishSetup"
          >
        <template #default="{ step }">
          <div v-if="step.id === 'connection'">
            <div class="text-subtitle1 q-mb-sm">Device configuration</div>
            <p class="q-mb-md">
              Select the configuration that matches your OpenScan device.
            </p>

            <div class="config-list-wrapper">
              <BaseList>
              <template v-if="loadingConfigs">
                <q-item v-for="n in 3" :key="n">
                  <q-item-section>
                    <q-skeleton type="text" width="40%" />
                    <q-skeleton type="text" width="80%" />
                  </q-item-section>
                </q-item>
              </template>
              <template v-else>
                <BaseListItem
                  v-for="config in configOptions"
                  :key="config.path"
                  :title="config.name"
                  :caption="formatConfigCaption(config)"
                  icon="memory"
                  :selected="config.path === selectedConfigPath"
                  @click="selectedConfigPath = config.path"
                />
              </template>
              </BaseList>
            </div>
          </div>
          <div v-else-if="step.id === 'rotor-direction'">
            <div class="text-subtitle1 q-mb-sm">Rotor direction</div>
            <div class="rotor-direction-layout">
              <div class="rotor-direction-panel">
                <p class="q-mb-md">
                  Use the buttons below to move the rotor slightly up or down and confirm the movement matches the picture.
                </p>
                <div class="rotor-controls q-mb-md">
                  <BaseButtonSecondary
                    icon="keyboard_arrow_up"
                    label="Move up"
                    :loading="rotorMoveAction === 'up'"
                    :disable="isRotorControlDisabled"
                    @click="handleRotorMove('up')"
                  />
                  <BaseButtonSecondary
                    icon="keyboard_arrow_down"
                    label="Move down"
                    :loading="rotorMoveAction === 'down'"
                    :disable="isRotorControlDisabled"
                    @click="handleRotorMove('down')"
                  />
                </div>
                <div class="text-body2 q-mb-sm">
                  Does the rotor move in the direction shown? If yes, click "Next". If not, click "Reverse direction".
                </div>
                <div class="rotor-reverse">
                  <BaseButtonPrimary
                    outline
                    icon="swap_vert"
                    label="Reverse direction"
                    :loading="isReversingRotorDirection"
                    :disable="isReverseDisabled"
                    @click="handleReverseRotorDirection"
                  />
                </div>
                <div class="text-body2 text-grey-7 q-mt-sm text-center">
                  Current direction: {{ rotorDirectionLabel }}
                </div>
              </div>
              <div class="rotor-direction-visual">
                <div v-if="rotorDirectionImageSrc" class="rotor-direction-image-wrapper">
                  <button
                    type="button"
                    class="rotor-direction-image-button"
                    @click="rotorImageDialogVisible = true"
                  >
                    <img
                      :src="rotorDirectionImageSrc"
                      :alt="`Rotor direction reference for ${deviceModel ?? 'current device'}`"
                      class="rotor-direction-image"
                    />
                    <div class="text-caption text-primary q-mt-xs">Tap to enlarge</div>
                  </button>
                  <div class="text-caption text-grey-7 q-mt-sm text-center">
                    {{ rotorDirectionHint }}
                  </div>
                </div>
                <div v-else class="rotor-direction-skeleton-wrapper">
                  <q-skeleton type="rect" class="rotor-direction-skeleton" />
                  <div class="text-caption text-grey-6 q-mt-sm text-center">
                    Waiting for device model…
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="step.id === 'hardware'">
            <div class="text-subtitle1 q-mb-sm">Rotor position</div>
            <p>Verify that the initial rotor position is correct as in the picture.</p>
            <div class="rotor-position-visual q-mb-md">
              <div v-if="rotorPositionImageSrc" class="rotor-position-image-wrapper">
                <img
                  :src="rotorPositionImageSrc"
                  :alt="`Rotor position reference for ${deviceModel ?? 'current device'}`"
                  class="rotor-image"
                />
                <div class="text-caption text-grey-7 q-mt-sm text-center">
                  {{ rotorPositionHint }}
                </div>
              </div>
              <div v-else class="rotor-position-skeleton-wrapper">
                <q-skeleton type="rect" class="rotor-position-skeleton" />
                <div class="text-caption text-grey-6 q-mt-sm text-center">
                  Waiting for device model…
                </div>
              </div>
            </div>
            <div class="rotor-position-controls q-mb-lg">
              <div class="text-subtitle2 text-center q-mb-sm">Fine adjustments</div>
              <div class="rotor-position-controls__row">
                <BaseButtonSecondary
                  label="Up 5°"
                  icon="north"
                  :loading="rotorFineMoveAction === 'up-5'"
                  :disable="isRotorControlDisabled"
                  @click="handleRotorFineMove(-5, 'up-5')"
                />
                <BaseButtonSecondary
                  label="Up 1°"
                  icon="north"
                  :loading="rotorFineMoveAction === 'up-1'"
                  :disable="isRotorControlDisabled"
                  @click="handleRotorFineMove(-1, 'up-1')"
                />
                <BaseButtonSecondary
                  label="Down 1°"
                  icon="south"
                  :loading="rotorFineMoveAction === 'down-1'"
                  :disable="isRotorControlDisabled"
                  @click="handleRotorFineMove(1, 'down-1')"
                />
                <BaseButtonSecondary
                  label="Down 5°"
                  icon="south"
                  :loading="rotorFineMoveAction === 'down-5'"
                  :disable="isRotorControlDisabled"
                  @click="handleRotorFineMove(5, 'down-5')"
                />
              </div>
              <div class="text-body2 text-center text-grey-7 q-mt-md">
                Use the buttons to align the rotor with the picture, then click "Next".
              </div>
              <div
                v-if="canCalibrateWithEndstop"
                class="rotor-endstop-calibrate q-mt-md q-pa-md q-mx-auto"
              >
                <div class="text-subtitle2 text-center q-mb-sm">Have a working endstop installed?</div>
                <BaseButtonPrimary
                  class="rotor-endstop-calibrate__button"
                  icon="my_location"
                  label="Calibrate with endstop"
                  :loading="isEndstopCalibrating"
                  :disable="isRotorControlDisabled"
                  @click="handleRotorEndstopCalibration"
                />
                <div class="text-caption text-grey-7 q-mt-sm text-center">
                  Moves the rotor to home using the hardware endstop.
                </div>
              </div>
            </div>
            <p>
              Please Note: In OpenScan3, the coordinate system was changed. The initial rotor position is now 90° instead
              of 0. Likewise the most top position is now 0° and the (unreachable) view from below the turntable is
              180°.
            </p>
          </div>
          <div v-else-if="step.id === 'orientation'">
            <div class="text-subtitle1 q-mb-sm">Camera orientation</div>
            <p class="q-mb-md">
              Adjust the camera orientation and mirroring so that the preview matches your physical setup.
            </p>

            <div class="orientation-preview-wrapper q-mb-md">
              <div
                v-if="orientationCamera"
                class="row q-gutter-sm items-center justify-center no-wrap q-mb-sm"
              >
                <BaseButtonSecondary
                  icon="rotate_left"
                  label="Rotate left"
                  :loading="orientationAction === 'left'"
                  :disable="isOrientationUpdating"
                  size="md"
                  @click="handleRotateLeft"
                />
                <BaseButtonSecondary
                  icon="flip"
                  label="Mirror vertically"
                  :loading="orientationAction === 'mirror'"
                  :disable="isOrientationUpdating"
                  size="md"
                  @click="handleToggleMirror"
                />
                <BaseButtonSecondary
                  icon="rotate_right"
                  label="Rotate right"
                  :loading="orientationAction === 'right'"
                  :disable="isOrientationUpdating"
                  size="md"
                  @click="handleRotateRight"
                />
              </div>

              <div class="orientation-preview-inner">
                <CameraFastPreview
                  :camera="orientationCamera"
                  :active="!!orientationCamera"
                  :enable-crop="false"
                >
                  <template #placeholder>
                    <div class="text-caption text-grey-6">
                      Camera preview will appear once a camera is available.
                    </div>
                  </template>
                </CameraFastPreview>

                <div
                  v-if="isOrientationUpdating"
                  class="orientation-preview-overlay"
                >
                  <BaseSpinner size="md" />
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="step.id === 'test-scan'">
            <div class="setup-finish-section q-pa-lg">
              <BlurredSnapshotBackground
                v-if="backgroundPreviewUrl"
                class="setup-finish-section__background"
                :src="backgroundPreviewUrl"
                alt="Camera preview background"
                :orientation-flag="backgroundOrientationFlag"
                :blur-px="16"
                :saturate-percent="115"
                :max-opacity="0.3"
                :transition-ms="600"
              />
              <div class="setup-finish-section__content">
                <div class="text-subtitle1 q-mb-sm">Setup complete</div>
                <p class="text-body1">
                  Your OpenScan device is ready. Choose what you want to do next:
                </p>
                <div class="setup-complete-actions q-mt-md">
                  <q-card flat bordered class="setup-complete-card">
                    <q-card-section>
                      <div class="text-subtitle2">Plan your first project</div>
                      <div class="text-body2 text-grey-7">
                        Create a project or jump straight into a scan once you're ready.
                      </div>
                    </q-card-section>
                    <q-card-actions align="right" class="setup-complete-card__actions">
                      <q-btn flat label="Projects" icon="folder" color="primary" @click="navigateTo('/projects')" />
                      <q-btn flat label="Scan" icon="camera" color="primary" @click="navigateTo('/scan')" />
                    </q-card-actions>
                  </q-card>
                  <q-card flat bordered class="setup-complete-card">
                    <q-card-section>
                      <div class="text-subtitle2">Inspect device settings</div>
                      <div class="text-body2 text-grey-7">
                        Review motors, cameras, and firmware settings.
                      </div>
                    </q-card-section>
                    <q-card-actions align="right">
                      <q-btn flat label="Settings" icon="settings" color="primary" @click="navigateTo('/settings')" />
                    </q-card-actions>
                  </q-card>
                  <q-card flat bordered class="setup-complete-card">
                    <q-card-section>
                      <div class="text-subtitle2">Learn more about OpenScan3</div>
                      <div class="text-body2 text-grey-7">
                        Visit the About page for information on OpenScan Project and the Firmware.
                      </div>
                    </q-card-section>
                    <q-card-actions align="right">
                      <q-btn
                        flat
                        label="About"
                        icon="library_books"
                        color="primary"
                        @click="navigateTo('/about')"
                      />
                    </q-card-actions>
                  </q-card>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #navigation="{ isFirstStep, isLastStep, goNext, goBack }">
          <div class="row items-center justify-between q-mt-md q-px-md q-pb-md">
            <BaseButtonSecondary
              v-if="!isFirstStep"
              label="Back"
              @click="goBack"
            />
            <q-space />
            <div class="row items-center no-wrap q-gutter-sm">
              <BaseButtonPrimary
                :label="isLastStep ? 'Finish setup' : 'Next'"
                :loading="nextButtonLoading"
                :disable="isNextDisabled"
                @click="handleNext(goNext)"
              />
            </div>
          </div>
        </template>
          </BaseWizard>
          <q-dialog v-model="rotorImageDialogVisible">
            <q-card class="rotor-image-dialog">
              <q-card-section class="rotor-image-dialog__header row items-center justify-between">
                <div class="text-subtitle1">{{ rotorDialogTitle }}</div>
                <q-btn icon="close" flat round dense @click="rotorImageDialogVisible = false" />
              </q-card-section>
              <q-card-section class="rotor-image-dialog__body">
                <img
                  v-if="rotorDirectionImageSrc"
                  :src="rotorDirectionImageSrc"
                  :alt="`Rotor direction reference for ${deviceModel ?? 'current device'}`"
                  class="rotor-image-dialog__image"
                />
                <div class="text-body2 text-grey-7 q-mt-sm text-center">
                  {{ rotorDirectionHint }}
                </div>
              </q-card-section>
            </q-card>
          </q-dialog>
        </div>
      </div>
    </div>
  </BasePage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import BasePage from 'components/base/BasePage.vue'
import BaseWizard from 'components/base/BaseWizard.vue'
import BaseList from 'components/base/BaseList.vue'
import BaseListItem from 'components/base/BaseListItem.vue'
import BaseButtonPrimary from 'components/base/BaseButtonPrimary.vue'
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue'
import BaseSpinner from 'components/base/BaseSpinner.vue'
import homePositionClassicImage from 'src/assets/setup-wizard/home-position-classic.jpg'
import homePositionMiniImage from 'src/assets/setup-wizard/home-position-mini.jpg'
import rotorDirectionClassicImage from 'src/assets/setup-wizard/rotor-direction-classic.jpg'
import rotorDirectionMiniImage from 'src/assets/setup-wizard/rotor-direction-mini.jpg'
import { useDeviceStore } from 'src/stores/device'
import CameraFastPreview from 'components/camera/CameraFastPreview.vue'
import BlurredSnapshotBackground from 'components/background/BlurredSnapshotBackground.vue'
import { useCameraStore } from 'src/stores/camera'
import {
  listConfigFiles,
  moveMotorByDegree,
  motorEndstopCalibration,
  overrideMotorAngle,
  setConfigFile,
  updateCameraNameSettings,
  updateMotorNameSettings,
  type DeviceConfigRequest
} from 'src/generated/api'
import { apiClient } from 'src/services/apiClient'

const steps = [
  { id: 'connection', label: 'Model', caption: 'Select the device model.' },
  { id: 'rotor-direction', label: 'Rotor Direction', caption: 'Verify motor direction.' },
  { id: 'hardware', label: 'Rotor Position', caption: 'Verify initial motor position.' },
  { id: 'orientation', label: 'Camera Orientation', caption: 'Adjust camera orientation.' },
  { id: 'test-scan', label: 'Finish', caption: '' }
]

const activeStepId = ref(steps[0].id)

const deviceStore = useDeviceStore()
const cameraStore = useCameraStore()
const router = useRouter()

interface DeviceConfigFile {
  filename: string
  path: string
  name: string
  model: string | null
  shield: string | null
}

const $q = useQuasar()
const configOptions = ref<DeviceConfigFile[]>([])
const loadingConfigs = ref(false)
const selectedConfigPath = ref<string | null>(null)
const isApplyingConfig = ref(false)

const isConnectionStep = computed(() => activeStepId.value === 'connection')
const isHardwareStep = computed(() => activeStepId.value === 'hardware')
const isOverridingRotorAngle = ref(false)
const isNextDisabled = computed(
  () =>
    (isConnectionStep.value && (!selectedConfigPath.value || isApplyingConfig.value)) ||
    (isHardwareStep.value && isOverridingRotorAngle.value)
)
const nextButtonLoading = computed(
  () =>
    (isConnectionStep.value && isApplyingConfig.value) ||
    (isHardwareStep.value && isOverridingRotorAngle.value)
)

const ROTOR_MOTOR_NAME = 'rotor'
const rotorMoveAction = ref<'up' | 'down' | null>(null)
const rotorFineMoveAction = ref<string | null>(null)
const isReversingRotorDirection = ref(false)
const isEndstopCalibrating = ref(false)

const rotorMotor = computed(() => deviceStore.device?.motors?.[ROTOR_MOTOR_NAME] ?? null)
const rotorDirection = computed<1 | -1 | null>(() => {
  const value = rotorMotor.value?.settings?.direction
  return value === 1 || value === -1 ? value : null
})
const rotorDirectionLabel = computed(() => {
  if (rotorDirection.value === 1) return 'Forward (1)'
  if (rotorDirection.value === -1) return 'Reverse (-1)'
  return 'Unknown'
})

const isRotorControlDisabled = computed(
  () =>
    rotorMoveAction.value !== null ||
    rotorFineMoveAction.value !== null ||
    isEndstopCalibrating.value ||
    isReversingRotorDirection.value ||
    deviceStore.status !== 'open'
)
const isReverseDisabled = computed(
  () =>
    isReversingRotorDirection.value ||
    deviceStore.status !== 'open' ||
    rotorDirection.value === null
)

const orientationCamera = computed(() => {
  const options = cameraStore.cameraOptions
  if (!options.length) return null

  const selectedName = cameraStore.selectedCamera ?? options[0]?.value
  return options.find((c) => c.value === selectedName) ?? options[0] ?? null
})

const orientationAction = ref<'left' | 'right' | 'mirror' | null>(null)
const isOrientationUpdating = computed(() => orientationAction.value !== null)
const rotorImageDialogVisible = ref(false)

const deviceModel = computed(() => deviceStore.device?.model ?? null)
const rotorDirectionImageSrc = computed(() => {
  const model = deviceModel.value?.toLowerCase() ?? ''
  if (model.includes('mini')) return rotorDirectionMiniImage
  if (!model) return null
  return rotorDirectionClassicImage
})
const rotorDirectionHint = computed(() => {
  const model = deviceModel.value?.toLowerCase() ?? ''
  if (!model) {
    return 'Model-specific guidance will appear once the device model is detected.'
  }
  if (model.includes('mini')) {
    return 'Moving up should lift the entire camera unit upwards.'
  }
  return 'Moving up should swing the arm farther from the camera to reveal more of the top.'
})
const rotorDialogTitle = computed(() => deviceModel.value ?? 'Rotor direction reference')
const ROTOR_HOME_OVERRIDE_ANGLE = 90
const rotorPositionImageSrc = computed(() => {
  const model = deviceModel.value?.toLowerCase() ?? ''
  if (model.includes('mini')) return homePositionMiniImage
  if (!model) return null
  return homePositionClassicImage
})
const rotorPositionHint = computed(() => {
  const model = deviceModel.value?.toLowerCase() ?? ''
  if (!model) {
    return 'Model-specific position guidance will appear once the device model is detected.'
  }
  if (model.includes('mini')) {
    return 'Ensure the camera unit is level.'
  }
  return 'Ensure the swing arm sits at 90° to floor.'
})
const rotorEndstop = computed(() => {
  const directEndstop = (rotorMotor.value as unknown as { endstop?: { assigned_motor?: string } | null } | null)?.endstop
  if (directEndstop && (directEndstop as { assigned_motor?: string }).assigned_motor === ROTOR_MOTOR_NAME) {
    return directEndstop
  }

  const endstops = deviceStore.device?.endstops ?? null
  if (!endstops) return null
  return Object.values(endstops).find((endstop) => endstop?.settings?.motor_name === ROTOR_MOTOR_NAME) ?? null
})
const canCalibrateWithEndstop = computed(() => Boolean(rotorEndstop.value))
const backgroundCameraName = computed(() => {
  if (cameraStore.selectedCamera) {
    return cameraStore.selectedCamera
  }

  return cameraStore.cameraOptions[0]?.value ?? null
})
const backgroundPreviewUrl = computed(() => {
  if (cameraStore.previewUrl) {
    return cameraStore.previewUrl
  }

  const cameraName = backgroundCameraName.value
  return cameraName ? cameraStore.getPreviewUrl(cameraName, 24) : null
})
const backgroundOrientationFlag = computed(() => {
  const cameraName = backgroundCameraName.value ?? cameraStore.selectedCamera
  if (!cameraName) {
    return null
  }

  return cameraStore.cameras.find((camera) => camera.name === cameraName)?.settings?.orientation_flag ?? null
})

function formatConfigCaption(config: DeviceConfigFile): string {
  const parts: string[] = []
  if (config.model) parts.push(config.model)
  if (config.shield) parts.push(config.shield)
  parts.push(config.filename)
  return parts.join(' · ')
}

async function loadConfigs() {
  loadingConfigs.value = true
  try {
    const data = await listConfigFiles<true>({ client: apiClient, throwOnError: true })
    const configs = (data as any)?.configs ?? []
    const filtered = (configs as DeviceConfigFile[]).filter(
      (config) => config.filename !== 'device_config.json'
    )

    filtered.sort((a, b) => {
      const shieldA = (a.shield ?? '').toLowerCase()
      const shieldB = (b.shield ?? '').toLowerCase()
      if (shieldA !== shieldB) return shieldB.localeCompare(shieldA)

      const nameA = (a.name ?? a.filename).toLowerCase()
      const nameB = (b.name ?? b.filename).toLowerCase()
      return nameA.localeCompare(nameB)
    })

    configOptions.value = filtered

    if (selectedConfigPath.value && !filtered.some((c) => c.path === selectedConfigPath.value)) {
      selectedConfigPath.value = null
    }
  } catch (error) {
    console.error('Failed to load device configurations', error)
    $q.notify({ type: 'negative', message: 'Failed to load device configurations' })
  } finally {
    loadingConfigs.value = false
  }
}

onMounted(() => {
  void loadConfigs()
  void cameraStore.fetchCameras()
})

async function handleNext(goNext: () => void) {
  if (isConnectionStep.value) {
    if (!selectedConfigPath.value || isApplyingConfig.value) return

    isApplyingConfig.value = true
    try {
      const body: DeviceConfigRequest = {
        config_file: selectedConfigPath.value
      }
      await setConfigFile<true>({ client: apiClient, throwOnError: true, body })
      goNext()
    } catch (error) {
      console.error('Failed to apply device configuration', error)
      $q.notify({ type: 'negative', message: 'Failed to apply device configuration' })
    } finally {
      isApplyingConfig.value = false
    }
    return
  }

  if (isHardwareStep.value) {
    if (isOverridingRotorAngle.value) return

    isOverridingRotorAngle.value = true
    try {
      await deviceStore.ensureConnected()
      await overrideMotorAngle<true>({
        client: apiClient,
        throwOnError: true,
        path: { motor_name: ROTOR_MOTOR_NAME },
        query: { angle: ROTOR_HOME_OVERRIDE_ANGLE }
      })
      await deviceStore.refreshFromRest()
      goNext()
    } catch (error) {
      console.error('Failed to override rotor angle', error)
      $q.notify({ type: 'negative', message: 'Failed to override rotor angle' })
    } finally {
      isOverridingRotorAngle.value = false
    }
    return
  }

  goNext()
}

async function performRotorMove(degrees: number) {
  await deviceStore.ensureConnected()
  await moveMotorByDegree<true>({
    client: apiClient,
    throwOnError: true,
    path: { motor_name: ROTOR_MOTOR_NAME },
    body: { degrees }
  })
}

async function handleRotorMove(direction: 'up' | 'down') {
  if (rotorMoveAction.value !== null || rotorFineMoveAction.value !== null) {
    return
  }

  rotorMoveAction.value = direction
  const degrees = direction === 'up' ? -10 : 10

  try {
    await performRotorMove(degrees)
  } catch (error) {
    console.error('Failed to move rotor motor', error)
    $q.notify({ type: 'negative', message: 'Failed to move rotor motor' })
  } finally {
    rotorMoveAction.value = null
  }
}

async function handleRotorFineMove(degrees: number, actionKey: string) {
  if (rotorFineMoveAction.value !== null || rotorMoveAction.value !== null) {
    return
  }

  rotorFineMoveAction.value = actionKey
  try {
    await performRotorMove(degrees)
  } catch (error) {
    console.error('Failed to fine-adjust rotor motor', error)
    $q.notify({ type: 'negative', message: 'Failed to move rotor motor' })
  } finally {
    rotorFineMoveAction.value = null
  }
}

async function handleRotorEndstopCalibration() {
  if (!canCalibrateWithEndstop.value || isEndstopCalibrating.value) {
    return
  }

  isEndstopCalibrating.value = true
  try {
    await deviceStore.ensureConnected()
    await motorEndstopCalibration<true>({
      client: apiClient,
      throwOnError: true,
      path: { motor_name: ROTOR_MOTOR_NAME }
    })
    await deviceStore.refreshFromRest()
    $q.notify({ type: 'positive', message: 'Rotor calibrated with endstop.' })
  } catch (error) {
    console.error('Failed to calibrate rotor via endstop', error)
    $q.notify({ type: 'negative', message: 'Endstop calibration failed.' })
  } finally {
    isEndstopCalibrating.value = false
  }
}

async function handleReverseRotorDirection() {
  if (isReversingRotorDirection.value || rotorDirection.value === null) {
    return
  }

  const nextDirection = rotorDirection.value === 1 ? -1 : 1
  isReversingRotorDirection.value = true

  try {
    await deviceStore.ensureConnected()
    await updateMotorNameSettings<true>({
      client: apiClient,
      throwOnError: true,
      path: { name: ROTOR_MOTOR_NAME },
      body: { direction: nextDirection }
    })
    await deviceStore.refreshFromRest()
  } catch (error) {
    console.error('Failed to reverse rotor direction', error)
    $q.notify({ type: 'negative', message: 'Failed to reverse rotor direction' })
  } finally {
    isReversingRotorDirection.value = false
  }
}

const ROTATE_RIGHT_MAP: Record<number, number> = {
  1: 6,
  6: 3,
  3: 8,
  8: 1,
  2: 7,
  7: 4,
  4: 5,
  5: 2
}

const MIRROR_MAP: Record<number, number> = {
  1: 2,
  2: 1,
  3: 4,
  4: 3,
  5: 6,
  6: 5,
  7: 8,
  8: 7
}

function getSafeOrientationFlag(): number | null {
  const flag = orientationCamera.value?.orientationFlag ?? null
  if (!flag || flag < 1 || flag > 8) {
    return 1
  }
  return flag
}

async function applyOrientationFlag(nextFlag: number) {
  if (!orientationCamera.value) return

  try {
    // Mark orientation update as in progress; specific action is set by caller
    await updateCameraNameSettings({
      client: apiClient,
      path: { name: orientationCamera.value.value },
      body: { orientation_flag: nextFlag }
    })
  } catch (error) {
    console.error('Failed to update orientation flag', error)
    $q.notify({ type: 'negative', message: 'Failed to update orientation flag' })
  }
}

function nextFlagWithMap(map: Record<number, number>): number {
  const current = getSafeOrientationFlag() ?? 1
  return map[current] ?? 1
}

function handleRotateRight() {
  const next = nextFlagWithMap(ROTATE_RIGHT_MAP)
  orientationAction.value = 'right'
  void applyOrientationFlag(next).finally(() => {
    orientationAction.value = null
  })
}

function handleRotateLeft() {
  // inverse mapping of ROTATE_RIGHT_MAP
  const inverse: Record<number, number> = {}
  Object.entries(ROTATE_RIGHT_MAP).forEach(([from, to]) => {
    inverse[to as unknown as number] = Number(from)
  })
  const next = nextFlagWithMap(inverse)
  orientationAction.value = 'left'
  void applyOrientationFlag(next).finally(() => {
    orientationAction.value = null
  })
}

function handleToggleMirror() {
  const next = nextFlagWithMap(MIRROR_MAP)
  orientationAction.value = 'mirror'
  void applyOrientationFlag(next).finally(() => {
    orientationAction.value = null
  })
}

async function handleFinishSetup() {
  await deviceStore.refreshFromRest()
  void router.push('/')
}

function navigateTo(path: string) {
  void router.push(path)
}
</script>

<style scoped>
.config-list-wrapper {
  max-width: 420px;
  margin: 0 auto;
}

.rotor-controls {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.rotor-reverse {
  display: flex;
  justify-content: center;
}

.rotor-image {
  display: block;
  max-width: 100%;
  width: 100%;
  height: auto;
}

.rotor-direction-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (min-width: 768px) {
  .rotor-direction-layout {
    flex-direction: row;
    align-items: flex-start;
  }
}

.rotor-direction-panel {
  flex: 1;
}

.rotor-direction-visual {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.rotor-direction-image-wrapper,
.rotor-direction-skeleton-wrapper {
  width: 100%;
  max-width: 320px;
}

.rotor-direction-image-button {
  background: transparent;
  border: 0;
  padding: 0;
  display: block;
  width: 100%;
  cursor: pointer;
  text-align: center;
}

.rotor-direction-image-button:focus-visible {
  outline: 2px solid var(--q-primary);
  outline-offset: 4px;
}

.rotor-direction-image {
  display: block;
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.rotor-direction-skeleton {
  height: 220px;
  border-radius: 12px;
}

.rotor-position-visual {
  display: flex;
  justify-content: center;
}

.rotor-position-image-wrapper,
.rotor-position-skeleton-wrapper {
  width: 100%;
  max-width: 360px;
}

.rotor-position-controls__row {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.rotor-endstop-calibrate {
  max-width: 360px;
  border: 1px dashed var(--q-primary);
  border-radius: 12px;
}

.rotor-endstop-calibrate__button {
  width: 100%;
}

.rotor-position-skeleton {
  height: 240px;
  border-radius: 12px;
}

.setup-complete-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setup-complete-card__actions {
  gap: 4px;
}

.setup-page__content {
  position: relative;
}

.setup-finish-section {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.setup-finish-section__background {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.setup-finish-section__content {
  position: relative;
}

.rotor-image-dialog {
  max-width: min(90vw, 640px);
}

.rotor-image-dialog__body {
  text-align: center;
}

.rotor-image-dialog__image {
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
}

.orientation-preview-wrapper {
  max-width: 480px;
  margin: 0 auto;
}

.orientation-preview-inner {
  position: relative;
}

.orientation-preview-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  pointer-events: none;
}
</style>
