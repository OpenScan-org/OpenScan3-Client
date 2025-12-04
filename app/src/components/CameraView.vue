<template>
  <div class="camera-view column q-gutter-md">
    <q-card class="camera-preview-card">
      <q-card-section>
        <div class="row items-center q-col-gutter-sm">
          <div class="col-12 col-sm">
            <div class="text-h6">Fast Preview</div>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <CameraFastPreview :camera="camera" :active="showFastPreview" :orientation="displayOrientation" />
      </q-card-section>
    </q-card>

    <CameraHQPreview :camera="camera" :scanning="scanning" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import CameraFastPreview from './CameraFastPreview.vue'
import CameraHQPreview from './CameraHQPreview.vue'
import { getDisplayOrientation, type DisplayOrientation } from 'src/utils/orientation'

interface CameraViewProps {
  scanning: boolean
  camera?: {
    label: string
    value: string
    orientationFlag?: number | null
  } | null
}

const props = defineProps<CameraViewProps>()

const showFastPreview = computed(() => !props.scanning && props.camera !== null)

const displayOrientation = computed<DisplayOrientation>(() =>
  getDisplayOrientation(props.camera?.orientationFlag ?? null)
)
</script>

<style scoped>
.camera-view {
  width: 100%;
}

.camera-preview-card {
  width: 100%;
}
</style>
