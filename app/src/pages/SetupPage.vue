<template>
  <BasePage>
    <BaseSection
      title="Device setup"
      subtitle="Initial configuration of your OpenScan device."
    >
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
                  label="Mirror"
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
    </BaseSection>
  </BasePage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import BasePage from 'components/base/BasePage.vue'
import BaseSection from 'components/base/BaseSection.vue'
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
import { listConfigFiles, setConfigFile, updateCameraNameSettings, type DeviceConfigRequest } from 'src/generated/api'
import { apiClient } from 'src/services/apiClient'

const steps = [
  { id: 'connection', label: 'Model', caption: 'Select the device model.' },
  { id: 'hardware', label: 'Rotor Position', caption: 'Verify initial motor position.' },
  { id: 'orientation', label: 'Camera Orientation', caption: 'Adjust camera orientation.' },
  { id: 'test-scan', label: 'Finish', caption: '' }
]

const activeStepId = ref(steps[0].id)

const deviceStore = useDeviceStore()
const cameraStore = useCameraStore()

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
    configOptions.value = configs as DeviceConfigFile[]
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
  5: 8,
  8: 5,
  6: 7,
  7: 6
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

function handleFinishSetup() {
  void deviceStore.refreshFromRest()
}
</script>

<style scoped>
.config-list-wrapper {
  max-width: 420px;
  margin: 0 auto;
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
