<template>
  <q-card class="camera-view-card">
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
  </q-card>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, unref, watch } from 'vue'
import CameraFastPreview, { type CameraFastPreviewExposed } from './camera/CameraFastPreview.vue'
import CameraHistogram from './camera/CameraHistogram.vue'
import CameraHQPreview, { type CameraHQPreviewExposed } from './camera/CameraHQPreview.vue'

interface CameraViewProps {
  scanning: boolean
  camera?: {
    label: string
    value: string
    orientationFlag?: number | null
  } | null
}

const props = defineProps<CameraViewProps>()

const fastPreviewRef = ref<CameraFastPreviewExposed | null>(null)
const hqPreviewRef = ref<CameraHQPreviewExposed | null>(null)
const stackRef = ref<HTMLElement | null>(null)
const stackHeight = ref<number | null>(null)
let stackResizeObserver: ResizeObserver | null = null

const showFastPreview = computed(() => !props.scanning && props.camera !== null)

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

onBeforeUnmount(() => {
  stackResizeObserver?.disconnect()
})
</script>

<style scoped>
.camera-view-card {
  width: 100%;
}

.camera-surface {
  display: flex;
  /*width: fit-content;*/
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
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
