<template>
  <div class="fast-preview">
    <div v-if="!camera || !active" class="fast-preview__placeholder">
      <slot name="placeholder">
        <div class="text-caption text-grey-6">Fast preview will appear once a camera is active.</div>
      </slot>
    </div>

    <div v-else class="fast-preview__stage">
      <div class="image-wrapper" :style="wrapperStyle">
        <img
          v-if="previewUrl"
          ref="previewImage"
          class="preview-image"
          :src="previewUrl"
          alt="Camera preview"
          :style="imageTransformStyle"
          @load="onImageLoad"
        />

        <div v-if="showCropUI" class="crop-dim crop-dim--top" :style="dimStyles.top"></div>
        <div v-if="showCropUI" class="crop-dim crop-dim--bottom" :style="dimStyles.bottom"></div>
        <div v-if="showCropUI" class="crop-dim crop-dim--left" :style="dimStyles.left"></div>
        <div v-if="showCropUI" class="crop-dim crop-dim--right" :style="dimStyles.right"></div>

        <canvas
          v-show="showCropUI"
          ref="cropCanvas"
          class="crop-canvas"
        ></canvas>

        <div
          v-if="overlayActive"
          class="crop-box"
          :style="cropBoxStyle"
        >
          <div class="crop-box__label">
            {{ currentCrop.widthPercent.toFixed(0) }}% × {{ currentCrop.heightPercent.toFixed(0) }}%
          </div>
        </div>

        <div
          v-if="overlayActive"
          class="crop-handle"
          :style="handleStyle"
          @mousedown.stop.prevent="startHandleDrag"
          @touchstart.stop.prevent="startHandleDrag"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { useQuasar } from 'quasar'
import { useCameraStore } from 'src/stores/camera'
import { useDeviceStore } from 'src/stores/device'
import { apiClient } from 'src/services/apiClient'
import { updateCameraNameSettings } from 'src/generated/api'
import { usePreviewSettingsStore, type PreviewOrientation } from 'src/stores/previewSettings'
import { getOrientationRotation, getOrientationTransform } from 'src/utils/orientation'

interface FastPreviewProps {
  active: boolean
  camera?: {
    label: string
    value: string
    orientationFlag?: number | null
  } | null
}

type DragMode = 'box' | 'handle'

export type CameraFastPreviewExposed = {
  previewImage: Ref<HTMLImageElement | null>
  imageLoaded: Ref<boolean>
}

const props = defineProps<FastPreviewProps>()

const previewSettingsStore = usePreviewSettingsStore()
const cameraStore = useCameraStore()
const deviceStore = useDeviceStore()
void deviceStore.ensureConnected()

const $q = useQuasar()

const previewImage = ref<HTMLImageElement | null>(null)
const cropCanvas = ref<HTMLCanvasElement | null>(null)
const imageLoaded = ref(false)
const imageSize = ref({ width: 0, height: 0 })

const appliedCrop = ref({ widthPercent: 100, heightPercent: 100 })
const editingCrop = ref({ widthPercent: 100, heightPercent: 100 })
const lastConfirmedCrop = ref({ widthPercent: 100, heightPercent: 100 })
const pendingCrop = ref<{ widthPercent: number; heightPercent: number } | null>(null)
const pendingRequestId = ref<symbol | null>(null)
const cropSaving = ref(false)
const dragMode = ref<DragMode | null>(null)
const orientationInitialized = ref(false)

const orientation = computed<PreviewOrientation>(() =>
  previewSettingsStore.getOrientation(props.camera?.value ?? null)
)

const wrapperStyle = computed(() => {
  const isPortrait = orientation.value === 'portrait'
  const aspectRatio = isPortrait ? '3 / 4' : '4 / 3'
  return {
    width: '100%',
    aspectRatio
  }
})

const imageTransformStyle = computed(() => {
  const transform = getOrientationTransform(props.camera?.orientationFlag ?? null)
  return transform === 'none'
    ? {}
    : { transform, transformOrigin: 'center center' }
})

const previewUrl = computed(() =>
  props.camera?.value ? cameraStore.getPreviewUrl(props.camera.value) : null
)

const cameraSettings = computed(() =>
  props.camera?.value ? deviceStore.getCamera(props.camera.value)?.settings ?? null : null
)

watch(
  cameraSettings,
  (settings) => {
    const widthCrop = settings?.crop_width ?? 0
    const heightCrop = settings?.crop_height ?? 0
    const normalized = normalizeCrop(widthCrop, heightCrop)
    appliedCrop.value = normalized
    lastConfirmedCrop.value = { ...normalized }

    if (pendingCrop.value && cropsNearlyEqual(pendingCrop.value, normalized)) {
      clearPendingCrop()
    }

    if (!dragMode.value && !pendingCrop.value) {
      editingCrop.value = { ...appliedCrop.value }
    }
  },
  { immediate: true }
)

watch(
  () => props.camera?.value,
  () => {
    imageLoaded.value = false
  }
)

watch(previewUrl, () => {
  imageLoaded.value = false
})

const currentCrop = computed(() => {
  if (dragMode.value) {
    return editingCrop.value
  }
  if (pendingCrop.value) {
    return pendingCrop.value
  }
  return appliedCrop.value
})
const hasCropReduction = computed(
  () => currentCrop.value.widthPercent < 100 || currentCrop.value.heightPercent < 100
)
const showCropUI = computed(() => props.active && imageLoaded.value)
const overlayActive = computed(() => showCropUI.value)

const dimStyles = computed(() => {
  if (!showCropUI.value) {
    return {
      top: {},
      bottom: {},
      left: {},
      right: {}
    }
  }

  const horizontalMargin = Math.max((100 - currentCrop.value.widthPercent) / 2, 0)
  const verticalMargin = Math.max((100 - currentCrop.value.heightPercent) / 2, 0)

  return {
    top: {
      top: '0%',
      left: '0%',
      right: '0%',
      height: `${verticalMargin}%`
    },
    bottom: {
      bottom: '0%',
      left: '0%',
      right: '0%',
      height: `${verticalMargin}%`
    },
    left: {
      top: `${verticalMargin}%`,
      bottom: `${verticalMargin}%`,
      left: '0%',
      width: `${horizontalMargin}%`
    },
    right: {
      top: `${verticalMargin}%`,
      bottom: `${verticalMargin}%`,
      right: '0%',
      width: `${horizontalMargin}%`
    }
  }
})

const displayCropRect = computed(() => {
  if (!imageLoaded.value || imageSize.value.width === 0 || imageSize.value.height === 0) {
    return null
  }

  const widthPx = (currentCrop.value.widthPercent / 100) * imageSize.value.width
  const heightPx = (currentCrop.value.heightPercent / 100) * imageSize.value.height
  return {
    width: widthPx,
    height: heightPx,
    x: (imageSize.value.width - widthPx) / 2,
    y: (imageSize.value.height - heightPx) / 2
  }
})

const cropBoxStyle = computed(() => {
  if (!displayCropRect.value) {
    return {}
  }
  const { x, y, width, height } = displayCropRect.value
  return {
    top: `${y}px`,
    left: `${x}px`,
    width: `${width}px`,
    height: `${height}px`
  }
})

const handleSizePx = 24
const handleStyle = computed(() => {
  if (!displayCropRect.value) {
    return {}
  }
  const { x, y, width, height } = displayCropRect.value
  const maxLeft = Math.max(imageSize.value.width - handleSizePx, 0)
  const maxTop = Math.max(imageSize.value.height - handleSizePx, 0)
  const left = Math.min(Math.max(x + width - handleSizePx, x), maxLeft)
  const top = Math.min(Math.max(y + height - handleSizePx, y), maxTop)
  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${handleSizePx}px`,
    height: `${handleSizePx}px`
  }
})

function clampPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 0
  }
  return Math.min(Math.max(value, 0), 100)
}

function cropsNearlyEqual(a: { widthPercent: number; heightPercent: number }, b: { widthPercent: number; heightPercent: number }) {
  return Math.abs(a.widthPercent - b.widthPercent) < 0.5 && Math.abs(a.heightPercent - b.heightPercent) < 0.5
}

function clearPendingCrop(requestId?: symbol) {
  if (requestId && pendingRequestId.value !== requestId) {
    return
  }
  pendingCrop.value = null
  pendingRequestId.value = null
}

function normalizeCrop(cropWidthPercent: number, cropHeightPercent: number) {
  const safeCropWidth = clampPercent(cropWidthPercent)
  const safeCropHeight = clampPercent(cropHeightPercent)
  return {
    widthPercent: 100 - safeCropWidth,
    heightPercent: 100 - safeCropHeight
  }
}

function onImageLoad() {
  updateImageSize()
  imageLoaded.value = true
  updateOrientationFromImage()
  nextTick(() => drawCropCanvas())
}

function updateOrientationFromImage() {
  const cameraName = props.camera?.value
  const img = previewImage.value
  if (!cameraName || !img) {
    return
  }

  const naturalWidth = img.naturalWidth
  const naturalHeight = img.naturalHeight
  const rotation = getOrientationRotation(props.camera?.orientationFlag ?? null)

  const rotatedWidth = rotation === 90 || rotation === 270 ? naturalHeight : naturalWidth
  const rotatedHeight = rotation === 90 || rotation === 270 ? naturalWidth : naturalHeight

  const effectiveOrientation: PreviewOrientation =
    rotatedWidth >= rotatedHeight ? 'landscape' : 'portrait'

  previewSettingsStore.setOrientation(cameraName, effectiveOrientation)
}

function updateImageSize() {
  const img = previewImage.value
  const canvas = cropCanvas.value
  if (!img || !canvas) return
  imageSize.value = {
    width: img.clientWidth,
    height: img.clientHeight
  }
  canvas.width = imageSize.value.width
  canvas.height = imageSize.value.height
  drawCropCanvas()
}

function drawCropCanvas() {
  const canvas = cropCanvas.value
  if (!canvas) {
    return
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  const { width, height } = imageSize.value
  canvas.width = width
  canvas.height = height
  ctx.clearRect(0, 0, width, height)

  if (!showCropUI.value || !displayCropRect.value) {
    return
  }

  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--q-primary')?.trim() || '#1976D2'
  const { x, y, width: rectWidth, height: rectHeight } = displayCropRect.value

  if (hasCropReduction.value) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)'
    ctx.fillRect(0, 0, width, height)
    ctx.clearRect(x, y, rectWidth, rectHeight)
  }

  ctx.strokeStyle = primaryColor
  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.strokeRect(Math.max(x + 1, 0), Math.max(y + 1, 0), Math.max(rectWidth - 2, 0), Math.max(rectHeight - 2, 0))
}

function getPointerPosition(event: MouseEvent | TouchEvent) {
  const canvas = cropCanvas.value
  if (!canvas) {
    return { x: 0, y: 0 }
  }
  const rect = canvas.getBoundingClientRect()
  const point = 'touches' in event && event.touches.length > 0 ? event.touches[0] : (event as MouseEvent)
  return {
    x: point.clientX - rect.left,
    y: point.clientY - rect.top
  }
}

function startHandleDrag(event: MouseEvent | TouchEvent) {
  beginDrag('handle', event)
}

function beginDrag(mode: DragMode, event: MouseEvent | TouchEvent) {
  if (!imageLoaded.value) {
    return
  }
  clearPendingCrop()
  dragMode.value = mode
  updateCropFromPointer(event)
  attachInteractionListeners()
}

function attachInteractionListeners() {
  window.addEventListener('mousemove', handlePointerMove)
  window.addEventListener('mouseup', endDrag)
  window.addEventListener('touchmove', handlePointerMove, { passive: false })
  window.addEventListener('touchend', endDrag)
  window.addEventListener('touchcancel', endDrag)
}

function detachInteractionListeners() {
  window.removeEventListener('mousemove', handlePointerMove)
  window.removeEventListener('mouseup', endDrag)
  window.removeEventListener('touchmove', handlePointerMove)
  window.removeEventListener('touchend', endDrag)
  window.removeEventListener('touchcancel', endDrag)
}

function handlePointerMove(event: MouseEvent | TouchEvent) {
  if (!dragMode.value) {
    return
  }
  event.preventDefault()
  updateCropFromPointer(event)
}

function updateCropFromPointer(event: MouseEvent | TouchEvent) {
  if (!imageLoaded.value || imageSize.value.width === 0 || imageSize.value.height === 0) {
    return
  }
  const position = getPointerPosition(event)
  const clampedX = Math.min(Math.max(position.x, 0), imageSize.value.width)
  const clampedY = Math.min(Math.max(position.y, 0), imageSize.value.height)
  const insetX = Math.min(clampedX, imageSize.value.width - clampedX)
  const insetY = Math.min(clampedY, imageSize.value.height - clampedY)
  const marginPercentX = clampPercent((insetX * 2 / imageSize.value.width) * 100)
  const marginPercentY = clampPercent((insetY * 2 / imageSize.value.height) * 100)
  const widthPercent = clampPercent(100 - marginPercentX)
  const heightPercent = clampPercent(100 - marginPercentY)

  editingCrop.value = {
    widthPercent: widthPercent,
    heightPercent: heightPercent
  }
}

function endDrag() {
  if (!dragMode.value) {
    return
  }
  dragMode.value = null
  detachInteractionListeners()
  if (imageSize.value.width === 0 || imageSize.value.height === 0) {
    return
  }
  persistCrop(editingCrop.value.widthPercent, editingCrop.value.heightPercent)
}

async function persistCrop(widthPercent: number, heightPercent: number) {
  if (!props.camera?.value) {
    return
  }

  const safeWidth = clampPercent(widthPercent)
  const safeHeight = clampPercent(heightPercent)
  const payload = {
    widthPercent: safeWidth,
    heightPercent: safeHeight
  }

  pendingCrop.value = { ...payload }
  pendingRequestId.value = Symbol('pending-crop')
  editingCrop.value = { ...payload }

  cropSaving.value = true
  try {
    await updateCameraNameSettings({
      client: apiClient,
      path: { name: props.camera.value },
      body: {
        crop_width: Math.round(100 - payload.widthPercent),
        crop_height: Math.round(100 - payload.heightPercent)
      }
    })

    appliedCrop.value = payload
    lastConfirmedCrop.value = { ...payload }
    clearPendingCrop(pendingRequestId.value)
    editingCrop.value = { ...payload }
    $q.notify({ type: 'positive', message: 'Crop updated.' })
  } catch (error) {
    console.error('Failed to update crop', error)
    clearPendingCrop(pendingRequestId.value)
    appliedCrop.value = { ...lastConfirmedCrop.value }
    if (!dragMode.value) {
      editingCrop.value = { ...appliedCrop.value }
    }
    $q.notify({ type: 'negative', message: 'Failed to save crop.' })
  } finally {
    cropSaving.value = false
  }
}

function handleResize() {
  if (!imageLoaded.value) return
  updateImageSize()
}

function resetCropToFullCoverage() {
  clearPendingCrop()
  const full = { widthPercent: 100, heightPercent: 100 }
  appliedCrop.value = { ...full }
  editingCrop.value = { ...full }
  lastConfirmedCrop.value = { ...full }
  void persistCrop(full.widthPercent, full.heightPercent)
}

watch(
  orientation,
  (newOrientation, previousOrientation) => {
    if (!orientationInitialized.value) {
      orientationInitialized.value = true
    } else if (previousOrientation && newOrientation !== previousOrientation) {
      resetCropToFullCoverage()
    }

    if (!imageLoaded.value) {
      return
    }
    nextTick(() => updateImageSize())
  }
)

watch(
  () => props.camera?.orientationFlag,
  () => {
    if (!imageLoaded.value) {
      return
    }
    updateOrientationFromImage()
  }
)

watch(currentCrop, () => {
  drawCropCanvas()
})

watch(showCropUI, () => {
  drawCropCanvas()
})

watch(imageSize, () => {
  drawCropCanvas()
})

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  detachInteractionListeners()
})

defineExpose<CameraFastPreviewExposed>({
  previewImage,
  imageLoaded
})
</script>

<style scoped>
.fast-preview {
  width: 100%;
}

.fast-preview__placeholder {
  padding: 1rem;
  min-height: 160px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.fast-preview__stage {
  position: relative;
}

.image-wrapper {
  position: relative;
  overflow: hidden;
  background: #000;
  width: 100%;
  aspect-ratio: 4 / 3;
}

.preview-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.crop-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  cursor: default;
}

.crop-dim {
  position: absolute;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(8px) saturate(50%);
  pointer-events: none;
}

.crop-box {
  position: absolute;
  border: 2px solid var(--q-primary);
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  color: white;
  font-size: 0.75rem;
}

.crop-box__label {
  background: rgba(0, 0, 0, 0.4);
  padding: 2px 6px;
  border-radius: 4px;
}

.crop-handle {
  position: absolute;
  border-radius: 50%;
  background: var(--q-primary);
  border: 2px solid rgba(0, 0, 0, 0.5);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}
</style>
