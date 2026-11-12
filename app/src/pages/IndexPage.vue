<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'

import { useCameraStore } from 'src/stores/camera'
import { useDeviceStore } from 'src/stores/device'
import { useFrontendSettingsStore } from 'src/stores/frontendSettings'
import { useProjectsStore } from 'src/stores/projects'
import { useTaskStore } from 'src/stores/tasks'
import { useUpdatesStore } from 'src/stores/updates'
import { useVersionStore } from 'src/stores/version'
import { formatComponentVersion } from 'src/utils/versionDisplay'
import BaseButtonIconPrimary from 'components/base/BaseButtonIconPrimary.vue'
import BaseButtonIconSecondary from 'components/base/BaseButtonIconSecondary.vue'
import BasePage from 'components/base/BasePage.vue'
import RecentProjectsList from 'src/components/project/RecentProjectsList.vue'
import FromOpenScanCard from 'src/components/dashboard/FromOpenScanCard.vue'
import BlurredSnapshotBackground from 'components/background/BlurredSnapshotBackground.vue'
import UpdateChangeNotes from 'components/update/UpdateChangeNotes.vue'
import { apiClient, getApiSdk } from 'src/services/apiClient'
import {
  type ToggleLightData,
  type MoveMotorByDegreeData,
  type MoveToPositionData
} from 'src/generated/api'

const $q = useQuasar()
const cameraStore = useCameraStore()
const deviceStore = useDeviceStore()
const frontendSettingsStore = useFrontendSettingsStore()
const projectsStore = useProjectsStore()
const taskStore = useTaskStore()
const updatesStore = useUpdatesStore()
const versionStore = useVersionStore()
const apiSdk = () => getApiSdk()

const showDisconnectedSkeleton = computed(() => deviceStore.hasConnectionIssue)
const scanLocked = computed(() => Boolean(taskStore.activeScanTaskId))
const scanLockedTooltip = 'Unavailable while a scan is running.'

const isMoving = ref(false)
const isLightBusy = ref(false)
const isHoming = ref(false)
const ROTOR_MOTOR = 'rotor'
const TURNTABLE_MOTOR = 'turntable'

const firstLightName = computed(() => {
  const names = Object.keys(deviceStore.lights)
  return names[0] ?? null
})

const selectedCamera = computed(() =>
  cameraStore.cameras.find(camera => camera.name === cameraStore.selectedCamera) ?? null
)

const backgroundPreviewUrl = computed(() => {
  if (!frontendSettingsStore.backgroundCameraPreviewEnabled) {
    return null
  }
  const cameraName = cameraStore.selectedCamera
  return cameraName ? cameraStore.getPreviewUrl(cameraName, 30) : null
})
const selectedCameraOrientationFlag = computed(() => selectedCamera.value?.settings?.orientation_flag ?? null)
const isLightOn = computed(() => {
  const name = firstLightName.value
  return !!(name && deviceStore.lights[name]?.is_on)
})
const firmwareDisplayVersion = computed(() => {
  const version = updatesStore.installedVersions.firmware ?? versionStore.firmwareVersion
  return version
    ? formatComponentVersion(version)
    : versionStore.firmwareVersionLoading
      ? '…'
      : '—'
})
const frontendDisplayVersion = computed(() =>
  formatComponentVersion(
    updatesStore.installedVersions.client ?? versionStore.frontendVersion,
  ),
)

async function handleToggleLight() {
  if (scanLocked.value || isLightBusy.value) return
  isLightBusy.value = true
  try {
    await deviceStore.ensureConnected()

    const payload: ToggleLightData = {
      path: { light_name: firstLightName.value || '' },
      url: '/lights/{light_name}/toggle'
    }

    await apiSdk().toggleLight({ client: apiClient, ...payload })
  } catch (error) {
    console.error('Failed to toggle light', error)
    $q.notify({ type: 'negative', message: 'Failed to toggle light' })
  } finally {
    isLightBusy.value = false
  }
}

async function moveMotor(motorName: string, degrees: number) {
  if (scanLocked.value || isMoving.value) return
  isMoving.value = true
  try {
    await deviceStore.ensureConnected()

    const payload: MoveMotorByDegreeData = {
      path: { motor_name: motorName },
      body: { degrees },
      url: '/motors/{motor_name}/angle'
    }

    await apiSdk().moveMotorByDegree({ client: apiClient, ...payload })
  } catch (error) {
    console.error('Failed to move motor', motorName, error)
    $q.notify({ type: 'negative', message: 'Failed to move motor' })
  } finally {
    isMoving.value = false
  }
}

async function moveHome() {
  if (scanLocked.value || isHoming.value) return
  isHoming.value = true
  try {
    await deviceStore.ensureConnected()

    const payload: MoveToPositionData = {
      body: {
        theta: 90,
        fi: 0,
        r: 1
      },
      url: '/develop/scanner-position'
    }

    await apiSdk().moveToPosition({ client: apiClient, ...payload })
  } catch (error) {
    console.error('Failed to move to home position', error)
    $q.notify({ type: 'negative', message: 'Failed to move to home position' })
  } finally {
    isHoming.value = false
  }
}

onMounted(() => {
  cameraStore.fetchCameras()
  deviceStore.ensureConnected()
  projectsStore.fetchProjects()
  void taskStore.ensureConnected()
  void versionStore.initialize()
})
</script>

<template>
  <BasePage class="dashboard-page" :center-content="false" padding="0">
    <template #background>
      <BlurredSnapshotBackground
        v-if="backgroundPreviewUrl"
        :src="backgroundPreviewUrl"
        alt="Camera preview background"
        :blur-px="10"
        :saturate-percent="100"
        :max-opacity="0.3"
        :transition-ms="600"
        :orientation-flag="selectedCameraOrientationFlag"
      />
    </template>

    <div class="content-wrapper">
      <div class="row q-col-gutter-md justify-center items-start">
        <div class="col-12 col-md-6">
          <q-card flat bordered class="playground-card">
            <q-card-section>
              <div class="column items-center q-gutter-md">
                <BaseButtonIconPrimary
                  :icon="isLightOn ? 'lightbulb' : 'lightbulb_outline'"
                  size="lg"
                  :disable="scanLocked || isLightBusy"
                  :loading="isLightBusy"
                  @click="handleToggleLight"
                >
                  <q-tooltip anchor="bottom middle" self="top middle">
                    {{ scanLocked ? scanLockedTooltip : 'Toggle ring light' }}
                  </q-tooltip>
                </BaseButtonIconPrimary>

                <div class="joystick-grid">
                  <div class="joystick-row">
                    <BaseButtonIconPrimary
                      icon="keyboard_arrow_up"
                      size="lg"
                      :disable="scanLocked || isMoving"
                      :loading="isMoving"
                      @click="moveMotor(ROTOR_MOTOR, -10)"
                    >
                      <q-tooltip anchor="bottom middle" self="top middle">
                        {{ scanLocked ? scanLockedTooltip : 'Move rotor up' }}
                      </q-tooltip>
                    </BaseButtonIconPrimary>
                  </div>
                  <div class="joystick-row">
                    <BaseButtonIconPrimary
                      icon="keyboard_arrow_left"
                      size="lg"
                      :disable="scanLocked || isMoving"
                      :loading="isMoving"
                      @click="moveMotor(TURNTABLE_MOTOR, -20)"
                    >
                      <q-tooltip anchor="bottom middle" self="top middle">
                        {{ scanLocked ? scanLockedTooltip : 'Rotate turntable left' }}
                      </q-tooltip>
                    </BaseButtonIconPrimary>
                    <BaseButtonIconSecondary
                      icon="home"
                      size="lg"
                      :disable="scanLocked || isHoming"
                      :loading="isHoming"
                      :dense="false"
                      @click="moveHome"
                    >
                      <q-tooltip anchor="bottom middle" self="top middle">
                        {{ scanLocked ? scanLockedTooltip : 'Return to home position' }}
                      </q-tooltip>
                    </BaseButtonIconSecondary>
                    <BaseButtonIconPrimary
                      icon="keyboard_arrow_right"
                      size="lg"
                      :disable="scanLocked || isMoving"
                      :loading="isMoving"
                      @click="moveMotor(TURNTABLE_MOTOR, 20)"
                    >
                      <q-tooltip anchor="bottom middle" self="top middle">
                        {{ scanLocked ? scanLockedTooltip : 'Rotate turntable right' }}
                      </q-tooltip>
                    </BaseButtonIconPrimary>
                  </div>
                  <div class="joystick-row">
                    <BaseButtonIconPrimary
                      icon="keyboard_arrow_down"
                      size="lg"
                      :disable="scanLocked || isMoving"
                      :loading="isMoving"
                      @click="moveMotor(ROTOR_MOTOR, 10)"
                    >
                      <q-tooltip anchor="bottom middle" self="top middle">
                        {{ scanLocked ? scanLockedTooltip : 'Move rotor down' }}
                      </q-tooltip>
                    </BaseButtonIconPrimary>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row q-col-gutter-x-md q-mt-md justify-center items-start">
        <div class="col-12 col-md-6">
          <template v-if="showDisconnectedSkeleton">
            <q-card flat bordered class="q-pa-md">
              <div class="q-gutter-y-sm">
                <q-skeleton type="text" width="45%" />
                <q-skeleton type="rect" height="24px" v-for="index in 3" :key="`recent-${index}`" />
                <q-skeleton type="text" width="35%" />
              </div>
            </q-card>
          </template>
          <template v-else>
            <RecentProjectsList />
          </template>
        </div>
      </div>

      <div
        v-if="frontendSettingsStore.fromOpenScanEnabled"
        class="dashboard-notice-space row justify-center items-center"
      >
        <div class="col-12 col-md-6">
          <FromOpenScanCard />
        </div>
      </div>

      <div class="dashboard-version-footer text-caption">
        <div v-if="updatesStore.updatesAvailable" class="dashboard-version-footer__update-row">
          <span class="dashboard-version-footer__update">Update available</span>
          <UpdateChangeNotes
            :packages="updatesStore.packages"
            :release-channel="updatesStore.releaseChannel"
            combined
            trigger-label="What's new"
            trigger-size="xs"
            show-updater-action
            :show-placeholder="false"
          />
          <q-btn
            flat
            dense
            no-caps
            color="primary"
            size="xs"
            icon="system_update"
            label="Go to updater"
            to="/update"
          />
        </div>
        <div class="dashboard-version-footer__versions">
          <span>Firmware {{ firmwareDisplayVersion }}</span>
          <span class="dashboard-version-footer__separator">·</span>
          <span>Frontend {{ frontendDisplayVersion }}</span>
        </div>
      </div>
    </div>
  </BasePage>
</template>

<style scoped>
.dashboard-page {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 56px);
  min-height: calc(100dvh - 56px);
}

:deep(.base-page__content) {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.content-wrapper {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 0;
  padding: 48px 16px 0;
}

.dashboard-notice-space {
  flex: 1 1 auto;
  min-height: 0;
}

.dashboard-version-footer {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2px;
  width: 100%;
  margin-top: auto;
  padding: 10px 16px max(10px, env(safe-area-inset-bottom));
  color: #757575;
  font-size: 10px;
  cursor: default;
  user-select: none;
}

.dashboard-version-footer__update-row,
.dashboard-version-footer__versions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.dashboard-version-footer__versions {
  white-space: nowrap;
}

.dashboard-version-footer__update {
  color: var(--q-primary);
  font-size: 12px;
}

.dashboard-version-footer__separator {
  color: #bdbdbd;
}

:deep(.dashboard-version-footer__update-row .q-btn__content > span) {
  font-size: 12px;
}

.joystick-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.joystick-row {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.playground-card {
  background-color: transparent;
  border: none;
  box-shadow: none;
}
</style>
