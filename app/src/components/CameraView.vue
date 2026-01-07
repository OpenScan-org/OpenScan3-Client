<template>
  <q-card class="camera-view-card">
    <div class="camera-view__toolbar">
      <div class="camera-view__toolbar-layout">
        <div class="camera-view__toolbar-left">
          <div class="camera-view__toolbar-motor">
            <BaseButtonIconPrimary
              icon="keyboard_arrow_left"
              size="sm"
              :disable="motorBusy || props.scanning"
              @click="handleMotorMove(TURNTABLE_MOTOR, -20)"
            >
              <q-tooltip anchor="bottom middle" self="top middle">Rotate turntable left</q-tooltip>
            </BaseButtonIconPrimary>
            <BaseButtonIconPrimary
              icon="keyboard_arrow_up"
              size="sm"
              :disable="motorBusy || props.scanning"
              @click="handleMotorMove(ROTOR_MOTOR, -10)"
            >
              <q-tooltip anchor="bottom middle" self="top middle">Move rotor up</q-tooltip>
            </BaseButtonIconPrimary>
            <BaseButtonIconPrimary
              icon="keyboard_arrow_down"
              size="sm"
              :disable="motorBusy || props.scanning"
              @click="handleMotorMove(ROTOR_MOTOR, 10)"
            >
              <q-tooltip anchor="bottom middle" self="top middle">Move rotor down</q-tooltip>
            </BaseButtonIconPrimary>
            <BaseButtonIconPrimary
              icon="keyboard_arrow_right"
              size="sm"
              :disable="motorBusy || props.scanning"
              @click="handleMotorMove(TURNTABLE_MOTOR, 20)"
            >
              <q-tooltip anchor="bottom middle" self="top middle">Rotate turntable right</q-tooltip>
            </BaseButtonIconPrimary>
            <BaseButtonIconSecondary
              class="camera-view__toolbar-home"
              icon="home"
              size="sm"
              :disable="homeBusy || props.scanning"
              @click="handleMoveHome"
            >
              <q-tooltip anchor="bottom middle" self="top middle">Return to home position</q-tooltip>
            </BaseButtonIconSecondary>
          </div>
        </div>
        <div class="camera-view__toolbar-actions">
          <BaseButtonIconSecondary
            class="camera-view__toolbar-refresh"
            icon="refresh"
            size="sm"
            :disable="!props.camera || props.scanning"
            @click="refreshHqPhoto"
          >
            <q-tooltip anchor="bottom middle" self="top middle">Refresh HQ preview</q-tooltip>
          </BaseButtonIconSecondary>
          <BaseButtonSecondary
            class="camera-view__toolbar-button"
            :label="heatmapEnabled ? 'feature heatmap' : 'feature heatmap'"
            :disable="!props.camera"
            dense
            outline
            @click="toggleHeatmap"
          >
            <q-tooltip anchor="bottom middle" self="top middle">
              Highlights image features detected by photogrammetry. Ideally only the object shows red areas.
            </q-tooltip>
          </BaseButtonSecondary>
          <BaseSelect
            class="camera-view__toolbar-select"
            v-model="selectedCameraNameModel"
            :options="cameraOptionsList"
            label="Camera"
            emit-value
            map-options
            behavior="menu"
            :disable="cameraOptionsList.length === 0"
          />
        </div>
      </div>
    </div>
    <div class="camera-view__content">
      <div class="camera-surface">
        <div class="camera-surface__stack" ref="stackRef">
          <CameraFastPreview
            ref="fastPreviewRef"
            :camera="camera"
            :active="showFastPreview"
          />
          <CameraHistogram :image-element="hqPreviewImageElement" :image-loaded="hqPreviewImageLoaded" />
        </div>

        <div class="camera-surface__hq">
          <CameraHQPreview
            ref="hqPreviewRef"
            :camera="camera"
            :scanning="scanning"
            :max-height="stackHeight"
          />
        </div>
      </div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, unref, watch } from 'vue'
import BaseButtonIconPrimary from 'components/base/BaseButtonIconPrimary.vue'
import BaseButtonIconSecondary from 'components/base/BaseButtonIconSecondary.vue'
import BaseButtonPrimary from 'components/base/BaseButtonPrimary.vue'
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue'
import BaseSelect from 'components/base/BaseSelect.vue'
import CameraFastPreview, { type CameraFastPreviewExposed } from './camera/CameraFastPreview.vue'
import CameraHistogram from './camera/CameraHistogram.vue'
import CameraHQPreview, { type CameraHQPreviewExposed } from './camera/CameraHQPreview.vue'
import { useDeviceStore } from 'src/stores/device'
import { moveMotorByDegree, moveToPosition } from 'src/generated/api'
import { apiClient } from 'src/services/apiClient'

type CameraOption = { label: string; value: string; orientationFlag?: number | null }

async function handleMoveHome() {
  if (homeBusy.value) {
    return
  }

  homeBusy.value = true
  try {
    await deviceStore.ensureConnected()
    await moveToPosition({
      client: apiClient,
      body: {
        theta: 90,
        fi: 0,
        r: 1
      }
    })
    scheduleHqRefresh()
  } catch (error) {
    console.error('Failed to move to home position', error)
  } finally {
    homeBusy.value = false
  }
}

interface CameraViewProps {
  scanning: boolean
  camera?: {
    label: string
    value: string
    orientationFlag?: number | null
  } | null
  cameraOptions?: CameraOption[]
  selectedCameraName?: string
}

const props = defineProps<CameraViewProps>()
const emit = defineEmits<{
  (e: 'update:selectedCameraName', value: string): void
}>()

const deviceStore = useDeviceStore()

const fastPreviewRef = ref<CameraFastPreviewExposed | null>(null)
const hqPreviewRef = ref<CameraHQPreviewExposed | null>(null)
const stackRef = ref<HTMLElement | null>(null)
const stackHeight = ref<number | null>(null)
let stackResizeObserver: ResizeObserver | null = null
const heatmapEnabled = ref(false)
const motorBusy = ref(false)
const homeBusy = ref(false)
let hqRefreshTimeout: ReturnType<typeof setTimeout> | null = null

const ROTOR_MOTOR = 'rotor'
const TURNTABLE_MOTOR = 'turntable'

const cameraOptionsList = computed<CameraOption[]>(() => props.cameraOptions ?? [])
const showFastPreview = computed(() => !props.scanning && props.camera !== null)
const selectedCameraNameModel = computed({
  get: () => props.selectedCameraName ?? '',
  set: (value: string) => emit('update:selectedCameraName', value)
})

function setHeatmapActiveState(active: boolean) {
  heatmapEnabled.value = active
  hqPreviewRef.value?.setHeatmapActive(active)
}

function toggleHeatmap() {
  setHeatmapActiveState(!heatmapEnabled.value)
}

function clearHqRefreshTimeout() {
  if (hqRefreshTimeout) {
    clearTimeout(hqRefreshTimeout)
    hqRefreshTimeout = null
  }
}

function refreshHqPhoto() {
  clearHqRefreshTimeout()
  if (!props.camera || props.scanning) {
    return
  }
  hqPreviewRef.value?.refreshPhoto()
}

function scheduleHqRefresh(delay = 600) {
  if (!props.camera || props.scanning) {
    return
  }
  clearHqRefreshTimeout()
  hqRefreshTimeout = window.setTimeout(() => {
    hqRefreshTimeout = null
    hqPreviewRef.value?.refreshPhoto()
  }, delay)
}

async function handleMotorMove(motorName: string, degrees: number) {
  if (motorBusy.value) {
    return
  }

  motorBusy.value = true
  try {
    await deviceStore.ensureConnected()
    await moveMotorByDegree({
      client: apiClient,
      path: { motor_name: motorName },
      body: { degrees }
    })
    scheduleHqRefresh()
  } catch (error) {
    console.error('Failed to move motor', motorName, error)
  } finally {
    motorBusy.value = false
  }
}

const hqPreviewImageElement = computed(() => unref(hqPreviewRef.value?.previewImage) ?? null)
const hqPreviewImageLoaded = computed(() => unref(hqPreviewRef.value?.imageLoaded) ?? false)

function setupStackObserver(element: HTMLElement | null) {
  stackResizeObserver?.disconnect()
  if (!element) {
    return
  }

  stackResizeObserver = new ResizeObserver((entries) => {
    if (!entries.length) {
      return
    }
    stackHeight.value = entries[0].contentRect.height
  })
  stackResizeObserver.observe(element)
}

watch(
  stackRef,
  (element) => {
    setupStackObserver(element)
  },
  { immediate: true }
)

watch(
  () => props.camera?.value,
  () => {
    setHeatmapActiveState(false)
  }
)

watch(
  () => props.scanning,
  (isScanning) => {
    if (isScanning) {
      setHeatmapActiveState(false)
    }
  }
)

onBeforeUnmount(() => {
  stackResizeObserver?.disconnect()
  clearHqRefreshTimeout()
})
</script>

<style scoped>
.camera-view-card {
  width: 100%;
}

.camera-view__toolbar {
  padding: 0 16px;
}

.camera-view__toolbar-layout {
  display: flex;
  align-items: center;
  column-gap: 16px;
}

.camera-view__toolbar-left {
  flex: 0 0 240px;
  display: flex;
  justify-content: center;
}

.camera-view__toolbar-motor {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 16px;
}

.camera-view__toolbar-motor-vertical {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.camera-view__toolbar-actions {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-start;
}

.camera-view__toolbar-button {
  flex: 0 0 auto;
}

.camera-view__toolbar-select {
  flex: 0 0 150px;
  margin-left: auto;
}

.camera-view__content {
  padding: 0 16px;
}

.camera-surface {
  display: flex;
  width: fit-content;
  max-width: 100%;
  margin: 0;
  border-radius: 16px;
  background: #00aa00; /* TODO: debug color, remove later */
  overflow: hidden;
}

.camera-surface__stack {
  flex: 0 0 240px; /* 360px is the width of the fast preview */
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
}

.camera-surface__hq {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 16px;
}

.camera-surface__hq,
.camera-surface__stack {
  padding: 0;
}

.camera-surface :deep(.fast-preview),
.camera-surface :deep(.camera-histogram),
.camera-surface :deep(.camera-hq-preview) {
  padding: 0;
}

@media (max-width: 1023px) {
  .camera-surface {
    flex-direction: column;
    max-width: 100%;
  }

  .camera-surface__stack {
    flex-basis: auto;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
}
</style>
