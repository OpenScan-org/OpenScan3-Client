<template>
  <div class="camera-hq-preview" :style="containerStyle">
    <div v-if="!camera" class="hq-preview__placeholder">
      <div class="text-caption text-grey-6">
        Select a camera to load the HQ preview.
      </div>
    </div>
    <div v-else class="hq-preview__stage">
      <div class="hq-preview__image-wrapper">
        <template v-if="imageUrl && !hasError">
          <img
            :key="imageUrl"
            :src="imageUrl"
            alt="High quality camera preview"
            class="hq-preview__image"
            ref="previewImage"
            crossorigin="anonymous"
            @load="onImageLoad"
            @error="onImageError"
          />
          <CameraHeatmapOverlay
            :active="showHeatmap"
            :image-element="previewImage"
            :image-loaded="imageLoaded"
          />
        </template>
        <div v-else class="hq-preview__placeholder">
          <div class="text-caption text-grey-6">
            {{ hasError ?? 'No preview available.' }}
          </div>
        </div>
        <q-inner-loading :showing="isLoading">
          <q-spinner-dots color="primary" size="42px" />
        </q-inner-loading>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, type Ref } from 'vue'
import { useCameraStore } from 'src/stores/camera'
import { usePreviewSettingsStore, type PreviewOrientation } from 'src/stores/previewSettings'
import { LANDSCAPE_HQ_MAX_HEIGHT, PORTRAIT_HQ_MAX_HEIGHT } from 'src/utils/orientation'
import CameraHeatmapOverlay from './CameraHeatmapOverlay.vue'

interface CameraHQPreviewProps {
  scanning: boolean
  maxHeight?: number | null
  camera?: {
    label: string
    value: string
    orientationFlag?: number | null
  } | null
}

export type CameraHQPreviewExposed = {
  refreshPhoto: () => void
  setHeatmapActive: (active: boolean) => void
  previewImage: Ref<HTMLImageElement | null>
  imageLoaded: Ref<boolean>
}

const props = defineProps<CameraHQPreviewProps>()

const cameraStore = useCameraStore()
const previewSettingsStore = usePreviewSettingsStore()

const cacheBuster = ref(0)
const isLoading = computed(() => cameraStore.photoLoading)
const hasError = computed(() => cameraStore.photoError)
const previewImage = ref<HTMLImageElement | null>(null)
const imageLoaded = ref(false)
const showHeatmap = ref(false)
const imageDimensions = ref<{ width: number; height: number } | null>(null)

const imageUrl = computed(() => {
  if (!props.camera?.value) {
    return null
  }
  return cameraStore.photoObjectUrl
})

const displayOrientation = computed<PreviewOrientation>(() =>
  previewSettingsStore.getOrientation(props.camera?.value ?? null)
)

const containerStyle = computed(() => {
  const isLandscape = displayOrientation.value === 'landscape'
  const defaultMaxHeightValue = isLandscape ? LANDSCAPE_HQ_MAX_HEIGHT : PORTRAIT_HQ_MAX_HEIGHT
  const maxHeightValue = props.maxHeight ? Math.min(props.maxHeight, defaultMaxHeightValue) : defaultMaxHeightValue
  const maxHeight = `${maxHeightValue}px`
  const defaultAspectRatioNumeric = isLandscape ? 4 / 3 : 3 / 4
  const dimensions = imageDimensions.value
  const aspectRatioNumeric = dimensions
    ? dimensions.width / Math.max(dimensions.height, 1)
    : defaultAspectRatioNumeric
  const width = dimensions ? `${aspectRatioNumeric * maxHeightValue}px` : 'auto'

  return {
    maxHeight,
    width,
    maxWidth: '100%'
  }
})

const canRefresh = computed(() => Boolean(props.camera?.value) && !props.scanning && !isLoading.value)

function refreshPhoto() {
  if (!props.camera?.value) {
    cameraStore.clearPhoto()
    return
  }
  imageLoaded.value = false
  cacheBuster.value = Date.now()
  cameraStore.fetchPhoto(props.camera.value)
}

function onImageLoad() {
  imageLoaded.value = true
  updateImageDimensions()
  nextTick(() => {
    // allow child components to pull the latest image element
  })
}

function onImageError() {
  imageLoaded.value = false
  imageDimensions.value = null
}

function setHeatmapActive(active: boolean) {
  showHeatmap.value = active
}

function updateImageDimensions() {
  const img = previewImage.value
  if (!img || !img.naturalWidth || !img.naturalHeight) {
    imageDimensions.value = null
    return
  }

  imageDimensions.value = {
    width: img.naturalWidth,
    height: img.naturalHeight
  }
}

watch(
  () => props.camera?.value,
  (cameraName) => {
    if (cameraName) {
      refreshPhoto()
    } else {
      imageLoaded.value = false
      imageDimensions.value = null
      cacheBuster.value = 0
      cameraStore.clearPhoto()
    }
  },
  { immediate: true }
)

watch(
  () => props.scanning,
  (isScanning) => {
    if (isScanning) {
      imageLoaded.value = false
      imageDimensions.value = null
    }
  }
)

defineExpose<CameraHQPreviewExposed>({
  refreshPhoto,
  setHeatmapActive,
  previewImage,
  imageLoaded
})
</script>

<style scoped>

.camera-hq-preview {
  width: auto;
  max-width: 100%;
  background: #00ff00;
}

.hq-preview__stage {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: stretch;
}

.hq-preview__image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0000ff;
  overflow: hidden;
}

.hq-preview__image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

.hq-preview__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  text-align: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.4);
  border-radius: 12px;
}
</style>
