<template>
  <q-card class="camera-hq-preview-card">
    <q-card-section>
      <div class="row items-center q-col-gutter-sm">
        <div class="col-12 col-sm">
          <div class="text-h6">HQ Preview</div>
          <div class="text-caption text-grey-7">
            Accurate preview.
          </div>
        </div>
        <div class="col-12 col-sm-auto flex items-center q-gutter-sm justify-end">
          <q-btn
            icon="mdi-fire"
            dense
            unelevated
            :color="showHeatmap ? 'primary' : 'grey-6'"
            label="Heatmap"
            @click="toggleHeatmap"
          />
          <q-btn
            icon="refresh"
            dense
            unelevated
            color="primary"
            label="Refresh"
            :disable="!canRefresh"
            @click="refreshPhoto"
          />
        </div>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section class="q-pt-md">
      <div v-if="!camera" class="hq-preview__placeholder">
        <div class="text-caption text-grey-6">
          Select a camera to load the HQ preview.
        </div>
      </div>
      <div v-else class="hq-preview__stage">
        <div class="hq-preview__image-wrapper" :style="orientationTransformStyle">
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
      <div v-if="imageLoaded" class="q-mt-md">
        <CameraHistogram :image-element="previewImage" :image-loaded="imageLoaded" />
      </div>
      <q-banner v-if="hasError" dense class="bg-red-5 text-white q-mt-md">
        {{ hasError }}
      </q-banner>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useCameraStore } from 'src/stores/camera'
import { getOrientationTransform } from 'src/utils/orientation'
import CameraHistogram from './CameraHistogram.vue'
import CameraHeatmapOverlay from './CameraHeatmapOverlay.vue'

interface CameraHQPreviewProps {
  scanning: boolean
  camera?: {
    label: string
    value: string
    orientationFlag?: number | null
  } | null
}

const props = defineProps<CameraHQPreviewProps>()

const cameraStore = useCameraStore()

const cacheBuster = ref(0)
const isLoading = ref(false)
const hasError = ref<string | null>(null)
const previewImage = ref<HTMLImageElement | null>(null)
const imageLoaded = ref(false)
const showHeatmap = ref(false)

const imageUrl = computed(() => {
  if (!props.camera?.value) {
    return null
  }
  const base = cameraStore.getPhotoUrl(props.camera.value)
  if (!base) {
    return null
  }
  return `${base}?ts=${cacheBuster.value}`
})

const orientationTransformStyle = computed(() => {
  const transform = getOrientationTransform(props.camera?.orientationFlag ?? null)
  return transform === 'none'
    ? {}
    : { transform, transformOrigin: 'center center' }
})

const canRefresh = computed(() => Boolean(props.camera?.value) && !props.scanning && !isLoading.value)

function refreshPhoto() {
  if (!props.camera?.value) {
    return
  }
  isLoading.value = true
  hasError.value = null
  imageLoaded.value = false
  cacheBuster.value = Date.now()
}

function onImageLoad() {
  isLoading.value = false
  hasError.value = null
  imageLoaded.value = true
  nextTick(() => {
    // allow child components to pull the latest image element
  })
}

function onImageError() {
  isLoading.value = false
  hasError.value = 'Photo could not be loaded.'
  imageLoaded.value = false
}

function toggleHeatmap() {
  showHeatmap.value = !showHeatmap.value
}

watch(
  () => props.camera?.value,
  (cameraName) => {
    if (cameraName) {
      refreshPhoto()
    } else {
      isLoading.value = false
      hasError.value = null
      cacheBuster.value = 0
    }
  },
  { immediate: true }
)

watch(
  () => props.scanning,
  (isScanning) => {
    if (isScanning) {
      isLoading.value = false
    }
  }
)
</script>

<style scoped>
.camera-hq-preview-card {
  width: 100%;
}

.hq-preview__stage {
  width: 100%;
}

.hq-preview__image-wrapper {
  position: relative;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  background: #0f172a;
  overflow: hidden;
}

.hq-preview__image {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.hq-preview__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  text-align: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.4);
  border-radius: 12px;
}
</style>
