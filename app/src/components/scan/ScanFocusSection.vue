<template>
  <BaseSection title="Focus Settings">
    <q-tabs v-model="focusModeModel" dense active-color="primary" indicator-color="primary">
      <q-tab name="autofocus" label="Autofocus" />
      <q-tab name="manual" label="Manual" />
      <q-tab name="stacking" label="Stacking" />
    </q-tabs>

    <q-tab-panels v-model="focusModeModel" animated class="q-mt-md">
      <q-tab-panel name="autofocus">
        <div class="text-body2">
          Autofocus enabled
        </div>
      </q-tab-panel>
      <q-tab-panel name="manual">
        <BaseSliderWithInput
          v-model="manualFocusValueModel"
          label="Focus (diopters)"
          :slider-min="0"
          :slider-max="15"
          :slider-step="0.1"
          :input-min="0"
          :input-max="15"
          :tooltip="manualFocusDescription"
          @update:model-value="handleManualFocusInput"
        />
      </q-tab-panel>
      <q-tab-panel name="stacking">
        <BaseSliderWithInput
          v-model="focusStacksModel"
          label="Focus Stacks"
          :slider-min="2"
          :slider-max="15"
          :slider-step="1"
          :input-min="2"
          :input-max="99"
          :tooltip="focusStacksDescription"
        />

        <div class="q-mt-sm">
          <BaseRangeWithInput
            v-model="focusRangeModel"
            label="Focus Range"
            :min="0"
            :max="15"
            :step="0.1"
            :markers="true"
            :marker-labels="[5, 10, 15]"
            :input-min="0"
            :input-max="15"
            :tooltip="focusRangeDescription"
          />
        </div>

        <div class="q-mt-sm focus-stacking-preview-action">
          <q-btn
            outline
            color="primary"
            label="Preview"
            :disable="!cameraName"
            @click="openFocusPreviewDialog"
          />
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </BaseSection>

  <q-dialog v-model="focusPreviewDialogVisible" persistent>
    <q-card class="focus-preview-dialog">
      <q-card-section class="focus-preview-dialog__header">
        <div class="focus-preview-dialog__title">
          {{ cameraLabel || cameraName || 'Focus stacking preview' }}
        </div>
        <q-btn icon="close" flat round dense @click="focusPreviewDialogVisible = false" />
      </q-card-section>

      <q-card-section class="focus-preview-dialog__controls">
        <div class="focus-preview-dialog__motor-bar">
          <q-btn-group unelevated rounded>
            <BaseMotorButtonBar
              :motor-name="TURNTABLE_MOTOR"
              :step-degrees="20"
              negative-icon="keyboard_arrow_left"
              positive-icon="keyboard_arrow_right"
              negative-tooltip="Rotate turntable left"
              positive-tooltip="Rotate turntable right"
              :show-calibrate="false"
              :disable="motorControlsDisabled"
              :refresh-after-move="true"
              @busy-change="handleTurntableBusyChange"
              @moved="handleMotorMoved"
            />
            <BaseMotorButtonBar
              :motor-name="ROTOR_MOTOR"
              :step-degrees="10"
              negative-icon="keyboard_arrow_up"
              positive-icon="keyboard_arrow_down"
              negative-tooltip="Move rotor up"
              positive-tooltip="Move rotor down"
              :disable="motorControlsDisabled"
              :refresh-after-move="true"
              @busy-change="handleRotorBusyChange"
              @moved="handleMotorMoved"
              @calibrated="handleMotorMoved"
            />
            <q-btn
              flat
              dense
              round
              icon="home"
              :disable="motorControlsDisabled || homeBusy"
              @click="handleMoveHome"
            >
              <q-tooltip anchor="bottom middle" self="top middle">Return to home position</q-tooltip>
            </q-btn>
          </q-btn-group>

          <q-btn
            dense
            outline
            color="primary"
            icon="refresh"
            label="Refresh"
            :loading="refreshingBoth"
            :disable="!cameraName"
            @click="refreshBothPreviews"
          />
        </div>
      </q-card-section>

      <q-card-section class="focus-preview-dialog__body">
        <div class="focus-preview-grid">
          <div class="focus-preview-panel">
            <div class="focus-preview-panel__image-wrapper">
              <img
                v-if="minPreview.imageUrl"
                :src="minPreview.imageUrl"
                alt="Minimum focus preview"
                class="focus-preview-panel__image"
              />
              <div v-else class="focus-preview-panel__placeholder text-grey-6">
                No preview image
              </div>
              <q-inner-loading :showing="minPreview.loading">
                <q-spinner-dots color="primary" size="36px" />
              </q-inner-loading>
            </div>

            <BaseSliderWithInput
              v-model="minFocusValueModel"
              label="Min Focus (diopters)"
              :slider-min="0"
              :slider-max="15"
              :slider-step="0.1"
              :input-min="0"
              :input-max="15"
              :disabled="!cameraName"
              @update:model-value="handleMinFocusSliderChange"
            />
            <div v-if="minPreview.error" class="focus-preview-panel__error text-negative text-caption">
              {{ minPreview.error }}
            </div>
          </div>

          <div class="focus-preview-panel">
            <div class="focus-preview-panel__image-wrapper">
              <img
                v-if="maxPreview.imageUrl"
                :src="maxPreview.imageUrl"
                alt="Maximum focus preview"
                class="focus-preview-panel__image"
              />
              <div v-else class="focus-preview-panel__placeholder text-grey-6">
                No preview image
              </div>
              <q-inner-loading :showing="maxPreview.loading">
                <q-spinner-dots color="primary" size="36px" />
              </q-inner-loading>
            </div>

            <BaseSliderWithInput
              v-model="maxFocusValueModel"
              label="Max Focus (diopters)"
              :slider-min="0"
              :slider-max="15"
              :slider-step="0.1"
              :input-min="0"
              :input-max="15"
              :disabled="!cameraName"
              @update:model-value="handleMaxFocusSliderChange"
            />
            <div v-if="maxPreview.error" class="focus-preview-panel__error text-negative text-caption">
              {{ maxPreview.error }}
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { debounce } from 'quasar'

import BaseSliderWithInput from 'components/base/BaseSliderWithInput.vue'
import BaseRangeWithInput from 'components/base/BaseRangeWithInput.vue'
import BaseSection from 'components/base/BaseSection.vue'
import BaseMotorButtonBar from 'components/base/BaseMotorButtonBar.vue'
import { apiClient, buildApiUrl, getApiSdk } from 'src/services/apiClient'

type FocusMode = 'autofocus' | 'manual' | 'stacking'

const props = defineProps<{
  focusMode: FocusMode
  manualFocusValue: number
  focusStacks: number
  focusRange: { min: number; max: number }
  cameraName?: string | null
  cameraLabel?: string | null
  afDescription: string
  manualFocusDescription: string
  focusStacksDescription: string
  focusRangeDescription: string
}>()

const emit = defineEmits<{
  (e: 'update:focusMode', value: FocusMode): void
  (e: 'update:manualFocusValue', value: number): void
  (e: 'update:focusStacks', value: number): void
  (e: 'update:focusRange', value: { min: number; max: number }): void
  (e: 'manual-focus-input', value: number): void
}>()

const focusModeModel = computed({
  get: () => props.focusMode,
  set: (value: FocusMode) => emit('update:focusMode', value)
})

const manualFocusValueModel = computed({
  get: () => props.manualFocusValue,
  set: (value: number) => emit('update:manualFocusValue', value)
})

const focusStacksModel = computed({
  get: () => props.focusStacks,
  set: (value: number) => emit('update:focusStacks', value)
})

const focusRangeModel = computed({
  get: () => props.focusRange,
  set: (value: { min: number; max: number }) => emit('update:focusRange', value)
})

const handleManualFocusInput = (value: number) => {
  emit('manual-focus-input', value)
}

const apiSdk = () => getApiSdk()
const ROTOR_MOTOR = 'rotor'
const TURNTABLE_MOTOR = 'turntable'
const focusPreviewDialogVisible = ref(false)
const refreshingBoth = ref(false)
const homeBusy = ref(false)
const rotorControlsBusy = ref(false)
const turntableControlsBusy = ref(false)

type FocusPreviewState = {
  imageUrl: string | null
  loading: boolean
  error: string | null
  requestId: number
}

const minPreview = reactive<FocusPreviewState>({
  imageUrl: null,
  loading: false,
  error: null,
  requestId: 0
})

const maxPreview = reactive<FocusPreviewState>({
  imageUrl: null,
  loading: false,
  error: null,
  requestId: 0
})

const motorControlsBusy = computed(() => rotorControlsBusy.value || turntableControlsBusy.value)
const motorControlsDisabled = computed(() => motorControlsBusy.value || refreshingBoth.value)

const minFocusValueModel = computed({
  get: () => props.focusRange.min,
  set: (value: number) => {
    const clamped = Math.max(0, Math.min(value, props.focusRange.max))
    emit('update:focusRange', { ...props.focusRange, min: clamped })
  }
})

const maxFocusValueModel = computed({
  get: () => props.focusRange.max,
  set: (value: number) => {
    const clamped = Math.min(15, Math.max(value, props.focusRange.min))
    emit('update:focusRange', { ...props.focusRange, max: clamped })
  }
})

let captureQueue = Promise.resolve()

function queueCapture(task: () => Promise<void>) {
  const run = captureQueue.then(task, task)
  captureQueue = run.then(() => undefined, () => undefined)
  return run
}

function sleep(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

function replacePreviewImage(target: FocusPreviewState, url: string | null) {
  const previous = target.imageUrl
  target.imageUrl = url
  if (previous) {
    URL.revokeObjectURL(previous)
  }
}

async function capturePreview(target: FocusPreviewState, focusValue: number) {
  if (!props.cameraName) {
    target.error = 'No camera selected.'
    return
  }

  const requestId = ++target.requestId
  target.loading = true
  target.error = null

  try {
    await apiSdk().updateCameraNameSettings({
      client: apiClient,
      path: { name: props.cameraName },
      body: {
        AF: false,
        manual_focus: focusValue
      }
    })

    await sleep(220)

    const requestUrl = buildApiUrl(`cameras/${encodeURIComponent(props.cameraName)}/photo?ts=${Date.now()}`)
    const response = await fetch(requestUrl, { cache: 'no-store' })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const blob = await response.blob()
    const imageUrl = URL.createObjectURL(blob)

    if (requestId === target.requestId) {
      replacePreviewImage(target, imageUrl)
    } else {
      URL.revokeObjectURL(imageUrl)
    }
  } catch (error) {
    console.error('Failed to capture focus preview image', error)
    target.error = 'Preview capture failed.'
  } finally {
    if (requestId === target.requestId) {
      target.loading = false
    }
  }
}

async function refreshBothPreviews() {
  if (!props.cameraName) {
    return
  }

  refreshingBoth.value = true
  try {
    await queueCapture(() => capturePreview(minPreview, props.focusRange.min))
    await queueCapture(() => capturePreview(maxPreview, props.focusRange.max))
  } finally {
    refreshingBoth.value = false
  }
}

const debouncedCaptureMinPreview = debounce(() => {
  void queueCapture(() => capturePreview(minPreview, props.focusRange.min))
}, 280)

const debouncedCaptureMaxPreview = debounce(() => {
  void queueCapture(() => capturePreview(maxPreview, props.focusRange.max))
}, 280)

function handleMinFocusSliderChange() {
  debouncedCaptureMinPreview()
}

function handleMaxFocusSliderChange() {
  debouncedCaptureMaxPreview()
}

function openFocusPreviewDialog() {
  focusPreviewDialogVisible.value = true
}

function handleRotorBusyChange(isBusy: boolean) {
  rotorControlsBusy.value = isBusy
}

function handleTurntableBusyChange(isBusy: boolean) {
  turntableControlsBusy.value = isBusy
}

function handleMotorMoved() {
  void refreshBothPreviews()
}

async function handleMoveHome() {
  if (homeBusy.value) {
    return
  }

  homeBusy.value = true
  try {
    await apiSdk().moveToPosition({
      client: apiClient,
      body: {
        theta: 90,
        fi: 0,
        r: 1
      }
    })
    await refreshBothPreviews()
  } catch (error) {
    console.error('Failed to move to home position', error)
  } finally {
    homeBusy.value = false
  }
}

watch(
  focusPreviewDialogVisible,
  (isVisible) => {
    if (isVisible) {
      void refreshBothPreviews()
    }
  }
)

watch(
  () => props.cameraName,
  () => {
    replacePreviewImage(minPreview, null)
    replacePreviewImage(maxPreview, null)
    minPreview.error = null
    maxPreview.error = null
  }
)

onBeforeUnmount(() => {
  debouncedCaptureMinPreview.cancel()
  debouncedCaptureMaxPreview.cancel()
  replacePreviewImage(minPreview, null)
  replacePreviewImage(maxPreview, null)
})
</script>

<style scoped>
.focus-stacking-preview-action {
  display: flex;
  justify-content: flex-end;
}

.focus-preview-dialog {
  width: min(1180px, 96vw);
  max-width: 96vw;
}

.focus-preview-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}

.focus-preview-dialog__title {
  font-size: 1rem;
  font-weight: 600;
}

.focus-preview-dialog__controls {
  padding: 0 16px 12px;
}

.focus-preview-dialog__motor-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.focus-preview-dialog__body {
  padding: 0 16px 16px;
}

.focus-preview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.focus-preview-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.focus-preview-panel__image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: rgba(15, 23, 42, 0.35);
  border-radius: 8px;
  overflow: hidden;
}

.focus-preview-panel__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.focus-preview-panel__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.focus-preview-panel__error {
  min-height: 18px;
}

@media (max-width: 900px) {
  .focus-preview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
