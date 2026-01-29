<template>
  <BasePage content-class="col-12 col-md-10 col-lg-8">
    <div class="q-mb-lg">
      <div class="text-h5">Device setup</div>
      <div class="text-body2 text-grey-7">
        Initial configuration of your OpenScan device.
      </div>
    </div>
    <BaseWizard
      v-model="activeStepId"
      :steps="steps"
      finish-label="Finish setup"
      next-label="Next"
      back-label="Back"
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
            <p class="q-mb-md">
              Use the buttons below to move the rotor slightly up or down and confirm the movement matches the labels.
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
              Does the rotor move in the direction shown on the buttons? If yes, click "Next". If not, click "Reverse direction".
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
          <div v-else-if="step.id === 'hardware'">
            <div class="text-subtitle1 q-mb-sm">Rotor position</div>
            <p>Verify that the initial rotor position is correct as in the picture.</p>
            <img :src="motorPositionImage" alt="Rotor position" class="q-mb-md rotor-image" />
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
            <div class="text-subtitle1 q-mb-sm">Test scan</div>
            <p>Perform a simple movement to confirm the setup.</p>
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
                :loading="isApplyingConfig"
                :disable="isNextDisabled"
                @click="handleNext(goNext)"
              />
            </div>
          </div>
        </template>
    </BaseWizard>
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
import motorPositionImage from 'src/assets/openscan_motor_position.jpg'
import { useDeviceStore } from 'src/stores/device'
import CameraFastPreview from 'components/camera/CameraFastPreview.vue'
import { useCameraStore } from 'src/stores/camera'
import {
  listConfigFiles,
  moveMotorByDegree,
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
const isNextDisabled = computed(
  () =>
    (isConnectionStep.value && !selectedConfigPath.value) ||
    isApplyingConfig.value
)

const ROTOR_MOTOR_NAME = 'rotor'
const rotorMoveAction = ref<'up' | 'down' | null>(null)
const isReversingRotorDirection = ref(false)

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

  goNext()
}

async function handleRotorMove(direction: 'up' | 'down') {
  if (rotorMoveAction.value !== null) {
    return
  }

  rotorMoveAction.value = direction
  const degrees = direction === 'up' ? -10 : 10

  try {
    await deviceStore.ensureConnected()
    await moveMotorByDegree<true>({
      client: apiClient,
      throwOnError: true,
      path: { motor_name: ROTOR_MOTOR_NAME },
      body: { degrees }
    })
  } catch (error) {
    console.error('Failed to move rotor motor', error)
    $q.notify({ type: 'negative', message: 'Failed to move rotor motor' })
  } finally {
    rotorMoveAction.value = null
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
  void router.push('/scan')
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
