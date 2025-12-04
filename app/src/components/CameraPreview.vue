<template>
  <q-card class="camera-preview-card">
    <q-card-section>
      <div class="row items-center q-col-gutter-sm">
        <div class="col-12 col-sm">
          <div class="text-h6">Fast Preview</div>
        </div>
        <div class="col-12 col-sm-auto flex items-center q-gutter-sm justify-end">
          <q-btn-toggle
            v-model="orientation"
            size="sm"
            dense
            toggle-color="primary"
            :options="[
              { label: 'Landscape', value: 'landscape' },
              { label: 'Portrait', value: 'portrait' }
            ]"
          />
          <q-toggle v-model="showFastPreview" :disable="scanning" label="aktiv" />
        </div>
      </div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <FastPreview :camera="camera" :active="showFastPreview" :orientation="orientation" />
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import FastPreview from './FastPreview.vue'
import { usePreviewSettingsStore, type PreviewOrientation } from 'src/stores/previewSettings'

interface CameraPreviewProps {
  scanning: boolean
  camera?: {
    label: string
    value: string
    orientationFlag?: number | null
  } | null
}

const props = defineProps<CameraPreviewProps>()

const previewSettings = usePreviewSettingsStore()

const _showFastPreview = ref(true)

const showFastPreview = computed({
  get() {
    return _showFastPreview.value && !props.scanning && props.camera !== null
  },
  set(value) {
    _showFastPreview.value = value
  }
})

const orientation = computed<PreviewOrientation>({
  get() {
    return previewSettings.getOrientation(props.camera?.value)
  },
  set(value) {
    if (props.camera?.value) {
      previewSettings.setOrientation(props.camera.value, value)
    }
  }
})
</script>

<style scoped>
.camera-preview-card {
  width: 100%;
}
</style>
