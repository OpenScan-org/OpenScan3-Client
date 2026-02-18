<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'

import { useCameraStore } from 'src/stores/camera'
import { useDeviceStore } from 'src/stores/device'
import { useProjectsStore } from 'src/stores/projects'
import BaseButtonIconPrimary from 'components/base/BaseButtonIconPrimary.vue'
import BaseButtonIconSecondary from 'components/base/BaseButtonIconSecondary.vue'
import RecentProjectsList from 'src/components/project/RecentProjectsList.vue'
import BlurredSnapshotBackground from 'components/background/BlurredSnapshotBackground.vue'
import { apiClient } from 'src/services/apiClient'
import {
  toggleLight,
  moveMotorByDegree,
  moveToPosition,
  type ToggleLightData,
  type MoveMotorByDegreeData,
  type MoveToPositionData
} from 'src/generated/api'

const $q = useQuasar()
const cameraStore = useCameraStore()
const deviceStore = useDeviceStore()
const projectsStore = useProjectsStore()

const showDisconnectedSkeleton = computed(() => deviceStore.hasConnectionIssue)

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
  const cameraName = cameraStore.selectedCamera
  return cameraName ? cameraStore.getPreviewUrl(cameraName, 30) : null
})
const selectedCameraOrientationFlag = computed(() => selectedCamera.value?.settings?.orientation_flag ?? null)
const isLightOn = computed(() => {
  const name = firstLightName.value
  return !!(name && deviceStore.lights[name]?.is_on)
})

async function handleToggleLight() {
  if (isLightBusy.value) return
  isLightBusy.value = true
  try {
    await deviceStore.ensureConnected()

    const payload: ToggleLightData = {
      path: { light_name: firstLightName.value || '' },
      url: '/lights/{light_name}/toggle'
    }

    await toggleLight({ client: apiClient, ...payload })
  } catch (error) {
    console.error('Failed to toggle light', error)
    $q.notify({ type: 'negative', message: 'Failed to toggle light' })
  } finally {
    isLightBusy.value = false
  }
}

async function moveMotor(motorName: string, degrees: number) {
  if (isMoving.value) return
  isMoving.value = true
  try {
    await deviceStore.ensureConnected()

    const payload: MoveMotorByDegreeData = {
      path: { motor_name: motorName },
      body: { degrees },
      url: '/motors/{motor_name}/angle'
    }

    await moveMotorByDegree({ client: apiClient, ...payload })
  } catch (error) {
    console.error('Failed to move motor', motorName, error)
    $q.notify({ type: 'negative', message: 'Failed to move motor' })
  } finally {
    isMoving.value = false
  }
}

async function moveHome() {
  if (isHoming.value) return
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

    await moveToPosition({ client: apiClient, ...payload })
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
})
</script>

<template>
  <q-page class="dashboard-page">
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

    <div class="content-wrapper q-pa-md">
      <div class="row q-col-gutter-md justify-center items-start">
        <div class="col-12 col-md-6">
          <q-card flat bordered class="playground-card">
            <q-card-section>
              <div class="column items-center q-gutter-md">
                <BaseButtonIconPrimary
                  :icon="isLightOn ? 'lightbulb' : 'lightbulb_outline'"
                  size="lg"
                  :loading="isLightBusy"
                  @click="handleToggleLight"
                >
                  <q-tooltip anchor="bottom middle" self="top middle">Toggle ring light</q-tooltip>
                </BaseButtonIconPrimary>

                <div class="joystick-grid">
                  <div class="joystick-row">
                    <BaseButtonIconPrimary
                      icon="keyboard_arrow_up"
                      size="lg"
                      :loading="isMoving"
                      @click="moveMotor(ROTOR_MOTOR, -10)"
                    >
                      <q-tooltip anchor="bottom middle" self="top middle">Move rotor up</q-tooltip>
                    </BaseButtonIconPrimary>
                  </div>
                  <div class="joystick-row">
                    <BaseButtonIconPrimary
                      icon="keyboard_arrow_left"
                      size="lg"
                      :loading="isMoving"
                      @click="moveMotor(TURNTABLE_MOTOR, -20)"
                    >
                      <q-tooltip anchor="bottom middle" self="top middle">Rotate turntable left</q-tooltip>
                    </BaseButtonIconPrimary>
                    <BaseButtonIconSecondary
                      icon="home"
                      size="lg"
                      :loading="isHoming"
                      :dense="false"
                      @click="moveHome"
                    >
                      <q-tooltip anchor="bottom middle" self="top middle">Return to home position</q-tooltip>
                    </BaseButtonIconSecondary>
                    <BaseButtonIconPrimary
                      icon="keyboard_arrow_right"
                      size="lg"
                      :loading="isMoving"
                      @click="moveMotor(TURNTABLE_MOTOR, 20)"
                    >
                      <q-tooltip anchor="bottom middle" self="top middle">Rotate turntable right</q-tooltip>
                    </BaseButtonIconPrimary>
                  </div>
                  <div class="joystick-row">
                    <BaseButtonIconPrimary
                      icon="keyboard_arrow_down"
                      size="lg"
                      :loading="isMoving"
                      @click="moveMotor(ROTOR_MOTOR, 10)"
                    >
                      <q-tooltip anchor="bottom middle" self="top middle">Move rotor down</q-tooltip>
                    </BaseButtonIconPrimary>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row q-col-gutter-md q-mt-md justify-center items-start">
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
    </div>
  </q-page>
</template>

<style scoped>
.dashboard-page {
  position: relative;
}

.content-wrapper {
  position: relative;
  z-index: 1;
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
