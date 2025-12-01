<template>
    <q-card class="camera-preview-card">
        <q-card-section>
            <div class="row">
                <div class="col-2">
                    <div class="text-h6">Preview</div>
                </div>
                <div class="col">
                    <q-toggle v-model="show_preview" :disable="scanning" />
                </div>
            </div>
        </q-card-section>
        <q-card-section class="q-pt-none">
            <div v-if="show_preview" class="preview-wrapper">
                <img
                    class="preview-image"
                    :src="previewUrl"
                    alt="Camera preview"
                />
            </div>
        </q-card-section>
        <!-- <q-separator inset />
        <q-card-section class="q-pt-none">
            <div class="row">
                <div class="col-2">
                    Crop X
                </div>
                <div class="col">
                    <q-range v-model="crop_x" :min="0" :max="100" :left-label-value="crop_x.min + '%'"
                        :right-label-value="crop_x.max + '%'" label-always />
                </div>
            </div>
            <div class="row">
                &nbsp;
            </div>
            <div class="row">
                <div class="col-2">
                    Crop Y
                </div>
                <div class="col">
                    <q-range v-model="crop_y" :min="0" :max="100" :left-label-value="crop_y.min + '%'"
                        :right-label-value="crop_y.max + '%'" label-always />
                </div>
            </div>
        </q-card-section> -->
    </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCameraStore } from 'src/stores/camera'

interface CameraPreviewProps {
    scanning: boolean,
    camera?: {
        label: string
        value: string
        orientationFlag?: number | null
    } | null
}

const props = defineProps<CameraPreviewProps>()

let _show_preview = ref(true)

const cameraStore = useCameraStore()

const previewUrl = computed(() => cameraStore.getPreviewUrl(props.camera?.value || ''))

const show_preview = computed({
    get() {
        return _show_preview.value && !props.scanning && props.camera !== null
    },
    set(value) {
        _show_preview.value = value
    }
})

// let crop_x = ref({
//     min: 0,
//     max: 100
// })

// let crop_y = ref({
//     min: 0,
//     max: 100
// })

</script>

<style scoped>
.preview-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #000;
}

.preview-image {
    width: 100%;
    max-height: 360px;
    object-fit: contain;
}
</style>